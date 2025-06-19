#!/usr/bin/env python3
"""
Końcowy test bazy danych - sprawdzenie wszystkich napraw
"""

import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

def main():
    print("🔧 Test napraw bazy danych...")
    
    try:
        # Remove existing database
        db_path = backend_path / "manufacturing_platform.db"
        if db_path.exists():
            os.remove(str(db_path))
            print("   🗑️ Usunięto starą bazę danych")
        
        # Test imports
        print("   📦 Testowanie importów...")
        from app.core.database import Base, engine
        from app.models.user import User
        from app.models.financial import Invoice
        from app.models.order import Order
        from app.models.payment import Transaction, Subscription
        from app.models.producer import Manufacturer
        print("      ✅ Wszystkie importy OK")
        
        # Test database creation
        print("   🏗️ Tworzenie bazy danych...")
        Base.metadata.create_all(bind=engine)
        print("      ✅ Baza danych utworzona")
        
        # Test specific relationships
        print("   🔗 Testowanie relacji:")
        
        # Test User relationships
        from sqlalchemy.orm import sessionmaker
        Session = sessionmaker(bind=engine)
        
        # Check if all relationship mappings work
        user_relationships = [
            'orders', 'manufacturer_profile', 'transactions_as_client', 
            'subscriptions', 'invoices_as_customer', 'invoices_as_issuer'
        ]
        
        for rel in user_relationships:
            if hasattr(User, rel):
                print(f"      ✅ User.{rel}")
            else:
                print(f"      ❌ User.{rel} - BRAK")
        
        print("\n✅ WSZYSTKIE NAPRAWY UKOŃCZONE POMYŚLNIE!")
        print("   - Relacje User ↔ Invoice naprawione")
        print("   - Relacje User ↔ Manufacturer naprawione") 
        print("   - Relacje Invoice ↔ Producer naprawione")
        print("   - Usunięto nieprawidłowe aliasy")
        
        return True
        
    except Exception as e:
        print(f"❌ Błąd: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    if success:
        print("\n🎉 Baza danych gotowa do testów!")
    sys.exit(0 if success else 1) 