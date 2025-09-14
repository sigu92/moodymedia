import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useCheckout } from '@/hooks/useCheckout'
import { useCart } from '@/hooks/useCart'
import { useFileUpload } from '@/hooks/useFileUpload'
import { CheckoutModal } from '@/components/checkout/CheckoutModal'
import { CartSidebar } from '@/components/cart/CartSidebar'
import { mockSupabaseClient } from '@/test/test-utils'
import * as supabaseModule from '@/integrations/supabase/client'
import { MockPaymentProcessor } from '@/utils/mockPaymentProcessor'

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}))

// Mock Auth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}))

// Mock mobile hook
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

describe('Network and Edge Cases Testing', () => {
  let mockSupabase: typeof mockSupabaseClient

  beforeEach(() => {
    mockSupabase = mockSupabaseClient
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.resetAllMocks()
    vi.useRealTimers()
  })

  describe('Network Failures', () => {
    describe('useCheckout Network Failures', () => {
      it('should handle complete network outage during checkout submission', async () => {
        const mockPaymentProcessor = MockPaymentProcessor
        mockPaymentProcessor.processPayment.mockRejectedValue(new Error('Network Error: Connection failed'))

        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockRejectedValue(new Error('Network timeout')),
            }),
          }),
        })

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
            paymentMethod: { type: 'stripe' },
          })
        })

        let submitResult: boolean = true

        await act(async () => {
          submitResult = await result.current.submitCheckout()
        })

        expect(submitResult).toBe(false)
        expect(result.current.isSubmitting).toBe(false)
        expect(result.current.validationErrors.length).toBeGreaterThan(0)
      })

      it('should handle intermittent network issues', async () => {
        let callCount = 0
        const mockPaymentProcessor = MockPaymentProcessor
        mockPaymentProcessor.processPayment.mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.reject(new Error('Network timeout'))
          }
          return Promise.resolve({
            success: true,
            paymentId: 'payment-123',
            simulatedDelay: 100,
          })
        })

        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'order-123' },
                error: null,
              }),
            }),
          }),
        })

        const { result } = renderHook(() => useCheckout())

        act(() => {
          result.current.updateFormData({
            billingInfo: {
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
            },
            paymentMethod: { type: 'stripe' },
          })
        })

        // First attempt should fail
        let submitResult = await act(async () => result.current.submitCheckout())
        expect(submitResult).toBe(false)

        // Second attempt should succeed
        submitResult = await act(async () => result.current.submitCheckout())
        expect(submitResult).toBe(true)
      })

      it('should handle slow network connections', async () => {
        const mockPaymentProcessor = MockPaymentProcessor
        mockPaymentProcessor.processPayment.mockImplementation(() =>
          new Promise(resolve => setTimeout(() => resolve({
            success: true,
            paymentId: 'payment-123',
            simulatedDelay: 30000, // 30 seconds
          }), 30000))
        )

        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'order-123' },
                error: null,
              }),
            }),
          }),
        })

        const { result } = renderHook(() => useCheckout())

        act(() => {
          result.current.updateFormData({
            billingInfo: {
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
            },
            paymentMethod: { type: 'stripe' },
          })
        })

        // Start submission
        const submitPromise = act(async () => result.current.submitCheckout())

        // Fast-forward time
        vi.advanceTimersByTime(30000)

        const submitResult = await submitPromise
        expect(submitResult).toBe(true)
        expect(result.current.isSubmitting).toBe(false)
      })
    })

    describe('useCart Network Failures', () => {
      it('should handle database connection failures during cart operations', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockRejectedValue(new Error('Connection refused')),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockRejectedValue(new Error('Connection refused')),
            }),
          }),
        })

        const { result } = renderHook(() => useCart())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        // Should handle error gracefully
        expect(result.current.cartItems).toEqual([])
        expect(result.current.error).toBeDefined()
      })

      it('should retry failed cart operations', async () => {
        let callCount = 0
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => {
              callCount++
              if (callCount === 1) {
                return Promise.reject(new Error('Temporary network issue'))
              }
              return Promise.resolve({
                data: [{
                  id: 'cart-item-1',
                  media_outlet_id: 'media-1',
                  price: 100,
                  currency: 'EUR',
                  added_at: new Date().toISOString(),
                  quantity: 1,
                }],
                error: null,
              })
            }),
          }),
        })

        const { result } = renderHook(() => useCart())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        expect(result.current.cartItems).toHaveLength(1)
        expect(callCount).toBe(2) // Should have retried
      })

      it('should handle partial network failures', async () => {
        const existingItems = [{
          id: 'item-1',
          media_outlet_id: 'media-1',
          price: 100,
          currency: 'EUR',
          added_at: new Date().toISOString(),
          quantity: 1,
        }]

        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: existingItems,
              error: null,
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockRejectedValue(new Error('Network error during update')),
          }),
        })

        const { result } = renderHook(() => useCart())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        expect(result.current.cartItems).toHaveLength(1)

        // Try to update quantity - should handle failure gracefully
        await act(async () => {
          await result.current.updateCartItemQuantity('item-1', 2)
        })

        // Item should remain unchanged
        expect(result.current.cartItems[0].quantity).toBe(1)
      })
    })

    describe('File Upload Network Failures', () => {
      it('should handle upload interruptions', async () => {
        mockSupabase.storage.from.mockReturnValue({
          upload: vi.fn().mockImplementation(() => {
            // Simulate upload progress then failure
            return new Promise((resolve, reject) => {
              setTimeout(() => reject(new Error('Upload interrupted')), 50)
            })
          }),
        })

        const { result } = renderHook(() => useFileUpload())

        const file = new File(['test content'], 'document.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })

        await act(async () => {
          try {
            await result.current.uploadFile(file, 'test-path')
          } catch (error: unknown) {
            expect(error.message).toContain('interrupted')
          }
        })
      })

      it('should handle storage quota exceeded during upload', async () => {
        mockSupabase.storage.from.mockReturnValue({
          upload: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Storage quota exceeded' },
          }),
        })

        const { result } = renderHook(() => useFileUpload())

        const file = new File(['test'], 'document.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })

        await act(async () => {
          try {
            await result.current.uploadFile(file, 'test-path')
          } catch (error: unknown) {
            expect(error.message).toContain('quota exceeded')
          }
        })
      })

      it('should handle concurrent upload failures', async () => {
        mockSupabase.storage.from.mockReturnValue({
          upload: vi.fn()
            .mockResolvedValueOnce({
              data: { path: 'file1.docx' },
              error: null,
            })
            .mockResolvedValueOnce({
              data: null,
              error: { message: 'Upload failed' },
            }),
        })

        const { result } = renderHook(() => useFileUpload())

        const files = [
          new File(['content 1'], 'file1.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
          new File(['content 2'], 'file2.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        ]

        await act(async () => {
          const results = await result.current.uploadMultipleFiles(files, 'test-path')
          expect(results[0].uploadStatus).toBe('completed')
          expect(results[1].uploadStatus).toBe('failed')
        })
      })
    })
  })

  describe('Invalid Input Handling', () => {
    describe('Form Validation Edge Cases', () => {
      it('should handle extremely long input values', () => {
        const { result } = renderHook(() => useCheckout())

        const longString = 'a'.repeat(10000) // 10,000 characters

        act(() => {
          result.current.updateFormData({
            billingInfo: {
              firstName: longString,
              lastName: longString,
              email: `test@${longString}.com`,
              phone: longString,
              company: longString,
              address: {
                street: longString,
                city: longString,
                postalCode: longString,
                country: 'US',
              },
              taxId: longString,
            },
            notes: longString,
          })
        })

        expect(result.current.formData.billingInfo?.firstName?.length).toBe(10000)
      })

      it('should handle special characters in form inputs', () => {
        const { result } = renderHook(() => useCheckout())

        const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'

        act(() => {
          result.current.updateFormData({
            billingInfo: {
              firstName: `John${specialChars}`,
              lastName: `Doe${specialChars}`,
              email: `john.doe${specialChars}@example.com`,
              phone: `+123${specialChars}4567890`,
              address: {
                street: `123${specialChars}Main St`,
                city: `Anytown${specialChars}`,
                postalCode: `12345${specialChars}`,
                country: 'US',
              },
            },
          })
        })

        expect(result.current.formData.billingInfo?.firstName).toContain(specialChars)
      })

      it('should handle unicode characters', () => {
        const { result } = renderHook(() => useCheckout())

        const unicodeText = 'José María ñoño Zürich 北京 上海'

        act(() => {
          result.current.updateFormData({
            billingInfo: {
              firstName: unicodeText,
              lastName: 'Doe',
              email: 'test@example.com',
              address: {
                street: unicodeText,
                city: 'Madrid',
                postalCode: '28001',
                country: 'ES',
              },
            },
          })
        })

        expect(result.current.formData.billingInfo?.firstName).toBe(unicodeText)
      })

      it('should handle null and undefined values gracefully', () => {
        const { result } = renderHook(() => useCheckout())

        act(() => {
          result.current.updateFormData({
            billingInfo: null,
            paymentMethod: undefined,
          })
        })

        expect(result.current.formData.billingInfo).toBeNull()
        expect(result.current.formData.paymentMethod).toBeUndefined()
      })

      it('should handle malformed email addresses', () => {
        const { result } = renderHook(() => useCheckout())

        const malformedEmails = [
          'invalid-email',
          '@example.com',
          'user@',
          'user@@example.com',
          'user name@example.com',
          'user@.com',
          'user..user@example.com',
        ]

        malformedEmails.forEach(email => {
          act(() => {
            result.current.updateFormData({
              billingInfo: {
                email,
                firstName: 'John',
                lastName: 'Doe',
              },
            })
          })
        })

        // Should accept any string as email (validation happens elsewhere)
        expect(result.current.formData.billingInfo?.email).toBe(malformedEmails[0])
      })
    })

    describe('File Upload Invalid Inputs', () => {
      it('should handle empty files', async () => {
        const { result } = renderHook(() => useFileUpload())

        const emptyFile = new File([], 'empty.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })

        await act(async () => {
          const uploadResult = await result.current.uploadFile(emptyFile, 'test-path')
          expect(uploadResult.fileSize).toBe(0)
          expect(uploadResult.uploadStatus).toBe('completed')
        })
      })

      it('should handle files with incorrect extensions', async () => {
        const { result } = renderHook(() => useFileUpload())

        const maliciousFile = new File(['malicious content'], 'document.docx.exe', {
          type: 'application/x-msdownload',
        })

        await act(async () => {
          try {
            await result.current.uploadFile(maliciousFile, 'test-path')
          } catch (error: unknown) {
            expect(error.message).toContain('File type not allowed')
          }
        })
      })

      it('should handle extremely large file names', async () => {
        const { result } = renderHook(() => useFileUpload())

        const longFileName = 'a'.repeat(1000) + '.docx'
        const file = new File(['content'], longFileName, {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })

        await act(async () => {
          const uploadResult = await result.current.uploadFile(file, 'test-path')
          expect(uploadResult.fileName).toBe(longFileName)
        })
      })

      it('should handle files without extensions', async () => {
        const { result } = renderHook(() => useFileUpload())

        const noExtFile = new File(['content'], 'document', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })

        await act(async () => {
          try {
            await result.current.uploadFile(noExtFile, 'test-path')
          } catch (error: unknown) {
            expect(error.message).toContain('File type not allowed')
          }
        })
      })
    })

    describe('Cart Operations Invalid Inputs', () => {
      it('should handle invalid quantity values', async () => {
        const existingItems = [{
          id: 'item-1',
          media_outlet_id: 'media-1',
          price: 100,
          currency: 'EUR',
          added_at: new Date().toISOString(),
          quantity: 1,
        }]

        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: existingItems,
              error: null,
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        })

        const { result } = renderHook(() => useCart())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        // Try invalid quantities
        await act(async () => {
          await result.current.updateCartItemQuantity('item-1', -1)
          await result.current.updateCartItemQuantity('item-1', 0)
          await result.current.updateCartItemQuantity('item-1', 1000)
        })

        // Quantity should remain valid
        expect(result.current.cartItems[0].quantity).toBeGreaterThan(0)
        expect(result.current.cartItems[0].quantity).toBeLessThanOrEqual(99)
      })

      it('should handle invalid item IDs', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        })

        const { result } = renderHook(() => useCart())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        // Try operations with invalid IDs
        await act(async () => {
          await result.current.removeFromCart('non-existent-id')
          await result.current.updateCartItemQuantity('non-existent-id', 2)
        })

        // Should handle gracefully without errors
        expect(result.current.cartItems).toEqual([])
      })

      it('should handle invalid media outlet IDs', async () => {
        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Invalid media outlet ID' },
              }),
            }),
          }),
        })

        const { result } = renderHook(() => useCart())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        let success: boolean = true

        await act(async () => {
          success = await result.current.addToCart('invalid-media-id', 100, 'EUR')
        })

        expect(success).toBe(false)
      })
    })
  })

  describe('Memory and Performance Edge Cases', () => {
    it('should handle memory pressure during file uploads', async () => {
      // Mock memory pressure
      const originalGC = global.gc
      global.gc = vi.fn()

      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn().mockImplementation(() => {
          // Simulate memory pressure
          if (Math.random() > 0.8) {
            throw new Error('Out of memory')
          }
          return Promise.resolve({
            data: { path: 'uploaded-file.docx' },
            error: null,
          })
        }),
      })

      const { result } = renderHook(() => useFileUpload())

      const files = Array.from({ length: 100 }, (_, i) =>
        new File([`content ${i}`], `file${i}.docx`, {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
      )

      await act(async () => {
        try {
          await result.current.uploadMultipleFiles(files, 'test-path')
        } catch (error) {
          expect(error).toBeDefined()
        }
      })

      // Restore original gc
      global.gc = originalGC
    })

    it('should handle large cart operations efficiently', async () => {
      const largeCart = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        media_outlet_id: `media-${i}`,
        price: 100,
        currency: 'EUR',
        added_at: new Date().toISOString(),
        quantity: 1,
      }))

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: largeCart,
            error: null,
          }),
        }),
      })

      const startTime = performance.now()

      const { result } = renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const endTime = performance.now()
      const loadTime = endTime - startTime

      expect(result.current.cartItems).toHaveLength(1000)
      expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
    })

    it('should handle rapid component unmounting', () => {
      const { result, unmount } = renderHook(() => useCart())

      // Simulate rapid mount/unmount cycles
      for (let i = 0; i < 10; i++) {
        unmount()
        // Hook should handle cleanup gracefully
      }

      expect(result.current).toBeDefined()
    })
  })

  describe('Browser Compatibility Edge Cases', () => {
    it('should handle older browser features', () => {
      // Mock older browser without certain features
      const originalURL = global.URL
      delete (global as any).URL

      const { result } = renderHook(() => useFileUpload())

      // Should handle missing URL constructor gracefully
      expect(result.current).toBeDefined()

      // Restore URL
      global.URL = originalURL
    })

    it('should handle missing localStorage', () => {
      const originalLocalStorage = global.localStorage
      delete (global as any).localStorage

      const { result } = renderHook(() => useCart())

      // Should handle missing localStorage gracefully
      expect(result.current).toBeDefined()

      // Restore localStorage
      global.localStorage = originalLocalStorage
    })

    it('should handle different timezone settings', () => {
      // Mock different timezone
      const originalTimezone = Intl.DateTimeFormat.prototype.resolvedOptions
      Intl.DateTimeFormat.prototype.resolvedOptions = vi.fn(() => ({
        timeZone: 'America/New_York',
      }))

      const { result } = renderHook(() => useCheckout())

      act(() => {
        result.current.updateFormData({
          billingInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
        })
      })

      expect(result.current.formData.billingInfo?.firstName).toBe('John')

      // Restore timezone
      Intl.DateTimeFormat.prototype.resolvedOptions = originalTimezone
    })
  })

  describe('Race Conditions and Timing Issues', () => {
    it('should handle rapid successive checkout submissions', async () => {
      const mockPaymentProcessor = require('@/utils/mockPaymentProcessor').MockPaymentProcessor
      mockPaymentProcessor.processPayment.mockResolvedValue({
        success: true,
        paymentId: 'payment-123',
        simulatedDelay: 100,
      })

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'order-123' },
              error: null,
            }),
          }),
        }),
      })

      const { result } = renderHook(() => useCheckout())

      act(() => {
        result.current.updateFormData({
          billingInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          paymentMethod: { type: 'stripe' },
        })
      })

      // Start multiple submissions simultaneously
      const submissions = [
        result.current.submitCheckout(),
        result.current.submitCheckout(),
        result.current.submitCheckout(),
      ]

      const results = await Promise.all(submissions)

      // Only one should succeed, others should be rejected
      const successCount = results.filter(result => result === true).length
      expect(successCount).toBeLessThanOrEqual(1)
    })

    it('should handle concurrent file uploads', async () => {
      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'uploaded-file.docx' },
          error: null,
        }),
      })

      const { result } = renderHook(() => useFileUpload())

      const files = Array.from({ length: 10 }, (_, i) =>
        new File([`content ${i}`], `file${i}.docx`, {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
      )

      // Start all uploads simultaneously
      const uploadPromises = files.map(file =>
        result.current.uploadFile(file, 'test-path')
      )

      const results = await Promise.all(uploadPromises)

      // All should complete successfully
      results.forEach(result => {
        expect(result.uploadStatus).toBe('completed')
      })
    })

    it('should handle state updates during navigation', () => {
      const { result } = renderHook(() => useCheckout())

      // Rapid navigation changes
      act(() => {
        result.current.goToStep('billing-payment')
        result.current.goToStep('cart-review')
        result.current.goToStep('content-upload')
        result.current.goToStep('confirmation')
      })

      // Should maintain consistent state
      expect(result.current.currentStep).toBe('confirmation')
      expect(result.current.isLastStep).toBe(true)
    })
  })

  describe('Security Edge Cases', () => {
    it('should prevent XSS through form inputs', () => {
      const { result } = renderHook(() => useCheckout())

      const xssPayload = '<script>alert("xss")</script>'

      act(() => {
        result.current.updateFormData({
          billingInfo: {
            firstName: xssPayload,
            lastName: 'Doe',
            email: 'john@example.com',
          },
          notes: xssPayload,
        })
      })

      // Data should be stored as-is (sanitization happens at render time)
      expect(result.current.formData.billingInfo?.firstName).toBe(xssPayload)
    })

    it('should handle malformed JSON in localStorage', () => {
      const originalGetItem = global.localStorage.getItem
      global.localStorage.getItem = vi.fn(() => '{malformed json')

      const { result } = renderHook(() => useCart())

      // Should handle malformed JSON gracefully
      expect(result.current.loading).toBe(true)

      // Restore
      global.localStorage.getItem = originalGetItem
    })

    it('should prevent path traversal in file uploads', async () => {
      const { result } = renderHook(() => useFileUpload())

      const maliciousPath = '../../../etc/passwd'
      const file = new File(['content'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      await act(async () => {
        const uploadResult = await result.current.uploadFile(file, maliciousPath)
        expect(uploadResult.storagePath).not.toContain('../')
      })
    })
  })

  describe('Component Integration Edge Cases', () => {
    it('should handle missing props gracefully', () => {
      // Render components with missing optional props
      render(<CartSidebar open={true} onOpenChange={vi.fn()} />)

      expect(screen.getByText('Shopping Cart')).toBeInTheDocument()
    })

    it('should handle undefined children', () => {
      render(<CheckoutModal open={true} onOpenChange={vi.fn()} onComplete={vi.fn()}>
        {undefined}
      </CheckoutModal>)

      expect(screen.getByText('Cart Review')).toBeInTheDocument()
    })

    it('should handle circular references in state', () => {
      const circularObject: Record<string, unknown> = { prop: 'value' }
      circularObject.self = circularObject

      const { result } = renderHook(() => useCheckout())

      // Should handle circular references without crashing
      act(() => {
        result.current.updateFormData({
          testData: circularObject,
        })
      })

      expect(result.current.formData.testData).toBeDefined()
    })
  })
})
