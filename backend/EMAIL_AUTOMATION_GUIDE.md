# Email Automation System Documentation

## Overview

The Manufacturing Platform includes a comprehensive email automation system built with SendGrid, Redis, and Celery. This system provides template-based emails, queue processing, delivery tracking, multi-language support, and GDPR-compliant unsubscribe management.

## Architecture

### Core Components

1. **EmailService** - Main email sending service with tracking
2. **EmailTemplateManager** - Multi-language template rendering
3. **EmailTracker** - Redis-based delivery tracking
4. **UnsubscribeManager** - GDPR-compliant unsubscribe handling
5. **Celery Tasks** - Queue-based email processing with retry logic

### Technology Stack

- **SendGrid** - Email delivery service
- **Redis** - Caching, tracking, and unsubscribe data
- **Celery** - Asynchronous task processing
- **Jinja2** - Template rendering engine
- **FastAPI** - API endpoints for email management

## Features

### 🎯 Template-Based Email System
- Dynamic content injection with Jinja2
- HTML and plain text versions
- Mobile-responsive templates
- Brand consistency (logo, colors, fonts)
- Custom filters for currency and date formatting

### 📬 Complete Order Lifecycle Emails
- **Authentication**: Verification, Password Reset, Welcome
- **Order Management**: Confirmation, New Order Notifications
- **Quotes**: Submission confirmations, Quote received notifications
- **Production**: Order acceptance/rejection, Production milestones
- **Delivery**: Shipping notifications, Delivery confirmations
- **Payments**: Payment confirmations, Payout notifications
- **Reminders**: Deadline reminders, Review requests

### 🌍 Multi-Language Support
- Polish (pl) and English (en) templates
- Language-specific formatting (currency, dates)
- Automatic fallback to English if translation missing

### 📊 Advanced Tracking & Analytics
- Real-time delivery status tracking
- Open and click tracking via SendGrid webhooks
- Redis-based tracking storage (30-day retention)
- Comprehensive email analytics

### 🔄 Queue-Based Processing
- Celery integration for asynchronous sending
- Retry logic with exponential backoff
- Priority queues for different email types
- Bulk email campaign support
- Scheduled email functionality

### 🛡️ GDPR Compliance
- Granular unsubscribe management
- Email-type specific unsubscribes
- One-click unsubscribe links
- Audit trail for compliance

## Email Types

| Type | Description | Trigger |
|------|-------------|---------|
| `VERIFICATION` | Email address verification | User registration |
| `PASSWORD_RESET` | Password reset link | Password reset request |
| `WELCOME` | Welcome new users | Account activation |
| `ORDER_CONFIRMATION` | Order receipt confirmation | Order submitted |
| `ORDER_RECEIVED` | New order for manufacturers | Order matched |
| `QUOTE_SUBMITTED` | Quote submission confirmation | Quote submitted |
| `QUOTE_RECEIVED` | New quote for clients | Quote received |
| `ORDER_ACCEPTED` | Order acceptance notification | Quote accepted |
| `PRODUCTION_STARTED` | Production began | Production phase change |
| `PRODUCTION_MILESTONE` | Production progress update | Milestone reached |
| `DELIVERY_SHIPPED` | Shipment notification | Order shipped |
| `PAYMENT_CONFIRMED` | Payment confirmation | Payment processed |
| `DEADLINE_REMINDER` | Delivery deadline reminder | Automated schedule |
| `REVIEW_REQUEST` | Post-delivery review request | Order completed |

## Configuration

### Environment Variables

```bash
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@manufacturingplatform.com
SENDGRID_FROM_NAME=Manufacturing Platform

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Frontend URLs
FRONTEND_URL=https://manufacturingplatform.com
```

### Celery Configuration

```bash
# Start Celery worker
celery -A app.core.celery_config worker --loglevel=info --queues=email,email_bulk,email_webhooks

# Start Celery beat (for scheduled tasks)
celery -A app.core.celery_config beat --loglevel=info

# Monitor with Flower
celery -A app.core.celery_config flower
```

## Usage Examples

### Sending Individual Emails

```python
from app.services.email import EmailType, email_service

# Send verification email
email_id = await email_service.send_email(
    email_type=EmailType.VERIFICATION,
    to_email="user@example.com",
    to_name="John Doe",
    context={
        'first_name': 'John',
        'verification_link': 'https://platform.com/verify?token=abc123'
    },
    language='en'
)
```

### Using Convenience Functions

```python
from app.services.email import (
    send_verification_email,
    send_order_confirmation_email,
    send_quote_received_email
)

# Send order confirmation
await send_order_confirmation_email(
    client_email="client@example.com",
    client_name="Jane Smith",
    order_data={
        'id': 12345,
        'title': 'Custom Manufacturing Order',
        'quantity': 100,
        'delivery_deadline': '2024-03-15'
    },
    language='en'
)
```

### Scheduling Emails

```python
from datetime import datetime, timedelta
from app.tasks.email_tasks import schedule_email

# Schedule welcome email for 1 hour later
schedule_email(
    email_type=EmailType.WELCOME,
    to_email="user@example.com",
    to_name="New User",
    context={'first_name': 'New User'},
    send_at=datetime.now() + timedelta(hours=1),
    language='en'
)
```

### Bulk Email Campaigns

