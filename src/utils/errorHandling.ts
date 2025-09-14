/**
 * Comprehensive Error Handling System for Stripe Integration
 * 
 * Provides centralized error management, user-friendly messaging,
 * retry logic, and recovery mechanisms for payment processing.
 */

import { toast } from '@/hooks/use-toast';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  customerId?: string;
  paymentIntentId?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

export interface ErrorDetails {
  code: string;
  message: string;
  type: 'card_error' | 'api_error' | 'authentication_error' | 'rate_limit_error' | 'validation_error' | 'network_error' | 'unknown_error';
  category: 'user_action_required' | 'retry_recommended' | 'contact_support' | 'system_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  userMessage: string;
  actionableSteps: string[];
  supportInfo?: {
    contactRecommended: boolean;
    urgency: 'low' | 'medium' | 'high';
    includeTransactionId: boolean;
  };
}

/**
 * Comprehensive Stripe error code mappings
 */
export const STRIPE_ERROR_MAPPINGS: Record<string, ErrorDetails> = {
  // Card Errors - User Action Required
  'card_declined': {
    code: 'card_declined',
    message: 'Card was declined',
    type: 'card_error',
    category: 'user_action_required',
    severity: 'medium',
    retryable: true,
    userMessage: 'Your card was declined. Please try a different payment method or contact your bank.',
    actionableSteps: [
      'Try a different credit or debit card',
      'Contact your bank to ensure the card is active',
      'Check if you have sufficient funds',
      'Verify your billing address is correct'
    ],
    supportInfo: {
      contactRecommended: false,
      urgency: 'low',
      includeTransactionId: false
    }
  },
  
  'insufficient_funds': {
    code: 'insufficient_funds',
    message: 'Insufficient funds',
    type: 'card_error',
    category: 'user_action_required',
    severity: 'medium',
    retryable: true,
    userMessage: 'Your card has insufficient funds. Please use a different payment method or add funds to your account.',
    actionableSteps: [
      'Add funds to your account',
      'Use a different payment method',
      'Contact your bank to verify account status'
    ],
    supportInfo: {
      contactRecommended: false,
      urgency: 'low',
      includeTransactionId: false
    }
  },
  
  'expired_card': {
    code: 'expired_card',
    message: 'Card has expired',
    type: 'card_error',
    category: 'user_action_required',
    severity: 'medium',
    retryable: true,
    userMessage: 'Your card has expired. Please use a different payment method.',
    actionableSteps: [
      'Use a different, current payment method',
      'Contact your bank for a replacement card',
      'Update your card information if you have a new one'
    ],
    supportInfo: {
      contactRecommended: false,
      urgency: 'low',
      includeTransactionId: false
    }
  },
  
  'incorrect_cvc': {
    code: 'incorrect_cvc',
    message: 'Incorrect CVC',
    type: 'card_error',
    category: 'user_action_required',
    severity: 'low',
    retryable: true,
    userMessage: 'The security code (CVC) you entered is incorrect. Please check and try again.',
    actionableSteps: [
      'Check the 3-digit code on the back of your card',
      'For American Express, use the 4-digit code on the front',
      'Ensure you\'re entering the correct numbers'
    ],
    supportInfo: {
      contactRecommended: false,
      urgency: 'low',
      includeTransactionId: false
    }
  },
  
  'incorrect_number': {
    code: 'incorrect_number',
    message: 'Incorrect card number',
    type: 'card_error',
    category: 'user_action_required',
    severity: 'low',
    retryable: true,
    userMessage: 'The card number you entered is incorrect. Please check and try again.',
    actionableSteps: [
      'Double-check the card number for typos',
      'Ensure you\'re entering all 16 digits',
      'Try typing the number manually instead of copy-pasting'
    ],
    supportInfo: {
      contactRecommended: false,
      urgency: 'low',
      includeTransactionId: false
    }
  },
  
  'processing_error': {
    code: 'processing_error',
    message: 'Processing error',
    type: 'card_error',
    category: 'retry_recommended',
    severity: 'medium',
    retryable: true,
    userMessage: 'There was a temporary processing error. Please try again in a few moments.',
    actionableSteps: [
      'Wait a few moments and try again',
      'Check your internet connection',
      'Try a different payment method if the issue persists'
    ],
    supportInfo: {
      contactRecommended: true,
      urgency: 'medium',
      includeTransactionId: true
    }
  },
  
  // Rate Limiting
  'rate_limit': {
    code: 'rate_limit',
    message: 'Rate limit exceeded',
    type: 'rate_limit_error',
    category: 'retry_recommended',
    severity: 'medium',
    retryable: true,
    userMessage: 'Too many payment attempts. Please wait a moment before trying again.',
    actionableSteps: [
      'Wait 60 seconds before trying again',
      'Ensure you\'re not submitting multiple payments',
      'Contact support if you continue to see this error'
    ],
    supportInfo: {
      contactRecommended: true,
      urgency: 'medium',
      includeTransactionId: true
    }
  },
  
  // API Errors
  'api_key_expired': {
    code: 'api_key_expired',
    message: 'API key expired',
    type: 'authentication_error',
    category: 'system_issue',
    severity: 'critical',
    retryable: false,
    userMessage: 'There\'s a system configuration issue. Our team has been notified and will resolve this shortly.',
    actionableSteps: [
      'Please try again in a few minutes',
      'Contact support if the issue persists'
    ],
    supportInfo: {
      contactRecommended: true,
      urgency: 'high',
      includeTransactionId: true
    }
  },
  
  'invalid_request_error': {
    code: 'invalid_request_error',
    message: 'Invalid request',
    type: 'api_error',
    category: 'system_issue',
    severity: 'high',
    retryable: false,
    userMessage: 'There was a technical issue processing your request. Please try again or contact support.',
    actionableSteps: [
      'Refresh the page and try again',
      'Clear your browser cache',
      'Contact support with details of what you were trying to do'
    ],
    supportInfo: {
      contactRecommended: true,
      urgency: 'high',
      includeTransactionId: true
    }
  },
  
  // Network Errors
  'network_error': {
    code: 'network_error',
    message: 'Network error',
    type: 'network_error',
    category: 'retry_recommended',
    severity: 'medium',
    retryable: true,
    userMessage: 'Network connection issue. Please check your connection and try again.',
    actionableSteps: [
      'Check your internet connection',
      'Try refreshing the page',
      'Wait a moment and try again',
      'Try a different network if possible'
    ],
    supportInfo: {
      contactRecommended: true,
      urgency: 'low',
      includeTransactionId: false
    }
  },
  
  // Authentication Errors
  'authentication_required': {
    code: 'authentication_required',
    message: 'Authentication required',
    type: 'authentication_error',
    category: 'user_action_required',
    severity: 'medium',
    retryable: true,
    userMessage: 'Additional authentication is required for this payment. You\'ll be redirected to verify.',
    actionableSteps: [
      'Complete the authentication process',
      'Ensure you have access to your phone for 2FA',
      'Contact your bank if authentication fails'
    ],
    supportInfo: {
      contactRecommended: false,
      urgency: 'low',
      includeTransactionId: false
    }
  },
  
  // Validation Errors
  'email_invalid': {
    code: 'email_invalid',
    message: 'Invalid email',
    type: 'validation_error',
    category: 'user_action_required',
    severity: 'low',
    retryable: true,
    userMessage: 'Please enter a valid email address.',
    actionableSteps: [
      'Check for typos in your email address',
      'Ensure the email format is correct (example@domain.com)',
      'Use a different email address if needed'
    ],
    supportInfo: {
      contactRecommended: false,
      urgency: 'low',
      includeTransactionId: false
    }
  },
  
  // Generic fallback
  'unknown_error': {
    code: 'unknown_error',
    message: 'Unknown error',
    type: 'unknown_error',
    category: 'contact_support',
    severity: 'high',
    retryable: true,
    userMessage: 'An unexpected error occurred. Please try again or contact support for assistance.',
    actionableSteps: [
      'Try the payment again',
      'Use a different payment method',
      'Contact support with details of the error'
    ],
    supportInfo: {
      contactRecommended: true,
      urgency: 'medium',
      includeTransactionId: true
    }
  }
};

