"""
Payment processing tasks with comprehensive retry logic and monitoring
"""
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from decimal import Decimal
from celery import current_app
from celery.exceptions import Retry, MaxRetriesExceededError
from sqlalchemy.orm import Session
from loguru import logger

from app.core.celery_config import celery_app
from app.core.database import get_db
from app.models.order import Order
from app.models.transaction import Transaction
from app.models.user import User
from app.services.payment import PaymentService
from app.services.notification import NotificationService


@celery_app.task(bind=True, max_retries=5, default_retry_delay=30)
def process_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process individual payment with comprehensive retry logic
    Priority: CRITICAL
    """
    try:
        payment_service = PaymentService()
        
        # Validate payment data
        required_fields = ['amount', 'currency', 'payment_method_id', 'order_id', 'user_id']
        for field in required_fields:
            if field not in payment_data:
                raise ValueError(f"Missing required field: {field}")
        
        logger.info(f"Processing payment for order {payment_data['order_id']}")
        
        # Process the payment
        result = asyncio.run(payment_service.process_payment(
            amount=Decimal(str(payment_data['amount'])),
            currency=payment_data['currency'],
            payment_method_id=payment_data['payment_method_id'],
            order_id=payment_data['order_id'],
            user_id=payment_data['user_id'],
            metadata=payment_data.get('metadata', {})
        ))
        
        if result['status'] == 'succeeded':
            logger.info(f"Payment processed successfully for order {payment_data['order_id']}")
            
            # Send success notification
            send_payment_notification.delay(
                user_id=payment_data['user_id'],
                order_id=payment_data['order_id'],
                status='success',
                amount=payment_data['amount'],
                currency=payment_data['currency']
            )
            
            return {
                'status': 'success',
                'payment_id': result['payment_id'],
                'order_id': payment_data['order_id'],
                'amount': payment_data['amount']
            }
        else:
            raise Exception(f"Payment failed: {result.get('error', 'Unknown error')}")
            
    except Exception as exc:
        logger.error(f"Payment processing failed: {str(exc)}")
        
        # Calculate exponential backoff delay
        retry_count = self.request.retries
        countdown = min(30 * (2 ** retry_count), 1800)  # Max 30 minutes
        
        if retry_count < self.max_retries:
            logger.info(f"Retrying payment in {countdown} seconds (attempt {retry_count + 1})")
            raise self.retry(countdown=countdown, exc=exc)
        else:
            # Send failure notification after max retries
            send_payment_notification.delay(
                user_id=payment_data['user_id'],
                order_id=payment_data['order_id'],
                status='failed',
                amount=payment_data['amount'],
                currency=payment_data['currency'],
                error=str(exc)
            )
            
            # Move to dead letter queue
            handle_failed_payment.delay(payment_data, str(exc))
            
            return {
                'status': 'failed',
                'order_id': payment_data['order_id'],
                'error': str(exc),
                'max_retries_exceeded': True
            }


@celery_app.task(bind=True, max_retries=3)
def reconcile_payments(self, start_date: str = None, end_date: str = None) -> Dict[str, Any]:
    """
    Reconcile payments with external payment providers
    Priority: NORMAL
    """
    try:
        payment_service = PaymentService()
        
        if not start_date:
            start_date = (datetime.now() - timedelta(hours=1)).isoformat()
        if not end_date:
            end_date = datetime.now().isoformat()
        
        logger.info(f"Starting payment reconciliation from {start_date} to {end_date}")
        
        # Get payments from database
        db_payments = asyncio.run(payment_service.get_payments_by_date_range(start_date, end_date))
        
        # Get payments from payment provider
        provider_payments = asyncio.run(payment_service.get_provider_payments(start_date, end_date))
        
        # Reconcile differences
        discrepancies = []
        for db_payment in db_payments:
            provider_payment = next(
                (p for p in provider_payments if p['id'] == db_payment['provider_id']), 
                None
            )
            
            if not provider_payment:
                discrepancies.append({
                    'type': 'missing_provider',
                    'payment_id': db_payment['id'],
                    'amount': db_payment['amount']
                })
            elif db_payment['status'] != provider_payment['status']:
                discrepancies.append({
                    'type': 'status_mismatch',
                    'payment_id': db_payment['id'],
                    'db_status': db_payment['status'],
                    'provider_status': provider_payment['status']
                })
        
        # Check for provider payments not in database
        for provider_payment in provider_payments:
            db_payment = next(
                (p for p in db_payments if p['provider_id'] == provider_payment['id']), 
                None
            )
            if not db_payment:
                discrepancies.append({
                    'type': 'missing_database',
                    'provider_id': provider_payment['id'],
                    'amount': provider_payment['amount']
                })
        
        if discrepancies:
            logger.warning(f"Found {len(discrepancies)} payment discrepancies")
            # Handle discrepancies
            for discrepancy in discrepancies:
                handle_payment_discrepancy.delay(discrepancy)
        
        logger.info(f"Payment reconciliation completed. Found {len(discrepancies)} discrepancies")
        
        return {
            'status': 'completed',
            'period': f"{start_date} to {end_date}",
            'total_payments': len(db_payments),
            'discrepancies': len(discrepancies)
        }
        
    except Exception as exc:
        logger.error(f"Payment reconciliation failed: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=300, exc=exc)  # Retry in 5 minutes
        raise


@celery_app.task(bind=True, max_retries=2)
def generate_invoices(self, invoice_batch: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate invoices in batch
    Priority: BATCH
    """
    try:
        payment_service = PaymentService()
        
        logger.info(f"Generating {len(invoice_batch)} invoices")
        
        results = []
        for invoice_data in invoice_batch:
            try:
                invoice = asyncio.run(payment_service.generate_invoice(
                    order_id=invoice_data['order_id'],
                    user_id=invoice_data['user_id'],
                    items=invoice_data['items'],
                    tax_rate=invoice_data.get('tax_rate', 0.23)  # Default VAT for Poland
                ))
                
                results.append({
                    'order_id': invoice_data['order_id'],
                    'invoice_id': invoice['id'],
                    'status': 'generated'
                })
                
                # Send invoice via email
                send_invoice_email.delay(
                    user_id=invoice_data['user_id'],
                    invoice_id=invoice['id'],
                    order_id=invoice_data['order_id']
                )
                
            except Exception as e:
                logger.error(f"Failed to generate invoice for order {invoice_data['order_id']}: {str(e)}")
                results.append({
                    'order_id': invoice_data['order_id'],
                    'status': 'failed',
                    'error': str(e)
                })
        
        successful = len([r for r in results if r['status'] == 'generated'])
        
        logger.info(f"Invoice generation completed: {successful}/{len(invoice_batch)} successful")
        
        return {
            'status': 'completed',
            'total': len(invoice_batch),
            'successful': successful,
            'failed': len(invoice_batch) - successful,
            'results': results
        }
        
    except Exception as exc:
        logger.error(f"Batch invoice generation failed: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=600, exc=exc)  # Retry in 10 minutes
        raise


@celery_app.task
def retry_failed_payments() -> Dict[str, Any]:
    """
    Retry payments that failed due to temporary issues
    Scheduled task
    """
    try:
        payment_service = PaymentService()
        
        # Get failed payments from last 24 hours
        failed_payments = asyncio.run(payment_service.get_failed_payments(hours=24))
        
        retried = 0
        for payment in failed_payments:
            # Check if payment can be retried (not permanently failed)
            if payment['retry_count'] < 3 and payment['failure_reason'] in ['network_error', 'temporary_decline']:
                process_payment.delay(payment)
                retried += 1
        
        logger.info(f"Scheduled retry for {retried} failed payments")
        
        return {
            'status': 'completed',
            'total_failed': len(failed_payments),
            'retried': retried
        }
        
    except Exception as exc:
        logger.error(f"Failed payment retry task failed: {str(exc)}")
        raise


@celery_app.task
def generate_daily_invoices() -> Dict[str, Any]:
    """
    Generate invoices for completed orders from previous day
    Scheduled task
    """
    try:
        payment_service = PaymentService()
        
        yesterday = datetime.now() - timedelta(days=1)
        completed_orders = asyncio.run(payment_service.get_completed_orders_for_date(yesterday))
        
        # Batch orders for invoice generation
        batch_size = 10
        total_batches = (len(completed_orders) + batch_size - 1) // batch_size
        
        for i in range(0, len(completed_orders), batch_size):
            batch = completed_orders[i:i + batch_size]
            generate_invoices.delay(batch)
        
        logger.info(f"Scheduled {total_batches} invoice generation batches for {len(completed_orders)} orders")
        
        return {
            'status': 'scheduled',
            'date': yesterday.date().isoformat(),
            'orders': len(completed_orders),
            'batches': total_batches
        }
        
    except Exception as exc:
        logger.error(f"Daily invoice generation scheduling failed: {str(exc)}")
        raise


@celery_app.task
def send_payment_notification(user_id: int, order_id: int, status: str, amount: float, 
                            currency: str, error: str = None) -> Dict[str, Any]:
    """
    Send payment status notification to user
    """
    try:
        notification_service = NotificationService()
        
        if status == 'success':
            message = f"Payment of {amount} {currency} for order #{order_id} was successful."
            notification_type = 'payment_success'
        else:
            message = f"Payment of {amount} {currency} for order #{order_id} failed."
            if error:
                message += f" Reason: {error}"
            notification_type = 'payment_failed'
        
        asyncio.run(notification_service.send_notification(
            user_id=user_id,
            notification_type=notification_type,
            message=message,
            metadata={
                'order_id': order_id,
                'amount': amount,
                'currency': currency,
                'error': error
            }
        ))
        
        return {'status': 'sent', 'user_id': user_id, 'order_id': order_id}
        
    except Exception as exc:
        logger.error(f"Failed to send payment notification: {str(exc)}")
        raise


@celery_app.task
def send_invoice_email(user_id: int, invoice_id: str, order_id: int) -> Dict[str, Any]:
    """
    Send invoice via email
    """
    try:
        from app.tasks.email_tasks import send_email_task
        
        # Get invoice data
        payment_service = PaymentService()
        invoice = asyncio.run(payment_service.get_invoice(invoice_id))
        user = asyncio.run(payment_service.get_user(user_id))
        
        # Prepare email data
        email_data = {
            'id': f"invoice_{invoice_id}",
            'to_email': user['email'],
            'to_name': user['name']
        }
        
        context = {
            'user_name': user['name'],
            'invoice_id': invoice_id,
            'order_id': order_id,
            'amount': invoice['amount'],
            'currency': invoice['currency'],
            'due_date': invoice['due_date']
        }
        
        # Send email
        send_email_task.delay(
            email_data=email_data,
            template_name='invoice',
            context=context,
            attachments=[{
                'filename': f'invoice_{invoice_id}.pdf',
                'content': invoice['pdf_content'],
                'type': 'application/pdf'
            }]
        )
        
        return {'status': 'sent', 'invoice_id': invoice_id}
        
    except Exception as exc:
        logger.error(f"Failed to send invoice email: {str(exc)}")
        raise


@celery_app.task
def handle_failed_payment(payment_data: Dict[str, Any], error: str) -> Dict[str, Any]:
    """
    Handle permanently failed payment
    """
    try:
        logger.error(f"Payment permanently failed for order {payment_data['order_id']}: {error}")
        
        # Update order status
        payment_service = PaymentService()
        asyncio.run(payment_service.mark_order_payment_failed(
            order_id=payment_data['order_id'],
            error=error
        ))
        
        # Send notification to admin
        notification_service = NotificationService()
        asyncio.run(notification_service.send_admin_notification(
            type='payment_failure',
            message=f"Payment failed permanently for order {payment_data['order_id']}",
            data=payment_data
        ))
        
        return {'status': 'handled', 'order_id': payment_data['order_id']}
        
    except Exception as exc:
        logger.error(f"Failed to handle failed payment: {str(exc)}")
        raise


@celery_app.task
def handle_payment_discrepancy(discrepancy: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle payment discrepancy found during reconciliation
    """
    try:
        logger.warning(f"Handling payment discrepancy: {discrepancy['type']}")
        
        payment_service = PaymentService()
        
        if discrepancy['type'] == 'status_mismatch':
            # Update database with provider status
            asyncio.run(payment_service.update_payment_status(
                payment_id=discrepancy['payment_id'],
                status=discrepancy['provider_status']
            ))
        elif discrepancy['type'] == 'missing_database':
            # Create missing payment record
            asyncio.run(payment_service.create_missing_payment_record(discrepancy))
        elif discrepancy['type'] == 'missing_provider':
            # Flag for manual review
            asyncio.run(payment_service.flag_for_manual_review(discrepancy))
        
        return {'status': 'handled', 'discrepancy_type': discrepancy['type']}
        
    except Exception as exc:
        logger.error(f"Failed to handle payment discrepancy: {str(exc)}")
        raise 