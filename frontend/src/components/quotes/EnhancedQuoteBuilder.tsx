import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  Send,
  FileText,
  DollarSign,
  Clock,
  Package,
  Settings,
  Calculator,
  Upload,
  X,
  Plus,
  Minus,
  Copy,
  Eye,
  AlertTriangle,
  CheckCircle,
  Wand2
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import Input from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import Select from '../ui/Select';
import { Switch } from '../ui/Switch';
import LoadingSpinner from '../ui/LoadingSpinner';
import { quotesApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import QuoteTemplateSelector from './QuoteTemplateSelector';

interface CostBreakdown {
  materials: number;
  labor: number;
  overhead: number;
  shipping: number;
  taxes: number;
}

interface QuoteFormData {
  order_id: number;
  price: number;
  currency: string;
  delivery_days: number;
  description: string;
  includes_shipping: boolean;
  payment_terms: string;
  notes: string;
  material: string;
  process: string;
  finish: string;
  tolerance: string;
  quantity: number;
  shipping_method: string;
  warranty: string;
  breakdown: CostBreakdown;
  valid_until: string;
}

interface EnhancedQuoteBuilderProps {
  orderId?: number;
  onSave?: (quote: any) => void;
  onCancel?: () => void;
  initialData?: Partial<QuoteFormData>;
}

const EnhancedQuoteBuilder: React.FC<EnhancedQuoteBuilderProps> = ({
  orderId,
  onSave,
  onCancel,
  initialData
}) => {
  const queryClient = useQueryClient();
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [formData, setFormData] = useState<QuoteFormData>({
    order_id: orderId || 0,
    price: 0,
    currency: 'USD',
    delivery_days: 14,
    description: '',
    includes_shipping: true,
    payment_terms: 'Net 30',
    notes: '',
    material: '',
    process: '',
    finish: '',
    tolerance: '',
    quantity: 1,
    shipping_method: 'Standard',
    warranty: '1 Year',
    breakdown: {
      materials: 0,
      labor: 0,
      overhead: 0,
      shipping: 0,
      taxes: 0
    },
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDraft, setIsDraft] = useState(true);

  // Auto-calculate total price from breakdown
  useEffect(() => {
    const total = Object.values(formData.breakdown).reduce((sum: number, value: number) => sum + value, 0);
    if (total !== formData.price) {
      setFormData(prev => ({ ...prev, price: total }));
    }
  }, [formData.breakdown]);

  // Apply template data
  const applyTemplate = (template: any) => {
    if (!template) return;

    const templateData = template.template_data;
    setFormData(prev => ({
      ...prev,
      breakdown: templateData.pricing_breakdown || prev.breakdown,
      delivery_days: templateData.default_delivery_days || prev.delivery_days,
      payment_terms: templateData.payment_terms || prev.payment_terms,
      warranty: templateData.warranty || prev.warranty,
      notes: templateData.notes || prev.notes,
      material: templateData.material_options?.[0] || prev.material,
      process: templateData.process_options?.[0] || prev.process,
      finish: templateData.finish_options?.[0] || prev.finish,
    }));
    setSelectedTemplate(template);
  };

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: (data: any) => quotesApi.create(data),
    onSuccess: (data) => {
      toast.success('Quote created successfully');
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturer-quotes'] });
      onSave?.(data);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create quote');
    }
  });

  const handleSubmit = (e: React.FormEvent, asDraft = false) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    
    if (formData.delivery_days <= 0) {
      newErrors.delivery_days = 'Delivery days must be greater than 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    
    const submitData = {
      ...formData,
      status: asDraft ? 'draft' : 'sent'
    };
    
    createQuoteMutation.mutate(submitData);
  };

  const updateBreakdown = (key: keyof CostBreakdown, value: number) => {
    setFormData(prev => ({
      ...prev,
      breakdown: {
        ...prev.breakdown,
        [key]: value
      }
    }));
  };

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0';
  };

  const paymentTermsOptions = [
    { value: 'Net 15', label: 'Net 15' },
    { value: 'Net 30', label: 'Net 30' },
    { value: 'Net 45', label: 'Net 45' },
    { value: 'Net 60', label: 'Net 60' },
    { value: 'COD', label: 'Cash on Delivery' },
    { value: '50% Upfront', label: '50% Upfront, 50% on Delivery' }
  ];

  const shippingMethodOptions = [
    { value: 'Standard', label: 'Standard Shipping' },
    { value: 'Express', label: 'Express Shipping' },
    { value: 'Overnight', label: 'Overnight' },
    { value: 'Freight', label: 'Freight' },
    { value: 'Pickup', label: 'Customer Pickup' }
  ];

  const warrantyOptions = [
    { value: '30 Days', label: '30 Days' },
    { value: '90 Days', label: '90 Days' },
    { value: '6 Months', label: '6 Months' },
    { value: '1 Year', label: '1 Year' },
    { value: '2 Years', label: '2 Years' },
    { value: 'Lifetime', label: 'Lifetime' }
  ];

  return (
    <>
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Create Quote
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Order #{orderId} • {selectedTemplate ? `Using template: ${selectedTemplate.name}` : 'Custom quote'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowTemplateSelector(true)}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
                {selectedTemplate && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedTemplate(null);
                      // Reset to default values
                      setFormData(prev => ({
                        ...prev,
                        breakdown: { materials: 0, labor: 0, overhead: 0, shipping: 0, taxes: 0 },
                        delivery_days: 14,
                        payment_terms: 'Net 30',
                        warranty: '1 Year',
                        notes: '',
                        material: '',
                        process: '',
                        finish: ''
                      }));
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Template
                  </Button>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Quote Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextArea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the work to be performed..."
                  rows={4}
                  error={errors.description}
                  required
                />
                
                <div className="space-y-4">
                  <Input
                    label="Delivery Days"
                    type="number"
                    value={formData.delivery_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_days: parseInt(e.target.value) || 0 }))}
                    min="1"
                    max="365"
                    errorText={errors.delivery_days}
                    required
                  />
                  
                  <Input
                    label="Valid Until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                  />
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.includes_shipping}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, includes_shipping: checked }))
                      }
                    />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Includes shipping
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Pricing Breakdown
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Materials"
                      type="number"
                      value={formData.breakdown.materials}
                      onChange={(e) => updateBreakdown('materials', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      step="0.01"
                    />
                    <div className="flex items-end">
                      <span className="text-sm text-gray-500 mb-2">
                        {calculatePercentage(formData.breakdown.materials, formData.price)}%
                      </span>
                    </div>
                    
                    <Input
                      label="Labor"
                      type="number"
                      value={formData.breakdown.labor}
                      onChange={(e) => updateBreakdown('labor', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      step="0.01"
                    />
                    <div className="flex items-end">
                      <span className="text-sm text-gray-500 mb-2">
                        {calculatePercentage(formData.breakdown.labor, formData.price)}%
                      </span>
                    </div>
                    
                    <Input
                      label="Overhead"
                      type="number"
                      value={formData.breakdown.overhead}
                      onChange={(e) => updateBreakdown('overhead', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      step="0.01"
                    />
                    <div className="flex items-end">
                      <span className="text-sm text-gray-500 mb-2">
                        {calculatePercentage(formData.breakdown.overhead, formData.price)}%
                      </span>
                    </div>
                    
                    <Input
                      label="Shipping"
                      type="number"
                      value={formData.breakdown.shipping}
                      onChange={(e) => updateBreakdown('shipping', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      step="0.01"
                    />
                    <div className="flex items-end">
                      <span className="text-sm text-gray-500 mb-2">
                        {calculatePercentage(formData.breakdown.shipping, formData.price)}%
                      </span>
                    </div>
                    
                    <Input
                      label="Taxes"
                      type="number"
                      value={formData.breakdown.taxes}
                      onChange={(e) => updateBreakdown('taxes', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      step="0.01"
                    />
                    <div className="flex items-end">
                      <span className="text-sm text-gray-500 mb-2">
                        {calculatePercentage(formData.breakdown.taxes, formData.price)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">Total Quote</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(formData.price, formData.currency)}</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(formData.price, formData.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Technical Specifications
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label="Material"
                  value={formData.material}
                  onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                  placeholder="e.g., Aluminum 6061-T6"
                />
                
                <Input
                  label="Process"
                  value={formData.process}
                  onChange={(e) => setFormData(prev => ({ ...prev, process: e.target.value }))}
                  placeholder="e.g., CNC Machining"
                />
                
                <Input
                  label="Finish"
                  value={formData.finish}
                  onChange={(e) => setFormData(prev => ({ ...prev, finish: e.target.value }))}
                  placeholder="e.g., Anodized"
                />
                
                <Input
                  label="Tolerance"
                  value={formData.tolerance}
                  onChange={(e) => setFormData(prev => ({ ...prev, tolerance: e.target.value }))}
                  placeholder="e.g., ±0.005 inches"
                />
                
                <Input
                  label="Quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  min="1"
                />
                
                <Select
                  label="Shipping Method"
                  value={formData.shipping_method}
                  onChange={(e) => setFormData(prev => ({ ...prev, shipping_method: e.target.value }))}
                  options={shippingMethodOptions}
                />
                
                <Select
                  label="Payment Terms"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                  options={paymentTermsOptions}
                />
                
                <Select
                  label="Warranty"
                  value={formData.warranty}
                  onChange={(e) => setFormData(prev => ({ ...prev, warranty: e.target.value }))}
                  options={warrantyOptions}
                />
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Additional Notes
              </h3>
              <TextArea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any additional information, terms, or conditions..."
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => handleSubmit(e, true)}
                  loading={createQuoteMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total: <span className="font-semibold">{formatCurrency(formData.price, formData.currency)}</span>
                </div>
                <Button
                  type="submit"
                  loading={createQuoteMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Quote
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <QuoteTemplateSelector
          onSelectTemplate={applyTemplate}
          onClose={() => setShowTemplateSelector(false)}
          selectedTemplate={selectedTemplate}
        />
      )}
    </>
  );
};

export default EnhancedQuoteBuilder; 