import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Plus,
  Package,
  FileText,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  ArrowRight,
  Building2,
} from 'lucide-react';

import { dashboardApi, queryKeys } from '../../lib/api';
import { DashboardStats, Order, Quote } from '../../types';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency, formatDate, formatRelativeTime, getStatusColor } from '../../lib/utils';

const ClientDashboard: React.FC = () => {
  // Fetch dashboard stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: queryKeys.dashboard.clientStats,
    queryFn: dashboardApi.getClientStats,
  });

  // Recent orders
  const {
    data: recentOrders,
    isLoading: ordersLoading,
  } = useQuery({
    queryKey: ['dashboard', 'recent-orders'],
    queryFn: () => dashboardApi.getClientStats().then(data => data.orders.recentOrders || []),
  });

  // Recent quotes
  const {
    data: recentQuotes,
    isLoading: quotesLoading,
  } = useQuery({
    queryKey: ['dashboard', 'recent-quotes'],
    queryFn: () => dashboardApi.getClientStats().then(data => data.quotes.recentQuotes || []),
  });

  if (statsLoading) {
    return <LoadingSpinner center text="Loading dashboard..." />;
  }

  if (statsError) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-error-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Failed to load dashboard
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Please try refreshing the page or contact support if the problem persists.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Welcome back! Here's what's happening with your orders.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button
            as={Link}
            to="/orders/create"
            leftIcon={<Plus className="h-4 w-4" />}
            size="lg"
          >
            Create New Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats?.orders.total || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <span className="text-success-600 dark:text-success-400 font-medium">
                {stats?.orders.active || 0} active
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">
                {stats?.orders.completed || 0} completed
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Quotes Received
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats?.quotes.total || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <span className="text-warning-600 dark:text-warning-400 font-medium">
                {stats?.quotes.pending || 0} pending
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">
                {((stats?.quotes.accepted || 0) / Math.max(stats?.quotes.total || 1, 1) * 100).toFixed(1)}% accepted
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-success-600 dark:text-success-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Spent
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatCurrency(stats?.revenue.total || 0, stats?.revenue.currency || 'USD')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <span className={`font-medium ${stats?.revenue.growth && stats.revenue.growth > 0 ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}>
                {stats?.revenue.growth ? (stats.revenue.growth > 0 ? '+' : '') + stats.revenue.growth.toFixed(1) + '%' : '0%'}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">
                vs last month
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Avg. Lead Time
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats?.performance.responseTime || 0} days
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Based on completed orders
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Recent Orders
              </h3>
              <Button
                as={Link}
                to="/orders"
                variant="ghost"
                size="sm"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                View all
              </Button>
            </div>
          </div>
          <div className="p-6">
            {ordersLoading ? (
              <LoadingSpinner text="Loading orders..." />
            ) : recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.slice(0, 5).map((order: Order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {order.title}
                        </h4>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatRelativeTime(order.createdAt)} • {order.quotesCount} quotes
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {order.targetPrice ? formatCurrency(order.targetPrice, order.currency) : 'TBD'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Qty: {order.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">No orders yet</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Create your first order to get started
                </p>
                <Button
                  as={Link}
                  to="/orders/create"
                  size="sm"
                  className="mt-4"
                >
                  Create Order
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Quotes */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Recent Quotes
              </h3>
              <Button
                as={Link}
                to="/quotes"
                variant="ghost"
                size="sm"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                View all
              </Button>
            </div>
          </div>
          <div className="p-6">
            {quotesLoading ? (
              <LoadingSpinner text="Loading quotes..." />
            ) : recentQuotes && recentQuotes.length > 0 ? (
              <div className="space-y-4">
                {recentQuotes.slice(0, 5).map((quote: Quote) => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            {quote.manufacturer?.businessName || quote.manufacturer?.companyName || 'Unknown'}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                                                         {formatRelativeTime(quote.createdAt)} • {quote.deliveryTime} days
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                 {formatCurrency(quote.totalAmount, quote.currency)}
                      </p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">No quotes yet</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Quotes will appear here once manufacturers respond to your orders
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            as={Link}
            to="/orders/create"
            variant="outline"
            fullWidth
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Order
          </Button>
          <Button
            as={Link}
            to="/orders"
            variant="outline"
            fullWidth
            leftIcon={<Package className="h-4 w-4" />}
          >
            View Orders
          </Button>
          <Button
            as={Link}
            to="/quotes"
            variant="outline"
            fullWidth
            leftIcon={<FileText className="h-4 w-4" />}
          >
            View Quotes
          </Button>
          <Button
            as={Link}
            to="/payments"
            variant="outline"
            fullWidth
            leftIcon={<CreditCard className="h-4 w-4" />}
          >
            Payment History
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ClientDashboard; 