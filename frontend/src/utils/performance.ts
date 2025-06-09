/**
 * Performance monitoring and optimization utilities
 */
import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';
import * as Sentry from '@sentry/react';
import React from 'react';
// import Perfume from 'perfume.js'; // Commented out - install if needed

// Performance budgets (in milliseconds)
export const PERFORMANCE_BUDGETS = {
  FCP: 1800,  // First Contentful Paint
  LCP: 2500,  // Largest Contentful Paint
  FID: 100,   // First Input Delay
  CLS: 0.1,   // Cumulative Layout Shift
  TTFB: 800,  // Time to First Byte
  API_RESPONSE: 500,
  COMPONENT_RENDER: 16, // 60fps = 16.67ms per frame
};

// Performance metrics storage
interface PerformanceData {
  metrics: Record<string, number>;
  errors: Array<{
    message: string;
    timestamp: number;
    stack?: string;
  }>;
  userAgent: string;
  url: string;
  timestamp: number;
}

class PerformanceMonitor {
  private data: PerformanceData;
  private observers: Map<string, PerformanceObserver> = new Map();
  
  constructor() {
    this.data = {
      metrics: {},
      errors: [],
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now(),
    };
    
    this.initializeWebVitals();
    this.initializePerfume();
    this.initializeCustomMetrics();
  }
  
  private initializeWebVitals() {
    // Track Core Web Vitals
    getCLS(this.handleMetric.bind(this));
    getFID(this.handleMetric.bind(this));
    getFCP(this.handleMetric.bind(this));
    getLCP(this.handleMetric.bind(this));
    getTTFB(this.handleMetric.bind(this));
  }
  
  private initializePerfume() {
    // Initialize Perfume.js for advanced metrics (commented out - install perfume.js if needed)
    // const perfume = new Perfume({
    //   analyticsTracker: (options: any) => {
    //     this.trackCustomMetric(options.metricName, options.data);
    //   },
    //   isProduction: process.env.NODE_ENV === 'production',
    //   maxMeasureTime: 15000,
    // });
  }
  
  private initializeCustomMetrics() {
    // Track resource loading performance
    if ('PerformanceObserver' in window) {
      // Navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.trackNavigationMetrics(navEntry);
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navObserver);
      
      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.trackResourceMetrics(entry as PerformanceResourceTiming);
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);
      
