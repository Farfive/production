import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calculator,
  Calendar,
  DollarSign,
  FileText,
  Package,
  Save,
  Send,
  Shield,
  Truck,
  Eye,
  Plus,
  Minus,
  Info,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

import { quotesApi, ordersApi, queryKeys } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';
import { Order, QuoteCreate, UserRole } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBoundary from '../../components/ui/ErrorBoundary';

const CreateQuotePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { measureApiCall } = usePerformanceMonitoring();

  // Local state
  const [step, setStep] = useState<'details' | 'breakdown' | 'terms' | 'preview'>('details');
  const [quoteData, setQuoteData] = useState<QuoteCreate>({
    orderId: Number(orderId) || 0,
    totalAmount: 0,
    currency: 'USD',
    deliveryTime: 7,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    material: '',
    process: '',
    finish: '',
    tolerance: '',
    quantity: 1,
    paymentTerms: 'Net 30',
    shippingMethod: 'Standard',
    warranty: '1 Year',
    notes: '',
    breakdown: {
      materials: 0,
      labor: 0,
      overhead: 0,
      shipping: 0,
      taxes: 0,
      total: 0,
      currency: 'USD'
    }
  });

  // Fetch order details
  const {
    data: order,
    isLoading: orderLoading,
    error: orderError
  } = useQuery({
    queryKey: queryKeys.orders.detail(Number(orderId)),
    queryFn: () => ordersApi.getById(Number(orderId!)),
    enabled: !!orderId,
    staleTime: 30000,
  });

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: async (data: QuoteCreate) => {
      return measureApiCall('quotes.create', () => quotesApi.create(data));
    },
    onSuccess: (quote: any) => {
      toast.success('Quote created successfully');
      navigate(`/quotes/${quote.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create quote');
    },
  });

  // Initialize quote data from order
  useEffect(() => {
    if (order) {
      setQuoteData(prev => ({
        ...prev,
        orderId: order.id,
        quantity: order.quantity,
        material: order.material || prev.material,
        process: prev.process,
        finish: prev.finish,
        tolerance: prev.tolerance
      }));
    }
  }, [order]);

  // Update total when breakdown changes
  useEffect(() => {
    if (quoteData.breakdown) {
      const total = 
        quoteData.breakdown.materials +
        quoteData.breakdown.labor +
        quoteData.breakdown.overhead +
        quoteData.breakdown.shipping +
        quoteData.breakdown.taxes;
      
      setQuoteData(prev => ({
        ...prev,
        totalAmount: total,
        breakdown: {
          ...prev.breakdown!,
          total
        }
      }));
    }
  }, [
    quoteData.breakdown?.materials,
    quoteData.breakdown?.labor,
    quoteData.breakdown?.overhead,
    quoteData.breakdown?.shipping,
    quoteData.breakdown?.taxes
  ]);

  const handleBreakdownChange = (field: keyof typeof quoteData.breakdown, value: number) => {
    if (!quoteData.breakdown) return;
    
    setQuoteData(prev => ({
      ...prev,
      breakdown: {
        ...prev.breakdown!,
        [field]: value
      }
    }));
  };

  const handleSubmitQuote = () => {
    if (!validateQuote()) return;
    createQuoteMutation.mutate(quoteData);
  };

  const validateQuote = () => {
    if (quoteData.totalAmount <= 0) {
      toast.error('Total amount must be greater than 0');
      return false;
    }
    if (quoteData.deliveryTime <= 0) {
      toast.error('Delivery time must be greater than 0');
      return false;
    }
    if (!quoteData.material.trim()) {
      toast.error('Material is required');
      return false;
    }
    if (!quoteData.process.trim()) {
      toast.error('Process is required');
      return false;
    }
    return true;
  };

  const canProceedToNext = () => {
    switch (step) {
      case 'details':
        return quoteData.material && quoteData.process && quoteData.deliveryTime > 0;
      case 'breakdown':
        return quoteData.totalAmount > 0;
      case 'terms':
        return quoteData.paymentTerms && quoteData.warranty;
      default:
        return true;
    }
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
          <p className="text-gray-600 mb-4">Unable to load order details for quote creation.</p>
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

  if (user?.role !== UserRole.MANUFACTURER) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Only manufacturers can create quotes.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    { key: 'details', label: 'Quote Details', icon: <FileText className="h-4 w-4" /> },
    { key: 'breakdown', label: 'Cost Breakdown', icon: <Calculator className="h-4 w-4" /> },
    { key: 'terms', label: 'Terms & Delivery', icon: <Truck className="h-4 w-4" /> },
    { key: 'preview', label: 'Preview & Submit', icon: <Eye className="h-4 w-4" /> }
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
                  <h1 className="text-2xl font-bold text-gray-900">Create Quote</h1>
                  <p className="text-gray-600">Order: {order.title}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View Order
                </button>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center space-x-8 pb-6">
              {steps.map((stepItem, index) => (
                <div key={stepItem.key} className="flex items-center space-x-2">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    step === stepItem.key
                      ? 'bg-blue-600 text-white'
                      : steps.findIndex(s => s.key === step) > index
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {steps.findIndex(s => s.key === step) > index ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      stepItem.icon
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    step === stepItem.key ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {stepItem.label}
                  </span>
                  {index < steps.length - 1 && (
                    <div className="w-8 h-0.5 bg-gray-200 ml-4" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-6">
                {step === 'details' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Quote Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Material *</label>
                        <input
                          type="text"
                          value={quoteData.material}
                          onChange={(e) => setQuoteData({ ...quoteData, material: e.target.value })}
                          placeholder="e.g., Aluminum 6061-T6"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturing Process *</label>
                        <input
                          type="text"
                          value={quoteData.process}
                          onChange={(e) => setQuoteData({ ...quoteData, process: e.target.value })}
                          placeholder="e.g., CNC Machining"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Finish</label>
                        <input
                          type="text"
                          value={quoteData.finish}
                          onChange={(e) => setQuoteData({ ...quoteData, finish: e.target.value })}
                          placeholder="e.g., Anodized"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tolerance</label>
                        <input
                          type="text"
                          value={quoteData.tolerance}
                          onChange={(e) => setQuoteData({ ...quoteData, tolerance: e.target.value })}
                          placeholder="e.g., ±0.005 inches"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                        <input
                          type="number"
                          value={quoteData.quantity}
                          onChange={(e) => setQuoteData({ ...quoteData, quantity: Number(e.target.value) })}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Time (days) *</label>
                        <input
                          type="number"
                          value={quoteData.deliveryTime}
                          onChange={(e) => setQuoteData({ ...quoteData, deliveryTime: Number(e.target.value) })}
                          min="1"
                          max="365"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                      <textarea
                        value={quoteData.notes}
                        onChange={(e) => setQuoteData({ ...quoteData, notes: e.target.value })}
                        rows={4}
                        placeholder="Any special considerations or notes for the client..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {step === 'breakdown' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Cost Breakdown</h3>
                      <div className="text-2xl font-bold text-gray-900">
                        Total: {formatCurrency(quoteData.totalAmount, quoteData.currency)}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Materials Cost</label>
                          <input
                            type="number"
                            value={quoteData.breakdown?.materials || 0}
                            onChange={(e) => handleBreakdownChange('materials', Number(e.target.value))}
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Labor Cost</label>
                          <input
                            type="number"
                            value={quoteData.breakdown?.labor || 0}
                            onChange={(e) => handleBreakdownChange('labor', Number(e.target.value))}
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Overhead</label>
                          <input
                            type="number"
                            value={quoteData.breakdown?.overhead || 0}
                            onChange={(e) => handleBreakdownChange('overhead', Number(e.target.value))}
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Shipping</label>
                          <input
                            type="number"
                            value={quoteData.breakdown?.shipping || 0}
                            onChange={(e) => handleBreakdownChange('shipping', Number(e.target.value))}
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Taxes</label>
                          <input
                            type="number"
                            value={quoteData.breakdown?.taxes || 0}
                            onChange={(e) => handleBreakdownChange('taxes', Number(e.target.value))}
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                          <select
                            value={quoteData.currency}
                            onChange={(e) => setQuoteData({ ...quoteData, currency: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="PLN">PLN</option>
                          </select>
                        </div>
                      </div>

                      {/* Visual breakdown */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Cost Distribution</h4>
                        <div className="space-y-2">
                          {[
                            { label: 'Materials', value: quoteData.breakdown?.materials || 0, color: 'bg-blue-500' },
                            { label: 'Labor', value: quoteData.breakdown?.labor || 0, color: 'bg-green-500' },
                            { label: 'Overhead', value: quoteData.breakdown?.overhead || 0, color: 'bg-yellow-500' },
                            { label: 'Shipping', value: quoteData.breakdown?.shipping || 0, color: 'bg-purple-500' },
                            { label: 'Taxes', value: quoteData.breakdown?.taxes || 0, color: 'bg-red-500' }
                          ].map((item) => {
                            const percentage = quoteData.totalAmount > 0 ? (item.value / quoteData.totalAmount) * 100 : 0;
                            return (
                              <div key={item.label} className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded ${item.color}`} />
                                <div className="flex-1 flex justify-between">
                                  <span className="text-sm text-gray-600">{item.label}</span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {formatCurrency(item.value, quoteData.currency)} ({percentage.toFixed(1)}%)
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 'terms' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Terms & Conditions</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
                        <select
                          value={quoteData.paymentTerms}
                          onChange={(e) => setQuoteData({ ...quoteData, paymentTerms: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="Net 15">Net 15</option>
                          <option value="Net 30">Net 30</option>
                          <option value="Net 60">Net 60</option>
                          <option value="50% upfront">50% upfront</option>
                          <option value="Full upfront">Full upfront</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Method</label>
                        <select
                          value={quoteData.shippingMethod}
                          onChange={(e) => setQuoteData({ ...quoteData, shippingMethod: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="Standard">Standard</option>
                          <option value="Express">Express</option>
                          <option value="Overnight">Overnight</option>
                          <option value="Freight">Freight</option>
                          <option value="Pickup">Customer Pickup</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Period</label>
                        <select
                          value={quoteData.warranty}
                          onChange={(e) => setQuoteData({ ...quoteData, warranty: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="30 Days">30 Days</option>
                          <option value="90 Days">90 Days</option>
                          <option value="6 Months">6 Months</option>
                          <option value="1 Year">1 Year</option>
                          <option value="2 Years">2 Years</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quote Valid Until</label>
                        <input
                          type="date"
                          value={quoteData.validUntil.split('T')[0]}
                          onChange={(e) => setQuoteData({ 
                            ...quoteData, 
                            validUntil: new Date(e.target.value).toISOString() 
                          })}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 'preview' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Quote Preview</h3>
                    
                    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                      <div className="text-center mb-6">
                        <h4 className="text-2xl font-bold text-gray-900">
                          {formatCurrency(quoteData.totalAmount, quoteData.currency)}
                        </h4>
                        <p className="text-gray-600">Total Quote Amount</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Technical Specifications</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Material:</span>
                              <span>{quoteData.material}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Process:</span>
                              <span>{quoteData.process}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Finish:</span>
                              <span>{quoteData.finish || 'Standard'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Quantity:</span>
                              <span>{quoteData.quantity}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Terms & Delivery</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Delivery:</span>
                              <span>{quoteData.deliveryTime} days</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Payment:</span>
                              <span>{quoteData.paymentTerms}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Shipping:</span>
                              <span>{quoteData.shippingMethod}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Warranty:</span>
                              <span>{quoteData.warranty}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {quoteData.notes && (
                        <div className="border-t border-gray-200 pt-4">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Additional Notes</h5>
                          <p className="text-sm text-gray-600">{quoteData.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const currentIndex = steps.findIndex(s => s.key === step);
                      if (currentIndex > 0) {
                        setStep(steps[currentIndex - 1].key as any);
                      }
                    }}
                    disabled={step === 'details'}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  
                  {step === 'preview' ? (
                    <button
                      onClick={handleSubmitQuote}
                      disabled={createQuoteMutation.isPending || !validateQuote()}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                    >
                      <Send className="h-4 w-4" />
                      <span>{createQuoteMutation.isPending ? 'Submitting...' : 'Submit Quote'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const currentIndex = steps.findIndex(s => s.key === step);
                        if (currentIndex < steps.length - 1) {
                          setStep(steps[currentIndex + 1].key as any);
                        }
                      }}
                      disabled={!canProceedToNext()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{order.title}</h4>
                    <p className="text-xs text-gray-500">Order #{order.id}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="font-medium">{order.quantity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Budget:</span>
                      <span className="font-medium">{formatCurrency(order.budgetPln, 'PLN')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Deadline:</span>
                      <span className="font-medium">{formatDate(order.deliveryDeadline)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quote Progress */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Progress</h3>
                <div className="space-y-3">
                  {steps.map((stepItem, index) => (
                    <div key={stepItem.key} className="flex items-center space-x-3">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                        step === stepItem.key
                          ? 'bg-blue-600 text-white'
                          : steps.findIndex(s => s.key === step) > index
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {steps.findIndex(s => s.key === step) > index ? '✓' : index + 1}
                      </div>
                      <span className={`text-sm ${
                        step === stepItem.key ? 'font-medium text-blue-600' : 'text-gray-600'
                      }`}>
                        {stepItem.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">Quote Tips</h3>
                    <ul className="text-xs text-blue-800 mt-2 space-y-1">
                      <li>• Be competitive but fair with pricing</li>
                      <li>• Provide detailed material specifications</li>
                      <li>• Include realistic delivery timelines</li>
                      <li>• Add notes for complex requirements</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default CreateQuotePage; 