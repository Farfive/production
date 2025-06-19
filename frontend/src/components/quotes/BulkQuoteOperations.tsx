import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Square,
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
  XCircle,
  MoreVertical
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { TextArea } from '../ui/TextArea';
import { quotesApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Quote, QuoteStatus, UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Card from '../ui/Card';
import { Badge } from '../ui/badge';
import LoadingSpinner from '../ui/LoadingSpinner';

interface BulkQuoteOperationsProps {
  quotes: Quote[];
  selectedQuotes: string[];
  onSelectionChange: (quoteIds: string[]) => void;
  onRefresh: () => void;
}

interface BulkActionResult {
  success: number;
  failed: number;
  errors: string[];
}

const BulkQuoteOperations: React.FC<BulkQuoteOperationsProps> = ({
  quotes,
  selectedQuotes,
  onSelectionChange,
  onRefresh
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<QuoteStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'status'>('date');

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ action, quoteIds }: { action: string; quoteIds: number[] }) => {
      switch (action) {
        case 'accept':
          return await quotesApi.bulkAction('accept', quoteIds);
        case 'reject':
          return await quotesApi.bulkAction('reject', quoteIds);
        case 'withdraw':
          return await quotesApi.bulkAction('withdraw', quoteIds);
        case 'delete':
          return await quotesApi.bulkAction('delete', quoteIds);
        case 'export':
          return await quotesApi.bulkExportQuotes({
            quote_ids: quoteIds,
            format: 'excel',
            options: { includeBreakdown: true, includeNotes: true }
          });
        case 'email':
          return await quotesApi.bulkEmailQuotes({
            quote_ids: quoteIds,
            template: 'quote_update',
            recipients: [],
            subject: 'Quote Update',
            message: 'Your quotes have been updated.'
          });
        default:
          throw new Error('Unknown bulk action');
      }
    },
    onSuccess: (result, variables) => {
      const { action } = variables;
      
      if (action === 'export') {
        // Handle file download
        const blob = new Blob([result as any], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quotes_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Quotes exported successfully!');
      } else {
        const typedResult = result as BulkActionResult;
        if (typedResult.success > 0) {
          toast.success(`${action} completed for ${typedResult.success} quotes`);
        }
        if (typedResult.failed > 0) {
          toast.error(`${typedResult.failed} quotes failed: ${typedResult.errors.join(', ')}`);
        }
      }
      
      onSelectionChange([]);
      setShowConfirmDialog(false);
      setBulkActionType('');
      onRefresh();
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Bulk operation failed');
    }
  });

  // Handle select all
  const handleSelectAll = () => {
    const filteredQuoteIds = getFilteredQuotes().map(quote => quote.id);
    if (selectedQuotes.length === filteredQuoteIds.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredQuoteIds);
    }
  };

  // Handle individual selection
  const handleIndividualSelect = (quoteId: string) => {
    if (selectedQuotes.includes(quoteId)) {
      onSelectionChange(selectedQuotes.filter(id => id !== quoteId));
    } else {
      onSelectionChange([...selectedQuotes, quoteId]);
    }
  };

  // Get filtered quotes
  const getFilteredQuotes = () => {
    let filtered = quotes;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(quote => quote.status === filterStatus);
    }

    // Sort quotes
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'price':
          return b.totalAmount - a.totalAmount;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Handle bulk action
  const handleBulkAction = (action: string) => {
    if (selectedQuotes.length === 0) {
      toast.error('Please select quotes first');
      return;
    }

    setBulkActionType(action);
    
    if (['delete', 'reject', 'withdraw'].includes(action)) {
      setShowConfirmDialog(true);
    } else {
      executeBulkAction(action);
    }
  };

  // Execute bulk action
  const executeBulkAction = (action: string) => {
    const quoteIds = selectedQuotes.map(id => parseInt(id));
    bulkOperationMutation.mutate({ action, quoteIds });
  };

  // Get status color
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

  // Get available actions based on user role and quote status
  const getAvailableActions = () => {
    const actions = [];

    if (user?.role === UserRole.CLIENT) {
      const canAccept = selectedQuotes.some(id => {
        const quote = quotes.find(q => q.id === id);
        return quote && (quote.status === QuoteStatus.SENT || quote.status === QuoteStatus.VIEWED);
      });
      
      const canReject = selectedQuotes.some(id => {
        const quote = quotes.find(q => q.id === id);
        return quote && (quote.status === QuoteStatus.SENT || quote.status === QuoteStatus.VIEWED);
      });

      if (canAccept) {
        actions.push({ 
          id: 'accept', 
          label: 'Accept Selected', 
          icon: CheckCircle, 
          color: 'green' 
        });
      }
      
      if (canReject) {
        actions.push({ 
          id: 'reject', 
          label: 'Reject Selected', 
          icon: XCircle, 
          color: 'red' 
        });
      }
    }

    if (user?.role === UserRole.MANUFACTURER) {
      const canWithdraw = selectedQuotes.some(id => {
        const quote = quotes.find(q => q.id === id);
        return quote && [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.NEGOTIATING].includes(quote.status);
      });

      if (canWithdraw) {
        actions.push({ 
          id: 'withdraw', 
          label: 'Withdraw Selected', 
          icon: Archive, 
          color: 'orange' 
        });
      }

      const canDelete = selectedQuotes.some(id => {
        const quote = quotes.find(q => q.id === id);
        return quote && [QuoteStatus.DRAFT, QuoteStatus.REJECTED, QuoteStatus.EXPIRED].includes(quote.status);
      });

      if (canDelete) {
        actions.push({ 
          id: 'delete', 
          label: 'Delete Selected', 
          icon: Trash2, 
          color: 'red' 
        });
      }
    }

    // Universal actions
    actions.push(
      { id: 'export', label: 'Export Selected', icon: Download, color: 'blue' },
      { id: 'email', label: 'Email Update', icon: Mail, color: 'indigo' }
    );

    return actions;
  };

  const filteredQuotes = getFilteredQuotes();
  const availableActions = getAvailableActions();

  return (
    <div className="space-y-4">
      {/* Bulk Operations Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Select All Checkbox */}
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm font-medium"
            >
              {selectedQuotes.length === filteredQuotes.length && filteredQuotes.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : selectedQuotes.length > 0 ? (
                <div className="w-4 h-4 border border-blue-600 bg-blue-100 rounded flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded"></div>
                </div>
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
              Select All ({selectedQuotes.length}/{filteredQuotes.length})
            </button>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as QuoteStatus | 'all')}
                className="text-sm border-0 bg-transparent focus:ring-0"
              >
                <option value="all">All Status</option>
                {Object.values(QuoteStatus).map(status => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'price' | 'status')}
              className="text-sm border-0 bg-transparent focus:ring-0"
            >
              <option value="date">Sort by Date</option>
              <option value="price">Sort by Price</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedQuotes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedQuotes.length} selected
              </span>
              <div className="flex items-center gap-1">
                {availableActions.slice(0, 3).map(action => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.id}
                      size="sm"
                      variant="outline"
                      color={action.color}
                      onClick={() => handleBulkAction(action.id)}
                      disabled={bulkOperationMutation.isPending}
                      leftIcon={<Icon className="w-4 h-4" />}
                    >
                      {action.label}
                    </Button>
                  );
                })}
                
                {availableActions.length > 3 && (
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowBulkActions(!showBulkActions)}
                      leftIcon={<MoreVertical className="w-4 h-4" />}
                    >
                      More
                    </Button>
                    
                    {showBulkActions && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                        {availableActions.slice(3).map(action => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.id}
                              onClick={() => {
                                handleBulkAction(action.id);
                                setShowBulkActions(false);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Icon className="w-4 h-4" />
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Quote List with Selection */}
      <div className="space-y-3">
        {filteredQuotes.map(quote => (
          <Card key={quote.id} className="p-4">
            <div className="flex items-center gap-4">
              {/* Selection Checkbox */}
              <button
                onClick={() => handleIndividualSelect(quote.id)}
                className="flex-shrink-0"
              >
                {selectedQuotes.includes(quote.id) ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Quote Info */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div>
                  <div className="font-medium">Quote #{quote.id}</div>
                  <div className="text-sm text-gray-500">
                    Order #{quote.orderId}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium">
                    {quote.manufacturer?.companyName || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-500">
                    ★ {quote.manufacturer?.rating || 'N/A'}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium">
                    {quote.totalAmount} {quote.currency}
                  </div>
                  <div className="text-sm text-gray-500">
                    {quote.deliveryTime} days
                  </div>
                </div>
                
                <div>
                  <Badge color={getStatusColor(quote.status)}>
                    {quote.status}
                  </Badge>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {new Date(quote.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(quote.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <h3 className="text-lg font-semibold">Confirm Bulk Action</h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to {bulkActionType} {selectedQuotes.length} selected quote{selectedQuotes.length !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setBulkActionType('');
                }}
              >
                Cancel
              </Button>
              <Button
                color="red"
                onClick={() => executeBulkAction(bulkActionType)}
                disabled={bulkOperationMutation.isPending}
                leftIcon={bulkOperationMutation.isPending ? <LoadingSpinner size="sm" /> : undefined}
              >
                Confirm {bulkActionType}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Loading Overlay */}
      {bulkOperationMutation.isPending && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-40">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <LoadingSpinner />
              <span>Processing bulk operation...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BulkQuoteOperations; 