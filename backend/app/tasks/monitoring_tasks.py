"""
System monitoring and health check tasks
"""
import asyncio
import json
import psutil
import redis
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from celery import current_app
from celery.exceptions import Retry
from sqlalchemy.orm import Session
from loguru import logger

from app.core.celery_config import celery_app
from app.core.database import get_db
from app.services.monitoring import MonitoringService
from app.services.alerting import AlertingService
from app.services.notification import NotificationService


@celery_app.task
def health_check() -> Dict[str, Any]:
    """
    Basic health check for critical services
    Priority: CRITICAL
    """
    try:
        monitoring_service = MonitoringService()
        
        health_status = {
            'timestamp': datetime.now().isoformat(),
            'status': 'healthy',
            'checks': {}
        }
        
        # Database connectivity check
        try:
            db_status = asyncio.run(monitoring_service.check_database_health())
            health_status['checks']['database'] = db_status
        except Exception as e:
            health_status['checks']['database'] = {'status': 'unhealthy', 'error': str(e)}
            health_status['status'] = 'degraded'
        
        # Redis connectivity check
        try:
            redis_status = asyncio.run(monitoring_service.check_redis_health())
            health_status['checks']['redis'] = redis_status
        except Exception as e:
            health_status['checks']['redis'] = {'status': 'unhealthy', 'error': str(e)}
            health_status['status'] = 'degraded'
        
        # External API checks
        try:
            api_status = asyncio.run(monitoring_service.check_external_apis())
            health_status['checks']['external_apis'] = api_status
        except Exception as e:
            health_status['checks']['external_apis'] = {'status': 'unhealthy', 'error': str(e)}
            health_status['status'] = 'degraded'
        
        # File system check
        try:
            fs_status = monitoring_service.check_filesystem_health()
            health_status['checks']['filesystem'] = fs_status
        except Exception as e:
            health_status['checks']['filesystem'] = {'status': 'unhealthy', 'error': str(e)}
            health_status['status'] = 'degraded'
        
        # Memory usage check
        try:
            memory_status = monitoring_service.check_memory_usage()
            health_status['checks']['memory'] = memory_status
            if memory_status['usage_percent'] > 90:
                health_status['status'] = 'degraded'
        except Exception as e:
            health_status['checks']['memory'] = {'status': 'unhealthy', 'error': str(e)}
            health_status['status'] = 'degraded'
        
        # If any critical check failed, send alert
        if health_status['status'] == 'degraded':
            send_health_alert.delay(health_status)
        
        logger.info(f"Health check completed: {health_status['status']}")
        
        return health_status
        
    except Exception as exc:
        logger.error(f"Health check failed: {str(exc)}")
        
        # Send critical alert
        critical_health_status = {
            'timestamp': datetime.now().isoformat(),
            'status': 'critical',
            'error': str(exc)
        }
        send_health_alert.delay(critical_health_status)
        
        return critical_health_status


@celery_app.task
def comprehensive_health_check() -> Dict[str, Any]:
    """
    Comprehensive health check including performance metrics
    Scheduled task - runs every 2 minutes
    """
    try:
        monitoring_service = MonitoringService()
        
        # Run basic health check first
        basic_health = health_check.delay().get(timeout=30)
        
        # Additional comprehensive checks
        comprehensive_status = {
            **basic_health,
            'comprehensive_checks': {}
        }
        
        # Application performance metrics
        try:
            perf_metrics = asyncio.run(monitoring_service.get_performance_metrics())
            comprehensive_status['comprehensive_checks']['performance'] = perf_metrics
        except Exception as e:
            comprehensive_status['comprehensive_checks']['performance'] = {
                'status': 'unhealthy', 'error': str(e)
            }
        
        # Queue health check
        try:
            queue_status = asyncio.run(monitoring_service.check_queue_health())
            comprehensive_status['comprehensive_checks']['queues'] = queue_status
            
            # Alert if queues are backing up
            for queue_name, queue_info in queue_status.items():
                if queue_info.get('length', 0) > 1000:  # Alert if queue > 1000 items
                    send_queue_alert.delay(queue_name, queue_info)
                    
        except Exception as e:
            comprehensive_status['comprehensive_checks']['queues'] = {
                'status': 'unhealthy', 'error': str(e)
            }
        
        # Worker health check
        try:
            worker_status = monitoring_service.check_worker_health()
            comprehensive_status['comprehensive_checks']['workers'] = worker_status
        except Exception as e:
            comprehensive_status['comprehensive_checks']['workers'] = {
                'status': 'unhealthy', 'error': str(e)
            }
        
        # Security checks
        try:
            security_status = asyncio.run(monitoring_service.check_security_metrics())
            comprehensive_status['comprehensive_checks']['security'] = security_status
        except Exception as e:
            comprehensive_status['comprehensive_checks']['security'] = {
                'status': 'unhealthy', 'error': str(e)
            }
        
        # Update overall status based on comprehensive checks
        if any(check.get('status') == 'unhealthy' 
               for check in comprehensive_status['comprehensive_checks'].values()):
            comprehensive_status['status'] = 'degraded'
        
        logger.debug(f"Comprehensive health check completed: {comprehensive_status['status']}")
        
        return comprehensive_status
        
    except Exception as exc:
        logger.error(f"Comprehensive health check failed: {str(exc)}")
        raise


