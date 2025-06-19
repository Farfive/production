"""
Advanced Security Middleware
Implements comprehensive security controls for request/response processing
"""

import time
import json
import re
import hashlib
from datetime import datetime, timedelta
from typing import Callable, Dict, List, Optional, Set, Tuple, Any
from fastapi import Request, Response, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import ipaddress
import user_agents
from urllib.parse import urlparse
import asyncio
import logging

from app.core.security import (
    SecurityConfig, SecurityModels, SecurityAuditLogger,
    RateLimiter, InputSanitizer, SecurityHeaders,
    TokenSecurity, audit_logger, rate_limiter
)

logger = logging.getLogger(__name__)

class SecurityMiddleware(BaseHTTPMiddleware):
    """Comprehensive security middleware for request processing"""
    
    def __init__(self, app, config: Optional[Dict[str, Any]] = None):
        super().__init__(app)
        self.config = config or {}
        self.audit_logger = SecurityAuditLogger()
        self.rate_limiter = RateLimiter()
        self.blocked_ips: Set[str] = set()
        self.suspicious_patterns = self._load_threat_patterns()
        
    def _load_threat_patterns(self) -> List[re.Pattern]:
        """Load threat detection patterns"""
        patterns = [
            # SQL Injection patterns
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)",
            r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
            r"('|\"|`).*(OR|AND|SELECT|INSERT|UPDATE|DELETE).*('|\"|`)",
            
            # XSS patterns
            r"<script[^>]*>.*</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>",
            
            # Command injection patterns
            r"(\||&|;|\$\(|\`)",
            r"(cat|ls|ps|whoami|id|uname|wget|curl)\s",
            
            # Path traversal patterns
            r"\.\./",
            r"\.\.\\",
            r"/etc/passwd",
            r"/proc/",
            
            # NoSQL injection patterns
            r"\$where",
            r"\$ne",
            r"\$gt",
            r"\$regex",
        ]
        
        return [re.compile(pattern, re.IGNORECASE) for pattern in patterns]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Main middleware processing"""
        start_time = time.time()
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        # Security checks
        try:
            # 1. IP blocking check
            if self._is_blocked_ip(client_ip):
                await self._log_security_event(
                    "BLOCKED_IP_ACCESS",
                    client_ip,
                    {"reason": "IP address blocked"}
                )
                return JSONResponse(
                    status_code=403,
                    content={"error": "Access denied"}
                )
            
            # 2. Rate limiting
            if self._check_rate_limit(client_ip, request):
                await self._log_security_event(
                    "RATE_LIMIT_EXCEEDED",
                    client_ip,
                    {"path": str(request.url.path), "method": request.method}
                )
                return JSONResponse(
                    status_code=429,
                    content={"error": "Rate limit exceeded"}
                )
            
            # 3. Request validation
            threat_detected = await self._validate_request(request, client_ip)
            if threat_detected:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Invalid request"}
                )
            
            # 4. Process request
            response = await call_next(request)
            
            # 5. Response security headers
            response = self._apply_security_headers(response)
            
            # 6. Log successful request
            processing_time = time.time() - start_time
            await self._log_request(request, response, client_ip, processing_time)
            
            return response
            
        except Exception as e:
            logger.error(f"Security middleware error: {str(e)}")
            await self._log_security_event(
                "MIDDLEWARE_ERROR",
                client_ip,
                {"error": str(e)}
            )
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error"}
            )
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        # Check for forwarded headers (load balancer/proxy)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP (original client)
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection
        if hasattr(request.client, 'host'):
            return request.client.host
        
        return "unknown"
    
    def _is_blocked_ip(self, ip: str) -> bool:
        """Check if IP is blocked"""
        if ip in self.blocked_ips:
            return True
        
        # Check against known malicious IP ranges
        try:
            ip_obj = ipaddress.ip_address(ip)
            
            # Block private network access from external
            if ip_obj.is_private and ip != "127.0.0.1":
                return True
                
        except ValueError:
            return True  # Invalid IP format
        
        return False
    
    def _check_rate_limit(self, ip: str, request: Request) -> bool:
        """Check rate limiting"""
        # Different limits for different endpoints
        if request.url.path.startswith("/api/v1/auth/"):
            return self.rate_limiter.is_rate_limited(ip, "login")
        elif request.url.path.startswith("/api/"):
            return self.rate_limiter.is_rate_limited(ip, "api")
        
        return False
    
    async def _validate_request(self, request: Request, client_ip: str) -> bool:
        """Validate request for security threats"""
        try:
            # Check URL for threats
            url_str = str(request.url)
            if self._check_threats_in_string(url_str):
                await self._log_security_event(
                    "THREAT_IN_URL",
                    client_ip,
                    {"url": url_str, "method": request.method}
                )
                return True
            
            # Check headers for threats
            for header_name, header_value in request.headers.items():
                if self._check_threats_in_string(header_value):
                    await self._log_security_event(
                        "THREAT_IN_HEADERS",
                        client_ip,
                        {"header": header_name, "value": header_value[:100]}
                    )
                    return True
            
            # Check request body for threats (if present)
            if request.method in ["POST", "PUT", "PATCH"]:
                try:
                    body = await request.body()
                    if body:
                        body_str = body.decode("utf-8", errors="ignore")
                        if self._check_threats_in_string(body_str):
                            await self._log_security_event(
                                "THREAT_IN_BODY",
                                client_ip,
                                {"method": request.method, "body_size": len(body)}
                            )
                            return True
                except Exception:
                    # If we can't read the body, allow the request to continue
                    pass
            
            return False
            
        except Exception as e:
            logger.error(f"Request validation error: {str(e)}")
            return False
    
    def _check_threats_in_string(self, text: str) -> bool:
        """Check if string contains threat patterns"""
        if not text:
            return False
        
        # Check against threat patterns
        for pattern in self.suspicious_patterns:
            if pattern.search(text):
                return True
        
        return False
    
    def _apply_security_headers(self, response: Response) -> Response:
        """Apply security headers to response"""
        return SecurityHeaders.apply_headers(response)
    
    async def _log_security_event(self, event_type: str, ip: str, details: Dict[str, Any]):
        """Log security event"""
        event = SecurityModels.SecurityEvent(
            event_type=event_type,
            ip_address=ip,
            timestamp=datetime.utcnow(),
            details=details,
            risk_level=self._calculate_risk_level(event_type)
        )
        self.audit_logger.log_security_event(event)
    
    async def _log_request(self, request: Request, response: Response, ip: str, processing_time: float):
        """Log request details"""
        log_data = {
            "method": request.method,
            "path": str(request.url.path),
            "status_code": response.status_code,
            "processing_time": processing_time,
            "ip_address": ip,
            "user_agent": request.headers.get("user-agent", ""),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Log to audit system (in production, send to SIEM)
        logger.info(f"REQUEST: {json.dumps(log_data)}")
    
    def _calculate_risk_level(self, event_type: str) -> str:
        """Calculate risk level for event"""
        high_risk_events = [
            "THREAT_IN_URL", "THREAT_IN_HEADERS", "THREAT_IN_BODY",
            "BLOCKED_IP_ACCESS", "MULTIPLE_FAILED_LOGINS"
        ]
        
        medium_risk_events = [
            "RATE_LIMIT_EXCEEDED", "INVALID_TOKEN", "SUSPICIOUS_ACTIVITY"
        ]
        
        if event_type in high_risk_events:
            return "HIGH"
        elif event_type in medium_risk_events:
            return "MEDIUM"
        else:
            return "LOW"

class AuthenticationMiddleware:
    """JWT Authentication middleware"""
    
    def __init__(self):
        self.security = HTTPBearer(auto_error=False)
        self.excluded_paths = [
            "/docs", "/redoc", "/openapi.json",
            "/health", "/api/v1/auth/login", "/api/v1/auth/register",
            "/api/v1/auth/password-reset"
        ]
    
    async def __call__(self, request: Request, call_next: Callable) -> Response:
        """Process authentication"""
        # Skip auth for excluded paths
        if any(request.url.path.startswith(path) for path in self.excluded_paths):
            return await call_next(request)
        
        # Extract and validate token
        authorization = request.headers.get("authorization")
        if not authorization:
            return JSONResponse(
                status_code=401,
                content={"error": "Authentication required"}
            )
        
        token = TokenSecurity.extract_token_from_header(authorization)
        if not token:
            return JSONResponse(
                status_code=401,
                content={"error": "Invalid authentication format"}
            )
        
        payload = TokenSecurity.verify_token(token)
        if not payload:
            return JSONResponse(
                status_code=401,
                content={"error": "Invalid or expired token"}
            )
        
        # Add user info to request state
        request.state.user_id = payload.get("user_id")
        request.state.username = payload.get("username")
        request.state.scopes = payload.get("scopes", [])
        
        return await call_next(request)

class CORSSecurityMiddleware(BaseHTTPMiddleware):
    """Secure CORS middleware with strict controls"""
    
    def __init__(self, app, allowed_origins: List[str] = None):
        super().__init__(app)
        self.allowed_origins = allowed_origins or ["http://localhost:3000"]
        self.allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        self.allowed_headers = [
            "Authorization", "Content-Type", "X-Requested-With",
            "X-API-Key", "X-Request-ID"
        ]
        self.max_age = 86400  # 24 hours
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process CORS"""
        origin = request.headers.get("origin")
        
        # Handle preflight requests
        if request.method == "OPTIONS":
            if origin in self.allowed_origins:
                response = Response()
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Methods"] = ", ".join(self.allowed_methods)
                response.headers["Access-Control-Allow-Headers"] = ", ".join(self.allowed_headers)
                response.headers["Access-Control-Max-Age"] = str(self.max_age)
                response.headers["Access-Control-Allow-Credentials"] = "true"
                return response
            else:
                return Response(status_code=403)
        
        # Process actual request
        response = await call_next(request)
        
        # Add CORS headers for allowed origins
        if origin in self.allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        
        return response

