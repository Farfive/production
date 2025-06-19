// Export all API modules
export * from './api';
export * from './quotes';
export * from './smartMatching';
export * from './productionQuotes';

// New advanced feature APIs
export { quoteTemplatesApi } from './quoteTemplatesApi';
export { analyticsApi } from './analyticsApi';
export { notificationsApi } from './notificationsApi';

// Enhanced quotes API with bulk operations
export const quotesApi = {
  ...require('./quotes'),
  
  // Bulk operations
  bulkAction: async (action: string, quoteIds: number[]) => {
    const { apiClient } = await import('../api-client');
    const response = await apiClient.post('/api/v1/quotes/bulk-action', {
      action,
      quote_ids: quoteIds
    });
    return response.data;
  },

  // Bulk export
  bulkExportQuotes: async (params: {
    quote_ids: number[];
    format: 'pdf' | 'excel' | 'csv';
    options: {
      includeBreakdown?: boolean;
      includeNotes?: boolean;
      includeAttachments?: boolean;
    };
  }) => {
    const { apiClient } = await import('../api-client');
    const response = await apiClient.post('/api/v1/quotes/bulk-export', params, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Bulk email
  bulkEmailQuotes: async (params: {
    quote_ids: number[];
    template: string;
    recipients: string[];
    subject: string;
    message: string;
  }) => {
    const { apiClient } = await import('../api-client');
    const response = await apiClient.post('/api/v1/quotes/bulk-email', params);
    return response.data;
  },

  // Export quotes with advanced options
  exportQuotes: async (options: {
    quoteIds: number[];
    format: 'pdf' | 'excel' | 'csv';
    includeBreakdown: boolean;
    includeNotes: boolean;
    includeAttachments: boolean;
    includeCompanyLogo: boolean;
    includeSignatures: boolean;
    includeTerms: boolean;
    template: 'standard' | 'detailed' | 'minimal' | 'invoice';
    orientation: 'portrait' | 'landscape';
    fontSize: 'small' | 'medium' | 'large';
    currency: string;
    language: 'en' | 'pl';
  }) => {
    const { apiClient } = await import('../api-client');
    const response = await apiClient.post('/api/v1/quotes/export', options, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Email quotes
  emailQuotes: async (data: {
    quoteIds: number[];
    recipients: string[];
    subject: string;
    message: string;
    options: any;
  }) => {
    const { apiClient } = await import('../api-client');
    const response = await apiClient.post('/api/v1/quotes/email', data);
    return response.data;
  },

  // Automated matching
  getAutomatedMatches: async (orderId: number) => {
    const { apiClient } = await import('../api-client');
    const response = await apiClient.get(`/api/v1/quotes/automated-matches/${orderId}`);
    return response.data;
  },

  // Advanced search
  advancedSearch: async (params: {
    query?: string;
    status?: string[];
    dateRange?: { start: string; end: string };
    priceRange?: { min: number; max: number };
    manufacturers?: number[];
    categories?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) => {
    const { apiClient } = await import('../api-client');
    const response = await apiClient.post('/api/v1/quotes/search', params);
    return response.data;
  }
}; 