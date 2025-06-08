import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from enum import Enum
from dataclasses import dataclass, asdict
from pathlib import Path
import asyncio

import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content, Attachment, FileContent, FileName, FileType, Disposition
from jinja2 import Environment, FileSystemLoader, select_autoescape, TemplateNotFound
from sqlalchemy.orm import Session
from loguru import logger
import redis

from app.core.config import settings


class EmailType(Enum):
    """Email types for the manufacturing platform"""
    # Authentication & Account
    VERIFICATION = "verification"
    PASSWORD_RESET = "password_reset"
    WELCOME = "welcome"
    
    # Order Lifecycle
    ORDER_CONFIRMATION = "order_confirmation"
    ORDER_RECEIVED = "order_received"
    QUOTE_REQUEST = "quote_request"
    QUOTE_SUBMITTED = "quote_submitted"
    QUOTE_RECEIVED = "quote_received"
    ORDER_ACCEPTED = "order_accepted"
    ORDER_REJECTED = "order_rejected"
    
    # Production & Delivery
    PRODUCTION_STARTED = "production_started"
    PRODUCTION_MILESTONE = "production_milestone"
    PRODUCTION_COMPLETED = "production_completed"
    DELIVERY_SHIPPED = "delivery_shipped"
    DELIVERY_DELIVERED = "delivery_delivered"
    
    # Payments
    PAYMENT_PENDING = "payment_pending"
    PAYMENT_CONFIRMED = "payment_confirmed"
    PAYMENT_FAILED = "payment_failed"
    PAYOUT_PROCESSED = "payout_processed"
    
    # Notifications & Reminders
    DEADLINE_REMINDER = "deadline_reminder"
    FOLLOW_UP = "follow_up"
    REVIEW_REQUEST = "review_request"


