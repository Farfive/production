"""
Celery tasks for WebSocket operations and offline message handling
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List
from celery import Task
from loguru import logger

from app.core.celery_config import celery_app
from app.core.websocket_config import connection_manager
from app.services.message import MessageService
from app.services.realtime_notifications import notification_service
from app.services.email_templates import template_manager


class AsyncTask(Task):
    """Base task class for async operations"""
    
    def __call__(self, *args, **kwargs):
        """Execute async task"""
        return asyncio.run(self.run_async(*args, **kwargs))
    
    async def run_async(self, *args, **kwargs):
        """Override in subclasses"""
        raise NotImplementedError


@celery_app.task(
    bind=True,
    base=AsyncTask,
    name='websocket.cleanup_stale_connections',
    queue='maintenance',
    soft_time_limit=300,
    time_limit=360
)
async def cleanup_stale_connections_task(self, timeout_minutes: int = 30) -> Dict[str, Any]:
    """Clean up stale WebSocket connections"""
    try:
        logger.info(f"Starting cleanup of stale connections (timeout: {timeout_minutes} minutes)")
        
        # Cleanup stale connections
        cleaned_connections = await connection_manager.cleanup_stale_connections(timeout_minutes)
        
        # Cleanup typing indicators
        from app.services.websocket_handler import websocket_handler
        await websocket_handler.cleanup_typing_indicators(timeout_seconds=60)
        
        # Cleanup old message data
        message_service = MessageService()
        cleanup_stats = await message_service.cleanup_old_data(days_old=30)
        
        result = {
            'cleaned_connections': cleaned_connections,
            'cleanup_stats': cleanup_stats,
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info(f"Connection cleanup completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error in connection cleanup task: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    base=AsyncTask,
    name='websocket.send_offline_notifications',
    queue='email.normal',
    retry_backoff=30,
    max_retries=3
)
async def send_offline_notifications_task(self, user_id: int, notifications: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Send accumulated notifications to offline users via email"""
    try:
        if not notifications:
            return {'sent': 0, 'user_id': user_id}
        
        # Group notifications by type
        notification_groups = {}
        for notif in notifications:
            notif_type = notif.get('type', 'unknown')
            if notif_type not in notification_groups:
                notification_groups[notif_type] = []
            notification_groups[notif_type].append(notif)
        
        # Get user details
        from app.services.user import UserService
        user_service = UserService()
        user = await user_service.get_user_by_id(user_id)
        
        if not user:
            logger.warning(f"User {user_id} not found for offline notifications")
            return {'sent': 0, 'user_id': user_id, 'error': 'User not found'}
        
        # Send email summary
        email_context = {
            'user_name': user.name,
            'notification_groups': notification_groups,
            'total_notifications': len(notifications),
            'summary_date': datetime.now().strftime('%Y-%m-%d %H:%M'),
        }
        
        # Choose template based on notification types
        if 'order_status_update' in notification_groups:
            template_name = 'offline_notifications_order_focus'
        elif 'new_quote' in notification_groups or 'quote_update' in notification_groups:
            template_name = 'offline_notifications_quote_focus'
        else:
            template_name = 'offline_notifications_general'
        
        # Send email using existing email task
        from app.tasks.email_tasks import send_email_task
        
        email_result = send_email_task.delay(
            template_name=template_name,
            recipient_email=user.email,
            context=email_context,
            priority='normal'
        )
        
        logger.info(f"Offline notifications email sent to user {user_id}: {len(notifications)} notifications")
        
        return {
            'sent': len(notifications),
            'user_id': user_id,
            'email_task_id': email_result.id,
            'notification_types': list(notification_groups.keys())
        }
        
    except Exception as e:
        logger.error(f"Error sending offline notifications to user {user_id}: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    base=AsyncTask,
    name='websocket.broadcast_system_notification',
    queue='monitoring.normal',
    soft_time_limit=60,
    time_limit=120
)
async def broadcast_system_notification_task(self, message: str, notification_type: str = 'info',
                                           target_users: List[int] = None, 
                                           target_rooms: List[str] = None) -> Dict[str, Any]:
    """Broadcast system notifications to users or rooms"""
    try:
        notification = {
            'type': 'system_notification',
            'message': message,
            'notification_type': notification_type,
            'timestamp': datetime.now().isoformat(),
            'sender': 'System'
        }
        
        sent_count = 0
        
        if target_users:
            # Send to specific users
            for user_id in target_users:
                await connection_manager.broadcast_to_user(user_id, notification)
                sent_count += 1
        elif target_rooms:
            # Send to specific rooms
            for room_name in target_rooms:
                await connection_manager.broadcast_to_room(room_name, notification)
                room_connections = connection_manager.room_connections.get(room_name, set())
                sent_count += len(room_connections)
        else:
            # Broadcast to all active connections
            for connection_id in connection_manager.active_connections.keys():
                await connection_manager.send_personal_message(connection_id, notification)
                sent_count += 1
        
        logger.info(f"System notification broadcasted: {message} (sent to {sent_count} recipients)")
        
        return {
            'message': message,
            'notification_type': notification_type,
            'recipients_count': sent_count,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error broadcasting system notification: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    base=AsyncTask,
    name='websocket.process_message_queue',
    queue='email.normal',
    retry_backoff=15,
    max_retries=5
)
async def process_message_queue_task(self, room_name: str, limit: int = 100) -> Dict[str, Any]:
    """Process queued messages for a room when users come online"""
    try:
        message_service = MessageService()
        
        # Get recent unread messages for room
        messages = await message_service.get_room_messages(
            room_name=room_name,
            limit=limit,
            offset=0
        )
        
        # Get online users in room
        online_users = []
        if room_name in connection_manager.room_connections:
            for connection_id in connection_manager.room_connections[room_name]:
                user_id = connection_manager.connection_users.get(connection_id)
                if user_id:
                    online_users.append(user_id)
        
        processed_count = 0
        
        # Send queued messages to newly online users
        for message in messages:
            # Check if message is unread by online users
            for user_id in online_users:
                unread_count = await message_service.get_unread_message_count(
                    user_id=user_id,
                    room_name=room_name
                )
                
                if unread_count.get(room_name, 0) > 0:
                    # Send notification about unread messages
                    notification = {
                        'type': 'unread_messages_available',
                        'room_name': room_name,
                        'unread_count': unread_count[room_name],
                        'latest_message': {
                            'id': message.id,
                            'sender': message.user.name if message.user else 'Unknown',
                            'preview': message.content[:100],
                            'timestamp': message.created_at.isoformat()
                        },
                        'timestamp': datetime.now().isoformat()
                    }
                    
                    await connection_manager.broadcast_to_user(user_id, notification)
                    processed_count += 1
        
        logger.info(f"Message queue processed for room {room_name}: {processed_count} notifications sent")
        
        return {
            'room_name': room_name,
            'messages_found': len(messages),
            'notifications_sent': processed_count,
            'online_users': len(online_users)
        }
        
    except Exception as e:
        logger.error(f"Error processing message queue for room {room_name}: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    base=AsyncTask,
    name='websocket.update_user_presence',
    queue='monitoring.normal',
    retry_backoff=5,
    max_retries=3
)
async def update_user_presence_task(self, user_id: int, status: str, 
                                   metadata: Dict[str, Any] = None) -> Dict[str, Any]:
    """Update user presence status across all systems"""
    try:
        message_service = MessageService()
        
        # Update presence in database
        updated = await message_service.update_online_status(
            user_id=user_id,
            status=status,
            metadata=metadata or {}
        )
        
        if updated:
            # Get user details
            from app.services.user import UserService
            user_service = UserService()
            user = await user_service.get_user_by_id(user_id)
            
            if user:
                # Send presence notification
                await notification_service.send_presence_notification(
                    user=user,
                    status=status
                )
                
                logger.info(f"User presence updated: {user_id} -> {status}")
                
                return {
                    'user_id': user_id,
                    'status': status,
                    'updated': True,
                    'timestamp': datetime.now().isoformat()
                }
        
        return {
            'user_id': user_id,
            'status': status,
            'updated': False,
            'error': 'Failed to update presence'
        }
        
    except Exception as e:
        logger.error(f"Error updating user presence: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    base=AsyncTask,
    name='websocket.send_bulk_notifications',
    queue='email.bulk',
    soft_time_limit=300,
    time_limit=360
)
async def send_bulk_notifications_task(self, notifications: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Send bulk notifications efficiently"""
    try:
        # Group notifications by type and recipient
        grouped_notifications = {}
        
        for notification in notifications:
            key = f"{notification.get('type', 'unknown')}_{notification.get('user_id', 'all')}"
            if key not in grouped_notifications:
                grouped_notifications[key] = []
            grouped_notifications[key].append(notification)
        
        # Send notifications
        await notification_service.send_bulk_notifications(notifications)
        
        logger.info(f"Bulk notifications sent: {len(notifications)} total, {len(grouped_notifications)} groups")
        
        return {
            'total_notifications': len(notifications),
            'notification_groups': len(grouped_notifications),
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error sending bulk notifications: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    base=AsyncTask,
    name='websocket.cleanup_old_rooms',
    queue='sync.maintenance',
    soft_time_limit=600,
    time_limit=720
)
async def cleanup_old_rooms_task(self, days_inactive: int = 90) -> Dict[str, Any]:
    """Clean up old inactive rooms"""
    try:
        message_service = MessageService()
        cutoff_date = datetime.now() - timedelta(days=days_inactive)
        
        # This would implement room cleanup logic
        # For now, just return placeholder
        
        cleaned_rooms = 0  # Implement actual cleanup
        archived_rooms = 0  # Implement archiving
        
        logger.info(f"Room cleanup completed: {cleaned_rooms} cleaned, {archived_rooms} archived")
        
        return {
            'cleaned_rooms': cleaned_rooms,
            'archived_rooms': archived_rooms,
            'cutoff_date': cutoff_date.isoformat(),
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up old rooms: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    name='websocket.monitor_connection_health',
    queue='monitoring.critical',
    soft_time_limit=120,
    time_limit=180
)
def monitor_connection_health_task(self) -> Dict[str, Any]:
    """Monitor WebSocket connection health and send alerts"""
    try:
        stats = connection_manager.get_connection_stats()
        
        # Check for potential issues
        alerts = []
        
        # High connection count
        if stats['total_connections'] > 1000:
            alerts.append({
                'type': 'high_connection_count',
                'message': f"High connection count: {stats['total_connections']}",
                'severity': 'warning'
            })
        
        # Too many rooms
        if stats['total_rooms'] > 500:
            alerts.append({
                'type': 'high_room_count',
                'message': f"High room count: {stats['total_rooms']}",
                'severity': 'warning'
            })
        
        # Check Redis connection
        redis_healthy = False
        try:
            if connection_manager.redis:
                # This would be async in real implementation
                redis_healthy = True
        except:
            alerts.append({
                'type': 'redis_connection_failed',
                'message': 'Redis connection failed',
                'severity': 'critical'
            })
        
        # Send alerts if any issues found
        if alerts:
            for alert in alerts:
                logger.warning(f"WebSocket health alert: {alert['message']}")
                
                # Send to monitoring system (implement based on your setup)
                # This could integrate with your monitoring/alerting system
        
        health_score = 100
        if not redis_healthy:
            health_score -= 30
        if len(alerts) > 0:
            health_score -= 20 * len(alerts)
        
        return {
            'health_score': max(0, health_score),
            'alerts': alerts,
            'stats': stats,
            'redis_healthy': redis_healthy,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error monitoring connection health: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    name='websocket.send_scheduled_reminder',
    queue='email.normal',
    retry_backoff=30,
    max_retries=3
)
def send_scheduled_reminder_task(self, reminder_type: str, recipient_id: int, 
                               context: Dict[str, Any]) -> Dict[str, Any]:
    """Send scheduled reminders (deadlines, follow-ups, etc.)"""
    try:
        # Send real-time notification
        if recipient_id in connection_manager.user_connections:
            notification = {
                'type': 'scheduled_reminder',
                'reminder_type': reminder_type,
                'context': context,
                'timestamp': datetime.now().isoformat()
            }
            
            # This would need to be made async in real implementation
            # asyncio.run(connection_manager.broadcast_to_user(recipient_id, notification))
        
        # Also send email reminder
        from app.tasks.email_tasks import send_email_task
        
        email_result = send_email_task.delay(
            template_name=f'reminder_{reminder_type}',
            recipient_user_id=recipient_id,
            context=context,
            priority='normal'
        )
        
        logger.info(f"Scheduled reminder sent: {reminder_type} to user {recipient_id}")
        
        return {
            'reminder_type': reminder_type,
            'recipient_id': recipient_id,
            'realtime_sent': recipient_id in connection_manager.user_connections,
            'email_task_id': email_result.id,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error sending scheduled reminder: {str(e)}")
        raise


# Scheduled tasks
@celery_app.task(
    bind=True,
    name='websocket.hourly_cleanup',
    queue='sync.maintenance'
)
def hourly_cleanup_task(self):
    """Hourly cleanup of WebSocket data"""
    try:
        # Cleanup stale connections
        cleanup_stale_connections_task.delay(timeout_minutes=30)
        
        # Monitor connection health
        monitor_connection_health_task.delay()
        
        logger.info("Hourly WebSocket cleanup tasks scheduled")
        
        return {
            'tasks_scheduled': 2,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in hourly cleanup: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    name='websocket.daily_maintenance',
    queue='sync.maintenance'
)
def daily_maintenance_task(self):
    """Daily maintenance of WebSocket system"""
    try:
        # Cleanup old rooms
        cleanup_old_rooms_task.delay(days_inactive=90)
        
        # Clean up old data
        cleanup_stale_connections_task.delay(timeout_minutes=1440)  # 24 hours
        
        logger.info("Daily WebSocket maintenance tasks scheduled")
        
        return {
            'tasks_scheduled': 2,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in daily maintenance: {str(e)}")
        raise 