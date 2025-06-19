import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Clock, CheckCircle, XCircle, AlertTriangle,
  MessageSquare, FileText, DollarSign, Calendar, Star,
  ThumbsUp, ThumbsDown, Edit, Download, Send
} from 'lucide-react';

import { quotesApi, ordersApi } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { 
  Quote, QuoteStatus, Order, UserRole, QuoteCreate,
  QuoteNegotiation, QuoteNegotiationResponse 
} from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Badge } from '../ui/badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import RealQuoteWorkflow from './RealQuoteWorkflow';

interface QuoteWorkflowManagerProps {
  orderId?: number;
  quoteId?: number;
  mode?: 'create' | 'manage' | 'evaluate' | 'comparison';
}

const QuoteWorkflowManager: React.FC<QuoteWorkflowManagerProps> = ({
  orderId: propOrderId,
  quoteId: propQuoteId,
  mode: propMode
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const queryClient = useQueryClient();

  // Extract IDs from URL params if not provided as props
  const orderId = propOrderId || (params.orderId ? parseInt(params.orderId) : undefined);
  const quoteId = propQuoteId || (params.quoteId ? parseInt(params.quoteId) : undefined);
  const mode = propMode || (params.mode as any) || 'evaluate';

  const [activeTab, setActiveTab] = useState<'overview' | 'negotiations' | 'documents' | 'history'>('overview');
  const [showNegotiationForm, setShowNegotiationForm] = useState(false);
  const [negotiationData, setNegotiationData] = useState({
    message: '',
    requestedPrice: '',
    requestedDeliveryDays: ''
  });

  // Fetch order details
  const { data: order, isLoading: orderLoading, error: orderError } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(orderId!),
    enabled: !!orderId
  });

  // Fetch quotes for the order
  const { data: quotesResponse, isLoading: quotesLoading, refetch: refetchQuotes } = useQuery({
    queryKey: ['quotes', 'order', orderId],
    queryFn: () => quotesApi.getByOrderId(orderId!),
    enabled: !!orderId && (mode === 'evaluate' || mode === 'comparison')
  });

  // Fetch specific quote details
  const { data: currentQuote, isLoading: quoteLoading } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => quotesApi.getById(quoteId!),
    enabled: !!quoteId
  });

  // Fetch negotiations for a quote
  const { data: negotiations, isLoading: negotiationsLoading } = useQuery({
    queryKey: ['negotiations', quoteId],
    queryFn: () => quotesApi.getNegotiations(quoteId!),
    enabled: !!quoteId && activeTab === 'negotiations'
  });

  // Accept quote mutation
  const acceptQuoteMutation = useMutation({
    mutationFn: (id: number) => quotesApi.acceptQuote(id),
    onSuccess: () => {
      toast.success('Quote accepted successfully!');
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refetchQuotes();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to accept quote');
    }
  });

  // Reject quote mutation
  const rejectQuoteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => 
      quotesApi.rejectQuote(id, reason),
    onSuccess: () => {
      toast.success('Quote rejected');
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      refetchQuotes();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject quote');
    }
  });

  // Negotiate quote mutation
  const negotiateMutation = useMutation({
    mutationFn: ({ quoteId, negotiation }: { quoteId: number; negotiation: QuoteNegotiation }) =>
      quotesApi.requestNegotiation(quoteId, negotiation),
    onSuccess: () => {
      toast.success('Negotiation request sent!');
      setShowNegotiationForm(false);
      setNegotiationData({ message: '', requestedPrice: '', requestedDeliveryDays: '' });
      queryClient.invalidateQueries({ queryKey: ['negotiations', quoteId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send negotiation');
    }
  });

  // Handle quote acceptance
  const handleAcceptQuote = (id: number) => {
    if (window.confirm('Are you sure you want to accept this quote? This action cannot be undone.')) {
      acceptQuoteMutation.mutate(id);
    }
  };

  // Handle quote rejection
  const handleRejectQuote = (id: number) => {
    const reason = window.prompt('Please provide a reason for rejection (optional):');
    rejectQuoteMutation.mutate({ id, reason: reason || undefined });
  };

  // Handle negotiation submission
  const handleSubmitNegotiation = () => {
    if (!quoteId || !negotiationData.message.trim()) {
      toast.error('Please enter negotiation details');
      return;
    }

    const negotiation: QuoteNegotiation = {
      quote_id: quoteId,
      message: negotiationData.message,
      requested_price: negotiationData.requestedPrice ? parseFloat(negotiationData.requestedPrice) : undefined,
      requested_delivery_days: negotiationData.requestedDeliveryDays ? parseInt(negotiationData.requestedDeliveryDays) : undefined
    };

    negotiateMutation.mutate({ quoteId, negotiation });
  };

  // Get status color for badges
  const getStatusColor = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.DRAFT: return 'gray';
      case QuoteStatus.PENDING: return 'yellow';
      case QuoteStatus.SENT: return 'blue';
      case QuoteStatus.VIEWED: return 'indigo';
      case QuoteStatus.ACCEPTED: return 'green';
      case QuoteStatus.REJECTED: return 'red';
      case QuoteStatus.NEGOTIATING: return 'orange';
      case QuoteStatus.EXPIRED: return 'gray';
      default: return 'gray';
    }
  };

  // Handle mode-specific redirections and access control
  useEffect(() => {
    if (!user) return;

    // Redirect manufacturers trying to evaluate quotes
    if (user.role === UserRole.MANUFACTURER && mode === 'evaluate') {
      navigate('/dashboard/quotes');
      toast.error('Manufacturers cannot evaluate quotes');
      return;
    }

    // Redirect clients trying to create quotes
    if (user.role === UserRole.CLIENT && mode === 'create') {
      navigate('/dashboard/orders');
      toast.error('Clients cannot create quotes directly');
      return;
    }
  }, [user, mode, navigate]);

  // Render quote creation workflow for manufacturers
  if (mode === 'create' && user?.role === UserRole.MANUFACTURER) {
    return (
      <RealQuoteWorkflow
        orderId={orderId}
        mode="create"
        onComplete={(quote) => {
          navigate(`/dashboard/quotes/${quote.id}`);
        }}
      />
    );
  }

  // Render quote management for manufacturers
  if (mode === 'manage' && quoteId) {
    if (quoteLoading) {
      return <LoadingSpinner center text="Loading quote details..." />;
    }

    if (!currentQuote) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Quote Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The quote you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/dashboard/quotes')}>
              Back to Quotes
            </Button>
          </Card>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard/quotes')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Quotes
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Quote #{currentQuote.id}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge color={getStatusColor(currentQuote.status)}>
                  {currentQuote.status}
                </Badge>
                <span className="text-sm text-gray-500">
                  Order #{currentQuote.orderId}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {currentQuote.totalAmount} {currentQuote.currency}
            </div>
            <div className="text-sm text-gray-500">
              {currentQuote.deliveryTime} days delivery
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: FileText },
              { id: 'negotiations', label: 'Negotiations', icon: MessageSquare },
              { id: 'documents', label: 'Documents', icon: Download },
              { id: 'history', label: 'History', icon: Clock }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`
                  flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm
                  ${activeTab === id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quote Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Total Amount</span>
                    <div className="text-lg font-semibold">
                      {currentQuote.totalAmount} {currentQuote.currency}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Delivery Time</span>
                    <div className="text-lg font-semibold">
                      {currentQuote.deliveryTime} days
                    </div>
                  </div>
                </div>

                {currentQuote.breakdown && (
                  <div>
                    <span className="text-sm text-gray-500">Cost Breakdown</span>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Materials:</span>
                        <span>{currentQuote.breakdown.materials} {currentQuote.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Labor:</span>
                        <span>{currentQuote.breakdown.labor} {currentQuote.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overhead:</span>
                        <span>{currentQuote.breakdown.overhead} {currentQuote.currency}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-1 border-t">
                        <span>Total:</span>
                        <span>{currentQuote.breakdown.total} {currentQuote.currency}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-sm text-gray-500">Valid Until</span>
                  <div>
                    {currentQuote.validUntil 
                      ? new Date(currentQuote.validUntil).toLocaleDateString()
                      : 'No expiry date'
                    }
                  </div>
                </div>

                <div>
                  <span className="text-sm text-gray-500">Payment Terms</span>
                  <div>{currentQuote.paymentTerms || 'Standard terms'}</div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Order Information</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500">Order ID</span>
                  <div className="font-semibold">#{currentQuote.orderId}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Material</span>
                  <div>{currentQuote.material || 'Not specified'}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Process</span>
                  <div>{currentQuote.process || 'Not specified'}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Quantity</span>
                  <div>{currentQuote.quantity || 'Not specified'}</div>
                </div>
              </div>
            </Card>

            {currentQuote.notes && (
              <Card className="p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Description & Notes</h3>
                <div className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                  {currentQuote.notes}
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'negotiations' && (
          <div className="space-y-6">
            {negotiationsLoading ? (
              <LoadingSpinner center text="Loading negotiations..." />
            ) : (
              <>
                {negotiations && negotiations.length > 0 ? (
                  <div className="space-y-4">
                    {negotiations.map((negotiation: QuoteNegotiationResponse) => (
                      <Card key={negotiation.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge color="orange">Negotiation</Badge>
                              <span className="text-sm text-gray-500">
                                {new Date(negotiation.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="mt-2 text-gray-700 dark:text-gray-300">
                              {negotiation.message}
                            </p>
                            {(negotiation.requested_price || negotiation.requested_delivery_days) && (
                              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                {negotiation.requested_price && (
                                  <div>Requested Price: {negotiation.requested_price} {currentQuote.currency}</div>
                                )}
                                {negotiation.requested_delivery_days && (
                                  <div>Requested Delivery: {negotiation.requested_delivery_days} days</div>
                                )}
                              </div>
                            )}
                          </div>
                          <Badge color={negotiation.status === 'pending' ? 'yellow' : 
                                      negotiation.status === 'accepted' ? 'green' : 'red'}>
                            {negotiation.status}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Negotiations
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      No negotiation requests have been made for this quote.
                    </p>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <Card className="p-8 text-center">
            <Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Documents
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Quote documents and attachments will appear here.
            </p>
          </Card>
        )}

        {activeTab === 'history' && (
          <Card className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Quote History
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Quote status changes and activity history will appear here.
            </p>
          </Card>
        )}
      </div>
    );
  }

  // Render quote evaluation for clients
  if ((mode === 'evaluate' || mode === 'comparison') && user?.role === UserRole.CLIENT) {
    if (quotesLoading || orderLoading) {
      return <LoadingSpinner center text="Loading quotes..." />;
    }

    if (orderError) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Order Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The order you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/dashboard/orders')}>
              Back to Orders
            </Button>
          </Card>
        </div>
      );
    }

    const quotes = quotesResponse?.quotes || [];

    return (
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard/orders')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Orders
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Quotes for Order #{orderId}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {order?.title}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">
              {quotes.length} Quote{quotes.length !== 1 ? 's' : ''} Received
            </div>
            <div className="text-sm text-gray-500">
              Budget: {order?.targetPrice} {order?.currency}
            </div>
          </div>
        </div>

        {quotes.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Quotes Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Manufacturers will submit quotes for your order. You'll be notified when quotes arrive.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {quotes.map((quote: Quote) => (
              <Card key={quote.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {quote.manufacturer?.companyName || 'Unknown Manufacturer'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color={getStatusColor(quote.status)}>
                        {quote.status}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Submitted {new Date(quote.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {quote.totalAmount} {quote.currency}
                    </div>
                    <div className="text-sm text-gray-500">
                      {quote.deliveryTime} days delivery
                    </div>
                  </div>
                </div>

                {/* Quote metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      Valid until: {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'No expiry'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      Rating: {quote.manufacturer?.rating || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      Completed: {quote.manufacturer?.completedProjects || 0} projects
                    </span>
                  </div>
                </div>

                {/* Quote description */}
                {quote.notes && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line">
                      {quote.notes}
                    </p>
                  </div>
                )}

                {/* Cost breakdown */}
                {quote.breakdown && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Cost Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Materials:</span>
                        <div className="font-medium">{quote.breakdown.materials} {quote.currency}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Labor:</span>
                        <div className="font-medium">{quote.breakdown.labor} {quote.currency}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Overhead:</span>
                        <div className="font-medium">{quote.breakdown.overhead} {quote.currency}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Shipping:</span>
                        <div className="font-medium">{quote.breakdown.shipping} {quote.currency}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <div className="font-bold">{quote.breakdown.total} {quote.currency}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {(quote.status === QuoteStatus.SENT || quote.status === QuoteStatus.VIEWED) && (
                    <>
                      <Button
                        onClick={() => handleAcceptQuote(parseInt(quote.id))}
                        disabled={acceptQuoteMutation.isPending}
                        leftIcon={<CheckCircle className="w-4 h-4" />}
                      >
                        Accept Quote
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setQuoteId(parseInt(quote.id));
                          setShowNegotiationForm(true);
                        }}
                        leftIcon={<MessageSquare className="w-4 h-4" />}
                      >
                        Negotiate
                      </Button>
                      <Button
                        variant="outline"
                        color="red"
                        onClick={() => handleRejectQuote(parseInt(quote.id))}
                        disabled={rejectQuoteMutation.isPending}
                        leftIcon={<XCircle className="w-4 h-4" />}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  
                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/dashboard/quotes/${quote.id}`)}
                    leftIcon={<FileText className="w-4 h-4" />}
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Negotiation Modal */}
        {showNegotiationForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Negotiate Quote</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea
                    value={negotiationData.message}
                    onChange={(e) => setNegotiationData(prev => ({
                      ...prev,
                      message: e.target.value
                    }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Explain your negotiation request..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Requested Price</label>
                    <input
                      type="number"
                      value={negotiationData.requestedPrice}
                      onChange={(e) => setNegotiationData(prev => ({
                        ...prev,
                        requestedPrice: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Optional"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Requested Delivery (days)</label>
                    <input
                      type="number"
                      value={negotiationData.requestedDeliveryDays}
                      onChange={(e) => setNegotiationData(prev => ({
                        ...prev,
                        requestedDeliveryDays: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="ghost"
                  onClick={() => setShowNegotiationForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitNegotiation}
                  disabled={negotiateMutation.isPending || !negotiationData.message.trim()}
                  leftIcon={negotiateMutation.isPending ? <LoadingSpinner size="sm" /> : <Send className="w-4 h-4" />}
                >
                  Send Negotiation
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Fallback for unsupported modes or unauthorized access
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Invalid Access
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          You don't have permission to access this workflow or the mode is not supported.
        </p>
        <Button onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Card>
    </div>
  );
};

export default QuoteWorkflowManager; 