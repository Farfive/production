import { Quote, QuoteStatus, ApiResponse } from '../../types';
import { apiClient } from '../api-client';

export interface GetQuotesParams {
  search?: string;
  status?: QuoteStatus;
  sortBy?: 'createdAt' | 'amount' | 'deadline';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateQuoteData {
  orderId: string;
  material: string;
  process: string;
  finish: string;
  tolerance: string;
  quantity: number;
  deliveryTime: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  breakdown?: {
    materials: number;
    labor: number;
    overhead: number;
    shipping: number;
    taxes: number;
    total: number;
  };
  paymentTerms: string;
  shippingMethod: string;
  warranty: string;
  validUntil: string;
}

export interface UpdateQuoteData extends Partial<CreateQuoteData> {
  status?: QuoteStatus;
}

class QuotesAPI {
  async getQuotes(params: GetQuotesParams = {}): Promise<{ data: Quote[], pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean; } }> {
    try {
      const response = await apiClient.get('/quotes', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
      throw error;
    }
  }

  async getQuote(id: string): Promise<ApiResponse<Quote>> {
    try {
      const response = await apiClient.get(`/quotes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch quote:', error);
      throw error;
    }
  }

  async createQuote(data: CreateQuoteData): Promise<ApiResponse<Quote>> {
    try {
      const response = await apiClient.post('/quotes', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create quote:', error);
      throw error;
    }
  }

  async updateQuote(id: string, data: UpdateQuoteData): Promise<ApiResponse<Quote>> {
    try {
      const response = await apiClient.put(`/quotes/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update quote:', error);
      throw error;
    }
  }

  async deleteQuote(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/quotes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete quote:', error);
      throw error;
    }
  }

  async updateQuoteStatus(id: string, status: QuoteStatus): Promise<ApiResponse<Quote>> {
    try {
      const response = await apiClient.patch(`/quotes/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Failed to update quote status:', error);
      throw error;
    }
  }

  async getManufacturerQuotes(manufacturerId?: string): Promise<ApiResponse<Quote[]>> {
    try {
      const url = manufacturerId ? `/quotes/manufacturer/${manufacturerId}` : '/quotes/manufacturer';
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch manufacturer quotes:', error);
      throw error;
    }
  }

  async generateReport(data: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/quotes/reports', data);
      return response.data;
    } catch (error) {
      console.error('Failed to generate quote report:', error);
      throw error;
    }
  }

  async getQuoteTrends(timeRange: string): Promise<any> {
    // Placeholder stub
    return [];
  }

  async getCompetitorAnalysis(timeRange: string): Promise<any> {
    return [];
  }
}

export const quotesApi = new QuotesAPI();
export default quotesApi; 