import { loadStripe, Stripe, StripeElements, PaymentIntent, SetupIntent } from '@stripe/stripe-js';
import { ApiClient } from '../api-client';
import * as Sentry from '@sentry/react';

// Types for payment service
export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'wallet';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    funding: string;
  };
  bankAccount?: {
    bankName: string;
    last4: string;
    accountType: string;
  };
  wallet?: {
    type: 'apple_pay' | 'google_pay' | 'samsung_pay';
  };
  isDefault: boolean;
  createdAt: string;
}

export interface PaymentIntentRequest {
  amount: number; // in cents
  currency: string;
  orderId: string;
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
  applicationFeeAmount?: number; // for marketplace payments
  onBehalfOf?: string; // connected account ID
  transferData?: {
    destination: string;
    amount?: number;
  };
  automaticPaymentMethods?: {
    enabled: boolean;
    allowRedirects?: 'always' | 'never';
  };
}

export interface PaymentIntentResponse {
  id: string;
  clientSecret: string;
  status: string;
  amount: number;
  currency: string;
  nextAction?: any;
}

export interface RefundRequest {
  paymentIntentId: string;
  amount?: number; // partial refund amount in cents
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

export interface RefundResponse {
  id: string;
  amount: number;
  status: string;
  reason: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  intervalCount: number;
  trialPeriodDays?: number;
  features: string[];
}

export interface Subscription {
  id: string;
  status: string;
  customerId: string;
  planId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialStart?: string;
  trialEnd?: string;
  metadata?: Record<string, string>;
}

export interface Customer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentMethods: PaymentMethod[];
  defaultPaymentMethodId?: string;
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  amount: number;
  quantity: number;
  metadata?: Record<string, string>;
}

export interface Invoice {
  id: string;
  customerId: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  dueDate: string;
  items: InvoiceItem[];
  pdfUrl?: string;
  hostedInvoiceUrl?: string;
}

export interface PaymentAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  successfulPayments: number;
  failedPayments: number;
  refundedAmount: number;
  refundCount: number;
  chargebackCount: number;
  disputeCount: number;
  topPaymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
}

// Payment service class
export class PaymentService {
  private stripe: Stripe | null = null;
  private apiClient: ApiClient;
  private publishableKey: string;

  constructor(publishableKey: string, apiBaseUrl: string) {
    this.publishableKey = publishableKey;
    this.apiClient = new ApiClient({
      baseURL: apiBaseUrl,
      timeout: 30000,
      retryAttempts: 3,
      enableLogging: true,
    });
    
    this.initializeStripe();
  }

