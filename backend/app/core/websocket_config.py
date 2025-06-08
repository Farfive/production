"""
WebSocket configuration and core infrastructure
"""
import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
import redis.asyncio as redis
from loguru import logger
import jwt
from cryptography.fernet import Fernet

from app.core.config import settings
from app.core.security import TokenManager
from app.models.user import User


class ConnectionManager:
    """Manage WebSocket connections with Redis support for scaling"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[int, Set[str]] = {}  # user_id -> connection_ids
        self.connection_users: Dict[str, int] = {}  # connection_id -> user_id
        self.room_connections: Dict[str, Set[str]] = {}  # room_name -> connection_ids
        self.connection_rooms: Dict[str, Set[str]] = {}  # connection_id -> room_names
        self.user_presence: Dict[int, datetime] = {}  # user_id -> last_seen
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}  # connection_id -> metadata
        
        # Redis for message broadcasting across instances
        self.redis = None
        self.redis_subscriber = None
        self.redis_publisher = None
        
        # Rate limiting
        self.message_rates: Dict[str, List[float]] = {}  # connection_id -> timestamps
        
        # Message encryption
        self.cipher_suite = Fernet(self._get_encryption_key())
    
    async def initialize_redis(self):
        """Initialize Redis connections for pub/sub"""
        try:
            redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/1')
            self.redis = redis.from_url(redis_url, decode_responses=True)
            self.redis_subscriber = redis.from_url(redis_url, decode_responses=True)
            self.redis_publisher = redis.from_url(redis_url, decode_responses=True)
            
            # Test connection
            await self.redis.ping()
            logger.info("Redis connection established for WebSocket manager")
            
            # Start Redis subscriber
            asyncio.create_task(self._redis_subscriber_loop())
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis: {str(e)}")
            # Continue without Redis for single-instance operation
    
    def _get_encryption_key(self) -> bytes:
        """Get encryption key for sensitive messages"""
        key = getattr(settings, 'WEBSOCKET_ENCRYPTION_KEY', None)
        if not key:
            # Generate a key for development (store securely in production)
            key = Fernet.generate_key()
            logger.warning("Using generated encryption key. Set WEBSOCKET_ENCRYPTION_KEY in production")
        
        if isinstance(key, str):
            key = key.encode()
        
        return key
    
    def _generate_connection_id(self) -> str:
        """Generate unique connection ID"""
        import uuid
        return f"conn_{uuid.uuid4().hex[:12]}_{int(time.time())}"
    
    async def authenticate_connection(self, websocket: WebSocket, token: str) -> Optional[User]:
        """Authenticate WebSocket connection"""
        try:
            # Verify JWT token
            payload = TokenManager.verify_token(token, "access")
            if not payload:
                return None
            
            user_id = payload.get('sub')
            if not user_id:
                return None
            
            # Get user from database (you'll need to implement this)
            from app.services.user import UserService
            user_service = UserService()
            user = await user_service.get_user_by_id(int(user_id))
            
            return user
            
        except Exception as e:
            logger.error(f"WebSocket authentication failed: {str(e)}")
            return None
    
    async def connect(self, websocket: WebSocket, user: User, client_info: Dict[str, Any] = None) -> str:
        """Connect a user with WebSocket"""
        await websocket.accept()
        
        connection_id = self._generate_connection_id()
        
        # Store connection
        self.active_connections[connection_id] = websocket
        
        # Associate user with connection
        if user.id not in self.user_connections:
            self.user_connections[user.id] = set()
        self.user_connections[user.id].add(connection_id)
        self.connection_users[connection_id] = user.id
        
        # Update user presence
        self.user_presence[user.id] = datetime.now()
        
        # Store connection metadata
        self.connection_metadata[connection_id] = {
            'user_id': user.id,
            'user_name': user.name,
            'user_email': user.email,
            'connected_at': datetime.now(),
            'client_info': client_info or {},
            'last_activity': datetime.now()
        }
        
        # Initialize rate limiting
        self.message_rates[connection_id] = []
        
        # Initialize room list
        self.connection_rooms[connection_id] = set()
        
        logger.info(f"User {user.id} connected with connection {connection_id}")
        
        # Broadcast user online status
        await self._broadcast_presence_update(user.id, 'online')
        
        # Send connection confirmation
        await self.send_personal_message(connection_id, {
            'type': 'connection_established',
            'connection_id': connection_id,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email
            },
            'timestamp': datetime.now().isoformat()
        })
        
        return connection_id
    
    async def disconnect(self, connection_id: str):
        """Disconnect a WebSocket connection"""
        try:
            # Get user ID before cleanup
            user_id = self.connection_users.get(connection_id)
            
            # Remove from active connections
            if connection_id in self.active_connections:
                del self.active_connections[connection_id]
            
            # Remove from user connections
            if user_id and user_id in self.user_connections:
                self.user_connections[user_id].discard(connection_id)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]
                    # User is completely offline
                    await self._broadcast_presence_update(user_id, 'offline')
            
            # Remove user association
            if connection_id in self.connection_users:
                del self.connection_users[connection_id]
            
            # Leave all rooms
            if connection_id in self.connection_rooms:
                for room_name in self.connection_rooms[connection_id].copy():
                    await self.leave_room(connection_id, room_name)
                del self.connection_rooms[connection_id]
            
            # Clean up metadata and rate limiting
            if connection_id in self.connection_metadata:
                del self.connection_metadata[connection_id]
            if connection_id in self.message_rates:
                del self.message_rates[connection_id]
            
            logger.info(f"Connection {connection_id} disconnected")
            
        except Exception as e:
            logger.error(f"Error during disconnect: {str(e)}")
    
    async def join_room(self, connection_id: str, room_name: str):
        """Join a user to a room"""
        try:
            # Add to room
            if room_name not in self.room_connections:
                self.room_connections[room_name] = set()
            self.room_connections[room_name].add(connection_id)
            
            # Add to connection's room list
            if connection_id not in self.connection_rooms:
                self.connection_rooms[connection_id] = set()
            self.connection_rooms[connection_id].add(room_name)
            
            # Notify room members
            user_id = self.connection_users.get(connection_id)
            if user_id:
                await self.broadcast_to_room(room_name, {
                    'type': 'user_joined_room',
                    'room': room_name,
                    'user_id': user_id,
                    'timestamp': datetime.now().isoformat()
                }, exclude_connections={connection_id})
            
            logger.info(f"Connection {connection_id} joined room {room_name}")
            
        except Exception as e:
            logger.error(f"Error joining room: {str(e)}")
    
    async def leave_room(self, connection_id: str, room_name: str):
        """Remove user from a room"""
        try:
            # Remove from room
            if room_name in self.room_connections:
                self.room_connections[room_name].discard(connection_id)
                if not self.room_connections[room_name]:
                    del self.room_connections[room_name]
            
            # Remove from connection's room list
            if connection_id in self.connection_rooms:
                self.connection_rooms[connection_id].discard(room_name)
            
            # Notify room members
            user_id = self.connection_users.get(connection_id)
            if user_id:
                await self.broadcast_to_room(room_name, {
                    'type': 'user_left_room',
                    'room': room_name,
                    'user_id': user_id,
                    'timestamp': datetime.now().isoformat()
                }, exclude_connections={connection_id})
            
            logger.info(f"Connection {connection_id} left room {room_name}")
            
        except Exception as e:
            logger.error(f"Error leaving room: {str(e)}")
    
    async def send_personal_message(self, connection_id: str, message: Dict[str, Any]):
        """Send message to specific connection"""
        try:
            websocket = self.active_connections.get(connection_id)
            if websocket:
                await websocket.send_text(json.dumps(message))
                
                # Update last activity
                if connection_id in self.connection_metadata:
                    self.connection_metadata[connection_id]['last_activity'] = datetime.now()
            
        except Exception as e:
            logger.error(f"Error sending personal message: {str(e)}")
            # Connection might be stale, clean it up
            await self.disconnect(connection_id)
    
    async def broadcast_to_user(self, user_id: int, message: Dict[str, Any]):
        """Send message to all connections of a user"""
        if user_id in self.user_connections:
            for connection_id in self.user_connections[user_id].copy():
                await self.send_personal_message(connection_id, message)
    
    async def broadcast_to_room(self, room_name: str, message: Dict[str, Any], 
                              exclude_connections: Set[str] = None):
        """Broadcast message to all users in a room"""
        if room_name in self.room_connections:
            exclude_connections = exclude_connections or set()
            
            for connection_id in self.room_connections[room_name].copy():
                if connection_id not in exclude_connections:
                    await self.send_personal_message(connection_id, message)
        
        # Also broadcast via Redis for other instances
        if self.redis_publisher:
            try:
                redis_message = {
                    'type': 'room_broadcast',
                    'room': room_name,
                    'message': message,
                    'exclude_connections': list(exclude_connections or [])
                }
                await self.redis_publisher.publish('websocket_broadcast', json.dumps(redis_message))
            except Exception as e:
                logger.error(f"Redis broadcast failed: {str(e)}")
    
    async def _broadcast_presence_update(self, user_id: int, status: str):
        """Broadcast user presence update"""
        presence_message = {
            'type': 'presence_update',
            'user_id': user_id,
            'status': status,
            'timestamp': datetime.now().isoformat()
        }
        
        # Broadcast to all active connections (could be optimized to relevant rooms only)
        for connection_id in self.active_connections.keys():
            await self.send_personal_message(connection_id, presence_message)
    
    async def _redis_subscriber_loop(self):
        """Redis subscriber loop for cross-instance messaging"""
        try:
            pubsub = self.redis_subscriber.pubsub()
            await pubsub.subscribe('websocket_broadcast')
            
            async for message in pubsub.listen():
                if message['type'] == 'message':
                    try:
                        data = json.loads(message['data'])
                        await self._handle_redis_message(data)
                    except Exception as e:
                        logger.error(f"Error handling Redis message: {str(e)}")
                        
        except Exception as e:
            logger.error(f"Redis subscriber error: {str(e)}")
    
    async def _handle_redis_message(self, data: Dict[str, Any]):
        """Handle messages from Redis pub/sub"""
        try:
            if data['type'] == 'room_broadcast':
                room_name = data['room']
                message = data['message']
                exclude_connections = set(data.get('exclude_connections', []))
                
                # Broadcast locally (excluding connections from other instances)
                if room_name in self.room_connections:
                    for connection_id in self.room_connections[room_name].copy():
                        if connection_id not in exclude_connections:
                            await self.send_personal_message(connection_id, message)
                            
        except Exception as e:
            logger.error(f"Error handling Redis message: {str(e)}")
    
    def check_rate_limit(self, connection_id: str, max_messages: int = 30, window_seconds: int = 60) -> bool:
        """Check if connection is within rate limits"""
        now = time.time()
        
        if connection_id not in self.message_rates:
            self.message_rates[connection_id] = []
        
        # Clean old timestamps
        self.message_rates[connection_id] = [
            ts for ts in self.message_rates[connection_id] 
            if now - ts < window_seconds
        ]
        
        # Check limit
        if len(self.message_rates[connection_id]) >= max_messages:
            return False
        
        # Add current timestamp
        self.message_rates[connection_id].append(now)
        return True
    
    def encrypt_sensitive_message(self, message: str) -> str:
        """Encrypt sensitive message content"""
        return self.cipher_suite.encrypt(message.encode()).decode()
    
    def decrypt_sensitive_message(self, encrypted_message: str) -> str:
        """Decrypt sensitive message content"""
        return self.cipher_suite.decrypt(encrypted_message.encode()).decode()
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            'total_connections': len(self.active_connections),
            'unique_users': len(self.user_connections),
            'total_rooms': len(self.room_connections),
            'connections_by_room': {
                room: len(connections) 
                for room, connections in self.room_connections.items()
            },
            'online_users': list(self.user_presence.keys()),
            'timestamp': datetime.now().isoformat()
        }
    
    async def cleanup_stale_connections(self, timeout_minutes: int = 30):
        """Clean up stale connections"""
        cutoff_time = datetime.now() - timedelta(minutes=timeout_minutes)
        stale_connections = []
        
        for connection_id, metadata in self.connection_metadata.items():
            if metadata['last_activity'] < cutoff_time:
                stale_connections.append(connection_id)
        
        for connection_id in stale_connections:
            logger.info(f"Cleaning up stale connection: {connection_id}")
            await self.disconnect(connection_id)
        
        return len(stale_connections)


# Global connection manager instance
connection_manager = ConnectionManager() 