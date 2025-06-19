import { useEffect, useState, useCallback } from 'react';
import { features } from '../config/environment';

interface PerformanceMetrics {
  pageLoadTime: number;
  renderTime: number;
  componentMountTime: number;
  apiResponseTimes: Record<string, number[]>;
  memoryUsage: number;
  networkQuality: 'fast' | 'slow' | 'offline';
  bundleSize: number;
}

interface PerformanceEntry {
  name: string;
  duration: number;
  timestamp: number;
  type: 'navigation' | 'api' | 'component' | 'user-interaction';
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private entries: PerformanceEntry[] = [];
  private observer: PerformanceObserver | null = null;

  constructor() {
    this.metrics = {
      pageLoadTime: 0,
      renderTime: 0,
      componentMountTime: 0,
      apiResponseTimes: {},
      memoryUsage: 0,
      networkQuality: 'fast',
      bundleSize: 0,
    };

    if (features.performanceMonitoring) {
      this.initializeMonitoring();
    }
  }

  private initializeMonitoring() {
    this.measurePageLoad();
    this.measureNetworkQuality();
    this.measureMemoryUsage();
    
    if ('PerformanceObserver' in window) {
      this.setupPerformanceObserver();
    }

    this.measureBundleSize();
  }

  private measurePageLoad() {
    if ('performance' in window && 'timing' in performance) {
      const timing = performance.timing as any;
      this.metrics.pageLoadTime = timing.loadEventEnd - timing.navigationStart;
      
      if (features.apiLogging) {
        console.log(`Page load time: ${this.metrics.pageLoadTime}ms`);
      }
    }
  }

  private measureNetworkQuality() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        this.metrics.networkQuality = effectiveType === '4g' ? 'fast' : 
                                     effectiveType === '3g' ? 'slow' : 'offline';
      }
    }
    this.measureNetworkSpeed();
  }

  private async measureNetworkSpeed() {
    try {
      const startTime = performance.now();
      await fetch('/favicon.ico', { method: 'HEAD' });
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      if (responseTime < 100) {
        this.metrics.networkQuality = 'fast';
      } else if (responseTime < 300) {
        this.metrics.networkQuality = 'slow';
      } else {
        this.metrics.networkQuality = 'offline';
      }
    } catch {
      this.metrics.networkQuality = 'offline';
    }
  }

  private measureMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize;
    }
  }

  private measureBundleSize() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      let totalSize = 0;
      
      resources.forEach((resource) => {
        if (resource.name.includes('.js') || resource.name.includes('.css')) {
          totalSize += resource.transferSize || 0;
        }
      });
      
      this.metrics.bundleSize = totalSize;
    }
  }

  private setupPerformanceObserver() {
    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.addEntry({
            name: entry.name,
            duration: entry.duration,
            timestamp: entry.startTime,
            type: this.getEntryType(entry.entryType),
            metadata: {
              entryType: entry.entryType,
              size: (entry as any).transferSize,
            },
          });
        });
      });

      this.observer.observe({ entryTypes: ['navigation', 'measure', 'resource'] });
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  private getEntryType(entryType: string): PerformanceEntry['type'] {
    switch (entryType) {
      case 'navigation': return 'navigation';
      case 'resource': return 'api';
      case 'measure': return 'component';
      default: return 'user-interaction';
    }
  }

  public measureComponentMount(componentName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.metrics.componentMountTime = duration;
      this.addEntry({
        name: `Component:${componentName}`,
        duration,
        timestamp: startTime,
        type: 'component',
        metadata: { componentName },
      });
    };
  }

  public measureApiCall(endpoint: string, startTime: number): void {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (!this.metrics.apiResponseTimes[endpoint]) {
      this.metrics.apiResponseTimes[endpoint] = [];
    }
    
    this.metrics.apiResponseTimes[endpoint].push(duration);
    
    this.addEntry({
      name: `API:${endpoint}`,
      duration,
      timestamp: startTime,
      type: 'api',
      metadata: { endpoint },
    });

    if (duration > 1000 && features.apiLogging) {
      console.warn(`Slow API call detected: ${endpoint} took ${duration}ms`);
    }
  }

  public measureUserInteraction(action: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.addEntry({
        name: `Interaction:${action}`,
        duration,
        timestamp: startTime,
        type: 'user-interaction',
        metadata: { action },
      });
    };
  }

  private addEntry(entry: PerformanceEntry) {
    this.entries.push(entry);
    
    if (this.entries.length > 100) {
      this.entries = this.entries.slice(-100);
    }
  }

  public getMetrics(): PerformanceMetrics {
    this.measureMemoryUsage();
    return { ...this.metrics };
  }

  public getEntries(): PerformanceEntry[] {
    return [...this.entries];
  }

  public getAverageApiResponseTime(endpoint?: string): number {
    if (endpoint) {
      const times = this.metrics.apiResponseTimes[endpoint] || [];
      return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    }
    
    const allTimes = Object.values(this.metrics.apiResponseTimes).flat();
    return allTimes.length > 0 ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length : 0;
  }

  public getPerformanceScore(): number {
    let score = 100;
    
    if (this.metrics.pageLoadTime > 3000) score -= 20;
    else if (this.metrics.pageLoadTime > 2000) score -= 10;
    
    const avgApiTime = this.getAverageApiResponseTime();
    if (avgApiTime > 1000) score -= 20;
    else if (avgApiTime > 500) score -= 10;
    
    if (this.metrics.memoryUsage > 50 * 1024 * 1024) score -= 15;
    
    if (this.metrics.networkQuality === 'slow') score -= 10;
    else if (this.metrics.networkQuality === 'offline') score -= 30;
    
    if (this.metrics.bundleSize > 2 * 1024 * 1024) score -= 15;
    
    return Math.max(0, score);
  }

  public generateReport(): string {
    const metrics = this.getMetrics();
    const score = this.getPerformanceScore();
    
    return `
Performance Report
==================
Score: ${score}/100

Page Load: ${metrics.pageLoadTime}ms
Average API Response: ${this.getAverageApiResponseTime().toFixed(2)}ms
Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
Bundle Size: ${(metrics.bundleSize / 1024).toFixed(2)}KB
Network Quality: ${metrics.networkQuality}

Recent Entries: ${this.entries.length}
    `.trim();
  }

  public disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

