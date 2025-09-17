/**
 * End-to-End Tests for Webhook Processing Flow
 * 
 * Tests the complete webhook processing flow including:
 * - Webhook event reception and validation
 * - Event processing and database updates
 * - Idempotency handling
 * - Error handling and retry mechanisms
 * - Order status updates
 * - Customer data synchronization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WebhookLogs } from '@/components/admin/WebhookLogs'
import { OrderStatus } from '@/components/orders/OrderStatus'
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

describe('Webhook Processing Flow E2E', () => {
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
    processed: true,
    processed_at: '2024-01-01T12:00:00Z',
    error: null,
  };

  const mockOrder = {
    id: 'order_123',
    order_number: 'MO-123456',
    user_id: 'user_123',
    status: 'pending',
    total_amount: 360,
    currency: 'EUR',
    stripe_session_id: 'cs_test_123',
    stripe_payment_intent_id: 'pi_test_123',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
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
    };
    vi.mocked(useWebhooks).mockReturnValue(mockWebhookHook);

    // Mock order hook
    mockOrderHook = {
      orders: [mockOrder],
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

  describe('Webhook Event Processing', () => {
    it('should process checkout.session.completed event successfully', async () => {
      const user = userEvent.setup();

      // Mock successful webhook processing
      mockWebhookHook.processWebhook.mockResolvedValue({
        success: true,
        orderUpdated: true,
        orderStatus: 'paid',
      });

      customRender(<WebhookLogs />);

      // Find the webhook event
      expect(screen.getByText('checkout.session.completed')).toBeInTheDocument();
      expect(screen.getByText('cs_test_123')).toBeInTheDocument();

      // Click process button
      await user.click(screen.getByText(/process/i));

      await waitFor(() => {
        expect(mockWebhookHook.processWebhook).toHaveBeenCalledWith('evt_test_123');
      });
    });

    it('should process payment_intent.succeeded event', async () => {
      const user = userEvent.setup();

      // Mock payment intent succeeded event
      const paymentIntentEvent = {
        ...mockWebhookEvent,
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded',
            customer: 'cus_test_123',
            amount: 36000,
            currency: 'eur',
            metadata: {
              order_id: 'order_123',
            },
          },
        },
      };

      vi.mocked(useWebhooks).mockReturnValue({
        ...mockWebhookHook,
        webhooks: [paymentIntentEvent],
      });

      // Mock successful processing
      mockWebhookHook.processWebhook.mockResolvedValue({
        success: true,
        orderUpdated: true,
        orderStatus: 'paid',
      });

      customRender(<WebhookLogs />);

      expect(screen.getByText('payment_intent.succeeded')).toBeInTheDocument();
      expect(screen.getByText('pi_test_123')).toBeInTheDocument();

      // Click process button
      await user.click(screen.getByText(/process/i));

      await waitFor(() => {
        expect(mockWebhookHook.processWebhook).toHaveBeenCalledWith('evt_test_123');
      });
    });

    it('should process payment_intent.payment_failed event', async () => {
      const user = userEvent.setup();

      // Mock payment failed event
      const paymentFailedEvent = {
        ...mockWebhookEvent,
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'requires_payment_method',
            customer: 'cus_test_123',
            amount: 36000,
            currency: 'eur',
            last_payment_error: {
              message: 'Your card was declined',
            },
            metadata: {
              order_id: 'order_123',
            },
          },
        },
      };

      vi.mocked(useWebhooks).mockReturnValue({
        ...mockWebhookHook,
        webhooks: [paymentFailedEvent],
      });

      // Mock successful processing
      mockWebhookHook.processWebhook.mockResolvedValue({
        success: true,
        orderUpdated: true,
        orderStatus: 'payment_failed',
      });

      customRender(<WebhookLogs />);

      expect(screen.getByText('payment_intent.payment_failed')).toBeInTheDocument();
      expect(screen.getByText('pi_test_123')).toBeInTheDocument();

      // Click process button
      await user.click(screen.getByText(/process/i));

      await waitFor(() => {
        expect(mockWebhookHook.processWebhook).toHaveBeenCalledWith('evt_test_123');
      });
    });

    it('should process customer.created event', async () => {
      const user = userEvent.setup();

      // Mock customer created event
      const customerCreatedEvent = {
        ...mockWebhookEvent,
        type: 'customer.created',
        data: {
          object: {
            id: 'cus_test_123',
            email: 'test@example.com',
            name: 'Test User',
            created: 1640995200,
            metadata: {
              user_id: 'user_123',
            },
          },
        },
      };

      vi.mocked(useWebhooks).mockReturnValue({
        ...mockWebhookHook,
        webhooks: [customerCreatedEvent],
      });

      // Mock successful processing
      mockWebhookHook.processWebhook.mockResolvedValue({
        success: true,
        customerCreated: true,
        customerId: 'cus_test_123',
      });

      customRender(<WebhookLogs />);

      expect(screen.getByText('customer.created')).toBeInTheDocument();
      expect(screen.getByText('cus_test_123')).toBeInTheDocument();

      // Click process button
      await user.click(screen.getByText(/process/i));

      await waitFor(() => {
        expect(mockWebhookHook.processWebhook).toHaveBeenCalledWith('evt_test_123');
      });
    });
  });

  describe('Webhook Error Handling', () => {
    it('should handle webhook processing errors', async () => {
      const user = userEvent.setup();

      // Mock webhook processing failure
      mockWebhookHook.processWebhook.mockResolvedValue({
        success: false,
        error: 'Failed to process webhook',
      });

      customRender(<WebhookLogs />);

      // Click process button
      await user.click(screen.getByText(/process/i));

      await waitFor(() => {
        expect(screen.getByText(/failed to process webhook/i)).toBeInTheDocument();
      });
    });

    it('should handle order not found errors', async () => {
      const user = userEvent.setup();

      // Mock order not found
      mockWebhookHook.processWebhook.mockResolvedValue({
        success: false,
        error: 'Order not found',
      });

      customRender(<WebhookLogs />);

      // Click process button
      await user.click(screen.getByText(/process/i));

      await waitFor(() => {
        expect(screen.getByText(/order not found/i)).toBeInTheDocument();
      });
    });

    it('should handle database update errors', async () => {
      const user = userEvent.setup();

      // Mock database update failure
      mockWebhookHook.processWebhook.mockResolvedValue({
        success: false,
        error: 'Database update failed',
      });

      customRender(<WebhookLogs />);

      // Click process button
      await user.click(screen.getByText(/process/i));

      await waitFor(() => {
        expect(screen.getByText(/database update failed/i)).toBeInTheDocument();
      });
    });

    it('should handle invalid webhook signature', async () => {
      const user = userEvent.setup();

      // Mock invalid signature
      mockWebhookHook.processWebhook.mockResolvedValue({
        success: false,
        error: 'Invalid webhook signature',
      });

      customRender(<WebhookLogs />);

      // Click process button
      await user.click(screen.getByText(/process/i));

      await waitFor(() => {
        expect(screen.getByText(/invalid webhook signature/i)).toBeInTheDocument();
      });
    });
  });

  describe('Webhook Retry Mechanism', () => {
    it('should retry failed webhook processing', async () => {
      const user = userEvent.setup();

      // Mock failed webhook
      const failedWebhook = {
        ...mockWebhookEvent,
        processed: false,
        error: 'Processing failed',
        retry_count: 2,
      };

      vi.mocked(useWebhooks).mockReturnValue({
        ...mockWebhookHook,
        webhooks: [failedWebhook],
      });

      // Mock successful retry
      mockWebhookHook.retryWebhook.mockResolvedValue({
        success: true,
        orderUpdated: true,
        orderStatus: 'paid',
      });

      customRender(<WebhookLogs />);

      // Click retry button
      await user.click(screen.getByText(/retry/i));

      await waitFor(() => {
        expect(mockWebhookHook.retryWebhook).toHaveBeenCalledWith('evt_test_123');
      });
    });

    it('should limit retry attempts', async () => {
      const user = userEvent.setup();

      // Mock webhook with max retries
      const maxRetryWebhook = {
        ...mockWebhookEvent,
        processed: false,
        error: 'Processing failed',
        retry_count: 5,
      };

      vi.mocked(useWebhooks).mockReturnValue({
        ...mockWebhookHook,
        webhooks: [maxRetryWebhook],
      });

      customRender(<WebhookLogs />);

      // Should not show retry button for max retries
      expect(screen.queryByText(/retry/i)).not.toBeInTheDocument();
      expect(screen.getByText(/max retries exceeded/i)).toBeInTheDocument();
    });

    it('should handle retry failures', async () => {
      const user = userEvent.setup();

      // Mock failed retry
      mockWebhookHook.retryWebhook.mockResolvedValue({
        success: false,
        error: 'Retry failed',
      });

      customRender(<WebhookLogs />);

      // Click retry button
      await user.click(screen.getByText(/retry/i));

      await waitFor(() => {
        expect(screen.getByText(/retry failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Order Status Updates', () => {
    it('should update order status after successful payment', async () => {
      const user = userEvent.setup();

      // Mock successful order status update
      mockOrderHook.updateOrderStatus.mockResolvedValue({
        success: true,
        order: {
          ...mockOrder,
          status: 'paid',
          updated_at: '2024-01-01T12:00:00Z',
        },
      });

      customRender(<OrderStatus orderId="order_123" />);

      // Verify order status is updated
      expect(screen.getByText('paid')).toBeInTheDocument();
    });

    it('should handle order status update failures', async () => {
      const user = userEvent.setup();

      // Mock order status update failure
      mockOrderHook.updateOrderStatus.mockResolvedValue({
        success: false,
        error: 'Failed to update order status',
      });

      customRender(<OrderStatus orderId="order_123" />);

      // Verify error is displayed
      expect(screen.getByText(/failed to update order status/i)).toBeInTheDocument();
    });

    it('should show order status history', () => {
      const orderWithHistory = {
        ...mockOrder,
        status_history: [
          {
            status: 'pending',
            timestamp: '2024-01-01T10:00:00Z',
            source: 'order_created',
          },
          {
            status: 'paid',
            timestamp: '2024-01-01T12:00:00Z',
            source: 'webhook',
          },
        ],
      };

      vi.mocked(useOrders).mockReturnValue({
        ...mockOrderHook,
        orders: [orderWithHistory],
      });

      customRender(<OrderStatus orderId="order_123" />);

      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('paid')).toBeInTheDocument();
      expect(screen.getByText('order_created')).toBeInTheDocument();
      expect(screen.getByText('webhook')).toBeInTheDocument();
    });
  });

  describe('Webhook Idempotency', () => {
    it('should handle duplicate webhook events', async () => {
      const user = userEvent.setup();

      // Mock duplicate webhook processing
      mockWebhookHook.processWebhook.mockResolvedValue({
        success: true,
        duplicate: true,
        message: 'Event already processed',
      });

      customRender(<WebhookLogs />);

      // Click process button
      await user.click(screen.getByText(/process/i));

      await waitFor(() => {
        expect(screen.getByText(/event already processed/i)).toBeInTheDocument();
      });
    });

    it('should prevent duplicate order updates', async () => {
      const user = userEvent.setup();

      // Mock duplicate order update
      mockWebhookHook.processWebhook.mockResolvedValue({
        success: true,
        duplicate: true,
        message: 'Order already updated',
      });

      customRender(<WebhookLogs />);

      // Click process button
      await user.click(screen.getByText(/process/i));

      await waitFor(() => {
        expect(screen.getByText(/order already updated/i)).toBeInTheDocument();
      });
    });
  });

  describe('Webhook Logging and Monitoring', () => {
    it('should display webhook processing logs', () => {
      customRender(<WebhookLogs />);

      expect(screen.getByText('checkout.session.completed')).toBeInTheDocument();
      expect(screen.getByText('cs_test_123')).toBeInTheDocument();
      expect(screen.getByText('2024-01-01T12:00:00Z')).toBeInTheDocument();
      expect(screen.getByText('processed')).toBeInTheDocument();
    });

    it('should show webhook processing statistics', () => {
      const webhookStats = {
        total: 100,
        processed: 95,
        failed: 5,
        pending: 0,
      };

      vi.mocked(useWebhooks).mockReturnValue({
        ...mockWebhookHook,
        stats: webhookStats,
      });

      customRender(<WebhookLogs />);

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('95')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should filter webhooks by status', async () => {
      const user = userEvent.setup();

      const webhooks = [
        { ...mockWebhookEvent, processed: true },
        { ...mockWebhookEvent, id: 'evt_test_456', processed: false, error: 'Failed' },
      ]

      vi.mocked(useWebhooks).mockReturnValue({
        ...mockWebhookHook,
        webhooks,
      });

      customRender(<WebhookLogs />);

      // Filter by processed status
      await user.click(screen.getByText(/processed/i));

      expect(screen.getByText('evt_test_123')).toBeInTheDocument();
      expect(screen.queryByText('evt_test_456')).not.toBeInTheDocument();
    });

    it('should search webhooks by event type', async () => {
      const user = userEvent.setup();

      const webhooks = [
        { ...mockWebhookEvent, type: 'checkout.session.completed' },
        { ...mockWebhookEvent, id: 'evt_test_456', type: 'payment_intent.succeeded' },
      ]

      vi.mocked(useWebhooks).mockReturnValue({
        ...mockWebhookHook,
        webhooks,
      });

      customRender(<WebhookLogs />);

      // Search by event type
      const searchInput = screen.getByPlaceholderText(/search webhooks/i);
      await user.type(searchInput, 'checkout.session.completed');

      expect(screen.getByText('evt_test_123')).toBeInTheDocument();
      expect(screen.queryByText('evt_test_456')).not.toBeInTheDocument();
    });
  });
});
