/**
 * Unit Tests for Error Handling Utilities
 * 
 * Tests comprehensive error handling, mapping, logging, and retry logic
 * for Stripe payment processing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  mapStripeError,
  logPaymentError,
  displayPaymentError,
  getErrorTitle,
  shouldAutoRetry,
  calculateRetryDelay,
  errorHandler,
  STRIPE_ERROR_MAPPINGS,
  type ErrorContext,
  type ErrorDetails,
} from '@/utils/errorHandling'

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('Error Handling Utils', () => {
  let mockToast: unknown
  let mockLocalStorage: unknown

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock toast
    mockToast = vi.fn();
    vi.doMock('@/hooks/use-toast', () => ({
      toast: mockToast,
    }));

    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('mapStripeError', () => {
    it('should map known Stripe error codes', () => {
      const error = { code: 'card_declined' };
      const result = mapStripeError(error);

      expect(result.code).toBe('card_declined');
      expect(result.type).toBe('card_error');
      expect(result.category).toBe('user_action_required');
      expect(result.severity).toBe('medium');
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toContain('Your card was declined');
    });

    it('should map insufficient funds error', () => {
      const error = { code: 'insufficient_funds' };
      const result = mapStripeError(error);

      expect(result.code).toBe('insufficient_funds');
      expect(result.type).toBe('card_error');
      expect(result.category).toBe('user_action_required');
      expect(result.userMessage).toContain('insufficient funds');
    });

    it('should map expired card error', () => {
      const error = { code: 'expired_card' };
      const result = mapStripeError(error);

      expect(result.code).toBe('expired_card');
      expect(result.type).toBe('card_error');
      expect(result.userMessage).toContain('expired');
    });

    it('should map incorrect CVC error', () => {
      const error = { code: 'incorrect_cvc' };
      const result = mapStripeError(error);

      expect(result.code).toBe('incorrect_cvc');
      expect(result.type).toBe('card_error');
      expect(result.severity).toBe('low');
      expect(result.userMessage).toContain('security code');
    });

    it('should map processing error', () => {
      const error = { code: 'processing_error' };
      const result = mapStripeError(error);

      expect(result.code).toBe('processing_error');
      expect(result.type).toBe('card_error');
      expect(result.category).toBe('retry_recommended');
      expect(result.retryable).toBe(true);
    });

    it('should map rate limit error', () => {
      const error = { code: 'rate_limit' };
      const result = mapStripeError(error);

      expect(result.code).toBe('rate_limit');
      expect(result.type).toBe('rate_limit_error');
      expect(result.category).toBe('retry_recommended');
      expect(result.userMessage).toContain('Too many payment attempts');
    });

    it('should map API key expired error', () => {
      const error = { code: 'api_key_expired' };
      const result = mapStripeError(error);

      expect(result.code).toBe('api_key_expired');
      expect(result.type).toBe('authentication_error');
      expect(result.category).toBe('system_issue');
      expect(result.severity).toBe('critical');
      expect(result.retryable).toBe(false);
    });

    it('should map invalid request error', () => {
      const error = { code: 'invalid_request_error' };
      const result = mapStripeError(error);

      expect(result.code).toBe('invalid_request_error');
      expect(result.type).toBe('api_error');
      expect(result.category).toBe('system_issue');
      expect(result.severity).toBe('high');
      expect(result.retryable).toBe(false);
    });

    it('should map network error', () => {
      const error = { code: 'network_error' };
      const result = mapStripeError(error);

      expect(result.code).toBe('network_error');
      expect(result.type).toBe('network_error');
      expect(result.category).toBe('retry_recommended');
      expect(result.retryable).toBe(true);
    });

    it('should map authentication required error', () => {
      const error = { code: 'authentication_required' };
      const result = mapStripeError(error);

      expect(result.code).toBe('authentication_required');
      expect(result.type).toBe('authentication_error');
      expect(result.category).toBe('user_action_required');
      expect(result.userMessage).toContain('authentication');
    });

    it('should map email invalid error', () => {
      const error = { code: 'email_invalid' };
      const result = mapStripeError(error);

      expect(result.code).toBe('email_invalid');
      expect(result.type).toBe('validation_error');
      expect(result.category).toBe('user_action_required');
      expect(result.userMessage).toContain('valid email address');
    });

    it('should handle error message patterns', () => {
      const error = { message: 'Your card was declined by the bank' };
      const result = mapStripeError(error);

      expect(result.code).toBe('card_declined');
      expect(result.userMessage).toContain('Your card was declined');
    });

    it('should handle insufficient funds in message', () => {
      const error = { message: 'Insufficient funds available' };
      const result = mapStripeError(error);

      expect(result.code).toBe('insufficient_funds');
    });

    it('should handle expired card in message', () => {
      const error = { message: 'The card has expired' };
      const result = mapStripeError(error);

      expect(result.code).toBe('expired_card');
    });

    it('should handle CVC errors in message', () => {
      const error = { message: 'The security code is incorrect' };
      const result = mapStripeError(error);

      expect(result.code).toBe('incorrect_cvc');
    });

    it('should handle card number errors in message', () => {
      const error = { message: 'The card number is incorrect' };
      const result = mapStripeError(error);

      expect(result.code).toBe('incorrect_number');
    });

    it('should handle network errors in message', () => {
      const error = { message: 'Network connection failed' };
      const result = mapStripeError(error);

      expect(result.code).toBe('network_error');
    });

    it('should handle rate limit errors in message', () => {
      const error = { message: 'Rate limit exceeded' };
      const result = mapStripeError(error);

      expect(result.code).toBe('rate_limit');
    });

    it('should return unknown error for unrecognized errors', () => {
      const error = { message: 'Some random error message' };
      const result = mapStripeError(error);

      expect(result.code).toBe('unknown_error');
      expect(result.type).toBe('unknown_error');
      expect(result.category).toBe('contact_support');
      expect(result.severity).toBe('high');
    });

    it('should handle null/undefined errors', () => {
      const result = mapStripeError(null);

      expect(result.code).toBe('unknown_error');
    });

    it('should handle errors with no message', () => {
      const error = {};
      const result = mapStripeError(error);

      expect(result.code).toBe('unknown_error');
    });
  });

  describe('logPaymentError', () => {
    const mockContext: ErrorContext = {
      userId: 'user_123',
      sessionId: 'cs_test_123',
      customerId: 'cus_123',
      paymentIntentId: 'pi_123',
      orderId: 'order_123',
      amount: 1000,
      currency: 'eur',
      timestamp: '2023-01-01T00:00:00Z',
      userAgent: 'test-agent',
      url: 'https://example.com',
    };

    const mockErrorDetails: ErrorDetails = {
      code: 'card_declined',
      message: 'Card was declined',
      type: 'card_error',
      category: 'user_action_required',
      severity: 'medium',
      retryable: true,
      userMessage: 'Your card was declined',
      actionableSteps: ['Try a different card'],
      supportInfo: {
        contactRecommended: false,
        urgency: 'low',
        includeTransactionId: false,
      },
    };

    it('should log error details in development', async () => {
      // Mock development environment
      Object.defineProperty(import.meta, 'env', {
        value: { MODE: 'development' },
        writable: true,
      });

      const originalError = { code: 'card_declined', message: 'Card declined' };

      await logPaymentError(originalError, mockContext, mockErrorDetails);

      expect(console.group).toHaveBeenCalledWith('🚫 Payment Error');
      expect(console.error).toHaveBeenCalledWith('Error Details:', expect.objectContaining({
        code: 'card_declined',
        context: mockContext,
        originalError: {
          code: 'card_declined',
          message: 'Card declined',
          type: undefined,
          decline_code: undefined,
        },
      }));
      expect(console.groupEnd).toHaveBeenCalled();
    });

    it('should store error in localStorage in development', async () => {
      // Mock development environment
      Object.defineProperty(import.meta, 'env', {
        value: { MODE: 'development' },
        writable: true,
      });

      mockLocalStorage.getItem.mockReturnValue('[]');

      const originalError = { code: 'card_declined' };

      await logPaymentError(originalError, mockContext, mockErrorDetails);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'payment_errors',
        expect.stringContaining('card_declined');
      );
    });

    it('should limit stored errors to 50', async () => {
      // Mock development environment
      Object.defineProperty(import.meta, 'env', {
        value: { MODE: 'development' },
        writable: true,
      });

      // Mock 50 existing errors
      const existingErrors = Array.from({ length: 50 }, (_, i) => ({ id: i }));
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingErrors));

      const originalError = { code: 'card_declined' };

      await logPaymentError(originalError, mockContext, mockErrorDetails);

      const setItemCall = mockLocalStorage.setItem.mock.calls.find(
        call => call[0] === 'payment_errors'
      );
      const storedErrors = JSON.parse(setItemCall[1]);
      
      expect(storedErrors).toHaveLength(50) // Should still be 50, not 51
    });

    it('should handle localStorage errors gracefully', async () => {
      // Mock development environment
      Object.defineProperty(import.meta, 'env', {
        value: { MODE: 'development' },
        writable: true,
      });

      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const originalError = { code: 'card_declined' };

      // Should not throw
      await expect(logPaymentError(originalError, mockContext, mockErrorDetails));
        .resolves.toBeUndefined();
    });
  });

  describe('displayPaymentError', () => {
    const mockContext: ErrorContext = {
      userId: 'user_123',
      timestamp: '2023-01-01T00:00:00Z',
    };

    it('should display error with toast notification', () => {
      const error = { code: 'card_declined' };
      
      const result = displayPaymentError(error, mockContext);

      expect(result.code).toBe('card_declined');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Payment Issue',
        description: expect.stringContaining('Your card was declined'),
        variant: 'destructive',
        duration: 5000,
      });
    });

    it('should display critical errors with longer duration', () => {
      const error = { code: 'api_key_expired' };
      
      displayPaymentError(error, mockContext);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'System Error',
        description: expect.stringContaining('system configuration issue'),
        variant: 'destructive',
        duration: 10000,
      });
    });

    it('should include error code when requested', () => {
      const error = { code: 'card_declined' };
      
      displayPaymentError(error, mockContext, {
        includeErrorCode: true,
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Payment Issue',
        description: expect.stringContaining('(Error: card_declined)'),
        variant: 'destructive',
        duration: 5000,
      });
    });

    it('should use custom title when provided', () => {
      const error = { code: 'card_declined' };
      
      displayPaymentError(error, mockContext, {
        customTitle: 'Custom Error Title',
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Custom Error Title',
        description: expect.stringContaining('Your card was declined'),
        variant: 'destructive',
        duration: 5000,
      });
    });

    it('should not show toast when disabled', () => {
      const error = { code: 'card_declined' };
      
      displayPaymentError(error, mockContext, {
        showToast: false,
      });

      expect(mockToast).not.toHaveBeenCalled();
    });
  });

  describe('getErrorTitle', () => {
    it('should return correct titles for different error categories', () => {
      const userActionError = { category: 'user_action_required' } as ErrorDetails
      expect(getErrorTitle(userActionError)).toBe('Payment Issue');

      const retryError = { category: 'retry_recommended' } as ErrorDetails
      expect(getErrorTitle(retryError)).toBe('Temporary Issue');

      const systemError = { category: 'system_issue' } as ErrorDetails
      expect(getErrorTitle(systemError)).toBe('System Error');

      const supportError = { category: 'contact_support' } as ErrorDetails
      expect(getErrorTitle(supportError)).toBe('Payment Error');
    });
  });

  describe('shouldAutoRetry', () => {
    it('should not retry user action required errors', () => {
      const error = { category: 'user_action_required' } as ErrorDetails
      expect(shouldAutoRetry(error, 1)).toBe(false);
    });

    it('should not retry non-retryable system issues', () => {
      const error = { 
        category: 'system_issue',
        retryable: false,
      } as ErrorDetails
      expect(shouldAutoRetry(error, 1)).toBe(false);
    });

    it('should not retry after max attempts', () => {
      const error = { 
        category: 'retry_recommended',
        retryable: true,
      } as ErrorDetails
      expect(shouldAutoRetry(error, 3)).toBe(false);
      expect(shouldAutoRetry(error, 4)).toBe(false);
    });

    it('should retry retryable errors within limit', () => {
      const error = { 
        category: 'retry_recommended',
        retryable: true,
      } as ErrorDetails
      expect(shouldAutoRetry(error, 1)).toBe(true);
      expect(shouldAutoRetry(error, 2)).toBe(true);
    });

    it('should retry network errors', () => {
      const error = { 
        type: 'network_error',
        retryable: true,
      } as ErrorDetails
      expect(shouldAutoRetry(error, 1)).toBe(true);
    });

    it('should retry processing errors', () => {
      const error = { 
        code: 'processing_error',
        retryable: true,
      } as ErrorDetails
      expect(shouldAutoRetry(error, 1)).toBe(true);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff delay', () => {
      const error = { type: 'card_error' } as ErrorDetails
      
      expect(calculateRetryDelay(1, error)).toBeGreaterThan(1000);
      expect(calculateRetryDelay(2, error)).toBeGreaterThan(calculateRetryDelay(1, error));
      expect(calculateRetryDelay(3, error)).toBeGreaterThan(calculateRetryDelay(2, error));
    });

    it('should use longer delay for rate limit errors', () => {
      const rateLimitError = { type: 'rate_limit_error' } as ErrorDetails
      const normalError = { type: 'card_error' } as ErrorDetails
      
      const rateLimitDelay = calculateRetryDelay(1, rateLimitError);
      const normalDelay = calculateRetryDelay(1, normalError);
      
      expect(rateLimitDelay).toBeGreaterThan(normalDelay);
    });

    it('should add jitter to prevent thundering herd', () => {
      const error = { type: 'card_error' } as ErrorDetails
      
      const delay1 = calculateRetryDelay(1, error);
      const delay2 = calculateRetryDelay(1, error);
      
      // Should be different due to jitter (unless very unlucky);
      expect(delay1).not.toBe(delay2);
    });

    it('should handle zero attempt count', () => {
      const error = { type: 'card_error' } as ErrorDetails
      
      const delay = calculateRetryDelay(0, error);
      expect(delay).toBeGreaterThan(0);
    });
  });

  describe('errorHandler', () => {
    it('should provide access to all error handling functions', () => {
      expect(errorHandler.map).toBe(mapStripeError);
      expect(errorHandler.display).toBe(displayPaymentError);
      expect(errorHandler.log).toBe(logPaymentError);
      expect(errorHandler.shouldRetry).toBe(shouldAutoRetry);
      expect(errorHandler.getRetryDelay).toBe(calculateRetryDelay);
      expect(errorHandler.getTitle).toBe(getErrorTitle);
    });

    it('should provide access to error mappings', () => {
      const mappings = errorHandler.getMappings();
      expect(mappings).toBe(STRIPE_ERROR_MAPPINGS);
      expect(mappings.card_declined).toBeDefined();
      expect(mappings.insufficient_funds).toBeDefined();
    });

    it('should provide stored errors access', () => {
      mockLocalStorage.getItem.mockReturnValue('[{"code": "test"}]');
      
      const errors = errorHandler.getStoredErrors();
      expect(errors).toEqual([{ code: 'test' }]);
    });

    it('should handle localStorage errors in getStoredErrors', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const errors = errorHandler.getStoredErrors();
      expect(errors).toEqual([]);
    });

    it('should clear stored errors', () => {
      errorHandler.clearStoredErrors();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('payment_errors');
    });
  });

  describe('STRIPE_ERROR_MAPPINGS', () => {
    it('should contain all expected error mappings', () => {
      const expectedCodes = [
        'card_declined',
        'insufficient_funds',
        'expired_card',
        'incorrect_cvc',
        'incorrect_number',
        'processing_error',
        'rate_limit',
        'api_key_expired',
        'invalid_request_error',
        'network_error',
        'authentication_required',
        'email_invalid',
        'unknown_error',
      ]

      expectedCodes.forEach(code => {
        expect(STRIPE_ERROR_MAPPINGS[code]).toBeDefined();
        expect(STRIPE_ERROR_MAPPINGS[code].code).toBe(code);
        expect(STRIPE_ERROR_MAPPINGS[code].userMessage).toBeDefined();
        expect(STRIPE_ERROR_MAPPINGS[code].actionableSteps).toBeDefined();
      });
    });

    it('should have consistent error structure', () => {
      Object.values(STRIPE_ERROR_MAPPINGS).forEach(error => {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('type');
        expect(error).toHaveProperty('category');
        expect(error).toHaveProperty('severity');
        expect(error).toHaveProperty('retryable');
        expect(error).toHaveProperty('userMessage');
        expect(error).toHaveProperty('actionableSteps');
        expect(error).toHaveProperty('supportInfo');
        
        expect(typeof error.retryable).toBe('boolean');
        expect(Array.isArray(error.actionableSteps)).toBe(true);
        expect(error.supportInfo).toHaveProperty('contactRecommended');
        expect(error.supportInfo).toHaveProperty('urgency');
        expect(error.supportInfo).toHaveProperty('includeTransactionId');
      });
    });
  });
});
