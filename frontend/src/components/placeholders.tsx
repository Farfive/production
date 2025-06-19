import React from 'react';

// Placeholder components for missing pages
export const UnauthorizedPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold">Unauthorized</h1>
      <p className="text-gray-600">You don't have permission to access this page.</p>
    </div>
  </div>
);

export const ErrorPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold">Error</h1>
      <p className="text-gray-600">Something went wrong.</p>
    </div>
  </div>
);

export const ForgotPasswordPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold">Forgot Password</h1>
      <p className="text-gray-600">Reset your password.</p>
    </div>
  </div>
);

export const ResetPasswordPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold">Reset Password</h1>
      <p className="text-gray-600">Enter your new password.</p>
    </div>
  </div>
);

export const VerifyEmailPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold">Verify Email</h1>
      <p className="text-gray-600">Please check your email.</p>
    </div>
  </div>
);

export const ManufacturerDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manufacturer Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage your manufacturing operations and track business performance.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Data
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Quote
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Orders */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Active Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">24</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <span className="text-success-600 dark:text-success-400 font-medium">+12%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">from last month</span>
            </div>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Monthly Revenue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">$45,231</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <span className="text-success-600 dark:text-success-400 font-medium">+8%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">from last month</span>
            </div>
          </div>
        </div>

        {/* Response Time */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Avg Response Time
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">2.3h</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <span className="text-success-600 dark:text-success-400 font-medium">-15min</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">improved</span>
            </div>
          </div>
        </div>

        {/* Customer Rating */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Customer Rating
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">4.8/5</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">Based on 127 reviews</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
            <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Chart will be implemented with Chart.js</p>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Orders</h3>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Order #{1000 + item}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Custom aluminum brackets
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">$2,350</p>
                    <p className="text-xs text-success-600 dark:text-success-400">In Progress</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Capacity Overview */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Production Capacity</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { name: 'CNC Machining', utilization: 75, available: 25 },
              { name: 'Sheet Metal', utilization: 60, available: 40 },
              { name: 'Assembly', utilization: 90, available: 10 }
            ].map((capability) => (
              <div key={capability.name} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">{capability.name}</h4>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{capability.utilization}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full" 
                    style={{ width: `${capability.utilization}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {capability.available}% available capacity
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
    <p className="text-gray-600">Welcome to the admin dashboard.</p>
  </div>
);

export const OrdersPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Orders</h1>
    <p className="text-gray-600">Manage your orders here.</p>
  </div>
);

export const CreateOrderPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Create Order</h1>
    <p className="text-gray-600">Create a new order.</p>
  </div>
);

export const OrderDetailPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Order Details</h1>
    <p className="text-gray-600">View order details.</p>
  </div>
);

export const EditOrderPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Edit Order</h1>
    <p className="text-gray-600">Edit your order.</p>
  </div>
);

export const QuotesPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Quotes</h1>
    <p className="text-gray-600">Manage your quotes here.</p>
  </div>
);

export const CreateQuotePage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Create Quote</h1>
    <p className="text-gray-600">Create a new quote.</p>
  </div>
);

export const QuoteDetailPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Quote Details</h1>
    <p className="text-gray-600">View quote details.</p>
  </div>
);

export const PaymentsPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Payments</h1>
    <p className="text-gray-600">Manage your payments here.</p>
  </div>
);

export const PaymentPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Payment</h1>
    <p className="text-gray-600">Complete your payment.</p>
  </div>
);

export const PaymentSuccessPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-success-600">Payment Successful</h1>
      <p className="text-gray-600">Your payment has been processed.</p>
    </div>
  </div>
);

export const PaymentFailedPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-error-600">Payment Failed</h1>
      <p className="text-gray-600">Your payment could not be processed.</p>
    </div>
  </div>
);

export const ProfilePage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Profile</h1>
    <p className="text-gray-600">Manage your profile.</p>
  </div>
);

export const ManufacturerProfilePage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Manufacturer Profile</h1>
    <p className="text-gray-600">Manage your manufacturer profile.</p>
  </div>
);

export const SettingsPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Settings</h1>
    <p className="text-gray-600">Manage your settings.</p>
  </div>
);

// AboutPage, ContactPage, PrivacyPage, and TermsPage have been moved to /pages/public/
// They are no longer placeholders but fully implemented pages. 