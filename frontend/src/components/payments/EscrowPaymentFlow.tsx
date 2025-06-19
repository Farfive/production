import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  CreditCard,
  Banknote,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Lock,
  Eye,
  FileText,
  ArrowRight,
  Info,
  X,
  Zap
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { formatCurrency, cn } from '../../lib/utils';

interface EscrowPaymentFlowProps {
  quoteId: number;
  totalAmount: number;
  manufacturerName: string;
  onPaymentComplete: (escrowId: number) => void;
  onCancel: () => void;
}

interface EscrowDetails {
  escrow_id: number;
  total_amount: number;
  platform_commission: number;
  manufacturer_payout: number;
  commission_rate: number;
  payment_deadline: string;
  milestones?: Array<{
    id: number;
    name: string;
    percentage: number;
    amount: number;
  }>;
}

const EscrowPaymentFlow: React.FC<EscrowPaymentFlowProps> = ({
  quoteId,
  totalAmount,
  manufacturerName,
  onPaymentComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<'overview' | 'payment' | 'confirmation'>('overview');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'credit_card' | 'paypal'>('bank_transfer');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showBypassWarning, setShowBypassWarning] = useState(false);

  // Fetch escrow details
  const { data: escrowDetails, isLoading } = useQuery<EscrowDetails>({
    queryKey: ['escrow-details', quoteId],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('firebaseToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/v1/escrow/details/${quoteId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch escrow details: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        escrow_id: data.escrow_id,
        total_amount: data.total_amount,
        platform_commission: data.platform_commission,
        manufacturer_payout: data.manufacturer_payout,
        commission_rate: data.commission_rate,
        payment_deadline: data.payment_deadline,
        milestones: data.milestones || [
          { id: 1, name: 'Project Start', percentage: 30, amount: totalAmount * 0.3 },
          { id: 2, name: 'Midpoint Review', percentage: 40, amount: totalAmount * 0.4 },
          { id: 3, name: 'Final Delivery', percentage: 30, amount: totalAmount * 0.3 }
        ]
      };
    },
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('firebaseToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/v1/escrow/process-payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote_id: quoteId,
          payment_method: paymentData.paymentMethod,
          payment_method_id: paymentData.paymentMethodId,
          accepted_terms: paymentData.acceptedTerms,
          escrow_id: escrowDetails?.escrow_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Payment processing failed' }));
        throw new Error(errorData.detail || 'Payment processing failed');
      }

      const data = await response.json();
      return {
        success: data.success || data.status === 'succeeded',
        escrow_id: data.escrow_id,
        payment_intent_id: data.payment_intent_id,
        status: data.status,
      };
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Payment initiated successfully!');
        setCurrentStep('confirmation');
        if (data.escrow_id) {
          onPaymentComplete(data.escrow_id);
        }
      } else {
        toast.error('Payment requires additional action');
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Payment failed. Please try again.';
      toast.error(errorMessage);
    }
  });

  const handlePayment = () => {
    if (!acceptedTerms) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    createPaymentMutation.mutate({
      escrow_id: escrowDetails?.escrow_id,
      payment_method: paymentMethod,
      amount: totalAmount
    });
  };

  // Show bypass warning when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBypassWarning(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Shield className="w-12 h-12 text-green-500 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Secure Escrow Payment
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Your payment is protected by our escrow system
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {['overview', 'payment', 'confirmation'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium',
              currentStep === step || (index < ['overview', 'payment', 'confirmation'].indexOf(currentStep))
                ? 'bg-primary-500 text-white'
                : 'bg-gray-200 text-gray-600'
            )}>
              {index + 1}
            </div>
            {index < 2 && (
              <div className={cn(
                'w-16 h-1 mx-2',
                index < ['overview', 'payment', 'confirmation'].indexOf(currentStep)
                  ? 'bg-primary-500'
                  : 'bg-gray-200'
              )} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {currentStep === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Payment Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Payment Overview
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Project Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Manufacturer:</span>
                      <span className="font-medium">{manufacturerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                      <span className="font-medium text-lg">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Payment Deadline:</span>
                      <span className="font-medium">
                        {escrowDetails && new Date(escrowDetails.payment_deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Fee Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Project Value:</span>
                      <span>{formatCurrency(escrowDetails?.manufacturer_payout || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Platform Fee (8%):</span>
                      <span>{formatCurrency(escrowDetails?.platform_commission || 0)}</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span>Total Payment:</span>
                        <span className="text-lg">{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Escrow Protection */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <div className="flex items-start">
                <Shield className="w-6 h-6 text-green-500 mr-3 mt-1" />
                <div>
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                    Your Payment is Protected
                  </h4>
                  <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                    <li>• Funds are held securely until project completion</li>
                    <li>• Manufacturer only receives payment after delivery</li>
                    <li>• Dispute resolution available if needed</li>
                    <li>• Full refund protection for non-delivery</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Milestone Payments */}
            {escrowDetails?.milestones && escrowDetails.milestones.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Milestone Payments
                </h4>
                <div className="space-y-3">
                  {escrowDetails.milestones.map((milestone, index) => (
                    <div key={milestone.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {milestone.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {milestone.percentage}% of total
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(milestone.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={() => setCurrentStep('payment')} leftIcon={<ArrowRight className="w-4 h-4" />}>
                Proceed to Payment
              </Button>
            </div>
          </motion.div>
        )}

        {currentStep === 'payment' && (
          <motion.div
            key="payment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Payment Method Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Select Payment Method
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'bank_transfer', name: 'Bank Transfer', icon: Banknote, description: 'Secure bank transfer' },
                  { id: 'credit_card', name: 'Credit Card', icon: CreditCard, description: 'Instant payment' },
                  { id: 'paypal', name: 'PayPal', icon: DollarSign, description: 'PayPal account' }
                ].map((method) => (
                  <div
                    key={method.id}
                    className={cn(
                      'border rounded-lg p-4 cursor-pointer transition-all',
                      paymentMethod === method.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    )}
                    onClick={() => setPaymentMethod(method.id as any)}
                  >
                    <div className="flex items-center mb-2">
                      <method.icon className="w-6 h-6 mr-3" />
                      <span className="font-medium">{method.name}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {method.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Payment Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Amount to Pay:</span>
                  <span className="font-medium text-lg">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
                  <span className="font-medium capitalize">{paymentMethod.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 mr-3"
                />
                <div className="text-sm">
                  <span className="text-gray-900 dark:text-white">
                    I agree to the{' '}
                    <a href="/terms" className="text-primary-600 hover:underline">
                      Terms and Conditions
                    </a>{' '}
                    and{' '}
                    <a href="/escrow-terms" className="text-primary-600 hover:underline">
                      Escrow Service Agreement
                    </a>
                  </span>
                  <div className="text-gray-600 dark:text-gray-400 mt-1">
                    By proceeding, you acknowledge that all payments must go through our secure escrow system.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('overview')}>
                Back
              </Button>
              <Button
                onClick={handlePayment}
                loading={createPaymentMutation.isPending}
                disabled={!acceptedTerms}
                leftIcon={<Lock className="w-4 h-4" />}
              >
                Secure Payment - {formatCurrency(totalAmount)}
              </Button>
            </div>
          </motion.div>
        )}

        {currentStep === 'confirmation' && (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center space-y-6"
          >
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-green-900 dark:text-green-100 mb-2">
                Payment Initiated Successfully!
              </h3>
              <p className="text-green-800 dark:text-green-200">
                Your funds are now secured in escrow. The manufacturer will be notified to begin work.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">What happens next?</h4>
              <div className="space-y-3 text-left">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Manufacturer Notified</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      The manufacturer will receive notification to begin work on your project.
                    </div>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Progress Tracking</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      You'll receive updates as milestones are completed.
                    </div>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                    3
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Secure Release</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Funds are released to the manufacturer only after successful delivery.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={() => window.location.href = '/dashboard/orders'} size="lg">
              View Order Status
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bypass Warning Modal */}
      <AnimatePresence>
        {showBypassWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-start">
                <AlertTriangle className="w-6 h-6 text-red-500 mr-3 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    ⚠️ Important Security Notice
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <p>
                      <strong>All payments must go through our secure escrow system.</strong>
                    </p>
                    <p>
                      If a manufacturer asks you to pay directly outside the platform:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Do not make direct payments</li>
                      <li>Report the incident immediately</li>
                      <li>You will lose buyer protection</li>
                      <li>Platform fees still apply</li>
                    </ul>
                  </div>
                  <div className="mt-4 flex items-center justify-end space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBypassWarning(false)}
                    >
                      I Understand
                    </Button>
                  </div>
                </div>
                <button
                  onClick={() => setShowBypassWarning(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EscrowPaymentFlow; 