import React, { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  auth
} from '../config/firebase';
import {
  User,
  UserRole
} from '../types';

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

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      
      if (firebaseUser) {
        try {
          // Get Firebase ID token
          const idToken = await firebaseUser.getIdToken();
          
          // Verify with backend and get user data
          let response;
          try {
            response = await fetch('http://localhost:8001/api/v1/auth/firebase-verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                firebase_uid: firebaseUser.uid,
                email: firebaseUser.email,
                email_verified: firebaseUser.emailVerified,
              }),
            });
          } catch (fetchError) {
            try {
              response = await fetch('http://localhost:8000/api/v1/auth/firebase-verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                  firebase_uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  email_verified: firebaseUser.emailVerified,
                }),
              });
            } catch (secondFetchError) {
              console.warn('Backend server not available for Firebase verification');
            }
          }

          if (response && response.ok) {
            const data = await response.json();
            setUser({
              ...data.user,
              firebaseUid: firebaseUser.uid,
              emailVerified: firebaseUser.emailVerified
            });
            localStorage.setItem('firebaseToken', idToken);
            if (data.access_token) {
              localStorage.setItem('accessToken', data.access_token);
            }
          } else {
            // Fallback: use Firebase user data if backend is unavailable
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              firstName: firebaseUser.displayName?.split(' ')[0] || '',
              lastName: firebaseUser.displayName?.split(' ')[1] || '',
              fullName: firebaseUser.displayName || firebaseUser.email || '',
              role: UserRole.CLIENT, // Default role
              isVerified: firebaseUser.emailVerified,
              emailVerified: firebaseUser.emailVerified,
              firebaseUid: firebaseUser.uid,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              preferences: {
                theme: 'light',
                language: 'en',
                notifications: true
              }
            });
            localStorage.setItem('firebaseToken', idToken);
          }
        } catch (error) {
          console.error('Error verifying Firebase user with backend:', error);
          setUser(null);
        }
      } else {
        setUser(null);
        localStorage.removeItem('firebaseToken');
        localStorage.removeItem('accessToken');
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auth methods
  const verifyEmail = async (email?: string): Promise<void> => {
    try {
      if (!auth.currentUser) {
        throw new Error('No user logged in');
      }
      
      await sendEmailVerification(auth.currentUser);
      toast.success('Verification email sent!');
    } catch (error: any) {
      console.error('Email verification error:', error);
      const errorMessage = error.message || 'Failed to send verification email';
      toast.error(errorMessage);
      throw error;
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      setError(null);
      
      await sendPasswordResetEmail(auth, email);
      
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Failed to send password reset email';
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email address';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many requests. Please try again later';
            break;
          default:
            errorMessage = error.message || 'Failed to send password reset email';
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  };

  const resetPassword = async (oobCode: string, newPassword: string): Promise<void> => {
    try {
      let response;
      try {
        response = await fetch('http://localhost:8001/api/v1/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            token: oobCode, 
            new_password: newPassword 
          }),
        });
      } catch (fetchError) {
        try {
          response = await fetch('http://localhost:8000/api/v1/auth/reset-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              token: oobCode, 
              new_password: newPassword 
            }),
          });
        } catch (secondFetchError) {
          throw new Error('Backend server is not available. Please try again later.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Password reset failed' }));
        throw new Error(errorData.detail || 'Password reset failed');
      }

      toast.success('Password reset successfully!');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to reset password';
      toast.error(errorMessage);
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('You must be logged in to change your password');
      }

      let response;
      try {
        response = await fetch('http://localhost:8001/api/v1/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            current_password: currentPassword,
            new_password: newPassword 
          }),
        });
      } catch (fetchError) {
        try {
          response = await fetch('http://localhost:8000/api/v1/auth/change-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ 
              current_password: currentPassword,
              new_password: newPassword 
            }),
          });
        } catch (secondFetchError) {
          throw new Error('Backend server is not available. Please try again later.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Password change failed' }));
        throw new Error(errorData.detail || 'Password change failed');
      }

      toast.success('Password changed successfully!');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to change password';
      toast.error(errorMessage);
      throw error;
    }
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Sign in with Firebase
      const firebaseUserCredential = await signInWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );
      const firebaseUser = firebaseUserCredential.user;
      
      // Get Firebase ID token
      const idToken = await firebaseUser.getIdToken();
      
      // Send Firebase ID token to backend for verification and session creation
      let response;
      try {
        response = await fetch('http://localhost:8001/api/v1/auth/firebase-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            firebase_uid: firebaseUser.uid,
            email: firebaseUser.email,
            email_verified: firebaseUser.emailVerified,
          }),
        });
      } catch (fetchError) {
        try {
          response = await fetch('http://localhost:8000/api/v1/auth/firebase-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              firebase_uid: firebaseUser.uid,
              email: firebaseUser.email,
              email_verified: firebaseUser.emailVerified,
            }),
          });
        } catch (secondFetchError) {
          // If backend is not available, still log in with Firebase only
          console.warn('Backend not available, using Firebase-only authentication');
          
          const transformedUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            firstName: firebaseUser.displayName?.split(' ')[0] || '',
            lastName: firebaseUser.displayName?.split(' ')[1] || '',
            fullName: firebaseUser.displayName || firebaseUser.email || '',
            role: UserRole.CLIENT, // Default role
            isVerified: firebaseUser.emailVerified,
            emailVerified: firebaseUser.emailVerified,
            firebaseUid: firebaseUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preferences: {
              theme: 'light',
              language: 'en',
              notifications: true
            }
          };
          
          setUser(transformedUser);
          localStorage.setItem('firebaseToken', idToken);
          toast.success('Login successful!');
          navigate('/dashboard');
          return;
        }
      }

      if (response && response.ok) {
        const data = await response.json();
        
        // Store tokens
        localStorage.setItem('firebaseToken', idToken);
        if (data.access_token) {
          localStorage.setItem('accessToken', data.access_token);
        }
        if (data.refresh_token) {
          localStorage.setItem('refreshToken', data.refresh_token);
        }

        // Set user data from backend
        setUser({
          ...data.user,
          firebaseUid: firebaseUser.uid,
          emailVerified: firebaseUser.emailVerified
        });
        
        toast.success('Login successful!');
        navigate('/dashboard');
      } else {
        // Backend response not ok, but Firebase login succeeded
        const errorData = response ? await response.json().catch(() => ({ detail: 'Authentication failed' })) : { detail: 'Backend unavailable' };
        throw new Error(errorData.detail || 'Authentication failed');
      }
    } catch (error: any) {
      console.error('Firebase login error:', error);
      
      // Handle specific Firebase errors
      let errorMessage = 'Login failed';
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email address';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection';
            break;
          default:
            errorMessage = error.message || 'Login failed';
        }
      } else {
        errorMessage = error.message || 'Login failed';
      }
      
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

      // Create Firebase user
      const firebaseUserCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );
      const firebaseUser = firebaseUserCredential.user;

      // Send email verification
      await sendEmailVerification(firebaseUser);
      
      // Get Firebase ID token
      const idToken = await firebaseUser.getIdToken();
      
      // Register user in backend
      let response;
      try {
        response = await fetch('http://localhost:8001/api/v1/auth/firebase-register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            firebase_uid: firebaseUser.uid,
            email: firebaseUser.email,
            first_name: credentials.firstName,
            last_name: credentials.lastName,
            company_name: credentials.companyName,
            role: credentials.role,
            data_processing_consent: credentials.dataProcessingConsent,
            marketing_consent: credentials.marketingConsent,
            email_verified: firebaseUser.emailVerified,
          }),
        });
      } catch (fetchError) {
        try {
          response = await fetch('http://localhost:8000/api/v1/auth/firebase-register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              firebase_uid: firebaseUser.uid,
              email: firebaseUser.email,
              first_name: credentials.firstName,
              last_name: credentials.lastName,
              company_name: credentials.companyName,
              role: credentials.role,
              data_processing_consent: credentials.dataProcessingConsent,
              marketing_consent: credentials.marketingConsent,
              email_verified: firebaseUser.emailVerified,
            }),
          });
        } catch (secondFetchError) {
          // If backend registration fails, delete the Firebase user
          await firebaseUser.delete();
          throw new Error('Backend server is not available. Please try again later.');
        }
      }

      if (!response || !response.ok) {
        // If backend registration fails, delete the Firebase user
        await firebaseUser.delete();
        const errorData = response ? await response.json().catch(() => ({ detail: 'Registration failed' })) : { detail: 'Backend unavailable' };
        throw new Error(errorData.detail || 'Registration failed');
      }

      const data = await response.json();
      
      // Store tokens
      localStorage.setItem('firebaseToken', idToken);
      if (data.access_token) {
        localStorage.setItem('accessToken', data.access_token);
      }

      toast.success('Account created successfully! Please check your email to verify your account.');
      
      // Set user data
      if (data.user) {
        setUser({
          ...data.user,
          firebaseUid: firebaseUser.uid,
          emailVerified: firebaseUser.emailVerified
        });
      }
      
      // Don't automatically redirect - let user verify email first
      navigate('/verify-email');
    } catch (error: any) {
      console.error('Firebase registration error:', error);
      
      // Handle specific Firebase errors
      let errorMessage = 'Registration failed';
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'An account with this email already exists';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please use at least 6 characters';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection';
            break;
          default:
            errorMessage = error.message || 'Registration failed';
        }
      } else {
        errorMessage = error.message || 'Registration failed';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Clear local storage
      localStorage.removeItem('firebaseToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Clear user state
      setUser(null);
      setError(null);
      
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Error during logout');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    if (user) {
      setUser({ ...user, ...data });
      toast.success('Profile updated successfully!');
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    toast.error('Google sign-in is not available yet');
    throw new Error('Google sign-in not implemented for backend auth');
  };

  useEffect(() => {
    // Check for existing token on load and validate with backend
    const token = localStorage.getItem('accessToken');
    if (token) {
      // TODO: Validate token with backend and restore user session
      // For now, just clear invalid tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    setIsLoading(false);
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authValue = useAuth();
  return React.createElement(AuthContext.Provider, { value: authValue }, children);
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
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

export default useAuth; 