import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

/**
 * Component that redirects users to their role-specific dashboard
 * Used for the base /dashboard route to automatically redirect users
 */
const RoleDashboardRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

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

  // Redirect based on user role
  switch (user?.role) {
    case UserRole.CLIENT:
      return <Navigate to="/dashboard/client" replace />;
    case UserRole.MANUFACTURER:
      return <Navigate to="/dashboard/manufacturer" replace />;
    case UserRole.ADMIN:
      return <Navigate to="/dashboard/admin" replace />;
    default:
      // Fallback to analytics for unknown roles
      return <Navigate to="/dashboard/analytics" replace />;
  }
};

export default RoleDashboardRedirect; 