"""
Monitoring and task management API endpoints
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.security import HTTPBearer
from pydantic import BaseModel

from app.core.security import get_current_admin_user
from app.utils.task_management import task_manager, task_scheduler
from app.tasks.monitoring_tasks import comprehensive_health_check, collect_metrics
from app.tasks.analytics_tasks import update_dashboard_metrics

router = APIRouter(prefix="/monitoring", tags=["monitoring"])
security = HTTPBearer()


class TaskScheduleRequest(BaseModel):
    task_name: str
    args: List[Any] = []
    kwargs: Dict[str, Any] = {}
    eta: Optional[datetime] = None
    countdown: Optional[int] = None
    priority: int = 5


class TaskControlRequest(BaseModel):
    task_id: str
    action: str  # 'cancel', 'terminate', 'retry'


@router.get("/health")
async def get_system_health():
    """Get current system health status"""
    try:
        # Trigger health check
        health_task = comprehensive_health_check.delay()
        health_status = health_task.get(timeout=30)
        
        return {
            "status": "success",
            "data": health_status,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/realtime")
async def get_realtime_metrics():
    """Get real-time system metrics"""
    try:
        # Update metrics
        update_task = update_dashboard_metrics.delay()
        metrics = update_task.get(timeout=30)
        
        return {
            "status": "success",
            "data": metrics,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/system")
async def get_system_metrics():
    """Get comprehensive system metrics"""
    try:
        # Collect metrics
        metrics_task = collect_metrics.delay()
        metrics = metrics_task.get(timeout=60)
        
        return {
            "status": "success",
            "data": metrics,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/status")
async def get_task_overview():
    """Get overview of all tasks and queues"""
    try:
        # Get task statistics
        stats = task_manager.get_task_statistics(hours=24)
        
        # Get queue status
        queue_status = task_manager.get_queue_status()
        
        # Get worker status
        worker_status = task_manager.get_worker_status()
        
        return {
            "status": "success",
            "data": {
                "statistics": stats,
                "queues": queue_status,
                "workers": worker_status
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/{task_id}")
async def get_task_details(task_id: str):
    """Get detailed information about a specific task"""
    try:
        task_status = task_manager.get_task_status(task_id)
        
        return {
            "status": "success",
            "data": task_status,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/history")
async def get_task_history(
    hours: int = Query(24, description="Hours of history to retrieve"),
    task_name: Optional[str] = Query(None, description="Filter by task name"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, description="Maximum number of results")
):
    """Get task execution history"""
    try:
        history = task_manager.get_task_history(hours=hours, task_name=task_name)
        
        if history['status'] == 'error':
            raise HTTPException(status_code=500, detail=history['error'])
        
        # Filter by status if specified
        tasks = history['tasks']
        if status:
            tasks = [task for task in tasks if task['status'] == status]
        
        # Apply limit
        tasks = tasks[:limit]
        
        return {
            "status": "success",
            "data": {
                **history,
                "tasks": tasks,
                "filtered_count": len(tasks)
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/failed")
async def get_failed_tasks(
    hours: int = Query(24, description="Hours to look back for failed tasks")
):
    """Get list of failed tasks"""
    try:
        failed_tasks = task_manager.get_failed_tasks(hours=hours)
        
        return {
            "status": "success",
            "data": failed_tasks,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/slow")
async def get_slow_tasks(
    threshold_seconds: int = Query(300, description="Threshold in seconds for slow tasks")
):
    """Get tasks that are running slower than threshold"""
    try:
        slow_tasks = task_manager.get_slow_tasks(threshold_seconds=threshold_seconds)
        
        return {
            "status": "success",
            "data": slow_tasks,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/queues")
async def get_queue_status():
    """Get status of all task queues"""
    try:
        queue_status = task_manager.get_queue_status()
        
        return {
            "status": "success",
            "data": queue_status,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/workers")
async def get_worker_status():
    """Get status of all Celery workers"""
    try:
        worker_status = task_manager.get_worker_status()
        
        return {
            "status": "success",
            "data": worker_status,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Administrative endpoints (require admin authentication)
@router.post("/tasks/schedule")
async def schedule_task(
    request: TaskScheduleRequest,
    current_user = Depends(get_current_admin_user)
):
    """Schedule a new task"""
    try:
        result = task_scheduler.schedule_task(
            task_name=request.task_name,
            args=request.args,
            kwargs=request.kwargs,
            eta=request.eta,
            countdown=request.countdown,
            priority=request.priority
        )
        
        return {
            "status": "success",
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks/control")
async def control_task(
    request: TaskControlRequest,
    current_user = Depends(get_current_admin_user)
):
    """Control task execution (cancel, terminate, retry)"""
    try:
        if request.action == 'cancel':
            result = task_manager.cancel_task(request.task_id, terminate=False)
        elif request.action == 'terminate':
            result = task_manager.cancel_task(request.task_id, terminate=True)
        elif request.action == 'retry':
            result = task_manager.retry_failed_task(request.task_id)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {request.action}")
        
        return {
            "status": "success",
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/queues/{queue_name}/purge")
async def purge_queue(
    queue_name: str,
    current_user = Depends(get_current_admin_user)
):
    """Purge all tasks from a specific queue"""
    try:
        result = task_manager.purge_queue(queue_name)
        
        return {
            "status": "success",
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/system/health-check")
async def trigger_health_check(
    current_user = Depends(get_current_admin_user)
):
    """Trigger a comprehensive system health check"""
    try:
        # Schedule health check task
        health_task = comprehensive_health_check.delay()
        
        return {
            "status": "success",
            "data": {
                "task_id": health_task.id,
                "message": "Health check initiated"
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/system/collect-metrics")
async def trigger_metrics_collection(
    current_user = Depends(get_current_admin_user)
):
    """Trigger metrics collection"""
    try:
        # Schedule metrics collection
        metrics_task = collect_metrics.delay()
        
        return {
            "status": "success",
            "data": {
                "task_id": metrics_task.id,
                "message": "Metrics collection initiated"
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/performance")
async def get_performance_analytics(
    hours: int = Query(24, description="Hours of data to analyze")
):
    """Get performance analytics and trends"""
    try:
        # Get task statistics
        stats = task_manager.get_task_statistics(hours=hours)
        
        # Calculate trends and patterns
        trends = {
            "task_volume_trend": "stable",  # This would be calculated from historical data
            "success_rate_trend": "improving",
            "performance_trend": "stable"
        }
        
        # Get slow tasks
        slow_tasks = task_manager.get_slow_tasks(threshold_seconds=300)
        
        return {
            "status": "success",
            "data": {
                "statistics": stats,
                "trends": trends,
                "slow_tasks": slow_tasks,
                "performance_summary": {
                    "avg_task_duration": "45 seconds",  # Would be calculated
                    "peak_queue_length": 150,  # Would be calculated
                    "busiest_hour": "14:00-15:00"  # Would be calculated
                }
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/active")
async def get_active_alerts():
    """Get currently active system alerts"""
    try:
        # This would typically fetch from a alerts/incidents database
        # For now, return a placeholder structure
        active_alerts = []
        
        # Check queue lengths
        queue_status = task_manager.get_queue_status()
        if queue_status['status'] == 'success':
            for queue_name, queue_info in queue_status['queues'].items():
                if queue_info['length'] > 1000:
                    active_alerts.append({
                        "id": f"queue_backup_{queue_name}",
                        "type": "queue_backup",
                        "severity": "warning",
                        "message": f"Queue {queue_name} has {queue_info['length']} pending tasks",
                        "created_at": datetime.now().isoformat(),
                        "queue_name": queue_name
                    })
        
        # Check failed tasks
        failed_tasks = task_manager.get_failed_tasks(hours=1)
        if failed_tasks['status'] == 'success' and failed_tasks['total_failed'] > 10:
            active_alerts.append({
                "id": "high_failure_rate",
                "type": "high_failure_rate",
                "severity": "error",
                "message": f"{failed_tasks['total_failed']} tasks failed in the last hour",
                "created_at": datetime.now().isoformat(),
                "failed_count": failed_tasks['total_failed']
            })
        
        return {
            "status": "success",
            "data": {
                "active_alerts": active_alerts,
                "total_alerts": len(active_alerts)
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard")
async def get_dashboard_data():
    """Get comprehensive dashboard data"""
    try:
        # Get all necessary data for dashboard
        task_stats = task_manager.get_task_statistics(hours=24)
        queue_status = task_manager.get_queue_status()
        worker_status = task_manager.get_worker_status()
        failed_tasks = task_manager.get_failed_tasks(hours=24)
        slow_tasks = task_manager.get_slow_tasks(threshold_seconds=300)
        
        # Calculate summary metrics
        summary = {
            "total_tasks_24h": task_stats.get('overall_stats', {}).get('total_tasks', 0),
            "success_rate": task_stats.get('overall_stats', {}).get('success_rate', 0),
            "active_workers": worker_status.get('online_workers', 0),
            "total_queues": queue_status.get('total_queues', 0),
            "failed_tasks_24h": failed_tasks.get('total_failed', 0),
            "slow_tasks_active": slow_tasks.get('slow_tasks_count', 0)
        }
        
        return {
            "status": "success",
            "data": {
                "summary": summary,
                "task_statistics": task_stats,
                "queue_status": queue_status,
                "worker_status": worker_status,
                "recent_failures": failed_tasks,
                "slow_tasks": slow_tasks
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 