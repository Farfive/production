from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from ....database import get_db
from ....services.mandatory_escrow_service import MandatoryEscrowService
from ....models import Quote, User
from ....core.auth import get_current_user
from ....schemas.escrow import (
    MandatoryEscrowResponse,
    EscrowPaymentRequest,
    EscrowEnforcementStats,
    BypassDetectionRequest
)

router = APIRouter()


@router.post("/enforce/{quote_id}", response_model=MandatoryEscrowResponse)
async def enforce_mandatory_escrow(
    quote_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Automatically enforce escrow payment when quote becomes ACTIVE.
    This is called automatically when quote status changes to ACTIVE.
    """
    
    # Verify quote exists and user has access
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Only quote owner or client can trigger this
    if quote.manufacturer_id != current_user.id and quote.order.client_id != current_user.id:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Access denied")
    
    mandatory_service = MandatoryEscrowService(db)
    
    try:
        result = mandatory_service.enforce_escrow_on_quote_activation(quote_id)
        
        # Schedule follow-up tasks
        if result.get("escrow_required"):
            background_tasks.add_task(
                schedule_payment_reminders,
                result["escrow_id"]
            )
        
        return MandatoryEscrowResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/payment/{escrow_id}/process")
async def process_escrow_payment(
    escrow_id: int,
    payment_request: EscrowPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Process escrow payment and unblock communication."""
    
    mandatory_service = MandatoryEscrowService(db)
    
    try:
        result = mandatory_service.process_payment_and_unblock(
            escrow_id=escrow_id,
            payment_reference=payment_request.payment_reference
        )
        
        return {
            "success": result["success"],
            "message": "Payment processed successfully" if result["success"] else "Payment processing failed",
            "escrow_status": result.get("escrow_status"),
            "communication_unblocked": result.get("communication_unblocked", False),
            "work_authorized": result.get("work_authorized", False)
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status/{quote_id}")
async def get_escrow_status(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current escrow status for a quote."""
    
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Check access
    if quote.manufacturer_id != current_user.id and quote.order.client_id != current_user.id:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Access denied")
    
    from ....models.payment_escrow import EscrowTransaction
    
    escrow = db.query(EscrowTransaction).filter(
        EscrowTransaction.quote_id == quote_id
    ).first()
    
    if not escrow:
        return {
            "escrow_required": False,
            "quote_status": quote.status,
            "payment_status": "not_required"
        }
    
    # Calculate time remaining
    from datetime import datetime, timedelta
    deadline = escrow.created_at + timedelta(days=7)
    time_remaining = deadline - datetime.utcnow()
    
    return {
        "escrow_required": True,
        "escrow_id": escrow.id,
        "escrow_status": escrow.status.value,
        "quote_status": quote.status,
        "payment_status": "pending" if escrow.status.value == "PENDING" else "completed",
        "total_amount": escrow.total_amount,
        "commission": escrow.platform_commission,
        "manufacturer_payout": escrow.manufacturer_payout,
        "payment_deadline": deadline.isoformat(),
        "time_remaining_hours": max(0, int(time_remaining.total_seconds() / 3600)),
        "communication_blocked": escrow.release_conditions.get("communication_blocked", False),
        "milestones": len(escrow.milestones) if escrow.milestones else 0
    }


@router.post("/bypass-detection/{quote_id}")
async def detect_bypass_attempt(
    quote_id: int,
    detection_request: BypassDetectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detect potential payment bypass attempts for active quotes."""
    
    mandatory_service = MandatoryEscrowService(db)
    
    result = mandatory_service.detect_bypass_attempt_on_active_quote(
        quote_id=quote_id,
        message_content=detection_request.message_content
    )
    
    if result:
        return {
            "bypass_detected": True,
            "confidence_score": result["confidence"],
            "action_taken": result["action_taken"],
            "escrow_id": result["escrow_id"],
            "message": "Bypass attempt detected and handled"
        }
    
    return {
        "bypass_detected": False,
        "message": "No bypass attempt detected"
    }


@router.post("/deadline-check/{escrow_id}")
async def check_payment_deadline(
    escrow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if payment deadline has been exceeded and take action."""
    
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    mandatory_service = MandatoryEscrowService(db)
    
    result = mandatory_service.handle_payment_deadline_exceeded(escrow_id)
    
    return {
        "action_taken": result["action"],
        "escrow_status": result.get("escrow_status"),
        "quote_status": result.get("quote_status"),
        "reason": result["reason"]
    }


@router.get("/enforcement-stats", response_model=EscrowEnforcementStats)
async def get_enforcement_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics on escrow enforcement effectiveness."""
    
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    mandatory_service = MandatoryEscrowService(db)
    stats = mandatory_service.get_escrow_enforcement_stats()
    
    return EscrowEnforcementStats(**stats)


@router.get("/pending-payments")
async def get_pending_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all pending escrow payments for current user."""
    
    from ....models.payment_escrow import EscrowTransaction, EscrowStatus
    
    # Get pending escrows for current user
    if current_user.role == "CLIENT":
        escrows = db.query(EscrowTransaction).filter(
            EscrowTransaction.client_id == current_user.id,
            EscrowTransaction.status == EscrowStatus.PENDING
        ).all()
    elif current_user.role == "MANUFACTURER":
        escrows = db.query(EscrowTransaction).filter(
            EscrowTransaction.manufacturer_id == current_user.id,
            EscrowTransaction.status == EscrowStatus.PENDING
        ).all()
    else:
        escrows = []
    
    pending_payments = []
    for escrow in escrows:
        from datetime import datetime, timedelta
        deadline = escrow.created_at + timedelta(days=7)
        time_remaining = deadline - datetime.utcnow()
        
        pending_payments.append({
            "escrow_id": escrow.id,
            "quote_id": escrow.quote_id,
            "order_id": escrow.order_id,
            "total_amount": escrow.total_amount,
            "commission": escrow.platform_commission,
            "deadline": deadline.isoformat(),
            "hours_remaining": max(0, int(time_remaining.total_seconds() / 3600)),
            "is_urgent": time_remaining.total_seconds() < 24 * 3600,  # Less than 24 hours
            "manufacturer_name": escrow.manufacturer.business_name if escrow.manufacturer else "Unknown",
            "payment_url": f"/payment/escrow/{escrow.id}"
        })
    
    return {
        "pending_payments": pending_payments,
        "total_pending": len(pending_payments),
        "urgent_payments": len([p for p in pending_payments if p["is_urgent"]])
    }


@router.post("/send-reminder/{escrow_id}")
async def send_payment_reminder(
    escrow_id: int,
    reminder_type: str = "urgent",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send manual payment reminder."""
    
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from ....models.payment_escrow import EscrowTransaction
    
    escrow = db.query(EscrowTransaction).filter(
        EscrowTransaction.id == escrow_id
    ).first()
    
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found")
    
    mandatory_service = MandatoryEscrowService(db)
    
    # Send reminder based on type
    if reminder_type == "gentle":
        message = "Friendly reminder: Your secure payment is pending."
    elif reminder_type == "urgent":
        message = "URGENT: Payment deadline approaching. Please complete payment to proceed."
    elif reminder_type == "final":
        message = "FINAL WARNING: Quote will expire soon without payment."
    else:
        message = "Payment reminder"
    
    # Create notification
    mandatory_service.notification_service.create_notification(
        user_id=escrow.client_id,
        title=f"💳 Payment Reminder - {reminder_type.title()}",
        message=message,
        notification_type="PAYMENT_REMINDER",
        priority="HIGH" if reminder_type in ["urgent", "final"] else "MEDIUM",
        action_url=f"/payment/escrow/{escrow_id}",
        metadata={
            "escrow_id": escrow_id,
            "reminder_type": reminder_type,
            "manual_reminder": True
        }
    )
    
    return {
        "success": True,
        "message": f"{reminder_type.title()} reminder sent successfully"
    }


# Background task functions
async def schedule_payment_reminders(escrow_id: int):
    """Background task to schedule payment reminders."""
    # This would integrate with a task queue like Celery
    # For now, it's a placeholder
    pass


@router.get("/communication-status/{quote_id}")
async def get_communication_status(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if communication is blocked due to pending payment."""
    
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Check access
    if quote.manufacturer_id != current_user.id and quote.order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    from ....models.communication import CommunicationBlock
    
    active_block = db.query(CommunicationBlock).filter(
        CommunicationBlock.quote_id == quote_id,
        CommunicationBlock.is_active == True
    ).first()
    
    if active_block:
        return {
            "communication_blocked": True,
            "block_reason": active_block.reason,
            "block_type": active_block.block_type,
            "blocked_until": active_block.blocked_until.isoformat() if active_block.blocked_until else None,
            "escrow_id": active_block.escrow_id,
            "message": "Communication is blocked until payment is completed through escrow."
        }
    
    return {
        "communication_blocked": False,
        "message": "Communication is allowed."
    }


@router.post("/unblock-emergency/{quote_id}")
async def emergency_unblock(
    quote_id: int,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Emergency unblock communication (admin only)."""
    
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from ....models.communication import CommunicationBlock
    
    blocks = db.query(CommunicationBlock).filter(
        CommunicationBlock.quote_id == quote_id,
        CommunicationBlock.is_active == True
    ).all()
    
    for block in blocks:
        block.is_active = False
        block.unblocked_at = datetime.utcnow()
        block.unblock_reason = f"Emergency unblock by admin: {reason}"
        if block.meta_json is None:
            block.meta_json = {}
        block.meta_json["emergency_unblock"] = True
        block.meta_json["admin_id"] = current_user.id
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Communication unblocked for quote {quote_id}",
        "blocks_removed": len(blocks)
    } 