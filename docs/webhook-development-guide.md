# Stripe Webhook Development Guide

This guide explains how to develop and test Stripe webhooks in the MoodyMedia application, particularly when working with localhost in development mode.

## Overview

Stripe webhooks notify your application about events that happen in your Stripe account, such as successful payments, failed payments, or customer creation. Since Stripe can't reach `localhost` directly, we've implemented a comprehensive testing system for development.

## Webhook Endpoint

**URL**: `{SUPABASE_URL}/functions/v1/stripe-webhook`

The webhook endpoint is implemented as a Supabase Edge Function and handles the following events:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.payment_succeeded`
- `customer.created`

## Development Setup

### 1. Environment Variables

Make sure these environment variables are configured in your Supabase project:

```env
STRIPE_SECRET_KEY=sk_test_...              # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...           # Optional in development
SUPABASE_URL=https://...                  # Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Service role key for database access
ENVIRONMENT=development                    # Set to development for testing features
```

### 2. Database Setup

Ensure your `orders` table has the required Stripe fields:

```sql
-- Stripe-related fields (should already exist from migrations)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method_type TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_attempt_count INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_retry_after TIMESTAMP;
```

## Testing Webhooks in Development

### Option 1: Admin Interface (Recommended)

1. Navigate to the Admin section in your application
2. Go to "Webhook Testing" (if added to admin routes)
3. Use the testing interface to:
   - Run comprehensive webhook tests
   - Send individual webhook events
   - Create test orders
   - Clean up test data

### Option 2: Browser Console

The webhook testing utilities are available globally in development mode:

```javascript
// Run all webhook tests
await webhookTester.runTests();

// Send individual webhook events
await webhookTester.sendCheckoutCompleted('cs_test_123');
await webhookTester.sendPaymentSucceeded('pi_test_123');
await webhookTester.sendPaymentFailed('pi_test_456');
await webhookTester.sendCustomerCreated('cus_test_789', 'test@example.com');

// Create test data
await webhookTester.createTestOrder('cs_test_123');
await webhookTester.cleanupTestOrders();

// Get webhook URL
console.log(webhookTester.getWebhookUrl());
```

### Option 3: Direct HTTP Requests

You can send POST requests directly to the webhook endpoint:

```bash
curl -X POST \
  {SUPABASE_URL}/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -H "X-Development-Webhook: true" \
  -d '{
    "id": "evt_test_123",
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_session",
        "customer": "cus_test_customer",
        "payment_status": "paid",
        "amount_total": 2000,
        "currency": "eur"
      }
    }
  }'
