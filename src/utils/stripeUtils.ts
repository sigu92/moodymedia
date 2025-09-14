/**
 * Stripe Utilities
 * Helper functions for Stripe integration including session creation,
 * customer management, and payment processing
 */

import { supabase } from '@/integrations/supabase/client';
import { stripeConfig } from '@/config/stripe';
import { CheckoutFormData } from './checkoutUtils';

// Types for Stripe integration
export interface StripeSessionData {
  sessionId: string;
  url: string;
  customerId?: string;
  paymentIntentId?: string;
}

export interface StripeCustomerData {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface StripeLineItem {
  price_data: {
    currency: string;
    product_data: {
      name: string;
      description?: string;
      metadata?: Record<string, string>;
    };
    unit_amount: number;
  };
  quantity: number;
}

export interface CreateSessionParams {
  lineItems: StripeLineItem[];
  customerId?: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  mode?: 'payment' | 'subscription';
  billingAddressCollection?: 'auto' | 'required';
  shippingAddressCollection?: {
    allowed_countries: string[];
  };
}

/**
 * Creates a Stripe checkout session via Supabase edge function
 */
export const createStripeSession = async (params: CreateSessionParams): Promise<StripeSessionData> => {
  try {
    // Validate Stripe configuration
    if (!stripeConfig.isConfigured()) {
      throw new Error('Stripe is not properly configured');
    }

    // Call the Supabase edge function for checkout session creation
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        line_items: params.lineItems,
        customer_id: params.customerId,
        customer_email: params.customerEmail,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: params.metadata || {},
        mode: params.mode || 'payment',
        billing_address_collection: params.billingAddressCollection || 'required',
        shipping_address_collection: params.shippingAddressCollection,
        payment_method_types: ['card', 'apple_pay', 'google_pay'],
        allow_promotion_codes: true,
        automatic_tax: {
          enabled: true,
        },
        currency: stripeConfig.currency,
      },
    });

    if (error) {
      console.error('Stripe session creation error:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }

    if (!data || !data.sessionId || !data.url) {
      throw new Error('Invalid response from checkout session creation');
    }

    return {
      sessionId: data.sessionId,
      url: data.url,
      customerId: data.customerId,
      paymentIntentId: data.paymentIntentId,
    };
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    throw error;
  }
};

/**
 * Creates or retrieves a Stripe customer
 */
export const createOrGetStripeCustomer = async (
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<StripeCustomerData> => {
  try {
    // First check if customer exists in our database
    const { data: existingCustomer } = await supabase
      .from('orders')
      .select('stripe_customer_id')
      .eq('buyer_id', (await supabase.auth.getUser()).data.user?.id)
      .not('stripe_customer_id', 'is', null)
      .limit(1)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      return {
        id: existingCustomer.stripe_customer_id,
        email,
        name,
        metadata,
      };
    }

    // Create new customer via Supabase edge function
    const { data, error } = await supabase.functions.invoke('create-customer', {
      body: {
        email,
        name,
        metadata: {
          ...metadata,
          created_via: 'moodymedia_app',
          user_id: (await supabase.auth.getUser()).data.user?.id,
        },
      },
    });

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error creating/getting Stripe customer:', error);
    throw error;
  }
};

/**
 * Validates cart items before creating Stripe session
 */
