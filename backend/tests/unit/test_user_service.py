"""
Unit tests for User Service
"""
import pytest
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.services.user import UserService
from app.models.user import User
from tests.factories import UserFactory, BuyerFactory, ManufacturerFactory


class TestUserService:
    """Test cases for UserService"""

    @pytest.fixture
    def mock_db_session(self):
        """Mock database session"""
        return Mock(spec=Session)

    @pytest.fixture
    def user_service(self, mock_db_session):
        """Create UserService instance with mocked database"""
        return UserService(db=mock_db_session)

    @pytest.fixture
    def sample_user(self):
        """Create a sample user"""
        return UserFactory.build()

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_user_by_id_success(self, user_service, mock_db_session, sample_user):
        """Test successful user retrieval by ID"""
        # Arrange
        user_id = 1
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_user

        # Act
        result = await user_service.get_user_by_id(user_id)

        # Assert
        assert result == sample_user
        mock_db_session.query.assert_called_once_with(User)
        mock_db_session.query.return_value.filter.assert_called_once()
        mock_db_session.query.return_value.filter.return_value.first.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_user_by_id_not_found(self, user_service, mock_db_session):
        """Test user retrieval by ID when user doesn't exist"""
        # Arrange
        user_id = 999
        mock_db_session.query.return_value.filter.return_value.first.return_value = None

        # Act
        result = await user_service.get_user_by_id(user_id)

        # Assert
        assert result is None
        mock_db_session.query.assert_called_once_with(User)

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_user_by_id_database_error(self, user_service, mock_db_session):
        """Test user retrieval by ID with database error"""
        # Arrange
        user_id = 1
        mock_db_session.query.side_effect = SQLAlchemyError("Database connection error")

        # Act
        result = await user_service.get_user_by_id(user_id)

        # Assert
        assert result is None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_user_by_email_success(self, user_service, mock_db_session, sample_user):
        """Test successful user retrieval by email"""
        # Arrange
        email = "test@example.com"
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_user

        # Act
        result = await user_service.get_user_by_email(email)

        # Assert
        assert result == sample_user
        mock_db_session.query.assert_called_once_with(User)

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_user_by_email_not_found(self, user_service, mock_db_session):
        """Test user retrieval by email when user doesn't exist"""
        # Arrange
        email = "nonexistent@example.com"
        mock_db_session.query.return_value.filter.return_value.first.return_value = None

        # Act
        result = await user_service.get_user_by_email(email)

        # Assert
        assert result is None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_user_by_email_database_error(self, user_service, mock_db_session):
        """Test user retrieval by email with database error"""
        # Arrange
        email = "test@example.com"
        mock_db_session.query.side_effect = SQLAlchemyError("Database connection error")

        # Act
        result = await user_service.get_user_by_email(email)

        # Assert
        assert result is None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_create_user_success(self, user_service, mock_db_session):
        """Test successful user creation"""
        # Arrange
        user_data = {
            "email": "newuser@example.com",
            "password": "SecurePassword123!",
            "first_name": "John",
            "last_name": "Doe",
            "company_name": "Test Company",
            "role": "buyer"
        }
        
        created_user = UserFactory.build(**user_data)
        mock_db_session.add = Mock()
        mock_db_session.commit = Mock()
        mock_db_session.refresh = Mock()
        
        with patch('app.services.user.User') as mock_user_class:
            mock_user_class.return_value = created_user
            
            # Act
            result = await user_service.create_user(user_data)
            
            # Assert
            assert result == created_user
            mock_db_session.add.assert_called_once()
            mock_db_session.commit.assert_called_once()
            mock_db_session.refresh.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_update_user_success(self, user_service, mock_db_session, sample_user):
        """Test successful user update"""
        # Arrange
        user_id = 1
        update_data = {
            "first_name": "Updated Name",
            "company_name": "Updated Company"
        }
        
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_user
        mock_db_session.commit = Mock()
        mock_db_session.refresh = Mock()

        # Act
        result = await user_service.update_user(user_id, update_data)

        # Assert
        assert result == sample_user
        assert sample_user.first_name == "Updated Name"
        assert sample_user.company_name == "Updated Company"
        mock_db_session.commit.assert_called_once()
        mock_db_session.refresh.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_update_user_not_found(self, user_service, mock_db_session):
        """Test user update when user doesn't exist"""
        # Arrange
        user_id = 999
        update_data = {"first_name": "Updated Name"}
        mock_db_session.query.return_value.filter.return_value.first.return_value = None

        # Act
        result = await user_service.update_user(user_id, update_data)

        # Assert
        assert result is None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_delete_user_success(self, user_service, mock_db_session, sample_user):
        """Test successful user deletion"""
        # Arrange
        user_id = 1
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_user
        mock_db_session.delete = Mock()
        mock_db_session.commit = Mock()

        # Act
        result = await user_service.delete_user(user_id)

        # Assert
        assert result is True
        mock_db_session.delete.assert_called_once_with(sample_user)
        mock_db_session.commit.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_delete_user_not_found(self, user_service, mock_db_session):
        """Test user deletion when user doesn't exist"""
        # Arrange
        user_id = 999
        mock_db_session.query.return_value.filter.return_value.first.return_value = None

        # Act
        result = await user_service.delete_user(user_id)

        # Assert
        assert result is False

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_verify_user_success(self, user_service, mock_db_session, sample_user):
        """Test successful user verification"""
        # Arrange
        user_id = 1
        sample_user.is_verified = False
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_user
        mock_db_session.commit = Mock()

        # Act
        result = await user_service.verify_user(user_id)

        # Assert
        assert result is True
        assert sample_user.is_verified is True
        mock_db_session.commit.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_deactivate_user_success(self, user_service, mock_db_session, sample_user):
        """Test successful user deactivation"""
        # Arrange
        user_id = 1
        sample_user.is_active = True
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_user
        mock_db_session.commit = Mock()

        # Act
        result = await user_service.deactivate_user(user_id)

        # Assert
        assert result is True
        assert sample_user.is_active is False
        mock_db_session.commit.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_users_by_role(self, user_service, mock_db_session):
        """Test getting users by role"""
        # Arrange
        role = "buyer"
        buyers = [BuyerFactory.build() for _ in range(3)]
        mock_db_session.query.return_value.filter.return_value.all.return_value = buyers

        # Act
        result = await user_service.get_users_by_role(role)

        # Assert
        assert result == buyers
        mock_db_session.query.assert_called_once_with(User)

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_search_users(self, user_service, mock_db_session):
        """Test user search functionality"""
        # Arrange
        search_term = "test company"
        matching_users = [UserFactory.build(company_name="Test Company Inc")]
        mock_db_session.query.return_value.filter.return_value.all.return_value = matching_users

        # Act
        result = await user_service.search_users(search_term)

        # Assert
        assert result == matching_users

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_user_statistics(self, user_service, mock_db_session):
        """Test getting user statistics"""
        # Arrange
        mock_db_session.query.return_value.count.side_effect = [100, 60, 40]  # total, buyers, manufacturers

        # Act
        result = await user_service.get_user_statistics()

        # Assert
        expected_stats = {
            "total_users": 100,
            "buyers": 60,
            "manufacturers": 40,
            "verified_users": 0,
            "active_users": 0
        }
        assert result["total_users"] == expected_stats["total_users"]
        assert result["buyers"] == expected_stats["buyers"]
        assert result["manufacturers"] == expected_stats["manufacturers"]

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_change_user_password(self, user_service, mock_db_session, sample_user):
        """Test changing user password"""
        # Arrange
        user_id = 1
        new_password = "NewSecurePassword123!"
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_user
        mock_db_session.commit = Mock()

        with patch('app.core.security.get_password_hash') as mock_hash:
            mock_hash.return_value = "hashed_new_password"
            
            # Act
            result = await user_service.change_password(user_id, new_password)

            # Assert
            assert result is True
            assert sample_user.password_hash == "hashed_new_password"
            mock_hash.assert_called_once_with(new_password)
            mock_db_session.commit.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_user_profile(self, user_service, mock_db_session, sample_user):
        """Test getting user profile with additional data"""
        # Arrange
        user_id = 1
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_user

        # Act
        result = await user_service.get_user_profile(user_id)

        # Assert
        assert result is not None
        assert "user" in result
        assert result["user"] == sample_user

    @pytest.mark.unit
    @pytest.mark.parametrize("role,expected_count", [
        ("buyer", 5),
        ("manufacturer", 3),
        ("admin", 0)
    ])
    async def test_get_users_by_role_parametrized(self, user_service, mock_db_session, role, expected_count):
        """Test getting users by different roles"""
        # Arrange
        users = [UserFactory.build(role=role) for _ in range(expected_count)]
        mock_db_session.query.return_value.filter.return_value.all.return_value = users

        # Act
        result = await user_service.get_users_by_role(role)

        # Assert
        assert len(result) == expected_count
        for user in result:
            assert user.role == role

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_bulk_update_users(self, user_service, mock_db_session):
        """Test bulk updating multiple users"""
        # Arrange
        user_ids = [1, 2, 3]
        update_data = {"is_verified": True}
        mock_db_session.query.return_value.filter.return_value.update.return_value = len(user_ids)
        mock_db_session.commit = Mock()

        # Act
        result = await user_service.bulk_update_users(user_ids, update_data)

        # Assert
        assert result == len(user_ids)
        mock_db_session.commit.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_recent_users(self, user_service, mock_db_session):
        """Test getting recently registered users"""
        # Arrange
        limit = 10
        recent_users = [UserFactory.build() for _ in range(limit)]
        mock_db_session.query.return_value.order_by.return_value.limit.return_value.all.return_value = recent_users

        # Act
        result = await user_service.get_recent_users(limit)

        # Assert
        assert len(result) == limit
        assert result == recent_users 