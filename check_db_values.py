#!/usr/bin/env python3
"""
Check database values directly
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from app.core.database import engine
from app.models.user import User, UserRole, RegistrationStatus
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_db_values():
    """Check actual database values"""
    
    # Create session
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        # Get all test users
        users = db.query(User).filter(User.email.like("test.%@example.com")).all()
        
        logger.info(f"Found {len(users)} test users in database:")
        
        for user in users:
            logger.info(f"\n📧 {user.email} (ID: {user.id})")
            logger.info(f"   Role: {user.role}")
            logger.info(f"   Is Active: {user.is_active}")
            logger.info(f"   Email Verified: {user.email_verified}")
            logger.info(f"   Registration Status: {user.registration_status}")
            logger.info(f"   Data Processing Consent: {user.data_processing_consent}")
            logger.info(f"   Created: {user.created_at}")
            logger.info(f"   Updated: {user.updated_at}")
        
        db.close()
        
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        db.close()
        raise

if __name__ == "__main__":
    check_db_values() 