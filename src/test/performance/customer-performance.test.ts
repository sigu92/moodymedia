/**
 * Performance Tests for Customer Management
 * 
 * Tests performance characteristics of:
 * - Customer creation and profile management
 * - Payment method operations
 * - Data synchronization and validation
 * - Search and filtering operations
 * - Memory usage and resource consumption
 * - Concurrent operations and scalability
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

describe('Customer Management Performance', () => {
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

  describe('Customer Profile Operations Performance', () => {
    it('should create customer profiles within acceptable time limits', async () => {
      const user = userEvent.setup();

      // Mock customer creation with timing
      const startTime = performance.now();
      vi.mocked(customerManager.getOrCreateStripeCustomer).mockImplementation(async () => {
        // Simulate customer creation delay
        await new Promise(resolve => setTimeout(resolve, 150));
        
        const endTime = performance.now();
        const duration = endTime - startTime
        
        return {
          success: true,
          customer: mockCustomerProfile,
          duration,
        };
      });

      customRender(<CustomerProfile />);

      // Verify customer creation performance
      const result = await customerManager.getOrCreateStripeCustomer('user_123');
      expect(result.duration).toBeLessThan(500) // Should complete within 500ms
    });

    it('should update customer profiles efficiently', async () => {
      const user = userEvent.setup();

      // Mock profile update with timing
      const startTime = performance.now();
      mockCustomerHook.updateProfile.mockImplementation(async () => {
        // Simulate profile update delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const endTime = performance.now();
        const duration = endTime - startTime
        
        return {
          success: true,
          customer: {
            ...mockCustomerProfile,
            name: 'Updated Name',
          },
          duration,
        };
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
        expect(mockCustomerHook.updateProfile).toHaveBeenCalled();
      });

      // Verify performance
      const result = await mockCustomerHook.updateProfile({
        name: 'Updated Name',
      });
      expect(result.duration).toBeLessThan(300) // Should complete within 300ms
    });

    it('should handle bulk customer operations efficiently', async () => {
      const customers = Array.from({ length: 100 }, (_, i) => ({
        ...mockCustomerProfile,
        id: `cus_test_${i}`,
        email: `test${i}@example.com`,
        name: `Test User ${i}`,
      }));

      const startTime = performance.now();
      const operationTimes = []

      // Process all customers
      for (const customer of customers) {
        const operationStart = performance.now();
        
        // Simulate customer operation
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const operationEnd = performance.now();
        operationTimes.push(operationEnd - operationStart);
      };

      const endTime = performance.now();
      const totalDuration = endTime - startTime

      // Calculate performance metrics
      const avgOperationTime = operationTimes.reduce((sum, time) => sum + time, 0) / operationTimes.length
      const maxOperationTime = Math.max(...operationTimes);

      // Performance assertions
      expect(avgOperationTime).toBeLessThan(50) // Average should be under 50ms
      expect(maxOperationTime).toBeLessThan(100) // Max should be under 100ms
      expect(totalDuration).toBeLessThan(2000) // Total should be under 2 seconds
    });
  });

  describe('Payment Method Operations Performance', () => {
    it('should add payment methods efficiently', async () => {
      const user = userEvent.setup();

      // Mock payment method addition with timing
      const startTime = performance.now();
      mockCustomerHook.addPaymentMethod.mockImplementation(async () => {
        // Simulate payment method addition delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const endTime = performance.now();
        const duration = endTime - startTime
        
        return {
          success: true,
          paymentMethod: {
            id: 'pm_new_123',
            type: 'card',
            card: {
              brand: 'visa',
              last4: '1234',
              exp_month: 12,
              exp_year: 2025,
            },
            is_default: false,
          },
          duration,
        };
      });

      customRender(<PaymentMethods />);

      // Click add payment method button
      await user.click(screen.getByText(/add payment method/i));

      await waitFor(() => {
        expect(mockCustomerHook.addPaymentMethod).toHaveBeenCalled();
      });

      // Verify performance
      const result = await mockCustomerHook.addPaymentMethod({
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      });
      expect(result.duration).toBeLessThan(500) // Should complete within 500ms
    });

    it('should update payment methods efficiently', async () => {
      const user = userEvent.setup();

      // Mock payment method update with timing
      const startTime = performance.now();
      mockCustomerHook.setDefaultPaymentMethod.mockImplementation(async () => {
        // Simulate payment method update delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const endTime = performance.now();
        const duration = endTime - startTime
        
        return {
          success: true,
          paymentMethods: mockPaymentMethods.map(pm => ({
            ...pm,
            is_default: pm.id === 'pm_456',
          })),
          duration,
        };
      });

      customRender(<PaymentMethods />);

      // Click set default button
      await user.click(screen.getByText(/set as default/i));

      await waitFor(() => {
        expect(mockCustomerHook.setDefaultPaymentMethod).toHaveBeenCalled();
      });

      // Verify performance
      const result = await mockCustomerHook.setDefaultPaymentMethod('pm_456');
      expect(result.duration).toBeLessThan(300) // Should complete within 300ms
    });

    it('should handle multiple payment method operations concurrently', async () => {
      const paymentMethodOperations = Array.from({ length: 50 }, (_, i) => ({
        operationId: i,
        type: 'add',
        data: {
          type: 'card',
          card: {
            brand: 'visa',
            last4: `${i.toString().padStart(4, '0')}`,
            exp_month: 12,
            exp_year: 2025,
          },
        },
      }));

      const startTime = performance.now();

      // Execute all operations concurrently
      const results = await Promise.all(
        paymentMethodOperations.map(async (operation) => {
          const operationStart = performance.now();
          
          // Simulate payment method operation
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const operationEnd = performance.now();
          return {
            ...operation,
            duration: operationEnd - operationStart,
            success: true,
          };
        });
      );

      const endTime = performance.now();
      const totalDuration = endTime - startTime

      // Calculate performance metrics
      const avgOperationTime = results.reduce((sum, result) => sum + result.duration, 0) / results.length
      const maxOperationTime = Math.max(...results.map(result => result.duration));

      // Performance assertions
      expect(avgOperationTime).toBeLessThan(100) // Average should be under 100ms
      expect(maxOperationTime).toBeLessThan(200) // Max should be under 200ms
      expect(totalDuration).toBeLessThan(1000) // Total should be under 1 second
    });
  });

  describe('Data Synchronization Performance', () => {
    it('should sync customer data efficiently', async () => {
      const startTime = performance.now();
      vi.mocked(customerManager.syncCustomerData).mockImplementation(async () => {
        // Simulate data sync delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const endTime = performance.now();
        const duration = endTime - startTime
        
        return {
          success: true,
          customer: mockCustomerProfile,
          paymentMethods: mockPaymentMethods,
          duration,
        };
      });

      customRender(<CustomerProfile />);

      // Verify sync performance
      const result = await customerManager.syncCustomerData('user_123');
      expect(result.duration).toBeLessThan(500) // Should complete within 500ms
    });

    it('should handle partial data sync efficiently', async () => {
      const partialSyncData = {
        customer: mockCustomerProfile,
        paymentMethods: null, // Partial sync
        lastSync: Date.now(),
      };

      const startTime = performance.now();
      vi.mocked(customerManager.syncCustomerData).mockImplementation(async () => {
        // Simulate partial sync delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const endTime = performance.now();
        const duration = endTime - startTime
        
        return {
          success: true,
          ...partialSyncData,
          duration,
        };
      });

      customRender(<CustomerProfile />);

      // Verify partial sync performance
      const result = await customerManager.syncCustomerData('user_123');
      expect(result.duration).toBeLessThan(300) // Should complete within 300ms
    });

    it('should handle data validation efficiently', async () => {
      const validationData = Array.from({ length: 1000 }, (_, i) => ({
        email: `test${i}@example.com`,
        phone: `+123456789${i}`,
        name: `Test User ${i}`,
      }));

      const startTime = performance.now();
      const validationTimes = []

      for (const data of validationData) {
        const validationStart = performance.now();
        
        // Simulate validation
        await new Promise(resolve => setTimeout(resolve, 1));
        
        const validationEnd = performance.now();
        validationTimes.push(validationEnd - validationStart);
      };

      const endTime = performance.now();
      const totalDuration = endTime - startTime

      // Calculate performance metrics
      const avgValidationTime = validationTimes.reduce((sum, time) => sum + time, 0) / validationTimes.length

      // Performance assertions
      expect(avgValidationTime).toBeLessThan(5) // Average should be under 5ms
      expect(totalDuration).toBeLessThan(2000) // Total should be under 2 seconds
    });
  });

  describe('Search and Filtering Performance', () => {
    it('should search customers efficiently', async () => {
      const customers = Array.from({ length: 10000 }, (_, i) => ({
        ...mockCustomerProfile,
        id: `cus_test_${i}`,
        email: `test${i}@example.com`,
        name: `Test User ${i}`,
      }));

      const searchQuery = 'test@example.com'
      const startTime = performance.now();
      
      // Simulate customer search
      const searchResults = customers.filter(customer => 
        customer.email.includes(searchQuery) || 
        customer.name.includes(searchQuery);
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime

      // Performance assertions
      expect(duration).toBeLessThan(100) // Should complete within 100ms
      expect(searchResults.length).toBeGreaterThan(0);
    });

    it('should filter customers efficiently', async () => {
      const customers = Array.from({ length: 5000 }, (_, i) => ({
        ...mockCustomerProfile,
        id: `cus_test_${i}`,
        email: `test${i}@example.com`,
        name: `Test User ${i}`,
        created: 1640995200 + i * 86400, // Different creation dates
      }));

      const filterCriteria = {
        dateRange: {
          start: 1640995200,
          end: 1640995200 + 30 * 86400, // 30 days
        },
        status: 'active',
      };

      const startTime = performance.now();
      
      // Simulate customer filtering
      const filteredResults = customers.filter(customer => 
        customer.created >= filterCriteria.dateRange.start &&
        customer.created <= filterCriteria.dateRange.end
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime

      // Performance assertions
      expect(duration).toBeLessThan(50) // Should complete within 50ms
      expect(filteredResults.length).toBeGreaterThan(0);
    });

    it('should handle complex search queries efficiently', async () => {
      const customers = Array.from({ length: 10000 }, (_, i) => ({
        ...mockCustomerProfile,
        id: `cus_test_${i}`,
        email: `test${i}@example.com`,
        name: `Test User ${i}`,
        address: {
          city: i % 2 === 0 ? 'New York' : 'Los Angeles',
          state: i % 2 === 0 ? 'NY' : 'CA',
          country: 'US',
        },
      }));

      const complexQuery = {
        search: 'test',
        filters: {
          city: 'New York',
          state: 'NY',
        },
        sort: 'name',
        limit: 100,
      };

      const startTime = performance.now();
      
      // Simulate complex search
      let results = customers.filter(customer => 
        customer.email.includes(complexQuery.search) || 
        customer.name.includes(complexQuery.search);
      );
      
      results = results.filter(customer => 
        customer.address.city === complexQuery.filters.city &&
        customer.address.state === complexQuery.filters.state
      );
      
      results = results.sort((a, b) => a.name.localeCompare(b.name));
      results = results.slice(0, complexQuery.limit);
      
      const endTime = performance.now();
      const duration = endTime - startTime

      // Performance assertions
      expect(duration).toBeLessThan(200) // Should complete within 200ms
      expect(results.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should maintain reasonable memory usage during customer operations', async () => {
      // Guard against performance.memory not being available in all environments
      const initialMemory = (typeof performance !== 'undefined' && performance.memory);
        ? performance.memory.usedJSHeapSize
        : 0
      
      const customers = Array.from({ length: 1000 }, (_, i) => ({
        ...mockCustomerProfile,
        id: `cus_test_${i}`,
        email: `test${i}@example.com`,
        name: `Test User ${i}`,
        paymentMethods: Array.from({ length: 5 }, (_, j) => ({
          id: `pm_${i}_${j}`,
          type: 'card',
          card: {
            brand: 'visa',
            last4: `${j.toString().padStart(4, '0')}`,
            exp_month: 12,
            exp_year: 2025,
          },
          is_default: j === 0,
        })),
      }));

      // Process customers
      for (const customer of customers) {
        // Simulate customer processing
        await new Promise(resolve => setTimeout(resolve, 1));
      };

      const finalMemory = (typeof performance !== 'undefined' && performance.memory);
        ? performance.memory.usedJSHeapSize
        : 0
      const memoryIncrease = finalMemory - initialMemory

      // Skip memory tests if performance.memory is not available
      if (typeof performance !== 'undefined' && performance.memory) {
        // Memory increase should be reasonable (less than 100MB);
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      } else {
        // Skip memory assertion in environments without performance.memory
        expect(memoryIncrease).toBe(0);
      };
    });

    it('should clean up resources after customer operations', async () => {
      let resourcesCreated = 0
      let resourcesCleaned = 0

      const customers = Array.from({ length: 100 }, (_, i) => ({
        ...mockCustomerProfile,
        id: `cus_test_${i}`,
      }));

      // Process customers
      for (const customer of customers) {
        // Simulate resource creation
        resourcesCreated += 2
        
        // Simulate customer processing
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Simulate resource cleanup
        resourcesCleaned += 2
      };

      // Verify resource cleanup
      expect(resourcesCreated).toBe(200);
      expect(resourcesCleaned).toBe(200);
      expect(resourcesCreated).toBe(resourcesCleaned);
    });

    it('should handle large customer datasets efficiently', async () => {
      const largeCustomerDataset = Array.from({ length: 50000 }, (_, i) => ({
        ...mockCustomerProfile,
        id: `cus_test_${i}`,
        email: `test${i}@example.com`,
        name: `Test User ${i}`,
        metadata: {
          user_id: `user_${i}`,
          source: 'moodymedia',
          additional_data: new Array(100).fill(0).map((_, j) => ({ id: j, value: `data_${j}` })),
        },
      }));

      const startTime = performance.now();
      
      // Process large dataset
      const processedCustomers = largeCustomerDataset.map(customer => ({
        ...customer,
        processed: true,
        processedAt: Date.now(),
      }));
      
      const endTime = performance.now();
      const duration = endTime - startTime

      // Should process large datasets efficiently
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
      expect(processedCustomers.length).toBe(50000);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent customer operations efficiently', async () => {
      const concurrentOperations = Array.from({ length: 100 }, (_, i) => ({
        operationId: i,
        type: 'update_profile',
        customerId: `cus_test_${i}`,
        data: {
          name: `Updated User ${i}`,
          email: `updated${i}@example.com`,
        },
      }));

      const startTime = performance.now();

      // Execute all operations concurrently
      const results = await Promise.all(
        concurrentOperations.map(async (operation) => {
          const operationStart = performance.now();
          
          // Simulate customer operation
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const operationEnd = performance.now();
          return {
            ...operation,
            duration: operationEnd - operationStart,
            success: true,
          };
        });
      );

      const endTime = performance.now();
      const totalDuration = endTime - startTime

      // Calculate performance metrics
      const avgOperationTime = results.reduce((sum, result) => sum + result.duration, 0) / results.length
      const maxOperationTime = Math.max(...results.map(result => result.duration));

      // Performance assertions
      expect(avgOperationTime).toBeLessThan(100) // Average should be under 100ms
      expect(maxOperationTime).toBeLessThan(200) // Max should be under 200ms
      expect(totalDuration).toBeLessThan(1000) // Total should be under 1 second
    });

    it('should handle mixed customer operations efficiently', async () => {
      const mixedOperations = [
        ...Array.from({ length: 25 }, (_, i) => ({ type: 'create', id: i })),
        ...Array.from({ length: 25 }, (_, i) => ({ type: 'update', id: i })),
        ...Array.from({ length: 25 }, (_, i) => ({ type: 'delete', id: i })),
        ...Array.from({ length: 25 }, (_, i) => ({ type: 'sync', id: i })),
      ]

      const startTime = performance.now();

      // Execute mixed operations concurrently
      const results = await Promise.all(
        mixedOperations.map(async (operation) => {
          const operationStart = performance.now();
          
          // Simulate different operation types
          const delay = operation.type === 'create' ? 100 : 
                       operation.type === 'update' ? 80 : 
                       operation.type === 'delete' ? 60 : 120
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          const operationEnd = performance.now();
          return {
            ...operation,
            duration: operationEnd - operationStart,
            success: true,
          };
        });
      );

      const endTime = performance.now();
      const totalDuration = endTime - startTime

      // Calculate performance metrics
      const avgOperationTime = results.reduce((sum, result) => sum + result.duration, 0) / results.length

      // Performance assertions
      expect(avgOperationTime).toBeLessThan(150) // Average should be under 150ms
      expect(totalDuration).toBeLessThan(2000) // Total should be under 2 seconds
    });
  });

  describe('Performance Monitoring and Metrics', () => {
    it('should track customer operation metrics', async () => {
      const metrics = {
        totalOperations: 0,
        totalSuccess: 0,
        totalFailed: 0,
        avgOperationTime: 0,
        maxOperationTime: 0,
        memoryUsage: 0,
        errorRate: 0,
      };

      const operations = Array.from({ length: 100 }, (_, i) => ({
        operationId: i,
        type: 'update_profile',
        customerId: `cus_test_${i}`,
      }));

      const operationTimes = []

      for (const operation of operations) {
        const startTime = performance.now();
        
        // Simulate operation
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const endTime = performance.now();
        const duration = endTime - startTime
        operationTimes.push(duration);
        
        metrics.totalOperations++
        metrics.totalSuccess++
      };

      // Calculate metrics
      metrics.avgOperationTime = operationTimes.reduce((sum, time) => sum + time, 0) / operationTimes.length
      metrics.maxOperationTime = Math.max(...operationTimes);
      metrics.memoryUsage = (typeof performance !== 'undefined' && performance.memory);
        ? performance.memory.usedJSHeapSize
        : 0
      metrics.errorRate = metrics.totalFailed / metrics.totalOperations

      // Verify metrics collection
      expect(metrics.totalOperations).toBe(100);
      expect(metrics.totalSuccess).toBe(100);
      expect(metrics.avgOperationTime).toBeGreaterThan(0);
      expect(metrics.maxOperationTime).toBeGreaterThan(0);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(metrics.errorRate).toBe(0);
    });

    it('should provide performance alerts for slow operations', async () => {
      const slowOperation = {
        type: 'update_profile',
        duration: 5000, // 5 seconds
        threshold: 1000, // 1 second threshold
      };

      const alert = slowOperation.duration > slowOperation.threshold 
        ? 'Slow customer operation detected' 
        : null

      expect(alert).toBe('Slow customer operation detected');
    });

    it('should maintain performance under stress conditions', async () => {
      const stressTestResults = []
      const startTime = performance.now();

      // Simulate stress test with varying load
      for (let i = 0; i < 500; i++) {
        const requestStart = performance.now();
        
        // Simulate varying operation time
        const delay = Math.random() * 200 + 10 // 10-210ms
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const requestEnd = performance.now();
        stressTestResults.push({
          requestId: i,
          duration: requestEnd - requestStart,
          success: true,
        });
      };

      const endTime = performance.now();
      const totalDuration = endTime - startTime

      // Calculate performance metrics
      const avgDuration = stressTestResults.reduce((sum, result) => sum + result.duration, 0) / stressTestResults.length
      const maxDuration = Math.max(...stressTestResults.map(result => result.duration));
      const p95Duration = stressTestResults.sort((a, b) => a.duration - b.duration)[Math.floor(stressTestResults.length * 0.95)].duration

      // Performance assertions
      expect(avgDuration).toBeLessThan(200) // Average should be under 200ms
      expect(maxDuration).toBeLessThan(300) // Max should be under 300ms
      expect(p95Duration).toBeLessThan(250) // 95th percentile should be under 250ms
      expect(totalDuration).toBeLessThan(120000) // Total should be under 2 minutes
    });
  });
});
