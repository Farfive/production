import traceback, sys, pathlib, json, os
try:
    from app.models import *
    print('OK')
except Exception as e:
    data = traceback.format_exc()
    pathlib.Path('import_err.log').write_text(data)
    print('error written')
    sys.exit(1) 