```python
from app.tasks.email_tasks import send_email_campaign

recipients = [
    {'email': 'user1@example.com', 'context': {'first_name': 'User1'}},
    {'email': 'user2@example.com', 'context': {'first_name': 'User2'}},
]

task_ids = send_email_campaign(
    template_name='newsletter',
    recipient_list=recipients,
    common_context={'campaign_date': '2024-01-15'}
)
```

## API Endpoints

### Email Management

```bash
# Send email (Admin only)
POST /api/v1/emails/send
{
    "email_type": "verification",
    "to_email": "user@example.com",
    "to_name": "John Doe",
    "context": {"first_name": "John"},
    "language": "en"
}

# Get email status
GET /api/v1/emails/status/{email_id}

# Send test email (Admin only)
POST /api/v1/emails/test?email_type=verification&to_email=test@example.com
```

### GDPR Compliance

```bash
# Unsubscribe (No auth required)
POST /api/v1/emails/unsubscribe
{
    "email": "user@example.com",
    "email_type": "newsletter",
    "reason": "Too frequent"
}

# Resubscribe (Auth required)
POST /api/v1/emails/resubscribe?email=user@example.com&email_type=newsletter
```

### Webhooks

```bash
# SendGrid webhook endpoint
POST /api/v1/emails/webhook/sendgrid
```

## Template Development

### Directory Structure

```
backend/app/templates/emails/
├── en/                          # English templates
│   ├── verification.html        # HTML template
│   ├── verification.txt         # Plain text template
│   ├── verification_subject.txt # Subject template
│   ├── order_confirmation.html
│   └── ...
└── pl/                          # Polish templates
    ├── verification.html
    ├── verification.txt
    └── ...
```

### Template Variables

All templates have access to common variables:

```jinja2
{{ platform_name }}           <!-- Manufacturing Platform -->
{{ support_email }}           <!-- support@manufacturingplatform.com -->
{{ company_address }}         <!-- Company address -->
{{ unsubscribe_url }}         <!-- Unsubscribe link -->
{{ current_year }}            <!-- Current year -->
```

### Custom Filters

```jinja2
{{ order.budget_max_pln|currency('PLN') }}    <!-- 25,000.00 zł -->
{{ order.delivery_deadline|datetime('%B %d, %Y') }}  <!-- March 15, 2024 -->
```

### Creating New Templates

1. **Create HTML template** (`template_name.html`)
2. **Create subject template** (`template_name_subject.txt`)
3. **Create plain text version** (`template_name.txt`) - optional
4. **Add to both language directories** (`en/` and `pl/`)
5. **Add EmailType enum** in `app/services/email.py`
6. **Add to email functions** in `app/services/email.py`

## Testing

### Template Testing

```python
from app.utils.email_test import run_template_test, quick_test_email

# Test all templates
results = run_template_test(language='en')

# Send test email
await quick_test_email('verification', 'test@example.com', 'en')
```

### Integration Testing

```python
from app.utils.email_test import email_test_utils

# Test Celery integration
task_id = email_test_utils.test_celery_integration('test@example.com')

# Test scheduled emails
email_test_utils.test_scheduled_email('test@example.com', delay_minutes=2)
```

## Monitoring & Analytics

### Email Tracking

```python
from app.services.email import get_email_status

# Get email delivery status
status = get_email_status(email_id)
print(f"Status: {status['status']}")
print(f"Delivered at: {status.get('updated_at')}")
```

### System Health

```python
from app.utils.email_test import email_test_utils

# Generate system report
report = email_test_utils.generate_email_report()
print(f"Success rate: {report['summary']['success_rate']}%")
```

### Celery Monitoring

Use Flower for real-time monitoring:
```bash
celery -A app.core.celery_config flower --port=5555
```

Access at: http://localhost:5555

## Troubleshooting

### Common Issues

1. **Templates not rendering**
   - Check template file exists in correct language directory
   - Verify template syntax and variables
   - Check Jinja2 environment setup

2. **Emails not sending**
   - Verify SendGrid API key and configuration
   - Check email service initialization
   - Review Celery worker logs

3. **Tracking not working**
   - Ensure Redis is running and accessible
   - Verify Redis URL configuration
   - Check webhook endpoint configuration

4. **Unsubscribe issues**
   - Verify Redis connection
   - Check unsubscribe manager initialization
   - Review GDPR compliance settings

### Debug Commands

```bash
# Test Redis connection
redis-cli ping

# Check Celery queues
celery -A app.core.celery_config inspect active_queues

# Test SendGrid API
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

## Performance Optimization

### Queue Configuration

- Use separate queues for different email priorities
- Configure worker concurrency based on SendGrid limits
- Implement rate limiting for bulk campaigns

### Template Optimization

- Minimize template complexity
- Use template caching where appropriate
- Optimize image loading and sizing

### Monitoring

- Set up alerts for failed email rates
- Monitor queue lengths and processing times
- Track delivery and engagement metrics

## Security Best Practices

1. **API Keys**: Store SendGrid API keys securely
2. **Webhooks**: Verify webhook signatures
3. **Rate Limiting**: Implement API rate limiting
4. **GDPR**: Ensure proper unsubscribe handling
5. **Logging**: Log email events for audit trails

## Future Enhancements

- Email A/B testing framework
- Advanced segmentation for campaigns
- Machine learning for optimal send times
- Integration with customer journey mapping
- Advanced analytics dashboard
- SMS notification fallback
- Email template builder UI

## Support

For issues or questions:
- Check logs in `/var/log/email_automation/`
- Review Celery worker status
- Monitor SendGrid delivery statistics
- Contact development team for escalation 