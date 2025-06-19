import stripe
from typing import Dict, Any, Optional, List
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from loguru import logger

from app.core.config import settings
from app.models.user import User
from app.models.order import Order
from app.models.quote import Quote
from app.models.payment import Transaction, TransactionStatus, PaymentMethod
from app.services.notification_service import NotificationService

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripePaymentService:
    """Comprehensive Stripe payment integration service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
    
    def create_payment_intent(
        self,
        amount: Decimal,
        currency: str = "usd",
        customer_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        payment_method_types: List[str] = ["card"],
        automatic_payment_methods: bool = True
    ) -> Dict[str, Any]:
        """Create a Stripe PaymentIntent"""
        
        try:
            # Convert amount to cents (Stripe expects integer cents)
            amount_cents = int(amount * 100)
            
            intent_data = {
                "amount": amount_cents,
                "currency": currency,
                "payment_method_types": payment_method_types,
                "metadata": metadata or {}
            }
            
            if customer_id:
                intent_data["customer"] = customer_id
            
            if automatic_payment_methods:
                intent_data["automatic_payment_methods"] = {"enabled": True}
            
            intent = stripe.PaymentIntent.create(**intent_data)
            
            logger.info(f"Created PaymentIntent: {intent.id} for amount: ${amount}")
            
            return {
                "payment_intent_id": intent.id,
                "client_secret": intent.client_secret,
                "amount": amount,
                "currency": currency,
                "status": intent.status
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating PaymentIntent: {str(e)}")
            raise Exception(f"Payment processing error: {str(e)}")
        except Exception as e:
            logger.error(f"Error creating PaymentIntent: {str(e)}")
            raise Exception(f"Payment creation failed: {str(e)}")
    
    def create_customer(
        self,
        user: User,
        payment_method_id: Optional[str] = None
    ) -> str:
        """Create or retrieve a Stripe customer"""
        
        try:
            # Check if customer already exists
            if user.stripe_customer_id:
                try:
                    customer = stripe.Customer.retrieve(user.stripe_customer_id)
                    if not customer.deleted:
                        return user.stripe_customer_id
                except stripe.error.InvalidRequestError:
                    # Customer doesn't exist, create new one
                    pass
            
            # Create new customer
            customer_data = {
                "email": user.email,
                "name": user.full_name,
                "metadata": {
                    "user_id": str(user.id),
                    "role": user.role.value
                }
            }
            
            if payment_method_id:
                customer_data["payment_method"] = payment_method_id
            
            customer = stripe.Customer.create(**customer_data)
            
            # Update user with Stripe customer ID
            user.stripe_customer_id = customer.id
            self.db.commit()
            
            logger.info(f"Created Stripe customer: {customer.id} for user: {user.id}")
            
            return customer.id
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer: {str(e)}")
            raise Exception(f"Customer creation error: {str(e)}")
        except Exception as e:
            logger.error(f"Error creating customer: {str(e)}")
            raise Exception(f"Customer creation failed: {str(e)}")
    
    def process_order_payment(
        self,
        order: Order,
        quote: Quote,
        payment_method_id: str,
        save_payment_method: bool = False
    ) -> Dict[str, Any]:
        """Process payment for an accepted quote/order"""
        
        try:
            # Create or get customer
            client = self.db.query(User).filter(User.id == order.client_id).first()
            if not client:
                raise Exception("Client not found")
            
            customer_id = self.create_customer(client)
            
            # Create payment intent
            metadata = {
                "order_id": str(order.id),
                "quote_id": str(quote.id),
                "client_id": str(client.id),
                "manufacturer_id": str(quote.manufacturer_id)
            }
            
            payment_intent_data = self.create_payment_intent(
                amount=quote.price_total,
                customer_id=customer_id,
                metadata=metadata
            )
            
            # Confirm payment with payment method
            intent = stripe.PaymentIntent.confirm(
                payment_intent_data["payment_intent_id"],
                payment_method=payment_method_id,
                return_url=f"{settings.FRONTEND_URL}/orders/{order.id}/payment-success"
            )
            
            # Create payment record
            payment = Transaction(
                order_id=order.id,
                quote_id=quote.id,
                client_id=client.id,
                gross_amount=quote.price_total,
                original_currency="usd",
                payment_method_type=PaymentMethod.CARD,
                stripe_payment_intent_id=intent.id,
                status=self._map_stripe_status_to_transaction_status(intent.status),
                payment_metadata={
                    "stripe_customer_id": customer_id,
                    "payment_method_id": payment_method_id
                }
            )
            
            self.db.add(payment)
            self.db.commit()
            
            # Save payment method if requested
            if save_payment_method and intent.status == "succeeded":
                self._save_payment_method(customer_id, payment_method_id)
            
            # Send notifications
            if intent.status == "succeeded":
                self._handle_successful_payment(order, quote, payment)
            
            logger.info(f"Processed payment for order {order.id}: {intent.status}")
            
            return {
                "payment_id": payment.id,
                "payment_intent_id": intent.id,
                "status": intent.status,
                "amount": float(quote.price_total),
                "requires_action": intent.status == "requires_action",
                "client_secret": intent.client_secret if intent.status == "requires_action" else None
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error processing payment: {str(e)}")
            raise Exception(f"Payment processing error: {str(e)}")
        except Exception as e:
            logger.error(f"Error processing payment: {str(e)}")
            raise Exception(f"Payment processing failed: {str(e)}")
    
    def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        metadata: Optional[Dict[str, Any]] = None,
        trial_period_days: Optional[int] = None
    ) -> Dict[str, Any]:
        """Create a Stripe subscription"""
        
        try:
            subscription_data = {
                "customer": customer_id,
                "items": [{"price": price_id}],
                "metadata": metadata or {},
                "expand": ["latest_invoice.payment_intent"]
            }
            
            if trial_period_days:
                subscription_data["trial_period_days"] = trial_period_days
            
            subscription = stripe.Subscription.create(**subscription_data)
            
            logger.info(f"Created subscription: {subscription.id} for customer: {customer_id}")
            
            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
                "current_period_start": datetime.fromtimestamp(subscription.current_period_start),
                "current_period_end": datetime.fromtimestamp(subscription.current_period_end),
                "client_secret": subscription.latest_invoice.payment_intent.client_secret if subscription.latest_invoice.payment_intent else None
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating subscription: {str(e)}")
            raise Exception(f"Subscription creation error: {str(e)}")
        except Exception as e:
            logger.error(f"Error creating subscription: {str(e)}")
            raise Exception(f"Subscription creation failed: {str(e)}")
    
    def handle_webhook(self, payload: bytes, signature: str) -> Dict[str, Any]:
        """Handle Stripe webhook events"""
        
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, settings.STRIPE_WEBHOOK_SECRET
            )
            
            logger.info(f"Received Stripe webhook: {event['type']}")
            
            # Handle different event types
            if event["type"] == "payment_intent.succeeded":
                return self._handle_payment_intent_succeeded(event["data"]["object"])
            
            elif event["type"] == "payment_intent.payment_failed":
                return self._handle_payment_intent_failed(event["data"]["object"])
            
            elif event["type"] == "invoice.payment_succeeded":
                return self._handle_invoice_payment_succeeded(event["data"]["object"])
            
            elif event["type"] == "invoice.payment_failed":
                return self._handle_invoice_payment_failed(event["data"]["object"])
            
            elif event["type"] == "customer.subscription.created":
                return self._handle_subscription_created(event["data"]["object"])
            
            elif event["type"] == "customer.subscription.updated":
                return self._handle_subscription_updated(event["data"]["object"])
            
            elif event["type"] == "customer.subscription.deleted":
                return self._handle_subscription_deleted(event["data"]["object"])
            
            else:
                logger.info(f"Unhandled webhook event type: {event['type']}")
                return {"status": "unhandled", "event_type": event["type"]}
            
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {str(e)}")
            raise Exception("Invalid webhook signature")
        except Exception as e:
            logger.error(f"Error handling webhook: {str(e)}")
            raise Exception(f"Webhook processing failed: {str(e)}")
    
    def refund_payment(
        self,
        payment_intent_id: str,
        amount: Optional[Decimal] = None,
        reason: str = "requested_by_customer"
    ) -> Dict[str, Any]:
        """Process a refund for a payment"""
        
        try:
            refund_data = {
                "payment_intent": payment_intent_id,
                "reason": reason
            }
            
            if amount:
                refund_data["amount"] = int(amount * 100)  # Convert to cents
            
            refund = stripe.Refund.create(**refund_data)
            
            # Update payment record
            payment = self.db.query(Transaction).filter(
                Transaction.stripe_payment_intent_id == payment_intent_id
            ).first()
            
            if payment:
                payment.status = TransactionStatus.REFUNDED
                payment.refund_amount = Decimal(refund.amount) / 100
                # Note: refund_reason field doesn't exist in Transaction model
                payment.refund_processed_at = datetime.utcnow()
                self.db.commit()
            
            logger.info(f"Processed refund: {refund.id} for payment: {payment_intent_id}")
            
            return {
                "refund_id": refund.id,
                "amount": Decimal(refund.amount) / 100,
                "status": refund.status,
                "reason": reason
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error processing refund: {str(e)}")
            raise Exception(f"Refund processing error: {str(e)}")
        except Exception as e:
            logger.error(f"Error processing refund: {str(e)}")
            raise Exception(f"Refund processing failed: {str(e)}")
    
    def get_payment_methods(self, customer_id: str) -> List[Dict[str, Any]]:
        """Get saved payment methods for a customer"""
        
        try:
            payment_methods = stripe.PaymentMethod.list(
                customer=customer_id,
                type="card"
            )
            
            methods = []
            for pm in payment_methods.data:
                methods.append({
                    "id": pm.id,
                    "type": pm.type,
                    "card": {
                        "brand": pm.card.brand,
                        "last4": pm.card.last4,
                        "exp_month": pm.card.exp_month,
                        "exp_year": pm.card.exp_year
                    } if pm.card else None,
                    "created": datetime.fromtimestamp(pm.created)
                })
            
            return methods
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error getting payment methods: {str(e)}")
            raise Exception(f"Error retrieving payment methods: {str(e)}")
        except Exception as e:
            logger.error(f"Error getting payment methods: {str(e)}")
            raise Exception(f"Failed to get payment methods: {str(e)}")
    
    def detach_payment_method(self, payment_method_id: str) -> bool:
        """Remove a saved payment method"""
        
        try:
            stripe.PaymentMethod.detach(payment_method_id)
            logger.info(f"Detached payment method: {payment_method_id}")
            return True
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error detaching payment method: {str(e)}")
            raise Exception(f"Error removing payment method: {str(e)}")
        except Exception as e:
            logger.error(f"Error detaching payment method: {str(e)}")
            raise Exception(f"Failed to remove payment method: {str(e)}")
    
    def create_setup_intent(self, customer_id: str) -> Dict[str, Any]:
        """Create a SetupIntent for saving payment methods"""
        
        try:
            setup_intent = stripe.SetupIntent.create(
                customer=customer_id,
                payment_method_types=["card"],
                usage="off_session"
            )
            
            return {
                "setup_intent_id": setup_intent.id,
                "client_secret": setup_intent.client_secret,
                "status": setup_intent.status
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating SetupIntent: {str(e)}")
            raise Exception(f"Setup intent creation error: {str(e)}")
        except Exception as e:
            logger.error(f"Error creating SetupIntent: {str(e)}")
            raise Exception(f"Setup intent creation failed: {str(e)}")
    
    def get_payment_history(
        self,
        user_id: int,
        limit: int = 20,
        starting_after: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get payment history for a user"""
        
        try:
            payments = self.db.query(Transaction).filter(
                Transaction.client_id == user_id
            ).order_by(Transaction.created_at.desc()).limit(limit).all()
            
            payment_history = []
            for payment in payments:
                payment_data = {
                    "id": payment.id,
                    "amount": float(payment.gross_amount),
                    "currency": payment.original_currency,
                    "status": payment.status.value,
                    "payment_method": payment.payment_method_type.value if payment.payment_method_type else None,
                    "created_at": payment.created_at,
                    "order_id": payment.order_id,
                    "quote_id": payment.quote_id
                }
                
                # Add refund info if applicable
                if payment.status == TransactionStatus.REFUNDED:
                    payment_data.update({
                        "refund_amount": float(payment.refund_amount) if payment.refund_amount else None,
                        "refund_reason": None,  # This field doesn't exist in Transaction model
                        "refunded_at": payment.refund_processed_at
                    })
                
                payment_history.append(payment_data)
            
            return payment_history
            
        except Exception as e:
            logger.error(f"Error getting payment history: {str(e)}")
            raise Exception(f"Failed to get payment history: {str(e)}")
    
    # Private helper methods
    
    def _map_stripe_status_to_transaction_status(self, stripe_status: str) -> TransactionStatus:
        """Map Stripe payment status to internal payment status"""
        
        status_mapping = {
            "succeeded": TransactionStatus.SUCCEEDED,
            "processing": TransactionStatus.PROCESSING,
            "requires_payment_method": TransactionStatus.FAILED,
            "requires_confirmation": TransactionStatus.PENDING,
            "requires_action": TransactionStatus.REQUIRES_ACTION,
            "canceled": TransactionStatus.CANCELLED,
            "requires_capture": TransactionStatus.REQUIRES_CAPTURE
        }
        
        return status_mapping.get(stripe_status, TransactionStatus.PENDING)
    
    def _save_payment_method(self, customer_id: str, payment_method_id: str):
        """Save payment method to customer"""
        
        try:
            stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id
            )
            logger.info(f"Saved payment method {payment_method_id} to customer {customer_id}")
        except stripe.error.StripeError as e:
            logger.error(f"Error saving payment method: {str(e)}")
    
    def _handle_successful_payment(self, order: Order, quote: Quote, payment: Transaction):
        """Handle successful payment notifications and updates"""
        
        try:
            # Update order status
            order.payment_status = "paid"
            order.status = "in_production"
            
            # Create notifications (simplified - assuming notification service has generic methods)
            try:
                # Note: Using generic notification method instead of payment-specific one
                logger.info(f"Payment successful for order {order.id}, amount: ${payment.gross_amount}")
                # TODO: Implement proper notification service calls
            except Exception as e:
                logger.error(f"Error sending payment notifications: {str(e)}")
            
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error handling successful payment: {str(e)}")
    
    def _handle_payment_intent_succeeded(self, payment_intent) -> Dict[str, Any]:
        """Handle payment_intent.succeeded webhook"""
        
        try:
            payment = self.db.query(Transaction).filter(
                Transaction.stripe_payment_intent_id == payment_intent["id"]
            ).first()
            
            if payment:
                payment.status = TransactionStatus.SUCCEEDED
                payment.captured_at = datetime.utcnow()
                
                # Update order
                order = self.db.query(Order).filter(Order.id == payment.order_id).first()
                if order:
                    order.payment_status = "paid"
                    order.status = "in_production"
                
                self.db.commit()
                
                logger.info(f"Updated payment {payment.id} status to completed")
            
            return {"status": "handled", "payment_updated": payment is not None}
            
        except Exception as e:
            logger.error(f"Error handling payment_intent.succeeded: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def _handle_payment_intent_failed(self, payment_intent) -> Dict[str, Any]:
        """Handle payment_intent.payment_failed webhook"""
        
        try:
            payment = self.db.query(Transaction).filter(
                Transaction.stripe_payment_intent_id == payment_intent["id"]
            ).first()
            
            if payment:
                payment.status = TransactionStatus.FAILED
                payment.failure_reason = payment_intent.get("last_payment_error", {}).get("message", "Payment failed")
                
                # Send failure notification (simplified)
                logger.error(f"Payment failed for order {payment.order_id}: {payment.failure_reason}")
                # TODO: Implement proper notification service calls
                
                self.db.commit()
                
                logger.info(f"Updated payment {payment.id} status to failed")
            
            return {"status": "handled", "payment_updated": payment is not None}
            
        except Exception as e:
            logger.error(f"Error handling payment_intent.payment_failed: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def _handle_invoice_payment_succeeded(self, invoice) -> Dict[str, Any]:
        """Handle invoice.payment_succeeded webhook"""
        
        logger.info(f"Invoice payment succeeded: {invoice['id']}")
        return {"status": "handled", "event": "invoice_payment_succeeded"}
    
    def _handle_invoice_payment_failed(self, invoice) -> Dict[str, Any]:
        """Handle invoice.payment_failed webhook"""
        
        logger.info(f"Invoice payment failed: {invoice['id']}")
        return {"status": "handled", "event": "invoice_payment_failed"}
    
    def _handle_subscription_created(self, subscription) -> Dict[str, Any]:
        """Handle customer.subscription.created webhook"""
        
        logger.info(f"Subscription created: {subscription['id']}")
        return {"status": "handled", "event": "subscription_created"}
    
    def _handle_subscription_updated(self, subscription) -> Dict[str, Any]:
        """Handle customer.subscription.updated webhook"""
        
        logger.info(f"Subscription updated: {subscription['id']}")
        return {"status": "handled", "event": "subscription_updated"}
    
    def _handle_subscription_deleted(self, subscription) -> Dict[str, Any]:
        """Handle customer.subscription.deleted webhook"""
        
        logger.info(f"Subscription deleted: {subscription['id']}")
        return {"status": "handled", "event": "subscription_deleted"} 