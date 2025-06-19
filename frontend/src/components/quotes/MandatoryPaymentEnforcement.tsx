import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  Clock,
  DollarSign,
  Lock,
  CreditCard,
  CheckCircle,
  X,
  ArrowRight,
  Zap,
  Eye,
  MessageSquare,
  Ban,
  Timer
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { formatCurrency, cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface MandatoryPaymentEnforcementProps {
  quoteId: number;
  onPaymentComplete?: () => void;
  onQuoteExpired?: () => void;
}

interface EscrowStatus {
  escrow_required: boolean;
  escrow_id?: number;
  escrow_status?: string;
  quote_status: string;
  payment_status: string;
  total_amount?: number;
  commission?: number;
  manufacturer_payout?: number;
  payment_deadline?: string;
  time_remaining_hours?: number;
  communication_blocked?: boolean;
  milestones?: number;
}

const MandatoryPaymentEnforcement: React.FC<MandatoryPaymentEnforcementProps> = ({
  quoteId,
  onPaymentComplete,
  onQuoteExpired
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBypassWarning, setShowBypassWarning] = useState(false);

  // Fetch escrow status
  const { data: escrowStatus, isLoading, refetch } = useQuery<EscrowStatus>({
    queryKey: ['escrow-status', quoteId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/mandatory-escrow/status/${quoteId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch escrow status');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!quoteId
  });

  // Enforce escrow mutation
  const enforceEscrowMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/mandatory-escrow/enforce/${quoteId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to enforce escrow');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Secure payment required - escrow created');
      refetch();
    },
    onError: () => {
      toast.error('Failed to create escrow payment');
    }
  });

  // Auto-enforce escrow when quote becomes active
  useEffect(() => {
    if (escrowStatus?.quote_status === 'ACTIVE' && !escrowStatus.escrow_required) {
      enforceEscrowMutation.mutate();
    }
  }, [escrowStatus?.quote_status]);

  // Show bypass warning periodically
  useEffect(() => {
    if (escrowStatus?.escrow_required && escrowStatus.payment_status === 'pending') {
      const timer = setInterval(() => {
        setShowBypassWarning(true);
      }, 120000); // Every 2 minutes

      return () => clearInterval(timer);
    }
  }, [escrowStatus]);

  // Handle payment completion
  const handlePaymentComplete = () => {
    refetch();
    onPaymentComplete?.();
    toast.success('Payment completed successfully!');
  };

  // Calculate urgency level
  const getUrgencyLevel = (hoursRemaining?: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (!hoursRemaining) return 'low';
    if (hoursRemaining <= 6) return 'critical';
    if (hoursRemaining <= 24) return 'high';
    if (hoursRemaining <= 72) return 'medium';
    return 'low';
  };

  const urgencyLevel = getUrgencyLevel(escrowStatus?.time_remaining_hours);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Quote not active or no escrow required
  if (!escrowStatus?.escrow_required) {
    return null;
  }

  // Payment completed
  if (escrowStatus.payment_status === 'completed') {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <div className="flex items-center">
          <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-green-900 dark:text-green-100">
              ✅ Payment Secured
            </h3>
            <p className="text-green-800 dark:text-green-200">
              Your payment of {formatCurrency(escrowStatus.total_amount || 0)} is secured in escrow. 
              Production can now begin!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Payment Enforcement Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'border rounded-lg p-6 transition-all',
          urgencyLevel === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
          urgencyLevel === 'high' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' :
          urgencyLevel === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
          'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center mr-4',
              urgencyLevel === 'critical' ? 'bg-red-100 text-red-600' :
              urgencyLevel === 'high' ? 'bg-orange-100 text-orange-600' :
              urgencyLevel === 'medium' ? 'bg-yellow-100 text-yellow-600' :
              'bg-blue-100 text-blue-600'
            )}>
              {urgencyLevel === 'critical' ? <AlertTriangle className="w-6 h-6" /> :
               urgencyLevel === 'high' ? <Timer className="w-6 h-6" /> :
               <Shield className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <h3 className={cn(
                'text-xl font-semibold mb-2',
                urgencyLevel === 'critical' ? 'text-red-900 dark:text-red-100' :
                urgencyLevel === 'high' ? 'text-orange-900 dark:text-orange-100' :
                urgencyLevel === 'medium' ? 'text-yellow-900 dark:text-yellow-100' :
                'text-blue-900 dark:text-blue-100'
              )}>
                🔒 Secure Payment Required
              </h3>
              <p className={cn(
                'mb-4',
                urgencyLevel === 'critical' ? 'text-red-800 dark:text-red-200' :
                urgencyLevel === 'high' ? 'text-orange-800 dark:text-orange-200' :
                urgencyLevel === 'medium' ? 'text-yellow-800 dark:text-yellow-200' :
                'text-blue-800 dark:text-blue-200'
              )}>
                Your quote has been accepted! To proceed with production, secure payment through our escrow system is required.
              </p>

              {/* Payment Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Amount</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(escrowStatus.total_amount || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Platform Fee (8%)</div>
                  <div className="text-lg font-medium">
                    {formatCurrency(escrowStatus.commission || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">To Manufacturer</div>
                  <div className="text-lg font-medium">
                    {formatCurrency(escrowStatus.manufacturer_payout || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Time Remaining</div>
                  <div className={cn(
                    'text-lg font-bold',
                    urgencyLevel === 'critical' ? 'text-red-600' :
                    urgencyLevel === 'high' ? 'text-orange-600' :
                    'text-blue-600'
                  )}>
                    {escrowStatus.time_remaining_hours || 0}h
                  </div>
                </div>
              </div>

              {/* Urgency Messages */}
              {urgencyLevel === 'critical' && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3 mb-4">
                  <div className="flex items-center text-red-800 dark:text-red-200">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <span className="font-medium">URGENT: Quote expires in less than 6 hours!</span>
                  </div>
                </div>
              )}

              {urgencyLevel === 'high' && (
                <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg p-3 mb-4">
                  <div className="flex items-center text-orange-800 dark:text-orange-200">
                    <Timer className="w-5 h-5 mr-2" />
                    <span className="font-medium">Payment deadline approaching - less than 24 hours remaining</span>
                  </div>
                </div>
              )}

              {/* Communication Block Notice */}
              {escrowStatus.communication_blocked && (
                <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-4">
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <Ban className="w-5 h-5 mr-2" />
                    <span>Direct communication is blocked until payment is secured</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Button */}
          <div className="ml-4">
            <Button
              size="lg"
              className={cn(
                'text-white font-semibold',
                urgencyLevel === 'critical' ? 'bg-red-600 hover:bg-red-700' :
                urgencyLevel === 'high' ? 'bg-orange-600 hover:bg-orange-700' :
                'bg-blue-600 hover:bg-blue-700'
              )}
              leftIcon={<Lock className="w-5 h-5" />}
              onClick={() => navigate(`/payment/escrow/${escrowStatus.escrow_id}`)}
            >
              Secure Payment
            </Button>
          </div>
        </div>

        {/* Protection Benefits */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            🛡️ Your Payment is Protected
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span>Funds held until delivery</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span>Dispute resolution available</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span>Full refund protection</span>
            </div>
          </div>
        </div>

        {/* Milestone Info */}
        {escrowStatus.milestones && escrowStatus.milestones > 0 && (
          <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <div className="flex items-center text-blue-800 dark:text-blue-200">
              <Clock className="w-4 h-4 mr-2" />
              <span className="text-sm">
                Payment will be released in {escrowStatus.milestones} milestones as work progresses
              </span>
            </div>
          </div>
        )}
      </motion.div>

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
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6"
            >
              <div className="flex items-start">
                <AlertTriangle className="w-8 h-8 text-red-500 mr-4 mt-1" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    🚨 IMPORTANT SECURITY NOTICE
                  </h3>
                  
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                        ⚠️ ALL PAYMENTS MUST GO THROUGH ESCROW
                      </h4>
                      <p className="text-sm text-red-800 dark:text-red-200">
                        Any manufacturer requesting direct payment outside our platform is violating our terms.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-medium">If a manufacturer asks for direct payment:</h5>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• ❌ Do NOT make direct bank transfers</li>
                        <li>• ❌ Do NOT pay via PayPal/Venmo directly</li>
                        <li>• ❌ Do NOT pay in cash or cryptocurrency</li>
                        <li>• ✅ Report the incident immediately</li>
                      </ul>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Remember:</strong> You lose ALL buyer protection if you pay outside our escrow system.
                        Platform fees still apply even for direct payments.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setShowBypassWarning(false)}
                    >
                      I Understand
                    </Button>
                    <Button
                      onClick={() => {
                        setShowBypassWarning(false);
                        navigate(`/payment/escrow/${escrowStatus.escrow_id}`);
                      }}
                      leftIcon={<Shield className="w-4 h-4" />}
                    >
                      Proceed to Secure Payment
                    </Button>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowBypassWarning(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowBypassWarning(true)}
            className="flex items-center hover:text-gray-800 dark:hover:text-gray-200"
          >
            <Eye className="w-4 h-4 mr-1" />
            Security Notice
          </button>
          <a
            href="/help/escrow"
            className="flex items-center hover:text-gray-800 dark:hover:text-gray-200"
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            How Escrow Works
          </a>
        </div>
        
        <div className="text-right">
          <div>Escrow ID: #{escrowStatus.escrow_id}</div>
          <div>Deadline: {escrowStatus.payment_deadline && new Date(escrowStatus.payment_deadline).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
};

export default MandatoryPaymentEnforcement; 