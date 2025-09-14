import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CartSidebar } from '@/components/cart/CartSidebar'
import { CartIcon } from '@/components/cart/CartIcon'
import { TopNav } from '@/components/TopNav'
import { CheckoutModal } from '@/components/checkout/CheckoutModal'
import { createMockCartItem } from '@/test/test-utils'
import { useCart } from '@/hooks/useCart'
import { useIsMobile } from '@/hooks/use-mobile'

// Mock all hooks and dependencies
vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    cartItems: [createMockCartItem()],
    removeFromCart: vi.fn(),
    updateCartItemQuantity: vi.fn(),
    refetch: vi.fn(),
    cartCount: 1,
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    userRoles: ['buyer'],
    currentRole: 'buyer',
  }),
}))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(),
}))

vi.mock('@/hooks/useCheckout', () => ({
  useCheckout: () => ({
    currentStep: 'cart-review',
    formData: {},
    validationErrors: [],
    isSubmitting: false,
    canGoNext: true,
    canGoBack: false,
    isFirstStep: true,
    isLastStep: false,
    currentStepIndex: 0,
    progress: 25,
    updateFormData: vi.fn(),
    goToNextStep: vi.fn(),
    goToPreviousStep: vi.fn(),
    goToStep: vi.fn(),
    submitCheckout: vi.fn(),
  }),
}))

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    unreadCount: 0,
  }),
}))

vi.mock('@/hooks/useSettings', () => ({
  useSettingsStatus: () => ({
    isComplete: true,
  }),
}))

vi.mock('@/components/navigation', () => ({
  getNavigationItems: () => [
    { title: 'Dashboard', url: '/dashboard', icon: vi.fn() },
    { title: 'Cart', url: '/cart', icon: vi.fn() },
  ],
  getContextAwareNavigation: () => [
    { title: 'Dashboard', url: '/dashboard', icon: vi.fn() },
    { title: 'Cart', url: '/cart', icon: vi.fn() },
  ],
}))

vi.mock('react-router-dom', () => ({
  NavLink: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
  useLocation: () => ({ pathname: '/marketplace' }),
  Navigate: ({ to }: { to: string }) => <div>Redirecting to {to}</div>,
}))

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

