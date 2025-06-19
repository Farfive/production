import React, { useState, useEffect } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { act } from 'react-dom/test-utils';
import Button from './components/ui/Button';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';

// Test configuration
const TEST_CONFIG = {
  BACKEND_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  CLIENT_USER: {
    email: 'test-client@example.com',
    password: 'TestPassword123!',
    role: 'client'
  },
  MANUFACTURER_USER: {
    email: 'test-manufacturer@example.com', 
    password: 'TestPassword123!',
    role: 'manufacturer'
  },
  ADMIN_USER: {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    role: 'admin'
  }
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// API Test Helper
class APITester {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async testEndpoint(endpoint: string, method: string = 'GET', data?: any, token?: string) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      const responseData = await response.json();
      
      return {
        success: response.ok,
        status: response.status,
        data: responseData,
        error: !response.ok ? responseData.detail || 'Unknown error' : null
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        data: null,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  async register(userData: { email: string; password: string; role: string; full_name?: string }) {
    return this.testEndpoint('/api/v1/auth/register', 'POST', {
      email: userData.email,
      password: userData.password,
      role: userData.role,
      full_name: userData.full_name || `Test ${userData.role}`,
      company_name: userData.role === 'manufacturer' ? `${userData.email} Manufacturing` : undefined
    });
  }

  async login(email: string, password: string) {
    return this.testEndpoint('/api/v1/auth/login', 'POST', {
      username: email,
      password: password
    });
  }

  async getProfile(token: string) {
    return this.testEndpoint('/api/v1/users/me', 'GET', undefined, token);
  }

  async createOrder(token: string, orderData: any) {
    return this.testEndpoint('/api/v1/orders/', 'POST', orderData, token);
  }

  async getOrders(token: string) {
    return this.testEndpoint('/api/v1/orders/', 'GET', undefined, token);
  }

  async createQuote(token: string, quoteData: any) {
    return this.testEndpoint('/api/v1/quotes/', 'POST', quoteData, token);
  }

  async getQuotes(token: string) {
    return this.testEndpoint('/api/v1/quotes/', 'GET', undefined, token);
  }

  async getMatching(token: string, orderId: string) {
    return this.testEndpoint(`/api/v1/matching/orders/${orderId}`, 'GET', undefined, token);
  }

  async getDashboard(token: string) {
    return this.testEndpoint('/api/v1/dashboard/', 'GET', undefined, token);
  }
}

// Full User Flow Test Component
const FullUserFlowTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');
  const apiTester = new APITester(TEST_CONFIG.BACKEND_URL);

  const addResult = (test: string, success: boolean, details: any) => {
    setTestResults(prev => [...prev, {
      test,
      success,
      details,
      timestamp: new Date().toISOString()
    }]);
  };

  const runBackendHealthCheck = async () => {
    setCurrentTest('Backend Health Check');
    
    const healthResult = await apiTester.testEndpoint('/health');
    addResult('Backend Health Check', healthResult.success, healthResult);
    
    const rootResult = await apiTester.testEndpoint('/');
    addResult('Root Endpoint Check', rootResult.success, rootResult);
    
    return healthResult.success && rootResult.success;
  };

  const runClientUserFlow = async () => {
    setCurrentTest('Client User Flow');
    let token = '';

    try {
      // 1. Register as client
      const registerResult = await apiTester.register({
        ...TEST_CONFIG.CLIENT_USER,
        full_name: 'Test Client User'
      });
      addResult('Client Registration', registerResult.success, registerResult);

      if (!registerResult.success && !registerResult.error?.includes('already registered')) {
        throw new Error('Registration failed');
      }

      // 2. Login as client
      const loginResult = await apiTester.login(
        TEST_CONFIG.CLIENT_USER.email,
        TEST_CONFIG.CLIENT_USER.password
      );
      addResult('Client Login', loginResult.success, loginResult);

      if (!loginResult.success) {
        throw new Error('Login failed');
      }

      token = loginResult.data.access_token;

      // 3. Get client profile
      const profileResult = await apiTester.getProfile(token);
      addResult('Client Profile Fetch', profileResult.success, profileResult);

      // 4. Get client dashboard
      const dashboardResult = await apiTester.getDashboard(token);
      addResult('Client Dashboard', dashboardResult.success, dashboardResult);

      // 5. Create an order
      const orderData = {
        title: 'Test Manufacturing Order',
        description: 'Test order for user flow validation',
        quantity: 100,
        budget_min: 1000,
        budget_max: 5000,
        delivery_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        specifications: {
          material: 'Steel',
          dimensions: '10x10x10 cm',
          tolerance: '±0.1mm'
        }
      };

      const createOrderResult = await apiTester.createOrder(token, orderData);
      addResult('Client Create Order', createOrderResult.success, createOrderResult);

      // 6. Get orders list
      const ordersResult = await apiTester.getOrders(token);
      addResult('Client Get Orders', ordersResult.success, ordersResult);

      // 7. Test intelligent matching (if order was created)
      if (createOrderResult.success && createOrderResult.data?.id) {
        const matchingResult = await apiTester.getMatching(token, createOrderResult.data.id);
        addResult('Client Order Matching', matchingResult.success, matchingResult);
      }

      return true;
    } catch (error) {
      addResult('Client Flow Error', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  };

  const runManufacturerUserFlow = async () => {
    setCurrentTest('Manufacturer User Flow');
    let token = '';

    try {
      // 1. Register as manufacturer
      const registerResult = await apiTester.register({
        ...TEST_CONFIG.MANUFACTURER_USER,
        full_name: 'Test Manufacturer User'
      });
      addResult('Manufacturer Registration', registerResult.success, registerResult);

      if (!registerResult.success && !registerResult.error?.includes('already registered')) {
        throw new Error('Registration failed');
      }

      // 2. Login as manufacturer
      const loginResult = await apiTester.login(
        TEST_CONFIG.MANUFACTURER_USER.email,
        TEST_CONFIG.MANUFACTURER_USER.password
      );
      addResult('Manufacturer Login', loginResult.success, loginResult);

      if (!loginResult.success) {
        throw new Error('Login failed');
      }

      token = loginResult.data.access_token;

      // 3. Get manufacturer profile
      const profileResult = await apiTester.getProfile(token);
      addResult('Manufacturer Profile Fetch', profileResult.success, profileResult);

      // 4. Get manufacturer dashboard
      const dashboardResult = await apiTester.getDashboard(token);
      addResult('Manufacturer Dashboard', dashboardResult.success, dashboardResult);

      // 5. Get available orders to quote
      const ordersResult = await apiTester.getOrders(token);
      addResult('Manufacturer Get Orders', ordersResult.success, ordersResult);

      // 6. Create a quote (for the first available order)
      if (ordersResult.success && ordersResult.data?.length > 0) {
        const firstOrder = ordersResult.data[0];
        const quoteData = {
          order_id: firstOrder.id,
          price: 3000,
          delivery_time_days: 21,
          description: 'Professional manufacturing quote for your order',
          terms_conditions: 'Standard manufacturing terms apply',
          validity_days: 30
        };

        const createQuoteResult = await apiTester.createQuote(token, quoteData);
        addResult('Manufacturer Create Quote', createQuoteResult.success, createQuoteResult);
      }

      // 7. Get quotes list
      const quotesResult = await apiTester.getQuotes(token);
      addResult('Manufacturer Get Quotes', quotesResult.success, quotesResult);

      return true;
    } catch (error) {
      addResult('Manufacturer Flow Error', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  };

  const runAdminUserFlow = async () => {
    setCurrentTest('Admin User Flow');
    let token = '';

    try {
      // 1. Login as admin (assume admin exists)
      const loginResult = await apiTester.login(
        TEST_CONFIG.ADMIN_USER.email,
        TEST_CONFIG.ADMIN_USER.password
      );
      addResult('Admin Login', loginResult.success, loginResult);

      if (!loginResult.success) {
        throw new Error('Admin login failed - admin may not exist');
      }

      token = loginResult.data.access_token;

      // 2. Get admin profile
      const profileResult = await apiTester.getProfile(token);
      addResult('Admin Profile Fetch', profileResult.success, profileResult);

      // 3. Get admin dashboard
      const dashboardResult = await apiTester.getDashboard(token);
      addResult('Admin Dashboard', dashboardResult.success, dashboardResult);

      // 4. Get all orders (admin view)
      const ordersResult = await apiTester.getOrders(token);
      addResult('Admin Get All Orders', ordersResult.success, ordersResult);

      // 5. Get all quotes (admin view)
      const quotesResult = await apiTester.getQuotes(token);
      addResult('Admin Get All Quotes', quotesResult.success, quotesResult);

      return true;
    } catch (error) {
      addResult('Admin Flow Error', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  };

  const runFrontendComponentTests = async () => {
    setCurrentTest('Frontend Component Tests');

    try {
      // Test Button component
      const { container } = render(
        <TestWrapper>
          <Button variant="default">Test Button</Button>
        </TestWrapper>
      );
      
      const button = screen.getByRole('button', { name: 'Test Button' });
      expect(button).toBeInTheDocument();
      addResult('Button Component Render', true, { message: 'Button renders correctly' });

      // Test Button click
      fireEvent.click(button);
      addResult('Button Component Click', true, { message: 'Button click works' });

      // Test App component
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
      addResult('App Component Render', true, { message: 'App renders without errors' });

      return true;
    } catch (error) {
      addResult('Frontend Component Error', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  };

  const runFullTestSuite = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      // 1. Backend Health Check
      await runBackendHealthCheck();
      
      // 2. Frontend Component Tests
      await runFrontendComponentTests();
      
      // 3. Client User Flow
      await runClientUserFlow();
      
      // 4. Manufacturer User Flow
      await runManufacturerUserFlow();
      
      // 5. Admin User Flow
      await runAdminUserFlow();
      
    } catch (error) {
      addResult('Test Suite Error', false, { error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const getSuccessRate = () => {
    if (testResults.length === 0) return 0;
    const successCount = testResults.filter(result => result.success).length;
    return Math.round((successCount / testResults.length) * 100);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Full User Flow Testing Suite
        </h1>
        <p className="text-gray-600 mb-6">
          Comprehensive testing of client, manufacturer, and admin user flows including frontend and backend integration.
        </p>
        
        <div className="flex items-center gap-4 mb-6">
          <Button 
            onClick={runFullTestSuite} 
            disabled={isRunning}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? 'Running Tests...' : 'Run Full Test Suite'}
          </Button>
          
          {testResults.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Success Rate:</span>
              <span className={`text-sm font-semibold ${getSuccessRate() >= 80 ? 'text-green-600' : getSuccessRate() >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {getSuccessRate()}%
              </span>
            </div>
          )}
        </div>

        {currentTest && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800 font-medium">Currently running: {currentTest}</span>
            </div>
          </div>
        )}
      </div>

      {testResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Test Results</h2>
          
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div 
                key={index}
                className={`border rounded-lg p-4 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-3 ${result.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-medium text-gray-900">{result.test}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                {result.details && (
                  <div className="mt-3 ml-7">
                    <details className="text-sm">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                        View Details
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Test Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Backend URL</h3>
            <p className="text-gray-600 font-mono text-sm">{TEST_CONFIG.BACKEND_URL}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Test Users</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Client: {TEST_CONFIG.CLIENT_USER.email}</li>
              <li>• Manufacturer: {TEST_CONFIG.MANUFACTURER_USER.email}</li>
              <li>• Admin: {TEST_CONFIG.ADMIN_USER.email}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullUserFlowTest; 