import api from '../api';
import { 
  SmartMatch, 
  MatchFilters, 
  MatchAnalytics, 
  MatchFeedback,
  BatchMatchRequest,
  LiveMatchRequest,
  RecommendationRequest
} from '../../types';

export interface SmartMatchResponse {
  match_id: string;
  match_type: 'order_to_production_quote' | 'production_quote_to_order';
  order_id?: number;
  production_quote_id?: number;
  score: {
    total_score: number;
    category_match: number;
    price_compatibility: number;
    timeline_compatibility: number;
    geographic_proximity: number;
    capacity_availability: number;
    manufacturer_rating: number;
    urgency_alignment: number;
    specification_match: number;
    confidence_level: 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'FAIR' | 'POOR';
    match_reasons: string[];
    potential_issues: string[];
  };
  estimated_price?: number;
  estimated_delivery_days?: number;
  manufacturer_info: {
    id: number;
    name: string;
    location?: string;
    rating?: number;
    verified: boolean;
    completed_orders: number;
  };
  created_at: string;
  expires_at?: string;
  real_time_availability?: string;
}

export interface MatchAnalyticsResponse {
  total_matches_generated: number;
  successful_connections: number;
  average_match_score: number;
  top_matching_categories: Array<{
    category: string;
    match_count: number;
    average_score?: number;
    conversion_rate?: number;
  }>;
  conversion_rate: number;
  average_response_time_hours: number;
  user_satisfaction_score: number;
  match_quality_trends?: Array<{
    date: string;
    average_score: number;
    match_count: number;
  }>;
  geographic_distribution?: Record<string, number>;
}

export const smartMatchingApi = {
  // Core Matching Functions
  async getMatchesForOrder(
    orderId: number, 
    options: {
      limit?: number;
      minScore?: number;
    } = {}
  ): Promise<SmartMatchResponse[]> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.minScore) params.append('min_score', options.minScore.toString());
    
    return api.get(`/smart-matching/orders/${orderId}/matches?${params}`);
  },

  async getMatchesForProductionQuote(
    quoteId: number,
    options: {
      limit?: number;
      minScore?: number;
    } = {}
  ): Promise<SmartMatchResponse[]> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.minScore) params.append('min_score', options.minScore.toString());
    
    return api.get(`/smart-matching/production-quotes/${quoteId}/matches?${params}`);
  },

  // Batch Processing
  async batchMatchOrders(request: {
    order_ids: number[];
    limit_per_order?: number;
    min_score?: number;
    filters?: MatchFilters;
  }): Promise<SmartMatchResponse[]> {
    return api.post('/smart-matching/batch-match', request);
  },

  // Personalized Recommendations
  async getPersonalizedRecommendations(options: {
    limit?: number;
    match_type?: 'order_to_production_quote' | 'production_quote_to_order';
  } = {}): Promise<SmartMatchResponse[]> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.match_type) params.append('match_type', options.match_type);
    
    return api.get(`/smart-matching/recommendations?${params}`);
  },

  // Real-time Matching
  async getLiveMatches(orderId: number): Promise<SmartMatchResponse[]> {
    return api.get(`/smart-matching/live-matches/${orderId}`);
  },

  async getPriorityMatches(
    orderId: number, 
    urgencyBoost: number = 1.5
  ): Promise<SmartMatchResponse[]> {
    return api.post(`/smart-matching/priority-matching?order_id=${orderId}&urgency_boost=${urgencyBoost}`);
  },

  // Analytics
  async getMatchingAnalytics(days: number = 30): Promise<MatchAnalyticsResponse> {
    // Ensure auth credentials (cookies or token header) are included – this endpoint requires manufacturer/admin scope
    const token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
    const config = token
      ? { withCredentials: true as const, headers: { Authorization: `Bearer ${token}` } }
      : { withCredentials: true as const };
    return api.get(`/smart-matching/analytics?days=${days}`, config);
  },

  // Feedback
  async submitMatchFeedback(feedback: {
    match_id: string;
    feedback_type: 'helpful' | 'not_helpful' | 'contacted' | 'converted' | 'irrelevant';
    rating?: number;
    comment?: string;
    contacted_manufacturer?: boolean;
    resulted_in_quote?: boolean;
    resulted_in_order?: boolean;
  }): Promise<{ message: string; match_id: string; feedback_type: string }> {
    return api.post('/smart-matching/feedback', feedback);
  },

  // Cache Management
  async refreshCache(): Promise<{ message: string }> {
    return api.post('/smart-matching/refresh-cache');
  },

  // Health Check
  async getHealthStatus(): Promise<{
    status: string;
    cache_size: number;
    service: string;
    version: string;
  }> {
    return api.get('/smart-matching/health');
  }
};

