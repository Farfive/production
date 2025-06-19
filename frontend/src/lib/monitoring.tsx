import React from 'react';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Extend the Window interface to include gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

// Types for monitoring
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  tags?: Record<string, string>;
  context?: Record<string, any>;
}

export interface ErrorContext {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  request?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    params?: Record<string, any>;
    body?: any;
  };
  response?: {
    status: number;
    headers?: Record<string, string>;
    data?: any;
  };
  environment?: {
    userAgent: string;
    url: string;
    timestamp: string;
    sessionId?: string;
  };
  custom?: Record<string, any>;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  lastChecked: string;
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  uptime: number;
  memoryUsage?: number;
  cpuUsage?: number;
  timestamp: string;
}

export interface AlertConfig {
  id: string;
  name: string;
  condition: {
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    threshold: number;
    window: number; // minutes
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: Array<'email' | 'sms' | 'slack' | 'webhook'>;
  enabled: boolean;
}

export interface Alert {
  id: string;
  configId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggeredAt: string;
  resolvedAt?: string;
  status: 'active' | 'resolved' | 'suppressed';
  context: Record<string, any>;
}

// Monitoring configuration
export interface MonitoringConfig {
  sentryDsn: string;
  environment: string;
  release?: string;
  enablePerformanceMonitoring: boolean;
  enableUserFeedback: boolean;
  enableSessionReplay: boolean;
  sampleRate: number;
  tracesSampleRate: number;
  beforeSend?: (event: any) => any;
  integrations?: any[];
}

// Initialize monitoring
export class MonitoringService {
  private config: MonitoringConfig;
  private performanceObserver?: PerformanceObserver;
  private healthCheckInterval?: NodeJS.Timeout;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alerts: Map<string, Alert> = new Map();

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.initializeSentry();
    this.initializePerformanceMonitoring();
    this.startHealthChecks();
  }

  private initializeSentry(): void {
    try {
      Sentry.init({
        dsn: this.config.sentryDsn,
        environment: this.config.environment,
        release: this.config.release,
        
        integrations: [
          new BrowserTracing({
            // Performance monitoring
            tracePropagationTargets: [
              'localhost',
              /^https:\/\/api\.yourcompany\.com/,
              /^https:\/\/yourcompany\.com/,
            ],
          }),
          ...(this.config.integrations || []),
        ],

        // Performance monitoring
        tracesSampleRate: this.config.tracesSampleRate,
        
        // Session replay (optional)
        replaysSessionSampleRate: this.config.enableSessionReplay ? 0.1 : 0,
        replaysOnErrorSampleRate: this.config.enableSessionReplay ? 1.0 : 0,

        // Data scrubbing and filtering
        beforeSend: (event, _hint) => {
          // Apply custom filtering
          if (this.config.beforeSend) {
            event = this.config.beforeSend(event);
          }

          // Filter out non-critical errors in production
          if (this.config.environment === 'production') {
            // Skip network errors that are retryable
            if (event.exception?.values?.[0]?.type === 'NetworkError') {
              return null;
            }

            // Skip cancelled request errors
            if (event.exception?.values?.[0]?.value?.includes('AbortError')) {
              return null;
            }
          }

          // Scrub sensitive data
          if (event.request?.data) {
            event.request.data = this.scrubSensitiveData(event.request.data);
          }

          return event;
        },

        // Set initial user context if available
        initialScope: {
          tags: {
            component: 'frontend',
          },
        },
      });

      console.log('Sentry monitoring initialized');
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  private initializePerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMonitoring) return;

    try {
      // Web Vitals monitoring
      if ('PerformanceObserver' in window) {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordPerformanceMetric({
              name: entry.name,
              value: entry.duration || 0,
              unit: 'ms',
              timestamp: Date.now(),
              tags: {
                type: entry.entryType,
              },
            });
          }
        });

