import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CartSidebar } from '@/components/cart/CartSidebar'
import { createMockCartItem } from '@/test/test-utils'
import { useCart } from '@/hooks/useCart'
import { useIsMobile } from '@/hooks/use-mobile'

// Mock the hooks
vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    cartItems: [
      createMockCartItem({
        id: 'cart-item-1',
        domain: 'example.com',
        category: 'Technology',
        quantity: 2,
        finalPrice: 200,
        readOnly: false,
      }),
      createMockCartItem({
        id: 'cart-item-2',
        domain: 'testsite.com',
        category: 'Business',
        quantity: 1,
        finalPrice: 150,
        readOnly: true, // Test read-only item
      }),
    ],
    removeFromCart: vi.fn(),
    updateCartItemQuantity: vi.fn(),
    refetch: vi.fn(),
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

describe('CartSidebar', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onOpenCheckout: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render cart sidebar when open', () => {
      render(<CartSidebar {...defaultProps} />)

      expect(screen.getByText('Shopping Cart')).toBeInTheDocument()
      expect(screen.getByText('example.com')).toBeInTheDocument()
      expect(screen.getByText('testsite.com')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(<CartSidebar {...defaultProps} open={false} />)

      expect(screen.queryByText('Shopping Cart')).not.toBeInTheDocument()
    })

    it('should display cart item count in header', () => {
      render(<CartSidebar {...defaultProps} />)

      expect(screen.getByText('2')).toBeInTheDocument() // Badge with count
    })

    it('should show empty cart state when no items', () => {
      vi.mocked(useCart).mockReturnValue({
        cartItems: [],
        removeFromCart: vi.fn(),
        updateCartItemQuantity: vi.fn(),
        refetch: vi.fn(),
      })

      render(<CartSidebar {...defaultProps} />)

      expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    })
  })

  describe('Cart items display', () => {
    it('should display cart item details correctly', () => {
      render(<CartSidebar {...defaultProps} />)

      expect(screen.getByText('example.com')).toBeInTheDocument()
      expect(screen.getByText('Technology')).toBeInTheDocument()
      expect(screen.getByText('€200.00')).toBeInTheDocument() // 100 * 2
      expect(screen.getByText('2')).toBeInTheDocument() // Quantity
    })

    it('should mark read-only items appropriately', () => {
      render(<CartSidebar {...defaultProps} />)

      expect(screen.getByText('Read-only')).toBeInTheDocument()
    })

    it('should show correct pricing calculations', () => {
      render(<CartSidebar {...defaultProps} />)

      expect(screen.getByText('Subtotal')).toBeInTheDocument()
      expect(screen.getByText('VAT (25%)')).toBeInTheDocument()
      expect(screen.getByText('Total')).toBeInTheDocument()
      // Total should be (200 + 150) + 25% VAT = 350 + 87.5 = 437.5
      expect(screen.getByText('€437.50')).toBeInTheDocument()
    })
  })

  describe('Quantity controls', () => {
    it('should render quantity controls for non-read-only items', () => {
      render(<CartSidebar {...defaultProps} />)

      const decreaseButtons = screen.getAllByLabelText(/decrease quantity/i)
      const increaseButtons = screen.getAllByLabelText(/increase quantity/i)

      expect(decreaseButtons).toHaveLength(1) // Only for non-read-only item
      expect(increaseButtons).toHaveLength(1) // Only for non-read-only item
    })

    it('should handle quantity increase', async () => {
      const user = userEvent.setup()
      const mockUpdateQuantity = vi.fn()
      vi.mocked(useCart).mockReturnValue({
        cartItems: [createMockCartItem({ id: 'test-item', readOnly: false })],
        removeFromCart: vi.fn(),
        updateCartItemQuantity: mockUpdateQuantity,
        refetch: vi.fn(),
      })

      render(<CartSidebar {...defaultProps} />)

      const increaseButton = screen.getByLabelText(/increase quantity/i)
      await user.click(increaseButton)

      expect(mockUpdateQuantity).toHaveBeenCalledWith('test-item', 2)
    })

    it('should handle quantity decrease', async () => {
      const user = userEvent.setup()
      const mockUpdateQuantity = vi.fn()
      vi.mocked(useCart).mockReturnValue({
        cartItems: [createMockCartItem({ id: 'test-item', quantity: 2, readOnly: false })],
        removeFromCart: vi.fn(),
        updateCartItemQuantity: mockUpdateQuantity,
        refetch: vi.fn(),
      })

      render(<CartSidebar {...defaultProps} />)

      const decreaseButton = screen.getByLabelText(/decrease quantity/i)
      await user.click(decreaseButton)

      expect(mockUpdateQuantity).toHaveBeenCalledWith('test-item', 1)
    })

    it('should disable decrease button when quantity is 1', () => {
      vi.mocked(useCart).mockReturnValue({
        cartItems: [createMockCartItem({ id: 'test-item', quantity: 1, readOnly: false })],
        removeFromCart: vi.fn(),
        updateCartItemQuantity: vi.fn(),
        refetch: vi.fn(),
      })

      render(<CartSidebar {...defaultProps} />)

      const decreaseButton = screen.getByLabelText(/decrease quantity/i)
      expect(decreaseButton).toBeDisabled()
    })
  })

  describe('Remove functionality', () => {
    it('should render remove buttons for all items', () => {
      render(<CartSidebar {...defaultProps} />)

      const removeButtons = screen.getAllByLabelText(/remove.*from cart/i)
      expect(removeButtons).toHaveLength(2)
    })

    it('should handle item removal', async () => {
      const user = userEvent.setup()
      const mockRemoveFromCart = vi.fn()
      vi.mocked(useCart).mockReturnValue({
        cartItems: [createMockCartItem({ id: 'test-item', readOnly: false })],
        removeFromCart: mockRemoveFromCart,
        updateCartItemQuantity: vi.fn(),
        refetch: vi.fn(),
      })

      render(<CartSidebar {...defaultProps} />)

      const removeButton = screen.getByLabelText(/remove.*from cart/i)
      await user.click(removeButton)

      expect(mockRemoveFromCart).toHaveBeenCalledWith('test-item')
    })

    it('should prevent removal of read-only items', async () => {
      const user = userEvent.setup()
      const mockRemoveFromCart = vi.fn()
      vi.mocked(useCart).mockReturnValue({
        cartItems: [createMockCartItem({ id: 'test-item', readOnly: true })],
        removeFromCart: mockRemoveFromCart,
        updateCartItemQuantity: vi.fn(),
        refetch: vi.fn(),
      })

      render(<CartSidebar {...defaultProps} />)

      const removeButton = screen.getByLabelText(/remove.*from cart/i)
      expect(removeButton).toBeDisabled()

      await user.click(removeButton)
      expect(mockRemoveFromCart).not.toHaveBeenCalled()
    })
  })

  describe('Checkout functionality', () => {
    it('should render checkout button when items exist', () => {
      render(<CartSidebar {...defaultProps} />)

      expect(screen.getByText('Proceed to Checkout')).toBeInTheDocument()
    })

    it('should disable checkout button when no valid items', () => {
      vi.mocked(useCart).mockReturnValue({
        cartItems: [createMockCartItem({ readOnly: true })],
        removeFromCart: vi.fn(),
        updateCartItemQuantity: vi.fn(),
        refetch: vi.fn(),
      })

      render(<CartSidebar {...defaultProps} />)

      const checkoutButton = screen.getByText('Proceed to Checkout')
      expect(checkoutButton).toBeDisabled()
    })

    it('should handle checkout button click', async () => {
      const user = userEvent.setup()
      const mockOnOpenCheckout = vi.fn()

      render(<CartSidebar {...defaultProps} onOpenCheckout={mockOnOpenCheckout} />)

      const checkoutButton = screen.getByText('Proceed to Checkout')
      await user.click(checkoutButton)

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
      expect(mockOnOpenCheckout).toHaveBeenCalled()
    })
  })

  describe('Mobile-specific interactions', () => {
    beforeEach(() => {
      vi.mocked(useIsMobile).mockReturnValue(true)
    })

    it('should apply mobile-specific styling', () => {
      render(<CartSidebar {...defaultProps} />)

      // Mobile-specific classes should be applied
      const sidebar = screen.getByLabelText('Shopping cart sidebar')
      expect(sidebar).toHaveClass('w-full')
      expect(sidebar).toHaveClass('h-full')
    })

    it('should handle touch events for pull-to-refresh', () => {
      const mockRefetch = vi.fn()
      vi.mocked(useCart).mockReturnValue({
        cartItems: [createMockCartItem()],
        removeFromCart: vi.fn(),
        updateCartItemQuantity: vi.fn(),
        refetch: mockRefetch,
      })

      render(<CartSidebar {...defaultProps} />)

      const sidebar = screen.getByLabelText('Shopping cart sidebar')

      // Simulate touch start
      fireEvent.touchStart(sidebar, {
        touches: [{ clientY: 100 }],
      })

      // Simulate touch move (pull down)
      fireEvent.touchMove(sidebar, {
        touches: [{ clientY: 200 }], // 100px down
      })

      // Simulate touch end (release)
      fireEvent.touchEnd(sidebar)

      // Should trigger refresh if pull distance is sufficient
      expect(mockRefetch).toHaveBeenCalled()
    })

    it('should show pull-to-refresh indicator', () => {
      vi.mocked(useCart).mockReturnValue({
        cartItems: [createMockCartItem()],
        removeFromCart: vi.fn(),
        updateCartItemQuantity: vi.fn(),
        refetch: vi.fn(),
      })

      render(<CartSidebar {...defaultProps} />)

      const sidebar = screen.getByLabelText('Shopping cart sidebar')

      // Simulate significant pull
      fireEvent.touchStart(sidebar, {
        touches: [{ clientY: 100 }],
      })

      fireEvent.touchMove(sidebar, {
        touches: [{ clientY: 200 }],
      })

      // Should show pull indicator
      expect(screen.getByText('Pull to refresh')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<CartSidebar {...defaultProps} />)

      expect(screen.getByLabelText('Shopping cart sidebar')).toBeInTheDocument()
      expect(screen.getByLabelText('Close shopping cart')).toBeInTheDocument()
      expect(screen.getByLabelText('Current quantity: 2')).toBeInTheDocument()
    })

    it('should have proper ARIA descriptions', () => {
      render(<CartSidebar {...defaultProps} />)

      const sidebar = screen.getByLabelText('Shopping cart sidebar')
      expect(sidebar).toHaveAttribute('aria-describedby', 'cart-description')
      expect(screen.getByText(/shopping cart with/i)).toBeInTheDocument()
    })

    it('should announce quantity changes', async () => {
      const user = userEvent.setup()
      vi.mocked(useCart).mockReturnValue({
        cartItems: [createMockCartItem({ id: 'test-item', quantity: 2, readOnly: false })],
        removeFromCart: vi.fn(),
        updateCartItemQuantity: vi.fn(),
        refetch: vi.fn(),
      })

      render(<CartSidebar {...defaultProps} />)

      const increaseButton = screen.getByLabelText(/increase quantity/i)
      await user.click(increaseButton)

      // Screen reader announcement should be created
      const announcements = document.querySelectorAll('[aria-live]')
      expect(announcements.length).toBeGreaterThan(0)
    })

    it('should handle keyboard navigation', () => {
      render(<CartSidebar {...defaultProps} />)

      const sidebar = screen.getByLabelText('Shopping cart sidebar')
      const focusableElements = sidebar.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      expect(focusableElements.length).toBeGreaterThan(0)
    })

    it('should close on Escape key', () => {
      render(<CartSidebar {...defaultProps} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Error handling', () => {
    it('should handle loading states gracefully', () => {
      vi.mocked(useCart).mockReturnValue({
        cartItems: [],
        removeFromCart: vi.fn(),
        updateCartItemQuantity: vi.fn(),
        refetch: vi.fn(),
      })

      render(<CartSidebar {...defaultProps} />)

      expect(screen.getByText('Loading cart...')).toBeInTheDocument()
    })

    it('should display error messages appropriately', () => {
      vi.mocked(useCart).mockReturnValue({
        cartItems: [], // Empty cart after error
        removeFromCart: vi.fn(),
        updateCartItemQuantity: vi.fn(),
        refetch: vi.fn(),
      })

      render(<CartSidebar {...defaultProps} />)

      expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<CartSidebar {...defaultProps} />)

      const initialRender = screen.getByText('Shopping Cart')

      // Re-render with same props
      rerender(<CartSidebar {...defaultProps} />)

      // Component should still be there
      expect(screen.getByText('Shopping Cart')).toBe(initialRender)
    })

    it('should handle large cart efficiently', () => {
      const largeCart = Array.from({ length: 50 }, (_, i) =>
        createMockCartItem({ id: `item-${i}`, domain: `domain${i}.com` })
      )

      vi.mocked(useCart).mockReturnValue({
        cartItems: largeCart,
        removeFromCart: vi.fn(),
        updateCartItemQuantity: vi.fn(),
        refetch: vi.fn(),
      })

      render(<CartSidebar {...defaultProps} />)

      // Should render all items without crashing
      expect(screen.getAllByText(/domain\d+\.com/)).toHaveLength(50)
    })
  })
})
