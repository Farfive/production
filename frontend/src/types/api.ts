// Base API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
    nextCursor?: string;
  };
  timestamp: string;
  requestId: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// API Client types
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

export interface RateLimitHeaders {
  'x-ratelimit-limit': string;
  'x-ratelimit-remaining': string;
  'x-ratelimit-reset': string;
  'retry-after'?: string;
}

// Email Service API types
export interface EmailSendRequest {
  to: Array<{
    email: string;
    name?: string;
  }>;
  from: {
    email: string;
    name?: string;
  };
  subject: string;
  content: {
    html?: string;
    text?: string;
  };
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
  tags?: string[];
  metadata?: Record<string, string>;
  sendAt?: string; // ISO timestamp for scheduled sending
}

export interface EmailSendResponse {
  messageId: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  recipients: Array<{
    email: string;
    status: 'accepted' | 'rejected';
    messageId?: string;
    reason?: string;
  }>;
  scheduledAt?: string;
}

export interface EmailDeliveryStatus {
  messageId: string;
  email: string;
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed';
  timestamp: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: {
    html: string;
    text?: string;
  };
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    required: boolean;
    defaultValue?: any;
  }>;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailAnalytics {
  period: {
    from: string;
    to: string;
  };
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    unsubscribed: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    complaintRate: number;
  };
  topLinks?: Array<{
    url: string;
    clicks: number;
  }>;
  devices?: Record<string, number>;
  clients?: Record<string, number>;
}

// Payment Service API types
export interface PaymentIntentCreateRequest {
  amount: number; // cents
  currency: string;
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
  captureMethod?: 'automatic' | 'manual';
  confirmationMethod?: 'automatic' | 'manual';
  setupFutureUsage?: 'on_session' | 'off_session';
  applicationFeeAmount?: number;
  transferData?: {
    destination: string;
    amount?: number;
  };
}

export interface PaymentIntentResponse {
  id: string;
  clientSecret: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  amount: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  charges?: PaymentCharge[];
  nextAction?: {
    type: string;
    redirectToUrl?: string;
    useStripeSdk?: boolean;
  };
  lastPaymentError?: {
    type: string;
    code: string;
    message: string;
  };
  metadata?: Record<string, string>;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'wallet';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
    country: string;
    checks?: {
      cvcCheck: 'pass' | 'fail' | 'unavailable' | 'unchecked';
      addressLine1Check: 'pass' | 'fail' | 'unavailable' | 'unchecked';
      addressPostalCodeCheck: 'pass' | 'fail' | 'unavailable' | 'unchecked';
    };
  };
  bankAccount?: {
    accountHolderType: 'individual' | 'company';
    bankName: string;
    country: string;
    currency: string;
    last4: string;
    routingNumber: string;
  };
  billingDetails?: {
    address?: {
      city?: string;
      country?: string;
      line1?: string;
      line2?: string;
      postalCode?: string;
      state?: string;
    };
    email?: string;
    name?: string;
    phone?: string;
  };
  customerId?: string;
  createdAt: string;
}

