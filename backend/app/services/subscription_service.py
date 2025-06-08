import stripe
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from decimal import Decimal
from loguru import logger
import uuid

from app.core.config import settings
from app.models.payment import (
    Subscription, SubscriptionStatus, Transaction, TransactionType, 
    TransactionStatus, PaymentRegion
)
from app.models.user import User
from app.services.payment import MultiRegionStripeService


class SubscriptionService:
    """Comprehensive subscription management service"""
    
    def __init__(self):
        self.stripe_service = MultiRegionStripeService()
    
    def get_subscription_plans(self) -> Dict[str, Dict[str, Any]]:
        """Get available subscription plans"""
        return {
            'starter': {
                'name': 'Manufacturing Starter',
                'price_monthly': Decimal('99.00'),
                'price_yearly': Decimal('990.00'),
                'features': [
                    'Up to 50 quotes per month',
                    'Basic marketplace listing',
                    'Standard support',
                    '2% platform commission'
                ],
                'limits': {
                    'monthly_quotes': 50,
                    'commission_rate': 2.0,
                    'priority_listing': False
                }
            },
            'professional': {
                'name': 'Manufacturing Professional',
                'price_monthly': Decimal('299.00'),
                'price_yearly': Decimal('2990.00'),
                'features': [
                    'Up to 200 quotes per month',
                    'Priority marketplace listing',
                    'Advanced analytics',
                    'Priority support',
                    '1.5% platform commission'
                ],
                'limits': {
                    'monthly_quotes': 200,
                    'commission_rate': 1.5,
                    'priority_listing': True,
                    'advanced_analytics': True
                }
            },
            'enterprise': {
                'name': 'Manufacturing Enterprise',
                'price_monthly': Decimal('999.00'),
                'price_yearly': Decimal('9990.00'),
                'features': [
                    'Unlimited quotes',
                    'Premium marketplace listing',
                    'Custom integrations',
                    'Dedicated account manager',
                    '1% platform commission',
                    'API access',
                    'White-label options'
                ],
                'limits': {
                    'monthly_quotes': -1,  # Unlimited
                    'commission_rate': 1.0,
                    'priority_listing': True,
                    'advanced_analytics': True,
                    'api_access': True,
                    'white_label': True,
                    'dedicated_support': True
                }
            }
        }
    
    async def create_stripe_customer(
        self,
        db: Session,
        user: User,
        region: PaymentRegion = PaymentRegion.US
    ) -> Optional[str]:
        """Create Stripe customer for subscription billing"""
        
        try:
            self.stripe_service.set_stripe_key(region)
            
            customer = stripe.Customer.create(
                email=user.email,
                name=user.full_name,
                metadata={
                    'user_id': str(user.id),
                    'region': region.value
                }
            )
            
            # Store customer ID in user record
            user.stripe_customer_id = customer.id
            db.commit()
            
            logger.info(f"Stripe customer created for user {user.id}: {customer.id}")
            return customer.id
            
        except stripe.error.StripeError as e:
            logger.error(f"Error creating Stripe customer: {str(e)}")
            return None
    
    async def create_subscription(
        self,
        db: Session,
        user: User,
        plan_name: str,
        interval: str = 'month',
        manufacturer_id: Optional[int] = None,
        payment_method_id: Optional[str] = None,
        region: PaymentRegion = PaymentRegion.US
    ) -> Optional[Subscription]:
        """Create new subscription"""
        
        try:
            plans = self.get_subscription_plans()
            if plan_name not in plans:
                raise ValueError(f"Invalid plan: {plan_name}")
            
            plan = plans[plan_name]
            self.stripe_service.set_stripe_key(region)
            
            # Ensure user has Stripe customer ID
            if not user.stripe_customer_id:
                customer_id = await self.create_stripe_customer(db, user, region)
                if not customer_id:
                    return None
            else:
                customer_id = user.stripe_customer_id
            
            # Determine price based on interval
            amount = plan['price_yearly'] if interval == 'year' else plan['price_monthly']
            
            # Create Stripe price if not exists
            price_id = await self._get_or_create_stripe_price(
                plan_name, amount, interval, region
            )
            
            if not price_id:
                return None
            
            # Create subscription in Stripe
            stripe_subscription_params = {
                'customer': customer_id,
                'items': [{'price': price_id}],
                'payment_behavior': 'default_incomplete',
                'payment_settings': {'payment_method_types': ['card']},
                'expand': ['latest_invoice.payment_intent'],
                'metadata': {
                    'user_id': str(user.id),
                    'plan_name': plan_name,
                }
            }
            
            if manufacturer_id:
                stripe_subscription_params['metadata']['manufacturer_id'] = str(manufacturer_id)
            
            if payment_method_id:
                stripe_subscription_params['default_payment_method'] = payment_method_id
            
            stripe_subscription = stripe.Subscription.create(**stripe_subscription_params)
            
            # Create subscription record
            subscription = Subscription(
                user_id=user.id,
                manufacturer_id=manufacturer_id,
                stripe_subscription_id=stripe_subscription.id,
                stripe_customer_id=customer_id,
                stripe_price_id=price_id,
                status=SubscriptionStatus.INCOMPLETE,
                plan_name=plan_name,
                amount=amount,
                currency='USD',  # TODO: Make dynamic based on region
                interval=interval,
                interval_count=1,
                current_period_start=datetime.fromtimestamp(stripe_subscription.current_period_start),
                current_period_end=datetime.fromtimestamp(stripe_subscription.current_period_end)
            )
            
            # Handle trial if applicable
            if stripe_subscription.trial_start:
                subscription.trial_start = datetime.fromtimestamp(stripe_subscription.trial_start)
                subscription.trial_end = datetime.fromtimestamp(stripe_subscription.trial_end)
            
            db.add(subscription)
            db.commit()
            
            logger.info(f"Subscription created for user {user.id}: {subscription.id}")
            return subscription
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating subscription: {str(e)}")
            db.rollback()
            return None
        except Exception as e:
            logger.error(f"Error creating subscription: {str(e)}")
            db.rollback()
            return None
    
    async def _get_or_create_stripe_price(
        self,
        plan_name: str,
        amount: Decimal,
        interval: str,
        region: PaymentRegion
    ) -> Optional[str]:
        """Get existing or create new Stripe price"""
        
        try:
            # First try to find existing price
            prices = stripe.Price.list(
                lookup_keys=[f"{plan_name}_{interval}_{region.value}"],
                limit=1
            )
            
            if prices.data:
                return prices.data[0].id
            
            # Create new price
            price = stripe.Price.create(
                unit_amount=int(amount * 100),  # Convert to cents
                currency='usd',  # TODO: Make dynamic
                recurring={'interval': interval},
                product_data={
                    'name': f"Manufacturing Platform - {plan_name.title()} ({interval}ly)",
                    'metadata': {
                        'plan_name': plan_name,
                        'region': region.value
                    }
                },
                lookup_key=f"{plan_name}_{interval}_{region.value}",
                metadata={
                    'plan_name': plan_name,
                    'interval': interval,
                    'region': region.value
                }
            )
            
            return price.id
            
        except stripe.error.StripeError as e:
            logger.error(f"Error creating Stripe price: {str(e)}")
            return None
    
    async def cancel_subscription(
        self,
        db: Session,
        subscription: Subscription,
        cancel_at_period_end: bool = True
    ) -> bool:
        """Cancel subscription"""
        
        try:
            # Determine region from subscription
            region = PaymentRegion.US  # TODO: Store region in subscription
            self.stripe_service.set_stripe_key(region)
            
            if cancel_at_period_end:
                # Cancel at end of current period
                updated_subscription = stripe.Subscription.modify(
                    subscription.stripe_subscription_id,
                    cancel_at_period_end=True
                )
                
                subscription.cancel_at_period_end = True
                
            else:
                # Cancel immediately
                canceled_subscription = stripe.Subscription.cancel(
                    subscription.stripe_subscription_id
                )
                
                subscription.status = SubscriptionStatus.CANCELED
                subscription.canceled_at = datetime.utcnow()
            
            db.commit()
            
            logger.info(f"Subscription canceled: {subscription.id}")
            return True
            
        except stripe.error.StripeError as e:
            logger.error(f"Error canceling subscription: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Error canceling subscription: {str(e)}")
            return False
    
    async def update_subscription(
        self,
        db: Session,
        subscription: Subscription,
        new_plan: str
    ) -> bool:
        """Update subscription to different plan"""
        
        try:
            plans = self.get_subscription_plans()
            if new_plan not in plans:
                raise ValueError(f"Invalid plan: {new_plan}")
            
            region = PaymentRegion.US  # TODO: Store region in subscription
            self.stripe_service.set_stripe_key(region)
            
            # Get new price
            new_price_id = await self._get_or_create_stripe_price(
                new_plan, 
                plans[new_plan]['price_monthly'], 
                subscription.interval, 
                region
            )
            
            if not new_price_id:
                return False
            
            # Update subscription in Stripe
            stripe_subscription = stripe.Subscription.retrieve(subscription.stripe_subscription_id)
            
            stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                items=[{
                    'id': stripe_subscription['items']['data'][0].id,
                    'price': new_price_id,
                }],
                proration_behavior='create_prorations'
            )
            
            # Update database record
            subscription.plan_name = new_plan
            subscription.stripe_price_id = new_price_id
            subscription.amount = plans[new_plan]['price_monthly']
            
            db.commit()
            
            logger.info(f"Subscription updated: {subscription.id} to {new_plan}")
            return True
            
        except stripe.error.StripeError as e:
            logger.error(f"Error updating subscription: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Error updating subscription: {str(e)}")
            return False
    
    async def handle_subscription_webhook(
        self,
        db: Session,
        event_type: str,
        event_data: Dict[str, Any]
    ) -> bool:
        """Handle subscription-related webhook events"""
        
        try:
            stripe_subscription = event_data.get('object', {})
            subscription_id = stripe_subscription.get('id')
            
            if not subscription_id:
                return False
            
            subscription = db.query(Subscription).filter(
                Subscription.stripe_subscription_id == subscription_id
            ).first()
            
            if not subscription:
                logger.warning(f"Subscription not found: {subscription_id}")
                return True  # Not our subscription
            
            # Handle different event types
            if event_type == 'customer.subscription.created':
                subscription.status = SubscriptionStatus.ACTIVE
                
            elif event_type == 'customer.subscription.updated':
                # Update subscription status and details
                status_mapping = {
                    'active': SubscriptionStatus.ACTIVE,
                    'past_due': SubscriptionStatus.PAST_DUE,
                    'unpaid': SubscriptionStatus.UNPAID,
                    'canceled': SubscriptionStatus.CANCELED,
                    'incomplete': SubscriptionStatus.INCOMPLETE,
                    'incomplete_expired': SubscriptionStatus.INCOMPLETE_EXPIRED,
                    'trialing': SubscriptionStatus.TRIALING,
                    'paused': SubscriptionStatus.PAUSED
                }
                
                subscription.status = status_mapping.get(
                    stripe_subscription.get('status'), 
                    SubscriptionStatus.ACTIVE
                )
                
                subscription.current_period_start = datetime.fromtimestamp(
                    stripe_subscription.get('current_period_start')
                )
                subscription.current_period_end = datetime.fromtimestamp(
                    stripe_subscription.get('current_period_end')
                )
                
                subscription.cancel_at_period_end = stripe_subscription.get('cancel_at_period_end', False)
                
                if stripe_subscription.get('canceled_at'):
                    subscription.canceled_at = datetime.fromtimestamp(
                        stripe_subscription.get('canceled_at')
                    )
                
            elif event_type == 'customer.subscription.deleted':
                subscription.status = SubscriptionStatus.CANCELED
                subscription.ended_at = datetime.utcnow()
                
            elif event_type == 'invoice.payment_succeeded':
                # Handle successful subscription payment
                invoice = event_data.get('object', {})
                if invoice.get('subscription') == subscription_id:
                    # Create transaction record for subscription payment
                    await self._create_subscription_transaction(
                        db, subscription, invoice, TransactionStatus.SUCCEEDED
                    )
                    
            elif event_type == 'invoice.payment_failed':
                # Handle failed subscription payment
                invoice = event_data.get('object', {})
                if invoice.get('subscription') == subscription_id:
                    subscription.status = SubscriptionStatus.PAST_DUE
                    
                    await self._create_subscription_transaction(
                        db, subscription, invoice, TransactionStatus.FAILED
                    )
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error handling subscription webhook: {str(e)}")
            return False
    
    async def _create_subscription_transaction(
        self,
        db: Session,
        subscription: Subscription,
        invoice: Dict[str, Any],
        status: TransactionStatus
    ):
        """Create transaction record for subscription payment"""
        
        try:
            amount = Decimal(str(invoice.get('amount_paid', 0))) / 100  # Convert from cents
            
            transaction = Transaction(
                client_id=subscription.user_id,
                manufacturer_id=subscription.manufacturer_id,
                transaction_type=TransactionType.SUBSCRIPTION,
                status=status,
                
                region=PaymentRegion.US,  # TODO: Store region in subscription
                original_currency=invoice.get('currency', 'usd').upper(),
                platform_currency=invoice.get('currency', 'usd').upper(),
                
                original_amount=amount,
                gross_amount=amount,
                net_amount=amount,
                
                platform_commission_rate_pct=Decimal('0.0'),
                platform_commission_amount=Decimal('0.0'),
                
                manufacturer_payout_amount=amount,
                manufacturer_payout_currency=invoice.get('currency', 'usd').upper(),
                
                stripe_invoice_id=invoice.get('id'),
                stripe_subscription_id=subscription.stripe_subscription_id,
                
                metadata={
                    'subscription_id': subscription.id,
                    'plan_name': subscription.plan_name,
                    'billing_period_start': subscription.current_period_start.isoformat(),
                    'billing_period_end': subscription.current_period_end.isoformat()
                }
            )
            
            if status == TransactionStatus.SUCCEEDED:
                transaction.authorized_at = datetime.utcnow()
                transaction.captured_at = datetime.utcnow()
            elif status == TransactionStatus.FAILED:
                transaction.failed_at = datetime.utcnow()
                transaction.failure_reason = "Subscription payment failed"
            
            db.add(transaction)
            
        except Exception as e:
            logger.error(f"Error creating subscription transaction: {str(e)}")
    
    def get_subscription_usage(
        self,
        db: Session,
        subscription: Subscription,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get subscription usage metrics"""
        
        if not start_date:
            start_date = subscription.current_period_start
        if not end_date:
            end_date = subscription.current_period_end
        
        # Get plan limits
        plans = self.get_subscription_plans()
        plan_limits = plans.get(subscription.plan_name, {}).get('limits', {})
        
        # Calculate usage (this would connect to actual usage tracking)
        # For now, return mock data structure
        return {
            'plan_name': subscription.plan_name,
            'billing_period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'limits': plan_limits,
            'usage': {
                'quotes_created': 0,  # TODO: Query actual usage
                'api_calls': 0,
                'storage_mb': 0
            },
            'overage_charges': Decimal('0.00')
        } 