import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { TooltipProvider } from '@/components/ui/tooltip'

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
  },
}

// Mock auth context
export const mockAuthContext = {
  user: mockUser,
  userRoles: ['buyer'],
  currentRole: 'buyer',
  signOut: vi.fn(),
  isLoading: false,
  isAuthenticated: true,
}

// Create a custom render function that includes all providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Test data factories
export const createMockCartItem = (overrides = {}) => ({
  id: 'test-cart-item-id',
  mediaOutletId: 'test-media-outlet-id',
  price: 100,
  currency: 'EUR',
  addedAt: new Date().toISOString(),
  quantity: 1,
  domain: 'example.com',
  category: 'Technology',
  nicheId: 'tech',
  basePrice: 100,
  priceMultiplier: 1.0,
  finalPrice: 100,
  nicheName: 'Technology',
  ...overrides,
})

export const createMockMediaOutlet = (overrides = {}) => ({
  id: 'test-media-outlet-id',
  domain: 'example.com',
  category: 'Technology',
  price: 100,
  currency: 'EUR',
  is_active: true,
  created_at: new Date().toISOString(),
  metrics: {
    ahrefsDR: 50,
    organicTraffic: 5000,
    spamScore: 5,
    referringDomains: 100,
  },
  ...overrides,
})

// Mock Supabase client
export const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(),
    })),
  })),
  functions: {
    invoke: vi.fn(),
  },
}

// Helper to mock a successful response
export const mockSupabaseResponse = (data: unknown) => ({
  data,
  error: null,
})

// Helper to mock an error response
export const mockSupabaseError = (error: unknown) => ({
  data: null,
  error,
})

// Helper to wait for all promises to resolve
export const waitForPromises = () => new Promise(resolve => setTimeout(resolve, 0))

// Custom matchers for accessibility testing
export const toBeAccessible = (element: HTMLElement) => {
  const results = {
    pass: true,
    message: () => 'Expected element to be accessible',
  }

  // Basic accessibility checks
  if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby') && !element.textContent?.trim()) {
    results.pass = false
    results.message = () => 'Element is missing accessible name'
  }

  return results
}

expect.extend({
  toBeAccessible,
})

// Type declarations for custom matchers
declare module 'vitest' {
  interface Assertion<T = unknown> {
    toBeAccessible(): T
  }
}
