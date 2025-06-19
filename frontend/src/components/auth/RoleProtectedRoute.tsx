import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
  fallbackComponent?: React.ComponentType;
}

const UnauthorizedPage: React.FC<{ allowedRoles: UserRole[]; currentRole?: UserRole }> = ({ 
  allowedRoles, 
  currentRole 
}) => {
  const location = useLocation();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
        
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Required Role:</strong> {allowedRoles.join(' or ')}
          </p>
          {currentRole && (
            <p className="text-sm text-gray-700">
              <strong>Your Role:</strong> {currentRole}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Attempted to access: {location.pathname}
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    </div>
  );
};

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo,
  fallbackComponent: FallbackComponent
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role
  const hasRequiredRole = user && allowedRoles.includes(user.role);

  if (!hasRequiredRole) {
    // Use custom fallback component if provided
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    // Use custom redirect if provided
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    // Show unauthorized page by default
    return <UnauthorizedPage allowedRoles={allowedRoles} currentRole={user?.role} />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute; 