        this.performanceObserver.observe({ 
          entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] 
        });
      }

      // Custom performance tracking
      this.trackPageLoad();
      this.trackUserInteractions();
      this.trackNetworkRequests();
    } catch (error) {
      console.error('Failed to initialize performance monitoring:', error);
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 60000); // Every minute
  }

  private async performHealthChecks(): Promise<SystemHealth> {
    const services: HealthCheckResult[] = [];
    const startTime = Date.now();

    // Check API health
    try {
      const apiStart = Date.now();
      const response = await fetch('/api/health');
      const apiLatency = Date.now() - apiStart;
      
      services.push({
        service: 'api',
        status: response.ok ? 'healthy' : 'unhealthy',
        latency: apiLatency,
        lastChecked: new Date().toISOString(),
      });
    } catch (error) {
      services.push({
        service: 'api',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      });
    }

    // Check external services
    const externalServices = ['email', 'payment', 'storage', 'sms'];
    for (const service of externalServices) {
      try {
        const serviceStart = Date.now();
        const response = await fetch(`/api/health/${service}`);
        const serviceLatency = Date.now() - serviceStart;

        services.push({
          service,
          status: response.ok ? 'healthy' : 'degraded',
          latency: serviceLatency,
          lastChecked: new Date().toISOString(),
        });
      } catch (error) {
        services.push({
          service,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: new Date().toISOString(),
        });
      }
    }

    // Determine overall health
    const unhealthyServices = services.filter(s => s.status === 'unhealthy');
    const degradedServices = services.filter(s => s.status === 'degraded');
    
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyServices.length > 0) {
      overall = 'unhealthy';
    } else if (degradedServices.length > 0) {
      overall = 'degraded';
    }

    const systemHealth: SystemHealth = {
      overall,
      services,
      uptime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    // Check alerts
    this.checkAlerts(systemHealth);

    return systemHealth;
  }

  // Public methods
  public captureException(error: Error, context?: ErrorContext): string {
    return Sentry.captureException(error, {
      tags: context?.custom,
      extra: {
        request: context?.request,
        response: context?.response,
        environment: context?.environment,
      },
      user: context?.user,
    });
  }

  public captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): string {
    return Sentry.captureMessage(message, {
      level: level as any,
      tags: context?.custom,
      extra: {
        request: context?.request,
        response: context?.response,
        environment: context?.environment,
      },
      user: context?.user,
    });
  }

  public setUser(user: { id: string; email?: string; role?: string }): void {
    Sentry.setUser(user);
  }

  public setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  public setContext(key: string, context: Record<string, any>): void {
    Sentry.setContext(key, context);
  }

  public addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: 'info' | 'warning' | 'error';
    data?: Record<string, any>;
  }): void {
    Sentry.addBreadcrumb(breadcrumb);
  }

  public recordPerformanceMetric(metric: PerformanceMetric): void {
    const metricList = this.metrics.get(metric.name) || [];
    metricList.push(metric);
    
    // Keep only last 100 metrics per type
    if (metricList.length > 100) {
      metricList.shift();
    }
    
    this.metrics.set(metric.name, metricList);

    // Send to external monitoring service
    this.sendMetricToExternalService(metric);
  }

  public getPerformanceMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.get(name) || [];
    }
    
    const allMetrics: PerformanceMetric[] = [];
    for (const metricList of this.metrics.values()) {
      allMetrics.push(...metricList);
    }
    
    return allMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  public startTransaction(name: string, op: string = 'navigation'): any {
    return Sentry.startTransaction({ name, op });
  }

  public trackApiCall(url: string, method: string, startTime: number): void {
    const duration = Date.now() - startTime;
    
    this.recordPerformanceMetric({
      name: 'api_call_duration',
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      tags: {
        url,
        method,
      },
    });

    // Add breadcrumb for API calls
    this.addBreadcrumb({
      message: `API ${method} ${url}`,
      category: 'http',
      level: 'info',
      data: {
        url,
        method,
        duration,
      },
    });
  }

  public trackUserAction(action: string, details?: Record<string, any>): void {
    this.addBreadcrumb({
      message: `User action: ${action}`,
      category: 'user',
      level: 'info',
      data: details,
    });

    this.recordPerformanceMetric({
      name: 'user_action',
      value: 1,
      unit: 'count',
      timestamp: Date.now(),
      tags: {
        action,
      },
      context: details,
    });
  }

  public trackPageView(page: string, loadTime?: number): void {
    this.addBreadcrumb({
      message: `Page view: ${page}`,
      category: 'navigation',
      level: 'info',
      data: { page, loadTime },
    });

    if (loadTime) {
      this.recordPerformanceMetric({
        name: 'page_load_time',
        value: loadTime,
        unit: 'ms',
        timestamp: Date.now(),
        tags: {
          page,
        },
      });
    }
  }

  public trackCustomEvent(name: string, properties?: Record<string, any>): void {
    // Send to analytics service
    if (window.gtag) {
      window.gtag('event', name, properties);
    }

    // Add breadcrumb
    this.addBreadcrumb({
      message: `Custom event: ${name}`,
      category: 'custom',
      level: 'info',
      data: properties,
    });
  }

  public showUserFeedbackDialog(): void {
    if (this.config.enableUserFeedback) {
      Sentry.showReportDialog();
    }
  }

  public async getSystemHealth(): Promise<SystemHealth> {
    return this.performHealthChecks();
  }

  public createAlert(config: AlertConfig): void {
    // In a real implementation, this would be stored on the server
    console.log('Alert created:', config);
  }

  public resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();
      this.alerts.set(alertId, alert);
    }
  }

  // Private helper methods
  private trackPageLoad(): void {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.recordPerformanceMetric({
          name: 'page_load_time',
          value: navigation.loadEventEnd - navigation.fetchStart,
          unit: 'ms',
          timestamp: Date.now(),
          tags: {
            page: window.location.pathname,
          },
        });

        this.recordPerformanceMetric({
          name: 'dom_content_loaded',
          value: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          unit: 'ms',
          timestamp: Date.now(),
          tags: {
            page: window.location.pathname,
          },
        });
      }
    });
  }

  private trackUserInteractions(): void {
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const className = target.className;
      const id = target.id;

      this.recordPerformanceMetric({
        name: 'user_interaction',
        value: 1,
        unit: 'count',
        timestamp: Date.now(),
        tags: {
          type: 'click',
          element: tagName,
          className: className || 'none',
          id: id || 'none',
        },
      });
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.recordPerformanceMetric({
        name: 'form_submission',
        value: 1,
        unit: 'count',
        timestamp: Date.now(),
        tags: {
          formId: form.id || 'unknown',
          action: form.action || 'unknown',
        },
      });
    });
  }

  private trackNetworkRequests(): void {
    // Override fetch to track network requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = args[0].toString();
      const method = (args[1]?.method || 'GET').toUpperCase();

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        this.recordPerformanceMetric({
          name: 'network_request',
          value: duration,
          unit: 'ms',
          timestamp: Date.now(),
          tags: {
            url,
            method,
            status: response.status.toString(),
            success: response.ok ? 'true' : 'false',
          },
        });

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.recordPerformanceMetric({
          name: 'network_request',
          value: duration,
          unit: 'ms',
          timestamp: Date.now(),
          tags: {
            url,
            method,
            status: 'error',
            success: 'false',
          },
        });

        throw error;
      }
    };
  }

  private sendMetricToExternalService(metric: PerformanceMetric): void {
    // Send to external monitoring service (e.g., DataDog, New Relic)
    if (window.gtag) {
      window.gtag('event', 'performance_metric', {
        event_category: 'Performance',
        event_label: metric.name,
        value: metric.value,
        custom_map: metric.tags,
      });
    }
  }

  private scrubSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'password',
      'token',
      'apiKey',
      'secret',
      'creditCard',
      'ssn',
      'email', // Sometimes you might want to scrub emails
      'phone',
    ];

    const scrubbed = { ...data };
    
    for (const key of Object.keys(scrubbed)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        scrubbed[key] = '[Redacted]';
      } else if (typeof scrubbed[key] === 'object') {
        scrubbed[key] = this.scrubSensitiveData(scrubbed[key]);
      }
    }

    return scrubbed;
  }

  private checkAlerts(systemHealth: SystemHealth): void {
    // Simple alert checking - in production this would be more sophisticated
    systemHealth.services.forEach(service => {
      if (service.status === 'unhealthy') {
        const alertId = `service_${service.service}_down`;
        if (!this.alerts.has(alertId)) {
          const alert: Alert = {
            id: alertId,
            configId: 'service_health',
            message: `Service ${service.service} is unhealthy: ${service.error}`,
            severity: 'high',
            triggeredAt: new Date().toISOString(),
            status: 'active',
            context: {
              service: service.service,
              error: service.error,
              latency: service.latency,
            },
          };
          
          this.alerts.set(alertId, alert);
          this.sendAlert(alert);
        }
      }
    });
  }

  private sendAlert(alert: Alert): void {
    // Send alert to configured channels
    console.warn('Alert triggered:', alert);
    
    // In production, this would send to email, SMS, Slack, etc.
    if (alert.severity === 'critical' || alert.severity === 'high') {
      this.captureMessage(alert.message, 'error', {
        custom: {
          alertId: alert.id,
          severity: alert.severity,
        },
      });
    }
  }

  public destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Create monitoring service instance
