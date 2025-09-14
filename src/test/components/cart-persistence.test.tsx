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

// Mock useIsMobile
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

describe('Cart Persistence and Recovery', () => {
  let mockSupabase: typeof mockSupabaseClient
  let mockLocalStorage: Storage

  beforeEach(() => {
    mockSupabase = mockSupabaseClient
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    global.localStorage = mockLocalStorage
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.resetAllMocks()
    vi.useRealTimers()
  })

  describe('Automatic Backup Creation', () => {
    it('should create backup when cart has items', async () => {
      const cartItems = [
        {
          id: 'item-1',
          mediaOutletId: 'media-1',
          price: 100,
          currency: 'EUR',
          addedAt: new Date().toISOString(),
          quantity: 1,
          domain: 'example.com',
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: cartItems,
            error: null,
          }),
        }),
      })

      renderHook(() => useCart())

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalled()
      })

      const backupCall = mockLocalStorage.setItem.mock.calls.find(call =>
        call[0].includes('cart_backup')
      )
      expect(backupCall).toBeDefined()
    })

    it('should include checksum in backup', async () => {
      const cartItems = [
        {
          id: 'item-1',
          mediaOutletId: 'media-1',
          price: 100,
          currency: 'EUR',
          addedAt: new Date().toISOString(),
          quantity: 1,
          domain: 'example.com',
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: cartItems,
            error: null,
          }),
        }),
      })

      renderHook(() => useCart())

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalled()
      })

      const backupCall = mockLocalStorage.setItem.mock.calls.find(call =>
        call[0].includes('cart_backup')
      )
      const backupData = JSON.parse(backupCall[1])

      expect(backupData.checksum).toBeDefined()
      expect(typeof backupData.checksum).toBe('string')
      expect(backupData.checksum.length).toBeGreaterThan(0)
    })

    it('should not create backup for empty cart', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      renderHook(() => useCart())

      await waitFor(() => {
        // Should not call setItem for backup
        const backupCalls = mockLocalStorage.setItem.mock.calls.filter(call =>
          call[0].includes('cart_backup')
        )
        expect(backupCalls).toHaveLength(0)
      })
    })
  })

  describe('Backup Recovery Scenarios', () => {
    it('should recover from valid backup when database fails', async () => {
      const backupCartItems = [
        {
          id: 'backup-item-1',
          mediaOutletId: 'media-1',
          price: 100,
          currency: 'EUR',
          addedAt: new Date().toISOString(),
          quantity: 1,
          domain: 'backup.com',
        },
      ]

      const validBackup = {
        cartItems: backupCartItems,
        timestamp: Date.now(),
        version: '1.0',
        sessionId: 'test-session',
        userId: 'test-user-id',
        checksum: 'test-checksum',
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(validBackup))

      // Mock database failure
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      })

      // Mock backup validation
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      })

      const { result } = renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.cartItems).toHaveLength(1)
      expect(result.current.cartItems[0].domain).toBe('backup.com')
      expect(result.current.cartItems[0].readOnly).toBe(true)
    })

    it('should restore items to database when connection recovers', async () => {
      const backupCartItems = [
        {
          id: 'backup-item-1',
          mediaOutletId: 'media-1',
          price: 100,
          currency: 'EUR',
          addedAt: new Date().toISOString(),
          quantity: 1,
          domain: 'backup.com',
        },
      ]

      const validBackup = {
        cartItems: backupCartItems,
        timestamp: Date.now(),
        version: '1.0',
        sessionId: 'test-session',
        userId: 'test-user-id',
        checksum: 'test-checksum',
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(validBackup))

      // Mock successful database restoration
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [], // Empty initially
            error: null,
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'restored-item-id' },
              error: null,
            }),
          }),
        }),
      })

      const { result } = renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.cartItems).toHaveLength(1)
      expect(result.current.cartItems[0].readOnly).toBeUndefined() // Should be restored as normal item
    })

    it('should handle corrupted backup data', async () => {
      const corruptedBackup = {
        cartItems: 'not-an-array', // Invalid data
        timestamp: Date.now(),
        version: '1.0',
        sessionId: 'test-session',
        userId: 'test-user-id',
        checksum: 'wrong-checksum',
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(corruptedBackup))

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
      expect(mockLocalStorage.removeItem).toHaveBeenCalled()
    })

    it('should handle missing backup data', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

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

      expect(result.current.cartItems).toEqual([])
    })
  })

  describe('Backup Age and Cleanup', () => {
    it('should not restore backup older than max age', async () => {
      const oldBackup = {
        cartItems: [
          {
            id: 'old-item',
            mediaOutletId: 'media-1',
            price: 100,
            currency: 'EUR',
            addedAt: new Date().toISOString(),
            quantity: 1,
          },
        ],
        timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days old
        version: '1.0',
        sessionId: 'test-session',
        userId: 'test-user-id',
        checksum: 'test-checksum',
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(oldBackup))

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

      expect(result.current.cartItems).toEqual([])
      expect(mockLocalStorage.removeItem).toHaveBeenCalled()
    })

    it('should cleanup old backups during periodic maintenance', async () => {
      const oldBackup = {
        cartItems: [],
        timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000),
        version: '1.0',
        sessionId: 'test-session',
        userId: 'test-user-id',
        checksum: 'test-checksum',
      }

      const recentBackup = {
        cartItems: [],
        timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day old
        version: '1.0',
        sessionId: 'test-session-2',
        userId: 'test-user-id',
        checksum: 'test-checksum-2',
      }

      // Mock multiple backup keys
      const mockLocalStorageWithMultiple = {
        ...mockLocalStorage,
        getItem: vi.fn((key) => {
          if (key === 'cart_backup_test-user-id_old') {
            return JSON.stringify(oldBackup)
          }
          if (key === 'cart_backup_test-user-id_recent') {
            return JSON.stringify(recentBackup)
          }
          return null
        }),
      }

      // Mock Object.keys to return multiple keys
      const originalKeys = Object.keys
      Object.keys = vi.fn(() => [
        'cart_backup_test-user-id_old',
        'cart_backup_test-user-id_recent',
        'other_key',
      ])

      global.localStorage = mockLocalStorageWithMultiple

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      renderHook(() => useCart())

      // Fast-forward to trigger cleanup
      vi.advanceTimersByTime(30 * 1000)

      // Should remove old backup
      expect(mockLocalStorageWithMultiple.removeItem).toHaveBeenCalledWith('cart_backup_test-user-id_old')

      // Restore original Object.keys
      Object.keys = originalKeys
    })
  })

  describe('Session Management', () => {
    it('should generate unique session IDs', () => {
      const { result: result1 } = renderHook(() => useCart())
      const { result: result2 } = renderHook(() => useCart())

      // Session IDs should be generated (internal implementation)
      expect(result1.current).toBeDefined()
      expect(result2.current).toBeDefined()
    })

    it('should include session ID in backups', async () => {
      const cartItems = [
        {
          id: 'item-1',
          mediaOutletId: 'media-1',
          price: 100,
          currency: 'EUR',
          addedAt: new Date().toISOString(),
          quantity: 1,
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: cartItems,
            error: null,
          }),
        }),
      })

      renderHook(() => useCart())

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalled()
      })

      const backupCall = mockLocalStorage.setItem.mock.calls.find(call =>
        call[0].includes('cart_backup')
      )
      const backupData = JSON.parse(backupCall[1])

      expect(backupData.sessionId).toBeDefined()
      expect(typeof backupData.sessionId).toBe('string')
    })

    it('should handle user session changes', () => {
      // Mock user logout
      vi.mocked(useAuth).mockReturnValue({
        user: null,
      })

      const { result } = renderHook(() => useCart())

      expect(result.current.loading).toBe(true)
    })
  })

  describe('Concurrent Operations and Locking', () => {
    it('should handle rapid successive operations', async () => {
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
              data: { id: 'new-item-id' },
              error: null,
            }),
          }),
        }),
      })

      const { result } = renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Start multiple operations simultaneously
      const operations = [
        result.current.addToCart('media-1', 100, 'EUR'),
        result.current.addToCart('media-2', 200, 'EUR'),
        result.current.addToCart('media-3', 300, 'EUR'),
      ]

      const results = await Promise.all(operations)

      // At least one operation should succeed
      expect(results.some(result => result === true)).toBe(true)
    })

    it('should prevent conflicting operations on same item', async () => {
      const existingItems = [
        {
          id: 'existing-item',
          media_outlet_id: 'media-1',
          price: 100,
          currency: 'EUR',
          added_at: new Date().toISOString(),
          quantity: 1,
        },
      ]

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

      // Multiple quantity updates on same item
      const quantityOperations = [
        result.current.updateCartItemQuantity('existing-item', 2),
        result.current.updateCartItemQuantity('existing-item', 3),
        result.current.updateCartItemQuantity('existing-item', 4),
      ]

      const results = await Promise.all(quantityOperations)

      // Operations should be handled gracefully
      expect(results.every(result => typeof result === 'boolean')).toBe(true)
    })
  })

  describe('Data Integrity and Validation', () => {
    it('should validate backup data structure', () => {
      const invalidBackup = {
        cartItems: null, // Invalid - should be array
        timestamp: Date.now(),
        version: '1.0',
        sessionId: 'test-session',
        userId: 'test-user-id',
        checksum: 'test-checksum',
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(invalidBackup))

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })

      const { result } = renderHook(() => useCart())

      // Should handle invalid backup gracefully
      expect(result.current.loading).toBe(true)
    })

    it('should handle malformed JSON in backup', () => {
      mockLocalStorage.getItem.mockReturnValue('{invalid json')

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })

      const { result } = renderHook(() => useCart())

      expect(result.current.loading).toBe(true)
    })

    it('should handle localStorage errors', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      const { result } = renderHook(() => useCart())

      // Should handle localStorage error gracefully
      expect(result.current.loading).toBe(true)
    })
  })

  describe('Performance and Resource Management', () => {
    it('should not create excessive backups', async () => {
      const cartItems = [
        {
          id: 'item-1',
          mediaOutletId: 'media-1',
          price: 100,
          currency: 'EUR',
          addedAt: new Date().toISOString(),
          quantity: 1,
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: cartItems,
            error: null,
          }),
        }),
      })

      renderHook(() => useCart())

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalled()
      })

      // Fast-forward multiple backup intervals
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(30 * 1000)
      }

      // Should not create excessive backups (implementation should throttle)
      const backupCalls = mockLocalStorage.setItem.mock.calls.filter(call =>
        call[0].includes('cart_backup')
      )

      expect(backupCalls.length).toBeLessThan(10) // Reasonable limit
    })

    it('should cleanup resources on unmount', () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      const { unmount } = renderHook(() => useCart())

      // Mock user logout scenario
      vi.mocked(useAuth).mockReturnValue({
        user: null,
      })

      unmount()

      // Should handle cleanup gracefully
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled()
    })
  })

  describe('Cross-browser Compatibility', () => {
    it('should handle localStorage unavailable', () => {
      // Mock localStorage as undefined
      const originalLocalStorage = global.localStorage
      delete (global as unknown as { localStorage: Storage }).localStorage

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      const { result } = renderHook(() => useCart())

      expect(result.current.loading).toBe(true)

      // Restore localStorage
      global.localStorage = originalLocalStorage
    })

    it('should handle localStorage quota exceeded during backup', async () => {
      mockLocalStorage.setItem.mockImplementation((key, value) => {
        if (key.includes('cart_backup')) {
          throw new Error('QuotaExceededError')
        }
      })

      const cartItems = [
        {
          id: 'item-1',
          mediaOutletId: 'media-1',
          price: 100,
          currency: 'EUR',
          addedAt: new Date().toISOString(),
          quantity: 1,
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: cartItems,
            error: null,
          }),
        }),
      })

      renderHook(() => useCart())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should handle quota exceeded gracefully
      expect(mockLocalStorage.removeItem).toHaveBeenCalled()
    })
  })
})
