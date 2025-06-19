import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitCompare,
  Filter,
  Download,
  X,
  Plus,
  Minus,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Equal,
  Star,
  Clock,
  DollarSign,
  Package,
  Building2,
  User,
  Calendar,
  FileText,
  BarChart3,
  PieChart,
  Eye,
  Share2,
  Bookmark,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import LoadingSpinner from '../ui/LoadingSpinner';
import { quotesApi } from '../../lib/api';
import { formatCurrency, formatRelativeTime } from '../../lib/utils';

interface Quote {
  id: number;
  title: string;
  description: string;
  price: number;
  currency: string;
  delivery_days: number;
  manufacturer: {
    id: number;
    name: string;
    rating: number;
    location: string;
    certifications: string[];
  };
  breakdown: {
    materials: number;
    labor: number;
    overhead: number;
    shipping: number;
    taxes: number;
  };
  specifications: {
    material: string;
    process: string;
    finish: string;
    tolerance: string;
    quantity: number;
  };
  terms: {
    payment_terms: string;
    warranty: string;
    return_policy: string;
  };
  attachments: Array<{
    id: number;
    name: string;
    url: string;
    type: string;
  }>;
  created_at: string;
  expires_at: string;
  status: string;
  priority: string;
  tags: string[];
  notes: string;
  score?: number;
}

interface ComparisonCriteria {
  price_weight: number;
  delivery_weight: number;
  quality_weight: number;
  manufacturer_rating_weight: number;
  show_differences_only: boolean;
  highlight_best_value: boolean;
  include_breakdown: boolean;
  include_specifications: boolean;
  include_terms: boolean;
}

interface EnhancedQuoteComparisonProps {
  initialQuotes?: Quote[];
  onClose?: () => void;
  className?: string;
}

