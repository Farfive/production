import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CheckCircle, XCircle, MessageSquare, Calendar,
  DollarSign, Clock, Star, Package, FileText, Send,
  AlertTriangle, ThumbsUp, ThumbsDown, Edit
} from 'lucide-react';

import { quotesApi, ordersApi } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import QuoteService from '../../services/quoteService';
import { 
  Quote, QuoteStatus, QuoteCreate, QuoteNegotiation, 
  Order, UserRole 
} from '../../types';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Badge } from '../../components/ui/badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// Interface for quote form data
interface QuoteFormData {
  price: number;
  currency: string;
  deliveryDays: number;
  description: string;
  paymentTerms: string;
  materialsSpecification: string;
  processDetails: string;
  qualityStandards: string;
  breakdown: {
    materials: number;
    labor: number;
    overhead: number;
    shipping: number;
    taxes: number;
  };
  certifications: string[];
  qualityDocumentation: string[];
}

const QuoteWorkflowPage: React.FC = () => {
  const { orderId, quoteId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mode = searchParams.get('mode') || 'evaluate';
  const [currentStep, setCurrentStep] = useState(1);
  const [showNegotiationForm, setShowNegotiationForm] = useState(false);
  const [negotiationMessage, setNegotiationMessage] = useState('');
  const [requestedPrice, setRequestedPrice] = useState('');
  const [requestedDeliveryDays, setRequestedDeliveryDays] = useState('');

  // Quote form data for creation
  const [quoteFormData, setQuoteFormData] = useState<QuoteFormData>({
    price: 0,
    currency: 'PLN',
    deliveryDays: 30,
    description: '',
    paymentTerms: '50% upfront, 50% on delivery',
    materialsSpecification: '',
    processDetails: '',
    qualityStandards: '',
    breakdown: {
      materials: 0,
      labor: 0,
      overhead: 0,
      shipping: 0,
      taxes: 0
    },
    certifications: [],
    qualityDocumentation: []
  });

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(parseInt(orderId!)),
    enabled: !!orderId
  });

  // Fetch quotes for the order
  const { data: quotesResponse, isLoading: quotesLoading, refetch: refetchQuotes } = useQuery({
    queryKey: ['quotes', 'order', orderId],
    queryFn: () => quotesApi.getByOrderId(parseInt(orderId!)),
    enabled: !!orderId && (mode === 'evaluate' || mode === 'comparison')
  });

  // Create quote mutation with enhanced validation
  const createQuoteMutation = useMutation({
    mutationFn: async (data: QuoteCreate) => {
      // Validate quote data before submission
      const validation = QuoteService.validateQuoteData(data);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      
      return await QuoteService.createQuote(data);
    },
    onSuccess: (quote) => {
      toast.success('Quote created successfully!');
      navigate(`/dashboard/quotes/${quote.id}?mode=manage`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create quote');
    }
  });

  // Accept quote mutation with workflow tracking
  const acceptQuoteMutation = useMutation({
    mutationFn: (quoteId: number) => QuoteService.acceptQuote(quoteId),
    onSuccess: () => {
      toast.success('Quote accepted successfully! Payment setup will begin.');
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      refetchQuotes();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to accept quote');
    }
  });

  // Reject quote mutation with workflow tracking
  const rejectQuoteMutation = useMutation({
    mutationFn: ({ quoteId, reason }: { quoteId: number; reason?: string }) =>
      QuoteService.rejectQuote(quoteId, reason),
    onSuccess: () => {
      toast.success('Quote rejected');
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      refetchQuotes();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject quote');
    }
  });

  // Negotiate quote mutation with workflow tracking
  const negotiateMutation = useMutation({
    mutationFn: ({ quoteId, negotiation }: { quoteId: number; negotiation: QuoteNegotiation }) =>
      QuoteService.requestNegotiation(quoteId, negotiation),
    onSuccess: () => {
      toast.success('Negotiation request sent!');
      setShowNegotiationForm(false);
      setNegotiationMessage('');
      setRequestedPrice('');
      setRequestedDeliveryDays('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send negotiation');
    }
  });

  // Calculate quote total
  const calculateTotal = (): number => {
    const breakdown = quoteFormData.breakdown;
    return (breakdown.materials || 0) + (breakdown.labor || 0) + (breakdown.overhead || 0) + (breakdown.shipping || 0) + (breakdown.taxes || 0);
  };

  // Handle quote creation submission
  const handleSubmitQuote = async () => {
    if (!orderId || !quoteFormData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    const quoteData: QuoteCreate = {
      order_id: parseInt(orderId),
      price: quoteFormData.price,
      currency: quoteFormData.currency,
      delivery_days: quoteFormData.deliveryDays,
      description: quoteFormData.description,
      payment_terms: quoteFormData.paymentTerms,
      notes: `Materials: ${quoteFormData.materialsSpecification}\n\nProcess: ${quoteFormData.processDetails}\n\nQuality: ${quoteFormData.qualityStandards}`,
      breakdown: {
        materials: quoteFormData.breakdown.materials,
        labor: quoteFormData.breakdown.labor,
        overhead: quoteFormData.breakdown.overhead,
        shipping: quoteFormData.breakdown.shipping,
        taxes: quoteFormData.breakdown.taxes,
        total: calculateTotal()
      },
      valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      certifications: quoteFormData.certifications,
      quality_documentation: quoteFormData.qualityDocumentation
    };

    createQuoteMutation.mutate(quoteData);
  };

  // Handle quote acceptance
  const handleAcceptQuote = (quoteId: string) => {
    if (window.confirm('Are you sure you want to accept this quote? This action cannot be undone.')) {
      acceptQuoteMutation.mutate(parseInt(quoteId));
    }
  };

  // Handle quote rejection
  const handleRejectQuote = (quoteId: string) => {
    const reason = window.prompt('Please provide a reason for rejection (optional):');
    rejectQuoteMutation.mutate({ quoteId: parseInt(quoteId), reason: reason || undefined });
  };

  // Handle negotiation
  const handleNegotiate = (quoteId: string) => {
    if (!negotiationMessage.trim()) {
      toast.error('Please enter negotiation details');
      return;
    }

    const negotiation: QuoteNegotiation = {
      quote_id: parseInt(quoteId),
      message: negotiationMessage,
      requested_price: requestedPrice ? parseFloat(requestedPrice) : undefined,
      requested_delivery_days: requestedDeliveryDays ? parseInt(requestedDeliveryDays) : undefined
    };

    negotiateMutation.mutate({ quoteId: parseInt(quoteId), negotiation });
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

  // Access control
  useEffect(() => {
    if (!user) return;

    if (user.role === UserRole.MANUFACTURER && mode === 'evaluate') {
      navigate('/dashboard/quotes');
      toast.error('Manufacturers cannot evaluate quotes');
      return;
    }

    if (user.role === UserRole.CLIENT && mode === 'create') {
      navigate('/dashboard/orders');
      toast.error('Clients cannot create quotes directly');
      return;
    }
  }, [user, mode, navigate]);

  if (orderLoading || quotesLoading) {
    return <LoadingSpinner center text="Loading..." />;
  }

  // Render quote creation form (for manufacturers)
  if (mode === 'create' && user?.role === UserRole.MANUFACTURER) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard/quotes')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Quotes
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create Quote for Order #{orderId}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {order?.title}
            </p>
          </div>
        </div>

        {/* Order Summary */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Order Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Quantity:</strong> {order?.quantity}
            </div>
            <div>
              <strong>Target Price:</strong> {order?.targetPrice ? `${order.targetPrice} ${order.currency}` : 'Not specified'}
            </div>
            <div>
              <strong>Delivery Date:</strong> {order?.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Not specified'}
            </div>
            <div>
              <strong>Category:</strong> {order?.category}
            </div>
          </div>
          {order?.description && (
            <div className="mt-4">
              <strong>Description:</strong>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{order.description}</p>
            </div>
          )}
        </Card>

        {/* Quote Form */}
        <Card className="p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Quote Price <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <input
                    type="number"
                    value={quoteFormData.price || ''}
                    onChange={(e) => setQuoteFormData(prev => ({
                      ...prev,
                      price: parseFloat(e.target.value) || 0
                    }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                  <select
                    value={quoteFormData.currency}
                    onChange={(e) => setQuoteFormData(prev => ({
                      ...prev,
                      currency: e.target.value
                    }))}
                    className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="PLN">PLN</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Delivery Time <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={quoteFormData.deliveryDays || ''}
                    onChange={(e) => setQuoteFormData(prev => ({
                      ...prev,
                      deliveryDays: parseInt(e.target.value) || 0
                    }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="30"
                  />
                  <span className="px-3 py-2 bg-gray-50 border border-l-0 border-gray-300 rounded-r-md text-gray-500">
                    days
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={quoteFormData.description}
                onChange={(e) => setQuoteFormData(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Detailed description of what you will deliver..."
              />
            </div>

            {/* Cost Breakdown */}
            <div>
              <h4 className="text-md font-medium mb-4">Cost Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Materials</label>
                  <input
                    type="number"
                    value={quoteFormData.breakdown.materials || ''}
                    onChange={(e) => setQuoteFormData(prev => ({
                      ...prev,
                      breakdown: {
                        ...prev.breakdown,
                        materials: parseFloat(e.target.value) || 0
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Labor</label>
                  <input
                    type="number"
                    value={quoteFormData.breakdown.labor || ''}
                    onChange={(e) => setQuoteFormData(prev => ({
                      ...prev,
                      breakdown: {
                        ...prev.breakdown,
                        labor: parseFloat(e.target.value) || 0
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Overhead</label>
                  <input
                    type="number"
                    value={quoteFormData.breakdown.overhead || ''}
                    onChange={(e) => setQuoteFormData(prev => ({
                      ...prev,
                      breakdown: {
                        ...prev.breakdown,
                        overhead: parseFloat(e.target.value) || 0
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="mt-4 text-right">
                <strong>Total: {calculateTotal().toFixed(2)} {quoteFormData.currency}</strong>
              </div>
            </div>

            {/* Payment Terms */}
            <div>
              <label className="block text-sm font-medium mb-2">Payment Terms</label>
              <select
                value={quoteFormData.paymentTerms}
                onChange={(e) => setQuoteFormData(prev => ({
                  ...prev,
                  paymentTerms: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="50% upfront, 50% on delivery">50% upfront, 50% on delivery</option>
                <option value="30% upfront, 70% on delivery">30% upfront, 70% on delivery</option>
                <option value="Full payment on delivery">Full payment on delivery</option>
                <option value="Net 30">Net 30</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitQuote}
                disabled={createQuoteMutation.isPending || !quoteFormData.price || !quoteFormData.description}
                leftIcon={createQuoteMutation.isPending ? <LoadingSpinner size="sm" /> : undefined}
              >
                Submit Quote
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Render quote evaluation (for clients)
  if ((mode === 'evaluate' || mode === 'comparison') && user?.role === UserRole.CLIENT) {
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
              Budget: {order?.targetPrice ? `${order.targetPrice} ${order.currency}` : 'Not specified'}
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
                        onClick={() => handleAcceptQuote(quote.id)}
                        disabled={acceptQuoteMutation.isPending}
                        leftIcon={<CheckCircle className="w-4 h-4" />}
                      >
                        Accept Quote
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowNegotiationForm(true)}
                        leftIcon={<MessageSquare className="w-4 h-4" />}
                      >
                        Negotiate
                      </Button>
                      <Button
                        variant="outline"
                        color="red"
                        onClick={() => handleRejectQuote(quote.id)}
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
                    value={negotiationMessage}
                    onChange={(e) => setNegotiationMessage(e.target.value)}
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
                      value={requestedPrice}
                      onChange={(e) => setRequestedPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Optional"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Requested Delivery (days)</label>
                    <input
                      type="number"
                      value={requestedDeliveryDays}
                      onChange={(e) => setRequestedDeliveryDays(e.target.value)}
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
                  onClick={() => handleNegotiate(quotes[0]?.id || '')}
                  disabled={negotiateMutation.isPending || !negotiationMessage.trim()}
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

  // Fallback
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Invalid Access
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          You don't have permission to access this workflow.
        </p>
        <Button onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Card>
    </div>
  );
};

export default QuoteWorkflowPage; 