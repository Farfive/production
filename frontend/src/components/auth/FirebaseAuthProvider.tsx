import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useFirebaseAuth, ManufacturingUser, FirebaseAuthHook } from '../../hooks/useFirebaseAuth';

// Create the authentication context
const FirebaseAuthContext = createContext<FirebaseAuthHook | null>(null);

// Props for the provider component
interface FirebaseAuthProviderProps {
  children: ReactNode;
}

// Firebase Auth Provider Component
export const FirebaseAuthProvider: React.FC<FirebaseAuthProviderProps> = ({ children }) => {
  const auth = useFirebaseAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Mark as initialized once we have initial auth state
    if (!auth.loading) {
      setIsInitialized(true);
    }
  }, [auth.loading]);

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-4 text-lg font-medium text-gray-900">Loading Authentication...</h2>
          <p className="mt-2 text-sm text-gray-600">Please wait while we initialize the app</p>
        </div>
      </div>
    );
  }

  return (
    <FirebaseAuthContext.Provider value={auth}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};

// Custom hook to use the Firebase auth context
export const useFirebaseAuthContext = (): FirebaseAuthHook => {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error('useFirebaseAuthContext must be used within a FirebaseAuthProvider');
  }
  return context;
};

// HOC for protected routes
interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermission,
  fallback = <div>You don't have permission to access this page.</div>
}) => {
  const { user, loading, error } = useFirebaseAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-red-600">Authentication Error</h2>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900">Please Sign In</h2>
          <p className="mt-2 text-sm text-gray-600">You need to be signed in to access this page.</p>
        </div>
      </div>
    );
  }

  if (requiredPermission && !user.permissions.includes(requiredPermission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Role-based route protection
interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles: Array<'client' | 'manufacturer' | 'admin'>;
  fallback?: ReactNode;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  allowedRoles,
  fallback = <div>You don't have the required role to access this page.</div>
}) => {
  const { user, loading } = useFirebaseAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900">Please Sign In</h2>
          <p className="mt-2 text-sm text-gray-600">You need to be signed in to access this page.</p>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default FirebaseAuthProvider; 