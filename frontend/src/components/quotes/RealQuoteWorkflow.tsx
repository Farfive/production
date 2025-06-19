import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CheckCircle, Clock, AlertTriangle, DollarSign, Calendar,
  Users, FileText, MessageSquare, TrendingUp, Shield,
  Package, Truck, Award, Star, ArrowRight, Download,
  Edit, Eye, ThumbsUp, ThumbsDown, MoreVertical
} from 'lucide-react';

import { quotesApi, ordersApi } from '../../lib/api';
import { 
  Quote, QuoteStatus, QuoteCreate, QuoteNegotiation, 
  Order, User, UserRole, QuoteEvaluation 
} from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Badge } from '../ui/badge';
import LoadingSpinner from '../ui/LoadingSpinner';

interface RealQuoteWorkflowProps {
  orderId?: number;
  quoteId?: number;
  mode: 'create' | 'manage' | 'evaluate' | 'comparison';
  onComplete?: (result: any) => void;
}

// Quote creation form for manufacturers
interface QuoteFormData {
  orderId: number;
  price: number;
  currency: string;
  deliveryDays: number;
  description: string;
  materialsSpecification: string;
  processDetails: string;
  qualityStandards: string;
  paymentTerms: string;
  validityDays: number;
  breakdown: {
    materials: number;
    labor: number;
    overhead: number;
    shipping: number;
    taxes: number;
  };
  certifications: string[];
  qualityDocumentation: string[];
  riskAssessment: string;
  complianceNotes: string;
}

