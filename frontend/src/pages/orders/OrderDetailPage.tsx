import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Download,
  Edit,
  FileText,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Star,
  Truck,
  Upload,
  User,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Eye,
  Send,
  CheckSquare,
  Square as SquareIcon,
  Camera
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { FileRejection, useDropzone } from 'react-dropzone';

import { ordersApi, quotesApi, paymentsApi, queryKeys } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';
import { Order, Quote, OrderStatus, QuoteStatus, UserRole, UrgencyLevel } from '../../types';
import { formatCurrency, formatDate, formatRelativeTime } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBoundary from '../../components/ui/ErrorBoundary';

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { measureApiCall } = usePerformanceMonitoring();

  // Local state
  const [activeTab, setActiveTab] = useState<'overview' | 'quotes' | 'messages' | 'files'>('overview');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch order details
  const {
    data: order,
    isLoading: orderLoading,
    error: orderError,
    refetch: refetchOrder
  } = useQuery({
    queryKey: queryKeys.orders.detail(Number(orderId)),
    queryFn: () => ordersApi.getById(Number(orderId!)),
    enabled: !!orderId,
    staleTime: 30000, // 30 seconds
  });

  // Fetch quotes for this order
  const {
    data: quotesData,
    isLoading: quotesLoading,
    refetch: refetchQuotes
  } = useQuery({
    queryKey: ['quotes', 'by-order', Number(orderId)],
    queryFn: () => quotesApi.getByOrderId(Number(orderId!)),
    enabled: !!orderId,
    staleTime: 30000,
  });

  // Accept quote mutation
  const acceptQuoteMutation = useMutation({
    mutationFn: (quoteId: number) => quotesApi.acceptQuote(quoteId),
    onSuccess: () => {
      toast.success('Quote accepted successfully!');
      refetchOrder();
      refetchQuotes();
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to accept quote');
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { orderId: number; message: string; recipientType: 'manufacturer' | 'client' }) =>
      ordersApi.sendMessage(data.orderId, data.message, data.recipientType),
    onSuccess: () => {
      toast.success('Message sent successfully!');
      setShowMessageModal(false);
      setMessageText('');
      // Refresh order to get updated messages
      refetchOrder();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send message');
    },
  });

  const quotes = quotesData?.quotes || [];

  // After order and quotes fetch, fetch order details and messages
  const { data: orderDetails } = useQuery<any>({
    queryKey: ['order-details', orderId],
    queryFn: () => ordersApi.getOrderDetails(orderId!),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (orderDetails) {
      setMilestones(orderDetails.milestones || []);
      setMessages(orderDetails.messages || []);
    }
  }, [orderDetails]);

  const { data: orderMessages, refetch: refetchMessages } = useQuery<any[]>({
    queryKey: ['order-messages', orderId],
    queryFn: () => ordersApi.getOrderMessages(orderId!),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (orderMessages) {
      setMessages(orderMessages);
    }
  }, [orderMessages]);

  // WebSocket effect
  useEffect(() => {
    if (!orderId) return;
    const wsUrl = `${process.env.REACT_APP_WS_BASE_URL || ''}/ws/orders/${orderId}`;
    const s = io(wsUrl, { transports: ['websocket'], withCredentials: true });
    setSocket(s);
    s.on('connect', () => console.log('WS connected'));
    s.on('order_message', (msg: any) => {
      setMessages(prev => [...prev, msg]);
    });
    s.on('milestone_update', (ms: any) => {
      setMilestones(ms);
    });
    return () => { s.disconnect(); };
  }, [orderId]);

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => ordersApi.uploadFiles(order ? Number(order.id) : 0, files),
    onSuccess: () => {
      toast.success('Files uploaded');
      refetchOrder();
    },
    onError: () => toast.error('Upload failed'),
  });

  const onDrop = (accepted: File[], _rejected: FileRejection[]) => {
    if (!accepted.length) return;
    setUploading(true);
    uploadMutation.mutateAsync(accepted).finally(() => setUploading(false));
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const updateMilestoneMutation = useMutation({
    mutationFn: (payload: { id: string; updates: any }) => ordersApi.updateMilestone(payload.id, payload.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
    },
    onError: () => toast.error('Failed to update milestone'),
  });

  const uploadMilestoneMutation = useMutation({
    mutationFn: (payload: { id: string; files: File[] }) => ordersApi.uploadMilestoneFiles(payload.id, payload.files, 'photos'),
    onSuccess: () => {
      toast.success('Photos uploaded');
      queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
    },
    onError: () => toast.error('Upload failed'),
  });

  const handleToggleMilestone = (ms: any) => {
    const newCompleted = !ms.completed;
    updateMilestoneMutation.mutate({ id: ms.id, updates: { completed: newCompleted } });
    setMilestones(prev => prev.map(m => m.id===ms.id? { ...m, completed: newCompleted }: m));
  };

  const handleMilestoneUpload = (msId: string, files: File[]) => {
    uploadMilestoneMutation.mutate({ id: msId, files });
  };

  if (orderLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order not found</h2>
          <p className="text-gray-600 mb-4">The order you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => navigate('/orders')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const isClient = user?.role === UserRole.CLIENT;
  const isManufacturer = user?.role === UserRole.MANUFACTURER;
  const canAcceptQuotes = isClient && order.status === OrderStatus.QUOTED;
  const canCreateQuote = isManufacturer && [OrderStatus.PENDING, OrderStatus.PUBLISHED].includes(order.status);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PUBLISHED:
        return 'bg-blue-100 text-blue-800';
      case OrderStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case OrderStatus.QUOTED:
        return 'bg-purple-100 text-purple-800';
      case OrderStatus.IN_PRODUCTION:
        return 'bg-orange-100 text-orange-800';
      case OrderStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case OrderStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PUBLISHED:
        return <Zap className="h-4 w-4" />;
      case OrderStatus.PENDING:
        return <Clock className="h-4 w-4" />;
      case OrderStatus.QUOTED:
        return <FileText className="h-4 w-4" />;
      case OrderStatus.IN_PRODUCTION:
        return <Package className="h-4 w-4" />;
      case OrderStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4" />;
      case OrderStatus.CANCELLED:
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const handleAcceptQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    // Show confirmation modal or directly accept
    if (window.confirm(`Accept quote for ${formatCurrency(quote.totalAmount, quote.currency)}?`)) {
      acceptQuoteMutation.mutate(Number(quote.id));
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    
    sendMessageMutation.mutate({
      orderId: Number(order.id),
      message: messageText,
      recipientType: isClient ? 'manufacturer' : 'client'
    });
  };

  const orderTimeline = [
    {
      status: 'Order Created',
      date: order.createdAt,
      completed: true,
      icon: <FileText className="h-4 w-4" />
    },
    {
      status: 'Matching Manufacturers',
      date: order.createdAt,
      completed: order.status !== OrderStatus.PENDING,
      icon: <User className="h-4 w-4" />
    },
    {
      status: 'Quotes Received',
      date: order.quotedAt,
      completed: order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PUBLISHED,
      icon: <DollarSign className="h-4 w-4" />
    },
    {
      status: 'Quote Accepted',
      date: order.selectedQuoteId ? order.updatedAt : null,
      completed: !!order.selectedQuoteId,
      icon: <CheckCircle className="h-4 w-4" />
    },
    {
      status: 'Production Started',
      date: order.productionStartedAt,
      completed: order.status === OrderStatus.IN_PRODUCTION || order.status === OrderStatus.COMPLETED,
      icon: <Package className="h-4 w-4" />
    },
    {
      status: 'Order Completed',
      date: order.deliveredAt,
      completed: order.status === OrderStatus.COMPLETED,
      icon: <Truck className="h-4 w-4" />
    }
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{order.title}</h1>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{order.status.replace('_', ' ')}</span>
                    </span>
                    <span className="text-sm text-gray-500">
                      Order #{order.id} • Created {formatRelativeTime(order.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {canCreateQuote && (
                  <button
                    onClick={() => navigate(`/quotes/create?orderId=${order.id}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Quote
                  </button>
                )}
                <button
                  onClick={() => setShowMessageModal(true)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <MessageSquare className="h-5 w-5" />
                </button>
                {isClient && (
                  <button
                    onClick={() => navigate(`/orders/edit/${order.id}`)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-8">
              {[
                { key: 'overview', label: 'Overview', icon: <Eye className="h-4 w-4" /> },
                { key: 'quotes', label: `Quotes (${quotes.length})`, icon: <DollarSign className="h-4 w-4" /> },
                { key: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
                { key: 'files', label: 'Files', icon: <FileText className="h-4 w-4" /> }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Order Timeline */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Order Progress</h3>
                    <div className="space-y-4">
                      {orderTimeline.map((step, index) => (
                        <div key={index} className="flex items-center space-x-4">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            step.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {step.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                              {step.status}
                            </p>
                            {step.date && (
                              <p className="text-xs text-gray-500">
                                {formatDate(step.date)}
                              </p>
                            )}
                          </div>
                          {step.completed && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Order Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Technical Requirements</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Category:</span>
                            <span className="text-sm font-medium text-gray-900">{order.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Material:</span>
                            <span className="text-sm font-medium text-gray-900">{order.material || 'Not specified'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Quantity:</span>
                            <span className="text-sm font-medium text-gray-900">{order.quantity}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Budget & Timeline</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Budget:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {order.budgetPln ? formatCurrency(order.budgetPln, 'PLN') : 'Not specified'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Deadline:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatDate(order.deliveryDate)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Priority:</span>
                            <span className={`text-sm font-medium ${
                              order.urgency === UrgencyLevel.URGENT ? 'text-red-600' : 
                              order.urgency === UrgencyLevel.HIGH ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {order.urgency}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {order.description && (
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                        <p className="text-sm text-gray-600">{order.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Milestones */}
                  {milestones.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Milestones</h3>
                      <ul className="space-y-3">
                        {milestones.map((ms) => (
                          <li key={ms.id} className="flex items-start space-x-3">
                            {/* checkbox */}
                            {isManufacturer ? (
                              <button onClick={() => handleToggleMilestone(ms)} className="mt-1 text-indigo-600">
                                {ms.completed ? <CheckSquare className="h-5 w-5"/> : <SquareIcon className="h-5 w-5"/>}
                              </button>
                            ) : (
                              <div className="mt-2 h-2 w-2 rounded-full" style={{background: ms.completed?'#10B981':'#D1D5DB'}}></div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">{ms.name}</p>
                                {isManufacturer && (
                                  <label className="inline-flex items-center cursor-pointer text-xs text-blue-600">
                                    <Camera className="h-4 w-4 mr-1"/>
                                    <input type="file" multiple hidden onChange={(e)=>{if(e.target.files) handleMilestoneUpload(ms.id, Array.from(e.target.files));}} />
                                    Upload
                                  </label>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">{formatRelativeTime(ms.dueDate)}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'quotes' && (
                <div className="space-y-4">
                  {quotesLoading ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner size="lg" />
                    </div>
                  ) : quotes.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes yet</h3>
                      <p className="text-gray-500">Quotes will appear here when manufacturers submit them.</p>
                    </div>
                  ) : (
                    quotes.map((quote) => (
                      <div key={quote.id} className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              Quote #{quote.id}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Submitted {formatRelativeTime(quote.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              {formatCurrency(quote.totalAmount, quote.currency)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {quote.deliveryTime} days delivery
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Material</span>
                            <p className="text-sm text-gray-900 mt-1">{quote.material}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Process</span>
                            <p className="text-sm text-gray-900 mt-1">{quote.process}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Finish</span>
                            <p className="text-sm text-gray-900 mt-1">{quote.finish}</p>
                          </div>
                        </div>

                        {canAcceptQuotes && quote.status === QuoteStatus.SUBMITTED && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <button
                              onClick={() => navigate(`/quotes/${quote.id}`)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => handleAcceptQuote(quote)}
                              disabled={acceptQuoteMutation.isPending}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {acceptQuoteMutation.isPending ? 'Accepting...' : 'Accept Quote'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'messages' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex flex-col h-[400px]">
                    <div className="flex-1 overflow-y-auto space-y-3">
                      {messages.map((msg:any)=> (
                        <div key={msg.id} className="flex items-start space-x-2">
                          <User className="h-4 w-4 mt-1 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-900">{msg.senderName}</p>
                            <p className="text-xs text-gray-500">{formatRelativeTime(msg.createdAt)}</p>
                            <p className="text-sm mt-1">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex">
                      <input value={messageText} onChange={e=>setMessageText(e.target.value)} className="flex-1 border rounded-l px-3 py-2" placeholder="Type message" />
                      <button onClick={handleSendMessage} disabled={!messageText.trim() || sendMessageMutation.isPending} className="bg-blue-600 text-white px-4 rounded-r">Send</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'files' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Files & Attachments</h3>
                    <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center ${isDragActive?'border-blue-500':'border-gray-300'}`}>
                      <input {...getInputProps()} />
                      {uploading? 'Uploading...' : 'Drag & drop files here or click to upload'}
                    </div>
                  </div>
                  
                  {order.attachments && order.attachments.length > 0 ? (
                    <div className="space-y-3">
                      {order.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{file.name || `File ${index + 1}`}</span>
                          </div>
                          <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No files uploaded</h3>
                      <p className="text-gray-500">Upload files to share with manufacturers.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  {canCreateQuote && (
                    <button
                      onClick={() => navigate(`/quotes/create?orderId=${order.id}`)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Quote
                    </button>
                  )}
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Send Message
                  </button>
                  {order.selectedQuoteId && (
                    <button
                      onClick={() => navigate(`/payments/order/${order.id}`)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Make Payment
                    </button>
                  )}
                </div>
              </div>

              {/* Order Info */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Deadline</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(order.deliveryDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm font-medium text-gray-900">{order.preferredLocation || 'Any'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              {isManufacturer && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Contact</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Client Name</p>
                        <p className="text-xs text-gray-500">Contact information available after quote acceptance</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message Modal */}
        {showMessageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Message</h3>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex items-center justify-end space-x-3 mt-4">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{sendMessageMutation.isPending ? 'Sending...' : 'Send'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default OrderDetailPage; 