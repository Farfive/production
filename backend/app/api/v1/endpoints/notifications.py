from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from app.database import get_db
from app.core.auth import get_current_user, get_current_user_websocket
from app.models.user import User
from app.models.notifications import Notification
from app.schemas.notifications import (
    NotificationResponse,
    NotificationCreate,
    NotificationUpdate,
    NotificationSettingsResponse,
    NotificationSettingsUpdate
)
from app.services.notification_service import NotificationService
from app.services.websocket_service import WebSocketManager

router = APIRouter(prefix="/notifications", tags=["notifications"])

# WebSocket manager instance
websocket_manager = WebSocketManager()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    user_id: int,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time notifications."""
    try:
        # Verify user authentication
        user = await get_current_user_websocket(websocket, db)
        if not user or user.id != user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        await websocket_manager.connect(websocket, user_id)
        
        try:
            while True:
                # Keep connection alive and handle incoming messages
                data = await websocket.receive_text()
                # Echo heartbeat or handle client messages
                if data == "ping":
                    await websocket.send_text("pong")
                    
        except WebSocketDisconnect:
            websocket_manager.disconnect(user_id)
            
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)

@router.get("/quotes", response_model=List[NotificationResponse])
async def get_quote_notifications(
    limit: int = 50,
    offset: int = 0,
    unreadOnly: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quote-related notifications for the current user."""
    service = NotificationService(db)
    
    filters = {
        "user_id": current_user.id,
        "notification_types": [
            "quote_created", "quote_updated", "quote_accepted", 
            "quote_rejected", "quote_expired", "quote_viewed",
            "negotiation_started", "payment_required"
        ],
        "unread_only": unreadOnly
    }
    
    notifications = service.get_notifications(
        filters=filters,
        limit=limit,
        offset=offset
    )
    
    return notifications

@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific notification."""
    service = NotificationService(db)
    notification = service.get_notification(notification_id)
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Check if user owns this notification
    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this notification"
        )
    
    return notification

@router.post("/mark-read")
async def mark_notifications_as_read(
    notification_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark multiple notifications as read."""
    service = NotificationService(db)
    
    # Verify all notifications belong to current user
    notifications = service.get_notifications_by_ids(notification_ids)
    for notification in notifications:
        if notification.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot mark other users' notifications as read"
            )
    
    service.mark_notifications_as_read(notification_ids)
    return {"message": f"Marked {len(notification_ids)} notifications as read"}

@router.post("/mark-all-read")
async def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read for the current user."""
    service = NotificationService(db)
    count = service.mark_all_notifications_as_read(current_user.id)
    return {"message": f"Marked {count} notifications as read"}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a notification."""
    service = NotificationService(db)
    notification = service.get_notification(notification_id)
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Check if user owns this notification
    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete other users' notifications"
        )
    
    service.delete_notification(notification_id)
    return {"message": "Notification deleted successfully"}

