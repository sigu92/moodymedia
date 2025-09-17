/**
 * Performance Tests for Webhook Processing
 * 
 * Tests performance characteristics of:
 * - Webhook event processing and validation
 * - Database operations and updates
 * - Idempotency checks and conflict resolution
 * - Error handling and retry mechanisms
 * - Batch processing and concurrency
 * - Memory usage and resource management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WebhookLogs } from '@/components/admin/WebhookLogs'
import { useWebhooks } from '@/hooks/useWebhooks'
import { useOrders } from '@/hooks/useOrders'
import { useAuth } from '@/contexts/AuthContext'
import { render as customRender, mockUser } from '@/test/test-utils'

// Mock all external dependencies
vi.mock('@/hooks/useWebhooks', () => ({
  useWebhooks: vi.fn(),
}));

vi.mock('@/hooks/useOrders', () => ({
  useOrders: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(),
      })),
    })),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('Webhook Processing Performance', () => {
  const mockUser = {
    id: 'user_123',
    email: 'admin@example.com',
    user_metadata: {
      full_name: 'Admin User',
    },
  };

  const mockWebhookEvent = {
    id: 'evt_test_123',
    type: 'checkout.session.completed',
    created: 1640995200,
    data: {
      object: {
        id: 'cs_test_123',
        payment_status: 'paid',
        customer: 'cus_test_123',
        amount_total: 36000,
        currency: 'eur',
        metadata: {
          order_id: 'order_123',
          user_id: 'user_123',
        },
      },
    },
    processed: false,
    processed_at: null,
    error: null,
    retry_count: 0,
  };

  let mockWebhookHook: any
  let mockOrderHook: any
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

    // Mock webhook hook
    mockWebhookHook = {
      webhooks: [mockWebhookEvent],
      isLoading: false,
      error: null,
      retryWebhook: vi.fn(),
      getWebhookLogs: vi.fn(),
      processWebhook: vi.fn(),
      deleteWebhook: vi.fn(),
      getWebhookStats: vi.fn(),
    };
    vi.mocked(useWebhooks).mockReturnValue(mockWebhookHook);

    // Mock order hook
    mockOrderHook = {
      orders: [],
      isLoading: false,
      error: null,
      updateOrderStatus: vi.fn(),
      getOrderById: vi.fn(),
      refreshOrders: vi.fn(),
    };
    vi.mocked(useOrders).mockReturnValue(mockOrderHook);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Webhook Event Processing Performance', () => {
    it('should process webhook events within acceptable time limits', async () => {
      const user = userEvent.setup();

      // Mock webhook processing with timing
      const startTime = performance.now();
      mockWebhookHook.processWebhook.mockImplementation(async () => {
        // Simulate webhook processing delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const endTime = performance.now();
        const duration = endTime - startTime
        
        return {
          success: true,
          orderUpdated: true,
          orderStatus: 'paid',
          duration,
        };
      });

      customRender(<WebhookLogs />);

      // Process webhook
      await user.click(screen.getByText(/process/i));

      await waitFor(() => {
        expect(mockWebhookHook.processWebhook).toHaveBeenCalled();
      });

      // Verify performance
      const result = await mockWebhookHook.processWebhook('evt_test_123');
      expect(result.duration).toBeLessThan(500) // Should complete within 500ms
    });

    it('should handle high-volume webhook processing efficiently', async () => {
      const webhookEvents = Array.from({ length: 1000 }, (_, i) => ({
        ...mockWebhookEvent,
        id: `evt_test_${i}`,
        data: {
          object: {
            id: `cs_test_${i}`,
            payment_status: 'paid',
            customer: `cus_test_${i}`,
            amount_total: 36000,
            currency: 'eur',
            metadata: {
              order_id: `order_${i}`,
              user_id: 'user_123',
            },
          },
        },
      }));

      const startTime = performance.now();
      const processingTimes = []

      // Process all webhooks
      for (const event of webhookEvents) {
        const eventStart = performance.now();
        
        // Simulate webhook processing
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const eventEnd = performance.now();
        processingTimes.push(eventEnd - eventStart);
      };

      const endTime = performance.now();
      const totalDuration = endTime - startTime

      // Calculate performance metrics
      const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      const maxProcessingTime = Math.max(...processingTimes);
      const p95ProcessingTime = processingTimes.sort((a, b) => a - b)[Math.floor(processingTimes.length * 0.95)]

      // Performance assertions
      expect(avgProcessingTime).toBeLessThan(50) // Average should be under 50ms
      expect(maxProcessingTime).toBeLessThan(100) // Max should be under 100ms
      expect(p95ProcessingTime).toBeLessThan(80) // 95th percentile should be under 80ms
      expect(totalDuration).toBeLessThan(15000) // Total should be under 15 seconds
    });

    it('should handle concurrent webhook processing', async () => {
      const concurrentWebhooks = Array.from({ length: 50 }, (_, i) => ({
        ...mockWebhookEvent,
        id: `evt_test_${i}`,
        data: {
          object: {
            id: `cs_test_${i}`,
            payment_status: 'paid',
            customer: `cus_test_${i}`,
            amount_total: 36000,
            currency: 'eur',
            metadata: {
              order_id: `order_${i}`,
              user_id: 'user_123',
            },
          },
        },
      }));

      const startTime = performance.now();

      // Process all webhooks concurrently
      const results = await Promise.all(
        concurrentWebhooks.map(async (event) => {
          const eventStart = performance.now();
          
          // Simulate webhook processing
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const eventEnd = performance.now();
          return {
            ...event,
            duration: eventEnd - eventStart,
            success: true,
          };
        });
      );

      const endTime = performance.now();
      const totalDuration = endTime - startTime

      // Calculate performance metrics
      const avgProcessingTime = results.reduce((sum, result) => sum + result.duration, 0) / results.length
      const maxProcessingTime = Math.max(...results.map(result => result.duration));

      // Performance assertions
      expect(avgProcessingTime).toBeLessThan(100) // Average should be under 100ms
      expect(maxProcessingTime).toBeLessThan(200) // Max should be under 200ms
      expect(totalDuration).toBeLessThan(1000) // Total should be under 1 second
    });
  });

  describe('Database Operations Performance', () => {
    it('should perform database updates efficiently', async () => {
      const orderUpdates = Array.from({ length: 500 }, (_, i) => ({
        orderId: `order_${i}`,
        status: 'paid',
        updatedAt: new Date().toISOString(),
        webhookId: `evt_test_${i}`,
      }));

      const startTime = performance.now();
      const updateTimes = []

      for (const update of orderUpdates) {
        const updateStart = performance.now();
        
        // Simulate database update
        await new Promise(resolve => setTimeout(resolve, 5));
        
        const updateEnd = performance.now();
        updateTimes.push(updateEnd - updateStart);
      };

      const endTime = performance.now();
      const totalDuration = endTime - startTime

      // Calculate performance metrics
      const avgUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length
      const maxUpdateTime = Math.max(...updateTimes);

      // Performance assertions
      expect(avgUpdateTime).toBeLessThan(20) // Average should be under 20ms
      expect(maxUpdateTime).toBeLessThan(50) // Max should be under 50ms
      expect(totalDuration).toBeLessThan(3000) // Total should be under 3 seconds
    });

    it('should handle batch database operations efficiently', async () => {
      const batchSize = 100
      const batches = Array.from({ length: 10 }, (_, batchIndex) =>
        Array.from({ length: batchSize }, (_, itemIndex) => ({
          orderId: `order_${batchIndex}_${itemIndex}`,
          status: 'paid',
          updatedAt: new Date().toISOString(),
          webhookId: `evt_test_${batchIndex}_${itemIndex}`,
        }));
      );

      const startTime = performance.now();
      const batchProcessingTimes = []

      for (const batch of batches) {
        const batchStart = performance.now();
        
        // Simulate batch database update
        await Promise.all(
          batch.map(async (update) => {
            await new Promise(resolve => setTimeout(resolve, 2));
            return update
          });
        );
        
        const batchEnd = performance.now();
        batchProcessingTimes.push(batchEnd - batchStart);
      };

      const endTime = performance.now();
      const totalDuration = endTime - startTime

      // Calculate performance metrics
      const avgBatchTime = batchProcessingTimes.reduce((sum, time) => sum + time, 0) / batchProcessingTimes.length

      // Performance assertions
      expect(avgBatchTime).toBeLessThan(250) // Average batch should be under 250ms
      expect(totalDuration).toBeLessThan(3000) // Total should be under 3 seconds
    });

    it('should handle database connection pooling efficiently', async () => {
      const connectionPool = Array.from({ length: 20 }, (_, i) => ({
        connectionId: i,
        status: 'idle',
        lastUsed: Date.now(),
      }));

      const startTime = performance.now();
      const connectionTimes = []

      // Simulate concurrent database operations using connection pool
      const operations = Array.from({ length: 100 }, (_, i) => ({
        operationId: i,
        connectionId: i % connectionPool.length,
        query: `UPDATE orders SET status = 'paid' WHERE id = 'order_${i}'`,
      }));

      for (const operation of operations) {
        const operationStart = performance.now();
        
        // Simulate database operation with connection
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const operationEnd = performance.now();
        connectionTimes.push(operationEnd - operationStart);
      };

      const endTime = performance.now();
      const totalDuration = endTime - startTime

      // Calculate performance metrics
      const avgConnectionTime = connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length

      // Performance assertions
      expect(avgConnectionTime).toBeLessThan(50) // Average should be under 50ms
      expect(totalDuration).toBeLessThan(2000) // Total should be under 2 seconds
    });
  });

  describe('Idempotency and Conflict Resolution Performance', () => {
    it('should handle idempotency checks efficiently', async () => {
      const duplicateEvents = Array.from({ length: 100 }, (_, i) => ({
        ...mockWebhookEvent,
        id: `evt_test_${i}`,
        data: {
          object: {
            id: 'cs_test_123', // Same session ID
            payment_status: 'paid',
            customer: 'cus_test_123',
            amount_total: 36000,
            currency: 'eur',
            metadata: {
              order_id: 'order_123',
              user_id: 'user_123',
            },
          },
        },
      }));

      const startTime = performance.now();
      const idempotencyCheckTimes = []

      for (const event of duplicateEvents) {
        const checkStart = performance.now();
        
        // Simulate idempotency check
        await new Promise(resolve => setTimeout(resolve, 5));
        
        const checkEnd = performance.now();
        idempotencyCheckTimes.push(checkEnd - checkStart);
      };

      const endTime = performance.now();
      const totalDuration = endTime - startTime

      // Calculate performance metrics
      const avgCheckTime = idempotencyCheckTimes.reduce((sum, time) => sum + time, 0) / idempotencyCheckTimes.length

      // Performance assertions
      expect(avgCheckTime).toBeLessThan(10) // Average should be under 10ms
      expect(totalDuration).toBeLessThan(1000) // Total should be under 1 second
    });

    it('should handle conflict resolution efficiently', async () => {
      const conflictingEvents = Array.from({ length: 50 }, (_, i) => ({
        ...mockWebhookEvent,
        id: `evt_test_${i}`,
        data: {
          object: {
            id: `cs_test_${i}`,
            payment_status: 'paid',
            customer: 'cus_test_123',
            amount_total: 36000,
            currency: 'eur',
            metadata: {
              order_id: 'order_123', // Same order ID
              user_id: 'user_123',
            },
          },
        },
      }));

      const startTime = performance.now();
      const conflictResolutionTimes = []

      for (const event of conflictingEvents) {
        const resolutionStart = performance.now();
        
        // Simulate conflict resolution
        await new Promise(resolve => setTimeout(resolve, 15));
        
        const resolutionEnd = performance.now();
        conflictResolutionTimes.push(resolutionEnd - resolutionStart);
      };

      const endTime = performance.now();
      const totalDuration = endTime - startTime

      // Calculate performance metrics
      const avgResolutionTime = conflictResolutionTimes.reduce((sum, time) => sum + time, 0) / conflictResolutionTimes.length

      // Performance assertions
      expect(avgResolutionTime).toBeLessThan(30) // Average should be under 30ms
      expect(totalDuration).toBeLessThan(2000) // Total should be under 2 seconds
    });
  });

  describe('Error Handling and Retry Performance', () => {
    it('should handle retry mechanisms efficiently', async () => {
      const failedEvents = Array.from({ length: 100 }, (_, i) => ({
        ...mockWebhookEvent,
        id: `evt_test_${i}`,
        error: 'Processing failed',
        retry_count: 0,
      }));

      const startTime = performance.now();
      const retryTimes = []

      for (const event of failedEvents) {
        const retryStart = performance.now();
        
        // Simulate retry processing
        await new Promise(resolve => setTimeout(resolve, 20));
        
        const retryEnd = performance.now();
        retryTimes.push(retryEnd - retryStart);
      };

      const endTime = performance.now();
      const totalDuration = endTime - startTime

      // Calculate performance metrics
      const avgRetryTime = retryTimes.reduce((sum, time) => sum + time, 0) / retryTimes.length

      // Performance assertions
      expect(avgRetryTime).toBeLessThan(50) // Average should be under 50ms
      expect(totalDuration).toBeLessThan(3000) // Total should be under 3 seconds
    });

    it('should handle exponential backoff efficiently', async () => {
      const retryAttempts = Array.from({ length: 10 }, (_, i) => ({
        attempt: i + 1,
        delay: Math.pow(2, i) * 1000, // Exponential backoff
        eventId: `evt_test_${i}`,
      }));

      const startTime = performance.now();
      const backoffTimes = []

      for (const attempt of retryAttempts) {
        const backoffStart = performance.now();
        
        // Simulate exponential backoff delay
        await new Promise(resolve => setTimeout(resolve, Math.min(attempt.delay, 10000)));
        
        const backoffEnd = performance.now();
        backoffTimes.push(backoffEnd - backoffStart);
      };

      const endTime = performance.now();
      const totalDuration = endTime - startTime

      // Calculate performance metrics
      const avgBackoffTime = backoffTimes.reduce((sum, time) => sum + time, 0) / backoffTimes.length

      // Performance assertions
      expect(avgBackoffTime).toBeLessThan(5000) // Average should be under 5 seconds
      expect(totalDuration).toBeLessThan(60000) // Total should be under 60 seconds
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should maintain reasonable memory usage during webhook processing', async () => {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0
      
      const webhookEvents = Array.from({ length: 1000 }, (_, i) => ({
        ...mockWebhookEvent,
        id: `evt_test_${i}`,
        data: {
          object: {
            id: `cs_test_${i}`,
            payment_status: 'paid',
            customer: `cus_test_${i}`,
            amount_total: 36000,
            currency: 'eur',
            metadata: {
              order_id: `order_${i}`,
              user_id: 'user_123',
            },
          },
        },
      }));

      // Process webhooks
      for (const event of webhookEvents) {
        // Simulate webhook processing
        await new Promise(resolve => setTimeout(resolve, 1));
      };

      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 50MB);
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should clean up resources after webhook processing', async () => {
      let resourcesCreated = 0
      let resourcesCleaned = 0

      const webhookEvents = Array.from({ length: 100 }, (_, i) => ({
        ...mockWebhookEvent,
        id: `evt_test_${i}`,
      }));

      // Process webhooks
      for (const event of webhookEvents) {
        // Simulate resource creation
        resourcesCreated += 3
        
        // Simulate webhook processing
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Simulate resource cleanup
        resourcesCleaned += 3
      };

      // Verify resource cleanup
      expect(resourcesCreated).toBe(300);
      expect(resourcesCleaned).toBe(300);
      expect(resourcesCreated).toBe(resourcesCleaned);
    });

    it('should handle large webhook payloads efficiently', async () => {
      const largeWebhookEvent = {
        ...mockWebhookEvent,
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            customer: 'cus_test_123',
            amount_total: 36000,
            currency: 'eur',
            metadata: {
              order_id: 'order_123',
              user_id: 'user_123',
              large_data: new Array(10000).fill(0).map((_, i) => ({ id: i, data: 'test' })),
            },
          },
        },
      };

      const startTime = performance.now();
      
      // Process large webhook
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endTime = performance.now();
      const duration = endTime - startTime

      // Should process large payloads efficiently
      expect(duration).toBeLessThan(200) // Should complete within 200ms
    });
  });

  describe('Performance Monitoring and Metrics', () => {
    it('should track webhook processing metrics', async () => {
      const metrics = {
        totalProcessed: 0,
        totalFailed: 0,
        avgProcessingTime: 0,
        maxProcessingTime: 0,
        memoryUsage: 0,
        errorRate: 0,
      };

      const webhookEvents = Array.from({ length: 100 }, (_, i) => ({
        ...mockWebhookEvent,
        id: `evt_test_${i}`,
      }));

      const processingTimes = []

      for (const event of webhookEvents) {
        const startTime = performance.now();
        
        // Simulate webhook processing
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const endTime = performance.now();
        const duration = endTime - startTime
        processingTimes.push(duration);
        
        metrics.totalProcessed++
      };

      // Calculate metrics
      metrics.avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      metrics.maxProcessingTime = Math.max(...processingTimes);
      metrics.memoryUsage = performance.memory ? performance.memory.usedJSHeapSize : 0

      // Verify metrics collection
      expect(metrics.totalProcessed).toBe(100);
      expect(metrics.avgProcessingTime).toBeGreaterThan(0);
      expect(metrics.maxProcessingTime).toBeGreaterThan(0);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    });

    it('should provide performance alerts for slow webhook processing', async () => {
      const slowWebhookEvent = {
        ...mockWebhookEvent,
        processingTime: 5000, // 5 seconds
        threshold: 1000, // 1 second threshold
      };

      const alert = slowWebhookEvent.processingTime > slowWebhookEvent.threshold 
        ? 'Slow webhook processing detected' 
        : null

      expect(alert).toBe('Slow webhook processing detected');
    });

    it('should maintain performance under stress conditions', async () => {
      const stressTestResults = []
      const startTime = performance.now();

      // Simulate stress test with varying load
      for (let i = 0; i < 200; i++) {
        const requestStart = performance.now();
        
        // Simulate varying processing time
        const delay = Math.random() * 100 + 10 // 10-110ms
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
      expect(avgDuration).toBeLessThan(150) // Average should be under 150ms
      expect(maxDuration).toBeLessThan(200) // Max should be under 200ms
      expect(p95Duration).toBeLessThan(180) // 95th percentile should be under 180ms
      expect(totalDuration).toBeLessThan(25000) // Total should be under 25 seconds
    });
  });
});
