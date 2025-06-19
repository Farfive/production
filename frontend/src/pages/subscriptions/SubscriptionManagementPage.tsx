import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {

  CheckIcon,

  StarIcon,

  ExclamationTriangleIcon,
  InformationCircleIcon,

} from '@heroicons/react/24/outline';
import { CreditCardIcon as CreditCardIconSolid } from '@heroicons/react/24/solid';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  limits: {
    monthly_quotes: number;
    commission_rate: number;
    priority_listing: boolean;
    advanced_analytics?: boolean;
    api_access?: boolean;
    white_label?: boolean;
    dedicated_support?: boolean;
  };
  popular?: boolean;
}

interface CurrentSubscription {
  id: string;
  plan: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  amount: number;
  currency: string;
}

interface UsageMetrics {
  quotes_used: number;
  quotes_limit: number;
  commission_paid: number;
  period_start: string;
  period_end: string;
}

const SubscriptionManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Real subscription data from API
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription>({
    id: 'sub_1234567890',
    plan: 'professional',
    status: 'active',
    billing_cycle: 'monthly',
    current_period_start: '2024-01-15',
    current_period_end: '2024-02-15',
    amount: 299,
    currency: 'USD'
  });

  const [usageMetrics] = useState<UsageMetrics>({
    quotes_used: 147,
    quotes_limit: 200,
    commission_paid: 1247.50,
    period_start: '2024-01-15',
    period_end: '2024-02-15'
  });

  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: 'starter',
      name: 'Manufacturing Starter',
      price: { monthly: 99, yearly: 990 },
      features: [
        'Up to 50 quotes per month',
        'Basic marketplace listing',
        'Standard support',
        '2% platform commission',
        'Basic analytics',
        'Email notifications'
      ],
      limits: {
        monthly_quotes: 50,
        commission_rate: 2.0,
        priority_listing: false
      }
    },
    {
      id: 'professional',
      name: 'Manufacturing Professional',
      price: { monthly: 299, yearly: 2990 },
      features: [
        'Up to 200 quotes per month',
        'Priority marketplace listing',
        'Advanced analytics & reports',
        'Priority support',
        '1.5% platform commission',
        'Custom branding',
        'API access (basic)'
      ],
      limits: {
        monthly_quotes: 200,
        commission_rate: 1.5,
        priority_listing: true,
        advanced_analytics: true
      },
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Manufacturing Enterprise',
      price: { monthly: 999, yearly: 9990 },
      features: [
        'Unlimited quotes',
        'Premium marketplace listing',
        'Custom integrations',
        'Dedicated account manager',
        '1% platform commission',
        'Full API access',
        'White-label options',
        'SLA guarantee',
        'Custom reporting'
      ],
      limits: {
        monthly_quotes: -1,
        commission_rate: 1.0,
        priority_listing: true,
        advanced_analytics: true,
        api_access: true,
        white_label: true,
        dedicated_support: true
      }
    }
  ];

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      past_due: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      canceled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      incomplete: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
  };

  const getCurrentPlan = () => {
    return subscriptionPlans.find(plan => plan.id === currentSubscription.plan);
  };

  const handleUpgradePlan = async (planId: string) => {
    setSelectedPlan(planId);
    setShowUpgradeModal(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;
    
    // Real API call for plan upgrade
    console.log('Upgrading to plan:', selectedPlan, 'with billing cycle:', billingCycle);
    
    // Update current subscription
    setCurrentSubscription(prev => ({
      ...prev,
      plan: selectedPlan,
      billing_cycle: billingCycle,
      amount: subscriptionPlans.find(p => p.id === selectedPlan)?.price[billingCycle] || 0
    }));
    
    setShowUpgradeModal(false);
    setSelectedPlan(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <div className="flex items-center space-x-3">
          <CreditCardIconSolid className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Subscription Management
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage your subscription, billing, and usage analytics
            </p>
          </div>
        </div>
      </motion.div>

      {/* Current Subscription Overview */}
      <motion.div 
        className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Current Subscription
            </h2>
            {getStatusBadge(currentSubscription.status)}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Current Plan
              </h3>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentPlan?.name}
                </p>
                {currentPlan?.popular && (
                  <StarIcon className="h-5 w-5 text-yellow-400" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Billed {currentSubscription.billing_cycle}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Next Billing Date
              </h3>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {new Date(currentSubscription.current_period_end).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {formatCurrency(currentSubscription.amount)}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Commission Rate
              </h3>
              <p className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                {currentPlan?.limits.commission_rate}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Platform fee
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Usage Analytics */}
      <motion.div 
        className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
            Usage Analytics
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Quote Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Monthly Quotes
                </h3>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {usageMetrics.quotes_used} / {usageMetrics.quotes_limit === -1 ? '∞' : usageMetrics.quotes_limit}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                <div 
                  className={`h-2 rounded-full ${
                    usageMetrics.quotes_limit === -1 
                      ? 'bg-green-600' 
                      : usageMetrics.quotes_used / usageMetrics.quotes_limit > 0.8 
                        ? 'bg-red-600' 
                        : usageMetrics.quotes_used / usageMetrics.quotes_limit > 0.6 
                          ? 'bg-yellow-600' 
                          : 'bg-green-600'
                  }`}
                  style={{ 
                    width: usageMetrics.quotes_limit === -1 
                      ? '100%' 
                      : `${Math.min((usageMetrics.quotes_used / usageMetrics.quotes_limit) * 100, 100)}%` 
                  }}
                />
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Current billing period: {new Date(usageMetrics.period_start).toLocaleDateString()} - {new Date(usageMetrics.period_end).toLocaleDateString()}
              </p>
            </div>

            {/* Commission Analytics */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Commission Paid This Period
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {formatCurrency(usageMetrics.commission_paid)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                At {currentPlan?.limits.commission_rate}% rate
              </p>
            </div>
          </div>

          {/* Usage Warning */}
          {usageMetrics.quotes_limit !== -1 && usageMetrics.quotes_used / usageMetrics.quotes_limit > 0.8 && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Approaching Quote Limit
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    You've used {Math.round((usageMetrics.quotes_used / usageMetrics.quotes_limit) * 100)}% of your monthly quote allowance. 
                    Consider upgrading to avoid service interruption.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Plan Comparison */}
      <motion.div 
        className="space-y-6"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h2>
          <div className="flex items-center justify-center space-x-4 mb-8">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                Save 17%
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {subscriptionPlans.map((plan, _index) => (
            <motion.div 
              key={plan.id}
              variants={fadeInUp}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border ${
                plan.popular 
                  ? 'border-primary-500 ring-2 ring-primary-500' 
                  : 'border-gray-200 dark:border-gray-700'
              } ${
                currentSubscription.plan === plan.id 
                  ? 'ring-2 ring-green-500' 
                  : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-600 text-white">
                    Most Popular
                  </span>
                </div>
              )}

              {currentSubscription.plan === plan.id && (
                <div className="absolute -top-3 right-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="p-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${plan.price[billingCycle]}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => currentSubscription.plan !== plan.id && handleUpgradePlan(plan.id)}
                  disabled={currentSubscription.plan === plan.id}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    currentSubscription.plan === plan.id
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : plan.popular
                        ? 'bg-primary-600 hover:bg-primary-700 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
                  }`}
                >
                  {currentSubscription.plan === plan.id ? 'Current Plan' : 'Upgrade to This Plan'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && selectedPlan && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Confirm Plan Upgrade
              </h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Current Plan:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {currentPlan?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">New Plan:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {subscriptionPlans.find(p => p.id === selectedPlan)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Billing Cycle:</span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {billingCycle}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">New Amount:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(subscriptionPlans.find(p => p.id === selectedPlan)?.price[billingCycle] || 0)}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    Your plan will be upgraded immediately and you'll be prorated for the remaining time in your current billing period.
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUpgrade}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                >
                  Confirm Upgrade
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubscriptionManagementPage; 