from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging
from contextlib import asynccontextmanager
import asyncio
import uvicorn

from app.core.config import get_settings
from app.core.database import create_tables
from app.core.middleware import setup_middleware, cleanup_rate_limits
from app.core.exceptions import setup_exception_handlers
from app.api.v1.router import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("app.log") if not get_settings().DEBUG else logging.NullHandler()
    ]
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Startup
    logger.info("🚀 Starting Manufacturing Platform API...")
    
    # Create database tables
    try:
        create_tables()
        logger.info("✅ Database tables created/verified")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise
    
    # Start background tasks
    cleanup_task = asyncio.create_task(cleanup_rate_limits())
    logger.info("✅ Background tasks started")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Manufacturing Platform API...")
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    logger.info("✅ Shutdown complete")


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

# Include API router
app.include_router(api_router, prefix="/api/v1")


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