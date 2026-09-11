import unittest
from starlette.testclient import TestClient

from app.contradiction import analyze_evidence_relationships
from app.main import app
from app.schemas import EvidenceObject, Provenance
from app.services.vector_store import seed_initial_evidence


class TestWorkspaceQueryEndpoint(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Ensure benchmark evidence is seeded
        seed_initial_evidence()
        self.required_top_level_keys = {
            "query",
            "decomposed_query",
            "total_retrieved",
            "ranked_evidence",
            "evidence_relationships",
            "applied_filters",
            "conclusion",
            "reasoning",
            "supporting_evidence_refs",
            "conflicting_evidence_refs",
            "missing_evidence_note",
            "exact_source_locations",
            "grounded_answer",
        }
        self.required_decomposition_keys = {
            "core_question",
            "intent",
            "relevant_evidence_types",
            "key_entities",
            "target_metrics",
            "temporal_scope",
            "search_keywords",
            "reasoning",
            "engine",
        }

    def test_query_decomposition_fields(self):
        """Test that query decomposition returns all structured fields and expected types."""
        query = "What was the guided revenue from the Q3 2024 earnings call for Nexus Semiconductor?"
        response = self.client.post("/workspace/query", json={"query": query})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        for key in self.required_top_level_keys:
            self.assertIn(key, data, f"Missing top-level response key: {key}")

        self.assertEqual(data["query"], query)
        self.assertIsInstance(data["ranked_evidence"], list)
        self.assertIsInstance(data["applied_filters"], dict)
        self.assertEqual(data["total_retrieved"], len(data["ranked_evidence"]))

        decomposed = data["decomposed_query"]
        self.assertIsInstance(decomposed, dict)
        for dkey in self.required_decomposition_keys:
            self.assertIn(dkey, decomposed, f"Missing decomposition field: {dkey}")

        self.assertIsInstance(decomposed["core_question"], str)
        self.assertIsInstance(decomposed["intent"], str)
        self.assertGreater(len(decomposed["intent"]), 0)
        self.assertIsInstance(decomposed["relevant_evidence_types"], list)
        self.assertGreater(len(decomposed["relevant_evidence_types"]), 0)
        self.assertIsInstance(decomposed["key_entities"], list)
        self.assertIsInstance(decomposed["target_metrics"], list)
        self.assertIsInstance(decomposed["search_keywords"], list)
        self.assertGreater(len(decomposed["search_keywords"]), 0)
        self.assertIsInstance(decomposed["reasoning"], str)
        self.assertIsInstance(decomposed["engine"], str)

    def test_vector_retrieval_revenue_guidance(self):
        """Test vector similarity search accurately retrieves earnings call guidance."""
        query = "guided revenue forecast earnings call"
        response = self.client.post("/workspace/query", json={"query": query})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertGreater(data["total_retrieved"], 0)

        top_hit = data["ranked_evidence"][0]
        self.assertEqual(top_hit["rank"], 1)
        self.assertGreater(top_hit["score"], 0.0)
        self.assertIn("match_reasons", top_hit)
        self.assertIsInstance(top_hit["match_reasons"], list)

        top_evidence = top_hit["evidence"]
        self.assertEqual(top_evidence["source"], "Earnings Call Transcript")
        self.assertEqual(top_evidence["modality"], "audio")
        self.assertIn("44.0M", top_evidence["claim"])

    def test_vector_retrieval_po_invoice_variance(self):
        """Test vector search retrieves both purchase order and invoice for variance questions."""
        query = "PO invoice unit price variance for A100 GPU hardware"
        response = self.client.post("/workspace/query", json={"query": query, "limit": 5})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertGreaterEqual(data["total_retrieved"], 2)

        retrieved_sources = [item["evidence"]["source"] for item in data["ranked_evidence"]]
        retrieved_ids = [item["evidence"]["id"] for item in data["ranked_evidence"]]

        self.assertTrue(
            "Nexus Semiconductor PO" in retrieved_sources or "ev-po-2026-0417" in retrieved_ids,
            f"Expected PO in retrieved sources: {retrieved_sources}",
        )
        self.assertTrue(
            "Nexus Semiconductor Invoice" in retrieved_sources or "ev-inv-77821" in retrieved_ids,
            f"Expected Invoice in retrieved sources: {retrieved_sources}",
        )

    def test_filtering_by_modality(self):
        """Test filtering evidence results strictly by modality."""
        # Filter for audio modality
        res_audio = self.client.post(
            "/workspace/query",
            json={"query": "revenue", "filter_modality": "audio"},
        )
        self.assertEqual(res_audio.status_code, 200)
        data_audio = res_audio.json()
        self.assertEqual(data_audio["applied_filters"].get("modality"), "audio")
        self.assertGreater(data_audio["total_retrieved"], 0)
        for item in data_audio["ranked_evidence"]:
            self.assertEqual(item["evidence"]["modality"], "audio")

        # Filter for excel modality
        res_excel = self.client.post(
            "/workspace/query",
            json={"query": "revenue", "filter_modality": "excel"},
        )
        self.assertEqual(res_excel.status_code, 200)
        data_excel = res_excel.json()
        self.assertEqual(data_excel["applied_filters"].get("modality"), "excel")
        self.assertGreater(data_excel["total_retrieved"], 0)
        for item in data_excel["ranked_evidence"]:
            self.assertEqual(item["evidence"]["modality"], "excel")

        # Filter for pdf modality
        res_pdf = self.client.post(
            "/workspace/query",
            json={"query": "revenue", "filter_modality": "pdf"},
        )
        self.assertEqual(res_pdf.status_code, 200)
        data_pdf = res_pdf.json()
        self.assertEqual(data_pdf["applied_filters"].get("modality"), "pdf")
        self.assertGreater(data_pdf["total_retrieved"], 0)
        for item in data_pdf["ranked_evidence"]:
            self.assertEqual(item["evidence"]["modality"], "pdf")

    def test_filtering_by_source(self):
        """Test filtering evidence results by source name."""
        target_source = "SEC 10-Q filing"
        response = self.client.post(
            "/workspace/query",
            json={"query": "revenue", "filter_source": target_source},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["applied_filters"].get("source"), target_source)
        self.assertGreater(data["total_retrieved"], 0)
        for item in data["ranked_evidence"]:
            self.assertEqual(item["evidence"]["source"], target_source)

    def test_dynamic_upload_and_query(self):
        """Test uploading new evidence via /evidence/upload, then querying it via /workspace/query."""
        file_content = b"OmniCorp reported quarterly cloud infrastructure revenue of $88500000 on 2026-07-20."
        upload_resp = self.client.post(
            "/evidence/upload",
            files={"file": ("omnicorp_cloud_q2.txt", file_content, "text/plain")},
        )
        self.assertEqual(upload_resp.status_code, 200)
        uploaded_evidence = upload_resp.json()
        uploaded_id = uploaded_evidence["id"]
        self.assertTrue(uploaded_id.startswith("ev-"))

        # Query workspace for the newly uploaded evidence
        query_resp = self.client.post(
            "/workspace/query",
            json={"query": "OmniCorp cloud infrastructure revenue"},
        )
        self.assertEqual(query_resp.status_code, 200)
        query_data = query_resp.json()

        retrieved_ids = [item["evidence"]["id"] for item in query_data["ranked_evidence"]]
        self.assertIn(
            uploaded_id,
            retrieved_ids,
            f"Uploaded evidence id '{uploaded_id}' not found in search results: {retrieved_ids}",
        )

    def test_empty_query_raises_400(self):
        """Test that missing or whitespace queries raise HTTP 400."""
        # Empty string
        res1 = self.client.post("/workspace/query", json={"query": ""})
        self.assertEqual(res1.status_code, 400)
        self.assertIn("query", res1.json()["detail"].lower())

        # Whitespace only
        res2 = self.client.post("/workspace/query", json={"query": "   \n\t  "})
        self.assertEqual(res2.status_code, 400)

        # Missing query key
        res3 = self.client.post("/workspace/query", json={})
        self.assertEqual(res3.status_code, 400)

        # Empty body
        res4 = self.client.post("/workspace/query")
        self.assertEqual(res4.status_code, 400)

        # Test on /api/v1/workspace/query route as well
        res5 = self.client.post("/api/v1/workspace/query", json={"query": ""})
        self.assertEqual(res5.status_code, 400)

    def test_limit_parameter(self):
        """Test that the limit parameter restricts the number of results returned."""
        res_limit_2 = self.client.post("/workspace/query", json={"query": "revenue", "limit": 2})
        self.assertEqual(res_limit_2.status_code, 200)
        self.assertLessEqual(len(res_limit_2.json()["ranked_evidence"]), 2)

        res_limit_1 = self.client.post("/workspace/query", json={"query": "revenue", "limit": 1})
        self.assertEqual(res_limit_1.status_code, 200)
        self.assertEqual(len(res_limit_1.json()["ranked_evidence"]), 1)

    def test_routes_mounted_at_both_paths(self):
        """Test that workspace query endpoint is mounted at both /workspace and /api/v1/workspace."""
        res1 = self.client.post("/workspace/query", json={"query": "revenue"})
        self.assertEqual(res1.status_code, 200)

        res2 = self.client.post("/api/v1/workspace/query", json={"query": "revenue"})
        self.assertEqual(res2.status_code, 200)

    def test_evidence_relationships_matching_values_supports(self):
        """Test two evidence items with matching values for same entity/metric/period resolve to SUPPORTS."""
        ev1 = {
            "id": "ev-match-1",
            "entity": "Nexus Semiconductor",
            "source": "SEC 10-Q filing",
            "claim": "Reported Q3 2024 revenue of $43.20M",
            "value": 43200000.0,
            "date": "2024-09-30",
            "version": "1.0",
        }
        ev2 = {
            "id": "ev-match-2",
            "entity": "Nexus Semiconductor",
            "source": "Press Release",
            "claim": "Confirmed Q3 2024 revenue reached $43.20 million",
            "value": 43200000.0,
            "date": "2024-09-30",
            "version": "1.0",
        }
        relationships = analyze_evidence_relationships([ev1, ev2])
        self.assertEqual(len(relationships), 1)
        rel = relationships[0]
        self.assertEqual(rel["classification"], "SUPPORTS")
        self.assertIn("ev-match-1", [rel["evidence_a"], rel["evidence_b"]])
        self.assertIn("ev-match-2", [rel["evidence_a"], rel["evidence_b"]])
        self.assertTrue(rel["alignment"]["entity"])
        self.assertTrue(rel["alignment"]["metric"])

    def test_evidence_relationships_conflicting_values_contradicts(self):
        """Test two evidence items with genuinely conflicting values for same entity/metric/period resolve to CONTRADICTS."""
        ev1 = {
            "id": "ev-conflict-1",
            "entity": "Acme Corp",
            "source": "Annual Report",
            "claim": "Reported Q2 2024 revenue of $50,000,000",
            "value": 50000000.0,
            "date": "2024-06-30",
            "version": "1.0",
        }
        ev2 = {
            "id": "ev-conflict-2",
            "entity": "Acme Corp",
            "source": "Audit Report",
            "claim": "Audit confirmed Q2 2024 revenue of only $38,000,000",
            "value": 38000000.0,
            "date": "2024-06-30",
            "version": "1.0",
        }
        relationships = analyze_evidence_relationships([ev1, ev2])
        self.assertEqual(len(relationships), 1)
        rel = relationships[0]
        self.assertEqual(rel["classification"], "CONTRADICTS")
        self.assertIn("ev-conflict-1", [rel["evidence_a"], rel["evidence_b"]])
        self.assertIn("ev-conflict-2", [rel["evidence_a"], rel["evidence_b"]])
        self.assertIn("Conflicting", rel["reason"])

    def test_evidence_relationships_newer_version_supersedes(self):
        """Test two evidence items where one is clearly a newer version resolve to SUPERSEDES."""
        ev1 = {
            "id": "ev-ver-1",
            "entity": "Beta Corp",
            "source": "Preliminary Filing",
            "claim": "Preliminary FY2025 net bookings estimated at $100M",
            "value": 100000000.0,
            "date": "2025-12-31",
            "version": "1.0",
        }
        ev2 = {
            "id": "ev-ver-2",
            "entity": "Beta Corp",
            "source": "Restated Audit Filing",
            "claim": "Restated FY2025 net bookings confirmed at $105M",
            "value": 105000000.0,
            "date": "2026-02-15",
            "version": "2.0",
        }
        relationships = analyze_evidence_relationships([ev1, ev2])
        self.assertEqual(len(relationships), 1)
        rel = relationships[0]
        self.assertEqual(rel["classification"], "SUPERSEDES")
        self.assertIn("supersedes", rel["reason"].lower())

    def test_evidence_relationships_unit_normalization_supports(self):
        """Test two evidence items with different units (crore vs lakh) resolve to SUPPORTS once normalized."""
        ev1 = {
            "id": "ev-crore",
            "entity": "Tata Tech",
            "source": "BSE Filing",
            "claim": "Reported Q1 2025 revenue of 5.0 crore INR",
            "value": 5.0,
            "date": "2025-03-31",
            "version": "1.0",
        }
        ev2 = {
            "id": "ev-lakh",
            "entity": "Tata Tech",
            "source": "Internal Ledger",
            "claim": "Reported Q1 2025 revenue of 500 lakh INR",
            "value": 500.0,
            "date": "2025-03-31",
            "version": "1.0",
        }
        relationships = analyze_evidence_relationships([ev1, ev2])
        self.assertEqual(len(relationships), 1)
        rel = relationships[0]
        # Must resolve to SUPPORTS, NOT CONTRADICTS
        self.assertEqual(rel["classification"], "SUPPORTS")
        self.assertNotEqual(rel["classification"], "CONTRADICTS")
        self.assertEqual(rel["normalized_value_a"], 50000000.0)
        self.assertEqual(rel["normalized_value_b"], 50000000.0)

    def test_evidence_relationships_in_workspace_query_response(self):
        """Test that POST /workspace/query includes evidence_relationships in JSON response."""
        res = self.client.post("/workspace/query", json={"query": "revenue discrepancy and variance"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("evidence_relationships", data)
        self.assertIsInstance(data["evidence_relationships"], list)
        for rel in data["evidence_relationships"]:
            self.assertIn(rel["classification"], ["SUPPORTS", "CONTRADICTS", "SUPERSEDES", "DERIVED-FROM", "UNRESOLVED"])
            self.assertIn("reason", rel)
            self.assertIn("evidence_a", rel)
            self.assertIn("evidence_b", rel)

    def test_grounded_answer_pipeline_components(self):
        """Test that POST /workspace/query generates a complete grounded answer containing

        conclusion, reasoning, supporting evidence refs, conflicting evidence refs,
        missing evidence note, and exact source locations.
        """
        res = self.client.post(
            "/workspace/query",
            json={"query": "What was the guided revenue from the Q3 2024 earnings call for Nexus Semiconductor?"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # 1. Conclusion & Reasoning
        self.assertIn("conclusion", data)
        self.assertIsInstance(data["conclusion"], str)
        self.assertGreater(len(data["conclusion"]), 0)

        self.assertIn("reasoning", data)
        self.assertIsInstance(data["reasoning"], str)
        self.assertGreater(len(data["reasoning"]), 0)

        # 2. Supporting Evidence Refs
        self.assertIn("supporting_evidence_refs", data)
        self.assertIsInstance(data["supporting_evidence_refs"], list)
        self.assertGreater(len(data["supporting_evidence_refs"]), 0)
        sup = data["supporting_evidence_refs"][0]
        self.assertIn("id", sup)
        self.assertIn("sourceDoc", sup)
        self.assertIn("location", sup)

        # 3. Conflicting Evidence Refs
        self.assertIn("conflicting_evidence_refs", data)
        self.assertIsInstance(data["conflicting_evidence_refs"], list)

        # 4. Missing Evidence Note
        self.assertIn("missing_evidence_note", data)
        missing = data["missing_evidence_note"]
        self.assertTrue(isinstance(missing, (dict, str)))
        if isinstance(missing, dict):
            self.assertIn("description", missing)
            self.assertIn("impact", missing)

        # 5. Exact Source Locations
        self.assertIn("exact_source_locations", data)
        self.assertIsInstance(data["exact_source_locations"], list)
        self.assertGreater(len(data["exact_source_locations"]), 0)
        loc_entry = data["exact_source_locations"][0]
        self.assertIn("source", loc_entry)
        self.assertIn("location", loc_entry)
        self.assertIn("location_type", loc_entry)
        self.assertIn(loc_entry["location_type"], ["page", "cell", "timestamp", "section", "reference"])

        # 6. D3 Frontend compatibility
        self.assertIn("grounded_answer", data)
        self.assertIn("supporting", data)
        self.assertIn("conflicts", data)
        self.assertIn("missingEvidence", data)

    def test_grounded_answer_po_invoice_variance_citations(self):
        """Test grounded answer on PO / invoice variance query cites exact page/cell locations."""
        res = self.client.post(
            "/workspace/query",
            json={"query": "Are there price or quantity variances on the Nexus Semiconductor POs?"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("conclusion", data)
        self.assertIn("reasoning", data)

        # Exact source locations should have citations
        loc_types = [item["location_type"] for item in data["exact_source_locations"]]
        self.assertTrue(len(loc_types) > 0)

        # Check that conflicting evidence includes PO vs invoice delta if detected
        if len(data["conflicting_evidence_refs"]) > 0:
            conflict = data["conflicting_evidence_refs"][0]
            self.assertIn("delta", conflict)
            self.assertIn("sourceDoc", conflict)

    def test_workspace_stress_test_endpoint(self):
        """Test POST /workspace/stress-test executes perturbation runs, reports robustness and critical evidence."""
        res = self.client.post(
            "/workspace/stress-test",
            json={"query": "Are there price or quantity variances on the Nexus Semiconductor POs?"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()

        for key in ["query", "baseline_conclusion", "robustness_score", "robustness_percentage", "total_runs", "stable_runs", "critical_evidence", "runs", "summary"]:
            self.assertIn(key, data, f"Missing stress test key: {key}")

        self.assertIsInstance(data["robustness_score"], (int, float))
        self.assertTrue(0.0 <= data["robustness_score"] <= 1.0)
        self.assertGreaterEqual(data["total_runs"], 1)
        self.assertIsInstance(data["critical_evidence"], list)
        self.assertIsInstance(data["runs"], list)

        # Check each run structure
        if len(data["runs"]) > 0:
            first_run = data["runs"][0]
            self.assertIn("removed_evidence_id", first_run)
            self.assertIn("removed_source", first_run)
            self.assertIn("conclusion_changed", first_run)
            self.assertIn("impact", first_run)

    def test_workspace_stress_test_empty_raises_400(self):
        """Test POST /workspace/stress-test without query or evidence raises 400."""
        res = self.client.post("/workspace/stress-test", json={})
        self.assertEqual(res.status_code, 400)

    def test_workspace_stress_test_mounted_at_both_paths(self):
        """Test stress test endpoint mounted at both /workspace/stress-test and /api/v1/workspace/stress-test."""
        res1 = self.client.post("/workspace/stress-test", json={"query": "revenue"})
        self.assertEqual(res1.status_code, 200)

        res2 = self.client.post("/api/v1/workspace/stress-test", json={"query": "revenue"})
        self.assertEqual(res2.status_code, 200)


if __name__ == "__main__":
    unittest.main()
