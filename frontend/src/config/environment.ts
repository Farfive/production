// Environment Configuration
// This file manages all environment-specific settings

export interface EnvironmentConfig {
  apiUrl: string;
  wsUrl: string;
  environment: 'development' | 'staging' | 'production';
  useMockAuth: boolean;
  enablePerformanceMonitoring: boolean;
  enableApiLogging: boolean;
  enableDevTools: boolean;
  maxRetries: number;
  timeout: number;
}

// Get environment variable with fallback
const getEnvVar = (key: string, fallback: string): string => {
  return process.env[key] || fallback;
};

// Get boolean environment variable
const getEnvBoolean = (key: string, fallback: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
};

// Current environment configuration
export const environment: EnvironmentConfig = {
  apiUrl: getEnvVar('REACT_APP_API_URL', 'http://localhost:8000/api/v1'),
  wsUrl: getEnvVar('REACT_APP_WS_URL', 'ws://localhost:8000/ws'),
  environment: (getEnvVar('REACT_APP_ENVIRONMENT', 'development') as any),
  
  // Feature flags
  useMockAuth: getEnvBoolean('REACT_APP_USE_MOCK_AUTH', false),
  enablePerformanceMonitoring: getEnvBoolean('REACT_APP_ENABLE_PERFORMANCE_MONITORING', true),
  enableApiLogging: getEnvBoolean('REACT_APP_ENABLE_API_LOGGING', true),
  enableDevTools: process.env.NODE_ENV === 'development',
  
  // API settings
  maxRetries: parseInt(getEnvVar('REACT_APP_MAX_RETRIES', '3')),
  timeout: parseInt(getEnvVar('REACT_APP_TIMEOUT', '30000')),
};

// Development overrides for testing
if (environment.environment === 'development') {
  // You can temporarily enable mock auth for development testing
  // environment.useMockAuth = true;
}

// Environment-specific feature detection
export const features = {
  realTimeUpdates: environment.environment !== 'development' || !environment.useMockAuth,
  advancedAnalytics: environment.environment === 'production',
  debugMode: environment.environment === 'development',
  performanceMonitoring: environment.enablePerformanceMonitoring,
  apiLogging: environment.enableApiLogging && environment.environment === 'development',
};

// Validation
const validateEnvironment = () => {
  if (!environment.apiUrl) {
    throw new Error('API_URL is required');
  }
  
  if (environment.timeout < 1000) {
    console.warn('API timeout is very low, this might cause issues');
  }
  
  if (environment.environment === 'production' && environment.useMockAuth) {
    console.error('Mock auth should not be enabled in production!');
  }
};

// Run validation
validateEnvironment();

export default environment; 