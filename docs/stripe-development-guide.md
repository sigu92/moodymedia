# Stripe Development & Testing Guide

## Overview

This guide provides comprehensive instructions for developing and testing Stripe payment integration in the MoodyMedia marketplace. It covers mock payments, test mode configuration, test card numbers, and development tools.

## Table of Contents

- [Environment Setup](#environment-setup)
- [Development Modes](#development-modes)
- [Mock Payment System](#mock-payment-system)
- [Test Card Numbers](#test-card-numbers)
- [Development Tools](#development-tools)
- [Testing Scenarios](#testing-scenarios)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Environment Setup

### 1. Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
VITE_USE_STRIPE_PAYMENTS=true

# Development Settings
NODE_ENV=development
VITE_STRIPE_WEBHOOK_SECRET=whsec_dev_bypass
```

### 2. Configuration Options

The system supports three payment modes:

1. **Mock Payments** - Simulated payments for rapid development
2. **Stripe Test Mode** - Real Stripe API with test cards
3. **Stripe Live Mode** - Real payments (production only)

## Development Modes

### Mock Payment Mode

**When to use:** Rapid development, offline testing, CI/CD pipelines

**Features:**
- No internet connection required
- Configurable failure rates and delays
- Predefined scenarios for testing
- Complete payment flow simulation

**Activation:** 
- No Stripe keys configured, OR
- Explicitly enabled in mock configuration

```javascript
// Enable mock payments
developmentMockSystem.updateConfig({
  enabled: true,
  simulateDelays: true,
  failureRate: 20 // 20% failure rate
});
```

### Stripe Test Mode

**When to use:** Integration testing, webhook testing, realistic payment flows

**Features:**
- Real Stripe API integration
- Test card numbers work
- No actual charges
- Webhook events generated

**Activation:**
- Add test Stripe keys to `.env`
- Test keys start with `pk_test_` and `sk_test_`

## Mock Payment System

### Configuration

The mock system can be configured through the development tools or programmatically:

```javascript
// Access mock system in browser console
window.developmentMockSystem.updateConfig({
  enabled: true,
  simulateDelays: true,
  defaultDelay: 2000,           // 2 second delay
  failureRate: 10,              // 10% failure rate
  networkErrorRate: 2           // 2% network error rate
});
```

### Available Scenarios

| Scenario | Outcome | Description |
|----------|---------|-------------|
| `success_fast` | Success | Quick successful payment (500ms) |
| `success_slow` | Success | Realistic successful payment (3s) |
| `card_declined` | Failure | Card decline simulation |
| `insufficient_funds` | Failure | Insufficient funds error |
| `expired_card` | Failure | Expired card error |
| `network_error` | Error | Network connectivity issues |
| `timeout` | Error | Request timeout simulation |
| `authentication_required` | Failure | 3D Secure authentication |

### Custom Scenarios

Create custom scenarios for specific testing needs:

```javascript
developmentMockSystem.addScenario({
  id: 'custom_test',
  name: 'Custom Test Scenario',
  description: 'Custom scenario for specific testing',
  outcome: 'failure',
  errorCode: 'custom_error',
  errorMessage: 'Custom error message',
  delay: 1500
});
```

## Test Card Numbers

### Basic Test Cards

Use these cards for successful payment testing:

| Card Number | Brand | Description |
|-------------|-------|-------------|
| `4242424242424242` | Visa | Always succeeds |
| `4000056655665556` | Visa Debit | Always succeeds |
| `5555555555554444` | Mastercard | Always succeeds |
| `378282246310005` | American Express | Always succeeds |
| `6011111111111117` | Discover | Always succeeds |

### Decline Testing Cards

Test various decline scenarios:

| Card Number | Error Code | Description |
|-------------|------------|-------------|
| `4000000000000002` | `card_declined` | Generic decline |
| `4000000000009995` | `insufficient_funds` | Insufficient funds |
| `4000000000000069` | `expired_card` | Expired card |
| `4000000000000127` | `incorrect_cvc` | Incorrect CVC |
| `4000000000000119` | `processing_error` | Processing error |

### Authentication Testing

Test 3D Secure and authentication flows:

| Card Number | Description |
|-------------|-------------|
| `4000002500003155` | Requires authentication |
| `4000003800000446` | Authentication always required |

### International Testing

Test cards from different countries:

| Card Number | Country | Description |
|-------------|---------|-------------|
| `4000001240000000` | Canada | Canadian Visa |
| `4000058260000005` | United Kingdom | UK Visa |
| `4000002760003184` | Germany | German Visa |

### Using Test Cards

```javascript
// Get test card information
const cardInfo = testCards.getInfo('4242424242424242');
console.log(cardInfo.description); // "Visa - Always succeeds"

// Format card number for display
const formatted = testCards.formatNumber('4242424242424242');
console.log(formatted); // "4242 4242 4242 4242"

// Get valid test CVC and expiry
const cvc = testCards.getValidCVC('visa'); // "123"
const expiry = testCards.getValidExpiry(); // { month: 12, year: 2025 }
```

## Development Tools

### Test Mode Indicator

The floating test mode indicator provides:
- Current environment status
- Mock configuration controls
- Real-time statistics
- Quick configuration changes

**Access:** Automatically appears in development mode (bottom-right corner)

### Payment Simulator

Comprehensive testing interface for:
- Testing different card types
- Simulating various scenarios
- Batch testing multiple scenarios
- Viewing test statistics

**Access:** Navigate to `/dev/payment-simulator` or use admin panel

### Browser Console Tools

Access development utilities in the browser console:

```javascript
// Mock system
window.developmentMockSystem.getStats()
window.developmentMockSystem.createSession(data, 'card_declined')

// Test cards
window.testCards.getRandom('declined')
window.testCards.getByCategory('basic')

// Error handling
window.errorHandler.map(stripeError)
window.paymentRetry.getStatistics()

// Receipt system
window.receiptManager.generateHTML(receiptData)
window.dualReceiptSystem.deliverAll(orderId)
```

## Testing Scenarios

### 1. Basic Payment Flow

Test the complete payment flow with successful cards:

1. Add items to cart
2. Navigate to checkout
3. Enter billing information
4. Use test card `4242424242424242`
5. Complete payment
6. Verify order confirmation
7. Check receipt delivery

### 2. Error Handling

Test error scenarios and recovery:

1. Use decline card `4000000000000002`
2. Verify error message display
3. Test retry functionality
4. Check error analytics
5. Verify cart recovery system

### 3. International Payments

Test international card processing:

1. Use international test cards
2. Verify currency handling
3. Test different card brands
4. Check receipt formatting

### 4. Authentication Flow

Test 3D Secure authentication:

1. Use authentication card `4000002500003155`
2. Complete authentication flow
3. Verify payment completion
4. Check webhook delivery

### 5. Network Issues

Test network connectivity problems:

1. Enable network error simulation
2. Test retry mechanisms
3. Verify error recovery
4. Check offline behavior

## Troubleshooting

### Common Issues

#### 1. Mock Payments Not Working

**Symptoms:** Real Stripe API called instead of mock system

**Solutions:**
- Check `developmentMockSystem.shouldUseMock()` returns `true`
- Verify environment configuration
- Clear browser cache and localStorage
- Check console for configuration errors

#### 2. Test Cards Declined in Test Mode

**Symptoms:** Valid test cards being declined

**Solutions:**
- Verify using test API keys (not live keys)
- Check card number formatting
- Ensure CVC and expiry are valid
- Check Stripe dashboard for API errors

#### 3. Webhooks Not Received

**Symptoms:** Payment succeeds but order status not updated

**Solutions:**
- Check webhook endpoint configuration
- Verify webhook secret in environment
- Use webhook testing tools
- Check Supabase Edge Function logs

#### 4. Development Tools Not Visible

**Symptoms:** Test mode indicator or simulator not showing

**Solutions:**
- Ensure `NODE_ENV=development`
- Check browser console for errors
- Verify component imports
- Clear browser cache

### Debug Commands

Use these commands in the browser console for debugging:

```javascript
// Check current configuration
console.log('Environment:', window.developmentMockSystem.getStatus());
console.log('Mock Config:', window.developmentMockSystem.getCurrentConfig());
console.log('Stripe Config:', window.stripeConfig);

// Test connectivity
window.developmentMockSystem.createSession({}, 'success_fast')
  .then(result => console.log('Mock test:', result));

// Check error handling
window.errorHandler.map({ code: 'card_declined', message: 'Test error' });

// Verify webhooks
window.webhookTester.sendCheckoutCompleted('test_session_id');
```

## Best Practices

### Development Workflow

1. **Start with Mock Payments**
   - Rapid iteration and testing
   - No API rate limits
   - Offline development capability

2. **Progress to Test Mode**
   - Integration testing
   - Webhook verification
   - End-to-end flow testing

3. **Final Testing in Staging**
   - Test with real Stripe test environment
   - Verify all integrations
   - Performance testing

### Code Organization

1. **Environment-Specific Code**
   ```javascript
   if (import.meta.env.DEV) {
     // Development-only code
     window.debugTools = { ... };
   }
   ```

2. **Feature Flags**
   ```javascript
   const useStripePayments = stripeConfig.isConfigured() && 
                             !developmentMockSystem.shouldUseMock();
   ```

3. **Error Handling**
   ```javascript
   try {
     const result = await processPayment();
   } catch (error) {
     const errorDetails = errorHandler.map(error);
     // Handle based on error category
   }
   ```

### Testing Strategy

1. **Unit Tests**
   - Test utility functions
   - Mock API responses
   - Error handling logic

2. **Integration Tests**
   - Payment flow testing
   - Webhook processing
   - Database updates

3. **End-to-End Tests**
   - Complete user journeys
   - Cross-browser testing
   - Mobile responsiveness

### Performance Considerations

1. **Mock System Performance**
   - Configure realistic delays
   - Monitor memory usage
   - Clear test data regularly

2. **Test Mode Performance**
   - Rate limit awareness
   - Connection pooling
   - Error retry logic

3. **Development Tools**
   - Lazy load development components
   - Minimize production bundle impact
   - Optimize re-rendering

## Security Notes

### Development Security

1. **Test Keys Only**
   - Never commit live API keys
   - Use test keys in development
   - Rotate keys regularly

2. **Data Protection**
   - Don't log sensitive data
   - Sanitize error messages
   - Use secure random generation

3. **Access Control**
   - Development tools only in dev mode
   - Proper environment detection
   - Security headers in production

### Production Readiness

1. **Environment Variables**
   - Validate all required variables
   - Use proper secrets management
   - Monitor configuration drift

2. **Error Handling**
   - Sanitize error responses
   - Log security events
   - Rate limit API calls

3. **Monitoring**
   - Track payment success rates
   - Monitor for unusual patterns
   - Alert on configuration issues

---

## Quick Reference

### Environment Commands

```bash
# Start development server
npm run dev

# Run tests
npm run test

# Check linting
npm run lint

# Build for production
npm run build
```

### Key Development URLs

- Development server: `http://localhost:5173`
- Payment simulator: `/dev/payment-simulator`
- Admin panel: `/admin`
- Webhook testing: `/admin/webhooks`

### Support

For issues or questions:

1. Check this documentation
2. Review browser console errors
3. Check Stripe dashboard logs
4. Contact development team

---

*Last updated: 2024 - MoodyMedia Development Team*
