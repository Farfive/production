from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
import uuid
from decimal import Decimal

from ..models.payment_escrow import EscrowTransaction, EscrowStatus, PaymentMethod
from ..models import Quote, Order, User
from ..services.escrow_service import EscrowService
from ..core.config import settings
from ..services.notification_service import NotificationService
from ..services.email import EmailService


class MandatoryEscrowService:
    """
    Service that automatically enforces escrow payments when quotes become active.
    Prevents any transaction bypass and ensures platform commission collection.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.escrow_service = EscrowService(db)
        self.notification_service = NotificationService(db)
        self.email_service = EmailService()
        self.commission_rate = 0.08  # 8% mandatory commission
        
    def enforce_escrow_on_quote_activation(self, quote_id: int) -> Dict[str, Any]:
        """
        Automatically enforce escrow payment when quote becomes ACTIVE.
        This is the core function that prevents payment bypass.
        """
        quote = self.db.query(Quote).filter(Quote.id == quote_id).first()
        if not quote:
            raise ValueError("Quote not found")
        
        # Only enforce for ACTIVE quotes
        if quote.status != "ACTIVE":
            return {"escrow_required": False, "reason": "Quote not active"}
        
        # Check if escrow already exists
        existing_escrow = self.db.query(EscrowTransaction).filter(
            EscrowTransaction.quote_id == quote_id,
            EscrowTransaction.status.in_([EscrowStatus.PENDING, EscrowStatus.FUNDED])
        ).first()
        
        if existing_escrow:
            return {
                "escrow_required": True,
                "escrow_id": existing_escrow.id,
                "status": "existing",
                "payment_deadline": existing_escrow.created_at + timedelta(days=7)
            }
        
        # Create mandatory escrow transaction
        escrow_result = self._create_mandatory_escrow(quote)
        
        # Block all communication until payment
        self._block_communication_until_payment(quote, escrow_result["escrow_id"])
        
        # Send immediate payment instructions
        self._send_mandatory_payment_instructions(quote, escrow_result)
        
        # Set up automatic reminders and enforcement
        self._setup_payment_enforcement(quote, escrow_result["escrow_id"])
        
        return escrow_result
    
    def _create_mandatory_escrow(self, quote: Quote) -> Dict[str, Any]:
        """Create mandatory escrow transaction with immediate payment requirement."""
        
        # Calculate amounts
        total_amount = float(quote.total_price)
        commission = total_amount * self.commission_rate
        manufacturer_payout = total_amount - commission
        
        # Create escrow with 7-day payment deadline
        escrow = EscrowTransaction(
            order_id=quote.order_id,
            quote_id=quote.id,
            client_id=quote.order.client_id,
            manufacturer_id=quote.manufacturer_id,
            total_amount=total_amount,
            platform_commission=commission,
            manufacturer_payout=manufacturer_payout,
            payment_method=PaymentMethod.BANK_TRANSFER,  # Default, can be changed
            status=EscrowStatus.PENDING,
            release_conditions={
                "payment_required": True,
                "communication_blocked": True,
                "automatic_enforcement": True,
                "bypass_prevention": True
            },
            additional_metadata={
                "mandatory": True,
                "auto_created": True,
                "quote_activation_date": datetime.utcnow().isoformat(),
                "payment_deadline": (datetime.utcnow() + timedelta(days=7)).isoformat(),
                "enforcement_level": "maximum"
            }
        )
        
        self.db.add(escrow)
        self.db.flush()
        
        # Create milestones if project is large (>$5000)
        if total_amount > 5000:
            self._create_automatic_milestones(escrow.id, total_amount)
        
        self.db.commit()
        
        return {
            "escrow_required": True,
            "escrow_id": escrow.id,
            "total_amount": total_amount,
            "commission": commission,
            "manufacturer_payout": manufacturer_payout,
            "payment_deadline": datetime.utcnow() + timedelta(days=7),
            "status": "created",
            "enforcement_level": "mandatory"
        }
    
    def _create_automatic_milestones(self, escrow_id: int, total_amount: float):
        """Create automatic milestones for large projects."""
        from ..models.payment_escrow import PaymentEscrowMilestone
        
        # Standard milestone structure for large projects
        milestones = [
            {"name": "Project Initiation", "percentage": 30, "description": "Project start and initial setup"},
            {"name": "Progress Review", "percentage": 40, "description": "Midpoint progress verification"},
            {"name": "Final Delivery", "percentage": 30, "description": "Project completion and delivery"}
        ]
        
        for milestone_data in milestones:
            milestone = PaymentEscrowMilestone(
                escrow_transaction_id=escrow_id,
                milestone_name=milestone_data["name"],
                milestone_description=milestone_data["description"],
                milestone_percentage=milestone_data["percentage"],
                milestone_amount=total_amount * (milestone_data["percentage"] / 100),
                expected_completion_date=datetime.utcnow() + timedelta(days=30 * len(milestones))
            )
            self.db.add(milestone)
        
        self.db.commit()
    
    def _block_communication_until_payment(self, quote: Quote, escrow_id: int):
        """Block all direct communication between client and manufacturer until payment."""
        
        # Create communication block record
        from ..models.communication import CommunicationBlock
        
        block = CommunicationBlock(
            order_id=quote.order_id,
            quote_id=quote.id,
            escrow_id=escrow_id,
            client_id=quote.order.client_id,
            manufacturer_id=quote.manufacturer_id,
            block_type="PAYMENT_REQUIRED",
            is_active=True,
            reason="Payment required through escrow system",
            blocked_until=datetime.utcnow() + timedelta(days=7),
            meta_json={
                "automatic_block": True,
                "bypass_prevention": True,
                "escrow_enforcement": True
            }
        )
        
        self.db.add(block)
        self.db.commit()
    
    def _send_mandatory_payment_instructions(self, quote: Quote, escrow_result: Dict[str, Any]):
        """Send immediate payment instructions to client."""
        
        client = quote.order.client
        manufacturer = quote.manufacturer
        
        # Email to client with payment instructions
        email_data = {
            "client_name": client.first_name,
            "manufacturer_name": manufacturer.business_name or manufacturer.company_name,
            "quote_id": quote.id,
            "total_amount": escrow_result["total_amount"],
            "commission": escrow_result["commission"],
            "payment_deadline": escrow_result["payment_deadline"].strftime("%Y-%m-%d"),
            "escrow_id": escrow_result["escrow_id"],
            "payment_url": f"{settings.FRONTEND_URL}/payment/escrow/{escrow_result['escrow_id']}"
        }
        
        self.email_service.send_mandatory_payment_instructions(client.email, email_data)
        
        # In-app notification
        self.notification_service.create_notification(
            user_id=client.id,
            title="🔒 Payment Required - Escrow Protection",
            message=f"Your quote from {manufacturer.business_name} is ready! Secure payment of ${escrow_result['total_amount']:,.2f} is required to proceed.",
            notification_type="PAYMENT_REQUIRED",
            priority="HIGH",
            action_url=f"/payment/escrow/{escrow_result['escrow_id']}",
            metadata={
                "escrow_id": escrow_result["escrow_id"],
                "quote_id": quote.id,
                "mandatory": True
            }
        )
        
        # Notification to manufacturer
        self.notification_service.create_notification(
            user_id=manufacturer.id,
            title="💰 Payment Processing - Client Notified",
            message=f"Client has been notified to make secure payment. Work can begin once funds are in escrow.",
            notification_type="ESCROW_PENDING",
            priority="MEDIUM",
            metadata={
                "escrow_id": escrow_result["escrow_id"],
                "quote_id": quote.id
            }
        )
    
    def _setup_payment_enforcement(self, quote: Quote, escrow_id: int):
        """Set up automatic payment reminders and enforcement actions."""
        
        # Schedule reminder emails
        reminder_schedule = [
            {"days": 1, "type": "gentle_reminder"},
            {"days": 3, "type": "urgent_reminder"},
            {"days": 5, "type": "final_warning"},
            {"days": 7, "type": "quote_expiration"}
        ]
        
        for reminder in reminder_schedule:
            self._schedule_payment_reminder(
                escrow_id=escrow_id,
                days_from_now=reminder["days"],
                reminder_type=reminder["type"]
            )
    
    def _schedule_payment_reminder(self, escrow_id: int, days_from_now: int, reminder_type: str):
        """Schedule payment reminder (would integrate with task queue like Celery)."""
        
        # In production, this would use Celery or similar task queue
        # For now, we'll create a reminder record
        from ..models.communication import PaymentReminder
        
        reminder = PaymentReminder(
            escrow_id=escrow_id,
            reminder_type=reminder_type,
            scheduled_for=datetime.utcnow() + timedelta(days=days_from_now),
            is_sent=False,
            meta_json={
                "automatic": True,
                "enforcement_level": "mandatory"
            }
        )
        
        self.db.add(reminder)
        self.db.commit()
    
    def process_payment_and_unblock(self, escrow_id: int, payment_reference: str) -> Dict[str, Any]:
        """Process payment and unblock communication."""
        
        escrow = self.db.query(EscrowTransaction).filter(
            EscrowTransaction.id == escrow_id
        ).first()
        
        if not escrow:
            raise ValueError("Escrow transaction not found")
        
        # Verify and process payment
        payment_success = self.escrow_service.fund_escrow(
            escrow_id=escrow_id,
            payment_reference=payment_reference,
            verification_data={"automatic_verification": True}
        )
        
        if payment_success:
            # Unblock communication
            self._unblock_communication(escrow)
            
            # Notify both parties
            self._notify_payment_success(escrow)
            
            # Allow manufacturer to start work
            self._authorize_work_start(escrow)
            
            return {
                "success": True,
                "escrow_status": "funded",
                "communication_unblocked": True,
                "work_authorized": True
            }
        
        return {"success": False, "reason": "Payment verification failed"}
    
    def _unblock_communication(self, escrow: EscrowTransaction):
        """Unblock communication after successful payment."""
        
        from ..models.communication import CommunicationBlock
        
        # Deactivate communication blocks
        blocks = self.db.query(CommunicationBlock).filter(
            CommunicationBlock.escrow_id == escrow.id,
            CommunicationBlock.is_active == True
        ).all()
        
        for block in blocks:
            block.is_active = False
            block.unblocked_at = datetime.utcnow()
            block.unblock_reason = "Payment completed successfully"
        
        self.db.commit()
    
    def _notify_payment_success(self, escrow: EscrowTransaction):
        """Notify both parties of successful payment."""
        
        # Notify client
        self.notification_service.create_notification(
            user_id=escrow.client_id,
            title="✅ Payment Secured - Project Starting",
            message=f"Your payment of ${escrow.total_amount:,.2f} is now secured in escrow. The manufacturer can begin work.",
            notification_type="PAYMENT_SUCCESS",
            priority="HIGH",
            metadata={
                "escrow_id": escrow.id,
                "quote_id": escrow.quote_id
            }
        )
        
        # Notify manufacturer
        self.notification_service.create_notification(
            user_id=escrow.manufacturer_id,
            title="🚀 Funds Secured - Start Production",
            message=f"Client payment of ${escrow.total_amount:,.2f} is secured in escrow. You can now begin production.",
            notification_type="WORK_AUTHORIZED",
            priority="HIGH",
            metadata={
                "escrow_id": escrow.id,
                "quote_id": escrow.quote_id
            }
        )
    
    def _authorize_work_start(self, escrow: EscrowTransaction):
        """Authorize manufacturer to start work."""
        
        # Update quote status
        quote = escrow.quote
        quote.status = "IN_PROGRESS"
        quote.work_started_at = datetime.utcnow()
        
        # Update order status
        order = escrow.order
        order.status = "IN_PROGRESS"
        order.updated_at = datetime.utcnow()
        
        self.db.commit()
    
    def handle_payment_deadline_exceeded(self, escrow_id: int) -> Dict[str, Any]:
        """Handle cases where payment deadline is exceeded."""
        
        escrow = self.db.query(EscrowTransaction).filter(
            EscrowTransaction.id == escrow_id
        ).first()
        
        if not escrow or escrow.status != EscrowStatus.PENDING:
            return {"action": "none", "reason": "Escrow not in pending status"}
        
        # Check if deadline exceeded
        deadline = escrow.created_at + timedelta(days=7)
        if datetime.utcnow() <= deadline:
            return {"action": "none", "reason": "Deadline not exceeded"}
        
        # Expire the quote and escrow
        escrow.status = EscrowStatus.CANCELLED
        escrow.additional_metadata["cancellation_reason"] = "Payment deadline exceeded"
        escrow.additional_metadata["cancelled_at"] = datetime.utcnow().isoformat()
        
        # Cancel the quote
        quote = escrow.quote
        quote.status = "EXPIRED"
        quote.expired_at = datetime.utcnow()
        quote.expiry_reason = "Payment not received within deadline"
        
        self.db.commit()
        
        # Notify both parties
        self._notify_quote_expiration(escrow)
        
        return {
            "action": "expired",
            "escrow_status": "cancelled",
            "quote_status": "expired",
            "reason": "Payment deadline exceeded"
        }
    
    def _notify_quote_expiration(self, escrow: EscrowTransaction):
        """Notify parties about quote expiration due to non-payment."""
        
        # Notify client
        self.notification_service.create_notification(
            user_id=escrow.client_id,
            title="⏰ Quote Expired - Payment Not Received",
            message="Your quote has expired due to non-payment. Please contact the manufacturer for a new quote.",
            notification_type="QUOTE_EXPIRED",
            priority="HIGH"
        )
        
        # Notify manufacturer
        self.notification_service.create_notification(
            user_id=escrow.manufacturer_id,
            title="📋 Quote Expired - No Payment",
            message="Quote expired due to client non-payment. You can create a new quote if still interested.",
            notification_type="QUOTE_EXPIRED",
            priority="MEDIUM"
        )
    
    def get_escrow_enforcement_stats(self) -> Dict[str, Any]:
        """Get statistics on escrow enforcement effectiveness."""
        
        total_escrows = self.db.query(EscrowTransaction).filter(
            EscrowTransaction.additional_metadata["mandatory"].astext == "true"
        ).count()
        
        funded_escrows = self.db.query(EscrowTransaction).filter(
            EscrowTransaction.additional_metadata["mandatory"].astext == "true",
            EscrowTransaction.status == EscrowStatus.FUNDED
        ).count()
        
        expired_escrows = self.db.query(EscrowTransaction).filter(
            EscrowTransaction.additional_metadata["mandatory"].astext == "true",
            EscrowTransaction.status == EscrowStatus.CANCELLED
        ).count()
        
        total_commission = self.db.query(EscrowTransaction).filter(
            EscrowTransaction.additional_metadata["mandatory"].astext == "true",
            EscrowTransaction.status.in_([EscrowStatus.FUNDED, EscrowStatus.COMPLETED])
        ).with_entities(
            self.db.func.sum(EscrowTransaction.platform_commission)
        ).scalar() or 0
        
        return {
            "total_mandatory_escrows": total_escrows,
            "successful_payments": funded_escrows,
            "expired_quotes": expired_escrows,
            "payment_success_rate": (funded_escrows / total_escrows * 100) if total_escrows > 0 else 0,
            "total_commission_secured": float(total_commission),
            "enforcement_effectiveness": "HIGH" if (funded_escrows / total_escrows) > 0.8 else "MEDIUM"
        }
    
    def detect_bypass_attempt_on_active_quote(self, quote_id: int, message_content: str) -> Optional[Dict[str, Any]]:
        """Detect bypass attempts specifically for active quotes with pending escrow."""
        
        quote = self.db.query(Quote).filter(Quote.id == quote_id).first()
        if not quote or quote.status != "ACTIVE":
            return None
        
        # Check if there's a pending escrow
        pending_escrow = self.db.query(EscrowTransaction).filter(
            EscrowTransaction.quote_id == quote_id,
            EscrowTransaction.status == EscrowStatus.PENDING
        ).first()
        
        if not pending_escrow:
            return None
        
        # Use escrow service to detect bypass
        detection = self.escrow_service.detect_payment_bypass(
            order_id=quote.order_id,
            message_content=message_content,
            detection_method="active_quote_monitoring"
        )
        
        if detection and detection.confidence_score > 0.5:
            # Take immediate action for active quotes
            self._handle_active_quote_bypass(quote, detection, pending_escrow)
            
            return {
                "bypass_detected": True,
                "confidence": detection.confidence_score,
                "action_taken": "immediate_enforcement",
                "escrow_id": pending_escrow.id
            }
        
        return None
    
    def _handle_active_quote_bypass(self, quote: Quote, detection, escrow: EscrowTransaction):
        """Handle bypass attempts for active quotes with special enforcement."""
        
        # Increase enforcement level
        escrow.additional_metadata["bypass_attempt_detected"] = True
        escrow.additional_metadata["enforcement_level"] = "maximum"
        escrow.additional_metadata["bypass_detection_id"] = detection.id
        
        # Send strong warning to both parties
        self._send_bypass_enforcement_warning(quote, detection, escrow)
        
        # Reduce payment deadline if high confidence
        if detection.confidence_score > 0.8:
            new_deadline = datetime.utcnow() + timedelta(days=2)  # Reduce to 2 days
            escrow.additional_metadata["original_deadline"] = escrow.additional_metadata.get("payment_deadline")
            escrow.additional_metadata["payment_deadline"] = new_deadline.isoformat()
            escrow.additional_metadata["deadline_reduced_reason"] = "Bypass attempt detected"
        
        self.db.commit()
    
    def _send_bypass_enforcement_warning(self, quote: Quote, detection, escrow: EscrowTransaction):
        """Send strong warning about bypass attempts."""
        
        # Warning to client
        self.notification_service.create_notification(
            user_id=quote.order.client_id,
            title="🚨 IMPORTANT: Payment Must Go Through Platform",
            message="We detected discussion about direct payment. ALL payments must go through our secure escrow system for your protection.",
            notification_type="SECURITY_WARNING",
            priority="URGENT",
            metadata={
                "bypass_detection": True,
                "escrow_id": escrow.id,
                "enforcement_level": "maximum"
            }
        )
        
        # Warning to manufacturer
        self.notification_service.create_notification(
            user_id=quote.manufacturer_id,
            title="⚠️ Platform Policy Reminder",
            message="All payments must go through our platform. Direct payments violate our terms and void protection.",
            notification_type="POLICY_WARNING",
            priority="HIGH",
            metadata={
                "bypass_detection": True,
                "escrow_id": escrow.id
            }
        ) 