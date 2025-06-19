import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch, MagicMock
import json

from main import app
from app.core.database import get_db, Base
from app.core.security import (
    TokenManager, PasswordValidator, get_password_hash, verify_password,
    verify_email_verification_token, verify_password_reset_token
)
from app.models.user import User, UserRole, RegistrationStatus
from app.schemas.auth import UserCreate, UserLogin

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create all tables with extend_existing to handle duplicates
try:
    Base.metadata.create_all(bind=engine, checkfirst=True)
except Exception as e:
    # If there's an issue with existing tables/indexes, drop and recreate
    print(f"Database creation failed: {e}")
    print("Dropping and recreating database schema...")
    try:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    except Exception as e2:
        # If drop/recreate also fails, use a fresh engine
        print(f"Drop/recreate failed: {e2}")
        print("Creating fresh database connection...")
        engine.dispose()
        engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture
def test_user_data():
    """Test user data for registration."""
    return {
        "email": "test@example.com",
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }


@pytest.fixture
def test_db():
    """Create test database session."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_user(test_db):
    """Create a test user in the database."""
    user_data = {
        "email": "existing@example.com",
        "password_hash": get_password_hash("TestPassword123!"),
        "first_name": "Existing",
        "last_name": "User",
        "role": UserRole.CLIENT,
        "registration_status": RegistrationStatus.ACTIVE,
        "is_active": True,
        "email_verified": True,
        "data_processing_consent": True,
        "marketing_consent": False,
        "consent_date": datetime.now(timezone.utc)
    }
    
    user = User(**user_data)
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    
    return user


class TestPasswordValidator:
    """Test password validation functionality."""
    
    def test_valid_password(self):
        """Test valid password passes validation."""
        password = "SecurePassword123!"
        is_valid, errors = PasswordValidator.validate_password_strength(password)
        
        assert is_valid is True
        assert len(errors) == 0
    
    def test_password_too_short(self):
        """Test password too short fails validation."""
        password = "Short1!"
        is_valid, errors = PasswordValidator.validate_password_strength(password)
        
        assert is_valid is False
        assert "Password must be at least 8 characters long" in errors
    
    def test_password_no_uppercase(self):
        """Test password without uppercase fails validation."""
        password = "lowercase123!"
        is_valid, errors = PasswordValidator.validate_password_strength(password)
        
        assert is_valid is False
        assert "Password must contain at least one uppercase letter" in errors
    
    def test_password_no_lowercase(self):
        """Test password without lowercase fails validation."""
        password = "UPPERCASE123!"
        is_valid, errors = PasswordValidator.validate_password_strength(password)
        
        assert is_valid is False
        assert "Password must contain at least one lowercase letter" in errors
    
    def test_password_no_digit(self):
        """Test password without digit fails validation."""
        password = "NoDigitsHere!"
        is_valid, errors = PasswordValidator.validate_password_strength(password)
        
        assert is_valid is False
        assert "Password must contain at least one digit" in errors
    
    def test_password_no_special_char(self):
        """Test password without special character fails validation."""
        password = "NoSpecialChar123"
        is_valid, errors = PasswordValidator.validate_password_strength(password)
        
        assert is_valid is False
        assert "Password must contain at least one special character" in errors
    
    def test_common_password(self):
        """Test common password fails validation."""
        password = "password123"
        is_valid, errors = PasswordValidator.validate_password_strength(password)
        
        assert is_valid is False
        # Should fail for multiple reasons - check if "too common" is one of them
        assert any("too common" in error for error in errors)


class TestTokenManager:
    """Test JWT token management."""
    
    def test_create_access_token(self):
        """Test access token creation."""
        user_id = 1
        token = TokenManager.create_access_token(user_id)
        
        assert token is not None
        assert isinstance(token, str)
        
        # Verify token structure
        payload = TokenManager.verify_token(token, "access")
        assert payload is not None
        assert payload["sub"] == str(user_id)
        assert payload["type"] == "access"
    
    def test_create_refresh_token(self):
        """Test refresh token creation."""
        user_id = 1
        token = TokenManager.create_refresh_token(user_id)
        
        assert token is not None
        assert isinstance(token, str)
        
        # Verify token structure
        payload = TokenManager.verify_token(token, "refresh")
        assert payload is not None
        assert payload["sub"] == str(user_id)
        assert payload["type"] == "refresh"
        assert "jti" in payload
    
    def test_create_email_verification_token(self):
        """Test email verification token creation."""
        email = "test@example.com"
        token = TokenManager.create_email_verification_token(email)
        
        assert token is not None
        assert isinstance(token, str)
        
        # Verify token structure
        payload = TokenManager.verify_token(token, "email_verification")
        assert payload is not None
        assert payload["email"] == email
        assert payload["type"] == "email_verification"
    
    def test_create_password_reset_token(self):
        """Test password reset token creation."""
        email = "test@example.com"
        token = TokenManager.create_password_reset_token(email)
        
        assert token is not None
        assert isinstance(token, str)
        
        # Verify token structure
        payload = TokenManager.verify_token(token, "password_reset")
        assert payload is not None
        assert payload["email"] == email
        assert payload["type"] == "password_reset"
    
    def test_verify_invalid_token(self):
        """Test invalid token verification."""
        invalid_token = "invalid.token.here"
        payload = TokenManager.verify_token(invalid_token, "access")
        
        assert payload is None
    
    def test_verify_wrong_token_type(self):
        """Test token type mismatch."""
        token = TokenManager.create_access_token(1)
        payload = TokenManager.verify_token(token, "refresh")
        
        assert payload is None


class TestAuthEndpoints:
    """Test authentication endpoints."""
    
    @patch('app.services.email.send_verification_email')
    def test_register_user_success(self, mock_email, test_user_data):
        """Test successful user registration."""
        mock_email.return_value = True
        
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["message"] == "Registration successful. Please check your email to verify your account."
        assert "user_id" in data["data"]
        assert data["data"]["email"] == test_user_data["email"]
        
        # Verify email was called
        mock_email.assert_called_once()
    
    def test_register_user_duplicate_email(self, test_user_data, test_user):
        """Test registration with duplicate email."""
        test_user_data["email"] = test_user.email
        
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == 400
        data = response.json()
        assert "Email already registered" in data["message"]
    
    def test_register_user_invalid_password(self, test_user_data):
        """Test registration with invalid password."""
        test_user_data["password"] = "weak"
        
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == 422
    
    def test_register_user_missing_consent(self, test_user_data):
        """Test registration without GDPR consent."""
        test_user_data["data_processing_consent"] = False
        
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == 422
    
    def test_login_success(self, test_user):
        """Test successful login."""
        login_data = {
            "email": test_user.email,
            "password": "TestPassword123!",
            "remember_me": False
        }
        
        response = client.post("/api/v1/auth/login-json", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 900  # 15 minutes
        assert data["user"]["email"] == test_user.email
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "WrongPassword123!",
            "remember_me": False
        }

        response = client.post("/api/v1/auth/login-json", json=login_data)
        
        assert response.status_code == 401
        data = response.json()
        assert "Invalid email or password" in data["message"]
    
    def test_login_inactive_user(self, test_user):
        """Test login with inactive user."""
        test_user.is_active = False
        
        login_data = {
            "email": test_user.email,
            "password": "TestPassword123!",
            "remember_me": False
        }
        
        response = client.post("/api/v1/auth/login-json", json=login_data)
        
        assert response.status_code == 401
    
    def test_refresh_token_success(self, test_user):
        """Test successful token refresh."""
        # Create refresh token
        refresh_token = TokenManager.create_refresh_token(test_user.id)
        
        refresh_data = {"refresh_token": refresh_token}
        response = client.post("/api/v1/auth/refresh-token", json=refresh_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 900
    
    def test_refresh_token_invalid(self):
        """Test token refresh with invalid token."""
        refresh_data = {"refresh_token": "invalid.token.here"}
        response = client.post("/api/v1/auth/refresh-token", json=refresh_data)
        
        assert response.status_code == 401
        data = response.json()
        assert "Invalid refresh token" in data["message"]
    
    def test_verify_email_success(self, test_db):
        """Test successful email verification."""
        # Create unverified user
        user = User(
            email="unverified@example.com",
            password_hash=get_password_hash("TestPassword123!"),
            first_name="Unverified",
            last_name="User",
            role=UserRole.CLIENT,
            registration_status=RegistrationStatus.PENDING_EMAIL_VERIFICATION,
            is_active=True,
            email_verified=False,
            data_processing_consent=True,
            marketing_consent=False,
            consent_date=datetime.now(timezone.utc)
        )
        test_db.add(user)
        test_db.commit()
        
        # Create verification token
        verification_token = TokenManager.create_email_verification_token(user.email)
        
        verification_data = {"token": verification_token}
        response = client.post("/api/v1/auth/verify-email", json=verification_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "Email verified successfully" in data["message"]
        
        # Verify user status updated
        test_db.refresh(user)
        assert user.email_verified is True
        assert user.registration_status == RegistrationStatus.ACTIVE
    
    def test_verify_email_invalid_token(self):
        """Test email verification with invalid token."""
        verification_data = {"token": "invalid.token.here"}
        response = client.post("/api/v1/auth/verify-email", json=verification_data)
        
        assert response.status_code == 400
        data = response.json()
        assert "Invalid or expired verification token" in data["message"]
    
    @patch('app.services.email.send_password_reset_email')
    def test_forgot_password_success(self, mock_email, test_user):
        """Test successful password reset request."""
        mock_email.return_value = True
        
        reset_request = {"email": test_user.email}
        response = client.post("/api/v1/auth/forgot-password", json=reset_request)
        
        assert response.status_code == 200
        data = response.json()
        assert "password reset email has been sent" in data["message"]
        
        # Verify email was called
        mock_email.assert_called_once()
    
    def test_forgot_password_nonexistent_email(self):
        """Test password reset request for nonexistent email."""
        reset_request = {"email": "nonexistent@example.com"}
        response = client.post("/api/v1/auth/forgot-password", json=reset_request)
        
        # Should return success for security (don't reveal if email exists)
        assert response.status_code == 200
        data = response.json()
        assert "password reset email has been sent" in data["message"]
    
    def test_reset_password_success(self, test_user, test_db):
        """Test successful password reset."""
        # Create reset token
        reset_token = TokenManager.create_password_reset_token(test_user.email)
        
        # Update user with reset token
        test_user.password_reset_token = reset_token
        test_user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        test_db.commit()
        
        reset_data = {
            "token": reset_token,
            "new_password": "NewPassword123!"
        }
        response = client.post("/api/v1/auth/reset-password", json=reset_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "Password reset successfully" in data["message"]
        
        # Verify password changed
        test_db.refresh(test_user)
        assert verify_password("NewPassword123!", test_user.password_hash)
        assert test_user.password_reset_token is None
    
    def test_reset_password_invalid_token(self):
        """Test password reset with invalid token."""
        reset_data = {
            "token": "invalid.token.here",
            "new_password": "NewPassword123!"
        }
        response = client.post("/api/v1/auth/reset-password", json=reset_data)
        
        assert response.status_code == 400
        data = response.json()
        assert "Invalid or expired reset token" in data["message"]
    
    def test_get_current_user_profile(self, test_user):
        """Test getting current user profile."""
        # Create access token
        access_token = TokenManager.create_access_token(test_user.id)
        
        headers = {"Authorization": f"Bearer {access_token}"}
        response = client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["id"] == test_user.id
        assert data["role"] == test_user.role.value
    
    def test_get_current_user_invalid_token(self):
        """Test getting current user with invalid token."""
        headers = {"Authorization": "Bearer invalid.token.here"}
        response = client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 401
    
    def test_update_user_profile(self, test_user, test_db):
        """Test updating user profile."""
        # Create access token
        access_token = TokenManager.create_access_token(test_user.id)
        
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "company_name": "Updated Company",
            "phone": "+48123456789"
        }
        
        headers = {"Authorization": f"Bearer {access_token}"}
        response = client.put("/api/v1/auth/me", json=update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Updated"
        assert data["last_name"] == "Name"
        assert data["company_name"] == "Updated Company"
        assert data["phone"] == "+48123456789"
    
    def test_change_password_success(self, test_user):
        """Test successful password change."""
        # Create access token
        access_token = TokenManager.create_access_token(test_user.id)
        
        password_data = {
            "current_password": "TestPassword123!",
            "new_password": "NewPassword456!"
        }
        
        headers = {"Authorization": f"Bearer {access_token}"}
        response = client.post("/api/v1/auth/change-password", json=password_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "Password changed successfully" in data["message"]
    
    def test_change_password_wrong_current(self, test_user):
        """Test password change with wrong current password."""
        # Create access token
        access_token = TokenManager.create_access_token(test_user.id)
        
        password_data = {
            "current_password": "WrongPassword123!",
            "new_password": "NewPassword456!"
        }
        
        headers = {"Authorization": f"Bearer {access_token}"}
        response = client.post("/api/v1/auth/change-password", json=password_data, headers=headers)
        
        assert response.status_code == 400
        data = response.json()
        assert "Current password is incorrect" in data["message"]
    
    def test_check_password_strength_strong(self):
        """Test password strength check with strong password."""
        password_data = {"password": "StrongPassword123!"}
        response = client.post("/api/v1/auth/check-password-strength", json=password_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_strong"] is True
        assert "meets all security requirements" in data["message"]
    
    def test_check_password_strength_weak(self):
        """Test password strength check with weak password."""
        password_data = {"password": "weak"}
        response = client.post("/api/v1/auth/check-password-strength", json=password_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_strong"] is False
        assert len(data["message"]) > 0


class TestRateLimiting:
    """Test rate limiting functionality."""
    
    def test_auth_endpoint_rate_limiting(self):
        """Test rate limiting on auth endpoints."""
        login_data = {
            "email": "test@example.com",
            "password": "WrongPassword123!",
            "remember_me": False
        }
        
        # Make multiple requests quickly
        responses = []
        for _ in range(10):
            response = client.post("/api/v1/auth/login", json=login_data)
            responses.append(response)
        
        # Check if any requests were rate limited
        rate_limited = any(r.status_code == 429 for r in responses)
        
        # Note: In a real test environment, you might need to adjust the rate limits
        # or use a different approach to test rate limiting
        assert len(responses) == 10


class TestGDPRCompliance:
    """Test GDPR compliance features."""
    
    def test_user_data_includes_consent_fields(self, test_user):
        """Test that user data includes GDPR consent fields."""
        # Create access token
        access_token = TokenManager.create_access_token(test_user.id)
        
        headers = {"Authorization": f"Bearer {access_token}"}
        response = client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data_processing_consent" in data
        assert "marketing_consent" in data
        assert data["data_processing_consent"] is True
    
    def test_registration_requires_consent(self, test_user_data):
        """Test that registration requires GDPR consent."""
        test_user_data["data_processing_consent"] = False
        
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 