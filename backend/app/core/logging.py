"""
Production Logging Configuration
Enhanced logging setup for beauty platform with structured logging,
performance tracking, and security monitoring.
"""

import logging
import logging.handlers
import sys
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path
import traceback
import structlog
from loguru import logger as loguru_logger
from pythonjsonlogger import jsonlogger

from .config import get_settings

settings = get_settings()

class BeautyPlatformFormatter(logging.Formatter):
    """Custom formatter for beauty platform logs with context enrichment"""
    
    def format(self, record):
        # Add custom fields
        record.service = "beauty-platform"
        record.environment = settings.ENVIRONMENT
        record.version = "1.0.0"
        
        # Add request context if available
        if hasattr(record, 'request_id'):
            record.request_id = getattr(record, 'request_id', 'N/A')
        
        # Add user context if available
        if hasattr(record, 'user_id'):
            record.user_id = getattr(record, 'user_id', 'anonymous')
            
        return super().format(record)

class SecurityLogFormatter(logging.Formatter):
    """Special formatter for security events"""
    
    def format(self, record):
        # Security-specific fields
        record.event_type = getattr(record, 'event_type', 'security')
        record.ip_address = getattr(record, 'ip_address', 'unknown')
        record.user_agent = getattr(record, 'user_agent', 'unknown')
        record.severity = getattr(record, 'severity', 'medium')
        
        return super().format(record)

class PerformanceLogger:
    """Performance monitoring logger"""
    
    def __init__(self):
        self.logger = logging.getLogger('performance')
        
    def log_endpoint_performance(self, endpoint: str, method: str, 
                                duration: float, status_code: int, 
                                user_id: Optional[str] = None):
        """Log API endpoint performance"""
        self.logger.info(
            "API endpoint performance",
            extra={
                'event_type': 'performance',
                'endpoint': endpoint,
                'method': method,
                'duration_ms': round(duration * 1000, 2),
                'status_code': status_code,
                'user_id': user_id,
                'slow_query': duration > 2.0  # Flag slow queries
            }
        )
        
    def log_database_performance(self, query_type: str, table: str, 
                               duration: float, record_count: int = 0):
        """Log database query performance"""
        self.logger.info(
            "Database query performance",
            extra={
                'event_type': 'db_performance',
                'query_type': query_type,
                'table': table,
                'duration_ms': round(duration * 1000, 2),
                'record_count': record_count,
                'slow_query': duration > 1.0
            }
        )

class SecurityLogger:
    """Security event logger"""
    
    def __init__(self):
        self.logger = logging.getLogger('security')
        
    def log_auth_event(self, event_type: str, user_id: Optional[str], 
                      ip_address: str, user_agent: str, 
                      success: bool = True, details: Optional[Dict] = None):
        """Log authentication events"""
        self.logger.warning if not success else self.logger.info(
            f"Authentication event: {event_type}",
            extra={
                'event_type': 'auth',
                'auth_event': event_type,
                'user_id': user_id,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'success': success,
                'severity': 'high' if not success else 'low',
                'details': details or {}
            }
        )
        
    def log_access_violation(self, user_id: str, resource: str, 
                           action: str, ip_address: str):
        """Log unauthorized access attempts"""
        self.logger.error(
            "Unauthorized access attempt",
            extra={
                'event_type': 'access_violation',
                'user_id': user_id,
                'resource': resource,
                'action': action,
                'ip_address': ip_address,
                'severity': 'critical'
            }
        )
        
    def log_payment_event(self, event_type: str, user_id: str, 
                         amount: float, currency: str, 
                         payment_method: str, success: bool = True):
        """Log payment-related events"""
        self.logger.info(
            f"Payment event: {event_type}",
            extra={
                'event_type': 'payment',
                'payment_event': event_type,
                'user_id': user_id,
                'amount': amount,
                'currency': currency,
                'payment_method': payment_method,
                'success': success,
                'severity': 'medium'
            }
        )

