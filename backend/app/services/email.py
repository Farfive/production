import sendgrid
import uuid
import json
import redis
from sendgrid.helpers.mail import Mail, Email, To, Content, Attachment, FileContent, FileName, FileType, Disposition
from typing import Dict, Any, List, Optional
from jinja2 import Environment, FileSystemLoader, select_autoescape
from datetime import datetime, timedelta
from enum import Enum
import os
from loguru import logger

from app.core.config import settings
from app.services.email_templates import template_manager


class EmailType(Enum):
    """Email types for the manufacturing platform"""
    VERIFICATION = "verification"
    PASSWORD_RESET = "password_reset"
    WELCOME = "welcome"
    ORDER_CONFIRMATION = "order_confirmation"
    ORDER_RECEIVED = "order_received"
    QUOTE_REQUEST = "quote_request"
    QUOTE_SUBMITTED = "quote_submitted"
    QUOTE_RECEIVED = "quote_received"
    ORDER_ACCEPTED = "order_accepted"
    ORDER_REJECTED = "order_rejected"
    PRODUCTION_STARTED = "production_started"
    PRODUCTION_MILESTONE = "production_milestone"
    PRODUCTION_COMPLETED = "production_completed"
    DELIVERY_SHIPPED = "delivery_shipped"
    DELIVERY_DELIVERED = "delivery_delivered"
    PAYMENT_PENDING = "payment_pending"
    PAYMENT_CONFIRMED = "payment_confirmed"
    PAYMENT_FAILED = "payment_failed"
    PAYOUT_PROCESSED = "payout_processed"
    DEADLINE_REMINDER = "deadline_reminder"
    REVIEW_REQUEST = "review_request"


class EmailStatus(Enum):
    """Email delivery status"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"
    FAILED = "failed"
    UNSUBSCRIBED = "unsubscribed"


class EmailTracker:
    """Email delivery tracking and analytics"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.key_prefix = "email_tracking:"
    
    def track_email(self, email_id: str, email_type: str, to_email: str, subject: str):
        """Track email in Redis"""
        key = f"{self.key_prefix}{email_id}"
        data = {
            'email_type': email_type,
            'to_email': to_email,
            'subject': subject,
            'status': EmailStatus.PENDING.value,
            'created_at': datetime.now().isoformat()
        }
        
        # Store for 30 days
        self.redis.setex(key, timedelta(days=30), json.dumps(data))
    
    def update_status(self, email_id: str, status: EmailStatus, metadata: Dict = None):
        """Update email status"""
        key = f"{self.key_prefix}{email_id}"
        data = self.redis.get(key)
        
        if data:
            email_data = json.loads(data)
            email_data['status'] = status.value
            email_data['updated_at'] = datetime.now().isoformat()
            
            if metadata:
                email_data.update(metadata)
            
            self.redis.setex(key, timedelta(days=30), json.dumps(email_data))
    
    def get_email_status(self, email_id: str) -> Optional[Dict]:
        """Get email status"""
        key = f"{self.key_prefix}{email_id}"
        data = self.redis.get(key)
        return json.loads(data) if data else None


