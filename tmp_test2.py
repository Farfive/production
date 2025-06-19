import sys, traceback, os
sys.path.insert(0,'backend')
try:
    import app.models.producer
    import app.models.financial
    print('IMPORT_OK')
except Exception:
    traceback.print_exc() 