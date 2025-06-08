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
from app.services.email import EmailType, EmailStatus
from app.services.email_templates import template_manager
from app.models.user import User
from app.models.order import Order


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_task(self, email_data: Dict[str, Any], template_name: str = None, 
                   context: Dict[str, Any] = None, rendered_content: Dict[str, str] = None, 
                   attachments: List[Dict] = None):
    """
    Enhanced Celery task to send individual email with retry logic
    Supports both pre-rendered content and template-based rendering
    Priority: NORMAL (use send_urgent_email_task for urgent emails)
    """
    from app.services.email import email_service
    
    try:
        # Render template if not pre-rendered
        if not rendered_content and template_name and context:
            rendered_content = template_manager.render_template(
                template_name, 
                context, 
                email_data.get('language', 'en')
            )
        elif not rendered_content:
            raise ValueError("Either rendered_content or template_name with context must be provided")
        
        # Update status to sending
        if email_service.tracker:
            email_service.tracker.update_status(
                email_data['id'], 
                EmailStatus.SENDING
            )
        
        # Send email
        success = asyncio.run(email_service.send_immediate_email(
            to_email=email_data['to_email'],
            subject=rendered_content['subject'],
            html_content=rendered_content['html_content'],
            text_content=rendered_content.get('text_content'),
            attachments=attachments or [],
            email_id=email_data['id']
        ))
        
        if success:
            # Update status to sent
            if email_service.tracker:
                email_service.tracker.update_status(
                    email_data['id'],
                    EmailStatus.SENT,
                    {'sent_at': datetime.now().isoformat()}
                )
            
            logger.info(f"Email {email_data['id']} sent successfully to {email_data['to_email']}")
            return {"status": "sent", "email_id": email_data['id']}
        else:
            raise Exception("Failed to send email via SendGrid")
            
    except Exception as exc:
        logger.error(f"Email task failed for {email_data['id']}: {str(exc)}")
        
        # Update retry count
        email_data['retry_count'] = email_data.get('retry_count', 0) + 1
        
        # Update tracking status
        if email_service.tracker:
            email_service.tracker.update_status(
                email_data['id'],
                EmailStatus.FAILED if email_data['retry_count'] >= self.max_retries else EmailStatus.PENDING,
                {
                    'retry_count': email_data['retry_count'],
                    'last_error': str(exc),
                    'failed_at': datetime.now().isoformat()
                }
            )
        
        # Retry if not exceeded max retries
        if email_data['retry_count'] < self.max_retries:
            # Exponential backoff: 60s, 120s, 240s
            countdown = 60 * (2 ** (email_data['retry_count'] - 1))
            logger.info(f"Retrying email {email_data['id']} in {countdown} seconds (attempt {email_data['retry_count'] + 1})")
            raise self.retry(countdown=countdown, exc=exc)
        else:
            logger.error(f"Email {email_data['id']} failed permanently after {self.max_retries} retries")
            return {"status": "failed", "email_id": email_data['id'], "error": str(exc)}


@celery_app.task(bind=True, max_retries=5, default_retry_delay=15)
def send_urgent_email_task(self, email_data: Dict[str, Any], template_name: str = None, 
                          context: Dict[str, Any] = None, rendered_content: Dict[str, str] = None, 
                          attachments: List[Dict] = None):
    """
    High-priority email task for urgent communications
    Priority: URGENT - Faster retry with shorter delays
    """
    from app.services.email import email_service
    
    try:
        # Render template if not pre-rendered
        if not rendered_content and template_name and context:
            rendered_content = template_manager.render_template(
                template_name, 
                context, 
                email_data.get('language', 'en')
            )
        elif not rendered_content:
            raise ValueError("Either rendered_content or template_name with context must be provided")
        
        # Mark as urgent in tracking
        if email_service.tracker:
            email_service.tracker.update_status(
                email_data['id'], 
                EmailStatus.SENDING,
                {'urgent': True, 'priority': 'high'}
            )
        
        # Send email immediately
        success = asyncio.run(email_service.send_immediate_email(
            to_email=email_data['to_email'],
            subject=f"[URGENT] {rendered_content['subject']}",
            html_content=rendered_content['html_content'],
            text_content=rendered_content.get('text_content'),
            attachments=attachments or [],
            email_id=email_data['id'],
            priority='high'
        ))
        
        if success:
            if email_service.tracker:
                email_service.tracker.update_status(
                    email_data['id'],
                    EmailStatus.SENT,
                    {'sent_at': datetime.now().isoformat(), 'urgent': True}
                )
            
            logger.info(f"Urgent email {email_data['id']} sent successfully to {email_data['to_email']}")
            return {"status": "sent", "email_id": email_data['id'], "urgent": True}
        else:
            raise Exception("Failed to send urgent email via SendGrid")
            
    except Exception as exc:
        logger.error(f"Urgent email task failed for {email_data['id']}: {str(exc)}")
        
        # Faster retry schedule for urgent emails: 15s, 30s, 60s, 120s, 240s
        retry_count = self.request.retries
        countdown = min(15 * (2 ** retry_count), 240)
        
        if retry_count < self.max_retries:
            logger.info(f"Retrying urgent email {email_data['id']} in {countdown} seconds")
            raise self.retry(countdown=countdown, exc=exc)
        else:
            # Send critical alert for failed urgent email
            from app.tasks.monitoring_tasks import send_health_alert
            send_health_alert.delay({
                'status': 'critical',
                'error': f"Urgent email failed permanently: {email_data['id']}",
                'timestamp': datetime.now().isoformat()
            })
            
            return {"status": "failed", "email_id": email_data['id'], "error": str(exc), "urgent": True}


