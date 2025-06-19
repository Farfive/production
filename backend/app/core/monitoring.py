"""
Comprehensive monitoring and performance tracking system
"""
import time
import psutil
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from functools import wraps
from contextlib import contextmanager

import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import statsd

from app.core.config import settings

logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """Advanced performance monitoring and metrics collection"""
    
    def __init__(self):
        # Initialize Sentry for error tracking
        if settings.SENTRY_DSN:
            sentry_sdk.init(
                dsn=settings.SENTRY_DSN,
                integrations=[
                    FlaskIntegration(auto_enabling_integrations=False),
                    SqlalchemyIntegration()
                ],
                traces_sample_rate=0.1,  # 10% of transactions
                profiles_sample_rate=0.1,  # 10% of profiles
                environment=settings.ENVIRONMENT
            )
        
        # Initialize StatsD client
        if settings.STATSD_HOST:
            self.statsd_client = statsd.StatsClient(
                host=settings.STATSD_HOST,
                port=settings.STATSD_PORT,
                prefix='manufacturing_platform'
            )
        else:
            self.statsd_client = None
        
        # Prometheus metrics - use try/except to handle duplicate registrations
        try:
            self.request_count = Counter(
                'http_requests_total',
                'Total HTTP requests',
                ['method', 'endpoint', 'status']
            )
        except ValueError:
            # Metric already exists, get existing one
            from prometheus_client import REGISTRY
            for collector in list(REGISTRY._collector_to_names.keys()):
                if hasattr(collector, '_name') and collector._name == 'http_requests_total':
                    self.request_count = collector
                    break
        
        try:
            self.request_duration = Histogram(
                'http_request_duration_seconds',
                'HTTP request duration',
                ['method', 'endpoint']
            )
        except ValueError:
            from prometheus_client import REGISTRY
            for collector in list(REGISTRY._collector_to_names.keys()):
                if hasattr(collector, '_name') and collector._name == 'http_request_duration_seconds':
                    self.request_duration = collector
                    break
        
        try:
            self.database_query_duration = Histogram(
                'database_query_duration_seconds',
                'Database query duration',
                ['query_type', 'table']
            )
        except ValueError:
            from prometheus_client import REGISTRY
            for collector in list(REGISTRY._collector_to_names.keys()):
                if hasattr(collector, '_name') and collector._name == 'database_query_duration_seconds':
                    self.database_query_duration = collector
                    break
        
        try:
            self.cache_operations = Counter(
                'cache_operations_total',
                'Cache operations',
                ['operation', 'backend', 'status']
            )
        except ValueError:
            from prometheus_client import REGISTRY
            for collector in list(REGISTRY._collector_to_names.keys()):
                if hasattr(collector, '_name') and collector._name == 'cache_operations_total':
                    self.cache_operations = collector
                    break
        
        try:
            self.active_connections = Gauge(
                'database_connections_active',
                'Active database connections'
            )
        except ValueError:
            from prometheus_client import REGISTRY
            for collector in list(REGISTRY._collector_to_names.keys()):
                if hasattr(collector, '_name') and collector._name == 'database_connections_active':
                    self.active_connections = collector
                    break
        
        try:
            self.memory_usage = Gauge(
                'memory_usage_bytes',
                'Memory usage in bytes'
            )
        except ValueError:
            from prometheus_client import REGISTRY
            for collector in list(REGISTRY._collector_to_names.keys()):
                if hasattr(collector, '_name') and collector._name == 'memory_usage_bytes':
                    self.memory_usage = collector
                    break
        
        try:
            self.cpu_usage = Gauge(
                'cpu_usage_percent',
                'CPU usage percentage'
            )
        except ValueError:
            from prometheus_client import REGISTRY
            for collector in list(REGISTRY._collector_to_names.keys()):
                if hasattr(collector, '_name') and collector._name == 'cpu_usage_percent':
                    self.cpu_usage = collector
                    break
        
        # Performance tracking
        self.performance_data = {
            'requests': [],
            'queries': [],
            'cache_hits': 0,
            'cache_misses': 0,
            'errors': []
        }
    
    def track_request(self, method: str, endpoint: str, status_code: int, duration: float):
        """Track HTTP request metrics"""
        # Prometheus metrics
        self.request_count.labels(
            method=method,
            endpoint=endpoint,
            status=str(status_code)
        ).inc()
        
        self.request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)
        
        # StatsD metrics
        if self.statsd_client:
            self.statsd_client.incr(f'requests.{method.lower()}.{status_code}')
            self.statsd_client.timing(f'requests.duration.{endpoint}', duration * 1000)
        
        # Store for analysis
        self.performance_data['requests'].append({
            'timestamp': datetime.utcnow(),
            'method': method,
            'endpoint': endpoint,
            'status_code': status_code,
            'duration': duration
        })
        
        # Alert on slow requests
        if duration > settings.API_RESPONSE_TIME_BUDGET:
            self.alert_slow_request(method, endpoint, duration)
    
    def track_database_query(self, query_type: str, table: str, duration: float):
        """Track database query performance"""
        self.database_query_duration.labels(
            query_type=query_type,
            table=table
        ).observe(duration)
        
        if self.statsd_client:
            self.statsd_client.timing(f'db.query.{query_type}.{table}', duration * 1000)
        
        self.performance_data['queries'].append({
            'timestamp': datetime.utcnow(),
            'query_type': query_type,
            'table': table,
            'duration': duration
        })
        
        # Alert on slow queries
        if duration > settings.DB_QUERY_TIME_BUDGET:
            self.alert_slow_query(query_type, table, duration)
    
    def track_cache_operation(self, operation: str, backend: str, status: str):
        """Track cache operations"""
        self.cache_operations.labels(
            operation=operation,
            backend=backend,
            status=status
        ).inc()
        
        if self.statsd_client:
            self.statsd_client.incr(f'cache.{operation}.{backend}.{status}')
        
        if status == 'hit':
            self.performance_data['cache_hits'] += 1
        elif status == 'miss':
            self.performance_data['cache_misses'] += 1
    
    def track_error(self, error: Exception, context: Dict[str, Any] = None):
        """Track application errors"""
        error_data = {
            'timestamp': datetime.utcnow(),
            'error_type': type(error).__name__,
            'error_message': str(error),
            'context': context or {}
        }
        
        self.performance_data['errors'].append(error_data)
        
        # Send to Sentry
        if settings.SENTRY_DSN:
            sentry_sdk.capture_exception(error)
        
        # Send to StatsD
        if self.statsd_client:
            self.statsd_client.incr(f'errors.{type(error).__name__}')
        
        logger.error(f"Application error: {error}", extra=context)
    
    def update_system_metrics(self):
        """Update system resource metrics"""
        # Memory usage
        memory = psutil.virtual_memory()
        self.memory_usage.set(memory.used)
        
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        self.cpu_usage.set(cpu_percent)
        
        # Send to StatsD
        if self.statsd_client:
            self.statsd_client.gauge('system.memory.used', memory.used)
            self.statsd_client.gauge('system.memory.percent', memory.percent)
            self.statsd_client.gauge('system.cpu.percent', cpu_percent)
    
    def get_performance_summary(self, hours: int = 1) -> Dict[str, Any]:
        """Get performance summary for the last N hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Filter recent data
        recent_requests = [
            r for r in self.performance_data['requests']
            if r['timestamp'] > cutoff_time
        ]
        
        recent_queries = [
            q for q in self.performance_data['queries']
            if q['timestamp'] > cutoff_time
        ]
        
        recent_errors = [
            e for e in self.performance_data['errors']
            if e['timestamp'] > cutoff_time
        ]
        
        # Calculate statistics
        if recent_requests:
            avg_response_time = sum(r['duration'] for r in recent_requests) / len(recent_requests)
            max_response_time = max(r['duration'] for r in recent_requests)
            status_codes = {}
            for req in recent_requests:
                status = str(req['status_code'])
                status_codes[status] = status_codes.get(status, 0) + 1
        else:
            avg_response_time = max_response_time = 0
            status_codes = {}
        
        if recent_queries:
            avg_query_time = sum(q['duration'] for q in recent_queries) / len(recent_queries)
            max_query_time = max(q['duration'] for q in recent_queries)
        else:
            avg_query_time = max_query_time = 0
        
        # Cache hit ratio
        total_cache_ops = self.performance_data['cache_hits'] + self.performance_data['cache_misses']
        cache_hit_ratio = (
            self.performance_data['cache_hits'] / total_cache_ops
            if total_cache_ops > 0 else 0
        )
        
        return {
            'time_period': f"Last {hours} hour(s)",
            'requests': {
                'total': len(recent_requests),
                'avg_response_time': avg_response_time,
                'max_response_time': max_response_time,
                'status_codes': status_codes
            },
            'database': {
                'total_queries': len(recent_queries),
                'avg_query_time': avg_query_time,
                'max_query_time': max_query_time
            },
            'cache': {
                'hit_ratio': cache_hit_ratio,
                'total_hits': self.performance_data['cache_hits'],
                'total_misses': self.performance_data['cache_misses']
            },
            'errors': {
                'total': len(recent_errors),
                'by_type': {}
            },
            'system': {
                'memory_usage': psutil.virtual_memory().percent,
                'cpu_usage': psutil.cpu_percent()
            }
        }
    
    def alert_slow_request(self, method: str, endpoint: str, duration: float):
        """Alert on slow HTTP requests"""
        message = f"Slow request detected: {method} {endpoint} took {duration:.3f}s"
        logger.warning(message)
        
        if self.statsd_client:
            self.statsd_client.incr('alerts.slow_request')
    
    def alert_slow_query(self, query_type: str, table: str, duration: float):
        """Alert on slow database queries"""
        message = f"Slow query detected: {query_type} on {table} took {duration:.3f}s"
        logger.warning(message)
        
        if self.statsd_client:
            self.statsd_client.incr('alerts.slow_query')
    
    def get_prometheus_metrics(self) -> str:
        """Get Prometheus metrics in text format"""
        return generate_latest()
    
    def track_custom_metric(self, name: str, value: float):
        """Track custom performance metric"""
        if self.statsd_client:
            self.statsd_client.gauge(f'custom.{name}', value)
        
        # Store in performance data
        if 'custom_metrics' not in self.performance_data:
            self.performance_data['custom_metrics'] = {}
        self.performance_data['custom_metrics'][name] = {
            'value': value,
            'timestamp': datetime.utcnow()
        }

# Global performance monitor instance
performance_monitor = PerformanceMonitor()

def monitor_performance(func_name: str = None):
    """Decorator to monitor function performance"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            func_name_actual = func_name or func.__name__
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                # Track successful execution
                if performance_monitor.statsd_client:
                    performance_monitor.statsd_client.timing(
                        f'function.{func_name_actual}.duration',
                        duration * 1000
                    )
                    performance_monitor.statsd_client.incr(
                        f'function.{func_name_actual}.success'
                    )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                # Track failed execution
                performance_monitor.track_error(e, {
                    'function': func_name_actual,
                    'duration': duration,
                    'args': str(args)[:100],  # Truncate for privacy
                    'kwargs': str(kwargs)[:100]
                })
                
                if performance_monitor.statsd_client:
                    performance_monitor.statsd_client.incr(
                        f'function.{func_name_actual}.error'
                    )
                
                raise
        
        return wrapper
    return decorator

