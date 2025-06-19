"""
WebSocket middleware for security, rate limiting, and monitoring
"""
import time
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Callable
from fastapi import WebSocket, WebSocketDisconnect
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from loguru import logger
import redis.asyncio as redis

from app.core.config import settings


class WebSocketSecurityMiddleware:
    """Security middleware for WebSocket connections"""
    
    def __init__(self):
        self.blocked_ips: set = set()
        self.suspicious_patterns: list = [
            'script',
            'eval',
            'javascript:',
            '<script',
            'onerror=',
            'onload=',
        ]
        
        # Rate limiting
        self.connection_attempts: Dict[str, list] = {}
        self.message_rates: Dict[str, list] = {}
        
        # Redis for distributed rate limiting
        self.redis = None
        self._initialize_redis()
    
    async def _initialize_redis(self):
        """Initialize Redis connection for distributed tracking"""
        try:
            redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/2')
            self.redis = redis.from_url(redis_url, decode_responses=True)
            await self.redis.ping()
            logger.info("WebSocket middleware Redis connection established")
        except Exception as e:
            logger.warning(f"Redis not available for WebSocket middleware: {str(e)}")
    
    async def check_connection_limit(self, client_ip: str, max_connections: int = 10, 
                                   window_minutes: int = 5) -> bool:
        """Check if client IP is within connection limits"""
        try:
            now = time.time()
            window_start = now - (window_minutes * 60)
            
            # Clean old attempts
            if client_ip in self.connection_attempts:
                self.connection_attempts[client_ip] = [
                    timestamp for timestamp in self.connection_attempts[client_ip]
                    if timestamp > window_start
                ]
            else:
                self.connection_attempts[client_ip] = []
            
            # Check limit
            if len(self.connection_attempts[client_ip]) >= max_connections:
                logger.warning(f"Connection limit exceeded for IP {client_ip}")
                return False
            
            # Record this attempt
            self.connection_attempts[client_ip].append(now)
            
            # Also check in Redis for distributed enforcement
            if self.redis:
                try:
                    key = f"ws_conn_limit:{client_ip}"
                    current_count = await self.redis.incr(key)
                    await self.redis.expire(key, window_minutes * 60)
                    
                    if current_count > max_connections:
                        logger.warning(f"Distributed connection limit exceeded for IP {client_ip}")
                        return False
                        
                except Exception as e:
                    logger.error(f"Redis rate limit check failed: {str(e)}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking connection limit: {str(e)}")
            return True  # Allow connection on error
    
    async def check_message_rate_limit(self, client_id: str, max_messages: int = 60, 
                                     window_seconds: int = 60) -> bool:
        """Check if client is within message rate limits"""
        try:
            now = time.time()
            window_start = now - window_seconds
            
            # Clean old messages
            if client_id in self.message_rates:
                self.message_rates[client_id] = [
                    timestamp for timestamp in self.message_rates[client_id]
                    if timestamp > window_start
                ]
            else:
                self.message_rates[client_id] = []
            
            # Check limit
            if len(self.message_rates[client_id]) >= max_messages:
                return False
            
            # Record this message
            self.message_rates[client_id].append(now)
            return True
            
        except Exception as e:
            logger.error(f"Error checking message rate limit: {str(e)}")
            return True
    
    def is_ip_blocked(self, client_ip: str) -> bool:
        """Check if IP is blocked"""
        return client_ip in self.blocked_ips
    
    def block_ip(self, client_ip: str, duration_minutes: int = 60):
        """Block an IP address"""
        self.blocked_ips.add(client_ip)
        
        # Schedule unblocking (in production, use a proper scheduler)
        logger.warning(f"IP {client_ip} blocked for {duration_minutes} minutes")
    
    def validate_message_content(self, message: str) -> bool:
        """Validate message content for security threats"""
        try:
            message_lower = message.lower()
            
            # Check for suspicious patterns
            for pattern in self.suspicious_patterns:
                if pattern in message_lower:
                    logger.warning(f"Suspicious pattern detected in message: {pattern}")
                    return False
            
            # Check message length
            if len(message) > 10000:  # 10KB limit
                logger.warning("Message too long")
                return False
            
            # Try to parse as JSON to ensure validity
            if message.strip().startswith('{'):
                try:
                    json.loads(message)
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON in message")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating message content: {str(e)}")
            return False
    
    async def log_connection_attempt(self, client_ip: str, user_agent: str, 
                                   success: bool, reason: str = None):
        """Log connection attempts for monitoring"""
        try:
            log_entry = {
                'timestamp': datetime.now().isoformat(),
                'client_ip': client_ip,
                'user_agent': user_agent,
                'success': success,
                'reason': reason
            }
            
            if success:
                logger.info(f"WebSocket connection established: {client_ip}")
            else:
                logger.warning(f"WebSocket connection rejected: {client_ip} - {reason}")
            
            # Store in Redis for monitoring dashboard
            if self.redis:
                try:
                    key = f"ws_connection_log:{datetime.now().strftime('%Y%m%d%H')}"
                    await self.redis.lpush(key, json.dumps(log_entry))
                    await self.redis.expire(key, 86400)  # Keep for 24 hours
                except Exception as e:
                    logger.error(f"Failed to log to Redis: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Error logging connection attempt: {str(e)}")