class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """CSRF protection middleware"""
    
    def __init__(self, app, secret_key: str):
        super().__init__(app)
        self.secret_key = secret_key
        self.safe_methods = ["GET", "HEAD", "OPTIONS", "TRACE"]
        self.excluded_paths = ["/api/v1/auth/"]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process CSRF protection"""
        # Skip CSRF for safe methods and excluded paths
        if (request.method in self.safe_methods or 
            any(request.url.path.startswith(path) for path in self.excluded_paths)):
            return await call_next(request)
        
        # Check CSRF token
        csrf_token = request.headers.get("X-CSRF-Token")
        if not csrf_token or not self._verify_csrf_token(csrf_token):
            return JSONResponse(
                status_code=403,
                content={"error": "CSRF token missing or invalid"}
            )
        
        return await call_next(request)
    
    def _verify_csrf_token(self, token: str) -> bool:
        """Verify CSRF token"""
        try:
            # In production, implement proper CSRF token verification
            # This is a simplified version
            return len(token) >= 32 and token.isalnum()
        except Exception:
            return False
    
    def generate_csrf_token(self) -> str:
        """Generate CSRF token"""
        import secrets
        return secrets.token_urlsafe(32)

class RequestSizeMiddleware(BaseHTTPMiddleware):
    """Request size limitation middleware"""
    
    def __init__(self, app, max_size: int = 10 * 1024 * 1024):  # 10MB default
        super().__init__(app)
        self.max_size = max_size
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Check request size"""
        content_length = request.headers.get("content-length")
        
        if content_length and int(content_length) > self.max_size:
            return JSONResponse(
                status_code=413,
                content={"error": "Request entity too large"}
            )
        
        return await call_next(request)