class BusinessLogger:
    """Business metrics and events logger"""
    
    def __init__(self):
        self.logger = logging.getLogger('business')
        
    def log_booking_event(self, event_type: str, booking_id: str, 
                         client_id: str, provider_id: str, 
                         service_type: str, amount: float):
        """Log booking-related business events"""
        self.logger.info(
            f"Booking event: {event_type}",
            extra={
                'event_type': 'booking',
                'booking_event': event_type,
                'booking_id': booking_id,
                'client_id': client_id,
                'provider_id': provider_id,
                'service_type': service_type,
                'amount': amount
            }
        )
        
    def log_loyalty_event(self, event_type: str, user_id: str, 
                         points: int, reason: str):
        """Log loyalty points events"""
        self.logger.info(
            f"Loyalty event: {event_type}",
            extra={
                'event_type': 'loyalty',
                'loyalty_event': event_type,
                'user_id': user_id,
                'points': points,
                'reason': reason
            }
        )

class BeautyPlatformLogger:
    def __init__(self):
        self.setup_logging()
        
    def setup_logging(self):
        """Configure production logging"""
        # Create logs directory
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        # Configure formatters
        json_formatter = logging.Formatter(
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s", "service": "beauty-platform"}'
        )
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.INFO)
        
        # Application log handler
        app_handler = logging.handlers.RotatingFileHandler(
            log_dir / "app.log",
            maxBytes=50*1024*1024,  # 50MB
            backupCount=10
        )
        app_handler.setFormatter(json_formatter)
        root_logger.addHandler(app_handler)
        
        # Error log handler
        error_handler = logging.handlers.RotatingFileHandler(
            log_dir / "errors.log",
            maxBytes=50*1024*1024,
            backupCount=10
        )
        error_handler.setFormatter(json_formatter)
        error_handler.setLevel(logging.ERROR)
        root_logger.addHandler(error_handler)

# Initialize logging
beauty_logger = BeautyPlatformLogger()

