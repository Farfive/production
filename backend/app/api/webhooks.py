from fastapi import APIRouter, Request, HTTPException, Depends, Header
from sqlalchemy.orm import Session
import stripe
import json
from typing import Optional
from loguru import logger

from app.core.database import get_db
from app.core.config import settings
from app.models.payment import PaymentRegion
from app.services.payment import MultiRegionStripeService
from app.services.subscription_service import SubscriptionService
from app.services.invoice_service import InvoiceService

router = APIRouter()
stripe_service = MultiRegionStripeService()
subscription_service = SubscriptionService()
invoice_service = InvoiceService()


@router.post("/stripe/us")
async def stripe_webhook_us(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature")
):
    """Handle Stripe webhooks for US region"""
    return await handle_stripe_webhook(request, db, PaymentRegion.US, stripe_signature)


@router.post("/stripe/eu")
async def stripe_webhook_eu(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature")
):
    """Handle Stripe webhooks for EU region"""
    return await handle_stripe_webhook(request, db, PaymentRegion.EU, stripe_signature)


@router.post("/stripe/uk")
async def stripe_webhook_uk(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature")
):
    """Handle Stripe webhooks for UK region"""
    return await handle_stripe_webhook(request, db, PaymentRegion.UK, stripe_signature)


async def handle_stripe_webhook(
    request: Request,
    db: Session,
    region: PaymentRegion,
    stripe_signature: Optional[str]
):
    """Generic Stripe webhook handler"""
    
    try:
        # Get request body
        payload = await request.body()
        
        if not stripe_signature:
            logger.error("Missing Stripe signature header")
            raise HTTPException(status_code=400, detail="Missing signature")
        
        # Verify webhook signature
        if not stripe_service.verify_webhook_signature(payload, stripe_signature, region):
            logger.error("Invalid webhook signature")
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Parse event
        try:
            event = json.loads(payload.decode('utf-8'))
        except json.JSONDecodeError:
            logger.error("Invalid JSON in webhook payload")
            raise HTTPException(status_code=400, detail="Invalid JSON")
        
        event_type = event.get('type')
        event_data = event.get('data', {})
        event_id = event.get('id')
        
        logger.info(f"Received Stripe webhook: {event_type} from {region.value}")
        
        # Route to appropriate handler based on event type
        success = False
        
        if event_type.startswith('payment_intent.'):
            success = await stripe_service.handle_webhook(db, event_type, event_data, event_id)
            
        elif event_type.startswith('account.'):
            success = await handle_connect_account_webhook(db, event_type, event_data)
            
        elif event_type.startswith('customer.subscription.'):
            success = await subscription_service.handle_subscription_webhook(db, event_type, event_data)
            
        elif event_type.startswith('invoice.'):
            success = await invoice_service.handle_stripe_invoice_webhook(db, event_type, event_data)
            
        elif event_type.startswith('transfer.'):
            success = await handle_transfer_webhook(db, event_type, event_data)
            
        elif event_type.startswith('payout.'):
            success = await handle_payout_webhook(db, event_type, event_data)
            
        elif event_type.startswith('radar.'):
            success = await handle_fraud_webhook(db, event_type, event_data)
            
        elif event_type.startswith('dispute.'):
            success = await handle_dispute_webhook(db, event_type, event_data)
            
        else:
            logger.info(f"Unhandled webhook event type: {event_type}")
            success = True  # Don't retry unhandled events
        
        if success:
            return {"status": "success", "event_type": event_type}
        else:
            logger.error(f"Failed to process webhook: {event_type}")
            raise HTTPException(status_code=500, detail="Webhook processing failed")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


async def handle_connect_account_webhook(
    db: Session,
    event_type: str,
    event_data: dict
) -> bool:
    """Handle Stripe Connect account webhooks"""
    
    try:
        account = event_data.get('object', {})
        account_id = account.get('id')
        
        if not account_id:
            return False
        
        # Find Connect account
        from app.models.payment import StripeConnectAccount
        connect_account = db.query(StripeConnectAccount).filter(
            StripeConnectAccount.stripe_account_id == account_id
        ).first()
        
        if not connect_account:
            logger.warning(f"Connect account not found: {account_id}")
            return True  # Not our account
        
        if event_type == 'account.updated':
            # Update account status
            connect_account.charges_enabled = account.get('charges_enabled', False)
            connect_account.payouts_enabled = account.get('payouts_enabled', False)
            connect_account.details_submitted = account.get('details_submitted', False)
            
            # Update requirements
            requirements = account.get('requirements', {})
            connect_account.currently_due = requirements.get('currently_due', [])
            connect_account.eventually_due = requirements.get('eventually_due', [])
            connect_account.past_due = requirements.get('past_due', [])
            
        elif event_type == 'account.application.deauthorized':
            # Account was deauthorized
            connect_account.charges_enabled = False
            connect_account.payouts_enabled = False
            
        db.commit()
        return True
        
    except Exception as e:
        logger.error(f"Error handling Connect account webhook: {str(e)}")
        return False


