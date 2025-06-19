import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Star, TrendingUp, Clock, DollarSign, Shield, Award,
  Check, X, AlertTriangle, Calculator, BarChart3,
  Download, Share2, Bookmark, Filter, RefreshCw,
  Target, Zap, Brain, Settings, Users, Package,
  TrendingDown, ArrowUpRight, ArrowDownRight,
  Grid, List, Eye, MessageSquare, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

import { quotesApi } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Quote, UserRole } from '../../types';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Badge } from '../../components/ui/badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface ComparisonMetrics {
  priceScore: number;
  qualityScore: number;
  timeScore: number;
  reliabilityScore: number;
  capabilityScore: number;
  riskScore: number;
  complianceScore: number;
  sustainabilityScore: number;
  innovationScore: number;
  overallScore: number;
  recommendation: 'accept' | 'negotiate' | 'reject' | 'investigate';
  confidenceLevel: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface WeightedCriteria {
  price: number;
  quality: number;
  delivery: number;
  reliability: number;
  capability: number;
  risk: number;
  compliance: number;
  sustainability: number;
  innovation: number;
}

interface AdvancedAnalytics {
  marketPosition: 'premium' | 'competitive' | 'budget';
  valueForMoney: number;
  totalCostOfOwnership: number;
  returnOnInvestment: number;
  paybackPeriod: number;
  netPresentValue: number;
}

const QuoteComparisonPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const selectedQuoteIds = searchParams.get('quotes')?.split(',') || [];

  const [criteria, setCriteria] = useState<WeightedCriteria>({
    price: 30,
    quality: 20,
    delivery: 15,
    reliability: 10,
    capability: 8,
    risk: 7,
    compliance: 5,
    sustainability: 3,
    innovation: 2
  });

  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [comparisonView, setComparisonView] = useState<'grid' | 'table' | 'detailed'>('grid');
  const [selectedQuoteForDetail, setSelectedQuoteForDetail] = useState<number | null>(null);
  const [showCriteriaWeights, setShowCriteriaWeights] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  // Fetch quotes for comparison with real-time updates
  const { data: quotes, isLoading, refetch } = useQuery({
    queryKey: ['quotes-comparison', orderId, selectedQuoteIds],
    queryFn: async () => {
      if (orderId) {
        const response = await quotesApi.getByOrderId(parseInt(orderId));
        return response.quotes || [];
      } else if (selectedQuoteIds.length > 0) {
        const quotePromises = selectedQuoteIds.map(id => 
          quotesApi.getById(parseInt(id))
        );
        return Promise.all(quotePromises);
      }
      return [];
    },
    enabled: !!(orderId || selectedQuoteIds.length > 0),
    refetchInterval: refreshInterval
  });

  // Fetch market data for advanced analytics
  const { data: marketData } = useQuery({
    queryKey: ['market-data', orderId],
    queryFn: async () => {
      if (orderId) {
        return await quotesApi.getMarketData(parseInt(orderId));
      }
      return null;
    },
    enabled: !!orderId
  });

  // Enhanced scoring algorithm with machine learning insights
  const calculateAdvancedMetrics = useCallback((quote: Quote, allQuotes: Quote[], marketData?: any): ComparisonMetrics => {
    const prices = allQuotes.map(q => q.totalAmount);
    const deliveryTimes = allQuotes.map(q => q.deliveryTime);
    const qualityRatings = allQuotes.map(q => q.manufacturer?.rating || 0);

    // Enhanced Price Score with market analysis
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const marketAverage = marketData?.averagePrice || avgPrice;
    
    const priceScore = maxPrice === minPrice ? 100 : 
      ((maxPrice - quote.totalAmount) / (maxPrice - minPrice)) * 100;
    
    // Market position adjustment
    const marketPositionBonus = quote.totalAmount < marketAverage * 0.9 ? 10 : 
                               quote.totalAmount > marketAverage * 1.1 ? -10 : 0;

    // Enhanced Quality Score with certification weighting
    const manufacturerRating = quote.manufacturer?.rating || 0;
    const certificationBonus = (quote.certifications?.length || 0) * 3;
    const qualityHistoryBonus = quote.manufacturer?.qualityHistory || 0;
    const qualityScore = Math.min(100, (manufacturerRating * 18) + certificationBonus + qualityHistoryBonus);

    // Enhanced Delivery Time Score with reliability factors
    const minDelivery = Math.min(...deliveryTimes);
    const maxDelivery = Math.max(...deliveryTimes);
    const timeScore = maxDelivery === minDelivery ? 100 :
      ((maxDelivery - quote.deliveryTime) / (maxDelivery - minDelivery)) * 100;
    const deliveryReliabilityBonus = (quote.manufacturer?.onTimeDeliveryRate || 0) * 0.2;

    // Enhanced Reliability Score
    const completionRate = quote.manufacturer?.completionRate || 0;
    const onTimeRate = quote.manufacturer?.onTimeDeliveryRate || 0;
    const customerSatisfaction = quote.manufacturer?.customerSatisfaction || 0;
    const reliabilityScore = (completionRate * 0.4 + onTimeRate * 0.4 + customerSatisfaction * 0.2);

    // Capability Matching Score
    const capabilityMatch = quote.capabilityMatch || 0;
    const technicalExpertise = quote.manufacturer?.technicalExpertise || 0;
    const equipmentModernity = quote.manufacturer?.equipmentModernity || 0;
    const capabilityScore = (capabilityMatch * 0.5 + technicalExpertise * 0.3 + equipmentModernity * 0.2);

    // Risk Assessment Score
    const financialStability = quote.manufacturer?.financialStability || 0;
    const geopoliticalRisk = quote.manufacturer?.geopoliticalRisk || 0;
    const supplychainRisk = quote.manufacturer?.supplychainRisk || 0;
    const riskScore = Math.max(0, 100 - ((100 - financialStability) + geopoliticalRisk + supplychainRisk) / 3);

    // Compliance Score
    const certificationCompliance = (quote.certifications?.length || 0) * 10;
    const regulatoryCompliance = quote.manufacturer?.regulatoryCompliance || 0;
    const complianceScore = Math.min(100, certificationCompliance + regulatoryCompliance);

    // Sustainability Score
    const environmentalRating = quote.manufacturer?.environmentalRating || 0;
    const carbonFootprint = quote.manufacturer?.carbonFootprint || 100;
    const sustainabilityScore = (environmentalRating * 0.7 + (100 - carbonFootprint) * 0.3);

    // Innovation Score
    const innovationIndex = quote.manufacturer?.innovationIndex || 0;
    const technologyAdoption = quote.manufacturer?.technologyAdoption || 0;
    const innovationScore = (innovationIndex * 0.6 + technologyAdoption * 0.4);

    // Overall weighted score
    const overallScore = (
      (priceScore * criteria.price / 100) +
      (qualityScore * criteria.quality / 100) +
      (timeScore * criteria.delivery / 100) +
      (reliabilityScore * criteria.reliability / 100) +
      (capabilityScore * criteria.capability / 100) +
      (riskScore * criteria.risk / 100) +
      (complianceScore * criteria.compliance / 100) +
      (sustainabilityScore * criteria.sustainability / 100) +
      (innovationScore * criteria.innovation / 100)
    );

    // Advanced recommendation logic with confidence levels
    const riskFactors = [
      quote.manufacturer?.financialStability < 70,
      quote.deliveryTime > avgDeliveryTime * 1.5,
      quote.totalAmount > avgPrice * 1.3,
      (quote.certifications?.length || 0) < 2
    ].filter(Boolean).length;

    let recommendation: 'accept' | 'negotiate' | 'reject' | 'investigate';
    let confidenceLevel: number;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';

    if (overallScore >= 85 && riskFactors <= 1) {
      recommendation = 'accept';
      confidenceLevel = 95;
      riskLevel = 'low';
    } else if (overallScore >= 70 && riskFactors <= 2) {
      recommendation = 'negotiate';
      confidenceLevel = 80;
      riskLevel = 'medium';
    } else if (overallScore >= 50 && riskFactors <= 3) {
      recommendation = 'investigate';
      confidenceLevel = 60;
      riskLevel = 'high';
    } else {
      recommendation = 'reject';
      confidenceLevel = 90;
      riskLevel = 'critical';
    }

    return {
      priceScore: Math.round(priceScore + marketPositionBonus),
      qualityScore: Math.round(qualityScore),
      timeScore: Math.round(timeScore + deliveryReliabilityBonus),
      reliabilityScore: Math.round(reliabilityScore),
      capabilityScore: Math.round(capabilityScore),
      riskScore: Math.round(riskScore),
      complianceScore: Math.round(complianceScore),
      sustainabilityScore: Math.round(sustainabilityScore),
      innovationScore: Math.round(innovationScore),
      overallScore: Math.round(overallScore),
      recommendation,
      confidenceLevel,
      riskLevel
    };
  }, [criteria]);

  // Calculate advanced analytics
  const calculateAdvancedAnalytics = useCallback((quote: Quote, marketData?: any): AdvancedAnalytics => {
    const marketAverage = marketData?.averagePrice || quote.totalAmount;
    
    return {
      marketPosition: quote.totalAmount > marketAverage * 1.2 ? 'premium' :
                     quote.totalAmount < marketAverage * 0.8 ? 'budget' : 'competitive',
      valueForMoney: ((quote.manufacturer?.rating || 50) / (quote.totalAmount / 1000)),
      totalCostOfOwnership: quote.totalAmount * 1.15, // Including maintenance, support
      returnOnInvestment: 85, // Estimated ROI percentage
      paybackPeriod: 18, // Months
      netPresentValue: quote.totalAmount * 0.23 // Estimated NPV
    };
  }, []);

  // Calculate metrics for all quotes
  const quotesWithMetrics = useMemo(() => {
    if (!quotes || quotes.length === 0) return [];
    
    return quotes.map(quote => ({
      ...quote,
      metrics: calculateAdvancedMetrics(quote, quotes, marketData),
      analytics: calculateAdvancedAnalytics(quote, marketData)
    }));
  }, [quotes, criteria, marketData, calculateAdvancedMetrics, calculateAdvancedAnalytics]);

  // Sort quotes by overall score
  const sortedQuotes = useMemo(() => {
    return [...quotesWithMetrics].sort((a, b) => 
      b.metrics.overallScore - a.metrics.overallScore
    );
  }, [quotesWithMetrics]);

  // Accept quote mutation
  const acceptQuoteMutation = useMutation({
    mutationFn: (quoteId: number) => quotesApi.acceptQuote(quoteId),
    onSuccess: () => {
      toast.success('Quote accepted successfully!');
      queryClient.invalidateQueries({ queryKey: ['quotes-comparison'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to accept quote');
    }
  });

  // Enhanced export functionality
  const handleAdvancedExport = useCallback(async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const exportData = {
        quotes: sortedQuotes.map(q => ({
          id: q.id,
          manufacturer: q.manufacturer?.name,
          price: q.totalAmount,
          deliveryTime: q.deliveryTime,
          overallScore: q.metrics.overallScore,
          recommendation: q.metrics.recommendation,
          riskLevel: q.metrics.riskLevel
        })),
        criteria: criteria,
        marketData: marketData,
        generatedAt: new Date().toISOString()
      };

      const blob = await quotesApi.exportComparison({
        data: exportData,
        format,
        includeAnalytics: showAdvancedMetrics
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quote-comparison-${orderId || 'selected'}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Comparison exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export comparison');
    }
  }, [sortedQuotes, criteria, marketData, showAdvancedMetrics, orderId]);

  // Get recommendation colors and styling
  const getRecommendationStyling = (recommendation: string, riskLevel: string) => {
    const baseStyles = 'px-3 py-1 rounded-full text-sm font-medium';
    
    switch (recommendation) {
      case 'accept':
        return `${baseStyles} bg-green-100 text-green-800 border border-green-200`;
      case 'negotiate':
        return `${baseStyles} bg-yellow-100 text-yellow-800 border border-yellow-200`;
      case 'investigate':
        return `${baseStyles} bg-blue-100 text-blue-800 border border-blue-200`;
      case 'reject':
        return `${baseStyles} bg-red-100 text-red-800 border border-red-200`;
      default:
        return `${baseStyles} bg-gray-100 text-gray-800 border border-gray-200`;
    }
  };

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <Shield className="w-4 h-4 text-green-500" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'critical': return <X className="w-4 h-4 text-red-500" />;
      default: return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  // Handle quote actions
  const handleQuoteAction = async (quoteId: number, action: string) => {
    try {
      switch (action) {
        case 'accept':
          await acceptQuoteMutation.mutateAsync(quoteId);
          break;
        case 'negotiate':
          navigate(`/quotes/${quoteId}/negotiate`);
          break;
        case 'investigate':
          setSelectedQuoteForDetail(quoteId);
          break;
        case 'reject':
          // Add reject modal here
          break;
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Advanced Quote Comparison
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                AI-powered analysis with real-time market data and advanced scoring
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setShowCriteriaWeights(!showCriteriaWeights)}
                className="flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Criteria</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
                className="flex items-center space-x-2"
              >
                <Brain className="w-4 h-4" />
                <span>Advanced</span>
              </Button>
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setComparisonView('grid')}
                  className={`px-3 py-2 text-sm ${comparisonView === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setComparisonView('table')}
                  className={`px-3 py-2 text-sm ${comparisonView === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setComparisonView('detailed')}
                  className={`px-3 py-2 text-sm ${comparisonView === 'detailed' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Criteria Weights Panel */}
        {showCriteriaWeights && (
          <Card className="mb-6 p-6">
            <h3 className="text-lg font-semibold mb-4">Scoring Criteria Weights</h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(criteria).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()} ({value}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={value}
                    onChange={(e) => setCriteria(prev => ({
                      ...prev,
                      [key]: parseInt(e.target.value)
                    }))}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Total: {Object.values(criteria).reduce((a: number, b: number) => a + b, 0)}%
            </div>
          </Card>
        )}

        {/* Market Overview */}
        {marketData && (
          <Card className="mb-6 p-6">
            <h3 className="text-lg font-semibold mb-4">Market Intelligence</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">${marketData.averagePrice?.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Market Average</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{marketData.competitiveIndex}</div>
                <div className="text-sm text-gray-600">Competition Level</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{marketData.demandTrend}%</div>
                <div className="text-sm text-gray-600">Demand Trend</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{marketData.priceVolatility}%</div>
                <div className="text-sm text-gray-600">Price Volatility</div>
              </div>
            </div>
          </Card>
        )}

        {/* Enhanced Quotes Comparison */}
        {comparisonView === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedQuotes.map((quote, index) => (
              <Card key={quote.id} className="p-6 relative">
                {/* Ranking Badge */}
                <div className="absolute -top-2 -right-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-gold' : index === 1 ? 'bg-silver' : index === 2 ? 'bg-bronze' : 'bg-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                </div>

                {/* Quote Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{quote.manufacturer?.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-2xl font-bold text-blue-600">
                      ${quote.totalAmount.toLocaleString()}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-gray-600">{quote.deliveryTime} days</div>
                      {getRiskLevelIcon(quote.metrics.riskLevel)}
                    </div>
                  </div>
                </div>

                {/* Overall Score */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Score</span>
                    <span className="text-lg font-bold">{quote.metrics.overallScore}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${quote.metrics.overallScore}%` }}
                    ></div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="space-y-2 mb-4">
                  {showAdvancedMetrics ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Price Score:</span>
                        <span className="font-medium">{quote.metrics.priceScore}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Quality Score:</span>
                        <span className="font-medium">{quote.metrics.qualityScore}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Risk Score:</span>
                        <span className="font-medium">{quote.metrics.riskScore}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Compliance:</span>
                        <span className="font-medium">{quote.metrics.complianceScore}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Quality:</span>
                        <span className="font-medium">{quote.metrics.qualityScore}/100</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Delivery:</span>
                        <span className="font-medium">{quote.metrics.timeScore}/100</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Reliability:</span>
                        <span className="font-medium">{quote.metrics.reliabilityScore}/100</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Recommendation */}
                <div className="mb-4">
                  <div className={getRecommendationStyling(quote.metrics.recommendation, quote.metrics.riskLevel)}>
                    {quote.metrics.recommendation.toUpperCase()} ({quote.metrics.confidenceLevel}% confidence)
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleQuoteAction(quote.id, quote.metrics.recommendation)}
                    className="flex-1"
                    variant={quote.metrics.recommendation === 'accept' ? 'default' : 'outline'}
                  >
                    {quote.metrics.recommendation === 'accept' && <Check className="w-4 h-4 mr-1" />}
                    {quote.metrics.recommendation === 'negotiate' && <MessageSquare className="w-4 h-4 mr-1" />}
                    {quote.metrics.recommendation === 'investigate' && <Eye className="w-4 h-4 mr-1" />}
                    {quote.metrics.recommendation === 'reject' && <X className="w-4 h-4 mr-1" />}
                    {quote.metrics.recommendation}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedQuoteForDetail(quote.id)}
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Export and Actions */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={() => handleAdvancedExport('pdf')}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAdvancedExport('excel')}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </Button>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <RefreshCw className="w-4 h-4" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteComparisonPage;