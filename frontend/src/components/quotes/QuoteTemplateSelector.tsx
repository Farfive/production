import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  X,
  Plus,
  Clock,
  DollarSign,
  Globe,
  Lock,
  Star,
  ChevronDown,
  ChevronUp,
  Package,
  FileText
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import LoadingSpinner from '../ui/LoadingSpinner';
import { quoteTemplatesApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

interface QuoteTemplateSelectorProps {
  onSelectTemplate: (template: any) => void;
  onClose: () => void;
  selectedTemplate?: any;
}

const QuoteTemplateSelector: React.FC<QuoteTemplateSelectorProps> = ({
  onSelectTemplate,
  onClose,
  selectedTemplate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null);

  // Fetch templates
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['quote-templates', filterType],
    queryFn: () => quoteTemplatesApi.list(filterType === 'public'),
  });

  const filteredTemplates = templates.filter((template: any) => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'public' && template.is_public) ||
                         (filterType === 'private' && !template.is_public);
    
    return matchesSearch && matchesFilter;
  });

  const calculateTemplateTotal = (template: any) => {
    const breakdown = template.template_data?.pricing_breakdown;
    if (!breakdown) return 0;
    return breakdown.materials + breakdown.labor + breakdown.overhead + breakdown.shipping + breakdown.taxes;
  };

  const handleSelectTemplate = (template: any) => {
    onSelectTemplate(template);
    onClose();
  };

  const toggleExpanded = (templateId: number) => {
    setExpandedTemplate(expandedTemplate === templateId ? null : templateId);
  };

  const filterOptions = [
    { value: 'all', label: 'All Templates' },
    { value: 'public', label: 'Public Templates' },
    { value: 'private', label: 'My Templates' }
  ];

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <LoadingSpinner center text="Loading templates..." />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Select Quote Template
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Choose a template to speed up quote creation
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filterType}
              onChange={(value) => setFilterType(value as any)}
              options={filterOptions}
              className="w-full sm:w-48"
            />
          </div>
        </div>

        {/* Templates List */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {error ? (
            <div className="p-6 text-center text-red-600">
              Failed to load templates
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No templates found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? 'Try adjusting your search criteria' : 'No templates available'}
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <AnimatePresence>
                {filteredTemplates.map((template: any) => {
                  const isSelected = selectedTemplate?.id === template.id;
                  const isExpanded = expandedTemplate === template.id;
                  const total = calculateTemplateTotal(template);

                  return (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`border rounded-lg transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div
                        className="p-4"
                        onClick={() => toggleExpanded(template.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {template.name}
                              </h3>
                              {template.is_public ? (
                                <Globe className="h-4 w-4 text-green-600" />
                              ) : (
                                <Lock className="h-4 w-4 text-gray-400" />
                              )}
                              {template.usage_count > 10 && (
                                <div className="flex items-center text-yellow-500">
                                  <Star className="h-4 w-4 fill-current" />
                                  <span className="text-xs ml-1">Popular</span>
                                </div>
                              )}
                            </div>
                            
                            {template.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                {template.description}
                              </p>
                            )}

                            <div className="flex items-center gap-6 text-sm">
                              <div className="flex items-center text-gray-600 dark:text-gray-400">
                                <DollarSign className="h-4 w-4 mr-1" />
                                <span>{formatCurrency(total, 'USD')}</span>
                              </div>
                              {template.template_data?.default_delivery_days && (
                                <div className="flex items-center text-gray-600 dark:text-gray-400">
                                  <Clock className="h-4 w-4 mr-1" />
                                  <span>{template.template_data.default_delivery_days} days</span>
                                </div>
                              )}
                              <div className="flex items-center text-gray-600 dark:text-gray-400">
                                <Package className="h-4 w-4 mr-1" />
                                <span>Used {template.usage_count || 0} times</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectTemplate(template);
                              }}
                              className={isSelected ? 'bg-primary-600' : ''}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </Button>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
                          >
                            <div className="p-4 space-y-4">
                              {/* Pricing Breakdown */}
                              {template.template_data?.pricing_breakdown && (
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                    Pricing Breakdown
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                                    {Object.entries(template.template_data.pricing_breakdown).map(([key, value]) => (
                                      <div key={key} className="text-center">
                                        <div className="text-gray-600 dark:text-gray-400 capitalize">
                                          {key}
                                        </div>
                                        <div className="font-medium text-gray-900 dark:text-white">
                                          {formatCurrency(value as number, 'USD')}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Options */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {template.template_data?.material_options?.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                                      Materials
                                    </h5>
                                    <div className="flex flex-wrap gap-1">
                                      {template.template_data.material_options.slice(0, 3).map((material: string, index: number) => (
                                        <span
                                          key={index}
                                          className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded"
                                        >
                                          {material}
                                        </span>
                                      ))}
                                      {template.template_data.material_options.length > 3 && (
                                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                                          +{template.template_data.material_options.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {template.template_data?.process_options?.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                                      Processes
                                    </h5>
                                    <div className="flex flex-wrap gap-1">
                                      {template.template_data.process_options.slice(0, 3).map((process: string, index: number) => (
                                        <span
                                          key={index}
                                          className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded"
                                        >
                                          {process}
                                        </span>
                                      ))}
                                      {template.template_data.process_options.length > 3 && (
                                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                                          +{template.template_data.process_options.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {template.template_data?.finish_options?.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                                      Finishes
                                    </h5>
                                    <div className="flex flex-wrap gap-1">
                                      {template.template_data.finish_options.slice(0, 3).map((finish: string, index: number) => (
                                        <span
                                          key={index}
                                          className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded"
                                        >
                                          {finish}
                                        </span>
                                      ))}
                                      {template.template_data.finish_options.length > 3 && (
                                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                                          +{template.template_data.finish_options.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Default Settings */}
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                {template.template_data?.payment_terms && (
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Payment Terms:</span>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {template.template_data.payment_terms}
                                    </div>
                                  </div>
                                )}
                                {template.template_data?.warranty && (
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Warranty:</span>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {template.template_data.warranty}
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Success Rate:</span>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {template.success_rate || 0}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => handleSelectTemplate(null)}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start from Scratch
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QuoteTemplateSelector; 