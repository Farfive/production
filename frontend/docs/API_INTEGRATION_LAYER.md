# API Integration Layer Documentation

## Overview

The API Integration Layer provides a robust, production-ready foundation for handling external service integrations, API client architecture, error handling, and monitoring for the manufacturing platform. This layer ensures reliable communication with various services while providing comprehensive observability and resilience features.

## Architecture

### Core Components

1. **ApiClient** - Central HTTP client with retry logic, circuit breaker, and monitoring
2. **Service Integrations** - Dedicated clients for external services (Email, Payment, Storage, SMS)
3. **Monitoring Service** - Comprehensive error tracking and performance monitoring
4. **Health Check Service** - System health monitoring and alerting
5. **Error Handling** - Centralized error management with graceful degradation

## Core API Client

### Features

- **Retry Logic with Exponential Backoff**
- **Circuit Breaker Pattern**
- **Request/Response Logging**
- **Rate Limit Handling**
- **Authentication Token Management**
- **Performance Metrics**
- **Error Context Capture**

### Usage

```typescript
import { apiClient } from './lib/api-client';

// Basic usage
const data = await apiClient.get('/api/users');
const result = await apiClient.post('/api/orders', orderData);

// With custom configuration
const customClient = new ApiClient({
  baseURL: 'https://api.example.com',
  retryAttempts: 5,
  retryDelay: 2000,
  circuitBreakerThreshold: 3,
  timeout: 60000,
});

// Authentication
apiClient.setAuthToken('your-jwt-token');

// Health check
const isHealthy = apiClient.isHealthy();
const metrics = apiClient.getMetrics();
```

### Configuration Options

```typescript
interface ApiClientConfig {
  baseURL: string;
  timeout?: number; // Default: 30000ms
  retryAttempts?: number; // Default: 3
  retryDelay?: number; // Default: 1000ms
  circuitBreakerThreshold?: number; // Default: 5
  circuitBreakerTimeout?: number; // Default: 60000ms
  enableLogging?: boolean; // Default: true
  enableMetrics?: boolean; // Default: true
}
```

### Error Handling

The API client converts all errors to structured `ApiError` objects:

```typescript
try {
  await apiClient.post('/api/orders', data);
} catch (error) {
  if (error instanceof ApiError) {
    console.log(`Error ${error.code}: ${error.message}`);
    console.log(`Status: ${error.status}`);
    console.log(`Retryable: ${error.retryable}`);
  }
}
```

### Circuit Breaker

The circuit breaker prevents cascading failures by monitoring error rates:

- **CLOSED**: Normal operation
- **OPEN**: Failing fast, service unavailable
- **HALF_OPEN**: Testing if service recovered

```typescript
const state = apiClient.getCircuitBreakerState();
console.log(`Circuit breaker state: ${state.state}`);
console.log(`Failures: ${state.failures}/${state.threshold}`);
```

## External Service Integrations

### Email Service (SendGrid)

Comprehensive email automation with templates, analytics, and delivery tracking.

```typescript
import { emailService, emailHelpers } from './lib/services/email.service';

// Send single email
const response = await emailService.sendEmail({
  to: [{ email: 'user@example.com', name: 'John Doe' }],
  from: { email: 'noreply@company.com', name: 'Company' },
  subject: 'Welcome!',
  content: [{ type: 'text/html', value: '<h1>Welcome!</h1>' }],
});

// Send template email
await emailService.sendTemplateEmail(
  'welcome_template',
  [{ email: 'user@example.com' }],
  { username: 'John', companyName: 'Acme Corp' }
);

// Helper functions
await emailHelpers.sendOrderConfirmation(
  'user@example.com',
  'John Doe',
  orderData
);
```

#### Features

- Template management
- Bulk email sending
- Delivery status tracking
- Analytics and reporting
- Suppression list management
- Email validation

### Payment Service (Stripe)

Secure payment processing with support for subscriptions, marketplace payments, and compliance.

```typescript
import { paymentService, paymentHelpers } from './lib/services/payment.service';

// Create payment intent
const paymentIntent = await paymentService.createPaymentIntent({
  amount: 2000, // $20.00 in cents
  currency: 'usd',
  orderId: 'order_123',
  customerId: 'cust_123',
});

// Process marketplace payment
await paymentHelpers.processMarketplacePayment(
  'order_123',
  5000, // $50.00
  'manufacturer_stripe_account_id',
  2.9 // 2.9% platform fee
);

// Customer management
const customer = await paymentService.createCustomer(
  'user@example.com',
  'John Doe'
);

// Subscription handling
const subscription = await paymentService.createSubscription(
  'cust_123',
  'plan_premium',
  'pm_123'
);
```

#### Features

- Payment intent management
- Customer and payment method storage
- Subscription billing
- Marketplace payments with platform fees
- Refund processing
- Payment analytics
- Webhook handling

### Storage Service (Multi-Provider)

Flexible file storage with support for AWS S3, CloudFlare R2, and other providers.