// Helper Functions for Smart Matching
export const smartMatchingHelpers = {
  // Score Interpretation
  getScoreColor(score: number): string {
    if (score >= 0.9) return 'green';
    if (score >= 0.8) return 'blue';
    if (score >= 0.7) return 'yellow';
    if (score >= 0.6) return 'orange';
    return 'red';
  },

  getScoreLabel(score: number): string {
    if (score >= 0.9) return 'Excellent Match';
    if (score >= 0.8) return 'Very Good Match';
    if (score >= 0.7) return 'Good Match';
    if (score >= 0.6) return 'Fair Match';
    return 'Poor Match';
  },

  getConfidenceColor(confidence: string): string {
    switch (confidence) {
      case 'EXCELLENT': return 'green';
      case 'VERY_GOOD': return 'blue';
      case 'GOOD': return 'yellow';
      case 'FAIR': return 'orange';
      case 'POOR': return 'red';
      default: return 'gray';
    }
  },

  getConfidenceLabel(confidence: string): string {
    switch (confidence) {
      case 'EXCELLENT': return 'Excellent';
      case 'VERY_GOOD': return 'Very Good';
      case 'GOOD': return 'Good';
      case 'FAIR': return 'Fair';
      case 'POOR': return 'Poor';
      default: return 'Unknown';
    }
  },

  // Match Analysis
  analyzeMatchStrengths(match: SmartMatchResponse): string[] {
    const strengths = [];
    const score = match.score;

    if (score.category_match >= 0.9) {
      strengths.push('Perfect category alignment');
    }
    if (score.price_compatibility >= 0.8) {
      strengths.push('Competitive pricing');
    }
    if (score.timeline_compatibility >= 0.8) {
      strengths.push('Meets delivery timeline');
    }
    if (score.manufacturer_rating >= 0.8) {
      strengths.push('Highly rated manufacturer');
    }
    if (score.capacity_availability >= 0.8) {
      strengths.push('Good availability');
    }
    if (score.geographic_proximity >= 0.8) {
      strengths.push('Favorable location');
    }

    return strengths;
  },

  analyzeMatchWeaknesses(match: SmartMatchResponse): string[] {
    const weaknesses = [];
    const score = match.score;

    if (score.price_compatibility < 0.5) {
      weaknesses.push('Pricing concerns');
    }
    if (score.timeline_compatibility < 0.5) {
      weaknesses.push('Timeline challenges');
    }
    if (score.manufacturer_rating < 0.5) {
      weaknesses.push('Limited manufacturer track record');
    }
    if (score.capacity_availability < 0.5) {
      weaknesses.push('Limited capacity');
    }
    if (score.geographic_proximity < 0.5) {
      weaknesses.push('Distant location');
    }

    return weaknesses;
  },

  // Recommendation Logic
  shouldRecommendMatch(match: SmartMatchResponse): boolean {
    return match.score.total_score >= 0.7 && 
           match.score.confidence_level !== 'POOR' &&
           match.manufacturer_info.verified;
  },

  getPriorityLevel(match: SmartMatchResponse): 'high' | 'medium' | 'low' {
    if (match.score.total_score >= 0.85) return 'high';
    if (match.score.total_score >= 0.7) return 'medium';
    return 'low';
  },

  // Formatting Helpers
  formatMatchScore(score: number): string {
    return `${Math.round(score * 100)}%`;
  },

  formatEstimatedPrice(price?: number, currency: string = 'USD'): string {
    if (!price) return 'Contact for pricing';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  },

  formatDeliveryTime(days?: number): string {
    if (!days) return 'TBD';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.round(days / 7)} weeks`;
    return `${Math.round(days / 30)} months`;
  },

  formatManufacturerRating(rating?: number): string {
    if (!rating) return 'Not rated';
    return `${rating.toFixed(1)}/5.0`;
  },

  // Sorting and Filtering
  sortMatchesByScore(matches: SmartMatchResponse[]): SmartMatchResponse[] {
    return [...matches].sort((a, b) => b.score.total_score - a.score.total_score);
  },

  sortMatchesByPrice(matches: SmartMatchResponse[]): SmartMatchResponse[] {
    return [...matches].sort((a, b) => {
      const priceA = a.estimated_price || Infinity;
      const priceB = b.estimated_price || Infinity;
      return priceA - priceB;
    });
  },

  sortMatchesByDelivery(matches: SmartMatchResponse[]): SmartMatchResponse[] {
    return [...matches].sort((a, b) => {
      const deliveryA = a.estimated_delivery_days || Infinity;
      const deliveryB = b.estimated_delivery_days || Infinity;
      return deliveryA - deliveryB;
    });
  },

  filterMatchesByScore(matches: SmartMatchResponse[], minScore: number): SmartMatchResponse[] {
    return matches.filter(match => match.score.total_score >= minScore);
  },

  filterMatchesByVerified(matches: SmartMatchResponse[]): SmartMatchResponse[] {
    return matches.filter(match => match.manufacturer_info.verified);
  },

  filterMatchesByPrice(matches: SmartMatchResponse[], maxPrice: number): SmartMatchResponse[] {
    return matches.filter(match => 
      !match.estimated_price || match.estimated_price <= maxPrice
    );
  },

  // Match Comparison
  compareMatches(matchA: SmartMatchResponse, matchB: SmartMatchResponse): {
    better_match: SmartMatchResponse;
    comparison_points: string[];
  } {
    const points = [];
    let betterMatch = matchA;

    if (matchA.score.total_score > matchB.score.total_score) {
      points.push(`Match A has higher overall score (${this.formatMatchScore(matchA.score.total_score)} vs ${this.formatMatchScore(matchB.score.total_score)})`);
    } else if (matchB.score.total_score > matchA.score.total_score) {
      points.push(`Match B has higher overall score (${this.formatMatchScore(matchB.score.total_score)} vs ${this.formatMatchScore(matchA.score.total_score)})`);
      betterMatch = matchB;
    }

    if (matchA.estimated_price && matchB.estimated_price) {
      if (matchA.estimated_price < matchB.estimated_price) {
        points.push(`Match A is more affordable (${this.formatEstimatedPrice(matchA.estimated_price)} vs ${this.formatEstimatedPrice(matchB.estimated_price)})`);
      } else {
        points.push(`Match B is more affordable (${this.formatEstimatedPrice(matchB.estimated_price)} vs ${this.formatEstimatedPrice(matchA.estimated_price)})`);
      }
    }

    if (matchA.estimated_delivery_days && matchB.estimated_delivery_days) {
      if (matchA.estimated_delivery_days < matchB.estimated_delivery_days) {
        points.push(`Match A delivers faster (${this.formatDeliveryTime(matchA.estimated_delivery_days)} vs ${this.formatDeliveryTime(matchB.estimated_delivery_days)})`);
      } else {
        points.push(`Match B delivers faster (${this.formatDeliveryTime(matchB.estimated_delivery_days)} vs ${this.formatDeliveryTime(matchA.estimated_delivery_days)})`);
      }
    }

    return {
      better_match: betterMatch,
      comparison_points: points
    };
  },

  // Analytics Helpers
  calculateMatchSuccessRate(analytics: MatchAnalyticsResponse): number {
    if (analytics.total_matches_generated === 0) return 0;
    return analytics.successful_connections / analytics.total_matches_generated;
  },

  getTopPerformingCategory(analytics: MatchAnalyticsResponse): string | null {
    if (analytics.top_matching_categories.length === 0) return null;
    return analytics.top_matching_categories[0].category;
  },

  // Real-time Updates
  isMatchExpired(match: SmartMatchResponse): boolean {
    if (!match.expires_at) return false;
    return new Date(match.expires_at) < new Date();
  },

  getMatchAge(match: SmartMatchResponse): string {
    const created = new Date(match.created_at);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  },

  // Export Helpers
  exportMatchesToCSV(matches: SmartMatchResponse[]): string {
    const headers = [
      'Match ID',
      'Type',
      'Score',
      'Confidence',
      'Manufacturer',
      'Estimated Price',
      'Delivery Days',
      'Created At'
    ];

    const rows = matches.map(match => [
      match.match_id,
      match.match_type,
      this.formatMatchScore(match.score.total_score),
      match.score.confidence_level,
      match.manufacturer_info.name,
      this.formatEstimatedPrice(match.estimated_price),
      this.formatDeliveryTime(match.estimated_delivery_days),
      new Date(match.created_at).toLocaleDateString()
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}; 