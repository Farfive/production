import { apiClient } from '../api-client';
import { CapabilityCategory } from '../../types';

export interface QuoteTemplate {
  id: number;
  name: string;
  description: string;
  category: CapabilityCategory;
  isPublic: boolean;
  createdBy: number;
  createdByName: string;
  usageCount: number;
  rating: number;
  template: {
    paymentTerms: string;
    deliveryDaysMin: number;
    deliveryDaysMax: number;
    priceStructure: {
      materialsPercentage: number;
      laborPercentage: number;
      overheadPercentage: number;
      profitMargin: number;
    };
    qualityStandards: string[];
    certifications: string[];
    processDetails: string;
    terms: string;
    notes: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuoteTemplateRequest {
  name: string;
  description: string;
  category: CapabilityCategory;
  isPublic: boolean;
  template: {
    paymentTerms: string;
    deliveryDaysMin: number;
    deliveryDaysMax: number;
    priceStructure: {
      materialsPercentage: number;
      laborPercentage: number;
      overheadPercentage: number;
      profitMargin: number;
    };
    qualityStandards: string[];
    certifications: string[];
    processDetails: string;
    terms: string;
    notes: string;
  };
}

export const quoteTemplatesApi = {
  // List quote templates
  list: async (publicOnly: boolean = false): Promise<QuoteTemplate[]> => {
    try {
      const response = await apiClient.get('/api/v1/quote-templates', {
        params: { public_only: publicOnly }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching quote templates:', error);
      throw error;
    }
  },

  // Get quote template by ID
  getById: async (id: number): Promise<QuoteTemplate> => {
    try {
      const response = await apiClient.get(`/api/v1/quote-templates/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quote template:', error);
      throw error;
    }
  },

  // Create new quote template
  create: async (data: CreateQuoteTemplateRequest): Promise<QuoteTemplate> => {
    try {
      const response = await apiClient.post('/api/v1/quote-templates', data);
      return response.data;
    } catch (error) {
      console.error('Error creating quote template:', error);
      throw error;
    }
  },

  // Update quote template
  update: async (id: number, data: Partial<CreateQuoteTemplateRequest>): Promise<QuoteTemplate> => {
    try {
      const response = await apiClient.put(`/api/v1/quote-templates/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating quote template:', error);
      throw error;
    }
  },

  // Delete quote template
  delete: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/api/v1/quote-templates/${id}`);
    } catch (error) {
      console.error('Error deleting quote template:', error);
      throw error;
    }
  },

  // Clone quote template
  clone: async (id: number, newName?: string): Promise<QuoteTemplate> => {
    try {
      const response = await apiClient.post(`/api/v1/quote-templates/${id}/clone`, {
        name: newName
      });
      return response.data;
    } catch (error) {
      console.error('Error cloning quote template:', error);
      throw error;
    }
  },

  // Rate quote template
  rate: async (id: number, rating: number): Promise<void> => {
    try {
      await apiClient.post(`/api/v1/quote-templates/${id}/rate`, { rating });
    } catch (error) {
      console.error('Error rating quote template:', error);
      throw error;
    }
  },

  // Get templates by category
  getByCategory: async (category: CapabilityCategory): Promise<QuoteTemplate[]> => {
    try {
      const response = await apiClient.get('/api/v1/quote-templates', {
        params: { category }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching templates by category:', error);
      throw error;
    }
  },

  // Search templates
  search: async (query: string): Promise<QuoteTemplate[]> => {
    try {
      const response = await apiClient.get('/api/v1/quote-templates/search', {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching templates:', error);
      throw error;
    }
  },

  // Get template usage analytics
  getUsageAnalytics: async (id: number): Promise<{
    totalUsage: number;
    monthlyUsage: Array<{ month: string; count: number }>;
    successRate: number;
    averageQuoteValue: number;
  }> => {
    try {
      const response = await apiClient.get(`/api/v1/quote-templates/${id}/analytics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching template analytics:', error);
      throw error;
    }
  }
}; 