export const validateCartForStripe = (cartItems: any[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!cartItems || cartItems.length === 0) {
    errors.push('Cart is empty');
    return { isValid: false, errors };
  }

  // Filter out read-only items (backup items)
  const validItems = cartItems.filter(item => !item.readOnly);

  if (validItems.length === 0) {
    errors.push('No valid items in cart for checkout');
    return { isValid: false, errors };
  }

  // Check for maximum items limit (Stripe has a 100 line item limit)
  if (validItems.length > 100) {
    errors.push(`Too many items in cart. Maximum allowed: 100, current: ${validItems.length}`);
  }

  let totalAmount = 0;

  // Validate each item
  for (const item of validItems) {
    const itemName = item.domain || 'Unknown';

    if (!item.mediaOutletId) {
      errors.push(`Invalid media outlet for item: ${itemName}`);
    }

    const price = item.finalPrice || item.price;
    if (!price || price <= 0) {
      errors.push(`Invalid price for item: ${itemName}`);
    }

    // Check for minimum amount (Stripe minimum is €0.50)
    if (price < 0.50) {
      errors.push(`Price too low for item ${itemName}. Minimum: €0.50, current: €${price}`);
    }

    // Check for maximum amount (Stripe maximum is €999,999.99)
    if (price > 999999.99) {
      errors.push(`Price too high for item ${itemName}. Maximum: €999,999.99, current: €${price}`);
    }

    const quantity = item.quantity || 1;
    if (quantity <= 0 || quantity > 100) {
      errors.push(`Invalid quantity for item ${itemName}. Must be between 1 and 100, current: ${quantity}`);
    }

    if (!item.domain) {
      errors.push('Item missing domain information');
    }

    if (!item.category) {
      errors.push(`Item missing category for: ${itemName}`);
    }

    // Validate currency
    if (item.currency && item.currency.toLowerCase() !== 'eur') {
      errors.push(`Unsupported currency for item ${itemName}. Only EUR is supported, found: ${item.currency}`);
    }

    totalAmount += price * quantity;
  }

  // Check total amount limits
  if (totalAmount < 0.50) {
    errors.push(`Total order amount too low. Minimum: €0.50, current: €${totalAmount.toFixed(2)}`);
  }

  if (totalAmount > 999999.99) {
    errors.push(`Total order amount too high. Maximum: €999,999.99, current: €${totalAmount.toFixed(2)}`);
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Converts cart items to Stripe line items
 */
export const convertCartToStripeLineItems = (cartItems: any[]): StripeLineItem[] => {
  // Filter out read-only items
  const validItems = cartItems.filter(item => !item.readOnly);

  return validItems.map(item => ({
    price_data: {
      currency: stripeConfig.currency,
      product_data: {
        name: `Media Placement - ${item.domain}`,
        description: `${item.category || 'Media'} placement${item.nicheName ? ` in ${item.nicheName}` : ''}`,
        metadata: {
          media_outlet_id: item.mediaOutletId,
          domain: item.domain,
          category: item.category || '',
          niche_id: item.nicheId || '',
          niche_name: item.nicheName || '',
        },
      },
      unit_amount: Math.round((item.finalPrice || item.price) * 100), // Convert to cents
    },
    quantity: item.quantity || 1,
  }));
};

/**
 * Generates checkout URLs for success and cancel scenarios
 */
export const generateCheckoutUrls = (baseUrl: string, orderId?: string) => {
  const successUrl = orderId 
    ? `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`
    : `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    
  const cancelUrl = `${baseUrl}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`;

  return { successUrl, cancelUrl };
};

/**
 * Retrieves a Stripe session by ID
 */
export const getStripeSession = async (sessionId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('get-session', {
      body: { session_id: sessionId },
    });

    if (error) {
      throw new Error(`Failed to retrieve session: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error retrieving Stripe session:', error);
    throw error;
  }
};

/**
 * Verifies payment completion via webhook or session retrieval
 */
export const verifyPaymentCompletion = async (sessionId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: { session_id: sessionId },
    });

    if (error) {
      throw new Error(`Failed to verify payment: ${error.message}`);
    }

    return {
      isCompleted: data.status === 'complete',
      paymentStatus: data.payment_status,
      paymentIntentId: data.payment_intent_id,
      customerId: data.customer_id,
      paymentMethodType: data.payment_method_type,
      paymentMethodLast4: data.payment_method_last4,
    };
  } catch (error) {
    console.error('Error verifying payment completion:', error);
    throw error;
  }
};

/**
 * Calculates order totals including VAT
 */
