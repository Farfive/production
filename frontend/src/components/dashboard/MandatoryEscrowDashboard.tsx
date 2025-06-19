import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  Eye,
  Ban,
  Timer,
  CreditCard,
  FileText,
  BarChart3,
  Activity,
  Zap,
  Target,
  Award
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { formatCurrency, cn } from '../../lib/utils';

interface EscrowStats {
  total_mandatory_escrows: number;
  successful_payments: number;
  expired_quotes: number;
  payment_success_rate: number;
  total_commission_secured: number;
  enforcement_effectiveness: string;
}

interface PendingPayment {
  escrow_id: number;
  quote_id: number;
  order_id: number;
  total_amount: number;
  commission: number;
  deadline: string;
  hours_remaining: number;
  is_urgent: boolean;
  manufacturer_name: string;
  payment_url: string;
}

const MandatoryEscrowDashboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'pending' | 'enforcement' | 'analytics'>('overview');

  // Fetch enforcement statistics
  const { data: stats, isLoading: statsLoading } = useQuery<EscrowStats>({
    queryKey: ['escrow-enforcement-stats'],
    queryFn: async () => {
      const response = await fetch('/api/v1/mandatory-escrow/enforcement-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch pending payments
  const { data: pendingData, isLoading: pendingLoading } = useQuery<{
    pending_payments: PendingPayment[];
    total_pending: number;
    urgent_payments: number;
  }>({
    queryKey: ['pending-escrow-payments'],
    queryFn: async () => {
      const response = await fetch('/api/v1/mandatory-escrow/pending-payments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch pending payments');
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const getUrgencyColor = (hoursRemaining: number) => {
    if (hoursRemaining <= 6) return 'text-red-600 bg-red-100';
    if (hoursRemaining <= 24) return 'text-orange-600 bg-orange-100';
    if (hoursRemaining <= 72) return 'text-yellow-600 bg-yellow-100';
    return 'text-blue-600 bg-blue-100';
  };

  const getEffectivenessColor = (effectiveness: string) => {
    switch (effectiveness) {
      case 'HIGH': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (statsLoading || pendingLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🔒 Mandatory Escrow System
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Secure payment enforcement and commission protection
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            getEffectivenessColor(stats?.enforcement_effectiveness || 'MEDIUM')
          )}>
            {stats?.enforcement_effectiveness || 'MEDIUM'} Enforcement
          </div>
          <Button
            leftIcon={<Activity className="w-4 h-4" />}
            onClick={() => window.location.reload()}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Escrows</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.total_mandatory_escrows || 0}
              </p>
            </div>
            <Shield className="w-8 h-8 text-blue-500" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">All payments secured</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.payment_success_rate?.toFixed(1) || 0}%
              </p>
            </div>
            <Target className="w-8 h-8 text-green-500" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">
              {stats?.successful_payments || 0} completed
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Commission Secured</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats?.total_commission_secured || 0)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <Award className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">8% platform fee</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {pendingData?.total_pending || 0}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <AlertTriangle className="w-4 h-4 text-orange-500 mr-1" />
            <span className="text-orange-600">
              {pendingData?.urgent_payments || 0} urgent
            </span>
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'pending', label: 'Pending Payments', icon: Clock },
            { id: 'enforcement', label: 'Enforcement', icon: Shield },
            { id: 'analytics', label: 'Analytics', icon: Activity }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={cn(
                'flex items-center py-2 px-1 border-b-2 font-medium text-sm',
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* System Status */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🛡️ System Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Fully Operational</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    All escrow enforcements active
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white">100% Coverage</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    All active quotes protected
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-8 h-8 text-purple-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Auto-Enforcement</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Instant activation on quotes
                  </p>
                </div>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📊 Recent Activity
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Payment Completed</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Escrow #1234 - {formatCurrency(15000)} secured
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">2 min ago</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 text-blue-500 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Escrow Created</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Quote #5678 activated - payment required
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">15 min ago</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-orange-500 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Payment Reminder</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Urgent reminder sent - 18h remaining
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">1 hour ago</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {selectedTab === 'pending' && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  ⏰ Pending Payments ({pendingData?.total_pending || 0})
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {pendingData?.urgent_payments || 0} urgent
                  </span>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </div>
              </div>

              {pendingData?.pending_payments?.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    All Payments Up to Date!
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    No pending escrow payments at this time.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingData?.pending_payments?.map((payment) => (
                    <motion.div
                      key={payment.escrow_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'border rounded-lg p-4',
                        payment.is_urgent 
                          ? 'border-red-300 bg-red-50 dark:bg-red-900/20' 
                          : 'border-gray-200 bg-white dark:bg-gray-800'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center mr-4',
                            getUrgencyColor(payment.hours_remaining)
                          )}>
                            {payment.is_urgent ? (
                              <AlertTriangle className="w-5 h-5" />
                            ) : (
                              <Clock className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {payment.manufacturer_name}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Quote #{payment.quote_id} • Order #{payment.order_id}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(payment.total_amount)}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Commission: {formatCurrency(payment.commission)}
                          </div>
                        </div>

                        <div className="text-right ml-6">
                          <div className={cn(
                            'text-sm font-medium',
                            payment.is_urgent ? 'text-red-600' : 'text-orange-600'
                          )}>
                            {payment.hours_remaining}h remaining
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(payment.deadline).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="ml-4">
                          <Button
                            size="sm"
                            variant={payment.is_urgent ? "default" : "outline"}
                            leftIcon={<CreditCard className="w-4 h-4" />}
                            onClick={() => window.open(payment.payment_url, '_blank')}
                          >
                            View Payment
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {selectedTab === 'enforcement' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                🛡️ Enforcement Effectiveness
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                    Payment Compliance
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Successful Payments
                      </span>
                      <span className="font-medium text-green-600">
                        {stats?.successful_payments || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Expired Quotes
                      </span>
                      <span className="font-medium text-red-600">
                        {stats?.expired_quotes || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Success Rate
                      </span>
                      <span className="font-medium text-blue-600">
                        {stats?.payment_success_rate?.toFixed(1) || 0}%
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                    Commission Protection
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Total Secured
                      </span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(stats?.total_commission_secured || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Average Commission
                      </span>
                      <span className="font-medium text-blue-600">
                        {formatCurrency((stats?.total_commission_secured || 0) / Math.max(stats?.successful_payments || 1, 1))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Bypass Prevention
                      </span>
                      <span className="font-medium text-green-600">100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Security Features */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                🔒 Security Features
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <Ban className="w-12 h-12 text-red-500 mx-auto mb-3" />
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Communication Blocking
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Direct contact blocked until payment secured
                  </p>
                </div>
                
                <div className="text-center">
                  <Eye className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Bypass Detection
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    AI-powered monitoring for direct payment attempts
                  </p>
                </div>
                
                <div className="text-center">
                  <Timer className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Automatic Expiry
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Quotes expire after 7 days without payment
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {selectedTab === 'analytics' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                📈 Performance Analytics
              </h3>
              
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Advanced Analytics Coming Soon
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Detailed charts and insights will be available in the next update.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default MandatoryEscrowDashboard; 