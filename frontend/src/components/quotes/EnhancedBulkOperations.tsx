import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Square,
  Minus,
  MoreHorizontal,
  Download,
  Mail,
  Archive,
  Trash2,
  Edit,
  Copy,
  Tag,
  Calendar,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Filter,
  RefreshCw,
  FileText,
  Send,
  Eye,
  Settings,
  Users,
  Building2,
  Play,
  Pause,
  RotateCcw,
  Share2,
  Star,
  Flag,
  MessageSquare
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { TextArea } from '../ui/TextArea';
import LoadingSpinner from '../ui/LoadingSpinner';
import { quotesApi } from '../../lib/api';
import { formatCurrency, formatRelativeTime } from '../../lib/utils';

interface Quote {
  id: number;
  title: string;
  status: string;
  price: number;
  currency: string;
  delivery_days: number;
  manufacturer: {
    id: number;
    name: string;
  };
  customer: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
  tags: string[];
  priority: string;
  expires_at: string;
}

interface BulkOperation {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  requiresConfirmation: boolean;
  requiresInput: boolean;
  inputType?: 'text' | 'select' | 'textarea' | 'date' | 'number';
  inputOptions?: Array<{ value: string; label: string }>;
  inputLabel?: string;
  inputPlaceholder?: string;
  destructive?: boolean;
}

interface SelectionCriteria {
  status?: string[];
  priority?: string[];
  price_min?: number;
  price_max?: number;
  date_from?: string;
  date_to?: string;
  manufacturer_ids?: number[];
  tags?: string[];
}

interface EnhancedBulkOperationsProps {
  quotes: Quote[];
  selectedQuotes: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  onRefresh?: () => void;
  className?: string;
}

