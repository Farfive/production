import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Plus,
  Package,
  FileText,
  CreditCard,
  Clock,
  AlertCircle,
  DollarSign,
  ArrowRight,
  Building2,
  TrendingUp,
  Activity,
  Sparkles,
  Zap,
  Target,
  Award,
  BarChart3,
  Users,
  CheckCircle,
  Calendar,
  Star,
  Rocket
} from 'lucide-react';

import { dashboardApi, queryKeys } from '../../lib/api';
import { Order, Quote } from '../../types';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency, formatRelativeTime, getStatusColor } from '../../lib/utils';

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

  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Loading Your Dashboard
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Preparing your manufacturing insights...
          </p>
        </motion.div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-900 dark:to-red-900">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Dashboard Unavailable
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We're having trouble loading your dashboard. Please try again.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-red-500 to-pink-500 text-white"
          >
            Retry
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
      >
        {/* Hero Header */}
        <motion.div 
          variants={itemVariants}
          className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-3xl p-8 text-white overflow-hidden shadow-2xl"
        >
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-20">
            <motion.div 
              className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full"
              animate={{ 
                y: [0, -20, 0],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 8, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />
            <motion.div 
              className="absolute -bottom-10 -left-10 w-32 h-32 bg-white rounded-full"
              animate={{ 
                y: [0, 20, 0],
                rotate: [360, 180, 0]
              }}
              transition={{ 
                duration: 6, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: 1
              }}
            />
            <motion.div 
              className="absolute top-1/2 left-1/2 w-24 h-24 bg-white rounded-full"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.1, 0.3]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: 2
              }}
            />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Rocket className="w-8 h-8 text-white" />
              </motion.div>
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
                  Your manufacturing command center is ready
                </motion.p>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 sm:mt-0"
            >
              <Button
                as={Link}
                to="/orders/create"
                size="lg"
                className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm shadow-lg"
                leftIcon={<Plus className="h-5 w-5" />}
              >
                Create New Order
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Orders */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-3 h-3 bg-blue-500 rounded-full"
                />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stats?.orders.total || 0}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Total Orders</p>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Activity className="h-3 w-3 mr-1" />
                {stats?.orders.active || 0} active
              </div>
            </div>
          </motion.div>

          {/* Quotes Received */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
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
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Quotes Received</p>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3 mr-1" />
                {stats?.quotes.pending || 0} pending
              </div>
            </div>
          </motion.div>

          {/* Total Spent */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
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
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Total Spent</p>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                vs last month
              </div>
            </div>
          </motion.div>

          {/* Average Lead Time */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Target className="h-4 w-4 text-orange-500" />
                </motion.div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stats?.performance.responseTime || 0} days
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Avg. Lead Time</p>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <CheckCircle className="h-3 w-3 mr-1" />
                Based on completed orders
              </div>
            </div>
          </motion.div>
        </div>

        {/* Production Quote Discovery */}
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="relative p-8 text-white">
            {/* Animated background elements */}
            <div className="absolute inset-0 opacity-20">
              <motion.div 
                className="absolute top-4 right-4 w-20 h-20 bg-white rounded-full"
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360]
                }}
                transition={{ 
                  duration: 6, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              />
              <motion.div 
                className="absolute bottom-4 left-4 w-16 h-16 bg-white rounded-full"
                animate={{ 
                  scale: [1.2, 1, 1.2],
                  rotate: [360, 180, 0]
                }}
                transition={{ 
                  duration: 8, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: 1
                }}
              />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4 mb-6 lg:mb-0">
                <motion.div
                  className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Zap className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">
                    🚀 Discover Production Quotes
                  </h3>
                  <p className="text-yellow-100 text-lg">
                    Find manufacturers with available capacity for your projects
                  </p>
                  <p className="text-yellow-200 text-sm mt-1">
                    Browse proactive quotes from verified manufacturers ready to take on new work
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  as={Link}
                  to="/dashboard/production-quotes"
                  size="lg"
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm shadow-lg"
                  leftIcon={<Sparkles className="h-5 w-5" />}
                >
                  Explore Quotes
                </Button>
                <Button
                  as={Link}
                  to="/orders/create"
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                  leftIcon={<Plus className="h-5 w-5" />}
                >
                  Create Order
                </Button>
              </div>
            </div>

            {/* Feature highlights */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="flex items-center space-x-3 text-yellow-100">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-sm">Instant availability</span>
              </div>
              <div className="flex items-center space-x-3 text-yellow-100">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Star className="w-4 h-4" />
                </div>
                <span className="text-sm">Verified manufacturers</span>
              </div>
              <div className="flex items-center space-x-3 text-yellow-100">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <span className="text-sm">Competitive pricing</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <motion.div
            variants={itemVariants}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700"
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
                  className="text-white hover:bg-white/20 border-white/30"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  View all
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="sm" />
                </div>
              ) : recentOrders && recentOrders.length > 0 ? (
                <div className="space-y-4">
                  {recentOrders.slice(0, 5).map((order: Order, index: number) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-xl hover:shadow-md transition-all duration-300 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {order.title}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatRelativeTime(order.createdAt)} • {order.quotesCount} quotes
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {order.targetPrice ? formatCurrency(order.targetPrice, order.currency) : 'TBD'}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No orders yet</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Create your first order to get started with manufacturing
                  </p>
                  <Button
                    as={Link}
                    to="/orders/create"
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                    leftIcon={<Plus className="h-4 w-4" />}
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
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700"
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
                  className="text-white hover:bg-white/20 border-white/30"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  View all
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              {quotesLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="sm" />
                </div>
              ) : recentQuotes && recentQuotes.length > 0 ? (
                <div className="space-y-4">
                  {recentQuotes.slice(0, 5).map((quote: Quote, index: number) => (
                    <motion.div
                      key={quote.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-xl hover:shadow-md transition-all duration-300 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                            <Building2 className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              {quote.manufacturer?.businessName || quote.manufacturer?.companyName || 'Unknown'}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatRelativeTime(quote.createdAt)} • {quote.deliveryTime} days
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(quote.totalAmount, quote.currency)}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                          {quote.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No quotes yet</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Create an order to start receiving quotes from manufacturers
                  </p>
                  <Button
                    as={Link}
                    to="/orders/create"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Create Order
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700"
        >
          <div className="text-center mb-8">
            <motion.div
              className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Zap className="w-8 h-8 text-white" />
            </motion.div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Quick Actions</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Everything you need to manage your manufacturing projects
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                as={Link}
                to="/orders/create"
                fullWidth
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg transition-all duration-300 h-14"
                leftIcon={<Plus className="h-5 w-5" />}
              >
                Create Order
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                as={Link}
                to="/dashboard/production-quotes"
                fullWidth
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:shadow-lg transition-all duration-300 h-14 relative overflow-hidden"
                leftIcon={<Zap className="h-5 w-5" />}
              >
                <span className="relative z-10">Discover Quotes</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 opacity-0"
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                as={Link}
                to="/dashboard/orders"
                fullWidth
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg transition-all duration-300 h-14"
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
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg transition-all duration-300 h-14"
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
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg transition-all duration-300 h-14"
                leftIcon={<CreditCard className="h-5 w-5" />}
              >
                Payments
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ClientDashboard; 