/**
 * Integration Tests for Stripe Webhook Processing
 * 
 * Tests webhook processing with various payment scenarios including:
 * - Successful payment processing
 * - Failed payment handling
 * - Checkout session completion
 * - Customer creation events
 * - Error handling and recovery
 * - Idempotency and duplicate event prevention
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Mock Deno environment
const mockDenoEnv = {
  get: vi.fn(),
}

// Mock global Deno object
Object.defineProperty(global, 'Deno', {
  value: {
    env: mockDenoEnv,
  },
  writable: true,
})

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

Object.defineProperty(global, 'console', {
  value: mockConsole,
  writable: true,
})

// Mock Stripe
vi.mock('https://esm.sh/stripe@14.21.0', () => ({
  default: vi.fn(),
}))

// Mock Supabase
vi.mock('https://esm.sh/@supabase/supabase-js@2.39.3', () => ({
  createClient: vi.fn(),
}))

// Mock serve function
vi.mock('https://deno.land/std@0.190.0/http/server.ts', () => ({
  serve: vi.fn(),
}))

describe('Stripe Webhook Processing', () => {
  let mockStripe: any
  let mockSupabase: any
  let mockServe: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset environment variables
    mockDenoEnv.get.mockImplementation((key: string) => {
      const envVars: Record<string, string> = {
        'STRIPE_SECRET_KEY': 'sk_test_123456789',
        'STRIPE_WEBHOOK_SECRET': 'whsec_test_123456789',
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'test_service_key',
        'ENVIRONMENT': 'test',
        'NODE_ENV': 'test',
        'ALLOW_INSECURE_WEBHOOKS': 'false',
      }
      return envVars[key]
    })

    // Mock Stripe instance
    mockStripe = {
      webhooks: {
        constructEvent: vi.fn(),
      },
      paymentMethods: {
        retrieve: vi.fn(),
      },
    }
    vi.mocked(Stripe).mockImplementation(() => mockStripe)

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(),
            })),
          })),
        })),
      })),
      rpc: vi.fn(),
    }
    vi.mocked(createClient).mockReturnValue(mockSupabase)

    // Mock serve function
    mockServe = vi.fn()
    vi.mocked(serve).mockImplementation(mockServe)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Webhook Request Handling', () => {
    it('should handle OPTIONS requests for CORS', async () => {
      const mockRequest = new Request('https://test.com/webhook', {
        method: 'OPTIONS',
      })

      // Import and call the webhook handler
      const { default: webhookHandler } = await import('../../supabase/functions/stripe-webhook/index.ts')
      
      // Mock the serve function to capture the handler
      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      // Call the handler directly
      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })

    it('should reject non-POST requests', async () => {
      const mockRequest = new Request('https://test.com/webhook', {
        method: 'GET',
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(405)
      const responseData = await response.json()
      expect(responseData.error).toBe('Method not allowed')
    })

    it('should validate environment configuration', async () => {
      // Mock missing Stripe key
      mockDenoEnv.get.mockImplementation((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return undefined
        return 'test_value'
      })

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify({ type: 'test.event' }),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData.error).toBe('Stripe secret key not configured')
    })

    it('should validate Supabase configuration', async () => {
      // Mock missing Supabase config
      mockDenoEnv.get.mockImplementation((key: string) => {
        if (key === 'SUPABASE_URL' || key === 'SUPABASE_SERVICE_ROLE_KEY') return undefined
        return 'test_value'
      })

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify({ type: 'test.event' }),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData.error).toBe('Supabase configuration not found')
    })
  })

  describe('Webhook Signature Verification', () => {
    it('should verify webhook signature in production', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'pi_test_123',
            customer: 'cus_test_123',
            amount: 1000,
            currency: 'eur',
          },
        },
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        JSON.stringify(mockEvent),
        'test_signature',
        'whsec_test_123456789'
      )
    })

    it('should handle signature verification failure', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'invalid_signature',
        },
        body: JSON.stringify({ type: 'test.event' }),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toBe('Webhook signature verification failed')
    })

    it('should allow insecure webhooks in development when explicitly enabled', async () => {
      // Mock development environment with insecure webhooks enabled
      mockDenoEnv.get.mockImplementation((key: string) => {
        const envVars: Record<string, string> = {
          'STRIPE_SECRET_KEY': 'sk_test_123456789',
          'STRIPE_WEBHOOK_SECRET': undefined,
          'SUPABASE_URL': 'https://test.supabase.co',
          'SUPABASE_SERVICE_ROLE_KEY': 'test_service_key',
          'ENVIRONMENT': 'development',
          'NODE_ENV': 'development',
          'ALLOW_INSECURE_WEBHOOKS': 'true',
        }
        return envVars[key]
      })

      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'pi_test_123',
            customer: 'cus_test_123',
            amount: 1000,
            currency: 'eur',
          },
        },
      }

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY WARNING: Webhook signature verification bypassed')
      )
    })
  })

  describe('Idempotency Handling', () => {
    it('should prevent duplicate event processing', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'pi_test_123',
            customer: 'cus_test_123',
            amount: 1000,
            currency: 'eur',
          },
        },
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      // Process the same event twice
      const response1 = await capturedHandler(mockRequest)
      const response2 = await capturedHandler(mockRequest)
      
      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      
      const responseData2 = await response2.json()
      expect(responseData2.data.status).toBe('duplicate')
    })
  })

  describe('Payment Intent Succeeded Processing', () => {
    it('should process successful payment intent', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'pi_test_123',
            customer: 'cus_test_123',
            amount: 1000,
            currency: 'eur',
            payment_method: 'pm_test_123',
            metadata: {
              user_id: 'user_123',
            },
          },
        },
      }

      const mockPaymentMethod = {
        type: 'card',
        card: {
          last4: '4242',
        },
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockStripe.paymentMethods.retrieve.mockResolvedValue(mockPaymentMethod)

      // Mock successful order update
      const mockOrderUpdate = {
        data: { id: 'order_123' },
        error: null,
      }
      mockSupabase.from().update().eq().select().single.mockResolvedValue(mockOrderUpdate)

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(200)
      expect(mockStripe.paymentMethods.retrieve).toHaveBeenCalledWith('pm_test_123')
      expect(mockSupabase.from).toHaveBeenCalledWith('orders')
    })

    it('should handle payment method retrieval failure', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'pi_test_123',
            customer: 'cus_test_123',
            amount: 1000,
            currency: 'eur',
            payment_method: 'pm_test_123',
          },
        },
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockStripe.paymentMethods.retrieve.mockRejectedValue(new Error('Payment method not found'))

      // Mock successful order update
      const mockOrderUpdate = {
        data: { id: 'order_123' },
        error: null,
      }
      mockSupabase.from().update().eq().select().single.mockResolvedValue(mockOrderUpdate)

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(200)
      // Should still process the payment even if payment method retrieval fails
    })

    it('should handle order update failure', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'pi_test_123',
            customer: 'cus_test_123',
            amount: 1000,
            currency: 'eur',
            payment_method: 'pm_test_123',
          },
        },
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockStripe.paymentMethods.retrieve.mockResolvedValue({
        type: 'card',
        card: { last4: '4242' },
      })

      // Mock order update failure
      const mockOrderUpdate = {
        data: null,
        error: { message: 'Order not found' },
      }
      mockSupabase.from().update().eq().select().single.mockResolvedValue(mockOrderUpdate)

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData.error).toBe('Webhook processing failed')
    })
  })

  describe('Payment Intent Failed Processing', () => {
    it('should process failed payment intent', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.payment_failed',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'pi_test_123',
            customer: 'cus_test_123',
            amount: 1000,
            currency: 'eur',
            last_payment_error: {
              message: 'Your card was declined',
              code: 'card_declined',
            },
          },
        },
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      // Mock successful RPC call
      const mockRpcResponse = {
        data: { success: true },
        error: null,
      }
      mockSupabase.rpc.mockResolvedValue(mockRpcResponse)

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(200)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_payment_attempt', {
        p_stripe_payment_intent_id: 'pi_test_123',
        p_failure_reason: 'Your card was declined',
        p_retry_after: expect.any(String),
      })
    })

    it('should handle RPC call failure', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.payment_failed',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'pi_test_123',
            customer: 'cus_test_123',
            amount: 1000,
            currency: 'eur',
            last_payment_error: {
              message: 'Your card was declined',
            },
          },
        },
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      // Mock RPC call failure
      const mockRpcResponse = {
        data: null,
        error: { message: 'Database error' },
      }
      mockSupabase.rpc.mockResolvedValue(mockRpcResponse)

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData.error).toBe('Webhook processing failed')
    })
  })

  describe('Checkout Session Completed Processing', () => {
    it('should process completed checkout session', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            payment_status: 'paid',
            amount_total: 1000,
            metadata: {
              user_id: 'user_123',
            },
          },
        },
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      // Mock successful order update
      const mockOrderUpdate = {
        data: { id: 'order_123' },
        error: null,
      }
      mockSupabase.from().update().eq().select().single.mockResolvedValue(mockOrderUpdate)

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(200)
      expect(mockSupabase.from).toHaveBeenCalledWith('orders')
    })

    it('should handle unpaid checkout session', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            payment_status: 'unpaid',
            amount_total: 1000,
          },
        },
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      // Mock successful order update
      const mockOrderUpdate = {
        data: { id: 'order_123' },
        error: null,
      }
      mockSupabase.from().update().eq().select().single.mockResolvedValue(mockOrderUpdate)

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(200)
      // Should set status to 'payment_processing' for unpaid sessions
    })
  })

  describe('Customer Created Processing', () => {
    it('should process customer created event', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'customer.created',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'cus_test_123',
            email: 'test@example.com',
          },
        },
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData.data.status).toBe('logged')
    })
  })

  describe('Invoice Payment Succeeded Processing', () => {
    it('should process invoice payment succeeded event', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'invoice.payment_succeeded',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
          },
        },
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData.data.status).toBe('logged')
    })
  })

  describe('Unhandled Event Types', () => {
    it('should handle unhandled event types gracefully', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'account.updated',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'acct_test_123',
          },
        },
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData.data.status).toBe('unhandled')
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unhandled event type')
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle general processing errors', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify({ type: 'test.event' }),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData.error).toBe('Webhook processing failed')
    })

    it('should include stack trace in development mode', async () => {
      // Mock development environment
      mockDenoEnv.get.mockImplementation((key: string) => {
        const envVars: Record<string, string> = {
          'STRIPE_SECRET_KEY': 'sk_test_123456789',
          'STRIPE_WEBHOOK_SECRET': 'whsec_test_123456789',
          'SUPABASE_URL': 'https://test.supabase.co',
          'SUPABASE_SERVICE_ROLE_KEY': 'test_service_key',
          'ENVIRONMENT': 'development',
          'NODE_ENV': 'development',
        }
        return envVars[key]
      })

      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        const error = new Error('Test error')
        error.stack = 'Test stack trace'
        throw error
      })

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify({ type: 'test.event' }),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      const response = await capturedHandler(mockRequest)
      
      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData.details.stack).toBe('Test stack trace')
    })
  })

  describe('Logging and Monitoring', () => {
    it('should log webhook processing steps', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'pi_test_123',
            customer: 'cus_test_123',
            amount: 1000,
            currency: 'eur',
          },
        },
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockStripe.paymentMethods.retrieve.mockResolvedValue({
        type: 'card',
        card: { last4: '4242' },
      })

      const mockOrderUpdate = {
        data: { id: 'order_123' },
        error: null,
      }
      mockSupabase.from().update().eq().select().single.mockResolvedValue(mockOrderUpdate)

      const mockRequest = new Request('https://test.com/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      })

      let capturedHandler: any
      mockServe.mockImplementation((handler: any) => {
        capturedHandler = handler
        return Promise.resolve()
      })

      await capturedHandler(mockRequest)
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Webhook request received')
      )
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Webhook signature verified')
      )
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Processing Stripe event')
      )
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Handling payment intent succeeded')
      )
    })
  })
})