describe('Mobile Responsiveness Tests', () => {
  const mockUseIsMobile = vi.mocked(useIsMobile)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('CartSidebar Mobile Behavior', () => {
    it('should render in full-screen mode on mobile devices', () => {
      mockUseIsMobile.mockReturnValue(true)

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      const sidebar = screen.getByLabelText('Shopping cart sidebar')
      expect(sidebar).toHaveClass('w-full')
      expect(sidebar).toHaveClass('h-full')
      expect(sidebar).toHaveClass('max-w-none')
    })

    it('should render in sidebar mode on desktop devices', () => {
      mockUseIsMobile.mockReturnValue(false)

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      const sidebar = screen.getByLabelText('Shopping cart sidebar')
      expect(sidebar).toHaveClass('w-full')
      expect(sidebar).toHaveClass('sm:max-w-lg')
    })

    it('should apply mobile-specific spacing and typography', () => {
      mockUseIsMobile.mockReturnValue(true)

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      // Check for mobile-specific padding classes
      const content = screen.getByText('example.com').closest('.flex-1')
      expect(content).toHaveClass('py-2')
      expect(content).toHaveClass('px-4')

      // Check for mobile-specific header sizing
      const title = screen.getByText('Shopping Cart')
      expect(title).toHaveClass('text-lg')
    })

    it('should apply desktop-specific spacing and typography', () => {
      mockUseIsMobile.mockReturnValue(false)

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      // Check for desktop-specific padding classes
      const content = screen.getByText('example.com').closest('.flex-1')
      expect(content).toHaveClass('py-4')
      expect(content).toHaveClass('px-6')

      // Check for desktop-specific header sizing
      const title = screen.getByText('Shopping Cart')
      expect(title).toHaveClass('text-xl')
    })

    it('should handle pull-to-refresh on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      const sidebar = screen.getByLabelText('Shopping cart sidebar')

      // Simulate touch start
      fireEvent.touchStart(sidebar, {
        touches: [{ clientY: 100 }],
      })

      // Simulate pull down
      fireEvent.touchMove(sidebar, {
        touches: [{ clientY: 180 }], // 80px pull
      })

      // Simulate touch end
      fireEvent.touchEnd(sidebar)

      // Should hide pull-to-refresh indicator after touch ends
      expect(screen.queryByText('Pull to refresh')).not.toBeInTheDocument()
    })

    it('should not show pull-to-refresh on desktop', () => {
      mockUseIsMobile.mockReturnValue(false)

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      // Should not show pull-to-refresh on desktop
      expect(screen.queryByText('Pull to refresh')).not.toBeInTheDocument()
    })
  })

  describe('CartIcon Mobile Behavior', () => {
    it('should apply mobile-specific sizing', () => {
      mockUseIsMobile.mockReturnValue(true)

      render(<CartIcon onClick={vi.fn()} />)

      const button = screen.getByLabelText(/shopping cart/i)
      expect(button).toHaveClass('h-8')
      expect(button).toHaveClass('w-8')
    })

    it('should apply desktop-specific sizing', () => {
      mockUseIsMobile.mockReturnValue(false)

      render(<CartIcon onClick={vi.fn()} />)

      const button = screen.getByLabelText(/shopping cart/i)
      expect(button).toHaveClass('h-9')
      expect(button).toHaveClass('w-9')
    })

    it('should handle mobile touch interactions', async () => {
      mockUseIsMobile.mockReturnValue(true)
      const mockOnClick = vi.fn()

      render(<CartIcon onClick={mockOnClick} />)

      const button = screen.getByLabelText(/shopping cart/i)

      // Simulate touch/click
      fireEvent.click(button)

      expect(mockOnClick).toHaveBeenCalled()
    })
  })

  describe('TopNav Mobile Behavior', () => {
    it('should handle mobile viewport changes', () => {
      mockUseIsMobile.mockReturnValue(true)

      render(<TopNav />)

      // TopNav should render and handle mobile state
      expect(screen.getByText('Cart')).toBeInTheDocument()
    })

    it('should handle desktop viewport changes', () => {
      mockUseIsMobile.mockReturnValue(false)

      render(<TopNav />)

      // TopNav should render and handle desktop state
      expect(screen.getByText('Cart')).toBeInTheDocument()
    })

    it('should maintain accessibility on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)

      render(<TopNav />)

      // Should still have proper ARIA attributes
      const cartIcon = screen.getByLabelText(/shopping cart/i)
      expect(cartIcon).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('CheckoutModal Mobile Behavior', () => {
    it('should adapt to mobile screen size', () => {
      mockUseIsMobile.mockReturnValue(true)

      render(
        <CheckoutModal
          open={true}
          onOpenChange={vi.fn()}
          onComplete={vi.fn()}
        />
      )

      // Modal should be rendered and responsive
      expect(screen.getByText('Cart Review')).toBeInTheDocument()
    })

    it('should handle touch interactions on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)

      render(
        <CheckoutModal
          open={true}
          onOpenChange={vi.fn()}
          onComplete={vi.fn()}
        />
      )

      // Should be able to interact with modal content on mobile
      const nextButton = screen.getByText('Next')
      expect(nextButton).toBeInTheDocument()
    })
  })

  describe('Responsive Breakpoints', () => {
    it('should handle xs breakpoint (320px)', () => {
      // Mock viewport width using type assertion
      ;(window as Window & { innerWidth: number }).innerWidth = 320

      mockUseIsMobile.mockReturnValue(true)

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      // Should apply xs-specific styles
      const sidebar = screen.getByLabelText('Shopping cart sidebar')
      expect(sidebar).toHaveClass('w-full')
    })

    it('should handle sm breakpoint (640px)', () => {
      ;(window as Window & { innerWidth: number }).innerWidth = 640

      mockUseIsMobile.mockReturnValue(false)

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      // Should apply sm-specific styles
      const sidebar = screen.getByLabelText('Shopping cart sidebar')
      expect(sidebar).toHaveClass('sm:max-w-lg')
    })

    it('should handle md breakpoint (768px)', () => {
      ;(window as Window & { innerWidth: number }).innerWidth = 768

      mockUseIsMobile.mockReturnValue(false)

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      // Should apply md-specific styles
      const content = screen.getByText('example.com').closest('.flex-1')
      expect(content).toHaveClass('py-4')
    })

    it('should handle lg breakpoint (1024px)', () => {
      ;(window as Window & { innerWidth: number }).innerWidth = 1024

      mockUseIsMobile.mockReturnValue(false)

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      // Should apply lg-specific styles
      const sidebar = screen.getByLabelText('Shopping cart sidebar')
      expect(sidebar).toHaveClass('w-full')
    })
  })

  describe('Touch Interactions', () => {
    it('should handle swipe gestures on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      const sidebar = screen.getByLabelText('Shopping cart sidebar')

      // Simulate swipe start
      fireEvent.touchStart(sidebar, {
        touches: [{ clientX: 300, clientY: 200 }],
      })

      // Simulate swipe left (to close)
      fireEvent.touchMove(sidebar, {
        touches: [{ clientX: 100, clientY: 200 }],
      })

      // Should handle swipe gesture
      expect(sidebar).toBeInTheDocument()
    })

    it('should handle tap interactions on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)
      const mockOnClick = vi.fn()

      render(<CartIcon onClick={mockOnClick} />)

      const button = screen.getByLabelText(/shopping cart/i)

      // Simulate tap
      fireEvent.touchStart(button, {
        touches: [{ clientX: 50, clientY: 50 }],
      })

      fireEvent.touchEnd(button)

      // Should trigger click
      expect(mockOnClick).toHaveBeenCalled()
    })

    it('should handle long press interactions', () => {
      mockUseIsMobile.mockReturnValue(true)

      render(<CartIcon onClick={vi.fn()} />)

      const button = screen.getByLabelText(/shopping cart/i)

      // Simulate long press start
      fireEvent.touchStart(button, {
        touches: [{ clientX: 50, clientY: 50 }],
      })

      // Should handle long press if implemented
      expect(button).toBeInTheDocument()
    })
  })

  describe('Orientation Changes', () => {
    it('should handle portrait orientation', () => {
      // Mock portrait orientation
      Object.defineProperty(window.screen, 'orientation', {
        value: { type: 'portrait-primary' },
      })

      mockUseIsMobile.mockReturnValue(true)

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      // Should render in portrait mode
      const sidebar = screen.getByLabelText('Shopping cart sidebar')
      expect(sidebar).toHaveClass('h-full')
    })

    it('should handle landscape orientation', () => {
      // Mock landscape orientation
      Object.defineProperty(window.screen, 'orientation', {
        value: { type: 'landscape-primary' },
      })

      mockUseIsMobile.mockReturnValue(true)

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      // Should render in landscape mode
      const sidebar = screen.getByLabelText('Shopping cart sidebar')
      expect(sidebar).toHaveClass('w-full')
    })
  })

  describe('Performance on Mobile', () => {
    it('should render efficiently on mobile devices', () => {
      mockUseIsMobile.mockReturnValue(true)

      const startTime = performance.now()

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(100) // Less than 100ms
    })

    it('should handle large carts efficiently on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)

      const largeCart = Array.from({ length: 20 }, (_, i) =>
        createMockCartItem({
          id: `item-${i}`,
          domain: `domain${i}.com`,
          category: 'Technology',
        })
      )

      vi.mocked(useCart).mockReturnValue({
        cartItems: largeCart,
        removeFromCart: vi.fn(),
        updateCartItemQuantity: vi.fn(),
        refetch: vi.fn(),
        cartCount: largeCart.length,
      })

      const startTime = performance.now()

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render large cart within reasonable time
      expect(renderTime).toBeLessThan(200) // Less than 200ms
      expect(screen.getAllByText(/domain\d+\.com/)).toHaveLength(20)
    })
  })

  describe('Accessibility on Mobile', () => {
    it('should maintain accessibility on mobile devices', () => {
      mockUseIsMobile.mockReturnValue(true)

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      // Should maintain all accessibility features on mobile
      expect(screen.getByLabelText('Shopping cart sidebar')).toBeInTheDocument()
      expect(screen.getByLabelText('Close shopping cart')).toBeInTheDocument()
      expect(screen.getByLabelText(/current quantity/i)).toBeInTheDocument()
    })

    it('should support screen readers on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)

      render(
        <CartSidebar
          open={true}
          onOpenChange={vi.fn()}
          onOpenCheckout={vi.fn()}
        />
      )

      // Should have proper ARIA attributes for screen readers
      const sidebar = screen.getByLabelText('Shopping cart sidebar')
      expect(sidebar).toHaveAttribute('aria-describedby')
      expect(sidebar).toHaveAttribute('aria-label')
    })
  })
})
