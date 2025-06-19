import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { UserRole } from '../../types';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  timestamp?: Date;
}

export const AuthTestPage: React.FC = () => {
  const { user, login, register, logout, isLoading } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testCredentials, setTestCredentials] = useState({
    email: 'test@example.com',
    password: 'testpassword123',
    firstName: 'Test',
    lastName: 'User',
    companyName: 'Test Company'
  });

  const addTestResult = (test: string, status: 'pending' | 'success' | 'error', message?: string) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      timestamp: new Date()
    }]);
  };

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    try {
      addTestResult(testName, 'pending');
      await testFn();
      addTestResult(testName, 'success', 'Test completed successfully');
    } catch (error) {
      addTestResult(testName, 'error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Test 1: User Registration
  const testRegister = async () => {
    try {
      await register({
        email: testCredentials.email,
        password: testCredentials.password,
        firstName: testCredentials.firstName,
        lastName: testCredentials.lastName,
        companyName: testCredentials.companyName,
        role: UserRole.CLIENT,
        dataProcessingConsent: true,
        marketingConsent: false
      });
      
      addTestResult('Register', 'success', 'User registered successfully');
    } catch (error) {
      addTestResult('Register', 'error', error instanceof Error ? error.message : 'Registration failed');
    }
  };

  // Test 2: Email/Password Login
  const testEmailLogin = async () => {
    await login({
      email: testCredentials.email,
      password: testCredentials.password
    });
  };

  // Test 3: Google OAuth (Removed as per new implementation)
  const testGoogleAuth = async () => {
    // Google OAuth test is removed as per the new implementation
    addTestResult('Google OAuth', 'error', 'Google OAuth test is removed as per the new implementation');
  };

  // Test 4: Logout
  const testLogout = async () => {
    await logout();
  };

  // Test 5: Firebase Sync Check
  const testFirebaseSync = async () => {
    if (!user) {
      throw new Error('No user authenticated');
    }
    
    // For Firebase user, we need to get the token differently
    // This is a mock implementation since we don't have direct access to Firebase
    const response = await fetch('/api/v1/auth/firebase-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer mock-token` // In real implementation, get from Firebase
      }
    });
    
    if (!response.ok) {
      throw new Error(`Firebase sync failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.valid) {
      throw new Error('Firebase token validation failed');
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🔐 Firebase Authentication Testing Dashboard
          </h1>

          {/* Current User Status */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Current Authentication Status</h2>
            {user ? (
              <div className="space-y-2">
                <p><strong>User:</strong> {user.email}</p>
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Display Name:</strong> {user.fullName || 'Not set'}</p>
                <p><strong>Email Verified:</strong> {user.isVerified ? '✅' : '❌'}</p>
                <p><strong>Role:</strong> {user.role}</p>
              </div>
            ) : (
              <p className="text-gray-600">No user currently authenticated</p>
            )}
          </div>

          {/* Test Credentials */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Test Credentials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email"
                value={testCredentials.email}
                onChange={(e) => setTestCredentials(prev => ({ ...prev, email: e.target.value }))}
              />
              <Input
                label="Password"
                type="password"
                value={testCredentials.password}
                onChange={(e) => setTestCredentials(prev => ({ ...prev, password: e.target.value }))}
              />
              <Input
                label="First Name"
                value={testCredentials.firstName}
                onChange={(e) => setTestCredentials(prev => ({ ...prev, firstName: e.target.value }))}
              />
              <Input
                label="Last Name"
                value={testCredentials.lastName}
                onChange={(e) => setTestCredentials(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
          </div>

          {/* Test Buttons */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Authentication Tests</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button
                onClick={() => runTest('User Registration', testRegister)}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                1. Test Registration
              </Button>
              
              <Button
                onClick={() => runTest('Email/Password Login', testEmailLogin)}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                2. Test Email Login
              </Button>
              
              <Button
                onClick={() => runTest('Google OAuth', testGoogleAuth)}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                3. Test Google Auth
              </Button>
              
              <Button
                onClick={() => runTest('Firebase Sync', testFirebaseSync)}
                disabled={isLoading || !user}
                className="bg-purple-600 hover:bg-purple-700"
              >
                4. Test Firebase Sync
              </Button>
              
              <Button
                onClick={() => runTest('Logout', testLogout)}
                disabled={isLoading || !user}
                className="bg-gray-600 hover:bg-gray-700"
              >
                5. Test Logout
              </Button>
              
              <Button
                onClick={clearResults}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Clear Results
              </Button>
            </div>
          </div>

          {/* Test Results */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Test Results</h2>
            {testResults.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No tests run yet. Click a test button above to start.</p>
            ) : (
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      result.status === 'success'
                        ? 'bg-green-50 border-green-400'
                        : result.status === 'error'
                        ? 'bg-red-50 border-red-400'
                        : 'bg-yellow-50 border-yellow-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            result.status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : result.status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {result.status === 'success' && '✅'}
                          {result.status === 'error' && '❌'}
                          {result.status === 'pending' && '⏳'}
                          {result.status.toUpperCase()}
                        </span>
                        <span className="font-medium text-gray-900">{result.test}</span>
                      </div>
                      {result.timestamp && (
                        <span className="text-xs text-gray-500">
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    {result.message && (
                      <p className="mt-2 text-sm text-gray-600">{result.message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">Testing Instructions</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>1. <strong>Registration Test:</strong> Creates a new user account with the provided credentials</p>
              <p>2. <strong>Email Login Test:</strong> Attempts to log in with email and password</p>
              <p>3. <strong>Google Auth Test:</strong> Opens Google OAuth popup for authentication</p>
              <p>4. <strong>Firebase Sync Test:</strong> Verifies Firebase token with backend (requires active user)</p>
              <p>5. <strong>Logout Test:</strong> Signs out the current user</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 