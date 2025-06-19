import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Filter,
  Download,
  Bell,
  MessageSquare,
  History,
  BarChart3,
  Settings,
  Search,
  Grid,
  List,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  X
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdvancedQuoteFilters from '../../components/quotes/AdvancedQuoteFilters';
import BulkQuoteOperations from '../../components/quotes/BulkQuoteOperations';
import QuoteExportReporting from '../../components/quotes/QuoteExportReporting';
import QuoteNotifications from '../../components/quotes/QuoteNotifications';
import QuoteCollaboration from '../../components/quotes/QuoteCollaboration';
import QuoteVersionHistory from '../../components/quotes/QuoteVersionHistory';
import { quotesApi } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatRelativeTime } from '../../lib/utils';

interface LocalQuote {
  id: number;
  title: string;
  description: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'withdrawn';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  price: number;
  currency: string;
  delivery_days: number;
  manufacturer: {
    id: number;
    name: string;
    avatar?: string;
    rating: number;
  };
  customer: {
    id: number;
    name: string;
    company: string;
  };
  created_at: string;
  updated_at: string;
  expires_at?: string;
  tags: string[];
  materials: string[];
  processes: string[];
  attachments: Array<{
    id: number;
    name: string;
    url: string;
    type: string;
  }>;
  comments_count: number;
  versions_count: number;
  last_activity: string;
}

const EnhancedQuotesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State management
  const [selectedQuotes, setSelectedQuotes] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeQuoteId, setActiveQuoteId] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<'collaboration' | 'history' | null>(null);
  const [filters, setFilters] = useState({});

  // Fetch quotes with filters
  const { data: quotesData, isLoading, refetch } = useQuery({
    queryKey: ['quotes', filters],
    queryFn: () => quotesApi.getQuotes(filters),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Extract quotes from paginated response
  const quotes = quotesData?.data || [];
  const pagination = quotesData?.pagination || {};

  // Handle filter changes
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    // Update URL params
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        params.set(key, Array.isArray(value) ? value.join(',') : String(value));
      }
    });
    setSearchParams(params);
  };

  // Load filters from URL on mount
  useEffect(() => {
    const urlFilters: any = {};
    searchParams.forEach((value, key) => {
      if (value.includes(',')) {
        urlFilters[key] = value.split(',');
      } else {
        urlFilters[key] = value;
      }
    });
    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    }
  }, [searchParams]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const renderQuoteCard = (quote: LocalQuote) => (
    <motion.div
      key={quote.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-gray-800 rounded-lg border-2 transition-all duration-200 hover:shadow-lg ${
        selectedQuotes.includes(quote.id)
          ? 'border-primary-500 shadow-md'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={selectedQuotes.includes(quote.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedQuotes([...selectedQuotes, quote.id]);
                } else {
                  setSelectedQuotes(selectedQuotes.filter(id => id !== quote.id));
                }
              }}
              className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {quote.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {quote.description}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(quote.status)}`}>
              {quote.status}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(quote.priority)}`}>
              {quote.priority}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Price:</span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(quote.price, quote.currency)}
            </div>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Delivery:</span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {quote.delivery_days} days
            </div>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Manufacturer:</span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {quote.manufacturer.name}
            </div>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Customer:</span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {quote.customer.name}
            </div>
          </div>
        </div>

        {/* Tags */}
        {quote.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {quote.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>Updated {formatRelativeTime(quote.updated_at)}</span>
            {quote.comments_count > 0 && (
              <span className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-1" />
                {quote.comments_count}
              </span>
            )}
            {quote.versions_count > 1 && (
              <span className="flex items-center">
                <History className="h-4 w-4 mr-1" />
                {quote.versions_count} versions
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveQuoteId(quote.id);
                setActivePanel('collaboration');
              }}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveQuoteId(quote.id);
                setActivePanel('history');
              }}
            >
              <History className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderQuoteList = (quote: LocalQuote) => (
    <motion.div
      key={quote.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-white dark:bg-gray-800 border-l-4 transition-all duration-200 hover:shadow-md ${
        selectedQuotes.includes(quote.id)
          ? 'border-l-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-l-gray-200 dark:border-l-gray-700'
      }`}
    >
      <div className="p-4">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={selectedQuotes.includes(quote.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedQuotes([...selectedQuotes, quote.id]);
              } else {
                setSelectedQuotes(selectedQuotes.filter(id => id !== quote.id));
              }
            }}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {quote.title}
              </h3>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(quote.status)}`}>
                  {quote.status}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(quote.priority)}`}>
                  {quote.priority}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
              {quote.description}
            </p>

            <div className="flex items-center space-x-6 mt-3 text-sm text-gray-500">
              <span>{formatCurrency(quote.price, quote.currency)}</span>
              <span>{quote.delivery_days} days</span>
              <span>{quote.manufacturer.name}</span>
              <span>{quote.customer.name}</span>
              <span>Updated {formatRelativeTime(quote.updated_at)}</span>
              {quote.comments_count > 0 && (
                <span className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {quote.comments_count}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveQuoteId(quote.id);
                setActivePanel('collaboration');
              }}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveQuoteId(quote.id);
                setActivePanel('history');
              }}
            >
              <History className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Quotes Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your quotes with advanced collaboration and analytics
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowExportModal(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <AdvancedQuoteFilters
                    onFiltersChange={handleFiltersChange}
                    initialFilters={filters}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bulk Operations */}
            {selectedQuotes.length > 0 && (
              <BulkQuoteOperations
                quotes={quotes as any}
                selectedQuotes={selectedQuotes}
                onSelectionChange={setSelectedQuotes}
                onRefresh={refetch}
              />
            )}

            {/* View Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {quotes.length} quotes found
                </span>
                {selectedQuotes.length > 0 && (
                  <span className="text-sm text-primary-600 dark:text-primary-400">
                    {selectedQuotes.length} selected
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-r-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-l-none"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Quotes List/Grid */}
            {isLoading ? (
              <LoadingSpinner center />
            ) : quotes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Search className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No quotes found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your filters or create a new quote
                </p>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                  : 'space-y-4'
              }>
                                {quotes.map((quote: any) =>
                  viewMode === 'grid'
                    ? renderQuoteCard(quote)
                    : renderQuoteList(quote)
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notifications Panel */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <QuoteNotifications />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active Quote Panels */}
            <AnimatePresence>
              {activeQuoteId && activePanel === 'collaboration' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Quote Discussion
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActivePanel(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-4">
                    <QuoteCollaboration
                      quoteId={activeQuoteId}
                      isManufacturer={user?.role === 'manufacturer'}
                    />
                  </div>
                </motion.div>
              )}

              {activeQuoteId && activePanel === 'history' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Version History
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActivePanel(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-4">
                    <QuoteVersionHistory quoteId={activeQuoteId} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Export Modal */}
        <AnimatePresence>
          {showExportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            >
              <QuoteExportReporting
                selectedQuotes={selectedQuotes}
                filters={filters}
                onClose={() => setShowExportModal(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EnhancedQuotesPage; 