```typescript
import { storageService, storageHelpers } from './lib/services/storage.service';

// Upload file
const uploadResult = await storageService.uploadFile({
  file: selectedFile,
  options: {
    folder: 'products',
    isPublic: true,
    metadata: { productId: '123' },
  },
});

// Batch upload
const files = await storageService.uploadFiles([
  { file: file1, options: { folder: 'images' } },
  { file: file2, options: { folder: 'documents' } },
]);

// Image processing
const processed = await storageService.processImage(
  'original-image-key',
  {
    width: 800,
    height: 600,
    quality: 85,
    format: 'webp',
  }
);

// Helper functions
await storageHelpers.uploadProductImages(imageFiles, 'product_123');
```

#### Features

- Multi-provider support (AWS S3, CloudFlare R2, etc.)
- File validation and security
- Image and video processing
- CDN integration
- Metadata and tagging
- Search capabilities
- Usage analytics

### SMS Service (Multi-Provider)

Reliable SMS delivery with templates, analytics, and compliance features.

```typescript
import { smsService, smsHelpers } from './lib/services/sms.service';

// Send single SMS
const response = await smsService.sendSms({
  to: '+1234567890',
  message: 'Your order has been confirmed!',
  metadata: { orderId: '123' },
});

// Bulk SMS
await smsService.sendBulkSms({
  recipients: [
    { phoneNumber: '+1234567890', message: 'Custom message 1' },
    { phoneNumber: '+0987654321', message: 'Custom message 2' },
  ],
  batchSize: 100,
});

// Template SMS
await smsService.sendTemplateSms(
  'order_confirmation',
  [{ phoneNumber: '+1234567890' }],
  { orderNumber: 'ORD-123', total: '$50.00' }
);

// Helper functions
await smsHelpers.sendVerificationCode('+1234567890', '123456');
```

#### Features

- Multi-provider support (Twilio, AWS SNS, etc.)
- Template management
- Bulk sending with rate limiting
- Delivery tracking
- Opt-out management
- Analytics and reporting
- Cost estimation

## Monitoring and Error Handling

### Sentry Integration

Comprehensive error tracking and performance monitoring with Sentry.

```typescript
import { monitoringService, withErrorBoundary } from './lib/monitoring';

// Manual error capture
monitoringService.captureException(error, {
  user: { id: 'user123', email: 'user@example.com' },
  request: { url: '/api/orders', method: 'POST' },
  custom: { orderId: '123' },
});

// Performance tracking
monitoringService.trackApiCall('/api/orders', 'POST', startTime);
monitoringService.trackUserAction('order_created', { orderId: '123' });

// Error boundary for React components
const SafeComponent = withErrorBoundary(MyComponent);
```

#### Features

- Automatic error capture
- Performance monitoring
- User session tracking
- Custom metrics
- Alert management
- Integration with external monitoring tools

### Health Check System

Continuous monitoring of all services with alerting and degradation detection.

```typescript
import { healthCheckService, useHealthCheck } from './lib/health-checks';

// Start health monitoring
healthCheckService.start();

// Get current health
const health = await healthCheckService.getCurrentHealth();

// React hook for components
const { healthSummary, loading } = useHealthCheck();

// Add custom service check
healthCheckService.addServiceCheck('custom-service', {
  name: 'Custom Service',
  url: '/api/custom/health',
  method: 'GET',
  timeout: 5000,
  expectedStatus: [200],
}, true); // critical service
```

#### Features

- Automated health checks for all services
- Configurable check intervals and thresholds
- Alert triggers for failures
- Service availability metrics
- Historical health data
- Graceful degradation strategies

## Testing

### API Client Tests

Comprehensive test suite covering all functionality:

```bash
npm test src/lib/__tests__/api-client.test.ts
```

Test coverage includes:
- Request/response handling
- Retry logic with exponential backoff
- Circuit breaker functionality
- Rate limiting
- Error handling
- Authentication
- Concurrent requests
- Request cancellation

### Service Integration Tests

```typescript
// Example test structure
describe('EmailService', () => {
  it('should send email successfully', async () => {
    const mockResponse = { messageId: 'test-id', status: 'sent' };
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    const result = await emailService.sendEmail(emailRequest);
    
    expect(result).toEqual(mockResponse);
    expect(mockApiClient.post).toHaveBeenCalledWith('/email/send', emailRequest);
  });
  
  it('should handle email send failures', async () => {
    mockApiClient.post.mockRejectedValue(new Error('Send failed'));
    
    await expect(emailService.sendEmail(emailRequest)).rejects.toThrow('Send failed');
  });
});
```

## Environment Configuration

### Required Environment Variables

