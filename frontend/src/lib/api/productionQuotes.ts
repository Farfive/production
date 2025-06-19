import React from 'react';
import { 
  ProductionQuote, 
  ProductionQuoteCreate, 
  ProductionQuoteUpdate, 
  ProductionQuoteInquiry,
  ProductionQuoteInquiryCreate,
  ProductionQuoteInquiryUpdate,
  ProductionQuoteFilters,
  ProductionQuoteAnalytics,
  ProductionQuoteMatch,
  ApiResponse 
} from '../../types';
import api from '../api';

export const productionQuotesApi = {
  // Production Quote CRUD Operations
  
  /**
   * Create a new production quote
   */
  create: async (data: ProductionQuoteCreate): Promise<ProductionQuote> => {
    return api.post('/production-quotes/', data);
  },

  /**
   * Get all production quotes with filtering
   */
  list: async (filters?: ProductionQuoteFilters): Promise<ProductionQuote[]> => {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }
    
    const queryString = params.toString();
    return api.get(`/production-quotes${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get current manufacturer's production quotes
   */
  getMyQuotes: async (): Promise<ProductionQuote[]> => {
    return api.get('/production-quotes/my-quotes');
  },

  /**
   * Get a specific production quote by ID
   */
  getById: async (id: number): Promise<ProductionQuote> => {
    return api.get(`/production-quotes/${id}`);
  },

  /**
   * Update a production quote
   */
  update: async (id: number, data: ProductionQuoteUpdate): Promise<ProductionQuote> => {
    return api.put(`/production-quotes/${id}`, data);
  },

  /**
   * Delete a production quote
   */
  delete: async (id: number): Promise<{ message: string }> => {
    return api.delete(`/production-quotes/${id}`);
  },

  // Production Quote Inquiry Operations

  /**
   * Create an inquiry about a production quote
   */
  createInquiry: async (productionQuoteId: number, data: ProductionQuoteInquiryCreate): Promise<ProductionQuoteInquiry> => {
    return api.post(`/production-quotes/${productionQuoteId}/inquire`, data);
  },

  /**
   * Get inquiries for a production quote (manufacturer only)
   */
  getInquiries: async (productionQuoteId: number): Promise<ProductionQuoteInquiry[]> => {
    return api.get(`/production-quotes/${productionQuoteId}/inquiries`);
  },

  /**
   * Respond to an inquiry (manufacturer only)
   */
  respondToInquiry: async (inquiryId: number, response: ProductionQuoteInquiryUpdate): Promise<ProductionQuoteInquiry> => {
    return api.put(`/production-quotes/inquiries/${inquiryId}`, response);
  },

  // Analytics and Reporting

  /**
   * Get production quote analytics for current manufacturer
   */
  getAnalytics: async (): Promise<ProductionQuoteAnalytics> => {
    return api.get('/production-quotes/analytics');
  },

  // Search and Discovery

  /**
   * Search production quotes with advanced filters
   */
  search: async (filters: ProductionQuoteFilters): Promise<ProductionQuote[]> => {
    return productionQuotesApi.list(filters);
  },

  /**
   * Get production quote recommendations for an order
   */
  getRecommendations: async (orderId: number): Promise<ProductionQuoteMatch[]> => {
    return api.get(`/production-quotes/recommendations?order_id=${orderId}`);
  },

  // Utility Functions

  /**
   * Toggle production quote active status
   */
  toggleActive: async (id: number, isActive: boolean): Promise<ProductionQuote> => {
    return productionQuotesApi.update(id, { isActive });
  },

  /**
   * Update production quote priority
   */
  updatePriority: async (id: number, priorityLevel: number): Promise<ProductionQuote> => {
    return productionQuotesApi.update(id, { priorityLevel });
  },

  /**
   * Extend production quote expiry
   */
  extendExpiry: async (id: number, expiresAt: string): Promise<ProductionQuote> => {
    return productionQuotesApi.update(id, { expiresAt });
  },

  // Bulk Operations

  /**
   * Bulk update production quotes
   */
  bulkUpdate: async (ids: number[], updates: ProductionQuoteUpdate): Promise<{ updated: number }> => {
    return api.post('/production-quotes/bulk-update', { ids, updates });
  },

  /**
   * Bulk delete production quotes
   */
  bulkDelete: async (ids: number[]): Promise<{ deleted: number }> => {
    return api.post('/production-quotes/bulk-delete', { ids });
  },

  // Export Functions

  /**
   * Export production quotes to CSV
   */
  exportToCsv: async (filters?: ProductionQuoteFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }
    
    params.append('format', 'csv');
    const queryString = params.toString();
    
    return api.get(`/production-quotes/export${queryString ? `?${queryString}` : ''}`, {
      responseType: 'blob'
    });
  },

  /**
   * Export production quote analytics to PDF
   */
  exportAnalyticsToPdf: async (): Promise<Blob> => {
    return api.get('/production-quotes/analytics/export', {
      responseType: 'blob'
    });
  }
};

// Helper functions for production quote management

export const productionQuoteHelpers = {
  /**
   * Check if a production quote is currently available
   */
  isAvailable: (quote: ProductionQuote): boolean => {
    if (!quote.isActive || !quote.isPublic) return false;
    
    const now = new Date();
    
    if (quote.availableFrom && new Date(quote.availableFrom) > now) return false;
    if (quote.availableUntil && new Date(quote.availableUntil) < now) return false;
    if (quote.expiresAt && new Date(quote.expiresAt) < now) return false;
    
    return true;
  },

  /**
   * Check if a quantity fits within quote constraints
   */
  isQuantityValid: (quote: ProductionQuote, quantity: number): boolean => {
    if (quote.minimumQuantity && quantity < quote.minimumQuantity) return false;
    if (quote.maximumQuantity && quantity > quote.maximumQuantity) return false;
    return true;
  },

  /**
   * Check if an order value fits within quote constraints
   */
  isOrderValueValid: (quote: ProductionQuote, value: number): boolean => {
    if (quote.minimumOrderValue && value < quote.minimumOrderValue) return false;
    if (quote.maximumOrderValue && value > quote.maximumOrderValue) return false;
    return true;
  },

  /**
   * Calculate estimated price based on production quote
   */
  calculateEstimatedPrice: (quote: ProductionQuote, quantity: number, specifications?: Record<string, any>): number | null => {
    if (!quote.basePrice) return null;
    
    switch (quote.pricingModel) {
      case 'fixed':
        return quote.basePrice;
      
      case 'per_unit':
        return quote.basePrice * quantity;
      
      case 'hourly':
        // Would need estimated hours from specifications
        const estimatedHours = specifications?.estimatedHours || quote.leadTimeDays || 1;
        return quote.basePrice * estimatedHours;
      
      case 'tiered':
        // Would need tiered pricing from pricingDetails
        const tiers = quote.pricingDetails.tiers || [];
        const applicableTier = tiers.find((tier: any) => 
          quantity >= tier.minQuantity && (!tier.maxQuantity || quantity <= tier.maxQuantity)
        );
        return applicableTier ? applicableTier.pricePerUnit * quantity : null;
      
      default:
        return quote.basePrice;
    }
  },

  /**
   * Format production quote type for display
   */
  formatQuoteType: (type: string): string => {
    const typeMap: Record<string, string> = {
      'capacity_availability': 'Capacity Availability',
      'standard_product': 'Standard Product',
      'promotional': 'Promotional Offer',
      'prototype_rd': 'Prototype & R&D'
    };
    return typeMap[type] || type;
  },

  /**
   * Format pricing model for display
   */
  formatPricingModel: (model: string): string => {
    const modelMap: Record<string, string> = {
      'fixed': 'Fixed Price',
      'hourly': 'Hourly Rate',
      'per_unit': 'Per Unit',
      'tiered': 'Tiered Pricing'
    };
    return modelMap[model] || model;
  },

  /**
   * Get priority level display
   */
  getPriorityDisplay: (level: number): { label: string; color: string } => {
    const priorities = [
      { label: 'Low', color: 'gray' },
      { label: 'Normal', color: 'blue' },
      { label: 'Medium', color: 'yellow' },
      { label: 'High', color: 'orange' },
      { label: 'Urgent', color: 'red' }
    ];
    return priorities[level - 1] || priorities[0];
  },

  /**
   * Calculate conversion rate
   */
  calculateConversionRate: (inquiries: number, conversions: number): number => {
    return inquiries > 0 ? (conversions / inquiries) * 100 : 0;
  },

  /**
   * Get availability status
   */
  getAvailabilityStatus: (quote: ProductionQuote): { status: string; color: string; message: string } => {
    if (!quote.isActive) {
      return { status: 'inactive', color: 'gray', message: 'Inactive' };
    }
    
    if (!quote.isPublic) {
      return { status: 'private', color: 'gray', message: 'Private' };
    }
    
    const now = new Date();
    
    if (quote.expiresAt && new Date(quote.expiresAt) < now) {
      return { status: 'expired', color: 'red', message: 'Expired' };
    }
    
    if (quote.availableFrom && new Date(quote.availableFrom) > now) {
      return { status: 'upcoming', color: 'blue', message: 'Upcoming' };
    }
    
    if (quote.availableUntil && new Date(quote.availableUntil) < now) {
      return { status: 'ended', color: 'orange', message: 'Availability Ended' };
    }
    
    return { status: 'available', color: 'green', message: 'Available Now' };
  }
}; 