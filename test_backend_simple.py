#!/usr/bin/env python3
"""
Simple Backend Test - Verify server can start with fixed database
"""

import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

def test_imports():
    """Test that all imports work correctly"""
    
    print("🔍 Testing imports...")
    
    try:
        # Test core imports
        from sqlalchemy import create_engine
        print("✅ SQLAlchemy import OK")
        
        from app.core.database import Base, get_db
        print("✅ Database core import OK")
        
        # Test model imports
        from app.models.user import User, UserRole, RegistrationStatus
        from app.models.producer import Manufacturer
        from app.models.quote_template import QuoteTemplate
        from app.models.quote import Quote
        print("✅ Model imports OK")
        
        # Test app imports
        from app.core.config import settings
        from app.core.security import get_password_hash, verify_password
        print("✅ Security imports OK")
        
        # Test API imports
        from app.api.v1.endpoints.auth import router as auth_router
        print("✅ API imports OK")
        
        return True
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_database_operations():
    """Test basic database operations"""
    
    print("\n🗄️ Testing database operations...")
    
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from app.core.database import Base
        from app.models.user import User, UserRole, RegistrationStatus
        from app.core.security import get_password_hash
        
        # Create database
        engine = create_engine("sqlite:///./test_db.db", echo=False)
        Base.metadata.create_all(bind=engine)
        print("✅ Database creation OK")
        
        # Test basic operations
        Session = sessionmaker(bind=engine)
        db = Session()
        
        # Create test user
        test_user = User(
            email="test@example.com",
            password_hash=get_password_hash("password123"),
            first_name="Test",
            last_name="User",
            role=UserRole.CLIENT,
            registration_status=RegistrationStatus.ACTIVE,
            is_active=True,
            email_verified=True,
            data_processing_consent=True
        )
        
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print(f"✅ User creation OK (ID: {test_user.id})")
        
        # Test query
        retrieved_user = db.query(User).filter(User.email == "test@example.com").first()
        if retrieved_user:
            print("✅ User query OK")
        
        db.close()
        
        # Clean up
        os.remove("./test_db.db")
        print("✅ Database cleanup OK")
        
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_fastapi_app():
    """Test FastAPI app creation"""
    
    print("\n🚀 Testing FastAPI app...")
    
    try:
        from fastapi.testclient import TestClient
        from main import app
        
        client = TestClient(app)
        print("✅ FastAPI app creation OK")
        
        # Test health endpoint
        response = client.get("/health")
        if response.status_code == 200:
            print("✅ Health endpoint OK")
        else:
            print(f"⚠️ Health endpoint returned {response.status_code}")
        
        # Test docs endpoint
        response = client.get("/docs")
        if response.status_code == 200:
            print("✅ Docs endpoint OK")
        else:
            print(f"⚠️ Docs endpoint returned {response.status_code}")
        
        return True
        
    except Exception as e:
        print(f"❌ FastAPI test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    
    print("🧪 Starting simple backend tests...\n")
    
    # Test imports
    if not test_imports():
        print("\n❌ Import tests failed")
        return False
    
    # Test database operations
    if not test_database_operations():
        print("\n❌ Database tests failed")
        return False
    
    # Test FastAPI app
    if not test_fastapi_app():
        print("\n❌ FastAPI tests failed")
        return False
    
    print("\n🎉 All tests passed!")
    print("\n📋 Backend is ready to start:")
    print("cd backend && uvicorn main:app --reload")
    
    return True

if __name__ == "__main__":
    if not main():
        sys.exit(1) 