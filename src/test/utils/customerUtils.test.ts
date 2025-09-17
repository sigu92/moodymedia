/**
 * Unit Tests for Customer Management Utilities
 * 
 * Tests customer creation, profile management, payment methods,
 * and synchronization functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getOrCreateStripeCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerPaymentMethods,
  setDefaultPaymentMethod,
  removePaymentMethod,
  syncCustomerData,
  validateCustomerEmail,
  customerManager,
} from '@/utils/customerUtils'
import { stripeConfig } from '@/config/stripe'
import { mockSupabaseClient } from '@/test/test-utils'

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

vi.mock('@/config/stripe', () => ({
  stripeConfig: {
    shouldUseMockPayments: vi.fn(() => false),
  },
}));

describe('Customer Utils', () => {
  let mockSupabase: typeof mockSupabaseClient

  beforeEach(() => {
    mockSupabase = mockSupabaseClient
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getOrCreateStripeCustomer', () => {
    it('should return existing customer if found', async () => {
      const existingProfile = {
        stripe_customer_id: 'cus_existing_123',
        stripe_customer_email: 'test@example.com',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: existingProfile,
              error: null,
            }),
          }),
        }),
      } as unknown);

      const result = await getOrCreateStripeCustomer(
        'user_123',
        'test@example.com',
        'Test User'
      );

      expect(result).toEqual({
        success: true,
        customerId: 'cus_existing_123',
        isNewCustomer: false,
      });
    });

    it('should create new customer when none exists', async () => {
      // Mock no existing profile
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // Not found error
            }),
          }),
        }),
      } as unknown);

      // Mock customer creation
      const mockCustomerData = {
        customerId: 'cus_new_123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockCustomerData,
        error: null,
      });

      // Mock profile update
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      } as unknown).mockReturnValueOnce({
        upsert: vi.fn().mockReturnValue({
          onConflict: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as unknown);

      const result = await getOrCreateStripeCustomer(
        'user_123',
        'test@example.com',
        'Test User'
      );

      expect(result).toEqual({
        success: true,
        customerId: 'cus_new_123',
        isNewCustomer: true,
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-customer', {
        body: {
          email: 'test@example.com',
          name: 'Test User',
          metadata: {
            user_id: 'user_123',
            created_in_app: 'true',
            app_version: '1.0',
          },
        },
      });
    });

    it('should handle profile fetch errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      } as unknown);

      const result = await getOrCreateStripeCustomer(
        'user_123',
        'test@example.com'
      );

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch user profile',
      });
    });

    it('should handle customer creation errors', async () => {
      // Mock no existing profile
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      } as unknown);

      // Mock customer creation error
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Customer creation failed' },
      });

      const result = await getOrCreateStripeCustomer(
        'user_123',
        'test@example.com'
      );

      expect(result).toEqual({
        success: false,
        error: 'Customer creation failed',
      });
    });

    it('should handle missing customer ID in response', async () => {
      // Mock no existing profile
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      } as unknown);

      // Mock customer creation with missing ID
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { email: 'test@example.com' },
        error: null,
      });

      const result = await getOrCreateStripeCustomer(
        'user_123',
        'test@example.com'
      );

      expect(result).toEqual({
        success: false,
        error: 'No customer ID returned from Stripe',
      });
    });

    it('should include organization settings in metadata', async () => {
      // Mock no existing profile
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      } as unknown);

      // Mock customer creation
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { customerId: 'cus_new_123' },
        error: null,
      });

      // Mock profile update
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      } as unknown).mockReturnValueOnce({
        upsert: vi.fn().mockReturnValue({
          onConflict: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as unknown);

      const orgSettings = {
        name: 'Test Org',
        company_name: 'Test Company',
      };

      await getOrCreateStripeCustomer(
        'user_123',
        'test@example.com',
        'Test User',
        orgSettings
      );

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-customer', {
        body: expect.objectContaining({
          name: 'Test Org',
          metadata: expect.objectContaining({
            company_name: 'Test Company',
          }),
        }),
      });
    });

    it('should retry profile update on failure', async () => {
      // Mock no existing profile
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      } as unknown);

      // Mock customer creation
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { customerId: 'cus_new_123' },
        error: null,
      });

      // Mock profile update failure then success
      let updateCallCount = 0
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      } as unknown).mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          onConflict: vi.fn().mockImplementation(() => {
            updateCallCount++
            if (updateCallCount === 1) {
              return Promise.resolve({
                data: null,
                error: { message: 'First attempt failed' },
              });
            };
            return Promise.resolve({
              data: null,
              error: null,
            });
          }),
        }),
      } as unknown);

      const result = await getOrCreateStripeCustomer(
        'user_123',
        'test@example.com'
      );

      expect(result.success).toBe(true);
      expect(updateCallCount).toBe(2) // Should have retried
    });
  });

  describe('getCustomerProfile', () => {
    it('should retrieve customer profile successfully', async () => {
      const mockProfile = {
        id: 'profile_123',
        user_id: 'user_123',
        stripe_customer_id: 'cus_123',
        stripe_customer_email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      } as unknown);

      const result = await getCustomerProfile('user_123');

      expect(result).toEqual({
        success: true,
        profile: mockProfile,
      });
    });

    it('should handle profile not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found' },
            }),
          }),
        }),
      } as unknown);

      const result = await getCustomerProfile('user_123');

      expect(result).toEqual({
        success: false,
        error: 'Profile not found',
      });
    });
  });

  describe('updateCustomerProfile', () => {
    it('should update customer profile successfully', async () => {
      // Mock existing profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { stripe_customer_id: 'cus_123' },
              error: null,
            }),
          }),
        }),
      } as unknown);

      // Mock Stripe update
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      // Mock local update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as unknown);

      const result = await updateCustomerProfile('user_123', {
        email: 'new@example.com',
        name: 'New Name',
      });

      expect(result).toEqual({ success: true });
    });

    it('should handle missing Stripe customer', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found' },
            }),
          }),
        }),
      } as unknown);

      const result = await updateCustomerProfile('user_123', {
        email: 'new@example.com',
      });

      expect(result).toEqual({
        success: false,
        error: 'No Stripe customer found for this user',
      });
    });

    it('should handle Stripe update errors', async () => {
      // Mock existing profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { stripe_customer_id: 'cus_123' },
              error: null,
            }),
          }),
        }),
      } as unknown);

      // Mock Stripe update error
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Stripe update failed' },
      });

      const result = await updateCustomerProfile('user_123', {
        email: 'new@example.com',
      });

      expect(result).toEqual({
        success: false,
        error: 'Stripe update failed: Stripe update failed',
      });
    });
  });

  describe('getCustomerPaymentMethods', () => {
    it('should return mock payment methods in development', async () => {
      vi.mocked(stripeConfig.shouldUseMockPayments).mockReturnValue(true);

      // Mock existing profile
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { stripe_customer_id: 'cus_123' },
              error: null,
            }),
          }),
        }),
      } as unknown);

      const result = await getCustomerPaymentMethods('user_123');

      expect(result.success).toBe(true);
      expect(result.paymentMethods).toHaveLength(2);
      expect(result.paymentMethods?.[0].id).toBe('pm_mock_visa');
      expect(result.paymentMethods?.[1].id).toBe('pm_mock_mastercard');
    });

    it('should fetch real payment methods in production', async () => {
      vi.mocked(stripeConfig.shouldUseMockPayments).mockReturnValue(false);

      // Mock existing profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { stripe_customer_id: 'cus_123' },
              error: null,
            }),
          }),
        }),
      } as unknown);

      // Mock payment methods fetch
      const mockPaymentMethods = [
        {
          id: 'pm_123',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025,
          },
          created: Date.now() / 1000,
          customer: 'cus_123',
        },
      ]

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { payment_methods: mockPaymentMethods },
        error: null,
      });

      const result = await getCustomerPaymentMethods('user_123');

      expect(result).toEqual({
        success: true,
        paymentMethods: mockPaymentMethods,
      });
    });

    it('should handle missing customer profile', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found' },
            }),
          }),
        }),
      } as unknown);

      const result = await getCustomerPaymentMethods('user_123');

      expect(result).toEqual({
        success: false,
        error: 'No Stripe customer found for this user',
      });
    });

    it('should handle payment methods fetch errors', async () => {
      vi.mocked(stripeConfig.shouldUseMockPayments).mockReturnValue(false);

      // Mock existing profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { stripe_customer_id: 'cus_123' },
              error: null,
            }),
          }),
        }),
      } as unknown);

      // Mock payment methods fetch error
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch payment methods' },
      });

      const result = await getCustomerPaymentMethods('user_123');

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch payment methods',
      });
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set default payment method successfully', async () => {
      // Mock existing profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { stripe_customer_id: 'cus_123' },
              error: null,
            }),
          }),
        }),
      } as unknown);

      // Mock update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as unknown);

      const result = await setDefaultPaymentMethod('user_123', 'pm_123');

      expect(result).toEqual({ success: true });
    });

    it('should handle missing customer profile', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found' },
            }),
          }),
        }),
      } as unknown);

      const result = await setDefaultPaymentMethod('user_123', 'pm_123');

      expect(result).toEqual({
        success: false,
        error: 'No Stripe customer found for this user',
      });
    });

    it('should handle update errors', async () => {
      // Mock existing profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { stripe_customer_id: 'cus_123' },
              error: null,
            }),
          }),
        }),
      } as unknown);

      // Mock update error
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Update failed' },
          }),
        }),
      } as unknown);

      const result = await setDefaultPaymentMethod('user_123', 'pm_123');

      expect(result).toEqual({
        success: false,
        error: 'Update failed',
      });
    });
  });

  describe('removePaymentMethod', () => {
    it('should remove payment method successfully', async () => {
      // Mock existing profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                stripe_customer_id: 'cus_123',
                stripe_default_payment_method_id: 'pm_123',
              },
              error: null,
            }),
          }),
        }),
      } as unknown);

      // Mock update to clear default
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as unknown);

      const result = await removePaymentMethod('user_123', 'pm_123');

      expect(result).toEqual({ success: true });
    });

    it('should handle missing customer profile', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found' },
            }),
          }),
        }),
      } as unknown);

      const result = await removePaymentMethod('user_123', 'pm_123');

      expect(result).toEqual({
        success: false,
        error: 'No Stripe customer found for this user',
      });
    });

    it('should not clear default if not the default payment method', async () => {
      // Mock existing profile with different default
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                stripe_customer_id: 'cus_123',
                stripe_default_payment_method_id: 'pm_other',
              },
              error: null,
            }),
          }),
        }),
      } as unknown);

      const result = await removePaymentMethod('user_123', 'pm_123');

      expect(result).toEqual({ success: true });
      // Should not call update since it's not the default
    });
  });

  describe('syncCustomerData', () => {
    it('should return mock sync in development', async () => {
      vi.mocked(stripeConfig.shouldUseMockPayments).mockReturnValue(true);

      // Mock existing profile
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                stripe_customer_id: 'cus_123',
                stripe_customer_email: 'test@example.com',
              },
              error: null,
            }),
          }),
        }),
      } as unknown);

      const result = await syncCustomerData('user_123');

      expect(result).toEqual({
        success: true,
        changes: ['Mock sync completed'],
      });
    });

    it('should handle missing customer profile', async () => {
      vi.mocked(stripeConfig.shouldUseMockPayments).mockReturnValue(false);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found' },
            }),
          }),
        }),
      } as unknown);

      const result = await syncCustomerData('user_123');

      expect(result).toEqual({
        success: false,
        error: 'No Stripe customer found for this user',
      });
    });
  });

  describe('validateCustomerEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        '123@test.com',
      ]

      validEmails.forEach(email => {
        const result = validateCustomerEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
      ]

      invalidEmails.forEach(email => {
        const result = validateCustomerEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(300) + '@example.com'
      const result = validateCustomerEmail(longEmail);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email address is too long');
    });

    it('should reject empty email', () => {
      const result = validateCustomerEmail('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is required');
    });
  });

  describe('customerManager', () => {
    it('should provide access to all customer functions', () => {
      expect(customerManager.getOrCreate).toBe(getOrCreateStripeCustomer);
      expect(customerManager.getProfile).toBe(getCustomerProfile);
      expect(customerManager.update).toBe(updateCustomerProfile);
      expect(customerManager.sync).toBe(syncCustomerData);
      expect(customerManager.getPaymentMethods).toBe(getCustomerPaymentMethods);
      expect(customerManager.setDefaultPaymentMethod).toBe(setDefaultPaymentMethod);
      expect(customerManager.removePaymentMethod).toBe(removePaymentMethod);
      expect(customerManager.validateEmail).toBe(validateCustomerEmail);
    });
  });
});
