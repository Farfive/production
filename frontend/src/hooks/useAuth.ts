import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi, queryKeys, tokenManager } from '../lib/api';
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

export const useAuth = (): AuthState & AuthActions => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Get user profile query
  const {
    data: user,
    isLoading,
    error,
    refetch: refresh,
  } = useQuery({
    queryKey: queryKeys.auth.profile,
    queryFn: authApi.getProfile,
    enabled: !!tokenManager.getAccessToken(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isAuthenticated = !!user && !!tokenManager.getAccessToken();

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
    onSuccess: (updatedUser) => {
      // Update user data in cache
      queryClient.setQueryData(queryKeys.auth.profile, updatedUser);
      toast.success('Profile updated successfully!');
    },
    onError: (error: any) => {
      console.error('Update profile error:', error);
      toast.error(error.message || 'Failed to update profile.');
    },
  });

  // Helper function to get redirect path based on user role
  const getRedirectPath = (role: UserRole): string => {
    switch (role) {
      case UserRole.CLIENT:
        return '/dashboard/client';
      case UserRole.MANUFACTURER:
        return '/dashboard/manufacturer';
      case UserRole.ADMIN:
        return '/admin/dashboard';
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

  return {
    // State
    user: user || null,
    isAuthenticated,
    isLoading: isLoading || 
               loginMutation.isPending || 
               registerMutation.isPending || 
               logoutMutation.isPending,
    error: error?.message || null,

    // Actions
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

// Hook to check if user has specific role
export const useRole = (requiredRole: UserRole | UserRole[]) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !user) {
    return false;
  }

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(user.role);
};

// Hook to check if user is a client
export const useIsClient = () => {
  return useRole(UserRole.CLIENT);
};

// Hook to check if user is a manufacturer
export const useIsManufacturer = () => {
  return useRole(UserRole.MANUFACTURER);
};

// Hook to check if user is an admin
export const useIsAdmin = () => {
  return useRole(UserRole.ADMIN);
};

// Hook to require authentication (redirects if not authenticated)
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

// Hook to require specific role (redirects if not authorized)
export const useRequireRole = (
  requiredRole: UserRole | UserRole[], 
  redirectTo: string = '/unauthorized'
) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const hasRole = useRole(requiredRole);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !hasRole) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, hasRole, navigate, redirectTo]);

  return { hasRole, isLoading, user };
};

export default useAuth; 