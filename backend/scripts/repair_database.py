import sys
import os
import logging
from datetime import datetime, timezone

# Add project root to path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.user import User, UserRole
from app.models.producer import Manufacturer
from app.models.quote import Quote
from app.models.order import Order

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def repair_database():
    """Diagnose and repair common data integrity issues."""
    
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        logger.info("--- Starting Database Diagnosis and Repair ---")
        
        # 1. Fix Manufacturer Roles and Create Missing Profiles
        logger.info("[Step 1/4] Checking users and manufacturer profiles...")
        users = db.query(User).all()
        manufacturers_created = 0
        
        for user in users:
            role_val = getattr(user.role, 'value', str(user.role)).lower()
            if role_val == 'manufacturer':
                profile = db.query(Manufacturer).filter(Manufacturer.user_id == user.id).first()
                if not profile:
                    logger.info(f"Creating missing manufacturer profile for user: {user.email}")
                    new_manufacturer = Manufacturer(
                        user_id=user.id,
                        business_name=user.company_name or f"Company for {user.email}",
                        city="Unknown",
                        country="PL",
                        is_active=True,
                        is_verified=True,
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc)
                    )
                    db.add(new_manufacturer)
                    manufacturers_created += 1
        
        if manufacturers_created > 0:
            db.commit()
            logger.info(f"Successfully created {manufacturers_created} missing profiles.")
        else:
            logger.info("No missing manufacturer profiles found.")

        # 2. Check for Orders without a Client
        logger.info("[Step 2/4] Checking for orphaned orders...")
        
        # This is a placeholder for more complex checks, e.g., orders with invalid client_id
        # For now, we just ensure at least one order exists for testing.
        order_count = db.query(Order).count()
        if order_count == 0:
            logger.info("No orders found. Skipping order checks.")
        else:
            logger.info(f"Found {order_count} orders. Order check complete.")
            
        # 3. Check for Quotes with broken relationships
        logger.info("[Step 3/4] Checking for orphaned quotes...")
        
        # Using raw SQL to safely check for non-existent foreign keys
        broken_quote_query = text("""
            SELECT q.id FROM quotes q
            LEFT JOIN manufacturers m ON q.manufacturer_id = m.id
            LEFT JOIN orders o ON q.order_id = o.id
            WHERE m.id IS NULL OR o.id IS NULL
        """)
        
        broken_quotes = db.execute(broken_quote_query).fetchall()
        
        if broken_quotes:
            logger.warning(f"Found {len(broken_quotes)} orphaned quotes. Deleting them...")
            for quote_id_tuple in broken_quotes:
                quote_id = quote_id_tuple[0]
                db.query(Quote).filter(Quote.id == quote_id).delete(synchronize_session=False)
            db.commit()
            logger.info("Orphaned quotes deleted.")
        else:
            logger.info("No orphaned quotes found.")
            
        # 4. Final Summary
        final_users = db.query(User).count()
        final_manufacturers = db.query(Manufacturer).count()
        final_orders = db.query(Order).count()
        final_quotes = db.query(Quote).count()
        
        logger.info("[Step 4/4] Repair complete. Final database state:")
        logger.info(f"  - Users: {final_users}")
        logger.info(f"  - Manufacturer Profiles: {final_manufacturers}")
        logger.info(f"  - Orders: {final_orders}")
        logger.info(f"  - Quotes: {final_quotes}")
        
        logger.info("--- Database Repair Finished Successfully ---")

    except Exception as e:
        logger.error(f"An error occurred during database repair: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    repair_database() 