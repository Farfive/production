import stripe
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from decimal import Decimal
from loguru import logger
import uuid

from app.core.config import settings
from app.models.financial import Invoice
from app.models.payment import (
    Transaction, TransactionType, TransactionStatus, PaymentRegion
)
from app.models.order import Order
from app.models.user import User
from app.services.payment import MultiRegionStripeService


class InvoiceService:
    """Comprehensive B2B invoice management service"""
    
    def __init__(self):
        self.stripe_service = MultiRegionStripeService()
    
    def generate_invoice_number(self) -> str:
        """Generate unique invoice number"""
        timestamp = datetime.now().strftime("%Y%m")
        random_part = str(uuid.uuid4())[:8].upper()
        return f"INV-{timestamp}-{random_part}"
    
    async def create_invoice(
        self,
        db: Session,
        order: Order,
        client: User,
        manufacturer,
        payment_terms: str = "NET_30",
        region: PaymentRegion = PaymentRegion.US
    ) -> Optional[Invoice]:
        """Create B2B invoice for order"""
        
        try:
            self.stripe_service.set_stripe_key(region)
            
            # Calculate amounts
            subtotal = Decimal(str(order.total_amount or 0))
            
            # Calculate tax based on region
            tax_info = self.stripe_service.calculate_tax(
                subtotal, region, client.country or 'US'
            )
            
            tax_amount = tax_info['tax_amount']
            total_amount = subtotal + tax_amount
            
            # Calculate due date
            due_date = self._calculate_due_date(payment_terms)
            
            # Create Stripe invoice if customer exists
            stripe_invoice_id = None
            if hasattr(client, 'stripe_customer_id') and client.stripe_customer_id:
                try:
                    stripe_invoice = await self._create_stripe_invoice(
                        client.stripe_customer_id,
                        order,
                        subtotal,
                        tax_amount,
                        total_amount,
                        due_date,
                        region
                    )
                    stripe_invoice_id = stripe_invoice.id
                except Exception as e:
                    logger.warning(f"Failed to create Stripe invoice: {e}")
            
            # Generate invoice number
            invoice_number = self.generate_invoice_number()
            
            # Create invoice record
            invoice = Invoice(
                order_id=order.id,
                client_id=client.id,
                manufacturer_id=manufacturer.id,
                invoice_number=invoice_number,
                stripe_invoice_id=stripe_invoice_id,
                subtotal=subtotal,
                tax_amount=tax_amount,
                total_amount=total_amount,
                currency=order.currency or 'USD',
                payment_terms=payment_terms,
                due_date=due_date,
                status='DRAFT'
            )
            
            db.add(invoice)
            db.commit()
            
            logger.info(f"Invoice created: {invoice_number} for order {order.id}")
            return invoice
            
        except Exception as e:
            logger.error(f"Error creating invoice: {str(e)}")
            db.rollback()
            return None
    
    async def _create_stripe_invoice(
        self,
        customer_id: str,
        order: Order,
        subtotal: Decimal,
        tax_amount: Decimal,
        total_amount: Decimal,
        due_date: datetime,
        region: PaymentRegion
    ) -> stripe.Invoice:
        """Create invoice in Stripe"""
        
        # Create invoice items
        invoice_items = []
        
        # Main order item
        invoice_items.append({
            'customer': customer_id,
            'amount': int(subtotal * 100),  # Convert to cents
            'currency': 'usd',  # TODO: Make dynamic
            'description': f"Manufacturing Order #{order.id}: {order.title}",
            'metadata': {
                'order_id': str(order.id),
                'item_type': 'manufacturing_order'
            }
        })
        
        # Tax item if applicable
        if tax_amount > 0:
            invoice_items.append({
                'customer': customer_id,
                'amount': int(tax_amount * 100),
                'currency': 'usd',
                'description': 'Tax',
                'metadata': {
                    'order_id': str(order.id),
                    'item_type': 'tax'
                }
            })
        
        # Create invoice items in Stripe
        for item_data in invoice_items:
            stripe.InvoiceItem.create(**item_data)
        
        # Create the invoice
        invoice = stripe.Invoice.create(
            customer=customer_id,
            collection_method='send_invoice',
            days_until_due=self._get_days_until_due(due_date),
            description=f"Manufacturing Order #{order.id}",
            metadata={
                'order_id': str(order.id),
                'region': region.value
            },
            footer="Thank you for your business! Payment terms apply as specified.",
            auto_advance=False  # Don't auto-finalize
        )
        
        return invoice
    
    def _calculate_due_date(self, payment_terms: str) -> datetime:
        """Calculate due date based on payment terms"""
        
        now = datetime.utcnow()
        
        if payment_terms == "NET_15":
            return now + timedelta(days=15)
        elif payment_terms == "NET_30":
            return now + timedelta(days=30)
        elif payment_terms == "NET_60":
            return now + timedelta(days=60)
        elif payment_terms == "NET_90":
            return now + timedelta(days=90)
        elif payment_terms == "DUE_ON_RECEIPT":
            return now + timedelta(days=1)
        else:
            # Default to NET_30
            return now + timedelta(days=30)
    
    def _get_days_until_due(self, due_date: datetime) -> int:
        """Get days until due date"""
        delta = due_date - datetime.utcnow()
        return max(1, delta.days)
    
    async def send_invoice(
        self,
        db: Session,
        invoice: Invoice
    ) -> bool:
        """Send invoice to client"""
        
        try:
            # Update status to sent
            invoice.status = 'SENT'
            invoice.issued_at = datetime.utcnow()
            
            # Send Stripe invoice if exists
            if invoice.stripe_invoice_id:
                try:
                    # Determine region (TODO: store in invoice)
                    region = PaymentRegion.US
                    self.stripe_service.set_stripe_key(region)
                    
                    # Finalize and send invoice
                    stripe.Invoice.finalize_invoice(invoice.stripe_invoice_id)
                    stripe.Invoice.send_invoice(invoice.stripe_invoice_id)
                    
                except stripe.error.StripeError as e:
                    logger.error(f"Error sending Stripe invoice: {e}")
                    # Continue anyway - we can send via email
            
            # TODO: Send invoice via email system
            # await self._send_invoice_email(invoice)
            
            db.commit()
            
            logger.info(f"Invoice sent: {invoice.invoice_number}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending invoice: {str(e)}")
            return False
    
    async def mark_invoice_paid(
        self,
        db: Session,
        invoice: Invoice,
        payment_amount: Decimal,
        payment_method: str = "bank_transfer"
    ) -> bool:
        """Mark invoice as paid (for manual payments)"""
        
        try:
            if invoice.status == 'PAID':
                logger.warning(f"Invoice {invoice.invoice_number} already paid")
                return True
            
            # Update invoice status
            invoice.status = 'PAID'
            invoice.paid_at = datetime.utcnow()
            
            # Create transaction record
            transaction = Transaction(
                order_id=invoice.order_id,
                client_id=invoice.client_id,
                manufacturer_id=invoice.manufacturer_id,
                transaction_type=TransactionType.INVOICE,
                status=TransactionStatus.SUCCEEDED,
                
                region=PaymentRegion.US,  # TODO: Store in invoice
                original_currency=invoice.currency,
                platform_currency=invoice.currency,
                
                original_amount=payment_amount,
                gross_amount=payment_amount,
                net_amount=payment_amount,
                
                platform_commission_rate_pct=Decimal('0.0'),
                platform_commission_amount=Decimal('0.0'),
                
                manufacturer_payout_amount=payment_amount,
                manufacturer_payout_currency=invoice.currency,
                
                stripe_invoice_id=invoice.stripe_invoice_id,
                
                authorized_at=datetime.utcnow(),
                captured_at=datetime.utcnow(),
                
                metadata={
                    'invoice_id': invoice.id,
                    'invoice_number': invoice.invoice_number,
                    'payment_method': payment_method,
                    'manual_payment': True
                }
            )
            
            db.add(transaction)
            db.commit()
            
            logger.info(f"Invoice marked as paid: {invoice.invoice_number}")
            return True
            
        except Exception as e:
            logger.error(f"Error marking invoice paid: {str(e)}")
            db.rollback()
            return False
    
    async def handle_stripe_invoice_webhook(
        self,
        db: Session,
        event_type: str,
        event_data: Dict[str, Any]
    ) -> bool:
        """Handle Stripe invoice webhook events"""
        
        try:
            stripe_invoice = event_data.get('object', {})
            stripe_invoice_id = stripe_invoice.get('id')
            
            if not stripe_invoice_id:
                return False
            
            # Find invoice
            invoice = db.query(Invoice).filter(
                Invoice.stripe_invoice_id == stripe_invoice_id
            ).first()
            
            if not invoice:
                logger.warning(f"Invoice not found for Stripe invoice {stripe_invoice_id}")
                return True  # Not our invoice
            
            # Handle different event types
            if event_type == 'invoice.paid':
                # Invoice was paid via Stripe
                await self._handle_stripe_invoice_paid(db, invoice, stripe_invoice)
                
            elif event_type == 'invoice.payment_failed':
                # Payment failed
                invoice.status = 'OVERDUE'
                
            elif event_type == 'invoice.finalized':
                # Invoice was finalized
                if invoice.status == 'DRAFT':
                    invoice.status = 'SENT'
                    invoice.issued_at = datetime.utcnow()
            
            elif event_type == 'invoice.voided':
                # Invoice was voided
                invoice.status = 'CANCELLED'
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error handling invoice webhook: {str(e)}")
            return False
    
    async def _handle_stripe_invoice_paid(
        self,
        db: Session,
        invoice: Invoice,
        stripe_invoice: Dict[str, Any]
    ):
        """Handle paid invoice from Stripe"""
        
        try:
            if invoice.status == 'PAID':
                return  # Already processed
            
            # Update invoice
            invoice.status = 'PAID'
            invoice.paid_at = datetime.utcnow()
            
            # Create transaction record
            amount_paid = Decimal(str(stripe_invoice.get('amount_paid', 0))) / 100
            
            transaction = Transaction(
                order_id=invoice.order_id,
                client_id=invoice.client_id,
                manufacturer_id=invoice.manufacturer_id,
                transaction_type=TransactionType.INVOICE,
                status=TransactionStatus.SUCCEEDED,
                
                region=PaymentRegion.US,  # TODO: Store in invoice
                original_currency=invoice.currency,
                platform_currency=invoice.currency,
                
                original_amount=amount_paid,
                gross_amount=amount_paid,
                net_amount=amount_paid,
                
                platform_commission_rate_pct=Decimal('0.0'),
                platform_commission_amount=Decimal('0.0'),
                
                manufacturer_payout_amount=amount_paid,
                manufacturer_payout_currency=invoice.currency,
                
                stripe_invoice_id=invoice.stripe_invoice_id,
                stripe_charge_id=stripe_invoice.get('charge'),
                
                authorized_at=datetime.utcnow(),
                captured_at=datetime.utcnow(),
                
                metadata={
                    'invoice_id': invoice.id,
                    'invoice_number': invoice.invoice_number,
                    'stripe_payment': True
                }
            )
            
            db.add(transaction)
            
        except Exception as e:
            logger.error(f"Error processing paid invoice: {str(e)}")
    
    def get_overdue_invoices(
        self,
        db: Session,
        days_overdue: int = 0
    ) -> List[Invoice]:
        """Get overdue invoices"""
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_overdue)
        
        return db.query(Invoice).filter(
            Invoice.status.in_(['SENT', 'OVERDUE']),
            Invoice.due_date < cutoff_date
        ).all()
    
    async def send_overdue_reminders(
        self,
        db: Session,
        days_overdue: int = 7
    ) -> int:
        """Send reminders for overdue invoices"""
        
        overdue_invoices = self.get_overdue_invoices(db, days_overdue)
        sent_count = 0
        
        for invoice in overdue_invoices:
            try:
                # Update status to overdue
                if invoice.status != 'OVERDUE':
                    invoice.status = 'OVERDUE'
                
                # TODO: Send reminder email
                # await self._send_overdue_reminder(invoice)
                
                sent_count += 1
                
            except Exception as e:
                logger.error(f"Error sending reminder for invoice {invoice.invoice_number}: {e}")
        
        if sent_count > 0:
            db.commit()
            logger.info(f"Sent {sent_count} overdue reminders")
        
        return sent_count
    
    def get_invoice_metrics(
        self,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get invoice metrics and analytics"""
        
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        # Base query
        base_query = db.query(Invoice).filter(
            Invoice.created_at >= start_date,
            Invoice.created_at <= end_date
        )
        
        # Calculate metrics
        total_invoices = base_query.count()
        paid_invoices = base_query.filter(Invoice.status == 'PAID').count()
        overdue_invoices = base_query.filter(Invoice.status == 'OVERDUE').count()
        
        # Calculate amounts
        total_amount = sum([
            float(inv.total_amount) for inv in base_query.all()
        ])
        
        paid_amount = sum([
            float(inv.total_amount) for inv in base_query.filter(Invoice.status == 'PAID').all()
        ])
        
        # Calculate averages
        avg_payment_time = None  # TODO: Calculate average payment time
        
        return {
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'counts': {
                'total': total_invoices,
                'paid': paid_invoices,
                'overdue': overdue_invoices,
                'pending': total_invoices - paid_invoices - overdue_invoices
            },
            'amounts': {
                'total': total_amount,
                'paid': paid_amount,
                'outstanding': total_amount - paid_amount
            },
            'rates': {
                'payment_rate': (paid_invoices / total_invoices * 100) if total_invoices > 0 else 0,
                'overdue_rate': (overdue_invoices / total_invoices * 100) if total_invoices > 0 else 0
            },
            'avg_payment_time_days': avg_payment_time
        } 