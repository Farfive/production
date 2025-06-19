import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import * as Sentry from '@sentry/react';
import { environment } from './config/environment';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserRole } from './types';
import BeautifulSidebar from './components/layout/BeautifulSidebar';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import RoleDashboardRedirect from './components/auth/RoleDashboardRedirect';
import AnalyticsPage from './pages/AnalyticsPage';
import AIPage from './pages/AIPage';
import EnterprisePage from './pages/EnterprisePage';
import ManufacturingPage from './pages/ManufacturingPage';
import OrderManagementPage from './pages/OrderManagementPage';
import ProductionPage from './pages/ProductionPage';
import SupplyChainPage from './pages/SupplyChainPage';
import QuotesPage from './pages/QuotesPage';
import DocumentsPage from './pages/DocumentsPage';
import NotificationsPage from './pages/NotificationsPage';
import PortfolioPage from './pages/PortfolioPage';
import PaymentsPage from './pages/PaymentsPage';
import InvoicesPage from './pages/InvoicesPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import ProductionQuoteDiscovery from './pages/ProductionQuoteDiscovery';
import SmartMatchingPage from './pages/SmartMatchingPage';
import CreateQuotePage from './pages/quotes/CreateQuotePage';
import QuoteWorkflowPage from './pages/quotes/QuoteWorkflowPage';
import AdvancedQuotesPage from './pages/quotes/AdvancedQuotesPage';
import CreateOrderPage from './pages/orders/CreateOrderPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import HomePage from './pages/public/HomePage';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';
import PrivacyPage from './pages/public/PrivacyPage';
import TermsPage from './pages/public/TermsPage';
// Dashboard pages
import ClientDashboard from './pages/dashboard/ClientDashboard';
import ManufacturerDashboard from './pages/dashboard/ManufacturerDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import MandatoryEscrowDashboard from './components/dashboard/MandatoryEscrowDashboard';
import AdminAnalytics from './components/dashboard/AdminAnalytics';
import UserManagement from './components/dashboard/UserManagement';
import RoleTestPage from './components/auth/RoleTestPage';
import NavigationTestPage from './components/navigation/NavigationTestPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (renamed from cacheTime in v5)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          if (error?.response?.status === 408 || error?.response?.status === 429) {
            return failureCount < 2;
          }
          return false;
        }
        // Retry on network errors and 5xx errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

// Initialize Sentry for error monitoring
if (environment.features.enableErrorMonitoring && environment.sentry.dsn) {
  Sentry.init({
    dsn: environment.sentry.dsn,
    environment: environment.sentry.environment,
    tracesSampleRate: environment.sentry.tracesSampleRate,
    integrations: [
      new Sentry.BrowserTracing(),
    ],
    beforeSend(event) {
      // Filter out development errors
      if (environment.isDevelopment) {
        return null;
      }
      return event;
    },
  });
}

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Layout Component for authenticated pages
const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    // Initialize CSS custom property
    document.documentElement.style.setProperty('--sidebar-width', '280px');
    
    // Add mobile responsiveness
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        document.documentElement.style.setProperty('--sidebar-width', '0px');
      } else {
        const isCollapsed = document.documentElement.style.getPropertyValue('--sidebar-collapsed') === 'true';
        document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '80px' : '280px');
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call once on mount

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <BeautifulSidebar />
      <main 
        className="transition-all duration-300 overflow-auto min-h-screen p-6 lg:ml-[var(--sidebar-width,280px)]"
        style={{ 
          marginLeft: window.innerWidth >= 1024 ? 'var(--sidebar-width, 280px)' : '0px'
        }}
      >
        {children}
      </main>
    </div>
  );
};

