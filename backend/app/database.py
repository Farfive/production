"""
Database module - compatibility layer
Provides database session dependency for endpoints
"""

from app.core.database import get_db, get_db_context, SessionLocal, Base, engine, create_tables, init_db

# Re-export everything for backward compatibility
__all__ = [
    'get_db',
    'get_db_context', 
    'SessionLocal',
    'Base',
    'engine',
    'create_tables',
    'init_db'
] 