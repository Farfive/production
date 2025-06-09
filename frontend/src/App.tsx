import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './lib/api';
import { useAuth } from './contexts/AuthContext';
import { UserRole } from './types';

// Layout Components
import DashboardLayout from './components/layout/DashboardLayout';
import AuthLayout from './components/layout/AuthLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';

// Dashboard Pages
import ClientDashboard from './pages/dashboard/ClientDashboard';
import ManufacturerDashboard from './pages/dashboard/ManufacturerDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';

// Public Pages
import HomePage from './pages/public/HomePage';

// Error Pages
import NotFoundPage from './pages/errors/NotFoundPage';

// Order Pages
import OrderManagementPage from './pages/orders/OrderManagementPage';
import OrderDetailPage from './pages/orders/OrderDetailPage';
import CreateOrderPage from './pages/orders/CreateOrderPage';
import EditOrderPage from './pages/orders/EditOrderPage';

// Quote Pages
import QuoteDetailPage from './pages/quotes/QuoteDetailPage';
import CreateQuotePage from './pages/quotes/CreateQuotePage';
import QuotesPage from './pages/quotes/QuotesPage';

// Payment Pages
import PaymentSuccessPage from './pages/payment/PaymentSuccessPage';
import PaymentFailurePage from './pages/payment/PaymentFailurePage';
import PaymentPage from './pages/payment/PaymentPage';
import PaymentsPage from './pages/payment/PaymentsPage';

// Profile Pages
import ProfilePage from './pages/profile/ProfilePage';
import ManufacturerProfilePage from './pages/profile/ManufacturerProfilePage';

// Settings Page
import SettingsPage from './pages/settings/SettingsPage';

// Debug Page
import DebugPage from './pages/debug/DebugPage';

// Placeholder components for missing pages
import {
  AboutPage,
  ContactPage,
  PrivacyPage,
  TermsPage,
  UnauthorizedPage,
  ErrorPage,
} from './components/placeholders';

// Components
import LoadingSpinner from './components/ui/LoadingSpinner';
import ThemeProvider from './components/providers/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';

// Error Fallback Component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ 
  error, 
  resetErrorBoundary 
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error-100 dark:bg-error-900">
          <svg className="h-6 w-6 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
          Something went wrong
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {error.message || 'An unexpected error occurred'}
        </p>
        <div className="mt-6">
          <button
            onClick={resetErrorBoundary}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  requireAuth = true 
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

// Public Route Component (redirects authenticated users)
interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated && user) {
    // Redirect to appropriate dashboard based on role
    const dashboardPath = getDashboardPath(user.role);
    return <Navigate to={dashboardPath} replace />;
  }

  return <>{children}</>;
};

// Helper function to get dashboard path based on user role
const getDashboardPath = (role: UserRole): string => {
  switch (role) {
    case UserRole.CLIENT:
      return '/dashboard/client';
    case UserRole.MANUFACTURER:
      return '/dashboard/manufacturer';
    case UserRole.ADMIN:
      return '/dashboard/admin';
    default:
      return '/dashboard';
  }
};

// Main App Component
const App: React.FC = () => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error) => {
        console.error('Application error:', error);
        // You can send to error reporting service here
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <Router>
              <div className="App">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />

                  {/* Auth Routes */}
                  <Route path="/login" element={
                    <PublicRoute>
                      <AuthLayout>
                        <LoginPage />
                      </AuthLayout>
                    </PublicRoute>
                  } />
                  
                  <Route path="/register" element={
                    <PublicRoute>
                      <AuthLayout>
                        <RegisterPage />
                      </AuthLayout>
                    </PublicRoute>
                  } />
                  
                  <Route path="/forgot-password" element={
                    <PublicRoute>
                      <AuthLayout>
                        <ForgotPasswordPage />
                      </AuthLayout>
                    </PublicRoute>
                  } />
                  
                  <Route path="/reset-password" element={
                    <PublicRoute>
                      <AuthLayout>
                        <ResetPasswordPage />
                      </AuthLayout>
                    </PublicRoute>
                  } />
                  
                  <Route path="/verify-email" element={
                    <PublicRoute>
                      <AuthLayout>
                        <VerifyEmailPage />
                      </AuthLayout>
                    </PublicRoute>
                  } />

                  {/* Dashboard Routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Navigate to="/dashboard/client" replace />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/dashboard/client" element={
                    <ProtectedRoute requiredRole={UserRole.CLIENT}>
                      <DashboardLayout>
                        <ClientDashboard />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/dashboard/manufacturer" element={
                    <ProtectedRoute requiredRole={UserRole.MANUFACTURER}>
                      <DashboardLayout>
                        <ManufacturerDashboard />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/dashboard/admin" element={
                    <ProtectedRoute requiredRole={UserRole.ADMIN}>
                      <DashboardLayout>
                        <AdminDashboard />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />

                  {/* Order Routes */}
                  <Route path="/orders" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <OrderManagementPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/orders/create" element={
                    <ProtectedRoute requiredRole={UserRole.CLIENT}>
                      <DashboardLayout>
                        <CreateOrderPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/orders/:id" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <OrderDetailPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/orders/:id/edit" element={
                    <ProtectedRoute requiredRole={UserRole.CLIENT}>
                      <DashboardLayout>
                        <EditOrderPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />

                  {/* Quote Routes */}
                  <Route path="/quotes" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <QuotesPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/quotes/create" element={
                    <ProtectedRoute requiredRole={UserRole.MANUFACTURER}>
                      <DashboardLayout>
                        <CreateQuotePage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/quotes/:id" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <QuoteDetailPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />

                  {/* Payment Routes */}
                  <Route path="/payments" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <PaymentsPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/payment/:orderId" element={
                    <ProtectedRoute requiredRole={UserRole.CLIENT}>
                      <DashboardLayout>
                        <PaymentPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/payment/success" element={
                    <ProtectedRoute>
                      <PaymentSuccessPage />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/payment/failed" element={
                    <ProtectedRoute>
                      <PaymentFailurePage />
                    </ProtectedRoute>
                  } />

                  {/* Profile Routes */}
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <ProfilePage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/profile/manufacturer" element={
                    <ProtectedRoute requiredRole={UserRole.MANUFACTURER}>
                      <DashboardLayout>
                        <ManufacturerProfilePage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <SettingsPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />

                  {/* Debug Routes (Development only) */}
                  {process.env.NODE_ENV === 'development' && (
                    <Route path="/debug" element={
                      <ProtectedRoute>
                        <DebugPage />
                      </ProtectedRoute>
                    } />
                  )}

                  {/* Error Routes */}
                  <Route path="/unauthorized" element={<UnauthorizedPage />} />
                  <Route path="/error" element={<ErrorPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>

                {/* Toast Notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: 'var(--toast-bg)',
                      color: 'var(--toast-color)',
                      border: '1px solid var(--toast-border)',
                    },
                    success: {
                      iconTheme: {
                        primary: '#22c55e',
                        secondary: '#ffffff',
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: '#ef4444',
                        secondary: '#ffffff',
                      },
                    },
                  }}
                />
              </div>
            </Router>
          </ThemeProvider>
        </AuthProvider>

        {/* React Query DevTools (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App; 