export interface PaymentCharge {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  paid: boolean;
  refunded: boolean;
  amountRefunded: number;
  failureCode?: string;
  failureMessage?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface CustomerCreateRequest {
  email: string;
  name?: string;
  phone?: string;
  description?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  metadata?: Record<string, string>;
}

export interface CustomerResponse {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  description?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  paymentMethods: PaymentMethod[];
  defaultPaymentMethodId?: string;
  balance: number;
  currency: string;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface RefundCreateRequest {
  chargeId?: string;
  paymentIntentId?: string;
  amount?: number; // partial refund
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

export interface RefundResponse {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  reason: string;
  receiptNumber?: string;
  chargeId: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionCreateRequest {
  customerId: string;
  planId: string;
  paymentMethodId?: string;
  trialEnd?: string; // ISO timestamp
  metadata?: Record<string, string>;
  prorationBehavior?: 'none' | 'create_prorations' | 'always_invoice';
}

export interface SubscriptionResponse {
  id: string;
  status: 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  customerId: string;
  plan: SubscriptionPlan;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  endedAt?: string;
  latestInvoiceId?: string;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// Storage Service API types
export interface FileUploadRequest {
  file: File;
  folder?: string;
  filename?: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface FileUploadResponse {
  id: string;
  key: string;
  filename: string;
  size: number;
  contentType: string;
  url: string;
  cdnUrl?: string;
  thumbnailUrl?: string;
  folder?: string;
  isPublic: boolean;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  uploadedAt: string;
  expiresAt?: string;
}

export interface FileInfo {
  id: string;
  key: string;
  filename: string;
  size: number;
  contentType: string;
  url: string;
  cdnUrl?: string;
  thumbnailUrl?: string;
  folder?: string;
  isPublic: boolean;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  uploadedAt: string;
  updatedAt: string;
  lastAccessed?: string;
  downloadCount?: number;
  etag: string;
}

export interface FileListRequest {
  folder?: string;
  prefix?: string;
  contentType?: string;
  tags?: Record<string, string>;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'size' | 'uploadedAt' | 'lastAccessed';
  sortOrder?: 'asc' | 'desc';
}

export interface FileListResponse {
  files: FileInfo[];
  total: number;
  hasMore: boolean;
  nextToken?: string;
}

export interface PresignedUploadRequest {
  filename: string;
  contentType: string;
  size: number;
  folder?: string;
  expiresIn?: number; // seconds
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  key: string;
  fields?: Record<string, string>;
  expiresAt: string;
}

export interface FileProcessingRequest {
  key: string;
  operations: Array<{
    type: 'resize' | 'crop' | 'rotate' | 'compress' | 'format' | 'watermark';
    params: Record<string, any>;
  }>;
  outputKey?: string;
  outputFormat?: string;
}

export interface FileProcessingResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  inputKey: string;
  outputKey?: string;
  outputUrl?: string;
  progress?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// SMS Service API types
export interface SmsSendRequest {
  to: string | string[];
  message: string;
  from?: string;
  templateId?: string;
  variables?: Record<string, string>;
  scheduledAt?: string; // ISO timestamp
  metadata?: Record<string, string>;
}

export interface SmsSendResponse {
  id: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  recipients: Array<{
    phoneNumber: string;
    messageId: string;
    status: 'queued' | 'sent' | 'delivered' | 'failed';
    segments: number;
    cost?: number;
  }>;
  totalCost?: number;
  scheduledAt?: string;
  sentAt?: string;
}

export interface SmsDeliveryStatus {
  messageId: string;
  phoneNumber: string;
  status: 'queued' | 'sent' | 'delivered' | 'undelivered' | 'failed';
  errorCode?: string;
  errorMessage?: string;
  segments: number;
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
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface SmsAnalytics {
  period: {
    from: string;
    to: string;
  };
  metrics: {
    sent: number;
    delivered: number;
    failed: number;
    totalCost: number;
  };
  rates: {
    deliveryRate: number;
  };
  byCountry?: Record<string, {
    sent: number;
    delivered: number;
    cost: number;
  }>;
  byCarrier?: Record<string, {
    sent: number;
    delivered: number;
  }>;
}

// Monitoring and Health Check API types
export interface HealthCheckResponse {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  version?: string;
  timestamp: string;
  checks?: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    time?: number;
  }>;
  dependencies?: Array<{
    name: string;
    status: 'available' | 'unavailable' | 'degraded';
    responseTime?: number;
  }>;
}

export interface SystemHealthResponse {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResponse[];
  uptime: number;
  version: string;
  environment: string;
  timestamp: string;
  resources?: {
    memory?: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu?: {
      percentage: number;
    };
    disk?: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

export interface MetricDataPoint {
  timestamp: string;
  value: number;
  tags?: Record<string, string>;
}

export interface MetricsResponse {
  metric: string;
  unit: string;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
  dataPoints: MetricDataPoint[];
  period: {
    from: string;
    to: string;
    interval: string;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  metric: string;
  condition: {
    operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
    threshold: number;
  };
  evaluation: {
    frequency: string; // e.g., "1m", "5m", "1h"
    period: string; // e.g., "5m", "15m", "1h"
  };
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  notifications: Array<{
    type: 'email' | 'sms' | 'webhook' | 'slack';
    target: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface AlertInstance {
  id: string;
  ruleId: string;
  ruleName: string;
  status: 'firing' | 'resolved';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  firedAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  metadata?: Record<string, any>;
}

// Webhook types
export interface WebhookEvent {
  id: string;
  type: string;
  source: 'stripe' | 'sendgrid' | 'twilio' | 'internal';
  data: any;
  timestamp: string;
  apiVersion?: string;
  livemode?: boolean;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: 'enabled' | 'disabled';
  secret?: string;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventId: string;
  attemptNumber: number;
  status: 'pending' | 'succeeded' | 'failed';
  responseStatus?: number;
  responseBody?: string;
  nextRetryAt?: string;
  createdAt: string;
  deliveredAt?: string;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  resource?: string;
  resourceId?: string;
}

export interface ValidationError extends ApiError {
  field: string;
  value?: any;
  constraint: string;
}

export interface RateLimitError extends ApiError {
  retryAfter: number;
  limit: number;
  remaining: number;
  resetTime: number;
}

// Service-specific error codes
export const API_ERROR_CODES = {
  // General
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Email service
  EMAIL_INVALID_RECIPIENT: 'EMAIL_INVALID_RECIPIENT',
  EMAIL_TEMPLATE_NOT_FOUND: 'EMAIL_TEMPLATE_NOT_FOUND',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  EMAIL_QUOTA_EXCEEDED: 'EMAIL_QUOTA_EXCEEDED',

  // Payment service
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  PAYMENT_INSUFFICIENT_FUNDS: 'PAYMENT_INSUFFICIENT_FUNDS',
  PAYMENT_INVALID_CARD: 'PAYMENT_INVALID_CARD',
  PAYMENT_CUSTOMER_NOT_FOUND: 'PAYMENT_CUSTOMER_NOT_FOUND',

  // Storage service
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_PROCESSING_FAILED: 'FILE_PROCESSING_FAILED',

  // SMS service
  SMS_INVALID_NUMBER: 'SMS_INVALID_NUMBER',
  SMS_SEND_FAILED: 'SMS_SEND_FAILED',
  SMS_QUOTA_EXCEEDED: 'SMS_QUOTA_EXCEEDED',
  SMS_OPTED_OUT: 'SMS_OPTED_OUT',
} as const;

// Utility types for API client
export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

export interface RequestOptions extends RequestConfig {
  signal?: AbortSignal;
  onUploadProgress?: (progressEvent: any) => void;
  onDownloadProgress?: (progressEvent: any) => void;
}

export interface RetryOptions {
  attempts: number;
  delay: number;
  backoff: 'fixed' | 'exponential';
  maxDelay?: number;
  retryCondition?: (error: any) => boolean;
}

export interface CacheOptions {
  ttl: number; // seconds
  key?: string;
  tags?: string[];
  revalidate?: boolean;
}

// Service configuration types
export interface ServiceConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retries: RetryOptions;
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
}

export interface EmailServiceConfig extends ServiceConfig {
  provider: 'sendgrid' | 'ses' | 'mailgun';
  fromEmail: string;
  fromName?: string;
}

export interface PaymentServiceConfig extends ServiceConfig {
  provider: 'stripe' | 'paypal' | 'square';
  publishableKey: string;
  webhookSecret?: string;
}

export interface StorageServiceConfig extends ServiceConfig {
  provider: 'aws-s3' | 'gcp-storage' | 'azure-blob';
  bucket: string;
  region?: string;
  cdnUrl?: string;
}

export interface SmsServiceConfig extends ServiceConfig {
  provider: 'twilio' | 'aws-sns' | 'messagebird';
  fromNumber: string;
} 