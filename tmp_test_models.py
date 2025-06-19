import sys, traceback, os
sys.path.insert(0,'backend')
try:
    from app.core.database import create_tables
    import app.models.producer
    import app.models.financial
    create_tables()
    print('OK')
except Exception as e:
    traceback.print_exc() 