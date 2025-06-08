from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from loguru import logger
from typing import Generator

from app.core.config import settings

# Create SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.ENVIRONMENT == "development"
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create declarative base
Base = declarative_base()

# Metadata for migrations
metadata = MetaData()


async def create_tables():
    """Create database tables"""
    try:
        # Import all models to register them
        from app.models import user, order, producer, quote, payment
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise


def get_db() -> Generator:
    """
    Dependency to get database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database with initial data"""
    # Import models
    from app.models import user
    
    db = SessionLocal()
    try:
        # Create admin user if not exists
        admin_user = db.query(user.User).filter(
            user.User.email == "admin@manufacturing.com"
        ).first()
        
        if not admin_user:
            from app.services.auth import get_password_hash
            
            admin_user = user.User(
                email="admin@manufacturing.com",
                password_hash=get_password_hash("admin123"),
                first_name="Admin",
                last_name="User",
                role=user.UserRole.ADMIN,
                registration_status=user.RegistrationStatus.ACTIVE
            )
            db.add(admin_user)
            db.commit()
            logger.info("Admin user created successfully")
            
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close() 