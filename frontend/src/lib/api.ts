import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

import toast from 'react-hot-toast';
import { environment, features } from '../config/environment';
import { createOptimizedQueryClient, getCacheManager } from './cache';
import { 
  ApiResponse, 
  PaginatedResponse, 
  ApiError,
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  Order,
  Quote,
  CreateOrderForm,
  CreateQuoteForm,
  Transaction,
  Manufacturer,

  DashboardStats,
  SearchFilters,
  Notification,
  QuoteEvaluation,
  QuoteQuestion,
  QuoteDocument,
  QuoteNote,
  CollaborativeSession,
  Discussion,
  DecisionMatrix,
  TCOParameters,
  TCOBreakdown,
  RiskFactor,
  ComplianceItem,
  AuditTrailEntry,
  QuoteRecommendation,
  ProcurementWorkflow,
  WorkflowStep,
  TeamMember,
  ComparisonCriteria,
  CapabilityCategory,
  OrderStatus,
  UrgencyLevel,
  QuoteStatus,
  Message,
  ProductionCapacity,
  ExtendedDashboardStats,
  ManufacturingCapability,
  QuoteCreate,
  QuoteNegotiation,
  QuoteNegotiationResponse,
  QuoteRevision,
  QuoteAttachment,
  QuoteNotification,
} from '../types';

// Extend the AxiosRequestConfig to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime?: Date;
      retryCount?: number;
    };
  }
}

// Extend window to include performance monitor
declare global {
  interface Window {
    performanceMonitor?: {
      measureApiCall: (endpoint: string, startTime: number) => void;
    };
  }
}

// API Configuration
const API_BASE_URL = environment.apiUrl;
const API_TIMEOUT = environment.timeout;

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let accessToken: string | null = null;
let refreshToken: string | null = null;

const tokenManager = {
  getAccessToken: () => accessToken || localStorage.getItem('accessToken'),
  setAccessToken: (token: string) => {
    accessToken = token;
    localStorage.setItem('accessToken', token);
  },
  getRefreshToken: () => refreshToken || localStorage.getItem('refreshToken'),
  setRefreshToken: (token: string) => {
    refreshToken = token;
    localStorage.setItem('refreshToken', token);
  },
  clearTokens: () => {
    accessToken = null;
    refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

// Request interceptor for authentication and performance tracking
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp for performance monitoring
    config.metadata = { startTime: new Date() };
    
    // Add retry configuration
    if (!config.metadata.retryCount) {
      config.metadata.retryCount = 0;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh, error handling, and performance monitoring
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response time and trigger performance monitoring
    if (response.config.metadata?.startTime) {
      const duration = new Date().getTime() - response.config.metadata.startTime.getTime();
      
      if (features.apiLogging) {
        console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
      }
      
      // Send performance data to monitoring (if available)
      if (window.performanceMonitor) {
        window.performanceMonitor.measureApiCall(
          response.config.url || 'unknown',
          response.config.metadata.startTime.getTime()
        );
      }
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const retryCount = originalRequest.metadata?.retryCount || 0;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshTokenValue = tokenManager.getRefreshToken();
        if (refreshTokenValue) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken: refreshTokenValue,
          });

          const { accessToken: newAccessToken } = response.data.data;
          tokenManager.setAccessToken(newAccessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle retryable errors (network errors, 5xx errors, 429 rate limiting)
    const isRetryable = !error.response || 
                       error.response.status >= 500 || 
                       error.response.status === 429;
    
    if (isRetryable && retryCount < environment.maxRetries && !originalRequest._retry) {
      originalRequest.metadata = originalRequest.metadata || {};
      originalRequest.metadata.retryCount = retryCount + 1;
      
      // Calculate retry delay (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      
      if (features.apiLogging) {
        console.log(`Retrying API call (${retryCount + 1}/${environment.maxRetries}) after ${delay}ms`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiClient(originalRequest);
    }

    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(new Error('Network error'));
    }

    // Handle API errors
    const apiError: ApiError = {
      message: error.response?.data?.message || 'An unexpected error occurred',
      code: error.response?.data?.code,
      field: error.response?.data?.field,
      details: error.response?.data?.details,
    };

    // Show error toast for non-validation errors
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.response?.status === 429) {
      toast.error('Too many requests. Please wait before trying again.');
    }

    return Promise.reject(apiError);
  }
);

// Generic API methods
const api = {
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.get<ApiResponse<T>>(url, config);
    return response.data.data;
  },

  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.post<ApiResponse<T>>(url, data, config);
    return response.data.data;
  },

  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.put<ApiResponse<T>>(url, data, config);
    return response.data.data;
  },

  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.patch<ApiResponse<T>>(url, data, config);
    return response.data.data;
  },

  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.delete<ApiResponse<T>>(url, config);
    return response.data.data;
  },

  // Paginated endpoints
  getPaginated: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<PaginatedResponse<T>> => {
    const response = await apiClient.get<PaginatedResponse<T>>(url, config);
    return response.data;
  },
};

