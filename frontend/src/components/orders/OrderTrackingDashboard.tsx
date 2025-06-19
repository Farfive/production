import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  RefreshCw,
  FileText,
  DollarSign,
  Paperclip,
  Send,
  ChevronRight,
  Star,
  Activity,
  X
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

import { ordersApi } from '../../lib/api';
import { Order, OrderStatus, Message, OrderUpdate } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import LoadingSpinner from '../ui/LoadingSpinner';
import { formatCurrency, cn, getStatusColor } from '../../lib/utils';
import useWebSocket from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';

// WebSocket hook for real-time updates
const useOrderWebSocket = (orderId?: string) => {
  const { socket, isConnected } = useWebSocket();
  const [updates, setUpdates] = useState<OrderUpdate[]>([]);
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!socket || !orderId) return;

    // Join order-specific room
    socket.emit('join-order', orderId);

    // Listen for order updates
    socket.on('order-updated', (update: OrderUpdate) => {
      setUpdates(prev => [update, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success(`Order ${orderId} updated: ${update.payload.message}`);
    });

    // Listen for new messages
    socket.on('new-message', (message: Message) => {
      queryClient.invalidateQueries({ queryKey: ['order-messages', orderId] });
      if (Notification.permission === 'granted') {
        new Notification('New Message', {
          body: message.content,
          icon: '/favicon.ico',
        });
      }
    });

    return () => {
      socket.off('order-updated');
      socket.off('new-message');
      socket.emit('leave-order', orderId);
    };
  }, [socket, orderId, queryClient]);

  return { updates, isConnected };
};

interface OrderTrackingDashboardProps {
  orderId?: string;
  view?: 'list' | 'card' | 'timeline';
}

