// Types for API responses
export interface Quote {
  id: number;
  order_id: number;
  manufacturer_id: number;
  price: number;
  status: string;
  delivery_time: number;
  description?: string;
  created_at: string;
  updated_at: string;
  attachments?: QuoteAttachment[];
}

export interface QuoteAttachment {
  id: number;
  quote_id: number;
  name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  quote_id?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  read_at?: string;
  action_url?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

export interface Transaction {
  id: number;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  created_at: string;
  payment_method?: PaymentMethod;
}

export interface DashboardStats {
  total_orders?: number;
  active_orders?: number;
  completed_orders?: number;
  total_quotes?: number;
  pending_quotes?: number;
  accepted_quotes?: number;
  success_rate?: number;
  available_orders?: number;
  recent_orders?: any[];
  recent_quotes?: any[];
  recent_available_orders?: any[];
  // Admin-specific properties
  total_users?: number;
  total_manufacturers?: number;
  total_revenue?: number;
  active_users?: number;
  pending_approvals?: number;
  system_health?: 'good' | 'warning' | 'critical';
  recent_activity?: any[];
  monthly_growth?: {
    users: number;
    orders: number;
    revenue: number;
  };
  system_metrics?: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    activeConnections: number;
  };
}

export interface UserProfile {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  phone?: string;
  company?: string;
  created_at: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  stripe_subscription_id: string;
  plan_name: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  amount: number;
  currency: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  manufacturer_id?: number;
  order_id?: number;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  created_at: string;
}

