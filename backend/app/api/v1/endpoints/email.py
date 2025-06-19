from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.services.email import (
    email_service, EmailType, get_email_status, 
    unsubscribe_email, resubscribe_email, is_email_unsubscribed
)


router = APIRouter()


class SendEmailRequest(BaseModel):
    """Request model for sending emails"""
    email_type: str
    to_email: EmailStr
    to_name: str
    context: Dict[str, Any] = {}
    language: str = "en"
    attachments: Optional[List[Dict]] = None


class UnsubscribeRequest(BaseModel):
    """Request model for unsubscribing"""
    email: EmailStr
    email_type: Optional[str] = None
    reason: Optional[str] = None


class EmailStatusResponse(BaseModel):
    """Response model for email status"""
    email_id: str
    status: str
    created_at: str
    updated_at: Optional[str] = None
    email_type: str
    to_email: str
    subject: str


@router.post("/send")
async def send_email(
    request: SendEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send email using the automation system
    
    Admin only endpoint for manual email sending
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Validate email type
        try:
            email_type_enum = EmailType(request.email_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid email type: {request.email_type}")
        
        # Send email
        email_id = await email_service.send_email(
            email_type=email_type_enum,
            to_email=request.to_email,
            to_name=request.to_name,
            context=request.context,
            language=request.language,
            attachments=request.attachments
        )
        
        if email_id:
            return {
                "success": True,
                "message": "Email sent successfully",
                "email_id": email_id
            }
        else:
            return {
                "success": False,
                "message": "Failed to send email",
                "email_id": None
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending email: {str(e)}")


@router.get("/status/{email_id}")
async def get_email_delivery_status(
    email_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get email delivery status and tracking information
    """
    try:
        status_data = get_email_status(email_id)
        
        if not status_data:
            raise HTTPException(status_code=404, detail="Email not found")
        
        return {
            "email_id": email_id,
            "status": status_data.get("status"),
            "email_type": status_data.get("email_type"),
            "to_email": status_data.get("to_email"),
            "subject": status_data.get("subject"),
            "created_at": status_data.get("created_at"),
            "updated_at": status_data.get("updated_at"),
            "metadata": {
                "event_type": status_data.get("event_type"),
                "timestamp": status_data.get("timestamp"),
                "user_agent": status_data.get("user_agent"),
                "ip": status_data.get("ip"),
                "url": status_data.get("url")
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving email status: {str(e)}")


@router.post("/unsubscribe")
async def unsubscribe_user_email(request: UnsubscribeRequest):
    """
    Unsubscribe email from communications (GDPR compliant)
    
    Public endpoint - no authentication required for GDPR compliance
    """
    try:
        unsubscribe_email(
            email=request.email,
            email_type=request.email_type,
            reason=request.reason
        )
        
        return {
            "success": True,
            "message": f"Successfully unsubscribed {request.email}"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error unsubscribing: {str(e)}")


@router.post("/resubscribe")
async def resubscribe_user_email(
    email: EmailStr,
    email_type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Re-subscribe email to communications
    
    User must be authenticated and email must match their account
    """
    if current_user.email != email and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Can only resubscribe your own email")
    
    try:
        resubscribe_email(email=email, email_type=email_type)
        
        return {
            "success": True,
            "message": f"Successfully resubscribed {email}"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resubscribing: {str(e)}")


@router.get("/unsubscribe-status/{email}")
async def check_unsubscribe_status(
    email: EmailStr,
    email_type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Check if email is unsubscribed from communications
    """
    if current_user.email != email and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Can only check your own email status")
    
    try:
        is_unsubscribed = is_email_unsubscribed(email=email, email_type=email_type)
        
        return {
            "email": email,
            "email_type": email_type,
            "is_unsubscribed": is_unsubscribed
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking status: {str(e)}")


@router.post("/webhook/sendgrid")
async def sendgrid_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    SendGrid webhook endpoint for email event tracking
    
    This endpoint receives delivery, open, click, bounce, and unsubscribe events
    """
    try:
        # Get the raw body
        body = await request.body()
        
        # Parse JSON
        import json
        webhook_data = json.loads(body)
        
        # Process webhook in background
        background_tasks.add_task(email_service.process_webhook, webhook_data)
        
        return {"message": "Webhook processed successfully"}
    
    except Exception as e:
        # Log error but return 200 to prevent SendGrid retries
        from loguru import logger
        logger.error(f"Error processing SendGrid webhook: {str(e)}")
        return {"message": "Webhook received"}


@router.get("/analytics")
async def get_email_analytics(
    days: int = 7,
    email_type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get email analytics and performance metrics
    
    Admin only endpoint
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # This would typically query a proper analytics database
        # For now, return a placeholder response
        return {
            "period_days": days,
            "email_type": email_type,
            "metrics": {
                "total_sent": 0,
                "delivery_rate": 95.5,
                "open_rate": 24.3,
                "click_rate": 3.7,
                "bounce_rate": 0.8,
                "unsubscribe_rate": 0.2
            },
            "daily_stats": [
                # Placeholder daily statistics
            ]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving analytics: {str(e)}")


@router.get("/templates")
async def list_email_templates(
    language: str = "en",
    current_user: User = Depends(get_current_user)
):
    """
    List available email templates
    
    Admin only endpoint
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Get available email types
        email_types = [email_type.value for email_type in EmailType]
        
        templates = []
        for email_type in email_types:
            templates.append({
                "name": email_type,
                "display_name": email_type.replace("_", " ").title(),
                "language": language,
                "category": "transactional",
                "description": f"Template for {email_type.replace('_', ' ')} emails"
            })
        
        return {
            "language": language,
            "templates": templates
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving templates: {str(e)}")


@router.post("/test")
async def send_test_email(
    email_type: str,
    to_email: EmailStr,
    current_user: User = Depends(get_current_user)
):
    """
    Send test email with sample data
    
    Admin only endpoint for testing email templates
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Validate email type
        try:
            email_type_enum = EmailType(email_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid email type: {email_type}")
        
        # Generate test context based on email type
        test_contexts = {
            EmailType.VERIFICATION: {
                "first_name": "Test User",
                "verification_link": "https://example.com/verify",
                "verification_token": "test_token_123"
            },
            EmailType.ORDER_CONFIRMATION: {
                "client_name": "Test Client",
                "order": {
                    "id": 12345,
                    "title": "Test Manufacturing Order",
                    "quantity": 100,
                    "material": "Aluminum",
                    "delivery_deadline": "2024-02-15"
                },
                "order_link": "https://example.com/orders/12345"
            },
            EmailType.QUOTE_RECEIVED: {
                "client_name": "Test Client",
                "order": {"id": 12345, "title": "Test Order"},
                "quote": {"id": 67890, "price": 5000.00, "lead_time": 14},
                "manufacturer": {"business_name": "Test Manufacturing Co"},
                "review_link": "https://example.com/quotes/67890"
            }
        }
        
        context = test_contexts.get(email_type_enum, {"test": True, "name": "Test User"})
        
        # Send test email
        email_id = await email_service.send_email(
            email_type=email_type_enum,
            to_email=to_email,
            to_name="Test User",
            context=context
        )
        
        if email_id:
            return {
                "success": True,
                "message": f"Test email sent successfully to {to_email}",
                "email_id": email_id,
                "email_type": email_type
            }
        else:
            return {
                "success": False,
                "message": "Failed to send test email"
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending test email: {str(e)}") 