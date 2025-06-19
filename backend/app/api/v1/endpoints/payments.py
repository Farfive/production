from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from decimal import Decimal
from loguru import logger

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.order import Order
from app.models.quote import Quote
from app.models.payment import Transaction
from app.services.stripe_payment_service import StripePaymentService
from app.schemas.payment import (
    PaymentIntentCreate, PaymentIntentResponse, PaymentProcessRequest,
    PaymentResponse, PaymentMethodResponse, SetupIntentResponse,
    PaymentHistoryResponse, RefundRequest, RefundResponse
)
from app.core.config import settings  # local import to avoid cycles

router = APIRouter()


@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
def create_payment_intent(
    payment_data: PaymentIntentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a Stripe PaymentIntent"""
    
    try:
        stripe_service = StripePaymentService(db)
        
        # Create customer if needed
        customer_id = None
        if payment_data.create_customer:
            customer_id = stripe_service.create_customer(current_user)
        
        result = stripe_service.create_payment_intent(
            amount=payment_data.amount,
            currency=payment_data.currency,
            customer_id=customer_id,
            metadata=payment_data.metadata
        )
        
        return PaymentIntentResponse(**result)
        
    except Exception as e:
        logger.error(f"Error creating payment intent: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/process-order-payment", response_model=PaymentResponse)
def process_order_payment(
    payment_request: PaymentProcessRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process payment for an accepted quote/order"""
    
    # Get order and quote
    order = db.query(Order).filter(Order.id == payment_request.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    quote = db.query(Quote).filter(Quote.id == payment_request.quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Authorization check
    if current_user.role == UserRole.CLIENT and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this order")
    
    # Verify quote belongs to order
    if quote.order_id != order.id:
        raise HTTPException(status_code=400, detail="Quote does not belong to this order")
    
    # Check if quote is accepted
    if quote.status.value != "accepted":
        raise HTTPException(status_code=400, detail="Quote must be accepted before payment")
    
    # ------------------------------------------------------------------
    # Stub mode: if no Stripe secret key is configured, simulate success
    # ------------------------------------------------------------------

    if not settings.STRIPE_SECRET_KEY:
        logger.warning(
            "STRIPE_SECRET_KEY is not configured – running in OFFLINE PAYMENT MODE (stubbed)."
        )

        return PaymentResponse(
            payment_id=0,
            payment_intent_id="offline_stub_intent",
            status="succeeded",
            amount=float(quote.price_total),
            requires_action=False,
            client_secret=None,
        )

    # ------------------------------------------------------------------
    # Live Stripe processing
    # ------------------------------------------------------------------

    try:
        stripe_service = StripePaymentService(db)
        
        result = stripe_service.process_order_payment(
            order=order,
            quote=quote,
            payment_method_id=payment_request.payment_method_id,
            save_payment_method=payment_request.save_payment_method
        )
        
        return PaymentResponse(**result)
        
    except Exception as e:
        logger.error(f"Error processing payment: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db)
):
    """Handle Stripe webhook events"""
    
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")
    
    try:
        payload = await request.body()
        stripe_service = StripePaymentService(db)
        
        result = stripe_service.handle_webhook(payload, stripe_signature)
        
        return result
        
    except Exception as e:
        logger.error(f"Error handling webhook: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
def get_payment_methods(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get saved payment methods for the current user"""
    
    if not current_user.stripe_customer_id:
        return []
    
    try:
        stripe_service = StripePaymentService(db)
        methods = stripe_service.get_payment_methods(current_user.stripe_customer_id)
        
        return [PaymentMethodResponse(**method) for method in methods]
        
    except Exception as e:
        logger.error(f"Error getting payment methods: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/payment-methods/{payment_method_id}")
def delete_payment_method(
    payment_method_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a saved payment method"""
    
    try:
        stripe_service = StripePaymentService(db)
        success = stripe_service.detach_payment_method(payment_method_id)
        
        if success:
            return {"message": "Payment method removed successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to remove payment method")
            
    except Exception as e:
        logger.error(f"Error removing payment method: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/setup-intent", response_model=SetupIntentResponse)
def create_setup_intent(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a SetupIntent for saving payment methods"""
    
    try:
        stripe_service = StripePaymentService(db)
        
        # Create customer if needed
        customer_id = stripe_service.create_customer(current_user)
        
        result = stripe_service.create_setup_intent(customer_id)
        
        return SetupIntentResponse(**result)
        
    except Exception as e:
        logger.error(f"Error creating setup intent: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history", response_model=List[PaymentHistoryResponse])
def get_payment_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment history for the current user"""
    
    try:
        stripe_service = StripePaymentService(db)
        history = stripe_service.get_payment_history(
            user_id=current_user.id,
            limit=limit
        )
        
        return [PaymentHistoryResponse(**payment) for payment in history]
        
    except Exception as e:
        logger.error(f"Error getting payment history: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/refund", response_model=RefundResponse)
def process_refund(
    refund_request: RefundRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process a refund for a payment"""
    
    # Get payment record
    payment = db.query(Transaction).filter(Transaction.id == refund_request.payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Authorization check - only admin or payment owner can refund
    if current_user.role != UserRole.ADMIN and payment.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to refund this payment")
    
    # Check if payment can be refunded
    if payment.status.value not in ["SUCCEEDED", "CAPTURED"]:
        raise HTTPException(status_code=400, detail="Payment cannot be refunded")
    
    try:
        stripe_service = StripePaymentService(db)
        
        result = stripe_service.refund_payment(
            payment_intent_id=payment.stripe_payment_intent_id,
            amount=refund_request.amount,
            reason=refund_request.reason
        )
        
        return RefundResponse(**result)
        
    except Exception as e:
        logger.error(f"Error processing refund: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{payment_id}")
def get_payment_details(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details for a specific payment"""
    
    payment = db.query(Transaction).filter(Transaction.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Authorization check
    if current_user.role != UserRole.ADMIN and payment.client_id != current_user.id:
        # Also allow manufacturer to view payments for their quotes
        if current_user.role == UserRole.MANUFACTURER:
            quote = db.query(Quote).filter(Quote.id == payment.quote_id).first()
            if not quote or quote.manufacturer_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to view this payment")
        else:
            raise HTTPException(status_code=403, detail="Not authorized to view this payment")
    
    return {
        "id": payment.id,
        "amount": float(payment.gross_amount),
        "currency": payment.original_currency,
        "status": payment.status.value,
        "payment_method": payment.payment_method_type.value if payment.payment_method_type else None,
        "created_at": payment.created_at,
        "completed_at": payment.captured_at,
        "order_id": payment.order_id,
        "quote_id": payment.quote_id,
        "stripe_payment_intent_id": payment.stripe_payment_intent_id,
        "metadata": payment.payment_metadata,
        "refund_amount": float(payment.refund_amount) if payment.refund_amount else None,
        "refund_reason": None,  # This field doesn't exist in Transaction model
        "refunded_at": payment.refund_processed_at,
        "failure_reason": payment.failure_reason
    }


@router.get("/order/{order_id}/payments")
def get_order_payments(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all payments for a specific order"""
    
    # Check if order exists and user has access
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Authorization check
    if current_user.role == UserRole.CLIENT and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view payments for this order")
    elif current_user.role == UserRole.MANUFACTURER:
        # Check if manufacturer has quotes for this order
        quote = db.query(Quote).filter(
            Quote.order_id == order_id,
            Quote.manufacturer_id == current_user.id
        ).first()
        if not quote:
            raise HTTPException(status_code=403, detail="Not authorized to view payments for this order")
    
    payments = db.query(Transaction).filter(Transaction.order_id == order_id).all()
    
    payment_list = []
    for payment in payments:
        payment_list.append({
            "id": payment.id,
            "amount": float(payment.gross_amount),
            "currency": payment.original_currency,
            "status": payment.status.value,
            "payment_method": payment.payment_method_type.value if payment.payment_method_type else None,
            "created_at": payment.created_at,
            "completed_at": payment.captured_at,
            "quote_id": payment.quote_id
        })
    
    return {
        "order_id": order_id,
        "payments": payment_list,
        "total_paid": sum(float(p.gross_amount) for p in payments if p.status.value == "SUCCEEDED"),
        "payment_count": len(payments)
    }


@router.post("/subscription/create")
def create_subscription(
    price_id: str,
    trial_days: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a subscription for the current user"""
    
    try:
        stripe_service = StripePaymentService(db)
        
        # Create customer if needed
        customer_id = stripe_service.create_customer(current_user)
        
        result = stripe_service.create_subscription(
            customer_id=customer_id,
            price_id=price_id,
            trial_period_days=trial_days,
            metadata={
                "user_id": str(current_user.id),
                "user_email": current_user.email
            }
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/analytics/summary")
def get_payment_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment analytics summary for the current user"""
    
    try:
        # Get user's payments
        payments = db.query(Transaction).filter(Transaction.client_id == current_user.id).all()
        
        if not payments:
            return {
                "total_payments": 0,
                "total_amount": 0,
                "successful_payments": 0,
                "failed_payments": 0,
                "refunded_payments": 0,
                "average_payment": 0
            }
        
        successful_payments = [p for p in payments if p.status.value == "SUCCEEDED"]
        failed_payments = [p for p in payments if p.status.value == "FAILED"]
        refunded_payments = [p for p in payments if p.status.value == "REFUNDED"]
        
        total_amount = sum(float(p.gross_amount) for p in successful_payments)
        
        return {
            "total_payments": len(payments),
            "total_amount": total_amount,
            "successful_payments": len(successful_payments),
            "failed_payments": len(failed_payments),
            "refunded_payments": len(refunded_payments),
            "average_payment": total_amount / len(successful_payments) if successful_payments else 0,
            "success_rate": len(successful_payments) / len(payments) * 100 if payments else 0
        }
        
    except Exception as e:
        logger.error(f"Error getting payment analytics: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e)) 