import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from app.core.database import get_db, Base
from app.core.security import create_access_token, get_password_hash
from app.models.user import User, UserRole, RegistrationStatus
from app.models.producer import Manufacturer

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()

@pytest.fixture(scope="function")
def test_client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app)
    finally:
        if get_db in app.dependency_overrides:
            del app.dependency_overrides[get_db]

@pytest.fixture(scope="function")
def test_manufacturer_user(db_session: Session) -> User:
    """Fixture to create a manufacturer user with a profile, available for each test function."""
    user = db_session.query(User).filter(User.email == "manufacturer@staging.manufacturing-platform.com").first()
    if not user:
        user = User(
            email="manufacturer@staging.manufacturing-platform.com",
            password_hash=get_password_hash("aStrongPassword123!"),
            first_name="Test",
            last_name="Manufacturer",
            role=UserRole.MANUFACTURER,
            registration_status=RegistrationStatus.ACTIVE,
            email_verified=True,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        manufacturer_profile = Manufacturer(
            user_id=user.id,
            business_name="Test Manufacturer Inc.",
            city="Testville",
            country="PL",
            postal_code="12345",
            website="http://test-manufacturer.com"
        )
        db_session.add(manufacturer_profile)
        db_session.commit()
        db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def test_client_user(db_session: Session) -> User:
    """Fixture to create a client user, available for each test function."""
    user = db_session.query(User).filter(User.email == "client@staging.manufacturing-platform.com").first()
    if not user:
        user = User(
            email="client@staging.manufacturing-platform.com",
            password_hash=get_password_hash("aStrongPassword123!"),
            first_name="Test",
            last_name="Client",
            role=UserRole.CLIENT,
            registration_status=RegistrationStatus.ACTIVE,
            email_verified=True,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def manufacturer_auth_headers(test_manufacturer_user: User) -> dict:
    """Generate auth headers for the test manufacturer user."""
    token = create_access_token(subject=test_manufacturer_user.id)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
def client_auth_headers(test_client_user: User) -> dict:
    """Generate auth headers for the test client user."""
    token = create_access_token(subject=test_client_user.id)
    return {"Authorization": f"Bearer {token}"}