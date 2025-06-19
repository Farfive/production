"""
Enhanced Security Middleware
Implements comprehensive security features for the manufacturing platform
"""

import time
import hashlib
import json
from typing import Dict, List, Optional, Tuple
from collections import defaultdict, deque
from datetime import datetime, timedelta
from fastapi import Request, Response, HTTPException, status
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

class SecurityHeaders:
    """Security headers for enhanced protection"""
    
    @staticmethod
    def get_security_headers() -> Dict[str, str]:
        """Get comprehensive security headers"""
        return {
            # Prevent XSS attacks
            "X-XSS-Protection": "1; mode=block",
            
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            
            # Strict Transport Security (HTTPS only)
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            
            # Content Security Policy
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https:; "
                "connect-src 'self' https://api.stripe.com; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            ),
            
            # Referrer Policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Permissions Policy
            "Permissions-Policy": (
                "geolocation=(), "
                "microphone=(), "
                "camera=(), "
                "payment=(), "
                "usb=(), "
                "magnetometer=(), "
                "gyroscope=(), "
                "speaker=()"
            ),
            
            # Cross-Origin policies
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Resource-Policy": "same-origin"
        }


class RateLimiter:
    """Advanced rate limiting with sliding window"""
    
    def __init__(self):
        self.requests: Dict[str, deque] = defaultdict(deque)
        self.blocked_ips: Dict[str, datetime] = {}
        
        # Rate limiting rules
        self.rules = {
            "auth": {"requests": 5, "window": 60, "block_duration": 300},  # 5 req/min, block 5min
            "api": {"requests": 100, "window": 60, "block_duration": 60},   # 100 req/min, block 1min
            "public": {"requests": 1000, "window": 3600, "block_duration": 300}  # 1000 req/hour, block 5min
        }
    
    def get_client_id(self, request: Request) -> str:
        """Get client identifier for rate limiting"""
        # Try to get real IP from headers (for reverse proxy setups)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        return request.client.host if request.client else "unknown"
    
    def get_rate_limit_category(self, path: str) -> str:
        """Determine rate limit category based on path"""
        if path.startswith("/api/v1/auth/"):
            return "auth"
        elif path.startswith("/api/"):
            return "api"
        else:
            return "public"
    
    def is_allowed(self, request: Request) -> Tuple[bool, Optional[Dict]]:
        """Check if request is allowed under rate limits"""
        client_id = self.get_client_id(request)
        path = request.url.path
        category = self.get_rate_limit_category(path)
        
        # Check if IP is currently blocked
        if client_id in self.blocked_ips:
            if datetime.now() < self.blocked_ips[client_id]:
                remaining_time = int((self.blocked_ips[client_id] - datetime.now()).total_seconds())
                return False, {
                    "error": "Rate limit exceeded",
                    "retry_after": remaining_time,
                    "category": category
                }
            else:
                # Unblock IP
                del self.blocked_ips[client_id]
        
        # Get rate limit rule
        rule = self.rules[category]
        now = datetime.now()
        window_start = now - timedelta(seconds=rule["window"])
        
        # Clean old requests
        client_requests = self.requests[f"{client_id}:{category}"]
        while client_requests and client_requests[0] < window_start:
            client_requests.popleft()
        
        # Check if limit exceeded
        if len(client_requests) >= rule["requests"]:
            # Block IP
            block_until = now + timedelta(seconds=rule["block_duration"])
            self.blocked_ips[client_id] = block_until
            
            logger.warning(f"Rate limit exceeded for {client_id} on {category} endpoints")
            
            return False, {
                "error": "Rate limit exceeded",
                "retry_after": rule["block_duration"],
                "category": category
            }
        
        # Add current request
        client_requests.append(now)
        
        # Return rate limit headers info
        remaining = rule["requests"] - len(client_requests)
        reset_time = int((window_start + timedelta(seconds=rule["window"])).timestamp())
        
        return True, {
            "limit": rule["requests"],
            "remaining": remaining,
            "reset": reset_time,
            "category": category
        }


