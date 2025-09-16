/**
 * Dual Receipt System for Stripe Integration
 * 
 * Coordinates between Stripe receipts and custom receipts to provide
 * comprehensive receipt delivery with fallback mechanisms.
 */

import { receiptManager } from './receiptManager';
import { emailNotifications } from './emailNotifications';
import { supabase } from '@/integrations/supabase/client';

export interface ReceiptDeliveryOptions {
  enableStripeReceipt: boolean;
  enableCustomReceipt: boolean;
  enableOrderConfirmation: boolean;
  deliveryDelay?: number; // Delay in milliseconds
  customTemplate?: string;
  includeAttachments?: boolean;
}

export interface ReceiptDeliveryResult {
  success: boolean;
  deliveredReceipts: {
    stripe: boolean;
    custom: boolean;
    confirmation: boolean;
  };
  errors: string[];
  deliveryDetails: {
    stripeReceiptUrl?: string;
    customReceiptSent?: boolean;
    confirmationSent?: boolean;
    totalAttempts: number;
  };
}

/**
 * Delivers all configured receipts for an order
 */
export const deliverAllReceipts = async (
  orderId: string,
  options: ReceiptDeliveryOptions = {
    enableStripeReceipt: true,
    enableCustomReceipt: true,
    enableOrderConfirmation: true
  }
): Promise<ReceiptDeliveryResult> => {
  const result: ReceiptDeliveryResult = {
    success: false,
    deliveredReceipts: {
      stripe: false,
      custom: false,
      confirmation: false
    },
    errors: [],
    deliveryDetails: {
      totalAttempts: 0
    }
  };

  try {
    // Get order and receipt data
    const { success: receiptSuccess, receiptData, error: receiptError } = await receiptManager.get(orderId);
    if (!receiptSuccess || !receiptData) {
      result.errors.push(receiptError || 'Failed to get receipt data');
      return result;
    }

    // Get current order status from database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('stripe_receipt_url, custom_receipt_sent, confirmation_email_sent, receipt_preferences')
      .eq('id', orderId)
      .single();

    if (orderError) {
      result.errors.push(`Database error: ${orderError.message}`);
      return result;
    }

    // Parse receipt preferences
    const preferences = order?.receipt_preferences || {};
    const effectiveOptions = {
      enableStripeReceipt: preferences.stripe_receipt !== false && options.enableStripeReceipt,
      enableCustomReceipt: preferences.custom_receipt !== false && options.enableCustomReceipt,
      enableOrderConfirmation: preferences.confirmation_email !== false && options.enableOrderConfirmation,
      ...options
    };

    console.log('🧾 Starting dual receipt delivery:', {
      orderId,
      options: effectiveOptions,
      currentStatus: {
        stripeReceiptUrl: order?.stripe_receipt_url,
        customReceiptSent: order?.custom_receipt_sent,
        confirmationSent: order?.confirmation_email_sent
      }
    });

    // Apply delivery delay if specified
    if (options.deliveryDelay && options.deliveryDelay > 0) {
      console.log(`⏱️ Delaying receipt delivery by ${options.deliveryDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, options.deliveryDelay));
    }

    // 1. Handle Stripe Receipt (usually already delivered by Stripe)
    if (effectiveOptions.enableStripeReceipt) {
      result.deliveryDetails.totalAttempts++;
      
      if (order?.stripe_receipt_url) {
        result.deliveredReceipts.stripe = true;
        result.deliveryDetails.stripeReceiptUrl = order.stripe_receipt_url;
        console.log('✅ Stripe receipt already available:', order.stripe_receipt_url);
      } else {
        // Stripe receipt should be automatically generated
        // In some cases, we might need to trigger it manually
        console.log('⚠️ Stripe receipt not found - this is unusual');
        result.errors.push('Stripe receipt not available');
      }
    }

    // 2. Send Custom Receipt
    if (effectiveOptions.enableCustomReceipt && !order?.custom_receipt_sent) {
      result.deliveryDetails.totalAttempts++;
      
      try {
        const customReceiptResult = await emailNotifications.sendCustomReceipt(orderId, {
          includeAttachment: effectiveOptions.includeAttachments,
          template: options.customTemplate
        });

        if (customReceiptResult.success) {
          result.deliveredReceipts.custom = true;
          result.deliveryDetails.customReceiptSent = true;
          console.log('✅ Custom receipt sent successfully');
        } else {
          result.errors.push(`Custom receipt failed: ${customReceiptResult.error}`);
          console.error('❌ Custom receipt failed:', customReceiptResult.error);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Custom receipt error: ${errorMessage}`);
        console.error('❌ Custom receipt error:', error);
      }
    } else if (order?.custom_receipt_sent) {
      result.deliveredReceipts.custom = true;
      result.deliveryDetails.customReceiptSent = true;
      console.log('✅ Custom receipt already sent');
    }

    // 3. Send Order Confirmation
    if (effectiveOptions.enableOrderConfirmation && !order?.confirmation_email_sent) {
      result.deliveryDetails.totalAttempts++;
      
      try {
        const confirmationResult = await emailNotifications.sendOrderConfirmation(orderId, {
          delay: 0, // Already delayed above if needed
          template: options.customTemplate
        });

        if (confirmationResult.success) {
          result.deliveredReceipts.confirmation = true;
          result.deliveryDetails.confirmationSent = true;
          console.log('✅ Order confirmation sent successfully');
        } else {
          result.errors.push(`Order confirmation failed: ${confirmationResult.error}`);
          console.error('❌ Order confirmation failed:', confirmationResult.error);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Order confirmation error: ${errorMessage}`);
        console.error('❌ Order confirmation error:', error);
      }
    } else if (order?.confirmation_email_sent) {
      result.deliveredReceipts.confirmation = true;
      result.deliveryDetails.confirmationSent = true;
      console.log('✅ Order confirmation already sent');
    }

    // Determine overall success
    const requestedReceipts = [
      effectiveOptions.enableStripeReceipt,
      effectiveOptions.enableCustomReceipt,
      effectiveOptions.enableOrderConfirmation
    ].filter(Boolean).length;

    const deliveredReceipts = [
      result.deliveredReceipts.stripe,
      result.deliveredReceipts.custom,
      result.deliveredReceipts.confirmation
    ].filter(Boolean).length;

    result.success = deliveredReceipts > 0 && result.errors.length === 0;

    console.log('🧾 Dual receipt delivery completed:', {
      orderId,
      requested: requestedReceipts,
      delivered: deliveredReceipts,
      success: result.success,
      errors: result.errors.length
    });

    return result;

  } catch (error) {
    console.error('❌ Dual receipt delivery failed:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
};

/**
 * Processes the complete payment success workflow
 */
export const processPaymentSuccess = async (
  orderId: string,
  paymentData: {
    stripeReceiptUrl?: string;
    stripeReceiptNumber?: string;
    paymentIntentId?: string;
    customerId?: string;
  },
  receiptOptions: Partial<ReceiptDeliveryOptions> = {}
): Promise<{
  success: boolean;
  receiptDeliveryResult?: ReceiptDeliveryResult;
  error?: string;
}> => {
  try {
    console.log('🎉 Processing payment success for order:', orderId);

    // 1. Store receipt data in database
    const storeResult = await receiptManager.store(orderId, {
      stripeReceiptUrl: paymentData.stripeReceiptUrl,
      stripeReceiptNumber: paymentData.stripeReceiptNumber,
      receiptPreferences: {
        stripe_receipt: true,
        custom_receipt: true,
        confirmation_email: true,
        email_format: 'html',
        receipt_language: 'en'
      }
    });

    if (!storeResult.success) {
      return {
        success: false,
        error: `Failed to store receipt data: ${storeResult.error}`
      };
    }

    // 2. Deliver all receipts
    const deliveryOptions: ReceiptDeliveryOptions = {
      enableStripeReceipt: true,
      enableCustomReceipt: true,
      enableOrderConfirmation: true,
      deliveryDelay: 5000, // 5 second delay to ensure payment is fully processed
      includeAttachments: false,
      ...receiptOptions
    };

    const receiptDeliveryResult = await deliverAllReceipts(orderId, deliveryOptions);

    // 3. Update order status if receipts were delivered successfully
    if (receiptDeliveryResult.success || receiptDeliveryResult.deliveredReceipts.confirmation) {
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
    }

    return {
      success: true,
      receiptDeliveryResult
    };

  } catch (error) {
    console.error('❌ Payment success processing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Retries failed receipt deliveries
 */
export const retryFailedReceipts = async (
  orderId: string,
  retryOptions: {
    retryStripe?: boolean;
    retryCustom?: boolean;
    retryConfirmation?: boolean;
    maxRetries?: number;
  } = {}
): Promise<ReceiptDeliveryResult> => {
  const options: ReceiptDeliveryOptions = {
    enableStripeReceipt: retryOptions.retryStripe || false,
    enableCustomReceipt: retryOptions.retryCustom || false,
    enableOrderConfirmation: retryOptions.retryConfirmation || false
  };

  console.log('🔄 Retrying failed receipts for order:', orderId, options);
  
  return await deliverAllReceipts(orderId, options);
};

/**
 * Gets receipt delivery status for an order
 */
export const getReceiptDeliveryStatus = async (orderId: string): Promise<{
  success: boolean;
  status?: {
    stripeReceipt: {
      available: boolean;
      url?: string;
    };
    customReceipt: {
      sent: boolean;
      sentAt?: string;
    };
    orderConfirmation: {
      sent: boolean;
      sentAt?: string;
    };
    emailHistory: any[];
  };
  error?: string;
}> => {
  try {
    // Get order data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('stripe_receipt_url, custom_receipt_sent, custom_receipt_sent_at, confirmation_email_sent, confirmation_email_sent_at')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return {
        success: false,
        error: orderError?.message || 'Order not found'
      };
    }

    // Get email history
    const emailHistory = await emailNotifications.getHistory(orderId);

    return {
      success: true,
      status: {
        stripeReceipt: {
          available: !!order.stripe_receipt_url,
          url: order.stripe_receipt_url
        },
        customReceipt: {
          sent: !!order.custom_receipt_sent,
          sentAt: order.custom_receipt_sent_at
        },
        orderConfirmation: {
          sent: !!order.confirmation_email_sent,
          sentAt: order.confirmation_email_sent_at
        },
        emailHistory
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Dual receipt system utilities interface
 */
export const dualReceiptSystem = {
  // Core functions
  deliverAll: deliverAllReceipts,
  processPaymentSuccess,
  retryFailed: retryFailedReceipts,

  // Status and monitoring
  getDeliveryStatus: getReceiptDeliveryStatus,

  // Configuration helpers
  createDeliveryOptions: (overrides: Partial<ReceiptDeliveryOptions> = {}): ReceiptDeliveryOptions => ({
    enableStripeReceipt: true,
    enableCustomReceipt: true,
    enableOrderConfirmation: true,
    deliveryDelay: 5000,
    includeAttachments: false,
    ...overrides
  })
};

// Make dual receipt system available globally in development
if (import.meta.env.DEV) {
  (window as any).dualReceiptSystem = dualReceiptSystem;
  console.log('🔧 Dual receipt system available globally as: window.dualReceiptSystem');
  console.log('📚 Usage examples:');
  console.log('  - dualReceiptSystem.deliverAll(orderId, options) - Deliver all receipts');
  console.log('  - dualReceiptSystem.processPaymentSuccess(orderId, paymentData) - Full workflow');
  console.log('  - dualReceiptSystem.getDeliveryStatus(orderId) - Check delivery status');
}
