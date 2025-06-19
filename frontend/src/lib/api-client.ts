import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import * as Sentry from '@sentry/react';

// Extend AxiosRequestConfig to include metadata
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      context: RequestContext;
      startTime: Date;
    };
  }
}

// Types for API client configuration
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  enableLogging?: boolean;
  enableMetrics?: boolean;
}

export interface RetryConfig {
  attempts: number;
  delay: number;
  backoffFactor: number;
  maxDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  threshold: number;
  timeout: number;
}

export interface ApiMetrics {
  requests: number;
  failures: number;
  avgResponseTime: number;
  lastRequestTime: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RequestContext {
  id: string;
  startTime: number;
  endpoint: string;
  method: string;
  retryCount: number;
}

// Error types
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: any;
  public readonly retryable: boolean;

  constructor(
    message: string,
    status: number,
    code: string,
    details?: any,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(service: string) {
    super(`Circuit breaker is open for service: ${service}`);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class RateLimitError extends Error {
  public readonly retryAfter: number;

  constructor(retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// Utility functions
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const isRetryableError = (error: AxiosError): boolean => {
  if (!error.response) return true; // Network errors are retryable
  
  const status = error.response.status;
  return (
    status >= 500 || // Server errors
    status === 429 || // Rate limit
    status === 408 || // Request timeout
    status === 409    // Conflict (sometimes retryable)
  );
};

// Core API Client class
export class ApiClient {
  private axiosInstance: AxiosInstance;
  private config: ApiClientConfig;
  private circuitBreaker: CircuitBreakerState;
  private metrics: ApiMetrics;
  private retryConfig: RetryConfig;
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map();

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      enableLogging: true,
      enableMetrics: true,
      ...config,
    };

    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED',
      threshold: this.config.circuitBreakerThreshold!,
      timeout: this.config.circuitBreakerTimeout!,
    };

    this.metrics = {
      requests: 0,
      failures: 0,
      avgResponseTime: 0,
      lastRequestTime: 0,
    };

    this.retryConfig = {
      attempts: this.config.retryAttempts!,
      delay: this.config.retryDelay!,
      backoffFactor: 2,
      maxDelay: 30000,
      retryCondition: isRetryableError,
    };

    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const requestId = generateRequestId();
        const context: RequestContext = {
          id: requestId,
          startTime: Date.now(),
          endpoint: config.url || '',
          method: config.method?.toUpperCase() || 'GET',
          retryCount: 0,
        };

        (config as any).metadata = { context, startTime: new Date() };

        if (this.config.enableLogging) {
          console.log(`[API] ${context.method} ${context.endpoint} - Request ID: ${requestId}`);
        }

        return config;
      },
      (error) => {
        this.handleRequestError(error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.handleSuccessResponse(response);
        return response;
      },
      (error) => {
        return this.handleErrorResponse(error);
      }
    );
  }

  private handleSuccessResponse(response: AxiosResponse): void {
    const context = (response.config as any).metadata?.context as RequestContext;
    if (!context) return;

    const responseTime = Date.now() - context.startTime;
    this.updateMetrics(true, responseTime);
    this.resetCircuitBreaker();
    this.updateRateLimitInfo(response.headers);

    if (this.config.enableLogging) {
      console.log(
        `[API] ${context.method} ${context.endpoint} - ${response.status} (${responseTime}ms)`
      );
    }

    // Send metrics to monitoring service
    if (this.config.enableMetrics) {
      this.trackApiMetrics(context, response.status, responseTime);
    }
  }

  private async handleErrorResponse(error: AxiosError): Promise<never> {
    const context = (error.config as any)?.metadata?.context as RequestContext;
    const responseTime = context ? Date.now() - context.startTime : 0;

    this.updateMetrics(false, responseTime);
    this.incrementCircuitBreakerFailures();

    if (this.config.enableLogging) {
      console.error(
        `[API] ${context?.method || 'UNKNOWN'} ${context?.endpoint || 'UNKNOWN'} - Error:`,
        error.message
      );
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = this.extractRetryAfter(error.response.headers);
      throw new RateLimitError(retryAfter);
    }

    // Convert to ApiError
    const apiError = this.convertToApiError(error);
    
    // Track error in Sentry
    Sentry.captureException(apiError, {
      tags: {
        api_endpoint: context?.endpoint,
        api_method: context?.method,
        api_status: error.response?.status,
      },
      extra: {
        requestId: context?.id,
        responseTime,
        retryCount: context?.retryCount,
      },
    });

    throw apiError;
  }

  private handleRequestError(error: any): void {
    console.error('[API] Request setup error:', error);
    Sentry.captureException(error);
  }

  private convertToApiError(error: AxiosError): ApiError {
    const status = error.response?.status || 0;
    const code = error.code || 'UNKNOWN_ERROR';
    const message = (error.response?.data as any)?.message || error.message;
    const details = error.response?.data;
    const retryable = isRetryableError(error);

    return new ApiError(message, status, code, details, retryable);
  }

  private updateMetrics(success: boolean, responseTime: number): void {
    this.metrics.requests++;
    this.metrics.lastRequestTime = Date.now();
    
    if (!success) {
      this.metrics.failures++;
    }

    // Update average response time
    this.metrics.avgResponseTime = (
      (this.metrics.avgResponseTime * (this.metrics.requests - 1) + responseTime) /
      this.metrics.requests
    );
  }

  private checkCircuitBreaker(): void {
    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case 'OPEN':
        if (now - this.circuitBreaker.lastFailureTime > this.circuitBreaker.timeout) {
          this.circuitBreaker.state = 'HALF_OPEN';
        } else {
          throw new CircuitBreakerOpenError(this.config.baseURL);
        }
        break;
      case 'HALF_OPEN':
        // Allow one request to test if service is back
        break;
      case 'CLOSED':
        // Normal operation
        break;
    }
  }

  private incrementCircuitBreakerFailures(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      this.circuitBreaker.state = 'OPEN';
      console.warn(`[API] Circuit breaker opened for ${this.config.baseURL}`);
    }
  }

  private resetCircuitBreaker(): void {
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.circuitBreaker.state = 'CLOSED';
      this.circuitBreaker.failures = 0;
      console.info(`[API] Circuit breaker closed for ${this.config.baseURL}`);
    }
  }

  private updateRateLimitInfo(headers: any): void {
    const limit = parseInt(headers['x-ratelimit-limit']);
    const remaining = parseInt(headers['x-ratelimit-remaining']);
    const resetTime = parseInt(headers['x-ratelimit-reset']);

    if (limit && remaining !== undefined && resetTime) {
      this.rateLimitInfo.set('default', {
        limit,
        remaining,
        resetTime,
      });
    }
  }

  private extractRetryAfter(headers: any): number {
    const retryAfter = headers['retry-after'];
    return retryAfter ? parseInt(retryAfter) : 60;
  }

  private trackApiMetrics(context: RequestContext, status: number, responseTime: number): void {
    // Send metrics to monitoring service (e.g., DataDog, New Relic)
    // This would be implemented based on your monitoring solution
    if (window.gtag) {
      window.gtag('event', 'api_request', {
        event_category: 'API',
        event_label: context.endpoint,
        value: responseTime,
        custom_map: {
          status,
          method: context.method,
        },
      });
    }
  }

  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    context: RequestContext
  ): Promise<AxiosResponse<T>> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.retryConfig.attempts; attempt++) {
      try {
        context.retryCount = attempt;
        return await requestFn();
      } catch (error) {
        lastError = error;

        // Don't retry if it's not a retryable error
        if (error instanceof ApiError && !error.retryable) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === this.retryConfig.attempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.delay * Math.pow(this.retryConfig.backoffFactor, attempt),
          this.retryConfig.maxDelay
        );

        if (this.config.enableLogging) {
          console.warn(
            `[API] Retry attempt ${attempt + 1}/${this.retryConfig.attempts} for ${context.endpoint} in ${delay}ms`
          );
        }

        await sleep(delay);
      }
    }

    throw lastError;
  }

  // Public methods
  public async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    this.checkCircuitBreaker();

    const context: RequestContext = {
      id: generateRequestId(),
      startTime: Date.now(),
      endpoint: config.url || '',
      method: config.method?.toUpperCase() || 'GET',
      retryCount: 0,
    };

    return this.retryRequest(() => this.axiosInstance.request({ ...config, metadata: { context, startTime: new Date() } } as any), context);
  }

  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.request<T>({ ...config, method: 'GET', url });
    return response.data;
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.request<T>({ ...config, method: 'POST', url, data });
    return response.data;
  }

  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.request<T>({ ...config, method: 'PUT', url, data });
    return response.data;
  }

  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.request<T>({ ...config, method: 'PATCH', url, data });
    return response.data;
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.request<T>({ ...config, method: 'DELETE', url });
    return response.data;
  }

  // Utility methods
  public getMetrics(): ApiMetrics {
    return { ...this.metrics };
  }

  public getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  public getRateLimitInfo(key: string = 'default'): RateLimitInfo | undefined {
    return this.rateLimitInfo.get(key);
  }

  public isHealthy(): boolean {
    const errorRate = this.metrics.requests > 0 ? this.metrics.failures / this.metrics.requests : 0;
    return (
      this.circuitBreaker.state !== 'OPEN' &&
      errorRate < 0.1 && // Less than 10% error rate
      this.metrics.avgResponseTime < 5000 // Less than 5 second average response time
    );
  }

  public setAuthToken(token: string): void {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  public removeAuthToken(): void {
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }

  public updateConfig(newConfig: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.timeout) {
      this.axiosInstance.defaults.timeout = newConfig.timeout;
    }
    
    if (newConfig.baseURL) {
      this.axiosInstance.defaults.baseURL = newConfig.baseURL;
    }
  }
}

// Default API client instance
export const apiClient = new ApiClient({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
  enableLogging: process.env.NODE_ENV === 'development',
  enableMetrics: true,
});

// Authentication token management
export const authManager = {
  setToken: (token: string) => {
    localStorage.setItem('auth_token', token);
    apiClient.setAuthToken(token);
  },
  
  getToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },
  
  removeToken: () => {
    localStorage.removeItem('auth_token');
    apiClient.removeAuthToken();
  },
  
  initializeAuth: () => {
    const token = authManager.getToken();
    if (token) {
      apiClient.setAuthToken(token);
    }
  },
};

// Initialize auth on module load
authManager.initializeAuth(); 