class SecurityEventDetector:
    """Advanced security event detection"""
    
    def __init__(self):
        self.failed_logins = {}
        self.suspicious_activities = {}
        
    def detect_brute_force(self, ip: str, success: bool) -> bool:
        """Detect brute force attacks"""
        current_time = time.time()
        
        if ip not in self.failed_logins:
            self.failed_logins[ip] = []
        
        if not success:
            self.failed_logins[ip].append(current_time)
            
            # Clean old attempts (last hour)
            self.failed_logins[ip] = [
                attempt for attempt in self.failed_logins[ip]
                if current_time - attempt < 3600
            ]
            
            # Check if threshold exceeded
            if len(self.failed_logins[ip]) >= 5:
                return True
        else:
            # Reset on successful login
            self.failed_logins[ip] = []
        
        return False
    
    def detect_anomalous_behavior(self, user_id: int, activity: str) -> bool:
        """Detect anomalous user behavior"""
        # Implement behavioral analysis
        # This is a simplified version
        current_time = time.time()
        
        if user_id not in self.suspicious_activities:
            self.suspicious_activities[user_id] = []
        
        self.suspicious_activities[user_id].append({
            "activity": activity,
            "timestamp": current_time
        })
        
        # Check for rapid succession of activities
        recent_activities = [
            act for act in self.suspicious_activities[user_id]
            if current_time - act["timestamp"] < 60  # Last minute
        ]
        
        return len(recent_activities) > 20  # More than 20 activities per minute

# Global security instances
security_event_detector = SecurityEventDetector()

def create_security_middleware_stack(app, config: Dict[str, Any]):
    """Create complete security middleware stack"""
    
    # Request size middleware
    app.add_middleware(
        RequestSizeMiddleware,
        max_size=config.get("max_request_size", 10 * 1024 * 1024)
    )
    
    # CORS middleware
    app.add_middleware(
        CORSSecurityMiddleware,
        allowed_origins=config.get("allowed_origins", ["http://localhost:3000"])
    )
    
    # CSRF protection middleware
    app.add_middleware(
        CSRFProtectionMiddleware,
        secret_key=config.get("csrf_secret", "your-csrf-secret-key")
    )
    
    # Main security middleware
    app.add_middleware(SecurityMiddleware, config=config)
    
    return app 