class EmailPriority(Enum):
    """Email priority levels"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4


class EmailStatus(Enum):
    """Email delivery status"""
    PENDING = "pending"
    QUEUED = "queued"
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"
    FAILED = "failed"
    UNSUBSCRIBED = "unsubscribed"


@dataclass
class EmailData:
    """Email data structure for queue processing"""
    id: str
    email_type: EmailType
    to_email: str
    to_name: str
    subject: str
    context: Dict[str, Any]
    template_name: str
    language: str = "en"
    priority: EmailPriority = EmailPriority.NORMAL
    scheduled_at: Optional[datetime] = None
    retry_count: int = 0
    max_retries: int = 3
    created_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()


class EmailTracker:
    """Email delivery tracking and analytics"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.key_prefix = "email_tracking:"
    
    def track_email(self, email_id: str, email_data: EmailData):
        """Track email in Redis"""
        key = f"{self.key_prefix}{email_id}"
        data = {
            'email_type': email_data.email_type.value,
            'to_email': email_data.to_email,
            'to_name': email_data.to_name,
            'subject': email_data.subject,
            'language': email_data.language,
            'priority': email_data.priority.value,
            'status': EmailStatus.PENDING.value,
            'created_at': email_data.created_at.isoformat(),
            'retry_count': email_data.retry_count
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
        """Get email status and metadata"""
        key = f"{self.key_prefix}{email_id}"
        data = self.redis.get(key)
        
        if data:
            return json.loads(data)
        return None


class UnsubscribeManager:
    """GDPR-compliant unsubscribe management"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.key_prefix = "unsubscribe:"
    
    def add_unsubscribe(self, email: str, email_type: EmailType = None, reason: str = None):
        """Add email to unsubscribe list"""
        key = f"{self.key_prefix}{email.lower()}"
        data = {
            'email': email.lower(),
            'unsubscribed_at': datetime.now().isoformat(),
            'reason': reason,
            'email_types': [email_type.value] if email_type else ['all']
        }
        
        # Check if already exists
        existing = self.redis.get(key)
        if existing:
            existing_data = json.loads(existing)
            if email_type and email_type.value not in existing_data['email_types']:
                existing_data['email_types'].append(email_type.value)
            data = existing_data
        
        self.redis.set(key, json.dumps(data))
    
    def is_unsubscribed(self, email: str, email_type: EmailType = None) -> bool:
        """Check if email is unsubscribed"""
        key = f"{self.key_prefix}{email.lower()}"
        data = self.redis.get(key)
        
        if not data:
            return False
        
        unsub_data = json.loads(data)
        email_types = unsub_data.get('email_types', [])
        
        # Check if unsubscribed from all or specific type
        return 'all' in email_types or (email_type and email_type.value in email_types)
    
    def remove_unsubscribe(self, email: str, email_type: EmailType = None):
        """Remove from unsubscribe list (re-subscribe)"""
        key = f"{self.key_prefix}{email.lower()}"
        data = self.redis.get(key)
        
        if not data:
            return
        
        unsub_data = json.loads(data)
        
        if email_type:
            # Remove specific email type
            email_types = unsub_data.get('email_types', [])
            if email_type.value in email_types:
                email_types.remove(email_type.value)
                unsub_data['email_types'] = email_types
                
                if not email_types:
                    self.redis.delete(key)
                else:
                    self.redis.set(key, json.dumps(unsub_data))
        else:
            # Remove completely
            self.redis.delete(key)


class EmailTemplateManager:
    """Template management with multi-language support"""
    
    def __init__(self, template_dir: str = None):
        if template_dir is None:
            template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates', 'emails')
        
        self.template_dir = Path(template_dir)
        self.jinja_envs: Dict[str, Environment] = {}
        
        # Setup Jinja environments for each language
        self._setup_jinja_environments()
    
    def _setup_jinja_environments(self):
        """Setup Jinja2 environments for different languages"""
        languages = ['en', 'pl']  # English and Polish
        
        for lang in languages:
            lang_dir = self.template_dir / lang
            if lang_dir.exists():
                self.jinja_envs[lang] = Environment(
                    loader=FileSystemLoader(str(lang_dir)),
                    autoescape=select_autoescape(['html', 'xml']),
                    trim_blocks=True,
                    lstrip_blocks=True
                )
                
                # Add custom filters
                self.jinja_envs[lang].filters['currency'] = self._currency_filter
                self.jinja_envs[lang].filters['datetime'] = self._datetime_filter
    
    def _currency_filter(self, value: float, currency: str = 'PLN') -> str:
        """Format currency values"""
        if currency == 'PLN':
            return f"{value:,.2f} zł"
        elif currency == 'EUR':
            return f"€{value:,.2f}"
        elif currency == 'USD':
            return f"${value:,.2f}"
        return f"{value:,.2f} {currency}"
    
    def _datetime_filter(self, value: datetime, format: str = '%Y-%m-%d %H:%M') -> str:
        """Format datetime values"""
        if isinstance(value, str):
            value = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return value.strftime(format)
    
    def render_template(self, template_name: str, context: Dict[str, Any], language: str = 'en') -> Dict[str, str]:
        """Render email template with context"""
        jinja_env = self.jinja_envs.get(language)
        if not jinja_env:
            raise ValueError(f"Jinja environment not found for language {language}")
        
        try:
            # Get subject template
            subject_template = jinja_env.get_template(f"{template_name}_subject.txt")
            subject = subject_template.render(context).strip()
            
            # Get HTML template
            html_template = jinja_env.get_template(f"{template_name}.html")
            html_content = html_template.render(context)
            
            # Get text template if available
            text_content = None
            try:
                text_template = jinja_env.get_template(f"{template_name}.txt")
                text_content = text_template.render(context)
            except TemplateNotFound:
                logger.warning(f"Text template {template_name}.txt not found for language {language}")
            
            return {
                'subject': subject,
                'html_content': html_content,
                'text_content': text_content
            }
        
        except TemplateNotFound as e:
            logger.error(f"Template not found: {e}")
            raise
        except Exception as e:
            logger.error(f"Error rendering template {template_name}: {e}")
            raise


class EmailAutomationService:
    """Comprehensive email automation service"""
    
    def __init__(self):
        self.sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        self.from_email = settings.SENDGRID_FROM_EMAIL
        self.from_name = getattr(settings, 'SENDGRID_FROM_NAME', "Manufacturing Platform")
        
        # Initialize Redis connection
        redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
        self.redis = redis.Redis.from_url(redis_url)
        
        # Initialize components
        self.template_manager = EmailTemplateManager()
        self.tracker = EmailTracker(self.redis)
        self.unsubscribe_manager = UnsubscribeManager(self.redis)
    
    async def send_email(
        self,
        email_type: EmailType,
        to_email: str,
        to_name: str,
        context: Dict[str, Any],
        language: str = 'en',
        priority: EmailPriority = EmailPriority.NORMAL,
        scheduled_at: Optional[datetime] = None,
        attachments: List[Dict] = None
    ) -> str:
        """Send email (queued or immediate)"""
        
        # Check if user is unsubscribed
        if self.unsubscribe_manager.is_unsubscribed(to_email, email_type):
            logger.info(f"Skipping email to {to_email} - unsubscribed from {email_type.value}")
            return None
        
        # Generate unique email ID
        email_id = str(uuid.uuid4())
        
        # Render template
        try:
            rendered = self.template_manager.render_template(
                email_type.value, context, language
            )
        except Exception as e:
            logger.error(f"Failed to render template {email_type.value}: {str(e)}")
            return None
        
        # Create email data
        email_data = EmailData(
            id=email_id,
            email_type=email_type,
            to_email=to_email,
            to_name=to_name,
            subject=rendered['subject'],
            context=context,
            template_name=email_type.value,
            language=language,
            priority=priority,
            scheduled_at=scheduled_at
        )
        
        # Track email
        self.tracker.track_email(email_id, email_data)
        
        # Send immediately for now (we'll add Celery integration separately)
        success = await self.send_immediate_email(
            to_email=to_email,
            subject=rendered['subject'],
            html_content=rendered['html_content'],
            text_content=rendered.get('text_content'),
            attachments=attachments,
            email_id=email_id
        )
        
        if success:
            self.tracker.update_status(email_id, EmailStatus.SENT)
        else:
            self.tracker.update_status(email_id, EmailStatus.FAILED)
        
        return email_id
    
    async def send_immediate_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str = None,
        attachments: List[Dict] = None,
        email_id: str = None
    ) -> bool:
        """Send email immediately without queueing"""
        try:
            # Create SendGrid mail object
            mail = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content)
            )
            
            # Add text content if provided
            if text_content:
                mail.add_content(Content("text/plain", text_content))
            
            # Add custom args for tracking
            if email_id:
                mail.custom_arg = {"email_id": email_id}
            
            # Add attachments
            if attachments:
                for attachment_data in attachments:
                    attachment = Attachment(
                        FileContent(attachment_data['content']),
                        FileName(attachment_data['filename']),
                        FileType(attachment_data['type']),
                        Disposition('attachment')
                    )
                    mail.add_attachment(attachment)
            
            # Send email
            response = self.sg.send(mail)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Failed to send email to {to_email}. Status: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {str(e)}")
            return False
    
    def process_webhook(self, webhook_data: Dict[str, Any]):
        """Process SendGrid webhook events"""
        try:
            for event in webhook_data:
                email_id = event.get('email_id')
                if not email_id:
                    continue
                
                event_type = event.get('event')
                timestamp = event.get('timestamp')
                
                # Map SendGrid events to our status
                status_mapping = {
                    'processed': EmailStatus.QUEUED,
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
                    if event_type == 'unsubscribe':
                        email_data = self.tracker.get_email_status(email_id)
                        if email_data:
                            self.unsubscribe_manager.add_unsubscribe(
                                email_data['to_email'],
                                EmailType(email_data['email_type']),
                                "SendGrid unsubscribe"
                            )
        
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
    
    def unsubscribe_email(self, email: str, email_type: EmailType = None, reason: str = None):
        """Unsubscribe email from communications"""
        self.unsubscribe_manager.add_unsubscribe(email, email_type, reason)
    
    def resubscribe_email(self, email: str, email_type: EmailType = None):
        """Re-subscribe email"""
        self.unsubscribe_manager.remove_unsubscribe(email, email_type)
    
    def get_email_status(self, email_id: str) -> Optional[Dict]:
        """Get email delivery status"""
        return self.tracker.get_email_status(email_id)


# Create email automation service instance
email_automation = EmailAutomationService() 