// Auth Guard for login/register pages
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes - Main Landing Page */}
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            
            {/* Authentication Routes - Only accessible when not logged in */}
            <Route path="/login" element={
              <AuthGuard>
                <LoginPage />
              </AuthGuard>
            } />
            <Route path="/register" element={
              <AuthGuard>
                <RegisterPage />
              </AuthGuard>
            } />
            <Route path="/forgot-password" element={
              <AuthGuard>
                <ForgotPasswordPage />
              </AuthGuard>
            } />
            <Route path="/reset-password" element={
              <AuthGuard>
                <ResetPasswordPage />
              </AuthGuard>
            } />
            
            {/* Protected Dashboard Routes - Role-based redirect */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <RoleDashboardRedirect />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* Role-specific dashboard routes */}
            <Route path="/dashboard/client" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT]}>
                <DashboardLayout>
                  <ClientDashboard />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/manufacturer" element={
              <RoleProtectedRoute allowedRoles={[UserRole.MANUFACTURER]}>
                <DashboardLayout>
                  <ManufacturerDashboard />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/admin" element={
              <RoleProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <DashboardLayout>
                  <AdminDashboard />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            {/* Feature-specific dashboard routes - Accessible by all authenticated users */}
            <Route path="/dashboard/analytics" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <AnalyticsPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/ai" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <AIPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/enterprise" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <EnterprisePage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/manufacturing" element={
              <RoleProtectedRoute allowedRoles={[UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <ManufacturingPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/orders" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <OrderManagementPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/orders/create" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.ADMIN]}>
                <DashboardLayout>
                  <CreateOrderPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/orders/create" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.ADMIN]}>
                <DashboardLayout>
                  <CreateOrderPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/quotes" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <QuotesPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/quotes/advanced" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <AdvancedQuotesPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            {/* Quote Creation Routes */}
            <Route path="/quotes/create" element={
              <RoleProtectedRoute allowedRoles={[UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <CreateQuotePage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/quotes/create" element={
              <RoleProtectedRoute allowedRoles={[UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <CreateQuotePage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            {/* Quote Workflow Routes */}
            <Route path="/quotes/order/:orderId" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <QuoteWorkflowPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/quotes/order/:orderId" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <QuoteWorkflowPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/quotes/:quoteId" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <QuoteWorkflowPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/quotes/:quoteId" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <QuoteWorkflowPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/quotes/:quoteId/edit" element={
              <RoleProtectedRoute allowedRoles={[UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <QuoteWorkflowPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/production-quotes" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.ADMIN]}>
                <DashboardLayout>
                  <ProductionQuoteDiscovery />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/smart-matching" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <SmartMatchingPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/portfolio" element={
              <RoleProtectedRoute allowedRoles={[UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <PortfolioPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/documents" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <DocumentsPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/subscriptions" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <SubscriptionsPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/payments" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <PaymentsPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/invoices" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <InvoicesPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/notifications" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <NotificationsPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/settings" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/profile" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <ProfilePage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            {/* Role Testing Route - For development/testing purposes */}
            <Route path="/dashboard/role-test" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <RoleTestPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            {/* Navigation Testing Route - For development/testing purposes */}
            <Route path="/dashboard/navigation-test" element={
              <RoleProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <NavigationTestPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/production" element={
              <RoleProtectedRoute allowedRoles={[UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <ProductionPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            <Route path="/dashboard/supply-chain" element={
              <RoleProtectedRoute allowedRoles={[UserRole.MANUFACTURER, UserRole.ADMIN]}>
                <DashboardLayout>
                  <SupplyChainPage />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            
            {/* Admin Routes - Protected with role-based access */}
            <Route path="/admin/analytics" element={
              <RoleProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <AdminAnalytics />
              </RoleProtectedRoute>
            } />
            <Route path="/admin/escrow" element={
              <RoleProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <MandatoryEscrowDashboard />
              </RoleProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <RoleProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <UserManagement />
              </RoleProtectedRoute>
            } />
            
            {/* Legacy routes - redirect to new structure */}
            <Route path="/analytics" element={<Navigate to="/dashboard/analytics" />} />
            <Route path="/ai" element={<Navigate to="/dashboard/ai" />} />
            <Route path="/enterprise" element={<Navigate to="/dashboard/enterprise" />} />
            <Route path="/manufacturing" element={<Navigate to="/dashboard/manufacturing" />} />
            <Route path="/orders" element={<Navigate to="/dashboard/orders" />} />
            <Route path="/quotes" element={<Navigate to="/dashboard/quotes" />} />
            <Route path="/portfolio" element={<Navigate to="/dashboard/portfolio" />} />
            <Route path="/documents" element={<Navigate to="/dashboard/documents" />} />
            <Route path="/subscriptions" element={<Navigate to="/dashboard/subscriptions" />} />
            <Route path="/payments" element={<Navigate to="/dashboard/payments" />} />
            <Route path="/invoices" element={<Navigate to="/dashboard/invoices" />} />
            <Route path="/notifications" element={<Navigate to="/dashboard/notifications" />} />
            <Route path="/settings" element={<Navigate to="/dashboard/settings" />} />
            <Route path="/profile" element={<Navigate to="/dashboard/profile" />} />
            <Route path="/production" element={<Navigate to="/dashboard/production" />} />
            <Route path="/supply-chain" element={<Navigate to="/dashboard/supply-chain" />} />
            
            {/* Catch all route - redirect to home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AuthProvider>
      {/* React Query Devtools - only in development */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

export default App; 