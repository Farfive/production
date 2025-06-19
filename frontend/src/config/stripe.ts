// Stripe Configuration
export const stripeConfig = {
  publishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '',
  currency: 'usd',
  locale: 'en' as const,
};

// Stripe appearance customization for consistent UI
export const stripeAppearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#0ea5e9', // Match your app's primary color
    colorBackground: '#ffffff',
    colorText: '#1f2937',
    colorDanger: '#ef4444',
    fontFamily: 'Inter, system-ui, sans-serif',
    spacingUnit: '4px',
    borderRadius: '8px',
  },
  rules: {
    '.Input': {
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      padding: '12px',
    },
    '.Input:focus': {
      borderColor: '#0ea5e9',
      boxShadow: '0 0 0 2px rgba(14, 165, 233, 0.1)',
    },
    '.Label': {
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
    },
  },
}; 