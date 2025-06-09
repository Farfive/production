"""
Integration tests for Authentication API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient
import json

from tests.factories import UserFactory, BuyerFactory, ManufacturerFactory


class TestAuthEndpoints:
    """Integration tests for authentication endpoints"""

    @pytest.mark.integration
    @pytest.mark.auth
    def test_register_buyer_success(self, client: TestClient, sample_user_data):
        """Test successful buyer registration"""
        # Act
        response = client.post("/api/v1/auth/register", json=sample_user_data)

        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == sample_user_data["email"]
        assert data["role"] == sample_user_data["role"]
        assert "id" in data
        assert "password" not in data  # Password should not be returned

    @pytest.mark.integration
    @pytest.mark.auth
    def test_register_manufacturer_success(self, client: TestClient, sample_manufacturer_data):
        """Test successful manufacturer registration"""
        # Act
        response = client.post("/api/v1/auth/register", json=sample_manufacturer_data)

        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == sample_manufacturer_data["email"]
        assert data["role"] == sample_manufacturer_data["role"]
        assert "capabilities" in data
        assert "certifications" in data

    @pytest.mark.integration
    @pytest.mark.auth
    def test_register_duplicate_email(self, client: TestClient, sample_user_data):
        """Test registration with duplicate email"""
        # Arrange - Register first user
        client.post("/api/v1/auth/register", json=sample_user_data)

        # Act - Try to register with same email
        response = client.post("/api/v1/auth/register", json=sample_user_data)

        # Assert
        assert response.status_code == 400
        data = response.json()
        assert "already registered" in data["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.auth
    def test_register_invalid_email(self, client: TestClient, sample_user_data):
        """Test registration with invalid email"""
        # Arrange
        sample_user_data["email"] = "invalid-email"

        # Act
        response = client.post("/api/v1/auth/register", json=sample_user_data)

        # Assert
        assert response.status_code == 422
        data = response.json()
        assert "email" in str(data["detail"]).lower()

    @pytest.mark.integration
    @pytest.mark.auth
    def test_register_weak_password(self, client: TestClient, sample_user_data):
        """Test registration with weak password"""
        # Arrange
        sample_user_data["password"] = "weak"

        # Act
        response = client.post("/api/v1/auth/register", json=sample_user_data)

        # Assert
        assert response.status_code == 422
        data = response.json()
        assert "password" in str(data["detail"]).lower()

    @pytest.mark.integration
    @pytest.mark.auth
    def test_login_success(self, client: TestClient, sample_user_data):
        """Test successful login"""
        # Arrange - Register user first
        client.post("/api/v1/auth/register", json=sample_user_data)

        # Act
        response = client.post("/api/v1/auth/login", data={
            "username": sample_user_data["email"],
            "password": sample_user_data["password"]
        })

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data

    @pytest.mark.integration
    @pytest.mark.auth
    def test_login_invalid_credentials(self, client: TestClient, sample_user_data):
        """Test login with invalid credentials"""
        # Arrange - Register user first
        client.post("/api/v1/auth/register", json=sample_user_data)

        # Act
        response = client.post("/api/v1/auth/login", data={
            "username": sample_user_data["email"],
            "password": "wrong_password"
        })

        # Assert
        assert response.status_code == 401
        data = response.json()
        assert "incorrect" in data["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.auth
    def test_login_nonexistent_user(self, client: TestClient):
        """Test login with non-existent user"""
        # Act
        response = client.post("/api/v1/auth/login", data={
            "username": "nonexistent@example.com",
            "password": "password123"
        })

        # Assert
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.auth
    def test_get_current_user_success(self, client: TestClient, authenticated_user):
        """Test getting current user information"""
        # Act
        response = client.get("/api/v1/auth/me", headers=authenticated_user["headers"])

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == authenticated_user["user"]["email"]
        assert "id" in data
        assert "password" not in data

    @pytest.mark.integration
    @pytest.mark.auth
    def test_get_current_user_unauthorized(self, client: TestClient):
        """Test getting current user without authentication"""
        # Act
        response = client.get("/api/v1/auth/me")

        # Assert
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.auth
    def test_get_current_user_invalid_token(self, client: TestClient):
        """Test getting current user with invalid token"""
        # Act
        response = client.get("/api/v1/auth/me", headers={
            "Authorization": "Bearer invalid_token"
        })

        # Assert
        assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.auth
    def test_refresh_token_success(self, client: TestClient, authenticated_user):
        """Test successful token refresh"""
        # Act
        response = client.post("/api/v1/auth/refresh", headers=authenticated_user["headers"])

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["access_token"] != authenticated_user["token"]

    @pytest.mark.integration
    @pytest.mark.auth
    def test_logout_success(self, client: TestClient, authenticated_user):
        """Test successful logout"""
        # Act
        response = client.post("/api/v1/auth/logout", headers=authenticated_user["headers"])

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "message" in data

        # Verify token is invalidated
        me_response = client.get("/api/v1/auth/me", headers=authenticated_user["headers"])
        assert me_response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.auth
    def test_change_password_success(self, client: TestClient, authenticated_user):
        """Test successful password change"""
        # Arrange
        password_data = {
            "current_password": "TestPassword123!",
            "new_password": "NewPassword456!",
            "confirm_password": "NewPassword456!"
        }

        # Act
        response = client.put("/api/v1/auth/change-password", 
                            json=password_data, 
                            headers=authenticated_user["headers"])

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "message" in data

        # Verify can login with new password
        login_response = client.post("/api/v1/auth/login", data={
            "username": authenticated_user["user"]["email"],
            "password": "NewPassword456!"
        })
        assert login_response.status_code == 200

    @pytest.mark.integration
    @pytest.mark.auth
    def test_change_password_wrong_current(self, client: TestClient, authenticated_user):
        """Test password change with wrong current password"""
        # Arrange
        password_data = {
            "current_password": "WrongPassword123!",
            "new_password": "NewPassword456!",
            "confirm_password": "NewPassword456!"
        }

        # Act
        response = client.put("/api/v1/auth/change-password", 
                            json=password_data, 
                            headers=authenticated_user["headers"])

        # Assert
        assert response.status_code == 400
        data = response.json()
        assert "current password" in data["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.auth
    def test_change_password_mismatch(self, client: TestClient, authenticated_user):
        """Test password change with password confirmation mismatch"""
        # Arrange
        password_data = {
            "current_password": "TestPassword123!",
            "new_password": "NewPassword456!",
            "confirm_password": "DifferentPassword789!"
        }

        # Act
        response = client.put("/api/v1/auth/change-password", 
                            json=password_data, 
                            headers=authenticated_user["headers"])

        # Assert
        assert response.status_code == 400
        data = response.json()
        assert "match" in data["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.auth
    def test_forgot_password_success(self, client: TestClient, sample_user_data, mock_email_service):
        """Test successful forgot password request"""
        # Arrange - Register user first
        client.post("/api/v1/auth/register", json=sample_user_data)

        # Act
        response = client.post("/api/v1/auth/forgot-password", json={
            "email": sample_user_data["email"]
        })

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        mock_email_service["send_template_email"].assert_called_once()

    @pytest.mark.integration
    @pytest.mark.auth
    def test_forgot_password_nonexistent_email(self, client: TestClient):
        """Test forgot password with non-existent email"""
        # Act
        response = client.post("/api/v1/auth/forgot-password", json={
            "email": "nonexistent@example.com"
        })

        # Assert
        assert response.status_code == 200  # Should return 200 for security reasons
        data = response.json()
        assert "message" in data

    @pytest.mark.integration
    @pytest.mark.auth
    def test_reset_password_success(self, client: TestClient, sample_user_data):
        """Test successful password reset"""
        # Arrange - Register user and get reset token
        client.post("/api/v1/auth/register", json=sample_user_data)
        
        # Mock reset token (in real scenario, this would come from email)
        reset_token = "valid_reset_token_123"
        
        with pytest.mock.patch('app.core.security.verify_password_reset_token') as mock_verify:
            mock_verify.return_value = sample_user_data["email"]
            
            # Act
            response = client.post("/api/v1/auth/reset-password", json={
                "token": reset_token,
                "new_password": "NewResetPassword123!",
                "confirm_password": "NewResetPassword123!"
            })

            # Assert
            assert response.status_code == 200
            data = response.json()
            assert "message" in data

    @pytest.mark.integration
    @pytest.mark.auth
    def test_reset_password_invalid_token(self, client: TestClient):
        """Test password reset with invalid token"""
        # Act
        response = client.post("/api/v1/auth/reset-password", json={
            "token": "invalid_token",
            "new_password": "NewPassword123!",
            "confirm_password": "NewPassword123!"
        })

        # Assert
        assert response.status_code == 400
        data = response.json()
        assert "invalid" in data["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.auth
    def test_verify_email_success(self, client: TestClient, sample_user_data):
        """Test successful email verification"""
        # Arrange - Register user
        register_response = client.post("/api/v1/auth/register", json=sample_user_data)
        user_id = register_response.json()["id"]
        
        # Mock verification token
        verification_token = "valid_verification_token_123"
        
        with pytest.mock.patch('app.core.security.verify_email_token') as mock_verify:
            mock_verify.return_value = user_id
            
            # Act
            response = client.get(f"/api/v1/auth/verify-email?token={verification_token}")

            # Assert
            assert response.status_code == 200
            data = response.json()
            assert "verified" in data["message"].lower()

    @pytest.mark.integration
    @pytest.mark.auth
    def test_verify_email_invalid_token(self, client: TestClient):
        """Test email verification with invalid token"""
        # Act
        response = client.get("/api/v1/auth/verify-email?token=invalid_token")

        # Assert
        assert response.status_code == 400
        data = response.json()
        assert "invalid" in data["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.auth
    def test_resend_verification_email(self, client: TestClient, sample_user_data, mock_email_service):
        """Test resending verification email"""
        # Arrange - Register user
        client.post("/api/v1/auth/register", json=sample_user_data)

        # Act
        response = client.post("/api/v1/auth/resend-verification", json={
            "email": sample_user_data["email"]
        })

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "sent" in data["message"].lower()
        mock_email_service["send_template_email"].assert_called()

    @pytest.mark.integration
    @pytest.mark.auth
    @pytest.mark.asyncio
    async def test_async_register_success(self, async_client: AsyncClient, sample_user_data):
        """Test async registration endpoint"""
        # Act
        response = await async_client.post("/api/v1/auth/register", json=sample_user_data)

        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == sample_user_data["email"]

    @pytest.mark.integration
    @pytest.mark.auth
    @pytest.mark.asyncio
    async def test_async_login_success(self, async_client: AsyncClient, sample_user_data):
        """Test async login endpoint"""
        # Arrange - Register user first
        await async_client.post("/api/v1/auth/register", json=sample_user_data)

        # Act
        response = await async_client.post("/api/v1/auth/login", data={
            "username": sample_user_data["email"],
            "password": sample_user_data["password"]
        })

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    @pytest.mark.integration
    @pytest.mark.auth
    def test_rate_limiting_login_attempts(self, client: TestClient, sample_user_data):
        """Test rate limiting on login attempts"""
        # Arrange - Register user
        client.post("/api/v1/auth/register", json=sample_user_data)

        # Act - Make multiple failed login attempts
        for _ in range(6):  # Assuming rate limit is 5 attempts
            response = client.post("/api/v1/auth/login", data={
                "username": sample_user_data["email"],
                "password": "wrong_password"
            })

        # Assert - Should be rate limited after 5 attempts
        assert response.status_code == 429

    @pytest.mark.integration
    @pytest.mark.auth
    def test_account_lockout_after_failed_attempts(self, client: TestClient, sample_user_data):
        """Test account lockout after multiple failed login attempts"""
        # Arrange - Register user
        client.post("/api/v1/auth/register", json=sample_user_data)

        # Act - Make multiple failed login attempts
        for _ in range(10):  # Assuming lockout threshold is 10 attempts
            client.post("/api/v1/auth/login", data={
                "username": sample_user_data["email"],
                "password": "wrong_password"
            })

        # Try with correct password - should still be locked
        response = client.post("/api/v1/auth/login", data={
            "username": sample_user_data["email"],
            "password": sample_user_data["password"]
        })

        # Assert
        assert response.status_code == 423  # Account locked
        data = response.json()
        assert "locked" in data["detail"].lower()

    @pytest.mark.integration
    @pytest.mark.auth
    def test_token_expiration(self, client: TestClient, authenticated_user):
        """Test token expiration handling"""
        # This test would require mocking time or using expired tokens
        # For now, we'll test the endpoint behavior with an expired token
        
        with pytest.mock.patch('app.core.security.decode_access_token') as mock_decode:
            mock_decode.side_effect = Exception("Token expired")
            
            # Act
            response = client.get("/api/v1/auth/me", headers={
                "Authorization": "Bearer expired_token"
            })

            # Assert
            assert response.status_code == 401

    @pytest.mark.integration
    @pytest.mark.auth
    def test_role_based_access(self, client: TestClient, authenticated_user, authenticated_manufacturer):
        """Test role-based access control"""
        # Test buyer accessing buyer-only endpoint
        response = client.get("/api/v1/orders/my-orders", headers=authenticated_user["headers"])
        assert response.status_code == 200

        # Test manufacturer accessing manufacturer-only endpoint
        response = client.get("/api/v1/quotes/my-quotes", headers=authenticated_manufacturer["headers"])
        assert response.status_code == 200

        # Test buyer trying to access manufacturer-only endpoint
        response = client.get("/api/v1/quotes/my-quotes", headers=authenticated_user["headers"])
        assert response.status_code == 403  # Forbidden 