// HTTP Client
class HttpClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get token from localStorage or auth context
    const token = localStorage.getItem('token');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      // Handle authentication errors
      if (response.status === 401) {
        // Token might be expired or invalid
        console.warn('Authentication failed, clearing stored credentials');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Don't throw error immediately, let the component handle it
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      
      return response.text() as unknown as T;
    } catch (error) {
      // Log the error but don't prevent the app from working
      console.warn(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    const headers: Record<string, string> = data instanceof FormData 
      ? {} 
      : { 'Content-Type': 'application/json' };

    return this.request<T>(endpoint, {
      method: 'POST',
      body,
      headers: {
        ...headers,
        ...options?.headers,
      },
      ...options,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// API Service Class
export class ApiService {
  private client: HttpClient;

  constructor() {
    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
    this.client = new HttpClient(baseURL);
  }

  // Quote Management
  async getQuotes(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    order_id?: number;
  }): Promise<Quote[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.order_id) queryParams.append('order_id', params.order_id.toString());

    return this.client.get(`/quotes?${queryParams.toString()}`);
  }

  async getQuote(id: number): Promise<Quote> {
    return this.client.get(`/quotes/${id}`);
  }

  async createQuote(quoteData: any): Promise<Quote> {
    return this.client.post('/quotes', quoteData);
  }

  async acceptQuote(id: number): Promise<{ message: string }> {
    return this.client.post(`/quotes/${id}/accept`);
  }

  async rejectQuote(id: number, reason?: string): Promise<{ message: string }> {
    return this.client.post(`/quotes/${id}/reject`, { reason });
  }

  async negotiateQuote(id: number, negotiationData: any): Promise<any> {
    return this.client.post(`/quotes/${id}/negotiate`, negotiationData);
  }

  async uploadQuoteAttachments(id: number, files: File[], descriptions?: string[]): Promise<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (descriptions) {
      descriptions.forEach(desc => formData.append('descriptions', desc));
    }
    return this.client.post(`/quotes/${id}/attachments`, formData);
  }

  async getQuoteAttachments(id: number): Promise<QuoteAttachment[]> {
    return this.client.get(`/quotes/${id}/attachments`);
  }

  async deleteQuoteAttachment(quoteId: number, attachmentId: number): Promise<void> {
    return this.client.delete(`/quotes/${quoteId}/attachments/${attachmentId}`);
  }

  async searchQuotes(params: {
    status?: string[];
    order_id?: number;
    manufacturer_id?: number;
    min_price?: number;
    max_price?: number;
    created_from?: string;
    created_to?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
    skip?: number;
    limit?: number;
  }): Promise<Quote[]> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v.toString()));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });
    return this.client.get(`/quotes/search?${queryParams.toString()}`);
  }

  async getQuoteAnalyticsOverview(): Promise<any> {
    return this.client.get('/quotes/analytics/overview');
  }

  // Notification Management
  async getNotifications(params?: {
    unread_only?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Notification[]> {
    const queryParams = new URLSearchParams();
    if (params?.unread_only) queryParams.append('unread_only', 'true');
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    return this.client.get(`/notifications?${queryParams.toString()}`);
  }

  async markNotificationAsRead(id: string): Promise<{ success: boolean }> {
    return this.client.post(`/notifications/${id}/read`);
  }

  async getUnreadNotificationCount(): Promise<{ count: number }> {
    return this.client.get('/notifications/unread-count');
  }

  async deleteNotification(id: string): Promise<{ message: string }> {
    return this.client.delete(`/notifications/${id}`);
  }

  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    return this.client.post('/notifications/mark-all-read');
  }

  async getNotificationTypes(): Promise<any> {
    return this.client.get('/notifications/types');
  }

  async getNotificationSettings(): Promise<any> {
    return this.client.get('/notifications/settings');
  }

  async updateNotificationSettings(settings: any): Promise<any> {
    return this.client.put('/notifications/settings', settings);
  }

  // Payment Management
  async createPaymentIntent(data: {
    amount: number;
    currency: string;
    create_customer?: boolean;
    metadata?: Record<string, any>;
  }): Promise<any> {
    return this.client.post('/payments/create-payment-intent', data);
  }

  async processOrderPayment(data: {
    order_id: number;
    quote_id: number;
    payment_method_id: string;
    save_payment_method?: boolean;
  }): Promise<any> {
    return this.client.post('/payments/process-order-payment', data);
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return this.client.get('/payments/payment-methods');
  }

  async deletePaymentMethod(id: string): Promise<{ message: string }> {
    return this.client.delete(`/payments/payment-methods/${id}`);
  }

  async createSetupIntent(): Promise<any> {
    return this.client.post('/payments/setup-intent');
  }

  async getPaymentHistory(limit: number = 20): Promise<Transaction[]> {
    return this.client.get(`/payments/history?limit=${limit}`);
  }

  async processRefund(data: {
    payment_id: number;
    amount?: number;
    reason?: string;
  }): Promise<any> {
    return this.client.post('/payments/refund', data);
  }

  async getPaymentDetails(id: number): Promise<any> {
    return this.client.get(`/payments/${id}`);
  }

  async getOrderPayments(orderId: number): Promise<Transaction[]> {
    return this.client.get(`/payments/order/${orderId}/payments`);
  }

  async createSubscription(priceId: string, trialDays?: number): Promise<any> {
    return this.client.post('/payments/subscription/create', {
      price_id: priceId,
      trial_days: trialDays
    });
  }

  async getPaymentAnalytics(): Promise<any> {
    return this.client.get('/payments/analytics/summary');
  }

  // Dashboard Data
  async getClientDashboard(): Promise<DashboardStats> {
    return this.client.get('/dashboard/client');
  }

  async getManufacturerDashboard(): Promise<DashboardStats> {
    return this.client.get('/dashboard/manufacturer');
  }

  async getAdminDashboard(): Promise<DashboardStats> {
    return this.client.get('/dashboard/admin');
  }

  // User Management
  async getCurrentUser(): Promise<UserProfile> {
    return this.client.get('/users/me');
  }

  async updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    return this.client.patch('/users/me', data);
  }

  async deleteUserAccount(): Promise<{ message: string }> {
    return this.client.delete('/users/me');
  }

  async getUserById(id: number): Promise<UserProfile> {
    return this.client.get(`/users/${id}`);
  }

  // Order Management
  async getOrders(params?: any): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return this.client.get(`/orders?${queryParams.toString()}`);
  }

  async getOrder(id: number): Promise<any> {
    return this.client.get(`/orders/${id}`);
  }

  async createOrder(orderData: any): Promise<any> {
    return this.client.post('/orders', orderData);
  }

  async updateOrder(id: number, orderData: any): Promise<any> {
    return this.client.patch(`/orders/${id}`, orderData);
  }

  // Manufacturer Management
  async getManufacturers(params?: any): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return this.client.get(`/manufacturers?${queryParams.toString()}`);
  }

  async getManufacturer(id: number): Promise<any> {
    return this.client.get(`/manufacturers/${id}`);
  }

  // Document/File Management
  async uploadDocument(file: File, metadata?: any): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    return this.client.post('/documents/upload', formData);
  }

  async getDocuments(params?: any): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return this.client.get(`/documents?${queryParams.toString()}`);
  }

  async deleteDocument(id: number): Promise<{ message: string }> {
    return this.client.delete(`/documents/${id}`);
  }

  // Portfolio Management
  async getPortfolioItems(): Promise<any[]> {
    return this.client.get('/manufacturers/me/portfolio');
  }

  async addPortfolioItem(data: any): Promise<any> {
    return this.client.post('/manufacturers/me/portfolio', data);
  }

  async updatePortfolioItem(id: number, data: any): Promise<any> {
    return this.client.patch(`/manufacturers/me/portfolio/${id}`, data);
  }

  async deletePortfolioItem(id: number): Promise<{ message: string }> {
    return this.client.delete(`/manufacturers/me/portfolio/${id}`);
  }

  // Subscription Management
  async getSubscriptions(): Promise<Subscription[]> {
    return this.client.get('/subscriptions');
  }

  async getSubscription(id: number): Promise<Subscription> {
    return this.client.get(`/subscriptions/${id}`);
  }

  async cancelSubscription(id: number): Promise<{ message: string }> {
    return this.client.post(`/subscriptions/${id}/cancel`);
  }

  async updateSubscription(id: number, data: any): Promise<Subscription> {
    return this.client.patch(`/subscriptions/${id}`, data);
  }

  // Invoice Management
  async getInvoices(params?: any): Promise<Invoice[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return this.client.get(`/invoices?${queryParams.toString()}`);
  }

  async getInvoice(id: number): Promise<Invoice> {
    return this.client.get(`/invoices/${id}`);
  }

  async createInvoice(data: any): Promise<Invoice> {
    return this.client.post('/invoices', data);
  }

  async updateInvoice(id: number, data: any): Promise<Invoice> {
    return this.client.patch(`/invoices/${id}`, data);
  }

  async deleteInvoice(id: number): Promise<{ message: string }> {
    return this.client.delete(`/invoices/${id}`);
  }

  async payInvoice(id: number, paymentData: any): Promise<any> {
    return this.client.post(`/invoices/${id}/pay`, paymentData);
  }
}

// Export singleton instance
export const apiService = new ApiService(); 