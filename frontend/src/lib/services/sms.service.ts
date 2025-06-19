import { ApiClient } from '../api-client';
import * as Sentry from '@sentry/react';

// Types for SMS service
export interface SmsConfig {
  provider: 'twilio' | 'aws-sns' | 'messagebird' | 'vonage';
  accountSid?: string;
  authToken?: string;
  fromNumber: string;
  region?: string;
}

export interface SmsRecipient {
  phoneNumber: string;
  name?: string;
  variables?: Record<string, string>;
}

export interface SendSmsRequest {
  to: string | string[];
  message: string;
  from?: string;
  templateId?: string;
  variables?: Record<string, string>;
  scheduledAt?: Date;
  validityPeriod?: number; // hours
  priority?: 'low' | 'normal' | 'high';
  metadata?: Record<string, string>;
}

export interface SendSmsResponse {
  id: string;
  status: string;
  recipients: Array<{
    phoneNumber: string;
    messageId: string;
    status: string;
  }>;
  cost?: number;
  segments: number;
}

export interface SmsStatus {
  messageId: string;
  phoneNumber: string;
  status: 'queued' | 'sent' | 'received' | 'delivered' | 'undelivered' | 'failed';
  errorCode?: string;
  errorMessage?: string;
  cost?: number;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
}

export interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  category: string;
  language: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BulkSmsRequest {
  recipients: Array<{
    phoneNumber: string;
    message: string;
    variables?: Record<string, string>;
  }>;
  from?: string;
  scheduledAt?: Date;
  batchSize?: number;
  rateLimitPerSecond?: number;
  metadata?: Record<string, string>;
}

export interface BulkSmsResponse {
  batchId: string;
  totalRecipients: number;
  estimatedCost: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface SmsAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  totalCost: number;
  averageCostPerMessage: number;
  messagesByStatus: Record<string, number>;
  messagesByCountry: Record<string, number>;
  messagesByDay: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
  }>;
}

export interface PhoneNumberInfo {
  phoneNumber: string;
  isValid: boolean;
  country: string;
  countryCode: string;
  carrier?: string;
  lineType?: 'mobile' | 'landline' | 'voip' | 'toll-free';
  isOptedOut: boolean;
  lastActivity?: string;
}

export interface OptOutRequest {
  phoneNumber: string;
  reason?: string;
  source?: 'user' | 'carrier' | 'compliance';
}

export interface SmsWebhookPayload {
  messageId: string;
  phoneNumber: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
  cost?: number;
}

// SMS service class
export class SmsService {
  private apiClient: ApiClient;
  private config: SmsConfig;

  constructor(config: SmsConfig) {
    this.config = config;
    this.apiClient = new ApiClient({
      baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
      timeout: 30000,
      retryAttempts: 3,
      enableLogging: true,
    });
  }

  /**
   * Send a single SMS
   */
  public async sendSms(request: SendSmsRequest): Promise<SendSmsResponse> {
    try {
      // Validate phone numbers
      const phoneNumbers = Array.isArray(request.to) ? request.to : [request.to];
      for (const phoneNumber of phoneNumbers) {
        if (!this.isValidPhoneNumber(phoneNumber)) {
          throw new Error(`Invalid phone number: ${phoneNumber}`);
        }
      }

      const response = await this.apiClient.post('/sms/send', {
        ...request,
        provider: this.config.provider,
        from: request.from || this.config.fromNumber,
      });

      return response;
    } catch (error) {
      this.handleSmsError('send_sms', error, {
        recipients: Array.isArray(request.to) ? request.to.length : 1,
        hasTemplate: !!request.templateId,
      });
      throw error;
    }
  }

  /**
   * Send bulk SMS messages
   */
  public async sendBulkSms(request: BulkSmsRequest): Promise<BulkSmsResponse> {
    try {
      // Validate all phone numbers
      for (const recipient of request.recipients) {
        if (!this.isValidPhoneNumber(recipient.phoneNumber)) {
          throw new Error(`Invalid phone number: ${recipient.phoneNumber}`);
        }
      }

      const response = await this.apiClient.post('/sms/bulk-send', {
        ...request,
        provider: this.config.provider,
        from: request.from || this.config.fromNumber,
      });

      return response;
    } catch (error) {
      this.handleSmsError('send_bulk_sms', error, {
        recipients: request.recipients.length,
        batchSize: request.batchSize,
      });
      throw error;
    }
  }