const EnhancedQuoteComparison: React.FC<EnhancedQuoteComparisonProps> = ({
  initialQuotes = [],
  onClose,
  className
}) => {
  const [selectedQuotes, setSelectedQuotes] = useState<Quote[]>(initialQuotes);
  const [comparisonCriteria, setComparisonCriteria] = useState<ComparisonCriteria>({
    price_weight: 40,
    delivery_weight: 25,
    quality_weight: 20,
    manufacturer_rating_weight: 15,
    show_differences_only: false,
    highlight_best_value: true,
    include_breakdown: true,
    include_specifications: true,
    include_terms: false
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'delivery' | 'rating' | 'score'>('score');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');

  // Fetch available quotes for comparison
  const { data: availableQuotes = [], isLoading } = useQuery({
    queryKey: ['quotes-for-comparison'],
    queryFn: () => quotesApi.getQuotes(),
  });

  // Export comparison mutation
  const exportMutation = useMutation({
    mutationFn: (data: { quotes: number[]; criteria: ComparisonCriteria; format: string }) =>
      quotesApi.exportComparison ? quotesApi.exportComparison(data) : Promise.resolve(new Blob()),
    onSuccess: (response: any) => {
      // Handle file download
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quote-comparison.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Comparison exported successfully');
    },
    onError: () => {
      toast.error('Export failed');
    }
  });

  // Calculate comparison scores
  const calculateScore = (quote: Quote): number => {
    const maxPrice = Math.max(...selectedQuotes.map(q => q.price));
    const minPrice = Math.min(...selectedQuotes.map(q => q.price));
    const maxDelivery = Math.max(...selectedQuotes.map(q => q.delivery_days));
    const minDelivery = Math.min(...selectedQuotes.map(q => q.delivery_days));

    const priceScore = maxPrice > minPrice ? ((maxPrice - quote.price) / (maxPrice - minPrice)) * 100 : 100;
    const deliveryScore = maxDelivery > minDelivery ? ((maxDelivery - quote.delivery_days) / (maxDelivery - minDelivery)) * 100 : 100;
    const qualityScore = 80; // Placeholder - would be calculated based on specifications
    const ratingScore = (quote.manufacturer.rating / 5) * 100;

    return (
      (priceScore * comparisonCriteria.price_weight / 100) +
      (deliveryScore * comparisonCriteria.delivery_weight / 100) +
      (qualityScore * comparisonCriteria.quality_weight / 100) +
      (ratingScore * comparisonCriteria.manufacturer_rating_weight / 100)
    );
  };

  // Update scores when criteria or quotes change
  useEffect(() => {
    const updatedQuotes = selectedQuotes.map(quote => ({
      ...quote,
      score: calculateScore(quote)
    }));
    setSelectedQuotes(updatedQuotes);
  }, [comparisonCriteria]);

  const addQuoteToComparison = (quote: Quote) => {
    if (selectedQuotes.length >= 5) {
      toast.error('Maximum 5 quotes can be compared at once');
      return;
    }
    if (selectedQuotes.find(q => q.id === quote.id)) {
      toast.error('Quote already added to comparison');
      return;
    }
    setSelectedQuotes([...selectedQuotes, { ...quote, score: 0 }]);
  };

  const removeQuoteFromComparison = (quoteId: number) => {
    setSelectedQuotes(selectedQuotes.filter(q => q.id !== quoteId));
  };

  const getBestValue = (field: string): any => {
    switch (field) {
      case 'price':
        return Math.min(...selectedQuotes.map(q => q.price));
      case 'delivery_days':
        return Math.min(...selectedQuotes.map(q => q.delivery_days));
      case 'manufacturer_rating':
        return Math.max(...selectedQuotes.map(q => q.manufacturer.rating));
      case 'score':
        return Math.max(...selectedQuotes.map(q => q.score || 0));
      default:
        return null;
    }
  };

  const getComparisonIcon = (value: any, bestValue: any, field: string) => {
    if (value === bestValue) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    const isLowerBetter = ['price', 'delivery_days'].includes(field);
    const isHigher = value > bestValue;
    
    if ((isLowerBetter && isHigher) || (!isLowerBetter && !isHigher)) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    } else {
      return <TrendingUp className="h-4 w-4 text-orange-500" />;
    }
  };

  // Filter available quotes based on search
  const filteredAvailableQuotes = Array.isArray(availableQuotes) 
    ? availableQuotes.filter((quote: Quote) =>
        quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.manufacturer.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const sortedSelectedQuotes = [...selectedQuotes].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price - b.price;
      case 'delivery':
        return a.delivery_days - b.delivery_days;
      case 'rating':
        return b.manufacturer.rating - a.manufacturer.rating;
      case 'score':
        return (b.score || 0) - (a.score || 0);
      default:
        return 0;
    }
  });

  const handleExport = () => {
    if (selectedQuotes.length === 0) {
      toast.error('No quotes selected for export');
      return;
    }

    exportMutation.mutate({
      quotes: selectedQuotes.map(q => q.id),
      criteria: comparisonCriteria,
      format: exportFormat
    });
  };

  const comparisonFields = [
    { key: 'price', label: 'Price', format: (value: number, currency: string) => formatCurrency(value, currency) },
    { key: 'delivery_days', label: 'Delivery Time', format: (value: number) => `${value} days` },
    { key: 'manufacturer_rating', label: 'Manufacturer Rating', format: (value: number) => `${value}/5 ⭐` },
    { key: 'score', label: 'Overall Score', format: (value: number) => `${Math.round(value)}/100` }
  ];

  if (isLoading) {
    return <LoadingSpinner center />;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <GitCompare className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Quote Comparison
          </h2>
          {selectedQuotes.length > 0 && (
            <span className="bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 text-sm px-2 py-1 rounded-full">
              {selectedQuotes.length} quotes
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={selectedQuotes.length === 0}
            loading={exportMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {/* Comparison Criteria */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Comparison Criteria Weights
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price ({comparisonCriteria.price_weight}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={comparisonCriteria.price_weight}
                      onChange={(e) => setComparisonCriteria({
                        ...comparisonCriteria,
                        price_weight: Number(e.target.value)
                      })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Delivery ({comparisonCriteria.delivery_weight}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={comparisonCriteria.delivery_weight}
                      onChange={(e) => setComparisonCriteria({
                        ...comparisonCriteria,
                        delivery_weight: Number(e.target.value)
                      })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quality ({comparisonCriteria.quality_weight}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={comparisonCriteria.quality_weight}
                      onChange={(e) => setComparisonCriteria({
                        ...comparisonCriteria,
                        quality_weight: Number(e.target.value)
                      })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rating ({comparisonCriteria.manufacturer_rating_weight}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={comparisonCriteria.manufacturer_rating_weight}
                      onChange={(e) => setComparisonCriteria({
                        ...comparisonCriteria,
                        manufacturer_rating_weight: Number(e.target.value)
                      })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Display Options */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Display Options
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={comparisonCriteria.show_differences_only}
                      onChange={(e) => setComparisonCriteria({
                        ...comparisonCriteria,
                        show_differences_only: e.target.checked
                      })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Show differences only
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={comparisonCriteria.highlight_best_value}
                      onChange={(e) => setComparisonCriteria({
                        ...comparisonCriteria,
                        highlight_best_value: e.target.checked
                      })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Highlight best values
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={comparisonCriteria.include_breakdown}
                      onChange={(e) => setComparisonCriteria({
                        ...comparisonCriteria,
                        include_breakdown: e.target.checked
                      })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Include cost breakdown
                    </span>
                  </label>
                </div>
              </div>

              {/* Export Options */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Export Options
                </h3>
                <div className="flex items-center space-x-4">
                  <Select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'excel' | 'csv')}
                    options={[
                      { value: 'pdf', label: 'PDF Report' },
                      { value: 'excel', label: 'Excel Spreadsheet' },
                      { value: 'csv', label: 'CSV Data' }
                    ]}
                    className="w-48"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex h-[calc(100vh-200px)]">
        {/* Quote Selection Sidebar */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Quotes to Compare
            </h3>
            
            {/* Search */}
            <Input
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />

            {/* Available Quotes */}
            <div className="space-y-2">
              {filteredAvailableQuotes.map((quote: Quote) => (
                <div
                  key={quote.id}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {quote.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {quote.manufacturer.name}
                      </p>
                      <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                        <span>{formatCurrency(quote.price, quote.currency)}</span>
                        <span>•</span>
                        <span>{quote.delivery_days} days</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addQuoteToComparison(quote)}
                      disabled={selectedQuotes.find(q => q.id === quote.id) !== undefined}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-auto">
          {selectedQuotes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <GitCompare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No quotes selected
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Select quotes from the sidebar to start comparing
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* Sort Controls */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Comparison Results
                </h3>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'delivery' | 'rating' | 'price' | 'score')}
                  options={[
                    { value: 'score', label: 'Sort by Score' },
                    { value: 'price', label: 'Sort by Price' },
                    { value: 'delivery', label: 'Sort by Delivery' },
                    { value: 'rating', label: 'Sort by Rating' }
                  ]}
                  className="w-48"
                />
              </div>

              {/* Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-white">
                        Field
                      </th>
                      {sortedSelectedQuotes.map(quote => (
                        <th key={quote.id} className="text-center p-4 min-w-48">
                          <div className="space-y-2">
                            <div className="flex items-center justify-center space-x-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {quote.title}
                              </h4>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeQuoteFromComparison(quote.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {quote.manufacturer.name}
                            </p>
                            {quote.score !== undefined && (
                              <div className="flex items-center justify-center space-x-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-medium">
                                  {Math.round(quote.score)}/100
                                </span>
                              </div>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Main Comparison Fields */}
                    {comparisonFields.map(field => {
                      const bestValue = getBestValue(field.key);
                      return (
                        <tr key={field.key} className="border-b border-gray-200 dark:border-gray-700">
                          <td className="p-4 font-medium text-gray-900 dark:text-white">
                            {field.label}
                          </td>
                          {sortedSelectedQuotes.map(quote => {
                            const value = field.key === 'manufacturer_rating' 
                              ? quote.manufacturer.rating 
                              : field.key === 'score'
                              ? quote.score || 0
                              : quote[field.key as keyof Quote] as number;
                            
                            const isBest = value === bestValue;
                            
                            return (
                              <td key={quote.id} className="p-4 text-center">
                                <div className={`flex items-center justify-center space-x-2 ${
                                  isBest && comparisonCriteria.highlight_best_value 
                                    ? 'bg-green-50 dark:bg-green-900/20 rounded-lg p-2' 
                                    : ''
                                }`}>
                                  <span className="font-medium">
                                    {field.key === 'price' 
                                      ? field.format(value, quote.currency)
                                      : field.format(value, quote.currency)
                                    }
                                  </span>
                                  {comparisonCriteria.highlight_best_value && 
                                    getComparisonIcon(value, bestValue, field.key)
                                  }
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {/* Cost Breakdown */}
                    {comparisonCriteria.include_breakdown && (
                      <>
                        <tr className="bg-gray-50 dark:bg-gray-700">
                          <td colSpan={selectedQuotes.length + 1} className="p-4 font-semibold text-gray-900 dark:text-white">
                            Cost Breakdown
                          </td>
                        </tr>
                        {['materials', 'labor', 'overhead', 'shipping', 'taxes'].map(breakdownField => (
                          <tr key={breakdownField} className="border-b border-gray-200 dark:border-gray-700">
                            <td className="p-4 text-gray-700 dark:text-gray-300 capitalize">
                              {breakdownField}
                            </td>
                            {sortedSelectedQuotes.map(quote => (
                              <td key={quote.id} className="p-4 text-center">
                                {formatCurrency(quote.breakdown[breakdownField as keyof typeof quote.breakdown], quote.currency)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    )}

                    {/* Specifications */}
                    {comparisonCriteria.include_specifications && (
                      <>
                        <tr className="bg-gray-50 dark:bg-gray-700">
                          <td colSpan={selectedQuotes.length + 1} className="p-4 font-semibold text-gray-900 dark:text-white">
                            Specifications
                          </td>
                        </tr>
                        {['material', 'process', 'finish', 'tolerance', 'quantity'].map(specField => (
                          <tr key={specField} className="border-b border-gray-200 dark:border-gray-700">
                            <td className="p-4 text-gray-700 dark:text-gray-300 capitalize">
                              {specField}
                            </td>
                            {sortedSelectedQuotes.map(quote => (
                              <td key={quote.id} className="p-4 text-center">
                                {quote.specifications[specField as keyof typeof quote.specifications]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    )}

                    {/* Additional Info */}
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        Expires
                      </td>
                      {sortedSelectedQuotes.map(quote => (
                        <td key={quote.id} className="p-4 text-center text-sm">
                          {format(new Date(quote.expires_at), 'MMM dd, yyyy')}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedQuoteComparison; 