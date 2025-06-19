import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Plus,
  Filter,
  Search,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Truck,
  Eye,
  Edit
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import OrderStatusPipeline from '../components/orders/OrderStatusPipeline';
import DeliveryTracker from '../components/orders/DeliveryTracker';
import { ordersApi } from '../lib/api';

interface LocalOrder {
  id: string;
  orderNumber: string;
  title: string;
  description: string;
  status: 'confirmed' | 'in_production' | 'quality_check' | 'packaging' | 'shipped' | 'delivered';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  client: {
    id: string;
    name: string;
    email: string;
  };
  manufacturer: {
    id: string;
    name: string;
    email: string;
  };
  totalAmount: number;
  currency: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  createdAt: string;
  updatedAt: string;
  overallProgress: number;
  isDelayed: boolean;
  delayReason?: string;
}

const OrderManagementPage: React.FC = () => {
  const [selectedOrder, setSelectedOrder] = useState<LocalOrder | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'pipeline' | 'delivery'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<string>('all');

  // Fetch orders
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['orders', filterStatus, filterPriority, searchTerm, dateRange],
    queryFn: () => ordersApi.getAll({
      status: filterStatus !== 'all' ? filterStatus as any : undefined,
      search: searchTerm || undefined,
      dateRange: dateRange !== 'all' ? [dateRange, dateRange] as [string, string] : undefined,
    }),
    refetchInterval: 30000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'shipped':
        return 'text-blue-600 bg-blue-100';
      case 'in_production':
        return 'text-purple-600 bg-purple-100';
      case 'quality_check':
        return 'text-orange-600 bg-orange-100';
      case 'confirmed':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return CheckCircle;
      case 'shipped':
        return Truck;
      case 'in_production':
        return BarChart3;
      case 'quality_check':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const filteredOrders = orders?.data?.filter((order: any) => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || order.priority === filterPriority;
    const matchesSearch = order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  }) || [];

  const renderOrdersList = () => (
    <div className="space-y-4">
      {filteredOrders.map((order: any) => {
        const StatusIcon = getStatusIcon(order.status);
        
        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <StatusIcon className="h-5 w-5 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Order #{order.orderNumber}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(order.priority)}`}>
                    {order.priority.toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {order.isDelayed && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                      DELAYED
                    </span>
                  )}
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  {order.title}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Client:</span>
                    <p className="font-medium">{order.client.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Manufacturer:</span>
                    <p className="font-medium">{order.manufacturer.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Amount:</span>
                    <p className="font-medium">${order.totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Est. Delivery:</span>
                    <p className="font-medium">
                      {format(parseISO(order.estimatedDelivery), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progress
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {order.overallProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${order.overallProgress}%` }}
                    />
                  </div>
                </div>
                
                {order.isDelayed && order.delayReason && (
                  <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border-l-4 border-red-400">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      <strong>Delay:</strong> {order.delayReason}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 ml-6">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedOrder(order);
                    setViewMode('pipeline');
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Pipeline
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedOrder(order);
                    setViewMode('delivery');
                  }}
                >
                  <Truck className="h-4 w-4 mr-1" />
                  Track Delivery
                </Button>
                <Button size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  const renderContent = () => {
    if (viewMode === 'pipeline' && selectedOrder) {
      return (
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => {
                setViewMode('list');
                setSelectedOrder(null);
              }}
            >
              ← Back to Orders
            </Button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Order Pipeline - #{selectedOrder.orderNumber}
            </h2>
          </div>
          <OrderStatusPipeline
            orderId={selectedOrder.id}
            onStatusUpdate={() => refetch()}
          />
        </div>
      );
    }

    if (viewMode === 'delivery' && selectedOrder) {
      return (
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => {
                setViewMode('list');
                setSelectedOrder(null);
              }}
            >
              ← Back to Orders
            </Button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Delivery Tracking - #{selectedOrder.orderNumber}
            </h2>
          </div>
          <DeliveryTracker orderId={selectedOrder.id} />
        </div>
      );
    }

    return renderOrdersList();
  };

  if (isLoading) {
    return <LoadingSpinner center />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Order Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage your production orders with real-time updates
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {orders?.pagination?.total || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Production</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredOrders.filter(o => o.status === 'in_production').length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Shipped</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredOrders.filter(o => o.status === 'shipped').length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivered</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredOrders.filter(o => o.status === 'delivered').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'in_production', label: 'In Production' },
                { value: 'shipped', label: 'Shipped' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
            />
            
            <Select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              options={[
                { value: 'all', label: 'All Priority' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' }
              ]}
            />
            
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'quarter', label: 'This Quarter' }
              ]}
            />
            
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {viewMode === 'list' && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Orders ({filteredOrders.length})
            </h3>
          </div>
        )}
        
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default OrderManagementPage; 