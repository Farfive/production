from celery import Celery
from kombu import Queue, Exchange
import os
from datetime import timedelta
from app.core.config import settings


def create_celery_app() -> Celery:
    """Create and configure comprehensive Celery app with advanced features"""
    
    celery_app = Celery(
        "manufacturing_platform",
        broker=getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0'),
        backend=getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0'),
        include=[
            'app.tasks.email_tasks',
            'app.tasks.payment_tasks',
            'app.tasks.order_tasks',
            'app.tasks.sync_tasks',
            'app.tasks.analytics_tasks',
            'app.tasks.monitoring_tasks'
        ]
    )
    
    # Define exchanges for better message routing
    default_exchange = Exchange('default', type='direct')
    priority_exchange = Exchange('priority', type='direct')
    
    # Comprehensive Celery configuration
    celery_app.conf.update(
        # Task routing with priority support
        task_routes={
            # Email tasks
            'app.tasks.email_tasks.send_email_task': {'queue': 'email.normal'},
            'app.tasks.email_tasks.send_urgent_email_task': {'queue': 'email.urgent'},
            'app.tasks.email_tasks.send_bulk_email_task': {'queue': 'email.bulk'},
            'app.tasks.email_tasks.process_email_webhook': {'queue': 'email.webhooks'},
            
            # Payment tasks
            'app.tasks.payment_tasks.process_payment': {'queue': 'payment.critical'},
            'app.tasks.payment_tasks.reconcile_payments': {'queue': 'payment.normal'},
            'app.tasks.payment_tasks.generate_invoices': {'queue': 'payment.batch'},
            
            # Order tasks
            'app.tasks.order_tasks.match_orders': {'queue': 'order.critical'},
            'app.tasks.order_tasks.send_order_notifications': {'queue': 'order.normal'},
            'app.tasks.order_tasks.update_order_status': {'queue': 'order.normal'},
            
            # Data sync tasks
            'app.tasks.sync_tasks.sync_external_data': {'queue': 'sync.normal'},
            'app.tasks.sync_tasks.cleanup_old_data': {'queue': 'sync.maintenance'},
            'app.tasks.sync_tasks.backup_data': {'queue': 'sync.backup'},
            
            # Analytics tasks
            'app.tasks.analytics_tasks.generate_reports': {'queue': 'analytics.normal'},
            'app.tasks.analytics_tasks.update_dashboard_metrics': {'queue': 'analytics.realtime'},
            'app.tasks.analytics_tasks.process_user_analytics': {'queue': 'analytics.batch'},
            
            # Monitoring tasks
            'app.tasks.monitoring_tasks.health_check': {'queue': 'monitoring.critical'},
            'app.tasks.monitoring_tasks.collect_metrics': {'queue': 'monitoring.normal'},
        },
        
        # Advanced queue configuration with priority support
        task_default_queue='default',
        task_queues=(
            # Default queue
            Queue('default', default_exchange, routing_key='default'),
            
            # Email queues
            Queue('email.urgent', priority_exchange, routing_key='email.urgent', 
                  queue_arguments={'x-max-priority': 10}),
            Queue('email.normal', default_exchange, routing_key='email.normal',
                  queue_arguments={'x-max-priority': 5}),
            Queue('email.bulk', default_exchange, routing_key='email.bulk',
                  queue_arguments={'x-max-priority': 1}),
            Queue('email.webhooks', default_exchange, routing_key='email.webhooks'),
            
            # Payment queues (highest priority)
            Queue('payment.critical', priority_exchange, routing_key='payment.critical',
                  queue_arguments={'x-max-priority': 10}),
            Queue('payment.normal', default_exchange, routing_key='payment.normal',
                  queue_arguments={'x-max-priority': 7}),
            Queue('payment.batch', default_exchange, routing_key='payment.batch',
                  queue_arguments={'x-max-priority': 3}),
            
            # Order queues
            Queue('order.critical', priority_exchange, routing_key='order.critical',
                  queue_arguments={'x-max-priority': 9}),
            Queue('order.normal', default_exchange, routing_key='order.normal',
                  queue_arguments={'x-max-priority': 6}),
            
            # Data sync queues
            Queue('sync.normal', default_exchange, routing_key='sync.normal',
                  queue_arguments={'x-max-priority': 4}),
            Queue('sync.maintenance', default_exchange, routing_key='sync.maintenance',
                  queue_arguments={'x-max-priority': 2}),
            Queue('sync.backup', default_exchange, routing_key='sync.backup',
                  queue_arguments={'x-max-priority': 1}),
            
            # Analytics queues
            Queue('analytics.realtime', default_exchange, routing_key='analytics.realtime',
                  queue_arguments={'x-max-priority': 8}),
            Queue('analytics.normal', default_exchange, routing_key='analytics.normal',
                  queue_arguments={'x-max-priority': 4}),
            Queue('analytics.batch', default_exchange, routing_key='analytics.batch',
                  queue_arguments={'x-max-priority': 2}),
            
            # Monitoring queues
            Queue('monitoring.critical', priority_exchange, routing_key='monitoring.critical',
                  queue_arguments={'x-max-priority': 10}),
            Queue('monitoring.normal', default_exchange, routing_key='monitoring.normal',
                  queue_arguments={'x-max-priority': 5}),
            
            # Dead letter queue
            Queue('dead_letter', default_exchange, routing_key='dead_letter'),
        ),
        
        # Task execution settings
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='Europe/Warsaw',
        enable_utc=True,
        
        # Advanced retry configuration
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        task_default_retry_delay=60,
        task_max_retries=3,
        
        # Performance optimization
        task_soft_time_limit=300,    # 5 minutes
        task_time_limit=600,         # 10 minutes
        task_compression='gzip',
        task_always_eager=False,
        
        # Worker configuration for auto-scaling
        worker_prefetch_multiplier=1,
        worker_max_tasks_per_child=100,
        worker_disable_rate_limits=False,
        worker_autoscaler='celery.worker.autoscale:Autoscaler',
        worker_max_memory_per_child=200000,  # 200MB
        
        # Result backend optimization
        result_expires=3600,  # 1 hour
        result_cache_max=10000,
        result_backend_transport_options={
            'master_name': 'mymaster',
            'visibility_timeout': 3600,
            'socket_keepalive': True,
            'socket_keepalive_options': {
                'TCP_KEEPIDLE': 1,
                'TCP_KEEPINTVL': 3,
                'TCP_KEEPCNT': 5,
            },
        },
        
        # Database connection pooling
        broker_pool_limit=10,
        broker_connection_retry_on_startup=True,
        broker_connection_retry=True,
        broker_connection_max_retries=10,
        
        # Beat scheduler configuration with comprehensive scheduling
        beat_schedule={
            # Email maintenance
            'retry-failed-emails': {
                'task': 'app.tasks.email_tasks.retry_failed_emails',
                'schedule': timedelta(minutes=5),
                'options': {'queue': 'email.normal'}
            },
            'cleanup-email-tracking': {
                'task': 'app.tasks.email_tasks.cleanup_old_tracking',
                'schedule': timedelta(hours=24),
                'options': {'queue': 'sync.maintenance'}
            },
            'process-email-bounces': {
                'task': 'app.tasks.email_tasks.process_bounced_emails',
                'schedule': timedelta(hours=6),
                'options': {'queue': 'email.normal'}
            },
            
            # Payment reconciliation
            'reconcile-payments-hourly': {
                'task': 'app.tasks.payment_tasks.reconcile_payments',
                'schedule': timedelta(hours=1),
                'options': {'queue': 'payment.normal'}
            },
            'process-failed-payments': {
                'task': 'app.tasks.payment_tasks.retry_failed_payments',
                'schedule': timedelta(minutes=30),
                'options': {'queue': 'payment.critical'}
            },
            'generate-daily-invoices': {
                'task': 'app.tasks.payment_tasks.generate_daily_invoices',
                'schedule': timedelta(hours=24),
                'options': {'queue': 'payment.batch'}
            },
            
            # Order processing
            'process-pending-orders': {
                'task': 'app.tasks.order_tasks.process_pending_orders',
                'schedule': timedelta(minutes=15),
                'options': {'queue': 'order.normal'}
            },
            'send-order-reminders': {
                'task': 'app.tasks.order_tasks.send_order_reminders',
                'schedule': timedelta(hours=6),
                'options': {'queue': 'order.normal'}
            },
            'cleanup-expired-orders': {
                'task': 'app.tasks.order_tasks.cleanup_expired_orders',
                'schedule': timedelta(hours=24),
                'options': {'queue': 'sync.maintenance'}
            },
            
            # Data synchronization
            'sync-external-apis': {
                'task': 'app.tasks.sync_tasks.sync_all_external_apis',
                'schedule': timedelta(hours=2),
                'options': {'queue': 'sync.normal'}
            },
            'cleanup-old-logs': {
                'task': 'app.tasks.sync_tasks.cleanup_old_logs',
                'schedule': timedelta(days=1),
                'options': {'queue': 'sync.maintenance'}
            },
            'backup-critical-data': {
                'task': 'app.tasks.sync_tasks.backup_critical_data',
                'schedule': timedelta(hours=6),
                'options': {'queue': 'sync.backup'}
            },
            
            # Analytics and reporting
            'update-realtime-metrics': {
                'task': 'app.tasks.analytics_tasks.update_realtime_metrics',
                'schedule': timedelta(minutes=5),
                'options': {'queue': 'analytics.realtime'}
            },
            'generate-daily-reports': {
                'task': 'app.tasks.analytics_tasks.generate_daily_reports',
                'schedule': timedelta(hours=24),
                'options': {'queue': 'analytics.normal'}
            },
            'process-user-behavior-analytics': {
                'task': 'app.tasks.analytics_tasks.process_user_behavior',
                'schedule': timedelta(hours=6),
                'options': {'queue': 'analytics.batch'}
            },
            
            # System monitoring
            'system-health-check': {
                'task': 'app.tasks.monitoring_tasks.comprehensive_health_check',
                'schedule': timedelta(minutes=2),
                'options': {'queue': 'monitoring.critical'}
            },
            'collect-performance-metrics': {
                'task': 'app.tasks.monitoring_tasks.collect_performance_metrics',
                'schedule': timedelta(minutes=5),
                'options': {'queue': 'monitoring.normal'}
            },
            'cleanup-dead-tasks': {
                'task': 'app.tasks.monitoring_tasks.cleanup_dead_tasks',
                'schedule': timedelta(hours=1),
                'options': {'queue': 'monitoring.normal'}
            },
        },
        
        # Monitoring and events
        worker_send_task_events=True,
        task_send_sent_event=True,
        task_track_started=True,
        task_publish_retry=True,
        
        # Security settings
        task_reject_on_worker_lost=True,
        task_ignore_result=False,
        
        # Advanced features
        task_default_priority=5,
        broker_transport_options={
            'priority_steps': list(range(10)),
            'sep': ':',
            'queue_order_strategy': 'priority',
        },
    )
    
    return celery_app


# Create the Celery app instance
celery_app = create_celery_app() 