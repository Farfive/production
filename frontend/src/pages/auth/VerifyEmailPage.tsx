import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { authApi } from '../../lib/api';
import { measureApiCall } from '../../lib/performance';
import { toast } from 'react-hot-toast';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error' | 'expired'>('verifying');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const verificationToken = searchParams.get('token');
    const userEmail = searchParams.get('email');
    
    if (userEmail) {
      setEmail(userEmail);
    }
    
    if (verificationToken) {
      verifyEmailMutation.mutate(verificationToken);
    } else {
      setVerificationStatus('error');
    }
  }, [searchParams]);

  const verifyEmailMutation = useMutation({
    mutationFn: async (token: string) => {
      return measureApiCall('auth.verifyEmail', () => authApi.verifyEmail(token));
    },
    onSuccess: () => {
      setVerificationStatus('success');
      toast.success('Email verified successfully');
      setTimeout(() => {
        navigate('/auth/login');
      }, 3000);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message;
      if (errorMessage?.includes('expired')) {
        setVerificationStatus('expired');
      } else {
        setVerificationStatus('error');
      }
      toast.error(errorMessage || 'Verification failed');
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async (email: string) => {
      return measureApiCall('auth.resendVerification', () => authApi.resendVerificationEmail(email));
    },
    onSuccess: () => {
      toast.success('Verification email sent');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to send verification email');
    },
  });

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Email Verified!</h1>
          <p className="text-gray-600 mb-6">Your email has been verified successfully.</p>
          <Link to="/auth/login" className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors inline-block">
            Continue to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <Mail className="h-16 w-16 text-blue-600 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Verify Your Email</h1>
        <p className="text-gray-600 mb-6">We've sent a verification link to your email address.</p>
        {email && (
          <button
            onClick={() => resendVerificationMutation.mutate(email)}
            disabled={resendVerificationMutation.isPending}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {resendVerificationMutation.isPending ? 'Sending...' : 'Resend Verification Email'}
          </button>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage; 