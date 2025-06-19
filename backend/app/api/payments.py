from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from loguru import logger

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.payment import (
    Transaction, TransactionStatus, PaymentRegion, PaymentMethod,
    StripeConnectAccount, ConnectAccountType
)
from app.models.order import Order
from app.models.quote import Quote
from app.services.payment import MultiRegionStripeService, PaymentError
from app.services.subscription_service import SubscriptionService
from app.services.invoice_service import InvoiceService

router = APIRouter()
stripe_service = MultiRegionStripeService()
subscription_service = SubscriptionService()
invoice_service = InvoiceService()


# Pydantic Models
class PaymentIntentRequest(BaseModel):
    order_id: int
    quote_id: int
    payment_method_types: Optional[List[str]] = None
    customer_country: str = Field(default="US", description="Customer's country code")
    save_payment_method: bool = False


class PaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str
    transaction_id: int
    amount: float
    currency: str
    commission: float
    fees: Dict[str, float]
    tax: Dict[str, Any]
    manufacturer_payout: float
    region: str
    publishable_key: str


class ConnectAccountRequest(BaseModel):
    account_type: ConnectAccountType = ConnectAccountType.EXPRESS
    country: str = "US"
    business_type: str = "company"


class ConnectAccountResponse(BaseModel):
    account_id: str
    account_type: str
    onboarding_url: Optional[str] = None
    charges_enabled: bool
    payouts_enabled: bool


class RefundRequest(BaseModel):
    amount: Optional[Decimal] = None
    reason: str = "requested_by_customer"


class TransactionResponse(BaseModel):
    id: int
    status: str
    amount: float
    currency: str
    commission: float
    created_at: datetime
    
    class Config:
        from_attributes = True