@celery_app.task
def process_bounced_emails() -> Dict[str, Any]:
    """
    Process bounced emails and update user preferences
    Scheduled task - runs every 6 hours
    """
    from app.services.email import email_service
    
    try:
        # Get bounced emails from last 6 hours
        bounced_emails = asyncio.run(email_service.get_bounced_emails(hours=6))
        
        processed = 0
        for bounce in bounced_emails:
            try:
                # Update user email status
                asyncio.run(email_service.handle_email_bounce(
                    email=bounce['email'],
                    bounce_type=bounce['type'],
                    reason=bounce['reason']
                ))
                
                # If hard bounce, unsubscribe user
                if bounce['type'] == 'hard':
                    asyncio.run(email_service.unsubscribe_user(
                        email=bounce['email'],
                        reason='hard_bounce'
                    ))
                
                processed += 1
                
            except Exception as e:
                logger.error(f"Failed to process bounce for {bounce['email']}: {str(e)}")
        
        logger.info(f"Processed {processed} bounced emails")
        
        return {
            'status': 'completed',
            'bounces_processed': processed
        }
        
    except Exception as exc:
        logger.error(f"Bounce processing failed: {str(exc)}")
        raise


@celery_app.task(bind=True)
def send_bulk_email_task(self, email_list: List[Dict[str, Any]], template_name: str, common_context: Dict[str, Any]):
    """
    Celery task for sending bulk emails (newsletters, campaigns)
    """
    from app.services.email import email_service
    
    results = []
    successful = 0
    failed = 0
    
    for email_data in email_list:
        try:
            # Check if user is unsubscribed
            if email_service.unsubscribe_manager and email_service.unsubscribe_manager.is_unsubscribed(
                email_data['email'], template_name
            ):
                logger.info(f"Skipping bulk email to {email_data['email']} - unsubscribed")
                continue
            
            # Merge common context with user-specific context
            context = {**common_context, **email_data.get('context', {})}
            
            # Render template
            rendered = template_manager.render_template(
                template_name, 
                context, 
                email_data.get('language', 'en')
            )
            
            # Send email immediately (since we're already in a task)
            success = asyncio.run(email_service.send_immediate_email(
                to_email=email_data['email'],
                subject=rendered['subject'],
                html_content=rendered['html_content'],
                text_content=rendered.get('text_content')
            ))
            
            if success:
                successful += 1
                results.append({"email": email_data['email'], "status": "sent"})
            else:
                failed += 1
                results.append({"email": email_data['email'], "status": "failed", "error": "SendGrid error"})
                
        except Exception as e:
            failed += 1
            results.append({"email": email_data['email'], "status": "failed", "error": str(e)})
            logger.error(f"Bulk email failed for {email_data['email']}: {str(e)}")
    
    logger.info(f"Bulk email campaign completed: {successful} sent, {failed} failed")
    
    return {
        "template": template_name,
        "total": len(email_list),
        "successful": successful,
        "failed": failed,
        "results": results
    }


@celery_app.task
def process_email_webhook(webhook_data: List[Dict[str, Any]]):
    """
    Process SendGrid webhook events in background
    """
    from app.services.email import email_service
    
    try:
        email_service.process_webhook(webhook_data)
        logger.info(f"Processed {len(webhook_data)} webhook events")
        return {"processed": len(webhook_data)}
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise


@celery_app.task
def retry_failed_emails():
    """
    Periodic task to retry failed emails that haven't exceeded max retries
    """
    from app.services.email import email_service
    
    if not email_service.tracker:
        return {"message": "Email tracking not available"}
    
    # This would typically query failed emails from database
    # For now, we'll return a placeholder
    logger.info("Checking for failed emails to retry...")
    
    return {"message": "Failed email retry check completed"}


