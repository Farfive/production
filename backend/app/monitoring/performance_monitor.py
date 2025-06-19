"""
Production Performance Monitoring System

Monitors API response times, database query performance, and ML model performance
for production deployment.
"""

import time
import logging
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from functools import wraps
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class PerformanceMetrics:
    """Performance metrics storage and analysis"""
    
    def __init__(self):
        self.api_metrics: List[Dict[str, Any]] = []
        self.db_metrics: List[Dict[str, Any]] = []
        self.ml_metrics: List[Dict[str, Any]] = []
        self.error_metrics: List[Dict[str, Any]] = []
        
    def record_api_call(self, endpoint: str, method: str, duration: float, status_code: int):
        """Record API call metrics"""
        metric = {
            'timestamp': datetime.now(),
            'endpoint': endpoint,
            'method': method,
            'duration': duration,
            'status_code': status_code,
            'exceeded_budget': duration > settings.API_RESPONSE_TIME_BUDGET
        }
        self.api_metrics.append(metric)
        
        # Log if exceeds performance budget
        if metric['exceeded_budget']:
            logger.warning(
                f"API performance budget exceeded: {endpoint} took {duration:.3f}s "
                f"(budget: {settings.API_RESPONSE_TIME_BUDGET}s)"
            )
    
    def record_db_query(self, query_type: str, duration: float, rows_affected: int = 0):
        """Record database query metrics"""
        metric = {
            'timestamp': datetime.now(),
            'query_type': query_type,
            'duration': duration,
            'rows_affected': rows_affected,
            'exceeded_budget': duration > settings.DB_QUERY_TIME_BUDGET
        }
        self.db_metrics.append(metric)
        
        # Log slow queries
        if metric['exceeded_budget']:
            logger.warning(
                f"Slow database query detected: {query_type} took {duration:.3f}s "
                f"(budget: {settings.DB_QUERY_TIME_BUDGET}s)"
            )
    
    def record_ml_prediction(self, model_type: str, duration: float, success: bool):
        """Record ML model performance metrics"""
        metric = {
            'timestamp': datetime.now(),
            'model_type': model_type,
            'duration': duration,
            'success': success,
            'fallback_used': not success
        }
        self.ml_metrics.append(metric)
        
        # Log ML performance issues
        if not success:
            logger.warning(f"ML model fallback used for {model_type}")
        elif duration > 1.0:  # ML predictions should be fast
            logger.warning(f"Slow ML prediction: {model_type} took {duration:.3f}s")
    
    def record_error(self, error_type: str, endpoint: str, details: str):
        """Record error metrics"""
        metric = {
            'timestamp': datetime.now(),
            'error_type': error_type,
            'endpoint': endpoint,
            'details': details
        }
        self.error_metrics.append(metric)
        logger.error(f"Error recorded: {error_type} in {endpoint} - {details}")
    
    def get_performance_summary(self, hours_back: int = 1) -> Dict[str, Any]:
        """Get performance summary for the specified time period"""
        cutoff = datetime.now() - timedelta(hours=hours_back)
        
        # Filter recent metrics
        recent_api = [m for m in self.api_metrics if m['timestamp'] > cutoff]
        recent_db = [m for m in self.db_metrics if m['timestamp'] > cutoff]
        recent_ml = [m for m in self.ml_metrics if m['timestamp'] > cutoff]
        recent_errors = [m for m in self.error_metrics if m['timestamp'] > cutoff]
        
        # Calculate API performance
        api_summary = {}
        if recent_api:
            api_durations = [m['duration'] for m in recent_api]
            api_summary = {
                'total_requests': len(recent_api),
                'avg_response_time': sum(api_durations) / len(api_durations),
                'max_response_time': max(api_durations),
                'budget_violations': len([m for m in recent_api if m['exceeded_budget']]),
                'error_rate': len([m for m in recent_api if m['status_code'] >= 400]) / len(recent_api)
            }
        
        # Calculate DB performance
        db_summary = {}
        if recent_db:
            db_durations = [m['duration'] for m in recent_db]
            db_summary = {
                'total_queries': len(recent_db),
                'avg_query_time': sum(db_durations) / len(db_durations),
                'max_query_time': max(db_durations),
                'slow_queries': len([m for m in recent_db if m['exceeded_budget']])
            }
        
        # Calculate ML performance
        ml_summary = {}
        if recent_ml:
            ml_durations = [m['duration'] for m in recent_ml]
            ml_summary = {
                'total_predictions': len(recent_ml),
                'avg_prediction_time': sum(ml_durations) / len(ml_durations),
                'success_rate': len([m for m in recent_ml if m['success']]) / len(recent_ml),
                'fallback_rate': len([m for m in recent_ml if m['fallback_used']]) / len(recent_ml)
            }
        
        return {
            'period_hours': hours_back,
            'timestamp': datetime.now().isoformat(),
            'api_performance': api_summary,
            'database_performance': db_summary,
            'ml_performance': ml_summary,
            'total_errors': len(recent_errors),
            'status': self._calculate_overall_status(api_summary, db_summary, ml_summary, len(recent_errors))
        }
    
    def _calculate_overall_status(self, api_summary: Dict, db_summary: Dict, ml_summary: Dict, error_count: int) -> str:
        """Calculate overall system status"""
        issues = []
        
        # Check API performance
        if api_summary and api_summary.get('error_rate', 0) > 0.05:  # >5% error rate
            issues.append("High API error rate")
        if api_summary and api_summary.get('budget_violations', 0) > 0:
            issues.append("API performance budget violations")
        
        # Check DB performance
        if db_summary and db_summary.get('slow_queries', 0) > 0:
            issues.append("Slow database queries detected")
        
        # Check ML performance
        if ml_summary and ml_summary.get('fallback_rate', 0) > 0.1:  # >10% fallback rate
            issues.append("High ML model fallback rate")
        
        # Check error count
        if error_count > 10:  # More than 10 errors in period
            issues.append("High error count")
        
        if not issues:
            return "HEALTHY"
        elif len(issues) <= 2:
            return "WARNING"
        else:
            return "CRITICAL"

