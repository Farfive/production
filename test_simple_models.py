#!/usr/bin/env python3
import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

def test_individual_models():
    """Test each model individually to identify the problematic one"""
    
    models_to_test = [
        ("User", "from app.models.user import User"),
        ("Order", "from app.models.order import Order"), 
        ("Financial (Invoice)", "from app.models.financial import Invoice"),
        ("Payment", "from app.models.payment import Transaction"),
        ("Quote", "from app.models.quote import Quote"),
        ("Producer", "from app.models.producer import Manufacturer"),
    ]
    
    results = []
    
    for name, import_stmt in models_to_test:
        try:
            exec(import_stmt)
            results.append(f"✅ {name}: OK")
        except Exception as e:
            results.append(f"❌ {name}: {str(e)}")
    
    return results

def test_database_creation():
    """Test database table creation"""
    try:
        from app.core.database import Base, engine
        Base.metadata.create_all(bind=engine)
        return "✅ Database creation: OK"
    except Exception as e:
        return f"❌ Database creation: {str(e)}"

if __name__ == "__main__":
    print("🔍 Diagnoza modeli bazy danych...")
    
    # Test individual models
    print("\n1. Test indywidualnych modeli:")
    for result in test_individual_models():
        print(f"   {result}")
    
    # Test database creation
    print("\n2. Test tworzenia bazy danych:")
    print(f"   {test_database_creation()}")
    
    # Test all models together
    print("\n3. Test wszystkich modeli razem:")
    try:
        from app.models import *
        print("   ✅ Wszystkie modele: OK")
    except Exception as e:
        print(f"   ❌ Wszystkie modele: {str(e)}")
        
        # More detailed error
        import traceback
        print("\nSzczegółowy błąd:")
        traceback.print_exc() 