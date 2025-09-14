# Product Requirements Document: Stripe Payment Integration

## Introduction/Overview

This PRD outlines the implementation of real Stripe payment processing to replace the current mock payment system in the MoodyMedia marketplace checkout flow. The integration will provide secure, redirect-based Stripe Checkout with comprehensive payment method support, customer management, and webhook-driven order status tracking.

**Problem Statement:** The current checkout system uses a mock payment processor, preventing real transactions and order fulfillment.

**Goal:** Implement production-ready Stripe payment processing with seamless user experience, comprehensive error handling, and robust order management.

## Goals

1. **Replace Mock System:** Transition from MockPaymentProcessor to real Stripe Checkout integration
2. **Secure Payments:** Implement PCI-compliant payment processing with Stripe's hosted checkout
3. **Enhanced UX:** Provide detailed error messaging and failure recovery mechanisms
4. **Customer Convenience:** Enable customer accounts for saved payment methods and faster checkouts
5. **Order Reliability:** Implement webhook-based order status tracking for accurate fulfillment
6. **Development Flexibility:** Maintain toggle between mock and real payments for development workflows

## User Stories

### Primary Users (Buyers)
- **US-1:** As a buyer, I want to complete secure payments with my credit card so that I can purchase media placements
- **US-2:** As a returning buyer, I want my payment information saved so that future checkouts are faster
- **US-3:** As a buyer, I want to use various payment methods (cards, Apple Pay, Google Pay) so that I can pay with my preferred method
- **US-4:** As a buyer, I want clear error messages when payments fail so that I can resolve issues quickly
- **US-5:** As a buyer, I want to receive both Stripe receipts and custom order confirmations so that I have complete transaction records

### Secondary Users (Developers/Admins)
- **US-6:** As a developer, I want to test with mock payments in development so that I don't process real transactions during testing
- **US-7:** As an admin, I want webhook-driven order updates so that order status reflects payment completion accurately
- **US-8:** As a developer, I want detailed error logging so that I can troubleshoot payment issues effectively

## Functional Requirements

### FR-1: Stripe Checkout Integration
1.1. Replace Step 2 Stripe payment selection with redirect to Stripe Checkout
1.2. Create Stripe checkout sessions via `create-checkout` Supabase function
1.3. Support all major payment methods available through Stripe (cards, digital wallets, BNPL)
1.4. Maintain EUR currency with Stripe's automatic tax calculation

### FR-2: Customer Management
2.1. Create Stripe customer accounts for all users on first payment
2.2. Link Stripe customer ID to user profiles in Supabase
2.3. Enable saved payment methods for returning customers
2.4. Support guest checkout for users who prefer not to save payment data

### FR-3: Payment Flow Enhancement
3.1. Integrate real Stripe processing with existing 4-step checkout flow
3.2. Replace `MockPaymentProcessor.processPayment()` calls with Stripe session creation
3.3. Handle payment success/failure redirects from Stripe Checkout
3.4. Maintain existing cart clearing and order creation logic

### FR-4: Environment Configuration
4.1. Add Stripe publishable and secret keys to environment variables
4.2. Configure separate keys for development/staging/production environments
4.3. Implement fallback to mock payments when Stripe keys are not configured
4.4. Add environment toggle for enabling/disabling real payments

### FR-5: Error Handling & Recovery
5.1. Implement comprehensive error message mapping for Stripe error codes
5.2. Provide user-friendly error messages for common payment failures
5.3. Add retry mechanisms for transient network errors
5.4. Log detailed error information for debugging while protecting sensitive data
5.5. Handle payment timeouts and abandoned sessions gracefully

### FR-6: Receipt & Confirmation System
6.1. Configure Stripe to send automatic payment receipts to customers
6.2. Generate custom order confirmation emails with detailed purchase information
6.3. Create order confirmation page with both payment and order details
6.4. Store Stripe receipt URLs in order records for reference

### FR-7: Webhook Integration & Order Status
7.1. Implement Stripe webhook endpoint for payment completion events
7.2. Create detailed order status flow: `pending_payment` → `payment_processing` → `paid` → `action_needed` → `completed`
7.3. Update order status automatically based on webhook events
7.4. Handle webhook signature verification for security
7.5. Implement idempotency for webhook processing to prevent duplicate orders

### FR-8: Development Environment Support
8.1. Maintain mock payment option for development environments
8.2. Add environment variable to toggle between mock and real Stripe
8.3. Ensure test data isolation between mock and Stripe test modes
8.4. Provide clear development documentation for Stripe testing

### FR-9: Database Integration
9.1. Update order records with Stripe session IDs and payment intent IDs
9.2. Store customer payment method preferences
9.3. Add payment metadata tracking (payment method type, last 4 digits, etc.)
9.4. Maintain audit trail of payment attempts and outcomes

