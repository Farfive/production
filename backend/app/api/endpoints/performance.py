"""
Performance monitoring and health check API endpoints
"""
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from app.core.database import get_db, db_optimizer
from app.core.cache import cache_manager
from app.core.monitoring import performance_monitor, health_checker
from app.core.config import settings

router = APIRouter()

@router.get("/health", response_model=Dict[str, Any])
async def health_check():
    """
    Comprehensive system health check
    """
    try:
        health_status = health_checker.get_system_health()
        
        # Determine overall health status
        overall_status = "healthy"
        for service, status in health_status.items():
            if isinstance(status, dict) and status.get('status') == 'unhealthy':
                overall_status = "unhealthy"
                break
        
        return {
            "status": overall_status,
            "timestamp": health_status["timestamp"],
            "services": health_status
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Health check failed: {str(e)}")

@router.get("/health/database")
async def database_health():
    """
    Database-specific health check
    """
    return health_checker.check_database_health()

@router.get("/health/redis")
async def redis_health():
    """
    Redis-specific health check
    """
    return health_checker.check_redis_health()

@router.get("/metrics", response_class=PlainTextResponse)
async def prometheus_metrics():
    """
    Prometheus metrics endpoint
    """
    if not settings.PROMETHEUS_ENABLED:
        raise HTTPException(status_code=404, detail="Metrics endpoint disabled")
    
    try:
        # Update system metrics before returning
        performance_monitor.update_system_metrics()
        return performance_monitor.get_prometheus_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate metrics: {str(e)}")

@router.get("/performance/summary")
async def performance_summary(hours: int = 1):
    """
    Get performance summary for the specified time period
    """
    try:
        summary = performance_monitor.get_performance_summary(hours)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance summary: {str(e)}")

@router.get("/performance/cache")
async def cache_performance():
    """
    Get cache performance statistics
    """
    try:
        cache_stats = cache_manager.get_stats()
        return {
            "cache_statistics": cache_stats,
            "performance_target": {
                "hit_ratio_target": settings.CACHE_HIT_RATIO_TARGET,
                "current_hit_ratio": cache_stats.get("hit_ratio", 0),
                "meets_target": cache_stats.get("hit_ratio", 0) >= settings.CACHE_HIT_RATIO_TARGET
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cache performance: {str(e)}")

@router.get("/performance/database")
async def database_performance(db: Session = Depends(get_db)):
    """
    Get database performance statistics
    """
    try:
        pool_status = db_optimizer.get_connection_pool_status()
        
        return {
            "connection_pool": pool_status,
            "performance_budgets": {
                "query_time_budget": settings.DB_QUERY_TIME_BUDGET,
                "pool_utilization": (pool_status["checked_out"] / pool_status["size"]) * 100
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get database performance: {str(e)}")

@router.post("/performance/analyze-query")
async def analyze_query(
    query_data: Dict[str, str],
    db: Session = Depends(get_db)
):
    """
    Analyze query performance using EXPLAIN ANALYZE
    """
    try:
        query = query_data.get("query")
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        # Security check - only allow SELECT queries
        if not query.strip().upper().startswith("SELECT"):
            raise HTTPException(status_code=400, detail="Only SELECT queries are allowed")
        
        analysis = db_optimizer.analyze_query_performance(db, query)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query analysis failed: {str(e)}")

@router.get("/performance/optimize-table/{table_name}")
async def optimize_table(table_name: str, db: Session = Depends(get_db)):
    """
    Get optimization suggestions for a specific table
    """
    try:
        # Validate table name to prevent SQL injection
        allowed_tables = ["users", "orders", "manufacturers", "quotes", "payments", "messages"]
        if table_name not in allowed_tables:
            raise HTTPException(status_code=400, detail="Invalid table name")
        
        optimization = db_optimizer.optimize_table_indexes(db, table_name)
        return optimization
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Table optimization failed: {str(e)}")

@router.post("/performance/track-metric")
async def track_custom_metric(metric_data: Dict[str, Any]):
    """
    Track custom performance metric
    """
    try:
        metric_name = metric_data.get("name")
        metric_value = metric_data.get("value")
        
        if not metric_name or metric_value is None:
            raise HTTPException(status_code=400, detail="Metric name and value are required")
        
        performance_monitor.track_custom_metric(metric_name, metric_value)
        
        return {
            "status": "success",
            "message": f"Metric {metric_name} tracked successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track metric: {str(e)}")

@router.post("/performance/track-error")
async def track_error(error_data: Dict[str, Any]):
    """
    Track application error for monitoring
    """
    try:
        error_message = error_data.get("message")
        error_type = error_data.get("type", "UnknownError")
        context = error_data.get("context", {})
        
        if not error_message:
            raise HTTPException(status_code=400, detail="Error message is required")
        
        # Create a mock exception for tracking
        error = Exception(error_message)
        error.__class__.__name__ = error_type
        
        performance_monitor.track_error(error, context)
        
        return {
            "status": "success",
            "message": "Error tracked successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track error: {str(e)}")

@router.get("/performance/budgets")
async def performance_budgets():
    """
    Get current performance budgets and their status
    """
    try:
        summary = performance_monitor.get_performance_summary(1)  # Last hour
        
        budgets = {
            "api_response_time": {
                "budget": settings.API_RESPONSE_TIME_BUDGET,
                "current": summary["requests"].get("avg_response_time", 0),
                "status": "pass" if summary["requests"].get("avg_response_time", 0) <= settings.API_RESPONSE_TIME_BUDGET else "fail"
            },
            "database_query_time": {
                "budget": settings.DB_QUERY_TIME_BUDGET,
                "current": summary["database"].get("avg_query_time", 0),
                "status": "pass" if summary["database"].get("avg_query_time", 0) <= settings.DB_QUERY_TIME_BUDGET else "fail"
            },
            "cache_hit_ratio": {
                "budget": settings.CACHE_HIT_RATIO_TARGET,
                "current": summary["cache"].get("hit_ratio", 0),
                "status": "pass" if summary["cache"].get("hit_ratio", 0) >= settings.CACHE_HIT_RATIO_TARGET else "fail"
            }
        }
        
        overall_status = "pass" if all(b["status"] == "pass" for b in budgets.values()) else "fail"
        
        return {
            "overall_status": overall_status,
            "budgets": budgets,
            "timestamp": summary.get("timestamp")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance budgets: {str(e)}")

@router.post("/performance/clear-cache")
async def clear_cache(cache_pattern: str = "*"):
    """
    Clear cache entries matching the specified pattern
    """
    try:
        if cache_pattern == "*":
            # Clear all cache
            deleted_count = cache_manager.clear_pattern("*")
        else:
            # Clear specific pattern
            deleted_count = cache_manager.clear_pattern(cache_pattern)
        
        return {
            "status": "success",
            "message": f"Cleared {deleted_count} cache entries",
            "pattern": cache_pattern
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")

@router.get("/performance/slow-queries")
async def get_slow_queries(limit: int = 10):
    """
    Get recent slow queries for analysis
    """
    try:
        # This would typically come from a logging system or database
        # For now, return mock data structure
        return {
            "slow_queries": [
                {
                    "query": "SELECT * FROM orders WHERE...",
                    "duration": 1.5,
                    "timestamp": "2024-01-15T10:30:00Z",
                    "table": "orders"
                }
            ],
            "total_count": 0,
            "threshold": settings.DB_QUERY_TIME_BUDGET
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get slow queries: {str(e)}")

@router.get("/performance/alerts")
async def get_performance_alerts():
    """
    Get current performance alerts and warnings
    """
    try:
        summary = performance_monitor.get_performance_summary(1)
        alerts = []
        
        # Check API response time
        avg_response_time = summary["requests"].get("avg_response_time", 0)
        if avg_response_time > settings.API_RESPONSE_TIME_BUDGET:
            alerts.append({
                "type": "warning",
                "metric": "api_response_time",
                "message": f"Average API response time ({avg_response_time:.3f}s) exceeds budget ({settings.API_RESPONSE_TIME_BUDGET}s)",
                "severity": "high" if avg_response_time > settings.API_RESPONSE_TIME_BUDGET * 2 else "medium"
            })
        
        # Check database query time
        avg_query_time = summary["database"].get("avg_query_time", 0)
        if avg_query_time > settings.DB_QUERY_TIME_BUDGET:
            alerts.append({
                "type": "warning",
                "metric": "database_query_time",
                "message": f"Average database query time ({avg_query_time:.3f}s) exceeds budget ({settings.DB_QUERY_TIME_BUDGET}s)",
                "severity": "high" if avg_query_time > settings.DB_QUERY_TIME_BUDGET * 2 else "medium"
            })
        
        # Check cache hit ratio
        cache_hit_ratio = summary["cache"].get("hit_ratio", 0)
        if cache_hit_ratio < settings.CACHE_HIT_RATIO_TARGET:
            alerts.append({
                "type": "warning",
                "metric": "cache_hit_ratio",
                "message": f"Cache hit ratio ({cache_hit_ratio:.2%}) below target ({settings.CACHE_HIT_RATIO_TARGET:.2%})",
                "severity": "medium"
            })
        
        # Check error rate
        total_requests = summary["requests"].get("total", 0)
        total_errors = summary["errors"].get("total", 0)
        error_rate = (total_errors / total_requests) if total_requests > 0 else 0
        
        if error_rate > 0.01:  # 1% error rate threshold
            alerts.append({
                "type": "error",
                "metric": "error_rate",
                "message": f"Error rate ({error_rate:.2%}) is elevated",
                "severity": "high" if error_rate > 0.05 else "medium"
            })
        
        return {
            "alerts": alerts,
            "total_alerts": len(alerts),
            "timestamp": summary.get("timestamp")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance alerts: {str(e)}")

@router.middleware("http")
async def track_request_performance(request: Request, call_next):
    """
    Middleware to track request performance
    """
    import time
    
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    # Track request performance
    performance_monitor.track_request(
        method=request.method,
        endpoint=str(request.url.path),
        status_code=response.status_code,
        duration=duration
    )
    
    # Add performance headers
    response.headers["X-Response-Time"] = f"{duration:.3f}s"
    
    return response 