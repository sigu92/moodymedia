# Stripe Webhook Setup Guide

## ✅ Current Setup

You have **2 webhook endpoints** configured in Stripe:

### 1. Snapshot Webhook (Full Data)
- **URL:** `https://fylrytiilgkjhqlyetde.supabase.co/functions/v1/stripe-webhook`
- **Secret:** `whsec_<REPLACE_ME>` (Obtain from Stripe Dashboard → Developers → Webhooks)
- **Payload:** Full event data included
- **Events:** 212 events (all Stripe events)

### 2. Thin Webhook (Minimal Data)
- **URL:** `https://fylrytiilgkjhqlyetde.supabase.co/functions/v1/stripe-webhook`
- **Secret:** `whsec_<REPLACE_ME>` (Obtain from Stripe Dashboard → Developers → Webhooks)
- **Payload:** Only IDs, timestamps
- **Events:** 2 events (`checkout.session.completed`, `payment_intent.succeeded`)

## �� Environment Variables

Update your `.env` file:

```bash
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...    # Your publishable key
STRIPE_SECRET_KEY=sk_test_...              # Your secret key

# Webhook Secrets (for both endpoints)
STRIPE_WEBHOOK_SECRET_SNAPSHOT=whsec_<REPLACE_ME>
STRIPE_WEBHOOK_SECRET_THIN=whsec_<REPLACE_ME>

# Supabase (get from Supabase dashboard)
VITE_SUPABASE_URL=https://fylrytiilgkjhqlyetde.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # Your anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ... # Service role key (for webhooks)
```

## 🔐 Security Warning

**⚠️ IMPORTANT: Never commit webhook secrets to version control!**

- **Always obtain webhook secrets directly from your Stripe Dashboard** → Developers → Webhooks
- **Immediately rotate any accidentally exposed secrets** in Stripe Dashboard
- **Use environment variables** to store secrets, never hardcode them
- **Regularly rotate webhook secrets** as part of your security maintenance
- **Monitor webhook activity** for any suspicious requests

If you accidentally expose a webhook secret, immediately:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on the affected endpoint
3. Click "Regenerate secret"
4. Update your environment variables with the new secret

## ��� Testing Webhooks

### 1. Deploy Functions
```bash
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
```

### 2. Test Payment Flow
1. **Login** to your app
2. **Add items** to cart
3. **Go to checkout** 
4. **Complete payment** with Stripe
5. **Check database** - order should be created automatically

### 3. Manual Webhook Test
```bash
# Send test webhook event
curl -X POST https://fylrytiilgkjhqlyetde.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=1234567890,v1=test_signature" \
  -d '{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_123",
        "customer": "cus_test_456",
        "amount_total": 2000,
        "currency": "eur",
        "metadata": {
          "user_id": "test-user-id"
        }
      }
    }
  }'
```

## ��� What Happens When Payment Succeeds

1. **User completes payment** on Stripe
2. **Stripe sends webhook** to your endpoint
3. **Webhook function processes event**
4. **Order created in database** with:
   - ✅ User ID from metadata
   - ✅ Billing information
   - ✅ Cart items
   - ✅ Payment status: "paid"
   - ✅ Stripe session/payment IDs

## ��� Monitoring

### Check Webhook Events in Stripe Dashboard
1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. View **Recent Events** and **Event Attempts**

### Check Orders in Database
```sql
SELECT * FROM orders WHERE status = 'paid' ORDER BY created_at DESC;
```

## ��� Troubleshooting

### Webhook Not Working?
1. **Check environment variables** are set correctly
2. **Verify webhook secrets** match Stripe dashboard
3. **Check function logs** in Supabase dashboard
4. **Test with Stripe CLI** for local development

### Authentication Issues?
1. **Check JWT token** is being sent correctly
2. **Verify Supabase keys** are valid
3. **Check user session** is active

## ��� Success!

Your webhook system is now **fully functional**:

- ✅ **Thin payloads** for efficiency  
- ✅ **Snapshot payloads** for compatibility
- ✅ **Automatic order creation**
- ✅ **Database updates** via webhooks
- ✅ **User authentication** integrated
- ✅ **Error handling** and logging

Test a payment and watch your orders appear automatically! ���
