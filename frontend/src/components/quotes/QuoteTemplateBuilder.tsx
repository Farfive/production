import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  Plus,
  Trash2,
  Copy,
  Eye,
  Settings,
  DollarSign,
  Clock,
  Package,
  FileText,
  Tag,
  Globe,
  Lock
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import Input from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import Select from '../ui/Select';
import { Switch } from '../ui/Switch';
import { quoteTemplatesApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

interface QuoteTemplateData {
  pricing_breakdown: {
    materials: number;
    labor: number;
    overhead: number;
    shipping: number;
    taxes: number;
  };
  default_delivery_days: number;
  payment_terms: string;
  warranty: string;
  notes: string;
  material_options: string[];
  process_options: string[];
  finish_options: string[];
}

interface QuoteTemplateBuilderProps {
  template?: any;
  onSave?: (template: any) => void;
  onCancel?: () => void;
}

const QuoteTemplateBuilder: React.FC<QuoteTemplateBuilderProps> = ({
  template,
  onSave,
  onCancel
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!template;

  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    is_public: template?.is_public || false,
    template_data: template?.template_data || {
      pricing_breakdown: {
        materials: 0,
        labor: 0,
        overhead: 0,
        shipping: 0,
        taxes: 0
      },
      default_delivery_days: 14,
      payment_terms: 'Net 30',
      warranty: '1 Year',
      notes: '',
      material_options: [],
      process_options: [],
      finish_options: []
    } as QuoteTemplateData
  });

  const [newMaterial, setNewMaterial] = useState('');
  const [newProcess, setNewProcess] = useState('');
  const [newFinish, setNewFinish] = useState('');

  const createMutation = useMutation({
    mutationFn: quoteTemplatesApi.create,
    onSuccess: (data) => {
      toast.success('Template created successfully');
      queryClient.invalidateQueries({ queryKey: ['quote-templates'] });
      onSave?.(data);
    },
    onError: () => {
      toast.error('Failed to create template');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      quoteTemplatesApi.update(id, data),
    onSuccess: (data) => {
      toast.success('Template updated successfully');
      queryClient.invalidateQueries({ queryKey: ['quote-templates'] });
      onSave?.(data);
    },
    onError: () => {
      toast.error('Failed to update template');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing) {
      updateMutation.mutate({ id: template.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const updateTemplateData = (key: keyof QuoteTemplateData, value: any) => {
    setFormData(prev => ({
      ...prev,
      template_data: {
        ...prev.template_data,
        [key]: value
      }
    }));
  };

  const updatePricingBreakdown = (key: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      template_data: {
        ...prev.template_data,
        pricing_breakdown: {
          ...prev.template_data.pricing_breakdown,
          [key]: value
        }
      }
    }));
  };

  const addOption = (type: 'material_options' | 'process_options' | 'finish_options', value: string) => {
    if (!value.trim()) return;
    
    const currentOptions = formData.template_data[type] || [];
    if (currentOptions.includes(value)) {
      toast.error('Option already exists');
      return;
    }

    updateTemplateData(type, [...currentOptions, value]);
    
    // Clear input
    if (type === 'material_options') setNewMaterial('');
    if (type === 'process_options') setNewProcess('');
    if (type === 'finish_options') setNewFinish('');
  };

  const removeOption = (type: 'material_options' | 'process_options' | 'finish_options', index: number) => {
    const currentOptions = formData.template_data[type] || [];
    updateTemplateData(type, currentOptions.filter((_: any, i: number) => i !== index));
  };

  const calculateTotal = () => {
    const breakdown = formData.template_data.pricing_breakdown;
    return breakdown.materials + breakdown.labor + breakdown.overhead + breakdown.shipping + breakdown.taxes;
  };

  const paymentTermsOptions = [
    { value: 'Net 15', label: 'Net 15' },
    { value: 'Net 30', label: 'Net 30' },
    { value: 'Net 45', label: 'Net 45' },
    { value: 'Net 60', label: 'Net 60' },
    { value: 'COD', label: 'Cash on Delivery' },
    { value: '50% Upfront', label: '50% Upfront, 50% on Delivery' }
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Quote Template' : 'Create Quote Template'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Build reusable templates to speed up quote creation
              </p>
            </div>
            <div className="flex items-center gap-2">
              {formData.is_public ? (
                <div className="flex items-center text-green-600">
                  <Globe className="h-4 w-4 mr-1" />
                  <span className="text-sm">Public</span>
                </div>
              ) : (
                <div className="flex items-center text-gray-600">
                  <Lock className="h-4 w-4 mr-1" />
                  <span className="text-sm">Private</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Template Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Standard CNC Machining"
                required
              />
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, is_public: checked }))
                  }
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Make template public (visible to all manufacturers)
                </label>
              </div>
            </div>

            <TextArea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe when to use this template..."
              rows={3}
            />
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Default Pricing Breakdown
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Materials"
                type="number"
                value={formData.template_data.pricing_breakdown.materials}
                onChange={(e) => updatePricingBreakdown('materials', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                step="0.01"
              />
              
              <Input
                label="Labor"
                type="number"
                value={formData.template_data.pricing_breakdown.labor}
                onChange={(e) => updatePricingBreakdown('labor', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                step="0.01"
              />
              
              <Input
                label="Overhead"
                type="number"
                value={formData.template_data.pricing_breakdown.overhead}
                onChange={(e) => updatePricingBreakdown('overhead', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                step="0.01"
              />
              
              <Input
                label="Shipping"
                type="number"
                value={formData.template_data.pricing_breakdown.shipping}
                onChange={(e) => updatePricingBreakdown('shipping', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                step="0.01"
              />
              
              <Input
                label="Taxes"
                type="number"
                value={formData.template_data.pricing_breakdown.taxes}
                onChange={(e) => updatePricingBreakdown('taxes', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                step="0.01"
              />
              
              <div className="flex items-end">
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Total
                  </label>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-lg font-semibold">
                    {formatCurrency(calculateTotal(), 'USD')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Default Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Default Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Default Delivery Days"
                type="number"
                value={formData.template_data.default_delivery_days}
                onChange={(e) => updateTemplateData('default_delivery_days', parseInt(e.target.value) || 14)}
                min="1"
                max="365"
              />
              
              <Select
                label="Payment Terms"
                value={formData.template_data.payment_terms}
                onChange={(value) => updateTemplateData('payment_terms', value)}
                options={paymentTermsOptions}
              />
              
              <Select
                label="Warranty"
                value={formData.template_data.warranty}
                onChange={(value) => updateTemplateData('warranty', value)}
                options={warrantyOptions}
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Tag className="h-5 w-5 mr-2" />
              Available Options
            </h3>
            
            {/* Material Options */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Material Options
              </label>
              <div className="flex gap-2">
                <Input
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  placeholder="Add material option..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption('material_options', newMaterial))}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addOption('material_options', newMaterial)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.template_data.material_options.map((option: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {option}
                    <button
                      type="button"
                      onClick={() => removeOption('material_options', index)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Process Options */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Process Options
              </label>
              <div className="flex gap-2">
                <Input
                  value={newProcess}
                  onChange={(e) => setNewProcess(e.target.value)}
                  placeholder="Add process option..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption('process_options', newProcess))}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addOption('process_options', newProcess)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.template_data.process_options.map((option: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    {option}
                    <button
                      type="button"
                      onClick={() => removeOption('process_options', index)}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Finish Options */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Finish Options
              </label>
              <div className="flex gap-2">
                <Input
                  value={newFinish}
                  onChange={(e) => setNewFinish(e.target.value)}
                  placeholder="Add finish option..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption('finish_options', newFinish))}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addOption('finish_options', newFinish)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.template_data.finish_options.map((option: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                  >
                    {option}
                    <button
                      type="button"
                      onClick={() => removeOption('finish_options', index)}
                      className="ml-1 text-purple-600 hover:text-purple-800"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Default Notes
            </h3>
            <TextArea
              value={formData.template_data.notes}
              onChange={(e) => updateTemplateData('notes', e.target.value)}
              placeholder="Add default notes that will appear in quotes using this template..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuoteTemplateBuilder; 