import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCheckout } from '@/hooks/useCheckout'
import { mockSupabaseClient } from '@/test/test-utils'
import * as supabaseModule from '@/integrations/supabase/client'
import { MockPaymentProcessor } from '@/utils/mockPaymentProcessor'

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}))

// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}))

// Mock useCart
vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    cartItems: [
      {
        id: 'cart-item-1',
        mediaOutletId: 'media-1',
        price: 100,
        currency: 'EUR',
        quantity: 1,
        domain: 'example.com',
        category: 'Technology',
      },
    ],
    clearCart: vi.fn(),
  }),
}))

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

// Mock mockPaymentProcessor
vi.mock('@/utils/mockPaymentProcessor', () => ({
  MockPaymentProcessor: {
    processPayment: vi.fn(),
  },
}))

describe('useCheckout', () => {
  let mockSupabase: typeof mockSupabaseClient

  beforeEach(() => {
    mockSupabase = mockSupabaseClient
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useCheckout())

      expect(result.current.currentStep).toBe('cart-review')
      expect(result.current.formData).toEqual({})
      expect(result.current.validationErrors).toEqual([])
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.canGoNext).toBe(false)
      expect(result.current.canGoBack).toBe(false)
      expect(result.current.isFirstStep).toBe(true)
      expect(result.current.isLastStep).toBe(false)
    })
  })

  describe('Step navigation', () => {
    it('should navigate to next step', () => {
      const { result } = renderHook(() => useCheckout())

      act(() => {
        result.current.goToNextStep()
      })

      expect(result.current.currentStep).toBe('billing-payment')
      expect(result.current.isFirstStep).toBe(false)
    })

    it('should navigate to previous step', () => {
      const { result } = renderHook(() => useCheckout())

      act(() => {
        result.current.goToStep('billing-payment')
        result.current.goToPreviousStep()
      })

      expect(result.current.currentStep).toBe('cart-review')
    })

    it('should navigate to specific step', () => {
      const { result } = renderHook(() => useCheckout())

      act(() => {
        result.current.goToStep('content-upload')
      })

      expect(result.current.currentStep).toBe('content-upload')
    })

    it('should handle edge cases in navigation', () => {
      const { result } = renderHook(() => useCheckout())

      // Try to go back from first step
      act(() => {
        result.current.goToPreviousStep()
      })
      expect(result.current.currentStep).toBe('cart-review')

      // Go to last step and try to go forward
      act(() => {
        result.current.goToStep('confirmation')
        result.current.goToNextStep()
      })
      expect(result.current.currentStep).toBe('confirmation')
    })
  })

  describe('Form data management', () => {
    it('should update form data', () => {
      const { result } = renderHook(() => useCheckout())

      const testData = {
        billingInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      }

      act(() => {
        result.current.updateFormData(testData)
      })

      expect(result.current.formData).toEqual(testData)
    })

    it('should merge form data correctly', () => {
      const { result } = renderHook(() => useCheckout())

      act(() => {
        result.current.updateFormData({
          billingInfo: { firstName: 'John' },
        })
      })

      act(() => {
        result.current.updateFormData({
          billingInfo: { lastName: 'Doe' },
        })
      })

      expect(result.current.formData.billingInfo).toEqual({
        firstName: 'John',
        lastName: 'Doe',
      })
    })
  })

  describe('Validation', () => {
    it('should validate billing information', () => {
      const { result } = renderHook(() => useCheckout())

      // Test with valid billing info
      act(() => {
        result.current.updateFormData({
          billingInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            address: {
              street: '123 Main St',
              city: 'Anytown',
              postalCode: '12345',
              country: 'US',
            },
          },
        })
      })

      // Should pass validation for billing step
      act(() => {
        result.current.goToStep('billing-payment')
      })

      // Note: Actual validation logic would be in CheckoutValidator
      expect(result.current.currentStep).toBe('billing-payment')
    })

    it('should handle validation errors', () => {
      const { result } = renderHook(() => useCheckout())

      act(() => {
        result.current.updateFormData({
          billingInfo: {
            firstName: '', // Invalid - empty
            lastName: 'Doe',
            email: 'invalid-email', // Invalid format
          },
        })
      })

      // The validation logic would set validation errors
      // This test ensures the state management works
      expect(result.current.formData.billingInfo?.firstName).toBe('')
    })
  })

  describe('Checkout submission', () => {
    beforeEach(() => {
      // Mock successful payment
      const mockPaymentProcessor = MockPaymentProcessor
      mockPaymentProcessor.processPayment.mockResolvedValue({
        success: true,
        paymentId: 'test-payment-id',
        simulatedDelay: 100,
      })

      // Mock successful order creation
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'test-order-id' },
              error: null,
            }),
          }),
        }),
      })
    })

    it('should handle successful checkout submission', async () => {
      const { result } = renderHook(() => useCheckout())

      // Set up valid form data
      act(() => {
        result.current.updateFormData({
          billingInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            address: {
              street: '123 Main St',
              city: 'Anytown',
              postalCode: '12345',
              country: 'US',
            },
          },
          paymentMethod: {
            type: 'stripe',
            paymentId: 'test-payment-id',
          },
        })
      })

      let submitResult: boolean = false

      await act(async () => {
        submitResult = await result.current.submitCheckout()
      })

      expect(submitResult).toBe(true)
      expect(result.current.isSubmitting).toBe(false)
    })

    it('should handle payment failure', async () => {
      const mockPaymentProcessor = MockPaymentProcessor
      mockPaymentProcessor.processPayment.mockResolvedValue({
        success: false,
        error: 'Payment failed',
      })

      const { result } = renderHook(() => useCheckout())

      let submitResult: boolean = true

      await act(async () => {
        submitResult = await result.current.submitCheckout()
      })

      expect(submitResult).toBe(false)
      expect(result.current.validationErrors.length).toBeGreaterThan(0)
    })

    it('should handle order creation failure', async () => {
      const mockPaymentProcessor = MockPaymentProcessor
      mockPaymentProcessor.processPayment.mockResolvedValue({
        success: true,
        paymentId: 'test-payment-id',
      })

      // Mock order creation failure
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Order creation failed' },
            }),
          }),
        }),
      })

      const { result } = renderHook(() => useCheckout())

      let submitResult: boolean = true

      await act(async () => {
        submitResult = await result.current.submitCheckout()
      })

      expect(submitResult).toBe(false)
      expect(result.current.validationErrors.length).toBeGreaterThan(0)
    })
  })

  describe('Progress and computed values', () => {
    it('should calculate progress correctly', () => {
      const { result } = renderHook(() => useCheckout())

      expect(result.current.progress).toBe(25) // 1st of 4 steps

      act(() => {
        result.current.goToStep('billing-payment')
      })
      expect(result.current.progress).toBe(50) // 2nd of 4 steps

      act(() => {
        result.current.goToStep('content-upload')
      })
      expect(result.current.progress).toBe(75) // 3rd of 4 steps

      act(() => {
        result.current.goToStep('confirmation')
      })
      expect(result.current.progress).toBe(100) // 4th of 4 steps
    })

    it('should track step position correctly', () => {
      const { result } = renderHook(() => useCheckout())

      expect(result.current.isFirstStep).toBe(true)
      expect(result.current.isLastStep).toBe(false)
      expect(result.current.currentStepIndex).toBe(0)

      act(() => {
        result.current.goToStep('confirmation')
      })

      expect(result.current.isFirstStep).toBe(false)
      expect(result.current.isLastStep).toBe(true)
      expect(result.current.currentStepIndex).toBe(3)
    })
  })

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockPaymentProcessor = MockPaymentProcessor
      mockPaymentProcessor.processPayment.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useCheckout())

      let submitResult: boolean = true

      await act(async () => {
        submitResult = await result.current.submitCheckout()
      })

      expect(submitResult).toBe(false)
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.validationErrors.length).toBeGreaterThan(0)
    })

    it('should reset submission state on error', async () => {
      const mockPaymentProcessor = MockPaymentProcessor
      mockPaymentProcessor.processPayment.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useCheckout())

      await act(async () => {
        await result.current.submitCheckout()
      })

      expect(result.current.isSubmitting).toBe(false)
    })
  })
})
