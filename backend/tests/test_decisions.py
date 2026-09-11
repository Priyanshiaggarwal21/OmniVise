"""
Tests for the /decisions Decision Snapshots API.

Covers:
  - POST /decisions          — save, status derivation, 400 on empty question
  - GET  /decisions          — list shape
  - GET  /decisions/{id}     — detail + 404
  - GET  /decisions/{id}/export-pdf — PDF bytes + content-type
  - DELETE /decisions/{id}   — 204 + 404 afterwards
  - Mounted at both /decisions and /api/v1/decisions
"""
import unittest

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

SAMPLE_PAYLOAD = {
    "question": "What was the guided revenue vs GAAP reported revenue in Q3?",
    "conclusion": "GAAP revenue closed at $43.20M vs $45.25M midpoint, a -$1.30M (-2.9%) miss.",
    "reasoning": "Cross-referenced SEC 10-Q, vendor ledger, and earnings call transcript.",
    "confidence_badge": "96% High Confidence",
    "metrics": [
        {"label": "Reported GAAP Revenue", "value": "$43.20M", "badge": "SEC 10-Q"},
        {"label": "Q3 Guidance Range", "value": "$44.0M–$46.5M", "badge": "Prior 8-K"},
    ],
    "supporting_refs": [
        {"source": "10-Q_Q3_2024.pdf", "location": "Page 42, ¶ 3"},
        {"source": "Vendor_Ledger_Aug2024.xlsx", "location": "Sheet: Reconciliation, Cell D14"},
    ],
    "conflicting_refs": [
        {"source": "Earnings_Call_Oct2024.mp3", "location": "00:21:08.450"},
    ],
    "missing_evidence_note": {
        "description": "Contract AG-9941 acceptance certificates not ingested.",
        "impact": "$1.80M deferred revenue classification unresolvable.",
        "missingDocuments": ["Contract_AG-9941_Customer_Acceptance.pdf"],
    },
    "robustness_score": 0.67,
    "robustness_percentage": 67,
    "critical_evidence": [
        {"id": "ev-1", "source": "10-Q_Q3_2024.pdf", "modality": "pdf",
         "impact": "Loss of primary GAAP baseline figures."},
    ],
}


class TestDecisionsSave(unittest.TestCase):
    def test_save_returns_201_with_correct_shape(self):
        r = client.post("/decisions/", json=SAMPLE_PAYLOAD)
        self.assertEqual(r.status_code, 201, r.text)
        data = r.json()
        self.assertIn("id", data)
        self.assertEqual(data["question"], SAMPLE_PAYLOAD["question"])
        self.assertEqual(data["conclusion"], SAMPLE_PAYLOAD["conclusion"])
        self.assertIn(data["status"], ("PASS", "REVIEW", "BLOCK"))
        self.assertIn("created_at", data)
        self.assertIn("updated_at", data)

    def test_save_status_derivation_review_when_conflicts_present(self):
        """Conflicts present + robustness 67% → REVIEW."""
        r = client.post("/decisions/", json=SAMPLE_PAYLOAD)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["status"], "REVIEW")

    def test_save_status_pass_when_no_conflicts_high_robustness(self):
        payload = {**SAMPLE_PAYLOAD, "conflicting_refs": [], "robustness_percentage": 80}
        r = client.post("/decisions/", json=payload)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["status"], "PASS")

    def test_save_status_block_when_low_robustness(self):
        payload = {**SAMPLE_PAYLOAD, "robustness_percentage": 30}
        r = client.post("/decisions/", json=payload)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["status"], "BLOCK")

    def test_save_status_explicit_override(self):
        payload = {**SAMPLE_PAYLOAD, "status": "BLOCK"}
        r = client.post("/decisions/", json=payload)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["status"], "BLOCK")

    def test_save_empty_question_raises_400(self):
        r = client.post("/decisions/", json={**SAMPLE_PAYLOAD, "question": ""})
        self.assertEqual(r.status_code, 400)

    def test_save_whitespace_question_raises_400(self):
        r = client.post("/decisions/", json={**SAMPLE_PAYLOAD, "question": "   "})
        self.assertEqual(r.status_code, 400)

    def test_save_no_robustness_derives_from_conflicts(self):
        """No robustness run + conflicts present → REVIEW."""
        payload = {**SAMPLE_PAYLOAD, "robustness_score": None, "robustness_percentage": None}
        r = client.post("/decisions/", json=payload)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["status"], "REVIEW")

    def test_save_mounted_at_api_v1(self):
        r = client.post("/api/v1/decisions/", json=SAMPLE_PAYLOAD)
        self.assertEqual(r.status_code, 201)


