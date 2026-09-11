"""
Tests for the Notifications API & Trigger Pipeline.

Covers:
  - GET  /notifications/            — list notifications (empty & populated)
  - POST /notifications/            — manual notification creation
  - POST /notifications/{id}/read   — mark notification as read + 404 for invalid ID
  - POST /notifications/read-all    — mark all notifications as read
  - POST /notifications/trigger-source-update — source update trigger pipeline
  - Mounted at both /notifications and /api/v1/notifications
"""
import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import Base, SessionLocal, engine
from app.models.decision_snapshot import DecisionSnapshot
from app.models.notification import Notification

client = TestClient(app)


class TestNotificationsAPI(unittest.TestCase):
    def setUp(self):
        # Clean notifications for test isolation
        db = SessionLocal()
        try:
            db.query(Notification).delete()
            db.commit()
        finally:
            db.close()

    def test_list_notifications_empty(self):
        r = client.get("/notifications/")
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.json(), list)

    def test_create_notification_success(self):
        payload = {
            "message": "Source update: 10-Q_Q3_2024.pdf re-ingested with revised figures.",
            "user_id": "usr-123",
            "related_decision_id": "snap-999",
        }
        r = client.post("/notifications/", json=payload)
        self.assertEqual(r.status_code, 201)
        data = r.json()
        self.assertIn("id", data)
        self.assertEqual(data["message"], payload["message"])
        self.assertEqual(data["user_id"], "usr-123")
        self.assertEqual(data["related_decision_id"], "snap-999")
        self.assertFalse(data["is_read"])
        self.assertFalse(data["read"])
        self.assertIn("created_at", data)

    def test_create_notification_empty_message_raises_400(self):
        r = client.post("/notifications/", json={"message": "   "})
        self.assertEqual(r.status_code, 400)

    def test_mark_notification_read(self):
        # Create a notification first
        r_create = client.post(
            "/notifications/",
            json={"message": "Audit flag on vendor invoice reconciliation."},
        )
        self.assertEqual(r_create.status_code, 201)
        notif_id = r_create.json()["id"]

        # Mark read
        r_read = client.post(f"/notifications/{notif_id}/read")
        self.assertEqual(r_read.status_code, 200)
        data = r_read.json()
        self.assertTrue(data["is_read"])
        self.assertTrue(data["read"])

        # Check in list that unread_only=True excludes it
        r_unread = client.get("/notifications/?unread_only=true")
        self.assertEqual(r_unread.status_code, 200)
        ids = [item["id"] for item in r_unread.json()]
        self.assertNotIn(notif_id, ids)

    def test_mark_notification_read_404_on_unknown_id(self):
        r = client.post("/notifications/00000000-0000-0000-0000-000000000000/read")
        self.assertEqual(r.status_code, 404)

    def test_mark_all_read(self):
        client.post("/notifications/", json={"message": "Notif 1"})
        client.post("/notifications/", json={"message": "Notif 2"})

        r_read_all = client.post("/notifications/read-all")
        self.assertEqual(r_read_all.status_code, 200)
        self.assertGreaterEqual(r_read_all.json()["updated"], 2)

        r_unread = client.get("/notifications/?unread_only=true")
        self.assertEqual(len(r_unread.json()), 0)

    def test_trigger_source_update_matches_decision_snapshot(self):
        # Create a decision snapshot referencing 10-Q_Q3_2024.pdf
        snap_payload = {
            "question": "What was the guided revenue vs GAAP reported revenue in Q3?",
            "conclusion": "GAAP revenue closed at $43.20M.",
            "supporting_refs": [
                {"source": "10-Q_Q3_2024.pdf", "location": "Page 42, ¶ 3"}
            ],
        }
        r_snap = client.post("/decisions/", json=snap_payload)
        self.assertEqual(r_snap.status_code, 201)
        snap_id = r_snap.json()["id"]

        # Trigger source update for matching filename
        trigger_payload = {
            "source_filename": "10-Q_Q3_2024.pdf",
            "claims_count": 12,
        }
        r_trig = client.post("/notifications/trigger-source-update", json=trigger_payload)
        self.assertEqual(r_trig.status_code, 201)
        notifs = r_trig.json()
        self.assertGreater(len(notifs), 0)
        matched = any(n.get("related_decision_id") == snap_id for n in notifs)
        self.assertTrue(matched, "Expected notification to link to the affected Decision Snapshot")

    def test_mounted_at_api_v1(self):
        r = client.get("/api/v1/notifications/")
        self.assertEqual(r.status_code, 200)


if __name__ == "__main__":
    unittest.main()
