// Environment Configuration for Production Manufacturing Platform

export const environment = {
  // Environment Type
  NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test',
  ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT || 'development',
  environment: process.env.REACT_APP_ENVIRONMENT || 'development',  // Add for compatibility

  // Firebase Configuration
  firebase: {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyBGZ8Cn3PaB0S0Q1w5Y2jH8N0x1K4P2VpQ',
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'production-1e74f.firebaseapp.com',
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'production-1e74f',
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'production-1e74f.appspot.com',
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
    appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456789012',
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || 'G-XXXXXXXXXX'
  },

  // API Configuration
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '30000'),
  maxRetries: parseInt(process.env.REACT_APP_API_MAX_RETRIES || '3'),
  apiLogging: process.env.NODE_ENV === 'development',

  // Monitoring & Analytics
  sentry: {
    dsn: process.env.REACT_APP_SENTRY_DSN || '',
    environment: process.env.REACT_APP_SENTRY_ENV || process.env.REACT_APP_ENVIRONMENT || 'development',
    tracesSampleRate: parseFloat(process.env.REACT_APP_SENTRY_TRACE_RATE || '1.0')
  },
  
  // Feature Flags
  features: {
    enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
    enableErrorMonitoring: process.env.REACT_APP_ENABLE_ERROR_MONITORING === 'true',
    enableRealTimeUpdates: process.env.REACT_APP_ENABLE_REAL_TIME_UPDATES === 'true',
    enableDemoMode: process.env.REACT_APP_ENABLE_DEMO_MODE === 'true',
    apiLogging: process.env.NODE_ENV === 'development',
    performanceMonitoring: process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === 'true'
  },

  // Development flags
  useMockAuth: process.env.REACT_APP_USE_MOCK_AUTH === 'true',
  
  // Environment checks
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test'
};

// Export features separately for easier imports
export const features = environment.features;

export default environment; 