@contextmanager
def performance_context(operation_name: str):
    """Context manager for tracking operation performance"""
    start_time = time.time()
    
    try:
        yield
        duration = time.time() - start_time
        
        if performance_monitor.statsd_client:
            performance_monitor.statsd_client.timing(
                f'operation.{operation_name}.duration',
                duration * 1000
            )
            performance_monitor.statsd_client.incr(
                f'operation.{operation_name}.success'
            )
            
    except Exception as e:
        duration = time.time() - start_time
        
        performance_monitor.track_error(e, {
            'operation': operation_name,
            'duration': duration
        })
        
        if performance_monitor.statsd_client:
            performance_monitor.statsd_client.incr(
                f'operation.{operation_name}.error'
            )
        
        raise

class HealthChecker:
    """System health monitoring"""
    
    @staticmethod
    def check_database_health() -> Dict[str, Any]:
        """Check database connectivity and performance"""
        try:
            from app.core.database import engine
            
            start_time = time.time()
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            duration = time.time() - start_time
            
            return {
                'status': 'healthy',
                'response_time': duration,
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    @staticmethod
    def check_redis_health() -> Dict[str, Any]:
        """Check Redis connectivity and performance"""
        try:
            from app.core.cache import cache_manager
            
            start_time = time.time()
            cache_manager.redis_client.ping()
            duration = time.time() - start_time
            
            return {
                'status': 'healthy',
                'response_time': duration,
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    @staticmethod
    def get_system_health() -> Dict[str, Any]:
        """Get comprehensive system health status"""
        return {
            'database': HealthChecker.check_database_health(),
            'redis': HealthChecker.check_redis_health(),
            'system': {
                'memory': {
                    'percent': psutil.virtual_memory().percent,
                    'available': psutil.virtual_memory().available
                },
                'cpu': {
                    'percent': psutil.cpu_percent(interval=1),
                    'count': psutil.cpu_count()
                },
                'disk': {
                    'percent': psutil.disk_usage('/').percent,
                    'free': psutil.disk_usage('/').free
                }
            },
            'timestamp': datetime.utcnow().isoformat()
        }

# Global health checker instance
health_checker = HealthChecker() 