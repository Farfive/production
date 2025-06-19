import { ApiClient } from '../api-client';
import * as Sentry from '@sentry/react';

// Types for email service
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

export interface EmailRecipient {
  email: string;
  name?: string;
  substitutions?: Record<string, string>;
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  type: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

export interface SendEmailRequest {
  to: EmailRecipient[];
  from: {
    email: string;
    name?: string;
  };
  replyTo?: {
    email: string;
    name?: string;
  };
  subject: string;
  content: {
    type: 'text/plain' | 'text/html';
    value: string;
  }[];
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  categories?: string[];
  customArgs?: Record<string, string>;
  sendAt?: number; // Unix timestamp for scheduled sending
  batchId?: string;
}

export interface SendEmailResponse {
  messageId: string;
  statusCode: number;
  headers: Record<string, string>;
}

export interface EmailStatus {
  messageId: string;
  status: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'blocked' | 'deferred' | 'dropped';
  timestamp: number;
  reason?: string;
  url?: string; // For click events
}

export interface EmailAnalytics {
  requests: number;
  delivered: number;
  opens: number;
  clicks: number;
  bounces: number;
  blocks: number;
  drops: number;
  spamReports: number;
  unsubscribes: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  versions: {
    id: string;
    active: boolean;
    name: string;
    subject: string;
    htmlContent: string;
    plainContent?: string;
    thumbnailUrl?: string;
    updatedAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface UnsubscribeGroup {
  id: number;
  name: string;
  description: string;
  isDefault: boolean;
}

// Email service class
export class EmailService {
  private apiClient: ApiClient;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.apiClient = new ApiClient({
      baseURL: 'https://api.sendgrid.com',
      timeout: 30000,
      retryAttempts: 3,
      enableLogging: true,
    });
    
    // Set SendGrid API key
    this.apiClient.setAuthToken(apiKey);
  }

  /**
   * Send a single email
   */
  public async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      const payload = this.formatSendGridPayload(request);
      
      const response = await this.apiClient.post('/v3/mail/send', payload);
      
      return {
        messageId: response.headers['x-message-id'] || '',
        statusCode: 202,
        headers: response.headers,
      };
    } catch (error) {
      this.handleEmailError('send_email', error, { recipients: request.to.length });
      throw error;
    }
  }

