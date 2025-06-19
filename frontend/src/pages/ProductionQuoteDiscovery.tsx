import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Zap,
  Eye,
  MessageSquare,
  TrendingUp,
  Star,
  Clock,
  DollarSign,
  Package,
  MapPin,
  Calendar,
  ChevronDown,
  X,
  Send,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

import { productionQuotesApi, productionQuoteHelpers } from '../lib/api/productionQuotes';
import { 
  ProductionQuote, 
  ProductionQuoteFilters, 
  ProductionQuoteType,
  ProductionQuoteInquiryCreate,
  CapabilityCategory 
} from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency, cn } from '../lib/utils';
import EmptyState from '../components/ui/EmptyState';

const ProductionQuoteDiscovery: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState<number[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<ProductionQuote | null>(null);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  
  const [filters, setFilters] = useState<ProductionQuoteFilters>({
    isActive: true,
    isPublic: true,
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
    pageSize: 12
  });

  // Production quotes removed - using real API data only

      // Fetch production quotes from API
  const { data: apiQuotes, isLoading, error, refetch } = useQuery({
    queryKey: ['production-quotes-discovery', filters, searchQuery],
    queryFn: () => productionQuotesApi.search({
      ...filters,
      searchQuery: searchQuery || undefined
    }),
    refetchInterval: 30000
  });

      // Use API data
  const productionQuotes = apiQuotes || [];

  // Create inquiry mutation
  const createInquiryMutation = useMutation({
    mutationFn: ({ quoteId, inquiryData }: { quoteId: number; inquiryData: ProductionQuoteInquiryCreate }) =>
      productionQuotesApi.createInquiry(quoteId, inquiryData),
    onSuccess: () => {
      toast.success('Inquiry sent successfully!');
      setShowInquiryModal(false);
      setSelectedQuote(null);
    },
    onError: () => {
      toast.error('Failed to send inquiry');
    }
  });

  const handleFilterChange = (key: keyof ProductionQuoteFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSaveQuote = (quoteId: number) => {
    setSavedQuotes(prev => 
      prev.includes(quoteId) 
        ? prev.filter(id => id !== quoteId)
        : [...prev, quoteId]
    );
  };

  const handleSendInquiry = (quote: ProductionQuote) => {
    setSelectedQuote(quote);
    setShowInquiryModal(true);
  };

  const clearFilters = () => {
    setFilters({
      isActive: true,
      isPublic: true,
      sortBy: 'created_at',
      sortOrder: 'desc',
      page: 1,
      pageSize: 12
    });
    setSearchQuery('');
  };

  const filteredQuotes = useMemo(() => {
    return productionQuotes.filter((quote: ProductionQuote) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          quote.title.toLowerCase().includes(query) ||
          quote.description?.toLowerCase().includes(query) ||
          quote.manufacturingProcesses.some(process => 
            process.toLowerCase().includes(query)
          ) ||
          quote.materials.some(material => 
            material.toLowerCase().includes(query)
          )
        );
      }
      return true;
    });
  }, [productionQuotes, searchQuery]);

  if (isLoading) return <LoadingSpinner center />;
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EmptyState
            title="Failed to load production quotes"
            description={error instanceof Error ? error.message : 'Unable to fetch quotes'}
            onRetry={refetch}
          />
        </div>
      </div>
    );
  }

  if (!productionQuotes.length) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EmptyState
            title="No production quotes available"
            description="No manufacturers have published quotes matching your criteria."
            onRetry={refetch}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Production Quote Discovery
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Find manufacturers with available capacity for your projects
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                leftIcon={<Filter className="w-4 h-4" />}
              >
                Filters
              </Button>
              <Button
                variant="outline"
                onClick={() => refetch()}
                leftIcon={<Search className="w-4 h-4" />}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, description, processes, or materials..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Demo Data Notice Removed - Production Mode */}

          {/* Active Filters */}
          {(filters.productionQuoteType || filters.manufacturingProcesses?.length || filters.materials?.length) && (
            <div className="mt-4 flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Active filters:</span>
              {filters.productionQuoteType && (
                <span className="px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300 rounded-full text-xs">
                  {productionQuoteHelpers.formatQuoteType(filters.productionQuoteType)}
                </span>
              )}
              {filters.manufacturingProcesses?.map((process, index) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full text-xs">
                  {process}
                </span>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-80 flex-shrink-0"
              >
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Filters
                  </h3>

                  <div className="space-y-6">
                    {/* Quote Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quote Type
                      </label>
                      <Select
                        value={filters.productionQuoteType || ''}
                        onChange={(e) => handleFilterChange('productionQuoteType', e.target.value || undefined)}
                        options={[
                          { value: '', label: 'All Types' },
                          { value: ProductionQuoteType.CAPACITY_AVAILABILITY, label: 'Capacity Availability' },
                          { value: ProductionQuoteType.STANDARD_PRODUCT, label: 'Standard Product' },
                          { value: ProductionQuoteType.PROMOTIONAL, label: 'Promotional Offer' },
                          { value: ProductionQuoteType.PROTOTYPE_RD, label: 'Prototype & R&D' },
                        ]}
                      />
                    </div>

                    {/* Manufacturing Processes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Manufacturing Processes
                      </label>
                      <Select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleFilterChange('manufacturingProcesses', [
                              ...(filters.manufacturingProcesses || []),
                              e.target.value
                            ]);
                          }
                        }}
                        options={[
                          { value: '', label: 'Add Process...' },
                          { value: CapabilityCategory.CNC_MACHINING, label: 'CNC Machining' },
                          { value: CapabilityCategory.ADDITIVE_MANUFACTURING, label: '3D Printing' },
                          { value: CapabilityCategory.INJECTION_MOLDING, label: 'Injection Molding' },
                          { value: CapabilityCategory.SHEET_METAL, label: 'Sheet Metal' },
                          { value: CapabilityCategory.CASTING, label: 'Casting' },
                          { value: CapabilityCategory.WELDING, label: 'Welding' },
                        ]}
                      />
                      {filters.manufacturingProcesses?.map((process, index) => (
                        <div key={index} className="flex items-center justify-between mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="text-sm">{process}</span>
                          <button
                            onClick={() => handleFilterChange('manufacturingProcesses', 
                              filters.manufacturingProcesses?.filter(p => p !== process)
                            )}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Price Range */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Price Range
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={filters.minPrice || ''}
                          onChange={(e) => handleFilterChange('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={filters.maxPrice || ''}
                          onChange={(e) => handleFilterChange('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </div>
                    </div>

                    {/* Lead Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Lead Time (days)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g., 30"
                        value={filters.maxLeadTimeDays || ''}
                        onChange={(e) => handleFilterChange('maxLeadTimeDays', e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>

                    {/* Sort Options */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sort By
                      </label>
                      <Select
                        value={filters.sortBy || 'created_at'}
                        onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                        options={[
                          { value: 'created_at', label: 'Newest First' },
                          { value: 'updated_at', label: 'Recently Updated' },
                          { value: 'priority_level', label: 'Priority Level' },
                          { value: 'view_count', label: 'Most Viewed' },
                          { value: 'base_price', label: 'Price' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  {filteredQuotes.length} Production Quotes Available
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing active production quotes from verified manufacturers
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {savedQuotes.length} saved
                </span>
              </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : filteredQuotes.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Production Quotes Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Try adjusting your search criteria or filters
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            ) : (
              /* Production Quotes Grid */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredQuotes.map((quote: ProductionQuote) => {
                  const availability = productionQuoteHelpers.getAvailabilityStatus(quote);
                  const priority = productionQuoteHelpers.getPriorityDisplay(quote.priorityLevel);
                  const isSaved = savedQuotes.includes(quote.id);

                  return (
                    <motion.div
                      key={quote.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                              {quote.title}
                            </h3>
                            <span className={cn(
                              'px-2 py-1 rounded-full text-xs font-medium',
                              `bg-${availability.color}-100 text-${availability.color}-800 dark:bg-${availability.color}-900 dark:text-${availability.color}-300`
                            )}>
                              {availability.message}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                            {quote.description}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveQuote(quote.id)}
                          className="ml-2"
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-4 h-4 text-primary-600" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Type:</span>
                          <span className="ml-2 font-medium">
                            {productionQuoteHelpers.formatQuoteType(quote.productionQuoteType)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Lead Time:</span>
                          <span className="ml-2 font-medium">{quote.leadTimeDays} days</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Min Quantity:</span>
                          <span className="ml-2 font-medium">{quote.minimumQuantity || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Pricing:</span>
                          <span className="ml-2 font-medium">
                            {productionQuoteHelpers.formatPricingModel(quote.pricingModel)}
                          </span>
                        </div>
                      </div>

                      {quote.manufacturingProcesses.length > 0 && (
                        <div className="mb-4">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Processes:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {quote.manufacturingProcesses.slice(0, 3).map((process, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                              >
                                {process}
                              </span>
                            ))}
                            {quote.manufacturingProcesses.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                                +{quote.manufacturingProcesses.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Eye className="w-4 h-4" />
                            <span>{quote.viewCount}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{quote.inquiryCount}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="w-4 h-4" />
                            <span>{productionQuoteHelpers.calculateConversionRate(quote.inquiryCount, quote.conversionCount).toFixed(1)}%</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSendInquiry(quote)}
                          leftIcon={<Send className="w-4 h-4" />}
                        >
                          Send Inquiry
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inquiry Modal */}
      <InquiryModal
        isOpen={showInquiryModal}
        onClose={() => {
          setShowInquiryModal(false);
          setSelectedQuote(null);
        }}
        quote={selectedQuote}
        onSubmit={(inquiryData) => {
          if (selectedQuote) {
            createInquiryMutation.mutate({ quoteId: selectedQuote.id, inquiryData });
          }
        }}
        isLoading={createInquiryMutation.isPending}
      />
    </div>
  );
};

// Inquiry Modal Component
interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: ProductionQuote | null;
  onSubmit: (data: ProductionQuoteInquiryCreate) => void;
  isLoading: boolean;
}

const InquiryModal: React.FC<InquiryModalProps> = ({
  isOpen,
  onClose,
  quote,
  onSubmit,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    message: '',
    estimatedQuantity: '',
    estimatedBudget: '',
    timeline: '',
    preferredDeliveryDate: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const inquiryData: ProductionQuoteInquiryCreate = {
      message: formData.message,
      estimatedQuantity: formData.estimatedQuantity ? parseInt(formData.estimatedQuantity) : undefined,
      estimatedBudget: formData.estimatedBudget ? parseFloat(formData.estimatedBudget) : undefined,
      timeline: formData.timeline || undefined,
      preferredDeliveryDate: formData.preferredDeliveryDate || undefined,
      specificRequirements: {}
    };

    onSubmit(inquiryData);
  };

  if (!isOpen || !quote) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Send Inquiry
            </h2>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              {quote.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {quote.description}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                rows={4}
                placeholder="Describe your project requirements and any specific questions..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Estimated Quantity"
                type="number"
                value={formData.estimatedQuantity}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedQuantity: e.target.value }))}
                placeholder="e.g., 100"
              />
              <Input
                label="Estimated Budget"
                type="number"
                step="0.01"
                value={formData.estimatedBudget}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedBudget: e.target.value }))}
                placeholder="e.g., 5000"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Timeline"
                value={formData.timeline}
                onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                placeholder="e.g., 2-3 weeks"
              />
              <Input
                label="Preferred Delivery Date"
                type="date"
                value={formData.preferredDeliveryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, preferredDeliveryDate: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isLoading}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Send Inquiry
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductionQuoteDiscovery; 