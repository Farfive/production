import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi, queryKeys, tokenManager } from '../lib/api';
import { environment } from '../config/environment';
import { 
  User, 
  LoginCredentials, 
  RegisterData, 
  AuthResponse,
  UserRole 
} from '../types';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refresh: () => void;
}

// MOCK USER FOR TESTING - REMOVE IN PRODUCTION
const MOCK_CLIENT_USER: User = {
  id: 1,
  email: 'test.client@example.com',
  firstName: 'John',
  lastName: 'Doe',
  fullName: 'John Doe',
  role: UserRole.CLIENT,
  isVerified: true,
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  phone: '+1 (555) 123-4567',
  country: 'United States',
  timezone: 'America/New_York',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

export const useAuth = (): AuthState & AuthActions => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Check if we're using mock authentication
  const useMockAuth = environment.useMockAuth;

  // Get user profile query with real API integration
  const {
    data: userData,
    isLoading: queryLoading,
    error: queryError,
    refetch: refreshProfile,
  } = useQuery({
    queryKey: queryKeys.auth.profile,
    queryFn: authApi.getProfile,
    enabled: !!tokenManager.getAccessToken() && !useMockAuth,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use mock user in development if specified
  const user = useMockAuth ? MOCK_CLIENT_USER : (userData || null);
  const isAuthenticated = useMockAuth ? true : (!!userData && !!tokenManager.getAccessToken());
  const isLoading = useMockAuth ? false : queryLoading;
  const error = useMockAuth ? null : (queryError?.message || null);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data: AuthResponse) => {
      // Store tokens
      tokenManager.setAccessToken(data.accessToken);
      tokenManager.setRefreshToken(data.refreshToken);
      
      // Update user data in cache
      queryClient.setQueryData(queryKeys.auth.profile, data.user);
      
      // Show success message
      toast.success(`Welcome back, ${data.user.firstName}!`);
      
      // Navigate based on user role
      const redirectPath = getRedirectPath(data.user.role);
      navigate(redirectPath, { replace: true });
    },
    onError: (error: any) => {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please try again.');
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: async (data: AuthResponse) => {
      // Store tokens
      tokenManager.setAccessToken(data.accessToken);
      tokenManager.setRefreshToken(data.refreshToken);
      
      // Update user data in cache
      queryClient.setQueryData(queryKeys.auth.profile, data.user);
      
      // Show success message
      toast.success(`Welcome, ${data.user.firstName}! Please verify your email.`);
      
      // Navigate to email verification or role-specific dashboard
      if (!data.user.isVerified) {
        navigate('/verify-email', { replace: true });
      } else {
        const redirectPath = getRedirectPath(data.user.role);
        navigate(redirectPath, { replace: true });
      }
    },
    onError: (error: any) => {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Clear tokens
      tokenManager.clearTokens();
      
      // Clear all cached data
      queryClient.clear();
      
      // Navigate to login
      navigate('/login', { replace: true });
      
      toast.success('Logged out successfully');
    },
    onError: (error: any) => {
      console.error('Logout error:', error);
      // Still clear tokens and navigate even if API call fails
      tokenManager.clearTokens();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  // Email verification mutation
  const verifyEmailMutation = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: () => {
      // Refresh user profile to get updated verification status
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile });
      toast.success('Email verified successfully!');
      
      // Navigate to dashboard
      if (user) {
        const redirectPath = getRedirectPath(user.role);
        navigate(redirectPath, { replace: true });
      }
    },
    onError: (error: any) => {
      console.error('Email verification error:', error);
      toast.error(error.message || 'Email verification failed.');
    },
  });

  // Resend verification mutation
  const resendVerificationMutation = useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: () => {
      toast.success('Verification email sent!');
    },
    onError: (error: any) => {
      console.error('Resend verification error:', error);
      toast.error(error.message || 'Failed to send verification email.');
    },
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      toast.success('Password reset email sent!');
    },
    onError: (error: any) => {
      console.error('Forgot password error:', error);
      toast.error(error.message || 'Failed to send password reset email.');
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authApi.resetPassword(token, password),
    onSuccess: () => {
      toast.success('Password reset successfully!');
      navigate('/login', { replace: true });
    },
    onError: (error: any) => {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to reset password.');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully!');
    },
    onError: (error: any) => {
      console.error('Change password error:', error);
      toast.error(error.message || 'Failed to change password.');
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (updatedUser: User) => {
      // Update user data in cache
      queryClient.setQueryData(queryKeys.auth.profile, updatedUser);
      toast.success('Profile updated successfully!');
    },
    onError: (error: any) => {
      console.error('Update profile error:', error);
      toast.error(error.message || 'Failed to update profile.');
    },
  });

  // Helper function to get redirect path based on role
  const getRedirectPath = (role: UserRole): string => {
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

  // Action functions
  const login = async (credentials: LoginCredentials) => {
    await loginMutation.mutateAsync(credentials);
  };

  const register = async (data: RegisterData) => {
    await registerMutation.mutateAsync(data);
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  const verifyEmail = async (token: string) => {
    await verifyEmailMutation.mutateAsync(token);
  };

  const resendVerification = async () => {
    await resendVerificationMutation.mutateAsync();
  };

  const forgotPassword = async (email: string) => {
    await forgotPasswordMutation.mutateAsync(email);
  };

  const resetPassword = async (token: string, password: string) => {
    await resetPasswordMutation.mutateAsync({ token, password });
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
  };

  const updateProfile = async (data: Partial<User>) => {
    await updateProfileMutation.mutateAsync(data);
  };

  const refresh = () => {
    if (useMockAuth) {
      console.log('Mock refresh called');
      return;
    }
    refreshProfile();
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
    refresh,
  };
};

// Role-based hooks
export const useRole = (requiredRole: UserRole | UserRole[]) => {
  const { user } = useAuth();
  
  if (!user) return false;
  
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(user.role);
};

export const useIsClient = () => {
  const { user } = useAuth();
  return user?.role === UserRole.CLIENT;
};

export const useIsManufacturer = () => {
  const { user } = useAuth();
  return user?.role === UserRole.MANUFACTURER;
};

export const useIsAdmin = () => {
  const { user } = useAuth();
  return user?.role === UserRole.ADMIN;
};

export const useRequireAuth = (redirectTo: string = '/login') => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
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
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const hasRole = useRole(requiredRole);

  React.useEffect(() => {
    if (!isLoading && user && !hasRole) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, hasRole, isLoading, navigate, redirectTo]);

  return { hasRole, isLoading };
};

export default useAuth; 