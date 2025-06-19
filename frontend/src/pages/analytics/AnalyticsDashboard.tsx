import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  FireIcon,
  BoltIcon,
  StarIcon,
  EyeIcon,
  ArrowUpIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';
import { ChartBarIcon as ChartBarIconSolid } from '@heroicons/react/24/solid';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease';
  icon: React.ReactNode;
  color: string;
}

interface ChartData {
  label: string;
  value: number;
}

const AnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'users' | 'operations'>('overview');

  // Mock data - replace with real API calls
  const [analyticsData] = useState({
    overview: {
      totalRevenue: 247500,
      totalOrders: 1248,
      activeUsers: 892,
      conversionRate: 12.4,
      trends: { revenue: 8.2, orders: 12.1, users: 5.7, conversion: -2.3 }
    },
    revenueMetrics: {
      monthlyRecurring: 45000,
      averageOrderValue: 198.50,
      totalPayments: 89,
      pendingPayments: 12,
      chartData: [
        { label: 'Jan', value: 35000 },
        { label: 'Feb', value: 42000 },
        { label: 'Mar', value: 38000 },
        { label: 'Apr', value: 51000 },
        { label: 'May', value: 47000 },
        { label: 'Jun', value: 55000 }
      ]
    }
  });

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, [dateRange]);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const getMetricCards = (): MetricCard[] => {
    const { overview } = analyticsData;
    return [
      {
        title: 'Total Revenue',
        value: `$${overview.totalRevenue.toLocaleString()}`,
        change: overview.trends.revenue,
        changeType: overview.trends.revenue >= 0 ? 'increase' : 'decrease',
        icon: <CurrencyDollarIcon className="h-6 w-6" />,
        color: 'text-green-600'
      },
      {
        title: 'Total Orders',
        value: overview.totalOrders.toLocaleString(),
        change: overview.trends.orders,
        changeType: overview.trends.orders >= 0 ? 'increase' : 'decrease',
        icon: <ShoppingCartIcon className="h-6 w-6" />,
        color: 'text-blue-600'
      },
      {
        title: 'Active Users',
        value: overview.activeUsers.toLocaleString(),
        change: overview.trends.users,
        changeType: overview.trends.users >= 0 ? 'increase' : 'decrease',
        icon: <UsersIcon className="h-6 w-6" />,
        color: 'text-purple-600'
      },
      {
        title: 'Conversion Rate',
        value: `${overview.conversionRate}%`,
        change: overview.trends.conversion,
        changeType: overview.trends.conversion >= 0 ? 'increase' : 'decrease',
        icon: <ArrowTrendingUpIcon className="h-6 w-6" />,
        color: 'text-orange-600'
      }
    ];
  };

  const renderChart = (data: ChartData[], height: string = 'h-64') => (
    <div className={`${height} flex items-end justify-center space-x-2 p-4`}>
      {data.map((item, index) => (
        <div key={index} className="flex flex-col items-center flex-1">
          <div 
            className="bg-primary-600 rounded-t w-full transition-all duration-500 hover:bg-primary-700"
            style={{ 
              height: `${Math.max((item.value / Math.max(...data.map(d => d.value))) * 100, 5)}%` 
            }}
          />
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
            {item.label}
          </div>
          <div className="text-xs font-medium text-gray-900 dark:text-white">
            {item.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Floating Elements */}
      <motion.div 
        className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/30 rounded-3xl p-8 shadow-xl border border-white/20 dark:border-gray-700/30"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-4 right-8 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-2xl"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.div
            className="absolute bottom-4 left-8 w-24 h-24 bg-gradient-to-br from-pink-400/20 to-orange-600/20 rounded-full blur-xl"
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.1, rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ChartBarIconSolid className="h-8 w-8 text-white" />
              </div>
              <motion.div
                className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center"
                animate={{ 
                  scale: [1, 1.3, 1],
                  rotate: [0, 180, 360] 
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
              >
                <SparklesIcon className="w-3 h-3 text-white" />
              </motion.div>
            </motion.div>
            
            <div>
              <motion.h1 
                className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                Analytics Dashboard
              </motion.h1>
              <motion.p 
                className="mt-2 text-gray-600 dark:text-gray-300 flex items-center space-x-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <FireIcon className="w-4 h-4 text-orange-500" />
                <span>Real-time business intelligence & performance metrics</span>
              </motion.p>
              
              <motion.div 
                className="mt-3 flex items-center space-x-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="flex items-center space-x-1 text-sm text-green-600 dark:text-green-400">
                                      <ArrowTrendingUpIcon className="w-4 h-4" />
                  <span className="font-semibold">+12.5% this month</span>
                </div>
                <div className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400">
                  <EyeIcon className="w-4 h-4" />
                  <span>Live data</span>
                </div>
              </motion.div>
            </div>
          </div>

          <motion.div 
            className="mt-6 sm:mt-0 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <motion.select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileFocus={{ scale: 1.02 }}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </motion.select>
            
            <motion.button 
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Export Report
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div 
        className="border-b border-gray-200 dark:border-gray-700"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'revenue', label: 'Revenue', icon: CurrencyDollarIcon },
            { id: 'users', label: 'Users', icon: UsersIcon },
            { id: 'operations', label: 'Operations', icon: DocumentTextIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </motion.div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div 
          className="space-y-6"
          initial="initial"
          animate="animate"
        >
          {/* Enhanced Metric Cards with Glassmorphism */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {getMetricCards().map((metric, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                whileHover={{ 
                  scale: 1.05, 
                  y: -8,
                  transition: { duration: 0.2 }
                }}
                className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl overflow-hidden shadow-xl rounded-2xl border border-white/20 dark:border-gray-700/30 hover:shadow-2xl transition-all duration-300"
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${
                  index === 0 ? 'from-blue-500/10 to-cyan-500/10' :
                  index === 1 ? 'from-green-500/10 to-emerald-500/10' :
                  index === 2 ? 'from-purple-500/10 to-pink-500/10' :
                  'from-orange-500/10 to-red-500/10'
                } opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                {/* Floating Elements */}
                <motion.div
                  className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full opacity-60"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: index * 0.5
                  }}
                />
                
                <div className="relative z-10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <motion.div 
                      className={`p-3 rounded-xl ${metric.color} bg-white/10 dark:bg-gray-900/10 backdrop-blur-sm`}
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                    >
                      {metric.icon}
                    </motion.div>
                    
                    <motion.div
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        metric.changeType === 'increase' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                      }`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                    >
                      {metric.changeType === 'increase' ? (
                        <ArrowUpIcon className="w-3 h-3 inline mr-1" />
                      ) : (
                        <ArrowTrendingDownIcon className="w-3 h-3 inline mr-1" />
                      )}
                      {Math.abs(metric.change)}%
                    </motion.div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {metric.title}
                    </h3>
                    <motion.p 
                      className="text-3xl font-bold text-gray-900 dark:text-white"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ 
                        delay: index * 0.1 + 0.2,
                        type: "spring",
                        stiffness: 200
                      }}
                    >
                      {metric.value}
                    </motion.p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <BoltIcon className="w-3 h-3 mr-1" />
                      from last period
                    </p>
                  </div>
                </div>

                {/* Hover Effect Border */}
                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-transparent"
                  whileHover={{
                    borderColor: index === 0 ? '#3B82F6' :
                                index === 1 ? '#10B981' :
                                index === 2 ? '#8B5CF6' : '#F59E0B'
                  }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div 
              variants={fadeInUp}
              className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Revenue Trend
                </h3>
                {renderChart(analyticsData.revenueMetrics.chartData)}
              </div>
            </motion.div>

            <motion.div 
              variants={fadeInUp}
              className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Performance Metrics
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Quote Success Rate</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">87%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">4.2h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Customer Satisfaction</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">4.8/5</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Other tabs content would go here */}
      {activeTab === 'revenue' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Revenue Analytics
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Detailed revenue analytics and financial metrics will be displayed here.
          </p>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            User Analytics
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            User engagement, acquisition, and behavior analytics will be displayed here.
          </p>
        </div>
      )}

      {activeTab === 'operations' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Operational Analytics
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Manufacturing efficiency, quality metrics, and operational KPIs will be displayed here.
          </p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard; 