import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown,
  Filter,
  Star,
  MapPin,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Heart,
  MessageSquare,
  Eye,
  BarChart3,
  Calculator,
  Shield,
  FileCheck,
  Users,
  ChevronDown,
  Download,
  Share2,
  Bookmark,
  MessageCircle,
  Award,
  Target,
  Scale,
  Zap
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

import { quotesApi, ordersApi } from '../../lib/api';
import { Quote, Order, QuoteStatus, Manufacturer } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import LoadingSpinner from '../ui/LoadingSpinner';
import QuotePricingChart from './QuotePricingChart';
import QuoteTimelineViz from './QuoteTimelineViz';
import ManufacturerQuickPreview from './ManufacturerQuickPreview';
import QuoteDetailModal from './QuoteDetailModal';
import DecisionSupportPanel from './DecisionSupportPanel';
import CollaborativeEvaluation from './CollaborativeEvaluation';
import { formatCurrency, cn, calculateTotalCostOfOwnership } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import useWebSocket from '../../hooks/useWebSocket';

interface QuoteComparisonProps {
  orderId: string;
  onQuoteSelect?: (quote: Quote) => void;
  className?: string;
}

interface ComparisonCriteria {
  price: number;
  delivery: number;
  quality: number;
  reliability: number;
  compliance: number;
}

interface QuoteEvaluation {
  quoteId: string;
  notes: string;
  rating: number;
  pros: string[];
  cons: string[];
  riskAssessment: 'low' | 'medium' | 'high';
  complianceScore: number;
  favorited: boolean;
  internalComments: string[];
}

type SortField = 'price' | 'delivery' | 'rating' | 'score' | 'tco';
type ViewMode = 'table' | 'cards' | 'detailed';