// Authentication API
export const authApi = {
  login: (credentials: LoginCredentials): Promise<AuthResponse> => 
    api.post('/auth/login-json', credentials),
  
  register: (data: RegisterData): Promise<User> => 
    api.post('/auth/register', data),
  
  logout: (): Promise<void> => 
    api.post('/auth/logout', {}),
  
  refreshToken: (): Promise<AuthResponse> => 
    api.post('/auth/refresh', {}),
  
  getCurrentUser: (): Promise<User> => 
    api.get('/auth/me'),
  
  updateProfile: (data: Partial<User>): Promise<User> => 
    api.put('/auth/profile', data),
  
  changePassword: (currentPassword: string, newPassword: string): Promise<void> => 
    api.put('/auth/change-password', { currentPassword, newPassword }),

  forgotPassword: (email: string): Promise<void> => 
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string): Promise<void> => 
    api.post('/auth/reset-password', { token, password }),

  verifyResetToken: (token: string): Promise<{ valid: boolean }> => 
    api.get(`/auth/verify-reset-token?token=${token}`),

  verifyEmail: (token: string): Promise<void> => 
    api.post('/auth/verify-email', { token }),

  resendVerificationEmail: (email: string): Promise<void> => 
    api.post('/auth/resend-verification', { email }),

  deleteAccount: (): Promise<void> => 
    api.delete('/auth/account'),

  getProfile: (): Promise<User> =>
    api.get('/auth/profile'),
};

