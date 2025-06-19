import { apiClient } from '../api-client';
import { QuoteStatus } from '../../types';

export interface QuoteAnalyticsParams {
  timeRange: '7d' | '30d' | '90d' | '1y';
  category?: string;
  userId?: number;
  manufacturerId?: number;
}

export interface QuoteAnalyticsResponse {
  overview: {
    totalQuotes: number;
    acceptanceRate: number;
    averageQuoteValue: number;
    averageResponseTime: number;
    totalRevenue: number;
    activeQuotes: number;
  };
  trends: {
    daily: Array<{
      date: string;
      quotes: number;
      revenue: number;
      acceptanceRate: number;
    }>;
    monthly: Array<{
      month: string;
      quotes: number;
      revenue: number;
      acceptanceRate: number;
    }>;
  };
  statusDistribution: Array<{
    status: QuoteStatus;
    count: number;
    percentage: number;
  }>;
  categoryPerformance: Array<{
    category: string;
    quotes: number;
    revenue: number;
    acceptanceRate: number;
    avgValue: number;
  }>;
  manufacturerPerformance: Array<{
    manufacturerId: number;
    name: string;
    quotes: number;
    acceptanceRate: number;
    avgResponseTime: number;
    totalRevenue: number;
    rating: number;
  }>;
  competitiveAnalysis: {
    priceRanges: Array<{
      range: string;
      count: number;
      winRate: number;
    }>;
    deliveryTimeAnalysis: Array<{
      deliveryTime: number;
      quotes: number;
      acceptanceRate: number;
    }>;
  };
}

export interface ExportAnalyticsParams {
  timeRange: string;
  category?: string;
  format: 'excel' | 'csv' | 'pdf';
}

export const analyticsApi = {
  // Get quote analytics
  getQuoteAnalytics: async (params: QuoteAnalyticsParams): Promise<QuoteAnalyticsResponse> => {
    try {
      const response = await apiClient.get('/api/v1/analytics/quotes', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching quote analytics:', error);
      throw error;
    }
  },

  // Get performance metrics
  getPerformanceMetrics: async (params: {
    timeRange: string;
    userId?: number;
    role?: string;
  }): Promise<{
    kpis: Array<{
      name: string;
      value: number;
      change: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    benchmarks: {
      industryAverage: number;
      topPerformers: number;
      yourPerformance: number;
    };
  }> => {
    try {
      const response = await apiClient.get('/api/v1/analytics/performance', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      throw error;
    }
  },

  // Get revenue analytics
  getRevenueAnalytics: async (params: {
    timeRange: string;
    breakdown?: 'monthly' | 'quarterly' | 'yearly';
  }): Promise<{
    totalRevenue: number;
    projectedRevenue: number;
    revenueGrowth: number;
    revenueByPeriod: Array<{
      period: string;
      revenue: number;
      quotes: number;
    }>;
    revenueByCategory: Array<{
      category: string;
      revenue: number;
      percentage: number;
    }>;
  }> => {
    try {
      const response = await apiClient.get('/api/v1/analytics/revenue', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      throw error;
    }
  },

  // Get customer analytics
  getCustomerAnalytics: async (params: {
    timeRange: string;
  }): Promise<{
    newCustomers: number;
    returningCustomers: number;
    customerRetentionRate: number;
    averageOrderValue: number;
    customerLifetimeValue: number;
    topCustomers: Array<{
      customerId: number;
      name: string;
      totalOrders: number;
      totalRevenue: number;
      lastOrderDate: string;
    }>;
  }> => {
    try {
      const response = await apiClient.get('/api/v1/analytics/customers', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      throw error;
    }
  },

  // Get competitive analysis
  getCompetitiveAnalysis: async (params: {
    timeRange: string;
    category?: string;
  }): Promise<{
    marketPosition: {
      rank: number;
      totalCompetitors: number;
      marketShare: number;
    };
    pricingAnalysis: {
      averagePrice: number;
      pricePosition: 'low' | 'medium' | 'high';
      winRateByPrice: Array<{
        priceRange: string;
        winRate: number;
        volume: number;
      }>;
    };
    qualityMetrics: {
      averageRating: number;
      competitorAverage: number;
      qualityRank: number;
    };
  }> => {
    try {
      const response = await apiClient.get('/api/v1/analytics/competitive', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching competitive analysis:', error);
      throw error;
    }
  },

  // Get real-time dashboard data
  getRealTimeDashboard: async (): Promise<{
    activeQuotes: number;
    pendingApprovals: number;
    todayRevenue: number;
    responseTime: number;
    alerts: Array<{
      type: 'warning' | 'error' | 'info';
      message: string;
      timestamp: string;
    }>;
    recentActivity: Array<{
      type: string;
      description: string;
      timestamp: string;
    }>;
  }> => {
    try {
      const response = await apiClient.get('/api/v1/analytics/realtime');
      return response.data;
    } catch (error) {
      console.error('Error fetching real-time dashboard:', error);
      throw error;
    }
  },

  // Export analytics data
  exportQuoteAnalytics: async (params: ExportAnalyticsParams): Promise<Blob> => {
    try {
      const response = await apiClient.get('/api/v1/analytics/export', {
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting analytics:', error);
      throw error;
    }
  },

  // Get forecast data
  getForecastData: async (params: {
    timeRange: string;
    metric: 'revenue' | 'quotes' | 'customers';
    periods: number;
  }): Promise<{
    historical: Array<{
      period: string;
      actual: number;
    }>;
    forecast: Array<{
      period: string;
      predicted: number;
      confidence: number;
    }>;
    accuracy: number;
  }> => {
    try {
      const response = await apiClient.get('/api/v1/analytics/forecast', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching forecast data:', error);
      throw error;
    }
  },

  // Get conversion funnel
  getConversionFunnel: async (params: {
    timeRange: string;
  }): Promise<{
    stages: Array<{
      name: string;
      count: number;
      conversionRate: number;
      dropOffRate: number;
    }>;
    totalConversionRate: number;
    averageTimeToConvert: number;
  }> => {
    try {
      const response = await apiClient.get('/api/v1/analytics/funnel', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching conversion funnel:', error);
      throw error;
    }
  },

  // Get heatmap data
  getHeatmapData: async (params: {
    timeRange: string;
    metric: 'activity' | 'quotes' | 'revenue';
  }): Promise<{
    data: Array<{
      hour: number;
      day: number;
      value: number;
    }>;
    maxValue: number;
    totalValue: number;
  }> => {
    try {
      const response = await apiClient.get('/api/v1/analytics/heatmap', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
      throw error;
    }
  }
}; 