export const monitoringService = new MonitoringService({
  sentryDsn: process.env.REACT_APP_SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  release: process.env.REACT_APP_VERSION,
  enablePerformanceMonitoring: true,
  enableUserFeedback: process.env.NODE_ENV === 'production',
  enableSessionReplay: process.env.NODE_ENV === 'production',
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});

// Error boundary component
export const withErrorBoundary = (Component: React.ComponentType<any>) => {
  return Sentry.withErrorBoundary(Component, {
    fallback: ({ resetError }) => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">Something went wrong</h3>
            <p className="mt-2 text-sm text-gray-500">
              We've been notified about this error and are working to fix it.
            </p>
          </div>
          
          <div className="mt-6">
            <button
              onClick={resetError}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    ),
    beforeCapture: (scope) => {
      scope.setTag('errorBoundary', true);
      scope.setLevel('error');
    }
  });
};

// Utility functions
export const trackUserAction = (action: string, details?: Record<string, any>) => {
  monitoringService.trackUserAction(action, details);
};

export const trackPageView = (page: string, loadTime?: number) => {
  monitoringService.trackPageView(page, loadTime);
};

export const trackApiCall = (url: string, method: string, startTime: number) => {
  monitoringService.trackApiCall(url, method, startTime);
};

export const captureException = (error: Error, context?: ErrorContext) => {
  return monitoringService.captureException(error, context);
};

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) => {
  return monitoringService.captureMessage(message, level, context);
};

// React hook for monitoring
export const useMonitoring = () => {
  return {
    trackUserAction,
    trackPageView,
    captureException,
    captureMessage,
    setUser: monitoringService.setUser.bind(monitoringService),
    setTag: monitoringService.setTag.bind(monitoringService),
    setContext: monitoringService.setContext.bind(monitoringService),
    getPerformanceMetrics: monitoringService.getPerformanceMetrics.bind(monitoringService),
    getSystemHealth: monitoringService.getSystemHealth.bind(monitoringService),
  };
}; 