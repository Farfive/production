"""
Performance Monitoring System
Production outsourcing platform performance tracking
"""

import time
import psutil
import logging
from typing import Dict, Any, Optional
from functools import wraps
from datetime import datetime
from prometheus_client import Counter, Histogram, Gauge

# Prometheus metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

http_request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

db_query_duration = Histogram(
    'db_query_duration_seconds',
    'Database query duration',
    ['operation', 'table']
)

system_cpu_usage = Gauge(
    'system_cpu_usage_percent',
    'System CPU usage percentage'
)

system_memory_usage = Gauge(
    'system_memory_usage_bytes',
    'System memory usage in bytes'
)

class PerformanceTracker:
    def __init__(self):
        self.logger = logging.getLogger('performance')
        
    def track_request(self, method: str, endpoint: str, duration: float, status_code: int):
        """Track HTTP request performance"""
        http_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status_code=str(status_code)
        ).inc()
        
        http_request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)
        
        if duration > 2.0:  # Log slow requests
            self.logger.warning(
                f"Slow request: {method} {endpoint} took {duration:.2f}s"
            )
    
    def track_db_query(self, operation: str, table: str, duration: float):
        """Track database query performance"""
        db_query_duration.labels(
            operation=operation,
            table=table
        ).observe(duration)
        
        if duration > 1.0:  # Log slow queries
            self.logger.warning(
                f"Slow query: {operation} on {table} took {duration:.2f}s"
            )
    
    def update_system_metrics(self):
        """Update system metrics"""
        system_cpu_usage.set(psutil.cpu_percent())
        system_memory_usage.set(psutil.virtual_memory().used)

def track_performance(func_name: str):
    """Decorator to track function performance"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                if duration > 1.0:
                    logging.getLogger('performance').info(
                        f"Function {func_name} took {duration:.2f}s"
                    )
        return wrapper
    return decorator

# Global performance tracker
performance_tracker = PerformanceTracker() 