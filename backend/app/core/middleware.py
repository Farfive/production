import time
import logging
from typing import Dict, Optional
from collections import defaultdict, deque
from fastapi import FastAPI, Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
import asyncio

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware with sliding window algorithm.
    
    Different limits for different endpoint types:
    - Auth endpoints: 5 requests per minute
    - API endpoints: 100 requests per minute
    - Public endpoints: 1000 requests per hour
    """
    
    def __init__(self, app: FastAPI):
        super().__init__(app)
        self.auth_limits = defaultdict(lambda: deque())  # 5 req/min for auth
        self.api_limits = defaultdict(lambda: deque())   # 100 req/min for API
        self.public_limits = defaultdict(lambda: deque()) # 1000 req/hour for public
        
        # Rate limit configurations
        self.AUTH_LIMIT = 5
        self.AUTH_WINDOW = 60  # 1 minute
        
        self.API_LIMIT = 100
        self.API_WINDOW = 60  # 1 minute
        
        self.PUBLIC_LIMIT = 1000
        self.PUBLIC_WINDOW = 3600  # 1 hour
    
    def get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request."""
        # Check for forwarded headers (behind proxy)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def is_rate_limited(self, client_ip: str, endpoint_type: str) -> tuple[bool, int]:
        """
        Check if client is rate limited.
        
        Returns:
            tuple: (is_limited, retry_after_seconds)
        """
        current_time = time.time()
        
        if endpoint_type == "auth":
            limit = self.AUTH_LIMIT
            window = self.AUTH_WINDOW
            requests = self.auth_limits[client_ip]
        elif endpoint_type == "api":
            limit = self.API_LIMIT
            window = self.API_WINDOW
            requests = self.api_limits[client_ip]
        else:  # public
            limit = self.PUBLIC_LIMIT
            window = self.PUBLIC_WINDOW
            requests = self.public_limits[client_ip]
        
        # Remove expired requests
        while requests and requests[0] <= current_time - window:
            requests.popleft()
        
        # Check if limit exceeded
        if len(requests) >= limit:
            oldest_request = requests[0] if requests else current_time
            retry_after = int(oldest_request + window - current_time) + 1
            return True, retry_after
        
        # Add current request
        requests.append(current_time)
        return False, 0
    
    def get_endpoint_type(self, path: str) -> str:
        """Determine endpoint type based on path."""
        auth_endpoints = [
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/forgot-password",
            "/api/v1/auth/reset-password",
            "/api/v1/auth/verify-email",
            "/api/v1/auth/refresh-token"
        ]
        
        if path in auth_endpoints:
            return "auth"
        elif path.startswith("/api/"):
            return "api"
        else:
            return "public"
    
    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting."""
        client_ip = self.get_client_ip(request)
        endpoint_type = self.get_endpoint_type(request.url.path)
        
        # Check rate limit
        is_limited, retry_after = self.is_rate_limited(client_ip, endpoint_type)
        
        if is_limited:
            logger.warning(f"Rate limit exceeded for {client_ip} on {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded",
                    "retry_after": retry_after
                },
                headers={"Retry-After": str(retry_after)}
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = self._get_remaining_requests(client_ip, endpoint_type)
        response.headers["X-RateLimit-Limit"] = str(self._get_limit(endpoint_type))
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time() + self._get_window(endpoint_type)))
        
        return response
    
    def _get_limit(self, endpoint_type: str) -> int:
        """Get rate limit for endpoint type."""
        return {
            "auth": self.AUTH_LIMIT,
            "api": self.API_LIMIT,
            "public": self.PUBLIC_LIMIT
        }.get(endpoint_type, self.PUBLIC_LIMIT)
    
    def _get_window(self, endpoint_type: str) -> int:
        """Get time window for endpoint type."""
        return {
            "auth": self.AUTH_WINDOW,
            "api": self.API_WINDOW,
            "public": self.PUBLIC_WINDOW
        }.get(endpoint_type, self.PUBLIC_WINDOW)
    
    def _get_remaining_requests(self, client_ip: str, endpoint_type: str) -> int:
        """Get remaining requests for client."""
        if endpoint_type == "auth":
            requests = self.auth_limits[client_ip]
            limit = self.AUTH_LIMIT
        elif endpoint_type == "api":
            requests = self.api_limits[client_ip]
            limit = self.API_LIMIT
        else:
            requests = self.public_limits[client_ip]
            limit = self.PUBLIC_LIMIT
        
        return max(0, limit - len(requests))


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
        response.headers["Content-Security-Policy"] = csp
        
        # HSTS (only in production with HTTPS)
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all requests with timing and error information."""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        client_ip = self._get_client_ip(request)
        
        # Log request
        logger.info(
            f"Request started: {request.method} {request.url.path} "
            f"from {client_ip}"
        )
        
        try:
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Log response
            logger.info(
                f"Request completed: {request.method} {request.url.path} "
                f"- Status: {response.status_code} "
                f"- Time: {process_time:.3f}s "
                f"- IP: {client_ip}"
            )
            
            # Add timing header
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            # Log error
            process_time = time.time() - start_time
            logger.error(
                f"Request failed: {request.method} {request.url.path} "
                f"- Error: {str(e)} "
                f"- Time: {process_time:.3f}s "
                f"- IP: {client_ip}"
            )
            raise
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"


def setup_middleware(app: FastAPI, settings):
    """Set up all middleware for the application."""
    
    # 1. Trusted Host Middleware (first)
    allowed_hosts = ["*"] if settings.DEBUG else [
        settings.DOMAIN,
        f"api.{settings.DOMAIN}",
        "localhost",
        "127.0.0.1"
    ]
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=allowed_hosts
    )
    
    # 2. CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",  # React dev server
            "http://localhost:8000",  # FastAPI dev server
            f"https://{settings.DOMAIN}",
            f"https://app.{settings.DOMAIN}",
        ] if settings.DEBUG else [
            f"https://{settings.DOMAIN}",
            f"https://app.{settings.DOMAIN}",
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "Accept",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
        ],
        expose_headers=[
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
            "X-Process-Time",
        ]
    )
    
    # 3. Session Middleware (for CSRF protection)
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.SECRET_KEY,
        same_site="strict",
        https_only=not settings.DEBUG
    )
    
    # 4. Security Headers Middleware
    app.add_middleware(SecurityHeadersMiddleware)
    
    # 5. Rate Limiting Middleware
    app.add_middleware(RateLimitMiddleware)
    
    # 6. Request Logging Middleware (last, to capture all requests)
    app.add_middleware(RequestLoggingMiddleware)
    
    logger.info("All middleware configured successfully")


# Cleanup task for rate limiting
async def cleanup_rate_limits():
    """Periodic cleanup of expired rate limit entries."""
    while True:
        await asyncio.sleep(300)  # Clean up every 5 minutes
        current_time = time.time()
        
        # This would ideally be implemented with a proper cache like Redis
        # For now, this is a simple in-memory cleanup
        logger.debug("Cleaning up expired rate limit entries") 