class WebSocketMonitoringMiddleware:
    """Monitoring middleware for WebSocket connections"""
    
    def __init__(self):
        self.connection_metrics: Dict[str, Dict[str, Any]] = {}
        self.message_metrics: Dict[str, Dict[str, Any]] = {}
        self.redis = None
        self._initialize_redis()
    
    async def _initialize_redis(self):
        """Initialize Redis for metrics storage"""
        try:
            redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/3')
            self.redis = redis.from_url(redis_url, decode_responses=True)
            await self.redis.ping()
        except Exception as e:
            logger.warning(f"Redis not available for monitoring: {str(e)}")
    
    async def record_connection(self, connection_id: str, user_id: int, 
                              client_info: Dict[str, Any]):
        """Record new connection metrics"""
        try:
            metrics = {
                'user_id': user_id,
                'connected_at': datetime.now().isoformat(),
                'client_info': client_info,
                'messages_sent': 0,
                'messages_received': 0,
                'last_activity': datetime.now().isoformat(),
                'errors': 0,
                'bandwidth_bytes': 0
            }
            
            self.connection_metrics[connection_id] = metrics
            
            # Store in Redis
            if self.redis:
                try:
                    await self.redis.hset(
                        f"ws_metrics:connection:{connection_id}",
                        mapping=metrics
                    )
                    await self.redis.expire(f"ws_metrics:connection:{connection_id}", 86400)
                except Exception as e:
                    logger.error(f"Failed to store connection metrics: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Error recording connection metrics: {str(e)}")
    
    async def record_message(self, connection_id: str, message_type: str, 
                           message_size: int, direction: str = "received"):
        """Record message metrics"""
        try:
            if connection_id in self.connection_metrics:
                metrics = self.connection_metrics[connection_id]
                
                if direction == "received":
                    metrics['messages_received'] += 1
                else:
                    metrics['messages_sent'] += 1
                
                metrics['bandwidth_bytes'] += message_size
                metrics['last_activity'] = datetime.now().isoformat()
                
                # Update Redis
                if self.redis:
                    try:
                        await self.redis.hincrby(
                            f"ws_metrics:connection:{connection_id}",
                            f"messages_{direction}", 1
                        )
                        await self.redis.hincrby(
                            f"ws_metrics:connection:{connection_id}",
                            "bandwidth_bytes", message_size
                        )
                    except Exception as e:
                        logger.error(f"Failed to update message metrics: {str(e)}")
            
            # Record message type statistics
            hour_key = datetime.now().strftime('%Y%m%d%H')
            message_key = f"ws_message_stats:{hour_key}:{message_type}"
            
            if self.redis:
                try:
                    await self.redis.incr(message_key)
                    await self.redis.expire(message_key, 86400)
                except Exception as e:
                    logger.error(f"Failed to update message type metrics: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Error recording message metrics: {str(e)}")
    
    async def record_error(self, connection_id: str, error_type: str, error_message: str):
        """Record error metrics"""
        try:
            if connection_id in self.connection_metrics:
                self.connection_metrics[connection_id]['errors'] += 1
            
            error_data = {
                'connection_id': connection_id,
                'error_type': error_type,
                'error_message': error_message,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.error(f"WebSocket error recorded: {error_data}")
            
            # Store in Redis
            if self.redis:
                try:
                    error_key = f"ws_errors:{datetime.now().strftime('%Y%m%d')}"
                    await self.redis.lpush(error_key, json.dumps(error_data))
                    await self.redis.expire(error_key, 604800)  # Keep for 7 days
                except Exception as e:
                    logger.error(f"Failed to store error metrics: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Error recording error metrics: {str(e)}")
    
    async def cleanup_connection(self, connection_id: str):
        """Clean up connection metrics when connection closes"""
        try:
            if connection_id in self.connection_metrics:
                metrics = self.connection_metrics[connection_id]
                
                # Calculate session duration
                connected_at = datetime.fromisoformat(metrics['connected_at'])
                session_duration = (datetime.now() - connected_at).total_seconds()
                
                # Store final session metrics
                session_summary = {
                    'connection_id': connection_id,
                    'user_id': metrics['user_id'],
                    'session_duration_seconds': session_duration,
                    'messages_sent': metrics['messages_sent'],
                    'messages_received': metrics['messages_received'],
                    'bandwidth_bytes': metrics['bandwidth_bytes'],
                    'errors': metrics['errors'],
                    'ended_at': datetime.now().isoformat()
                }
                
                if self.redis:
                    try:
                        session_key = f"ws_sessions:{datetime.now().strftime('%Y%m%d')}"
                        await self.redis.lpush(session_key, json.dumps(session_summary))
                        await self.redis.expire(session_key, 2592000)  # Keep for 30 days
                        
                        # Clean up connection metrics
                        await self.redis.delete(f"ws_metrics:connection:{connection_id}")
                    except Exception as e:
                        logger.error(f"Failed to store session summary: {str(e)}")
                
                # Remove from local storage
                del self.connection_metrics[connection_id]
                
                logger.info(f"Connection metrics cleaned up for {connection_id}")
                
        except Exception as e:
            logger.error(f"Error cleaning up connection metrics: {str(e)}")
    
    async def get_current_metrics(self) -> Dict[str, Any]:
        """Get current system metrics"""
        try:
            total_connections = len(self.connection_metrics)
            total_messages = sum(
                m['messages_sent'] + m['messages_received'] 
                for m in self.connection_metrics.values()
            )
            total_bandwidth = sum(
                m['bandwidth_bytes'] 
                for m in self.connection_metrics.values()
            )
            total_errors = sum(
                m['errors'] 
                for m in self.connection_metrics.values()
            )
            
            # Active users (connections in last 5 minutes)
            cutoff_time = datetime.now() - timedelta(minutes=5)
            active_users = sum(
                1 for m in self.connection_metrics.values()
                if datetime.fromisoformat(m['last_activity']) > cutoff_time
            )
            
            return {
                'total_connections': total_connections,
                'active_users': active_users,
                'total_messages': total_messages,
                'total_bandwidth_bytes': total_bandwidth,
                'total_errors': total_errors,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting current metrics: {str(e)}")
            return {}


class WebSocketCompressionMiddleware:
    """Compression middleware for WebSocket messages"""
    
    def __init__(self):
        self.compression_threshold = 1024  # Compress messages larger than 1KB
    
    def should_compress(self, message: str) -> bool:
        """Check if message should be compressed"""
        return len(message.encode('utf-8')) > self.compression_threshold
    
    def compress_message(self, message: str) -> str:
        """Compress message (placeholder - implement with gzip or similar)"""
        try:
            import gzip
            import base64
            
            compressed = gzip.compress(message.encode('utf-8'))
            encoded = base64.b64encode(compressed).decode('ascii')
            
            return json.dumps({
                'compressed': True,
                'data': encoded,
                'original_size': len(message),
                'compressed_size': len(encoded)
            })
            
        except Exception as e:
            logger.error(f"Error compressing message: {str(e)}")
            return message
    
    def decompress_message(self, compressed_message: str) -> str:
        """Decompress message"""
        try:
            import gzip
            import base64
            
            data = json.loads(compressed_message)
            if not data.get('compressed'):
                return compressed_message
            
            decoded = base64.b64decode(data['data'])
            decompressed = gzip.decompress(decoded).decode('utf-8')
            
            return decompressed
            
        except Exception as e:
            logger.error(f"Error decompressing message: {str(e)}")
            return compressed_message


# Middleware factory function
def create_websocket_middleware_stack():
    """Create a complete middleware stack for WebSocket connections"""
    
    security_middleware = WebSocketSecurityMiddleware()
    monitoring_middleware = WebSocketMonitoringMiddleware()
    compression_middleware = WebSocketCompressionMiddleware()
    
    return {
        'security': security_middleware,
        'monitoring': monitoring_middleware,
        'compression': compression_middleware
    }


# Global middleware instances
websocket_middlewares = create_websocket_middleware_stack() 