// Orders API
export const ordersApi = {
  getOrders: (filters?: SearchFilters): Promise<PaginatedResponse<Order>> => {
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
    return api.getPaginated(`/orders/?${params.toString()}`);
  },

  // Alias for getOrders to match the usage in OrderManagementPage
  getAll: (filters?: SearchFilters): Promise<PaginatedResponse<Order>> => {
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
    return api.getPaginated(`/orders/?${params.toString()}`);
  },

  getById: (id: number): Promise<Order> =>
    api.get(`/orders/${id}`),

  getOrder: (id: number): Promise<Order> =>
    api.get(`/orders/${id}`),

  createOrder: (data: CreateOrderForm): Promise<Order> =>
    api.post('/orders/', data),

  updateOrder: (id: number, data: Partial<CreateOrderForm>): Promise<Order> =>
    api.patch(`/orders/${id}`, data),

  deleteOrder: (id: number): Promise<void> =>
    api.delete(`/orders/${id}`),

  publishOrder: (id: number): Promise<Order> =>
    api.post(`/orders/${id}/publish`),

  cancelOrder: (id: number, reason?: string): Promise<Order> =>
    api.post(`/orders/${id}/cancel`, { reason }),

  selectQuote: (orderId: number, quoteId: number): Promise<Order> =>
    api.post(`/orders/${orderId}/select-quote`, { quoteId }),

  uploadFiles: (orderId: number, files: File[]): Promise<Order> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.post(`/orders/${orderId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteFile: (orderId: number, fileId: number): Promise<void> =>
    api.delete(`/orders/${orderId}/files/${fileId}`),

  // Missing methods for OrderTrackingDashboard
  getOrderMessages: (orderId: string): Promise<Message[]> =>
    api.get(`/orders/${orderId}/messages`),

  sendMessage: (orderId: number, message: string, recipientType: 'manufacturer' | 'client'): Promise<any> =>
    api.post(`/orders/${orderId}/messages`, { message, recipientType }),

  exportOrders: (filters?: { orderIds?: string[]; format?: string }): Promise<Blob> =>
    api.get('/orders/export', { 
      params: filters,
      responseType: 'blob' as const,
    }),

  // Manufacturer-specific endpoints
  getManufacturerOrders: (filters?: SearchFilters): Promise<PaginatedResponse<Order>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    // Use the regular orders endpoint - backend filters by user role automatically
    return api.getPaginated(`/orders?${params.toString()}`);
  },

  bulkOperation: (operation: string, orderIds: string[]): Promise<void> =>
    api.post('/orders/bulk-operation', { operation, orderIds }),

  // Get order details with milestones
  getOrderDetails: async (orderId: string) => {
    const response = await apiClient.get(`/orders/${orderId}/details`);
    return response.data.data;
  },

  // Update milestone progress
  updateMilestone: async (milestoneId: string, updates: any) => {
    const response = await apiClient.put(`/milestones/${milestoneId}`, updates);
    return response.data.data;
  },

  // Upload milestone files
  uploadMilestoneFiles: async (milestoneId: string, files: File[], type: 'photos' | 'documents') => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('type', type);

    const response = await apiClient.post(`/milestones/${milestoneId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // Get order status history
  getStatusHistory: async (orderId: string) => {
    const response = await apiClient.get(`/orders/${orderId}/status-history`);
    return response.data.data;
  },

  // Update order status
  updateOrderStatus: async (orderId: string, status: string, notes?: string) => {
    const response = await apiClient.put(`/orders/${orderId}/status`, { status, notes });
    return response.data.data;
  },
};

// Quotes API
export const quotesApi = {
  getQuotes: (filters?: SearchFilters): Promise<PaginatedResponse<Quote>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.getPaginated(`/quotes?${params.toString()}`);
  },

  getById: (id: number): Promise<Quote> =>
    api.get(`/quotes/${id}`),

  getQuote: (id: number): Promise<Quote> =>
    api.get(`/quotes/${id}`),

  create: (data: QuoteCreate): Promise<Quote> =>
    api.post('/quotes', data),

  acceptQuote: (id: number): Promise<{ message: string }> =>
    api.post(`/quotes/${id}/accept`),

  rejectQuote: (id: number, reason?: string): Promise<{ message: string }> =>
    api.post(`/quotes/${id}/reject`, { reason }),

  // Enhanced negotiation functionality
  requestNegotiation: (id: number, negotiation: QuoteNegotiation): Promise<QuoteNegotiationResponse> =>
    api.post(`/quotes/${id}/negotiate`, negotiation),

  getNegotiations: (quoteId: number): Promise<QuoteNegotiationResponse[]> =>
    api.get(`/quotes/${quoteId}/negotiations`),

  createRevision: (quoteId: number, revision: QuoteRevision): Promise<Quote> =>
    api.post(`/quotes/${quoteId}/revise`, revision),

  getByOrderId: (orderId: number): Promise<{ quotes: Quote[] }> =>
    api.get(`/quotes/order/${orderId}`),

  createQuote: (data: CreateQuoteForm): Promise<Quote> =>
    api.post('/quotes', data),

  updateQuote: (id: number, data: Partial<CreateQuoteForm>): Promise<Quote> =>
    api.patch(`/quotes/${id}`, data),

  deleteQuote: (id: number): Promise<void> =>
    api.delete(`/quotes/${id}`),

  submitQuote: (id: number): Promise<Quote> =>
    api.post(`/quotes/${id}/submit`),

  withdrawQuote: (id: number, reason?: string): Promise<Quote> =>
    api.post(`/quotes/${id}/withdraw`, { reason }),

  // File attachment functionality
  uploadAttachments: (quoteId: number, files: File[], descriptions?: string[]): Promise<QuoteAttachment[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (descriptions) {
      descriptions.forEach((desc) => formData.append('descriptions', desc));
    }
    return api.post(`/quotes/${quoteId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getAttachments: (quoteId: number): Promise<QuoteAttachment[]> =>
    api.get(`/quotes/${quoteId}/attachments`),

  deleteAttachment: (quoteId: number, attachmentId: number): Promise<{ message: string }> =>
    api.delete(`/quotes/${quoteId}/attachments/${attachmentId}`),

  downloadAttachment: (quoteId: number, attachmentId: number): Promise<Blob> =>
    api.get(`/quotes/${quoteId}/attachments/${attachmentId}/download`, {
      responseType: 'blob'
    }),

  // Quote comparison functionality
  getComparison: (orderId: number): Promise<any> =>
    api.get(`/quotes/order/${orderId}/comparison`),

  // Risk assessment and compliance
  getRiskAssessment: async (quoteIds: string[]): Promise<{ quoteId: string; riskScore: number; factors: RiskFactor[] }[]> => {
    return api.post('/quotes/risk-assessment', { quoteIds });
  },

  getComplianceCheck: async (quoteIds: string[]): Promise<{ quoteId: string; score: number; items: ComplianceItem[] }[]> => {
    return api.post('/quotes/compliance-check', { quoteIds });
  },

  // Final decision
  finalizeDecision: async (orderId: string, decision: { selectedQuoteId: string; reasoning: string }): Promise<void> => {
    return api.post(`/orders/${orderId}/finalize-decision`, decision);
  },

  // Audit trail
  getAuditTrail: async (orderId: string): Promise<AuditTrailEntry[]> => {
    return api.get(`/orders/${orderId}/audit-trail`);
  },

  // Export functionality
  exportQuoteComparison: async (orderId: string, format: 'pdf' | 'excel' | 'csv'): Promise<Blob> => {
    const response = await api.get(`/orders/${orderId}/export-comparison`, {
      params: { format },
      responseType: 'blob',
    });
    return response;
  },

  // Recommendations
  getRecommendations: async (orderId: string, criteria: ComparisonCriteria): Promise<QuoteRecommendation[]> => {
    return api.post(`/orders/${orderId}/recommendations`, criteria);
  },

  // Manufacturer-specific endpoints
  getManufacturerQuotes: async (): Promise<Quote[]> => {
    return api.get('/manufacturer/quotes');
  },

  // Procurement workflow
  getProcurementWorkflow: async (orderId: string): Promise<ProcurementWorkflow> => {
    return api.get(`/orders/${orderId}/procurement-workflow`);
  },

  updateWorkflowStep: async (workflowId: string, stepId: string, data: { status: string; notes?: string }): Promise<WorkflowStep> => {
    return api.put(`/procurement-workflows/${workflowId}/steps/${stepId}`, data);
  },

  approveWorkflowStep: async (workflowId: string, stepId: string, notes?: string): Promise<void> => {
    return api.post(`/procurement-workflows/${workflowId}/steps/${stepId}/approve`, { notes });
  },

  rejectWorkflowStep: async (workflowId: string, stepId: string, reason: string): Promise<void> => {
    return api.post(`/procurement-workflows/${workflowId}/steps/${stepId}/reject`, { reason });
  },

  bulkAction: (action: 'accept' | 'reject' | 'withdraw' | 'delete', quoteIds: number[]): Promise<{ affected: number }> =>
    api.post(`/quotes/bulk?action=${action}&${quoteIds.map(id => `quote_ids=${id}`).join('&')}`),

  search: (filters: any): Promise<PaginatedResponse<Quote>> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v.toString()));
        } else {
          params.append(key, value.toString());
        }
      }
    });
    return api.getPaginated(`/quotes/search?${params.toString()}`);
  },

  getAnalyticsOverview: (): Promise<any> => api.get('/quotes/analytics/overview'),

  // Added stub methods for QuoteAnalyticsDashboard
  getQuoteTrends: (timeRange: string): Promise<any> =>
    // Placeholder - replace with real endpoint once backend ready
    api.get(`/quotes/analytics/trends?range=${timeRange}`),

  getCompetitorAnalysis: (timeRange: string): Promise<any> =>
    api.get(`/quotes/analytics/competitors?range=${timeRange}`),

  // Enhanced comparison functionality
  getQuotesForComparison: (): Promise<Quote[]> =>
    api.get('/quotes/available-for-comparison'),

  getQuotesByIds: (ids: number[]): Promise<Quote[]> =>
    api.post('/quotes/by-ids', { ids }),

  exportComparison: (data: { quotes: number[]; criteria: any; format: string }): Promise<any> =>
    api.post('/quotes/export-comparison', data, { responseType: 'blob' }),

  // Enhanced bulk operations
  executeBulkOperation: (data: { operation: string; quote_ids: number[]; input?: string }): Promise<any> =>
    api.post('/quotes/bulk-operation', data),

  // Enhanced analytics
  getAnalytics: (params: { period: string }): Promise<any> =>
    api.get(`/quotes/analytics?period=${params.period}`),

  // Missing methods for collaborative evaluation
  getCollaborativeSession: (orderId: number): Promise<any> =>
    api.get(`/orders/${orderId}/collaborative-session`),

  getTeamMembers: (orderId: number): Promise<any[]> =>
    api.get(`/orders/${orderId}/team-members`),

  submitEvaluation: (orderId: number, quoteId: number, data: any): Promise<any> =>
    api.post(`/orders/${orderId}/quotes/${quoteId}/evaluation`, data),

  addDiscussion: (orderId: number, quoteId: number, data: any): Promise<any> =>
    api.post(`/orders/${orderId}/quotes/${quoteId}/discussion`, data),

  // Missing methods for quote collaboration
  getComments: (quoteId: number): Promise<any[]> =>
    api.get(`/quotes/${quoteId}/comments`),

  addComment: (quoteId: number, data: any): Promise<any> =>
    api.post(`/quotes/${quoteId}/comments`, data),

  updateComment: (commentId: number, data: any): Promise<any> =>
    api.put(`/comments/${commentId}`, data),

  deleteComment: (commentId: number): Promise<void> =>
    api.delete(`/comments/${commentId}`),

  // Missing methods for quote comparison
  getQuotesByOrder: (orderId: number): Promise<any[]> =>
    api.get(`/orders/${orderId}/quotes`),

  getQuoteEvaluations: (orderId: number): Promise<any[]> =>
    api.get(`/orders/${orderId}/evaluations`),

  favoriteQuote: (quoteId: number, favorited: boolean): Promise<any> =>
    api.post(`/quotes/${quoteId}/favorite`, { favorited }),

  addQuoteNote: (quoteId: number, note: string): Promise<any> =>
    api.post(`/quotes/${quoteId}/notes`, { note }),

  // Missing methods for quote details
  getQuoteQuestions: (quoteId: number): Promise<any[]> =>
    api.get(`/quotes/${quoteId}/questions`),

  getQuoteDocuments: (quoteId: number): Promise<any[]> =>
    api.get(`/quotes/${quoteId}/documents`),

  getQuoteNotes: (quoteId: number): Promise<any[]> =>
    api.get(`/quotes/${quoteId}/notes`),

  askQuestion: (quoteId: number, data: any): Promise<any> =>
    api.post(`/quotes/${quoteId}/questions`, data),

  toggleFavorite: (quoteId: number): Promise<any> =>
    api.post(`/quotes/${quoteId}/toggle-favorite`),

  upvoteQuestion: (questionId: string): Promise<any> =>
    api.post(`/questions/${questionId}/upvote`),

  // Missing methods for export and reporting
  exportQuotes: (data: any): Promise<any> =>
    api.post('/quotes/export', data, { responseType: 'blob' }),

  generateReport: (data: any): Promise<any> =>
    api.post('/quotes/reports', data),

  // Missing methods for notifications
  getNotifications: (): Promise<any[]> =>
    api.get('/notifications'),

  getNotificationSettings: (): Promise<any> =>
    api.get('/notifications/settings'),

  markNotificationsAsRead: (notificationIds: number[]): Promise<void> =>
    api.post('/notifications/mark-read', { ids: notificationIds }),

  deleteNotifications: (notificationIds: number[]): Promise<void> =>
    api.post('/notifications/delete', { ids: notificationIds }),

  updateNotificationSettings: (settings: any): Promise<any> =>
    api.put('/notifications/settings', settings),

  // Missing methods for version history
  getVersionHistory: (quoteId: number): Promise<any[]> =>
    api.get(`/quotes/${quoteId}/versions`),

  revertToVersion: (quoteId: number, versionId: number): Promise<any> =>
    api.post(`/quotes/${quoteId}/revert`, { versionId }),

  // Missing methods for advanced filters
  getSavedFilters: (): Promise<any[]> =>
    api.get('/quotes/saved-filters'),

  getFilterOptions: (): Promise<any> =>
    api.get('/quotes/filter-options'),

  saveFilter: (data: { name: string; criteria: any; is_public: boolean }): Promise<any> =>
    api.post('/quotes/saved-filters', data),

  deleteFilter: (filterId: number): Promise<void> =>
    api.delete(`/quotes/saved-filters/${filterId}`),

  // Missing methods for bulk operations
  bulkUpdateQuotes: (data: { quote_ids: number[]; updates: any }): Promise<any> =>
    api.post('/quotes/bulk-update', data),

  bulkDeleteQuotes: (quoteIds: number[]): Promise<any> =>
    api.post('/quotes/bulk-delete', { quote_ids: quoteIds }),

  bulkExportQuotes: (data: { quote_ids: number[]; format: string; options: any }): Promise<any> =>
    api.post('/quotes/bulk-export', data, { responseType: 'blob' }),

  bulkEmailQuotes: (data: { quote_ids: number[]; template: string; recipients: string[]; subject: string; message: string }): Promise<any> =>
    api.post('/quotes/bulk-email', data),

  // Enhanced quote comparison methods
  getByOrderId: async (orderId: number) => {
    return api.get(`/quotes/order/${orderId}`);
  },

  getMarketData: async (orderId: number) => {
    return api.get(`/quotes/market-data/${orderId}`);
  },

  exportComparison: async (data: any) => {
    return api.post('/quotes/export-comparison', data, {
      responseType: 'blob'
    });
  },

  getQuotesByOrder: async (orderId: number) => {
    return api.get(`/orders/${orderId}/quotes`);
  },

  getQuoteById: async (quoteId: number) => {
    return api.get(`/quotes/${quoteId}`);
  }
};

// Manufacturers API
export const manufacturersApi = {
  getAll: (filters?: SearchFilters): Promise<PaginatedResponse<Manufacturer>> => {
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
    return api.getPaginated(`/manufacturers?${params.toString()}`);
  },

  getById: (id: string): Promise<Manufacturer> =>
    api.get(`/manufacturers/${id}`),

  createProfile: (data: any): Promise<Manufacturer> =>
    api.post('/manufacturers/profile', data),

  updateProfile: (id: string, data: Partial<Manufacturer>): Promise<Manufacturer> =>
    api.put(`/manufacturers/${id}`, data),

  getCapabilities: (): Promise<ManufacturingCapability[]> =>
    api.get('/manufacturers/capabilities'),

  getReviews: (id: string): Promise<any[]> =>
    api.get(`/manufacturers/${id}/reviews`),

  createReview: (id: string, review: any): Promise<any> =>
    api.post(`/manufacturers/${id}/reviews`, review),

  uploadDocuments: (files: File[]): Promise<void> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('documents', file));
    return api.post('/manufacturers/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  submitForVerification: (): Promise<Manufacturer> =>
    api.post('/manufacturers/submit-verification'),
  
  getProductionCapacity: (): Promise<ProductionCapacity> =>
    api.get('/manufacturers/capacity'),

  // Update production capacity (Step-6)
  updateProductionCapacity: (data: ProductionCapacity): Promise<ProductionCapacity> =>
    api.put('/manufacturers/capacity', data),
};

// Payments API
export const paymentsApi = {
  getTransactions: (filters?: SearchFilters): Promise<PaginatedResponse<Transaction>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.getPaginated(`/payments/transactions?${params.toString()}`);
  },

  getTransaction: (id: number): Promise<Transaction> =>
    api.get(`/payments/transactions/${id}`),

  createPaymentIntent: (
    amount: number,
    currency: string = 'usd',
    createCustomer: boolean = false,
    metadata?: Record<string, any>
  ): Promise<{ payment_intent_id: string; client_secret: string; amount: number; currency: string; status: string }> =>
    api.post('/payments/create-payment-intent', { amount, currency, create_customer: createCustomer, metadata }),

  processOrderPayment: (data: {
    order_id: number;
    quote_id: number;
    payment_method_id: string;
    save_payment_method?: boolean;
  }): Promise<{ payment_id: number; payment_intent_id: string; status: string; amount: number; requires_action: boolean; client_secret?: string }> =>
    api.post('/payments/process-order-payment', data),

  getPaymentHistory: (limit: number = 20): Promise<{ id: number; amount: number; currency: string; status: string; payment_method: string; created_at: string }[]> =>
    api.get(`/payments/history?limit=${limit}`),

  refund: (payment_id: number, amount?: number, reason: string = 'requested_by_customer'): Promise<{ refund_id: string; amount: number; status: string; reason: string }> =>
    api.post('/payments/refund', { payment_id, amount, reason }),

  getConnectAccount: (): Promise<any> =>
    api.get('/payments/connect/accounts/me'),

  createConnectAccount: (data: { accountType: string; country: string }): Promise<{
    accountId: string;
    onboardingUrl: string;
  }> =>
    api.post('/payments/connect/accounts', data),

  createDashboardLink: (accountId: string): Promise<{ dashboardUrl: string }> =>
    api.post(`/payments/connect/accounts/${accountId}/dashboard-link`),

  getPaymentAnalytics: (days?: number): Promise<any> =>
    api.get(`/payments/analytics/overview?days=${days || 30}`),

  // Backward compatibility
  refundTransaction: (transactionId: number, amount?: number, reason?: string) =>
    api.post('/payments/refund', { payment_id: transactionId, amount, reason }),

  refundPayment: (payment_id: number, amount?: number, reason: string = 'requested_by_customer') =>
    api.post('/payments/refund', { payment_id, amount, reason }),
};

// Dashboard API
export const dashboardApi = {
  getStats: (): Promise<DashboardStats> =>
    api.get('/dashboard/stats'),
  
  getManufacturerStats: (): Promise<ExtendedDashboardStats> =>
    api.get('/dashboard/manufacturer-stats'),

  getClientStats: (): Promise<DashboardStats> => {
    // Mock data removed - using real API endpoints only
    return api.get('/dashboard/client-stats');
  },

  getAnalytics: (period: string = '30d'): Promise<any> =>
    api.get(`/dashboard/analytics?period=${period}`),
};

// Notifications API
export const notificationsApi = {
  getNotifications: (unreadOnly: boolean = false, limit: number = 50, offset: number = 0): Promise<QuoteNotification[]> => {
    const params = new URLSearchParams();
    if (unreadOnly) params.append('unread_only', 'true');
    if (limit !== 50) params.append('limit', limit.toString());
    if (offset !== 0) params.append('offset', offset.toString());
    return api.get(`/notifications?${params.toString()}`);
  },

  markAsRead: (notificationId: string): Promise<{ success: boolean }> =>
    api.post(`/notifications/${notificationId}/read`),

  getUnreadCount: (): Promise<{ count: number }> =>
    api.get('/notifications/unread-count'),

  deleteNotification: (notificationId: string): Promise<{ message: string }> =>
    api.delete(`/notifications/${notificationId}`),

  markAllAsRead: (): Promise<{ message: string }> =>
    api.post('/notifications/mark-all-read'),
};

// File upload utilities
export const uploadFile = async (file: File, onProgress?: (progress: number) => void): Promise<{ url: string; id: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });

  return response.data.data;
};

// Query client configuration with performance optimizations
export const queryClient = createOptimizedQueryClient();

// Initialize cache manager for performance optimization
export const cacheManager = getCacheManager(queryClient);

// Query keys
export const queryKeys = {
  auth: {
    profile: ['auth', 'profile'] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (filters?: SearchFilters) => ['orders', 'list', filters] as const,
    detail: (id: number) => ['orders', 'detail', id] as const,
  },
  quotes: {
    all: ['quotes'] as const,
    list: (filters?: SearchFilters) => ['quotes', 'list', filters] as const,
    detail: (id: number) => ['quotes', 'detail', id] as const,
  },
  manufacturers: {
    all: ['manufacturers'] as const,
    list: (filters?: SearchFilters) => ['manufacturers', 'list', filters] as const,
    detail: (id: number) => ['manufacturers', 'detail', id] as const,
    profile: ['manufacturers', 'profile'] as const,
  },
  payments: {
    all: ['payments'] as const,
    transactions: (filters?: SearchFilters) => ['payments', 'transactions', filters] as const,
    transaction: (id: number) => ['payments', 'transaction', id] as const,
    connectAccount: ['payments', 'connect-account'] as const,
    analytics: (days?: number) => ['payments', 'analytics', days] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    clientStats: ['dashboard', 'client-stats'] as const,
    manufacturerStats: ['dashboard', 'manufacturer-stats'] as const,
    analytics: (period: string) => ['dashboard', 'analytics', period] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (page?: number) => ['notifications', 'list', page] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
};

// Export token manager for use in other parts of the app
export { tokenManager };

// Export the raw axios client for complex use cases
export { apiClient };

// Export the configured api client
export default api;

// Transactions API
export const transactionsApi = {
  getAll: (filters?: SearchFilters): Promise<PaginatedResponse<Transaction>> => {
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
    return api.getPaginated(`/transactions?${params.toString()}`);
  },

  getById: (id: string): Promise<Transaction> =>
    api.get(`/transactions/${id}`),

  createPayment: (data: any): Promise<Transaction> =>
    api.post('/transactions/payment', data),

  refund: (id: string, amount?: number): Promise<Transaction> =>
    api.post(`/transactions/${id}/refund`, { amount }),
};

// Quote Templates API
export const quoteTemplatesApi = {
  create: (data: any): Promise<any> => api.post('/quote-templates', data),
  list: (onlyPublic?: boolean): Promise<any[]> => api.get(`/quote-templates?only_public=${onlyPublic ? 'true' : 'false'}`),
  get: (id: number): Promise<any> => api.get(`/quote-templates/${id}`),
  update: (id: number, data: any): Promise<any> => api.put(`/quote-templates/${id}`, data),
  delete: (id: number): Promise<void> => api.delete(`/quote-templates/${id}`),
};

// Production Management API
export const productionApi = {
  // Get production dashboard data
  getDashboardData: async (params: { manufacturerId?: string; date: Date; viewMode: string }) => {
    const response = await apiClient.get('/production/dashboard', { params });
    return response.data.data;
  },

  // Update order status in production
  updateOrderStatus: async (orderId: string, status: string, notes?: string) => {
    const response = await apiClient.put(`/production/orders/${orderId}/status`, { status, notes });
    return response.data.data;
  },

  // Assign resource to order
  assignResource: async (orderId: string, resourceType: 'machine' | 'worker', resourceId: string) => {
    const response = await apiClient.post(`/production/orders/${orderId}/assign-resource`, {
      resourceType,
      resourceId
    });
    return response.data.data;
  },

  // Get production capacity
  getCapacity: async (manufacturerId?: string, dateRange?: { start: Date; end: Date }) => {
    const response = await apiClient.get('/production/capacity', { 
      params: { manufacturerId, ...dateRange } 
    });
    return response.data.data;
  },

  // Get machine utilization
  getMachineUtilization: async (manufacturerId?: string) => {
    const response = await apiClient.get('/production/machines/utilization', { 
      params: { manufacturerId } 
    });
    return response.data.data;
  },

  // Schedule maintenance
  scheduleMaintenance: async (machineId: string, scheduledDate: string, notes?: string) => {
    const response = await apiClient.post(`/production/machines/${machineId}/maintenance`, {
      scheduledDate,
      notes
    });
    return response.data.data;
  },

  // Get bottleneck analysis
  getBottleneckAnalysis: async (manufacturerId?: string) => {
    const response = await apiClient.get('/production/bottlenecks', { 
      params: { manufacturerId } 
    });
    return response.data.data;
  },
};

// Quality Control API
export const qualityApi = {
  // Get quality dashboard data
  getDashboardData: async (manufacturerId?: string) => {
    const response = await apiClient.get('/quality/dashboard', { 
      params: { manufacturerId } 
    });
    return response.data.data;
  },

  // Update quality check
  updateQualityCheck: async (checkId: string, updates: any) => {
    const response = await apiClient.put(`/quality/checks/${checkId}`, updates);
    return response.data.data;
  },

  // Upload quality check photos
  uploadCheckPhotos: async (checkId: string, photos: File[]) => {
    const formData = new FormData();
    photos.forEach(photo => formData.append('photos', photo));

    const response = await apiClient.post(`/quality/checks/${checkId}/photos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // Get quality metrics
  getQualityMetrics: async (manufacturerId?: string, dateRange?: { start: Date; end: Date }) => {
    const response = await apiClient.get('/quality/metrics', { 
      params: { manufacturerId, ...dateRange } 
    });
    return response.data.data;
  },

  // Create quality check
  createQualityCheck: async (orderData: any) => {
    const response = await apiClient.post('/quality/checks', orderData);
    return response.data.data;
  },

  // Get quality standards
  getQualityStandards: async (category?: string) => {
    const response = await apiClient.get('/quality/standards', { 
      params: { category } 
    });
    return response.data.data;
  },
};

// Delivery Tracking API
export const deliveryApi = {
  // Get tracking information
  getTrackingInfo: async (params: { orderId?: string; trackingNumber?: string }) => {
    const response = await apiClient.get('/delivery/tracking', { params });
    return response.data.data;
  },

  // Update delivery status
  updateDeliveryStatus: async (deliveryId: string, status: string, location?: any, notes?: string) => {
    const response = await apiClient.put(`/delivery/${deliveryId}/status`, {
      status,
      location,
      notes
    });
    return response.data.data;
  },

  // Send delivery notification
  sendNotification: async (deliveryId: string, type: 'sms' | 'email', message: string) => {
    const response = await apiClient.post(`/delivery/${deliveryId}/notify`, {
      type,
      message
    });
    return response.data.data;
  },

  // Upload delivery proof
  uploadDeliveryProof: async (deliveryId: string, photos: File[], signature?: string) => {
    const formData = new FormData();
    photos.forEach(photo => formData.append('photos', photo));
    if (signature) formData.append('signature', signature);

    const response = await apiClient.post(`/delivery/${deliveryId}/proof`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // Get delivery analytics
  getDeliveryAnalytics: async (manufacturerId?: string, dateRange?: { start: Date; end: Date }) => {
    const response = await apiClient.get('/delivery/analytics', { 
      params: { manufacturerId, ...dateRange } 
    });
    return response.data.data;
  },

  // Schedule delivery
  scheduleDelivery: async (orderId: string, deliveryData: any) => {
    const response = await apiClient.post(`/orders/${orderId}/schedule-delivery`, deliveryData);
    return response.data.data;
  },

  // Get delivery routes
  getOptimalRoute: async (pickupLocation: any, deliveryLocation: any, waypoints?: any[]) => {
    const response = await apiClient.post('/delivery/route-optimization', {
      pickupLocation,
      deliveryLocation,
      waypoints
    });
    return response.data.data;
  },
};

// Manufacturing API
export const manufacturingApi = {
  getMachines: async (timeRange: string) => {
    return api.get(`/manufacturing/machines?time_range=${timeRange}`);
  },

  getProductionJobs: async (timeRange: string) => {
    return api.get(`/manufacturing/jobs?time_range=${timeRange}`);
  },

  getProductionMetrics: async (timeRange: string) => {
    return api.get(`/manufacturing/metrics?time_range=${timeRange}`);
  },

  getPerformanceHistory: async (timeRange: string) => {
    return api.get(`/manufacturing/performance-history?time_range=${timeRange}`);
  },

  getOptimizedProductionPlan: async () => {
    return api.get('/manufacturing/production-plan');
  },

  startMachine: async (machineId: number) => {
    return api.post(`/manufacturing/machines/${machineId}/start`);
  },

  stopMachine: async (machineId: number) => {
    return api.post(`/manufacturing/machines/${machineId}/stop`);
  },

  scheduleMaintenance: async (machineId: number, date: string) => {
    return api.post(`/manufacturing/machines/${machineId}/maintenance`, { scheduled_date: date });
  },

  startJob: async (jobId: number) => {
    return api.post(`/manufacturing/jobs/${jobId}/start`);
  },

  pauseJob: async (jobId: number) => {
    return api.post(`/manufacturing/jobs/${jobId}/pause`);
  }
};

// Supply Chain API
export const supplyChainApi = {
  getSuppliers: async () => {
    return api.get('/supply-chain/suppliers');
  },

  getInventory: async () => {
    return api.get('/supply-chain/inventory');
  },

  getMetrics: async () => {
    return api.get('/supply-chain/metrics');
  },

  getAlerts: async () => {
    return api.get('/supply-chain/alerts');
  },

  updateSupplier: async (supplierId: number, data: any) => {
    return api.put(`/supply-chain/suppliers/${supplierId}`, data);
  },

  updateInventoryItem: async (itemId: number, data: any) => {
    return api.put(`/supply-chain/inventory/${itemId}`, data);
  },

  createPurchaseOrder: async (data: any) => {
    return api.post('/supply-chain/purchase-orders', data);
  },

  getSupplierPerformance: async (supplierId: number) => {
    return api.get(`/supply-chain/suppliers/${supplierId}/performance`);
  },

  getInventoryOptimization: async () => {
    return api.get('/supply-chain/inventory/optimization');
  }
}; 