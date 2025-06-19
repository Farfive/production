import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Star,
  GitCompare,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  FileText,
  MessageSquare,
  BarChart3,
  RefreshCw,
  Settings,
  MoreVertical,
  X,
  Package2,
  CalendarDays,
  Calendar
} from 'lucide-react';

import { quotesApi } from '../../lib/api';
import { Quote, QuoteStatus, User } from '../../types';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatRelativeTime, getStatusColor } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import EnhancedBulkOperations from '../../components/quotes/EnhancedBulkOperations';

const QuotesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'amount' | 'deadline'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedQuotes, setSelectedQuotes] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch quotes based on user role
  const {
    data: quotesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['quotes', { search: searchTerm, status: statusFilter, sortBy, sortOrder }],
    queryFn: () =>
      quotesApi.getQuotes({
        search: searchTerm || undefined,
        // status: statusFilter !== 'all' ? statusFilter : undefined, // Temporarily commented out
        sortBy,
        sortOrder,
        limit: 20,
      }),
  });

  const quotes = quotesData?.data || [];
  const pagination = quotesData?.pagination;

  const handleStatusChange = async (_quoteId: string, _newStatus: QuoteStatus) => {
    try {
      // Mock status update for now
      toast.success('Quote status updated successfully');
    } catch (error) {
      toast.error('Failed to update quote status');
    }
  };

  const getStatusIcon = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.PENDING:
        return <Clock className="h-4 w-4" />;
      case QuoteStatus.APPROVED:
        return <CheckCircle className="h-4 w-4" />;
      case QuoteStatus.REJECTED:
        return <X className="h-4 w-4" />;
      case QuoteStatus.EXPIRED:
        return <X className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const isManufacturer = user?.role === 'manufacturer';
  const isClient = user?.role === 'client';

  const handleCompareSelected = () => {
    if (selectedQuotes.length < 2) {
      alert('Please select at least 2 quotes to compare');
      return;
    }
    if (selectedQuotes.length > 5) {
      alert('Maximum 5 quotes can be compared at once');
      return;
    }
    navigate(`/quotes/comparison?quotes=${selectedQuotes.join(',')}`);
  };

  if (isLoading) {
    return <LoadingSpinner center text="Loading quotes..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Failed to load quotes
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Please try again or contact support if the problem persists.
        </p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isManufacturer ? 'Quotes Sent' : 'Quotes Received'}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {isManufacturer
              ? 'Manage quotes you\'ve sent to clients and track their status.'
              : 'Review and manage quotes received from manufacturers.'}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
          {isManufacturer && (
            <Button
              as={Link}
              to="/quotes/create"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Quote
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Quotes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {pagination?.total || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-warning-600 dark:text-warning-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Pending
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {quotes.filter(q => q.status === QuoteStatus.PENDING).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-success-600 dark:text-success-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Approved
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {quotes.filter(q => q.status === QuoteStatus.APPROVED).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-success-600 dark:text-success-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Value
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatCurrency(
                      quotes.reduce((sum, quote) => sum + (quote.totalAmount || 0), 0)
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Bulk Operations */}
      <div className="mb-6">
        <EnhancedBulkOperations
          quotes={quotes as any}
          selectedQuotes={selectedQuotes}
          onSelectionChange={setSelectedQuotes}
          onRefresh={refetch}
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="sm:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search quotes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | 'all')}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value={QuoteStatus.PENDING}>Pending</option>
                <option value={QuoteStatus.APPROVED}>Approved</option>
                <option value={QuoteStatus.REJECTED}>Rejected</option>
                <option value={QuoteStatus.EXPIRED}>Expired</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as typeof sortBy);
                  setSortOrder(order as typeof sortOrder);
                }}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
                <option value="deadline-asc">Deadline Soon</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Quotes List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Quotes ({pagination?.total || 0})
          </h3>
        </div>
        
        {quotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No quotes found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {isManufacturer
                ? "You haven't sent any quotes yet. Start by creating your first quote."
                : "You haven't received any quotes yet. Create an order to get started."}
            </p>
            {isManufacturer ? (
              <Button as={Link} to="/quotes/create" leftIcon={<Plus className="h-4 w-4" />}>
                Create Quote
              </Button>
            ) : (
              <Button as={Link} to="/orders/create" leftIcon={<Package2 className="h-4 w-4" />}>
                Create Order
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {quotes.map((quote, index) => (
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  selectedQuotes.includes(Number(quote.id))
                    ? 'border-primary-500 shadow-md'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            Quote #{quote.id}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                            {getStatusIcon(quote.status)}
                            <span className="ml-1">{quote.status}</span>
                          </span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <span>Quote for Order #{quote.orderId}</span>
                          <span className="mx-2">•</span>
                          <span>
                            {isManufacturer ? 'Client:' : 'From:'} {
                              isManufacturer 
                                ? 'Client Name' 
                                : (quote.manufacturer as any)?.businessName || 'Manufacturer'
                            }
                          </span>
                          <span className="mx-2">•</span>
                          <CalendarDays className="h-3 w-3 mr-1" />
                          <span>{formatRelativeTime(quote.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(quote.totalAmount || 0, quote.currency)}
                      </div>
                      {quote.validUntil && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Valid until {new Date(quote.validUntil).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye className="h-3 w-3" />}
                        as={Link}
                        to={`/quotes/${quote.id}`}
                      >
                        View
                      </Button>
                      
                      {isClient && quote.status === QuoteStatus.PENDING && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(quote.id, QuoteStatus.APPROVED)}
                            className="bg-success-600 hover:bg-success-700 text-white"
                          >
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(quote.id, QuoteStatus.REJECTED)}
                            className="text-error-600 border-error-600 hover:bg-error-50"
                          >
                            Decline
                          </Button>
                        </div>
                      )}

                      {isManufacturer && quote.status === QuoteStatus.PENDING && (
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Edit className="h-3 w-3" />}
                          as={Link}
                          to={`/quotes/${quote.id}/edit`}
                        >
                          Edit
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<MessageSquare className="h-3 w-3" />}
                      >
                        Message
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotesPage; 