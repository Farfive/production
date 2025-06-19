import React, { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, UserRole } from '../types';
import { environment } from '../config/environment';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  role: UserRole;
  dataProcessingConsent: boolean;
  marketingConsent: boolean;
}

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  verifyEmail: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (oobCode: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

export const useBackendAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Helper function to make API calls
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${environment.apiUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return response.json();
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiCall('/auth/login-json', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      // Store tokens
      localStorage.setItem('accessToken', response.access_token);
      if (response.refresh_token) {
        localStorage.setItem('refreshToken', response.refresh_token);
      }

      // Set user data
      setUser(response.user);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Transform credentials to match backend API
      const registerData = {
        email: credentials.email,
        password: credentials.password,
        first_name: credentials.firstName,
        last_name: credentials.lastName,
        company_name: credentials.companyName,
        role: credentials.role,
        data_processing_consent: credentials.dataProcessingConsent,
        marketing_consent: credentials.marketingConsent,
      };

      const response = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerData),
      });

      setUser(response);
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call logout endpoint if available
      try {
        await apiCall('/auth/logout', { method: 'POST' });
      } catch (e) {
        // Don't fail logout if API call fails
        console.warn('Logout API call failed:', e);
      }

      // Clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      setUser(null);
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
      throw error;
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    if (user) {
      setUser({ ...user, ...data });
      toast.success('Profile updated successfully!');
    }
  };

  const verifyEmail = async (email: string): Promise<void> => {
    try {
      await apiCall('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      toast.success('Verification email sent!');
    } catch (error) {
      toast.error('Failed to send verification email');
      throw error;
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      await apiCall('/auth/password-reset-request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      toast.success('Password reset email sent!');
    } catch (error) {
      toast.error('Failed to send password reset email');
      throw error;
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    try {
      await apiCall('/auth/password-reset', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      toast.success('Password reset successfully!');
    } catch (error) {
      toast.error('Failed to reset password');
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      await apiCall('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ 
          current_password: currentPassword, 
          new_password: newPassword 
        }),
      });
      toast.success('Password updated successfully!');
    } catch (error) {
      toast.error('Failed to change password');
      throw error;
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    // For now, just show that Google sign-in is not available
    toast.error('Google sign-in is not available yet');
    throw new Error('Google sign-in not implemented for backend auth');
  };

  // Check for existing authentication on load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const response = await apiCall('/auth/me');
          setUser(response);
        }
      } catch (error) {
        // Token might be expired, clear it
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile,
    verifyEmail,
    forgotPassword,
    resetPassword,
    changePassword,
    signInWithGoogle
  };
};

export const BackendAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authValue = useBackendAuth();
  return React.createElement(AuthContext.Provider, { value: authValue }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a BackendAuthProvider');
  }
  return context;
};

// Helper hooks for role-based access
export const useRole = (requiredRole: UserRole | UserRole[]) => {
  const { user } = useAuth();
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return user ? roles.includes(user.role) : false;
};

export const useIsClient = () => {
  return useRole(UserRole.CLIENT);
};

export const useIsManufacturer = () => {
  return useRole(UserRole.MANUFACTURER);
};

export const useIsAdmin = () => {
  return useRole(UserRole.ADMIN);
};

export const useRequireAuth = (redirectTo: string = '/login') => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  return { isAuthenticated, isLoading };
};

export const useRequireRole = (
  requiredRole: UserRole | UserRole[], 
  redirectTo: string = '/unauthorized'
) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const hasRole = useRole(requiredRole);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasRole) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, hasRole, navigate, redirectTo]);

  return { hasRole, isLoading };
};

export default useBackendAuth; 