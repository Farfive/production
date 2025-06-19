// Firebase Configuration for Production Manufacturing Platform
// Using your project: production-1e74f

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Production Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBGBJg_I6XGm1WMcRDZc7U-mtvHq6rq3sc",
  authDomain: "production-1e74f.firebaseapp.com", 
  projectId: "production-1e74f",
  storageBucket: "production-1e74f.firebasestorage.app",
  messagingSenderId: "542416169641",
  appId: "1:542416169641:web:2757093591b61e811357b8",
  measurementId: "G-PTVS4KQSJ9"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics
if (typeof window !== 'undefined') {
  try {
    getAnalytics(app);
  } catch (error) {
    console.warn('Analytics initialization failed:', error);
  }
}

export default app; 