# Global performance metrics instance
performance_metrics = PerformanceMetrics()

def monitor_api_performance(func):
    """Decorator to monitor API endpoint performance"""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.time()
        status_code = 200
        endpoint = getattr(func, '__name__', 'unknown')
        
        try:
            result = await func(*args, **kwargs)
            return result
        except Exception as e:
            status_code = 500
            performance_metrics.record_error("API_ERROR", endpoint, str(e))
            raise
        finally:
            duration = time.time() - start_time
            performance_metrics.record_api_call(endpoint, 'API', duration, status_code)
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = time.time()
        status_code = 200
        endpoint = getattr(func, '__name__', 'unknown')
        
        try:
            result = func(*args, **kwargs)
            return result
        except Exception as e:
            status_code = 500
            performance_metrics.record_error("API_ERROR", endpoint, str(e))
            raise
        finally:
            duration = time.time() - start_time
            performance_metrics.record_api_call(endpoint, 'API', duration, status_code)
    
    return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

@asynccontextmanager
async def monitor_db_query(query_type: str):
    """Context manager to monitor database query performance"""
    start_time = time.time()
    rows_affected = 0
    
    try:
        yield
    except Exception as e:
        performance_metrics.record_error("DB_ERROR", query_type, str(e))
        raise
    finally:
        duration = time.time() - start_time
        performance_metrics.record_db_query(query_type, duration, rows_affected)