@router.post("/delete-bulk")
async def delete_multiple_notifications(
    notification_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete multiple notifications."""
    service = NotificationService(db)
    
    # Verify all notifications belong to current user
    notifications = service.get_notifications_by_ids(notification_ids)
    for notification in notifications:
        if notification.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete other users' notifications"
            )
    
    service.delete_notifications(notification_ids)
    return {"message": f"Deleted {len(notification_ids)} notifications"}

@router.get("/unread-count")
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the count of unread notifications."""
    service = NotificationService(db)
    count = service.get_unread_count(current_user.id)
    return {"count": count}

@router.get("/settings", response_model=NotificationSettingsResponse)
async def get_notification_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's notification settings."""
    service = NotificationService(db)
    settings = service.get_user_settings(current_user.id)
    return settings

@router.put("/settings", response_model=NotificationSettingsResponse)
async def update_notification_settings(
    settings: NotificationSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user's notification settings."""
    service = NotificationService(db)
    updated_settings = service.update_user_settings(current_user.id, settings)
    return updated_settings

@router.post("/test")
async def create_test_notification(
    notification_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a test notification."""
    service = NotificationService(db)
    
    test_notification = service.create_test_notification(
        user_id=current_user.id,
        notification_type=notification_type
    )
    
    # Send via WebSocket if connected
    await websocket_manager.send_notification(current_user.id, test_notification)
    
    return {"message": "Test notification created"}

@router.post("/push/subscribe")
async def subscribe_to_push_notifications(
    subscription: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Subscribe to push notifications."""
    service = NotificationService(db)
    
    service.subscribe_to_push(current_user.id, subscription)
    return {"message": "Successfully subscribed to push notifications"}

@router.post("/push/unsubscribe")
async def unsubscribe_from_push_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unsubscribe from push notifications."""
    service = NotificationService(db)
    
    service.unsubscribe_from_push(current_user.id)
    return {"message": "Successfully unsubscribed from push notifications"}

@router.get("/history")
async def get_notification_history(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    notification_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification history with filtering."""
    service = NotificationService(db)
    
    # Parse dates
    start_date = datetime.fromisoformat(startDate) if startDate else None
    end_date = datetime.fromisoformat(endDate) if endDate else None
    
    filters = {
        "user_id": current_user.id,
        "start_date": start_date,
        "end_date": end_date,
        "notification_type": notification_type
    }
    
    history = service.get_notification_history(
        filters=filters,
        limit=limit,
        offset=offset
    )
    
    return history

@router.post("/send")
async def send_custom_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a custom notification (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can send custom notifications"
        )
    
    service = NotificationService(db)
    
    # Create and send notification to all recipients
    sent_count = 0
    for recipient_id in notification_data.recipient_ids:
        notification = service.create_notification(
            user_id=recipient_id,
            title=notification_data.title,
            message=notification_data.message,
            notification_type=notification_data.type,
            priority=notification_data.priority,
            data=notification_data.data
        )
        
        # Send via WebSocket if connected
        await websocket_manager.send_notification(recipient_id, notification)
        sent_count += 1
    
    return {"message": f"Notification sent to {sent_count} recipients"}

@router.get("/templates")
async def get_notification_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification templates."""
    service = NotificationService(db)
    templates = service.get_notification_templates()
    return templates

@router.put("/templates/{template_id}")
async def update_notification_template(
    template_id: str,
    template_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a notification template (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update notification templates"
        )
    
    service = NotificationService(db)
    service.update_notification_template(template_id, template_data)
    return {"message": "Template updated successfully"}

@router.get("/analytics")
async def get_notification_analytics(
    timeRange: str = "30d",
    notification_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification analytics."""
    service = NotificationService(db)
    
    # Parse time range
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = days_map.get(timeRange, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    filters = {
        "start_date": start_date,
        "user_id": current_user.id if current_user.role != "admin" else None,
        "notification_type": notification_type
    }
    
    analytics = service.get_notification_analytics(filters)
    return analytics

@router.post("/{notification_id}/snooze")
async def snooze_notification(
    notification_id: int,
    snooze_until: datetime,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Snooze a notification until a specific time."""
    service = NotificationService(db)
    notification = service.get_notification(notification_id)
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot snooze other users' notifications"
        )
    
    service.snooze_notification(notification_id, snooze_until)
    return {"message": "Notification snoozed successfully"}

@router.post("/{notification_id}/archive")
async def archive_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Archive a notification."""
    service = NotificationService(db)
    notification = service.get_notification(notification_id)
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot archive other users' notifications"
        )
    
    service.archive_notification(notification_id)
    return {"message": "Notification archived successfully"}

@router.get("/archived")
async def get_archived_notifications(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get archived notifications."""
    service = NotificationService(db)
    
    archived = service.get_archived_notifications(
        user_id=current_user.id,
        limit=limit,
        offset=offset
    )
    
    return archived 