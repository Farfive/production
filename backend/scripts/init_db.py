#!/usr/bin/env python3
"""
Database initialization script for B2B Manufacturing Marketplace.

This script:
1. Creates the database if it doesn't exist
2. Runs Alembic migrations to set up the schema
3. Creates initial admin user (optional)
4. Validates the database setup
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the backend app to the path
backend_dir = Path(__file__).parent.parent
sys.path.append(str(backend_dir))

import asyncpg
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from alembic.config import Config
from alembic import command

from app.core.config import get_settings
from app.core.database import Base, get_db_url
from app.core.security import get_password_hash
from app.models.user import User, UserRole, RegistrationStatus


async def create_database_if_not_exists():
    """Create the database if it doesn't exist."""
    settings = get_settings()
    
    # Parse database URL to get connection details
    db_url = settings.database_url
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Extract connection details
    parts = db_url.split("/")
    db_name = parts[-1]
    base_url = "/".join(parts[:-1]) + "/postgres"
    
    # Connect to postgres database to create our database
    try:
        # Remove the +asyncpg part for asyncpg connection
        base_url = base_url.replace("postgresql+asyncpg://", "postgresql://")
        
        # Extract user, password, host, port
        auth_host = base_url.split("//")[1]
        if "@" in auth_host:
            auth, host_port = auth_host.split("@")
            if ":" in auth:
                user, password = auth.split(":")
            else:
                user, password = auth, ""
        else:
            user, password = "postgres", ""
            host_port = auth_host
            
        if ":" in host_port:
            host, port = host_port.split(":")
            port = int(port)
        else:
            host, port = host_port, 5432
            
        # Connect and create database
        conn = await asyncpg.connect(
            user=user,
            password=password,
            host=host,
            port=port,
            database="postgres"
        )
        
        try:
            # Check if database exists
            exists = await conn.fetchval(
                "SELECT 1 FROM pg_database WHERE datname = $1", db_name
            )
            
            if not exists:
                print(f"Creating database '{db_name}'...")
                await conn.execute(f'CREATE DATABASE "{db_name}"')
                print(f"✅ Database '{db_name}' created successfully.")
            else:
                print(f"✅ Database '{db_name}' already exists.")
                
        finally:
            await conn.close()
            
    except Exception as e:
        print(f"❌ Error creating database: {e}")
        raise


def run_migrations():
    """Run Alembic migrations to set up the database schema."""
    try:
        print("Running database migrations...")
        
        # Configure Alembic
        alembic_cfg = Config(str(backend_dir / "alembic.ini"))
        alembic_cfg.set_main_option("script_location", str(backend_dir / "migrations"))
        
        # Set database URL from environment or config
        settings = get_settings()
        alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)
        
        # Run migrations
        command.upgrade(alembic_cfg, "head")
        print("✅ Migrations completed successfully.")
        
    except Exception as e:
        print(f"❌ Error running migrations: {e}")
        raise


def create_admin_user():
    """Create an initial admin user - DISABLED for production security."""
    print("⚠️  Auto-admin creation is disabled for production security.")
    print("   Please create admin users through the proper registration flow.")
    print("   Use the /register endpoint with role='admin' if needed.")
        # Don't raise here as this is optional


def validate_database_setup():
    """Validate that the database is properly set up."""
    try:
        settings = get_settings()
        engine = create_engine(settings.database_url)
        
        # Test connection and basic queries
        with engine.connect() as conn:
            # Check if all tables exist
            tables = [
                "users", "manufacturers", "orders", "quotes", "transactions"
            ]
            
            for table in tables:
                result = conn.execute(
                    text("""
                        SELECT COUNT(*) FROM information_schema.tables 
                        WHERE table_name = :table_name
                    """),
                    {"table_name": table}
                )
                
                if result.scalar() == 0:
                    raise Exception(f"Table '{table}' not found")
                    
            # Test basic functionality
            result = conn.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.scalar()
            
            print(f"✅ Database validation successful.")
            print(f"   - All required tables exist")
            print(f"   - Current user count: {user_count}")
            
    except Exception as e:
        print(f"❌ Database validation failed: {e}")
        raise


async def main():
    """Main initialization function."""
    print("🚀 Initializing B2B Manufacturing Marketplace Database")
    print("=" * 60)
    
    try:
        # Step 1: Create database if needed
        await create_database_if_not_exists()
        
        # Step 2: Run migrations
        run_migrations()
        
        # Step 3: Create admin user (optional)
        create_admin_user()
        
        # Step 4: Validate setup
        validate_database_setup()
        
        print("\n" + "=" * 60)
        print("🎉 Database initialization completed successfully!")
        print("\nNext steps:")
        print("1. Start the FastAPI server: uvicorn app.main:app --reload")
        print("2. Access the API documentation: http://localhost:8000/docs")
        print("3. Login with admin credentials to test the system")
        
    except Exception as e:
        print(f"\n❌ Initialization failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main()) 