/**
 * Maps a Stripe error to our standardized error details
 */
export const mapStripeError = (error: any): ErrorDetails => {
  if (!error) {
    return STRIPE_ERROR_MAPPINGS['unknown_error'];
  }

  // Extract error code from various possible locations
  const errorCode = error.code || error.decline_code || error.type || 'unknown_error';
  
  // Check for exact match first
  if (STRIPE_ERROR_MAPPINGS[errorCode]) {
    return STRIPE_ERROR_MAPPINGS[errorCode];
  }

  // Pattern matching for similar errors
  const errorMessage = (error.message || '').toLowerCase();
  
  if (errorMessage.includes('declined') || errorMessage.includes('card was declined')) {
    return STRIPE_ERROR_MAPPINGS['card_declined'];
  }
  
  if (errorMessage.includes('insufficient') || errorMessage.includes('funds')) {
    return STRIPE_ERROR_MAPPINGS['insufficient_funds'];
  }
  
  if (errorMessage.includes('expired')) {
    return STRIPE_ERROR_MAPPINGS['expired_card'];
  }
  
  if (errorMessage.includes('cvc') || errorMessage.includes('security code')) {
    return STRIPE_ERROR_MAPPINGS['incorrect_cvc'];
  }
  
  if (errorMessage.includes('card number') || errorMessage.includes('number')) {
    return STRIPE_ERROR_MAPPINGS['incorrect_number'];
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return STRIPE_ERROR_MAPPINGS['network_error'];
  }
  
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
    return STRIPE_ERROR_MAPPINGS['rate_limit'];
  }

  // Default to unknown error
  return STRIPE_ERROR_MAPPINGS['unknown_error'];
};