  /**
   * Send SMS using template
   */
  public async sendTemplateSms(
    templateId: string,
    recipients: SmsRecipient[],
    globalVariables: Record<string, string> = {}
  ): Promise<SendSmsResponse> {
    try {
      const response = await this.apiClient.post('/sms/send-template', {
        templateId,
        recipients,
        globalVariables,
        provider: this.config.provider,
        from: this.config.fromNumber,
      });

      return response;
    } catch (error) {
      this.handleSmsError('send_template_sms', error, {
        templateId,
        recipients: recipients.length,
      });
      throw error;
    }
  }

  /**
   * Get SMS delivery status
   */
  public async getSmsStatus(messageId: string): Promise<SmsStatus> {
    try {
      const response = await this.apiClient.get(`/sms/status/${messageId}`);
      return response;
    } catch (error) {
      this.handleSmsError('get_sms_status', error, { messageId });
      throw error;
    }
  }

  /**
   * Get bulk SMS batch status
   */
  public async getBulkSmsStatus(batchId: string): Promise<{
    batchId: string;
    status: string;
    totalRecipients: number;
    processedRecipients: number;
    successCount: number;
    failureCount: number;
    messages: SmsStatus[];
  }> {
    try {
      const response = await this.apiClient.get(`/sms/bulk-status/${batchId}`);
      return response;
    } catch (error) {
      this.handleSmsError('get_bulk_sms_status', error, { batchId });
      throw error;
    }
  }

  /**
   * Cancel scheduled SMS
   */
  public async cancelScheduledSms(messageId: string): Promise<void> {
    try {
      await this.apiClient.delete(`/sms/cancel/${messageId}`);
    } catch (error) {
      this.handleSmsError('cancel_scheduled_sms', error, { messageId });
      throw error;
    }
  }

  /**
   * Get SMS templates
   */
  public async getTemplates(): Promise<SmsTemplate[]> {
    try {
      const response = await this.apiClient.get('/sms/templates');
      return response;
    } catch (error) {
      this.handleSmsError('get_templates', error);
      throw error;
    }
  }

  /**
   * Create SMS template
   */
  public async createTemplate(
    name: string,
    content: string,
    category: string,
    language: string = 'en'
  ): Promise<SmsTemplate> {
    try {
      const variables = this.extractVariables(content);
      
      const response = await this.apiClient.post('/sms/templates', {
        name,
        content,
        variables,
        category,
        language,
      });

      return response;
    } catch (error) {
      this.handleSmsError('create_template', error, { name, category });
      throw error;
    }
  }