const EnhancedBulkOperations: React.FC<EnhancedBulkOperationsProps> = ({
  quotes,
  selectedQuotes,
  onSelectionChange,
  onRefresh,
  className
}) => {
  const queryClient = useQueryClient();
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [activeOperation, setActiveOperation] = useState<BulkOperation | null>(null);
  const [operationInput, setOperationInput] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectionCriteria, setSelectionCriteria] = useState<SelectionCriteria>({});
  const [showAdvancedSelection, setShowAdvancedSelection] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const bulkOperations: BulkOperation[] = [
    {
      id: 'update_status',
      name: 'Update Status',
      description: 'Change status for selected quotes',
      icon: CheckCircle,
      color: 'text-blue-600',
      requiresConfirmation: true,
      requiresInput: true,
      inputType: 'select',
      inputLabel: 'New Status',
      inputOptions: [
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'withdrawn', label: 'Withdrawn' }
      ]
    },
    {
      id: 'update_priority',
      name: 'Update Priority',
      description: 'Change priority level',
      icon: Flag,
      color: 'text-orange-600',
      requiresConfirmation: true,
      requiresInput: true,
      inputType: 'select',
      inputLabel: 'New Priority',
      inputOptions: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' }
      ]
    },
    {
      id: 'add_tags',
      name: 'Add Tags',
      description: 'Add tags to selected quotes',
      icon: Tag,
      color: 'text-green-600',
      requiresConfirmation: false,
      requiresInput: true,
      inputType: 'text',
      inputLabel: 'Tags to Add',
      inputPlaceholder: 'Enter tags separated by commas'
    },
    {
      id: 'remove_tags',
      name: 'Remove Tags',
      description: 'Remove tags from selected quotes',
      icon: Tag,
      color: 'text-red-600',
      requiresConfirmation: true,
      requiresInput: true,
      inputType: 'text',
      inputLabel: 'Tags to Remove',
      inputPlaceholder: 'Enter tags separated by commas'
    },
    {
      id: 'extend_expiry',
      name: 'Extend Expiry',
      description: 'Extend expiration date',
      icon: Calendar,
      color: 'text-purple-600',
      requiresConfirmation: true,
      requiresInput: true,
      inputType: 'date',
      inputLabel: 'New Expiry Date'
    },
    {
      id: 'bulk_email',
      name: 'Send Email',
      description: 'Send bulk emails',
      icon: Mail,
      color: 'text-indigo-600',
      requiresConfirmation: true,
      requiresInput: true,
      inputType: 'textarea',
      inputLabel: 'Email Message',
      inputPlaceholder: 'Enter your message...'
    },
    {
      id: 'export',
      name: 'Export',
      description: 'Export selected quotes',
      icon: Download,
      color: 'text-purple-600',
      requiresConfirmation: false,
      requiresInput: true,
      inputType: 'select',
      inputLabel: 'Export Format',
      inputOptions: [
        { value: 'pdf', label: 'PDF Document' },
        { value: 'excel', label: 'Excel Spreadsheet' },
        { value: 'csv', label: 'CSV Data' }
      ]
    },
    {
      id: 'duplicate',
      name: 'Duplicate',
      description: 'Create copies of selected quotes',
      icon: Copy,
      color: 'text-blue-600',
      requiresConfirmation: true,
      requiresInput: false
    },
    {
      id: 'archive',
      name: 'Archive',
      description: 'Archive selected quotes',
      icon: Archive,
      color: 'text-gray-600',
      requiresConfirmation: true,
      requiresInput: false
    },
    {
      id: 'delete',
      name: 'Delete',
      description: 'Delete selected quotes',
      icon: Trash2,
      color: 'text-red-600',
      requiresConfirmation: true,
      requiresInput: false,
      destructive: true
    }
  ];

  // Bulk operations mutations
  const bulkOperationMutation = useMutation({
    mutationFn: async (data: { operation: string; quote_ids: number[]; input?: string }) => {
      setIsProcessing(true);
      setProcessingProgress(0);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      try {
        const result = await quotesApi.executeBulkOperation(data);
        clearInterval(progressInterval);
        setProcessingProgress(100);
        
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingProgress(0);
        }, 500);
        
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        setIsProcessing(false);
        setProcessingProgress(0);
        throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(`${variables.operation} completed successfully`);
      setActiveOperation(null);
      setOperationInput('');
      setShowConfirmDialog(false);
      onSelectionChange([]);
      if (onRefresh) onRefresh();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Operation failed');
    }
  });

  const handleSelectAll = () => {
    if (selectedQuotes.length === quotes.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(quotes.map(quote => quote.id));
    }
  };

  const handleSelectByStatus = (status: string) => {
    const statusQuotes = quotes.filter(quote => quote.status === status).map(quote => quote.id);
    onSelectionChange([...new Set([...selectedQuotes, ...statusQuotes])]);
  };

  const handleSelectByCriteria = () => {
    let filteredQuotes = quotes;

    if (selectionCriteria.status?.length) {
      filteredQuotes = filteredQuotes.filter(quote => 
        selectionCriteria.status!.includes(quote.status)
      );
    }

    if (selectionCriteria.priority?.length) {
      filteredQuotes = filteredQuotes.filter(quote => 
        selectionCriteria.priority!.includes(quote.priority)
      );
    }

    if (selectionCriteria.price_min !== undefined) {
      filteredQuotes = filteredQuotes.filter(quote => 
        quote.price >= selectionCriteria.price_min!
      );
    }

    if (selectionCriteria.price_max !== undefined) {
      filteredQuotes = filteredQuotes.filter(quote => 
        quote.price <= selectionCriteria.price_max!
      );
    }

    if (selectionCriteria.date_from) {
      filteredQuotes = filteredQuotes.filter(quote => 
        new Date(quote.created_at) >= new Date(selectionCriteria.date_from!)
      );
    }

    if (selectionCriteria.date_to) {
      filteredQuotes = filteredQuotes.filter(quote => 
        new Date(quote.created_at) <= new Date(selectionCriteria.date_to!)
      );
    }

    const selectedIds = filteredQuotes.map(quote => quote.id);
    onSelectionChange([...new Set([...selectedQuotes, ...selectedIds])]);
    setShowAdvancedSelection(false);
  };

  const handleOperationClick = (operation: BulkOperation) => {
    if (selectedQuotes.length === 0) {
      toast.error('No quotes selected');
      return;
    }

    setActiveOperation(operation);
    setOperationInput('');

    if (operation.requiresConfirmation || operation.requiresInput) {
      setShowConfirmDialog(true);
    } else {
      executeOperation(operation);
    }
  };

  const executeOperation = (operation: BulkOperation) => {
    const input = operation.requiresInput ? operationInput : undefined;
    
    bulkOperationMutation.mutate({
      operation: operation.id,
      quote_ids: selectedQuotes,
      input
    });
  };

  const getSelectionStats = () => {
    const selected = quotes.filter(quote => selectedQuotes.includes(quote.id));
    const totalValue = selected.reduce((sum, quote) => sum + quote.price, 0);
    const statusCounts = selected.reduce((acc, quote) => {
      acc[quote.status] = (acc[quote.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      count: selected.length,
      totalValue,
      statusCounts,
      avgPrice: selected.length > 0 ? totalValue / selected.length : 0
    };
  };

  const stats = getSelectionStats();

  const renderConfirmationDialog = () => {
    if (!activeOperation || !showConfirmDialog) return null;

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
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <activeOperation.icon className={`h-6 w-6 ${activeOperation.color}`} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeOperation.name}
              </h3>
            </div>
            <Button variant="ghost" onClick={() => setShowConfirmDialog(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6">
            {/* Operation Description */}
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {activeOperation.description}
              </p>
              
              {/* Selection Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Selected Quotes Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Count:</span>
                    <span className="ml-2 font-medium">{stats.count}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Total Value:</span>
                    <span className="ml-2 font-medium">{formatCurrency(stats.totalValue, 'USD')}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Avg Price:</span>
                    <span className="ml-2 font-medium">{formatCurrency(stats.avgPrice, 'USD')}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Statuses:</span>
                    <span className="ml-2 font-medium">
                      {Object.entries(stats.statusCounts).map(([status, count]) => 
                        `${status}: ${count}`
                      ).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Field */}
            {activeOperation.requiresInput && (
              <div className="mb-6">
                {activeOperation.inputType === 'select' ? (
                  <Select
                    label={activeOperation.inputLabel}
                    value={operationInput}
                    onChange={(e) => setOperationInput(e.target.value)}
                    options={activeOperation.inputOptions || []}
                  />
                ) : activeOperation.inputType === 'textarea' ? (
                  <TextArea
                    label={activeOperation.inputLabel}
                    value={operationInput}
                    onChange={(e) => setOperationInput(e.target.value)}
                    placeholder={activeOperation.inputPlaceholder}
                    rows={4}
                  />
                ) : (
                  <Input
                    type={activeOperation.inputType}
                    label={activeOperation.inputLabel}
                    value={operationInput}
                    onChange={(e) => setOperationInput(e.target.value)}
                    placeholder={activeOperation.inputPlaceholder}
                  />
                )}
              </div>
            )}

            {/* Warning for destructive operations */}
            {activeOperation.destructive && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-800 dark:text-red-200">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Warning</span>
                </div>
                <p className="text-red-700 dark:text-red-300 mt-2">
                  This action cannot be undone. {stats.count} quotes will be permanently deleted.
                </p>
              </div>
            )}

            {/* Processing Progress */}
            {isProcessing && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Processing...
                  </span>
                  <span className="text-sm text-gray-500">{processingProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => executeOperation(activeOperation)}
              loading={bulkOperationMutation.isPending}
              disabled={isProcessing || (activeOperation.requiresInput && !operationInput.trim())}
              className={activeOperation.destructive ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {activeOperation.destructive ? 'Delete Quotes' : 'Execute Operation'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderAdvancedSelection = () => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700"
    >
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">
        Advanced Selection Criteria
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <div className="space-y-1">
            {['draft', 'sent', 'accepted', 'rejected'].map(status => (
              <label key={status} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(selectionCriteria.status || []).includes(status)}
                  onChange={(e) => {
                    const currentStatus = selectionCriteria.status || [];
                    setSelectionCriteria({
                      ...selectionCriteria,
                      status: e.target.checked
                        ? [...currentStatus, status]
                        : currentStatus.filter(s => s !== status)
                    });
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                  {status}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Priority
          </label>
          <div className="space-y-1">
            {['low', 'medium', 'high', 'urgent'].map(priority => (
              <label key={priority} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(selectionCriteria.priority || []).includes(priority)}
                  onChange={(e) => {
                    const currentPriority = selectionCriteria.priority || [];
                    setSelectionCriteria({
                      ...selectionCriteria,
                      priority: e.target.checked
                        ? [...currentPriority, priority]
                        : currentPriority.filter(p => p !== priority)
                    });
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                  {priority}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Price Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={selectionCriteria.price_min || ''}
                onChange={(e) => setSelectionCriteria({
                  ...selectionCriteria,
                  price_min: e.target.value ? Number(e.target.value) : undefined
                })}
              />
              <Input
                type="number"
                placeholder="Max"
                value={selectionCriteria.price_max || ''}
                onChange={(e) => setSelectionCriteria({
                  ...selectionCriteria,
                  price_max: e.target.value ? Number(e.target.value) : undefined
                })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={selectionCriteria.date_from || ''}
                onChange={(e) => setSelectionCriteria({
                  ...selectionCriteria,
                  date_from: e.target.value
                })}
              />
              <Input
                type="date"
                value={selectionCriteria.date_to || ''}
                onChange={(e) => setSelectionCriteria({
                  ...selectionCriteria,
                  date_to: e.target.value
                })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectionCriteria({});
            setShowAdvancedSelection(false);
          }}
        >
          Clear
        </Button>
        <Button
          size="sm"
          onClick={handleSelectByCriteria}
        >
          Select Matching
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          {/* Selection Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSelectAll}
              className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              {selectedQuotes.length === quotes.length ? (
                <CheckSquare className="h-5 w-5 text-primary-600" />
              ) : selectedQuotes.length > 0 ? (
                <Minus className="h-5 w-5 text-primary-600" />
              ) : (
                <Square className="h-5 w-5" />
              )}
              <span>
                {selectedQuotes.length === 0 ? 'Select All' : 
                 selectedQuotes.length === quotes.length ? 'Deselect All' :
                 `${selectedQuotes.length} Selected`}
              </span>
            </button>

            {/* Quick Selection Buttons */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelectByStatus('draft')}
              >
                Drafts
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelectByStatus('sent')}
              >
                Sent
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedSelection(!showAdvancedSelection)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Advanced
              </Button>
            </div>
          </div>

          {/* Selection Stats */}
          {selectedQuotes.length > 0 && (
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                {formatCurrency(stats.totalValue, 'USD')}
              </span>
              <span>Avg: {formatCurrency(stats.avgPrice, 'USD')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          {selectedQuotes.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowBulkPanel(!showBulkPanel)}
            >
              <MoreHorizontal className="h-4 w-4 mr-2" />
              Bulk Actions ({selectedQuotes.length})
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Selection Panel */}
      <AnimatePresence>
        {showAdvancedSelection && renderAdvancedSelection()}
      </AnimatePresence>

      {/* Bulk Operations Panel */}
      <AnimatePresence>
        {showBulkPanel && selectedQuotes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700"
          >
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">
              Bulk Operations
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {bulkOperations.map(operation => (
                <button
                  key={operation.id}
                  onClick={() => handleOperationClick(operation)}
                  className="flex flex-col items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-600 transition-colors group"
                >
                  <operation.icon className={`h-6 w-6 ${operation.color} mb-2 group-hover:scale-110 transition-transform`} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {operation.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {operation.description}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {renderConfirmationDialog()}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedBulkOperations; 