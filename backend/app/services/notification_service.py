from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import logging
from datetime import datetime, timezone

from app.models.quote import QuoteNotification, Quote
from app.models.user import User
from app.core.config import settings

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create_quote_notification(
        self,
        quote: Quote,
        notification_type: str,
        title: str,
        message: str,
        user_id: int,
        metadata: Optional[Dict[str, Any]] = None,
        action_url: Optional[str] = None,
        send_email: bool = True
    ) -> QuoteNotification:
        """Create a new quote notification"""
        
        notification = QuoteNotification(
            user_id=user_id,
            quote_id=quote.id,
            type=notification_type,
            title=title,
            message=message,
            notification_metadata=metadata or {},
            action_url=action_url or f"/quotes/{quote.id}"
        )
        
        self.db.add(notification)
        
        # Send email notification if enabled
        if send_email:
            try:
                self._send_email_notification(notification, quote)
                notification.sent_via_email = True
            except Exception as e:
                logger.error(f"Failed to send email notification: {e}")
        
        self.db.flush()  # Get the ID without committing
        return notification

    def _send_email_notification(self, notification: QuoteNotification, quote: Quote):
        """Send email notification (placeholder for actual email service)"""
        # Get user email
        user = self.db.query(User).filter(User.id == notification.user_id).first()
        if not user or not user.email:
            return

        # Email templates based on notification type
        email_templates = {
            "new_quote": {
                "subject": f"New Quote Received - Order #{quote.order_id}",
                "template": "new_quote_received.html"
            },
            "quote_accepted": {
                "subject": f"Quote Accepted - Order #{quote.order_id}",
                "template": "quote_accepted.html"
            },
            "quote_rejected": {
                "subject": f"Quote Rejected - Order #{quote.order_id}",
                "template": "quote_rejected.html"
            },
            "negotiation_request": {
                "subject": f"Negotiation Request - Order #{quote.order_id}",
                "template": "negotiation_request.html"
            },
            "quote_revised": {
                "subject": f"Quote Revised - Order #{quote.order_id}",
                "template": "quote_revised.html"
            }
        }

        template_info = email_templates.get(notification.type, {
            "subject": notification.title,
            "template": "generic_notification.html"
        })

        # Prepare email data
        email_data = {
            "to_email": user.email,
            "to_name": f"{user.first_name} {user.last_name}",
            "subject": template_info["subject"],
            "template": template_info["template"],
            "context": {
                "user_name": f"{user.first_name} {user.last_name}",
                "notification_title": notification.title,
                "notification_message": notification.message,
                "quote_id": quote.id,
                "order_id": quote.order_id,
                "action_url": f"{settings.FRONTEND_URL}{notification.action_url}",
                "platform_name": "Manufacturing Platform",
                "current_year": datetime.now().year
            }
        }

        # Send email via configured service
        try:
            from app.core.email import send_template_email
            send_template_email(**email_data)
            logger.info(f"Email notification sent to {user.email}: {template_info['subject']}")
        except ImportError:
            logger.warning("Email service not configured - notification logged only")
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            raise

    def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        """Mark a notification as read"""
        notification = self.db.query(QuoteNotification).filter(
            QuoteNotification.id == notification_id,
            QuoteNotification.user_id == user_id
        ).first()
        
        if notification and not notification.read:
            notification.read = True
            notification.read_at = datetime.now(timezone.utc)
            self.db.commit()
            return True
        
        return False

    def get_user_notifications(
        self,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0
    ):
        """Get notifications for a user"""
        query = self.db.query(QuoteNotification).filter(
            QuoteNotification.user_id == user_id
        )
        
        if unread_only:
            query = query.filter(QuoteNotification.read == False)
        
        return query.order_by(
            QuoteNotification.created_at.desc()
        ).offset(offset).limit(limit).all()

    def get_unread_count(self, user_id: int) -> int:
        """Get count of unread notifications for a user"""
        return self.db.query(QuoteNotification).filter(
            QuoteNotification.user_id == user_id,
            QuoteNotification.read == False
        ).count()

    def delete_notification(self, notification_id: int, user_id: int) -> bool:
        """Delete a notification"""
        notification = self.db.query(QuoteNotification).filter(
            QuoteNotification.id == notification_id,
            QuoteNotification.user_id == user_id
        ).first()
        
        if notification:
            self.db.delete(notification)
            self.db.commit()
            return True
        
        return False

    def create_bulk_notifications(
        self,
        user_ids: list[int],
        notification_type: str,
        title: str,
        message: str,
        quote_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Create notifications for multiple users"""
        notifications = []
        
        for user_id in user_ids:
            notification = QuoteNotification(
                user_id=user_id,
                quote_id=quote_id,
                type=notification_type,
                title=title,
                message=message,
                notification_metadata=metadata or {}
            )
            notifications.append(notification)
        
        self.db.add_all(notifications)
        self.db.commit()
        
        return notifications 