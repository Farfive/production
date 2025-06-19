import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Package, 
  BarChart3, 
  Settings, 
  Filter,
  Download,
  Bell,
  Wifi,
  WifiOff,
  RotateCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Send,
  MessageSquare
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import OrderCreationWizard from '../../components/orders/OrderCreationWizard';
import OrderTrackingDashboard from '../../components/orders/OrderTrackingDashboard';
import ManufacturerDashboard from '../../components/manufacturer/ManufacturerDashboard';
import AdvancedSearch from '../../components/search/AdvancedSearch';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { ordersApi } from '../../lib/api';
import { Order, OrderStatus, CreateOrderForm, CapabilityCategory, UrgencyLevel } from '../../types';
import { useAuth, useIsManufacturer, useIsClient } from '../../hooks/useAuth';
import useOfflineSupport from '../../hooks/useOfflineSupport';
import { cn, formatCurrency, getStatusColor } from '../../lib/utils';
import EmptyState from '../../components/ui/EmptyState';

type ViewMode = 'dashboard' | 'create' | 'track' | 'manufacturer' | 'analytics';

const OrderManagementPage: React.FC = () => {
  const { user } = useAuth();
  const isManufacturer = useIsManufacturer();
  const isClient = useIsClient();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [showOfflineIndicator, setShowOfflineIndicator] = useState(false);

  // Offline support
  const {
    isOnline,
    pendingActions,
    isSyncing,
    lastSyncAt,
    forcSync,
    clearPendingActions,
    getStorageInfo,
    shouldShowOfflineIndicator
  } = useOfflineSupport({
    enableOptimisticUpdates: true,
    maxRetries: 3,
    syncInterval: 30000
  });

      // Fetch orders from API
  const { 
    data: incomingOrders, 
    isLoading: ordersLoading,
    refetch,
    error: ordersError
  } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        console.log('🔍 Fetching orders from API...');
        const result = await ordersApi.getOrders();
        console.log('✅ Orders fetched successfully:', result);
        return result;
      } catch (error) {
        console.error('❌ Error fetching orders:', error);
        console.warn('Orders API call failed:', error);
        toast('API temporarily unavailable', { 
          icon: 'ℹ️',
          duration: 4000 
        });
        // Return mock data as fallback
        return {
          data: [],
          total: 0,
          page: 1,
          per_page: 20,
          total_pages: 1
        };
      }
    },
    refetchInterval: isOnline ? 30000 : false,
    retry: isOnline ? 3 : false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Ensure orders is always an array for compatibility
  const liveOrders = incomingOrders?.data ?? [];

  // Update filtered orders when ordersList changes
  React.useEffect(() => {
    setFilteredOrders(liveOrders);
  }, [liveOrders]);

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 OrderManagementPage Debug Info:');
    console.log('  - User:', user);
    console.log('  - isClient:', isClient);
    console.log('  - isManufacturer:', isManufacturer);
    console.log('  - viewMode:', viewMode);
    console.log('  - ordersLoading:', ordersLoading);
    console.log('  - ordersError:', ordersError);
    console.log('  - liveOrders:', liveOrders);
    console.log('  - isOnline:', isOnline);
    
    // Check authentication token
    const token = localStorage.getItem('accessToken');
    console.log('  - hasAccessToken:', !!token);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('  - tokenPayload:', payload);
        console.log('  - tokenExpiry:', new Date(payload.exp * 1000));
        console.log('  - tokenValid:', payload.exp * 1000 > Date.now());
      } catch (e) {
        console.log('  - tokenParseError:', e);
      }
    }
  }, [user, isClient, isManufacturer, viewMode, ordersLoading, ordersError, liveOrders, isOnline]);

  // Order statistics
  const orderStats = useMemo(() => {
    const stats = {
      total: liveOrders.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      totalValue: 0,
      avgValue: 0
    };

    liveOrders.forEach(order => {
      stats.totalValue += order.totalAmount || 0;
      
      switch (order.status) {
        case OrderStatus.PENDING:
        case OrderStatus.QUOTED:
          stats.pending++;
          break;
        case OrderStatus.CONFIRMED:
        case OrderStatus.IN_PRODUCTION:
        case OrderStatus.QUALITY_CHECK:
        case OrderStatus.SHIPPED:
          stats.inProgress++;
          break;
        case OrderStatus.DELIVERED:
          stats.completed++;
          break;
        case OrderStatus.CANCELLED:
          stats.cancelled++;
          break;
      }
    });

    stats.avgValue = stats.total > 0 ? stats.totalValue / stats.total : 0;
    
    return stats;
  }, [liveOrders]);

  const handleOrderCreate = async (_order: Order) => {
    toast.success('Order created successfully!');
    setViewMode('track');
    refetch();
  };

  const handleOrderUpdate = async (orderId: string, updates: Partial<Order>) => {
    try {
      // Map Order fields to CreateOrderForm fields
      const mappedUpdates: Partial<CreateOrderForm> = {
        title: updates.title,
        description: updates.description,
        category: updates.category,
        quantity: updates.quantity,
        currency: updates.currency,
        deliveryDate: updates.deliveryDate,
        urgency: updates.urgency,
        isPublic: updates.isPublic,
        targetPrice: updates.targetPrice,
        targetPriceMax: updates.targetPriceMax,
        // Map other fields as needed
      };

      await ordersApi.updateOrder(Number(orderId), mappedUpdates);
      toast.success('Order updated successfully!');
      refetch();
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const handleOrderDelete = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    
    try {
      await ordersApi.deleteOrder(Number(orderId));
      toast.success('Order deleted successfully!');
      refetch();
    } catch (error) {
      toast.error('Failed to delete order');
    }
  };

  const handleExportOrders = async (ordersToExport: Order[]) => {
    try {
      // TODO: Implement when exportOrders API is available
      const csvContent = [
        ['ID', 'Title', 'Status', 'Total Amount', 'Created At'].join(','),
        ...ordersToExport.map(order => [
          order.id,
          order.title,
          order.status,
          order.totalAmount || 0,
          order.createdAt
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      /*const blob = await ordersApi.exportOrders({
        orderIds: ordersToExport.map(o => o.id),
        format: 'xlsx'
      });*/
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Orders exported successfully!');
    } catch (error) {
      toast.error('Failed to export orders');
    }
  };

  const renderOfflineIndicator = () => {
    if (!shouldShowOfflineIndicator) return null;

    const storageInfo = getStorageInfo();

    return (
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="bg-warning-50 dark:bg-warning-900 border border-warning-200 dark:border-warning-700 rounded-lg p-4 mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isOnline ? (
              <RotateCw className={cn(
                'w-5 h-5 text-warning-600 dark:text-warning-400',
                isSyncing && 'animate-spin'
              )} />
            ) : (
              <WifiOff className="w-5 h-5 text-error-600 dark:text-error-400" />
            )}
            
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {isOnline ? (
                  isSyncing ? 'Syncing changes...' : `${pendingActions.length} changes pending sync`
                ) : (
                  'Working offline'
                )}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {isOnline ? (
                  `Last sync: ${lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : 'Never'}`
                ) : (
                  `${storageInfo.pendingActionsCount} actions saved locally`
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isOnline && pendingActions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={forcSync}
                disabled={isSyncing}
                leftIcon={<RotateCw className="w-4 h-4" />}
              >
                Sync Now
              </Button>
            )}
            
            {pendingActions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearPendingActions}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderOrderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Package className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Orders
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {orderStats.total}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Clock className="w-8 h-8 text-warning-600 dark:text-warning-400" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Pending
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {orderStats.pending}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <AlertTriangle className="w-8 h-8 text-info-600 dark:text-info-400" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              In Progress
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {orderStats.inProgress}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <CheckCircle className="w-8 h-8 text-success-600 dark:text-success-400" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Completed
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {orderStats.completed}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <BarChart3 className="w-8 h-8 text-steel-600 dark:text-steel-400" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Value
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(orderStats.totalValue)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNavigationTabs = () => {
    const tabs = [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3, show: true },
      { id: 'create', label: 'Create Order', icon: Plus, show: isClient },
      { id: 'track', label: 'Track Orders', icon: Eye, show: true },
      { id: 'manufacturer', label: 'Manufacturer', icon: Settings, show: isManufacturer },
    ];

    return (
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.filter(tab => tab.show).map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as ViewMode)}
                className={cn(
                  'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2',
                  viewMode === tab.id
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
    );
  };

  const renderContent = () => {
    if (ordersLoading) return <LoadingSpinner center />;

    if (ordersError) {
      return (
        <EmptyState
          title="Failed to load orders"
          description={(ordersError as any)?.message || 'Unexpected error.'}
          onRetry={() => refetch()}
        />
      );
    }

    if (!liveOrders.length) {
      return (
        <EmptyState
          title="No orders found"
          description="You have no orders matching the current filters."
          onRetry={() => refetch()}
        />
      );
    }

    switch (viewMode) {
      case 'create':
        console.log('🎨 Rendering OrderCreationWizard');
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <OrderCreationWizard
              onComplete={handleOrderCreate}
              onCancel={() => setViewMode('dashboard')}
            />
          </motion.div>
        );

      case 'track':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <OrderTrackingDashboard />
          </motion.div>
        );

      case 'manufacturer':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ManufacturerDashboard />
          </motion.div>
        );

      case 'dashboard':
      default:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Order Statistics */}
            {renderOrderStats()}

            {/* Advanced Search */}
            <AdvancedSearch
              data={liveOrders}
              onFilteredDataChange={setFilteredOrders}
              onExport={handleExportOrders}
            />

            {/* Recent Orders */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Recent Orders ({filteredOrders.length})
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode('track')}
                      leftIcon={<Eye className="w-4 h-4" />}
                    >
                      View All
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        console.log('🖱️ New Order button clicked!');
                        console.log('  - Current viewMode:', viewMode);
                        console.log('  - isClient:', isClient);
                        console.log('  - user:', user);
                        console.log('  - Setting viewMode to: create');
                        setViewMode('create');
                      }}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      New Order
                    </Button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {isManufacturer ? 'Client' : 'Manufacturer'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Delivery
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredOrders.slice(0, 10).map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {order.title}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              #{order.id}
                            </div>
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
                                                    {isManufacturer
                            ? order.client?.fullName || 'Unknown'
                                                         : order.manufacturer?.companyName || 'Pending'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {order.totalAmount ? formatCurrency(order.totalAmount, order.currency) : 'TBD'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {new Date(order.deliveryDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                              leftIcon={<Eye className="w-4 h-4" />}
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<MessageSquare className="w-4 h-4" />}
                            >
                              Chat
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Order Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isManufacturer 
                ? 'Manage incoming orders and create quotes'
                : 'Create, track, and manage your manufacturing orders'
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-success-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-error-500" />
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Notifications */}
            <Button
              variant="outline"
              leftIcon={<Bell className="w-4 h-4" />}
            >
              Notifications
            </Button>
          </div>
        </div>

        {/* Offline Indicator */}
        <AnimatePresence>
          {renderOfflineIndicator()}
        </AnimatePresence>

        {/* Navigation */}
        {renderNavigationTabs()}

        {/* Content */}
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OrderManagementPage; 