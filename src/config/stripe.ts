/**
 * Stripe Configuration
 * Centralized configuration for Stripe integration with environment variable handling
 */

// Environment variable validation and defaults
const getStripePublishableKey = (): string | undefined => {
  return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
};

const getStripeSecretKey = (): string | undefined => {
  // This is typically used in server-side functions
  return import.meta.env.STRIPE_SECRET_KEY;
};

const getUseStripePayments = (): boolean => {
  const value = import.meta.env.VITE_USE_STRIPE_PAYMENTS;
  return value === 'true' || value === true;
};

const getIsTestMode = (): boolean => {
  const publishableKey = getStripePublishableKey();
  return publishableKey?.startsWith('pk_test_') ?? true;
};

const getIsDevelopment = (): boolean => {
  return import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';
};

// Stripe configuration object
export const stripeConfig = {
  // Public configuration (safe for client-side)
  publishableKey: getStripePublishableKey(),
  useStripePayments: getUseStripePayments(),
  isTestMode: getIsTestMode(),
  isDevelopment: getIsDevelopment(),
  
  // Stripe settings
  apiVersion: '2023-10-16' as const,
  currency: 'eur' as const,
  
  // UI Configuration
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#3b82f6', // Blue-500
      colorBackground: '#ffffff',
      colorText: '#1f2937', // Gray-800
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '8px',
    },
  },
  
  // Validation functions
  isConfigured: (): boolean => {
    const publishableKey = getStripePublishableKey();
    return !!publishableKey && publishableKey !== 'pk_test_your_stripe_publishable_key_here';
  },
  
  isValidForProduction: (): boolean => {
    const publishableKey = getStripePublishableKey();
    return !!publishableKey && publishableKey.startsWith('pk_live_');
  },
  
  shouldUseMockPayments: (): boolean => {
    return !getUseStripePayments() || !stripeConfig.isConfigured();
  },
  
  getWarnings: (): string[] => {
    const warnings: string[] = [];
    
    if (!stripeConfig.isConfigured()) {
      warnings.push('Stripe not configured - using mock payments');
    }
    
    if (stripeConfig.isConfigured() && getIsTestMode() && !getIsDevelopment()) {
      warnings.push('Using Stripe test keys in production environment');
    }
    
    if (getUseStripePayments() && !stripeConfig.isConfigured()) {
      warnings.push('VITE_USE_STRIPE_PAYMENTS is true but Stripe keys are missing');
    }
    
    return warnings;
  }
};

// Environment validation
export const validateStripeEnvironment = (): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings = stripeConfig.getWarnings();
  
  // Check for required environment variables when Stripe is enabled
  if (getUseStripePayments()) {
    if (!getStripePublishableKey()) {
      errors.push('VITE_STRIPE_PUBLISHABLE_KEY is required when VITE_USE_STRIPE_PAYMENTS is true');
    }
    
    if (getStripePublishableKey() === 'pk_test_your_stripe_publishable_key_here') {
      errors.push('Please replace the placeholder Stripe publishable key with your actual key');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Export types for TypeScript
export type StripeConfig = typeof stripeConfig;
export type StripeValidationResult = ReturnType<typeof validateStripeEnvironment>;

// Default export for convenience
export default stripeConfig;