async def handle_transfer_webhook(
    db: Session,
    event_type: str,
    event_data: dict
) -> bool:
    """Handle transfer webhooks for marketplace payments"""
    
    try:
        transfer = event_data.get('object', {})
        transfer_id = transfer.get('id')
        
        if not transfer_id:
            return False
        
        # Find transaction
        from app.models.payment import Transaction
        transaction = db.query(Transaction).filter(
            Transaction.stripe_transfer_id == transfer_id
        ).first()
        
        if not transaction:
            logger.warning(f"Transaction not found for transfer {transfer_id}")
            return True  # Not our transfer
        
        if event_type == 'transfer.created':
            transaction.payout_initiated_at = datetime.utcnow()
            
        elif event_type == 'transfer.paid':
            transaction.payout_succeeded_at = datetime.utcnow()
            
        elif event_type == 'transfer.failed':
            transaction.payout_failed_at = datetime.utcnow()
            transaction.failure_reason = transfer.get('failure_message', 'Transfer failed')
            
        db.commit()
        return True
        
    except Exception as e:
        logger.error(f"Error handling transfer webhook: {str(e)}")
        return False


async def handle_payout_webhook(
    db: Session,
    event_type: str,
    event_data: dict
) -> bool:
    """Handle payout webhooks for Connect accounts"""
    
    try:
        payout = event_data.get('object', {})
        
        # Log payout events for monitoring
        logger.info(f"Payout event: {event_type} - {payout.get('id')} - {payout.get('status')}")
        
        # TODO: Track payout status in database if needed
        return True
        
    except Exception as e:
        logger.error(f"Error handling payout webhook: {str(e)}")
        return False


async def handle_fraud_webhook(
    db: Session,
    event_type: str,
    event_data: dict
) -> bool:
    """Handle Stripe Radar fraud webhooks"""
    
    try:
        from app.models.payment import Transaction
        
        radar_review = event_data.get('object', {})
        payment_intent_id = radar_review.get('payment_intent')
        
        if not payment_intent_id:
            return False
        
        # Find transaction
        transaction = db.query(Transaction).filter(
            Transaction.stripe_payment_intent_id == payment_intent_id
        ).first()
        
        if not transaction:
            logger.warning(f"Transaction not found for Radar review {payment_intent_id}")
            return True
        
        if event_type == 'radar.early_fraud_warning.created':
            # Early fraud warning
            transaction.fraud_outcome = 'early_fraud_warning'
            transaction.metadata = transaction.metadata or {}
            transaction.metadata['fraud_warning'] = {
                'created_at': datetime.utcnow().isoformat(),
                'charge_id': radar_review.get('charge')
            }
            
        elif event_type == 'review.opened':
            # Manual review opened
            transaction.fraud_outcome = 'manual_review'
            
        elif event_type == 'review.closed':
            # Review closed
            reason = radar_review.get('reason')
            if reason == 'approved':
                transaction.fraud_outcome = 'approved'
            elif reason == 'refunded':
                transaction.fraud_outcome = 'refunded'
            else:
                transaction.fraud_outcome = 'declined'
        
        db.commit()
        return True
        
    except Exception as e:
        logger.error(f"Error handling fraud webhook: {str(e)}")
        return False


async def handle_dispute_webhook(
    db: Session,
    event_type: str,
    event_data: dict
) -> bool:
    """Handle dispute and chargeback webhooks"""
    
    try:
        from app.models.payment import Transaction, TransactionStatus
        
        dispute = event_data.get('object', {})
        charge_id = dispute.get('charge')
        
        if not charge_id:
            return False
        
        # Find transaction
        transaction = db.query(Transaction).filter(
            Transaction.stripe_charge_id == charge_id
        ).first()
        
        if not transaction:
            logger.warning(f"Transaction not found for dispute {charge_id}")
            return True
        
        if event_type == 'charge.dispute.created':
            transaction.status = TransactionStatus.DISPUTED
            transaction.metadata = transaction.metadata or {}
            transaction.metadata['dispute'] = {
                'id': dispute.get('id'),
                'reason': dispute.get('reason'),
                'status': dispute.get('status'),
                'amount': dispute.get('amount'),
                'created_at': datetime.utcnow().isoformat()
            }
            
        elif event_type == 'charge.dispute.closed':
            status = dispute.get('status')
            if status == 'lost':
                transaction.status = TransactionStatus.CHARGEBACK
            elif status == 'won':
                transaction.status = TransactionStatus.SUCCEEDED
            
            # Update dispute metadata
            if 'dispute' in transaction.metadata:
                transaction.metadata['dispute']['status'] = status
                transaction.metadata['dispute']['closed_at'] = datetime.utcnow().isoformat()
        
        db.commit()
        return True
        
    except Exception as e:
        logger.error(f"Error handling dispute webhook: {str(e)}")
        return False


# Climate and sustainability webhooks (if using Stripe Climate)
@router.post("/stripe/climate")
async def stripe_climate_webhook(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature")
):
    """Handle Stripe Climate webhooks for carbon removal tracking"""
    
    try:
        payload = await request.body()
        
        if not stripe_signature:
            raise HTTPException(status_code=400, detail="Missing signature")
        
        # Verify signature (using main region's webhook secret for now)
        if not stripe_service.verify_webhook_signature(payload, stripe_signature, PaymentRegion.US):
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        event = json.loads(payload.decode('utf-8'))
        event_type = event.get('type')
        
        logger.info(f"Received Stripe Climate webhook: {event_type}")
        
        # Handle climate-specific events
        if event_type == 'climate.order.created':
            # Carbon removal order created
            order = event.get('data', {}).get('object', {})
            logger.info(f"Carbon removal order created: {order.get('id')} - {order.get('amount_fees')} USD")
            
        elif event_type == 'climate.order.updated':
            # Carbon removal order updated
            order = event.get('data', {}).get('object', {})
            logger.info(f"Carbon removal order updated: {order.get('id')} - Status: {order.get('status')}")
        
        return {"status": "success", "event_type": event_type}
        
    except Exception as e:
        logger.error(f"Error processing Climate webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed") 