@celery_app.task
def collect_metrics() -> Dict[str, Any]:
    """
    Collect system and application metrics
    Priority: NORMAL
    """
    try:
        monitoring_service = MonitoringService()
        
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'system': {},
            'application': {},
            'business': {}
        }
        
        # System metrics
        metrics['system'] = {
            'cpu_usage': psutil.cpu_percent(interval=1),
            'memory_usage': psutil.virtual_memory()._asdict(),
            'disk_usage': psutil.disk_usage('/')._asdict(),
            'network_io': psutil.net_io_counters()._asdict(),
            'load_average': psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
        }
        
        # Application metrics
        metrics['application'] = asyncio.run(monitoring_service.collect_application_metrics())
        
        # Business metrics
        metrics['business'] = asyncio.run(monitoring_service.collect_business_metrics())
        
        # Store metrics in time series database
        asyncio.run(monitoring_service.store_metrics(metrics))
        
        # Check for metric thresholds and send alerts if needed
        check_metric_thresholds.delay(metrics)
        
        logger.debug("Metrics collection completed")
        
        return {
            'status': 'success',
            'metrics_collected': len(metrics),
            'timestamp': metrics['timestamp']
        }
        
    except Exception as exc:
        logger.error(f"Metrics collection failed: {str(exc)}")
        raise


@celery_app.task
def collect_performance_metrics() -> Dict[str, Any]:
    """
    Collect detailed performance metrics
    Scheduled task - runs every 5 minutes
    """
    try:
        # Use the general collect_metrics task
        result = collect_metrics.delay().get(timeout=60)
        
        return result
        
    except Exception as exc:
        logger.error(f"Performance metrics collection failed: {str(exc)}")
        raise


@celery_app.task
def cleanup_dead_tasks() -> Dict[str, Any]:
    """
    Clean up dead or stuck tasks
    Scheduled task - runs every hour
    """
    try:
        monitoring_service = MonitoringService()
        
        # Get active tasks from Celery
        active_tasks = current_app.control.inspect().active()
        
        # Find tasks that have been running too long
        stuck_tasks = []
        current_time = datetime.now()
        
        if active_tasks:
            for worker, tasks in active_tasks.items():
                for task in tasks:
                    task_start_time = datetime.fromtimestamp(task['time_start'])
                    runtime = current_time - task_start_time
                    
                    # Consider task stuck if running for more than 30 minutes
                    if runtime > timedelta(minutes=30):
                        stuck_tasks.append({
                            'worker': worker,
                            'task_id': task['id'],
                            'task_name': task['name'],
                            'runtime': runtime.total_seconds()
                        })
        
        # Revoke stuck tasks
        revoked_tasks = []
        for stuck_task in stuck_tasks:
            try:
                current_app.control.revoke(stuck_task['task_id'], terminate=True)
                revoked_tasks.append(stuck_task['task_id'])
                logger.warning(f"Revoked stuck task {stuck_task['task_id']} on {stuck_task['worker']}")
            except Exception as e:
                logger.error(f"Failed to revoke task {stuck_task['task_id']}: {str(e)}")
        
        # Clean up completed task results older than 1 hour
        cleaned_results = asyncio.run(monitoring_service.cleanup_task_results(hours=1))
        
        logger.info(f"Task cleanup completed: {len(revoked_tasks)} stuck tasks revoked, "
                   f"{cleaned_results} old results cleaned")
        
        return {
            'status': 'success',
            'stuck_tasks_found': len(stuck_tasks),
            'tasks_revoked': len(revoked_tasks),
            'results_cleaned': cleaned_results
        }
        
    except Exception as exc:
        logger.error(f"Task cleanup failed: {str(exc)}")
        raise


