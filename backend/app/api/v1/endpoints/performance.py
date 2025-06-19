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

@router.get("/cache")
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

@router.get("/summary")
async def performance_summary(hours: int = 1):
    """
    Get performance summary for the specified time period
    """
    try:
        summary = performance_monitor.get_performance_summary(hours)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance summary: {str(e)}")

@router.post("/track-metric")
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

@router.get("/budgets")
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