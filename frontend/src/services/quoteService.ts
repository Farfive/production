import { quotesApi } from '../lib/api';
import { 
  Quote, QuoteCreate, QuoteStatus, QuoteNegotiation, 
  QuoteNegotiationResponse, Order, User 
} from '../types';

export interface QuoteWorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completedAt?: string;
  data?: any;
}

export interface QuoteWorkflow {
  id: string;
  orderId: number;
  quoteId?: number;
  currentStep: string;
  steps: QuoteWorkflowStep[];
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export class QuoteService {
  /**
   * Create a new quote for an order
   */
  static async createQuote(quoteData: QuoteCreate): Promise<Quote> {
    try {
      const quote = await quotesApi.create(quoteData);
      
      // Track quote creation in workflow
      await this.trackWorkflowStep(quote.orderId, 'quote_created', {
        quoteId: quote.id,
        manufacturerId: quoteData.order_id,
        status: 'completed'
      });

      return quote;
    } catch (error) {
      console.error('Failed to create quote:', error);
      throw error;
    }
  }

  /**
   * Get quotes for a specific order
   */
  static async getQuotesForOrder(orderId: number): Promise<Quote[]> {
    try {
      const response = await quotesApi.getByOrderId(orderId);
      return response.quotes || [];
    } catch (error) {
      console.error('Failed to fetch quotes for order:', error);
      throw error;
    }
  }

  /**
   * Accept a quote (client action)
   */
  static async acceptQuote(quoteId: number): Promise<{ message: string }> {
    try {
      const result = await quotesApi.acceptQuote(quoteId);
      
      // Track acceptance in workflow
      await this.trackWorkflowStep(quoteId, 'quote_accepted', {
        status: 'completed',
        acceptedAt: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('Failed to accept quote:', error);
      throw error;
    }
  }

  /**
   * Reject a quote (client action)
   */
  static async rejectQuote(quoteId: number, reason?: string): Promise<{ message: string }> {
    try {
      const result = await quotesApi.rejectQuote(quoteId, reason);
      
      // Track rejection in workflow
      await this.trackWorkflowStep(quoteId, 'quote_rejected', {
        status: 'completed',
        reason,
        rejectedAt: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('Failed to reject quote:', error);
      throw error;
    }
  }

  /**
   * Request negotiation on a quote
   */
  static async requestNegotiation(
    quoteId: number, 
    negotiation: QuoteNegotiation
  ): Promise<QuoteNegotiationResponse> {
    try {
      const result = await quotesApi.requestNegotiation(quoteId, negotiation);
      
      // Track negotiation request in workflow
      await this.trackWorkflowStep(quoteId, 'negotiation_requested', {
        status: 'completed',
        negotiationId: result.id,
        requestedAt: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('Failed to request negotiation:', error);
      throw error;
    }
  }

  /**
   * Get negotiations for a quote
   */
  static async getNegotiations(quoteId: number): Promise<QuoteNegotiationResponse[]> {
    try {
      return await quotesApi.getNegotiations(quoteId);
    } catch (error) {
      console.error('Failed to fetch negotiations:', error);
      throw error;
    }
  }

  /**
   * Get quote analytics and comparison data
   */
  static async getQuoteAnalytics(quoteId: number, criteriaWeights?: Record<string, number>) {
    try {
      return await quotesApi.getQuoteAnalytics(quoteId, criteriaWeights);
    } catch (error) {
      console.error('Failed to fetch quote analytics:', error);
      throw error;
    }
  }

  /**
   * Get quote benchmark data
   */
  static async getQuoteBenchmark(quoteId: number, industryCategory?: string) {
    try {
      return await quotesApi.getQuoteBenchmark(quoteId, industryCategory);
    } catch (error) {
      console.error('Failed to fetch quote benchmark:', error);
      throw error;
    }
  }

  /**
   * Submit quote (manufacturer finalizes and sends to client)
   */
  static async submitQuote(quoteId: number): Promise<Quote> {
    try {
      const result = await quotesApi.submitQuote(quoteId);
      
      // Track submission in workflow
      await this.trackWorkflowStep(quoteId, 'quote_submitted', {
        status: 'completed',
        submittedAt: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('Failed to submit quote:', error);
      throw error;
    }
  }

  /**
   * Update quote status
   */
  static async updateQuoteStatus(quoteId: number, status: QuoteStatus): Promise<Quote> {
    try {
      // This would be a custom endpoint for status updates
      const result = await quotesApi.updateQuote(quoteId, { status });
      
      // Track status update in workflow
      await this.trackWorkflowStep(quoteId, 'status_updated', {
        status: 'completed',
        newStatus: status,
        updatedAt: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('Failed to update quote status:', error);
      throw error;
    }
  }

  /**
   * Calculate quote scoring based on multiple criteria
   */
  static calculateQuoteScore(quote: Quote, criteria: {
    priceWeight: number;
    deliveryWeight: number;
    qualityWeight: number;
    reliabilityWeight: number;
  }, benchmarks: {
    averagePrice: number;
    averageDeliveryTime: number;
    averageRating: number;
  }): number {
    // Normalize scores (0-100)
    const priceScore = Math.max(0, 100 - ((quote.totalAmount - benchmarks.averagePrice) / benchmarks.averagePrice) * 100);
    const deliveryScore = Math.max(0, 100 - ((quote.deliveryTime - benchmarks.averageDeliveryTime) / benchmarks.averageDeliveryTime) * 100);
    const qualityScore = (quote.manufacturer?.rating || 0) * 20; // Convert 5-star to 100-point scale
    const reliabilityScore = Math.min(100, (quote.manufacturer?.completedProjects || 0) / 10 * 100);

    // Calculate weighted score
    const totalWeight = criteria.priceWeight + criteria.deliveryWeight + criteria.qualityWeight + criteria.reliabilityWeight;
    const weightedScore = (
      (priceScore * criteria.priceWeight) +
      (deliveryScore * criteria.deliveryWeight) +
      (qualityScore * criteria.qualityWeight) +
      (reliabilityScore * criteria.reliabilityWeight)
    ) / totalWeight;

    return Math.round(Math.max(0, Math.min(100, weightedScore)));
  }

  /**
   * Generate quote comparison matrix
   */
  static generateComparisonMatrix(quotes: Quote[]): {
    quotes: Quote[];
    comparison: Record<string, any>[];
    recommendations: { quoteId: string; score: number; reasoning: string[] }[];
  } {
    if (quotes.length === 0) {
      return { quotes: [], comparison: [], recommendations: [] };
    }

    // Calculate benchmarks
    const averagePrice = quotes.reduce((sum, q) => sum + q.totalAmount, 0) / quotes.length;
    const averageDeliveryTime = quotes.reduce((sum, q) => sum + q.deliveryTime, 0) / quotes.length;
    const averageRating = quotes.reduce((sum, q) => sum + (q.manufacturer?.rating || 0), 0) / quotes.length;

    const benchmarks = { averagePrice, averageDeliveryTime, averageRating };
    const criteria = { priceWeight: 30, deliveryWeight: 25, qualityWeight: 25, reliabilityWeight: 20 };

    // Generate comparison data
    const comparison = quotes.map(quote => ({
      quoteId: quote.id,
      manufacturer: quote.manufacturer?.companyName || 'Unknown',
      price: quote.totalAmount,
      deliveryTime: quote.deliveryTime,
      rating: quote.manufacturer?.rating || 0,
      completedProjects: quote.manufacturer?.completedProjects || 0,
      score: this.calculateQuoteScore(quote, criteria, benchmarks),
      status: quote.status
    }));

    // Generate recommendations
    const recommendations = comparison
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({
        quoteId: item.quoteId,
        score: item.score,
        reasoning: this.generateRecommendationReasoning(item, index, comparison)
      }));

    return { quotes, comparison, recommendations };
  }

  /**
   * Generate recommendation reasoning
   */
  private static generateRecommendationReasoning(
    item: any, 
    rank: number, 
    allItems: any[]
  ): string[] {
    const reasoning: string[] = [];

    if (rank === 0) {
      reasoning.push('Highest overall score based on price, delivery, quality, and reliability');
    }

    // Price analysis
    const priceRank = allItems.sort((a, b) => a.price - b.price).findIndex(x => x.quoteId === item.quoteId) + 1;
    if (priceRank === 1) {
      reasoning.push('Most competitive pricing');
    } else if (priceRank <= 3) {
      reasoning.push('Competitive pricing');
    }

    // Delivery analysis
    const deliveryRank = allItems.sort((a, b) => a.deliveryTime - b.deliveryTime).findIndex(x => x.quoteId === item.quoteId) + 1;
    if (deliveryRank === 1) {
      reasoning.push('Fastest delivery time');
    } else if (deliveryRank <= 3) {
      reasoning.push('Good delivery time');
    }

    // Quality analysis
    if (item.rating >= 4.5) {
      reasoning.push('Excellent manufacturer rating');
    } else if (item.rating >= 4.0) {
      reasoning.push('Good manufacturer rating');
    }

    // Experience analysis
    if (item.completedProjects >= 100) {
      reasoning.push('Highly experienced manufacturer');
    } else if (item.completedProjects >= 50) {
      reasoning.push('Experienced manufacturer');
    }

    return reasoning;
  }

  /**
   * Track workflow steps for analytics and audit trail
   */
  private static async trackWorkflowStep(
    entityId: number, 
    stepName: string, 
    data: any
  ): Promise<void> {
    try {
      // This would integrate with a workflow tracking service
      console.log(`Workflow step tracked: ${stepName} for entity ${entityId}`, data);
      
      // In a real implementation, this would call an analytics/audit API
      // await analyticsApi.trackEvent('quote_workflow', {
      //   entityId,
      //   stepName,
      //   timestamp: new Date().toISOString(),
      //   data
      // });
    } catch (error) {
      // Don't fail the main operation if tracking fails
      console.warn('Failed to track workflow step:', error);
    }
  }

  /**
   * Validate quote data before submission
   */
  static validateQuoteData(quoteData: Partial<QuoteCreate>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!quoteData.order_id) {
      errors.push('Order ID is required');
    }

    if (!quoteData.price || quoteData.price <= 0) {
      errors.push('Price must be greater than 0');
    }

    if (!quoteData.delivery_days || quoteData.delivery_days <= 0) {
      errors.push('Delivery time must be greater than 0');
    }

    if (!quoteData.description?.trim()) {
      errors.push('Description is required');
    }

    if (!quoteData.currency) {
      errors.push('Currency is required');
    }

    // Validate breakdown if provided
    if (quoteData.breakdown) {
      const breakdownValues = [
        quoteData.breakdown.materials || 0,
        quoteData.breakdown.labor || 0,
        quoteData.breakdown.overhead || 0,
        quoteData.breakdown.shipping || 0,
        quoteData.breakdown.taxes || 0
      ];
      const total = breakdownValues.reduce((sum, val) => sum + val, 0);
      if (Math.abs(total - (quoteData.breakdown.total || 0)) > 0.01) {
        errors.push('Cost breakdown total does not match individual components');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get quote status display information
   */
  static getQuoteStatusInfo(status: QuoteStatus): {
    label: string;
    color: string;
    description: string;
    nextActions: string[];
  } {
    switch (status) {
      case QuoteStatus.DRAFT:
        return {
          label: 'Draft',
          color: 'gray',
          description: 'Quote is being prepared',
          nextActions: ['Complete quote details', 'Submit quote']
        };
      case QuoteStatus.PENDING:
        return {
          label: 'Pending',
          color: 'yellow',
          description: 'Quote is pending review',
          nextActions: ['Wait for manufacturer to complete', 'Follow up if needed']
        };
      case QuoteStatus.SENT:
        return {
          label: 'Sent',
          color: 'blue',
          description: 'Quote has been sent to client',
          nextActions: ['Wait for client response', 'Follow up after 3-5 days']
        };
      case QuoteStatus.VIEWED:
        return {
          label: 'Viewed',
          color: 'indigo',
          description: 'Client has viewed the quote',
          nextActions: ['Be ready to answer questions', 'Prepare for potential negotiation']
        };
      case QuoteStatus.ACCEPTED:
        return {
          label: 'Accepted',
          color: 'green',
          description: 'Quote has been accepted',
          nextActions: ['Prepare for production', 'Confirm contract details']
        };
      case QuoteStatus.REJECTED:
        return {
          label: 'Rejected',
          color: 'red',
          description: 'Quote has been rejected',
          nextActions: ['Review feedback', 'Consider revising approach']
        };
      case QuoteStatus.NEGOTIATING:
        return {
          label: 'Negotiating',
          color: 'orange',
          description: 'Quote is under negotiation',
          nextActions: ['Review negotiation terms', 'Respond to client requests']
        };
      case QuoteStatus.EXPIRED:
        return {
          label: 'Expired',
          color: 'gray',
          description: 'Quote validity period has expired',
          nextActions: ['Create new quote if still interested', 'Update pricing if needed']
        };
      default:
        return {
          label: 'Unknown',
          color: 'gray',
          description: 'Unknown status',
          nextActions: []
        };
    }
  }
}

export default QuoteService; 