```env
# API Configuration
REACT_APP_API_BASE_URL=https://api.yourcompany.com
REACT_APP_API_TIMEOUT=30000

# Sentry Monitoring
REACT_APP_SENTRY_DSN=https://your-sentry-dsn
REACT_APP_VERSION=1.0.0

# SendGrid Email
REACT_APP_SENDGRID_API_KEY=your-sendgrid-key

# Stripe Payment
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key

# Storage Configuration
REACT_APP_STORAGE_PROVIDER=aws-s3
REACT_APP_STORAGE_BUCKET=your-bucket
REACT_APP_STORAGE_REGION=us-east-1
REACT_APP_CDN_URL=https://cdn.yourcompany.com

# SMS Configuration
REACT_APP_SMS_PROVIDER=twilio
REACT_APP_SMS_FROM_NUMBER=+1234567890

# Health Check Configuration
REACT_APP_HEALTH_CHECK_INTERVAL=60000
REACT_APP_HEALTH_CHECK_TIMEOUT=30000
```

## Security Considerations

### Data Protection

1. **Sensitive Data Scrubbing**: Automatically removes sensitive information from logs
2. **Token Security**: Secure storage and management of authentication tokens
3. **Request Validation**: Input validation on all API requests
4. **HTTPS Enforcement**: All communications over encrypted connections

### Access Control

```typescript
// Role-based access control
apiClient.setAuthToken(userToken);

// Request context includes user information
const context = {
  user: { id: 'user123', role: 'admin' },
  permissions: ['read:orders', 'write:orders'],
};
```

### Error Information

Sensitive data is automatically scrubbed from error reports:

```typescript
// Automatically scrubbed fields
const sensitiveFields = [
  'password', 'token', 'apiKey', 'secret', 
  'creditCard', 'ssn', 'phone'
];
```

## Performance Optimization

### Caching Strategy

```typescript
// Response caching for GET requests
const cachedData = await apiClient.get('/api/static-data', {
  cache: { ttl: 300 } // 5 minutes
});
```

### Request Optimization

- Connection pooling for HTTP requests
- Request deduplication for identical concurrent requests
- Compression for large payloads
- Efficient pagination handling

### Monitoring Metrics

Key performance indicators tracked:

- Request latency (p50, p95, p99)
- Error rates by service
- Circuit breaker state changes
- Rate limit usage
- Service availability

## Deployment Considerations

### Production Checklist

1. **Environment Variables**: All required variables configured
2. **Monitoring**: Sentry DSN configured and tested
3. **Health Checks**: All services responding correctly
4. **Rate Limits**: Appropriate limits configured for each service
5. **Error Handling**: Graceful degradation tested
6. **Security**: All tokens secured and rotated regularly

### Scaling Recommendations

1. **Connection Limits**: Configure appropriate connection pools
2. **Circuit Breaker Tuning**: Adjust thresholds based on traffic patterns
3. **Health Check Intervals**: Balance between responsiveness and load
4. **Monitoring Overhead**: Optimize sampling rates for production

## Best Practices

### Error Handling

```typescript
// Always provide context
try {
  await apiClient.post('/api/orders', data);
} catch (error) {
  monitoringService.captureException(error, {
    user: getCurrentUser(),
    request: { data, endpoint: '/api/orders' },
    custom: { featureFlag: 'new_checkout' },
  });
  
  // Provide user-friendly error message
  showNotification('Order failed. Please try again.', 'error');
}
```

### Service Integration

```typescript
// Use helper functions for common operations
await emailHelpers.sendOrderConfirmation(email, name, orderData);

// Implement graceful degradation
try {
  await smsService.sendSms(smsData);
} catch (error) {
  // SMS failed, try email as fallback
  await emailService.sendEmail(emailData);
}
```

### Monitoring

```typescript
// Track business metrics alongside technical metrics
monitoringService.trackUserAction('order_completed', {
  orderId,
  revenue: order.total,
  paymentMethod: order.paymentMethod,
});
```

## Troubleshooting

### Common Issues

1. **Circuit Breaker Open**: Check service health, adjust thresholds if needed
2. **Rate Limiting**: Implement exponential backoff, check API quotas
3. **Authentication Failures**: Verify token validity and refresh logic
4. **Network Timeouts**: Adjust timeout values, check network connectivity

### Debug Tools

```typescript
// Enable detailed logging
const debugClient = new ApiClient({
  baseURL: 'https://api.example.com',
  enableLogging: true,
  enableMetrics: true,
});

// Monitor circuit breaker state
console.log(apiClient.getCircuitBreakerState());

// Check metrics
console.log(apiClient.getMetrics());

// Health check status
const health = await healthCheckService.getCurrentHealth();
```

## Future Enhancements

### Planned Features

1. **GraphQL Support**: Add GraphQL client capabilities
2. **Real-time Updates**: WebSocket integration for live data
3. **Advanced Caching**: Redis-based distributed caching
4. **Request Queuing**: Offline request queuing and replay
5. **API Versioning**: Support for multiple API versions
6. **Advanced Analytics**: Machine learning-based anomaly detection

### Migration Path

The API integration layer is designed to be incrementally adoptable:

1. Start with core `ApiClient` for basic HTTP requests
2. Add specific service integrations as needed
3. Implement monitoring and health checks
4. Add advanced features like circuit breakers and caching

This architecture ensures your application can scale reliably while maintaining excellent observability and user experience. 