def setup_logging():
    """Configure production logging with multiple handlers and formatters"""
    
    # Create logs directory
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # JSON formatter for structured logging
    json_formatter = jsonlogger.JsonFormatter(
        '%(asctime)s %(name)s %(levelname)s %(message)s %(service)s %(environment)s %(version)s'
    )
    
    # Security formatter
    security_formatter = SecurityLogFormatter(
        '%(asctime)s [SECURITY] %(levelname)s - %(message)s [Event: %(event_type)s, IP: %(ip_address)s, Severity: %(severity)s]'
    )
    
    # Performance formatter
    performance_formatter = BeautyPlatformFormatter(
        '%(asctime)s [PERFORMANCE] %(message)s [Duration: %(duration_ms)sms, Endpoint: %(endpoint)s]'
    )
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO if settings.ENVIRONMENT == 'production' else logging.DEBUG)
    
    # Console handler with colored output for development
    if settings.ENVIRONMENT != 'production':
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(BeautyPlatformFormatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        root_logger.addHandler(console_handler)
    
    # Application log file handler
    app_handler = logging.handlers.RotatingFileHandler(
        log_dir / "app.log",
        maxBytes=50*1024*1024,  # 50MB
        backupCount=10
    )
    app_handler.setFormatter(json_formatter)
    app_handler.setLevel(logging.INFO)
    root_logger.addHandler(app_handler)
    
    # Error log file handler
    error_handler = logging.handlers.RotatingFileHandler(
        log_dir / "errors.log",
        maxBytes=50*1024*1024,  # 50MB
        backupCount=10
    )
    error_handler.setFormatter(json_formatter)
    error_handler.setLevel(logging.ERROR)
    root_logger.addHandler(error_handler)
    
    # Security log handler
    security_logger = logging.getLogger('security')
    security_handler = logging.handlers.RotatingFileHandler(
        log_dir / "security.log",
        maxBytes=50*1024*1024,  # 50MB
        backupCount=20  # Keep more security logs
    )
    security_handler.setFormatter(security_formatter)
    security_logger.addHandler(security_handler)
    security_logger.setLevel(logging.INFO)
    
    # Performance log handler
    performance_logger = logging.getLogger('performance')
    performance_handler = logging.handlers.RotatingFileHandler(
        log_dir / "performance.log",
        maxBytes=50*1024*1024,  # 50MB
        backupCount=10
    )
    performance_handler.setFormatter(performance_formatter)
    performance_logger.addHandler(performance_handler)
    performance_logger.setLevel(logging.INFO)
    
    # Business metrics log handler
    business_logger = logging.getLogger('business')
    business_handler = logging.handlers.RotatingFileHandler(
        log_dir / "business.log",
        maxBytes=50*1024*1024,  # 50MB
        backupCount=15
    )
    business_handler.setFormatter(json_formatter)
    business_logger.addHandler(business_handler)
    business_logger.setLevel(logging.INFO)
    
    # Audit log handler (compliance)
    audit_logger = logging.getLogger('audit')
    audit_handler = logging.handlers.RotatingFileHandler(
        log_dir / "audit.log",
        maxBytes=50*1024*1024,  # 50MB
        backupCount=30  # Keep audit logs longer
    )
    audit_handler.setFormatter(json_formatter)
    audit_logger.addHandler(audit_handler)
    audit_logger.setLevel(logging.INFO)
    
    # Silence noisy third-party loggers
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('requests').setLevel(logging.WARNING)
    logging.getLogger('stripe').setLevel(logging.WARNING)
    logging.getLogger('watchfiles').setLevel(logging.WARNING)  # Silence watchfiles debug logs
    logging.getLogger('watchfiles.main').setLevel(logging.WARNING)  # Silence watchfiles main logger
    
    return {
        'performance': PerformanceLogger(),
        'security': SecurityLogger(),
        'business': BusinessLogger()
    }

# Global logger instances
loggers = setup_logging()
performance_logger = loggers['performance']
security_logger = loggers['security']
business_logger = loggers['business']

# Audit logger for compliance
audit_logger = logging.getLogger('audit')

def log_audit_event(event_type: str, user_id: str, action: str, 
                   resource: str, details: Optional[Dict] = None):
    """Log audit events for compliance"""
    audit_logger.info(
        f"Audit event: {event_type}",
        extra={
            'event_type': 'audit',
            'audit_event': event_type,
            'user_id': user_id,
            'action': action,
            'resource': resource,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details or {}
        }
    )

def log_gdpr_event(event_type: str, user_id: str, data_type: str, 
                   action: str, legal_basis: str):
    """Log GDPR-related events"""
    audit_logger.info(
        f"GDPR event: {event_type}",
        extra={
            'event_type': 'gdpr',
            'gdpr_event': event_type,
            'user_id': user_id,
            'data_type': data_type,
            'action': action,
            'legal_basis': legal_basis,
            'timestamp': datetime.utcnow().isoformat()
        }
    )

# Context manager for request logging
class RequestLoggingContext:
    """Context manager for request-specific logging"""
    
    def __init__(self, request_id: str, user_id: Optional[str] = None):
        self.request_id = request_id
        self.user_id = user_id
        self.start_time = datetime.utcnow()
        
    def __enter__(self):
        # Add context to all loggers
        for logger_name in ['performance', 'security', 'business', 'audit']:
            logger = logging.getLogger(logger_name)
            logger = logging.LoggerAdapter(logger, {
                'request_id': self.request_id,
                'user_id': self.user_id
            })
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.utcnow() - self.start_time).total_seconds()
        if exc_type:
            logging.getLogger().error(
                f"Request failed: {exc_type.__name__}",
                extra={
                    'request_id': self.request_id,
                    'user_id': self.user_id,
                    'duration': duration,
                    'error': str(exc_val),
                    'traceback': traceback.format_exc()
                }
            )

def log_api_call(endpoint: str, user_id: Optional[str] = None, 
                method: str = "GET", details: Optional[Dict] = None):
    """Log API call for monitoring and audit purposes"""
    logger = logging.getLogger('audit')
    logger.info(
        f"API call: {method} {endpoint}",
        extra={
            'event_type': 'api_call',
            'endpoint': endpoint,
            'method': method,
            'user_id': user_id or 'anonymous',
            'timestamp': datetime.utcnow().isoformat(),
            'details': details or {}
        }
    )