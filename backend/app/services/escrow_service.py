from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
import re
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

from ..models.payment_escrow import (
    EscrowTransaction, 
    PaymentEscrowMilestone, 
    PlatformFee, 
    PaymentBypassDetection,
    EscrowStatus,
    PaymentMethod
)
from ..models import Order, Quote, User
from ..core.config import settings


class EscrowService:
    """
    Comprehensive escrow service for secure payments and commission protection.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.commission_rate = 0.08  # 8% commission
        
    # Core Escrow Functions
    
    def create_escrow_transaction(
        self,
        order_id: int,
        quote_id: int,
        total_amount: float,
        payment_method: PaymentMethod,
        milestones: Optional[List[Dict]] = None
    ) -> EscrowTransaction:
        """Create a new escrow transaction for secure payment handling."""
        
        # Get order and quote details
        order = self.db.query(Order).filter(Order.id == order_id).first()
        quote = self.db.query(Quote).filter(Quote.id == quote_id).first()
        
        if not order or not quote:
            raise ValueError("Order or Quote not found")
        
        # Calculate commission and payout
        fee_calculation = self._calculate_platform_fee(
            total_amount, 
            order.category.value if order.category else None,
            order.client.subscription_type if hasattr(order.client, 'subscription_type') else None
        )
        
        # Create escrow transaction
        escrow = EscrowTransaction(
            order_id=order_id,
            quote_id=quote_id,
            client_id=order.client_id,
            manufacturer_id=quote.manufacturer_id,
            total_amount=total_amount,
            platform_commission=fee_calculation['calculated_fee'],
            manufacturer_payout=fee_calculation['net_amount'],
            payment_method=payment_method,
            status=EscrowStatus.PENDING
        )
        
        self.db.add(escrow)
        self.db.flush()
        
        # Create milestones if provided
        if milestones:
            self._create_milestones(escrow.id, milestones)
        
        self.db.commit()
        return escrow
    
    def fund_escrow(
        self,
        escrow_id: int,
        payment_reference: str,
        verification_data: Dict[str, Any]
    ) -> bool:
        """Mark escrow as funded after payment verification."""
        
        escrow = self.db.query(EscrowTransaction).filter(
            EscrowTransaction.id == escrow_id
        ).first()
        
        if not escrow:
            raise ValueError("Escrow transaction not found")
        
        if escrow.status != EscrowStatus.PENDING:
            raise ValueError("Escrow is not in pending status")
        
        # Verify payment (integrate with payment processor)
        if self._verify_payment(payment_reference, escrow.total_amount):
            escrow.status = EscrowStatus.FUNDED
            escrow.payment_reference = payment_reference
            escrow.funded_at = datetime.utcnow()
            escrow.metadata = verification_data
            
            self.db.commit()
            
            # Notify parties
            self._notify_escrow_funded(escrow)
            return True
        
        return False
    
    def release_funds(
        self,
        escrow_id: int,
        release_type: str = "full",
        milestone_id: Optional[int] = None
    ) -> bool:
        """Release funds to manufacturer after conditions are met."""
        
        escrow = self.db.query(EscrowTransaction).filter(
            EscrowTransaction.id == escrow_id
        ).first()
        
        if not escrow:
            raise ValueError("Escrow transaction not found")
        
        if not escrow.can_release_funds():
            raise ValueError("Release conditions not met")
        
        if release_type == "milestone" and milestone_id:
            return self._release_milestone_payment(escrow, milestone_id)
        else:
            return self._release_full_payment(escrow)
    
    # Commission and Fee Management
    
    def _calculate_platform_fee(
        self,
        amount: float,
        category: Optional[str] = None,
        subscription_type: Optional[str] = None
    ) -> Dict[str, float]:
        """Calculate platform fee with category and subscription considerations."""
        
        # Get current fee structure
        fee_structure = self.db.query(PlatformFee).filter(
            PlatformFee.is_active == True,
            PlatformFee.effective_from <= datetime.utcnow(),
            or_(
                PlatformFee.effective_until.is_(None),
                PlatformFee.effective_until > datetime.utcnow()
            )
        ).first()
        
        if not fee_structure:
            # Default fee structure
            fee_structure = PlatformFee(
                base_commission_rate=self.commission_rate,
                minimum_fee=50.0
            )
        
        return fee_structure.calculate_fee(amount, category, subscription_type)
    
    def apply_subscription_discount(
        self,
        user_id: int,
        base_commission: float
    ) -> float:
        """Apply subscription-based commission discount."""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not hasattr(user, 'subscription_type'):
            return base_commission
        
        # Subscription discounts
        discounts = {
            'BASIC': 0.05,      # 5% discount (7.6% commission)
            'PREMIUM': 0.15,    # 15% discount (6.8% commission)
            'ENTERPRISE': 0.25  # 25% discount (6% commission)
        }
        
        discount = discounts.get(user.subscription_type, 0)
        return base_commission * (1 - discount)
    
    # Bypass Detection and Prevention
    
    def detect_payment_bypass(
        self,
        order_id: int,
        message_content: str,
        detection_method: str = "message_analysis"
    ) -> Optional[PaymentBypassDetection]:
        """Detect potential payment bypass attempts."""
        
        # Suspicious keywords and patterns
        bypass_keywords = [
            'direct payment', 'outside platform', 'bypass', 'offline payment',
            'bank transfer directly', 'paypal directly', 'cash payment',
            'avoid fees', 'skip commission', 'private deal', 'under table'
        ]
        
        # Contact information patterns
        contact_patterns = [
            r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',  # Phone numbers
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
            r'\bskype\s*:\s*\w+\b',  # Skype
            r'\bwhatsapp\s*:\s*\+?\d+\b'  # WhatsApp
        ]
        
        # Check for suspicious content
        message_lower = message_content.lower()
        detected_keywords = [kw for kw in bypass_keywords if kw in message_lower]
        detected_contacts = []
        
        for pattern in contact_patterns:
            matches = re.findall(pattern, message_content, re.IGNORECASE)
            detected_contacts.extend(matches)
        
        # Calculate confidence score
        confidence = 0.0
        if detected_keywords:
            confidence += 0.6
        if detected_contacts:
            confidence += 0.4
        
        if confidence > 0.3:  # Threshold for detection
            order = self.db.query(Order).filter(Order.id == order_id).first()
            if not order:
                return None
            
            detection = PaymentBypassDetection(
                order_id=order_id,
                client_id=order.client_id,
                manufacturer_id=order.manufacturer_id if hasattr(order, 'manufacturer_id') else None,
                direct_contact_detected=bool(detected_contacts),
                external_payment_mentioned=bool(detected_keywords),
                platform_bypass_keywords=detected_keywords + detected_contacts,
                message_content=message_content,
                detection_method=detection_method,
                confidence_score=confidence
            )
            
            self.db.add(detection)
            self.db.commit()
            
            # Take action based on confidence
            self._handle_bypass_detection(detection)
            
            return detection
        
        return None
    
    def _handle_bypass_detection(self, detection: PaymentBypassDetection):
        """Handle detected bypass attempts with appropriate actions."""
        
        if detection.confidence_score > 0.8:
            # High confidence - block transaction
            detection.transaction_blocked = True
            detection.account_flagged = True
            self._send_bypass_warning(detection, severity="high")
            
        elif detection.confidence_score > 0.5:
            # Medium confidence - flag and warn
            detection.account_flagged = True
            detection.warning_sent = True
            self._send_bypass_warning(detection, severity="medium")
            
        else:
            # Low confidence - just warn
            detection.warning_sent = True
            self._send_bypass_warning(detection, severity="low")
        
        self.db.commit()
    
    # Mandatory Payment Flow
    
    def enforce_platform_payment(self, quote_id: int) -> Dict[str, Any]:
        """Enforce that all payments go through platform when quote becomes active."""
        
        quote = self.db.query(Quote).filter(Quote.id == quote_id).first()
        if not quote:
            raise ValueError("Quote not found")
        
        # When quote becomes active, immediately create payment requirement
        if quote.status == "ACTIVE":
            payment_requirement = {
                "quote_id": quote_id,
                "total_amount": quote.total_price,
                "platform_commission": quote.total_price * self.commission_rate,
                "payment_required": True,
                "payment_deadline": datetime.utcnow() + timedelta(days=7),
                "escrow_required": True,
                "direct_payment_blocked": True
            }
            
            # Create escrow transaction immediately
            escrow = self.create_escrow_transaction(
                order_id=quote.order_id,
                quote_id=quote_id,
                total_amount=quote.total_price,
                payment_method=PaymentMethod.BANK_TRANSFER  # Default, can be changed
            )
            
            payment_requirement["escrow_id"] = escrow.id
            
            # Send payment instructions to client
            self._send_payment_instructions(quote, escrow)
            
            return payment_requirement
        
        return {}
    
    # Milestone Management
    
    def _create_milestones(self, escrow_id: int, milestones: List[Dict]):
        """Create milestone payments for large projects."""
        
        total_percentage = sum(m.get('percentage', 0) for m in milestones)
        if abs(total_percentage - 100) > 0.01:
            raise ValueError("Milestone percentages must sum to 100%")
        
        escrow = self.db.query(EscrowTransaction).filter(
            EscrowTransaction.id == escrow_id
        ).first()
        
        for milestone_data in milestones:
            milestone = PaymentEscrowMilestone(
                escrow_transaction_id=escrow_id,
                milestone_name=milestone_data['name'],
                milestone_description=milestone_data.get('description'),
                milestone_percentage=milestone_data['percentage'],
                milestone_amount=escrow.total_amount * (milestone_data['percentage'] / 100),
                expected_completion_date=milestone_data.get('expected_date')
            )
            self.db.add(milestone)
        
        self.db.commit()
    
    def complete_milestone(
        self,
        milestone_id: int,
        completion_evidence: Dict[str, Any],
        completed_by: int
    ) -> bool:
        """Mark milestone as completed with evidence."""
        
        milestone = self.db.query(PaymentEscrowMilestone).filter(
            PaymentEscrowMilestone.id == milestone_id
        ).first()
        
        if not milestone:
            raise ValueError("Milestone not found")
        
        milestone.is_completed = True
        milestone.completed_at = datetime.utcnow()
        milestone.actual_completion_date = datetime.utcnow()
        milestone.completion_evidence = completion_evidence
        
        self.db.commit()
        
        # Notify client for approval
        self._request_milestone_approval(milestone)
        
        return True
    
    # Payment Processing Integration
    
    def _verify_payment(self, payment_reference: str, expected_amount: float) -> bool:
        """Verify payment with payment processor."""
        try:
            import stripe
            from ..core.config import settings
            
            # Initialize Stripe with secret key
            stripe.api_key = settings.STRIPE_SECRET_KEY
            
            # Verify Stripe payment intent
            if payment_reference.startswith('pi_'):
                payment_intent = stripe.PaymentIntent.retrieve(payment_reference)
                
                # Check payment status and amount
                expected_amount_cents = int(expected_amount * 100)  # Convert to cents
                
                return (
                    payment_intent.status == 'succeeded' and
                    payment_intent.amount == expected_amount_cents and
                    payment_intent.currency.lower() == 'usd'
                )
            
            # Verify Stripe charge
            elif payment_reference.startswith('ch_'):
                charge = stripe.Charge.retrieve(payment_reference)
                expected_amount_cents = int(expected_amount * 100)
                
                return (
                    charge.status == 'succeeded' and
                    charge.amount == expected_amount_cents and
                    charge.currency.lower() == 'usd'
                )
            
            # Handle other payment methods (PayPal, bank transfers, etc.)
            elif payment_reference.startswith('pay_'):
                # PayPal payment verification would go here
                # For now, log and return False for unknown payment types
                logger.warning(f"PayPal payment verification not yet implemented: {payment_reference}")
                return False
            
            else:
                logger.error(f"Unknown payment reference format: {payment_reference}")
                return False
                
        except stripe.error.StripeError as e:
            logger.error(f"Stripe verification error: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Payment verification failed: {str(e)}")
            return False
    
    def _release_full_payment(self, escrow: EscrowTransaction) -> bool:
        """Release full payment to manufacturer."""
        
        # Transfer funds to manufacturer
        transfer_result = self._transfer_to_manufacturer(
            escrow.manufacturer_id,
            escrow.manufacturer_payout
        )
        
        if transfer_result:
            escrow.status = EscrowStatus.COMPLETED
            escrow.released_at = datetime.utcnow()
            self.db.commit()
            
            # Record platform commission
            self._record_commission(escrow)
            
            return True
        
        return False
    
    def _release_milestone_payment(
        self,
        escrow: EscrowTransaction,
        milestone_id: int
    ) -> bool:
        """Release payment for completed milestone."""
        
        milestone = self.db.query(PaymentEscrowMilestone).filter(
            PaymentEscrowMilestone.id == milestone_id,
            PaymentEscrowMilestone.escrow_transaction_id == escrow.id
        ).first()
        
        if not milestone or not milestone.verified_by_client:
            return False
        
        # Transfer milestone amount
        transfer_result = self._transfer_to_manufacturer(
            escrow.manufacturer_id,
            milestone.milestone_amount
        )
        
        if transfer_result:
            milestone.is_completed = True
            self.db.commit()
            return True
        
        return False
    
    # Notification System
    
    def _notify_escrow_funded(self, escrow: EscrowTransaction):
        """Notify parties that escrow is funded."""
        # Implementation for notifications
        pass
    
    def _send_payment_instructions(self, quote: Quote, escrow: EscrowTransaction):
        """Send payment instructions to client."""
        # Implementation for payment instructions
        pass
    
    def _send_bypass_warning(self, detection: PaymentBypassDetection, severity: str):
        """Send warning about bypass attempt."""
        # Implementation for bypass warnings
        pass
    
    def _request_milestone_approval(self, milestone: PaymentEscrowMilestone):
        """Request client approval for completed milestone."""
        # Implementation for milestone approval requests
        pass
    
    # Financial Operations
    
    def _transfer_to_manufacturer(self, manufacturer_id: int, amount: float) -> bool:
        """Transfer funds to manufacturer account."""
        try:
            import stripe
            from ..core.config import settings
            from ..models.user import User
            
            # Initialize Stripe
            stripe.api_key = settings.STRIPE_SECRET_KEY
            
            # Get manufacturer's Stripe Connect account
            manufacturer = self.db.query(User).filter(User.id == manufacturer_id).first()
            if not manufacturer or not manufacturer.stripe_account_id:
                logger.error(f"Manufacturer {manufacturer_id} has no Stripe Connect account")
                return False
            
            # Create transfer to Stripe Connect account
            transfer = stripe.Transfer.create(
                amount=int(amount * 100),  # Convert to cents
                currency='usd',
                destination=manufacturer.stripe_account_id,
                description=f"Escrow payout to manufacturer {manufacturer_id}",
                metadata={
                    'manufacturer_id': str(manufacturer_id),
                    'escrow_payout': 'true'
                }
            )
            
            if transfer.id:
                logger.info(f"Successfully transferred ${amount} to manufacturer {manufacturer_id} (Transfer ID: {transfer.id})")
                return True
            else:
                logger.error(f"Transfer creation failed for manufacturer {manufacturer_id}")
                return False
                
        except stripe.error.StripeError as e:
            logger.error(f"Stripe transfer error: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Transfer to manufacturer failed: {str(e)}")
            return False
    
    def _record_commission(self, escrow: EscrowTransaction):
        """Record platform commission in financial records."""
        try:
            from ..models.financial import Payment, PaymentStatus, PaymentMethod as FinancialPaymentMethod
            
            # Create commission payment record
            commission_payment = Payment(
                amount=escrow.platform_commission,
                currency='USD',
                payment_method=FinancialPaymentMethod.PLATFORM_COMMISSION,
                status=PaymentStatus.COMPLETED,
                paid_by_id=escrow.client_id,
                paid_to_id=None,  # Platform commission
                order_id=escrow.order_id,
                transaction_reference=f"commission_{escrow.transaction_id}",
                metadata={
                    'escrow_id': escrow.id,
                    'original_amount': escrow.total_amount,
                    'commission_rate': escrow.platform_commission / escrow.total_amount,
                    'manufacturer_payout': escrow.manufacturer_payout
                },
                created_at=datetime.utcnow(),
                completed_at=datetime.utcnow()
            )
            
            self.db.add(commission_payment)
            self.db.commit()
            
            logger.info(f"Recorded commission of ${escrow.platform_commission} for escrow {escrow.id}")
            
        except Exception as e:
            logger.error(f"Failed to record commission for escrow {escrow.id}: {str(e)}")
            # Don't fail the entire transaction for commission recording issues
            pass
    
    # Analytics and Reporting
    
    def get_commission_analytics(self, date_from: datetime, date_to: datetime) -> Dict[str, Any]:
        """Get commission analytics for specified period."""
        
        escrows = self.db.query(EscrowTransaction).filter(
            EscrowTransaction.status == EscrowStatus.COMPLETED,
            EscrowTransaction.released_at >= date_from,
            EscrowTransaction.released_at <= date_to
        ).all()
        
        total_volume = sum(e.total_amount for e in escrows)
        total_commission = sum(e.platform_commission for e in escrows)
        transaction_count = len(escrows)
        
        return {
            "period": {"from": date_from, "to": date_to},
            "total_volume": total_volume,
            "total_commission": total_commission,
            "transaction_count": transaction_count,
            "average_commission_rate": total_commission / total_volume if total_volume > 0 else 0,
            "average_transaction_size": total_volume / transaction_count if transaction_count > 0 else 0
        }
    
    def get_bypass_detection_stats(self) -> Dict[str, Any]:
        """Get statistics on bypass detection."""
        
        detections = self.db.query(PaymentBypassDetection).all()
        
        return {
            "total_detections": len(detections),
            "high_confidence": len([d for d in detections if d.confidence_score > 0.8]),
            "blocked_transactions": len([d for d in detections if d.transaction_blocked]),
            "flagged_accounts": len([d for d in detections if d.account_flagged]),
            "resolved_cases": len([d for d in detections if d.is_resolved])
        } 