import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Key,
  User,
  Shield,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader,
  Settings,
  Database,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { environment, features } from '../../config/environment';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  message: string;
  details?: string;
}

const AuthTestPanel: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const { getPerformanceData } = usePerformanceMonitoring();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'loading': return <Loader className="h-4 w-4 text-blue-600 animate-spin" />;
    }
  };

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testApiConnection = async (): Promise<TestResult> => {
    try {
      const response = await fetch(`${environment.apiUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        return {
          name: 'API Connection',
          status: 'success',
          message: 'Backend API is reachable',
          details: `Status: ${response.status}`,
        };
      } else {
        return {
          name: 'API Connection',
          status: 'warning',
          message: `API returned status ${response.status}`,
          details: await response.text(),
        };
      }
    } catch (error) {
      return {
        name: 'API Connection',
        status: 'error',
        message: 'Failed to connect to backend API',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const testPerformanceMonitoring = (): TestResult => {
    const performanceData = getPerformanceData();
    
    if (!features.performanceMonitoring) {
      return {
        name: 'Performance Monitoring',
        status: 'warning',
        message: 'Performance monitoring is disabled',
        details: 'Enable in environment configuration',
      };
    }

    if (performanceData) {
      return {
        name: 'Performance Monitoring',
        status: 'success',
        message: `Performance score: ${performanceData.score}/100`,
        details: `Tracking ${performanceData.entries.length} performance entries`,
      };
    }

    return {
      name: 'Performance Monitoring',
      status: 'error',
      message: 'Performance monitoring not working',
      details: 'No performance data available',
    };
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    clearResults();

    addTestResult(testPerformanceMonitoring());

    addTestResult({
      name: 'API Connection',
      status: 'loading',
      message: 'Testing API connection...',
    });
    
    const apiResult = await testApiConnection();
    setTestResults(prev => prev.map(result => 
      result.name === 'API Connection' ? apiResult : result
    ));

    setIsRunningTests(false);
  };

  const handleMockLogin = async () => {
    try {
      await login({ email: 'mock@test.com', password: 'mock123' });
    } catch (error) {
      console.error('Mock login failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Backend Integration Test Panel</h2>
          </div>
          <div className="flex items-center space-x-2">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Authenticated</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-gray-500">
                <XCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Not Authenticated</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-sm font-medium text-gray-700">Environment</div>
            <div className="text-lg font-semibold">{environment.environment}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-sm font-medium text-gray-700">API URL</div>
            <div className="text-sm text-gray-900 truncate">{environment.apiUrl}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-sm font-medium text-gray-700">Mock Auth</div>
            <div className={`text-sm font-medium ${environment.useMockAuth ? 'text-yellow-600' : 'text-green-600'}`}>
              {environment.useMockAuth ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </div>

        {user && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900">{user.fullName}</div>
                <div className="text-sm text-blue-700">{user.email} • {user.role}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={runAllTests}
            disabled={isRunningTests}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {isRunningTests ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            <span>{isRunningTests ? 'Running Tests...' : 'Run All Tests'}</span>
          </button>

          {environment.useMockAuth && (
            <button
              onClick={handleMockLogin}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Key className="h-4 w-4" />
              <span>Mock Login</span>
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={logout}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center space-x-2"
            >
              <Shield className="h-4 w-4" />
              <span>Logout</span>
            </button>
          )}

          <button
            onClick={clearResults}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Clear Results
          </button>
        </div>
      </div>

      {testResults.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <motion.div
                key={`${result.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="mt-0.5">
                  {getStatusIcon(result.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">{result.name}</div>
                    <div className={`text-sm font-medium ${
                      result.status === 'success' ? 'text-green-600' :
                      result.status === 'error' ? 'text-red-600' :
                      result.status === 'warning' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {result.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 mt-1">{result.message}</div>
                  {result.details && (
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      {result.details}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Status</h3>
        <div className="flex items-center space-x-4">
          {navigator.onLine ? (
            <>
              <Wifi className="h-5 w-5 text-green-600" />
              <span className="text-green-600 font-medium">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-5 w-5 text-red-600" />
              <span className="text-red-600 font-medium">Offline</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthTestPanel; 