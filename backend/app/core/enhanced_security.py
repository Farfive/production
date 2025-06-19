#!/usr/bin/env python3
"""
Enhanced Security Module with Modern Authentication Features
- Rate limiting
- Account lockout protection
- Device fingerprinting
- Enhanced session management
- Login attempt monitoring
"""

import asyncio
import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Union
from dataclasses import dataclass
from collections import defaultdict

import redis
from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import get_settings
from app.models.user import User

settings = get_settings()

# Redis connection for session management
try:
    redis_client = redis.Redis(
        host=getattr(settings, 'REDIS_HOST', 'localhost'),
        port=getattr(settings, 'REDIS_PORT', 6379),
        db=getattr(settings, 'REDIS_DB', 0),
        decode_responses=True
    )
    redis_client.ping()
    REDIS_AVAILABLE = True
except:
    redis_client = None
    REDIS_AVAILABLE = False

# Argon2 password hasher (3x faster than bcrypt)
argon2_hasher = PasswordHasher(
    time_cost=2,        # 2 iterations (fast but secure)
    memory_cost=65536,  # 64 MB memory
    parallelism=1,      # Single thread
    hash_len=32,        # 32 bytes output
    salt_len=16         # 16 bytes salt
)

@dataclass
class DeviceInfo:
    """Device fingerprinting information"""
    user_agent: str
    ip_address: str
    fingerprint: str
    platform: str = "unknown"
    browser: str = "unknown"
    is_mobile: bool = False

@dataclass
class LoginAttempt:
    """Login attempt tracking"""
    email: str
    ip_address: str
    user_agent: str
    timestamp: datetime
    success: bool
    failure_reason: Optional[str] = None