@celery_app.task
def send_health_alert(health_status: Dict[str, Any]) -> Dict[str, Any]:
    """
    Send health status alert to administrators
    """
    try:
        alerting_service = AlertingService()
        notification_service = NotificationService()
        
        # Determine alert severity
        if health_status['status'] == 'critical':
            severity = 'critical'
        elif health_status['status'] == 'degraded':
            severity = 'warning'
        else:
            severity = 'info'
        
        # Send alert via multiple channels
        alert_channels = ['email', 'slack'] if severity == 'critical' else ['email']
        
        for channel in alert_channels:
            try:
                asyncio.run(alerting_service.send_alert(
                    channel=channel,
                    severity=severity,
                    title=f"System Health Alert - {health_status['status'].upper()}",
                    message="System health check detected issues",
                    data=health_status
                ))
            except Exception as e:
                logger.error(f"Failed to send alert via {channel}: {str(e)}")
        
        logger.warning(f"Health alert sent: {severity} - {health_status['status']}")
        
        return {
            'status': 'sent',
            'severity': severity,
            'channels': alert_channels
        }
        
    except Exception as exc:
        logger.error(f"Failed to send health alert: {str(exc)}")
        raise


@celery_app.task
def send_queue_alert(queue_name: str, queue_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Send queue backup alert
    """
    try:
        alerting_service = AlertingService()
        
        message = f"Queue '{queue_name}' has {queue_info.get('length', 0)} pending tasks"
        
        asyncio.run(alerting_service.send_alert(
            channel='email',
            severity='warning',
            title=f"Queue Backup Alert - {queue_name}",
            message=message,
            data=queue_info
        ))
        
        logger.warning(f"Queue alert sent for {queue_name}: {queue_info.get('length', 0)} tasks")
        
        return {
            'status': 'sent',
            'queue_name': queue_name,
            'queue_length': queue_info.get('length', 0)
        }
        
    except Exception as exc:
        logger.error(f"Failed to send queue alert: {str(exc)}")
        raise


@celery_app.task
def check_metric_thresholds(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check if any metrics exceed defined thresholds
    """
    try:
        monitoring_service = MonitoringService()
        
        # Define thresholds
        thresholds = {
            'cpu_usage': 85,  # %
            'memory_usage_percent': 90,  # %
            'disk_usage_percent': 85,  # %
            'response_time_ms': 5000,  # ms
            'error_rate_percent': 5,  # %
            'queue_length': 1000  # tasks
        }
        
        alerts_triggered = []
        
        # Check system thresholds
        if metrics['system']['cpu_usage'] > thresholds['cpu_usage']:
            alerts_triggered.append({
                'metric': 'cpu_usage',
                'value': metrics['system']['cpu_usage'],
                'threshold': thresholds['cpu_usage']
            })
        
        memory_percent = (metrics['system']['memory_usage']['used'] / 
                         metrics['system']['memory_usage']['total']) * 100
        if memory_percent > thresholds['memory_usage_percent']:
            alerts_triggered.append({
                'metric': 'memory_usage_percent',
                'value': memory_percent,
                'threshold': thresholds['memory_usage_percent']
            })
        
        disk_percent = (metrics['system']['disk_usage']['used'] / 
                       metrics['system']['disk_usage']['total']) * 100
        if disk_percent > thresholds['disk_usage_percent']:
            alerts_triggered.append({
                'metric': 'disk_usage_percent',
                'value': disk_percent,
                'threshold': thresholds['disk_usage_percent']
            })
        
        # Check application thresholds
        app_metrics = metrics.get('application', {})
        if app_metrics.get('avg_response_time_ms', 0) > thresholds['response_time_ms']:
            alerts_triggered.append({
                'metric': 'response_time_ms',
                'value': app_metrics['avg_response_time_ms'],
                'threshold': thresholds['response_time_ms']
            })
        
        if app_metrics.get('error_rate_percent', 0) > thresholds['error_rate_percent']:
            alerts_triggered.append({
                'metric': 'error_rate_percent',
                'value': app_metrics['error_rate_percent'],
                'threshold': thresholds['error_rate_percent']
            })
        
        # Send alerts for threshold violations
        for alert in alerts_triggered:
            send_threshold_alert.delay(alert)
        
        if alerts_triggered:
            logger.warning(f"Metric thresholds exceeded: {len(alerts_triggered)} alerts triggered")
        
        return {
            'status': 'completed',
            'alerts_triggered': len(alerts_triggered),
            'alerts': alerts_triggered
        }
        
    except Exception as exc:
        logger.error(f"Metric threshold check failed: {str(exc)}")
        raise


@celery_app.task
def send_threshold_alert(alert: Dict[str, Any]) -> Dict[str, Any]:
    """
    Send threshold violation alert
    """
    try:
        alerting_service = AlertingService()
        
        message = (f"Metric '{alert['metric']}' exceeded threshold: "
                  f"{alert['value']:.2f} > {alert['threshold']}")
        
        asyncio.run(alerting_service.send_alert(
            channel='email',
            severity='warning',
            title=f"Metric Threshold Alert - {alert['metric']}",
            message=message,
            data=alert
        ))
        
        logger.warning(f"Threshold alert sent for {alert['metric']}: {alert['value']}")
        
        return {
            'status': 'sent',
            'metric': alert['metric'],
            'value': alert['value']
        }
        
    except Exception as exc:
        logger.error(f"Failed to send threshold alert: {str(exc)}")
        raise


@celery_app.task
def generate_monitoring_report() -> Dict[str, Any]:
    """
    Generate comprehensive monitoring report
    """
    try:
        monitoring_service = MonitoringService()
        
        # Collect data for the last 24 hours
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=24)
        
        report = asyncio.run(monitoring_service.generate_monitoring_report(start_time, end_time))
        
        # Save report
        report_path = asyncio.run(monitoring_service.save_monitoring_report(report))
        
        # Send report to administrators
        from app.tasks.email_tasks import send_email_task
        
        email_data = {
            'id': f"monitoring_report_{datetime.now().strftime('%Y%m%d')}",
            'to_email': 'admin@manufacturingplatform.com',
            'to_name': 'System Administrator'
        }
        
        context = {
            'report_period': '24 hours',
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'summary': report['summary']
        }
        
        # Read report file for attachment
        with open(report_path, 'rb') as f:
            report_content = f.read()
        
        attachments = [{
            'filename': f"monitoring_report_{datetime.now().strftime('%Y%m%d')}.pdf",
            'content': report_content,
            'type': 'application/pdf'
        }]
        
        send_email_task.delay(
            email_data=email_data,
            template_name='monitoring_report',
            context=context,
            attachments=attachments
        )
        
        logger.info(f"Monitoring report generated and sent: {report_path}")
        
        return {
            'status': 'success',
            'report_path': report_path,
            'period': '24 hours',
            'summary': report['summary']
        }
        
    except Exception as exc:
        logger.error(f"Monitoring report generation failed: {str(exc)}")
        raise


