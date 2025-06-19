from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import stripe
from datetime import datetime, timedelta
import os

from ..database import get_db
from ..models.billing import Subscription, Invoice, PaymentMethod
from ..models.user import User
from ..schemas.billing import (
    SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse,
    InvoiceResponse, PaymentMethodResponse, BillingUsageResponse
)
from ..core.auth import get_current_user
from ..core.config import settings
from ..services.billing_service import BillingService

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY
billing_service = BillingService()

@router.get("/subscriptions/current", response_model=SubscriptionResponse)
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's subscription details"""
    subscription = billing_service.get_user_subscription(db, current_user.id)
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )
    return subscription

@router.post("/subscriptions", response_model=SubscriptionResponse)
async def create_subscription(
    subscription_data: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new subscription"""
    try:
        # Check if user already has an active subscription
        existing_subscription = billing_service.get_user_subscription(db, current_user.id)
        if existing_subscription and existing_subscription.status == "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has an active subscription"
            )

        # Create Stripe subscription
        stripe_subscription = stripe.Subscription.create(
            customer=current_user.stripe_customer_id,
            items=[{'price': subscription_data.price_id}],
            trial_period_days=subscription_data.trial_days if subscription_data.trial_days else None,
            metadata={
                'user_id': str(current_user.id),
                'plan': subscription_data.plan
            }
        )

        # Create local subscription record
        subscription = billing_service.create_subscription(
            db=db,
            user_id=current_user.id,
            stripe_subscription_id=stripe_subscription.id,
            plan=subscription_data.plan,
            status=stripe_subscription.status,
            current_period_start=datetime.fromtimestamp(stripe_subscription.current_period_start),
            current_period_end=datetime.fromtimestamp(stripe_subscription.current_period_end),
            trial_end=datetime.fromtimestamp(stripe_subscription.trial_end) if stripe_subscription.trial_end else None
        )

        return subscription

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create subscription: {str(e)}"
        )

@router.put("/subscriptions/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: str,
    subscription_data: SubscriptionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update subscription plan"""
    try:
        subscription = billing_service.get_subscription_by_id(db, subscription_id)
        if not subscription or subscription.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )

        # Update Stripe subscription
        stripe_subscription = stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            items=[{
                'id': stripe.Subscription.retrieve(subscription.stripe_subscription_id).items.data[0].id,
                'price': subscription_data.price_id,
            }],
            proration_behavior='always_invoice'
        )

        # Update local subscription
        updated_subscription = billing_service.update_subscription(
            db=db,
            subscription_id=subscription_id,
            plan=subscription_data.plan,
            status=stripe_subscription.status
        )

        return updated_subscription

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )

@router.delete("/subscriptions/{subscription_id}")
async def cancel_subscription(
    subscription_id: str,
    cancel_at_period_end: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel subscription"""
    try:
        subscription = billing_service.get_subscription_by_id(db, subscription_id)
        if not subscription or subscription.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )

        if cancel_at_period_end:
            # Cancel at period end
            stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                cancel_at_period_end=True
            )
            billing_service.update_subscription(
                db=db,
                subscription_id=subscription_id,
                cancel_at_period_end=True
            )
        else:
            # Cancel immediately
            stripe.Subscription.delete(subscription.stripe_subscription_id)
            billing_service.update_subscription(
                db=db,
                subscription_id=subscription_id,
                status="cancelled"
            )

        return {"message": "Subscription cancelled successfully"}

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )

@router.post("/subscriptions/{subscription_id}/reactivate")
async def reactivate_subscription(
    subscription_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reactivate cancelled subscription"""
    try:
        subscription = billing_service.get_subscription_by_id(db, subscription_id)
        if not subscription or subscription.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )

        # Reactivate in Stripe
        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=False
        )

        # Update local subscription
        billing_service.update_subscription(
            db=db,
            subscription_id=subscription_id,
            cancel_at_period_end=False
        )

        return {"message": "Subscription reactivated successfully"}

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )

@router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(
    limit: int = 10,
    starting_after: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's billing history"""
    try:
        # Get invoices from Stripe
        invoices = stripe.Invoice.list(
            customer=current_user.stripe_customer_id,
            limit=limit,
            starting_after=starting_after
        )

        invoice_list = []
        for invoice in invoices.data:
            invoice_data = InvoiceResponse(
                id=invoice.id,
                date=datetime.fromtimestamp(invoice.created),
                amount=invoice.amount_paid / 100,  # Convert from cents
                currency=invoice.currency,
                status=invoice.status,
                invoice_url=invoice.hosted_invoice_url,
                invoice_pdf=invoice.invoice_pdf,
                description=invoice.lines.data[0].description if invoice.lines.data else "Subscription"
            )
            invoice_list.append(invoice_data)

        return invoice_list

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )

@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
async def get_payment_methods(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's payment methods"""
    try:
        payment_methods = stripe.PaymentMethod.list(
            customer=current_user.stripe_customer_id,
            type="card"
        )

        method_list = []
        for method in payment_methods.data:
            method_data = PaymentMethodResponse(
                id=method.id,
                type=method.type,
                card_brand=method.card.brand if method.card else None,
                card_last4=method.card.last4 if method.card else None,
                card_exp_month=method.card.exp_month if method.card else None,
                card_exp_year=method.card.exp_year if method.card else None,
                is_default=method.id == current_user.default_payment_method_id
            )
            method_list.append(method_data)

        return method_list

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )

@router.post("/payment-methods")
async def add_payment_method(
    payment_method_id: str,
    set_as_default: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new payment method"""
    try:
        # Attach payment method to customer
        stripe.PaymentMethod.attach(
            payment_method_id,
            customer=current_user.stripe_customer_id
        )

        if set_as_default:
            # Set as default payment method
            stripe.Customer.modify(
                current_user.stripe_customer_id,
                invoice_settings={'default_payment_method': payment_method_id}
            )
            
            # Update user's default payment method
            billing_service.update_user_default_payment_method(
                db=db,
                user_id=current_user.id,
                payment_method_id=payment_method_id
            )

        return {"message": "Payment method added successfully"}

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )

@router.delete("/payment-methods/{payment_method_id}")
async def remove_payment_method(
    payment_method_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a payment method"""
    try:
        stripe.PaymentMethod.detach(payment_method_id)
        return {"message": "Payment method removed successfully"}

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )

@router.get("/usage", response_model=BillingUsageResponse)
async def get_billing_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current billing period usage statistics"""
    subscription = billing_service.get_user_subscription(db, current_user.id)
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )

    # Get usage data for current billing period
    usage_data = billing_service.get_usage_statistics(
        db=db,
        user_id=current_user.id,
        period_start=subscription.current_period_start,
        period_end=subscription.current_period_end
    )

    return usage_data

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: dict,
    db: Session = Depends(get_db)
):
    """Handle Stripe webhooks"""
    try:
        event = request
        
        # Handle different event types
        if event['type'] == 'invoice.payment_succeeded':
            billing_service.handle_payment_succeeded(db, event['data']['object'])
        elif event['type'] == 'invoice.payment_failed':
            billing_service.handle_payment_failed(db, event['data']['object'])
        elif event['type'] == 'customer.subscription.updated':
            billing_service.handle_subscription_updated(db, event['data']['object'])
        elif event['type'] == 'customer.subscription.deleted':
            billing_service.handle_subscription_deleted(db, event['data']['object'])

        return {"status": "success"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Webhook error: {str(e)}"
        )

@router.get("/health")
def health_check():
    return {"status": "healthy"} 