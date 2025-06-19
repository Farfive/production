import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Award,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  FileText,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  ShieldCheck,
  Star,
  TrendingUp,
  Truck,
  User,
  AlertTriangle,
  Info,
  Calculator,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Send
} from 'lucide-react';

import { quotesApi, ordersApi, queryKeys } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';
import { Quote, QuoteStatus, UserRole, Order } from '../../types';
import { formatCurrency, formatDate, formatRelativeTime } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBoundary from '../../components/ui/ErrorBoundary';

const QuoteDetailPage: React.FC = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { measureApiCall } = usePerformanceMonitoring();

  // Local state
  const [activeTab, setActiveTab] = useState<'details' | 'breakdown' | 'manufacturer' | 'terms'>('details');
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [negotiationMessage, setNegotiationMessage] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  // Fetch quote details
  const {
    data: quote,
    isLoading: quoteLoading,
    error: quoteError,
    refetch: refetchQuote
  } = useQuery({
    queryKey: queryKeys.quotes.detail(Number(quoteId)),
    queryFn: () => quotesApi.getById(Number(quoteId!)),
    enabled: !!quoteId,
    staleTime: 30000,
  });

  // Fetch order details
  const {
    data: order,
    isLoading: orderLoading
  } = useQuery({
    queryKey: queryKeys.orders.detail(Number(quote?.orderId || 0)),
    queryFn: () => ordersApi.getById(Number(quote!.orderId)),
    enabled: !!quote?.orderId,
    staleTime: 30000,
  });

  // Fetch competing quotes for comparison
  const {
    data: competingQuotes,
    isLoading: competingQuotesLoading
  } = useQuery({
    queryKey: ['quotes', 'competing', quote?.orderId],
    queryFn: () => quotesApi.getByOrderId(Number(quote!.orderId)),
    enabled: !!quote?.orderId && user?.role === UserRole.CLIENT,
    staleTime: 30000,
  });

  // Accept quote mutation
  const acceptQuoteMutation = useMutation({
    mutationFn: () => quotesApi.acceptQuote(Number(quoteId!)),
    onSuccess: () => {
      toast.success('Quote accepted successfully!');
      setShowAcceptModal(false);
      refetchQuote();
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      // Navigate to payment
      navigate(`/payments/quote/${quoteId}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to accept quote');
    },
  });

  // Reject quote mutation
  const rejectQuoteMutation = useMutation({
    mutationFn: (reason: string) => quotesApi.rejectQuote(Number(quoteId!), reason),
    onSuccess: () => {
      toast.success('Quote rejected');
      refetchQuote();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject quote');
    },
  });

  // Negotiate quote mutation
  const negotiateMutation = useMutation({
    mutationFn: (message: string) => quotesApi.requestNegotiation(Number(quoteId!), { 
      quote_id: Number(quoteId!),
      message 
    }),
    onSuccess: () => {
      toast.success('Negotiation request sent!');
      setShowNegotiateModal(false);
      setNegotiationMessage('');
      refetchQuote();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send negotiation request');
    },
  });

  if (quoteLoading || orderLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (quoteError || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Quote not found</h2>
          <p className="text-gray-600 mb-4">The quote you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => navigate('/quotes')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Quotes
          </button>
        </div>
      </div>
    );
  }

  const isClient = user?.role === UserRole.CLIENT;
  const isManufacturer = user?.role === UserRole.MANUFACTURER;
  const canAcceptQuote = isClient && quote.status === QuoteStatus.SUBMITTED;
  const canNegotiate = isClient && quote.status === QuoteStatus.SUBMITTED;
  
  const otherQuotes = competingQuotes?.quotes?.filter(q => q.id !== quote.id) || [];

  const getStatusColor = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.SUBMITTED:
        return 'bg-blue-100 text-blue-800';
      case QuoteStatus.ACCEPTED:
        return 'bg-green-100 text-green-800';
      case QuoteStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      case QuoteStatus.NEGOTIATING:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.SUBMITTED:
        return <Clock className="h-4 w-4" />;
      case QuoteStatus.ACCEPTED:
        return <CheckCircle className="h-4 w-4" />;
      case QuoteStatus.REJECTED:
        return <ThumbsDown className="h-4 w-4" />;
      case QuoteStatus.NEGOTIATING:
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const handleAcceptQuote = () => {
    acceptQuoteMutation.mutate();
  };

  const handleRejectQuote = () => {
    const reason = window.prompt('Please provide a reason for rejection (optional):');
    rejectQuoteMutation.mutate(reason || '');
  };

  const handleNegotiate = () => {
    if (!negotiationMessage.trim()) return;
    negotiateMutation.mutate(negotiationMessage);
  };

  const calculateSavings = () => {
    if (otherQuotes.length === 0) return null;
    const prices = otherQuotes.map(q => q.totalAmount);
    const maxPrice = Math.max(...prices);
    const savings = maxPrice - quote.totalAmount;
    const savingsPercent = (savings / maxPrice) * 100;
    return { amount: savings, percent: savingsPercent };
  };

  const savings = calculateSavings();

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
                  <h1 className="text-2xl font-bold text-gray-900">Quote #{quote.id}</h1>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                      {getStatusIcon(quote.status)}
                      <span className="ml-1">{quote.status}</span>
                    </span>
                    <span className="text-sm text-gray-500">
                      Submitted {formatRelativeTime(quote.createdAt)}
                    </span>
                    {savings && savings.amount > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {savings.percent.toFixed(1)}% savings
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {isClient && otherQuotes.length > 0 && (
                  <button
                    onClick={() => setShowComparison(!showComparison)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                  >
                    <Calculator className="h-4 w-4" />
                    <span>Compare ({otherQuotes.length})</span>
                  </button>
                )}
                
                {canNegotiate && (
                  <button
                    onClick={() => setShowNegotiateModal(true)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Negotiate
                  </button>
                )}
                
                {canAcceptQuote && (
                  <button
                    onClick={() => setShowAcceptModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Accept Quote
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-8">
              {[
                { key: 'details', label: 'Quote Details', icon: <FileText className="h-4 w-4" /> },
                { key: 'breakdown', label: 'Cost Breakdown', icon: <Calculator className="h-4 w-4" /> },
                { key: 'manufacturer', label: 'Manufacturer', icon: <Building className="h-4 w-4" /> },
                { key: 'terms', label: 'Terms & Conditions', icon: <ShieldCheck className="h-4 w-4" /> }
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
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Quote Overview */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-gray-900">
                          {formatCurrency(quote.totalAmount, quote.currency)}
                        </div>
                        <div className="text-sm text-gray-500">Total Amount</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {quote.deliveryTime}
                        </div>
                        <div className="text-sm text-gray-500">Days Delivery</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center">
                          <Star className="h-6 w-6 text-yellow-400 mr-1" />
                          <span className="text-3xl font-bold text-gray-900">4.8</span>
                        </div>
                        <div className="text-sm text-gray-500">Manufacturer Rating</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Technical Specifications</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Material:</span>
                            <span className="text-sm font-medium text-gray-900">{quote.material}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Process:</span>
                            <span className="text-sm font-medium text-gray-900">{quote.process}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Finish:</span>
                            <span className="text-sm font-medium text-gray-900">{quote.finish}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Tolerance:</span>
                            <span className="text-sm font-medium text-gray-900">{quote.tolerance}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Production Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Quantity:</span>
                            <span className="text-sm font-medium text-gray-900">{quote.quantity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Production Time:</span>
                            <span className="text-sm font-medium text-gray-900">{quote.deliveryTime} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Valid Until:</span>
                            <span className="text-sm font-medium text-gray-900">{quote.validUntil ? formatDate(quote.validUntil) : 'Not set'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {quote.notes && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Additional Notes</h4>
                        <p className="text-sm text-gray-600">{quote.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Quality Indicators */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Assurance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <ShieldCheck className="h-8 w-8 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{quote.warranty}</p>
                          <p className="text-xs text-gray-500">Warranty Period</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <Award className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">ISO 9001</p>
                          <p className="text-xs text-gray-500">Quality Certified</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <Truck className="h-8 w-8 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{quote.shippingMethod}</p>
                          <p className="text-xs text-gray-500">Shipping Method</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'breakdown' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Cost Breakdown</h3>
                  
                  {quote.breakdown ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Materials</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(quote.breakdown.materials, quote.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Labor</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(quote.breakdown.labor, quote.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Overhead</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(quote.breakdown.overhead, quote.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Shipping</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(quote.breakdown.shipping, quote.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Taxes</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(quote.breakdown.taxes, quote.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t-2 border-gray-300">
                        <span className="text-lg font-semibold text-gray-900">Total</span>
                        <span className="text-lg font-bold text-gray-900">
                          {formatCurrency(quote.breakdown.total, quote.currency)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calculator className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Detailed breakdown not available</h3>
                      <p className="text-gray-500">Contact the manufacturer for a detailed cost breakdown.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'manufacturer' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Manufacturer Information</h3>
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Manufacturer Details</h3>
                    <p className="text-gray-500">Manufacturer information will be available after quote acceptance.</p>
                  </div>
                </div>
              )}

              {activeTab === 'terms' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Terms & Conditions</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Payment Terms</h4>
                      <p className="text-sm text-gray-600">{quote.paymentTerms}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Delivery Terms</h4>
                      <p className="text-sm text-gray-600">
                        Delivery within {quote.deliveryTime} days via {quote.shippingMethod}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Warranty</h4>
                      <p className="text-sm text-gray-600">{quote.warranty} warranty included</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Validity</h4>
                      <p className="text-sm text-gray-600">
                        This quote is valid until {quote.validUntil ? formatDate(quote.validUntil) : 'not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                <div className="space-y-3">
                  {canAcceptQuote && (
                    <button
                      onClick={() => setShowAcceptModal(true)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span>Accept Quote</span>
                    </button>
                  )}
                  {canNegotiate && (
                    <button
                      onClick={() => setShowNegotiateModal(true)}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Negotiate
                    </button>
                  )}
                  {canAcceptQuote && (
                    <button
                      onClick={handleRejectQuote}
                      className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center space-x-2"
                    >
                      <ThumbsDown className="h-4 w-4" />
                      <span>Reject</span>
                    </button>
                  )}
                  <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Quote Summary */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Summary</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Total Amount</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(quote.totalAmount, quote.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Delivery Time</p>
                      <p className="text-sm font-medium text-gray-900">{quote.deliveryTime} days</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Valid Until</p>
                      <p className="text-sm font-medium text-gray-900">{quote.validUntil ? formatDate(quote.validUntil) : 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparison with other quotes */}
              {isClient && otherQuotes.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Comparison</h3>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      {otherQuotes.length} other quote{otherQuotes.length !== 1 ? 's' : ''} received
                    </div>
                    {savings && savings.amount > 0 && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-900">
                            Save {formatCurrency(savings.amount, quote.currency)}
                          </span>
                        </div>
                        <p className="text-xs text-green-700 mt-1">
                          {savings.percent.toFixed(1)}% less than highest quote
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accept Quote Modal */}
        {showAcceptModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Accept Quote</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to accept this quote for {formatCurrency(quote.totalAmount, quote.currency)}?
                This action cannot be undone.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowAcceptModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcceptQuote}
                  disabled={acceptQuoteMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {acceptQuoteMutation.isPending ? 'Accepting...' : 'Accept Quote'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Negotiate Modal */}
        {showNegotiateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Negotiation</h3>
              <p className="text-sm text-gray-600 mb-4">
                Send a message to the manufacturer to negotiate terms, pricing, or delivery time.
              </p>
              <textarea
                value={negotiationMessage}
                onChange={(e) => setNegotiationMessage(e.target.value)}
                placeholder="Describe what you'd like to negotiate..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              />
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowNegotiateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNegotiate}
                  disabled={!negotiationMessage.trim() || negotiateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{negotiateMutation.isPending ? 'Sending...' : 'Send Request'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default QuoteDetailPage; 