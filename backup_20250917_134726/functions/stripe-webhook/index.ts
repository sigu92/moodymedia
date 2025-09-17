import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// CORS headers for development and production
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Enhanced logging for development and debugging
const logStep = (step: string, details?: any, level: 'info' | 'warn' | 'error' = 'info') => {
  const timestamp = new Date().toISOString();
  const logData = details ? JSON.stringify(details, null, 2) : '';
  
  console.log(`[${timestamp}] [${level.toUpperCase()}] Webhook: ${step}`);
  if (logData) {
    console.log(`[${timestamp}] Details: ${logData}`);
  }
};

// Error response helper
const errorResponse = (message: string, status: number = 400, details?: any) => {
  logStep(`Error: ${message}`, details, 'error');
  return new Response(
    JSON.stringify({ 
      error: message, 
      details: details || null,
      timestamp: new Date().toISOString()
    }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
};

// Success response helper
const successResponse = (message: string, data?: any) => {
  logStep(`Success: ${message}`, data);
  return new Response(
    JSON.stringify({ 
      success: true, 
      message, 
      data: data || null,
      timestamp: new Date().toISOString()
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
};

// Idempotency check using database
const checkEventIdempotency = async (supabase: any, eventId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('is_event_processed', { p_event_id: eventId });

    if (error) {
      logStep('Error checking event idempotency, skipping processing to prevent duplicates', { error: error.message }, 'error');
      return true; // On error, return true to skip processing and prevent potential duplicates
    }

    return data;
  } catch (err) {
    logStep('Exception in idempotency check, skipping processing to prevent duplicates', { error: err.message }, 'error');
    return true; // On exception, return true to skip processing and prevent potential duplicates
  }
};

// Record processed event in database
const recordProcessedEvent = async (
  supabase: any,
  stripeEventId: string,
  eventType: string,
  eventData: any,
  status: 'processed' | 'failed' | 'duplicate' = 'processed',
  errorMessage?: string
): Promise<void> => {
  try {
    await supabase.rpc('record_processed_event', {
      p_stripe_event_id: stripeEventId,
      p_event_type: eventType,
      p_event_data: eventData,
      p_status: status,
      p_error_message: errorMessage
    });

    logStep('Event recorded in database', { stripeEventId, status });
  } catch (err) {
    logStep('Error recording event', { error: err.message }, 'error');
    // Don't throw - we don't want to fail the webhook if recording fails
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  logStep('Webhook request received', { 
    method: req.method, 
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  try {
    // Get environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development" || 
                         Deno.env.get("NODE_ENV") === "development";

    // Validate environment configuration
    if (!stripeKey) {
      return errorResponse('Stripe secret key not configured', 500);
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse('Supabase configuration not found', 500);
    }

    // In development, webhook secret might not be configured for testing
    if (!webhookSecret && !isDevelopment) {
      return errorResponse('Webhook secret not configured', 500);
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2023-10-16"
    });

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    logStep('Processing webhook', { 
      bodyLength: body.length,
      hasSignature: !!signature,
      isDevelopment
    });

    let event: Stripe.Event;

    // Verify webhook signature (skip in development if no secret)
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep('Webhook signature verified', { eventType: event.type, eventId: event.id });
      } catch (error) {
        logStep('Webhook signature verification failed', { error: error.message }, 'error');
        return errorResponse('Webhook signature verification failed', 400, { error: error.message });
      }
    } else if (isDevelopment && !webhookSecret && Deno.env.get('ALLOW_INSECURE_WEBHOOKS') === 'true') {
      // In development without webhook secret, parse the body directly (only if explicitly allowed)
      try {
        event = JSON.parse(body);
        logStep('⚠️  INSECURE: Development mode parsing webhook body directly', { eventType: event.type, eventId: event.id }, 'warn');
        console.warn('🚨 SECURITY WARNING: Webhook signature verification bypassed. This should only be used in development!');
      } catch (error) {
        return errorResponse('Invalid JSON payload', 400, { error: error.message });
      }
    } else {
      logStep('Webhook signature verification required', { hasSecret: !!webhookSecret, isDev: isDevelopment }, 'error');
      return errorResponse('Missing webhook signature or insecure webhook parsing not allowed', 400);
    }

    // Check for idempotency - prevent duplicate processing
    const eventId = event.id;
    const isAlreadyProcessed = await checkEventIdempotency(supabase, eventId);

    if (isAlreadyProcessed) {
      logStep('Event already processed (idempotency check)', { eventId });
      await recordProcessedEvent(supabase, eventId, event.type, event, 'duplicate');
      return successResponse('Event already processed', { eventId, status: 'duplicate' });
    }

    logStep('Processing Stripe event', { 
      eventType: event.type, 
      eventId: event.id,
      created: new Date(event.created * 1000).toISOString()
    });

    // Handle different event types
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const checkoutResult = await handleCheckoutSessionCompleted(event, supabase, stripe);
          await recordProcessedEvent(supabase, eventId, event.type, event, 'processed');
          return checkoutResult;

        case 'payment_intent.succeeded':
          const paymentSuccessResult = await handlePaymentIntentSucceeded(event, supabase, stripe);
          await recordProcessedEvent(supabase, eventId, event.type, event, 'processed');
          return paymentSuccessResult;

        case 'payment_intent.payment_failed':
          const paymentFailedResult = await handlePaymentIntentFailed(event, supabase, stripe);
          await recordProcessedEvent(supabase, eventId, event.type, event, 'processed');
          return paymentFailedResult;

        case 'invoice.payment_succeeded':
          const invoiceResult = await handleInvoicePaymentSucceeded(event, supabase, stripe);
          await recordProcessedEvent(supabase, eventId, event.type, event, 'processed');
          return invoiceResult;

        case 'customer.created':
          const customerResult = await handleCustomerCreated(event, supabase, stripe);
          await recordProcessedEvent(supabase, eventId, event.type, event, 'processed');
          return customerResult;

        default:
          logStep('Unhandled event type', { eventType: event.type, eventId: event.id }, 'warn');
          await recordProcessedEvent(supabase, eventId, event.type, event, 'processed');
          return successResponse('Event received but not processed', {
            eventType: event.type,
            eventId: event.id,
            status: 'unhandled'
          });
      }
    } catch (processingError) {
      // Record failed processing
      await recordProcessedEvent(
        supabase,
        eventId,
        event.type,
        event,
        'failed',
        processingError.message
      );
      throw processingError; // Re-throw to maintain error handling flow
    }

  } catch (error) {
    logStep('Webhook processing error', { 
      error: error.message, 
      stack: error.stack 
    }, 'error');
    
    return errorResponse('Webhook processing failed', 500, { 
      error: error.message,
      stack: isDevelopment ? error.stack : undefined
    });
  }
});

// Handle checkout.session.completed events
async function handleCheckoutSessionCompleted(
  event: Stripe.Event, 
  supabase: any, 
  stripe: Stripe
) {
  const session = event.data.object as Stripe.Checkout.Session;
  
  logStep('Handling checkout session completed', { 
    sessionId: session.id,
    customerId: session.customer,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total
  });

  try {
    // Update order status to payment_processing or paid based on payment status
    const orderStatus = session.payment_status === 'paid' ? 'paid' : 'payment_processing';
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        status: orderStatus,
        stripe_customer_id: session.customer,
        payment_method_type: 'card', // Default assumption
        updated_at: new Date().toISOString(),
        // Add metadata
        metadata: {
          ...session.metadata,
          checkout_session_completed_at: new Date().toISOString(),
          stripe_session_id: session.id
        }
      })
      .eq('stripe_session_id', session.id)
      .select()
      .single();

    if (orderError) {
      logStep('Error updating order from checkout session', { 
        sessionId: session.id, 
        error: orderError 
      }, 'error');
      throw new Error(`Failed to update order: ${orderError.message}`);
    }

    logStep('Order updated from checkout session', { 
      orderId: order?.id,
      orderStatus,
      sessionId: session.id
    });

    return successResponse('Checkout session completed processed', {
      sessionId: session.id,
      orderId: order?.id,
      status: orderStatus
    });

  } catch (error) {
    logStep('Error processing checkout session completed', { 
      sessionId: session.id, 
      error: error.message 
    }, 'error');
    throw error;
  }
}