@celery_app.task
def cleanup_old_tracking():
    """
    Clean up old email tracking data (older than 30 days)
    """
    from app.services.email import email_service
    
    if not email_service.tracker:
        return {"message": "Email tracking not available"}
    
    try:
        # Clean up Redis keys older than 30 days
        # This is a simplified version - in production you'd want more sophisticated cleanup
        logger.info("Cleaning up old email tracking data...")
        
        return {"message": "Email tracking cleanup completed"}
    
    except Exception as e:
        logger.error(f"Error during tracking cleanup: {str(e)}")
        raise


@celery_app.task
def send_deadline_reminders():
    """
    Send deadline reminder emails for orders approaching delivery dates
    """
    try:
        db = next(get_db())
        
        # Find orders with deadlines in 3 days or 1 day
        upcoming_deadlines = db.query(Order).filter(
            Order.delivery_deadline.between(
                datetime.now().date(),
                (datetime.now() + timedelta(days=3)).date()
            ),
            Order.status.in_(['in_production', 'accepted'])
        ).all()
        
        sent_count = 0
        
        for order in upcoming_deadlines:
            try:
                # Calculate days remaining
                days_remaining = (order.delivery_deadline - datetime.now().date()).days
                
                if days_remaining in [1, 3]:  # Send on 3 days and 1 day before
                    # Get order client
                    client = db.query(User).filter(User.id == order.client_id).first()
                    
                    if client:
                        # Queue reminder email
                        send_email_task.delay(
                            email_data={
                                'id': f"reminder_{order.id}_{days_remaining}d",
                                'email_type': EmailType.DEADLINE_REMINDER.value,
                                'to_email': client.email,
                                'to_name': f"{client.first_name} {client.last_name}",
                                'retry_count': 0,
                                'max_retries': 3
                            },
                            rendered_content=template_manager.render_template(
                                EmailType.DEADLINE_REMINDER.value,
                                {
                                    'name': f"{client.first_name} {client.last_name}",
                                    'order': {
                                        'id': order.id,
                                        'title': order.title,
                                        'delivery_deadline': order.delivery_deadline.isoformat()
                                    },
                                    'days_remaining': days_remaining,
                                    'order_link': f"https://manufacturingplatform.com/orders/{order.id}"
                                },
                                client.preferred_language or 'en'
                            )
                        )
                        sent_count += 1
                        
            except Exception as e:
                logger.error(f"Error sending deadline reminder for order {order.id}: {str(e)}")
                continue
        
        logger.info(f"Queued {sent_count} deadline reminder emails")
        return {"reminders_sent": sent_count}
        
    except Exception as e:
        logger.error(f"Error in deadline reminders task: {str(e)}")
        raise
    finally:
        db.close()


@celery_app.task
def send_scheduled_email(email_type: str, to_email: str, to_name: str, context: Dict[str, Any], language: str = 'en'):
    """
    Send a scheduled email
    """
    from app.services.email import email_service
    
    try:
        # Convert string back to enum
        email_type_enum = EmailType(email_type)
        
        # Send email using the main service
        email_id = asyncio.run(email_service.send_email(
            email_type=email_type_enum,
            to_email=to_email,
            to_name=to_name,
            context=context,
            language=language
        ))
        
        if email_id:
            logger.info(f"Scheduled email sent successfully: {email_id}")
            return {"status": "sent", "email_id": email_id}
        else:
            logger.error(f"Failed to send scheduled email to {to_email}")
            return {"status": "failed", "error": "Email service returned None"}
            
    except Exception as e:
        logger.error(f"Error sending scheduled email: {str(e)}")
        raise


# Helper function to schedule emails
def schedule_email(email_type: EmailType, to_email: str, to_name: str, context: Dict[str, Any], 
                  send_at: datetime, language: str = 'en'):
    """
    Schedule an email to be sent at a specific time
    """
    send_scheduled_email.apply_async(
        args=[email_type.value, to_email, to_name, context, language],
        eta=send_at
    )
    
    logger.info(f"Scheduled {email_type.value} email for {to_email} at {send_at}")


# Helper function for bulk email campaigns
def send_email_campaign(template_name: str, recipient_list: List[Dict], common_context: Dict[str, Any]):
    """
    Send bulk email campaign
    """
    # Split into chunks to avoid overwhelming the system
    chunk_size = 100
    chunks = [recipient_list[i:i + chunk_size] for i in range(0, len(recipient_list), chunk_size)]
    
    task_ids = []
    for chunk in chunks:
        task = send_bulk_email_task.delay(chunk, template_name, common_context)
        task_ids.append(task.id)
    
    logger.info(f"Started bulk email campaign '{template_name}' with {len(chunks)} chunks")
    return task_ids 