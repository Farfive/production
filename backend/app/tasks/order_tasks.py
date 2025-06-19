"""
Order processing and matching tasks with intelligent algorithms and notifications
"""
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from celery import current_app
from celery.exceptions import Retry
from sqlalchemy.orm import Session
from loguru import logger

from app.core.celery_config import celery_app
from app.core.database import get_db
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.models.manufacturer import Manufacturer
from app.services.matching import OrderMatchingService
from app.services.notification import NotificationService
from app.services.order import OrderService


@celery_app.task(bind=True, max_retries=3, default_retry_delay=120)
def match_orders(self, order_id: int) -> Dict[str, Any]:
    """
    Intelligent order matching with manufacturers
    Priority: CRITICAL
    """
    try:
        matching_service = OrderMatchingService()
        order_service = OrderService()
        
        logger.info(f"Starting order matching for order {order_id}")
        
        # Get order details
        order = asyncio.run(order_service.get_order(order_id))
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        # Find matching manufacturers
        matches = asyncio.run(matching_service.find_matches(order))
        
        if not matches:
            logger.warning(f"No matches found for order {order_id}")
            
            # Schedule retry with broader criteria
            broaden_search_criteria.delay(order_id)
            
            # Notify customer about delay
            send_order_notifications.delay(
                order_id=order_id,
                notification_type='no_matches_found',
                recipients=['customer']
            )
            
            return {
                'status': 'no_matches',
                'order_id': order_id,
                'retry_scheduled': True
            }
        
        # Score and rank matches
        scored_matches = asyncio.run(matching_service.score_matches(order, matches))
        
        # Update order with potential matches
        asyncio.run(order_service.update_order_matches(order_id, scored_matches))
        
        # Send notifications to top manufacturers
        top_matches = scored_matches[:5]  # Top 5 matches
        for match in top_matches:
            send_order_notifications.delay(
                order_id=order_id,
                notification_type='new_order_match',
                recipients=['manufacturer'],
                manufacturer_id=match['manufacturer_id'],
                match_score=match['score']
            )
        
        # Notify customer about matches found
        send_order_notifications.delay(
            order_id=order_id,
            notification_type='matches_found',
            recipients=['customer'],
            match_count=len(scored_matches)
        )
        
        logger.info(f"Order matching completed for order {order_id}. Found {len(scored_matches)} matches")
        
        return {
            'status': 'success',
            'order_id': order_id,
            'matches_found': len(scored_matches),
            'top_score': scored_matches[0]['score'] if scored_matches else 0
        }
        
    except Exception as exc:
        logger.error(f"Order matching failed for order {order_id}: {str(exc)}")
        
        if self.request.retries < self.max_retries:
            countdown = 120 * (2 ** self.request.retries)  # Exponential backoff
            raise self.retry(countdown=countdown, exc=exc)
        else:
            # Handle permanent failure
            handle_matching_failure.delay(order_id, str(exc))
            return {
                'status': 'failed',
                'order_id': order_id,
                'error': str(exc)
            }


@celery_app.task
def send_order_notifications(order_id: int, notification_type: str, recipients: List[str],
                           manufacturer_id: int = None, match_score: float = None,
                           match_count: int = None) -> Dict[str, Any]:
    """
    Send order-related notifications to various recipients
    Priority: NORMAL
    """
    try:
        notification_service = NotificationService()
        order_service = OrderService()
        
        # Get order details
        order = asyncio.run(order_service.get_order(order_id))
        
        notifications_sent = []
        
        for recipient_type in recipients:
            if recipient_type == 'customer':
                result = asyncio.run(
                    notification_service.send_customer_notification(
                        user_id=order['customer_id'],
                        notification_type=notification_type,
                        order_id=order_id,
                        data={
                            'match_count': match_count,
                            'order_details': order
                        }
                    )
                )
                notifications_sent.append({
                    'recipient': 'customer',
                    'user_id': order['customer_id'],
                    'status': 'sent' if result else 'failed'
                })
                
            elif recipient_type == 'manufacturer' and manufacturer_id:
                result = asyncio.run(
                    notification_service.send_manufacturer_notification(
                        manufacturer_id=manufacturer_id,
                        notification_type=notification_type,
                        order_id=order_id,
                        data={
                            'match_score': match_score,
                            'order_details': order
                        }
                    )
                )
                notifications_sent.append({
                    'recipient': 'manufacturer',
                    'manufacturer_id': manufacturer_id,
                    'status': 'sent' if result else 'failed'
                })
        
        logger.info(f"Sent {len(notifications_sent)} notifications for order {order_id}")
        
        return {
            'status': 'completed',
            'order_id': order_id,
            'notifications_sent': notifications_sent
        }
        
    except Exception as exc:
        logger.error(f"Failed to send order notifications: {str(exc)}")
        raise


