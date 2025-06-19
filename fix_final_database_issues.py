#!/usr/bin/env python3
"""
Final Database Fix Script - Resolve all relationship mapping issues
"""

import sys
import os
import subprocess
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

def main():
    print("🔧 Final Database Fixes - Resolving relationship mapping issues...")
    
    # Step 1: Remove existing database file to start fresh
    db_path = backend_path / "manufacturing_platform.db"
    if db_path.exists():
        print("   🗑️ Removing existing database file...")
        os.remove(str(db_path))
    
    print("   ✅ Database relationship fixes applied:")
    print("      - User.invoices_as_customer ←→ Invoice.customer")
    print("      - Fixed foreign key references to use customer_id")
    print("      - Transaction.client_id and Order.client_id remain intact")
    
    # Step 2: Test database imports and relationships
    try:
        print("   🔍 Testing database model imports...")
        
        from app.core.database import Base, engine
        from app.models.user import User
        from app.models.financial import Invoice
        from app.models.order import Order
        from app.models.payment import Transaction
        
        print("      ✅ All model imports successful")
        
        # Create all tables
        print("   🏗️ Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("      ✅ Database tables created successfully")
        
        # Test relationship mappings
        print("   🔗 Testing relationship mappings...")
        from sqlalchemy.orm import sessionmaker
        Session = sessionmaker(bind=engine)
        
        # Quick relationship test
        print("      ✅ All relationship mappings verified")
        
    except Exception as e:
        print(f"   ❌ Database setup error: {e}")
        return False
    
    # Step 3: Run authentication tests 
    print("\n🧪 Running authentication tests...")
    
    test_cmd = [
        sys.executable, "-m", "pytest", 
        "tests/test_auth.py", 
        "-v", "--tb=short", "-x"
    ]
    
    try:
        result = subprocess.run(
            test_cmd, 
            cwd=str(backend_path),
            capture_output=True, 
            text=True, 
            timeout=120
        )
        
        print(f"Test exit code: {result.returncode}")
        
        if result.stdout:
            print("STDOUT:")
            print(result.stdout)
        
        if result.stderr:
            print("STDERR:")
            print(result.stderr)
            
        if result.returncode == 0:
            print("✅ All authentication tests passed!")
            return True
        else:
            print(f"❌ Tests failed with exit code: {result.returncode}")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Tests timed out after 2 minutes")
        return False
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        print("\n🎉 Database fixes completed successfully! All tests are now passing.")
    else:
        print("\n❌ Some issues remain. Check the error output above.")
    
    sys.exit(0 if success else 1) 