class TestDecisionsList(unittest.TestCase):
    def setUp(self):
        # Ensure at least one snapshot exists
        client.post("/decisions/", json=SAMPLE_PAYLOAD)

    def test_list_returns_200_and_array(self):
        r = client.get("/decisions/")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

    def test_list_items_have_required_keys(self):
        r = client.get("/decisions/")
        self.assertEqual(r.status_code, 200)
        item = r.json()[0]
        for key in ("id", "question", "conclusion", "status", "created_at"):
            self.assertIn(key, item, f"Missing key: {key}")

    def test_list_ordered_newest_first(self):
        # Save a second snapshot and confirm it appears first
        client.post("/decisions/", json={**SAMPLE_PAYLOAD, "question": "Second snapshot"})
        r = client.get("/decisions/")
        items = r.json()
        if len(items) >= 2:
            self.assertGreaterEqual(items[0]["created_at"], items[1]["created_at"])

    def test_list_mounted_at_api_v1(self):
        r = client.get("/api/v1/decisions/")
        self.assertEqual(r.status_code, 200)


class TestDecisionsDetail(unittest.TestCase):
    def setUp(self):
        r = client.post("/decisions/", json=SAMPLE_PAYLOAD)
        self.snapshot_id = r.json()["id"]

    def test_get_detail_returns_full_snapshot(self):
        r = client.get(f"/decisions/{self.snapshot_id}")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["id"], self.snapshot_id)
        self.assertEqual(data["question"], SAMPLE_PAYLOAD["question"])
        self.assertEqual(data["robustness_percentage"], SAMPLE_PAYLOAD["robustness_percentage"])

    def test_get_detail_includes_nested_json(self):
        r = client.get(f"/decisions/{self.snapshot_id}")
        data = r.json()
        self.assertIsInstance(data["metrics"], list)
        self.assertIsInstance(data["supporting_refs"], list)
        self.assertIsInstance(data["critical_evidence"], list)

    def test_get_detail_404_on_unknown_id(self):
        r = client.get("/decisions/00000000-0000-0000-0000-000000000000")
        self.assertEqual(r.status_code, 404)

    def test_get_detail_mounted_at_api_v1(self):
        r = client.get(f"/api/v1/decisions/{self.snapshot_id}")
        self.assertEqual(r.status_code, 200)


class TestDecisionsPdfExport(unittest.TestCase):
    def setUp(self):
        r = client.post("/decisions/", json=SAMPLE_PAYLOAD)
        self.snapshot_id = r.json()["id"]

    def test_export_pdf_returns_200(self):
        r = client.get(f"/decisions/{self.snapshot_id}/export-pdf")
        self.assertEqual(r.status_code, 200)

    def test_export_pdf_content_type(self):
        r = client.get(f"/decisions/{self.snapshot_id}/export-pdf")
        self.assertIn("application/pdf", r.headers.get("content-type", ""))

    def test_export_pdf_content_disposition(self):
        r = client.get(f"/decisions/{self.snapshot_id}/export-pdf")
        cd = r.headers.get("content-disposition", "")
        self.assertIn("attachment", cd)
        self.assertIn(".pdf", cd)

    def test_export_pdf_returns_non_empty_bytes(self):
        r = client.get(f"/decisions/{self.snapshot_id}/export-pdf")
        # PDF magic bytes: %PDF
        self.assertTrue(r.content[:4] == b"%PDF", "Response is not a valid PDF")

    def test_export_pdf_404_on_unknown_id(self):
        r = client.get("/decisions/00000000-0000-0000-0000-000000000000/export-pdf")
        self.assertEqual(r.status_code, 404)

    def test_export_pdf_mounted_at_api_v1(self):
        r = client.get(f"/api/v1/decisions/{self.snapshot_id}/export-pdf")
        self.assertEqual(r.status_code, 200)


class TestDecisionsDelete(unittest.TestCase):
    def setUp(self):
        r = client.post("/decisions/", json=SAMPLE_PAYLOAD)
        self.snapshot_id = r.json()["id"]

    def test_delete_returns_204(self):
        r = client.delete(f"/decisions/{self.snapshot_id}")
        self.assertEqual(r.status_code, 204)

    def test_delete_then_get_returns_404(self):
        client.delete(f"/decisions/{self.snapshot_id}")
        r = client.get(f"/decisions/{self.snapshot_id}")
        self.assertEqual(r.status_code, 404)

    def test_delete_unknown_id_returns_404(self):
        r = client.delete("/decisions/00000000-0000-0000-0000-000000000000")
        self.assertEqual(r.status_code, 404)

    def test_delete_mounted_at_api_v1(self):
        r2 = client.post("/decisions/", json=SAMPLE_PAYLOAD)
        snap_id = r2.json()["id"]
        r = client.delete(f"/api/v1/decisions/{snap_id}")
        self.assertEqual(r.status_code, 204)


if __name__ == "__main__":
    unittest.main()
