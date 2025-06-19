# Stripe Integration Security Guide

## 🔒 CRITICAL SECURITY NOTICE

**Your Stripe Secret Key**: `your_stripe_secret_key_here` (Replace with your actual key)

### ⚠️ IMMEDIATE ACTION REQUIRED
1. **Never share secret keys publicly** - Consider rotating this key in your Stripe dashboard
2. **Use environment variables** - Never hardcode keys in your source code
3. **Backend only** - Secret keys should only be used server-side

## 🛠️ Proper Integration Setup

### Backend Environment Configuration

Create a `.env` file in your backend directory:

```bash
# backend/.env (NEVER commit this file to git)
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Backend API Integration

```python
# backend/app/services/stripe_service.py
import stripe
import os
from typing import Dict, Any

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

class StripeService:
    @staticmethod
    def create_payment_intent(amount: int, currency: str = 'usd', metadata: Dict = None) -> Dict[str, Any]:
        """Create a payment intent for invoice payments"""
        try:
            payment_intent = stripe.PaymentIntent.create(
                amount=amount,  # Amount in cents
                currency=currency,
                metadata=metadata or {},
                automatic_payment_methods={
                    'enabled': True,
                },
            )
            return {
                'client_secret': payment_intent.client_secret,
                'payment_intent_id': payment_intent.id,
                'status': payment_intent.status
            }
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe payment intent creation failed: {str(e)}")

    @staticmethod
    def create_invoice(
        customer_email: str,
        line_items: list,
        metadata: Dict = None
    ) -> Dict[str, Any]:
        """Create a Stripe invoice"""
        try:
            # Create customer
            customer = stripe.Customer.create(
                email=customer_email,
                metadata=metadata or {}
            )
            
            # Create invoice
            invoice = stripe.Invoice.create(
                customer=customer.id,
                collection_method='send_invoice',
                days_until_due=30,
                metadata=metadata or {}
            )
            
            # Add line items
            for item in line_items:
                stripe.InvoiceItem.create(
                    customer=customer.id,
                    invoice=invoice.id,
                    amount=item['amount'],  # Amount in cents
                    currency=item.get('currency', 'usd'),
                    description=item['description']
                )
            
            # Finalize and send invoice
            invoice = stripe.Invoice.finalize_invoice(invoice.id)
            
            return {
                'invoice_id': invoice.id,
                'invoice_url': invoice.hosted_invoice_url,
                'pdf_url': invoice.invoice_pdf,
                'status': invoice.status
            }
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe invoice creation failed: {str(e)}")

    @staticmethod
    def handle_webhook(payload: str, signature: str) -> Dict[str, Any]:
        """Handle Stripe webhook events"""
        webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, webhook_secret
            )
            
            # Handle different event types
            if event['type'] == 'payment_intent.succeeded':
                payment_intent = event['data']['object']
                # Update your database with successful payment
                return {'status': 'payment_succeeded', 'payment_intent_id': payment_intent['id']}
                
            elif event['type'] == 'invoice.paid':
                invoice = event['data']['object']
                # Update your database with paid invoice
                return {'status': 'invoice_paid', 'invoice_id': invoice['id']}
                
            return {'status': 'unhandled_event', 'type': event['type']}
            
        except stripe.error.SignatureVerificationError:
            raise Exception("Invalid webhook signature")
```

### Backend API Endpoints

```python
# backend/app/api/v1/endpoints/payments.py
from fastapi import APIRouter, HTTPException, Header
from app.services.stripe_service import StripeService

router = APIRouter()

@router.post("/create-payment-intent")
async def create_payment_intent(
    amount: int,
    currency: str = "usd",
    invoice_id: str = None
):
    """Create a payment intent for invoice payment"""
    try:
        metadata = {"invoice_id": invoice_id} if invoice_id else {}
        result = StripeService.create_payment_intent(
            amount=amount,
            currency=currency,
            metadata=metadata
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/create-invoice")
async def create_stripe_invoice(
    customer_email: str,
    line_items: list,
    order_id: str = None
):
    """Create and send a Stripe invoice"""
    try:
        metadata = {"order_id": order_id} if order_id else {}
        result = StripeService.create_invoice(
            customer_email=customer_email,
            line_items=line_items,
            metadata=metadata
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(alias="stripe-signature")
):
    """Handle Stripe webhook events"""
    try:
        payload = await request.body()
        result = StripeService.handle_webhook(
            payload=payload.decode('utf-8'),
            signature=stripe_signature
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### Frontend Integration (Publishable Key Only)

```typescript
// frontend/src/config/stripe.ts
export const stripeConfig = {
  publishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'your_publishable_key_here',
};

// frontend/src/services/stripeService.ts
import { loadStripe } from '@stripe/stripe-js';
import { stripeConfig } from '../config/stripe';

const stripePromise = loadStripe(stripeConfig.publishableKey);

export const createPaymentIntent = async (amount: number, invoiceId: string) => {
  const response = await fetch('/api/payments/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      invoice_id: invoiceId,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Payment intent creation failed');
  }
  
  return response.json();
};

export const processPayment = async (clientSecret: string, paymentMethod: any) => {
  const stripe = await stripePromise;
  
  if (!stripe) {
    throw new Error('Stripe not loaded');
  }
  
  const result = await stripe.confirmPayment({
    clientSecret,
    confirmParams: {
      payment_method: paymentMethod,
    },
  });
  
  return result;
};
```

### Updated Frontend Invoice Component

```typescript
// frontend/src/components/invoices/PaymentModal.tsx
import React, { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createPaymentIntent, processPayment } from '../../services/stripeService';

const PaymentForm: React.FC<{ invoice: Invoice; onSuccess: () => void }> = ({ 
  invoice, 
  onSuccess 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    
    try {
      // Create payment intent
      const { client_secret } = await createPaymentIntent(
        invoice.totalAmount,
        invoice.id
      );
      
      // Process payment
      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          payment_method: {
            card: cardElement!,
            billing_details: {
              email: invoice.clientEmail,
            },
          },
        },
      });
      
      if (result.error) {
        console.error('Payment failed:', result.error);
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error('Payment processing error:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button 
        type="submit" 
        disabled={!stripe || processing}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
      >
        {processing ? 'Processing...' : `Pay $${invoice.totalAmount}`}
      </button>
    </form>
  );
};
```

## 🔒 Security Checklist

### ✅ Required Security Measures
- [ ] Move secret key to environment variables
- [ ] Add `.env` to `.gitignore`
- [ ] Use HTTPS in production
- [ ] Validate webhook signatures
- [ ] Implement proper error handling
- [ ] Set up proper CORS configuration
- [ ] Use rate limiting on payment endpoints

### 🚨 Never Do This
- ❌ Hardcode secret keys in source code
- ❌ Share secret keys in chat/email
- ❌ Use secret keys in frontend JavaScript
- ❌ Commit `.env` files to git
- ❌ Use test keys in production

## 📚 Next Steps

1. **Rotate your Stripe key** if you're concerned about security
2. **Set up environment variables** in your backend
3. **Get your publishable key** from Stripe dashboard
4. **Configure webhook endpoints** for real-time updates
5. **Test the integration** with small amounts

## 💡 Production Deployment

When moving to production:
- Replace test secret key with live secret key
- Replace test publishable key with live publishable key
- Set up production webhook endpoints
- Enable proper logging and monitoring

Your invoice system is now ready for full Stripe integration! 🚀 