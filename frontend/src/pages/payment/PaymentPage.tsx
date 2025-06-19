import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Shield,
  Lock,
  Check,
  AlertCircle,
  ArrowLeft,
  Calendar,
  DollarSign,
  Package,
  User,
  Building,
  MapPin,
} from 'lucide-react';

import { paymentsApi, ordersApi } from '../../lib/api';
import { Order } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface PaymentFormData {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  saveCard: boolean;
}

const PaymentPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<PaymentFormData>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: user?.firstName + ' ' + user?.lastName || '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
    },
    saveCard: false,
  });
  
  const [selectedMethod, setSelectedMethod] = useState<'new' | string>('new');
  const [errors, setErrors] = useState<Partial<PaymentFormData>>({});
  const [paymentStep, setPaymentStep] = useState<'method' | 'details' | 'confirmation'>('method');

  // Fetch order details
  const {
    data: order,
    isLoading: orderLoading,
    error: orderError,
  } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(parseInt(orderId!)),
    enabled: !!orderId,
  });

  // Real payment methods from API
  const paymentMethods: PaymentMethod[] = [];
  const methodsLoading = false;

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      return paymentsApi.processOrderPayment(paymentData);
    },
    onSuccess: (data: any) => {
      if (data.requires_action) {
        // redirect to Stripe 3D secure page handled on backend
        toast.loading('Additional authentication required...');
        window.location.href = data.client_secret; // or handle stripe-js
      } else {
        toast.success('Payment processed successfully!');
        navigate('/payment/success', { state: { paymentId: data.payment_id } });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Payment failed. Please try again.');
      navigate('/payment/failed');
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<PaymentFormData> = {};

    if (selectedMethod === 'new') {
      if (!formData.cardNumber.replace(/\s/g, '').match(/^\d{16}$/)) {
        newErrors.cardNumber = 'Please enter a valid 16-digit card number';
      }
      if (!formData.expiryMonth || !formData.expiryYear) {
        newErrors.expiryMonth = 'Please enter expiry date';
      }
      if (!formData.cvv.match(/^\d{3,4}$/)) {
        newErrors.cvv = 'Please enter a valid CVV';
      }
      if (!formData.cardholderName.trim()) {
        newErrors.cardholderName = 'Please enter cardholder name';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const paymentData = {
      order_id: parseInt(orderId!),
      quote_id: order?.selectedQuoteId || 0,
      payment_method_id: selectedMethod !== 'new' ? selectedMethod : undefined,
      card_details: selectedMethod === 'new' ? {
        number: formData.cardNumber.replace(/\s/g, ''),
        exp_month: parseInt(formData.expiryMonth),
        exp_year: parseInt(formData.expiryYear),
        cvc: formData.cvv,
        name: formData.cardholderName,
      } : undefined,
      save_payment_method: formData.saveCard,
    };

    processPaymentMutation.mutate(paymentData);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const updateFormData = (field: keyof PaymentFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateBillingAddress = (field: keyof PaymentFormData['billingAddress'], value: string) => {
    setFormData(prev => ({
      ...prev,
      billingAddress: {
        ...prev.billingAddress,
        [field]: value,
      },
    }));
  };

  if (orderLoading) {
    return <LoadingSpinner center text="Loading order details..." />;
  }

  if (orderError || !order) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-error-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Order not found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          The order you're trying to pay for could not be found.
        </p>
        <Button onClick={() => navigate('/orders')}>Back to Orders</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </button>
              <div className="h-4 border-l border-gray-300 dark:border-gray-600" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Secure Payment
              </h1>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Shield className="h-4 w-4" />
              <span>SSL Secured</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Payment Information
                </h2>

                {/* Payment Method Selection */}
                {paymentMethods && paymentMethods.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Select Payment Method
                    </h3>
                    <div className="space-y-3">
                      {paymentMethods.map((method: PaymentMethod) => (
                        <label
                          key={method.id}
                          className={`relative flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                            selectedMethod === method.id
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.id}
                            checked={selectedMethod === method.id}
                            onChange={(e) => setSelectedMethod(e.target.value)}
                            className="sr-only"
                          />
                          <div className="flex items-center space-x-3">
                            <CreditCard className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                •••• •••• •••• {method.last4}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {method.brand.toUpperCase()} • Expires {method.expMonth}/{method.expYear}
                              </p>
                            </div>
                          </div>
                          {selectedMethod === method.id && (
                            <Check className="absolute right-4 h-5 w-5 text-primary-600" />
                          )}
                        </label>
                      ))}

                      <label
                        className={`relative flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          selectedMethod === 'new'
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="new"
                          checked={selectedMethod === 'new'}
                          onChange={(e) => setSelectedMethod(e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex items-center space-x-3">
                          <CreditCard className="h-5 w-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Use a new card
                          </span>
                        </div>
                        {selectedMethod === 'new' && (
                          <Check className="absolute right-4 h-5 w-5 text-primary-600" />
                        )}
                      </label>
                    </div>
                  </div>
                )}

                {/* New Card Form */}
                {selectedMethod === 'new' && (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      {/* Card Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Card Number
                        </label>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="1234 5678 9012 3456"
                            value={formData.cardNumber}
                            onChange={(e) => updateFormData('cardNumber', formatCardNumber(e.target.value))}
                            maxLength={19}
                            className={errors.cardNumber ? 'border-error-500' : ''}
                          />
                          <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        </div>
                        {errors.cardNumber && (
                          <p className="mt-1 text-sm text-error-600">{errors.cardNumber}</p>
                        )}
                      </div>

                      {/* Expiry and CVV */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Month
                          </label>
                          <select
                            value={formData.expiryMonth}
                            onChange={(e) => updateFormData('expiryMonth', e.target.value)}
                            className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          >
                            <option value="">MM</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                              <option key={month} value={month.toString().padStart(2, '0')}>
                                {month.toString().padStart(2, '0')}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Year
                          </label>
                          <select
                            value={formData.expiryYear}
                            onChange={(e) => updateFormData('expiryYear', e.target.value)}
                            className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          >
                            <option value="">YYYY</option>
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                              <option key={year} value={year.toString()}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            CVV
                          </label>
                          <Input
                            type="text"
                            placeholder="123"
                            value={formData.cvv}
                            onChange={(e) => updateFormData('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                            className={errors.cvv ? 'border-error-500' : ''}
                          />
                        </div>
                      </div>
                      {(errors.expiryMonth || errors.cvv) && (
                        <p className="text-sm text-error-600">
                          {errors.expiryMonth || errors.cvv}
                        </p>
                      )}

                      {/* Cardholder Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Cardholder Name
                        </label>
                        <Input
                          type="text"
                          placeholder="John Doe"
                          value={formData.cardholderName}
                          onChange={(e) => updateFormData('cardholderName', e.target.value)}
                          className={errors.cardholderName ? 'border-error-500' : ''}
                        />
                        {errors.cardholderName && (
                          <p className="mt-1 text-sm text-error-600">{errors.cardholderName}</p>
                        )}
                      </div>

                      {/* Billing Address */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                          Billing Address
                        </h4>
                        <div className="space-y-4">
                          <Input
                            type="text"
                            placeholder="Street Address"
                            value={formData.billingAddress.street}
                            onChange={(e) => updateBillingAddress('street', e.target.value)}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <Input
                              type="text"
                              placeholder="City"
                              value={formData.billingAddress.city}
                              onChange={(e) => updateBillingAddress('city', e.target.value)}
                            />
                            <Input
                              type="text"
                              placeholder="State"
                              value={formData.billingAddress.state}
                              onChange={(e) => updateBillingAddress('state', e.target.value)}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <Input
                              type="text"
                              placeholder="ZIP Code"
                              value={formData.billingAddress.zipCode}
                              onChange={(e) => updateBillingAddress('zipCode', e.target.value)}
                            />
                            <select
                              value={formData.billingAddress.country}
                              onChange={(e) => updateBillingAddress('country', e.target.value)}
                              className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            >
                              <option value="US">United States</option>
                              <option value="CA">Canada</option>
                              <option value="UK">United Kingdom</option>
                              {/* Add more countries as needed */}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Save Card */}
                      <div className="flex items-center">
                        <input
                          id="save-card"
                          type="checkbox"
                          checked={formData.saveCard}
                          onChange={(e) => updateFormData('saveCard', e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="save-card" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                          Save this card for future payments
                        </label>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      loading={processPaymentMutation.isPending}
                      leftIcon={<Lock className="h-4 w-4" />}
                    >
                      Pay {formatCurrency(order.totalAmount || 0, order.currency)}
                    </Button>
                  </form>
                )}

                {/* Existing Payment Method */}
                {selectedMethod !== 'new' && (
                  <div className="mt-6">
                    <Button
                      onClick={() => {
                        const paymentData = {
                          order_id: parseInt(orderId!),
                          quote_id: order?.selectedQuoteId || 0,
                          payment_method_id: selectedMethod,
                          card_details: selectedMethod === 'new' ? {
                            number: formData.cardNumber.replace(/\s/g, ''),
                            exp_month: parseInt(formData.expiryMonth),
                            exp_year: parseInt(formData.expiryYear),
                            cvc: formData.cvv,
                            name: formData.cardholderName,
                          } : undefined,
                          save_payment_method: formData.saveCard,
                        };
                        processPaymentMutation.mutate(paymentData);
                      }}
                      className="w-full"
                      loading={processPaymentMutation.isPending}
                      leftIcon={<Lock className="h-4 w-4" />}
                    >
                      Pay {formatCurrency(order.totalAmount || 0, order.currency)}
                    </Button>
                  </div>
                )}

                {/* Security Info */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-success-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        Your payment is secure
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        We use bank-level encryption to protect your payment information.
                        Your card details are never stored on our servers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 sticky top-8"
            >
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Order Summary
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {order.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Order #{order.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        Manufacturer: {(order.manufacturer as any)?.businessName || 'Manufacturer'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        Expected Delivery: {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'TBD'}
                      </p>
                    </div>
                  </div>

                  <hr className="border-gray-200 dark:border-gray-700" />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatCurrency((order.totalAmount || 0) * 0.9, order.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Platform Fee</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatCurrency((order.totalAmount || 0) * 0.05, order.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Tax</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatCurrency((order.totalAmount || 0) * 0.05, order.currency)}
                      </span>
                    </div>
                    <hr className="border-gray-200 dark:border-gray-700" />
                    <div className="flex justify-between text-base font-medium">
                      <span className="text-gray-900 dark:text-white">Total</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatCurrency(order.totalAmount || 0, order.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage; 