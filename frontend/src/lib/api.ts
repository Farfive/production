import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { QueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
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
  ManufacturerProfileForm,
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
  QuoteStatus
} from '../types';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
const API_TIMEOUT = 30000; // 30 seconds

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

// Request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh and error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response time in development
    if (process.env.NODE_ENV === 'development') {
      const duration = new Date().getTime() - response.config.metadata?.startTime?.getTime();
      console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

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
    api.post('/auth/login', credentials),

  register: (data: RegisterData): Promise<AuthResponse> =>
    api.post('/auth/register', data),

  logout: (): Promise<void> =>
    api.post('/auth/logout'),

  refreshToken: (refreshToken: string): Promise<AuthResponse> =>
    api.post('/auth/refresh', { refreshToken }),

  verifyEmail: (token: string): Promise<void> =>
    api.post('/auth/verify-email', { token }),

  resendVerification: (): Promise<void> =>
    api.post('/auth/resend-verification'),

  forgotPassword: (email: string): Promise<void> =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string): Promise<void> =>
    api.post('/auth/reset-password', { token, password }),

  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  getProfile: (): Promise<User> =>
    api.get('/auth/profile'),

  updateProfile: (data: Partial<User>): Promise<User> =>
    api.patch('/auth/profile', data),
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
    return api.getPaginated(`/orders?${params.toString()}`);
  },

  getOrder: (id: number): Promise<Order> =>
    api.get(`/orders/${id}`),

  createOrder: (data: CreateOrderForm): Promise<Order> =>
    api.post('/orders', data),

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

  getQuote: (id: number): Promise<Quote> =>
    api.get(`/quotes/${id}`),

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

  uploadAttachments: (quoteId: number, files: File[]): Promise<Quote> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('attachments', file));
    return api.post(`/quotes/${quoteId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Basic quote operations
  getQuotesByOrder: async (orderId: string): Promise<Quote[]> => {
    return api.get(`/quotes/order/${orderId}`);
  },

  // Quote evaluations
  getQuoteEvaluations: async (orderId: string): Promise<QuoteEvaluation[]> => {
    return api.get(`/quotes/evaluations/${orderId}`);
  },

  submitEvaluation: async (orderId: string, quoteId: string, evaluation: Partial<QuoteEvaluation>): Promise<QuoteEvaluation> => {
    return api.post(`/quotes/${quoteId}/evaluations`, evaluation);
  },

  updateEvaluation: async (evaluationId: string, evaluation: Partial<QuoteEvaluation>): Promise<QuoteEvaluation> => {
    return api.put(`/quotes/evaluations/${evaluationId}`, evaluation);
  },

  favoriteQuote: async (quoteId: string, favorited: boolean): Promise<void> => {
    return api.post(`/quotes/${quoteId}/favorite`, { favorited });
  },

  // Q&A system
  getQuoteQuestions: async (quoteId: string): Promise<QuoteQuestion[]> => {
    return api.get(`/quotes/${quoteId}/questions`);
  },

  askQuestion: async (quoteId: string, question: { question: string; category: string }): Promise<QuoteQuestion> => {
    return api.post(`/quotes/${quoteId}/questions`, question);
  },

  answerQuestion: async (questionId: string, answer: string): Promise<QuoteQuestion> => {
    return api.post(`/quotes/questions/${questionId}/answer`, { answer });
  },

  upvoteQuestion: async (questionId: string): Promise<void> => {
    return api.post(`/quotes/questions/${questionId}/upvote`);
  },

  // Documents and attachments
  getQuoteDocuments: async (quoteId: string): Promise<QuoteDocument[]> => {
    return api.get(`/quotes/${quoteId}/documents`);
  },

  uploadQuoteDocument: async (quoteId: string, file: File, description?: string): Promise<QuoteDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    
    return api.post(`/quotes/${quoteId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Notes
  getQuoteNotes: async (quoteId: string): Promise<QuoteNote[]> => {
    return api.get(`/quotes/${quoteId}/notes`);
  },

  addQuoteNote: async (quoteId: string, note: string): Promise<QuoteNote> => {
    return api.post(`/quotes/${quoteId}/notes`, { content: note });
  },

  // Collaborative evaluation
  getCollaborativeSession: async (orderId: string): Promise<CollaborativeSession> => {
    return api.get(`/orders/${orderId}/collaborative-session`);
  },

  createCollaborativeSession: async (orderId: string, data: { participants: string[]; deadline?: string }): Promise<CollaborativeSession> => {
    return api.post(`/orders/${orderId}/collaborative-session`, data);
  },

  getTeamMembers: async (orderId: string): Promise<TeamMember[]> => {
    return api.get(`/orders/${orderId}/team-members`);
  },

  addDiscussion: async (orderId: string, quoteId: string, discussion: { message: string; type: string }): Promise<Discussion> => {
    return api.post(`/orders/${orderId}/quotes/${quoteId}/discussions`, discussion);
  },

  // Decision support
  getDecisionMatrix: async (orderId: string, criteria: ComparisonCriteria): Promise<DecisionMatrix> => {
    return api.post(`/orders/${orderId}/decision-matrix`, criteria);
  },

  getTCOAnalysis: async (quoteIds: string[], parameters: TCOParameters): Promise<{ quoteId: string; tco: number; breakdown: TCOBreakdown }[]> => {
    return api.post('/quotes/tco-analysis', { quoteIds, parameters });
  },

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
};

// Manufacturers API
export const manufacturersApi = {
  getManufacturers: (filters?: SearchFilters): Promise<PaginatedResponse<Manufacturer>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.getPaginated(`/manufacturers?${params.toString()}`);
  },

  getManufacturer: (id: number): Promise<Manufacturer> =>
    api.get(`/manufacturers/${id}`),

  updateProfile: (data: ManufacturerProfileForm): Promise<Manufacturer> =>
    api.patch('/manufacturers/profile', data),

  getProfile: (): Promise<Manufacturer> =>
    api.get('/manufacturers/profile'),

  uploadDocuments: (files: File[]): Promise<void> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('documents', file));
    return api.post('/manufacturers/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  submitForVerification: (): Promise<Manufacturer> =>
    api.post('/manufacturers/submit-verification'),
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

  createPaymentIntent: (orderId: number, quoteId: number, customerCountry?: string): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    publishableKey: string;
    amount: number;
    currency: string;
  }> =>
    api.post('/payments/payment-intents', { 
      order_id: orderId, 
      quote_id: quoteId,
      customer_country: customerCountry 
    }),

  confirmPayment: (paymentIntentId: string): Promise<{
    status: string;
    transactionId: number;
  }> =>
    api.post(`/payments/payment-intents/${paymentIntentId}/confirm`),

  refundTransaction: (transactionId: number, amount?: number, reason?: string): Promise<{
    status: string;
    refundAmount: number;
  }> =>
    api.post(`/payments/transactions/${transactionId}/refund`, { amount, reason }),

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
};

