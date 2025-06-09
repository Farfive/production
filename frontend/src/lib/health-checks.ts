import React from 'react';
import { ApiClient } from './api-client';

// Types for health checks
export interface ServiceHealthCheck {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  timeout: number;
  expectedStatus: number[];
  headers?: Record<string, string>;
  body?: any;
  validator?: (response: any) => boolean;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ServiceDependency {
  service: string;
  critical: boolean;
  healthCheck: ServiceHealthCheck;
}

export interface SystemHealthSummary {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  uptime: number;
  version: string;
  timestamp: string;
  environment: string;
}

export interface HealthCheckConfig {
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retries: number;
  notificationThreshold: number; // consecutive failures before alerting
  services: ServiceDependency[];
}

// Default health check configurations
const DEFAULT_HEALTH_CHECKS: Record<string, ServiceHealthCheck> = {
  api: {
    name: 'Main API',
    url: '/api/health',
    method: 'GET',
    timeout: 5000,
    expectedStatus: [200],
  },
  
  database: {
    name: 'Database',
    url: '/api/health/database',
    method: 'GET',
    timeout: 10000,
    expectedStatus: [200],
    validator: (response) => response.status === 'connected',
  },
  
  email: {
    name: 'Email Service',
    url: '/api/health/email',
    method: 'GET',
    timeout: 15000,
    expectedStatus: [200, 202],
    validator: (response) => response.provider === 'sendgrid' && response.status === 'operational',
  },
  
  payment: {
    name: 'Payment Service',
    url: '/api/health/payment',
    method: 'GET',
    timeout: 10000,
    expectedStatus: [200],
    validator: (response) => response.stripe?.status === 'operational',
  },
  
  storage: {
    name: 'Storage Service',
    url: '/api/health/storage',
    method: 'GET',
    timeout: 10000,
    expectedStatus: [200],
    validator: (response) => response.provider && response.status === 'operational',
  },
  
  sms: {
    name: 'SMS Service',
    url: '/api/health/sms',
    method: 'GET',
    timeout: 10000,
    expectedStatus: [200, 202],
    validator: (response) => response.provider && response.status === 'operational',
  },
  
  cache: {
    name: 'Cache Service',
    url: '/api/health/cache',
    method: 'GET',
    timeout: 5000,
    expectedStatus: [200],
    validator: (response) => response.redis?.status === 'connected',
  },
  
  websocket: {
    name: 'WebSocket Service',
    url: '/api/health/websocket',
    method: 'GET',
    timeout: 5000,
    expectedStatus: [200],
    validator: (response) => response.connections !== undefined,
  },
};

// Health check service
export class HealthCheckService {
  private apiClient: ApiClient;
  private config: HealthCheckConfig;
  private interval?: NodeJS.Timeout;
  private results: Map<string, HealthCheckResult[]> = new Map();
  private listeners: Array<(summary: SystemHealthSummary) => void> = [];
  private consecutiveFailures: Map<string, number> = new Map();
  private startTime: number = Date.now();

  constructor(config?: Partial<HealthCheckConfig>) {
    this.config = {
      interval: 60000, // 1 minute
      timeout: 30000, // 30 seconds
      retries: 3,
      notificationThreshold: 3,
      services: [
        { service: 'api', critical: true, healthCheck: DEFAULT_HEALTH_CHECKS.api },
        { service: 'database', critical: true, healthCheck: DEFAULT_HEALTH_CHECKS.database },
        { service: 'email', critical: false, healthCheck: DEFAULT_HEALTH_CHECKS.email },
        { service: 'payment', critical: true, healthCheck: DEFAULT_HEALTH_CHECKS.payment },
        { service: 'storage', critical: false, healthCheck: DEFAULT_HEALTH_CHECKS.storage },
        { service: 'sms', critical: false, healthCheck: DEFAULT_HEALTH_CHECKS.sms },
        { service: 'cache', critical: false, healthCheck: DEFAULT_HEALTH_CHECKS.cache },
        { service: 'websocket', critical: false, healthCheck: DEFAULT_HEALTH_CHECKS.websocket },
      ],
      ...config,
    };

    this.apiClient = new ApiClient({
      baseURL: process.env.REACT_APP_API_BASE_URL || '',
      timeout: this.config.timeout,
      retryAttempts: this.config.retries,
      enableLogging: true,
    });
  }

  /**
   * Start continuous health checking
   */
  public start(): void {
    if (this.interval) {
      this.stop();
    }

    // Immediate check
    this.performHealthCheck();

    // Set up interval
    this.interval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.interval);

    console.log(`Health check service started with ${this.config.interval}ms interval`);
  }