const OrderTrackingDashboard: React.FC<OrderTrackingDashboardProps> = ({
  orderId,
  view: initialView = 'list'
}) => {
  const { user } = useAuth();
  const [view, setView] = useState(initialView);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const queryClient = useQueryClient();
  const { isConnected } = useOrderWebSocket(selectedOrder?.id);

  // Fetch orders
  const { 
    data: orders = [], 
    isLoading: ordersLoading,
    refetch: refetchOrders 
  } = useQuery({
    queryKey: ['orders', { search: searchTerm, status: statusFilter }],
    queryFn: () => ordersApi.getOrders({ search: searchTerm, status: statusFilter === 'all' ? undefined : statusFilter }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch single order if orderId is provided
  useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(parseInt(orderId!)),
    enabled: !!orderId,
    refetchInterval: 10000, // Refetch every 10 seconds for active tracking
  });

  // Fetch messages for selected order
  const { data: messages = [] } = useQuery({
    queryKey: ['order-messages', selectedOrder?.id],
    queryFn: () => ordersApi.getOrderMessages(selectedOrder!.id),
    enabled: !!selectedOrder,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { orderId: string; content: string; attachments?: File[] }) =>
      ordersApi.sendMessage(parseInt(data.orderId), data.content, 'manufacturer'),
    onSuccess: () => {
      setMessageText('');
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ['order-messages', selectedOrder?.id] });
      toast.success('Message sent');
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  // Export orders mutation
  const exportOrdersMutation = useMutation({
    mutationFn: ordersApi.exportOrders,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Orders exported successfully');
    },
    onError: () => {
      toast.error('Failed to export orders');
    },
  });

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter((order: Order) => {
      const matchesSearch = order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.id.toString().toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: OrderStatus.DRAFT, label: 'Draft' },
    { value: OrderStatus.PENDING, label: 'Pending' },
    { value: OrderStatus.QUOTED, label: 'Quoted' },
    { value: OrderStatus.CONFIRMED, label: 'Confirmed' },
    { value: OrderStatus.IN_PRODUCTION, label: 'In Production' },
    { value: OrderStatus.QUALITY_CHECK, label: 'Quality Check' },
    { value: OrderStatus.SHIPPED, label: 'Shipped' },
    { value: OrderStatus.DELIVERED, label: 'Delivered' },
    { value: OrderStatus.CANCELLED, label: 'Cancelled' },
  ];

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.DRAFT:
        return <FileText className="w-4 h-4" />;
      case OrderStatus.PENDING:
        return <Clock className="w-4 h-4" />;
      case OrderStatus.QUOTED:
        return <DollarSign className="w-4 h-4" />;
      case OrderStatus.CONFIRMED:
        return <CheckCircle className="w-4 h-4" />;
      case OrderStatus.IN_PRODUCTION:
        return <Package className="w-4 h-4" />;
      case OrderStatus.QUALITY_CHECK:
        return <Star className="w-4 h-4" />;
      case OrderStatus.SHIPPED:
        return <Truck className="w-4 h-4" />;
      case OrderStatus.DELIVERED:
        return <CheckCircle className="w-4 h-4" />;
      case OrderStatus.CANCELLED:
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const handleSendMessage = () => {
    if (!selectedOrder || !messageText.trim()) return;
    
    sendMessageMutation.mutate({
      orderId: selectedOrder.id,
      content: messageText,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  };

  const renderOrderTimeline = (order: Order) => {
    const timelineEvents = [
      {
        status: OrderStatus.PENDING,
        title: 'Order Submitted',
        description: 'Order submitted and waiting for manufacturer response',
        timestamp: order.createdAt,
        completed: true,
      },
      {
        status: OrderStatus.QUOTED,
        title: 'Quote Received',
        description: 'Manufacturer provided quote',
        timestamp: order.quotedAt,
        completed: order.status !== OrderStatus.PENDING,
      },
      {
        status: OrderStatus.CONFIRMED,
        title: 'Order Confirmed',
        description: 'Order confirmed and payment processed',
        timestamp: order.confirmedAt,
        completed: [OrderStatus.CONFIRMED, OrderStatus.IN_PRODUCTION, OrderStatus.QUALITY_CHECK, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status),
      },
      {
        status: OrderStatus.IN_PRODUCTION,
        title: 'Production Started',
        description: 'Manufacturing process has begun',
        timestamp: order.productionStartedAt,
        completed: [OrderStatus.IN_PRODUCTION, OrderStatus.QUALITY_CHECK, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status),
        current: order.status === OrderStatus.IN_PRODUCTION,
      },
      {
        status: OrderStatus.QUALITY_CHECK,
        title: 'Quality Check',
        description: 'Final quality inspection in progress',
        timestamp: order.qualityCheckAt,
        completed: [OrderStatus.QUALITY_CHECK, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status),
        current: order.status === OrderStatus.QUALITY_CHECK,
      },
      {
        status: OrderStatus.SHIPPED,
        title: 'Shipped',
        description: 'Order has been shipped',
        timestamp: order.shippedAt,
        completed: [OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status),
        current: order.status === OrderStatus.SHIPPED,
      },
      {
        status: OrderStatus.DELIVERED,
        title: 'Delivered',
        description: 'Order successfully delivered',
        timestamp: order.deliveredAt,
        completed: order.status === OrderStatus.DELIVERED,
        current: order.status === OrderStatus.DELIVERED,
      },
    ];

    return (
      <div className="space-y-8">
        {timelineEvents.map((event, index) => (
          <div key={event.status} className="relative flex items-start">
            {/* Timeline line */}
            {index < timelineEvents.length - 1 && (
              <div className={cn(
                'absolute left-4 top-8 w-0.5 h-16',
                event.completed ? 'bg-success-500' : 'bg-gray-200 dark:bg-gray-700'
              )} />
            )}
            
            {/* Timeline node */}
            <div className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2',
              event.completed 
                ? 'bg-success-500 border-success-500 text-white'
                : event.current
                ? 'bg-primary-500 border-primary-500 text-white animate-pulse'
                : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'
            )}>
              {getStatusIcon(event.status)}
            </div>

            {/* Timeline content */}
            <div className="ml-4 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className={cn(
                  'text-sm font-medium',
                  event.completed || event.current 
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                )}>
                  {event.title}
                </h4>
                {event.timestamp && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {format(new Date(event.timestamp), 'MMM dd, HH:mm')}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {event.description}
              </p>
              {event.current && (
                <div className="mt-2">
                  <div className="flex items-center text-xs text-primary-600 dark:text-primary-400">
                    <Activity className="w-3 h-3 mr-1" />
                    Current status
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCommunicationThread = () => {
    if (!selectedOrder) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Communication
          </h4>
          <div className="flex items-center space-x-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-success-500' : 'bg-error-500'
            )} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex',
                message.senderId === user?.id.toString() ? 'justify-end' : 'justify-start'
              )}
            >
              <div className={cn(
                'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
                message.senderId === user?.id.toString()
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              )}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">
                    {message.senderName}
                  </span>
                  <span className="text-xs opacity-70">
                    {format(new Date(message.createdAt), 'HH:mm')}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map((attachment, index) => (
                      <a
                        key={index}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-xs underline hover:no-underline"
                      >
                        <Paperclip className="w-3 h-3 mr-1" />
                        {attachment.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Message input */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center text-xs text-gray-500">
                      <Paperclip className="w-3 h-3 mr-1" />
                      {file.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              loading={sendMessageMutation.isPending}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderOrderCard = (order: Order) => (
    <motion.div
      key={order.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => setSelectedOrder(order)}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {order.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Order #{order.id}
          </p>
        </div>
        <div className={cn(
          'px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1',
          getStatusColor(order.status)
        )}>
          {getStatusIcon(order.status)}
          <span className="capitalize">{order.status.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Quantity</p>
          <p className="font-medium text-gray-900 dark:text-white">{order.quantity}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Delivery Date</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {format(new Date(order.deliveryDate), 'MMM dd, yyyy')}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Manufacturer</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {order.manufacturer?.companyName || 'Pending'}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Total Value</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {order.totalAmount ? formatCurrency(order.totalAmount, order.currency) : 'TBD'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Updated {formatDistanceToNow(new Date(order.updatedAt), { addSuffix: true })}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </motion.div>
  );

  const renderOrderList = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
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
                Manufacturer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Delivery Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredOrders.map((order: Order) => (
              <motion.tr
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => setSelectedOrder(order)}
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
                    {getStatusIcon(order.status)}
                    <span className="ml-1 capitalize">{order.status.replace('_', ' ')}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {order.manufacturer?.companyName || 'Pending'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {format(new Date(order.deliveryDate), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {order.totalAmount ? formatCurrency(order.totalAmount, order.currency) : 'TBD'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (ordersLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Order Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor your orders in real-time
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => refetchOrders()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => exportOrdersMutation.mutate({})}
            loading={exportOrdersMutation.isPending}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search orders by title or ID..."
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
          options={statusOptions}
        />
        <div className="flex items-center space-x-2">
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
          >
            List
          </Button>
          <Button
            variant={view === 'card' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('card')}
          >
            Cards
          </Button>
        </div>
      </div>

      {/* Orders Display */}
      {view === 'list' ? renderOrderList() : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map(renderOrderCard)}
        </div>
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-full">
                {/* Left Panel - Order Details */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {selectedOrder.title}
                      </h2>
                      <p className="text-gray-500 dark:text-gray-400">
                        Order #{selectedOrder.id}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedOrder(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Order Timeline */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Order Progress
                    </h3>
                    {renderOrderTimeline(selectedOrder)}
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Quantity
                      </h4>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedOrder.quantity}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Delivery Date
                      </h4>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {format(new Date(selectedOrder.deliveryDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Manufacturer
                      </h4>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedOrder.manufacturer?.companyName || 'Pending'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Total Value
                      </h4>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedOrder.totalAmount 
                          ? formatCurrency(selectedOrder.totalAmount, selectedOrder.currency) 
                          : 'TBD'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Communication */}
                <div className="w-96 border-l border-gray-200 dark:border-gray-700 p-6">
                  {renderCommunicationThread()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderTrackingDashboard; 