// Handle payment_intent.succeeded events
async function handlePaymentIntentSucceeded(
  event: Stripe.Event, 
  supabase: any, 
  stripe: Stripe
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  logStep('Handling payment intent succeeded', { 
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency
  });

  try {
    // Get payment method details
    let paymentMethodType = 'unknown';
    let paymentMethodLast4 = null;

    if (paymentIntent.payment_method) {
      const paymentMethod = await stripe.paymentMethods.retrieve(
        paymentIntent.payment_method as string
      );
      
      paymentMethodType = paymentMethod.type;
      if (paymentMethod.card) {
        paymentMethodLast4 = paymentMethod.card.last4;
      }
    }

    // Update order with payment details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: paymentIntent.customer,
        payment_method_type: paymentMethodType,
        payment_method_last4: paymentMethodLast4,
        updated_at: new Date().toISOString(),
        // Reset payment attempt tracking on success
        payment_attempt_count: 0,
        payment_failure_reason: null,
        payment_retry_after: null,
        // Add metadata
        metadata: {
          ...paymentIntent.metadata,
          payment_succeeded_at: new Date().toISOString(),
          payment_intent_id: paymentIntent.id
        }
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .select()
      .single();

    if (orderError) {
      logStep('Error updating order from payment intent', { 
        paymentIntentId: paymentIntent.id, 
        error: orderError 
      }, 'error');
      throw new Error(`Failed to update order: ${orderError.message}`);
    }

    logStep('Order updated from payment intent succeeded', { 
      orderId: order?.id,
      paymentIntentId: paymentIntent.id,
      paymentMethodType,
      paymentMethodLast4
    });

    return successResponse('Payment intent succeeded processed', {
      paymentIntentId: paymentIntent.id,
      orderId: order?.id,
      paymentMethodType,
      paymentMethodLast4
    });

  } catch (error) {
    logStep('Error processing payment intent succeeded', { 
      paymentIntentId: paymentIntent.id, 
      error: error.message 
    }, 'error');
    throw error;
  }
}

