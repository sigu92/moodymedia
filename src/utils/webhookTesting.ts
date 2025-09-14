/**
 * Webhook Testing Utilities for Development
 * 
 * This utility helps test Stripe webhooks in development mode when using localhost.
 * Since Stripe can't reach localhost directly, we provide tools to simulate webhook events.
 */

import { supabase } from '@/integrations/supabase/client';

// Mock Stripe webhook events for testing
export const mockStripeEvents = {
  checkoutSessionCompleted: (sessionId: string, customerId: string = 'cus_test_customer') => ({
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        customer: customerId,
        payment_status: 'paid',
        amount_total: 2000, // $20.00
        currency: 'eur',
        metadata: {
          order_id: `order_${Date.now()}`,
          user_id: 'test_user'
        }
      }
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: `req_test_${Date.now()}`,
      idempotency_key: null
    },
    type: 'checkout.session.completed'
  }),

  paymentIntentSucceeded: (paymentIntentId: string, customerId: string = 'cus_test_customer') => ({
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: paymentIntentId,
        object: 'payment_intent',
        customer: customerId,
        amount: 2000,
        currency: 'eur',
        payment_method: 'pm_test_card',
        status: 'succeeded',
        metadata: {
          order_id: `order_${Date.now()}`,
          user_id: 'test_user'
        }
      }
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: `req_test_${Date.now()}`,
      idempotency_key: null
    },
    type: 'payment_intent.succeeded'
  }),

  paymentIntentFailed: (paymentIntentId: string, customerId: string = 'cus_test_customer') => ({
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: paymentIntentId,
        object: 'payment_intent',
        customer: customerId,
        amount: 2000,
        currency: 'eur',
        status: 'requires_payment_method',
        last_payment_error: {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.',
          decline_code: 'generic_decline'
        },
        metadata: {
          order_id: `order_${Date.now()}`,
          user_id: 'test_user'
        }
      }
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: `req_test_${Date.now()}`,
      idempotency_key: null
    },
    type: 'payment_intent.payment_failed'
  }),

  customerCreated: (customerId: string, email: string) => ({
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: customerId,
        object: 'customer',
        email: email,
        created: Math.floor(Date.now() / 1000),
        metadata: {}
      }
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: `req_test_${Date.now()}`,
      idempotency_key: null
    },
    type: 'customer.created'
  })
};

/**
 * Sends a mock webhook event to the local webhook endpoint
 */
export const sendMockWebhook = async (event: any, options: {
  webhookUrl?: string;
  skipSignature?: boolean;
} = {}): Promise<{
  success: boolean;
  response?: any;
  error?: string;
}> => {
  const webhookUrl = options.webhookUrl || getWebhookUrl();
  
  try {
    console.log('🔗 Sending mock webhook:', {
      type: event.type,
      id: event.id,
      url: webhookUrl
    });

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In development, we skip signature verification
        'X-Development-Webhook': 'true',
        ...(options.skipSignature ? {} : {
          'stripe-signature': 'test_signature_development_mode'
        })
      },
      body: JSON.stringify(event)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Webhook failed:', responseData);
      return {
        success: false,
        error: responseData.error || 'Webhook request failed',
        response: responseData
      };
    }

    console.log('✅ Webhook successful:', responseData);
    return {
      success: true,
      response: responseData
    };

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Gets the webhook URL based on environment
 */
export const getWebhookUrl = (): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL not configured');
  }

  return `${supabaseUrl}/functions/v1/stripe-webhook`;
};

/**
 * Tests the webhook endpoint with various scenarios
 */
