import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.activity_log import ActivityLog
from app.api.v1.activity import log_activity

client = TestClient(app)


class TestActivityLogAPI(unittest.TestCase):
    def setUp(self):
        db = SessionLocal()
        try:
            db.query(ActivityLog).delete()
            db.commit()
        finally:
            db.close()

    def test_list_activity_empty(self):
        r = client.get("/activity/")
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.json(), list)
        self.assertEqual(len(r.json()), 0)

    def test_create_activity_manually(self):
        payload = {
            "action_type": "evidence_uploaded",
            "target": "SEC_10-K_2024.pdf",
            "user_id": "usr-admin-1",
            "details": {"modality": "pdf", "file_size": 1048576},
        }
        r = client.post("/activity/", json=payload, headers={"X-User-Role": "admin"})
        self.assertEqual(r.status_code, 201)
        data = r.json()
        self.assertIn("id", data)
        self.assertEqual(data["action_type"], "evidence_uploaded")
        self.assertEqual(data["target"], "SEC_10-K_2024.pdf")
        self.assertEqual(data["user_id"], "usr-admin-1")
        self.assertIn("timestamp", data)

    def test_role_access_restriction(self):
        # Admin and Reviewer roles should succeed
        r_admin = client.get("/activity/", headers={"X-User-Role": "admin"})
        self.assertEqual(r_admin.status_code, 200)

        r_reviewer = client.get("/activity/", headers={"X-User-Role": "reviewer"})
        self.assertEqual(r_reviewer.status_code, 200)

        # Analyst or Viewer roles should be rejected with 403 Forbidden
        r_analyst = client.get("/activity/", headers={"X-User-Role": "analyst"})
        self.assertEqual(r_analyst.status_code, 403)

        r_viewer = client.get("/activity/", headers={"X-User-Role": "viewer"})
        self.assertEqual(r_viewer.status_code, 403)

    def test_list_activity_filtering(self):
        db = SessionLocal()
        try:
            log_activity(db, "evidence_uploaded", "DocA.pdf", user_id="u1")
            log_activity(db, "query_run", "What is total revenue?", user_id="u2")
            log_activity(db, "decision_saved", "Snapshot: Revenue Analysis", user_id="u1")
        finally:
            db.close()

        # Filter by action_type
        r_filter = client.get("/activity/?action_type=query_run", headers={"X-User-Role": "admin"})
        self.assertEqual(r_filter.status_code, 200)
        items = r_filter.json()
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["action_type"], "query_run")

        # Filter by user_id
        r_user = client.get("/activity/?user_id=u1", headers={"X-User-Role": "admin"})
        self.assertEqual(r_user.status_code, 200)
        items_user = r_user.json()
        self.assertEqual(len(items_user), 2)

        # Search filter
        r_search = client.get("/activity/?search=DocA", headers={"X-User-Role": "admin"})
        self.assertEqual(r_search.status_code, 200)
        self.assertEqual(len(r_search.json()), 1)

    def test_activity_stats(self):
        db = SessionLocal()
        try:
            log_activity(db, "evidence_uploaded", "Doc1.pdf")
            log_activity(db, "decision_saved", "Snapshot 1")
            log_activity(db, "decision_approved", "Snapshot 1")
        finally:
            db.close()

        r_stats = client.get("/activity/stats", headers={"X-User-Role": "admin"})
        self.assertEqual(r_stats.status_code, 200)
        stats = r_stats.json()
        self.assertEqual(stats["total_events"], 3)
        self.assertEqual(stats["action_counts"]["evidence_uploaded"], 1)
        self.assertEqual(stats["action_counts"]["decision_saved"], 1)
        self.assertEqual(stats["action_counts"]["decision_approved"], 1)

    def test_decisions_review_and_approve_events(self):
        # 1. Create a decision snapshot
        r_create = client.post(
            "/decisions/",
            json={"question": "Are GAAP operating expenses verified for Q2?", "conclusion": "Verified."},
        )
        self.assertEqual(r_create.status_code, 201)
        snap_id = r_create.json()["id"]

        # 2. Review the decision
        r_rev = client.post(f"/decisions/{snap_id}/review")
        self.assertEqual(r_rev.status_code, 200)
        self.assertEqual(r_rev.json()["status"], "REVIEW")

        # 3. Approve the decision
        r_app = client.post(f"/decisions/{snap_id}/approve")
        self.assertEqual(r_app.status_code, 200)
        self.assertEqual(r_app.json()["status"], "PASS")

        # 4. Verify all 3 events logged in ActivityLog
        r_logs = client.get("/activity/", headers={"X-User-Role": "admin"})
        self.assertEqual(r_logs.status_code, 200)
        types = [item["action_type"] for item in r_logs.json()]
        self.assertIn("decision_saved", types)
        self.assertIn("decision_reviewed", types)
        self.assertIn("decision_approved", types)


if __name__ == "__main__":
    unittest.main()
