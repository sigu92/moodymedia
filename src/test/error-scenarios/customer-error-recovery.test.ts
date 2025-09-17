/**
 * Customer Management Error Scenarios and Recovery Tests
 * 
 * Tests customer management error scenarios and recovery mechanisms for:
 * - Customer creation failures
 * - Customer data synchronization errors
 * - Payment method management errors
 * - Customer validation failures
 * - Data consistency issues
 * - Recovery mechanisms
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerProfile } from '@/components/customer/CustomerProfile'
import { PaymentMethods } from '@/components/customer/PaymentMethods'
import { useCustomer } from '@/hooks/useCustomer'
import { useAuth } from '@/contexts/AuthContext'
import { customerManager } from '@/utils/customerUtils'
import { render as customRender, mockUser } from '@/test/test-utils'

// Mock all external dependencies
vi.mock('@/hooks/useCustomer', () => ({
  useCustomer: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/utils/customerUtils', () => ({
  customerManager: {
    getOrCreateStripeCustomer: vi.fn(),
    getCustomerProfile: vi.fn(),
    updateCustomerProfile: vi.fn(),
    getCustomerPaymentMethods: vi.fn(),
    setDefaultPaymentMethod: vi.fn(),
    removePaymentMethod: vi.fn(),
    syncCustomerData: vi.fn(),
    validateCustomerEmail: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      getUser: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('Customer Management Error Scenarios and Recovery', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User',
    },
  };

  const mockCustomerProfile = {
    id: 'cus_test_123',
    email: 'test@example.com',
    name: 'Test User',
    phone: '+1234567890',
    address: {
      line1: '123 Main St',
      line2: 'Apt 4B',
      city: 'Anytown',
      state: 'CA',
      postal_code: '12345',
      country: 'US',
    },
    created: 1640995200,
    default_source: 'card_123',
    metadata: {
      user_id: 'user_123',
      source: 'moodymedia',
    },
  };

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
      is_default: true,
    },
  ]

  let mockCustomerHook: any
  let mockAuthHook: any

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth
    mockAuthHook = {
      user: mockUser,
      session: { expires_at: Date.now() / 1000 + 3600 },
      signOut: vi.fn(),
      isLoading: false,
      isAuthenticated: true,
    };
    vi.mocked(useAuth).mockReturnValue(mockAuthHook);

    // Mock customer hook
    mockCustomerHook = {
      customer: mockCustomerProfile,
      paymentMethods: mockPaymentMethods,
      isLoading: false,
      isUpdating: false,
      error: null,
      updateProfile: vi.fn(),
      addPaymentMethod: vi.fn(),
      setDefaultPaymentMethod: vi.fn(),
      removePaymentMethod: vi.fn(),
      refreshCustomer: vi.fn(),
    };
    vi.mocked(useCustomer).mockReturnValue(mockCustomerHook);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Customer Creation Errors', () => {
    it('should handle customer creation failures', async () => {
      const user = userEvent.setup();

      // Mock customer creation failure
      vi.mocked(customerManager.getOrCreateStripeCustomer).mockResolvedValue({
        success: false,
        error: 'Failed to create customer',
      });

      // Mock customer not found
      vi.mocked(useCustomer).mockReturnValue({
        ...mockCustomerHook,
        customer: null,
        error: 'Customer not found',
      });

      customRender(<CustomerProfile />);

      expect(screen.getByText(/customer not found/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to create customer/i)).toBeInTheDocument();
    });

    it('should handle Stripe customer creation errors', async () => {
      const user = userEvent.setup();

      // Mock Stripe customer creation error
      vi.mocked(customerManager.getOrCreateStripeCustomer).mockResolvedValue({
        success: false,
        error: 'Stripe API error: Invalid email',
      });

      customRender(<CustomerProfile />);

      await waitFor(() => {
        expect(screen.getByText(/stripe api error/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });
    });

    it('should handle duplicate customer creation', async () => {
      const user = userEvent.setup();

      // Mock duplicate customer error
      vi.mocked(customerManager.getOrCreateStripeCustomer).mockResolvedValue({
        success: false,
        error: 'Customer already exists',
      });

      customRender(<CustomerProfile />);

      await waitFor(() => {
        expect(screen.getByText(/customer already exists/i)).toBeInTheDocument();
        expect(screen.getByText(/duplicate customer/i)).toBeInTheDocument();
      });
    });

    it('should handle customer creation rate limiting', async () => {
      const user = userEvent.setup();

      // Mock rate limiting error
      vi.mocked(customerManager.getOrCreateStripeCustomer).mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded',
      });

      customRender(<CustomerProfile />);

      await waitFor(() => {
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
        expect(screen.getByText(/try again later/i)).toBeInTheDocument();
      });
    });
  });

  describe('Customer Data Synchronization Errors', () => {
    it('should handle customer data sync failures', async () => {
      const user = userEvent.setup();

      // Mock sync failure
      vi.mocked(customerManager.syncCustomerData).mockResolvedValue({
        success: false,
        error: 'Failed to sync customer data',
      });

      customRender(<CustomerProfile />);

      await waitFor(() => {
        expect(screen.getByText(/failed to sync customer data/i)).toBeInTheDocument();
        expect(screen.getByText(/data synchronization error/i)).toBeInTheDocument();
      });
    });

    it('should handle partial data sync failures', async () => {
      const user = userEvent.setup();

      // Mock partial sync failure
      vi.mocked(customerManager.syncCustomerData).mockResolvedValue({
        success: false,
        error: 'Partial sync failure',
        partialData: {
          customer: mockCustomerProfile,
          paymentMethods: null,
        },
      });

      customRender(<CustomerProfile />);

      await waitFor(() => {
        expect(screen.getByText(/partial sync failure/i)).toBeInTheDocument();
        expect(screen.getByText(/incomplete data/i)).toBeInTheDocument();
      });
    });

    it('should handle data inconsistency errors', async () => {
      const user = userEvent.setup();

      // Mock data inconsistency
      vi.mocked(customerManager.syncCustomerData).mockResolvedValue({
        success: false,
        error: 'Data inconsistency detected',
      });

      customRender(<CustomerProfile />);

      await waitFor(() => {
        expect(screen.getByText(/data inconsistency detected/i)).toBeInTheDocument();
        expect(screen.getByText(/data conflict/i)).toBeInTheDocument();
      });
    });

    it('should retry failed sync operations', async () => {
      const user = userEvent.setup();

      // Mock retryable sync failure
      vi.mocked(customerManager.syncCustomerData);
        .mockResolvedValueOnce({
          success: false,
          error: 'Temporary sync failure',
        });
        .mockResolvedValueOnce({
          success: true,
          customer: mockCustomerProfile,
        });

      customRender(<CustomerProfile />);

      // Click retry button
      await user.click(screen.getByText(/retry sync/i));

      await waitFor(() => {
        expect(customerManager.syncCustomerData).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Customer Profile Update Errors', () => {
    it('should handle profile update failures', async () => {
      const user = userEvent.setup();

      // Mock profile update failure
      mockCustomerHook.updateProfile.mockResolvedValue({
        success: false,
        error: 'Failed to update profile',
      });

      customRender(<CustomerProfile />);

      // Click edit button
      await user.click(screen.getByText(/edit profile/i));

      // Update name
      const nameInput = screen.getByLabelText(/full name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      // Save changes
      await user.click(screen.getByText(/save changes/i));

      await waitFor(() => {
        expect(screen.getByText(/failed to update profile/i)).toBeInTheDocument();
      });
    });

    it('should handle validation errors during profile update', async () => {
      const user = userEvent.setup();

      // Mock validation error
      vi.mocked(customerManager.validateCustomerEmail).mockReturnValue({
        isValid: false,
        error: 'Invalid email format',
      });

      customRender(<CustomerProfile />);

      // Click edit button
      await user.click(screen.getByText(/edit profile/i));

      // Enter invalid email
      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      // Try to save
      await user.click(screen.getByText(/save changes/i));

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    it('should handle concurrent update conflicts', async () => {
      const user = userEvent.setup();

      // Mock concurrent update error
      mockCustomerHook.updateProfile.mockResolvedValue({
        success: false,
        error: 'Customer was updated by another process',
      });

      customRender(<CustomerProfile />);

      // Click edit button
      await user.click(screen.getByText(/edit profile/i));

      // Update name
      const nameInput = screen.getByLabelText(/full name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      // Save changes
      await user.click(screen.getByText(/save changes/i));

      await waitFor(() => {
        expect(screen.getByText(/customer was updated by another process/i)).toBeInTheDocument();
        expect(screen.getByText(/refresh to see latest changes/i)).toBeInTheDocument();
      });
    });

    it('should handle field-specific validation errors', async () => {
      const user = userEvent.setup();

      customRender(<CustomerProfile />);

      // Click edit button
      await user.click(screen.getByText(/edit profile/i));

      // Clear required field
      const nameInput = screen.getByLabelText(/full name/i);
      await user.clear(nameInput);

      // Try to save
      await user.click(screen.getByText(/save changes/i));

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Payment Method Management Errors', () => {
    it('should handle payment method addition failures', async () => {
      const user = userEvent.setup();

      // Mock payment method addition failure
      mockCustomerHook.addPaymentMethod.mockResolvedValue({
        success: false,
        error: 'Failed to add payment method',
      });

      customRender(<PaymentMethods />);

      // Click add payment method button
      await user.click(screen.getByText(/add payment method/i));

      await waitFor(() => {
        expect(screen.getByText(/failed to add payment method/i)).toBeInTheDocument();
      });
    });

    it('should handle payment method update failures', async () => {
      const user = userEvent.setup();

      // Mock payment method update failure
      mockCustomerHook.setDefaultPaymentMethod.mockResolvedValue({
        success: false,
        error: 'Failed to update payment method',
      });

      customRender(<PaymentMethods />);

      // Click set default button
      await user.click(screen.getByText(/set as default/i));

      await waitFor(() => {
        expect(screen.getByText(/failed to update payment method/i)).toBeInTheDocument();
      });
    });

    it('should handle payment method removal failures', async () => {
      const user = userEvent.setup();

      // Mock payment method removal failure
      mockCustomerHook.removePaymentMethod.mockResolvedValue({
        success: false,
        error: 'Failed to remove payment method',
      });

      customRender(<PaymentMethods />);

      // Click remove button
      await user.click(screen.getByText(/remove/i));

      // Confirm removal
      await user.click(screen.getByText(/confirm/i));

      await waitFor(() => {
        expect(screen.getByText(/failed to remove payment method/i)).toBeInTheDocument();
      });
    });

    it('should handle Stripe payment method errors', async () => {
      const user = userEvent.setup();

      // Mock Stripe payment method error
      mockCustomerHook.addPaymentMethod.mockResolvedValue({
        success: false,
        error: 'Stripe error: Invalid payment method',
      });

      customRender(<PaymentMethods />);

      // Click add payment method button
      await user.click(screen.getByText(/add payment method/i));

      await waitFor(() => {
        expect(screen.getByText(/stripe error/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid payment method/i)).toBeInTheDocument();
      });
    });

    it('should prevent removing the last payment method', async () => {
      const user = userEvent.setup();

      // Mock single payment method
      vi.mocked(useCustomer).mockReturnValue({
        ...mockCustomerHook,
        paymentMethods: [mockPaymentMethods[0]],
      });

      customRender(<PaymentMethods />);

      // Try to remove the only payment method
      await user.click(screen.getByText(/remove/i));

      await waitFor(() => {
        expect(screen.getByText(/cannot remove last payment method/i)).toBeInTheDocument();
      });
    });
  });

  describe('Customer Validation Errors', () => {
    it('should handle email validation failures', async () => {
      const user = userEvent.setup();

      // Mock email validation failure
      vi.mocked(customerManager.validateCustomerEmail).mockReturnValue({
        isValid: false,
        error: 'Invalid email format',
      });

      customRender(<CustomerProfile />);

      // Click edit button
      await user.click(screen.getByText(/edit profile/i));

      // Enter invalid email
      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      // Try to save
      await user.click(screen.getByText(/save changes/i));

      await waitFor(() => {
        expect(customerManager.validateCustomerEmail).toHaveBeenCalledWith('invalid-email');
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    it('should handle phone number validation failures', async () => {
      const user = userEvent.setup();

      customRender(<CustomerProfile />);

      // Click edit button
      await user.click(screen.getByText(/edit profile/i));

      // Enter invalid phone
      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, 'invalid-phone');

      // Try to save
      await user.click(screen.getByText(/save changes/i));

      await waitFor(() => {
        expect(screen.getByText(/invalid phone format/i)).toBeInTheDocument();
      });
    });

    it('should handle address validation failures', async () => {
      const user = userEvent.setup();

      customRender(<CustomerProfile />);

      // Click edit button
      await user.click(screen.getByText(/edit profile/i));

      // Clear required address fields
      const streetInput = screen.getByLabelText(/street address/i);
      await user.clear(streetInput);

      // Try to save
      await user.click(screen.getByText(/save changes/i));

      await waitFor(() => {
        expect(screen.getByText(/street address is required/i)).toBeInTheDocument();
      });
    });

    it('should handle country validation failures', async () => {
      const user = userEvent.setup();

      customRender(<CustomerProfile />);

      // Click edit button
      await user.click(screen.getByText(/edit profile/i));

      // Select invalid country
      const countrySelect = screen.getByRole('combobox', { name: /country/i });
      await user.click(countrySelect);
      await user.click(screen.getByText('Invalid Country'));

      // Try to save
      await user.click(screen.getByText(/save changes/i));

      await waitFor(() => {
        expect(screen.getByText(/invalid country/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Consistency Errors', () => {
    it('should handle customer data corruption', async () => {
      const user = userEvent.setup();

      // Mock corrupted customer data
      const corruptedCustomer = {
        ...mockCustomerProfile,
        email: null,
        name: '',
      };

      vi.mocked(useCustomer).mockReturnValue({
        ...mockCustomerHook,
        customer: corruptedCustomer,
        error: 'Customer data corruption detected',
      });

      customRender(<CustomerProfile />);

      expect(screen.getByText(/customer data corruption detected/i)).toBeInTheDocument();
      expect(screen.getByText(/data integrity error/i)).toBeInTheDocument();
    });

    it('should handle payment method data inconsistency', async () => {
      const user = userEvent.setup();

      // Mock inconsistent payment method data
      const inconsistentPaymentMethods = [
        {
          ...mockPaymentMethods[0],
          card: null,
        },
      ]

      vi.mocked(useCustomer).mockReturnValue({
        ...mockCustomerHook,
        paymentMethods: inconsistentPaymentMethods,
        error: 'Payment method data inconsistency',
      });

      customRender(<PaymentMethods />);

      expect(screen.getByText(/payment method data inconsistency/i)).toBeInTheDocument();
      expect(screen.getByText(/data integrity error/i)).toBeInTheDocument();
    });

    it('should handle customer ID mismatch', async () => {
      const user = userEvent.setup();

      // Mock customer ID mismatch
      vi.mocked(customerManager.syncCustomerData).mockResolvedValue({
        success: false,
        error: 'Customer ID mismatch',
      });

      customRender(<CustomerProfile />);

      await waitFor(() => {
        expect(screen.getByText(/customer id mismatch/i)).toBeInTheDocument();
        expect(screen.getByText(/data consistency error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should provide data recovery options', async () => {
      const user = userEvent.setup();

      // Mock data recovery
      vi.mocked(useCustomer).mockReturnValue({
        ...mockCustomerHook,
        error: 'Data recovery needed',
        recoveryOptions: {
          restoreFromBackup: true,
          reSyncFromStripe: true,
          manualFix: true,
        },
      });

      customRender(<CustomerProfile />);

      expect(screen.getByText(/data recovery needed/i)).toBeInTheDocument();
      expect(screen.getByText(/restore from backup/i)).toBeInTheDocument();
      expect(screen.getByText(/re-sync from stripe/i)).toBeInTheDocument();
      expect(screen.getByText(/manual fix/i)).toBeInTheDocument();
    });

    it('should allow manual data correction', async () => {
      const user = userEvent.setup();

      // Mock manual correction
      mockCustomerHook.updateProfile.mockResolvedValue({
        success: true,
        customer: mockCustomerProfile,
      });

      customRender(<CustomerProfile />);

      // Click manual correction
      await user.click(screen.getByText(/manual fix/i));

      // Should show edit form
      expect(screen.getByText(/edit profile/i)).toBeInTheDocument();
    });

    it('should provide data validation and repair tools', async () => {
      const user = userEvent.setup();

      // Mock validation and repair
      vi.mocked(customerManager.syncCustomerData).mockResolvedValue({
        success: true,
        customer: mockCustomerProfile,
        repaired: true,
        repairs: ['Fixed email format', 'Updated phone number'],
      });

      customRender(<CustomerProfile />);

      // Click repair button
      await user.click(screen.getByText(/repair data/i));

      await waitFor(() => {
        expect(screen.getByText(/data repaired/i)).toBeInTheDocument();
        expect(screen.getByText(/fixed email format/i)).toBeInTheDocument();
        expect(screen.getByText(/updated phone number/i)).toBeInTheDocument();
      });
    });

    it('should provide error reporting and support options', async () => {
      const user = userEvent.setup();

      // Mock error reporting
      vi.mocked(useCustomer).mockReturnValue({
        ...mockCustomerHook,
        error: 'Critical error',
        supportOptions: {
          reportError: true,
          contactSupport: true,
          viewLogs: true,
        },
      });

      customRender(<CustomerProfile />);

      expect(screen.getByText(/critical error/i)).toBeInTheDocument();
      expect(screen.getByText(/report error/i)).toBeInTheDocument();
      expect(screen.getByText(/contact support/i)).toBeInTheDocument();
      expect(screen.getByText(/view logs/i)).toBeInTheDocument();
    });
  });
});
