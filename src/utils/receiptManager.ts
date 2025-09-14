/**
 * Receipt Management System for Stripe Payment Integration
 * 
 * Handles Stripe receipts, custom receipts, and order confirmations
 * with dual receipt delivery and comprehensive tracking.
 */

import { supabase } from '@/integrations/supabase/client';
import { stripeConfig } from '@/config/stripe';

export interface ReceiptData {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerEmail: string;
  customerName?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    company?: string;
  };
  paymentDetails: {
    amount: number;
    currency: string;
    paymentMethod: string;
    paymentMethodLast4?: string;
    paymentDate: string;
    stripeReceiptUrl?: string;
    stripeReceiptNumber?: string;
    paymentIntentId?: string;
  };
  orderItems: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    metadata?: Record<string, any>;
  }>;
  totals: {
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
  };
  orderDate: string;
  estimatedDelivery?: string;
}

export interface ReceiptPreferences {
  stripe_receipt: boolean;
  custom_receipt: boolean;
  confirmation_email: boolean;
  email_format: 'html' | 'text' | 'both';
  receipt_language: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
  variables: Record<string, any>;
}

/**
 * Configures Stripe receipt settings for checkout sessions
 */
export const configureStripeReceipt = (
  customerEmail: string,
  receiptPreferences: Partial<ReceiptPreferences> = {}
): {
  receipt_email: string;
  custom_fields?: Array<{
    name: string;
    value: string;
  }>;
} => {
  const config: any = {
    receipt_email: customerEmail
  };

  // Add custom fields if needed
  const customFields = [];
  
  // Add order reference field
  customFields.push({
    name: 'Order Reference',
    value: `Order #${Date.now().toString().slice(-6)}`
  });

  // Add support contact
  customFields.push({
    name: 'Support',
    value: 'support@moodymedia.com'
  });

  if (customFields.length > 0) {
    config.custom_fields = customFields;
  }

  return config;
};

/**
 * Stores receipt information in the database
 */