  /**
   * Stop health checking
   */
  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    console.log('Health check service stopped');
  }

  /**
   * Perform health check for all services
   */
  public async performHealthCheck(): Promise<SystemHealthSummary> {
    const timestamp = new Date().toISOString();
    const results: HealthCheckResult[] = [];

    // Check all services in parallel
    const checkPromises = this.config.services.map(async (serviceDep) => {
      try {
        const result = await this.checkService(serviceDep.healthCheck);
        this.updateConsecutiveFailures(serviceDep.service, result.status !== 'healthy');
        this.storeResult(serviceDep.service, result);
        return result;
      } catch (error) {
        const failureResult: HealthCheckResult = {
          service: serviceDep.service,
          status: 'unhealthy',
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp,
        };
        
        this.updateConsecutiveFailures(serviceDep.service, true);
        this.storeResult(serviceDep.service, failureResult);
        return failureResult;
      }
    });

    const settledResults = await Promise.allSettled(checkPromises);
    
    settledResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        const serviceName = this.config.services[index].service;
        results.push({
          service: serviceName,
          status: 'unhealthy',
          responseTime: 0,
          error: result.reason?.message || 'Health check failed',
          timestamp,
        });
      }
    });

    // Determine overall system health
    const overall = this.calculateOverallHealth(results);
    
    const summary: SystemHealthSummary = {
      overall,
      services: results,
      uptime: Date.now() - this.startTime,
      version: process.env.REACT_APP_VERSION || '1.0.0',
      timestamp,
      environment: process.env.NODE_ENV || 'development',
    };

    // Notify listeners
    this.notifyListeners(summary);

    // Check for alert conditions
    this.checkAlertConditions(results);

    return summary;
  }

  /**
   * Check a single service
   */
  public async checkService(healthCheck: ServiceHealthCheck): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const response = await this.apiClient.request({
        url: healthCheck.url,
        method: healthCheck.method,
        timeout: healthCheck.timeout,
        headers: healthCheck.headers,
        data: healthCheck.body,
      });

      const responseTime = Date.now() - startTime;
      const isExpectedStatus = healthCheck.expectedStatus.includes(response.status);
      const isValidResponse = healthCheck.validator ? healthCheck.validator(response.data) : true;

      const status: HealthCheckResult['status'] = 
        isExpectedStatus && isValidResponse ? 'healthy' : 'degraded';

      return {
        service: healthCheck.name,
        status,
        responseTime,
        statusCode: response.status,
        timestamp,
        metadata: response.data,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        service: healthCheck.name,
        status: 'unhealthy',
        responseTime,
        statusCode: error.response?.status,
        error: error.message,
        timestamp,
      };
    }
  }

  /**
   * Get health check history for a service
   */
  public getServiceHistory(serviceName: string, limit: number = 100): HealthCheckResult[] {
    const results = this.results.get(serviceName) || [];
    return results.slice(-limit).reverse(); // Most recent first
  }

  /**
   * Get overall system health
   */
  public async getCurrentHealth(): Promise<SystemHealthSummary> {
    return this.performHealthCheck();
  }

  /**
   * Add listener for health check updates
   */
  public addListener(callback: (summary: SystemHealthSummary) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove listener
   */
  public removeListener(callback: (summary: SystemHealthSummary) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Add custom health check
   */
  public addServiceCheck(serviceName: string, healthCheck: ServiceHealthCheck, critical: boolean = false): void {
    this.config.services.push({
      service: serviceName,
      critical,
      healthCheck,
    });
  }

  /**
   * Remove service check
   */
  public removeServiceCheck(serviceName: string): void {
    this.config.services = this.config.services.filter(s => s.service !== serviceName);
    this.results.delete(serviceName);
    this.consecutiveFailures.delete(serviceName);
  }

  /**
   * Update service check configuration
   */
  public updateServiceCheck(serviceName: string, updates: Partial<ServiceHealthCheck>): void {
    const service = this.config.services.find(s => s.service === serviceName);
    if (service) {
      service.healthCheck = { ...service.healthCheck, ...updates };
    }
  }

  /**
   * Get service availability percentage
   */
  public getServiceAvailability(serviceName: string, periodHours: number = 24): number {
    const results = this.getServiceHistory(serviceName);
    const cutoffTime = Date.now() - (periodHours * 60 * 60 * 1000);
    
    const recentResults = results.filter(r => 
      new Date(r.timestamp).getTime() > cutoffTime
    );

    if (recentResults.length === 0) return 100;

    const healthyCount = recentResults.filter(r => r.status === 'healthy').length;
    return Math.round((healthyCount / recentResults.length) * 100);
  }

  /**
   * Get average response time for a service
   */
  public getAverageResponseTime(serviceName: string, periodHours: number = 24): number {
    const results = this.getServiceHistory(serviceName);
    const cutoffTime = Date.now() - (periodHours * 60 * 60 * 1000);
    
    const recentResults = results.filter(r => 
      new Date(r.timestamp).getTime() > cutoffTime && r.status === 'healthy'
    );

    if (recentResults.length === 0) return 0;

    const totalResponseTime = recentResults.reduce((sum, r) => sum + r.responseTime, 0);
    return Math.round(totalResponseTime / recentResults.length);
  }

  /**
   * Export health check data
   */
  public exportHealthData(format: 'json' | 'csv' = 'json'): string {
    const allData: Record<string, HealthCheckResult[]> = {};
    
    for (const [service, results] of this.results.entries()) {
      allData[service] = results;
    }

    if (format === 'json') {
      return JSON.stringify(allData, null, 2);
    } else {
      // CSV format
      const headers = ['Service', 'Status', 'Response Time', 'Status Code', 'Error', 'Timestamp'];
      const rows = [headers.join(',')];
      
      for (const [service, results] of this.results.entries()) {
        for (const result of results) {
          const row = [
            service,
            result.status,
            result.responseTime.toString(),
            result.statusCode?.toString() || '',
            result.error || '',
            result.timestamp,
          ];
          rows.push(row.map(field => `"${field}"`).join(','));
        }
      }
      
      return rows.join('\n');
    }
  }

  // Private methods
  private calculateOverallHealth(results: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' {
    const criticalServices = this.config.services.filter(s => s.critical);
    const criticalResults = results.filter(r => 
      criticalServices.some(s => s.service === r.service)
    );

    // If any critical service is unhealthy, system is unhealthy
    const unhealthyCritical = criticalResults.filter(r => r.status === 'unhealthy');
    if (unhealthyCritical.length > 0) {
      return 'unhealthy';
    }

    // If any service (critical or not) is unhealthy, system is degraded
    const unhealthyServices = results.filter(r => r.status === 'unhealthy');
    if (unhealthyServices.length > 0) {
      return 'degraded';
    }

    // If any service is degraded, system is degraded
    const degradedServices = results.filter(r => r.status === 'degraded');
    if (degradedServices.length > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  private storeResult(serviceName: string, result: HealthCheckResult): void {
    const serviceResults = this.results.get(serviceName) || [];
    serviceResults.push(result);

    // Keep only last 1000 results per service
    if (serviceResults.length > 1000) {
      serviceResults.shift();
    }

    this.results.set(serviceName, serviceResults);
  }

  private updateConsecutiveFailures(serviceName: string, failed: boolean): void {
    if (failed) {
      const current = this.consecutiveFailures.get(serviceName) || 0;
      this.consecutiveFailures.set(serviceName, current + 1);
    } else {
      this.consecutiveFailures.set(serviceName, 0);
    }
  }

  private notifyListeners(summary: SystemHealthSummary): void {
    this.listeners.forEach(callback => {
      try {
        callback(summary);
      } catch (error) {
        console.error('Error in health check listener:', error);
      }
    });
  }

  private checkAlertConditions(results: HealthCheckResult[]): void {
    for (const result of results) {
      const consecutiveFailures = this.consecutiveFailures.get(result.service) || 0;
      
      if (consecutiveFailures >= this.config.notificationThreshold) {
        this.triggerAlert(result, consecutiveFailures);
      }
    }
  }

  private triggerAlert(result: HealthCheckResult, consecutiveFailures: number): void {
    console.warn(`ALERT: Service ${result.service} has failed ${consecutiveFailures} consecutive health checks`);
    
    // Emit custom event for alert handling
    window.dispatchEvent(new CustomEvent('health-check-alert', {
      detail: {
        service: result.service,
        status: result.status,
        consecutiveFailures,
        error: result.error,
        timestamp: result.timestamp,
      },
    }));
  }
}

// Create global health check service instance
export const healthCheckService = new HealthCheckService({
  interval: parseInt(process.env.REACT_APP_HEALTH_CHECK_INTERVAL || '60000'),
  timeout: parseInt(process.env.REACT_APP_HEALTH_CHECK_TIMEOUT || '30000'),
  retries: parseInt(process.env.REACT_APP_HEALTH_CHECK_RETRIES || '3'),
  notificationThreshold: parseInt(process.env.REACT_APP_HEALTH_CHECK_NOTIFICATION_THRESHOLD || '3'),
});

// Utility functions
export const startHealthChecks = () => {
  healthCheckService.start();
};

export const stopHealthChecks = () => {
  healthCheckService.stop();
};

export const getCurrentSystemHealth = () => {
  return healthCheckService.getCurrentHealth();
};

export const getServiceAvailability = (serviceName: string, periodHours: number = 24) => {
  return healthCheckService.getServiceAvailability(serviceName, periodHours);
};

export const getServiceResponseTime = (serviceName: string, periodHours: number = 24) => {
  return healthCheckService.getAverageResponseTime(serviceName, periodHours);
};

// React hook for health monitoring
export const useHealthCheck = () => {
  const [healthSummary, setHealthSummary] = React.useState<SystemHealthSummary | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const updateHealth = (summary: SystemHealthSummary) => {
      setHealthSummary(summary);
      setLoading(false);
    };

    // Add listener
    healthCheckService.addListener(updateHealth);

    // Get initial health status
    healthCheckService.getCurrentHealth().then(updateHealth);

    // Cleanup
    return () => {
      healthCheckService.removeListener(updateHealth);
    };
  }, []);

  return {
    healthSummary,
    loading,
    refresh: () => healthCheckService.performHealthCheck(),
    getServiceHistory: (serviceName: string) => healthCheckService.getServiceHistory(serviceName),
    getServiceAvailability: (serviceName: string, periodHours?: number) =>
      healthCheckService.getServiceAvailability(serviceName, periodHours),
    getAverageResponseTime: (serviceName: string, periodHours?: number) =>
      healthCheckService.getAverageResponseTime(serviceName, periodHours),
  };
}; 