import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Target,
  TrendingUp,
  Star,
  Clock,
  DollarSign,
  MapPin,
  Award,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Filter,
  Settings,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

import { smartMatchingApi, smartMatchingHelpers, SmartMatchResponse } from '../../lib/api/smartMatching';
import { MatchAnalytics, MatchFeedback } from '../../types';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { cn } from '../../lib/utils';
import EmptyState from '../ui/EmptyState';

interface SmartMatchingDashboardProps {
  userId: string;
  userRole: 'CLIENT' | 'MANUFACTURER';
}

const SmartMatchingDashboard: React.FC<SmartMatchingDashboardProps> = ({
  userId,
  userRole
}) => {
  const [activeTab, setActiveTab] = useState<'matches' | 'recommendations' | 'analytics'>('matches');
  const [selectedMatch, setSelectedMatch] = useState<SmartMatchResponse | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [filters, setFilters] = useState({
    minScore: 0.6,
    verifiedOnly: false,
    maxPrice: undefined as number | undefined
  });

  const queryClient = useQueryClient();

      // Fetch personalized recommendations from API
  const { data: recommendations = [], isLoading: recommendationsLoading, refetch: refetchRecommendations } = useQuery({
    queryKey: ['smart-matching-recommendations', userRole],
    queryFn: async () => {
      try {
        const response = await smartMatchingApi.getPersonalizedRecommendations();
        return response;
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        throw error;
      }
    },
          refetchInterval: 30000, // Refresh every 30 seconds for real-time data
    retry: false // Don't retry failed requests
  });

  // Fetch analytics from real API
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['smart-matching-analytics'],
    queryFn: async () => {
      try {
        return await smartMatchingApi.getMatchingAnalytics(30);
      } catch (error) {
        console.error('Analytics API call failed:', error);
        throw error;
      }
    },
    refetchInterval: 30000,
    retry: true
  });

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: (feedback: MatchFeedback) => smartMatchingApi.submitMatchFeedback(feedback),
    onSuccess: () => {
      toast.success('Feedback submitted successfully!');
      setShowFeedbackModal(false);
      setSelectedMatch(null);
      queryClient.invalidateQueries({ queryKey: ['smart-matching-analytics'] });
    },
    onError: () => {
      toast.error('Failed to submit feedback');
    }
  });

  // Refresh cache mutation
  const refreshCacheMutation = useMutation({
    mutationFn: () => smartMatchingApi.refreshCache(),
    onSuccess: () => {
      toast.success('Cache refreshed successfully!');
      queryClient.invalidateQueries({ queryKey: ['smart-matching-recommendations'] });
    },
    onError: () => {
      toast.error('Failed to refresh cache');
    }
  });

  const handleFeedback = (match: SmartMatchResponse, feedbackType: MatchFeedback['feedback_type']) => {
    setSelectedMatch(match);
    if (feedbackType === 'helpful' || feedbackType === 'not_helpful') {
      // Submit simple feedback immediately
      submitFeedbackMutation.mutate({
        match_id: match.match_id,
        feedback_type: feedbackType,
        rating: feedbackType === 'helpful' ? 5 : 2
      });
    } else {
      // Show detailed feedback modal
      setShowFeedbackModal(true);
    }
  };

  const filteredRecommendations = recommendations.filter(match => {
    if (match.score.total_score < filters.minScore) return false;
    if (filters.verifiedOnly && !match.manufacturer_info.verified) return false;
    if (filters.maxPrice && match.estimated_price && match.estimated_price > filters.maxPrice) return false;
    return true;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          {/* Demo Data Notice Removed - Production Mode */}

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <Zap className="w-8 h-8 text-primary-500 mr-3" />
                Smart Matching
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                AI-powered matching between orders and production quotes
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => refetchRecommendations()}
                leftIcon={<RefreshCw className="w-4 h-4" />}
                disabled={recommendationsLoading}
              >
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={() => refreshCacheMutation.mutate()}
                leftIcon={<Settings className="w-4 h-4" />}
                loading={refreshCacheMutation.isPending}
              >
                Clear Cache
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'matches', label: 'Smart Matches', icon: Target },
                { id: 'recommendations', label: 'Recommendations', icon: Star },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  )}
                >
                  <tab.icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'matches' && (
            <motion.div
              key="matches"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Filters */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Filters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Score
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={filters.minScore}
                      onChange={(e) => setFilters(prev => ({ ...prev, minScore: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                    <span className="text-sm text-gray-500">
                      {smartMatchingHelpers.formatMatchScore(filters.minScore)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Price
                    </label>
                    <input
                      type="number"
                      placeholder="No limit"
                      value={filters.maxPrice || ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        maxPrice: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="verified-only"
                      checked={filters.verifiedOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, verifiedOnly: e.target.checked }))}
                      className="mr-2"
                    />
                    <label htmlFor="verified-only" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Verified manufacturers only
                    </label>
                  </div>
                </div>
              </div>

              {/* Matches Grid */}
              {recommendationsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" />
                </div>
              ) : filteredRecommendations.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No matches found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your filters or check back later for new matches.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredRecommendations.map((match, index) => (
                    <MatchCard
                      key={match.match_id}
                      match={match}
                      index={index}
                      onFeedback={handleFeedback}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'recommendations' && (
            <motion.div
              key="recommendations"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <RecommendationsPanel 
                recommendations={recommendations}
                loading={recommendationsLoading}
                onFeedback={handleFeedback}
              />
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <AnalyticsPanel 
                analytics={analytics}
                loading={analyticsLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => {
          setShowFeedbackModal(false);
          setSelectedMatch(null);
        }}
        match={selectedMatch}
        onSubmit={(feedback) => submitFeedbackMutation.mutate(feedback)}
        loading={submitFeedbackMutation.isPending}
      />
    </div>
  );
};

// Match Card Component
interface MatchCardProps {
  match: SmartMatchResponse;
  index: number;
  onFeedback: (match: SmartMatchResponse, type: MatchFeedback['feedback_type']) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, index, onFeedback }) => {
  const scoreColor = smartMatchingHelpers.getScoreColor(match.score.total_score);
  const confidenceColor = smartMatchingHelpers.getConfidenceColor(match.score.confidence_level);
  const strengths = smartMatchingHelpers.analyzeMatchStrengths(match);
  const weaknesses = smartMatchingHelpers.analyzeMatchWeaknesses(match);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {match.manufacturer_info.name}
            </h3>
            {match.manufacturer_info.verified && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            <span className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              `bg-${confidenceColor}-100 text-${confidenceColor}-800 dark:bg-${confidenceColor}-900 dark:text-${confidenceColor}-300`
            )}>
              {smartMatchingHelpers.getConfidenceLabel(match.score.confidence_level)}
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            {match.manufacturer_info.location && (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {match.manufacturer_info.location}
              </div>
            )}
            {match.manufacturer_info.rating && (
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-1" />
                {smartMatchingHelpers.formatManufacturerRating(match.manufacturer_info.rating)}
              </div>
            )}
            <div className="flex items-center">
              <Award className="w-4 h-4 mr-1" />
              {match.manufacturer_info.completed_orders} orders
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={cn(
            'text-2xl font-bold',
            `text-${scoreColor}-600 dark:text-${scoreColor}-400`
          )}>
            {smartMatchingHelpers.formatMatchScore(match.score.total_score)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Match Score
          </div>
        </div>
      </div>

      {/* Pricing and Timeline */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
            <DollarSign className="w-4 h-4 mr-1" />
            Estimated Price
          </div>
          <div className="text-lg font-medium text-gray-900 dark:text-white">
            {smartMatchingHelpers.formatEstimatedPrice(match.estimated_price)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Clock className="w-4 h-4 mr-1" />
            Delivery Time
          </div>
          <div className="text-lg font-medium text-gray-900 dark:text-white">
            {smartMatchingHelpers.formatDeliveryTime(match.estimated_delivery_days)}
          </div>
        </div>
      </div>

      {/* Strengths and Weaknesses */}
      <div className="space-y-3 mb-4">
        {strengths.length > 0 && (
          <div>
            <div className="flex items-center text-sm font-medium text-green-700 dark:text-green-400 mb-2">
              <CheckCircle className="w-4 h-4 mr-1" />
              Strengths
            </div>
            <div className="space-y-1">
              {strengths.slice(0, 2).map((strength, idx) => (
                <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  {strength}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {weaknesses.length > 0 && (
          <div>
            <div className="flex items-center text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Considerations
            </div>
            <div className="space-y-1">
              {weaknesses.slice(0, 2).map((weakness, idx) => (
                <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
                  {weakness}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onFeedback(match, 'helpful')}
            className="p-2 text-gray-400 hover:text-green-500 transition-colors"
            title="Helpful"
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onFeedback(match, 'not_helpful')}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Not helpful"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => onFeedback(match, 'contacted')}
            className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
            title="Contacted manufacturer"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {smartMatchingHelpers.getMatchAge(match)}
        </div>
      </div>
    </motion.div>
  );
};

// Recommendations Panel Component
interface RecommendationsPanelProps {
  recommendations: SmartMatchResponse[];
  loading: boolean;
  onFeedback: (match: SmartMatchResponse, type: MatchFeedback['feedback_type']) => void;
}

const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  recommendations,
  loading,
  onFeedback
}) => {
  const topRecommendations = smartMatchingHelpers.sortMatchesByScore(recommendations).slice(0, 5);
  const recentRecommendations = recommendations.slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <Star className="w-5 h-5 mr-2 text-yellow-500" />
          Top Recommendations
        </h3>
        <div className="space-y-4">
          {topRecommendations.map((match, index) => (
            <div
              key={match.match_id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    #{index + 1}
                  </span>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {match.manufacturer_info.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {smartMatchingHelpers.formatMatchScore(match.score.total_score)} match • 
                      {smartMatchingHelpers.formatEstimatedPrice(match.estimated_price)}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => onFeedback(match, 'contacted')}
                leftIcon={<MessageSquare className="w-4 h-4" />}
              >
                Contact
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Recent Recommendations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentRecommendations.map((match, index) => (
            <MatchCard
              key={match.match_id}
              match={match}
              index={index}
              onFeedback={onFeedback}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Analytics Panel Component
interface AnalyticsPanelProps {
  analytics?: MatchAnalytics;
  loading: boolean;
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ analytics, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No analytics available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Analytics will appear once you start using smart matching.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Matches</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.total_matches_generated.toLocaleString()}
              </p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(analytics.conversion_rate * 100).toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {smartMatchingHelpers.formatMatchScore(analytics.average_match_score)}
              </p>
            </div>
            <Star className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Response Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.average_response_time_hours.toFixed(1)}h
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Top Categories */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Top Matching Categories
        </h3>
        <div className="space-y-3">
          {analytics.top_matching_categories.map((category, index) => (
            <div key={category.category} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  #{index + 1}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {category.category.replace('_', ' ')}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {category.match_count} matches
                </div>
                {category.conversion_rate && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {(category.conversion_rate * 100).toFixed(1)}% success
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Feedback Modal Component
interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: SmartMatchResponse | null;
  onSubmit: (feedback: MatchFeedback) => void;
  loading: boolean;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  match,
  onSubmit,
  loading
}) => {
  const [feedback, setFeedback] = useState<Partial<MatchFeedback>>({
    feedback_type: 'helpful',
    rating: 5,
    comment: '',
    contacted_manufacturer: false,
    resulted_in_quote: false,
    resulted_in_order: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!match) return;

    onSubmit({
      match_id: match.match_id,
      feedback_type: feedback.feedback_type!,
      rating: feedback.rating,
      comment: feedback.comment,
      contacted_manufacturer: feedback.contacted_manufacturer,
      resulted_in_quote: feedback.resulted_in_quote,
      resulted_in_order: feedback.resulted_in_order
    });
  };

  if (!isOpen || !match) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Match Feedback
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Feedback Type
              </label>
              <select
                value={feedback.feedback_type}
                onChange={(e) => setFeedback(prev => ({ 
                  ...prev, 
                  feedback_type: e.target.value as MatchFeedback['feedback_type']
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              >
                <option value="helpful">Helpful</option>
                <option value="not_helpful">Not Helpful</option>
                <option value="contacted">Contacted Manufacturer</option>
                <option value="converted">Resulted in Order</option>
                <option value="irrelevant">Irrelevant</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rating (1-5)
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={feedback.rating}
                onChange={(e) => setFeedback(prev => ({ 
                  ...prev, 
                  rating: parseInt(e.target.value)
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Comment (Optional)
              </label>
              <textarea
                value={feedback.comment}
                onChange={(e) => setFeedback(prev => ({ ...prev, comment: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                placeholder="Additional feedback..."
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={feedback.contacted_manufacturer}
                  onChange={(e) => setFeedback(prev => ({ 
                    ...prev, 
                    contacted_manufacturer: e.target.checked 
                  }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  I contacted this manufacturer
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={feedback.resulted_in_quote}
                  onChange={(e) => setFeedback(prev => ({ 
                    ...prev, 
                    resulted_in_quote: e.target.checked 
                  }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  This resulted in a quote
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={feedback.resulted_in_order}
                  onChange={(e) => setFeedback(prev => ({ 
                    ...prev, 
                    resulted_in_order: e.target.checked 
                  }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  This resulted in an order
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
              >
                Submit Feedback
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default SmartMatchingDashboard; 