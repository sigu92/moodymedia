/**
 * Customer Creation and Management Functionality Tests
 * 
 * Tests the complete customer creation and management functionality including:
 * - Customer profile creation and updates
 * - Payment method management
 * - Customer data validation
 * - Customer search and filtering
 * - Customer data synchronization
 * - Customer preferences and settings
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerProfile } from '@/components/customer/CustomerProfile'
import { PaymentMethods } from '@/components/customer/PaymentMethods'
import { CustomerSettings } from '@/components/customer/CustomerSettings'
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

describe('Customer Creation and Management Functionality', () => {
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
    {
      id: 'pm_456',
      type: 'card',
      card: {
        brand: 'mastercard',
        last4: '5555',
        exp_month: 6,
        exp_year: 2026,
      },
      is_default: false,
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

  describe('Customer Profile Creation', () => {
    it('should create customer profile from user data', async () => {
      // Mock customer creation
      vi.mocked(customerManager.getOrCreateStripeCustomer).mockResolvedValue({
        success: true,
        customer: mockCustomerProfile,
      });

      customRender(<CustomerProfile />);

      await waitFor(() => {
        expect(customerManager.getOrCreateStripeCustomer).toHaveBeenCalledWith('user_123');
      });

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should handle customer creation with minimal data', async () => {
      const minimalUser = {
        id: 'user_456',
        email: 'minimal@example.com',
        user_metadata: {},
      };

      const minimalCustomer = {
        id: 'cus_test_456',
        email: 'minimal@example.com',
        name: null,
        phone: null,
        address: null,
        created: 1640995200,
        default_source: null,
        metadata: {
          user_id: 'user_456',
          source: 'moodymedia',
        },
      };

      vi.mocked(useAuth).mockReturnValue({
        ...mockAuthHook,
        user: minimalUser,
      });

      vi.mocked(customerManager.getOrCreateStripeCustomer).mockResolvedValue({
        success: true,
        customer: minimalCustomer,
      });

      customRender(<CustomerProfile />);

      await waitFor(() => {
        expect(customerManager.getOrCreateStripeCustomer).toHaveBeenCalledWith('user_456');
      });

      expect(screen.getByText('minimal@example.com')).toBeInTheDocument();
    });

    it('should handle customer creation failures gracefully', async () => {
      vi.mocked(customerManager.getOrCreateStripeCustomer).mockResolvedValue({
        success: false,
        error: 'Failed to create customer',
      });

      vi.mocked(useCustomer).mockReturnValue({
        ...mockCustomerHook,
        customer: null,
        error: 'Failed to create customer',
      });

      customRender(<CustomerProfile />);

      expect(screen.getByText(/failed to create customer/i)).toBeInTheDocument();
      expect(screen.getByText(/create customer profile/i)).toBeInTheDocument();
    });

    it('should create customer with Stripe integration', async () => {
      const stripeCustomer = {
        ...mockCustomerProfile,
        stripe_customer_id: 'cus_stripe_123',
        stripe_created: 1640995200,
      };

      vi.mocked(customerManager.getOrCreateStripeCustomer).mockResolvedValue({
        success: true,
        customer: stripeCustomer,
        stripeCustomer: {
          id: 'cus_stripe_123',
          email: 'test@example.com',
          name: 'Test User',
        },
      });

      customRender(<CustomerProfile />);

      await waitFor(() => {
        expect(customerManager.getOrCreateStripeCustomer).toHaveBeenCalledWith('user_123');
      });

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  describe('Customer Profile Management', () => {
    it('should display complete customer profile information', () => {
      customRender(<CustomerProfile />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('123 Main St')).toBeInTheDocument();
      expect(screen.getByText('Apt 4B')).toBeInTheDocument();
      expect(screen.getByText('Anytown, CA 12345')).toBeInTheDocument();
      expect(screen.getByText('United States')).toBeInTheDocument();
    });

    it('should allow editing customer profile', async () => {
      const user = userEvent.setup();

      mockCustomerHook.updateProfile.mockResolvedValue({
        success: true,
        customer: {
          ...mockCustomerProfile,
          name: 'Updated Name',
          phone: '+1987654321',
        },
      });

      customRender(<CustomerProfile />);

      // Click edit button
      await user.click(screen.getByText(/edit profile/i));

      // Update name
      const nameInput = screen.getByLabelText(/full name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      // Update phone
      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '+1987654321');

      // Save changes
      await user.click(screen.getByText(/save changes/i));

      await waitFor(() => {
        expect(mockCustomerHook.updateProfile).toHaveBeenCalledWith({
          name: 'Updated Name',
          phone: '+1987654321',
        });
      });
    });

    it('should validate customer profile data', async () => {
      const user = userEvent.setup();

      customRender(<CustomerProfile />);

      // Click edit button
      await user.click(screen.getByText(/edit profile/i));

      // Clear required fields
      const nameInput = screen.getByLabelText(/full name/i);
      await user.clear(nameInput);

      // Try to save
      await user.click(screen.getByText(/save changes/i));

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('should handle profile update errors', async () => {
      const user = userEvent.setup();

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
  });

  describe('Payment Method Management', () => {
    it('should display customer payment methods', () => {
      customRender(<PaymentMethods />);

      expect(screen.getByText(/visa.*4242/i)).toBeInTheDocument();
      expect(screen.getByText(/mastercard.*5555/i)).toBeInTheDocument();
      expect(screen.getByText(/12\/25/i)).toBeInTheDocument();
      expect(screen.getByText(/6\/26/i)).toBeInTheDocument();
      expect(screen.getByText(/default/i)).toBeInTheDocument();
    });

    it('should allow adding new payment methods', async () => {
      const user = userEvent.setup();

      const newPaymentMethod = {
        id: 'pm_new_123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '1234',
          exp_month: 12,
          exp_year: 2025,
        },
        is_default: false,
      };

      mockCustomerHook.addPaymentMethod.mockResolvedValue({
        success: true,
        paymentMethod: newPaymentMethod,
      });

      customRender(<PaymentMethods />);

      // Click add payment method button
      await user.click(screen.getByText(/add payment method/i));

      // Fill in payment method details
      await user.type(screen.getByLabelText(/card number/i), '4242424242424242');
      await user.type(screen.getByLabelText(/expiry month/i), '12');
      await user.type(screen.getByLabelText(/expiry year/i), '2025');
      await user.type(screen.getByLabelText(/cvc/i), '123');

      // Submit payment method
      await user.click(screen.getByText(/add payment method/i));

      await waitFor(() => {
        expect(mockCustomerHook.addPaymentMethod).toHaveBeenCalledWith({
          type: 'card',
          card: {
            number: '4242424242424242',
            exp_month: 12,
            exp_year: 2025,
            cvc: '123',
          },
        });
      });
    });

    it('should allow setting default payment method', async () => {
      const user = userEvent.setup();

      mockCustomerHook.setDefaultPaymentMethod.mockResolvedValue({
        success: true,
        paymentMethods: mockPaymentMethods.map(pm => ({
          ...pm,
          is_default: pm.id === 'pm_456',
        })),
      });

      customRender(<PaymentMethods />);

      // Click set default button for second payment method
      const setDefaultButtons = screen.getAllByText(/set as default/i);
      await user.click(setDefaultButtons[1]);

      await waitFor(() => {
        expect(mockCustomerHook.setDefaultPaymentMethod).toHaveBeenCalledWith('pm_456');
      });
    });

    it('should allow removing payment methods', async () => {
      const user = userEvent.setup();

      mockCustomerHook.removePaymentMethod.mockResolvedValue({
        success: true,
        paymentMethods: [mockPaymentMethods[0]], // Only first payment method remains
      });

      customRender(<PaymentMethods />);

      // Click remove button for second payment method
      const removeButtons = screen.getAllByText(/remove/i);
      await user.click(removeButtons[1]);

      // Confirm removal
      await user.click(screen.getByText(/confirm/i));

      await waitFor(() => {
        expect(mockCustomerHook.removePaymentMethod).toHaveBeenCalledWith('pm_456');
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

  describe('Customer Data Validation', () => {
    it('should validate email format', async () => {
      const user = userEvent.setup();

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

    it('should validate phone number format', async () => {
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

    it('should validate address information', async () => {
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

    it('should validate country selection', async () => {
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

  describe('Customer Data Synchronization', () => {
    it('should sync customer data on load', async () => {
      vi.mocked(customerManager.syncCustomerData).mockResolvedValue({
        success: true,
        customer: mockCustomerProfile,
        paymentMethods: mockPaymentMethods,
      });

      customRender(<CustomerProfile />);

      await waitFor(() => {
        expect(customerManager.syncCustomerData).toHaveBeenCalledWith('user_123');
      });
    });

    it('should handle sync errors gracefully', async () => {
      vi.mocked(customerManager.syncCustomerData).mockResolvedValue({
        success: false,
        error: 'Sync failed',
      });

      customRender(<CustomerProfile />);

      await waitFor(() => {
        expect(screen.getByText(/sync failed/i)).toBeInTheDocument();
      });
    });

    it('should refresh customer data when requested', async () => {
      const user = userEvent.setup();

      mockCustomerHook.refreshCustomer.mockResolvedValue({
        success: true,
        customer: mockCustomerProfile,
        paymentMethods: mockPaymentMethods,
      });

      customRender(<CustomerProfile />);

      // Click refresh button
      await user.click(screen.getByText(/refresh/i));

      await waitFor(() => {
        expect(mockCustomerHook.refreshCustomer).toHaveBeenCalled();
      });
    });

    it('should handle partial sync failures', async () => {
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
  });

  describe('Customer Settings and Preferences', () => {
    it('should display customer settings', () => {
      const customerSettings = {
        notifications: {
          email: true,
          sms: false,
          push: true,
        },
        privacy: {
          shareData: false,
          marketing: true,
        },
        preferences: {
          currency: 'EUR',
          language: 'en',
          timezone: 'UTC',
        },
      };

      vi.mocked(useCustomer).mockReturnValue({
        ...mockCustomerHook,
        settings: customerSettings,
      });

      customRender(<CustomerSettings />);

      expect(screen.getByText(/notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/privacy/i)).toBeInTheDocument();
      expect(screen.getByText(/preferences/i)).toBeInTheDocument();
    });

    it('should allow updating customer settings', async () => {
      const user = userEvent.setup();

      mockCustomerHook.updateSettings = vi.fn().mockResolvedValue({
        success: true,
        settings: {
          notifications: {
            email: false,
            sms: true,
            push: true,
          },
        },
      });

      customRender(<CustomerSettings />);

      // Toggle email notifications
      const emailToggle = screen.getByLabelText(/email notifications/i);
      await user.click(emailToggle);

      // Toggle SMS notifications
      const smsToggle = screen.getByLabelText(/sms notifications/i);
      await user.click(smsToggle);

      // Save settings
      await user.click(screen.getByText(/save settings/i));

      await waitFor(() => {
        expect(mockCustomerHook.updateSettings).toHaveBeenCalledWith({
          notifications: {
            email: false,
            sms: true,
            push: true,
          },
        });
      });
    });

    it('should handle settings update errors', async () => {
      const user = userEvent.setup();

      mockCustomerHook.updateSettings = vi.fn().mockResolvedValue({
        success: false,
        error: 'Failed to update settings',
      });

      customRender(<CustomerSettings />);

      // Toggle email notifications
      const emailToggle = screen.getByLabelText(/email notifications/i);
      await user.click(emailToggle);

      // Save settings
      await user.click(screen.getByText(/save settings/i));

      await waitFor(() => {
        expect(screen.getByText(/failed to update settings/i)).toBeInTheDocument();
      });
    });
  });

  describe('Customer Search and Filtering', () => {
    it('should search customers by email', async () => {
      const user = userEvent.setup();

      const searchResults = [
        {
          ...mockCustomerProfile,
          id: 'cus_1',
          email: 'test1@example.com',
          name: 'Test User 1',
        },
        {
          ...mockCustomerProfile,
          id: 'cus_2',
          email: 'test2@example.com',
          name: 'Test User 2',
        },
      ]

      mockCustomerHook.searchCustomers = vi.fn().mockResolvedValue({
        success: true,
        customers: searchResults,
      });

      customRender(<CustomerProfile />);

      // Search for customers
      const searchInput = screen.getByPlaceholderText(/search customers/i);
      await user.type(searchInput, 'test@example.com');

      await waitFor(() => {
        expect(mockCustomerHook.searchCustomers).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('should filter customers by status', async () => {
      const user = userEvent.setup();

      const activeCustomers = [
        {
          ...mockCustomerProfile,
          id: 'cus_1',
          status: 'active',
        },
        {
          ...mockCustomerProfile,
          id: 'cus_2',
          status: 'active',
        },
      ]

      mockCustomerHook.filterCustomers = vi.fn().mockResolvedValue({
        success: true,
        customers: activeCustomers,
      });

      customRender(<CustomerProfile />);

      // Filter by active status
      await user.click(screen.getByText(/filter by status/i));
      await user.click(screen.getByText(/active/i));

      await waitFor(() => {
        expect(mockCustomerHook.filterCustomers).toHaveBeenCalledWith('status', 'active');
      });
    });

    it('should handle search and filter errors', async () => {
      const user = userEvent.setup();

      mockCustomerHook.searchCustomers = vi.fn().mockResolvedValue({
        success: false,
        error: 'Search failed',
      });

      customRender(<CustomerProfile />);

      // Search for customers
      const searchInput = screen.getByPlaceholderText(/search customers/i);
      await user.type(searchInput, 'test@example.com');

      await waitFor(() => {
        expect(screen.getByText(/search failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Customer Data Export and Import', () => {
    it('should export customer data', async () => {
      const user = userEvent.setup();

      const exportData = {
        customer: mockCustomerProfile,
        paymentMethods: mockPaymentMethods,
        orders: [],
        settings: {},
      };

      mockCustomerHook.exportCustomerData = vi.fn().mockResolvedValue({
        success: true,
        data: exportData,
        filename: 'customer_data.json',
      });

      customRender(<CustomerProfile />);

      // Click export button
      await user.click(screen.getByText(/export data/i));

      await waitFor(() => {
        expect(mockCustomerHook.exportCustomerData).toHaveBeenCalled();
      });
    });

    it('should import customer data', async () => {
      const user = userEvent.setup();

      const importData = {
        customer: mockCustomerProfile,
        paymentMethods: mockPaymentMethods,
      };

      mockCustomerHook.importCustomerData = vi.fn().mockResolvedValue({
        success: true,
        imported: importData,
      });

      customRender(<CustomerProfile />);

      // Click import button
      await user.click(screen.getByText(/import data/i));

      // Select file
      const fileInput = screen.getByLabelText(/select file/i);
      const file = new File([JSON.stringify(importData)], 'customer_data.json', {
        type: 'application/json',
      });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(mockCustomerHook.importCustomerData).toHaveBeenCalledWith(importData);
      });
    });

    it('should handle import validation errors', async () => {
      const user = userEvent.setup();

      const invalidData = {
        customer: {
          // Missing required fields
        },
      };

      mockCustomerHook.importCustomerData = vi.fn().mockResolvedValue({
        success: false,
        error: 'Invalid data format',
      });

      customRender(<CustomerProfile />);

      // Click import button
      await user.click(screen.getByText(/import data/i));

      // Select invalid file
      const fileInput = screen.getByLabelText(/select file/i);
      const file = new File([JSON.stringify(invalidData)], 'invalid_data.json', {
        type: 'application/json',
      });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/invalid data format/i)).toBeInTheDocument();
      });
    });
  });
});
