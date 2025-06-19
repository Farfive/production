import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Plus,
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  Calendar,
  BarChart3,
  FileText,
  Activity,
  AlertCircle,
  CheckCircle,
  Award,
  Sparkles as SparklesIcon,
  Zap,
  Target,
  Factory,
  ArrowRight,
  Download,
  Settings,
  Wrench,
  Building2,
  Eye
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';
import { toast } from 'react-hot-toast';

import { 
  ordersApi, 
  quotesApi, 
  dashboardApi,
  manufacturersApi
} from '../../lib/api';
import { 
  Order, 
  OrderStatus, 
  QuoteStatus,
  CapabilityCategory,
  ProductionCapacity,
  ProductionQuoteAnalytics
} from '../../types';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency, cn, getStatusColor } from '../../lib/utils';
import SmartMatchingDashboard from '../../components/smart-matching/SmartMatchingDashboard';

// Recharts components
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Production capacity will be loaded from API - no static data

const ManufacturerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<string>('overview');
  const [showCapacityModal, setShowCapacityModal] = React.useState(false);
  const [capacityDraft, setCapacityDraft] = React.useState<ProductionCapacity | null>(null);

  const queryClient = useQueryClient();

  const updateCapacityMutation = useMutation({
    mutationFn: (data: typeof capacityDraft) => manufacturersApi.updateProductionCapacity(data),
    onSuccess: (_updated) => {
      toast.success('Capacity updated');
      queryClient.invalidateQueries({ queryKey: ['manufacturer-capacity'] });
      setShowCapacityModal(false);
    },
    onError: () => toast.error('Failed to update capacity')
  });

  // Fetch manufacturer stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['manufacturer-stats'],
    queryFn: () => dashboardApi.getManufacturerStats(),
    refetchInterval: 30000,
  });

  // Live orders (Step-9)
  const [orderSearch, setOrderSearch] = React.useState('');
  const { data: incomingOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['manufacturer-orders', orderSearch],
    queryFn: () => ordersApi.getOrders({ limit: 25, search: orderSearch }),
    refetchInterval: 15000,
  });

  const liveOrders = (incomingOrders?.data ?? []);

  // Capacity query
  const { data: capacityData, isLoading: capacityLoading } = useQuery({
    queryKey: ['manufacturer-capacity'],
    queryFn: () => manufacturersApi.getProductionCapacity(),
    staleTime: 5 * 60 * 1000,
  });

  // Use API capacity data only - no fallback
  const capacity = capacityData;

  // Display only real orders - no mock fallbacks
  const ordersToDisplay = liveOrders;

  // Fetch manufacturer quotes
  const { data: manufacturerQuotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ['manufacturer-quotes'],
    queryFn: () => quotesApi.getQuotes({ limit: 20 }).then(res => res.data),
    refetchInterval: 30000,
  });

  // Production quote analytics
  const { data: productionQuoteAnalytics } = useQuery({
    queryKey: ['production-quote-analytics'],
    queryFn: () => (dashboardApi as any).getProductionQuoteAnalytics?.() as Promise<ProductionQuoteAnalytics>,
    enabled: !!(dashboardApi as any).getProductionQuoteAnalytics,
    staleTime: 30000,
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

  const renderQuotesTab = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {quotesLoading ? (
        <div className="flex items-center justify-center h-48">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          {manufacturerQuotes.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400">
              No quotes yet – create one from an order.
            </div>
          )}
          {manufacturerQuotes.map((quote: any) => (
            <motion.div
              key={quote.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-1">
                    Quote #{quote.id}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Order: {quote.orderId}
                  </p>
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(quote.status))}>
                    {quote.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(quote.totalAmount)} {quote.currency}
                  </p>
                  <Button
                    as={Link}
                    size="sm"
                    variant="outline"
                    to={`/quotes/${quote.id}`}
                  >
                    View
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );

  const renderAnalyticsTab = () => {
    if (!productionQuoteAnalytics) {
      return (
        <div className="flex items-center justify-center h-48">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    const kpis = [
      { label: 'Total Quotes', value: productionQuoteAnalytics.totalProductionQuotes, color: 'blue' },
      { label: 'Active Quotes', value: productionQuoteAnalytics.activeProductionQuotes, color: 'green' },
      { label: 'Total Views', value: productionQuoteAnalytics.totalViews, color: 'purple' },
      { label: 'Inquiries', value: productionQuoteAnalytics.totalInquiries, color: 'orange' },
      { label: 'Conversions', value: productionQuoteAnalytics.totalConversions, color: 'emerald' },
      { label: 'Avg. Conversion %', value: `${productionQuoteAnalytics.averageConversionRate.toFixed(1)}%`, color: 'pink' },
    ];

    return (
      <div className="space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map(kpi => (
            <div key={kpi.label} className={`bg-${kpi.color}-50 dark:bg-${kpi.color}-900/20 p-4 rounded-lg border border-${kpi.color}-200 dark:border-${kpi.color}-800`}>
              <p className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Views Trend Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Views (Last 30 days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={productionQuoteAnalytics.viewsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // Production Calendar (Step-3)
  const renderCalendarTab = () => {
    // Build a very lightweight month calendar mapping incoming orders to their delivery dates
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Generate every day of the current month
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Map orders onto a dictionary keyed by yyyy-MM-dd
    const allOrders = (incomingOrders?.data ?? []) as any[]; // fallback for query pagination
    const ordersSource = allOrders;

    const eventsByDate: Record<string, typeof ordersSource> = {} as any;
    ordersSource.forEach((order) => {
      const isoKey = format(new Date(order.date), 'yyyy-MM-dd');
      if (!eventsByDate[isoKey]) eventsByDate[isoKey] = [] as any;
      eventsByDate[isoKey].push(order);
    });

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Production Schedule — {format(today, 'MMMM yyyy')}
        </h2>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded overflow-hidden text-xs font-medium">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="bg-white dark:bg-gray-800 p-2 text-center text-gray-700 dark:text-gray-300">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
          {daysInMonth.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const events = eventsByDate[key] || [];
            return (
              <div
                key={key}
                className="min-h-[90px] bg-white dark:bg-gray-800 p-2 text-xs border-t border-r border-gray-200 dark:border-gray-700"
              >
                <div
                  className={cn(
                    'mb-1 font-semibold',
                    isSameDay(day, today) && 'text-indigo-600'
                  )}
                >
                  {format(day, 'd')}
                </div>
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    title={evt.title}
                    className="truncate bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 rounded px-1 py-0.5 mb-0.5"
                  >
                    {evt.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (statsLoading || ordersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Factory className="w-10 h-10 text-white" />
            </motion.div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Loading Manufacturing Hub
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Preparing your production dashboard...
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
            We're having trouble loading your manufacturing dashboard.
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'quotes', label: 'Quotes', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'matching', label: 'Matches', icon: SparklesIcon },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
      >
        {/* Hero Header */}
        <motion.div 
          variants={itemVariants}
          className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white overflow-hidden shadow-2xl"
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
                <Factory className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl font-bold mb-2"
                >
                  Manufacturing Hub 🏭
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-blue-100"
                >
                  Manage orders, quotes, and production capacity
                </motion.p>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 sm:mt-0 flex items-center space-x-3"
            >
              <Button
                variant="outline"
                className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm"
                leftIcon={<Download className="w-4 h-4" />}
              >
                Export Data
              </Button>
              <Button
                as={Link}
                to="/quotes/create"
                className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create Quote
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-2 border border-gray-100 dark:border-gray-700">
          <nav className="flex space-x-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300',
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </motion.button>
              );
            })}
          </nav>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Revenue */}
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
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-3 h-3 bg-green-500 rounded-full"
                        />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {formatCurrency(stats?.monthlyRevenue || 125000)}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Monthly Revenue</p>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{stats?.revenueGrowth || 12.5}% from last month
                      </div>
                    </div>
                  </motion.div>

                  {/* Active Orders */}
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
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                          Active
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {Array.isArray(incomingOrders) ? incomingOrders.length : (incomingOrders?.data?.length || 24)}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Active Orders</p>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Activity className="h-3 w-3 mr-1" />
                        In production pipeline
                      </div>
                    </div>
                  </motion.div>

                  {/* Success Rate */}
                  <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                          <Award className="h-6 w-6 text-white" />
                        </div>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                          <Target className="h-4 w-4 text-purple-500" />
                        </motion.div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {stats?.successRate || 94.2}%
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Success Rate</p>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Quote acceptance rate
                      </div>
                    </div>
                  </motion.div>

                  {/* Capacity Utilization */}
                  <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
                          <Wrench className="h-6 w-6 text-white" />
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          capacity.totalUtilization > 90 ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20' :
                          capacity.totalUtilization > 70 ? 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20' :
                          'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
                        }`}>
                          {capacity.totalUtilization > 90 ? 'High' : capacity.totalUtilization > 70 ? 'Medium' : 'Low'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {capacity.totalUtilization}%
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Capacity Used</p>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3 mr-1" />
                        Production capacity
                      </div>
                    </div>
                  </motion.div>
                </div>

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
                          onClick={() => setActiveTab('orders')}
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
                      <div className="space-y-4">
                        {ordersLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading orders...</span>
                          </div>
                        ) : ordersToDisplay.length === 0 ? (
                          <div className="text-center py-8">
                            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Orders Yet</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                              Start by creating production quotes to attract clients
                            </p>
                            <Button
                              onClick={() => setActiveTab('quotes')}
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                              leftIcon={<Plus className="h-4 w-4" />}
                            >
                              Create Production Quote
                            </Button>
                          </div>
                        ) : (
                          ordersToDisplay.map((order: any) => (
                          <motion.div
                            key={order.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: order.id * 0.1 }}
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
                                    {order.client} • {format(new Date(order.date), 'MMM dd')}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <span className={cn(
                                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                                getStatusColor(order.status as OrderStatus)
                              )}>
                                {order.status.replace('_', ' ')}
                              </span>
                            </div>
                          </motion.div>
                        ))
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Production Capacity */}
                  <motion.div
                    variants={itemVariants}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700"
                  >
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white flex items-center">
                          <Wrench className="h-5 w-5 mr-2" />
                          Production Capacity
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20 border-white/30"
                          leftIcon={<Settings className="h-4 w-4" />}
                          onClick={() => {
                            setCapacityDraft(capacity);
                            setShowCapacityModal(true);
                          }}
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="space-y-6">
                        {capacity.capabilities.map((category: any, idx: number) => (
                          <motion.div
                            key={category.category}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {category.category.replace('_', ' ')}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {category.currentUtilization}% / {category.maxCapacity}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                              <motion.div
                                className={cn(
                                  'h-3 rounded-full transition-all duration-500',
                                  category.currentUtilization > 90 ? 'bg-gradient-to-r from-red-500 to-pink-500' :
                                  category.currentUtilization > 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                  'bg-gradient-to-r from-green-500 to-emerald-500'
                                )}
                                initial={{ width: 0 }}
                                animate={{ width: `${category.currentUtilization}%` }}
                                transition={{ duration: 1, delay: idx * 0.2 }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>{100 - category.currentUtilization}% available</span>
                              <span>{category.averageLeadTime}d lead time</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
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
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Manufacturing Tools</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Everything you need to manage your manufacturing operations
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        as={Link}
                        to="/quotes/create"
                        fullWidth
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg transition-all duration-300 h-14"
                        leftIcon={<Plus className="h-5 w-5" />}
                      >
                        Create Quote
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => setActiveTab('orders')}
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
                        to="/dashboard/production"
                        fullWidth
                        className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg transition-all duration-300 h-14"
                        leftIcon={<Wrench className="h-5 w-5" />}
                      >
                        Production
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => setActiveTab('analytics')}
                        fullWidth
                        className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:shadow-lg transition-all duration-300 h-14"
                        leftIcon={<BarChart3 className="h-5 w-5" />}
                      >
                        Analytics
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            )}
            
            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700"
              >
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <Package className="h-6 w-6 mr-2" />
                    Available Orders
                  </h2>
                  <p className="text-purple-100 text-sm">
                    Browse and quote on available manufacturing orders
                  </p>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    {ordersToDisplay.map((order: any) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-purple-300"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {order.title}
                              </h3>
                              <span className={cn(
                                'px-2 py-1 rounded-full text-xs font-medium',
                                getStatusColor(order.status as OrderStatus)
                              )}>
                                {order.status.replace('_', ' ')}
                              </span>
                            </div>
                            
                            <p className="text-gray-600 dark:text-gray-400 mb-3">
                              {order.description}
                            </p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Client:</span>
                                <span className="ml-2 font-medium">{order.client}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Quantity:</span>
                                <span className="ml-2 font-medium">{order.quantity}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Budget:</span>
                                <span className="ml-2 font-medium">{formatCurrency(order.budget)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Delivery:</span>
                                <span className="ml-2 font-medium">{format(new Date(order.date), 'MMM dd, yyyy')}</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {order.categories.map((category: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded text-xs"
                                >
                                  {category}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Eye className="w-4 h-4" />}
                            >
                              View Details
                            </Button>
                                                         {order.status === 'pending' && (
                               <Button
                                 as={Link}
                                 to="/quotes/create"
                                 size="sm"
                                 leftIcon={<Plus className="w-4 h-4" />}
                                 className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg"
                               >
                                 Create Quote
                               </Button>
                             )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="mt-6 text-center">
                    <Button
                      variant="outline"
                      leftIcon={<Package className="w-4 h-4" />}
                    >
                      View All Orders
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quotes Tab */}
            {activeTab === 'quotes' && renderQuotesTab()}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && renderAnalyticsTab()}

            {/* Calendar Tab */}
            {activeTab === 'calendar' && renderCalendarTab()}

            {/* Smart Matching Tab */}
            {activeTab === 'matching' && (
              <SmartMatchingDashboard userId="1" userRole="MANUFACTURER" />
            )}

            {/* Other tabs with placeholder content */}
            {activeTab !== 'overview' && activeTab !== 'orders' && activeTab !== 'quotes' && activeTab !== 'calendar' && activeTab !== 'matching' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700"
              >
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    {activeTab === 'quotes' && <FileText className="h-8 w-8 text-white" />}
                    {activeTab === 'analytics' && <BarChart3 className="h-8 w-8 text-white" />}
                    {activeTab === 'calendar' && <Calendar className="h-8 w-8 text-white" />}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {activeTab === 'quotes' && 'Quote Management'}
                    {activeTab === 'analytics' && 'Analytics Dashboard'}
                    {activeTab === 'calendar' && 'Production Calendar'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Advanced {activeTab} features coming soon
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Capacity Modal */}
      {showCapacityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Update Production Capacity</h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {capacityDraft.capabilities.map((cap, idx) => (
                <div key={cap.category} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {cap.category.replace('_', ' ')} Utilization (%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={cap.maxCapacity}
                    value={cap.currentUtilization}
                    onChange={(e) => {
                      const next = { ...capacityDraft } as any;
                      next.capabilities[idx].currentUtilization = Number(e.target.value);
                      setCapacityDraft(next);
                    }}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-600 dark:text-gray-400">{cap.currentUtilization}% / {cap.maxCapacity}%</div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="ghost" onClick={() => setShowCapacityModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => updateCapacityMutation.mutate(capacityDraft as any)}
                loading={updateCapacityMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManufacturerDashboard; 