import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Plus,
  Package,
  DollarSign,
  Clock,
  Star,
  TrendingUp,
  ArrowRight,
  Download,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Users,
  Award,
} from 'lucide-react';

import { dashboardApi, ordersApi, quotesApi } from '../../lib/api';
import { ManufacturerStats, Order, Quote } from '../../types';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency, formatRelativeTime, getStatusColor } from '../../lib/utils';

const ManufacturerDashboard: React.FC = () => {
  // Fetch manufacturer stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['dashboard', 'manufacturer-stats'],
    queryFn: () => dashboardApi.getManufacturerStats(),
  });

  // Recent orders - using orders API
  const {
    data: recentOrders,
    isLoading: ordersLoading,
  } = useQuery({
    queryKey: ['dashboard', 'manufacturer-orders'],
    queryFn: () => ordersApi.getOrders({ limit: 5 }),
  });

  // Recent quotes - using quotes API
  const {
    data: recentQuotes,
    isLoading: quotesLoading,
  } = useQuery({
    queryKey: ['dashboard', 'manufacturer-quotes'],
    queryFn: () => quotesApi.getQuotes({ limit: 5 }),
  });

  // Production capacity - mock data for now
  const capacity = {
    totalUtilization: 75.5,
    capabilities: [
      {
        category: 'CNC_MACHINING',
        currentUtilization: 75,
        availableCapacity: 25,
        averageLeadTime: 7,
      },
      {
        category: 'SHEET_METAL',
        currentUtilization: 60,
        availableCapacity: 40,
        averageLeadTime: 5,
      },
      {
        category: 'ASSEMBLY',
        currentUtilization: 90,
        availableCapacity: 10,
        averageLeadTime: 3,
      },
    ],
  };
  const capacityLoading = false;

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
            Manufacturer Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage your manufacturing operations and track business performance.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export Data
          </Button>
          <Button
            as={Link}
            to="/quotes/create"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Quote
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
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
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Active Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats?.activeOrders || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <span className={`font-medium ${stats?.ordersGrowth && stats.ordersGrowth > 0 ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}>
                {stats?.ordersGrowth ? (stats.ordersGrowth > 0 ? '+' : '') + stats.ordersGrowth.toFixed(1) + '%' : '0%'}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">from last month</span>
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
                <DollarSign className="h-6 w-6 text-success-600 dark:text-success-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Monthly Revenue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatCurrency(stats?.monthlyRevenue || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <span className={`font-medium ${stats?.revenueGrowth && stats.revenueGrowth > 0 ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}>
                {stats?.revenueGrowth ? (stats.revenueGrowth > 0 ? '+' : '') + stats.revenueGrowth.toFixed(1) + '%' : '0%'}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">from last month</span>
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
                <Clock className="h-6 w-6 text-warning-600 dark:text-warning-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Avg Response Time
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats?.avgResponseTime ? `${stats.avgResponseTime.toFixed(1)}h` : 'N/A'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <span className={`font-medium ${stats?.responseTimeImprovement && stats.responseTimeImprovement > 0 ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}>
                {stats?.responseTimeImprovement ? (stats.responseTimeImprovement > 0 ? '-' : '+') + Math.abs(stats.responseTimeImprovement).toFixed(1) + 'min' : '0min'}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">improved</span>
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
                <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Customer Rating
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats?.averageRating ? `${stats.averageRating.toFixed(1)}/5` : 'N/A'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Based on {stats?.totalReviews || 0} reviews
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Revenue Trend</h3>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="h-64 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-primary-500 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Revenue chart will be implemented with Chart.js
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Orders</h3>
              <Link
                to="/orders"
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
              >
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="space-y-4">
              {ordersLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : recentOrders?.data && recentOrders.data.length > 0 ? (
                recentOrders.data.slice(0, 4).map((order: Order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Order #{order.id}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {order.title.length > 30 ? order.title.substring(0, 30) + '...' : order.title}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(order.totalAmount || 0, order.currency)}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recent orders</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Production Capacity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Production Capacity</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Overall:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {capacity?.totalUtilization ? `${capacity.totalUtilization.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {capacityLoading ? (
              <div className="col-span-3 flex justify-center py-8">
                <LoadingSpinner size="sm" />
              </div>
            ) : capacity?.capabilities?.length > 0 ? (
              capacity.capabilities.slice(0, 3).map((capability: any) => (
                <div key={capability.category} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {capability.category.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </h4>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {capability.currentUtilization.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        capability.currentUtilization > 90 
                          ? 'bg-error-500' 
                          : capability.currentUtilization > 75 
                          ? 'bg-warning-500' 
                          : 'bg-success-500'
                      }`}
                      style={{ width: `${capability.currentUtilization}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{capability.availableCapacity.toFixed(1)}% available</span>
                    <span>{capability.averageLeadTime}d lead time</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-8">
                <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No capacity data available</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-primary-500 to-blue-600 rounded-lg shadow-lg"
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                Ready to grow your business?
              </h3>
              <p className="text-primary-100">
                Create quotes faster, manage orders efficiently, and delight your customers.
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                as={Link}
                to="/quotes/create"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-primary-600"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Create Quote
              </Button>
              <Button
                as={Link}
                to="/orders"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-primary-600"
                leftIcon={<Package className="h-4 w-4" />}
              >
                View Orders
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ManufacturerDashboard; 