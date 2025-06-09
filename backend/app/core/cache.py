"""
Advanced caching system with Redis and performance optimization
"""
import json
import time
import hashlib
import logging
from typing import Any, Optional, Dict, List, Callable
from functools import wraps
from datetime import datetime, timedelta

import redis
from flask_caching import Cache
from cachetools import TTLCache, LRUCache
from app.core.config import settings

logger = logging.getLogger(__name__)

class CacheManager:
    """Advanced cache manager with multiple backends"""
    
    def __init__(self):
        # Redis connection
        self.redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30
        )
        
        # In-memory caches for frequently accessed data
        self.memory_cache = TTLCache(maxsize=1000, ttl=300)  # 5 minutes
        self.lru_cache = LRUCache(maxsize=500)
        
        # Cache statistics
        self.stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'errors': 0
        }
    
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from arguments"""
        key_data = f"{prefix}:{args}:{sorted(kwargs.items())}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str, default=None) -> Any:
        """Get value from cache with fallback strategy"""
        try:
            # Try memory cache first (fastest)
            if key in self.memory_cache:
                self.stats['hits'] += 1
                return self.memory_cache[key]
            
            # Try Redis cache
            value = self.redis_client.get(key)
            if value is not None:
                self.stats['hits'] += 1
                # Store in memory cache for faster access
                self.memory_cache[key] = json.loads(value)
                return json.loads(value)
            
            self.stats['misses'] += 1
            return default
            
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            self.stats['errors'] += 1
            return default
    
    def set(self, key: str, value: Any, ttl: int = None) -> bool:
        """Set value in cache with multiple backends"""
        try:
            ttl = ttl or settings.REDIS_CACHE_TTL
            serialized_value = json.dumps(value, default=str)
            
            # Set in Redis
            self.redis_client.setex(key, ttl, serialized_value)
            
            # Set in memory cache
            self.memory_cache[key] = value
            
            self.stats['sets'] += 1
            return True
            
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            self.stats['errors'] += 1
            return False
    
    def delete(self, key: str) -> bool:
        """Delete value from all cache backends"""
        try:
            # Delete from Redis
            self.redis_client.delete(key)
            
            # Delete from memory cache
            if key in self.memory_cache:
                del self.memory_cache[key]
            
            self.stats['deletes'] += 1
            return True
            
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            self.stats['errors'] += 1
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern"""
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                deleted = self.redis_client.delete(*keys)
                self.stats['deletes'] += deleted
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Cache clear pattern error for {pattern}: {e}")
            self.stats['errors'] += 1
            return 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        total_requests = self.stats['hits'] + self.stats['misses']
        hit_ratio = self.stats['hits'] / total_requests if total_requests > 0 else 0
        
        return {
            **self.stats,
            'hit_ratio': hit_ratio,
            'memory_cache_size': len(self.memory_cache),
            'redis_info': self._get_redis_info()
        }
    
    def _get_redis_info(self) -> Dict[str, Any]:
        """Get Redis server information"""
        try:
            info = self.redis_client.info()
            return {
                'used_memory': info.get('used_memory_human'),
                'connected_clients': info.get('connected_clients'),
                'total_commands_processed': info.get('total_commands_processed'),
                'keyspace_hits': info.get('keyspace_hits'),
                'keyspace_misses': info.get('keyspace_misses')
            }
        except Exception as e:
            logger.error(f"Redis info error: {e}")
            return {}

# Global cache manager instance
cache_manager = CacheManager()

def cached(ttl: int = None, key_prefix: str = "default"):
    """
    Decorator for caching function results
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = cache_manager._generate_key(
                f"{key_prefix}:{func.__name__}", *args, **kwargs
            )
            
            # Try to get from cache
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            start_time = time.time()
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            # Cache the result
            cache_manager.set(cache_key, result, ttl)
            
            # Log slow functions
            if execution_time > 1.0:
                logger.warning(f"Slow function cached: {func.__name__} took {execution_time:.3f}s")
            
            return result
        return wrapper
    return decorator

def cache_invalidate(pattern: str):
    """
    Decorator to invalidate cache patterns after function execution
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            cache_manager.clear_pattern(pattern)
            return result
        return wrapper
    return decorator

class QueryCache:
    """Specialized cache for database queries"""
    
    @staticmethod
    def cache_query_result(query_hash: str, result: Any, ttl: int = 300):
        """Cache database query result"""
        cache_key = f"query:{query_hash}"
        cache_manager.set(cache_key, {
            'result': result,
            'timestamp': datetime.utcnow().isoformat(),
            'ttl': ttl
        }, ttl)
    
    @staticmethod
    def get_cached_query(query_hash: str) -> Optional[Any]:
        """Get cached database query result"""
        cache_key = f"query:{query_hash}"
        cached_data = cache_manager.get(cache_key)
        
        if cached_data:
            return cached_data['result']
        return None
    
    @staticmethod
    def invalidate_table_cache(table_name: str):
        """Invalidate all cached queries for a table"""
        pattern = f"query:*{table_name}*"
        return cache_manager.clear_pattern(pattern)

class SessionCache:
    """Cache for user sessions and authentication"""
    
    @staticmethod
    def set_user_session(user_id: int, session_data: Dict[str, Any]):
        """Cache user session data"""
        cache_key = f"session:user:{user_id}"
        cache_manager.set(cache_key, session_data, settings.REDIS_SESSION_TTL)
    
    @staticmethod
    def get_user_session(user_id: int) -> Optional[Dict[str, Any]]:
        """Get cached user session data"""
        cache_key = f"session:user:{user_id}"
        return cache_manager.get(cache_key)
    
    @staticmethod
    def invalidate_user_session(user_id: int):
        """Invalidate user session cache"""
        cache_key = f"session:user:{user_id}"
        cache_manager.delete(cache_key)

class APICache:
    """Cache for API responses"""
    
    @staticmethod
    def cache_api_response(endpoint: str, params: Dict[str, Any], response: Any, ttl: int = 300):
        """Cache API response"""
        cache_key = cache_manager._generate_key(f"api:{endpoint}", **params)
        cache_manager.set(cache_key, {
            'response': response,
            'timestamp': datetime.utcnow().isoformat()
        }, ttl)
    
    @staticmethod
    def get_cached_api_response(endpoint: str, params: Dict[str, Any]) -> Optional[Any]:
        """Get cached API response"""
        cache_key = cache_manager._generate_key(f"api:{endpoint}", **params)
        cached_data = cache_manager.get(cache_key)
        
        if cached_data:
            return cached_data['response']
        return None

# Initialize specialized caches
query_cache = QueryCache()
session_cache = SessionCache()
api_cache = APICache()

# Flask-Caching configuration
cache_config = {
    'CACHE_TYPE': 'redis',
    'CACHE_REDIS_URL': settings.REDIS_URL,
    'CACHE_DEFAULT_TIMEOUT': settings.REDIS_CACHE_TTL,
    'CACHE_KEY_PREFIX': 'flask_cache:'
}

flask_cache = Cache() 