# Payment Intent Endpoints
@router.post("/payment-intents", response_model=PaymentIntentResponse)
async def create_payment_intent(
    request: PaymentIntentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create payment intent for order"""
    
    try:
        # Get order and quote
        order = db.query(Order).filter(Order.id == request.order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        quote = db.query(Quote).filter(Quote.id == request.quote_id).first()
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        # Verify user has access to order
        if order.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create payment intent
        result = await stripe_service.create_payment_intent(
            db=db,
            order=order,
            quote=quote,
            client=current_user,
            payment_method_types=request.payment_method_types,
            customer_country=request.customer_country
        )
        
        return PaymentIntentResponse(**result)
        
    except PaymentError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating payment intent: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment creation failed")


@router.post("/payment-intents/{payment_intent_id}/confirm")
async def confirm_payment_intent(
    payment_intent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Confirm payment intent"""
    
    try:
        transaction = await stripe_service.confirm_payment(db, payment_intent_id)
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Verify user has access
        if transaction.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return {
            "status": transaction.status.value,
            "transaction_id": transaction.id,
            "amount": float(transaction.gross_amount)
        }
        
    except Exception as e:
        logger.error(f"Error confirming payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment confirmation failed")


# Transaction Management
@router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = None
):
    """Get user's transactions"""
    
    query = db.query(Transaction).filter(Transaction.client_id == current_user.id)
    
    if status:
        try:
            status_enum = TransactionStatus(status)
            query = query.filter(Transaction.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
    
    transactions = query.order_by(Transaction.created_at.desc()).offset(offset).limit(limit).all()
    
    return [
        TransactionResponse(
            id=t.id,
            status=t.status.value,
            amount=float(t.gross_amount),
            currency=t.platform_currency,
            commission=float(t.platform_commission_amount),
            created_at=t.created_at
        )
        for t in transactions
    ]


@router.get("/transactions/{transaction_id}")
async def get_transaction_detail(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed transaction information"""
    
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Check access (client or manufacturer)
    if transaction.client_id != current_user.id and transaction.manufacturer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "id": transaction.id,
        "status": transaction.status.value,
        "type": transaction.transaction_type.value,
        "amounts": {
            "gross": float(transaction.gross_amount),
            "net": float(transaction.net_amount),
            "commission": float(transaction.platform_commission_amount),
            "fees": {
                "stripe": float(transaction.stripe_fee_amount),
                "cross_border": float(transaction.cross_border_fee_amount),
                "currency_conversion": float(transaction.currency_conversion_fee_amount)
            }
        },
        "currency": {
            "original": transaction.original_currency,
            "platform": transaction.platform_currency,
            "exchange_rate": float(transaction.exchange_rate)
        },
        "tax": {
            "rate": float(transaction.tax_rate_pct),
            "amount": float(transaction.tax_amount),
            "jurisdiction": transaction.tax_jurisdiction
        },
        "region": transaction.region.value,
        "payment_method": transaction.payment_method_details,
        "fraud": {
            "score": transaction.fraud_score,
            "outcome": transaction.fraud_outcome
        },
        "timestamps": {
            "created": transaction.created_at.isoformat(),
            "authorized": transaction.authorized_at.isoformat() if transaction.authorized_at else None,
            "captured": transaction.captured_at.isoformat() if transaction.captured_at else None
        },
        "metadata": transaction.metadata
    }


@router.post("/transactions/{transaction_id}/refund")
async def refund_transaction(
    transaction_id: int,
    request: RefundRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Refund a transaction"""
    
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Only client or admin can request refunds
    if transaction.client_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        success = await stripe_service.refund_payment(
            db=db,
            transaction=transaction,
            amount=request.amount,
            reason=request.reason
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Refund failed")
        
        return {
            "status": "success",
            "refund_amount": float(request.amount or transaction.gross_amount),
            "remaining_amount": float(transaction.gross_amount - transaction.refund_amount)
        }
        
    except Exception as e:
        logger.error(f"Error processing refund: {str(e)}")
        raise HTTPException(status_code=500, detail="Refund processing failed")


# Stripe Connect Endpoints
@router.post("/connect/accounts", response_model=ConnectAccountResponse)
async def create_connect_account(
    request: ConnectAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create Stripe Connect account for manufacturer"""
    
    # Check if user is a manufacturer
    if not hasattr(current_user, 'manufacturer_profile'):
        raise HTTPException(status_code=400, detail="Only manufacturers can create Connect accounts")
    
    manufacturer = current_user.manufacturer_profile
    
    # Check if account already exists
    existing_account = db.query(StripeConnectAccount).filter(
        StripeConnectAccount.manufacturer_id == manufacturer.id
    ).first()
    
    if existing_account:
        raise HTTPException(status_code=400, detail="Connect account already exists")
    
    try:
        connect_account = await stripe_service.create_connect_account(
            db=db,
            manufacturer=manufacturer,
            account_type=request.account_type,
            country=request.country
        )
        
        if not connect_account:
            raise HTTPException(status_code=500, detail="Failed to create Connect account")
        
        # Generate onboarding URL
        onboarding_url = await create_account_link(connect_account.stripe_account_id, manufacturer.id)
        
        return ConnectAccountResponse(
            account_id=connect_account.stripe_account_id,
            account_type=connect_account.account_type.value,
            onboarding_url=onboarding_url,
            charges_enabled=connect_account.charges_enabled,
            payouts_enabled=connect_account.payouts_enabled
        )
        
    except Exception as e:
        logger.error(f"Error creating Connect account: {str(e)}")
        raise HTTPException(status_code=500, detail="Account creation failed")


@router.get("/connect/accounts/me")
async def get_my_connect_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's Connect account status"""
    
    if not hasattr(current_user, 'manufacturer_profile'):
        raise HTTPException(status_code=400, detail="Only manufacturers have Connect accounts")
    
    manufacturer = current_user.manufacturer_profile
    
    connect_account = db.query(StripeConnectAccount).filter(
        StripeConnectAccount.manufacturer_id == manufacturer.id
    ).first()
    
    if not connect_account:
        return {"has_account": False}
    
    return {
        "has_account": True,
        "account_id": connect_account.stripe_account_id,
        "account_type": connect_account.account_type.value,
        "charges_enabled": connect_account.charges_enabled,
        "payouts_enabled": connect_account.payouts_enabled,
        "details_submitted": connect_account.details_submitted,
        "requirements": {
            "currently_due": connect_account.currently_due,
            "eventually_due": connect_account.eventually_due,
            "past_due": connect_account.past_due
        },
        "payout_schedule": connect_account.payout_schedule
    }


@router.post("/connect/accounts/{account_id}/dashboard-link")
async def create_dashboard_link(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create Stripe Connect dashboard link"""
    
    # Verify account ownership
    if not hasattr(current_user, 'manufacturer_profile'):
        raise HTTPException(status_code=403, detail="Access denied")
    
    manufacturer = current_user.manufacturer_profile
    connect_account = db.query(StripeConnectAccount).filter(
        StripeConnectAccount.manufacturer_id == manufacturer.id,
        StripeConnectAccount.stripe_account_id == account_id
    ).first()
    
    if not connect_account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    try:
        import stripe
        
        # Set appropriate Stripe key
        stripe_service.set_stripe_key(connect_account.region)
        
        # Create dashboard link
        link = stripe.Account.create_login_link(account_id)
        
        return {"dashboard_url": link.url}
        
    except Exception as e:
        logger.error(f"Error creating dashboard link: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create dashboard link")


# Payment Analytics
@router.get("/analytics/overview")
async def get_payment_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    days: int = Query(30, ge=1, le=365)
):
    """Get payment analytics overview"""
    
    from datetime import timedelta
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get transactions for the period
    query = db.query(Transaction).filter(
        Transaction.created_at >= start_date
    )
    
    # Filter by user role
    if hasattr(current_user, 'manufacturer_profile'):
        query = query.filter(Transaction.manufacturer_id == current_user.manufacturer_profile.id)
    else:
        query = query.filter(Transaction.client_id == current_user.id)
    
    transactions = query.all()
    
    # Calculate metrics
    total_volume = sum(float(t.gross_amount) for t in transactions)
    total_transactions = len(transactions)
    successful_transactions = len([t for t in transactions if t.status == TransactionStatus.SUCCEEDED])
    
    # Group by currency
    currency_breakdown = {}
    for t in transactions:
        currency = t.platform_currency
        if currency not in currency_breakdown:
            currency_breakdown[currency] = {"count": 0, "volume": 0.0}
        currency_breakdown[currency]["count"] += 1
        currency_breakdown[currency]["volume"] += float(t.gross_amount)
    
    # Group by region
    region_breakdown = {}
    for t in transactions:
        region = t.region.value
        if region not in region_breakdown:
            region_breakdown[region] = {"count": 0, "volume": 0.0}
        region_breakdown[region]["count"] += 1
        region_breakdown[region]["volume"] += float(t.gross_amount)
    
    return {
        "period_days": days,
        "summary": {
            "total_volume": total_volume,
            "total_transactions": total_transactions,
            "successful_transactions": successful_transactions,
            "success_rate": (successful_transactions / total_transactions * 100) if total_transactions > 0 else 0,
            "average_transaction": total_volume / total_transactions if total_transactions > 0 else 0
        },
        "currency_breakdown": currency_breakdown,
        "region_breakdown": region_breakdown,
        "status_breakdown": {
            status.value: len([t for t in transactions if t.status == status])
            for status in TransactionStatus
        }
    }


# Helper Functions
async def create_account_link(account_id: str, manufacturer_id: int) -> Optional[str]:
    """Create Stripe Connect account onboarding link"""
    
    try:
        import stripe
        
        link = stripe.AccountLink.create(
            account=account_id,
            refresh_url=f"{settings.FRONTEND_URL}/dashboard/connect/refresh",
            return_url=f"{settings.FRONTEND_URL}/dashboard/connect/success",
            type="account_onboarding"
        )
        
        return link.url
        
    except Exception as e:
        logger.error(f"Error creating account link: {str(e)}")
        return None 