  /**
   * Send bulk emails using batch processing
   */
  public async sendBulkEmails(requests: SendEmailRequest[]): Promise<SendEmailResponse[]> {
    const batchSize = 1000; // SendGrid's batch limit
    const results: SendEmailResponse[] = [];

    try {
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        const batchPromises = batch.map(request => this.sendEmail(request));
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error(`Failed to send email ${i + index}:`, result.reason);
            Sentry.captureException(result.reason);
          }
        });
      }

      return results;
    } catch (error) {
      this.handleEmailError('send_bulk_emails', error, { total: requests.length });
      throw error;
    }
  }

  /**
   * Send email using template
   */
  public async sendTemplateEmail(
    templateId: string,
    to: EmailRecipient[],
    dynamicData: Record<string, any>,
    options: Partial<SendEmailRequest> = {}
  ): Promise<SendEmailResponse> {
    const request: SendEmailRequest = {
      to,
      from: options.from || { email: 'noreply@yourcompany.com', name: 'Your Company' },
      subject: '', // Will be overridden by template
      content: [{ type: 'text/html', value: '' }], // Will be overridden by template
      templateId,
      dynamicTemplateData: dynamicData,
      ...options,
    };

    return this.sendEmail(request);
  }

  /**
   * Get email delivery status
   */
  public async getEmailStatus(messageId: string): Promise<EmailStatus[]> {
    try {
      const response = await this.apiClient.get(
        `/v3/messages/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.events || [];
    } catch (error) {
      this.handleEmailError('get_email_status', error, { messageId });
      throw error;
    }
  }

  /**
   * Get email analytics
   */
  public async getEmailAnalytics(
    startDate: string,
    endDate: string,
    categories?: string[]
  ): Promise<EmailAnalytics> {
    try {
      const params: any = {
        start_date: startDate,
        end_date: endDate,
        aggregated_by: 'day',
      };

      if (categories && categories.length > 0) {
        params.categories = categories.join(',');
      }

      const response = await this.apiClient.get('/v3/stats', { params });

      // Aggregate stats from all days
      const stats = response.reduce(
        (acc: EmailAnalytics, day: any) => {
          const dayStats = day.stats[0]?.metrics || {};
          return {
            requests: acc.requests + (dayStats.requests || 0),
            delivered: acc.delivered + (dayStats.delivered || 0),
            opens: acc.opens + (dayStats.opens || 0),
            clicks: acc.clicks + (dayStats.unique_clicks || 0),
            bounces: acc.bounces + (dayStats.bounces || 0),
            blocks: acc.blocks + (dayStats.blocks || 0),
            drops: acc.drops + (dayStats.drops || 0),
            spamReports: acc.spamReports + (dayStats.spam_reports || 0),
            unsubscribes: acc.unsubscribes + (dayStats.unsubscribes || 0),
          };
        },
        {
          requests: 0,
          delivered: 0,
          opens: 0,
          clicks: 0,
          bounces: 0,
          blocks: 0,
          drops: 0,
          spamReports: 0,
          unsubscribes: 0,
        }
      );

      return stats;
    } catch (error) {
      this.handleEmailError('get_email_analytics', error, { startDate, endDate });
      throw error;
    }
  }

  /**
   * Get email templates
   */
  public async getTemplates(): Promise<EmailTemplate[]> {
    try {
      const response = await this.apiClient.get('/v3/templates', {
        params: { generations: 'dynamic' },
      });

      return response.templates || [];
    } catch (error) {
      this.handleEmailError('get_templates', error);
      throw error;
    }
  }

  /**
   * Create email template
   */
  public async createTemplate(
    name: string,
    subject: string,
    htmlContent: string,
    plainContent?: string
  ): Promise<EmailTemplate> {
    try {
      const templatePayload = {
        name,
        generation: 'dynamic',
      };

      const template = await this.apiClient.post('/v3/templates', templatePayload);

      // Create version for the template
      const versionPayload = {
        template_id: template.id,
        active: 1,
        name: `${name} - v1`,
        subject,
        html_content: htmlContent,
        plain_content: plainContent || '',
      };

      const version = await this.apiClient.post(
        `/v3/templates/${template.id}/versions`,
        versionPayload
      );

      return {
        id: template.id,
        name: template.name,
        subject,
        content: htmlContent,
        variables: [],
        versions: [version],
        createdAt: template.created_at,
        updatedAt: template.updated_at,
      };
    } catch (error) {
      this.handleEmailError('create_template', error, { name });
      throw error;
    }
  }

  /**
   * Get unsubscribe groups
   */
  public async getUnsubscribeGroups(): Promise<UnsubscribeGroup[]> {
    try {
      const response = await this.apiClient.get('/v3/asm/groups');
      return response;
    } catch (error) {
      this.handleEmailError('get_unsubscribe_groups', error);
      throw error;
    }
  }

  /**
   * Add email to suppression list
   */
  public async addToSuppressionList(
    email: string,
    reason: 'bounce' | 'block' | 'invalid' | 'spam' | 'unsubscribe'
  ): Promise<void> {
    try {
      await this.apiClient.post(`/v3/suppression/${reason}`, {
        emails: [{ email }],
      });
    } catch (error) {
      this.handleEmailError('add_to_suppression_list', error, { email, reason });
      throw error;
    }
  }

  /**
   * Remove email from suppression list
   */
  public async removeFromSuppressionList(
    email: string,
    reason: 'bounce' | 'block' | 'invalid' | 'spam' | 'unsubscribe'
  ): Promise<void> {
    try {
      await this.apiClient.delete(`/v3/suppression/${reason}/${email}`);
    } catch (error) {
      this.handleEmailError('remove_from_suppression_list', error, { email, reason });
      throw error;
    }
  }

  /**
   * Validate email deliverability
   */
  public async validateEmail(email: string): Promise<{
    valid: boolean;
    reason?: string;
    suggestion?: string;
  }> {
    try {
      const response = await this.apiClient.get('/v3/validations/email', {
        params: { email },
      });

      return {
        valid: response.result.verdict === 'Valid',
        reason: response.result.verdict !== 'Valid' ? response.result.verdict : undefined,
        suggestion: response.result.suggestion,
      };
    } catch (error) {
      this.handleEmailError('validate_email', error, { email });
      return { valid: false, reason: 'Validation service unavailable' };
    }
  }

  // Private helper methods
  private formatSendGridPayload(request: SendEmailRequest): any {
    const payload: any = {
      personalizations: request.to.map(recipient => ({
        to: [{ email: recipient.email, name: recipient.name }],
        dynamic_template_data: recipient.substitutions || request.dynamicTemplateData,
      })),
      from: request.from,
      content: request.content,
    };

    if (request.replyTo) {
      payload.reply_to = request.replyTo;
    }

    if (request.subject && !request.templateId) {
      payload.subject = request.subject;
    }

    if (request.templateId) {
      payload.template_id = request.templateId;
    }

    if (request.attachments) {
      payload.attachments = request.attachments;
    }

    if (request.headers) {
      payload.headers = request.headers;
    }

    if (request.categories) {
      payload.categories = request.categories;
    }

    if (request.customArgs) {
      payload.custom_args = request.customArgs;
    }

    if (request.sendAt) {
      payload.send_at = request.sendAt;
    }

    if (request.batchId) {
      payload.batch_id = request.batchId;
    }

    return payload;
  }

  private handleEmailError(operation: string, error: any, context: any = {}): void {
    console.error(`[EmailService] ${operation} failed:`, error);

    Sentry.captureException(error, {
      tags: {
        service: 'email',
        operation,
      },
      extra: {
        context,
        sendgridResponse: error.response?.data,
      },
    });
  }
}

// Predefined email templates for common use cases
export const EMAIL_TEMPLATES = {
  ORDER_CONFIRMATION: 'order_confirmation',
  QUOTE_RECEIVED: 'quote_received',
  QUOTE_ACCEPTED: 'quote_accepted',
  PAYMENT_CONFIRMATION: 'payment_confirmation',
  SHIPPING_NOTIFICATION: 'shipping_notification',
  ORDER_DELIVERED: 'order_delivered',
  PASSWORD_RESET: 'password_reset',
  ACCOUNT_VERIFICATION: 'account_verification',
  WELCOME: 'welcome',
  INVOICE: 'invoice',
  QUOTE_REMINDER: 'quote_reminder',
  ORDER_UPDATE: 'order_update',
  MANUFACTURER_INVITATION: 'manufacturer_invitation',
  TEAM_INVITATION: 'team_invitation',
} as const;

// Email service instance
export const emailService = new EmailService(
  process.env.REACT_APP_SENDGRID_API_KEY || ''
);

// Helper functions for common email operations
export const emailHelpers = {
  /**
   * Send order confirmation email
   */
  sendOrderConfirmation: async (
    userEmail: string,
    userName: string,
    orderData: any
  ): Promise<SendEmailResponse> => {
    return emailService.sendTemplateEmail(
      EMAIL_TEMPLATES.ORDER_CONFIRMATION,
      [{ email: userEmail, name: userName }],
      {
        user_name: userName,
        order_id: orderData.id,
        order_total: orderData.total,
        order_items: orderData.items,
        delivery_address: orderData.deliveryAddress,
        estimated_delivery: orderData.estimatedDelivery,
      }
    );
  },

  /**
   * Send quote received notification
   */
  sendQuoteReceived: async (
    userEmail: string,
    userName: string,
    quoteData: any
  ): Promise<SendEmailResponse> => {
    return emailService.sendTemplateEmail(
      EMAIL_TEMPLATES.QUOTE_RECEIVED,
      [{ email: userEmail, name: userName }],
      {
        user_name: userName,
        quote_id: quoteData.id,
        manufacturer_name: quoteData.manufacturerName,
        quote_amount: quoteData.amount,
        delivery_time: quoteData.deliveryTime,
        quote_url: `${window.location.origin}/quotes/${quoteData.id}`,
      }
    );
  },

  /**
   * Send password reset email
   */
  sendPasswordReset: async (
    userEmail: string,
    resetToken: string
  ): Promise<SendEmailResponse> => {
    return emailService.sendTemplateEmail(
      EMAIL_TEMPLATES.PASSWORD_RESET,
      [{ email: userEmail }],
      {
        reset_url: `${window.location.origin}/reset-password?token=${resetToken}`,
        expiry_time: '1 hour',
      }
    );
  },

  /**
   * Send team invitation email
   */
  sendTeamInvitation: async (
    inviteeEmail: string,
    inviterName: string,
    teamName: string,
    invitationToken: string
  ): Promise<SendEmailResponse> => {
    return emailService.sendTemplateEmail(
      EMAIL_TEMPLATES.TEAM_INVITATION,
      [{ email: inviteeEmail }],
      {
        inviter_name: inviterName,
        team_name: teamName,
        invitation_url: `${window.location.origin}/accept-invitation?token=${invitationToken}`,
        expiry_time: '7 days',
      }
    );
  },
}; 