  /**
   * Update SMS template
   */
  public async updateTemplate(
    templateId: string,
    updates: Partial<Omit<SmsTemplate, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<SmsTemplate> {
    try {
      if (updates.content) {
        updates.variables = this.extractVariables(updates.content);
      }

      const response = await this.apiClient.put(`/sms/templates/${templateId}`, updates);
      return response;
    } catch (error) {
      this.handleSmsError('update_template', error, { templateId, updates });
      throw error;
    }
  }

  /**
   * Delete SMS template
   */
  public async deleteTemplate(templateId: string): Promise<void> {
    try {
      await this.apiClient.delete(`/sms/templates/${templateId}`);
    } catch (error) {
      this.handleSmsError('delete_template', error, { templateId });
      throw error;
    }
  }

  /**
   * Get phone number information
   */
  public async getPhoneNumberInfo(phoneNumber: string): Promise<PhoneNumberInfo> {
    try {
      const response = await this.apiClient.get('/sms/phone-info', {
        params: { phoneNumber },
      });
      return response;
    } catch (error) {
      this.handleSmsError('get_phone_number_info', error, { phoneNumber });
      throw error;
    }
  }

  /**
   * Add phone number to opt-out list
   */
  public async addToOptOutList(request: OptOutRequest): Promise<void> {
    try {
      await this.apiClient.post('/sms/opt-out', request);
    } catch (error) {
      this.handleSmsError('add_to_opt_out_list', error, request);
      throw error;
    }
  }

  /**
   * Remove phone number from opt-out list
   */
  public async removeFromOptOutList(phoneNumber: string): Promise<void> {
    try {
      await this.apiClient.delete(`/sms/opt-out/${encodeURIComponent(phoneNumber)}`);
    } catch (error) {
      this.handleSmsError('remove_from_opt_out_list', error, { phoneNumber });
      throw error;
    }
  }

  /**
   * Get opt-out list
   */
  public async getOptOutList(limit: number = 100, offset: number = 0): Promise<{
    phoneNumbers: Array<{
      phoneNumber: string;
      reason?: string;
      source?: string;
      optedOutAt: string;
    }>;
    total: number;
  }> {
    try {
      const response = await this.apiClient.get('/sms/opt-out', {
        params: { limit, offset },
      });
      return response;
    } catch (error) {
      this.handleSmsError('get_opt_out_list', error, { limit, offset });
      throw error;
    }
  }

  /**
   * Get SMS analytics
   */
  public async getSmsAnalytics(
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<SmsAnalytics> {
    try {
      const response = await this.apiClient.get('/sms/analytics', {
        params: { startDate, endDate, groupBy },
      });
      return response;
    } catch (error) {
      this.handleSmsError('get_sms_analytics', error, { startDate, endDate, groupBy });
      throw error;
    }
  }

  /**
   * Handle webhook events
   */
  public async handleWebhook(payload: SmsWebhookPayload, signature?: string): Promise<void> {
    try {
      await this.apiClient.post('/sms/webhook', payload, {
        headers: signature ? { 'X-Signature': signature } : {},
      });
    } catch (error) {
      this.handleSmsError('handle_webhook', error, { messageId: payload.messageId });
      throw error;
    }
  }

  /**
   * Estimate SMS cost
   */
  public async estimateCost(
    phoneNumbers: string[],
    message: string,
    country?: string
  ): Promise<{
    totalCost: number;
    costPerMessage: number;
    segments: number;
    recipientCount: number;
    breakdown: Array<{
      country: string;
      count: number;
      costPerMessage: number;
      totalCost: number;
    }>;
  }> {
    try {
      const response = await this.apiClient.post('/sms/estimate-cost', {
        phoneNumbers,
        message,
        country,
        provider: this.config.provider,
      });
      return response;
    } catch (error) {
      this.handleSmsError('estimate_cost', error, {
        recipients: phoneNumbers.length,
        messageLength: message.length,
      });
      throw error;
    }
  }

  // Utility methods
  public isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation (E.164 format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/\s+/g, ''));
  }

  public formatPhoneNumber(phoneNumber: string, country?: string): string {
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Add + if missing and doesn't start with country code
    if (!cleaned.startsWith('+')) {
      if (country === 'US' && cleaned.length === 10) {
        return `+1${cleaned}`;
      } else if (country === 'US' && cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
      }
      // Add default country code if provided
      // This would need to be expanded based on requirements
    }
    
    return cleaned;
  }

  public calculateMessageSegments(message: string): number {
    // SMS segments calculation
    const singleSmsLength = 160;
    const multiSmsLength = 153; // 7 characters reserved for UDH
    
    if (message.length <= singleSmsLength) {
      return 1;
    }
    
    return Math.ceil(message.length / multiSmsLength);
  }

  public validateMessageContent(message: string): {
    isValid: boolean;
    errors: string[];
    segments: number;
    encoding: 'GSM-7' | 'UCS-2';
  } {
    const errors: string[] = [];
    
    // Check for maximum length (concatenated SMS limit)
    const maxLength = 1530; // 10 segments * 153 characters
    if (message.length > maxLength) {
      errors.push(`Message exceeds maximum length of ${maxLength} characters`);
    }
    
    // Check for empty message
    if (message.trim().length === 0) {
      errors.push('Message cannot be empty');
    }
    
    // Detect encoding
    const gsmCharacterSet = /^[A-Za-z0-9@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-.\/:;<=>?¡ÄÖÑÜ§¿äöñüà]*$/;
    const encoding = gsmCharacterSet.test(message) ? 'GSM-7' : 'UCS-2';
    
    const segments = this.calculateMessageSegments(message);
    
    return {
      isValid: errors.length === 0,
      errors,
      segments,
      encoding,
    };
  }

