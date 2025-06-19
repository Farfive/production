import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Package,
  DollarSign,
  TrendingUp,
  Clock,

  Calendar,
  BarChart3,

  Search,
  Plus,

  Trash2,
  Send,
  Calculator,
  FileText,

  Eye,
  MessageSquare,
  Star,

  Activity,
  Zap,
  Settings,
  Edit,
  MoreHorizontal,
  Filter,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { 
  manufacturersApi, 
  ordersApi, 
  quotesApi, 
  dashboardApi 
} from '../../lib/api';
import { productionQuotesApi, productionQuoteHelpers } from '../../lib/api/productionQuotes';
import { 
  Order, 
  OrderStatus, 
  QuoteStatus,
  ProductionQuote,
  ProductionQuoteType,
  ProductionQuoteCreate,
  ProductionQuoteAnalytics
} from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import LoadingSpinner from '../ui/LoadingSpinner';
import { formatCurrency, cn, getStatusColor } from '../../lib/utils';
import EmptyState from '../ui/EmptyState';


interface ManufacturerDashboardProps {
  className?: string;
}

const ManufacturerDashboard: React.FC<ManufacturerDashboardProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'quotes' | 'production-quotes' | 'analytics' | 'calendar'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [showProductionQuoteBuilder, setShowProductionQuoteBuilder] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedProductionQuote, setSelectedProductionQuote] = useState<ProductionQuote | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch manufacturer stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['manufacturer-stats', dateRange],
    queryFn: () => dashboardApi.getManufacturerStats(),
    refetchInterval: 30000,
  });

  // Fetch incoming orders
  const { data: ordersData, isLoading: ordersLoading, error: ordersError, refetch: refetchOrders } = useQuery({
    queryKey: ['manufacturer-orders', { search: searchTerm, status: statusFilter }],
    queryFn: async () => {
      try {
        const result = await ordersApi.getManufacturerOrders({ 
          search: searchTerm, 
          status: statusFilter === 'all' ? undefined : statusFilter 
        });
        
        return result;
      } catch (error) {
        console.error('Orders API failed:', error);
        throw error;
      }
    },
    refetchInterval: 30000,
    retry: true
  });

  // Fetch active quotes
  const { data: quotesData, isLoading: quotesLoading, error: quotesError, refetch: refetchQuotes } = useQuery({
    queryKey: ['manufacturer-quotes'],
    queryFn: async () => {
      try {
        return await quotesApi.getManufacturerQuotes();
      } catch (error) {
        console.error('Quotes API failed:', error);
        throw error;
      }
    },
    refetchInterval: 30000,
    retry: true
  });

  // Fetch production capacity
  const { data: capacity } = useQuery({
    queryKey: ['production-capacity'],
    queryFn: () => manufacturersApi.getProductionCapacity(),
  });

  // Fetch production quotes
  const { data: productionQuotes = [], isLoading: productionQuotesLoading } = useQuery({
    queryKey: ['production-quotes'],
    queryFn: () => productionQuotesApi.getMyQuotes(),
    refetchInterval: 30000,
  });

  // Fetch production quote analytics
  const { data: productionQuoteAnalytics } = useQuery({
    queryKey: ['production-quote-analytics'],
    queryFn: () => productionQuotesApi.getAnalytics(),
  });

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: quotesApi.createQuote,
    onSuccess: () => {
      toast.success('Quote created successfully!');
      queryClient.invalidateQueries({ queryKey: ['manufacturer-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturer-orders'] });
      setShowQuoteBuilder(false);
      setSelectedOrder(null);
    },
    onError: () => {
      toast.error('Failed to create quote');
    },
  });

  // Create production quote mutation
  const createProductionQuoteMutation = useMutation({
    mutationFn: productionQuotesApi.create,
    onSuccess: () => {
      toast.success('Production quote created successfully!');
      queryClient.invalidateQueries({ queryKey: ['production-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['production-quote-analytics'] });
      setShowProductionQuoteBuilder(false);
    },
    onError: () => {
      toast.error('Failed to create production quote');
    },
  });

  // Update production quote mutation
  const updateProductionQuoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => productionQuotesApi.update(id, data),
    onSuccess: () => {
      toast.success('Production quote updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['production-quotes'] });
    },
    onError: () => {
      toast.error('Failed to update production quote');
    },
  });

  // Delete production quote mutation
  const deleteProductionQuoteMutation = useMutation({
    mutationFn: productionQuotesApi.delete,
    onSuccess: () => {
      toast.success('Production quote deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['production-quotes'] });
    },
    onError: () => {
      toast.error('Failed to delete production quote');
    },
  });

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: ({ operation, orderIds }: { operation: string; orderIds: string[] }) =>
      ordersApi.bulkOperation(operation, orderIds),
    onSuccess: (data, variables) => {
      toast.success(`${variables.operation} completed for ${variables.orderIds.length} orders`);
      queryClient.invalidateQueries({ queryKey: ['manufacturer-orders'] });
      setSelectedOrders([]);
    },
    onError: () => {
      toast.error('Bulk operation failed');
    },
  });

  const filteredOrders = useMemo(() => {
    // Handle both array and paginated response formats
    const ordersArray = Array.isArray(ordersData) ? ordersData : (ordersData?.data || []);
    
    return ordersArray.filter((order: Order) => {
      const matchesSearch = order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.id.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.client?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [ordersData, searchTerm, statusFilter]);

  const handleOrderSelection = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleBulkOperation = (operation: string) => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders first');
      return;
    }
    
    bulkOperationMutation.mutate({ operation, orderIds: selectedOrders });
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Orders
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.activeOrders || 0}
              </p>
            </div>
            <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-full">
              <Package className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-success-500 mr-1" />
            <span className="text-sm text-success-600 dark:text-success-400">
              +{stats?.ordersGrowth || 0}% from last period
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Revenue This Month
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats?.monthlyRevenue || 0)}
              </p>
            </div>
            <div className="p-3 bg-success-100 dark:bg-success-900 rounded-full">
              <DollarSign className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-success-500 mr-1" />
            <span className="text-sm text-success-600 dark:text-success-400">
              +{stats?.revenueGrowth || 0}% from last month
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Response Time
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.avgResponseTime || 0}h
              </p>
            </div>
            <div className="p-3 bg-warning-100 dark:bg-warning-900 rounded-full">
              <Clock className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-success-500 mr-1" />
            <span className="text-sm text-success-600 dark:text-success-400">
              Improved by {stats?.responseTimeImprovement || 0}%
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Customer Rating
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.averageRating || 0}/5
              </p>
            </div>
            <div className="p-3 bg-warning-100 dark:bg-warning-900 rounded-full">
              <Star className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <Star className="w-4 h-4 text-warning-500 mr-1" />
            <span className="text-sm text-warning-600 dark:text-warning-400">
              From {stats?.totalReviews || 0} reviews
            </span>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Orders
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('orders')}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {filteredOrders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {order.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {order.client?.companyName} • {format(new Date(order.createdAt), 'MMM dd')}
                  </p>
                </div>
                <div className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  getStatusColor(order.status)
                )}>
                  {order.status.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Quotes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Active Quotes
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('quotes')}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {(quotesData ?? []).slice(0, 5).map((quote) => (
              <div
                key={quote.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Quote #{quote.id}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatCurrency(quote.totalAmount, quote.currency)} • {quote.deliveryTime} days
                  </p>
                </div>
                <div className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  quote.status === QuoteStatus.PENDING ? 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-300' :
                  quote.status === QuoteStatus.APPROVED ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                )}>
                  {quote.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Production Capacity */}
      {capacity && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Production Capacity
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {capacity.capabilities.map((capability) => (
              <div key={capability.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {capability.category.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {capability.currentUtilization}% / {capability.maxCapacity}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all duration-300',
                      capability.currentUtilization > 90 ? 'bg-error-500' :
                      capability.currentUtilization > 70 ? 'bg-warning-500' :
                      'bg-success-500'
                    )}
                    style={{ width: `${capability.currentUtilization}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderOrdersTab = () => (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search orders by title, ID, or client..."
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
          options={[
            { value: 'all', label: 'All Orders' },
            { value: OrderStatus.PENDING, label: 'Pending' },
            { value: OrderStatus.QUOTED, label: 'Quoted' },
            { value: OrderStatus.CONFIRMED, label: 'Confirmed' },
            { value: OrderStatus.IN_PRODUCTION, label: 'In Production' },
          ]}
        />
        
        {selectedOrders.length > 0 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkOperation('accept')}
              loading={bulkOperationMutation.isPending}
            >
              Accept Selected ({selectedOrders.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkOperation('reject')}
              loading={bulkOperationMutation.isPending}
            >
              Reject Selected
            </Button>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrders(filteredOrders.map(o => o.id));
                      } else {
                        setSelectedOrders([]);
                      }
                    }}
                    checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Order Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Delivery Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={(e) => handleOrderSelection(order.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {order.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        #{order.id} • Qty: {order.quantity}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {order.client?.companyName || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {order.client?.firstName} {order.client?.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      getStatusColor(order.status)
                    )}>
                      {order.status.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {format(new Date(order.deliveryDate), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {order.status === OrderStatus.PENDING && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowQuoteBuilder(true);
                          }}
                        >
                          <Calculator className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderQuoteBuilder = () => {
    if (!selectedOrder) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={() => setShowQuoteBuilder(false)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create Quote for Order #{selectedOrder.id}
              </h2>
              <Button
                variant="ghost"
                onClick={() => setShowQuoteBuilder(false)}
              >
                ×
              </Button>
            </div>

            {/* Quote Builder Form */}
            <QuoteBuilderForm
              order={selectedOrder}
              onSubmit={(quoteData) => {
                createQuoteMutation.mutate({
                  ...quoteData,
                  orderId: selectedOrder.id,
                });
              }}
              onCancel={() => setShowQuoteBuilder(false)}
              isLoading={createQuoteMutation.isPending}
            />
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderProductionQuotesTab = () => (
    <div className="space-y-6">
      {/* Production Quotes Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Production Quotes
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Advertise your available capacity and capabilities
          </p>
        </div>
        <Button
          onClick={() => setShowProductionQuoteBuilder(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Production Quote
        </Button>
      </div>

      {/* Analytics Cards */}
      {productionQuoteAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Quotes
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {productionQuoteAnalytics.activeProductionQuotes}
                </p>
              </div>
              <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-full">
                <Zap className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Views
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {productionQuoteAnalytics.totalViews}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Inquiries
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {productionQuoteAnalytics.totalInquiries}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                <MessageSquare className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Conversion Rate
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {productionQuoteAnalytics.averageConversionRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Production Quotes List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Your Production Quotes
            </h3>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
                Filter
              </Button>
              <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>
                Export
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {productionQuotesLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="lg" />
            </div>
          ) : productionQuotes.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No production quotes yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create your first production quote to advertise your capabilities
              </p>
              <Button
                onClick={() => setShowProductionQuoteBuilder(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create Production Quote
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {productionQuotes.map((quote: ProductionQuote) => {
                const availability = productionQuoteHelpers.getAvailabilityStatus(quote);
                const priority = productionQuoteHelpers.getPriorityDisplay(quote.priorityLevel);
                
                return (
                  <motion.div
                    key={quote.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                            {quote.title}
                          </h4>
                          <span className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            `bg-${availability.color}-100 text-${availability.color}-800 dark:bg-${availability.color}-900 dark:text-${availability.color}-300`
                          )}>
                            {availability.message}
                          </span>
                          <span className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            `bg-${priority.color}-100 text-${priority.color}-800 dark:bg-${priority.color}-900 dark:text-${priority.color}-300`
                          )}>
                            {priority.label} Priority
                          </span>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          {quote.description}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Type:</span>
                            <span className="ml-2 font-medium">
                              {productionQuoteHelpers.formatQuoteType(quote.productionQuoteType)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Pricing:</span>
                            <span className="ml-2 font-medium">
                              {productionQuoteHelpers.formatPricingModel(quote.pricingModel)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Views:</span>
                            <span className="ml-2 font-medium">{quote.viewCount}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Inquiries:</span>
                            <span className="ml-2 font-medium">{quote.inquiryCount}</span>
                          </div>
                        </div>
                        
                        {quote.manufacturingProcesses.length > 0 && (
                          <div className="mt-3">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Processes:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {quote.manufacturingProcesses.slice(0, 3).map((process, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                                >
                                  {process}
                                </span>
                              ))}
                              {quote.manufacturingProcesses.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                                  +{quote.manufacturingProcesses.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedProductionQuote(quote);
                            setShowProductionQuoteBuilder(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateProductionQuoteMutation.mutate({
                            id: quote.id,
                            data: { isActive: !quote.isActive }
                          })}
                        >
                          {quote.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this production quote?')) {
                              deleteProductionQuoteMutation.mutate(quote.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderProductionQuoteBuilder = () => {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={() => setShowProductionQuoteBuilder(false)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedProductionQuote ? 'Edit Production Quote' : 'Create Production Quote'}
              </h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowProductionQuoteBuilder(false);
                  setSelectedProductionQuote(null);
                }}
              >
                ×
              </Button>
            </div>

            {/* Production Quote Builder Form */}
            <ProductionQuoteBuilderForm
              productionQuote={selectedProductionQuote}
              onSubmit={(quoteData) => {
                if (selectedProductionQuote) {
                  updateProductionQuoteMutation.mutate({
                    id: selectedProductionQuote.id,
                    data: quoteData
                  });
                } else {
                  createProductionQuoteMutation.mutate(quoteData);
                }
              }}
              onCancel={() => {
                setShowProductionQuoteBuilder(false);
                setSelectedProductionQuote(null);
              }}
              isLoading={createProductionQuoteMutation.isPending || updateProductionQuoteMutation.isPending}
            />
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'quotes', label: 'Quotes', icon: FileText },
    { id: 'production-quotes', label: 'Production Quotes', icon: Zap },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
  ];

  if (statsLoading || ordersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manufacturer Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your orders, quotes, and production capacity
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as 'week' | 'month' | 'quarter')}
            options={[
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' },
              { value: 'quarter', label: 'This Quarter' },
            ]}
          />
          <Button variant="outline" leftIcon={<Bell className="w-4 h-4" />}>
            Notifications
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'orders' && renderOrdersTab()}
          {activeTab === 'quotes' && <div>Quotes content coming soon...</div>}
          {activeTab === 'production-quotes' && renderProductionQuotesTab()}
          {activeTab === 'analytics' && <div>Analytics content coming soon...</div>}
          {activeTab === 'calendar' && <div>Calendar content coming soon...</div>}
        </motion.div>
      </AnimatePresence>

      {/* Quote Builder Modal */}
      <AnimatePresence>
        {showQuoteBuilder && renderQuoteBuilder()}
      </AnimatePresence>

      {/* Production Quote Builder Modal */}
      <AnimatePresence>
        {showProductionQuoteBuilder && renderProductionQuoteBuilder()}
      </AnimatePresence>
    </div>
  );
};

// Quote Builder Form Component
interface QuoteBuilderFormProps {
  order: Order;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const QuoteBuilderForm: React.FC<QuoteBuilderFormProps> = ({
  order,
  onSubmit,
  onCancel,
  isLoading
}) => {
  const [lineItems, setLineItems] = useState([
    { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }
  ]);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].totalPrice = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setLineItems(updatedItems);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      lineItems,
      totalAmount,
      deliveryTime: parseInt(deliveryTime),
      notes,
      validUntil: new Date(validUntil),
      currency: 'USD',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Order Details
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Title:</span>
            <span className="ml-2 font-medium">{order.title}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Quantity:</span>
            <span className="ml-2 font-medium">{order.quantity}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Category:</span>
            <span className="ml-2 font-medium">{order.category}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Delivery Date:</span>
            <span className="ml-2 font-medium">
              {format(new Date(order.deliveryDate), 'MMM dd, yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Quote Items
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLineItem}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-5">
                <Input
                  label={index === 0 ? 'Description' : ''}
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  placeholder="Item description"
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  label={index === 0 ? 'Quantity' : ''}
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value))}
                  min="1"
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  label={index === 0 ? 'Unit Price' : ''}
                  type="number"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value))}
                  min="0"
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  label={index === 0 ? 'Total' : ''}
                  value={formatCurrency(item.totalPrice)}
                  disabled
                />
              </div>
              <div className="col-span-1">
                {lineItems.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLineItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-900 dark:text-white">
              Total Amount:
            </span>
            <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Delivery Time (days)"
          type="number"
          value={deliveryTime}
          onChange={(e) => setDeliveryTime(e.target.value)}
          placeholder="e.g., 14"
          required
        />
        <Input
          label="Valid Until"
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
          rows={3}
          placeholder="Additional notes or terms..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isLoading}
          leftIcon={<Send className="w-4 h-4" />}
        >
          Send Quote
        </Button>
      </div>
    </form>
  );
};

// Production Quote Builder Form Component
interface ProductionQuoteBuilderFormProps {
  productionQuote: ProductionQuote | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const ProductionQuoteBuilderForm: React.FC<ProductionQuoteBuilderFormProps> = ({
  productionQuote,
  onSubmit,
  onCancel,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    productionQuoteType: productionQuote?.productionQuoteType || ProductionQuoteType.CAPACITY_AVAILABILITY,
    title: productionQuote?.title || '',
    description: productionQuote?.description || '',
    availableFrom: productionQuote?.availableFrom || '',
    availableUntil: productionQuote?.availableUntil || '',
    leadTimeDays: productionQuote?.leadTimeDays || 14,
    pricingModel: productionQuote?.pricingModel || 'per_unit',
    basePrice: productionQuote?.basePrice || 0,
    currency: productionQuote?.currency || 'USD',
    manufacturingProcesses: productionQuote?.manufacturingProcesses || [],
    materials: productionQuote?.materials || [],
    certifications: productionQuote?.certifications || [],
    specialties: productionQuote?.specialties || [],
    minimumQuantity: productionQuote?.minimumQuantity || 1,
    maximumQuantity: productionQuote?.maximumQuantity || 10000,
    minimumOrderValue: productionQuote?.minimumOrderValue || 100,
    maximumOrderValue: productionQuote?.maximumOrderValue || 100000,
    preferredCountries: productionQuote?.preferredCountries || [],
    shippingOptions: productionQuote?.shippingOptions || [],
    isPublic: productionQuote?.isPublic ?? true,
    priorityLevel: productionQuote?.priorityLevel || 2,
    paymentTerms: productionQuote?.paymentTerms || '',
    warrantyTerms: productionQuote?.warrantyTerms || '',
    specialConditions: productionQuote?.specialConditions || '',
    tags: productionQuote?.tags || [],
  });

  const [newProcess, setNewProcess] = useState('');
  const [newMaterial, setNewMaterial] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newTag, setNewTag] = useState('');
  
  // Add missing state variables
  const [lineItems, setLineItems] = useState([
    { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }
  ]);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');

  // Calculate total amount
  const totalAmount = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

  // Line item management functions
  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total price for the item
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].totalPrice = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setLineItems(updatedItems);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  // Utility function for currency formatting
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addToArray = (field: string, value: string, setter: (value: string) => void) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field as keyof typeof prev] as string[]), value.trim()]
      }));
      setter('');
    }
  };

  const removeFromArray = (field: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      lineItems,
      deliveryTime,
      validUntil,
      notes,
      totalAmount
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Production Quote Type *
          </label>
          <Select
            value={formData.productionQuoteType}
            onChange={(e) => handleInputChange('productionQuoteType', e.target.value)}
            options={[
              { value: ProductionQuoteType.CAPACITY_AVAILABILITY, label: 'Capacity Availability' },
              { value: ProductionQuoteType.STANDARD_PRODUCT, label: 'Standard Product' },
              { value: ProductionQuoteType.PROMOTIONAL, label: 'Promotional Offer' },
              { value: ProductionQuoteType.PROTOTYPE_RD, label: 'Prototype & R&D' },
            ]}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Priority Level
          </label>
          <Select
            value={formData.priorityLevel.toString()}
            onChange={(e) => handleInputChange('priorityLevel', parseInt(e.target.value))}
            options={[
              { value: '1', label: 'Low' },
              { value: '2', label: 'Normal' },
              { value: '3', label: 'Medium' },
              { value: '4', label: 'High' },
              { value: '5', label: 'Urgent' },
            ]}
          />
        </div>
      </div>

      <Input
        label="Title *"
        value={formData.title}
        onChange={(e) => handleInputChange('title', e.target.value)}
        placeholder="e.g., CNC Machining Services Available"
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
          rows={3}
          placeholder="Describe your production capabilities and what you're offering..."
        />
      </div>

      {/* Line Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Quote Items
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLineItem}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-5">
                <Input
                  label={index === 0 ? 'Description' : ''}
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  placeholder="Item description"
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  label={index === 0 ? 'Quantity' : ''}
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value))}
                  min="1"
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  label={index === 0 ? 'Unit Price' : ''}
                  type="number"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value))}
                  min="0"
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  label={index === 0 ? 'Total' : ''}
                  value={formatCurrency(item.totalPrice)}
                  disabled
                />
              </div>
              <div className="col-span-1">
                {lineItems.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLineItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-900 dark:text-white">
              Total Amount:
            </span>
            <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Delivery Time (days)"
          type="number"
          value={deliveryTime}
          onChange={(e) => setDeliveryTime(e.target.value)}
          placeholder="e.g., 14"
          required
        />
        <Input
          label="Valid Until"
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
          rows={3}
          placeholder="Additional notes or terms..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isLoading}
          leftIcon={<Send className="w-4 h-4" />}
        >
          Send Quote
        </Button>
      </div>
    </form>
  );
};

export default ManufacturerDashboard; 