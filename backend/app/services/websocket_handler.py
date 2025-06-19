"""
WebSocket message handlers and real-time features
"""
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger

from app.core.websocket_config import connection_manager
from app.services.message import MessageService
from app.services.order import OrderService
from app.services.quote import QuoteService
from app.models.user import User


class WebSocketHandler:
    """Handle WebSocket messages and real-time features"""
    
    def __init__(self):
        self.message_service = MessageService()
        self.order_service = OrderService()
        self.quote_service = QuoteService()
        
        # Typing indicators
        self.typing_users: Dict[str, Dict[int, datetime]] = {}  # room -> {user_id: timestamp}
        
        # Message handlers
        self.handlers = {
            'chat_message': self.handle_chat_message,
            'typing_start': self.handle_typing_start,
            'typing_stop': self.handle_typing_stop,
            'join_room': self.handle_join_room,
            'leave_room': self.handle_leave_room,
            'get_message_history': self.handle_get_message_history,
            'mark_messages_read': self.handle_mark_messages_read,
            'get_online_users': self.handle_get_online_users,
            'ping': self.handle_ping,
            'subscribe_order_updates': self.handle_subscribe_order_updates,
            'subscribe_quote_updates': self.handle_subscribe_quote_updates
        }
    
    async def handle_connection(self, websocket: WebSocket, token: str, client_info: Dict[str, Any] = None):
        """Handle new WebSocket connection"""
        try:
            # Authenticate user
            user = await connection_manager.authenticate_connection(websocket, token)
            if not user:
                await websocket.close(code=4001, reason="Authentication failed")
                return
            
            # Connect user
            connection_id = await connection_manager.connect(websocket, user, client_info)
            
            # Start message loop
            await self._message_loop(websocket, connection_id, user)
            
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected")
        except Exception as e:
            logger.error(f"WebSocket connection error: {str(e)}")
        finally:
            if 'connection_id' in locals():
                await connection_manager.disconnect(connection_id)
    
    async def _message_loop(self, websocket: WebSocket, connection_id: str, user: User):
        """Main message processing loop"""
        try:
            while True:
                # Receive message
                data = await websocket.receive_text()
                
                try:
                    message = json.loads(data)
                except json.JSONDecodeError:
                    await self._send_error(connection_id, "Invalid JSON format")
                    continue
                
                # Check rate limiting
                if not connection_manager.check_rate_limit(connection_id):
                    await self._send_error(connection_id, "Rate limit exceeded")
                    continue
                
                # Route message to handler
                await self._route_message(connection_id, user, message)
                
        except WebSocketDisconnect:
            logger.info(f"WebSocket {connection_id} disconnected")
        except Exception as e:
            logger.error(f"Message loop error: {str(e)}")
    
    async def _route_message(self, connection_id: str, user: User, message: Dict[str, Any]):
        """Route message to appropriate handler"""
        try:
            message_type = message.get('type')
            if not message_type:
                await self._send_error(connection_id, "Missing message type")
                return
            
            handler = self.handlers.get(message_type)
            if not handler:
                await self._send_error(connection_id, f"Unknown message type: {message_type}")
                return
            
            # Add metadata to message
            message['_connection_id'] = connection_id
            message['_user'] = user
            message['_timestamp'] = datetime.now().isoformat()
            
            # Call handler
            await handler(message)
            
        except Exception as e:
            logger.error(f"Message routing error: {str(e)}")
            await self._send_error(connection_id, "Internal server error")
    
    async def _send_error(self, connection_id: str, error_message: str):
        """Send error message to connection"""
        await connection_manager.send_personal_message(connection_id, {
            'type': 'error',
            'message': error_message,
            'timestamp': datetime.now().isoformat()
        })
    
    async def handle_chat_message(self, message: Dict[str, Any]):
        """Handle chat message"""
        try:
            connection_id = message['_connection_id']
            user = message['_user']
            
            room_name = message.get('room')
            content = message.get('content')
            message_type = message.get('message_type', 'text')
            
            if not room_name or not content:
                await self._send_error(connection_id, "Missing room or content")
                return
            
            # Validate room access
            if not await self._validate_room_access(user.id, room_name):
                await self._send_error(connection_id, "Access denied to room")
                return
            
            # Check for sensitive content and encrypt if needed
            encrypted_content = content
            is_encrypted = False
            if self._is_sensitive_content(content, message_type):
                encrypted_content = connection_manager.encrypt_sensitive_message(content)
                is_encrypted = True
            
            # Save message to database
            saved_message = await self.message_service.save_message(
                user_id=user.id,
                room_name=room_name,
                content=encrypted_content,
                message_type=message_type,
                is_encrypted=is_encrypted,
                metadata=message.get('metadata', {})
            )
            
            # Broadcast to room
            broadcast_message = {
                'type': 'chat_message',
                'message_id': saved_message.id,
                'room': room_name,
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'avatar': getattr(user, 'avatar_url', None)
                },
                'content': content if not is_encrypted else '[Encrypted Message]',
                'message_type': message_type,
                'timestamp': saved_message.created_at.isoformat(),
                'is_encrypted': is_encrypted
            }
            
            await connection_manager.broadcast_to_room(room_name, broadcast_message)
            
            # Send delivery confirmation to sender
            await connection_manager.send_personal_message(connection_id, {
                'type': 'message_sent',
                'message_id': saved_message.id,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Chat message error: {str(e)}")
            await self._send_error(message['_connection_id'], "Failed to send message")
    
    async def handle_typing_start(self, message: Dict[str, Any]):
        """Handle typing start indicator"""
        try:
            user = message['_user']
            room_name = message.get('room')
            
            if not room_name:
                return
            
            # Validate room access
            if not await self._validate_room_access(user.id, room_name):
                return
            
            # Update typing status
            if room_name not in self.typing_users:
                self.typing_users[room_name] = {}
            
            self.typing_users[room_name][user.id] = datetime.now()
            
            # Broadcast typing indicator
            await connection_manager.broadcast_to_room(room_name, {
                'type': 'typing_start',
                'room': room_name,
                'user': {
                    'id': user.id,
                    'name': user.name
                },
                'timestamp': datetime.now().isoformat()
            }, exclude_connections={message['_connection_id']})
            
        except Exception as e:
            logger.error(f"Typing start error: {str(e)}")
    
    async def handle_typing_stop(self, message: Dict[str, Any]):
        """Handle typing stop indicator"""
        try:
            user = message['_user']
            room_name = message.get('room')
            
            if not room_name:
                return
            
            # Remove from typing status
            if room_name in self.typing_users:
                self.typing_users[room_name].pop(user.id, None)
                
                if not self.typing_users[room_name]:
                    del self.typing_users[room_name]
            
            # Broadcast typing stop
            await connection_manager.broadcast_to_room(room_name, {
                'type': 'typing_stop',
                'room': room_name,
                'user': {
                    'id': user.id,
                    'name': user.name
                },
                'timestamp': datetime.now().isoformat()
            }, exclude_connections={message['_connection_id']})
            
        except Exception as e:
            logger.error(f"Typing stop error: {str(e)}")
    
    async def handle_join_room(self, message: Dict[str, Any]):
        """Handle room join request"""
        try:
            connection_id = message['_connection_id']
            user = message['_user']
            room_name = message.get('room')
            
            if not room_name:
                await self._send_error(connection_id, "Missing room name")
                return
            
            # Validate room access
            if not await self._validate_room_access(user.id, room_name):
                await self._send_error(connection_id, "Access denied to room")
                return
            
            # Join room
            await connection_manager.join_room(connection_id, room_name)
            
            # Send confirmation
            await connection_manager.send_personal_message(connection_id, {
                'type': 'room_joined',
                'room': room_name,
                'timestamp': datetime.now().isoformat()
            })
            
            # Send recent message history
            await self._send_recent_messages(connection_id, room_name, limit=20)
            
        except Exception as e:
            logger.error(f"Join room error: {str(e)}")
            await self._send_error(message['_connection_id'], "Failed to join room")
    
    async def handle_leave_room(self, message: Dict[str, Any]):
        """Handle room leave request"""
        try:
            connection_id = message['_connection_id']
            room_name = message.get('room')
            
            if not room_name:
                await self._send_error(connection_id, "Missing room name")
                return
            
            # Leave room
            await connection_manager.leave_room(connection_id, room_name)
            
            # Send confirmation
            await connection_manager.send_personal_message(connection_id, {
                'type': 'room_left',
                'room': room_name,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Leave room error: {str(e)}")
    
    async def handle_get_message_history(self, message: Dict[str, Any]):
        """Handle message history request"""
        try:
            connection_id = message['_connection_id']
            user = message['_user']
            room_name = message.get('room')
            limit = min(message.get('limit', 50), 100)  # Max 100 messages
            offset = message.get('offset', 0)
            
            if not room_name:
                await self._send_error(connection_id, "Missing room name")
                return
            
            # Validate room access
            if not await self._validate_room_access(user.id, room_name):
                await self._send_error(connection_id, "Access denied to room")
                return
            
            # Get message history
            messages = await self.message_service.get_room_messages(
                room_name=room_name,
                limit=limit,
                offset=offset
            )
            
            # Decrypt encrypted messages for authorized user
            formatted_messages = []
            for msg in messages:
                content = msg.content
                if msg.is_encrypted and await self._can_decrypt_message(user.id, msg):
                    try:
                        content = connection_manager.decrypt_sensitive_message(msg.content)
                    except:
                        content = '[Decryption Failed]'
                
                formatted_messages.append({
                    'message_id': msg.id,
                    'user': {
                        'id': msg.user_id,
                        'name': msg.user.name if msg.user else 'Unknown',
                        'avatar': getattr(msg.user, 'avatar_url', None) if msg.user else None
                    },
                    'content': content,
                    'message_type': msg.message_type,
                    'timestamp': msg.created_at.isoformat(),
                    'is_encrypted': msg.is_encrypted,
                    'edited_at': msg.edited_at.isoformat() if msg.edited_at else None
                })
            
            # Send message history
            await connection_manager.send_personal_message(connection_id, {
                'type': 'message_history',
                'room': room_name,
                'messages': formatted_messages,
                'has_more': len(messages) == limit,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Message history error: {str(e)}")
            await self._send_error(message['_connection_id'], "Failed to get message history")
    
    async def handle_mark_messages_read(self, message: Dict[str, Any]):
        """Handle mark messages as read"""
        try:
            user = message['_user']
            room_name = message.get('room')
            message_ids = message.get('message_ids', [])
            
            if not room_name:
                return
            
            # Mark messages as read
            await self.message_service.mark_messages_read(
                user_id=user.id,
                room_name=room_name,
                message_ids=message_ids
            )
            
        except Exception as e:
            logger.error(f"Mark messages read error: {str(e)}")
    
    async def handle_get_online_users(self, message: Dict[str, Any]):
        """Handle get online users request"""
        try:
            connection_id = message['_connection_id']
            room_name = message.get('room')
            
            if room_name:
                # Get users in specific room
                online_users = await self._get_room_online_users(room_name)
            else:
                # Get all online users
                online_users = await self._get_all_online_users()
            
            await connection_manager.send_personal_message(connection_id, {
                'type': 'online_users',
                'room': room_name,
                'users': online_users,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Get online users error: {str(e)}")
    
    async def handle_ping(self, message: Dict[str, Any]):
        """Handle ping message for connection health"""
        try:
            connection_id = message['_connection_id']
            
            await connection_manager.send_personal_message(connection_id, {
                'type': 'pong',
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Ping error: {str(e)}")
    
    async def handle_subscribe_order_updates(self, message: Dict[str, Any]):
        """Subscribe to order status updates"""
        try:
            connection_id = message['_connection_id']
            user = message['_user']
            order_id = message.get('order_id')
            
            if not order_id:
                await self._send_error(connection_id, "Missing order_id")
                return
            
            # Validate access to order
            if not await self._validate_order_access(user.id, order_id):
                await self._send_error(connection_id, "Access denied to order")
                return
            
            # Join order-specific room
            order_room = f"order_{order_id}"
            await connection_manager.join_room(connection_id, order_room)
            
            # Send confirmation
            await connection_manager.send_personal_message(connection_id, {
                'type': 'subscribed_order_updates',
                'order_id': order_id,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Subscribe order updates error: {str(e)}")
    
    async def handle_subscribe_quote_updates(self, message: Dict[str, Any]):
        """Subscribe to quote updates"""
        try:
            connection_id = message['_connection_id']
            user = message['_user']
            quote_id = message.get('quote_id')
            
            if not quote_id:
                await self._send_error(connection_id, "Missing quote_id")
                return
            
            # Validate access to quote
            if not await self._validate_quote_access(user.id, quote_id):
                await self._send_error(connection_id, "Access denied to quote")
                return
            
            # Join quote-specific room
            quote_room = f"quote_{quote_id}"
            await connection_manager.join_room(connection_id, quote_room)
            
            # Send confirmation
            await connection_manager.send_personal_message(connection_id, {
                'type': 'subscribed_quote_updates',
                'quote_id': quote_id,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Subscribe quote updates error: {str(e)}")
    
    async def _validate_room_access(self, user_id: int, room_name: str) -> bool:
        """Validate if user has access to room"""
        try:
            # Room naming convention: order_{id}, quote_{id}, user_{id1}_{id2}
            if room_name.startswith('order_'):
                order_id = int(room_name.split('_')[1])
                return await self._validate_order_access(user_id, order_id)
            elif room_name.startswith('quote_'):
                quote_id = int(room_name.split('_')[1])
                return await self._validate_quote_access(user_id, quote_id)
            elif room_name.startswith('user_'):
                # Direct message room
                user_ids = [int(uid) for uid in room_name.split('_')[1:]]
                return user_id in user_ids
            else:
                # Public room or custom validation
                return True
                
        except:
            return False
    
    async def _validate_order_access(self, user_id: int, order_id: int) -> bool:
        """Validate if user has access to order"""
        try:
            order = await self.order_service.get_order(order_id)
            if not order:
                return False
            
            # Customer or assigned manufacturer can access
            return (order.customer_id == user_id or 
                   order.manufacturer_id == user_id)
        except:
            return False
    
    async def _validate_quote_access(self, user_id: int, quote_id: int) -> bool:
        """Validate if user has access to quote"""
        try:
            quote = await self.quote_service.get_quote(quote_id)
            if not quote:
                return False
            
            # Customer or manufacturer can access
            return (quote.customer_id == user_id or 
                   quote.manufacturer_id == user_id)
        except:
            return False
    
    def _is_sensitive_content(self, content: str, message_type: str) -> bool:
        """Check if message contains sensitive content requiring encryption"""
        sensitive_keywords = [
            'payment', 'price', 'cost', 'invoice', 'bank', 'account',
            'credit', 'debit', 'personal', 'address', 'phone', 'email'
        ]
        
        if message_type in ['payment', 'personal_info', 'financial']:
            return True
        
        content_lower = content.lower()
        return any(keyword in content_lower for keyword in sensitive_keywords)
    
    async def _can_decrypt_message(self, user_id: int, message) -> bool:
        """Check if user can decrypt encrypted message"""
        # Users involved in the conversation can decrypt
        room_name = message.room_name
        return await self._validate_room_access(user_id, room_name)
    
    async def _send_recent_messages(self, connection_id: str, room_name: str, limit: int = 20):
        """Send recent messages for a room"""
        try:
            user_id = connection_manager.connection_users.get(connection_id)
            if not user_id:
                return
            
            messages = await self.message_service.get_room_messages(
                room_name=room_name,
                limit=limit,
                offset=0
            )
            
            formatted_messages = []
            for msg in messages:
                content = msg.content
                if msg.is_encrypted:
                    try:
                        content = connection_manager.decrypt_sensitive_message(msg.content)
                    except:
                        content = '[Encrypted Message]'
                
                formatted_messages.append({
                    'message_id': msg.id,
                    'user': {
                        'id': msg.user_id,
                        'name': msg.user.name if msg.user else 'Unknown'
                    },
                    'content': content,
                    'message_type': msg.message_type,
                    'timestamp': msg.created_at.isoformat()
                })
            
            await connection_manager.send_personal_message(connection_id, {
                'type': 'recent_messages',
                'room': room_name,
                'messages': list(reversed(formatted_messages)),  # Most recent first
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Send recent messages error: {str(e)}")
    
    async def _get_room_online_users(self, room_name: str) -> List[Dict[str, Any]]:
        """Get online users in a specific room"""
        try:
            online_users = []
            
            if room_name in connection_manager.room_connections:
                user_ids = set()
                for connection_id in connection_manager.room_connections[room_name]:
                    user_id = connection_manager.connection_users.get(connection_id)
                    if user_id:
                        user_ids.add(user_id)
                
                # Get user details (you'll need to implement this)
                from app.services.user import UserService
                user_service = UserService()
                
                for user_id in user_ids:
                    user = await user_service.get_user_by_id(user_id)
                    if user:
                        online_users.append({
                            'id': user.id,
                            'name': user.name,
                            'avatar': getattr(user, 'avatar_url', None),
                            'status': 'online'
                        })
            
            return online_users
            
        except Exception as e:
            logger.error(f"Get room online users error: {str(e)}")
            return []
    
    async def _get_all_online_users(self) -> List[Dict[str, Any]]:
        """Get all online users"""
        try:
            online_users = []
            
            # Get unique user IDs from connections
            user_ids = set(connection_manager.user_connections.keys())
            
            # Get user details
            from app.services.user import UserService
            user_service = UserService()
            
            for user_id in user_ids:
                user = await user_service.get_user_by_id(user_id)
                if user:
                    online_users.append({
                        'id': user.id,
                        'name': user.name,
                        'avatar': getattr(user, 'avatar_url', None),
                        'status': 'online'
                    })
            
            return online_users
            
        except Exception as e:
            logger.error(f"Get all online users error: {str(e)}")
            return []
    
    async def cleanup_typing_indicators(self, timeout_seconds: int = 10):
        """Clean up stale typing indicators"""
        cutoff_time = datetime.now() - timedelta(seconds=timeout_seconds)
        
        for room_name in list(self.typing_users.keys()):
            stale_users = []
            
            for user_id, timestamp in self.typing_users[room_name].items():
                if timestamp < cutoff_time:
                    stale_users.append(user_id)
            
            for user_id in stale_users:
                del self.typing_users[room_name][user_id]
                
                # Broadcast typing stop
                await connection_manager.broadcast_to_room(room_name, {
                    'type': 'typing_stop',
                    'room': room_name,
                    'user_id': user_id,
                    'timestamp': datetime.now().isoformat(),
                    'reason': 'timeout'
                })
            
            if not self.typing_users[room_name]:
                del self.typing_users[room_name]


# Global WebSocket handler instance
websocket_handler = WebSocketHandler() 