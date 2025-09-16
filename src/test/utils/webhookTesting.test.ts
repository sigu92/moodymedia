/**
 * Unit Tests for Webhook Testing Utilities
 * 
 * Tests webhook testing utilities for development and testing scenarios.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMockWebhookEvent,
  createMockCheckoutSessionEvent,
  createMockPaymentIntentEvent,
  createMockCustomerEvent,
  createMockInvoiceEvent,
  generateWebhookSignature,
  validateWebhookEvent,
  simulateWebhookDelivery,
  createWebhookTestSuite,
  WebhookTestScenario,
} from '@/utils/webhookTesting'

// Mock crypto for signature generation
const mockCrypto = {
  createHmac: vi.fn(),
  timingSafeEqual: vi.fn(),
}

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
})

describe('Webhook Testing Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createMockWebhookEvent', () => {
    it('should create a basic webhook event', () => {
      const event = createMockWebhookEvent('payment_intent.succeeded', {
        id: 'pi_test_123',
        customer: 'cus_test_123',
        amount: 1000,
        currency: 'eur',
      })

      expect(event).toEqual({
        id: expect.stringMatching(/^evt_test_/),
        type: 'payment_intent.succeeded',
        created: expect.any(Number),
        data: {
          object: {
            id: 'pi_test_123',
            customer: 'cus_test_123',
            amount: 1000,
            currency: 'eur',
          },
        },
      })
    })

    it('should generate unique event IDs', () => {
      const event1 = createMockWebhookEvent('test.event', {})
      const event2 = createMockWebhookEvent('test.event', {})

      expect(event1.id).not.toBe(event2.id)
    })

    it('should use custom timestamp when provided', () => {
      const customTimestamp = 1234567890
      const event = createMockWebhookEvent('test.event', {}, customTimestamp)

      expect(event.created).toBe(customTimestamp)
    })
  })

  describe('createMockCheckoutSessionEvent', () => {
    it('should create checkout session completed event', () => {
      const event = createMockCheckoutSessionEvent('completed', {
        id: 'cs_test_123',
        customer: 'cus_test_123',
        payment_status: 'paid',
        amount_total: 1000,
      })

      expect(event.type).toBe('checkout.session.completed')
      expect(event.data.object).toEqual({
        id: 'cs_test_123',
        customer: 'cus_test_123',
        payment_status: 'paid',
        amount_total: 1000,
        metadata: {},
      })
    })

    it('should create checkout session expired event', () => {
      const event = createMockCheckoutSessionEvent('expired', {
        id: 'cs_test_123',
        customer: 'cus_test_123',
      })

      expect(event.type).toBe('checkout.session.expired')
      expect(event.data.object.id).toBe('cs_test_123')
    })

    it('should include metadata when provided', () => {
      const metadata = {
        user_id: 'user_123',
        order_id: 'order_123',
      }

      const event = createMockCheckoutSessionEvent('completed', {
        id: 'cs_test_123',
        customer: 'cus_test_123',
        payment_status: 'paid',
        metadata,
      })

      expect(event.data.object.metadata).toEqual(metadata)
    })
  })

  describe('createMockPaymentIntentEvent', () => {
    it('should create payment intent succeeded event', () => {
      const event = createMockPaymentIntentEvent('succeeded', {
        id: 'pi_test_123',
        customer: 'cus_test_123',
        amount: 1000,
        currency: 'eur',
        payment_method: 'pm_test_123',
      })

      expect(event.type).toBe('payment_intent.succeeded')
      expect(event.data.object).toEqual({
        id: 'pi_test_123',
        customer: 'cus_test_123',
        amount: 1000,
        currency: 'eur',
        payment_method: 'pm_test_123',
        metadata: {},
      })
    })

    it('should create payment intent failed event', () => {
      const event = createMockPaymentIntentEvent('payment_failed', {
        id: 'pi_test_123',
        customer: 'cus_test_123',
        amount: 1000,
        currency: 'eur',
        last_payment_error: {
          message: 'Your card was declined',
          code: 'card_declined',
        },
      })

      expect(event.type).toBe('payment_intent.payment_failed')
      expect(event.data.object.last_payment_error).toEqual({
        message: 'Your card was declined',
        code: 'card_declined',
      })
    })

    it('should create payment intent requires action event', () => {
      const event = createMockPaymentIntentEvent('requires_action', {
        id: 'pi_test_123',
        customer: 'cus_test_123',
        amount: 1000,
        currency: 'eur',
        next_action: {
          type: 'use_stripe_sdk',
        },
      })

      expect(event.type).toBe('payment_intent.requires_action')
      expect(event.data.object.next_action).toEqual({
        type: 'use_stripe_sdk',
      })
    })
  })

  describe('createMockCustomerEvent', () => {
    it('should create customer created event', () => {
      const event = createMockCustomerEvent('created', {
        id: 'cus_test_123',
        email: 'test@example.com',
        name: 'Test Customer',
      })

      expect(event.type).toBe('customer.created')
      expect(event.data.object).toEqual({
        id: 'cus_test_123',
        email: 'test@example.com',
        name: 'Test Customer',
        metadata: {},
      })
    })

    it('should create customer updated event', () => {
      const event = createMockCustomerEvent('updated', {
        id: 'cus_test_123',
        email: 'updated@example.com',
        name: 'Updated Customer',
      })

      expect(event.type).toBe('customer.updated')
      expect(event.data.object.email).toBe('updated@example.com')
    })

    it('should create customer deleted event', () => {
      const event = createMockCustomerEvent('deleted', {
        id: 'cus_test_123',
      })

      expect(event.type).toBe('customer.deleted')
      expect(event.data.object.id).toBe('cus_test_123')
    })
  })

  describe('createMockInvoiceEvent', () => {
    it('should create invoice payment succeeded event', () => {
      const event = createMockInvoiceEvent('payment_succeeded', {
        id: 'in_test_123',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        amount_paid: 1000,
        currency: 'eur',
      })

      expect(event.type).toBe('invoice.payment_succeeded')
      expect(event.data.object).toEqual({
        id: 'in_test_123',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        amount_paid: 1000,
        currency: 'eur',
        metadata: {},
      })
    })

    it('should create invoice payment failed event', () => {
      const event = createMockInvoiceEvent('payment_failed', {
        id: 'in_test_123',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        amount_due: 1000,
        currency: 'eur',
      })

      expect(event.type).toBe('invoice.payment_failed')
      expect(event.data.object.amount_due).toBe(1000)
    })
  })

  describe('generateWebhookSignature', () => {
    it('should generate valid webhook signature', () => {
      const mockHmac = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('mock_signature'),
      }
      mockCrypto.createHmac.mockReturnValue(mockHmac)

      const payload = JSON.stringify({ type: 'test.event' })
      const secret = 'whsec_test_123'
      const timestamp = 1234567890

      const signature = generateWebhookSignature(payload, secret, timestamp)

      expect(mockCrypto.createHmac).toHaveBeenCalledWith('sha256', secret)
      expect(mockHmac.update).toHaveBeenCalledWith(`${timestamp}.${payload}`)
      expect(mockHmac.digest).toHaveBeenCalledWith('hex')
      expect(signature).toBe('t=1234567890,v1=mock_signature')
    })

    it('should use current timestamp when not provided', () => {
      const mockHmac = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('mock_signature'),
      }
      mockCrypto.createHmac.mockReturnValue(mockHmac)

      const payload = JSON.stringify({ type: 'test.event' })
      const secret = 'whsec_test_123'

      generateWebhookSignature(payload, secret)

      expect(mockHmac.update).toHaveBeenCalledWith(
        expect.stringMatching(/^\d+\./)
      )
    })
  })

  describe('validateWebhookEvent', () => {
    it('should validate webhook event structure', () => {
      const validEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        created: 1234567890,
        data: {
          object: {
            id: 'pi_test_123',
            customer: 'cus_test_123',
          },
        },
      }

      const result = validateWebhookEvent(validEvent)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing required fields', () => {
      const invalidEvent = {
        type: 'payment_intent.succeeded',
        // Missing id, created, data
      }

      const result = validateWebhookEvent(invalidEvent)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing required field: id')
      expect(result.errors).toContain('Missing required field: created')
      expect(result.errors).toContain('Missing required field: data')
    })

    it('should detect invalid event type', () => {
      const invalidEvent = {
        id: 'evt_test_123',
        type: 'invalid.event.type',
        created: 1234567890,
        data: {
          object: {},
        },
      }

      const result = validateWebhookEvent(invalidEvent)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid event type: invalid.event.type')
    })

    it('should detect invalid timestamp', () => {
      const invalidEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        created: 'invalid_timestamp',
        data: {
          object: {},
        },
      }

      const result = validateWebhookEvent(invalidEvent)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid timestamp: must be a number')
    })
  })

  describe('simulateWebhookDelivery', () => {
    it('should simulate successful webhook delivery', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      })
      global.fetch = mockFetch

      const event = createMockWebhookEvent('payment_intent.succeeded', {
        id: 'pi_test_123',
      })
      const webhookUrl = 'https://test.com/webhook'
      const secret = 'whsec_test_123'

      const result = await simulateWebhookDelivery(event, webhookUrl, secret)

      expect(result.success).toBe(true)
      expect(result.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledWith(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': expect.stringMatching(/^t=\d+,v1=/),
        },
        body: JSON.stringify(event),
      })
    })

    it('should handle webhook delivery failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })
      global.fetch = mockFetch

      const event = createMockWebhookEvent('payment_intent.succeeded', {
        id: 'pi_test_123',
      })
      const webhookUrl = 'https://test.com/webhook'
      const secret = 'whsec_test_123'

      const result = await simulateWebhookDelivery(event, webhookUrl, secret)

      expect(result.success).toBe(false)
      expect(result.status).toBe(500)
      expect(result.error).toBe('Internal server error')
    })

    it('should handle network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
      global.fetch = mockFetch

      const event = createMockWebhookEvent('payment_intent.succeeded', {
        id: 'pi_test_123',
      })
      const webhookUrl = 'https://test.com/webhook'
      const secret = 'whsec_test_123'

      const result = await simulateWebhookDelivery(event, webhookUrl, secret)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('createWebhookTestSuite', () => {
    it('should create a comprehensive test suite', () => {
      const testSuite = createWebhookTestSuite({
        webhookUrl: 'https://test.com/webhook',
        webhookSecret: 'whsec_test_123',
        testScenarios: [
          {
            name: 'Successful Payment',
            eventType: 'payment_intent.succeeded',
            eventData: {
              id: 'pi_test_123',
              customer: 'cus_test_123',
              amount: 1000,
              currency: 'eur',
            },
            expectedStatus: 200,
          },
          {
            name: 'Failed Payment',
            eventType: 'payment_intent.payment_failed',
            eventData: {
              id: 'pi_test_123',
              customer: 'cus_test_123',
              amount: 1000,
              currency: 'eur',
              last_payment_error: {
                message: 'Your card was declined',
                code: 'card_declined',
              },
            },
            expectedStatus: 200,
          },
        ],
      })

      expect(testSuite.webhookUrl).toBe('https://test.com/webhook')
      expect(testSuite.webhookSecret).toBe('whsec_test_123')
      expect(testSuite.testScenarios).toHaveLength(2)
      expect(testSuite.testScenarios[0].name).toBe('Successful Payment')
      expect(testSuite.testScenarios[1].name).toBe('Failed Payment')
    })

    it('should provide test execution methods', () => {
      const testSuite = createWebhookTestSuite({
        webhookUrl: 'https://test.com/webhook',
        webhookSecret: 'whsec_test_123',
        testScenarios: [],
      })

      expect(typeof testSuite.runAllTests).toBe('function')
      expect(typeof testSuite.runTest).toBe('function')
      expect(typeof testSuite.runScenario).toBe('function')
    })
  })

  describe('WebhookTestScenario', () => {
    it('should create a test scenario with all required fields', () => {
      const scenario: WebhookTestScenario = {
        name: 'Test Scenario',
        eventType: 'payment_intent.succeeded',
        eventData: {
          id: 'pi_test_123',
          customer: 'cus_test_123',
        },
        expectedStatus: 200,
        expectedResponse: {
          success: true,
        },
        timeout: 5000,
        retries: 3,
      }

      expect(scenario.name).toBe('Test Scenario')
      expect(scenario.eventType).toBe('payment_intent.succeeded')
      expect(scenario.expectedStatus).toBe(200)
      expect(scenario.timeout).toBe(5000)
      expect(scenario.retries).toBe(3)
    })

    it('should provide default values for optional fields', () => {
      const scenario: WebhookTestScenario = {
        name: 'Minimal Scenario',
        eventType: 'payment_intent.succeeded',
        eventData: {
          id: 'pi_test_123',
        },
        expectedStatus: 200,
      }

      expect(scenario.timeout).toBe(10000) // Default timeout
      expect(scenario.retries).toBe(1) // Default retries
      expect(scenario.expectedResponse).toBeUndefined()
    })
  })

  describe('Integration with Real Webhook Testing', () => {
    it('should create realistic test events', () => {
      const paymentEvent = createMockPaymentIntentEvent('succeeded', {
        id: 'pi_test_123',
        customer: 'cus_test_123',
        amount: 1000,
        currency: 'eur',
        payment_method: 'pm_test_123',
        metadata: {
          user_id: 'user_123',
          order_id: 'order_123',
        },
      })

      expect(paymentEvent.data.object.amount).toBe(1000)
      expect(paymentEvent.data.object.currency).toBe('eur')
      expect(paymentEvent.data.object.metadata.user_id).toBe('user_123')
    })

    it('should generate consistent signatures for the same payload', () => {
      const mockHmac = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('consistent_signature'),
      }
      mockCrypto.createHmac.mockReturnValue(mockHmac)

      const payload = JSON.stringify({ type: 'test.event' })
      const secret = 'whsec_test_123'
      const timestamp = 1234567890

      const signature1 = generateWebhookSignature(payload, secret, timestamp)
      const signature2 = generateWebhookSignature(payload, secret, timestamp)

      expect(signature1).toBe(signature2)
    })
  })
})