def monitor_ml_performance(model_type: str):
    """Decorator to monitor ML model performance"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                performance_metrics.record_error("ML_ERROR", model_type, str(e))
                raise
            finally:
                duration = time.time() - start_time
                performance_metrics.record_ml_prediction(model_type, duration, success)
        
        return wrapper
    return decorator

class SystemHealthChecker:
    """Comprehensive system health monitoring"""
    
    def __init__(self):
        self.checks = [
            ("Database Connection", self._check_database),
            ("Redis Connection", self._check_redis),
            ("ML Models", self._check_ml_models),
            ("API Performance", self._check_api_performance),
            ("Disk Space", self._check_disk_space),
            ("Memory Usage", self._check_memory_usage)
        ]
    
    async def run_health_checks(self) -> Dict[str, Any]:
        """Run all health checks and return results"""
        results = {
            'timestamp': datetime.now().isoformat(),
            'overall_status': 'HEALTHY',
            'checks': {}
        }
        
        critical_failures = 0
        warnings = 0
        
        for check_name, check_func in self.checks:
            try:
                check_result = await check_func() if asyncio.iscoroutinefunction(check_func) else check_func()
                results['checks'][check_name] = check_result
                
                if check_result['status'] == 'CRITICAL':
                    critical_failures += 1
                elif check_result['status'] == 'WARNING':
                    warnings += 1
                    
            except Exception as e:
                results['checks'][check_name] = {
                    'status': 'CRITICAL',
                    'message': f"Health check failed: {str(e)}",
                    'details': {}
                }
                critical_failures += 1
        
        # Determine overall status
        if critical_failures > 0:
            results['overall_status'] = 'CRITICAL'
        elif warnings > 2:
            results['overall_status'] = 'WARNING'
        
        return results
    
    def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity and performance"""
        try:
            from ..database import SessionLocal
            
            start_time = time.time()
            with SessionLocal() as db:
                db.execute(text("SELECT 1"))
            duration = time.time() - start_time
            
            if duration > 1.0:
                return {
                    'status': 'WARNING',
                    'message': f'Slow database response: {duration:.3f}s',
                    'details': {'response_time': duration}
                }
            else:
                return {
                    'status': 'HEALTHY',
                    'message': 'Database connection healthy',
                    'details': {'response_time': duration}
                }
        except Exception as e:
            return {
                'status': 'CRITICAL',
                'message': f'Database connection failed: {str(e)}',
                'details': {}
            }
    
    def _check_redis(self) -> Dict[str, Any]:
        """Check Redis connectivity"""
        try:
            import redis
            
            r = redis.from_url(settings.REDIS_URL)
            start_time = time.time()
            r.ping()
            duration = time.time() - start_time
            
            return {
                'status': 'HEALTHY',
                'message': 'Redis connection healthy',
                'details': {'response_time': duration}
            }
        except Exception as e:
            return {
                'status': 'WARNING',  # Redis is not critical for core functionality
                'message': f'Redis connection failed: {str(e)}',
                'details': {}
            }
    
    def _check_ml_models(self) -> Dict[str, Any]:
        """Check ML model availability"""
        try:
            from ..services.smart_matching_engine import smart_matching_engine
            
            models_available = {
                'success_predictor': smart_matching_engine.success_predictor is not None,
                'cost_predictor': smart_matching_engine.cost_predictor is not None,
                'delivery_predictor': smart_matching_engine.delivery_predictor is not None
            }
            
            available_count = sum(models_available.values())
            
            if available_count == 3:
                status = 'HEALTHY'
                message = 'All ML models loaded'
            elif available_count > 0:
                status = 'WARNING'
                message = f'Only {available_count}/3 ML models loaded'
            else:
                status = 'WARNING'  # Fallback available
                message = 'No ML models loaded, using fallback algorithms'
            
            return {
                'status': status,
                'message': message,
                'details': models_available
            }
        except Exception as e:
            return {
                'status': 'WARNING',
                'message': f'ML model check failed: {str(e)}',
                'details': {}
            }
    
    def _check_api_performance(self) -> Dict[str, Any]:
        """Check recent API performance"""
        summary = performance_metrics.get_performance_summary(hours_back=1)
        api_perf = summary.get('api_performance', {})
        
        if not api_perf:
            return {
                'status': 'HEALTHY',
                'message': 'No recent API activity',
                'details': {}
            }
        
        error_rate = api_perf.get('error_rate', 0)
        budget_violations = api_perf.get('budget_violations', 0)
        
        if error_rate > 0.1:  # >10% error rate
            status = 'CRITICAL'
            message = f'High API error rate: {error_rate:.1%}'
        elif budget_violations > 0:
            status = 'WARNING'
            message = f'{budget_violations} API performance budget violations'
        else:
            status = 'HEALTHY'
            message = 'API performance within acceptable limits'
        
        return {
            'status': status,
            'message': message,
            'details': api_perf
        }
    
    def _check_disk_space(self) -> Dict[str, Any]:
        """Check available disk space"""
        try:
            import shutil
            
            total, used, free = shutil.disk_usage("/")
            free_percent = free / total * 100
            
            if free_percent < 10:
                status = 'CRITICAL'
                message = f'Low disk space: {free_percent:.1f}% free'
            elif free_percent < 20:
                status = 'WARNING'
                message = f'Disk space getting low: {free_percent:.1f}% free'
            else:
                status = 'HEALTHY'
                message = f'Disk space OK: {free_percent:.1f}% free'
            
            return {
                'status': status,
                'message': message,
                'details': {
                    'total_gb': total / (1024**3),
                    'used_gb': used / (1024**3),
                    'free_gb': free / (1024**3),
                    'free_percent': free_percent
                }
            }
        except Exception as e:
            return {
                'status': 'WARNING',
                'message': f'Disk space check failed: {str(e)}',
                'details': {}
            }
    
    def _check_memory_usage(self) -> Dict[str, Any]:
        """Check memory usage"""
        try:
            import psutil
            
            memory = psutil.virtual_memory()
            used_percent = memory.percent
            
            if used_percent > 90:
                status = 'CRITICAL'
                message = f'High memory usage: {used_percent:.1f}%'
            elif used_percent > 80:
                status = 'WARNING'
                message = f'Elevated memory usage: {used_percent:.1f}%'
            else:
                status = 'HEALTHY'
                message = f'Memory usage OK: {used_percent:.1f}%'
            
            return {
                'status': status,
                'message': message,
                'details': {
                    'total_gb': memory.total / (1024**3),
                    'used_gb': memory.used / (1024**3),
                    'available_gb': memory.available / (1024**3),
                    'used_percent': used_percent
                }
            }
        except Exception as e:
            return {
                'status': 'WARNING',
                'message': f'Memory check failed: {str(e)}',
                'details': {}
            }

# Global health checker instance
health_checker = SystemHealthChecker() 