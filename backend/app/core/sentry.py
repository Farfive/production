"""
Sentry Error Tracking Configuration
Enhanced error tracking for production outsourcing platform
"""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration
import logging
from typing import Dict, Any, Optional
import os

from .config import get_settings

settings = get_settings()

class ProductionOutsourcingFilter:
    """Custom Sentry filter for production outsourcing platform"""
    
    def __init__(self):
        self.sensitive_fields = {
            'password', 'token', 'secret', 'api_key', 'private_key',
            'credit_card', 'ssn', 'bank_account', 'stripe_key'
        }
    
    def __call__(self, event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Filter and sanitize events before sending to Sentry"""
        
        # Skip certain non-critical errors
        if self._should_skip_error(event):
            return None
            
        # Sanitize sensitive data
        event = self._sanitize_event(event)
        
        # Add production outsourcing context
        event = self._add_platform_context(event)
        
        return event
    
    def _should_skip_error(self, event: Dict[str, Any]) -> bool:
        """Determine if error should be skipped"""
        # Skip 404 errors for certain paths
        if event.get('request', {}).get('url', '').endswith(('.ico', '.map')):
            return True
            
        # Skip known third-party integration timeouts
        exception = event.get('exception', {}).get('values', [{}])[0]
        if exception.get('type') == 'TimeoutError':
            if 'stripe' in str(exception.get('value', '')).lower():
                return False  # Keep Stripe timeouts
            return True  # Skip other timeouts
            
        return False
    
    def _sanitize_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive information from the event"""
        # Sanitize request data
        if 'request' in event:
            event['request'] = self._sanitize_request(event['request'])
            
        # Sanitize extra data
        if 'extra' in event:
            event['extra'] = self._sanitize_dict(event['extra'])
            
        # Sanitize user data
        if 'user' in event:
            event['user'] = self._sanitize_user(event['user'])
            
        return event
    
    def _sanitize_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize request data"""
        if 'data' in request_data:
            request_data['data'] = self._sanitize_dict(request_data['data'])
        if 'headers' in request_data:
            request_data['headers'] = self._sanitize_headers(request_data['headers'])
        return request_data
    
    def _sanitize_headers(self, headers: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize HTTP headers"""
        sanitized = {}
        for key, value in headers.items():
            if any(sensitive in key.lower() for sensitive in ['authorization', 'cookie', 'token']):
                sanitized[key] = '[Filtered]'
            else:
                sanitized[key] = value
        return sanitized
    
    def _sanitize_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively sanitize dictionary data"""
        if not isinstance(data, dict):
            return data
            
        sanitized = {}
        for key, value in data.items():
            if any(sensitive in key.lower() for sensitive in self.sensitive_fields):
                sanitized[key] = '[Filtered]'
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_dict(value)
            else:
                sanitized[key] = value
        return sanitized
    
    def _sanitize_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize user data"""
        safe_fields = {'id', 'email', 'username', 'role', 'company_name'}
        return {k: v for k, v in user_data.items() if k in safe_fields}
    
    def _add_platform_context(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Add production outsourcing platform specific context"""
        event.setdefault('tags', {}).update({
            'platform': 'production-outsourcing',
            'environment': settings.ENVIRONMENT,
            'service_type': 'api'
        })
        
        event.setdefault('contexts', {}).update({
            'platform': {
                'name': 'Production Outsourcing Platform',
                'version': '1.0.0'
            }
        })
        
        return event

def before_send_transaction(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Filter performance transactions"""
    # Skip health check transactions
    if event.get('transaction') in ['/health', '/metrics', '/favicon.ico']:
        return None
        
    # Skip very fast transactions (< 100ms) unless they're critical endpoints
    duration = event.get('timestamp', 0) - event.get('start_timestamp', 0)
    if duration < 0.1:  # 100ms
        transaction_name = event.get('transaction', '')
        critical_endpoints = ['/api/v1/auth/', '/api/v1/payments/', '/api/v1/quotes/']
        if not any(critical in transaction_name for critical in critical_endpoints):
            return None
    
    return event

def configure_sentry():
    """Configure Sentry for production outsourcing platform"""
    
    if not settings.SENTRY_DSN:
        logging.warning("SENTRY_DSN not configured, skipping Sentry initialization")
        return
    
    # Logging integration
    sentry_logging = LoggingIntegration(
        level=logging.INFO,        # Capture info and above as breadcrumbs
        event_level=logging.ERROR  # Send errors and above as events
    )
    
    # Initialize Sentry
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release=f"production-outsourcing@{settings.APP_VERSION or '1.0.0'}",
        
        # Integrations
        integrations=[
            FastApiIntegration(auto_enabling_integrations=False),
            SqlalchemyIntegration(),
            RedisIntegration(),
            CeleryIntegration(),
            sentry_logging,
            HttpxIntegration(),
        ],
        
        # Performance monitoring
        traces_sample_rate=0.1 if settings.ENVIRONMENT == 'production' else 1.0,
        profiles_sample_rate=0.1 if settings.ENVIRONMENT == 'production' else 1.0,
        
        # Error sampling
        sample_rate=1.0,
        
        # Filter functions
        before_send=ProductionOutsourcingFilter(),
        before_send_transaction=before_send_transaction,
        
        # Additional options
        attach_stacktrace=True,
        send_default_pii=False,  # Don't send PII
        max_breadcrumbs=100,
        
        # Set user context
        default_integrations=False,  # We're explicitly defining integrations
    )
    
    # Set global tags
    sentry_sdk.set_tag("service", "production-outsourcing-api")
    sentry_sdk.set_tag("component", "backend")

class SentryContextManager:
    """Context manager for enhanced Sentry context"""
    
    def __init__(self, user_id: Optional[str] = None, company_id: Optional[str] = None,
                 transaction_name: Optional[str] = None):
        self.user_id = user_id
        self.company_id = company_id
        self.transaction_name = transaction_name
        self.scope = None
        
    def __enter__(self):
        self.scope = sentry_sdk.new_scope()
        self.scope.__enter__()
        
        # Set user context
        if self.user_id:
            sentry_sdk.set_user({
                "id": self.user_id,
                "company_id": self.company_id
            })
        
        # Set transaction
        if self.transaction_name:
            sentry_sdk.set_tag("transaction_type", self.transaction_name)
            
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.scope:
            self.scope.__exit__(exc_type, exc_val, exc_tb)

def capture_business_error(error_type: str, message: str, extra: Optional[Dict] = None):
    """Capture business logic errors"""
    with sentry_sdk.configure_scope() as scope:
        scope.set_tag("error_category", "business_logic")
        scope.set_tag("business_error_type", error_type)
        scope.set_context("business_context", extra or {})
        sentry_sdk.capture_message(message, level="error")

def capture_integration_error(service: str, operation: str, error: Exception, 
                            extra: Optional[Dict] = None):
    """Capture third-party integration errors"""
    with sentry_sdk.configure_scope() as scope:
        scope.set_tag("error_category", "integration")
        scope.set_tag("integration_service", service)
        scope.set_tag("integration_operation", operation)
        scope.set_context("integration_context", extra or {})
        sentry_sdk.capture_exception(error)

def capture_performance_issue(operation: str, duration: float, threshold: float,
                            details: Optional[Dict] = None):
    """Capture performance issues"""
    if duration > threshold:
        with sentry_sdk.configure_scope() as scope:
            scope.set_tag("issue_category", "performance")
            scope.set_tag("operation", operation)
            scope.set_context("performance_context", {
                "duration": duration,
                "threshold": threshold,
                "details": details or {}
            })
            sentry_sdk.capture_message(
                f"Performance issue: {operation} took {duration:.2f}s (threshold: {threshold:.2f}s)",
                level="warning"
            )

def add_breadcrumb(message: str, category: str = "custom", level: str = "info", 
                  data: Optional[Dict] = None):
    """Add custom breadcrumb"""
    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        level=level,
        data=data or {}
    )

# Initialize Sentry
configure_sentry() 