const QuoteComparison: React.FC<QuoteComparisonProps> = ({
  orderId,
  onQuoteSelect,
  className
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { socket } = useWebSocket();

  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showDecisionSupport, setShowDecisionSupport] = useState(false);
  const [showCollaborative, setShowCollaborative] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [comparisonCriteria, setComparisonCriteria] = useState<ComparisonCriteria>({
    price: 30,
    delivery: 20,
    quality: 25,
    reliability: 15,
    compliance: 10
  });

  // Filters
  const [filters, setFilters] = useState({
    maxPrice: '',
    maxDelivery: '',
    minRating: '',
    manufacturer: '',
    compliance: 'all',
    riskLevel: 'all'
  });

  // Fetch order and quotes
  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(parseInt(orderId!)),
  });

  const { data: quotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ['quotes', orderId],
    queryFn: () => quotesApi.getQuotesByOrder(parseInt(orderId)),
    refetchInterval: 30000,
  });

  // Fetch evaluations
  const { data: evaluations = [] } = useQuery({
    queryKey: ['quote-evaluations', orderId],
    queryFn: () => quotesApi.getQuoteEvaluations(parseInt(orderId)),
  });

  // WebSocket for real-time updates
  React.useEffect(() => {
    if (!socket || !orderId) return;

    socket.emit('join-order', orderId);

    socket.on('quote-updated', (_data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes', orderId] });
      toast('Quote updated in real-time');
    });

    socket.on('new-quote', (_data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes', orderId] });
      toast.success('New quote received!');
    });

    return () => {
      socket.off('quote-updated');
      socket.off('new-quote');
    };
  }, [socket, orderId, queryClient]);

  // Calculate quote scores based on criteria
  const calculateQuoteScore = useCallback((quote: Quote): number => {
    const evaluation = evaluations.find(e => e.quoteId === quote.id);
    
    // Normalize values (0-100 scale)
    const priceScore = Math.max(0, 100 - ((quote.totalAmount / Math.max(...quotes.map(q => q.totalAmount))) * 100));
    const deliveryScore = Math.max(0, 100 - ((quote.deliveryTime / Math.max(...quotes.map(q => q.deliveryTime))) * 100));
    const qualityScore = (quote.manufacturer?.rating || 0) * 20; // Convert 5-star to 100 scale
    const reliabilityScore = (quote.manufacturer?.reviewCount || 0) > 10 ? 80 : 60; // Based on review count
    const complianceScore = evaluation?.complianceScore || 70; // Default if not evaluated

    // Apply weighted scoring
    const totalScore = (
      (priceScore * comparisonCriteria.price / 100) +
      (deliveryScore * comparisonCriteria.delivery / 100) +
      (qualityScore * comparisonCriteria.quality / 100) +
      (reliabilityScore * comparisonCriteria.reliability / 100) +
      (complianceScore * comparisonCriteria.compliance / 100)
    );

    return Math.round(totalScore);
  }, [quotes, evaluations, comparisonCriteria]);

  // Filter and sort quotes
  const processedQuotes = useMemo(() => {
    let filtered = [...quotes];

    // Apply filters
    if (filters.maxPrice) {
      filtered = filtered.filter(q => q.totalAmount <= parseFloat(filters.maxPrice));
    }
    if (filters.maxDelivery) {
      filtered = filtered.filter(q => q.deliveryTime <= parseInt(filters.maxDelivery));
    }
    if (filters.minRating) {
      filtered = filtered.filter(q => (q.manufacturer?.rating || 0) >= parseFloat(filters.minRating));
    }
    if (filters.manufacturer) {
      filtered = filtered.filter(q => 
        q.manufacturer?.companyName.toLowerCase().includes(filters.manufacturer.toLowerCase())
      );
    }

    // Add calculated fields
    const enriched = filtered.map(quote => ({
      ...quote,
      score: calculateQuoteScore(quote),
      tco: calculateTotalCostOfOwnership(quote),
      evaluation: evaluations.find(e => e.quoteId === quote.id)
    }));

    // Sort
    enriched.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'price':
          aValue = a.totalAmount;
          bValue = b.totalAmount;
          break;
        case 'delivery':
          aValue = a.deliveryTime;
          bValue = b.deliveryTime;
          break;
        case 'rating':
          aValue = a.manufacturer?.rating || 0;
          bValue = b.manufacturer?.rating || 0;
          break;
        case 'score':
          aValue = a.score;
          bValue = b.score;
          break;
        case 'tco':
          aValue = a.tco;
          bValue = b.tco;
          break;
        default:
          aValue = a.score;
          bValue = b.score;
      }

      const comparison = typeof aValue === 'string' 
        ? aValue.localeCompare(bValue)
        : aValue - bValue;

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return enriched;
  }, [quotes, filters, sortField, sortDirection, calculateQuoteScore, evaluations]);

  // Mutations
  const favoriteQuoteMutation = useMutation({
    mutationFn: ({ quoteId, favorited }: { quoteId: string; favorited: boolean }) =>
      quotesApi.favoriteQuote(parseInt(quoteId), favorited),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-evaluations', orderId] });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ quoteId, note }: { quoteId: string; note: string }) =>
      quotesApi.addQuoteNote(parseInt(quoteId), note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-evaluations', orderId] });
    },
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleQuoteSelect = (quote: Quote) => {
    setSelectedQuote(quote);
    if (onQuoteSelect) {
      onQuoteSelect(quote);
    }
  };

  const handleFavorite = (quoteId: string, favorited: boolean) => {
    favoriteQuoteMutation.mutate({ quoteId, favorited });
  };

    const getRecommendedQuote = () => {
    if (processedQuotes.length === 0) return null;
    return processedQuotes.reduce((best, current) =>
      current.score > (best?.score || 0) ? current : best
    );
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-success-600 bg-success-100 dark:bg-success-900 dark:text-success-300';
      case 'medium': return 'text-warning-600 bg-warning-100 dark:bg-warning-900 dark:text-warning-300';
      case 'high': return 'text-error-600 bg-error-100 dark:bg-error-900 dark:text-error-300';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const renderComparisonTable = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedQuotes(processedQuotes.map(q => q.id));
                    } else {
                      setSelectedQuotes([]);
                    }
                  }}
                  checked={selectedQuotes.length === processedQuotes.length && processedQuotes.length > 0}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Manufacturer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('price')}
                  className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <span>Price</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('delivery')}
                  className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <span>Delivery</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('rating')}
                  className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <span>Rating</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('score')}
                  className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <span>Score</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Risk
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {processedQuotes.map((quote) => {
              const recommended = getRecommendedQuote();
              const isRecommended = recommended?.id === quote.id;
              const evaluation = quote.evaluation;

              return (
                <motion.tr
                  key={quote.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer',
                    isRecommended && 'bg-success-50 dark:bg-success-900/20 border-l-4 border-success-500'
                  )}
                  onClick={() => handleQuoteSelect(quote)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={selectedQuotes.includes(quote.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedQuotes(prev => [...prev, quote.id]);
                          } else {
                            setSelectedQuotes(prev => prev.filter(id => id !== quote.id));
                          }
                        }}
                      />
                      {isRecommended && (
                        <div className="flex items-center text-success-600 dark:text-success-400">
                          <Award className="w-4 h-4 mr-1" />
                          <span className="text-xs font-medium">Recommended</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={quote.manufacturer?.logoUrl || '/placeholder-logo.png'}
                          alt={quote.manufacturer?.companyName}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {quote.manufacturer?.companyName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {quote.manufacturer?.location?.city}, {quote.manufacturer?.location?.country}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(quote.totalAmount, quote.currency)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      TCO: {formatCurrency(quote.tco, quote.currency)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900 dark:text-white">
                      <Clock className="w-4 h-4 mr-1 text-gray-400" />
                      {quote.deliveryTime} days
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      By {format(new Date(Date.now() + quote.deliveryTime * 24 * 60 * 60 * 1000), 'MMM dd')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'w-4 h-4',
                              i < Math.floor(quote.manufacturer?.rating || 0)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300 dark:text-gray-600'
                            )}
                          />
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        ({quote.manufacturer?.reviewCount || 0})
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center justify-center w-12 h-8 bg-primary-100 dark:bg-primary-900 rounded-full">
                        <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                          {quote.score}
                        </span>
                      </div>
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${quote.score}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      getRiskColor(evaluation?.riskAssessment || 'medium')
                    )}>
                      {evaluation?.riskAssessment || 'Not assessed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleFavorite(quote.id, !evaluation?.favorited);
                        }}
                      >
                        <Heart className={cn(
                          'w-4 h-4',
                          evaluation?.favorited ? 'fill-red-500 text-red-500' : 'text-gray-400'
                        )} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setSelectedQuote(quote);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderQuoteCards = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {processedQuotes.map((quote) => {
        const recommended = getRecommendedQuote();
        const isRecommended = recommended?.id === quote.id;
        const evaluation = quote.evaluation;

        return (
          <motion.div
            key={quote.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 cursor-pointer hover:shadow-md transition-shadow',
              isRecommended && 'border-success-500 bg-success-50 dark:bg-success-900/20'
            )}
            onClick={() => handleQuoteSelect(quote)}
          >
            {isRecommended && (
              <div className="flex items-center text-success-600 dark:text-success-400 mb-4">
                <Award className="w-5 h-5 mr-2" />
                <span className="font-medium">Recommended Quote</span>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <img
                  className="h-12 w-12 rounded-full"
                  src={quote.manufacturer?.logoUrl || '/placeholder-logo.png'}
                  alt={quote.manufacturer?.companyName}
                />
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {quote.manufacturer?.companyName}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="w-3 h-3 mr-1" />
                    {quote.manufacturer?.location?.city}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleFavorite(quote.id, !evaluation?.favorited);
                }}
              >
                <Heart className={cn(
                  'w-5 h-5',
                  evaluation?.favorited ? 'fill-red-500 text-red-500' : 'text-gray-400'
                )} />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(quote.totalAmount, quote.currency)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    TCO: {formatCurrency(quote.tco, quote.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full">
                    <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                      {quote.score}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Score</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {quote.deliveryTime} days
                  </span>
                </div>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-4 h-4',
                        i < Math.floor(quote.manufacturer?.rating || 0)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300 dark:text-gray-600'
                      )}
                    />
                  ))}
                  <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
                    ({quote.manufacturer?.reviewCount || 0})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={cn(
                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                  getRiskColor(evaluation?.riskAssessment || 'medium')
                )}>
                  {evaluation?.riskAssessment || 'Not assessed'} risk
                </span>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  if (quotesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quote Comparison
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Compare and evaluate {quotes.length} quotes for order #{order?.id}
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
            onClick={() => setShowDecisionSupport(!showDecisionSupport)}
            leftIcon={<Calculator className="w-4 h-4" />}
          >
            Decision Support
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCollaborative(!showCollaborative)}
            leftIcon={<Users className="w-4 h-4" />}
          >
            Collaborate
          </Button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            Table
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            Cards
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {processedQuotes.length} of {quotes.length} quotes
          </span>
          {selectedQuotes.length > 0 && (
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              {selectedQuotes.length} selected
            </span>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Max Price"
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                placeholder="Enter maximum price"
              />
              <Input
                label="Max Delivery (days)"
                type="number"
                value={filters.maxDelivery}
                onChange={(e) => setFilters(prev => ({ ...prev, maxDelivery: e.target.value }))}
                placeholder="Enter max delivery time"
              />
              <Input
                label="Min Rating"
                type="number"
                step="0.1"
                max="5"
                value={filters.minRating}
                onChange={(e) => setFilters(prev => ({ ...prev, minRating: e.target.value }))}
                placeholder="Minimum rating"
              />
              <Input
                label="Manufacturer"
                value={filters.manufacturer}
                onChange={(e) => setFilters(prev => ({ ...prev, manufacturer: e.target.value }))}
                placeholder="Search manufacturers"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decision Support Panel */}
      <AnimatePresence>
        {showDecisionSupport && (
          <DecisionSupportPanel
            quotes={processedQuotes}
            criteria={comparisonCriteria}
            onCriteriaChange={setComparisonCriteria}
            onClose={() => setShowDecisionSupport(false)}
          />
        )}
      </AnimatePresence>

      {/* Collaborative Evaluation */}
      <AnimatePresence>
        {showCollaborative && (
          <CollaborativeEvaluation
            orderId={orderId}
            quotes={processedQuotes}
            onClose={() => setShowCollaborative(false)}
          />
        )}
      </AnimatePresence>

      {/* Quote Display */}
      {viewMode === 'table' ? renderComparisonTable() : renderQuoteCards()}

      {/* Quote Detail Modal */}
      <AnimatePresence>
        {selectedQuote && (
          <QuoteDetailModal
            quote={selectedQuote}
            onClose={() => setSelectedQuote(null)}
            onSelect={handleQuoteSelect}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuoteComparison; 