  private async initializeStripe(): Promise<void> {
    try {
      this.stripe = await loadStripe(this.publishableKey);
      if (!this.stripe) {
        throw new Error('Failed to initialize Stripe');
      }
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Create payment intent
   */
  public async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    try {
      const response = await this.apiClient.post('/payments/create-intent', request);
      return response;
    } catch (error) {
      this.handlePaymentError('create_payment_intent', error, request);
      throw error;
    }
  }

  /**
   * Confirm payment with Stripe Elements
   */
  public async confirmPayment(
    clientSecret: string,
    elements: StripeElements,
    returnUrl?: string
  ): Promise<{ paymentIntent?: PaymentIntent; error?: any }> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      let result;
      if (returnUrl) {
        result = await this.stripe.confirmPayment({
          elements,
          confirmParams: { return_url: returnUrl },
        });
      } else {
        result = await (this.stripe as any).confirmPayment({
          elements,
          redirect: 'never',
        });
      }

      if (result.error) {
        this.handlePaymentError('confirm_payment', result.error, { clientSecret });
      }

      return result;
    } catch (error) {
      this.handlePaymentError('confirm_payment', error, { clientSecret });
      throw error;
    }
  }

  /**
   * Confirm payment with payment method ID
   */
  public async confirmPaymentWithPaymentMethod(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<PaymentIntentResponse> {
    try {
      const response = await this.apiClient.post('/payments/confirm', {
        paymentIntentId,
        paymentMethodId,
      });
      return response;
    } catch (error) {
      this.handlePaymentError('confirm_payment_with_method', error, {
        paymentIntentId,
        paymentMethodId,
      });
      throw error;
    }
  }

  /**
   * Process refund
   */
  public async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      const response = await this.apiClient.post('/payments/refund', request);
      return response;
    } catch (error) {
      this.handlePaymentError('process_refund', error, request);
      throw error;
    }
  }

  /**
   * Get payment status
   */
  public async getPaymentStatus(paymentIntentId: string): Promise<PaymentIntentResponse> {
    try {
      const response = await this.apiClient.get(`/payments/${paymentIntentId}`);
      return response;
    } catch (error) {
      this.handlePaymentError('get_payment_status', error, { paymentIntentId });
      throw error;
    }
  }

  /**
   * Create customer
   */
  public async createCustomer(
    email: string,
    name?: string,
    phone?: string,
    address?: Customer['address']
  ): Promise<Customer> {
    try {
      const response = await this.apiClient.post('/customers', {
        email,
        name,
        phone,
        address,
      });
      return response;
    } catch (error) {
      this.handlePaymentError('create_customer', error, { email, name });
      throw error;
    }
  }

  /**
   * Get customer details
   */
  public async getCustomer(customerId: string): Promise<Customer> {
    try {
      const response = await this.apiClient.get(`/customers/${customerId}`);
      return response;
    } catch (error) {
      this.handlePaymentError('get_customer', error, { customerId });
      throw error;
    }
  }

  /**
   * Update customer
   */
  public async updateCustomer(
    customerId: string,
    updates: Partial<Omit<Customer, 'id' | 'paymentMethods' | 'createdAt'>>
  ): Promise<Customer> {
    try {
      const response = await this.apiClient.put(`/customers/${customerId}`, updates);
      return response;
    } catch (error) {
      this.handlePaymentError('update_customer', error, { customerId, updates });
      throw error;
    }
  }

  /**
   * Add payment method to customer
   */
  public async addPaymentMethod(
    customerId: string,
    paymentMethodId: string,
    setAsDefault: boolean = false
  ): Promise<PaymentMethod> {
    try {
      const response = await this.apiClient.post(`/customers/${customerId}/payment-methods`, {
        paymentMethodId,
        setAsDefault,
      });
      return response;
    } catch (error) {
      this.handlePaymentError('add_payment_method', error, {
        customerId,
        paymentMethodId,
        setAsDefault,
      });
      throw error;
    }
  }

  /**
   * Remove payment method
   */
  public async removePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await this.apiClient.delete(`/payment-methods/${paymentMethodId}`);
    } catch (error) {
      this.handlePaymentError('remove_payment_method', error, { paymentMethodId });
      throw error;
    }
  }

  /**
   * Set default payment method
   */
  public async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<void> {
    try {
      await this.apiClient.put(`/customers/${customerId}/default-payment-method`, {
        paymentMethodId,
      });
    } catch (error) {
      this.handlePaymentError('set_default_payment_method', error, {
        customerId,
        paymentMethodId,
      });
      throw error;
    }
  }

  /**
   * Create setup intent for saving payment method
   */
  public async createSetupIntent(customerId: string): Promise<{ clientSecret: string }> {
    try {
      const response = await this.apiClient.post('/setup-intents', { customerId });
      return response;
    } catch (error) {
      this.handlePaymentError('create_setup_intent', error, { customerId });
      throw error;
    }
  }

  /**
   * Confirm setup intent
   */
  public async confirmSetupIntent(
    clientSecret: string,
    elements: StripeElements
  ): Promise<{ setupIntent?: SetupIntent; error?: any }> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const result = await (this.stripe as any).confirmSetup({
        elements,
        redirect: 'never',
      });

      if (result.error) {
        this.handlePaymentError('confirm_setup_intent', result.error, { clientSecret });
      }

      return result;
    } catch (error) {
      this.handlePaymentError('confirm_setup_intent', error, { clientSecret });
      throw error;
    }
  }

  /**
   * Create subscription
   */
  public async createSubscription(
    customerId: string,
    planId: string,
    paymentMethodId?: string,
    trialDays?: number
  ): Promise<Subscription> {
    try {
      const response = await this.apiClient.post('/subscriptions', {
        customerId,
        planId,
        paymentMethodId,
        trialDays,
      });
      return response;
    } catch (error) {
      this.handlePaymentError('create_subscription', error, {
        customerId,
        planId,
        paymentMethodId,
      });
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  public async cancelSubscription(
    subscriptionId: string,
    cancelImmediately: boolean = false
  ): Promise<Subscription> {
    try {
      const response = await this.apiClient.delete(`/subscriptions/${subscriptionId}`, {
        data: { cancelImmediately },
      });
      return response;
    } catch (error) {
      this.handlePaymentError('cancel_subscription', error, {
        subscriptionId,
        cancelImmediately,
      });
      throw error;
    }
  }

  /**
   * Update subscription
   */
  public async updateSubscription(
    subscriptionId: string,
    updates: { planId?: string; quantity?: number }
  ): Promise<Subscription> {
    try {
      const response = await this.apiClient.put(`/subscriptions/${subscriptionId}`, updates);
      return response;
    } catch (error) {
      this.handlePaymentError('update_subscription', error, { subscriptionId, updates });
      throw error;
    }
  }

  /**
   * Get subscription plans
   */
  public async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const response = await this.apiClient.get('/subscription-plans');
      return response;
    } catch (error) {
      this.handlePaymentError('get_subscription_plans', error);
      throw error;
    }
  }

  /**
   * Create invoice
   */
  public async createInvoice(
    customerId: string,
    items: InvoiceItem[],
    dueDate?: string
  ): Promise<Invoice> {
    try {
      const response = await this.apiClient.post('/invoices', {
        customerId,
        items,
        dueDate,
      });
      return response;
    } catch (error) {
      this.handlePaymentError('create_invoice', error, { customerId, items });
      throw error;
    }
  }

  /**
   * Send invoice
   */
  public async sendInvoice(invoiceId: string): Promise<void> {
    try {
      await this.apiClient.post(`/invoices/${invoiceId}/send`);
    } catch (error) {
      this.handlePaymentError('send_invoice', error, { invoiceId });
      throw error;
    }
  }

  /**
   * Pay invoice
   */
  public async payInvoice(
    invoiceId: string,
    paymentMethodId?: string
  ): Promise<PaymentIntentResponse> {
    try {
      const response = await this.apiClient.post(`/invoices/${invoiceId}/pay`, {
        paymentMethodId,
      });
      return response;
    } catch (error) {
      this.handlePaymentError('pay_invoice', error, { invoiceId, paymentMethodId });
      throw error;
    }
  }

  /**
   * Get payment analytics
   */
  public async getPaymentAnalytics(
    startDate: string,
    endDate: string
  ): Promise<PaymentAnalytics> {
    try {
      const response = await this.apiClient.get('/payments/analytics', {
        params: { startDate, endDate },
      });
      return response;
    } catch (error) {
      this.handlePaymentError('get_payment_analytics', error, { startDate, endDate });
      throw error;
    }
  }

  /**
   * Handle webhook events
   */
  public async handleWebhook(payload: string, signature: string): Promise<void> {
    try {
      await this.apiClient.post('/webhooks/stripe', 
        { payload, signature },
        {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': signature,
          },
        }
      );
    } catch (error) {
      this.handlePaymentError('handle_webhook', error, { signature });
      throw error;
    }
  }

  /**
   * Calculate application fee for marketplace payments
   */
  public calculateApplicationFee(amount: number, feePercentage: number = 2.9): number {
    return Math.round(amount * (feePercentage / 100));
  }

  /**
   * Format amount for display
   */
  public formatAmount(amount: number, currency: string = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  /**
   * Validate card number
   */
  public validateCardNumber(cardNumber: string): boolean {
    // Remove spaces and non-digits
    const cleaned = cardNumber.replace(/\D/g, '');
    
    // Check length
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }

    // Luhn algorithm
    let sum = 0;
    let alternate = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let n = parseInt(cleaned.charAt(i), 10);
      
      if (alternate) {
        n *= 2;
        if (n > 9) {
          n = (n % 10) + 1;
        }
      }
      
      sum += n;
      alternate = !alternate;
    }
    
    return sum % 10 === 0;
  }

  // Private helper methods
  private handlePaymentError(operation: string, error: any, context: any = {}): void {
    console.error(`[PaymentService] ${operation} failed:`, error);

    Sentry.captureException(error, {
      tags: {
        service: 'payment',
        operation,
      },
      extra: {
        context,
        stripeError: error.type ? {
          type: error.type,
          code: error.code,
          declineCode: error.decline_code,
        } : undefined,
      },
    });
  }

  // Getter for Stripe instance
  public getStripe(): Stripe | null {
    return this.stripe;
  }
}

