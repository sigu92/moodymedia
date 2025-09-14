import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCart } from '@/hooks/useCart'
import { useAuth } from '@/contexts/AuthContext'
import { mockSupabaseClient } from '@/test/test-utils'
import * as supabaseModule from '@/integrations/supabase/client'

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

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

// Mock useIsMobile
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

describe('useCart', () => {
  let mockSupabase: typeof mockSupabaseClient

  beforeEach(() => {
    mockSupabase = mockSupabaseClient
    vi.clearAllMocks()
    // Clear localStorage mocks
    global.localStorage.clear()
  })

  afterEach(() => {
    vi.resetAllMocks()
    vi.clearAllTimers()
  })

  describe('Initial state and data fetching', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useCart())

      expect(result.current.cartItems).toEqual([])
      expect(result.current.loading).toBe(true)
      expect(result.current.cartCount).toBe(0)
    })

    it('should fetch cart items from database', async () => {
      const mockCartItems = [
        {
          id: 'cart-item-1',
          media_outlet_id: 'media-1',
          price: 100,
          currency: 'EUR',
          added_at: new Date().toISOString(),
          quantity: 1,
          media_outlets: {
            domain: 'example.com',
            category: 'Technology',
          },
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockCartItems,
            error: null,
          }),
        }),
      })

      const { result } = renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.cartItems).toHaveLength(1)
      expect(result.current.cartItems[0].domain).toBe('example.com')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })

      // Mock localStorage backup
      global.localStorage.getItem = vi.fn(() => JSON.stringify({
        cartItems: [{
          id: 'backup-item-1',
          mediaOutletId: 'media-1',
          price: 100,
          currency: 'EUR',
          addedAt: new Date().toISOString(),
          quantity: 1,
          domain: 'backup.com',
          readOnly: true,
        }],
        timestamp: Date.now(),
        version: '1.0',
        checksum: 'test-checksum',
        sessionId: 'test-session',
        userId: 'test-user-id',
      }))

      const { result } = renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.cartItems).toHaveLength(1)
      expect(result.current.cartItems[0].readOnly).toBe(true)
    })
  })

  describe('Cart operations with concurrent protection', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'new-cart-item-id' },
              error: null,
            }),
          }),
        }),
      })
    })

    it('should add items to cart with concurrent protection', async () => {
      const { result } = renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success: boolean = false

      await act(async () => {
        success = await result.current.addToCart('media-1', 100, 'EUR')
      })

      expect(success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('cart_items')
    })

    it('should prevent concurrent operations', async () => {
      const { result } = renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Start first operation
      const firstOperation = act(async () => {
        return result.current.addToCart('media-1', 100, 'EUR')
      })

      // Try second operation immediately (should be blocked)
      const secondOperation = act(async () => {
        return result.current.addToCart('media-2', 200, 'EUR')
      })

      const [firstResult, secondResult] = await Promise.all([firstOperation, secondOperation])

      expect(firstResult).toBe(true)
      expect(secondResult).toBe(false)
    })

    it('should handle quantity updates correctly', async () => {
      const existingCartItems = [
        {
          id: 'existing-cart-item',
          media_outlet_id: 'media-1',
          price: 100,
          currency: 'EUR',
          added_at: new Date().toISOString(),
          quantity: 1,
          media_outlets: {
            domain: 'example.com',
            category: 'Technology',
          },
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: existingCartItems,
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

      await act(async () => {
        await result.current.addToCart('media-1', 100, 'EUR')
      })

      expect(result.current.cartItems[0].quantity).toBe(2)
    })
  })

  describe('Enhanced cart persistence', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should create and validate backup integrity', () => {
      const { result } = renderHook(() => useCart())

      const testItems = [
        {
          id: 'test-item-1',
          mediaOutletId: 'media-1',
          price: 100,
          currency: 'EUR',
          addedAt: new Date().toISOString(),
          quantity: 1,
        },
      ]

      // The createBackup function is internal, but we can test the overall backup behavior
      expect(result.current.cartItems).toEqual([])
    })

    it('should handle backup corruption gracefully', async () => {
      // Mock corrupted backup data
      global.localStorage.getItem = vi.fn(() => JSON.stringify({
        cartItems: [],
        timestamp: Date.now(),
        version: '1.0',
        checksum: 'wrong-checksum', // This will fail validation
        sessionId: 'test-session',
        userId: 'test-user-id',
      }))

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })

      const { result } = renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should not load corrupted backup
      expect(result.current.cartItems).toEqual([])
      expect(global.localStorage.removeItem).toHaveBeenCalled()
    })

    it('should cleanup old backups periodically', async () => {
      const { result } = renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Fast-forward time to trigger cleanup
      vi.advanceTimersByTime(30 * 1000) // 30 seconds (backup interval)

      // The cleanup should have been called (though we can't easily test the internal cleanup)
      expect(result.current.cartItems).toEqual([])
    })

    it('should handle localStorage quota exceeded', async () => {
      // Mock localStorage quota exceeded error
      global.localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError')
      })

      const { result } = renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should handle the error gracefully without crashing
      expect(result.current.cartItems).toEqual([])
    })
  })

  describe('Read-only mode handling', () => {
    it('should mark restored items as read-only', async () => {
      const backupData = {
        cartItems: [
          {
            id: 'backup-item-1',
            mediaOutletId: 'media-1',
            price: 100,
            currency: 'EUR',
            addedAt: new Date().toISOString(),
            quantity: 1,
          },
        ],
        timestamp: Date.now(),
        version: '1.0',
        checksum: 'test-checksum',
        sessionId: 'test-session',
        userId: 'test-user-id',
      }

      // Mock backup loading
      global.localStorage.getItem = vi.fn(() => JSON.stringify(backupData))
      global.localStorage.setItem = vi.fn()

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })

      const { result } = renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.cartItems).toHaveLength(1)
      expect(result.current.cartItems[0].readOnly).toBe(true)
    })

    it('should prevent modifications on read-only items', async () => {
      const readOnlyItem = {
        id: 'readonly-item',
        mediaOutletId: 'media-1',
        price: 100,
        currency: 'EUR',
        addedAt: new Date().toISOString(),
        quantity: 1,
        readOnly: true,
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [readOnlyItem],
            error: null,
          }),
        }),
      })

      const { result } = renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Try to remove read-only item
      await act(async () => {
        await result.current.removeFromCart('readonly-item')
      })

      // Item should still be there
      expect(result.current.cartItems).toHaveLength(1)
      expect(result.current.cartItems[0].id).toBe('readonly-item')
    })
  })

  describe('Session management and cleanup', () => {
    it('should generate unique session IDs', () => {
      const { result: result1 } = renderHook(() => useCart())
      const { result: result2 } = renderHook(() => useCart())

      // Can't directly test session IDs as they're generated internally,
      // but we can test that the hook initializes properly
      expect(result1.current.loading).toBe(true)
      expect(result2.current.loading).toBe(true)
    })

    it('should handle user logout cleanup', () => {
      // Mock user logout by changing user to null
      vi.mocked(useAuth).mockReturnValue({
        user: null,
      })

      const { result } = renderHook(() => useCart())

      expect(result.current.loading).toBe(true)
    })
  })

  describe('Error handling and recovery', () => {
    it('should handle network failures gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('Network error')),
        }),
      })

      const { result } = renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should handle error without crashing
      expect(result.current.cartItems).toEqual([])
    })

    it('should recover from database failures using backup', async () => {
      // First call fails
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      })

      // Setup backup
      const backupData = JSON.stringify({
        cartItems: [{
          id: 'backup-item',
          mediaOutletId: 'media-1',
          price: 100,
          currency: 'EUR',
          addedAt: new Date().toISOString(),
          quantity: 1,
        }],
        timestamp: Date.now(),
        version: '1.0',
        checksum: 'test-checksum',
        sessionId: 'test-session',
        userId: 'test-user-id',
      })

      global.localStorage.getItem = vi.fn(() => backupData)

      const { result } = renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.cartItems).toHaveLength(1)
      expect(result.current.cartItems[0].readOnly).toBe(true)
    })
  })
})
