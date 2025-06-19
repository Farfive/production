import React from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Edit,
  Copy,
  Download,
  Share2,
  DollarSign,
  Clock,
  Package,
  FileText,
  Tag,
  Globe,
  Lock,
  Calendar,
  User,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

import Button from '../ui/Button';
import { formatCurrency } from '../../lib/utils';

interface QuoteTemplatePreviewProps {
  template: any;
  onClose: () => void;
  onEdit?: () => void;
  onUse?: () => void;
  onDuplicate?: () => void;
}

const QuoteTemplatePreview: React.FC<QuoteTemplatePreviewProps> = ({
  template,
  onClose,
  onEdit,
  onUse,
  onDuplicate
}) => {
  const calculateTotal = () => {
    const breakdown = template.template_data?.pricing_breakdown;
    if (!breakdown) return 0;
    return breakdown.materials + breakdown.labor + breakdown.overhead + breakdown.shipping + breakdown.taxes;
  };

  const renderPricingBreakdown = () => {
    const breakdown = template.template_data?.pricing_breakdown;
    if (!breakdown) return null;

    const items = [
      { label: 'Materials', value: breakdown.materials, color: 'bg-blue-500' },
      { label: 'Labor', value: breakdown.labor, color: 'bg-green-500' },
      { label: 'Overhead', value: breakdown.overhead, color: 'bg-yellow-500' },
      { label: 'Shipping', value: breakdown.shipping, color: 'bg-purple-500' },
      { label: 'Taxes', value: breakdown.taxes, color: 'bg-red-500' }
    ];

    const total = calculateTotal();

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">Pricing Breakdown</h4>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full ${item.color} mr-3`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(item.value, 'USD')}
              </span>
            </div>
          ))}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-white">Total</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(total, 'USD')}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOptions = (title: string, options: string[], colorClass: string) => {
    if (!options || options.length === 0) return null;

    return (
      <div className="space-y-2">
        <h5 className="font-medium text-gray-900 dark:text-white">{title}</h5>
        <div className="flex flex-wrap gap-2">
          {options.map((option, index) => (
            <span
              key={index}
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}
            >
              {option}
            </span>
          ))}
        </div>
      </div>
    );
  };

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
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-primary-600" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {template.name}
              </h2>
            </div>
            {template.is_public ? (
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
          <Button variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-8">
            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                {template.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Description
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                )}

                {/* Pricing Breakdown */}
                {template.template_data?.pricing_breakdown && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Default Pricing
                    </h3>
                    {renderPricingBreakdown()}
                  </div>
                )}

                {/* Options */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Available Options
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      {renderOptions(
                        'Materials',
                        template.template_data?.material_options,
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      )}
                    </div>
                    <div>
                      {renderOptions(
                        'Processes',
                        template.template_data?.process_options,
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      )}
                    </div>
                    <div>
                      {renderOptions(
                        'Finishes',
                        template.template_data?.finish_options,
                        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      )}
                    </div>
                  </div>
                </div>

                {/* Default Notes */}
                {template.template_data?.notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Default Notes
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {template.template_data.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Template Details</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <DollarSign className="h-4 w-4 mr-2" />
                        <span className="text-sm">Base Price</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(calculateTotal(), 'USD')}
                      </span>
                    </div>

                    {template.template_data?.default_delivery_days && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4 mr-2" />
                          <span className="text-sm">Delivery</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {template.template_data.default_delivery_days} days
                        </span>
                      </div>
                    )}

                    {template.template_data?.payment_terms && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <FileText className="h-4 w-4 mr-2" />
                          <span className="text-sm">Payment</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {template.template_data.payment_terms}
                        </span>
                      </div>
                    )}

                    {template.template_data?.warranty && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          <span className="text-sm">Warranty</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {template.template_data.warranty}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span className="text-sm">Created</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {format(new Date(template.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <User className="h-4 w-4 mr-2" />
                        <span className="text-sm">Manufacturer</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {template.manufacturer?.business_name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Usage Statistics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Times Used</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {template.usage_count || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Success Rate</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {template.success_rate || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Avg. Quote Value</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(template.avg_quote_value || 0, 'USD')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {onEdit && (
              <Button variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {onUse && (
              <Button onClick={onUse}>
                <Package className="h-4 w-4 mr-2" />
                Use Template
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QuoteTemplatePreview; 