import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, UserRole } from '../types';

// Make Firebase imports optional
let auth: any = null;
let onAuthStateChanged: any = null;
let signInWithEmailAndPassword: any = null;
let createUserWithEmailAndPassword: any = null;
let signInWithPopup: any = null;
let GoogleAuthProvider: any = null;
let signOut: any = null;
let updateProfile: any = null;
let getIdTokenResult: any = null;
let sendEmailVerification: any = null;
let sendPasswordResetEmail: any = null;

let FIREBASE_AVAILABLE = false;

try {
  const firebaseAuth = require('firebase/auth');
  const firebaseConfig = require('../config/firebase');
  
  auth = firebaseConfig.auth;
  onAuthStateChanged = firebaseAuth.onAuthStateChanged;
  signInWithEmailAndPassword = firebaseAuth.signInWithEmailAndPassword;
  createUserWithEmailAndPassword = firebaseAuth.createUserWithEmailAndPassword;
  signInWithPopup = firebaseAuth.signInWithPopup;
  GoogleAuthProvider = firebaseAuth.GoogleAuthProvider;
  signOut = firebaseAuth.signOut;
  updateProfile = firebaseAuth.updateProfile;
  getIdTokenResult = firebaseAuth.getIdTokenResult;
  sendEmailVerification = firebaseAuth.sendEmailVerification;
  sendPasswordResetEmail = firebaseAuth.sendPasswordResetEmail;
  
  FIREBASE_AVAILABLE = true;
} catch (error) {
  console.warn('Firebase not available:', error);
  FIREBASE_AVAILABLE = false;
}

// Types for manufacturing platform
export interface ManufacturingUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  photoURL: string | null;
  phoneNumber: string | null;
  // Custom fields for our platform
  role: 'client' | 'manufacturer' | 'admin';
  companyName?: string;
  firstName?: string;
  lastName?: string;
  permissions: string[];
  registrationCompleted: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  role: 'client' | 'manufacturer';
}

export interface AuthError {
  code: string;
  message: string;
}

export interface FirebaseAuthHook {
  user: ManufacturingUser | null;
  loading: boolean;
  error: string | null;
  signInWithEmail: (email: string, password: string) => Promise<ManufacturingUser | null>;
  signUpWithEmail: (signUpData: SignUpData) => Promise<ManufacturingUser | null>;
  signInWithGoogle: () => Promise<ManufacturingUser | null>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Partial<ManufacturingUser>) => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