class InputValidator:
    """Input validation and sanitization"""
    
    @staticmethod
    def detect_sql_injection(value: str) -> bool:
        """Detect potential SQL injection attempts"""
        sql_patterns = [
            "union", "select", "insert", "update", "delete", "drop", "create",
            "alter", "exec", "execute", "sp_", "xp_", "--", "/*", "*/",
            "char(", "nchar(", "varchar(", "nvarchar(", "ascii(", "substring(",
            "cast(", "convert(", "declare", "cursor", "fetch", "open"
        ]
        
        value_lower = value.lower()
        return any(pattern in value_lower for pattern in sql_patterns)
    
    @staticmethod
    def detect_xss(value: str) -> bool:
        """Detect potential XSS attempts"""
        xss_patterns = [
            "<script", "</script>", "javascript:", "vbscript:", "onload=",
            "onerror=", "onclick=", "onmouseover=", "onfocus=", "onblur=",
            "onchange=", "onsubmit=", "onreset=", "onselect=", "onunload=",
            "eval(", "expression(", "url(", "import(", "document.cookie",
            "document.write", "window.location", "document.location"
        ]
        
        value_lower = value.lower()
        return any(pattern in value_lower for pattern in xss_patterns)
    
    @staticmethod
    def validate_request_data(data: dict) -> List[str]:
        """Validate request data for security issues"""
        issues = []
        
        def check_value(key: str, value):
            if isinstance(value, str):
                if InputValidator.detect_sql_injection(value):
                    issues.append(f"Potential SQL injection in field: {key}")
                
                if InputValidator.detect_xss(value):
                    issues.append(f"Potential XSS in field: {key}")
                
                # Check for excessively long strings (potential DoS)
                if len(value) > 10000:
                    issues.append(f"Field too long: {key}")
            
            elif isinstance(value, dict):
                for sub_key, sub_value in value.items():
                    check_value(f"{key}.{sub_key}", sub_value)
            
            elif isinstance(value, list):
                for i, item in enumerate(value):
                    check_value(f"{key}[{i}]", item)
        
        for key, value in data.items():
            check_value(key, value)
        
        return issues


class SecurityMiddleware(BaseHTTPMiddleware):
    """Comprehensive security middleware"""
    
    def __init__(self, app, enable_rate_limiting: bool = True):
        super().__init__(app)
        self.rate_limiter = RateLimiter() if enable_rate_limiting else None
        self.security_headers = SecurityHeaders()
        self.input_validator = InputValidator()
        
        # Security event logging
        self.security_events = deque(maxlen=1000)
    
    def log_security_event(self, event_type: str, client_ip: str, details: dict):
        """Log security events for monitoring"""
        event = {
            "timestamp": datetime.now().isoformat(),
            "type": event_type,
            "client_ip": client_ip,
            "details": details
        }
        self.security_events.append(event)
        logger.warning(f"Security event: {event_type} from {client_ip} - {details}")
    
    async def dispatch(self, request: Request, call_next):
        """Process request through security middleware"""
        start_time = time.time()
        client_ip = self.rate_limiter.get_client_id(request) if self.rate_limiter else "unknown"
        
        try:
            # 1. Rate limiting check
            if self.rate_limiter:
                is_allowed, rate_info = self.rate_limiter.is_allowed(request)
                if not is_allowed:
                    self.log_security_event("rate_limit_exceeded", client_ip, rate_info)
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={
                            "detail": rate_info["error"],
                            "retry_after": rate_info["retry_after"]
                        },
                        headers={
                            "Retry-After": str(rate_info["retry_after"]),
                            "X-RateLimit-Limit": str(rate_info.get("limit", 0)),
                            "X-RateLimit-Remaining": str(rate_info.get("remaining", 0)),
                            "X-RateLimit-Reset": str(rate_info.get("reset", 0))
                        }
                    )
            
            # 2. Input validation for POST/PUT requests
            if request.method in ["POST", "PUT", "PATCH"]:
                try:
                    # Only validate JSON content
                    content_type = request.headers.get("content-type", "")
                    if "application/json" in content_type:
                        body = await request.body()
                        if body:
                            try:
                                data = json.loads(body)
                                validation_issues = self.input_validator.validate_request_data(data)
                                
                                if validation_issues:
                                    self.log_security_event("input_validation_failed", client_ip, {
                                        "issues": validation_issues,
                                        "path": request.url.path
                                    })
                                    return JSONResponse(
                                        status_code=status.HTTP_400_BAD_REQUEST,
                                        content={"detail": "Invalid input detected"}
                                    )
                            except json.JSONDecodeError:
                                # Invalid JSON - let the application handle it
                                pass
                except Exception as e:
                    # Don't block request if validation fails
                    logger.error(f"Input validation error: {e}")
            
            # 3. Process request
            response = await call_next(request)
            
            # 4. Add security headers
            for header, value in self.security_headers.get_security_headers().items():
                response.headers[header] = value
            
            # 5. Add rate limit headers if available
            if self.rate_limiter and rate_info:
                response.headers["X-RateLimit-Limit"] = str(rate_info.get("limit", 0))
                response.headers["X-RateLimit-Remaining"] = str(rate_info.get("remaining", 0))
                response.headers["X-RateLimit-Reset"] = str(rate_info.get("reset", 0))
            
            # 6. Log slow requests
            process_time = time.time() - start_time
            if process_time > 2.0:  # Log requests taking more than 2 seconds
                logger.warning(f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s")
            
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            self.log_security_event("middleware_error", client_ip, {
                "error": str(e),
                "path": request.url.path
            })
            logger.error(f"Security middleware error: {e}")
            
            # Return a generic error response
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal server error"}
            )


# Utility functions for security monitoring
def get_security_events(limit: int = 100) -> List[dict]:
    """Get recent security events for monitoring"""
    # This would typically be stored in a database or external logging system
    return []

def get_rate_limit_stats() -> Dict[str, int]:
    """Get rate limiting statistics"""
    return {
        "total_requests": 0,
        "blocked_requests": 0,
        "active_blocks": 0
    } 