class EnhancedSecurityManager:
    """Modern security manager with rate limiting and enhanced features"""
    
    def __init__(self):
        self.failed_attempts = defaultdict(list)  # Fallback for in-memory tracking
        self.locked_accounts = defaultdict(datetime)
        
    def generate_device_fingerprint(self, request: Request) -> DeviceInfo:
        """Generate device fingerprint from request"""
        user_agent = request.headers.get("User-Agent", "")
        ip_address = self.get_client_ip(request)
        
        # Create fingerprint hash
        fingerprint_data = f"{user_agent}{ip_address}"
        fingerprint = hashlib.sha256(fingerprint_data.encode()).hexdigest()[:16]
        
        # Parse user agent for device info
        is_mobile = any(mobile in user_agent.lower() for mobile in ['mobile', 'android', 'iphone'])
        
        browser = "unknown"
        if "chrome" in user_agent.lower():
            browser = "chrome"
        elif "firefox" in user_agent.lower():
            browser = "firefox"
        elif "safari" in user_agent.lower():
            browser = "safari"
        elif "edge" in user_agent.lower():
            browser = "edge"
            
        platform = "unknown"
        if "windows" in user_agent.lower():
            platform = "windows"
        elif "mac" in user_agent.lower():
            platform = "mac"
        elif "linux" in user_agent.lower():
            platform = "linux"
        elif "android" in user_agent.lower():
            platform = "android"
        elif "ios" in user_agent.lower():
            platform = "ios"
        
        return DeviceInfo(
            user_agent=user_agent,
            ip_address=ip_address,
            fingerprint=fingerprint,
            platform=platform,
            browser=browser,
            is_mobile=is_mobile
        )
    
    def get_client_ip(self, request: Request) -> str:
        """Extract real client IP address"""
        # Check for forwarded headers (behind proxy/load balancer)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    async def check_rate_limit(self, identifier: str, limit: int = 5, window: int = 300) -> bool:
        """
        Check if identifier (IP/email) has exceeded rate limit
        Args:
            identifier: IP address or email
            limit: Maximum attempts allowed
            window: Time window in seconds (default 5 minutes)
        """
        if REDIS_AVAILABLE:
            return await self._check_rate_limit_redis(identifier, limit, window)
        else:
            return self._check_rate_limit_memory(identifier, limit, window)
    
    async def _check_rate_limit_redis(self, identifier: str, limit: int, window: int) -> bool:
        """Redis-based rate limiting"""
        key = f"rate_limit:{identifier}"
        current_time = datetime.now(timezone.utc).timestamp()
        
        # Use Redis sorted set for sliding window
        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, current_time - window)  # Remove old entries
        pipe.zadd(key, {str(current_time): current_time})     # Add current attempt
        pipe.zcard(key)                                       # Count attempts
        pipe.expire(key, window)                              # Set expiry
        
        results = pipe.execute()
        attempt_count = results[2]
        
        return attempt_count <= limit
    
    def _check_rate_limit_memory(self, identifier: str, limit: int, window: int) -> bool:
        """In-memory rate limiting (fallback)"""
        current_time = datetime.now(timezone.utc)
        window_start = current_time - timedelta(seconds=window)
        
        # Clean old attempts
        self.failed_attempts[identifier] = [
            attempt for attempt in self.failed_attempts[identifier]
            if attempt > window_start
        ]
        
        return len(self.failed_attempts[identifier]) < limit
    
    async def record_failed_attempt(self, identifier: str):
        """Record a failed login attempt"""
        if REDIS_AVAILABLE:
            await self._record_failed_attempt_redis(identifier)
        else:
            self._record_failed_attempt_memory(identifier)
    
    async def _record_failed_attempt_redis(self, identifier: str):
        """Record failed attempt in Redis"""
        current_time = datetime.now(timezone.utc).timestamp()
        key = f"rate_limit:{identifier}"
        redis_client.zadd(key, {str(current_time): current_time})
        redis_client.expire(key, 300)  # 5 minutes
    
    def _record_failed_attempt_memory(self, identifier: str):
        """Record failed attempt in memory"""
        self.failed_attempts[identifier].append(datetime.now(timezone.utc))
    
    async def is_account_locked(self, email: str) -> bool:
        """Check if account is temporarily locked"""
        if REDIS_AVAILABLE:
            lock_key = f"account_lock:{email}"
            return redis_client.exists(lock_key)
        else:
            lock_time = self.locked_accounts.get(email)
            if lock_time and datetime.now(timezone.utc) < lock_time:
                return True
            return False
    
    async def lock_account(self, email: str, duration_minutes: int = 30):
        """Temporarily lock account after too many failed attempts"""
        if REDIS_AVAILABLE:
            lock_key = f"account_lock:{email}"
            redis_client.setex(lock_key, duration_minutes * 60, "locked")
        else:
            unlock_time = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)
            self.locked_accounts[email] = unlock_time
    
    def hash_password(self, password: str) -> str:
        """Hash password using Argon2 (3x faster than bcrypt)"""
        try:
            return argon2_hasher.hash(password)
        except Exception as e:
            # Fallback to bcrypt if Argon2 fails
            from app.core.security import get_password_hash
            return get_password_hash(password)
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        try:
            # Try Argon2 first
            argon2_hasher.verify(hashed_password, password)
            return True
        except VerifyMismatchError:
            return False
        except Exception:
            # Fallback to bcrypt for legacy passwords
            from app.core.security import verify_password as bcrypt_verify
            return bcrypt_verify(password, hashed_password)
    
    async def create_enhanced_session(self, user: User, device_info: DeviceInfo) -> str:
        """Create enhanced session with device tracking"""
        session_id = secrets.token_urlsafe(32)
        
        session_data = {
            "user_id": user.id,
            "email": user.email,
            "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_activity": datetime.now(timezone.utc).isoformat(),
            "device_info": {
                "fingerprint": device_info.fingerprint,
                "platform": device_info.platform,
                "browser": device_info.browser,
                "is_mobile": device_info.is_mobile,
                "ip_address": device_info.ip_address
            }
        }
        
        if REDIS_AVAILABLE:
            # Store session in Redis with 7-day expiry
            session_key = f"session:{session_id}"
            redis_client.setex(session_key, 7 * 24 * 3600, json.dumps(session_data))
            
            # Track user sessions for management
            user_sessions_key = f"user_sessions:{user.id}"
            redis_client.sadd(user_sessions_key, session_id)
            redis_client.expire(user_sessions_key, 7 * 24 * 3600)
        
        return session_id
    
    async def validate_session(self, session_id: str) -> Optional[Dict]:
        """Validate and return session data"""
        if not REDIS_AVAILABLE:
            return None
            
        session_key = f"session:{session_id}"
        session_data = redis_client.get(session_key)
        
        if not session_data:
            return None
        
        try:
            data = json.loads(session_data)
            # Update last activity
            data["last_activity"] = datetime.now(timezone.utc).isoformat()
            redis_client.setex(session_key, 7 * 24 * 3600, json.dumps(data))
            return data
        except:
            return None
    
    async def revoke_session(self, session_id: str):
        """Immediately revoke a session"""
        if REDIS_AVAILABLE:
            session_key = f"session:{session_id}"
            redis_client.delete(session_key)
    
    async def revoke_all_user_sessions(self, user_id: int):
        """Revoke all sessions for a user"""
        if REDIS_AVAILABLE:
            user_sessions_key = f"user_sessions:{user_id}"
            session_ids = redis_client.smembers(user_sessions_key)
            
            for session_id in session_ids:
                await self.revoke_session(session_id)
            
            redis_client.delete(user_sessions_key)
    
    async def log_login_attempt(self, attempt: LoginAttempt):
        """Log login attempt for monitoring"""
        if REDIS_AVAILABLE:
            log_key = f"login_attempts:{attempt.email}:{datetime.now().strftime('%Y%m%d')}"
            attempt_data = {
                "timestamp": attempt.timestamp.isoformat(),
                "ip_address": attempt.ip_address,
                "user_agent": attempt.user_agent,
                "success": attempt.success,
                "failure_reason": attempt.failure_reason
            }
            redis_client.lpush(log_key, json.dumps(attempt_data))
            redis_client.expire(log_key, 30 * 24 * 3600)  # Keep for 30 days

# Global instance
enhanced_security = EnhancedSecurityManager() 