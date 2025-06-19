import React, { useState } from 'react';
import { FirebaseAuthProvider, useFirebaseAuthContext, ProtectedRoute, RoleProtectedRoute } from '../components/auth/FirebaseAuthProvider';
import FirebaseLoginForm from '../components/auth/FirebaseLoginForm';

// Demo Dashboard Component
const DemoDashboard: React.FC = () => {
  const { user, signOut } = useFirebaseAuthContext();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🔥 Firebase Demo Dashboard</h1>
              <p className="text-gray-600 mt-2">Welcome to the manufacturing platform!</p>
            </div>
            <button
              onClick={signOut}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-200"
            >
              Sign Out
            </button>
          </div>

          {/* User Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">👤 Your Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-blue-700">Name</p>
                <p className="text-blue-900">{user?.firstName} {user?.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Email</p>
                <p className="text-blue-900">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Role</p>
                <p className="text-blue-900 capitalize">
                  {user?.role === 'manufacturer' ? '🏭' : '🏢'} {user?.role}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Company</p>
                <p className="text-blue-900">{user?.companyName || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Role-Specific Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Features */}
            <RoleProtectedRoute allowedRoles={['client']}>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-4">🏢 Client Features</h3>
                <ul className="space-y-2 text-green-800">
                  <li>• Request manufacturing quotes</li>
                  <li>• Browse manufacturer profiles</li>
                  <li>• Track order progress</li>
                  <li>• Manage project requirements</li>
                </ul>
                <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200">
                  View Projects
                </button>
              </div>
            </RoleProtectedRoute>

            {/* Manufacturer Features */}
            <RoleProtectedRoute allowedRoles={['manufacturer']}>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">🏭 Manufacturer Features</h3>
                <ul className="space-y-2 text-purple-800">
                  <li>• Receive project requests</li>
                  <li>• Submit competitive quotes</li>
                  <li>• Manage production capacity</li>
                  <li>• Track order fulfillment</li>
                </ul>
                <button className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition duration-200">
                  View Orders
                </button>
              </div>
            </RoleProtectedRoute>

            {/* Admin Features */}
            <RoleProtectedRoute allowedRoles={['admin']}>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 md:col-span-2">
                <h3 className="text-lg font-semibold text-yellow-900 mb-4">⚙️ Admin Features</h3>
                <ul className="grid grid-cols-2 gap-2 text-yellow-800">
                  <li>• User management</li>
                  <li>• Platform analytics</li>
                  <li>• System configuration</li>
                  <li>• Content moderation</li>
                </ul>
                <button className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition duration-200">
                  Admin Panel
                </button>
              </div>
            </RoleProtectedRoute>
          </div>

          {/* Platform Stats */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Platform Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">1,234</div>
                <div className="text-sm text-gray-600">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">567</div>
                <div className="text-sm text-gray-600">Completed Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">89</div>
                <div className="text-sm text-gray-600">Manufacturers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">$2.4M</div>
                <div className="text-sm text-gray-600">Total Volume</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Firebase Demo Page Component
const FirebaseDemoPage: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <FirebaseAuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <ProtectedRoute
          fallback={
            <div className="min-h-screen flex items-center justify-center px-4">
              <div className="text-center max-w-2xl">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  🔥 Firebase Authentication Demo
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                  Experience lightning-fast authentication with Google Firebase
                </p>
                
                <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">✨ Features</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Email/Password Authentication</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Google OAuth Integration</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Role-Based Access Control</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Real-time Authentication State</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Secure JWT Token Management</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Beautiful Modern UI</span>
                    </div>
                  </div>
                </div>

                {!showLogin ? (
                  <button
                    onClick={() => setShowLogin(true)}
                    className="bg-blue-600 text-white font-medium py-3 px-8 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 text-lg"
                  >
                    Try Firebase Authentication
                  </button>
                ) : (
                  <FirebaseLoginForm 
                    onSuccess={() => setShowLogin(false)}
                    className="mt-8"
                  />
                )}
              </div>
            </div>
          }
        >
          <DemoDashboard />
        </ProtectedRoute>
      </div>
    </FirebaseAuthProvider>
  );
};

export default FirebaseDemoPage; 