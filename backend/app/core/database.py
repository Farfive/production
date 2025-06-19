"""
Database configuration with performance optimizations
"""
import time
import logging
from contextlib import contextmanager
from typing import Generator, Optional
from sqlalchemy import create_engine, event, text, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from app.core.config import settings

# Performance monitoring
logger = logging.getLogger(__name__)

# Optimized engine with connection pooling
# Force SQLite for development
database_url = "sqlite:///./manufacturing_platform.db"
engine = create_engine(
    database_url,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    future=True,  # Use SQLAlchemy 2.0 style
    connect_args={"check_same_thread": False},  # Allow multithread access for SQLite
)

# Query performance monitoring
@event.listens_for(engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    context._query_start_time = time.time()

@event.listens_for(engine, "after_cursor_execute")
def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    total = time.time() - context._query_start_time
    
    # Log slow queries
    if total > settings.DB_QUERY_TIME_BUDGET:
        logger.warning(
            f"Slow query detected: {total:.3f}s > {settings.DB_QUERY_TIME_BUDGET}s\n"
            f"Query: {statement[:200]}..."
        )
    
    # Send metrics to monitoring system
    if hasattr(context, '_statsd_client'):
        context._statsd_client.timing('db.query.duration', total * 1000)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Prevent lazy loading issues
)

# Create declarative base
Base = declarative_base()

# Metadata for migrations
metadata = MetaData()

# ---------------------------------------------------------------------------
# Dialect compatibility adapters
# Allow PostgreSQL-specific types (UUID, JSONB) to compile for SQLite during
# local development so that `Base.metadata.create_all()` succeeds without
# touching the model definitions.
# ---------------------------------------------------------------------------
try:
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB
    from sqlalchemy.ext.compiler import compiles

    # Render UUID as CHAR(36) for SQLite
    @compiles(PG_UUID, "sqlite")
    def _compile_uuid_sqlite(type_, compiler, **kw):
        return "CHAR(36)"

    # Render JSONB as JSON (or TEXT) for SQLite
    @compiles(PG_JSONB, "sqlite")
    def _compile_jsonb_sqlite(type_, compiler, **kw):
        return "JSON"
except ImportError:
    # If PostgreSQL dialect components are unavailable, skip patching.
    pass


def create_tables():
    """Create database tables"""
    try:
        # Import all models to register them
        from app.models import (
            user, order, producer, quote, quote_template, payment,
            financial, payment_escrow, supply_chain, message, 
            security_models, subscription, production_quote
        )
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session with performance monitoring
    """
    db = SessionLocal()
    start_time = time.time()
    
    try:
        yield db
    except Exception as e:
        db.rollback()
        logger.error(f"Database session error: {e}")
        raise
    finally:
        session_duration = time.time() - start_time
        if session_duration > 1.0:  # Log long-running sessions
            logger.warning(f"Long database session: {session_duration:.3f}s")
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    Context manager for database sessions
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database transaction error: {e}")
        raise
    finally:
        db.close()


def init_db():
    """Initialize database with initial data"""
    # Import models to ensure they are registered
    from app.models import (
        user, order, producer, quote, quote_template, payment,
        financial, payment_escrow, supply_chain, message, 
        security_models, subscription, production_quote
    )
    
    # Database is now initialized without auto-creating admin users
    # Admin users should be created manually through proper registration flow
    logger.info("Database initialized successfully")


class DatabaseOptimizer:
    """Database optimization utilities"""
    
    @staticmethod
    def analyze_query_performance(db: Session, query: str) -> dict:
        """Analyze query performance using EXPLAIN ANALYZE"""
        try:
            result = db.execute(text(f"EXPLAIN ANALYZE {query}"))
            return {
                'query': query,
                'execution_plan': [row[0] for row in result.fetchall()],
                'timestamp': time.time()
            }
        except Exception as e:
            logger.error(f"Query analysis failed: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def get_connection_pool_status() -> dict:
        """Get connection pool statistics"""
        pool = engine.pool
        return {
            'size': pool.size(),
            'checked_in': pool.checkedin(),
            'checked_out': pool.checkedout(),
            'overflow': pool.overflow(),
            'invalid': pool.invalid()
        }
    
    @staticmethod
    def optimize_table_indexes(db: Session, table_name: str) -> dict:
        """Suggest index optimizations for a table"""
        try:
            # Get table statistics
            stats_query = text(f"""
                SELECT 
                    schemaname,
                    tablename,
                    attname,
                    n_distinct,
                    correlation
                FROM pg_stats 
                WHERE tablename = :table_name
            """)
            
            result = db.execute(stats_query, {'table_name': table_name})
            stats = result.fetchall()
            
            # Get missing indexes suggestions
            missing_indexes_query = text(f"""
                SELECT 
                    schemaname,
                    tablename,
                    attname,
                    n_distinct,
                    correlation
                FROM pg_stats 
                WHERE tablename = :table_name
                AND n_distinct > 100
                AND correlation < 0.1
            """)
            
            missing_result = db.execute(missing_indexes_query, {'table_name': table_name})
            missing_indexes = missing_result.fetchall()
            
            return {
                'table_name': table_name,
                'statistics': [dict(row) for row in stats],
                'suggested_indexes': [dict(row) for row in missing_indexes],
                'timestamp': time.time()
            }
        except Exception as e:
            logger.error(f"Table optimization analysis failed: {e}")
            return {'error': str(e)}


# Global database optimizer instance
db_optimizer = DatabaseOptimizer() 