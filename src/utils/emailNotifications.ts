/**
 * Email Notification System for Order Confirmations and Receipts
 * 
 * Handles automated email delivery for payment confirmations,
 * custom receipts, and order status updates.
 */

import { supabase } from '@/integrations/supabase/client';
import { receiptManager, ReceiptData } from './receiptManager';

export interface EmailNotification {
  id: string;
  type: 'order_confirmation' | 'custom_receipt' | 'payment_receipt' | 'order_update';
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlContent: string;
  textContent: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
  metadata: {
    orderId: string;
    orderNumber: string;
    customerId: string;
    templateVersion: string;
  };
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  scheduledAt?: string;
  sentAt?: string;
  failureReason?: string;
  retryCount: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  type: 'order_confirmation' | 'custom_receipt' | 'payment_receipt' | 'order_update';
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[];
  version: string;
  active: boolean;
}

/**
 * Email templates for different notification types
 */
const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  order_confirmation: {
    id: 'order_confirmation_v1',
    name: 'Order Confirmation',
    type: 'order_confirmation',
    subject: '🎉 Order Confirmed - {{orderNumber}} | MoodyMedia',
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 32px; font-weight: 700; }
        .header p { margin: 15px 0 0; opacity: 0.95; font-size: 18px; }
        .content { padding: 40px 30px; }
        .highlight-box { background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%); border-left: 4px solid #4caf50; padding: 20px; border-radius: 0 6px 6px 0; margin: 20px 0; }
        .order-details { background: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
        .detail-row:last-child { border-bottom: none; margin-bottom: 0; }
        .detail-label { font-weight: 600; color: #495057; }
        .detail-value { color: #212529; }
        .next-steps { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin: 25px 0; }
        .button { display: inline-block; background: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
        .footer { background: #f8f9fa; padding: 30px 20px; text-align: center; color: #6c757d; }
        .social-links { margin: 20px 0; }
        .social-links a { display: inline-block; margin: 0 10px; color: #6c757d; text-decoration: none; }
        @media (max-width: 600px) {
            body { padding: 10px; }
            .content { padding: 20px 15px; }
            .detail-row { flex-direction: column; gap: 4px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Order Confirmed!</h1>
            <p>Your media placement order has been successfully placed</p>
        </div>
        
        <div class="content">
            <div class="highlight-box">
                <h2 style="margin-top: 0; color: #2e7d32;">Thank you for choosing MoodyMedia!</h2>
                <p style="margin-bottom: 0; color: #388e3c;">Your order <strong>{{orderNumber}}</strong> has been confirmed and payment has been processed successfully. We're excited to help you reach your target audience!</p>
            </div>

            <div class="order-details">
                <h3 style="margin-top: 0; color: #343a40;">Order Summary</h3>
                <div class="detail-row">
                    <span class="detail-label">Order Number:</span>
                    <span class="detail-value">{{orderNumber}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Order Date:</span>
                    <span class="detail-value">{{orderDate}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total Amount:</span>
                    <span class="detail-value">{{totalAmount}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Payment Method:</span>
                    <span class="detail-value">{{paymentMethod}}</span>
                </div>
                {{#estimatedDelivery}}
                <div class="detail-row">
                    <span class="detail-label">Estimated Publication:</span>
                    <span class="detail-value">{{estimatedDelivery}}</span>
                </div>
                {{/estimatedDelivery}}
            </div>

            <div class="next-steps">
                <h3 style="margin-top: 0; color: #856404;">What happens next?</h3>
                <ol style="margin-bottom: 0; color: #856404; padding-left: 20px;">
                    <li>Our team will review your order within 24 hours</li>
                    <li>The publisher will receive your content requirements</li>
                    <li>You'll receive updates as your content progresses</li>
                    <li>Your content will be published according to the timeline</li>
                </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{orderTrackingUrl}}" class="button">Track Your Order</a>
                <br>
                <a href="{{receiptUrl}}" style="color: #4caf50; text-decoration: none; font-weight: 500;">📄 Download Receipt</a>
            </div>

            <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                <h4 style="margin-top: 0; color: #1565c0;">Need help with your order?</h4>
                <p style="margin-bottom: 0; color: #1976d2;">
                    Our support team is here to help! Contact us at 
                    <a href="mailto:support@moodymedia.com" style="color: #1976d2;">support@moodymedia.com</a>
                    or reference order number <strong>{{orderNumber}}</strong>.
                </p>
            </div>
        </div>

        <div class="footer">
            <p><strong>MoodyMedia</strong></p>
            <p>Premium Media Placement Marketplace</p>
            <div class="social-links">
                <a href="{{websiteUrl}}">Website</a> |
                <a href="{{supportUrl}}">Support</a> |
                <a href="{{unsubscribeUrl}}">Unsubscribe</a>
            </div>
            <p style="font-size: 12px; margin-top: 20px;">
                This email was sent to {{customerEmail}} regarding order {{orderNumber}}.<br>
                © 2024 MoodyMedia. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`,
    textTemplate: `
🎉 ORDER CONFIRMED - MOODYMEDIA
═══════════════════════════════════════════════════════════════

Thank you for choosing MoodyMedia!

Your order {{orderNumber}} has been confirmed and payment has been 
processed successfully. We're excited to help you reach your target audience!

ORDER SUMMARY
─────────────────────────────────────────────────────────────
Order Number: {{orderNumber}}
Order Date: {{orderDate}}
Total Amount: {{totalAmount}}
Payment Method: {{paymentMethod}}
{{#estimatedDelivery}}Estimated Publication: {{estimatedDelivery}}{{/estimatedDelivery}}

WHAT HAPPENS NEXT?
─────────────────────────────────────────────────────────────
1. Our team will review your order within 24 hours
2. The publisher will receive your content requirements
3. You'll receive updates as your content progresses
4. Your content will be published according to the timeline

USEFUL LINKS
─────────────────────────────────────────────────────────────
Track Your Order: {{orderTrackingUrl}}
Download Receipt: {{receiptUrl}}

NEED HELP?
─────────────────────────────────────────────────────────────
Our support team is here to help! Contact us at 
support@moodymedia.com or reference order number {{orderNumber}}.

═══════════════════════════════════════════════════════════════
MoodyMedia - Premium Media Placement Marketplace
Website: {{websiteUrl}} | Support: {{supportUrl}}

This email was sent to {{customerEmail}} regarding order {{orderNumber}}.
© 2024 MoodyMedia. All rights reserved.
═══════════════════════════════════════════════════════════════`,
    variables: ['orderNumber', 'orderDate', 'totalAmount', 'paymentMethod', 'estimatedDelivery', 'orderTrackingUrl', 'receiptUrl', 'customerEmail', 'websiteUrl', 'supportUrl', 'unsubscribeUrl'],
    version: '1.0',
    active: true
  },

  custom_receipt: {
    id: 'custom_receipt_v1',
    name: 'Custom Receipt',
    type: 'custom_receipt',
    subject: '📄 Payment Receipt {{orderNumber}} | MoodyMedia',
    htmlTemplate: '{{receiptHTML}}', // Will be replaced with generated receipt HTML
    textTemplate: '{{receiptText}}', // Will be replaced with generated receipt text
    variables: ['orderNumber', 'receiptHTML', 'receiptText'],
    version: '1.0',
    active: true
  }
};

/**
 * Processes template variables and renders final content
 */
const processTemplate = (template: string, variables: Record<string, unknown>): string => {
  let processed = template;

  // Handle simple variable substitution
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, value || '');
  });

  // Handle conditional blocks (basic implementation)
  processed = processed.replace(/{{#(\w+)}}(.*?){{\/\1}}/gs, (match, key, content) => {
    return variables[key] ? content : '';
  });

  return processed;
};

/**
 * Sends order confirmation email
 */
export const sendOrderConfirmation = async (
  orderId: string,
  customOptions: {
    delay?: number; // Delay in milliseconds
    template?: string; // Custom template ID
  } = {}
): Promise<{
  success: boolean;
  notificationId?: string;
  error?: string;
}> => {
  try {
    // Get receipt data
    const { success, receiptData, error } = await receiptManager.get(orderId);
    if (!success || !receiptData) {
      return {
        success: false,
        error: error || 'Failed to get receipt data'
      };
    }

    // Get template
    const template = EMAIL_TEMPLATES.order_confirmation;
    
    // Prepare template variables
    const variables = {
      orderNumber: receiptData.orderNumber,
      orderDate: receiptManager.formatDate(receiptData.orderDate),
      totalAmount: receiptManager.formatCurrency(receiptData.totals.total, receiptData.totals.currency),
      paymentMethod: receiptData.paymentDetails.paymentMethod.charAt(0).toUpperCase() + receiptData.paymentDetails.paymentMethod.slice(1),
      estimatedDelivery: receiptData.estimatedDelivery ? receiptManager.formatDate(receiptData.estimatedDelivery) : null,
      customerEmail: receiptData.customerEmail,
      orderTrackingUrl: `${window.location.origin}/orders/${orderId}`,
      receiptUrl: `${window.location.origin}/orders/${orderId}/receipt`,
      websiteUrl: window.location.origin,
      supportUrl: `${window.location.origin}/support`,
      unsubscribeUrl: `${window.location.origin}/unsubscribe?email=${encodeURIComponent(receiptData.customerEmail)}`
    };

    // Process templates
    const htmlContent = processTemplate(template.htmlTemplate, variables);
    const textContent = processTemplate(template.textTemplate, variables);
    const subject = processTemplate(template.subject, variables);

    // Create notification record
    const notification: EmailNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: 'order_confirmation',
      to: receiptData.customerEmail,
      subject,
      htmlContent,
      textContent,
      metadata: {
        orderId,
        orderNumber: receiptData.orderNumber,
        customerId: receiptData.customerId,
        templateVersion: template.version
      },
      status: 'pending',
      scheduledAt: customOptions.delay ? new Date(Date.now() + customOptions.delay).toISOString() : undefined,
      retryCount: 0
    };

    // Send email (in production, integrate with email service)
    const emailSent = await sendEmail(notification);

    if (emailSent.success) {
      // Update order record
      await supabase
        .from('orders')
        .update({
          confirmation_email_sent: true,
          confirmation_email_sent_at: new Date().toISOString()
        })
        .eq('id', orderId);

      console.log('✅ Order confirmation sent:', notification.id);
      return {
        success: true,
        notificationId: notification.id
      };
    } else {
      return {
        success: false,
        error: emailSent.error || 'Failed to send email'
      };
    }

  } catch (error) {
    console.error('Error sending order confirmation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Sends custom receipt email
 */
export const sendCustomReceipt = async (
  orderId: string,
  customOptions: {
    includeAttachment?: boolean;
    template?: string;
  } = {}
): Promise<{
  success: boolean;
  notificationId?: string;
  error?: string;
}> => {
  try {
    // Get receipt data
    const { success, receiptData, error } = await receiptManager.get(orderId);
    if (!success || !receiptData) {
      return {
        success: false,
        error: error || 'Failed to get receipt data'
      };
    }

    // Generate receipt content
    const receiptHTML = receiptManager.generateHTML(receiptData);
    const receiptText = receiptManager.generateText(receiptData);

    // Get template
    const template = EMAIL_TEMPLATES.custom_receipt;

    // Prepare template variables
    const variables = {
      orderNumber: receiptData.orderNumber,
      receiptHTML,
      receiptText
    };

    // Process templates
    const htmlContent = processTemplate(template.htmlTemplate, variables);
    const textContent = processTemplate(template.textTemplate, variables);
    const subject = processTemplate(template.subject, variables);

    // Create notification record
    const notification: EmailNotification = {
      id: `receipt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: 'custom_receipt',
      to: receiptData.customerEmail,
      subject,
      htmlContent,
      textContent,
      metadata: {
        orderId,
        orderNumber: receiptData.orderNumber,
        customerId: receiptData.customerId,
        templateVersion: template.version
      },
      status: 'pending',
      retryCount: 0
    };

    // Add PDF attachment if requested (would require PDF generation library)
    if (customOptions.includeAttachment) {
      // notification.attachments = [{
      //   filename: `receipt-${receiptData.orderNumber}.pdf`,
      //   content: await generateReceiptPDF(receiptData),
      //   contentType: 'application/pdf'
      // }];
    }

    // Send email
    const emailSent = await sendEmail(notification);

    if (emailSent.success) {
      // Update order record
      await supabase
        .from('orders')
        .update({
          custom_receipt_sent: true,
          custom_receipt_sent_at: new Date().toISOString()
        })
        .eq('id', orderId);

      console.log('✅ Custom receipt sent:', notification.id);
      return {
        success: true,
        notificationId: notification.id
      };
    } else {
      return {
        success: false,
        error: emailSent.error || 'Failed to send email'
      };
    }

  } catch (error) {
    console.error('Error sending custom receipt:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Mock email sending function (replace with actual email service)
 */
const sendEmail = async (notification: EmailNotification): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // In development, log email content
    if (process.env.NODE_ENV === 'development') {
      console.group('📧 Email Notification');
      console.log('To:', notification.to);
      console.log('Subject:', notification.subject);
      console.log('Type:', notification.type);
      console.log('Order:', notification.metadata.orderNumber);
      console.groupEnd();

      // Store in localStorage for testing
      const sentEmails = JSON.parse(localStorage.getItem('sent_emails') || '[]');
      sentEmails.push({
        ...notification,
        sentAt: new Date().toISOString(),
        status: 'sent'
      });
      localStorage.setItem('sent_emails', JSON.stringify(sentEmails));
    }

    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    // const response = await emailService.send({
    //   to: notification.to,
    //   subject: notification.subject,
    //   html: notification.htmlContent,
    //   text: notification.textContent,
    //   attachments: notification.attachments
    // });

    return { success: true };

  } catch (error) {
    console.error('Email sending failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Processes email notification queue
 */
export const processEmailQueue = async (): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> => {
  // In production, this would process a queue from database
  // For now, return mock stats
  return {
    processed: 0,
    successful: 0,
    failed: 0
  };
};

/**
 * Gets email notification history for an order
 */
export const getEmailHistory = async (orderId: string): Promise<EmailNotification[]> => {
  // In development, get from localStorage
  if (process.env.NODE_ENV === 'development') {
    const sentEmails = JSON.parse(localStorage.getItem('sent_emails') || '[]');
    return sentEmails.filter((email: EmailNotification) => email.metadata.orderId === orderId);
  }

  // In production, query from database
  return [];
};

/**
 * Email notification utilities interface
 */
export const emailNotifications = {
  // Core functions
  sendOrderConfirmation,
  sendCustomReceipt,

  // Queue management
  processQueue: processEmailQueue,
  getHistory: getEmailHistory,

  // Template management
  getTemplates: () => EMAIL_TEMPLATES,
  processTemplate,

  // Development helpers
  getSentEmails: () => {
    if (process.env.NODE_ENV === 'development') {
      return JSON.parse(localStorage.getItem('sent_emails') || '[]');
    }
    return [];
  },
  
  clearSentEmails: () => {
    localStorage.removeItem('sent_emails');
  }
};

// Make email notifications available globally in development
if (import.meta.env.DEV) {
  (window as { emailNotifications?: typeof emailNotifications }).emailNotifications = emailNotifications;
  console.log('🔧 Email notifications available globally as: window.emailNotifications');
  console.log('📚 Usage examples:');
  console.log('  - emailNotifications.sendOrderConfirmation(orderId) - Send confirmation');
  console.log('  - emailNotifications.sendCustomReceipt(orderId) - Send receipt');
  console.log('  - emailNotifications.getSentEmails() - View sent emails');
}