@celery_app.task
def update_order_status(order_id: int, status: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Update order status with proper notifications and logging
    Priority: NORMAL
    """
    try:
        order_service = OrderService()
        
        # Update order status
        result = asyncio.run(order_service.update_order_status(
            order_id=order_id,
            status=status,
            metadata=metadata or {}
        ))
        
        if result:
            logger.info(f"Order {order_id} status updated to {status}")
            
            # Send appropriate notifications based on status
            if status == OrderStatus.ACCEPTED:
                send_order_notifications.delay(
                    order_id=order_id,
                    notification_type='order_accepted',
                    recipients=['customer']
                )
            elif status == OrderStatus.IN_PRODUCTION:
                send_order_notifications.delay(
                    order_id=order_id,
                    notification_type='production_started',
                    recipients=['customer']
                )
            elif status == OrderStatus.COMPLETED:
                send_order_notifications.delay(
                    order_id=order_id,
                    notification_type='order_completed',
                    recipients=['customer']
                )
                
                # Trigger quality check
                schedule_quality_check.delay(order_id)
                
            elif status == OrderStatus.CANCELLED:
                send_order_notifications.delay(
                    order_id=order_id,
                    notification_type='order_cancelled',
                    recipients=['customer', 'manufacturer']
                )
        
        return {
            'status': 'success',
            'order_id': order_id,
            'new_status': status
        }
        
    except Exception as exc:
        logger.error(f"Failed to update order status: {str(exc)}")
        raise


@celery_app.task
def process_pending_orders() -> Dict[str, Any]:
    """
    Process orders that are pending matching or action
    Scheduled task - runs every 15 minutes
    """
    try:
        order_service = OrderService()
        
        # Get pending orders
        pending_orders = asyncio.run(order_service.get_pending_orders())
        
        processed = 0
        for order in pending_orders:
            try:
                # Check if order needs matching
                if order['status'] == OrderStatus.PENDING and not order.get('matches'):
                    match_orders.delay(order['id'])
                    processed += 1
                    
                # Check for expired quotes
                elif order['status'] == OrderStatus.QUOTED:
                    quote_age = datetime.now() - datetime.fromisoformat(order['quoted_at'])
                    if quote_age > timedelta(days=7):  # Quotes expire after 7 days
                        expire_quote.delay(order['id'])
                        processed += 1
                        
                # Check for stale in-progress orders
                elif order['status'] == OrderStatus.IN_PRODUCTION:
                    production_age = datetime.now() - datetime.fromisoformat(order['production_started_at'])
                    expected_duration = timedelta(days=order.get('estimated_days', 30))
                    
                    if production_age > expected_duration * 1.2:  # 20% overdue
                        send_order_notifications.delay(
                            order_id=order['id'],
                            notification_type='production_overdue',
                            recipients=['customer', 'manufacturer']
                        )
                        processed += 1
                    
            except Exception as e:
                logger.error(f"Error processing pending order {order['id']}: {str(e)}")
        
        logger.info(f"Processed {processed} pending orders")
        
        return {
            'status': 'completed',
            'total_pending': len(pending_orders),
            'processed': processed
        }
        
    except Exception as exc:
        logger.error(f"Failed to process pending orders: {str(exc)}")
        raise


@celery_app.task
def send_order_reminders() -> Dict[str, Any]:
    """
    Send reminders for orders requiring action
    Scheduled task - runs every 6 hours
    """
    try:
        order_service = OrderService()
        
        # Get orders needing reminders
        reminder_orders = asyncio.run(order_service.get_orders_needing_reminders())
        
        reminders_sent = 0
        for order in reminder_orders:
            try:
                if order['status'] == OrderStatus.QUOTED:
                    # Remind customer to accept/reject quote
                    send_order_notifications.delay(
                        order_id=order['id'],
                        notification_type='quote_reminder',
                        recipients=['customer']
                    )
                    reminders_sent += 1
                    
                elif order['status'] == OrderStatus.PENDING:
                    # Remind about no matches found
                    send_order_notifications.delay(
                        order_id=order['id'],
                        notification_type='matching_reminder',
                        recipients=['customer']
                    )
                    reminders_sent += 1
                    
                elif order['status'] == OrderStatus.ACCEPTED:
                    # Remind manufacturer to start production
                    send_order_notifications.delay(
                        order_id=order['id'],
                        notification_type='production_reminder',
                        recipients=['manufacturer']
                    )
                    reminders_sent += 1
                    
            except Exception as e:
                logger.error(f"Error sending reminder for order {order['id']}: {str(e)}")
        
        logger.info(f"Sent {reminders_sent} order reminders")
        
        return {
            'status': 'completed',
            'reminders_sent': reminders_sent
        }
        
    except Exception as exc:
        logger.error(f"Failed to send order reminders: {str(exc)}")
        raise


@celery_app.task
def cleanup_expired_orders() -> Dict[str, Any]:
    """
    Clean up orders that have expired or been abandoned
    Scheduled task - runs daily
    """
    try:
        order_service = OrderService()
        
        # Get expired orders
        expired_orders = asyncio.run(order_service.get_expired_orders())
        
        cleaned_up = 0
        for order in expired_orders:
            try:
                # Archive expired order
                asyncio.run(order_service.archive_order(order['id']))
                
                # Send final notification
                send_order_notifications.delay(
                    order_id=order['id'],
                    notification_type='order_expired',
                    recipients=['customer']
                )
                
                cleaned_up += 1
                
            except Exception as e:
                logger.error(f"Error cleaning up expired order {order['id']}: {str(e)}")
        
        logger.info(f"Cleaned up {cleaned_up} expired orders")
        
        return {
            'status': 'completed',
            'cleaned_up': cleaned_up
        }
        
    except Exception as exc:
        logger.error(f"Failed to cleanup expired orders: {str(exc)}")
        raise


@celery_app.task
def broaden_search_criteria(order_id: int) -> Dict[str, Any]:
    """
    Broaden search criteria for orders with no matches
    """
    try:
        matching_service = OrderMatchingService()
        order_service = OrderService()
        
        logger.info(f"Broadening search criteria for order {order_id}")
        
        # Get order with current criteria
        order = asyncio.run(order_service.get_order(order_id))
        
        # Broaden criteria (reduce precision requirements, increase distance, etc.)
        broadened_criteria = asyncio.run(matching_service.broaden_criteria(order))
        
        # Update order with new criteria
        asyncio.run(order_service.update_order_criteria(order_id, broadened_criteria))
        
        # Retry matching with broadened criteria
        match_orders.delay(order_id)
        
        return {
            'status': 'success',
            'order_id': order_id,
            'broadened_criteria': broadened_criteria
        }
        
    except Exception as exc:
        logger.error(f"Failed to broaden search criteria for order {order_id}: {str(exc)}")
        raise


@celery_app.task
def expire_quote(order_id: int) -> Dict[str, Any]:
    """
    Handle quote expiration
    """
    try:
        order_service = OrderService()
        
        # Update order status to expired
        asyncio.run(order_service.update_order_status(
            order_id=order_id,
            status=OrderStatus.EXPIRED
        ))
        
        # Send expiration notification
        send_order_notifications.delay(
            order_id=order_id,
            notification_type='quote_expired',
            recipients=['customer']
        )
        
        # Offer to restart matching process
        send_order_notifications.delay(
            order_id=order_id,
            notification_type='restart_matching_offer',
            recipients=['customer']
        )
        
        logger.info(f"Quote expired for order {order_id}")
        
        return {
            'status': 'success',
            'order_id': order_id
        }
        
    except Exception as exc:
        logger.error(f"Failed to expire quote for order {order_id}: {str(exc)}")
        raise


@celery_app.task
def schedule_quality_check(order_id: int) -> Dict[str, Any]:
    """
    Schedule quality check for completed order
    """
    try:
        order_service = OrderService()
        
        # Create quality check task
        quality_check = asyncio.run(order_service.create_quality_check(order_id))
        
        # Schedule follow-up email to customer
        from app.tasks.email_tasks import send_scheduled_email
        
        # Send quality check email after 3 days
        send_scheduled_email.apply_async(
            args=[
                'quality_check_request',
                order_id,
                {'quality_check_id': quality_check['id']}
            ],
            countdown=3 * 24 * 3600  # 3 days
        )
        
        logger.info(f"Quality check scheduled for order {order_id}")
        
        return {
            'status': 'success',
            'order_id': order_id,
            'quality_check_id': quality_check['id']
        }
        
    except Exception as exc:
        logger.error(f"Failed to schedule quality check for order {order_id}: {str(exc)}")
        raise


@celery_app.task
def handle_matching_failure(order_id: int, error: str) -> Dict[str, Any]:
    """
    Handle permanent order matching failure
    """
    try:
        order_service = OrderService()
        
        # Mark order as failed
        asyncio.run(order_service.update_order_status(
            order_id=order_id,
            status=OrderStatus.FAILED,
            metadata={'error': error, 'failed_at': datetime.now().isoformat()}
        ))
        
        # Send failure notification to customer
        send_order_notifications.delay(
            order_id=order_id,
            notification_type='matching_failed',
            recipients=['customer']
        )
        
        # Send alert to admin
        notification_service = NotificationService()
        asyncio.run(notification_service.send_admin_notification(
            type='order_matching_failure',
            message=f"Order {order_id} matching failed permanently",
            data={'order_id': order_id, 'error': error}
        ))
        
        logger.error(f"Order {order_id} matching failed permanently: {error}")
        
        return {
            'status': 'handled',
            'order_id': order_id
        }
        
    except Exception as exc:
        logger.error(f"Failed to handle matching failure for order {order_id}: {str(exc)}")
        raise 