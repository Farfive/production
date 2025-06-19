import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus, Edit, Trash2, Copy, FileText, Save, X,
  Star, StarOff, Eye, Settings, Download, Upload
} from 'lucide-react';

import { quoteTemplatesApi } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { UserRole, CapabilityCategory } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Badge } from '../ui/badge';
import LoadingSpinner from '../ui/LoadingSpinner';

interface QuoteTemplate {
  id: number;
  name: string;
  description: string;
  category: CapabilityCategory;
  isPublic: boolean;
  createdBy: number;
  createdByName: string;
  usageCount: number;
  rating: number;
  template: {
    paymentTerms: string;
    deliveryDaysMin: number;
    deliveryDaysMax: number;
    priceStructure: {
      materialsPercentage: number;
      laborPercentage: number;
      overheadPercentage: number;
      profitMargin: number;
    };
    qualityStandards: string[];
    certifications: string[];
    processDetails: string;
    terms: string;
    notes: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface QuoteTemplateFormData {
  name: string;
  description: string;
  category: CapabilityCategory;
  isPublic: boolean;
  template: {
    paymentTerms: string;
    deliveryDaysMin: number;
    deliveryDaysMax: number;
    priceStructure: {
      materialsPercentage: number;
      laborPercentage: number;
      overheadPercentage: number;
      profitMargin: number;
    };
    qualityStandards: string[];
    certifications: string[];
    processDetails: string;
    terms: string;
    notes: string;
  };
}

const QuoteTemplateManager: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null);
  const [filterCategory, setFilterCategory] = useState<CapabilityCategory | 'all'>('all');
  const [showPublicOnly, setShowPublicOnly] = useState(false);

  const [formData, setFormData] = useState<QuoteTemplateFormData>({
    name: '',
    description: '',
    category: CapabilityCategory.CNC_MACHINING,
    isPublic: false,
    template: {
      paymentTerms: '50% upfront, 50% on delivery',
      deliveryDaysMin: 7,
      deliveryDaysMax: 30,
      priceStructure: {
        materialsPercentage: 40,
        laborPercentage: 35,
        overheadPercentage: 15,
        profitMargin: 10
      },
      qualityStandards: [],
      certifications: [],
      processDetails: '',
      terms: '',
      notes: ''
    }
  });

  // Fetch templates
  const { data: templates, isLoading, refetch } = useQuery({
    queryKey: ['quote-templates', showPublicOnly],
    queryFn: () => quoteTemplatesApi.list(showPublicOnly)
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: (data: QuoteTemplateFormData) => quoteTemplatesApi.create(data),
    onSuccess: () => {
      toast.success('Template created successfully!');
      setShowCreateForm(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create template');
    }
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<QuoteTemplateFormData> }) =>
      quoteTemplatesApi.update(id, data),
    onSuccess: () => {
      toast.success('Template updated successfully!');
      setEditingTemplate(null);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update template');
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => quoteTemplatesApi.delete(id),
    onSuccess: () => {
      toast.success('Template deleted successfully!');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete template');
    }
  });

