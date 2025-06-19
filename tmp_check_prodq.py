from app.core.database import create_tables, SessionLocal
from app.models.quote import ProductionQuote
from app.api.v1.endpoints.production_quotes import list_production_quotes

if __name__ == '__main__':
    create_tables()
    db = SessionLocal()
    try:
        # just run query
        res = list_production_quotes(db=db, current_user=None)
        print('ok query, returned', len(res))
    except Exception as e:
        print('error', e) 