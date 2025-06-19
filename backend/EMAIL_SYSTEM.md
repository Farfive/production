# Email Automation System

## Overview
Comprehensive email automation system with SendGrid, Redis, Celery, and multi-language support.

## Features
- ✅ Template-based emails with dynamic content
- ✅ Queue-based sending with Celery and Redis
- ✅ Retry logic for failed deliveries
- ✅ Delivery status tracking and webhooks  
- ✅ GDPR-compliant unsubscribe management
- ✅ Multi-language support (Polish/English)
- ✅ Complete order lifecycle emails
- ✅ Mobile-responsive templates
- ✅ Email analytics and tracking

## Email Types

### Authentication & Account
- `VERIFICATION` - Email address verification
- `PASSWORD_RESET` - Password reset link
- `WELCOME` - Welcome new users

### Order Lifecycle  
- `ORDER_CONFIRMATION` - Order receipt confirmation
- `ORDER_RECEIVED` - New order for manufacturers
- `QUOTE_SUBMITTED` - Quote submission confirmation
- `QUOTE_RECEIVED` - New quote for clients
- `ORDER_ACCEPTED` - Order acceptance notification

### Production & Delivery
- `PRODUCTION_STARTED` - Production began
- `PRODUCTION_MILESTONE` - Production progress update
- `DELIVERY_SHIPPED` - Shipment notification
- `PAYMENT_CONFIRMED` - Payment confirmation

### Notifications
- `DEADLINE_REMINDER` - Delivery deadline reminder
- `REVIEW_REQUEST` - Post-delivery review request

## Usage Examples

### Send Email
```python
from app.services.email import EmailType, email_service

email_id = await email_service.send_email(
    email_type=EmailType.VERIFICATION,
    to_email="user@example.com", 
    to_name="John Doe",
    context={'first_name': 'John', 'verification_link': 'https://...'},
    language='en'
)
```

### Order Confirmation  
```python
from app.services.email import send_order_confirmation_email

await send_order_confirmation_email(
    client_email="client@example.com",
    client_name="Jane Smith", 
    order_data={'id': 12345, 'title': 'Manufacturing Order'},
    language='en'
)
```

### Scheduled Email
```python
from app.tasks.email_tasks import schedule_email
from datetime import datetime, timedelta

schedule_email(
    email_type=EmailType.WELCOME,
    to_email="user@example.com",
    to_name="New User", 
    context={'first_name': 'User'},
    send_at=datetime.now() + timedelta(hours=1)
)
```

## API Endpoints

### Email Management
- `POST /api/v1/emails/send` - Send email (Admin)
- `GET /api/v1/emails/status/{email_id}` - Get delivery status
- `POST /api/v1/emails/test` - Send test email (Admin)

### GDPR Compliance
- `POST /api/v1/emails/unsubscribe` - Unsubscribe (No auth)
- `POST /api/v1/emails/resubscribe` - Resubscribe (Auth required)

### Webhooks
- `POST /api/v1/emails/webhook/sendgrid` - SendGrid delivery events

## Configuration

### Environment Variables
```bash
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=noreply@manufacturingplatform.com  
SENDGRID_FROM_NAME=Manufacturing Platform
REDIS_URL=redis://localhost:6379/0
FRONTEND_URL=https://manufacturingplatform.com
```

### Start Services
```bash
# Celery worker
celery -A app.core.celery_config worker --loglevel=info

# Celery beat (scheduled tasks)
celery -A app.core.celery_config beat --loglevel=info

# Monitor with Flower
celery -A app.core.celery_config flower --port=5555
```

## Template Structure
```
backend/app/templates/emails/
├── en/                     # English templates
│   ├── verification.html   # HTML template
│   ├── verification.txt    # Plain text  
│   └── verification_subject.txt # Subject
└── pl/                     # Polish templates
    ├── verification.html
    └── ...
```

## Testing

### Template Testing
```python
from app.utils.email_test import run_template_test, quick_test_email

# Test all templates
results = run_template_test(language='en')

# Send test email  
await quick_test_email('verification', 'test@example.com')
```

### Integration Testing
```python
from app.utils.email_test import email_test_utils

# Test Celery
task_id = email_test_utils.test_celery_integration('test@example.com')

# Test scheduling
email_test_utils.test_scheduled_email('test@example.com', delay_minutes=2)
```

## Monitoring

### Email Tracking
```python
from app.services.email import get_email_status

status = get_email_status(email_id)
print(f"Status: {status['status']}")
```

### System Health
- Monitor Celery queues with Flower
- Check Redis connection and memory usage
- Review SendGrid delivery statistics
- Monitor failed email rates

## Dependencies Added
- `celery==5.3.4` - Task queue
- `redis==5.0.1` - Caching and queuing  
- `kombu==5.3.4` - Message transport
- `jinja2==3.1.2` - Template engine
- `sendgrid==6.10.0` - Email service

## Architecture Components

1. **EmailService** - Main email sending with tracking
2. **EmailTemplateManager** - Multi-language template rendering  
3. **EmailTracker** - Redis-based delivery tracking
4. **UnsubscribeManager** - GDPR-compliant unsubscribe handling
5. **Celery Tasks** - Asynchronous processing with retry logic
6. **API Endpoints** - REST API for email management
7. **Testing Utils** - Comprehensive testing utilities

## Security & Compliance
- GDPR-compliant unsubscribe management
- Secure API key handling
- Email tracking with privacy considerations
- Audit trails for compliance
- Rate limiting and abuse prevention 