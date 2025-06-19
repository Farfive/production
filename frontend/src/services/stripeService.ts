import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { stripeConfig } from '../config/stripe';

// Initialize Stripe
let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripeConfig.publishableKey);
  }
  return stripePromise;
};

export interface PaymentIntentData {
  amount: number;
  currency?: string;
  invoiceId?: string;
  orderId?: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export interface StripeInvoiceData {
  customerEmail: string;
  customerName: string;
  lineItems: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>;
  dueDate?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  paymentIntent?: any;
  error?: string;
}

// API Service for backend communication
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class StripeService {
  private async makeApiCall(endpoint: string, data: any, token?: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'API request failed');
    }

    return response.json();
  }

  // Create payment intent for invoice payment
  async createPaymentIntent(data: PaymentIntentData, token?: string) {
    try {
      return await this.makeApiCall('/api/payments/create-payment-intent', {
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency || stripeConfig.currency,
        invoice_id: data.invoiceId,
        order_id: data.orderId,
        customer_id: data.customerId,
        metadata: data.metadata || {},
      }, token);
    } catch (error) {
      console.error('Payment intent creation failed:', error);
      throw error;
    }
  }

  // Create Stripe invoice
  async createStripeInvoice(data: StripeInvoiceData, token?: string) {
    try {
      const lineItems = data.lineItems.map(item => ({
        description: item.description,
        amount: Math.round(item.amount * 100), // Convert to cents
        quantity: item.quantity || 1,
      }));

      return await this.makeApiCall('/api/payments/create-invoice', {
        customer_email: data.customerEmail,
        customer_name: data.customerName,
        line_items: lineItems,
        due_date: data.dueDate,
        metadata: data.metadata || {},
      }, token);
    } catch (error) {
      console.error('Stripe invoice creation failed:', error);
      throw error;
    }
  }

  // Process payment with Stripe Elements
  async processPayment(
    clientSecret: string,
    elements: StripeElements,
    billingDetails: {
      email: string;
      name?: string;
      phone?: string;
    }
  ): Promise<PaymentResult> {
    try {
      const stripe = await getStripe();
      
      if (!stripe) {
        throw new Error('Stripe not loaded');
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          payment_method: {
            billing_details: billingDetails,
          },
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        paymentIntent,
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Get payment intent status
  async getPaymentIntentStatus(paymentIntentId: string, token?: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/payment-intent/${paymentIntentId}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get payment status');
      }

      return response.json();
    } catch (error) {
      console.error('Payment status check failed:', error);
      throw error;
    }
  }

  // Refund payment
  async refundPayment(paymentIntentId: string, amount?: number, token?: string) {
    try {
      return await this.makeApiCall('/api/payments/refund', {
        payment_intent_id: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Partial refund if amount specified
      }, token);
    } catch (error) {
      console.error('Refund failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService();
export { getStripe };

// Utility functions
export const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const validateCardNumber = (cardNumber: string): boolean => {
  // Basic Luhn algorithm validation
  const sanitized = cardNumber.replace(/\s/g, '');
  if (!/^\d+$/.test(sanitized)) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

export default stripeService; 