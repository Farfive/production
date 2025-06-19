import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Copy,
  Eye,
  Globe,
  Lock,
  Star,
  Clock,
  DollarSign,
  Tag,
  MoreHorizontal,
  Download,
  Upload
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import LoadingSpinner from '../ui/LoadingSpinner';
import { quoteTemplatesApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import QuoteTemplateBuilder from './QuoteTemplateBuilder';
import QuoteTemplatePreview from './QuoteTemplatePreview';

interface QuoteTemplateLibraryProps {
  onSelectTemplate?: (template: any) => void;
  selectionMode?: boolean;
}

const QuoteTemplateLibrary: React.FC<QuoteTemplateLibraryProps> = ({
  onSelectTemplate,
  selectionMode = false
}) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);

  // Fetch templates
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['quote-templates', filterType],
    queryFn: () => quoteTemplatesApi.list(filterType === 'public'),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: quoteTemplatesApi.delete,
    onSuccess: () => {
      toast.success('Template deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['quote-templates'] });
    },
    onError: () => {
      toast.error('Failed to delete template');
    }
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (template: any) => {
      const duplicateData = {
        ...template,
        name: `${template.name} (Copy)`,
        is_public: false
      };
      delete duplicateData.id;
      delete duplicateData.created_at;
      delete duplicateData.updated_at;
      return quoteTemplatesApi.create(duplicateData);
    },
    onSuccess: () => {
      toast.success('Template duplicated successfully');
      queryClient.invalidateQueries({ queryKey: ['quote-templates'] });
    },
    onError: () => {
      toast.error('Failed to duplicate template');
    }
  });

  const filteredTemplates = templates.filter((template: any) => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'public' && template.is_public) ||
                         (filterType === 'private' && !template.is_public);
    
    return matchesSearch && matchesFilter;
  });

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setShowBuilder(true);
  };

  const handleDelete = (template: any) => {
    if (window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      deleteMutation.mutate(template.id);
    }
  };

  const handleDuplicate = (template: any) => {
    duplicateMutation.mutate(template);
  };

  const handleSelect = (template: any) => {
    if (selectionMode) {
      onSelectTemplate?.(template);
    } else {
      setPreviewTemplate(template);
    }
  };

  const handleBulkDelete = () => {
    if (selectedTemplates.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedTemplates.length} templates?`)) {
      selectedTemplates.forEach(id => {
        deleteMutation.mutate(id);
      });
      setSelectedTemplates([]);
    }
  };

  const toggleTemplateSelection = (templateId: number) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const calculateTemplateTotal = (template: any) => {
    const breakdown = template.template_data?.pricing_breakdown;
    if (!breakdown) return 0;
    return breakdown.materials + breakdown.labor + breakdown.overhead + breakdown.shipping + breakdown.taxes;
  };

  const filterOptions = [
    { value: 'all', label: 'All Templates' },
    { value: 'public', label: 'Public Templates' },
    { value: 'private', label: 'My Templates' }
  ];

  if (isLoading) {
    return <LoadingSpinner center text="Loading templates..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load templates</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['quote-templates'] })} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Quote Templates
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {selectionMode ? 'Select a template to use' : 'Manage your quote templates'}
            </p>
          </div>
          
          {!selectionMode && (
            <div className="flex gap-2">
              {selectedTemplates.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleBulkDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedTemplates.length})
                </Button>
              )}
              <Button onClick={() => setShowBuilder(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={filterType}
            onChange={(value) => setFilterType(value as any)}
            options={filterOptions}
            className="w-full sm:w-48"
          />
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Tag className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No templates found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm ? 'Try adjusting your search criteria' : 'Create your first template to get started'}
            </p>
            {!selectionMode && (
              <Button onClick={() => setShowBuilder(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredTemplates.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {template.name}
                          </h3>
                          {template.is_public ? (
                            <Globe className="h-4 w-4 text-green-600" />
                          ) : (
                            <Lock className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                      </div>
                      
                      {!selectionMode && (
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={selectedTemplates.includes(template.id)}
                            onChange={() => toggleTemplateSelection(template.id)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Template Info */}
                    <div className="space-y-3 mb-4">
                      {template.template_data?.pricing_breakdown && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Base Price:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(calculateTemplateTotal(template), 'USD')}
                          </span>
                        </div>
                      )}
                      
                      {template.template_data?.default_delivery_days && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Delivery:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {template.template_data.default_delivery_days} days
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Created:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {format(new Date(template.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>

                    {/* Options Tags */}
                    {template.template_data && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {template.template_data.material_options?.slice(0, 2).map((material: string, index: number) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded"
                            >
                              {material}
                            </span>
                          ))}
                          {template.template_data.process_options?.slice(0, 2).map((process: string, index: number) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded"
                            >
                              {process}
                            </span>
                          ))}
                          {(template.template_data.material_options?.length > 2 || template.template_data.process_options?.length > 2) && (
                            <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                              +more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelect(template)}
                        className="flex-1"
                      >
                        {selectionMode ? (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Use Template
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </>
                        )}
                      </Button>
                      
                      {!selectionMode && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(template)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Template Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <QuoteTemplateBuilder
              template={editingTemplate}
              onSave={() => {
                setShowBuilder(false);
                setEditingTemplate(null);
              }}
              onCancel={() => {
                setShowBuilder(false);
                setEditingTemplate(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <QuoteTemplatePreview
              template={previewTemplate}
              onClose={() => setPreviewTemplate(null)}
              onEdit={() => {
                setEditingTemplate(previewTemplate);
                setPreviewTemplate(null);
                setShowBuilder(true);
              }}
              onUse={() => {
                onSelectTemplate?.(previewTemplate);
                setPreviewTemplate(null);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default QuoteTemplateLibrary; 