class UnsubscribeManager:
    """GDPR-compliant unsubscribe management"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.key_prefix = "unsubscribe:"
    
    def add_unsubscribe(self, email: str, email_type: str = None, reason: str = None):
        """Add email to unsubscribe list"""
        key = f"{self.key_prefix}{email.lower()}"
        data = {
            'email': email.lower(),
            'unsubscribed_at': datetime.now().isoformat(),
            'reason': reason,
            'email_types': [email_type] if email_type else ['all']
        }
        
        existing = self.redis.get(key)
        if existing:
            existing_data = json.loads(existing)
            if email_type and email_type not in existing_data['email_types']:
                existing_data['email_types'].append(email_type)
            data = existing_data
        
        self.redis.set(key, json.dumps(data))
    
    def is_unsubscribed(self, email: str, email_type: str = None) -> bool:
        """Check if email is unsubscribed"""
        key = f"{self.key_prefix}{email.lower()}"
        data = self.redis.get(key)
        
        if not data:
            return False
        
        unsub_data = json.loads(data)
        email_types = unsub_data.get('email_types', [])
        
        return 'all' in email_types or (email_type and email_type in email_types)


class EmailService:
    def __init__(self):
        self.sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        self.from_email = settings.SENDGRID_FROM_EMAIL
        self.from_name = getattr(settings, 'SENDGRID_FROM_NAME', 'Manufacturing Platform')
        
        # Initialize Redis for tracking and unsubscribes
        redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
        try:
            self.redis = redis.Redis.from_url(redis_url)
            self.redis.ping()  # Test connection
        except:
            logger.warning("Redis not available, email tracking disabled")
            self.redis = None
        
        # Initialize tracking and unsubscribe management
        if self.redis:
            self.tracker = EmailTracker(self.redis)
            self.unsubscribe_manager = UnsubscribeManager(self.redis)
        else:
            self.tracker = None
            self.unsubscribe_manager = None
    
    async def send_email(
        self,
        email_type: EmailType,
        to_email: str,
        to_name: str,
        context: Dict[str, Any] = None,
        language: str = 'en',
        attachments: List[Dict] = None
    ) -> Optional[str]:
        """Send email using template system with tracking"""
        
        # Check if user is unsubscribed
        if self.unsubscribe_manager and self.unsubscribe_manager.is_unsubscribed(to_email, email_type.value):
            logger.info(f"Skipping email to {to_email} - unsubscribed from {email_type.value}")
            return None
    
    def process_webhook(self, webhook_data: List[Dict[str, Any]]):
        """Process SendGrid webhook events"""
        if not self.tracker:
            return
        
        try:
            for event in webhook_data:
                email_id = event.get('email_id')
                if not email_id:
                    continue
                
                event_type = event.get('event')
                timestamp = event.get('timestamp')
                
                # Map SendGrid events to our status
                status_mapping = {
                    'processed': EmailStatus.SENT,
                    'delivered': EmailStatus.DELIVERED,
                    'open': EmailStatus.OPENED,
                    'click': EmailStatus.CLICKED,
                    'bounce': EmailStatus.BOUNCED,
                    'dropped': EmailStatus.FAILED,
                    'spamreport': EmailStatus.FAILED,
                    'unsubscribe': EmailStatus.UNSUBSCRIBED,
                }
                
                status = status_mapping.get(event_type)
                if status:
                    metadata = {
                        'event_type': event_type,
                        'timestamp': timestamp,
                        'user_agent': event.get('useragent'),
                        'ip': event.get('ip'),
                        'url': event.get('url') if event_type == 'click' else None
                    }
                    
                    self.tracker.update_status(email_id, status, metadata)
                    
                    # Handle unsubscribe
                    if event_type == 'unsubscribe' and self.unsubscribe_manager:
                        email_data = self.tracker.get_email_status(email_id)
                        if email_data:
                            self.unsubscribe_manager.add_unsubscribe(
                                email_data['to_email'],
                                email_data['email_type'],
                                "SendGrid unsubscribe"
                            )
        
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
        
        try:
            # Generate unique email ID
            email_id = str(uuid.uuid4())
            
            # Render template
            rendered = template_manager.render_template(
                email_type.value, 
                context or {}, 
                language
            )
            
            # Track email if tracking is enabled
            if self.tracker:
                self.tracker.track_email(email_id, email_type.value, to_email, rendered['subject'])
            
            # Create mail object
            mail = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(to_email, to_name),
                subject=rendered['subject'],
                html_content=Content("text/html", rendered['html_content'])
            )
            
            # Add text content if available
            if rendered.get('text_content'):
                mail.add_content(Content("text/plain", rendered['text_content']))
            
            # Add custom args for tracking
            mail.custom_arg = {"email_id": email_id}
            
            # Add attachments if provided
            if attachments:
                for attachment_data in attachments:
                    attachment = Attachment(
                        FileContent(attachment_data['content']),
                        FileName(attachment_data['filename']),
                        FileType(attachment_data.get('type', 'application/octet-stream')),
                        Disposition('attachment')
                    )
                    mail.add_attachment(attachment)
            
            # Send email
            response = self.sg.send(mail)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {to_email}")
                
                # Update tracking status
                if self.tracker:
                    self.tracker.update_status(email_id, EmailStatus.SENT)
                
                return email_id
            else:
                logger.error(f"Failed to send email to {to_email}. Status: {response.status_code}")
                
                # Update tracking status
                if self.tracker:
                    self.tracker.update_status(email_id, EmailStatus.FAILED)
                
                return None
                
        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {str(e)}")
            
            # Update tracking status
            if self.tracker and 'email_id' in locals():
                self.tracker.update_status(email_id, EmailStatus.FAILED, {'error': str(e)})
            
            return None


# Create email service instance
email_service = EmailService()


async def send_verification_email(email: str, first_name: str, verification_token: str = None) -> Optional[str]:
    """Send email verification email"""
    verification_link = f"{settings.FRONTEND_URL}/verify-email?token={verification_token or 'verification_token_here'}"
    
    context = {
        'first_name': first_name,
        'verification_link': verification_link,
        'verification_token': verification_token
    }
    
    return await email_service.send_email(
        email_type=EmailType.VERIFICATION,
        to_email=email,
        to_name=first_name,
        context=context
    )


async def send_password_reset_email(email: str, first_name: str, reset_token: str) -> Optional[str]:
    """Send password reset email"""
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    
    context = {
        'first_name': first_name,
        'reset_link': reset_link,
        'reset_token': reset_token
    }
    
    return await email_service.send_email(
        email_type=EmailType.PASSWORD_RESET,
        to_email=email,
        to_name=first_name,
        context=context
    )


async def send_welcome_email(email: str, first_name: str, language: str = 'en') -> Optional[str]:
    """Send welcome email to new users"""
    login_link = f"{settings.FRONTEND_URL}/login"
    
    context = {
        'first_name': first_name,
        'login_link': login_link,
        'dashboard_link': f"{settings.FRONTEND_URL}/dashboard"
    }
    
    return await email_service.send_email(
        email_type=EmailType.WELCOME,
        to_email=email,
        to_name=first_name,
        context=context,
        language=language
    )


async def send_order_confirmation_email(
    client_email: str,
    client_name: str,
    order_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Send order confirmation email to client"""
    order_link = f"{settings.FRONTEND_URL}/orders/{order_data['id']}"
    
    context = {
        'client_name': client_name,
        'order': order_data,
        'order_link': order_link,
        'estimated_matching_time': '24-48 hours'
    }
    
    return await email_service.send_email(
        email_type=EmailType.ORDER_CONFIRMATION,
        to_email=client_email,
        to_name=client_name,
        context=context,
        language=language
    )


