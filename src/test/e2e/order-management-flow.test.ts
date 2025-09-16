/**
 * End-to-End Tests for Order Management Flow
 * 
 * Tests the complete order management flow including:
 * - Order creation and validation
 * - Order status tracking
 * - Order history and updates
 * - Order cancellation and refunds
 * - Order search and filtering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrderList } from '@/components/orders/OrderList'
import { OrderDetails } from '@/components/orders/OrderDetails'
import { OrderStatus } from '@/components/orders/OrderStatus'
import { useOrders } from '@/hooks/useOrders'
import { useAuth } from '@/contexts/AuthContext'
import { render as customRender, mockUser } from '@/test/test-utils'

// Mock all external dependencies
vi.mock('@/hooks/useOrders', () => ({
  useOrders: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

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
        order: vi.fn(() => ({
          limit: vi.fn(),
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
}))

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

describe('Order Management Flow E2E', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User',
    },
  }

  const mockOrders = [
    {
      id: 'order_123',
      order_number: 'MO-123456',
      user_id: 'user_123',
      status: 'paid',
      total_amount: 360,
      currency: 'EUR',
      stripe_session_id: 'cs_test_123',
      stripe_payment_intent_id: 'pi_test_123',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T12:00:00Z',
      items: [
        {
          id: 'item_1',
          media_outlet_id: 'outlet_1',
          domain: 'example.com',
          category: 'Technology',
          price: 100,
          final_price: 90,
          quantity: 1,
        },
        {
          id: 'item_2',
          media_outlet_id: 'outlet_2',
          domain: 'test.com',
          category: 'Business',
          price: 150,
          final_price: 135,
          quantity: 2,
        },
      ],
    },
    {
      id: 'order_456',
      order_number: 'MO-789012',
      user_id: 'user_123',
      status: 'pending',
      total_amount: 200,
      currency: 'EUR',
      stripe_session_id: 'cs_test_456',
      stripe_payment_intent_id: null,
      created_at: '2024-01-02T10:00:00Z',
      updated_at: '2024-01-02T10:00:00Z',
      items: [
        {
          id: 'item_3',
          media_outlet_id: 'outlet_3',
          domain: 'sample.com',
          category: 'News',
          price: 200,
          final_price: 200,
          quantity: 1,
        },
      ],
    },
  ]

  let mockOrderHook: any
  let mockAuthHook: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock auth
    mockAuthHook = {
      user: mockUser,
      session: { expires_at: Date.now() / 1000 + 3600 },
      signOut: vi.fn(),
      isLoading: false,
      isAuthenticated: true,
    }
    vi.mocked(useAuth).mockReturnValue(mockAuthHook)

    // Mock order hook
    mockOrderHook = {
      orders: mockOrders,
      isLoading: false,
      error: null,
      createOrder: vi.fn(),
      updateOrderStatus: vi.fn(),
      cancelOrder: vi.fn(),
      refundOrder: vi.fn(),
      getOrderById: vi.fn(),
      refreshOrders: vi.fn(),
      searchOrders: vi.fn(),
      filterOrders: vi.fn(),
    }
    vi.mocked(useOrders).mockReturnValue(mockOrderHook)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Order List Management', () => {
    it('should display list of orders', () => {
      customRender(<OrderList />)

      expect(screen.getByText('MO-123456')).toBeInTheDocument()
      expect(screen.getByText('MO-789012')).toBeInTheDocument()
      expect(screen.getByText('€360')).toBeInTheDocument()
      expect(screen.getByText('€200')).toBeInTheDocument()
      expect(screen.getByText('paid')).toBeInTheDocument()
      expect(screen.getByText('pending')).toBeInTheDocument()
    })

    it('should filter orders by status', async () => {
      const user = userEvent.setup()

      customRender(<OrderList />)

      // Filter by paid status
      await user.click(screen.getByText(/filter by status/i))
      await user.click(screen.getByText(/paid/i))

      await waitFor(() => {
        expect(mockOrderHook.filterOrders).toHaveBeenCalledWith('status', 'paid')
      })

      expect(screen.getByText('MO-123456')).toBeInTheDocument()
      expect(screen.queryByText('MO-789012')).not.toBeInTheDocument()
    })

    it('should search orders by order number', async () => {
      const user = userEvent.setup()

      customRender(<OrderList />)

      // Search for specific order
      const searchInput = screen.getByPlaceholderText(/search orders/i)
      await user.type(searchInput, 'MO-123456')

      await waitFor(() => {
        expect(mockOrderHook.searchOrders).toHaveBeenCalledWith('MO-123456')
      })

      expect(screen.getByText('MO-123456')).toBeInTheDocument()
      expect(screen.queryByText('MO-789012')).not.toBeInTheDocument()
    })

    it('should sort orders by date', async () => {
      const user = userEvent.setup()

      customRender(<OrderList />)

      // Sort by date
      await user.click(screen.getByText(/sort by/i))
      await user.click(screen.getByText(/date/i))

      await waitFor(() => {
        expect(mockOrderHook.filterOrders).toHaveBeenCalledWith('sort', 'date')
      })
    })

    it('should show loading state', () => {
      vi.mocked(useOrders).mockReturnValue({
        ...mockOrderHook,
        isLoading: true,
      })

      customRender(<OrderList />)

      expect(screen.getByText(/loading orders/i)).toBeInTheDocument()
    })

    it('should handle empty order list', () => {
      vi.mocked(useOrders).mockReturnValue({
        ...mockOrderHook,
        orders: [],
      })

      customRender(<OrderList />)

      expect(screen.getByText(/no orders found/i)).toBeInTheDocument()
      expect(screen.getByText(/start shopping/i)).toBeInTheDocument()
    })
  })

  describe('Order Details View', () => {
    it('should display order details', () => {
      const order = mockOrders[0]

      customRender(<OrderDetails orderId={order.id} />)

      expect(screen.getByText('MO-123456')).toBeInTheDocument()
      expect(screen.getByText('€360')).toBeInTheDocument()
      expect(screen.getByText('paid')).toBeInTheDocument()
      expect(screen.getByText('example.com')).toBeInTheDocument()
      expect(screen.getByText('test.com')).toBeInTheDocument()
    })

    it('should show order items with details', () => {
      const order = mockOrders[0]

      customRender(<OrderDetails orderId={order.id} />)

      // Check item details
      expect(screen.getByText('Technology')).toBeInTheDocument()
      expect(screen.getByText('Business')).toBeInTheDocument()
      expect(screen.getByText('€90')).toBeInTheDocument()
      expect(screen.getByText('€135')).toBeInTheDocument()
      expect(screen.getByText('Qty: 1')).toBeInTheDocument()
      expect(screen.getByText('Qty: 2')).toBeInTheDocument()
    })

    it('should display order timeline', () => {
      const order = mockOrders[0]

      customRender(<OrderDetails orderId={order.id} />)

      expect(screen.getByText(/order created/i)).toBeInTheDocument()
      expect(screen.getByText(/payment completed/i)).toBeInTheDocument()
      expect(screen.getByText('2024-01-01T10:00:00Z')).toBeInTheDocument()
      expect(screen.getByText('2024-01-01T12:00:00Z')).toBeInTheDocument()
    })

    it('should show payment information', () => {
      const order = mockOrders[0]

      customRender(<OrderDetails orderId={order.id} />)

      expect(screen.getByText('cs_test_123')).toBeInTheDocument()
      expect(screen.getByText('pi_test_123')).toBeInTheDocument()
      expect(screen.getByText(/payment method/i)).toBeInTheDocument()
    })

    it('should handle order not found', () => {
      vi.mocked(useOrders).mockReturnValue({
        ...mockOrderHook,
        orders: [],
      })

      customRender(<OrderDetails orderId="nonexistent" />)

      expect(screen.getByText(/order not found/i)).toBeInTheDocument()
    })
  })

  describe('Order Status Management', () => {
    it('should display current order status', () => {
      const order = mockOrders[0]

      customRender(<OrderStatus orderId={order.id} />)

      expect(screen.getByText('paid')).toBeInTheDocument()
      expect(screen.getByText(/payment completed/i)).toBeInTheDocument()
    })

    it('should show status history', () => {
      const orderWithHistory = {
        ...mockOrders[0],
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
      }

      vi.mocked(useOrders).mockReturnValue({
        ...mockOrderHook,
        orders: [orderWithHistory],
      })

      customRender(<OrderStatus orderId={orderWithHistory.id} />)

      expect(screen.getByText('pending')).toBeInTheDocument()
      expect(screen.getByText('paid')).toBeInTheDocument()
      expect(screen.getByText('order_created')).toBeInTheDocument()
      expect(screen.getByText('webhook')).toBeInTheDocument()
    })

    it('should update order status', async () => {
      const user = userEvent.setup()

      // Mock successful status update
      mockOrderHook.updateOrderStatus.mockResolvedValue({
        success: true,
        order: {
          ...mockOrders[0],
          status: 'shipped',
        },
      })

      customRender(<OrderStatus orderId={mockOrders[0].id} />)

      // Update status
      await user.click(screen.getByText(/update status/i))
      await user.selectOptions(screen.getByRole('combobox'), 'shipped')
      await user.click(screen.getByText(/save/i))

      await waitFor(() => {
        expect(mockOrderHook.updateOrderStatus).toHaveBeenCalledWith(
          mockOrders[0].id,
          'shipped'
        )
      })
    })

    it('should handle status update errors', async () => {
      const user = userEvent.setup()

      // Mock status update failure
      mockOrderHook.updateOrderStatus.mockResolvedValue({
        success: false,
        error: 'Failed to update status',
      })

      customRender(<OrderStatus orderId={mockOrders[0].id} />)

      // Try to update status
      await user.click(screen.getByText(/update status/i))
      await user.selectOptions(screen.getByRole('combobox'), 'shipped')
      await user.click(screen.getByText(/save/i))

      await waitFor(() => {
        expect(screen.getByText(/failed to update status/i)).toBeInTheDocument()
      })
    })
  })

  describe('Order Cancellation', () => {
    it('should cancel pending orders', async () => {
      const user = userEvent.setup()

      // Mock successful cancellation
      mockOrderHook.cancelOrder.mockResolvedValue({
        success: true,
        order: {
          ...mockOrders[1],
          status: 'cancelled',
        },
      })

      customRender(<OrderDetails orderId={mockOrders[1].id} />)

      // Cancel order
      await user.click(screen.getByText(/cancel order/i))
      await user.click(screen.getByText(/confirm cancellation/i))

      await waitFor(() => {
        expect(mockOrderHook.cancelOrder).toHaveBeenCalledWith(mockOrders[1].id)
      })

      expect(screen.getByText('cancelled')).toBeInTheDocument()
    })

    it('should not allow cancelling paid orders', () => {
      customRender(<OrderDetails orderId={mockOrders[0].id} />)

      expect(screen.queryByText(/cancel order/i)).not.toBeInTheDocument()
      expect(screen.getByText(/order cannot be cancelled/i)).toBeInTheDocument()
    })

    it('should handle cancellation errors', async () => {
      const user = userEvent.setup()

      // Mock cancellation failure
      mockOrderHook.cancelOrder.mockResolvedValue({
        success: false,
        error: 'Failed to cancel order',
      })

      customRender(<OrderDetails orderId={mockOrders[1].id} />)

      // Try to cancel order
      await user.click(screen.getByText(/cancel order/i))
      await user.click(screen.getByText(/confirm cancellation/i))

      await waitFor(() => {
        expect(screen.getByText(/failed to cancel order/i)).toBeInTheDocument()
      })
    })
  })

  describe('Order Refunds', () => {
    it('should process refunds for paid orders', async () => {
      const user = userEvent.setup()

      // Mock successful refund
      mockOrderHook.refundOrder.mockResolvedValue({
        success: true,
        order: {
          ...mockOrders[0],
          status: 'refunded',
        },
        refund: {
          id: 're_test_123',
          amount: 360,
          currency: 'EUR',
          status: 'succeeded',
        },
      })

      customRender(<OrderDetails orderId={mockOrders[0].id} />)

      // Process refund
      await user.click(screen.getByText(/process refund/i))
      await user.click(screen.getByText(/confirm refund/i))

      await waitFor(() => {
        expect(mockOrderHook.refundOrder).toHaveBeenCalledWith(mockOrders[0].id)
      })

      expect(screen.getByText('refunded')).toBeInTheDocument()
      expect(screen.getByText('re_test_123')).toBeInTheDocument()
    })

    it('should not allow refunds for pending orders', () => {
      customRender(<OrderDetails orderId={mockOrders[1].id} />)

      expect(screen.queryByText(/process refund/i)).not.toBeInTheDocument()
      expect(screen.getByText(/refund not available/i)).toBeInTheDocument()
    })

    it('should handle refund errors', async () => {
      const user = userEvent.setup()

      // Mock refund failure
      mockOrderHook.refundOrder.mockResolvedValue({
        success: false,
        error: 'Failed to process refund',
      })

      customRender(<OrderDetails orderId={mockOrders[0].id} />)

      // Try to process refund
      await user.click(screen.getByText(/process refund/i))
      await user.click(screen.getByText(/confirm refund/i))

      await waitFor(() => {
        expect(screen.getByText(/failed to process refund/i)).toBeInTheDocument()
      })
    })

    it('should show partial refunds', async () => {
      const user = userEvent.setup()

      // Mock partial refund
      mockOrderHook.refundOrder.mockResolvedValue({
        success: true,
        order: {
          ...mockOrders[0],
          status: 'partially_refunded',
        },
        refund: {
          id: 're_test_123',
          amount: 180,
          currency: 'EUR',
          status: 'succeeded',
        },
      })

      customRender(<OrderDetails orderId={mockOrders[0].id} />)

      // Process partial refund
      await user.click(screen.getByText(/process refund/i))
      await user.type(screen.getByLabelText(/refund amount/i), '180')
      await user.click(screen.getByText(/confirm refund/i))

      await waitFor(() => {
        expect(mockOrderHook.refundOrder).toHaveBeenCalledWith(
          mockOrders[0].id,
          180
        )
      })

      expect(screen.getByText('partially_refunded')).toBeInTheDocument()
      expect(screen.getByText('€180')).toBeInTheDocument()
    })
  })

  describe('Order Search and Filtering', () => {
    it('should search orders by multiple criteria', async () => {
      const user = userEvent.setup()

      customRender(<OrderList />)

      // Search by order number
      const searchInput = screen.getByPlaceholderText(/search orders/i)
      await user.type(searchInput, 'MO-123456')

      await waitFor(() => {
        expect(mockOrderHook.searchOrders).toHaveBeenCalledWith('MO-123456')
      })

      // Filter by date range
      await user.click(screen.getByText(/filter by date/i))
      await user.type(screen.getByLabelText(/from date/i), '2024-01-01')
      await user.type(screen.getByLabelText(/to date/i), '2024-01-31')
      await user.click(screen.getByText(/apply filter/i))

      await waitFor(() => {
        expect(mockOrderHook.filterOrders).toHaveBeenCalledWith('date_range', {
          from: '2024-01-01',
          to: '2024-01-31',
        })
      })
    })

    it('should clear filters', async () => {
      const user = userEvent.setup()

      customRender(<OrderList />)

      // Apply filter
      await user.click(screen.getByText(/filter by status/i))
      await user.click(screen.getByText(/paid/i))

      // Clear filters
      await user.click(screen.getByText(/clear filters/i))

      await waitFor(() => {
        expect(mockOrderHook.filterOrders).toHaveBeenCalledWith('clear')
      })
    })

    it('should export order data', async () => {
      const user = userEvent.setup()

      // Mock export function
      const mockExport = vi.fn()
      vi.mocked(useOrders).mockReturnValue({
        ...mockOrderHook,
        exportOrders: mockExport,
      })

      customRender(<OrderList />)

      // Export orders
      await user.click(screen.getByText(/export orders/i))

      await waitFor(() => {
        expect(mockExport).toHaveBeenCalled()
      })
    })
  })

  describe('Order Error Handling', () => {
    it('should handle network errors', () => {
      vi.mocked(useOrders).mockReturnValue({
        ...mockOrderHook,
        error: 'Network error',
      })

      customRender(<OrderList />)

      expect(screen.getByText(/network error/i)).toBeInTheDocument()
      expect(screen.getByText(/try again/i)).toBeInTheDocument()
    })

    it('should handle unauthorized access', () => {
      vi.mocked(useOrders).mockReturnValue({
        ...mockOrderHook,
        error: 'Unauthorized',
      })

      customRender(<OrderList />)

      expect(screen.getByText(/unauthorized/i)).toBeInTheDocument()
      expect(screen.getByText(/please log in/i)).toBeInTheDocument()
    })

    it('should handle server errors', () => {
      vi.mocked(useOrders).mockReturnValue({
        ...mockOrderHook,
        error: 'Internal server error',
      })

      customRender(<OrderList />)

      expect(screen.getByText(/internal server error/i)).toBeInTheDocument()
      expect(screen.getByText(/contact support/i)).toBeInTheDocument()
    })
  })
})
