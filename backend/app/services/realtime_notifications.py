"""
Real-time notification service for order updates, quotes, and system events
"""
import asyncio
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from loguru import logger

from app.core.websocket_config import connection_manager
from app.services.message import MessageService
from app.models.user import User
from app.models.order import Order
from app.models.quote import Quote


class RealtimeNotificationService:
    """Service for sending real-time notifications via WebSockets"""
    
    def __init__(self):
        self.message_service = MessageService()
    
    async def notify_order_status_update(self, order: Order, old_status: str, new_status: str,
                                       updated_by: User = None, additional_data: Dict[str, Any] = None):
        """Notify about order status changes"""
        try:
            # Create notification message
            notification = {
                'type': 'order_status_update',
                'order_id': order.id,
                'order_number': getattr(order, 'order_number', f"ORD-{order.id}"),
                'old_status': old_status,
                'new_status': new_status,
                'updated_by': {
                    'id': updated_by.id,
                    'name': updated_by.name,
                    'role': getattr(updated_by, 'role', 'user')
                } if updated_by else None,
                'timestamp': datetime.now().isoformat(),
                'additional_data': additional_data or {}
            }
            
            # Determine recipients
            recipients = set()
            if order.customer_id:
                recipients.add(order.customer_id)
            if order.manufacturer_id:
                recipients.add(order.manufacturer_id)
            
            # Send to order-specific room
            order_room = f"order_{order.id}"
            await connection_manager.broadcast_to_room(order_room, notification)
            
            # Send personal notifications to involved users
            for user_id in recipients:
                await connection_manager.broadcast_to_user(user_id, notification)
            
            # Log the notification
            logger.info(f"Order status notification sent for order {order.id}: {old_status} -> {new_status}")
            
            # Send email notification for critical status changes
            if new_status in ['cancelled', 'completed', 'shipped']:
                await self._send_email_notification_for_order(order, new_status, recipients)
            
        except Exception as e:
            logger.error(f"Error sending order status notification: {str(e)}")
    
    async def notify_new_quote(self, quote: Quote, created_by: User = None):
        """Notify about new quote creation"""
        try:
            notification = {
                'type': 'new_quote',
                'quote_id': quote.id,
                'quote_number': getattr(quote, 'quote_number', f"QUO-{quote.id}"),
                'customer_id': quote.customer_id,
                'manufacturer_id': quote.manufacturer_id,
                'status': quote.status,
                'total_amount': float(quote.total_amount) if quote.total_amount else None,
                'created_by': {
                    'id': created_by.id,
                    'name': created_by.name,
                    'role': getattr(created_by, 'role', 'user')
                } if created_by else None,
                'timestamp': datetime.now().isoformat()
            }
            
            # Send to quote-specific room
            quote_room = f"quote_{quote.id}"
            await connection_manager.broadcast_to_room(quote_room, notification)
            
            # Notify customer
            if quote.customer_id:
                await connection_manager.broadcast_to_user(quote.customer_id, notification)
            
            # Notify manufacturer
            if quote.manufacturer_id:
                await connection_manager.broadcast_to_user(quote.manufacturer_id, notification)
            
            logger.info(f"New quote notification sent for quote {quote.id}")
            
        except Exception as e:
            logger.error(f"Error sending new quote notification: {str(e)}")
    
    async def notify_quote_update(self, quote: Quote, update_type: str, 
                                 updated_by: User = None, additional_data: Dict[str, Any] = None):
        """Notify about quote updates (status, price, etc.)"""
        try:
            notification = {
                'type': 'quote_update',
                'quote_id': quote.id,
                'quote_number': getattr(quote, 'quote_number', f"QUO-{quote.id}"),
                'update_type': update_type,  # 'status_change', 'price_update', 'terms_update'
                'status': quote.status,
                'total_amount': float(quote.total_amount) if quote.total_amount else None,
                'updated_by': {
                    'id': updated_by.id,
                    'name': updated_by.name,
                    'role': getattr(updated_by, 'role', 'user')
                } if updated_by else None,
                'timestamp': datetime.now().isoformat(),
                'additional_data': additional_data or {}
            }
            
            # Send to quote-specific room
            quote_room = f"quote_{quote.id}"
            await connection_manager.broadcast_to_room(quote_room, notification)
            
            # Send to involved users
            recipients = set()
            if quote.customer_id:
                recipients.add(quote.customer_id)
            if quote.manufacturer_id:
                recipients.add(quote.manufacturer_id)
            
            for user_id in recipients:
                await connection_manager.broadcast_to_user(user_id, notification)
            
            logger.info(f"Quote update notification sent for quote {quote.id}: {update_type}")
            
        except Exception as e:
            logger.error(f"Error sending quote update notification: {str(e)}")
    
    async def notify_payment_update(self, payment_id: int, status: str, 
                                   amount: float, user_id: int, 
                                   related_order_id: int = None):
        """Notify about payment status updates"""
        try:
            notification = {
                'type': 'payment_update',
                'payment_id': payment_id,
                'status': status,
                'amount': amount,
                'user_id': user_id,
                'related_order_id': related_order_id,
                'timestamp': datetime.now().isoformat()
            }
            
            # Send to user
            await connection_manager.broadcast_to_user(user_id, notification)
            
            # If related to an order, send to order room
            if related_order_id:
                order_room = f"order_{related_order_id}"
                await connection_manager.broadcast_to_room(order_room, notification)
            
            logger.info(f"Payment notification sent for payment {payment_id}: {status}")
            
        except Exception as e:
            logger.error(f"Error sending payment notification: {str(e)}")
    
    async def notify_system_maintenance(self, message: str, scheduled_time: datetime = None,
                                       duration_minutes: int = None, severity: str = "info"):
        """Notify all users about system maintenance"""
        try:
            notification = {
                'type': 'system_maintenance',
                'message': message,
                'scheduled_time': scheduled_time.isoformat() if scheduled_time else None,
                'duration_minutes': duration_minutes,
                'severity': severity,  # 'info', 'warning', 'critical'
                'timestamp': datetime.now().isoformat()
            }
            
            # Broadcast to all active connections
            for connection_id in connection_manager.active_connections.keys():
                await connection_manager.send_personal_message(connection_id, notification)
            
            logger.info(f"System maintenance notification broadcasted: {message}")
            
        except Exception as e:
            logger.error(f"Error sending system maintenance notification: {str(e)}")
    
    async def notify_user_mention(self, mentioned_user_id: int, mentioned_by: User,
                                 message_content: str, room_name: str, message_id: int):
        """Notify user when mentioned in a message"""
        try:
            notification = {
                'type': 'user_mention',
                'mentioned_by': {
                    'id': mentioned_by.id,
                    'name': mentioned_by.name
                },
                'message_content': message_content[:200],  # Truncate for preview
                'room_name': room_name,
                'message_id': message_id,
                'timestamp': datetime.now().isoformat()
            }
            
            await connection_manager.broadcast_to_user(mentioned_user_id, notification)
            
            logger.info(f"User mention notification sent to user {mentioned_user_id}")
            
        except Exception as e:
            logger.error(f"Error sending user mention notification: {str(e)}")
    
    async def notify_file_upload_complete(self, user_id: int, file_name: str, 
                                         file_id: str, file_size: int, 
                                         related_order_id: int = None, related_quote_id: int = None):
        """Notify about completed file uploads"""
        try:
            notification = {
                'type': 'file_upload_complete',
                'file_name': file_name,
                'file_id': file_id,
                'file_size': file_size,
                'related_order_id': related_order_id,
                'related_quote_id': related_quote_id,
                'timestamp': datetime.now().isoformat()
            }
            
            # Send to uploader
            await connection_manager.broadcast_to_user(user_id, notification)
            
            # If related to order/quote, notify room
            if related_order_id:
                order_room = f"order_{related_order_id}"
                await connection_manager.broadcast_to_room(order_room, notification)
            elif related_quote_id:
                quote_room = f"quote_{related_quote_id}"
                await connection_manager.broadcast_to_room(quote_room, notification)
            
            logger.info(f"File upload notification sent for file {file_name}")
            
        except Exception as e:
            logger.error(f"Error sending file upload notification: {str(e)}")
    
    async def notify_deadline_approaching(self, order_id: int, deadline: datetime,
                                         hours_remaining: int, recipients: List[int]):
        """Notify about approaching deadlines"""
        try:
            notification = {
                'type': 'deadline_approaching',
                'order_id': order_id,
                'deadline': deadline.isoformat(),
                'hours_remaining': hours_remaining,
                'urgency': 'high' if hours_remaining <= 24 else 'medium' if hours_remaining <= 72 else 'low',
                'timestamp': datetime.now().isoformat()
            }
            
            # Send to order room
            order_room = f"order_{order_id}"
            await connection_manager.broadcast_to_room(order_room, notification)
            
            # Send to specific recipients
            for user_id in recipients:
                await connection_manager.broadcast_to_user(user_id, notification)
            
            logger.info(f"Deadline notification sent for order {order_id}: {hours_remaining} hours remaining")
            
        except Exception as e:
            logger.error(f"Error sending deadline notification: {str(e)}")
    
    async def notify_inventory_alert(self, product_id: int, product_name: str, 
                                   current_stock: int, minimum_stock: int,
                                   manufacturer_id: int):
        """Notify about low inventory levels"""
        try:
            notification = {
                'type': 'inventory_alert',
                'product_id': product_id,
                'product_name': product_name,
                'current_stock': current_stock,
                'minimum_stock': minimum_stock,
                'severity': 'critical' if current_stock == 0 else 'high' if current_stock < minimum_stock / 2 else 'medium',
                'timestamp': datetime.now().isoformat()
            }
            
            # Send to manufacturer
            await connection_manager.broadcast_to_user(manufacturer_id, notification)
            
            logger.info(f"Inventory alert sent for product {product_name}: {current_stock} remaining")
            
        except Exception as e:
            logger.error(f"Error sending inventory alert: {str(e)}")
    
    async def notify_quality_check_required(self, order_id: int, check_type: str,
                                          assigned_to: int, deadline: datetime = None):
        """Notify about required quality checks"""
        try:
            notification = {
                'type': 'quality_check_required',
                'order_id': order_id,
                'check_type': check_type,
                'assigned_to': assigned_to,
                'deadline': deadline.isoformat() if deadline else None,
                'timestamp': datetime.now().isoformat()
            }
            
            # Send to assigned user
            await connection_manager.broadcast_to_user(assigned_to, notification)
            
            # Send to order room
            order_room = f"order_{order_id}"
            await connection_manager.broadcast_to_room(order_room, notification)
            
            logger.info(f"Quality check notification sent for order {order_id}")
            
        except Exception as e:
            logger.error(f"Error sending quality check notification: {str(e)}")
    
    async def notify_new_message_in_room(self, room_name: str, sender: User, 
                                        message_preview: str, exclude_user_id: int = None):
        """Notify room participants about new messages (for offline users)"""
        try:
            # Get room participants
            participants = await self._get_room_participants(room_name)
            
            notification = {
                'type': 'new_message_notification',
                'room_name': room_name,
                'sender': {
                    'id': sender.id,
                    'name': sender.name
                },
                'message_preview': message_preview[:100],
                'timestamp': datetime.now().isoformat()
            }
            
            # Send to offline participants only
            for user_id in participants:
                if user_id != exclude_user_id and not await self._is_user_online(user_id):
                    # Queue for offline delivery or send push notification
                    await self._queue_offline_notification(user_id, notification)
            
            logger.info(f"New message notification queued for room {room_name}")
            
        except Exception as e:
            logger.error(f"Error sending new message notification: {str(e)}")
    
    async def send_typing_notification(self, room_name: str, user: User, is_typing: bool):
        """Send typing indicator to room participants"""
        try:
            notification = {
                'type': 'typing_indicator',
                'room_name': room_name,
                'user': {
                    'id': user.id,
                    'name': user.name
                },
                'is_typing': is_typing,
                'timestamp': datetime.now().isoformat()
            }
            
            # Broadcast to room (excluding sender)
            await connection_manager.broadcast_to_room(room_name, notification, 
                                                     exclude_connections=set())
            
            # Update typing status in database
            await self.message_service.update_typing_status(
                user_id=user.id,
                room_name=room_name,
                is_typing=is_typing
            )
            
        except Exception as e:
            logger.error(f"Error sending typing notification: {str(e)}")
    
    async def send_presence_notification(self, user: User, status: str, 
                                       rooms: List[str] = None):
        """Send user presence updates to relevant rooms"""
        try:
            notification = {
                'type': 'presence_update',
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'avatar': getattr(user, 'avatar_url', None)
                },
                'status': status,  # 'online', 'away', 'busy', 'offline'
                'timestamp': datetime.now().isoformat()
            }
            
            # Update online status in database
            await self.message_service.update_online_status(
                user_id=user.id,
                status=status
            )
            
            # Send to specified rooms or all user's rooms
            if rooms:
                for room_name in rooms:
                    await connection_manager.broadcast_to_room(room_name, notification)
            else:
                # Send to all rooms user is in
                user_rooms = await self.message_service.get_user_rooms(user.id)
                for room_data in user_rooms:
                    room_name = room_data['name']
                    await connection_manager.broadcast_to_room(room_name, notification)
            
            logger.info(f"Presence update sent for user {user.id}: {status}")
            
        except Exception as e:
            logger.error(f"Error sending presence notification: {str(e)}")
    
    # Helper methods
    async def _send_email_notification_for_order(self, order: Order, status: str, recipients: set):
        """Send email notifications for critical order updates"""
        try:
            # Import here to avoid circular imports
            from app.tasks.email_tasks import send_email_task
            
            # Send emails to recipients
            for user_id in recipients:
                send_email_task.delay(
                    template_name="order_status_update",
                    recipient_email=None,  # Will be resolved by user_id
                    recipient_user_id=user_id,
                    context={
                        'order_id': order.id,
                        'order_number': getattr(order, 'order_number', f"ORD-{order.id}"),
                        'new_status': status,
                        'order_details': {
                            'customer_name': order.customer.name if order.customer else 'Unknown',
                            'manufacturer_name': order.manufacturer.name if order.manufacturer else 'Unknown',
                            'created_at': order.created_at.isoformat()
                        }
                    }
                )
            
        except Exception as e:
            logger.error(f"Error sending email notification for order: {str(e)}")
    
    async def _get_room_participants(self, room_name: str) -> List[int]:
        """Get list of user IDs who are participants in a room"""
        try:
            # This would query your room participants table
            # For now, return empty list - implement based on your room system
            return []
        except Exception as e:
            logger.error(f"Error getting room participants: {str(e)}")
            return []
    
    async def _is_user_online(self, user_id: int) -> bool:
        """Check if user has active connections"""
        return user_id in connection_manager.user_connections
    
    async def _queue_offline_notification(self, user_id: int, notification: Dict[str, Any]):
        """Queue notification for offline user delivery"""
        try:
            # This could be implemented using:
            # 1. Database storage for offline notifications
            # 2. Push notification service (FCM, APNs)
            # 3. Email notification
            # 4. Redis queue for delivery when user comes online
            
            # For now, just log it
            logger.info(f"Offline notification queued for user {user_id}: {notification['type']}")
            
        except Exception as e:
            logger.error(f"Error queueing offline notification: {str(e)}")
    
    # Batch notification methods
    async def send_bulk_notifications(self, notifications: List[Dict[str, Any]]):
        """Send multiple notifications efficiently"""
        try:
            tasks = []
            
            for notification in notifications:
                notif_type = notification.get('type')
                
                if notif_type == 'order_status_update':
                    task = self.notify_order_status_update(**notification['data'])
                elif notif_type == 'quote_update':
                    task = self.notify_quote_update(**notification['data'])
                elif notif_type == 'payment_update':
                    task = self.notify_payment_update(**notification['data'])
                else:
                    continue
                
                tasks.append(task)
            
            # Execute all notifications concurrently
            await asyncio.gather(*tasks, return_exceptions=True)
            
            logger.info(f"Bulk notifications sent: {len(tasks)} notifications")
            
        except Exception as e:
            logger.error(f"Error sending bulk notifications: {str(e)}")
    
    async def get_notification_statistics(self) -> Dict[str, Any]:
        """Get statistics about sent notifications"""
        try:
            stats = connection_manager.get_connection_stats()
            
            # Add notification-specific stats
            return {
                'connection_stats': stats,
                'active_rooms': len(connection_manager.room_connections),
                'typing_users': len(websocket_handler.typing_users) if hasattr(websocket_handler, 'typing_users') else 0,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting notification statistics: {str(e)}")
            return {}


# Global notification service instance
notification_service = RealtimeNotificationService() 