      // Long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.trackLongTask(entry);
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', longTaskObserver);
    }
  }
  
  private handleMetric(metric: Metric) {
    const { name, value } = metric;
    this.data.metrics[name] = value;
    
    // Check against performance budgets
    const budget = PERFORMANCE_BUDGETS[name as keyof typeof PERFORMANCE_BUDGETS];
    if (budget && value > budget) {
      this.reportPerformanceViolation(name, value, budget);
    }
    
    // Send to analytics
    this.sendToAnalytics('web_vital', { name, value });
  }
  
  private trackNavigationMetrics(entry: PerformanceNavigationTiming) {
    const metrics = {
      dns_lookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcp_connection: entry.connectEnd - entry.connectStart,
      ssl_negotiation: entry.connectEnd - entry.secureConnectionStart,
      request_response: entry.responseEnd - entry.requestStart,
      dom_processing: entry.domContentLoadedEventEnd - entry.responseEnd,
      load_complete: entry.loadEventEnd - entry.loadEventStart,
    };
    
    Object.entries(metrics).forEach(([key, value]) => {
      this.data.metrics[key] = value;
    });
  }
  
  private trackResourceMetrics(entry: PerformanceResourceTiming) {
    const resourceType = this.getResourceType(entry.name);
    const loadTime = entry.responseEnd - entry.startTime;
    
    // Track slow resources
    if (loadTime > 1000) { // 1 second threshold
      this.reportSlowResource(entry.name, loadTime, resourceType);
    }
    
    // Aggregate metrics by resource type
    const metricKey = `resource_${resourceType}_avg_load_time`;
    const currentAvg = this.data.metrics[metricKey] || 0;
    const count = this.data.metrics[`resource_${resourceType}_count`] || 0;
    
    this.data.metrics[metricKey] = (currentAvg * count + loadTime) / (count + 1);
    this.data.metrics[`resource_${resourceType}_count`] = count + 1;
  }
  
  private trackLongTask(entry: PerformanceEntry) {
    const duration = entry.duration;
    this.data.metrics.long_task_duration = duration;
    
    // Report long tasks that block the main thread
    if (duration > 50) { // 50ms threshold
      this.reportLongTask(duration);
    }
  }
  
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }
  
  public trackCustomMetric(name: string, value: number) {
    this.data.metrics[name] = value;
    this.sendToAnalytics('custom_metric', { name, value });
  }
  
  public trackComponentRender(componentName: string, renderTime: number) {
    const metricName = `component_${componentName}_render_time`;
    this.data.metrics[metricName] = renderTime;
    
    if (renderTime > PERFORMANCE_BUDGETS.COMPONENT_RENDER) {
      this.reportSlowComponent(componentName, renderTime);
    }
  }
  
  public trackAPICall(endpoint: string, duration: number, status: number) {
    const metricName = `api_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}_duration`;
    this.data.metrics[metricName] = duration;
    
    if (duration > PERFORMANCE_BUDGETS.API_RESPONSE) {
      this.reportSlowAPI(endpoint, duration, status);
    }
    
    this.sendToAnalytics('api_call', {
      endpoint,
      duration,
      status,
    });
  }
  
  public trackError(error: Error, context?: Record<string, any>) {
    const errorData = {
      message: error.message,
      timestamp: Date.now(),
      stack: error.stack,
      context,
    };
    
    this.data.errors.push(errorData);
    
    // Send to Sentry
    Sentry.captureException(error, { extra: context });
    
    // Send to analytics
    this.sendToAnalytics('error', errorData);
  }
  
  private reportPerformanceViolation(metric: string, value: number, budget: number) {
    console.warn(`Performance budget violation: ${metric} = ${value}ms (budget: ${budget}ms)`);
    
    this.sendToAnalytics('performance_violation', {
      metric,
      value,
      budget,
      violation_percentage: ((value - budget) / budget) * 100,
    });
  }
  
  private reportSlowResource(url: string, loadTime: number, type: string) {
    console.warn(`Slow resource detected: ${url} took ${loadTime}ms to load`);
    
    this.sendToAnalytics('slow_resource', {
      url,
      loadTime,
      type,
    });
  }
  
  private reportSlowComponent(componentName: string, renderTime: number) {
    console.warn(`Slow component render: ${componentName} took ${renderTime}ms`);
    
    this.sendToAnalytics('slow_component', {
      componentName,
      renderTime,
    });
  }
  
  private reportSlowAPI(endpoint: string, duration: number, status: number) {
    console.warn(`Slow API call: ${endpoint} took ${duration}ms (status: ${status})`);
    
    this.sendToAnalytics('slow_api', {
      endpoint,
      duration,
      status,
    });
  }
  
  private reportLongTask(duration: number) {
    console.warn(`Long task detected: ${duration}ms`);
    
    this.sendToAnalytics('long_task', {
      duration,
    });
  }
  
  private sendToAnalytics(eventName: string, data: any) {
    // Send to your analytics service
    if ((window as any).gtag) {
      (window as any).gtag('event', eventName, data);
    }
    
    // Send to custom analytics endpoint
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: eventName,
          data,
          timestamp: Date.now(),
          url: window.location.href,
        }),
      }).catch(console.error);
    }
  }
  
  public getPerformanceReport(): PerformanceData {
    return { ...this.data };
  }
  
  public exportPerformanceData(): string {
    return JSON.stringify(this.data, null, 2);
  }
  
  public cleanup() {
    // Clean up observers
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React component performance tracking HOC
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  return function PerformanceTrackedComponent(props: P) {
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name;
    
    React.useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        performanceMonitor.trackComponentRender(name, renderTime);
      };
    });
    
    return React.createElement(WrappedComponent, props);
  };
}

// Performance tracking hook
export function usePerformanceTracking(componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      performanceMonitor.trackComponentRender(componentName, renderTime);
    };
  }, [componentName]);
}

// API call performance tracking
export async function trackAPICall<T>(
  endpoint: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  let status = 200;
  
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    status = error instanceof Error && 'status' in error ? (error as any).status : 500;
    throw error;
  } finally {
    const duration = performance.now() - startTime;
    performanceMonitor.trackAPICall(endpoint, duration, status);
  }
}

// Image loading performance tracking
export function trackImageLoad(src: string, onLoad?: () => void, onError?: () => void) {
  const startTime = performance.now();
  
  const img = new Image();
  
  img.onload = () => {
    const loadTime = performance.now() - startTime;
    performanceMonitor.trackCustomMetric(`image_load_${src.split('/').pop()}`, loadTime);
    onLoad?.();
  };
  
  img.onerror = () => {
    const loadTime = performance.now() - startTime;
    performanceMonitor.trackError(new Error(`Failed to load image: ${src}`), {
      loadTime,
      src,
    });
    onError?.();
  };
  
  img.src = src;
  return img;
}

// Performance budget checker
export function checkPerformanceBudgets(): boolean {
  const report = performanceMonitor.getPerformanceReport();
  let allPassed = true;
  
  Object.entries(PERFORMANCE_BUDGETS).forEach(([metric, budget]) => {
    const value = report.metrics[metric];
    if (value && value > budget) {
      console.warn(`Performance budget failed: ${metric} = ${value} (budget: ${budget})`);
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    performanceMonitor.cleanup();
  });
  
  // Report performance data periodically
  setInterval(() => {
    if (process.env.NODE_ENV === 'production') {
      const report = performanceMonitor.getPerformanceReport();
      console.log('Performance Report:', report);
    }
  }, 30000); // Every 30 seconds
}

// Add measureApiCall function for compatibility with existing code
export async function measureApiCall<T>(
  name: string,
  apiCall: () => Promise<T>
): Promise<T> {
  return trackAPICall(name, apiCall);
} 