let performanceMonitor: PerformanceMonitor | null = null;

export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    if (!features.performanceMonitoring) return;

    if (!performanceMonitor) {
      performanceMonitor = new PerformanceMonitor();
    }

    const interval = setInterval(() => {
      if (performanceMonitor) {
        setMetrics(performanceMonitor.getMetrics());
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const measureComponentMount = useCallback((componentName: string) => {
    if (!performanceMonitor) return () => {};
    return performanceMonitor.measureComponentMount(componentName);
  }, []);

  const measureApiCall = useCallback((endpoint: string, startTime: number) => {
    if (!performanceMonitor) return;
    performanceMonitor.measureApiCall(endpoint, startTime);
  }, []);

  const measureUserInteraction = useCallback((action: string) => {
    if (!performanceMonitor) return () => {};
    return performanceMonitor.measureUserInteraction(action);
  }, []);

  const getPerformanceData = useCallback(() => {
    if (!performanceMonitor) return null;
    return {
      metrics: performanceMonitor.getMetrics(),
      entries: performanceMonitor.getEntries(),
      score: performanceMonitor.getPerformanceScore(),
      report: performanceMonitor.generateReport(),
    };
  }, []);

  return {
    metrics,
    measureComponentMount,
    measureApiCall,
    measureUserInteraction,
    getPerformanceData,
    isEnabled: features.performanceMonitoring,
  };
};

export const useComponentPerformance = (componentName: string) => {
  const { measureComponentMount } = usePerformanceMonitoring();
  
  useEffect(() => {
    const endMeasurement = measureComponentMount(componentName);
    return endMeasurement;
  }, [componentName, measureComponentMount]);
};

export default usePerformanceMonitoring; 