const RealQuoteWorkflow: React.FC<RealQuoteWorkflowProps> = ({
  orderId,
  quoteId,
  mode,
  onComplete
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [quoteFormData, setQuoteFormData] = useState<Partial<QuoteFormData>>({
    currency: 'PLN',
    validityDays: 14,
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
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [negotiationMessage, setNegotiationMessage] = useState('');

  // Fetch order details for quote creation
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(orderId!),
    enabled: !!orderId && mode === 'create'
  });

  // Fetch quotes for evaluation/comparison
  const { data: quotes, isLoading: quotesLoading, refetch: refetchQuotes } = useQuery({
    queryKey: ['quotes', orderId],
    queryFn: () => quotesApi.getByOrderId(orderId!),
    enabled: !!orderId && (mode === 'evaluate' || mode === 'comparison')
  });

  // Fetch specific quote for management
  const { data: currentQuote, isLoading: quoteLoading } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => quotesApi.getById(quoteId!),
    enabled: !!quoteId && mode === 'manage'
  });

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: (data: QuoteCreate) => quotesApi.create(data),
    onSuccess: (quote) => {
      toast.success('Quote created successfully!');
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      onComplete?.(quote);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create quote');
    }
  });

  // Accept quote mutation
  const acceptQuoteMutation = useMutation({
    mutationFn: (quoteId: number) => quotesApi.acceptQuote(quoteId),
    onSuccess: () => {
      toast.success('Quote accepted successfully!');
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      refetchQuotes();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to accept quote');
    }
  });

  // Reject quote mutation
  const rejectQuoteMutation = useMutation({
    mutationFn: ({ quoteId, reason }: { quoteId: number; reason?: string }) => 
      quotesApi.rejectQuote(quoteId, reason),
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
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setNegotiationMessage('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send negotiation');
    }
  });

  // Calculate quote total
  const calculateTotal = () => {
    const breakdown = quoteFormData.breakdown || {};
    return Object.values(breakdown).reduce((sum, value) => sum + (value || 0), 0);
  };

  // Handle quote form submission
  const handleSubmitQuote = async () => {
    if (!orderId || !quoteFormData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    const quoteData: QuoteCreate = {
      order_id: orderId,
      price: quoteFormData.price,
      currency: quoteFormData.currency || 'PLN',
      delivery_days: quoteFormData.deliveryDays || 30,
      description: quoteFormData.description || '',
      payment_terms: quoteFormData.paymentTerms,
      notes: `Materials: ${quoteFormData.materialsSpecification}\n\nProcess: ${quoteFormData.processDetails}\n\nQuality: ${quoteFormData.qualityStandards}`,
      breakdown: {
        materials: quoteFormData.breakdown?.materials || 0,
        labor: quoteFormData.breakdown?.labor || 0,
        overhead: quoteFormData.breakdown?.overhead || 0,
        shipping: quoteFormData.breakdown?.shipping || 0,
        taxes: quoteFormData.breakdown?.taxes || 0,
        total: calculateTotal()
      },
      valid_until: new Date(Date.now() + (quoteFormData.validityDays || 14) * 24 * 60 * 60 * 1000).toISOString(),
      certifications: quoteFormData.certifications || [],
      quality_documentation: quoteFormData.qualityDocumentation || []
    };

    createQuoteMutation.mutate(quoteData);
  };

  // Handle quote acceptance
  const handleAcceptQuote = (quoteId: string) => {
    acceptQuoteMutation.mutate(parseInt(quoteId));
  };

  // Handle quote rejection
  const handleRejectQuote = (quoteId: string, reason?: string) => {
    rejectQuoteMutation.mutate({ quoteId: parseInt(quoteId), reason });
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
      requested_price: undefined, // Can be enhanced to include specific price requests
      requested_delivery_days: undefined
    };

    negotiateMutation.mutate({ quoteId: parseInt(quoteId), negotiation });
  };

  // Get quote status color
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

  // Render quote creation form (for manufacturers)
  const renderQuoteCreationForm = () => {
    if (!order) return null;

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create Quote for Order #{order.id}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {order.title}
          </p>
        </div>

        {/* Order Details Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Order Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Quantity:</strong> {order.quantity}
            </div>
            <div>
              <strong>Target Price:</strong> {order.targetPrice ? `${order.targetPrice} ${order.currency}` : 'Not specified'}
            </div>
            <div>
              <strong>Delivery Date:</strong> {new Date(order.deliveryDate).toLocaleDateString()}
            </div>
            <div>
              <strong>Category:</strong> {order.category}
            </div>
          </div>
          <div className="mt-4">
            <strong>Description:</strong>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{order.description}</p>
          </div>
        </Card>

        {/* Quote Form Steps */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
          {/* Step Indicator */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${currentStep >= step 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`
                      w-16 h-1 mx-2
                      ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span>Pricing</span>
              <span>Details</span>
              <span>Quality</span>
              <span>Review</span>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Pricing & Timeline</h3>
                
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

                {/* Cost Breakdown */}
                <div>
                  <h4 className="text-md font-medium mb-4">Cost Breakdown</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Materials</label>
                      <input
                        type="number"
                        value={quoteFormData.breakdown?.materials || ''}
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
                        value={quoteFormData.breakdown?.labor || ''}
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
                        value={quoteFormData.breakdown?.overhead || ''}
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
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Technical Details</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Quote Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={quoteFormData.description || ''}
                    onChange={(e) => setQuoteFormData(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Detailed description of what you will deliver..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Materials Specification</label>
                  <textarea
                    value={quoteFormData.materialsSpecification || ''}
                    onChange={(e) => setQuoteFormData(prev => ({
                      ...prev,
                      materialsSpecification: e.target.value
                    }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Specify materials, grades, sources..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Manufacturing Process</label>
                  <textarea
                    value={quoteFormData.processDetails || ''}
                    onChange={(e) => setQuoteFormData(prev => ({
                      ...prev,
                      processDetails: e.target.value
                    }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe your manufacturing process, equipment, techniques..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Payment Terms</label>
                  <select
                    value={quoteFormData.paymentTerms || ''}
                    onChange={(e) => setQuoteFormData(prev => ({
                      ...prev,
                      paymentTerms: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select payment terms</option>
                    <option value="50% upfront, 50% on delivery">50% upfront, 50% on delivery</option>
                    <option value="30% upfront, 70% on delivery">30% upfront, 70% on delivery</option>
                    <option value="Full payment on delivery">Full payment on delivery</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Custom terms">Custom terms</option>
                  </select>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Quality & Compliance</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Quality Standards</label>
                  <textarea
                    value={quoteFormData.qualityStandards || ''}
                    onChange={(e) => setQuoteFormData(prev => ({
                      ...prev,
                      qualityStandards: e.target.value
                    }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe quality control processes, inspection methods, tolerances..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Certifications</label>
                  <div className="space-y-2">
                    {['ISO 9001', 'ISO 14001', 'AS9100', 'IATF 16949', 'ISO 13485'].map((cert) => (
                      <label key={cert} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={quoteFormData.certifications?.includes(cert) || false}
                          onChange={(e) => {
                            const certs = quoteFormData.certifications || [];
                            if (e.target.checked) {
                              setQuoteFormData(prev => ({
                                ...prev,
                                certifications: [...certs, cert]
                              }));
                            } else {
                              setQuoteFormData(prev => ({
                                ...prev,
                                certifications: certs.filter(c => c !== cert)
                              }));
                            }
                          }}
                          className="mr-2"
                        />
                        {cert}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Quality Documentation</label>
                  <div className="space-y-2">
                    {['Material Certificates', 'Process Validation', 'First Article Inspection', 'Final Inspection Report'].map((doc) => (
                      <label key={doc} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={quoteFormData.qualityDocumentation?.includes(doc) || false}
                          onChange={(e) => {
                            const docs = quoteFormData.qualityDocumentation || [];
                            if (e.target.checked) {
                              setQuoteFormData(prev => ({
                                ...prev,
                                qualityDocumentation: [...docs, doc]
                              }));
                            } else {
                              setQuoteFormData(prev => ({
                                ...prev,
                                qualityDocumentation: docs.filter(d => d !== doc)
                              }));
                            }
                          }}
                          className="mr-2"
                        />
                        {doc}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Review & Submit</h3>
                
                {/* Quote Summary */}
                <Card className="p-4 bg-gray-50 dark:bg-gray-700">
                  <h4 className="font-medium mb-3">Quote Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Total Price:</strong> {quoteFormData.price} {quoteFormData.currency}
                    </div>
                    <div>
                      <strong>Delivery:</strong> {quoteFormData.deliveryDays} days
                    </div>
                    <div>
                      <strong>Valid Until:</strong> {new Date(Date.now() + (quoteFormData.validityDays || 14) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Payment Terms:</strong> {quoteFormData.paymentTerms || 'Not specified'}
                    </div>
                  </div>
                  
                  {quoteFormData.certifications && quoteFormData.certifications.length > 0 && (
                    <div className="mt-4">
                      <strong>Certifications:</strong>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {quoteFormData.certifications.map(cert => (
                          <Badge key={cert} variant="outline">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" />
                    <div>
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-300">
                        Important Information
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                        Once submitted, this quote will be sent to the client. Make sure all details are accurate as changes will require creating a new revision.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            
            {currentStep < 4 ? (
              <Button
                onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
                disabled={currentStep === 1 && !quoteFormData.price}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmitQuote}
                disabled={createQuoteMutation.isPending}
                leftIcon={createQuoteMutation.isPending ? <LoadingSpinner size="sm" /> : undefined}
              >
                Submit Quote
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render quote evaluation interface (for clients)
  const renderQuoteEvaluation = () => {
    if (!quotes?.quotes) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Evaluate Quotes
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Review and compare quotes for Order #{orderId}
          </p>
        </div>

        {quotes.quotes.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Quotes Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Quotes from manufacturers will appear here once they respond to your order.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {quotes.quotes.map((quote) => (
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

                {/* Quote Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      Due: {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'No expiry'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      Rating: {quote.manufacturer?.rating || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      Projects: {quote.manufacturer?.completedProjects || 0}
                    </span>
                  </div>
                </div>

                {/* Quote Description */}
                {quote.notes && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line">
                      {quote.notes}
                    </p>
                  </div>
                )}

                {/* Cost Breakdown */}
                {quote.breakdown && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-2">Cost Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Materials:</span>
                        <div className="font-medium">{quote.breakdown.materials || 0} {quote.currency}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Labor:</span>
                        <div className="font-medium">{quote.breakdown.labor || 0} {quote.currency}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Overhead:</span>
                        <div className="font-medium">{quote.breakdown.overhead || 0} {quote.currency}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Shipping:</span>
                        <div className="font-medium">{quote.breakdown.shipping || 0} {quote.currency}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <div className="font-bold">{quote.breakdown.total || quote.totalAmount} {quote.currency}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {quote.status === QuoteStatus.SENT || quote.status === QuoteStatus.VIEWED ? (
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
                        onClick={() => {
                          setNegotiationMessage('');
                          // Open negotiation modal or inline form
                        }}
                        leftIcon={<MessageSquare className="w-4 h-4" />}
                      >
                        Negotiate
                      </Button>
                      <Button
                        variant="outline"
                        color="red"
                        onClick={() => handleRejectQuote(quote.id, 'Not suitable for our requirements')}
                        disabled={rejectQuoteMutation.isPending}
                        leftIcon={<ThumbsDown className="w-4 h-4" />}
                      >
                        Reject
                      </Button>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Status: {quote.status}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render quote management interface (for manufacturers)
  const renderQuoteManagement = () => {
    if (!currentQuote) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Manage Quote #{currentQuote.id}
          </h1>
          <Badge color={getStatusColor(currentQuote.status)} size="lg" className="mt-2">
            {currentQuote.status}
          </Badge>
        </div>

        <Card className="p-6">
          {/* Quote details and management interface */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Quote Information</h3>
              <div className="space-y-3">
                <div>
                  <strong>Price:</strong> {currentQuote.totalAmount} {currentQuote.currency}
                </div>
                <div>
                  <strong>Delivery Time:</strong> {currentQuote.deliveryTime} days
                </div>
                <div>
                  <strong>Valid Until:</strong> {currentQuote.validUntil ? new Date(currentQuote.validUntil).toLocaleDateString() : 'No expiry'}
                </div>
                <div>
                  <strong>Created:</strong> {new Date(currentQuote.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Order Information</h3>
              <div className="space-y-3">
                <div>
                  <strong>Order ID:</strong> #{currentQuote.orderId}
                </div>
                <div>
                  <strong>Quantity:</strong> {currentQuote.quantity || 'Not specified'}
                </div>
                <div>
                  <strong>Material:</strong> {currentQuote.material || 'Not specified'}
                </div>
              </div>
            </div>
          </div>

          {currentQuote.notes && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                {currentQuote.notes}
              </p>
            </div>
          )}
        </Card>
      </div>
    );
  };

  // Loading states
  if (mode === 'create' && orderLoading) {
    return <LoadingSpinner center text="Loading order details..." />;
  }

  if ((mode === 'evaluate' || mode === 'comparison') && quotesLoading) {
    return <LoadingSpinner center text="Loading quotes..." />;
  }

  if (mode === 'manage' && quoteLoading) {
    return <LoadingSpinner center text="Loading quote..." />;
  }

  // Render appropriate interface based on mode
  return (
    <div className="max-w-6xl mx-auto p-6">
      {mode === 'create' && user?.role === UserRole.MANUFACTURER && renderQuoteCreationForm()}
      {(mode === 'evaluate' || mode === 'comparison') && user?.role === UserRole.CLIENT && renderQuoteEvaluation()}
      {mode === 'manage' && renderQuoteManagement()}
    </div>
  );
};

export default RealQuoteWorkflow; 