export const calculateOrderTotals = (cartItems: any[], vatRate: number = 0.25) => {
  const validItems = cartItems.filter(item => !item.readOnly);
  
  const subtotal = validItems.reduce((sum, item) => {
    return sum + ((item.finalPrice || item.price) * (item.quantity || 1));
  }, 0);

  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    itemCount: validItems.length,
    totalQuantity: validItems.reduce((sum, item) => sum + (item.quantity || 1), 0),
  };
};

/**
 * Creates metadata for Stripe session from form data
 */
export const createSessionMetadata = (formData: CheckoutFormData, userId?: string) => {
  return {
    user_id: userId || '',
    billing_email: formData.billingInfo?.email || '',
    billing_company: formData.billingInfo?.company || '',
    content_option: formData.contentPreferences?.option || 'self-provided',
    order_notes: formData.notes || '',
    created_via: 'moodymedia_checkout',
    timestamp: new Date().toISOString(),
  };
};

// Comprehensive Stripe error code mapping
const STRIPE_ERROR_MESSAGES: Record<string, string> = {
  // Card errors
  'card_declined': 'Your card was declined. Please try a different payment method or contact your bank.',
  'expired_card': 'Your card has expired. Please use a different card.',
  'incorrect_cvc': 'The security code (CVC) is incorrect. Please check and try again.',
  'processing_error': 'An error occurred while processing your card. Please try again.',
  'incorrect_number': 'The card number is incorrect. Please check and try again.',
  'invalid_number': 'The card number is invalid. Please check and try again.',
  'invalid_expiry_month': 'The expiration month is invalid. Please check and try again.',
  'invalid_expiry_year': 'The expiration year is invalid. Please check and try again.',
  'invalid_cvc': 'The security code (CVC) is invalid. Please check and try again.',
  'insufficient_funds': 'Insufficient funds. Please check your account balance or use a different card.',
  'withdrawal_count_limit_exceeded': 'You have exceeded the balance or credit limit on your card. Please use a different card.',
  'charge_exceeds_source_limit': 'The payment exceeds the maximum amount for your card. Please use a different card.',
  'instant_payouts_unsupported': 'Instant payouts are not supported for this card.',
  'duplicate_transaction': 'A payment with identical amount and details was recently submitted. Please wait before trying again.',

  // Authentication errors
  'authentication_required': 'Authentication is required to complete this payment. Please try again.',
  'pickup_card': 'Please contact your bank - the card cannot be used for payment.',
  'restricted_card': 'Your card is restricted. Please contact your bank or use a different card.',
  'security_violation': 'Your card was declined for security reasons. Please contact your bank.',
  'stolen_card': 'Your card has been reported as stolen. Please contact your bank.',
  'suspected_fraud': 'Your payment was declined as suspected fraud. Please contact your bank.',

  // Amount errors  
  'amount_too_large': 'The payment amount is too large. Maximum allowed is €999,999.99.',
  'amount_too_small': 'The payment amount is too small. Minimum payment is €0.50.',
  'balance_insufficient': 'Insufficient account balance. Please add funds or use a different payment method.',

  // Currency and regional errors
  'currency_not_supported': 'This currency is not supported. Only EUR payments are accepted.',
  'country_unsupported': 'Payments from your country are not currently supported.',
  'postal_code_invalid': 'The postal code is invalid. Please check and try again.',

  // API and configuration errors
  'api_key_expired': 'Payment configuration error. Please contact support.',
  'invalid_request_error': 'Invalid payment request. Please try again or contact support.',
  'idempotency_error': 'Duplicate payment detected. Please refresh the page and try again.',
  'rate_limit_error': 'Too many payment attempts. Please wait a few minutes before trying again.',

  // Customer errors
  'email_invalid': 'The email address is invalid. Please check and try again.',
  'customer_not_found': 'Customer not found. Please try again or contact support.',

  // Payment method errors
  'payment_method_not_available': 'This payment method is not available. Please try a different method.',
  'payment_method_provider_declined': 'Payment declined by your bank. Please try a different card or contact your bank.',
  'payment_method_currency_mismatch': 'Payment method currency mismatch. Please use a card that supports EUR.',

  // Session and timeout errors
  'checkout_session_expired': 'Your checkout session has expired. Please start the checkout process again.',
  'checkout_session_invalid': 'Invalid checkout session. Please start the checkout process again.',
  'payment_intent_authentication_failure': 'Payment authentication failed. Please try again.',
  'payment_intent_payment_attempt_failed': 'Payment attempt failed. Please try again or use a different payment method.',

  // General errors
  'processing_error': 'An error occurred while processing your payment. Please try again.',
  'generic_decline': 'Your payment was declined. Please try a different payment method or contact your bank.',
  'lost_card': 'Your card has been reported as lost. Please use a different card.',
  'new_account_information_available': 'New account information is available. Please contact your bank.',
  'no_action_required': 'The payment was successful but no further action is required.',
  'not_permitted': 'This payment is not permitted. Please contact your bank.',
  'try_again_later': 'Please try again later. If the problem persists, contact support.',
  'service_not_allowed': 'Service not allowed for this payment method. Please try a different method.',
  'transaction_not_allowed': 'This transaction is not allowed. Please contact your bank.',
};

