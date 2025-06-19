import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import {
  XMarkIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { stripeService, getStripe } from '../../services/stripeService';
import { stripeAppearance } from '../../config/stripe';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  totalAmount: number;
  currency: string;
  status: string;
  dueDate: string;
}

interface InvoicePaymentModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

interface PaymentFormProps {
  invoice: Invoice;
  clientSecret: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

// Payment form component that uses Stripe Elements
const PaymentForm: React.FC<PaymentFormProps> = ({
  invoice,
  clientSecret,
  onSuccess,
  onError
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
          payment_method_data: {
            billing_details: {
              email: invoice.clientEmail,
              name: invoice.clientName,
            },
          },
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        setErrorMessage(error.message || 'Payment failed');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast.success('Payment successful!');
        onSuccess();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Payment processing error:', error);
      setErrorMessage(message);
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Payment Information</h3>
        <div className="p-4 border rounded-lg bg-gray-50">
          <PaymentElement 
            options={{
              layout: 'tabs',
              paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
            }}
          />
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start"
        >
          <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-red-800">Payment Error</h4>
            <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
          </div>
        </motion.div>
      )}

      {/* Payment Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-gray-900">Payment Summary</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Invoice:</span>
            <span className="font-medium">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Amount:</span>
            <span className="font-medium">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: invoice.currency
              }).format(invoice.totalAmount)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Due Date:</span>
            <span className="font-medium">
              {new Date(invoice.dueDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors flex items-center justify-center space-x-2 ${
          isProcessing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        }`}
      >
        {isProcessing ? (
          <>
            <ArrowPathIcon className="w-5 h-5 animate-spin" />
            <span>Processing Payment...</span>
          </>
        ) : (
          <>
            <CreditCardIcon className="w-5 h-5" />
            <span>
              Pay {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: invoice.currency
              }).format(invoice.totalAmount)}
            </span>
          </>
        )}
      </button>
    </form>
  );
};

// Main modal component
const InvoicePaymentModal: React.FC<InvoicePaymentModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onPaymentSuccess
}) => {
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  // Create payment intent when modal opens
  useEffect(() => {
    if (isOpen && !clientSecret) {
      createPaymentIntent();
    }
  }, [isOpen]);

  const createPaymentIntent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await stripeService.createPaymentIntent({
        amount: invoice.totalAmount,
        currency: invoice.currency.toLowerCase(),
        invoiceId: invoice.id,
        metadata: {
          invoice_number: invoice.invoiceNumber,
          client_email: invoice.clientEmail,
        },
      }, user?.token);

      setClientSecret(result.client_secret);
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentStatus('success');
    setTimeout(() => {
      onPaymentSuccess();
      onClose();
      // Reset state for next use
      setClientSecret(null);
      setPaymentStatus('idle');
      setError(null);
    }, 2000);
  };

  const handlePaymentError = (errorMessage: string) => {
    setPaymentStatus('error');
    setError(errorMessage);
  };

  const handleClose = () => {
    if (paymentStatus !== 'processing') {
      onClose();
      // Reset state
      setClientSecret(null);
      setPaymentStatus('idle');
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-white rounded-xl shadow-xl w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Pay Invoice</h2>
              <p className="text-sm text-gray-600 mt-1">
                Invoice {invoice.invoiceNumber} • {invoice.clientName}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={paymentStatus === 'processing'}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {paymentStatus === 'success' ? (
              // Success state
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8"
              >
                <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Successful!</h3>
                <p className="text-gray-600">
                  Your payment has been processed successfully. You should receive a confirmation email shortly.
                </p>
              </motion.div>
            ) : isLoading ? (
              // Loading state
              <div className="text-center py-8">
                <ArrowPathIcon className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Initializing Payment</h3>
                <p className="text-gray-600">Please wait while we set up your payment...</p>
              </div>
            ) : error && !clientSecret ? (
              // Error state
              <div className="text-center py-8">
                <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Setup Failed</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={createPaymentIntent}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Try Again
                </button>
              </div>
            ) : clientSecret ? (
              // Payment form
              <Elements 
                stripe={getStripe()} 
                options={{
                  clientSecret,
                  appearance: stripeAppearance,
                  locale: 'en',
                }}
              >
                <PaymentForm
                  invoice={invoice}
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </Elements>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InvoicePaymentModal; 