### FR-10: Security & Compliance
10.1. Use Stripe's hosted checkout to maintain PCI compliance
10.2. Implement secure webhook endpoint verification
10.3. Protect sensitive payment data in logs and error messages
10.4. Follow Stripe's security best practices for API key management

## Non-Goals (Out of Scope)

- **NG-1:** Custom payment form implementation (using hosted Stripe Checkout instead)
- **NG-2:** Multi-currency support (EUR only for initial release)
- **NG-3:** Subscription or recurring payment models
- **NG-4:** Invoice generation (separate from receipt system)
- **NG-5:** Refund processing UI (manual admin process initially)
- **NG-6:** Payment analytics dashboard (basic Stripe dashboard sufficient)
- **NG-7:** Alternative payment providers (Stripe-only integration)

## Design Considerations

### UI/UX Requirements
- **Minimal UI Changes:** Stripe selection card in Step 2 redirects to Stripe Checkout
- **Loading States:** Show processing states during session creation and redirect
- **Error Display:** Use existing toast notification system for error messages
- **Success Flow:** Redirect to existing Step 4 confirmation with enhanced payment details

### Component Updates
- **Step2BillingPayment.tsx:** Update Stripe card to trigger checkout session creation
- **CheckoutModal.tsx:** Add loading states during payment processing
- **Step4OrderConfirmation.tsx:** Display Stripe receipt links and payment details
- **useCheckout.ts:** Integrate Stripe session creation and payment verification

## Technical Considerations

### Dependencies
- **Existing:** Stripe Supabase functions already implemented (`create-checkout`, `verify-payment`)
- **Environment:** Add `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` environment variables
- **Webhooks:** Configure Stripe webhook endpoint for payment completion events

### Database Schema Updates
```sql
-- Add to existing orders table
ALTER TABLE orders ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE orders ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE orders ADD COLUMN payment_method_type TEXT;
ALTER TABLE orders ADD COLUMN payment_method_last4 TEXT;

-- Add new order status values
-- Update status enum to include: 'pending_payment', 'payment_processing', 'paid', 'action_needed', 'completed', 'cancelled'
```

### Integration Points
- **Cart System:** Existing `useCart` hook integration maintained
- **Order System:** Existing `useOrders` hook enhanced with payment details
- **Auth System:** Customer creation linked to existing user management
- **Validation:** Existing `CheckoutValidator` enhanced with payment validation

### Error Handling Strategy
```typescript
// Error mapping for user-friendly messages
const STRIPE_ERROR_MESSAGES = {
  'card_declined': 'Your card was declined. Please try another payment method.',
  'insufficient_funds': 'Insufficient funds. Please check your account balance.',
  'expired_card': 'Your card has expired. Please use a different card.',
  // ... comprehensive error mapping
};
```

## Success Metrics

### Primary Metrics
- **Payment Success Rate:** >95% of attempted payments complete successfully
- **Checkout Abandonment:** <10% abandonment rate during payment step
- **Error Resolution:** <2% of payments require customer support intervention
- **Performance:** <3 seconds average time from payment submission to confirmation

### Secondary Metrics
- **Customer Retention:** >60% of customers use saved payment methods on return visits
- **Payment Method Diversity:** Support for 10+ payment method types through Stripe
- **Order Accuracy:** 100% correlation between successful payments and order creation
- **Webhook Reliability:** >99.9% webhook processing success rate

### Business Impact
- **Revenue Enablement:** Enable real transactions and revenue generation
- **Customer Trust:** Professional payment experience increases buyer confidence
- **Operational Efficiency:** Automated order processing reduces manual intervention
- **Scalability:** Support for high-volume payment processing as marketplace grows

## Open Questions

### Configuration & Setup
- **Q1:** Should we implement Stripe Connect for multi-party payments in the future?
- **Q2:** What webhook events should trigger email notifications to admins?
- **Q3:** Should we implement automatic retry for failed webhook deliveries?

### User Experience
- **Q4:** Should customers be able to manage saved payment methods in their profile?
- **Q5:** How should we handle partial refunds for multi-item orders?
- **Q6:** Should we implement payment confirmation via SMS for high-value orders?

### Technical Implementation
- **Q7:** Should we implement Stripe's SCA (Strong Customer Authentication) for European customers?
- **Q8:** How should we handle orders that have successful payments but failed order creation?
- **Q9:** Should we implement payment intent confirmation for additional security?

### Development & Testing
- **Q10:** What test scenarios should be included in the payment integration testing suite?
- **Q11:** Should we implement payment simulation in staging environments?
- **Q12:** How should we handle environment variable management across different deployment stages?

---

**Next Steps:** Upon approval of this PRD, implementation should begin with environment setup and basic Stripe checkout integration, followed by error handling, webhook implementation, and finally customer management features.