// Handle payment_intent.payment_failed events
async function handlePaymentIntentFailed(
  event: Stripe.Event, 
  supabase: any, 
  stripe: Stripe
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  logStep('Handling payment intent failed', { 
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    lastPaymentError: paymentIntent.last_payment_error
  });

  try {
    // Increment payment attempt count and set failure reason
    const failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
    const retryAfter = new Date(Date.now() + 30 * 60 * 1000); // Retry after 30 minutes

    const { data: order, error: orderError } = await supabase
      .rpc('increment_payment_attempt', {
        p_stripe_payment_intent_id: paymentIntent.id,
        p_failure_reason: failureReason,
        p_retry_after: retryAfter.toISOString()
      });

    if (orderError) {
      logStep('Error updating payment failure', { 
        paymentIntentId: paymentIntent.id, 
        error: orderError 
      }, 'error');
      throw new Error(`Failed to update payment failure: ${orderError.message}`);
    }

    logStep('Payment failure recorded', { 
      paymentIntentId: paymentIntent.id,
      failureReason,
      retryAfter: retryAfter.toISOString()
    });

    return successResponse('Payment intent failure processed', {
      paymentIntentId: paymentIntent.id,
      failureReason,
      retryAfter: retryAfter.toISOString()
    });

  } catch (error) {
    logStep('Error processing payment intent failed', { 
      paymentIntentId: paymentIntent.id, 
      error: error.message 
    }, 'error');
    throw error;
  }
}

// Handle invoice.payment_succeeded events (for future subscription support)
async function handleInvoicePaymentSucceeded(
  event: Stripe.Event, 
  supabase: any, 
  stripe: Stripe
) {
  const invoice = event.data.object as Stripe.Invoice;
  
  logStep('Handling invoice payment succeeded', { 
    invoiceId: invoice.id,
    customerId: invoice.customer,
    subscriptionId: invoice.subscription
  });

  // For now, just log the event - could be used for subscription billing later
  return successResponse('Invoice payment succeeded logged', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    status: 'logged'
  });
}

// Handle customer.created events
async function handleCustomerCreated(
  event: Stripe.Event, 
  supabase: any, 
  stripe: Stripe
) {
  const customer = event.data.object as Stripe.Customer;
  
  logStep('Handling customer created', { 
    customerId: customer.id,
    email: customer.email
  });

  // Log customer creation for analytics
  return successResponse('Customer created event logged', {
    customerId: customer.id,
    email: customer.email,
    status: 'logged'
  });
}
