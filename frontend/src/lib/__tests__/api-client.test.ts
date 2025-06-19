import { ApiClient, ApiError, CircuitBreakerOpenError, RateLimitError } from '../api-client';
import axios from 'axios';
import * as Sentry from '@sentry/react';

// Mock dependencies
jest.mock('axios');
jest.mock('@sentry/react');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedSentry = Sentry as jest.Mocked<typeof Sentry>;

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      request: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
      defaults: {
        headers: {
          common: {},
        },
        timeout: 30000,
        baseURL: '',
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Create API client instance
    apiClient = new ApiClient({
      baseURL: 'https://api.test.com',
      retryAttempts: 3,
      retryDelay: 100,
      circuitBreakerThreshold: 2,
      circuitBreakerTimeout: 1000,
      enableLogging: false,
    });
  });

  describe('initialization', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.test.com',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('successful requests', () => {
    it('should make GET request successfully', async () => {
      const responseData = { id: 1, name: 'test' };
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: responseData,
        status: 200,
        headers: {},
        config: { metadata: { context: { id: 'test', startTime: Date.now() } } },
      });

      const result = await apiClient.get('/test');
      
      expect(result).toEqual(responseData);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should make POST request with data', async () => {
      const postData = { name: 'test' };
      const responseData = { id: 1, ...postData };
      
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: responseData,
        status: 201,
        headers: {},
        config: { metadata: { context: { id: 'test', startTime: Date.now() } } },
      });

      const result = await apiClient.post('/test', postData);
      
      expect(result).toEqual(responseData);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/test',
          data: postData,
        })
      );
    });

    it('should update metrics on successful response', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: {},
        status: 200,
        headers: {},
        config: { metadata: { context: { id: 'test', startTime: Date.now() - 100 } } },
      });

      await apiClient.get('/test');
      
      const metrics = apiClient.getMetrics();
      expect(metrics.requests).toBe(1);
      expect(metrics.failures).toBe(0);
      expect(metrics.avgResponseTime).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should convert axios error to ApiError', async () => {
      const axiosError = {
        response: {
          status: 400,
          data: { message: 'Bad request' },
        },
        message: 'Request failed',
        code: 'BAD_REQUEST',
      };

      mockAxiosInstance.request.mockRejectedValueOnce(axiosError);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiError);
      
      expect(mockedSentry.captureException).toHaveBeenCalledWith(
        expect.any(ApiError),
        expect.objectContaining({
          tags: expect.objectContaining({
            api_endpoint: '/test',
            api_method: 'GET',
            api_status: 400,
          }),
        })
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';

      mockAxiosInstance.request.mockRejectedValueOnce(networkError);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiError);
    });

    it('should update metrics on error', async () => {
      mockAxiosInstance.request.mockRejectedValueOnce(new Error('Test error'));

      try {
        await apiClient.get('/test');
      } catch (error) {
        // Expected to throw
      }

      const metrics = apiClient.getMetrics();
      expect(metrics.requests).toBe(1);
      expect(metrics.failures).toBe(1);
    });
  });

  describe('retry logic', () => {
    it('should retry on retryable errors', async () => {
      const retryableError = {
        response: { status: 500 },
        message: 'Server error',
      };

      // Fail first two attempts, succeed on third
      mockAxiosInstance.request
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce({
          data: { success: true },
          status: 200,
          headers: {},
          config: { metadata: { context: { id: 'test', startTime: Date.now() } } },
        });

      const result = await apiClient.get('/test');
      
      expect(result).toEqual({ success: true });
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = {
        response: { status: 400 },
        message: 'Bad request',
      };

      mockAxiosInstance.request.mockRejectedValueOnce(nonRetryableError);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiError);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should respect maximum retry attempts', async () => {
      const retryableError = {
        response: { status: 500 },
        message: 'Server error',
      };

      mockAxiosInstance.request.mockRejectedValue(retryableError);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiError);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should implement exponential backoff', async () => {
      const retryableError = {
        response: { status: 500 },
        message: 'Server error',
      };

      mockAxiosInstance.request.mockRejectedValue(retryableError);
      
      const startTime = Date.now();
      
      try {
        await apiClient.get('/test');
      } catch (error) {
        // Expected to throw
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should take at least the sum of delays: 100 + 200 + 400 = 700ms
      expect(totalTime).toBeGreaterThan(600);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(4);
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit breaker after threshold failures', async () => {
      const error = new Error('Service unavailable');
      mockAxiosInstance.request.mockRejectedValue(error);

      // First two failures should trigger circuit breaker
      await expect(apiClient.get('/test')).rejects.toThrow();
      await expect(apiClient.get('/test')).rejects.toThrow();

      // Third request should fail immediately with circuit breaker error
      await expect(apiClient.get('/test')).rejects.toThrow(CircuitBreakerOpenError);
      
      const state = apiClient.getCircuitBreakerState();
      expect(state.state).toBe('OPEN');
    });

    it('should reset circuit breaker after timeout', async () => {
      const error = new Error('Service unavailable');
      mockAxiosInstance.request.mockRejectedValue(error);

      // Trigger circuit breaker
      await expect(apiClient.get('/test')).rejects.toThrow();
      await expect(apiClient.get('/test')).rejects.toThrow();
      
      expect(apiClient.getCircuitBreakerState().state).toBe('OPEN');

      // Wait for timeout (mocked)
      jest.advanceTimersByTime(1500);

      // Next request should move to half-open state
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        headers: {},
        config: { metadata: { context: { id: 'test', startTime: Date.now() } } },
      });

      await apiClient.get('/test');
      
      expect(apiClient.getCircuitBreakerState().state).toBe('CLOSED');
    });
  });

  describe('rate limiting', () => {
    it('should handle rate limit errors', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: {
            'retry-after': '60',
          },
        },
        message: 'Too many requests',
      };

      mockAxiosInstance.request.mockRejectedValueOnce(rateLimitError);

      await expect(apiClient.get('/test')).rejects.toThrow(RateLimitError);
    });

    it('should parse rate limit headers', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: {},
        status: 200,
        headers: {
          'x-ratelimit-limit': '100',
          'x-ratelimit-remaining': '99',
          'x-ratelimit-reset': '1640995200',
        },
        config: { metadata: { context: { id: 'test', startTime: Date.now() } } },
      });

      await apiClient.get('/test');
      
      const rateLimitInfo = apiClient.getRateLimitInfo();
      expect(rateLimitInfo).toEqual({
        limit: 100,
        remaining: 99,
        resetTime: 1640995200,
      });
    });
  });

  describe('authentication', () => {
    it('should set auth token', () => {
      const token = 'test-token';
      apiClient.setAuthToken(token);
      
      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe(`Bearer ${token}`);
    });

    it('should remove auth token', () => {
      apiClient.setAuthToken('test-token');
      apiClient.removeAuthToken();
      
      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBeUndefined();
    });
  });

  describe('health check', () => {
    it('should return healthy status when metrics are good', () => {
      // Simulate successful requests
      apiClient['metrics'] = {
        requests: 100,
        failures: 5,
        avgResponseTime: 200,
        lastRequestTime: Date.now(),
      };
      
      expect(apiClient.isHealthy()).toBe(true);
    });

    it('should return unhealthy when error rate is high', () => {
      apiClient['metrics'] = {
        requests: 100,
        failures: 15, // 15% error rate
        avgResponseTime: 200,
        lastRequestTime: Date.now(),
      };
      
      expect(apiClient.isHealthy()).toBe(false);
    });

    it('should return unhealthy when circuit breaker is open', () => {
      apiClient['circuitBreaker'].state = 'OPEN';
      
      expect(apiClient.isHealthy()).toBe(false);
    });

    it('should return unhealthy when response time is too high', () => {
      apiClient['metrics'] = {
        requests: 100,
        failures: 5,
        avgResponseTime: 6000, // 6 seconds
        lastRequestTime: Date.now(),
      };
      
      expect(apiClient.isHealthy()).toBe(false);
    });
  });

  describe('configuration updates', () => {
    it('should update timeout configuration', () => {
      apiClient.updateConfig({ timeout: 60000 });
      
      expect(mockAxiosInstance.defaults.timeout).toBe(60000);
    });

    it('should update base URL configuration', () => {
      apiClient.updateConfig({ baseURL: 'https://new-api.test.com' });
      
      expect(mockAxiosInstance.defaults.baseURL).toBe('https://new-api.test.com');
    });
  });

  describe('request context', () => {
    it('should add request context to all requests', async () => {
      mockAxiosInstance.request.mockImplementation((config: any) => {
        expect(config.metadata?.context).toEqual(
          expect.objectContaining({
            id: expect.stringMatching(/^req_\d+_\w+$/),
            startTime: expect.any(Number),
            endpoint: '/test',
            method: 'GET',
            retryCount: 0,
          })
        );
        
        return Promise.resolve({
          data: {},
          status: 200,
          headers: {},
          config,
        });
      });

      await apiClient.get('/test');
    });
  });

  describe('error context and logging', () => {
    it('should capture error context in Sentry', async () => {
      const axiosError = {
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
        message: 'Request failed',
        config: {
          metadata: {
            context: {
              id: 'test-request-id',
              endpoint: '/test',
              method: 'GET',
            },
          },
        },
      };

      mockAxiosInstance.request.mockRejectedValueOnce(axiosError);

      try {
        await apiClient.get('/test');
      } catch (error) {
        // Expected to throw
      }

      expect(mockedSentry.captureException).toHaveBeenCalledWith(
        expect.any(ApiError),
        expect.objectContaining({
          tags: {
            api_endpoint: '/test',
            api_method: 'GET',
            api_status: 500,
          },
          extra: expect.objectContaining({
            requestId: 'test-request-id',
          }),
        })
      );
    });
  });

  describe('concurrent requests', () => {
    it('should handle multiple concurrent requests', async () => {
      mockAxiosInstance.request.mockImplementation(() =>
        Promise.resolve({
          data: { success: true },
          status: 200,
          headers: {},
          config: { metadata: { context: { id: 'test', startTime: Date.now() } } },
        })
      );

      const promises = Array.from({ length: 10 }, (_, i) =>
        apiClient.get(`/test/${i}`)
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(10);
      
      const metrics = apiClient.getMetrics();
      expect(metrics.requests).toBe(10);
      expect(metrics.failures).toBe(0);
    });
  });

  describe('request cancellation', () => {
    it('should support request cancellation', async () => {
      const controller = new AbortController();
      
      mockAxiosInstance.request.mockImplementation((config: any) => {
        // Simulate request being cancelled
        if (config.signal?.aborted) {
          const error = new Error('Request was cancelled');
          error.name = 'AbortError';
          return Promise.reject(error);
        }
        
        return new Promise((resolve) => {
          setTimeout(() => resolve({
            data: {},
            status: 200,
            headers: {},
            config,
          }), 1000);
        });
      });

      const requestPromise = apiClient.request({
        url: '/test',
        signal: controller.signal,
      });

      // Cancel request immediately
      controller.abort();

      await expect(requestPromise).rejects.toThrow('Request was cancelled');
    });
  });
});

describe('authManager', () => {
  const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  it('should store and retrieve auth token', () => {
    const { authManager } = require('../api-client');
    
    authManager.setToken('test-token');
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
  });

  it('should remove auth token', () => {
    const { authManager } = require('../api-client');
    
    authManager.removeToken();
    
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
  });

  it('should initialize auth on module load', () => {
    mockLocalStorage.getItem.mockReturnValue('stored-token');
    
    // Re-import to trigger initialization
    jest.resetModules();
    require('../api-client');
    
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_token');
  });
}); 