// Dashboard API
export const dashboardApi = {
  getStats: (): Promise<DashboardStats> =>
    api.get('/dashboard/stats'),

  getClientStats: (): Promise<DashboardStats> => {
    // MOCK DATA FOR TESTING - REMOVE IN PRODUCTION
    const mockClientStats: DashboardStats = {
      orders: {
        total: 24,
        active: 8,
        completed: 14,
        cancelled: 2,
        recentOrders: [
          {
            id: '1',
            clientId: '1',
            title: 'Custom CNC Machined Parts',
            description: 'High-precision aluminum components for aerospace application',
                                      category: CapabilityCategory.CNC_MACHINING,
             specifications: [],
             files: [],
             targetPrice: 15000,
             targetPriceMax: 18000,
             currency: 'USD',
             quantity: 100,
             deliveryDate: '2024-02-15',
             deliveryAddress: {
               street: '123 Industrial Ave',
               city: 'Detroit',
               state: 'MI',
               postalCode: '48201',
               country: 'United States'
             },
             status: OrderStatus.IN_PRODUCTION,
             urgency: UrgencyLevel.HIGH,
            isPublic: true,
            quotesCount: 5,
            selectedQuoteId: 1,
            totalAmount: 16500,
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-20T14:30:00Z',
            quotes: [],
            transactions: []
          },
          {
            id: '2',
            clientId: '1',
            title: '3D Printed Prototypes',
            description: 'Rapid prototyping for product development',
                         category: CapabilityCategory.ADDITIVE_MANUFACTURING,
            specifications: [],
            files: [],
            targetPrice: 2500,
            currency: 'USD',
            quantity: 10,
            deliveryDate: '2024-02-01',
            deliveryAddress: {
              street: '456 Tech Blvd',
              city: 'San Francisco',
              state: 'CA',
              postalCode: '94105',
              country: 'United States'
            },
            status: 'quoted' as any,
            urgency: 'medium' as any,
            isPublic: true,
            quotesCount: 3,
            createdAt: '2024-01-18T09:15:00Z',
            updatedAt: '2024-01-19T16:45:00Z',
            quotes: [],
            transactions: []
          },
          {
            id: '3',
            clientId: '1',
            title: 'Sheet Metal Fabrication',
            description: 'Custom enclosures for electronic equipment',
            category: 'sheet_metal' as any,
            specifications: [],
            files: [],
            targetPrice: 8000,
            currency: 'USD',
            quantity: 50,
            deliveryDate: '2024-02-28',
            deliveryAddress: {
              street: '789 Manufacturing St',
              city: 'Chicago',
              state: 'IL',
              postalCode: '60601',
              country: 'United States'
            },
            status: 'pending' as any,
            urgency: 'low' as any,
            isPublic: true,
            quotesCount: 2,
            createdAt: '2024-01-20T11:30:00Z',
            updatedAt: '2024-01-20T11:30:00Z',
            quotes: [],
            transactions: []
          }
        ]
      },
      quotes: {
        total: 18,
        pending: 6,
        accepted: 8,
        rejected: 4,
        winRate: 44.4,
        averageValue: 12750,
        recentQuotes: [
          {
            id: '1',
            orderId: '1',
            manufacturerId: '1',
            totalAmount: 16500,
            currency: 'USD',
            deliveryTime: 14,
            validUntil: '2024-02-01T23:59:59Z',
            status: 'selected' as any,
            createdAt: '2024-01-16T14:20:00Z',
            updatedAt: '2024-01-17T10:15:00Z',
            quantity: 100,
            material: 'Aluminum 6061-T6',
            finish: 'Anodized',
            tolerance: '±0.005"',
            process: 'CNC Machining',
            paymentTerms: 'Net 30',
            shippingMethod: 'Ground',
            warranty: '1 Year',
            notes: 'Expedited delivery available',
            breakdown: {
              materials: 8000,
              labor: 6000,
              overhead: 1500,
              shipping: 500,
              taxes: 500,
              total: 16500,
              currency: 'USD'
            }
          },
          {
            id: '2',
            orderId: '2',
            manufacturerId: '2',
            totalAmount: 2200,
            currency: 'USD',
            deliveryTime: 7,
            validUntil: '2024-01-25T23:59:59Z',
            status: QuoteStatus.SUBMITTED,
            createdAt: '2024-01-19T09:30:00Z',
            updatedAt: '2024-01-19T09:30:00Z',
            quantity: 10,
            material: 'PLA Plastic',
            finish: 'Standard',
            tolerance: '±0.1mm',
            process: '3D Printing (FDM)',
            paymentTerms: 'Net 15',
            shippingMethod: 'Express',
            warranty: '30 Days',
            breakdown: {
              materials: 800,
              labor: 1000,
              overhead: 200,
              shipping: 100,
              taxes: 100,
              total: 2200,
              currency: 'USD'
            }
          },
          {
            id: '3',
            orderId: '3',
            manufacturerId: '3',
            totalAmount: 7500,
            currency: 'USD',
            deliveryTime: 21,
            validUntil: '2024-02-05T23:59:59Z',
            status: QuoteStatus.SUBMITTED,
            createdAt: '2024-01-20T15:45:00Z',
            updatedAt: '2024-01-20T15:45:00Z',
            quantity: 50,
            material: 'Steel 304',
            finish: 'Powder Coated',
            tolerance: '±0.010"',
            process: 'Laser Cutting + Bending',
            paymentTerms: 'Net 30',
            shippingMethod: 'Freight',
            warranty: '2 Years',
            breakdown: {
              materials: 3500,
              labor: 2800,
              overhead: 700,
              shipping: 300,
              taxes: 200,
              total: 7500,
              currency: 'USD'
            }
          }
        ]
      },
      revenue: {
        total: 127500,
        thisMonth: 23800,
        lastMonth: 19200,
        growth: 23.96,
        currency: 'USD',
        breakdown: [
          { period: '2024-01', amount: 23800, orders: 3 },
          { period: '2023-12', amount: 19200, orders: 2 },
          { period: '2023-11', amount: 31500, orders: 4 },
          { period: '2023-10', amount: 28000, orders: 3 },
          { period: '2023-09', amount: 25000, orders: 3 }
        ]
      },
      performance: {
        rating: 4.7,
        reviewCount: 23,
        onTimeDelivery: 91.3,
        qualityScore: 4.6,
        responseTime: 2.4
      }
    };

    // Simulate API delay
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockClientStats), 500);
    });
  },

  getManufacturerStats: (): Promise<DashboardStats> =>
    api.get('/dashboard/manufacturer/stats'),

  getAnalytics: (period: string = '30d'): Promise<any> =>
    api.get(`/dashboard/analytics?period=${period}`),
};

// Notifications API
export const notificationsApi = {
  getNotifications: (page?: number, limit?: number): Promise<PaginatedResponse<Notification>> =>
    api.getPaginated(`/notifications?page=${page || 1}&limit=${limit || 20}`),

  markAsRead: (id: string): Promise<void> =>
    api.patch(`/notifications/${id}/read`),

  markAllAsRead: (): Promise<void> =>
    api.post('/notifications/mark-all-read'),

  getUnreadCount: (): Promise<{ count: number }> =>
    api.get('/notifications/unread-count'),
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

// Query client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 429 (rate limit)
        if (error?.response?.status >= 400 && error?.response?.status < 500 && error?.response?.status !== 429) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

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

// Export the configured api client
export default api; 