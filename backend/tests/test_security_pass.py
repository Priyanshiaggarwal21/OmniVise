import sqlite3
import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.evidence import EvidenceRecord


class TestSecurityPass(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_security_headers(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(res.headers.get("X-Frame-Options"), "DENY")
        self.assertIn("max-age=", res.headers.get("Strict-Transport-Security", ""))

    def test_02_at_rest_encryption(self):
        db = SessionLocal()
        try:
            secret_claim = "Confidential CEO executive statement: Q4 guidance was inflated by 12.5%"
            secret_preview = "Unpublished internal memo: Board reviewed confidential variance numbers."
            secret_meta = {"auditor": "Special Investigator", "classification": "RESTRICTED"}

            test_rec = EvidenceRecord(
                id="ev-test-encrypted-pass",
                source="confidential_memo.pdf",
                modality="pdf",
                claim=secret_claim,
                raw_text_preview=secret_preview,
                metadata_blob=secret_meta,
                file_hash="abc123hash",
            )
            db.merge(test_rec)
            db.commit()

            # Verify via raw SQLite connection that ciphertext is stored on disk
            conn = sqlite3.connect("omnivise.db")
            raw_row = conn.execute(
                "SELECT claim, raw_text_preview, metadata_blob FROM evidence_records WHERE id = 'ev-test-encrypted-pass'"
            ).fetchone()
            self.assertIsNotNone(raw_row)
            raw_claim, raw_preview, raw_meta = raw_row

            # Check that raw DB stores ciphertext starting with Fernet token prefix
            self.assertTrue(raw_claim.startswith("gAAAAA"), f"Raw claim is NOT encrypted: {raw_claim}")
            self.assertNotIn(secret_claim, raw_claim, "Plaintext found in raw database file!")

            self.assertTrue(raw_preview.startswith("gAAAAA"), f"Raw preview is NOT encrypted: {raw_preview}")
            self.assertNotIn(secret_preview, raw_preview, "Plaintext preview found in raw database file!")

            # Verify via ORM that decrypted text is returned
            read_rec = db.query(EvidenceRecord).filter(EvidenceRecord.id == "ev-test-encrypted-pass").first()
            self.assertIsNotNone(read_rec)
            self.assertEqual(read_rec.claim, secret_claim)
            self.assertEqual(read_rec.raw_text_preview, secret_preview)
            self.assertEqual(read_rec.metadata_blob, secret_meta)
        finally:
            db.close()

    def test_03_purge_session_endpoints(self):
        purge_res = self.client.post("/session/purge")
        self.assertEqual(purge_res.status_code, 200)
        data = purge_res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("deleted_files_count", data)

        workspace_purge_res = self.client.post("/workspace/purge-session")
        self.assertEqual(workspace_purge_res.status_code, 200)
        ws_data = workspace_purge_res.json()
        self.assertEqual(ws_data.get("status"), "success")


if __name__ == "__main__":
    unittest.main()
