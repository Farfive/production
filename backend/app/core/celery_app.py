"""
Celery configuration for asynchronous task processing
"""
import os
from celery import Celery
from celery.signals import task_prerun, task_postrun, task_failure
from app.core.config import settings
from app.core.monitoring import performance_monitor

# Create Celery instance
celery_app = Celery(
    "manufacturing_platform",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        'app.tasks.email_tasks',
        'app.tasks.payment_tasks',
        'app.tasks.analytics_tasks',
        'app.tasks.optimization_tasks'
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task routing
    task_routes={
        'app.tasks.email_tasks.*': {'queue': 'email'},
        'app.tasks.payment_tasks.*': {'queue': 'payment'},
        'app.tasks.analytics_tasks.*': {'queue': 'analytics'},
        'app.tasks.optimization_tasks.*': {'queue': 'optimization'},
    },
    
    # Task execution
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Performance optimization
    worker_prefetch_multiplier=4,
    task_acks_late=True,
    worker_disable_rate_limits=False,
    task_compression='gzip',
    result_compression='gzip',
    
    # Task timeouts
    task_soft_time_limit=300,  # 5 minutes
    task_time_limit=600,       # 10 minutes
    
    # Result backend settings
    result_expires=3600,  # 1 hour
    result_persistent=True,
    
    # Worker settings
    worker_max_tasks_per_child=1000,
    worker_max_memory_per_child=200000,  # 200MB
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
    
    # Beat schedule for periodic tasks
    beat_schedule={
        'cleanup-expired-sessions': {
            'task': 'app.tasks.optimization_tasks.cleanup_expired_sessions',
            'schedule': 3600.0,  # Every hour
        },
        'update-analytics': {
            'task': 'app.tasks.analytics_tasks.update_daily_analytics',
            'schedule': 86400.0,  # Every day
        },
        'optimize-database': {
            'task': 'app.tasks.optimization_tasks.optimize_database_performance',
            'schedule': 21600.0,  # Every 6 hours
        },
        'health-check': {
            'task': 'app.tasks.optimization_tasks.system_health_check',
            'schedule': 300.0,  # Every 5 minutes
        },
    },
)

# Task monitoring signals
@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
    """Track task start"""
    if performance_monitor.statsd_client:
        performance_monitor.statsd_client.incr(f'celery.task.{task.name}.started')

@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, 
                        retval=None, state=None, **kwds):
    """Track task completion"""
    if performance_monitor.statsd_client:
        performance_monitor.statsd_client.incr(f'celery.task.{task.name}.completed')
        performance_monitor.statsd_client.incr(f'celery.task.{task.name}.{state.lower()}')

@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, traceback=None, einfo=None, **kwds):
    """Track task failures"""
    performance_monitor.track_error(exception, {
        'task_id': task_id,
        'task_name': sender.name if sender else 'unknown',
        'traceback': str(traceback)
    })
    
    if performance_monitor.statsd_client:
        performance_monitor.statsd_client.incr(f'celery.task.{sender.name}.failed')

# Task decorators for common patterns
def monitored_task(*args, **kwargs):
    """Decorator for tasks with monitoring"""
    def decorator(func):
        task = celery_app.task(*args, **kwargs)(func)
        
        def wrapper(*task_args, **task_kwargs):
            import time
            start_time = time.time()
            
            try:
                result = func(*task_args, **task_kwargs)
                duration = time.time() - start_time
                
                if performance_monitor.statsd_client:
                    performance_monitor.statsd_client.timing(
                        f'celery.task.{func.__name__}.duration',
                        duration * 1000
                    )
                
                return result
            except Exception as e:
                duration = time.time() - start_time
                performance_monitor.track_error(e, {
                    'task': func.__name__,
                    'duration': duration,
                    'args': str(task_args)[:100],
                    'kwargs': str(task_kwargs)[:100]
                })
                raise
        
        task.run = wrapper
        return task
    
    return decorator 