#!/usr/bin/env python3
"""
Minimal authentication server for debugging
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings
from datetime import datetime, timedelta

# Create minimal FastAPI app
app = FastAPI(title="Minimal Auth Server")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Database setup
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Pydantic models
class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    company_name: str = None
    role: str = "client"
    data_processing_consent: bool = True
    marketing_consent: bool = False

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "minimal-auth-server"}

# Login endpoint
@app.post("/api/v1/auth/login-json")
async def login(user_login: UserLogin):
    db = SessionLocal()
    try:
        # Query user directly with SQL to avoid model relationships
        result = db.execute(
            text("SELECT id, email, password_hash, first_name, last_name, role, is_active, email_verified FROM users WHERE email = :email"),
            {"email": user_login.email}
        ).fetchone()
        
        if not result:
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        
        user_id, email, password_hash, first_name, last_name, role, is_active, email_verified = result
        
        # Verify password
        if not verify_password(user_login.password, password_hash):
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        
        if not is_active:
            raise HTTPException(status_code=400, detail="Inactive user account")
        
        # Create access token
        access_token = create_access_token(subject=user_id)
        
        # Return user data
        user_data = {
            "id": user_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "role": role,
            "is_active": is_active,
            "email_verified": email_verified
        }
        
        return TokenResponse(
            access_token=access_token,
            user=user_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")
    finally:
        db.close()

# Register endpoint
@app.post("/api/v1/auth/register")
async def register(user_data: UserCreate):
    db = SessionLocal()
    try:
        # Check if user exists
        existing_user = db.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": user_data.email}
        ).fetchone()
        
        if existing_user:
            raise HTTPException(status_code=409, detail="Email already registered")
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        
        db.execute(text("""
            INSERT INTO users (
                email, password_hash, first_name, last_name, role, 
                registration_status, email_verified, is_active, 
                data_processing_consent, marketing_consent, created_at, updated_at
            ) VALUES (
                :email, :password_hash, :first_name, :last_name, :role,
                'active', 1, 1, :data_processing_consent, :marketing_consent,
                datetime('now'), datetime('now')
            )
        """), {
            "email": user_data.email,
            "password_hash": hashed_password,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "role": user_data.role,
            "data_processing_consent": user_data.data_processing_consent,
            "marketing_consent": user_data.marketing_consent
        })
        
        db.commit()
        
        # Get the created user
        result = db.execute(
            text("SELECT id, email, first_name, last_name, role FROM users WHERE email = :email"),
            {"email": user_data.email}
        ).fetchone()
        
        user_id, email, first_name, last_name, role = result
        
        return {
            "id": user_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "role": role,
            "email_verified": True,
            "is_active": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Registration failed")
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    print("Starting minimal auth server on port 8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001) 