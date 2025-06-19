import { apiClient } from '../api-client';

// Invoice Types
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quoteId?: string;
  orderId?: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  dueDate: string;
  notes?: string;
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paymentTerms: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  paidAt?: string;
}

export interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  averagePaymentTime: number;
  paymentRate: number;
}

export interface InvoiceCreateData {
  quoteId?: number;
  orderId?: number;
  clientId: number;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
  }[];
  dueDate?: string;
  notes?: string;
  taxRate?: number;
  discountPercent?: number;
  paymentTerms?: string;
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface InvoiceSendRequest {
  recipientEmail?: string;
  subject?: string;
  message?: string;
}

// Invoices API
export const invoicesApi = {
  // Get all invoices with pagination and filtering
  fetchInvoices: async (filters?: {
    page?: number;
    perPage?: number;
    status?: string;
    clientId?: number;
  }): Promise<InvoiceListResponse> => {
    const params = new URLSearchParams();
    
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.perPage) params.append('per_page', filters.perPage.toString());
    if (filters?.status) params.append('status_filter', filters.status);
    if (filters?.clientId) params.append('client_id', filters.clientId.toString());
    
    const queryString = params.toString();
    const url = `/invoices${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get<InvoiceListResponse>(url);
    return response;
  },

  // Get invoice by ID
  getInvoice: async (invoiceId: string): Promise<Invoice> => {
    const response = await apiClient.get<Invoice>(`/invoices/${invoiceId}`);
    return response;
  },

  // Create a new invoice
  createInvoice: async (invoiceData: InvoiceCreateData): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>('/invoices/', invoiceData);
    return response;
  },

  // Update invoice
  updateInvoice: async (invoiceId: string, updates: Partial<InvoiceCreateData>): Promise<Invoice> => {
    const response = await apiClient.put<Invoice>(`/invoices/${invoiceId}`, updates);
    return response;
  },

  // Send invoice to client
  sendInvoice: async (invoiceId: string, sendRequest?: InvoiceSendRequest): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/invoices/${invoiceId}/send`, sendRequest || {});
    return response;
  },

  // Download invoice PDF
  downloadInvoicePdf: async (invoiceId: string): Promise<Blob> => {
    const response = await fetch(`/api/v1/invoices/${invoiceId}/pdf`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    return response.blob();
  },

  // Export invoices to CSV
  exportInvoicesCSV: async (filters?: {
    status?: string;
  }): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status_filter', filters.status);
    
    const queryString = params.toString();
    const response = await fetch(`/api/v1/invoices/export/csv${queryString ? `?${queryString}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    
    return response.blob();
  },

  // Get invoice statistics (mock for now - would need backend endpoint)
  fetchStats: async (): Promise<InvoiceStats> => {
    // This would need a real backend endpoint like GET /invoices/stats
    // For now, calculate from invoice list
    try {
      const invoicesResponse = await invoicesApi.fetchInvoices({ perPage: 1000 });
      const invoices = invoicesResponse.invoices;
      
      const totalInvoices = invoices.length;
      const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
      const paidAmount = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const overdueInvoices = invoices.filter(inv => inv.status === 'OVERDUE');
      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const pendingAmount = totalAmount - paidAmount - overdueAmount;
      
      // Calculate average payment time for paid invoices
      const paymentTimes = paidInvoices
        .filter(inv => inv.paidAt && inv.sentAt)
        .map(inv => {
          const sent = new Date(inv.sentAt!);
          const paid = new Date(inv.paidAt!);
          return (paid.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24); // days
        });
      
      const averagePaymentTime = paymentTimes.length > 0 
        ? paymentTimes.reduce((sum, time) => sum + time, 0) / paymentTimes.length 
        : 0;
      
      const paymentRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
      
      return {
        totalInvoices,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        averagePaymentTime,
        paymentRate
      };
    } catch (error) {
      // Fallback mock data if API fails
      return {
        totalInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        averagePaymentTime: 0,
        paymentRate: 0
      };
    }
  }
}; 