export const runWebhookTests = async (): Promise<{
  results: Array<{
    test: string;
    success: boolean;
    error?: string;
    response?: any;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}> => {
  console.log('🧪 Starting webhook tests...');
  
  const results = [];
  const sessionId = `cs_test_${Date.now()}`;
  const paymentIntentId = `pi_test_${Date.now()}`;
  const customerId = `cus_test_${Date.now()}`;

  // Test 1: Checkout Session Completed
  console.log('🔄 Test 1: Checkout Session Completed');
  const test1 = await sendMockWebhook(
    mockStripeEvents.checkoutSessionCompleted(sessionId, customerId)
  );
  results.push({
    test: 'Checkout Session Completed',
    success: test1.success,
    error: test1.error,
    response: test1.response
  });

  // Test 2: Payment Intent Succeeded
  console.log('🔄 Test 2: Payment Intent Succeeded');
  const test2 = await sendMockWebhook(
    mockStripeEvents.paymentIntentSucceeded(paymentIntentId, customerId)
  );
  results.push({
    test: 'Payment Intent Succeeded',
    success: test2.success,
    error: test2.error,
    response: test2.response
  });

  // Test 3: Payment Intent Failed
  console.log('🔄 Test 3: Payment Intent Failed');
  const test3 = await sendMockWebhook(
    mockStripeEvents.paymentIntentFailed(`${paymentIntentId}_failed`, customerId)
  );
  results.push({
    test: 'Payment Intent Failed',
    success: test3.success,
    error: test3.error,
    response: test3.response
  });

  // Test 4: Customer Created
  console.log('🔄 Test 4: Customer Created');
  const test4 = await sendMockWebhook(
    mockStripeEvents.customerCreated(customerId, 'test@example.com')
  );
  results.push({
    test: 'Customer Created',
    success: test4.success,
    error: test4.error,
    response: test4.response
  });

  // Test 5: Idempotency (send same event twice)
  console.log('🔄 Test 5: Idempotency Check');
  const duplicateEvent = mockStripeEvents.checkoutSessionCompleted(sessionId, customerId);
  const test5 = await sendMockWebhook(duplicateEvent);
  results.push({
    test: 'Idempotency Check',
    success: test5.success,
    error: test5.error,
    response: test5.response
  });

  // Test 6: Unknown Event Type
  console.log('🔄 Test 6: Unknown Event Type');
  const unknownEvent = {
    ...mockStripeEvents.customerCreated(customerId, 'test@example.com'),
    type: 'unknown.event.type'
  };
  const test6 = await sendMockWebhook(unknownEvent);
  results.push({
    test: 'Unknown Event Type',
    success: test6.success,
    error: test6.error,
    response: test6.response
  });

  const summary = {
    total: results.length,
    passed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  };

  console.log('📊 Webhook tests completed:', summary);
  console.log('📋 Detailed results:', results);

  return { results, summary };
};

/**
 * Creates a test order for webhook testing
 */
export const createTestOrder = async (sessionId: string): Promise<{
  success: boolean;
  orderId?: string;
  error?: string;
}> => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        stripe_session_id: sessionId,
        status: 'pending_payment',
        total_amount: 20.00,
        currency: 'EUR',
        buyer_id: 'test-user-id',
        metadata: {
          test_order: true,
          created_for_webhook_testing: true,
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create test order:', error);
      return {
        success: false,
        error: error.message
      };
    }

    console.log('✅ Test order created:', order);
    return {
      success: true,
      orderId: order.id
    };

  } catch (error) {
    console.error('❌ Error creating test order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Cleans up test orders created for webhook testing
 */
export const cleanupTestOrders = async (): Promise<{
  success: boolean;
  deletedCount?: number;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .delete()
      .eq('metadata->test_order', true)
      .select();

    if (error) {
      console.error('❌ Failed to cleanup test orders:', error);
      return {
        success: false,
        error: error.message
      };
    }

    console.log('✅ Test orders cleaned up:', data?.length || 0);
    return {
      success: true,
      deletedCount: data?.length || 0
    };

  } catch (error) {
    console.error('❌ Error cleaning up test orders:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Webhook testing interface for developer console
 */
export const webhookTester = {
  // Run all webhook tests
  runTests: runWebhookTests,
  
  // Send individual webhook events
  sendCheckoutCompleted: (sessionId: string, customerId?: string) => 
    sendMockWebhook(mockStripeEvents.checkoutSessionCompleted(sessionId, customerId)),
  
  sendPaymentSucceeded: (paymentIntentId: string, customerId?: string) => 
    sendMockWebhook(mockStripeEvents.paymentIntentSucceeded(paymentIntentId, customerId)),
  
  sendPaymentFailed: (paymentIntentId: string, customerId?: string) => 
    sendMockWebhook(mockStripeEvents.paymentIntentFailed(paymentIntentId, customerId)),
  
  sendCustomerCreated: (customerId: string, email: string) => 
    sendMockWebhook(mockStripeEvents.customerCreated(customerId, email)),
  
  // Utility functions
  createTestOrder,
  cleanupTestOrders,
  getWebhookUrl,
  
  // Mock event generators
  mockEvents: mockStripeEvents
};

// Make webhook tester available globally in development
if (import.meta.env.DEV) {
  (window as any).webhookTester = webhookTester;
  console.log('🔧 Webhook tester available globally as: window.webhookTester');
  console.log('📚 Usage examples:');
  console.log('  - webhookTester.runTests() - Run all tests');
  console.log('  - webhookTester.sendCheckoutCompleted("cs_test_123") - Send checkout completed');
  console.log('  - webhookTester.createTestOrder("cs_test_123") - Create test order');
  console.log('  - webhookTester.cleanupTestOrders() - Clean up test data');
}
