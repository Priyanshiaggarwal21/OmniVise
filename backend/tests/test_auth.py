import os
import unittest
from fastapi import Depends, status
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.models.user import User
from app.auth import (
    router as auth_router,
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
    get_current_user,
    require_role,
    RoleGuard,
)
from app.main import app as main_app


class TestAuthenticationAndRBAC(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=cls.test_engine
        )

        # Register test endpoints on main_app for RoleGuard testing
        @main_app.get("/test/admin-only")
        def admin_only_endpoint(user: User = Depends(require_role("admin"))):
            return {"msg": f"Welcome {user.name}, admin access granted", "role": user.role}

        @main_app.get("/test/analyst-or-admin")
        def analyst_or_admin_endpoint(user: User = Depends(RoleGuard("analyst", "admin"))):
            return {"msg": f"Welcome {user.name}, access granted", "role": user.role}

    def setUp(self):
        Base.metadata.create_all(bind=self.test_engine)

        def override_get_db():
            db = self.TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        main_app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(main_app)

    def tearDown(self):
        Base.metadata.drop_all(bind=self.test_engine)
        main_app.dependency_overrides.clear()

    def test_01_password_hashing_and_verification(self):
        raw_password = "supersecretpassword123"
        hashed = hash_password(raw_password)

        self.assertNotEqual(hashed, raw_password)
        self.assertTrue(verify_password(raw_password, hashed))
        self.assertFalse(verify_password("wrongpassword", hashed))

        # Safe handling of long passwords (> 72 characters)
        long_password = "p" * 100
        long_hashed = hash_password(long_password)
        self.assertTrue(verify_password(long_password, long_hashed))
        self.assertTrue(verify_password(long_password[:72], long_hashed))
        self.assertFalse(verify_password("q" * 100, long_hashed))

    def test_02_user_model_attributes(self):
        user = User(
            name="Test Auditor",
            email="auditor@test.com",
            phone="+1234567890",
            password_hash=hash_password("password"),
            role="reviewer",
        )
        self.assertTrue(hasattr(user, "id"))
        self.assertTrue(hasattr(user, "name"))
        self.assertTrue(hasattr(user, "email"))
        self.assertTrue(hasattr(user, "phone"))
        self.assertTrue(hasattr(user, "password_hash"))
        self.assertTrue(hasattr(user, "role"))
        self.assertTrue(hasattr(user, "created_at"))

    def test_03_jwt_claims_include_role(self):
        token = create_access_token(
            user_id="user-123",
            email="analyst@omnivise.com",
            name="Test Analyst",
            role="analyst",
        )
        decoded = decode_token(token)

        self.assertEqual(decoded["sub"], "analyst@omnivise.com")
        self.assertEqual(decoded["email"], "analyst@omnivise.com")
        self.assertEqual(decoded["user_id"], "user-123")
        self.assertEqual(decoded["name"], "Test Analyst")
        self.assertEqual(decoded["role"], "analyst")
        self.assertIn("exp", decoded)
        self.assertIn("iat", decoded)

    def test_04_auth_signup_flow(self):
        payload = {
            "name": "Jane Analyst",
            "email": "jane@example.com",
            "phone": "+19876543210",
            "password": "strongPassword123!",
            "role": "analyst",
        }
        response = self.client.post("/auth/signup", json=payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")
        self.assertEqual(data["role"], "analyst")
        self.assertEqual(data["name"], "Jane Analyst")
        self.assertEqual(data["email"], "jane@example.com")
        self.assertEqual(data["user"]["email"], "jane@example.com")
        self.assertEqual(data["user"]["name"], "Jane Analyst")
        self.assertEqual(data["user"]["phone"], "+19876543210")
        self.assertEqual(data["user"]["role"], "analyst")

        # Duplicate email rejection
        dup_email_resp = self.client.post("/auth/signup", json=payload)
        self.assertEqual(dup_email_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", dup_email_resp.json()["detail"].lower())

        # Duplicate phone rejection
        dup_phone_payload = {
            "name": "Another User",
            "email": "another@example.com",
            "phone": "+19876543210",
            "password": "strongPassword123!",
            "role": "analyst",
        }
        dup_phone_resp = self.client.post("/auth/signup", json=dup_phone_payload)
        self.assertEqual(dup_phone_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", dup_phone_resp.json()["detail"].lower())

        # Invalid role rejection
        invalid_role_payload = {
            "name": "Invalid Role User",
            "email": "invalid@example.com",
            "password": "strongPassword123!",
            "role": "invalid_super_role",
        }
        invalid_role_resp = self.client.post("/auth/signup", json=invalid_role_payload)
        self.assertEqual(invalid_role_resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_05_auth_login_flow(self):
        # Sign up a user
        signup_payload = {
            "name": "Bob Reviewer",
            "email": "bob@example.com",
            "phone": "+1122334455",
            "password": "reviewerPassword123",
            "role": "reviewer",
        }
        signup_resp = self.client.post("/auth/signup", json=signup_payload)
        self.assertEqual(signup_resp.status_code, status.HTTP_201_CREATED)

        # Login with email
        login_resp = self.client.post("/auth/login", json={
            "email": "bob@example.com",
            "password": "reviewerPassword123",
        })
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        login_data = login_resp.json()
        self.assertIn("access_token", login_data)
        self.assertEqual(login_data["role"], "reviewer")
        self.assertEqual(login_data["email"], "bob@example.com")

        # Verify JWT claims from returned token
        decoded = decode_token(login_data["access_token"])
        self.assertEqual(decoded["role"], "reviewer")
        self.assertEqual(decoded["sub"], "bob@example.com")

        # Login with phone
        login_phone_resp = self.client.post("/auth/login", json={
            "phone": "+1122334455",
            "password": "reviewerPassword123",
        })
        self.assertEqual(login_phone_resp.status_code, status.HTTP_200_OK)

        # Login with wrong password
        bad_login_resp = self.client.post("/auth/login", json={
            "email": "bob@example.com",
            "password": "wrongPassword",
        })
        self.assertEqual(bad_login_resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_06_auth_me_and_logout(self):
        # Register and get token
        signup_resp = self.client.post("/auth/signup", json={
            "name": "Alice Admin",
            "email": "alice@example.com",
            "password": "adminPassword123",
            "role": "admin",
        })
        token = signup_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # /auth/me with valid token
        me_resp = self.client.get("/auth/me", headers=headers)
        self.assertEqual(me_resp.status_code, status.HTTP_200_OK)
        me_data = me_resp.json()
        self.assertEqual(me_data["email"], "alice@example.com")
        self.assertEqual(me_data["role"], "admin")
        self.assertEqual(me_data["name"], "Alice Admin")

        # /auth/me without token -> 401
        unauth_resp = self.client.get("/auth/me")
        self.assertEqual(unauth_resp.status_code, status.HTTP_401_UNAUTHORIZED)

        # /auth/logout with token
        logout_resp = self.client.post("/auth/logout", headers=headers)
        self.assertEqual(logout_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(logout_resp.json()["status"], "success")

        # /auth/logout without token -> 401
        logout_unauth_resp = self.client.post("/auth/logout")
        self.assertEqual(logout_unauth_resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_07_reusable_role_based_guard(self):
        # Register an analyst and an admin
        analyst_signup = self.client.post("/auth/signup", json={
            "name": "Regular Analyst",
            "email": "analyst@example.com",
            "password": "password123",
            "role": "analyst",
        }).json()
        analyst_token = analyst_signup["access_token"]

        admin_signup = self.client.post("/auth/signup", json={
            "name": "Super Admin",
            "email": "admin@example.com",
            "password": "password123",
            "role": "admin",
        }).json()
        admin_token = admin_signup["access_token"]

        analyst_headers = {"Authorization": f"Bearer {analyst_token}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Analyst accessing admin-only route -> 403 Forbidden
        res1 = self.client.get("/test/admin-only", headers=analyst_headers)
        self.assertEqual(res1.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("access denied", res1.json()["detail"].lower())

        # Admin accessing admin-only route -> 200 OK
        res2 = self.client.get("/test/admin-only", headers=admin_headers)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertIn("admin access granted", res2.json()["msg"])

        # Both accessing analyst-or-admin route -> 200 OK
        res3 = self.client.get("/test/analyst-or-admin", headers=analyst_headers)
        self.assertEqual(res3.status_code, status.HTTP_200_OK)

        res4 = self.client.get("/test/analyst-or-admin", headers=admin_headers)
        self.assertEqual(res4.status_code, status.HTTP_200_OK)

        # Unauthenticated request -> 401 Unauthorized
        res5 = self.client.get("/test/admin-only")
        self.assertEqual(res5.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_08_api_v1_prefix_compatibility(self):
        # Verify /api/v1/auth routes work identically
        signup_resp = self.client.post("/api/v1/auth/signup", json={
            "name": "V1 User",
            "email": "v1user@example.com",
            "password": "password123",
            "role": "executive",
        })
        self.assertEqual(signup_resp.status_code, status.HTTP_201_CREATED)

        login_resp = self.client.post("/api/v1/auth/login", json={
            "email": "v1user@example.com",
            "password": "password123",
        })
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        token = login_resp.json()["access_token"]

        me_resp = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(me_resp.json()["email"], "v1user@example.com")

    def test_09_require_write_guard(self):
        # Viewer user without write permission
        viewer_signup = self.client.post("/auth/signup", json={
            "name": "View Only",
            "email": "viewer@example.com",
            "password": "password123",
            "role": "viewer",
        }).json()
        viewer_token = viewer_signup["access_token"]

        # Auditor user with write permission
        auditor_signup = self.client.post("/auth/signup", json={
            "name": "Auditor User",
            "email": "auditor_user@example.com",
            "password": "password123",
            "role": "auditor",
        }).json()
        auditor_token = auditor_signup["access_token"]

        from app.auth import require_write

        @main_app.post("/test/write-data")
        def write_endpoint(user: User = Depends(require_write)):
            return {"status": "written", "by": user.email}

        # Viewer gets 403 Forbidden
        viewer_res = self.client.post(
            "/test/write-data",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        self.assertEqual(viewer_res.status_code, status.HTTP_403_FORBIDDEN)

        # Auditor gets 200 OK
        auditor_res = self.client.post(
            "/test/write-data",
            headers={"Authorization": f"Bearer {auditor_token}"},
        )
        self.assertEqual(auditor_res.status_code, status.HTTP_200_OK)
        self.assertEqual(auditor_res.json()["status"], "written")

    def test_10_invalid_and_expired_token(self):
        # Invalid token format
        res1 = self.client.get("/auth/me", headers={"Authorization": "Bearer invalid.token.payload"})
        self.assertEqual(res1.status_code, status.HTTP_401_UNAUTHORIZED)

        # Expired token
        from datetime import timedelta
        expired_token = create_access_token(
            user_id="old-user",
            email="expired@example.com",
            name="Expired",
            role="analyst",
            expires_delta=timedelta(seconds=-10),
        )
        res2 = self.client.get("/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        self.assertEqual(res2.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("expired", res2.json()["detail"].lower())


if __name__ == "__main__":
    unittest.main()