/**
 * Logs error details for analytics and debugging
 */
export const logPaymentError = async (
  error: any, 
  context: ErrorContext,
  errorDetails: ErrorDetails
): Promise<void> => {
  const logData = {
    ...errorDetails,
    context,
    originalError: {
      code: error?.code,
      message: error?.message,
      type: error?.type,
      decline_code: error?.decline_code
    },
    timestamp: context.timestamp,
    environment: process.env.NODE_ENV || 'development'
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group('🚫 Payment Error');
    console.error('Error Details:', logData);
    console.groupEnd();
  }

  // In production, you would send this to your analytics service
  // Example: analytics.track('payment_error', logData);
  
  try {
    // Store error in local storage for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      const existingErrors = JSON.parse(localStorage.getItem('payment_errors') || '[]');
      existingErrors.push(logData);
      
      // Keep only last 50 errors
      if (existingErrors.length > 50) {
        existingErrors.splice(0, existingErrors.length - 50);
      }
      
      localStorage.setItem('payment_errors', JSON.stringify(existingErrors));
    }
  } catch (e) {
    console.warn('Failed to store error locally:', e);
  }
};

/**
 * Displays user-friendly error message with toast notification
 */
export const displayPaymentError = (
  error: any,
  context: ErrorContext,
  options: {
    showToast?: boolean;
    includeErrorCode?: boolean;
    customTitle?: string;
  } = {}
): ErrorDetails => {
  const errorDetails = mapStripeError(error);
  
  // Log the error
  logPaymentError(error, context, errorDetails);

  // Show toast notification
  if (options.showToast !== false) {
    const title = options.customTitle || getErrorTitle(errorDetails);
    const description = options.includeErrorCode 
      ? `${errorDetails.userMessage} (Error: ${errorDetails.code})`
      : errorDetails.userMessage;

    toast({
      title,
      description,
      variant: "destructive",
      duration: errorDetails.severity === 'critical' ? 10000 : 5000,
    });
  }

  return errorDetails;
};

/**
 * Gets appropriate error title based on error type
 */
export const getErrorTitle = (errorDetails: ErrorDetails): string => {
  switch (errorDetails.category) {
    case 'user_action_required':
      return 'Payment Issue';
    case 'retry_recommended':
      return 'Temporary Issue';
    case 'system_issue':
      return 'System Error';
    case 'contact_support':
      return 'Payment Error';
    default:
      return 'Payment Error';
  }
};

/**
 * Determines if an error should trigger automatic retry
 */
export const shouldAutoRetry = (errorDetails: ErrorDetails, attemptCount: number): boolean => {
  // Don't auto-retry user action required errors
  if (errorDetails.category === 'user_action_required') {
    return false;
  }

  // Don't auto-retry system issues that aren't retryable
  if (errorDetails.category === 'system_issue' && !errorDetails.retryable) {
    return false;
  }

  // Limit retry attempts
  if (attemptCount >= 3) {
    return false;
  }

  // Only auto-retry certain error types
  return errorDetails.retryable && (
    errorDetails.category === 'retry_recommended' ||
    errorDetails.type === 'network_error' ||
    errorDetails.code === 'processing_error'
  );
};

/**
 * Calculates retry delay based on attempt count and error type
 */
export const calculateRetryDelay = (attemptCount: number, errorDetails: ErrorDetails): number => {
  // Base delay in milliseconds
  let baseDelay = 1000; // 1 second

  // Increase delay for rate limit errors
  if (errorDetails.type === 'rate_limit_error') {
    baseDelay = 60000; // 1 minute
  }

  // Exponential backoff with jitter
  const delay = baseDelay * Math.pow(2, attemptCount - 1);
  const jitter = Math.random() * 1000; // Add up to 1 second of jitter
  
  return delay + jitter;
};

/**
 * Error handling utilities interface
 */
export const errorHandler = {
  // Core functions
  map: mapStripeError,
  display: displayPaymentError,
  log: logPaymentError,

  // Retry logic
  shouldRetry: shouldAutoRetry,
  getRetryDelay: calculateRetryDelay,

  // Utilities
  getTitle: getErrorTitle,
  getMappings: () => STRIPE_ERROR_MAPPINGS,
  
  // Development helpers
  getStoredErrors: () => {
    try {
      return JSON.parse(localStorage.getItem('payment_errors') || '[]');
    } catch {
      return [];
    }
  },
  
  clearStoredErrors: () => {
    localStorage.removeItem('payment_errors');
  }
};

// Make error handler available globally in development
if (import.meta.env.DEV) {
  (window as any).errorHandler = errorHandler;
  console.log('🔧 Error handler available globally as: window.errorHandler');
  console.log('📚 Usage examples:');
  console.log('  - errorHandler.map(stripeError) - Map Stripe error to details');
  console.log('  - errorHandler.display(error, context) - Display user-friendly error');
  console.log('  - errorHandler.getStoredErrors() - View logged errors');
}