/**
 * Enhanced error handling utility for Stripe operations
 */
export const handleStripeError = (error: any): string => {
  console.error('Stripe error details:', error);

  // Handle structured Stripe errors
  if (error?.type === 'StripeError') {
    const code = error.code || error.decline_code;
    if (code && STRIPE_ERROR_MESSAGES[code]) {
      return STRIPE_ERROR_MESSAGES[code];
    }
  }

  // Handle error messages with specific patterns
  if (error?.message) {
    const message = error.message.toLowerCase();
    
    // Check for specific error patterns in the message
    for (const [code, userMessage] of Object.entries(STRIPE_ERROR_MESSAGES)) {
      if (message.includes(code.replace('_', ' ')) || message.includes(code)) {
        return userMessage;
      }
    }

    // Handle common API error patterns
    if (message.includes('no such customer')) {
      return STRIPE_ERROR_MESSAGES['customer_not_found'];
    }
    
    if (message.includes('no such payment_method')) {
      return STRIPE_ERROR_MESSAGES['payment_method_not_available'];
    }
    
    if (message.includes('amount') && message.includes('too small')) {
      return STRIPE_ERROR_MESSAGES['amount_too_small'];
    }
    
    if (message.includes('amount') && message.includes('too large')) {
      return STRIPE_ERROR_MESSAGES['amount_too_large'];
    }

    if (message.includes('session') && message.includes('expired')) {
      return STRIPE_ERROR_MESSAGES['checkout_session_expired'];
    }

    if (message.includes('rate limit')) {
      return STRIPE_ERROR_MESSAGES['rate_limit_error'];
    }

    // Return the original message if it's user-friendly
    if (error.message.length < 200 && !message.includes('api') && !message.includes('key')) {
      return error.message;
    }
  }

  // Handle network errors
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Handle timeout errors
  if (error?.code === 'TIMEOUT' || error?.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  // Default fallback message
  return 'An unexpected error occurred during payment processing. Please try again or contact support if the problem persists.';
};

/**
 * Maps Stripe error types to user-friendly categories
 */
export const getStripeErrorCategory = (error: any): 'card' | 'auth' | 'config' | 'network' | 'unknown' => {
  if (!error) return 'unknown';

  const message = error.message?.toLowerCase() || '';
  const code = error.code || error.decline_code || '';

  if (code.includes('card') || message.includes('card') || 
      ['expired_card', 'incorrect_cvc', 'invalid_number'].includes(code)) {
    return 'card';
  }

  if (code.includes('auth') || message.includes('authentication') ||
      ['authentication_required', 'suspected_fraud'].includes(code)) {
    return 'auth';
  }

  if (code.includes('api') || message.includes('configuration') ||
      ['api_key_expired', 'invalid_request_error'].includes(code)) {
    return 'config';
  }

  if (message.includes('network') || message.includes('timeout') ||
      error.code === 'NETWORK_ERROR') {
    return 'network';
  }

  return 'unknown';
};