async def send_order_received_email(
    manufacturer_email: str,
    manufacturer_name: str,
    order_data: Dict[str, Any],
    quote_deadline: str = None,
    language: str = 'en'
) -> Optional[str]:
    """Send new order notification to manufacturer"""
    quote_link = f"{settings.FRONTEND_URL}/manufacturer/orders/{order_data['id']}/quote"
    
    context = {
        'manufacturer_name': manufacturer_name,
        'order': order_data,
        'quote_link': quote_link,
        'quote_deadline': quote_deadline or 'Within 3 days',
        'order_value_estimate': order_data.get('budget_max_pln', 'Not specified')
    }
    
    return await email_service.send_email(
        email_type=EmailType.ORDER_RECEIVED,
        to_email=manufacturer_email,
        to_name=manufacturer_name,
        context=context,
        language=language
    )


async def send_quote_submitted_email(
    manufacturer_email: str,
    manufacturer_name: str,
    order_data: Dict[str, Any],
    quote_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Send quote submission confirmation to manufacturer"""
    quote_link = f"{settings.FRONTEND_URL}/manufacturer/quotes/{quote_data['id']}"
    
    context = {
        'manufacturer_name': manufacturer_name,
        'order': order_data,
        'quote': quote_data,
        'quote_link': quote_link,
        'client_response_time': '3-5 business days'
    }
    
    return await email_service.send_email(
        email_type=EmailType.QUOTE_SUBMITTED,
        to_email=manufacturer_email,
        to_name=manufacturer_name,
        context=context,
        language=language
    )


async def send_quote_received_email(
    client_email: str,
    client_name: str,
    order_data: Dict[str, Any],
    quote_data: Dict[str, Any],
    manufacturer_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Send quote notification email to client"""
    review_link = f"{settings.FRONTEND_URL}/orders/{order_data['id']}/quotes/{quote_data['id']}"
    
    context = {
        'client_name': client_name,
        'order': order_data,
        'quote': quote_data,
        'manufacturer': manufacturer_data,
        'review_link': review_link,
        'response_deadline': '7 days'
    }
    
    return await email_service.send_email(
        email_type=EmailType.QUOTE_RECEIVED,
        to_email=client_email,
        to_name=client_name,
        context=context,
        language=language
    )


async def send_order_accepted_email(
    manufacturer_email: str,
    manufacturer_name: str,
    order_data: Dict[str, Any],
    quote_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Send order acceptance notification to manufacturer"""
    order_link = f"{settings.FRONTEND_URL}/manufacturer/orders/{order_data['id']}"
    
    context = {
        'manufacturer_name': manufacturer_name,
        'order': order_data,
        'quote': quote_data,
        'order_link': order_link,
        'production_start_date': order_data.get('production_start_date'),
        'delivery_deadline': order_data.get('delivery_deadline')
    }
    
    return await email_service.send_email(
        email_type=EmailType.ORDER_ACCEPTED,
        to_email=manufacturer_email,
        to_name=manufacturer_name,
        context=context,
        language=language
    )


async def send_production_started_email(
    client_email: str,
    client_name: str,
    order_data: Dict[str, Any],
    manufacturer_data: Dict[str, Any],
    estimated_completion: str = None,
    language: str = 'en'
) -> Optional[str]:
    """Send production started notification to client"""
    tracking_link = f"{settings.FRONTEND_URL}/orders/{order_data['id']}/tracking"
    
    context = {
        'client_name': client_name,
        'order': order_data,
        'manufacturer': manufacturer_data,
        'tracking_link': tracking_link,
        'estimated_completion': estimated_completion,
        'production_start_date': datetime.now().strftime('%Y-%m-%d')
    }
    
    return await email_service.send_email(
        email_type=EmailType.PRODUCTION_STARTED,
        to_email=client_email,
        to_name=client_name,
        context=context,
        language=language
    )


async def send_production_milestone_email(
    client_email: str,
    client_name: str,
    order_data: Dict[str, Any],
    milestone_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Send production milestone update to client"""
    tracking_link = f"{settings.FRONTEND_URL}/orders/{order_data['id']}/tracking"
    
    context = {
        'client_name': client_name,
        'order': order_data,
        'milestone': milestone_data,
        'tracking_link': tracking_link,
        'progress_percentage': milestone_data.get('progress_percentage', 0),
        'next_milestone': milestone_data.get('next_milestone')
    }
    
    return await email_service.send_email(
        email_type=EmailType.PRODUCTION_MILESTONE,
        to_email=client_email,
        to_name=client_name,
        context=context,
        language=language
    )


async def send_delivery_shipped_email(
    client_email: str,
    client_name: str,
    order_data: Dict[str, Any],
    shipping_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Send delivery shipped notification to client"""
    tracking_link = shipping_data.get('tracking_url', f"{settings.FRONTEND_URL}/orders/{order_data['id']}/tracking")
    
    context = {
        'client_name': client_name,
        'order': order_data,
        'tracking_number': shipping_data.get('tracking_number'),
        'carrier': shipping_data.get('carrier', 'Courier'),
        'tracking_link': tracking_link,
        'estimated_delivery': shipping_data.get('estimated_delivery'),
        'shipping_address': order_data.get('shipping_address')
    }
    
    return await email_service.send_email(
        email_type=EmailType.DELIVERY_SHIPPED,
        to_email=client_email,
        to_name=client_name,
        context=context,
        language=language
    )


async def send_payment_confirmation_email(
    email: str,
    name: str,
    order_data: Dict[str, Any],
    payment_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Send payment confirmation email"""
    receipt_link = f"{settings.FRONTEND_URL}/orders/{order_data['id']}/receipt"
    
    context = {
        'name': name,
        'order': order_data,
        'payment': payment_data,
        'receipt_link': receipt_link,
        'payment_method': payment_data.get('payment_method', 'Card'),
        'transaction_id': payment_data.get('transaction_id')
    }
    
    return await email_service.send_email(
        email_type=EmailType.PAYMENT_CONFIRMED,
        to_email=email,
        to_name=name,
        context=context,
        language=language
    )


async def send_deadline_reminder_email(
    email: str,
    name: str,
    order_data: Dict[str, Any],
    days_remaining: int,
    language: str = 'en'
) -> Optional[str]:
    """Send deadline reminder email"""
    order_link = f"{settings.FRONTEND_URL}/orders/{order_data['id']}"
    
    context = {
        'name': name,
        'order': order_data,
        'order_link': order_link,
        'days_remaining': days_remaining,
        'deadline_date': order_data.get('delivery_deadline')
    }
    
    return await email_service.send_email(
        email_type=EmailType.DEADLINE_REMINDER,
        to_email=email,
        to_name=name,
        context=context,
        language=language
    )


async def send_review_request_email(
    email: str,
    name: str,
    order_data: Dict[str, Any],
    manufacturer_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Send review request email after order completion"""
    review_link = f"{settings.FRONTEND_URL}/orders/{order_data['id']}/review"
    
    context = {
        'name': name,
        'order': order_data,
        'manufacturer': manufacturer_data,
        'review_link': review_link,
        'completion_date': datetime.now().strftime('%Y-%m-%d')
    }
    
    return await email_service.send_email(
        email_type=EmailType.REVIEW_REQUEST,
        to_email=email,
        to_name=name,
        context=context,
        language=language
    )


# Email tracking and management functions
def get_email_status(email_id: str) -> Optional[Dict]:
    """Get email delivery status"""
    if email_service.tracker:
        return email_service.tracker.get_email_status(email_id)
    return None


def unsubscribe_email(email: str, email_type: str = None, reason: str = None):
    """Unsubscribe email from communications"""
    if email_service.unsubscribe_manager:
        email_service.unsubscribe_manager.add_unsubscribe(email, email_type, reason)


def resubscribe_email(email: str, email_type: str = None):
    """Re-subscribe email"""
    if email_service.unsubscribe_manager:
        email_service.unsubscribe_manager.remove_unsubscribe(email, email_type)


def is_email_unsubscribed(email: str, email_type: str = None) -> bool:
    """Check if email is unsubscribed"""
    if email_service.unsubscribe_manager:
        return email_service.unsubscribe_manager.is_unsubscribed(email, email_type)
    return False 