  // Clone template mutation
  const cloneTemplateMutation = useMutation({
    mutationFn: async (template: QuoteTemplate) => {
      const cloneData = {
        ...formData,
        name: `${template.name} (Copy)`,
        description: template.description,
        category: template.category,
        template: template.template
      };
      return quoteTemplatesApi.create(cloneData);
    },
    onSuccess: () => {
      toast.success('Template cloned successfully!');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to clone template');
    }
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: CapabilityCategory.CNC_MACHINING,
      isPublic: false,
      template: {
        paymentTerms: '50% upfront, 50% on delivery',
        deliveryDaysMin: 7,
        deliveryDaysMax: 30,
        priceStructure: {
          materialsPercentage: 40,
          laborPercentage: 35,
          overheadPercentage: 15,
          profitMargin: 10
        },
        qualityStandards: [],
        certifications: [],
        processDetails: '',
        terms: '',
        notes: ''
      }
    });
  };

  // Handle edit template
  const handleEditTemplate = (template: QuoteTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      isPublic: template.isPublic,
      template: template.template
    });
    setShowCreateForm(true);
  };

  // Handle use template
  const handleUseTemplate = (template: QuoteTemplate) => {
    // Store template data in localStorage for quote creation
    localStorage.setItem('selectedQuoteTemplate', JSON.stringify(template));
    navigate('/dashboard/quotes/create?template=' + template.id);
    toast.success('Template loaded for quote creation');
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  // Handle delete
  const handleDelete = (template: QuoteTemplate) => {
    if (window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  // Filter templates
  const filteredTemplates = templates?.filter((template: QuoteTemplate) => {
    if (filterCategory !== 'all' && template.category !== filterCategory) {
      return false;
    }
    return true;
  }) || [];

  if (isLoading) {
    return <LoadingSpinner center text="Loading templates..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quote Templates
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage reusable quote templates to speed up your quoting process
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowPublicOnly(!showPublicOnly)}
            leftIcon={showPublicOnly ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
          >
            {showPublicOnly ? 'Show All' : 'Public Only'}
          </Button>
          {user?.role === UserRole.MANUFACTURER && (
            <Button
              onClick={() => setShowCreateForm(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Template
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Filter by Category:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as CapabilityCategory | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {Object.values(CapabilityCategory).map(category => (
              <option key={category} value={category}>
                {category.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template: QuoteTemplate) => (
          <Card key={template.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {template.description}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {template.isPublic && (
                  <Badge color="blue" size="sm">Public</Badge>
                )}
                <Badge color="gray" size="sm">
                  {template.category.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>

            {/* Template Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-500">Used:</span>
                <div className="font-medium">{template.usageCount} times</div>
              </div>
              <div>
                <span className="text-gray-500">Rating:</span>
                <div className="font-medium">★ {template.rating.toFixed(1)}</div>
              </div>
            </div>

            {/* Template Details Preview */}
            <div className="space-y-2 mb-4 text-sm">
              <div>
                <span className="text-gray-500">Payment:</span>
                <div className="font-medium">{template.template.paymentTerms}</div>
              </div>
              <div>
                <span className="text-gray-500">Delivery:</span>
                <div className="font-medium">
                  {template.template.deliveryDaysMin}-{template.template.deliveryDaysMax} days
                </div>
              </div>
              <div>
                <span className="text-gray-500">Profit Margin:</span>
                <div className="font-medium">{template.template.priceStructure.profitMargin}%</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleUseTemplate(template)}
                leftIcon={<FileText className="w-4 h-4" />}
              >
                Use Template
              </Button>
              
              {user?.role === UserRole.MANUFACTURER && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cloneTemplateMutation.mutate(template)}
                    leftIcon={<Copy className="w-4 h-4" />}
                  >
                    Clone
                  </Button>
                  
                  {template.createdBy === user.id && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTemplate(template)}
                        leftIcon={<Edit className="w-4 h-4" />}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        color="red"
                        onClick={() => handleDelete(template)}
                        leftIcon={<Trash2 className="w-4 h-4" />}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Creator Info */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
              Created by {template.createdByName} on {new Date(template.createdAt).toLocaleDateString()}
            </div>
          </Card>
        ))}
      </div>

      {/* Create/Edit Template Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
                leftIcon={<X className="w-4 h-4" />}
              >
                Close
              </Button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., CNC Machining Standard"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      category: e.target.value as CapabilityCategory 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.values(CapabilityCategory).map(category => (
                      <option key={category} value={category}>
                        {category.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe what this template is used for..."
                />
              </div>

              {/* Pricing Structure */}
              <div>
                <h3 className="text-lg font-medium mb-4">Pricing Structure</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Materials %</label>
                    <input
                      type="number"
                      value={formData.template.priceStructure.materialsPercentage}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        template: {
                          ...prev.template,
                          priceStructure: {
                            ...prev.template.priceStructure,
                            materialsPercentage: parseInt(e.target.value) || 0
                          }
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Labor %</label>
                    <input
                      type="number"
                      value={formData.template.priceStructure.laborPercentage}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        template: {
                          ...prev.template,
                          priceStructure: {
                            ...prev.template.priceStructure,
                            laborPercentage: parseInt(e.target.value) || 0
                          }
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Overhead %</label>
                    <input
                      type="number"
                      value={formData.template.priceStructure.overheadPercentage}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        template: {
                          ...prev.template,
                          priceStructure: {
                            ...prev.template.priceStructure,
                            overheadPercentage: parseInt(e.target.value) || 0
                          }
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Profit Margin %</label>
                    <input
                      type="number"
                      value={formData.template.priceStructure.profitMargin}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        template: {
                          ...prev.template,
                          priceStructure: {
                            ...prev.template.priceStructure,
                            profitMargin: parseInt(e.target.value) || 0
                          }
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery & Terms */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Min Delivery Days</label>
                  <input
                    type="number"
                    value={formData.template.deliveryDaysMin}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      template: {
                        ...prev.template,
                        deliveryDaysMin: parseInt(e.target.value) || 0
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max Delivery Days</label>
                  <input
                    type="number"
                    value={formData.template.deliveryDaysMax}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      template: {
                        ...prev.template,
                        deliveryDaysMax: parseInt(e.target.value) || 0
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Terms</label>
                  <select
                    value={formData.template.paymentTerms}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      template: {
                        ...prev.template,
                        paymentTerms: e.target.value
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="50% upfront, 50% on delivery">50% upfront, 50% on delivery</option>
                    <option value="30% upfront, 70% on delivery">30% upfront, 70% on delivery</option>
                    <option value="Full payment on delivery">Full payment on delivery</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                  </select>
                </div>
              </div>

              {/* Process Details */}
              <div>
                <label className="block text-sm font-medium mb-2">Process Details</label>
                <textarea
                  value={formData.template.processDetails}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    template: {
                      ...prev.template,
                      processDetails: e.target.value
                    }
                  }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the manufacturing process, equipment, and techniques..."
                />
              </div>

              {/* Quality Standards */}
              <div>
                <label className="block text-sm font-medium mb-2">Quality Standards</label>
                <div className="space-y-2">
                  {['ISO 9001', 'ISO 14001', 'AS9100', 'IATF 16949', 'ISO 13485'].map((standard) => (
                    <label key={standard} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.template.qualityStandards.includes(standard)}
                        onChange={(e) => {
                          const standards = formData.template.qualityStandards;
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              template: {
                                ...prev.template,
                                qualityStandards: [...standards, standard]
                              }
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              template: {
                                ...prev.template,
                                qualityStandards: standards.filter(s => s !== standard)
                              }
                            }));
                          }
                        }}
                        className="mr-2"
                      />
                      {standard}
                    </label>
                  ))}
                </div>
              </div>

              {/* Visibility */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="isPublic" className="text-sm font-medium">
                  Make this template public (other manufacturers can use it)
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                leftIcon={
                  (createTemplateMutation.isPending || updateTemplateMutation.isPending) ? 
                  <LoadingSpinner size="sm" /> : 
                  <Save className="w-4 h-4" />
                }
              >
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {filteredTemplates.length === 0 && !isLoading && (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Templates Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {filterCategory !== 'all' 
              ? `No templates found for ${filterCategory.replace(/_/g, ' ')}` 
              : 'Start by creating your first quote template'
            }
          </p>
          {user?.role === UserRole.MANUFACTURER && (
            <Button
              onClick={() => setShowCreateForm(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create First Template
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};

export default QuoteTemplateManager; 