```

## Webhook Event Handling

### Event Processing Flow

1. **Signature Verification**: In production, webhook signatures are verified for security
2. **Idempotency Check**: Events are tracked to prevent duplicate processing
3. **Event Processing**: Different handlers process different event types
4. **Database Updates**: Order status and payment details are updated
5. **Response**: Success/error response is sent back to Stripe

### Supported Events

#### `checkout.session.completed`
- Updates order status to `paid` or `payment_processing`
- Records customer ID and session metadata
- Triggered when a customer completes checkout

#### `payment_intent.succeeded`
- Updates order status to `paid`
- Records payment method details (type, last 4 digits)
- Resets payment attempt counters
- Triggered when payment is successfully processed

#### `payment_intent.payment_failed`
- Increments payment attempt counter
- Records failure reason and retry timestamp
- Triggered when payment processing fails

#### `customer.created`
- Logs customer creation for analytics
- Triggered when new Stripe customer is created

### Error Handling

The webhook endpoint includes comprehensive error handling:

- **Validation Errors**: Missing configuration, invalid payloads
- **Processing Errors**: Database update failures, Stripe API errors
- **Retry Logic**: Failed webhooks should be retried by Stripe
- **Logging**: All events and errors are logged for debugging

## Idempotency

The webhook system prevents duplicate processing through:

- **Event ID Tracking**: Each Stripe event ID is tracked
- **Memory-based Storage**: Processed events are stored in memory (Edge Function limitation)
- **Cleanup**: Old processed events are automatically cleaned up
- **Response**: Duplicate events return success without processing

## Security Features

### Development Mode
- Webhook signature verification is optional
- Enhanced logging for debugging
- Test event identification
- Direct JSON payload parsing

### Production Mode
- **Required**: Webhook signature verification
- **Required**: HTTPS endpoints
- Minimal logging to protect sensitive data
- Strict error responses

## Testing Scenarios

### Comprehensive Test Suite

The `webhookTester.runTests()` function covers:

1. **Checkout Session Completed**: Successful checkout flow
2. **Payment Intent Succeeded**: Successful payment processing
3. **Payment Intent Failed**: Payment failure handling
4. **Customer Created**: Customer creation logging
5. **Idempotency Check**: Duplicate event prevention
6. **Unknown Event Type**: Graceful handling of unsupported events

### Manual Testing Scenarios

Test these scenarios manually:

1. **Successful Payment Flow**:
   - Create test order with `createTestOrder()`
   - Send `checkout.session.completed` event
   - Send `payment_intent.succeeded` event
   - Verify order status updates

2. **Failed Payment Flow**:
   - Create test order
   - Send `payment_intent.payment_failed` event
   - Verify failure tracking and retry logic

3. **Duplicate Event Handling**:
   - Send same event twice
   - Verify second event is ignored

## Debugging

### Logs Location

- **Edge Function Logs**: Check Supabase Functions logs
- **Browser Console**: Development logging available
- **Database Changes**: Monitor `orders` table updates

### Common Issues

1. **Webhook Not Receiving Events**:
   - Check Supabase URL configuration
   - Verify Edge Function is deployed
   - Check CORS headers

2. **Signature Verification Failures**:
   - Verify `STRIPE_WEBHOOK_SECRET` configuration
   - Check if running in development mode
   - Ensure proper request headers

3. **Database Update Failures**:
   - Check Supabase service role key
   - Verify table schema and RLS policies
   - Check for missing order records

4. **Idempotency Issues**:
   - Check if events have unique IDs
   - Verify event ID format
   - Monitor processed events map

### Debugging Commands

```javascript
// Check webhook configuration
console.log('Webhook URL:', webhookTester.getWebhookUrl());

// Test connectivity
await fetch(webhookTester.getWebhookUrl(), { method: 'OPTIONS' });

// Create test data for debugging
await webhookTester.createTestOrder('cs_debug_test');

// Clean up after debugging
await webhookTester.cleanupTestOrders();
```

## Production Deployment

### Stripe Dashboard Configuration

1. Go to your Stripe Dashboard
2. Navigate to Developers > Webhooks
3. Add endpoint: `{YOUR_SUPABASE_URL}/functions/v1/stripe-webhook`
4. Select events to send:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.created`
5. Copy the webhook secret and add to environment variables

### Environment Variables for Production

```env
STRIPE_SECRET_KEY=sk_live_...              # Live Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...           # Webhook secret from Stripe Dashboard
ENVIRONMENT=production                     # Disable development features
```

### Security Considerations

- Always verify webhook signatures in production
- Use HTTPS endpoints only
- Limit webhook event types to only what's needed
- Monitor webhook delivery and failures
- Implement proper error logging without exposing sensitive data

## Monitoring and Maintenance

### Health Checks

- Monitor webhook delivery success rate in Stripe Dashboard
- Check Edge Function logs for errors
- Monitor database for order status inconsistencies

### Performance Optimization

- Keep webhook processing lightweight and fast
- Use database transactions for atomic updates
- Implement proper error recovery
- Monitor memory usage in Edge Functions

### Regular Maintenance

- Clean up old test orders periodically
- Review and update webhook event handling
- Monitor for new Stripe webhook events
- Update error handling based on observed failures
