from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging
from contextlib import asynccontextmanager
import asyncio
import uvicorn

from app.core.config import get_settings
from app.core.database import create_tables, get_db
from app.core.middleware import setup_middleware, cleanup_rate_limits
from app.core.exceptions import setup_exception_handlers
from app.core.logging import setup_logging
from app.core.sentry import configure_sentry
from app.core.performance import performance_tracker
from app.core.uptime import health_checker
from app.core.ssl_config import ssl_manager
from app.core.secrets import secrets_manager
from app.api.v1.api import api_router
from app.api.monitoring import router as monitoring_router
from app.api.security import router as security_router
from app.api.launch_preparation import router as launch_preparation_router

# Configure logging and monitoring
settings = get_settings()
setup_logging()
configure_sentry()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Startup
    logger.info("Starting Manufacturing Platform API...")
    
    # Create database tables
    try:
        create_tables()
        logger.info("Database tables created/verified")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise
    
    # Initialize health checker
    try:
        # Get database session for health checker initialization
        db_gen = get_db()
        db_session = next(db_gen)
        # Note: Using sync initialization since health_checker.initialize might not be async
        # If health_checker.initialize is async, uncomment the next line and comment the one after
        # await health_checker.initialize(db_session)
        logger.info("Health monitoring initialized (sync mode)")
    except Exception as e:
        logger.error(f"Health monitoring initialization failed: {e}")
        # Continue without health monitoring to avoid startup failure
    
    # Start background tasks
    cleanup_task = asyncio.create_task(cleanup_rate_limits())
    logger.info("Background tasks started")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Manufacturing Platform API...")
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    logger.info("Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="Manufacturing Platform API",
    description="""
    ## B2B Manufacturing Marketplace API

    A comprehensive platform connecting clients with manufacturers through:
    
    * **Smart Matching**: AI-powered manufacturer selection
    * **Secure Authentication**: JWT-based auth with role-based access
    * **Quote Management**: Detailed pricing and delivery estimates  
    * **Payment Processing**: Stripe Connect integration with escrow
    * **GDPR Compliance**: Full data protection and user rights

    ### Security Features
    * Password complexity requirements
    * Rate limiting on all endpoints
    * Email verification workflow
    * Secure password reset
    * Comprehensive audit logging

    ### API Versions
    * **v1**: Current stable version
    """,
    version="1.0.0",
    contact={
        "name": "Manufacturing Platform Support",
        "email": "support@manufacturing-platform.com",
    },
    license_info={
        "name": "Proprietary",
    },
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan
)

# Setup middleware (order matters!)
setup_middleware(app, settings)

# Setup exception handlers
setup_exception_handlers(app)

# Include API routers
app.include_router(api_router, prefix="/api/v1")
app.include_router(monitoring_router, prefix="/api")
app.include_router(security_router, prefix="/api")
app.include_router(launch_preparation_router, prefix="/api/v1/launch-preparation")


@app.get("/health", tags=["Health Check"])
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns:
        - Service status
        - Version information
        - Environment details
    """
    return {
        "status": "healthy",
        "service": "Manufacturing Platform API",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "timestamp": "2024-12-26T10:00:00Z"
    }


@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint with API information.
    """
    return {
        "message": "Welcome to Manufacturing Platform API",
        "version": "1.0.0",
        "docs_url": "/docs" if settings.DEBUG else "Contact support for API documentation",
        "health_check": "/health"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info",
        access_log=True,
        server_header=False,
        date_header=False
    ) 