import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Phone, MapPin, Building2, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const registerSchema = yup.object({
  firstName: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  lastName: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/\d/, 'Password must contain at least one number')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  role: yup
    .string()
    .oneOf([UserRole.CLIENT, UserRole.MANUFACTURER], 'Please select a valid role')
    .required('Please select your role'),
  phone: yup.string().optional(),
  country: yup.string().optional(),
  agreeToTerms: yup
    .boolean()
    .oneOf([true], 'You must agree to the Terms of Service')
    .required(),
});

type RegisterFormData = yup.InferType<typeof registerSchema>;

const RegisterPage: React.FC = () => {
  const { register: registerUser, isLoading, error } = useAuth();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: undefined,
      phone: '',
      country: '',
      agreeToTerms: false,
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role as UserRole,
        phone: data.phone || undefined,
        country: data.country || undefined,
      });
      // Navigation is handled by the useAuth hook
    } catch (err: any) {
      setError('root', {
        type: 'manual',
        message: err.message || 'Registration failed. Please try again.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-40 -left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-float"></div>
        <div className="absolute bottom-40 -right-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl relative z-10"
      >
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4"
          >
            <span className="text-2xl font-bold text-white">M</span>
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Create your account
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Join the Manufacturing Platform and connect with industry professionals
          </p>
        </div>

        {/* Registration Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700"
        >
          {/* Display general error */}
          {(error || errors.root) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg flex items-center space-x-3"
            >
              <AlertCircle className="h-5 w-5 text-error-600 dark:text-error-400 flex-shrink-0" />
              <p className="text-sm text-error-700 dark:text-error-300">
                {error || errors.root?.message}
              </p>
            </motion.div>
          )}

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              I want to join as a *
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <motion.label
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                  selectedRole === UserRole.CLIENT
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700'
                }`}
              >
                <input
                  {...register('role')}
                  type="radio"
                  value={UserRole.CLIENT}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <User className={`h-6 w-6 ${
                      selectedRole === UserRole.CLIENT
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-400'
                    }`} />
                  </div>
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${
                      selectedRole === UserRole.CLIENT
                        ? 'text-primary-900 dark:text-primary-100'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      Client
                    </h3>
                    <p className={`text-sm ${
                      selectedRole === UserRole.CLIENT
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      I need manufacturing services
                    </p>
                  </div>
                </div>
              </motion.label>

              <motion.label
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                  selectedRole === UserRole.MANUFACTURER
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700'
                }`}
              >
                <input
                  {...register('role')}
                  type="radio"
                  value={UserRole.MANUFACTURER}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building2 className={`h-6 w-6 ${
                      selectedRole === UserRole.MANUFACTURER
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-400'
                    }`} />
                  </div>
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${
                      selectedRole === UserRole.MANUFACTURER
                        ? 'text-primary-900 dark:text-primary-100'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      Manufacturer
                    </h3>
                    <p className={`text-sm ${
                      selectedRole === UserRole.MANUFACTURER
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      I provide manufacturing services
                    </p>
                  </div>
                </div>
              </motion.label>
            </div>
            {errors.role && (
              <p className="mt-1 text-sm text-error-600 dark:text-error-400">
                {errors.role.message}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                {...register('firstName')}
                label="First name"
                placeholder="Enter your first name"
                leftIcon={<User className="h-4 w-4" />}
                errorText={errors.firstName?.message}
                isRequired
                autoComplete="given-name"
              />

              <Input
                {...register('lastName')}
                label="Last name"
                placeholder="Enter your last name"
                leftIcon={<User className="h-4 w-4" />}
                errorText={errors.lastName?.message}
                isRequired
                autoComplete="family-name"
              />
            </div>

            {/* Email Field */}
            <Input
              {...register('email')}
              type="email"
              label="Email address"
              placeholder="Enter your email"
              leftIcon={<Mail className="h-4 w-4" />}
              errorText={errors.email?.message}
              isRequired
              autoComplete="email"
            />

            {/* Password Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                {...register('password')}
                type="password"
                label="Password"
                placeholder="Create a password"
                leftIcon={<Lock className="h-4 w-4" />}
                errorText={errors.password?.message}
                showPasswordToggle
                isRequired
                autoComplete="new-password"
              />

              <Input
                {...register('confirmPassword')}
                type="password"
                label="Confirm password"
                placeholder="Confirm your password"
                leftIcon={<Lock className="h-4 w-4" />}
                errorText={errors.confirmPassword?.message}
                showPasswordToggle
                isRequired
                autoComplete="new-password"
              />
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                {...register('phone')}
                type="tel"
                label="Phone number (optional)"
                placeholder="Enter your phone number"
                leftIcon={<Phone className="h-4 w-4" />}
                errorText={errors.phone?.message}
                autoComplete="tel"
              />

              <Input
                {...register('country')}
                label="Country (optional)"
                placeholder="Enter your country"
                leftIcon={<MapPin className="h-4 w-4" />}
                errorText={errors.country?.message}
                autoComplete="country"
              />
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  {...register('agreeToTerms')}
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              <div className="ml-3 text-sm">
                <label className="text-gray-700 dark:text-gray-300">
                  I agree to the{' '}
                  <Link
                    to="/terms"
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                  >
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link
                    to="/privacy"
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                  >
                    Privacy Policy
                  </Link>
                </label>
                {errors.agreeToTerms && (
                  <p className="mt-1 text-error-600 dark:text-error-400">
                    {errors.agreeToTerms.message}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              loading={isLoading || isSubmitting}
              loadingText="Creating account..."
              rightIcon={<ArrowRight className="h-4 w-4" />}
              className="h-12"
            >
              Create Account
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400"
        >
          <p>
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-gray-700 dark:hover:text-gray-300">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="underline hover:text-gray-700 dark:hover:text-gray-300">
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default RegisterPage; 