@celery_app.task
def monitor_external_services() -> Dict[str, Any]:
    """
    Monitor external service availability and performance
    """
    try:
        monitoring_service = MonitoringService()
        
        external_services = [
            'stripe_api',
            'sendgrid_api',
            'postgres_database',
            'redis_cache'
        ]
        
        service_status = {}
        
        for service in external_services:
            try:
                status = asyncio.run(monitoring_service.check_external_service(service))
                service_status[service] = status
                
                # Send alert if service is down
                if status['status'] != 'healthy':
                    send_service_alert.delay(service, status)
                    
            except Exception as e:
                service_status[service] = {
                    'status': 'error',
                    'error': str(e),
                    'checked_at': datetime.now().isoformat()
                }
        
        overall_status = 'healthy' if all(
            s['status'] == 'healthy' for s in service_status.values()
        ) else 'degraded'
        
        logger.info(f"External service monitoring completed: {overall_status}")
        
        return {
            'status': overall_status,
            'services': service_status,
            'checked_at': datetime.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"External service monitoring failed: {str(exc)}")
        raise


@celery_app.task
def send_service_alert(service_name: str, status: Dict[str, Any]) -> Dict[str, Any]:
    """
    Send external service availability alert
    """
    try:
        alerting_service = AlertingService()
        
        message = f"External service '{service_name}' is {status['status']}"
        if 'error' in status:
            message += f": {status['error']}"
        
        severity = 'critical' if status['status'] == 'down' else 'warning'
        
        asyncio.run(alerting_service.send_alert(
            channel='email',
            severity=severity,
            title=f"Service Alert - {service_name}",
            message=message,
            data=status
        ))
        
        logger.warning(f"Service alert sent for {service_name}: {status['status']}")
        
        return {
            'status': 'sent',
            'service': service_name,
            'service_status': status['status']
        }
        
    except Exception as exc:
        logger.error(f"Failed to send service alert: {str(exc)}")
        raise 