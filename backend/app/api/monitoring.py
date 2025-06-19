"""
Monitoring API Endpoints
Health checks and metrics endpoints for production outsourcing platform
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import Dict, Any
from datetime import datetime

from ..core.database import get_db
from ..core.performance import performance_tracker, http_requests_total
from ..core.uptime import health_checker
from ..core.logging import log_api_call
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

router = APIRouter(prefix="/monitoring", tags=["monitoring"])
logger = logging.getLogger('monitoring_api')

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Comprehensive health check endpoint
    Returns health status of all critical services
    """
    try:
        log_api_call("health_check", user_id="system", details={"type": "health_check"})
        
        health_status = await health_checker.get_health_status(db)
        
        # Return appropriate HTTP status code based on health
        if health_status['overall_status'] == 'unhealthy':
            raise HTTPException(status_code=503, detail=health_status)
        elif health_status['overall_status'] == 'degraded':
            # Still return 200 but log warning
            logger.warning("System health degraded", extra=health_status)
        
        return health_status
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=500, 
            detail={"overall_status": "unhealthy", "error": str(e)}
        )

@router.get("/health/simple")
async def simple_health_check():
    """
    Simple health check for load balancer
    Returns 200 if service is running
    """
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@router.get("/metrics")
async def get_metrics():
    """
    Prometheus metrics endpoint
    Returns metrics in Prometheus format
    """
    try:
        # Update system metrics before returning
        performance_tracker.update_system_metrics()
        
        metrics_data = generate_latest()
        return PlainTextResponse(
            content=metrics_data.decode('utf-8'),
            media_type=CONTENT_TYPE_LATEST
        )
    except Exception as e:
        logger.error(f"Metrics generation failed: {e}")
        raise HTTPException(status_code=500, detail="Metrics unavailable")

@router.get("/status")
async def get_status():
    """
    Get detailed system status and performance metrics
    """
    try:
        # Get system resource information
        import psutil
        
        status = {
            "timestamp": datetime.now().isoformat(),
            "uptime": "N/A",  # Would calculate from process start time
            "system": {
                "cpu_percent": psutil.cpu_percent(),
                "memory": {
                    "total": psutil.virtual_memory().total,
                    "available": psutil.virtual_memory().available,
                    "percent": psutil.virtual_memory().percent
                },
                "disk": {
                    "total": psutil.disk_usage('/').total,
                    "free": psutil.disk_usage('/').free,
                    "percent": (psutil.disk_usage('/').used / psutil.disk_usage('/').total) * 100
                }
            },
            "application": {
                "version": "1.0.0",
                "environment": "production",
                "service": "production-outsourcing-api"
            }
        }
        
        return status
        
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(status_code=500, detail="Status unavailable")

@router.get("/logs")
async def get_recent_logs(limit: int = 100):
    """
    Get recent application logs (for debugging)
    Note: In production, this should be secured or removed
    """
    try:
        # This is a simplified version - in production you'd read from log files
        # or use a log aggregation service
        return {
            "message": "Log endpoint not implemented in this version",
            "suggestion": "Use log aggregation service (ELK stack, Splunk, etc.)",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Log retrieval failed: {e}")
        raise HTTPException(status_code=500, detail="Logs unavailable")

@router.get("/performance")
async def get_performance_metrics():
    """
    Get performance metrics summary
    """
    try:
        import psutil
        
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "system_performance": {
                "cpu_percent": psutil.cpu_percent(interval=0.1),
                "memory_percent": psutil.virtual_memory().percent,
                "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0]
            },
            "application_performance": {
                "total_requests": "Available in /metrics endpoint",
                "average_response_time": "Available in /metrics endpoint",
                "error_rate": "Available in /metrics endpoint"
            }
        }
        
        return metrics
        
    except Exception as e:
        logger.error(f"Performance metrics failed: {e}")
        raise HTTPException(status_code=500, detail="Performance metrics unavailable")

@router.post("/alert-test")
async def test_alert():
    """
    Test alerting system (for debugging)
    """
    try:
        logger.critical("TEST ALERT: This is a test alert from the monitoring system")
        return {
            "message": "Test alert sent",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Alert test failed: {e}")
        raise HTTPException(status_code=500, detail="Alert test failed")

# Note: APIRouter middleware is not supported, middleware should be added at FastAPI app level