  public extractVariables(template: string): string[] {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = variableRegex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  }

  public renderTemplate(template: string, variables: Record<string, string>): string {
    let rendered = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, value);
    });
    
    return rendered;
  }

  // Private helper methods
  private handleSmsError(operation: string, error: any, context: any = {}): void {
    console.error(`[SmsService] ${operation} failed:`, error);

    Sentry.captureException(error, {
      tags: {
        service: 'sms',
        operation,
        provider: this.config.provider,
      },
      extra: {
        context,
        config: {
          provider: this.config.provider,
          fromNumber: this.config.fromNumber,
        },
      },
    });
  }
}

// SMS service instance
export const smsService = new SmsService({
  provider: (process.env.REACT_APP_SMS_PROVIDER as any) || 'twilio',
  accountSid: process.env.REACT_APP_SMS_ACCOUNT_SID,
  authToken: process.env.REACT_APP_SMS_AUTH_TOKEN,
  fromNumber: process.env.REACT_APP_SMS_FROM_NUMBER || '',
  region: process.env.REACT_APP_SMS_REGION,
});

// Predefined SMS templates for common use cases
export const SMS_TEMPLATES = {
  ORDER_CONFIRMATION: 'order_confirmation',
  DELIVERY_NOTIFICATION: 'delivery_notification',
  QUOTE_RECEIVED: 'quote_received',
  PAYMENT_CONFIRMATION: 'payment_confirmation',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  VERIFICATION_CODE: 'verification_code',
  PASSWORD_RESET: 'password_reset',
  PROMOTIONAL: 'promotional',
  ALERT: 'alert',
} as const;

// Helper functions for common SMS operations
export const smsHelpers = {
  /**
   * Send order confirmation SMS
   */
  sendOrderConfirmation: async (
    phoneNumber: string,
    orderData: {
      id: string;
      total: number;
      estimatedDelivery: string;
    }
  ): Promise<SendSmsResponse> => {
    return smsService.sendSms({
      to: phoneNumber,
      message: `Order confirmed! Order #${orderData.id} for $${orderData.total}. Estimated delivery: ${orderData.estimatedDelivery}. Track: [link]`,
      metadata: {
        type: 'order_confirmation',
        orderId: orderData.id,
      },
    });
  },

  /**
   * Send verification code SMS
   */
  sendVerificationCode: async (
    phoneNumber: string,
    code: string,
    expiryMinutes: number = 10
  ): Promise<SendSmsResponse> => {
    return smsService.sendSms({
      to: phoneNumber,
      message: `Your verification code is: ${code}. This code expires in ${expiryMinutes} minutes. Do not share with anyone.`,
      priority: 'high',
      validityPeriod: 1, // 1 hour
      metadata: {
        type: 'verification_code',
        code,
      },
    });
  },

  /**
   * Send delivery notification SMS
   */
  sendDeliveryNotification: async (
    phoneNumber: string,
    orderData: {
      id: string;
      trackingNumber?: string;
      estimatedDelivery: string;
    }
  ): Promise<SendSmsResponse> => {
    const trackingInfo = orderData.trackingNumber 
      ? ` Tracking: ${orderData.trackingNumber}`
      : '';
    
    return smsService.sendSms({
      to: phoneNumber,
      message: `Your order #${orderData.id} is on its way! Expected delivery: ${orderData.estimatedDelivery}.${trackingInfo}`,
      metadata: {
        type: 'delivery_notification',
        orderId: orderData.id,
      },
    });
  },

  /**
   * Send promotional SMS with opt-out
   */
  sendPromotionalSms: async (
    phoneNumbers: string[],
    message: string,
    campaignId?: string
  ): Promise<BulkSmsResponse> => {
    const messageWithOptOut = `${message}\n\nReply STOP to opt out.`;
    
    return smsService.sendBulkSms({
      recipients: phoneNumbers.map(phoneNumber => ({
        phoneNumber,
        message: messageWithOptOut,
      })),
      rateLimitPerSecond: 10, // Throttle promotional messages
      metadata: {
        type: 'promotional',
        campaignId: campaignId || 'default',
      },
    });
  },
}; 