export const storeReceiptData = async (
  orderId: string,
  receiptData: {
    stripeReceiptUrl?: string;
    stripeReceiptNumber?: string;
    receiptPreferences?: ReceiptPreferences;
  }
): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const updates: any = {};

    if (receiptData.stripeReceiptUrl) {
      updates.stripe_receipt_url = receiptData.stripeReceiptUrl;
    }

    if (receiptData.stripeReceiptNumber) {
      updates.stripe_receipt_number = receiptData.stripeReceiptNumber;
    }

    if (receiptData.receiptPreferences) {
      updates.receipt_preferences = receiptData.receiptPreferences;
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) {
      console.error('Error storing receipt data:', error);
      return {
        success: false,
        error: error.message
      };
    }

    console.log('✅ Receipt data stored for order:', orderId);
    return { success: true };

  } catch (error) {
    console.error('Error in storeReceiptData:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Retrieves receipt data for an order
 */
export const getReceiptData = async (orderId: string): Promise<{
  success: boolean;
  receiptData?: ReceiptData;
  error?: string;
}> => {
  try {
    // Get order with all related data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        buyer:buyer_id(*),
        publisher:publisher_id(*),
        media_outlet:media_outlet_id(*),
        niche:niche_id(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return {
        success: false,
        error: orderError?.message || 'Order not found'
      };
    }

    // Get billing information if available
    const billingAddress = {
      street: order.billing_address?.street,
      city: order.billing_address?.city,
      postalCode: order.billing_address?.postal_code,
      country: order.billing_address?.country,
      company: order.billing_address?.company
    };

    // Build receipt data
    const receiptData: ReceiptData = {
      orderId: order.id,
      orderNumber: `MM-${order.id.slice(0, 8).toUpperCase()}`,
      customerId: order.stripe_customer_id || order.buyer_id,
      customerEmail: order.buyer?.email || '',
      customerName: order.buyer?.user_metadata?.name,
      billingAddress,
      paymentDetails: {
        amount: order.price || order.final_price || 0,
        currency: order.currency || 'EUR',
        paymentMethod: order.payment_method_type || 'card',
        paymentMethodLast4: order.payment_method_last4,
        paymentDate: order.updated_at,
        stripeReceiptUrl: order.stripe_receipt_url,
        stripeReceiptNumber: order.stripe_receipt_number,
        paymentIntentId: order.stripe_payment_intent_id
      },
      orderItems: [{
        id: order.media_outlet_id,
        description: `Media placement - ${order.media_outlet?.domain || 'Unknown outlet'}`,
        quantity: 1,
        unitPrice: order.price || order.final_price || 0,
        totalPrice: order.price || order.final_price || 0,
        metadata: {
          niche: order.niche?.label,
          guidelines: order.briefing,
          targetUrl: order.target_url
        }
      }],
      totals: {
        subtotal: order.base_price || order.price || 0,
        tax: (order.final_price || order.price || 0) - (order.base_price || order.price || 0),
        total: order.final_price || order.price || 0,
        currency: order.currency || 'EUR'
      },
      orderDate: order.created_at,
      estimatedDelivery: order.media_outlet?.lead_time_days ? 
        new Date(Date.now() + (order.media_outlet.lead_time_days * 24 * 60 * 60 * 1000)).toISOString() : 
        undefined
    };

    return {
      success: true,
      receiptData
    };

  } catch (error) {
    console.error('Error getting receipt data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Generates custom receipt HTML
 */
export const generateReceiptHTML = (receiptData: ReceiptData): string => {
  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt - ${receiptData.orderNumber}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .header p { margin: 10px 0 0; opacity: 0.9; font-size: 16px; }
        .content { padding: 30px 20px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; font-size: 18px; font-weight: 600; margin-bottom: 15px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .info-item { }
        .info-item label { display: block; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .info-item value { display: block; color: #333; font-size: 16px; font-weight: 500; }
        .order-items { border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; }
        .item-header { background: #f8f9fa; padding: 12px 15px; font-weight: 600; color: #555; border-bottom: 1px solid #e0e0e0; }
        .item { padding: 15px; border-bottom: 1px solid #f0f0f0; }
        .item:last-child { border-bottom: none; }
        .item-title { font-weight: 600; color: #333; margin-bottom: 5px; }
        .item-meta { color: #666; font-size: 14px; margin-bottom: 8px; }
        .item-price { text-align: right; font-weight: 600; color: #333; }
        .totals { background: #f8f9fa; border-radius: 6px; padding: 20px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .total-row.final { font-weight: 700; font-size: 18px; color: #333; border-top: 2px solid #e0e0e0; padding-top: 12px; margin-top: 12px; margin-bottom: 0; }
        .payment-method { background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; border-radius: 0 6px 6px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .receipt-number { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 10px; margin-bottom: 20px; }
        .support-info { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin-top: 20px; }
        @media (max-width: 600px) {
            .info-grid { grid-template-columns: 1fr; gap: 15px; }
            body { padding: 10px; }
            .content { padding: 20px 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Payment Receipt</h1>
            <p>Thank you for your order with MoodyMedia</p>
        </div>
        
        <div class="content">
            ${receiptData.paymentDetails.stripeReceiptNumber ? `
            <div class="receipt-number">
                <strong>Receipt Number:</strong> ${receiptData.paymentDetails.stripeReceiptNumber}
            </div>
            ` : ''}
            
            <div class="section">
                <h2>Order Information</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Order Number</label>
                        <value>${receiptData.orderNumber}</value>
                    </div>
                    <div class="info-item">
                        <label>Order Date</label>
                        <value>${formatDate(receiptData.orderDate)}</value>
                    </div>
                    <div class="info-item">
                        <label>Customer Email</label>
                        <value>${receiptData.customerEmail}</value>
                    </div>
                    ${receiptData.estimatedDelivery ? `
                    <div class="info-item">
                        <label>Estimated Delivery</label>
                        <value>${formatDate(receiptData.estimatedDelivery)}</value>
                    </div>
                    ` : ''}
                </div>
            </div>

            ${receiptData.billingAddress && receiptData.billingAddress.street ? `
            <div class="section">
                <h2>Billing Address</h2>
                <div style="color: #333; line-height: 1.6;">
                    ${receiptData.customerName ? `${receiptData.customerName}<br>` : ''}
                    ${receiptData.billingAddress.company ? `${receiptData.billingAddress.company}<br>` : ''}
                    ${receiptData.billingAddress.street}<br>
                    ${receiptData.billingAddress.city} ${receiptData.billingAddress.postalCode}<br>
                    ${receiptData.billingAddress.country}
                </div>
            </div>
            ` : ''}

            <div class="section">
                <h2>Order Items</h2>
                <div class="order-items">
                    <div class="item-header">Media Placement Details</div>
                    ${receiptData.orderItems.map(item => `
                    <div class="item">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <div class="item-title">${item.description}</div>
                                ${item.metadata?.niche ? `<div class="item-meta">Niche: ${item.metadata.niche}</div>` : ''}
                                ${item.metadata?.targetUrl ? `<div class="item-meta">Target URL: ${item.metadata.targetUrl}</div>` : ''}
                                <div class="item-meta">Quantity: ${item.quantity}</div>
                            </div>
                            <div class="item-price">
                                ${formatCurrency(item.totalPrice, receiptData.totals.currency)}
                            </div>
                        </div>
                    </div>
                    `).join('')}
                </div>
            </div>

            <div class="section">
                <h2>Payment Summary</h2>
                <div class="totals">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>${formatCurrency(receiptData.totals.subtotal, receiptData.totals.currency)}</span>
                    </div>
                    ${receiptData.totals.tax > 0 ? `
                    <div class="total-row">
                        <span>Tax:</span>
                        <span>${formatCurrency(receiptData.totals.tax, receiptData.totals.currency)}</span>
                    </div>
                    ` : ''}
                    <div class="total-row final">
                        <span>Total Paid:</span>
                        <span>${formatCurrency(receiptData.totals.total, receiptData.totals.currency)}</span>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Payment Method</h2>
                <div class="payment-method">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600; color: #333;">
                                ${receiptData.paymentDetails.paymentMethod.charAt(0).toUpperCase() + receiptData.paymentDetails.paymentMethod.slice(1)}
                                ${receiptData.paymentDetails.paymentMethodLast4 ? ` ending in ${receiptData.paymentDetails.paymentMethodLast4}` : ''}
                            </div>
                            <div style="color: #666; font-size: 14px; margin-top: 4px;">
                                Processed on ${formatDate(receiptData.paymentDetails.paymentDate)}
                            </div>
                        </div>
                        <div style="color: #4caf50; font-weight: 600;">✓ Paid</div>
                    </div>
                </div>
            </div>

            ${receiptData.paymentDetails.stripeReceiptUrl ? `
            <div class="section">
                <h2>Official Receipt</h2>
                <p style="margin-bottom: 15px;">You can also view your official Stripe receipt:</p>
                <a href="${receiptData.paymentDetails.stripeReceiptUrl}" 
                   style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                    View Stripe Receipt
                </a>
            </div>
            ` : ''}

            <div class="support-info">
                <h3 style="margin-top: 0; color: #1976d2;">Need Help?</h3>
                <p style="margin-bottom: 0; color: #666;">
                    If you have any questions about your order, please contact our support team at 
                    <a href="mailto:support@moodymedia.com" style="color: #1976d2;">support@moodymedia.com</a>
                    or reference order number <strong>${receiptData.orderNumber}</strong>.
                </p>
            </div>
        </div>

        <div class="footer">
            <p><strong>MoodyMedia</strong> - Premium Media Placement Marketplace</p>
            <p>This receipt was generated on ${formatDate(new Date().toISOString())}</p>
        </div>
    </div>
</body>
</html>`;
};

/**
 * Generates plain text receipt
 */
export const generateReceiptText = (receiptData: ReceiptData): string => {
  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
PAYMENT RECEIPT - MOODYMEDIA
═══════════════════════════════════════════════════════════════

Thank you for your order!

${receiptData.paymentDetails.stripeReceiptNumber ? `Receipt Number: ${receiptData.paymentDetails.stripeReceiptNumber}\n` : ''}
ORDER INFORMATION
─────────────────────────────────────────────────────────────
Order Number: ${receiptData.orderNumber}
Order Date: ${formatDate(receiptData.orderDate)}
Customer Email: ${receiptData.customerEmail}
${receiptData.estimatedDelivery ? `Estimated Delivery: ${formatDate(receiptData.estimatedDelivery)}\n` : ''}

${receiptData.billingAddress && receiptData.billingAddress.street ? `
BILLING ADDRESS
─────────────────────────────────────────────────────────────
${receiptData.customerName ? `${receiptData.customerName}\n` : ''}${receiptData.billingAddress.company ? `${receiptData.billingAddress.company}\n` : ''}${receiptData.billingAddress.street}
${receiptData.billingAddress.city} ${receiptData.billingAddress.postalCode}
${receiptData.billingAddress.country}

` : ''}ORDER ITEMS
─────────────────────────────────────────────────────────────
${receiptData.orderItems.map(item => `
${item.description}
${item.metadata?.niche ? `Niche: ${item.metadata.niche}\n` : ''}${item.metadata?.targetUrl ? `Target URL: ${item.metadata.targetUrl}\n` : ''}Quantity: ${item.quantity}
Price: ${formatCurrency(item.totalPrice, receiptData.totals.currency)}
`).join('\n')}

PAYMENT SUMMARY
─────────────────────────────────────────────────────────────
Subtotal: ${formatCurrency(receiptData.totals.subtotal, receiptData.totals.currency)}
${receiptData.totals.tax > 0 ? `Tax: ${formatCurrency(receiptData.totals.tax, receiptData.totals.currency)}\n` : ''}Total Paid: ${formatCurrency(receiptData.totals.total, receiptData.totals.currency)}

PAYMENT METHOD
─────────────────────────────────────────────────────────────
${receiptData.paymentDetails.paymentMethod.charAt(0).toUpperCase() + receiptData.paymentDetails.paymentMethod.slice(1)}${receiptData.paymentDetails.paymentMethodLast4 ? ` ending in ${receiptData.paymentDetails.paymentMethodLast4}` : ''}
Processed on ${formatDate(receiptData.paymentDetails.paymentDate)}
Status: ✓ PAID

${receiptData.paymentDetails.stripeReceiptUrl ? `
OFFICIAL RECEIPT
─────────────────────────────────────────────────────────────
View your official Stripe receipt:
${receiptData.paymentDetails.stripeReceiptUrl}

` : ''}SUPPORT
─────────────────────────────────────────────────────────────
Need help? Contact support@moodymedia.com
Reference order number: ${receiptData.orderNumber}

═══════════════════════════════════════════════════════════════
MoodyMedia - Premium Media Placement Marketplace
Receipt generated on ${formatDate(new Date().toISOString())}
═══════════════════════════════════════════════════════════════
`;
};

/**
 * Receipt manager utilities interface
 */
export const receiptManager = {
  // Configuration
  configureStripe: configureStripeReceipt,

  // Data management
  store: storeReceiptData,
  get: getReceiptData,

  // Receipt generation
  generateHTML: generateReceiptHTML,
  generateText: generateReceiptText,

  // Template helpers
  formatCurrency: (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  },

  formatDate: (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

// Make receipt manager available globally in development
if (import.meta.env.DEV) {
  (window as any).receiptManager = receiptManager;
  console.log('🔧 Receipt manager available globally as: window.receiptManager');
  console.log('📚 Usage examples:');
  console.log('  - receiptManager.get(orderId) - Get receipt data');
  console.log('  - receiptManager.generateHTML(receiptData) - Generate HTML receipt');
  console.log('  - receiptManager.store(orderId, data) - Store receipt info');
}
