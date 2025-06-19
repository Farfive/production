import { apiClient } from '../api-client';
import { QuoteStatus } from '../../types';

export interface QuoteNotification {
  id: number;
  type: 'quote_created' | 'quote_updated' | 'quote_accepted' | 'quote_rejected' | 
        'quote_expired' | 'quote_viewed' | 'negotiation_started' | 'payment_required';
  title: string;
  message: string;
  quoteId: number;
  orderId: number;
  fromUserId: number;
  fromUserName: string;
  data: {
    quoteAmount?: number;
    currency?: string;
    previousStatus?: QuoteStatus;
    newStatus?: QuoteStatus;
    manufacturerName?: string;
    clientName?: string;
  };
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  readAt?: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  notificationTypes: {
    quoteCreated: boolean;
    quoteUpdated: boolean;
    quoteAccepted: boolean;
    quoteRejected: boolean;
    paymentRequired: boolean;
  };
}

export const notificationsApi = {
  // Get quote notifications
  getQuoteNotifications: async (params?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Promise<QuoteNotification[]> => {
    try {
      const response = await apiClient.get('/api/v1/notifications/quotes', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching quote notifications:', error);
      throw error;
    }
  },

  // Get notification by ID
  getNotification: async (id: number): Promise<QuoteNotification> => {
    try {
      const response = await apiClient.get(`/api/v1/notifications/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notification:', error);
      throw error;
    }
  },

  // Mark notifications as read
  markNotificationsAsRead: async (notificationIds: number[]): Promise<void> => {
    try {
      await apiClient.post('/api/v1/notifications/mark-read', {
        notification_ids: notificationIds
      });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    try {
      await apiClient.post('/api/v1/notifications/mark-all-read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Delete notification
  deleteNotification: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/api/v1/notifications/${id}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Delete multiple notifications
  deleteNotifications: async (notificationIds: number[]): Promise<void> => {
    try {
      await apiClient.post('/api/v1/notifications/delete-bulk', {
        notification_ids: notificationIds
      });
    } catch (error) {
      console.error('Error deleting notifications:', error);
      throw error;
    }
  },

  // Get unread count
  getUnreadCount: async (): Promise<{ count: number }> => {
    try {
      const response = await apiClient.get('/api/v1/notifications/unread-count');
      return response.data;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  },

  // Get notification settings
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    try {
      const response = await apiClient.get('/api/v1/notifications/settings');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      throw error;
    }
  },

  // Update notification settings
  updateNotificationSettings: async (settings: Partial<NotificationSettings>): Promise<NotificationSettings> => {
    try {
      const response = await apiClient.put('/api/v1/notifications/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  },

  // Create test notification
  createTestNotification: async (type: string): Promise<void> => {
    try {
      await apiClient.post('/api/v1/notifications/test', { type });
    } catch (error) {
      console.error('Error creating test notification:', error);
      throw error;
    }
  },

  // Subscribe to push notifications
  subscribeToPush: async (subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }): Promise<void> => {
    try {
      await apiClient.post('/api/v1/notifications/push/subscribe', subscription);
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  },

  // Unsubscribe from push notifications
  unsubscribeFromPush: async (): Promise<void> => {
    try {
      await apiClient.post('/api/v1/notifications/push/unsubscribe');
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  },

  // Get notification history
  getNotificationHistory: async (params: {
    startDate?: string;
    endDate?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    notifications: QuoteNotification[];
    total: number;
    hasMore: boolean;
  }> => {
    try {
      const response = await apiClient.get('/api/v1/notifications/history', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching notification history:', error);
      throw error;
    }
  },

  // Send custom notification
  sendCustomNotification: async (data: {
    recipientIds: number[];
    title: string;
    message: string;
    type: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    data?: Record<string, any>;
  }): Promise<void> => {
    try {
      await apiClient.post('/api/v1/notifications/send', data);
    } catch (error) {
      console.error('Error sending custom notification:', error);
      throw error;
    }
  },

  // Get notification templates
  getNotificationTemplates: async (): Promise<Array<{
    id: string;
    name: string;
    template: string;
    variables: string[];
  }>> => {
    try {
      const response = await apiClient.get('/api/v1/notifications/templates');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification templates:', error);
      throw error;
    }
  },

  // Update notification template
  updateNotificationTemplate: async (id: string, template: {
    name: string;
    template: string;
    variables: string[];
  }): Promise<void> => {
    try {
      await apiClient.put(`/api/v1/notifications/templates/${id}`, template);
    } catch (error) {
      console.error('Error updating notification template:', error);
      throw error;
    }
  },

  // Get notification analytics
  getNotificationAnalytics: async (params: {
    timeRange: string;
    type?: string;
  }): Promise<{
    totalSent: number;
    totalRead: number;
    readRate: number;
    avgReadTime: number;
    byType: Array<{
      type: string;
      sent: number;
      read: number;
      readRate: number;
    }>;
    byPriority: Array<{
      priority: string;
      sent: number;
      read: number;
      readRate: number;
    }>;
    trends: Array<{
      date: string;
      sent: number;
      read: number;
    }>;
  }> => {
    try {
      const response = await apiClient.get('/api/v1/notifications/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching notification analytics:', error);
      throw error;
    }
  },

  // Snooze notification
  snoozeNotification: async (id: number, snoozeUntil: string): Promise<void> => {
    try {
      await apiClient.post(`/api/v1/notifications/${id}/snooze`, {
        snooze_until: snoozeUntil
      });
    } catch (error) {
      console.error('Error snoozing notification:', error);
      throw error;
    }
  },

  // Archive notification
  archiveNotification: async (id: number): Promise<void> => {
    try {
      await apiClient.post(`/api/v1/notifications/${id}/archive`);
    } catch (error) {
      console.error('Error archiving notification:', error);
      throw error;
    }
  },

  // Get archived notifications
  getArchivedNotifications: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<QuoteNotification[]> => {
    try {
      const response = await apiClient.get('/api/v1/notifications/archived', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching archived notifications:', error);
      throw error;
    }
  }
}; 