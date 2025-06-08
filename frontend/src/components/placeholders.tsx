import React from 'react';

// Placeholder components for missing pages
export const UnauthorizedPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold">Unauthorized</h1>
      <p className="text-gray-600">You don't have permission to access this page.</p>
    </div>
  </div>
);

export const ErrorPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold">Error</h1>
      <p className="text-gray-600">Something went wrong.</p>
    </div>
  </div>
);

export const ForgotPasswordPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold">Forgot Password</h1>
      <p className="text-gray-600">Reset your password.</p>
    </div>
  </div>
);

export const ResetPasswordPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold">Reset Password</h1>
      <p className="text-gray-600">Enter your new password.</p>
    </div>
  </div>
);

export const VerifyEmailPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold">Verify Email</h1>
      <p className="text-gray-600">Please check your email.</p>
    </div>
  </div>
);

export const ManufacturerDashboard: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Manufacturer Dashboard</h1>
    <p className="text-gray-600">Welcome to your manufacturer dashboard.</p>
  </div>
);

export const AdminDashboard: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
    <p className="text-gray-600">Welcome to the admin dashboard.</p>
  </div>
);

export const OrdersPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Orders</h1>
    <p className="text-gray-600">Manage your orders here.</p>
  </div>
);

export const CreateOrderPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Create Order</h1>
    <p className="text-gray-600">Create a new order.</p>
  </div>
);

export const OrderDetailPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Order Details</h1>
    <p className="text-gray-600">View order details.</p>
  </div>
);

export const EditOrderPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Edit Order</h1>
    <p className="text-gray-600">Edit your order.</p>
  </div>
);

export const QuotesPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Quotes</h1>
    <p className="text-gray-600">Manage your quotes here.</p>
  </div>
);

export const CreateQuotePage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Create Quote</h1>
    <p className="text-gray-600">Create a new quote.</p>
  </div>
);

export const QuoteDetailPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Quote Details</h1>
    <p className="text-gray-600">View quote details.</p>
  </div>
);

export const PaymentsPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Payments</h1>
    <p className="text-gray-600">Manage your payments here.</p>
  </div>
);

export const PaymentPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Payment</h1>
    <p className="text-gray-600">Complete your payment.</p>
  </div>
);

export const PaymentSuccessPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-success-600">Payment Successful</h1>
      <p className="text-gray-600">Your payment has been processed.</p>
    </div>
  </div>
);

export const PaymentFailedPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-error-600">Payment Failed</h1>
      <p className="text-gray-600">Your payment could not be processed.</p>
    </div>
  </div>
);

export const ProfilePage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Profile</h1>
    <p className="text-gray-600">Manage your profile.</p>
  </div>
);

export const ManufacturerProfilePage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Manufacturer Profile</h1>
    <p className="text-gray-600">Manage your manufacturer profile.</p>
  </div>
);

export const SettingsPage: React.FC = () => (
  <div>
    <h1 className="text-2xl font-bold">Settings</h1>
    <p className="text-gray-600">Manage your settings.</p>
  </div>
);

export const AboutPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold">About</h1>
      <p className="text-gray-600">Learn about our platform.</p>
    </div>
  </div>
);

export const ContactPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold">Contact</h1>
      <p className="text-gray-600">Get in touch with us.</p>
    </div>
  </div>
);

export const PrivacyPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="text-gray-600">Read our privacy policy.</p>
    </div>
  </div>
);

export const TermsPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold">Terms of Service</h1>
      <p className="text-gray-600">Read our terms of service.</p>
    </div>
  </div>
); 