// Payment service instance
export const paymentService = new PaymentService(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '',
  process.env.REACT_APP_API_BASE_URL || '/api'
);

// Helper functions for common payment operations
export const paymentHelpers = {
  /**
   * Process order payment
   */
  processOrderPayment: async (
    orderId: string,
    amount: number,
    customerId: string,
    paymentMethodId?: string
  ): Promise<PaymentIntentResponse> => {
    const paymentIntent = await paymentService.createPaymentIntent({
      amount,
      currency: 'usd',
      orderId,
      customerId,
      paymentMethodId,
      description: `Payment for order ${orderId}`,
      metadata: {
        orderId,
        type: 'order_payment',
      },
    });

    if (paymentMethodId) {
      return paymentService.confirmPaymentWithPaymentMethod(
        paymentIntent.id,
        paymentMethodId
      );
    }

    return paymentIntent;
  },

  /**
   * Process marketplace payment with application fee
   */
  processMarketplacePayment: async (
    orderId: string,
    amount: number,
    manufacturerAccountId: string,
    applicationFeePercentage: number = 2.9
  ): Promise<PaymentIntentResponse> => {
    const applicationFeeAmount = paymentService.calculateApplicationFee(
      amount,
      applicationFeePercentage
    );

    return paymentService.createPaymentIntent({
      amount,
      currency: 'usd',
      orderId,
      description: `Marketplace payment for order ${orderId}`,
      applicationFeeAmount,
      transferData: {
        destination: manufacturerAccountId,
        amount: amount - applicationFeeAmount,
      },
      metadata: {
        orderId,
        type: 'marketplace_payment',
        manufacturerAccountId,
      },
    });
  },

  /**
   * Handle subscription payment
   */
  handleSubscriptionPayment: async (
    customerId: string,
    planId: string,
    paymentMethodId: string,
    trialDays?: number
  ): Promise<Subscription> => {
    return paymentService.createSubscription(
      customerId,
      planId,
      paymentMethodId,
      trialDays
    );
  },
}; 