export const useFirebaseAuth = (): FirebaseAuthHook => {
  const [user, setUser] = useState<ManufacturingUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!FIREBASE_AVAILABLE) {
      setLoading(false);
      setError('Firebase not available - please install firebase package');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
      try {
        if (firebaseUser) {
          // Get ID token with custom claims
          const tokenResult = await getIdTokenResult(firebaseUser);
          const customClaims = tokenResult.claims;
          
          // Convert Firebase user to our ManufacturingUser
          const manufacturingUser: ManufacturingUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            emailVerified: firebaseUser.emailVerified,
            photoURL: firebaseUser.photoURL,
            phoneNumber: firebaseUser.phoneNumber,
            role: customClaims?.role || 'client',
            companyName: customClaims?.company_name,
            firstName: customClaims?.first_name || firebaseUser.displayName?.split(' ')[0],
            lastName: customClaims?.last_name || firebaseUser.displayName?.split(' ')[1],
            permissions: customClaims?.permissions || [],
            registrationCompleted: customClaims?.registration_completed || false
          };
          
          setUser(manufacturingUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<ManufacturingUser | null> => {
    if (!FIREBASE_AVAILABLE) {
      setError('Firebase not available');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Sync with our backend
      const token = await firebaseUser.getIdToken();
      await syncWithBackend(token);
      
      return user; // Will be updated by onAuthStateChanged
    } catch (err: any) {
      const errorMessage = getFirebaseErrorMessage(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const signUpWithEmail = useCallback(async (signUpData: SignUpData): Promise<ManufacturingUser | null> => {
    if (!FIREBASE_AVAILABLE) {
      setError('Firebase not available');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, signUpData.email, signUpData.password);
      const firebaseUser = userCredential.user;
      
      // Update profile with display name
      await updateProfile(firebaseUser, {
        displayName: `${signUpData.firstName} ${signUpData.lastName}`
      });
      
      // Complete registration with our backend
      const token = await firebaseUser.getIdToken();
      await completeRegistration(token, signUpData);
      
      return user; // Will be updated by onAuthStateChanged
    } catch (err: any) {
      const errorMessage = getFirebaseErrorMessage(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const signInWithGoogle = useCallback(async (): Promise<ManufacturingUser | null> => {
    if (!FIREBASE_AVAILABLE) {
      setError('Firebase not available');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      // Complete Google sign-in with our backend
      const token = await firebaseUser.getIdToken();
      await completeGoogleSignIn(token);
      
      return user; // Will be updated by onAuthStateChanged
    } catch (err: any) {
      const errorMessage = getFirebaseErrorMessage(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleSignOut = useCallback(async (): Promise<void> => {
    if (!FIREBASE_AVAILABLE) {
      setError('Firebase not available');
      return;
    }

    try {
      setLoading(true);
      await signOut(auth);
    } catch (err: any) {
      const errorMessage = getFirebaseErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserProfile = useCallback(async (data: Partial<ManufacturingUser>): Promise<void> => {
    if (!FIREBASE_AVAILABLE) {
      setError('Firebase not available');
      return;
    }

    if (!user) {
      setError('No user logged in');
      return;
    }

    try {
      setLoading(true);
      
      // Update Firebase profile if needed
      if (data.displayName || data.firstName || data.lastName) {
        const displayName = data.displayName || `${data.firstName} ${data.lastName}`;
        await updateProfile(auth.currentUser, { displayName });
      }
      
      // Update backend with new data
      const token = await auth.currentUser.getIdToken();
      await updateBackendProfile(token, data);
      
    } catch (err: any) {
      const errorMessage = getFirebaseErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!FIREBASE_AVAILABLE) {
      setError('Firebase not available');
      return null;
    }

    if (!auth.currentUser) {
      return null;
    }

    try {
      return await auth.currentUser.getIdToken(true); // Force refresh
    } catch (err: any) {
      const errorMessage = getFirebaseErrorMessage(err);
      setError(errorMessage);
      return null;
    }
  }, []);

  return {
    user,
    loading,
    error,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut: handleSignOut,
    updateUserProfile,
    refreshToken
  };
};

// Helper function to get user-friendly error messages
function getFirebaseErrorMessage(error: any): string {
  if (!error?.code) return error?.message || 'An unknown error occurred';
  
  switch (error.code) {
    case 'auth/user-not-found':
      return 'No account found with this email address';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection';
    case 'auth/popup-closed-by-user':
      return 'Sign-in cancelled';
    default:
      return error.message || 'Authentication failed';
  }
}

// Backend integration functions
async function syncWithBackend(token: string): Promise<void> {
  try {
    const response = await fetch('/api/v1/auth/firebase-sync', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to sync with backend');
    }
  } catch (error) {
    console.error('Backend sync error:', error);
    // Don't throw - this is not critical for frontend operation
  }
}

async function completeRegistration(token: string, signUpData: SignUpData): Promise<void> {
  try {
    const response = await fetch('/api/v1/auth/firebase-complete-registration', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        first_name: signUpData.firstName,
        last_name: signUpData.lastName,
        company_name: signUpData.companyName,
        role: signUpData.role
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to complete registration');
    }
  } catch (error) {
    console.error('Registration completion error:', error);
    throw error;
  }
}

async function completeGoogleSignIn(token: string): Promise<void> {
  try {
    const response = await fetch('/api/v1/auth/firebase-google-signin', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to complete Google sign-in');
    }
  } catch (error) {
    console.error('Google sign-in completion error:', error);
    // Don't throw - this is not critical for frontend operation
  }
}

async function updateBackendProfile(token: string, data: Partial<ManufacturingUser>): Promise<void> {
  try {
    const response = await fetch('/api/v1/auth/firebase-sync', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        custom_claims: {
          first_name: data.firstName,
          last_name: data.lastName,
          company_name: data.companyName,
          role: data.role
        }
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
  } catch (error) {
    console.error('Profile update error:', error);
    throw error;
  }
}

export default useFirebaseAuth; 