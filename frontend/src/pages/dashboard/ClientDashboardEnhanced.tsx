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
  Sparkles,
  Activity,
  BarChart3,
  Users,
} from 'lucide-react';

import { dashboardApi, queryKeys } from '../../lib/api';
import { DashboardStats, Order, Quote } from '../../types';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency, formatDate, formatRelativeTime, getStatusColor } from '../../lib/utils';

const ClientDashboardEnhanced: React.FC = () => {
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header with gradient background */}
      <motion.div 
        variants={itemVariants}
        className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 rounded-3xl p-8 text-white overflow-hidden"
      >
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full animate-float"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold mb-2"
            >
              Welcome back! 👋
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-purple-100"
            >
              Here's what's happening with your manufacturing orders today.
            </motion.p>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="mt-4 sm:mt-0"
          >
            <Button
              as={Link}
              to="/orders/create"
              leftIcon={<Plus className="h-5 w-5" />}
              size="lg"
              className="bg-white text-purple-600 hover:bg-gray-100 shadow-xl"
            >
              Create New Order
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Cards with gradient borders */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                +12%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stats?.orders.total || 0}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
            <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <Activity className="h-3 w-3 mr-1" />
              {stats?.orders.active || 0} active
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-full">
                New
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stats?.quotes.total || 0}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Quotes Received</p>
            <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <Clock className="h-3 w-3 mr-1" />
              {stats?.quotes.pending || 0} pending
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <span className={`text-xs font-medium ${stats?.revenue.growth && stats.revenue.growth > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full`}>
                {stats?.revenue.growth ? (stats.revenue.growth > 0 ? '+' : '') + stats.revenue.growth.toFixed(1) + '%' : '0%'}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatCurrency(stats?.revenue.total || 0, stats?.revenue.currency || 'USD')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
            <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              vs last month
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full">
                Fast
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stats?.performance.responseTime || 0} days
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Lead Time</p>
            <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <CheckCircle className="h-3 w-3 mr-1" />
              Based on completed
            </div>
          </div>
        </motion.div>
      </div>

      {/* Activity Chart */}
      <motion.div
        variants={itemVariants}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
            Activity Overview
          </h3>
          <select className="text-sm border-gray-300 dark:border-gray-600 rounded-lg focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 3 months</option>
          </select>
        </div>
        {/* Placeholder for chart */}
        <div className="h-64 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Chart visualization coming soon</p>
        </div>
      </motion.div>

      {/* Recent Activity with enhanced cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Recent Orders
              </h3>
              <Button
                as={Link}
                to="/dashboard/orders"
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                View all
              </Button>
            </div>
          </div>
          <div className="p-6">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((order: Order, index: number) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {order.title}
                        </h4>
                        <div className="flex items-center mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status.replace('_', ' ')}
                          </span>
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(order.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {order.targetPrice ? formatCurrency(order.targetPrice, order.currency) : 'TBD'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {order.quotesCount} quotes
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">No orders yet</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Create your first order to get started
                </p>
                <Button
                  as={Link}
                  to="/dashboard/orders"
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
          variants={itemVariants}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Recent Quotes
              </h3>
              <Button
                as={Link}
                to="/dashboard/quotes"
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                View all
              </Button>
            </div>
          </div>
          <div className="p-6">
            {quotesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : recentQuotes && recentQuotes.length > 0 ? (
              <div className="space-y-3">
                {recentQuotes.slice(0, 5).map((quote: Quote, index: number) => (
                  <motion.div
                    key={quote.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {quote.manufacturer?.businessName || quote.manufacturer?.companyName || 'Unknown'}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(quote.createdAt)} • {quote.deliveryTime} days
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(quote.totalAmount, quote.currency)}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                          {quote.status}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">No quotes yet</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Quotes will appear here once manufacturers respond
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions with gradient cards */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              as={Link}
              to="/dashboard/orders"
              fullWidth
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg transition-all duration-300"
              leftIcon={<Plus className="h-5 w-5" />}
            >
              Create Order
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              as={Link}
              to="/dashboard/orders"
              fullWidth
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg transition-all duration-300"
              leftIcon={<Package className="h-5 w-5" />}
            >
              View Orders
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              as={Link}
              to="/dashboard/quotes"
              fullWidth
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg transition-all duration-300"
              leftIcon={<FileText className="h-5 w-5" />}
            >
              View Quotes
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              as={Link}
              to="/dashboard/payments"
              fullWidth
              className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:shadow-lg transition-all duration-300"
              leftIcon={<CreditCard className="h-5 w-5" />}
            >
              Payments
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ClientDashboardEnhanced; 