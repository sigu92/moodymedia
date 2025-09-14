/**
 * Abandoned Cart Recovery System for Failed Payments
 * 
 * Tracks abandoned carts, sends recovery notifications,
 * and provides mechanisms to complete interrupted purchases.
 */

import { supabase } from '@/integrations/supabase/client';
import { ErrorDetails } from './errorHandling';
import { paymentAnalytics } from './paymentAnalytics';

export interface AbandonedCart {
  id: string;
  userId: string;
  sessionId: string;
  cartItems: Array<{
    id: string;
    media_outlet_id: string;
    price: number;
    currency: string;
    niche_id?: string;
    quantity: number;
  }>;
  billingInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
  };
  totalAmount: number;
  currency: string;
  lastAttemptAt: string;
  abandonedAt: string;
  failureReason?: string;
  errorCode?: string;
  recoveryAttempts: number;
  lastRecoveryAt?: string;
  status: 'abandoned' | 'recovery_sent' | 'recovered' | 'expired';
  recoveryUrl?: string;
  metadata?: Record<string, any>;
}

export interface RecoveryEmailData {
  to: string;
  subject: string;
  personalizedMessage: string;
  cartSummary: string;
  totalAmount: number;
  currency: string;
  recoveryUrl: string;
  expiresAt: string;
  incentive?: {
    type: 'discount' | 'free_shipping' | 'upgrade';
    value: string;
    description: string;
  };
}

// In-memory storage for abandoned carts (in production, this would be a database)
const abandonedCarts = new Map<string, AbandonedCart>();

/**
 * Tracks cart abandonment when payment fails
 */
export const trackCartAbandonment = async (
  userId: string,
  sessionId: string,
  cartItems: any[],
  billingInfo: any,
  errorDetails: ErrorDetails,
  context: {
    totalAmount: number;
    currency: string;
    lastAttemptAt: string;
  }
): Promise<AbandonedCart> => {
  const cartId = `cart_${userId}_${Date.now()}`;
  
  const abandonedCart: AbandonedCart = {
    id: cartId,
    userId,
    sessionId,
    cartItems: cartItems.map(item => ({
      id: item.id,
      media_outlet_id: item.media_outlet_id,
      price: item.price || item.final_price,
      currency: item.currency || 'EUR',
      niche_id: item.niche_id,
      quantity: item.quantity || 1
    })),
    billingInfo,
    totalAmount: context.totalAmount,
    currency: context.currency,
    lastAttemptAt: context.lastAttemptAt,
    abandonedAt: new Date().toISOString(),
    failureReason: errorDetails.userMessage,
    errorCode: errorDetails.code,
    recoveryAttempts: 0,
    status: 'abandoned',
    metadata: {
      errorCategory: errorDetails.category,
      errorSeverity: errorDetails.severity,
      retryable: errorDetails.retryable
    }
  };

  // Store abandoned cart
  abandonedCarts.set(cartId, abandonedCart);

  // Track analytics event
  await paymentAnalytics.track('payment_abandoned', {
    userId,
    sessionId,
    amount: context.totalAmount,
    currency: context.currency,
    errorDetails,
    metadata: { cartId }
  });

  console.log('🛒 Cart abandonment tracked:', {
    cartId,
    userId,
    amount: context.totalAmount,
    errorCode: errorDetails.code
  });

  // Schedule recovery attempt
  scheduleRecoveryAttempt(cartId, 'immediate');

  return abandonedCart;
};

/**
 * Generates recovery URL for abandoned cart
 * TODO: Replace with server-issued signed token for security
 */
export const generateRecoveryUrl = async (cartId: string): Promise<string> => {
  const baseUrl = window.location.origin;
  
  // TODO: Replace this with server endpoint call
  // const response = await fetch('/api/cart/generate-recovery-token', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ cartId })
  // });
  // const { token } = await response.json();
  
  // TEMPORARY: This is insecure - should be replaced with server-issued HMAC/JWT token
  console.warn('Using insecure client-side token generation. Replace with server-side implementation.');
  const recoveryToken = btoa(`${cartId}:${Date.now()}`);
  
  return `${baseUrl}/checkout/recover?token=${recoveryToken}`;
};

/**
 * Schedules recovery attempt
 */
export const scheduleRecoveryAttempt = (
  cartId: string,
  timing: 'immediate' | 'one_hour' | 'one_day' | 'three_days'
): void => {
  const cart = abandonedCarts.get(cartId);
  if (!cart) return;

  let delay = 0;
  switch (timing) {
    case 'immediate':
      if (import.meta.env.VITE_CART_RECOVERY_IMMEDIATE_DELAY) {
        delay = parseInt(import.meta.env.VITE_CART_RECOVERY_IMMEDIATE_DELAY);
      } else {
        // Environment-specific defaults: short in dev, long in prod
        delay = import.meta.env.MODE === 'development' 
          ? 5 * 60 * 1000      // 5 minutes in development
          : 24 * 60 * 60 * 1000; // 24 hours in production
      }
      break;
    case 'one_hour':
      delay = 60 * 60 * 1000; // 1 hour
      break;
    case 'one_day':
      delay = 24 * 60 * 60 * 1000; // 1 day
      break;
    case 'three_days':
      delay = 3 * 24 * 60 * 60 * 1000; // 3 days
      break;
  }

  setTimeout(() => {
    sendRecoveryNotification(cartId, timing);
  }, delay);

  console.log(`📅 Recovery scheduled for cart ${cartId} in ${timing} (${delay}ms)`);
};

/**
 * Sends recovery notification to user
 */
export const sendRecoveryNotification = async (
  cartId: string,
  attempt: 'immediate' | 'one_hour' | 'one_day' | 'three_days'
): Promise<boolean> => {
  const cart = abandonedCarts.get(cartId);
  if (!cart || cart.status === 'recovered' || cart.status === 'expired') {
    return false;
  }

  // Don't send if cart is older than 7 days
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  if (new Date(cart.abandonedAt).getTime() < weekAgo) {
    cart.status = 'expired';
    abandonedCarts.set(cartId, cart);
    return false;
  }

  // Generate recovery URL
  cart.recoveryUrl = generateRecoveryUrl(cartId);
  
  // Create personalized email data
  const emailData = createRecoveryEmailData(cart, attempt);
  
  try {
    // In production, send email via email service
    console.log('📧 Sending recovery email:', {
      cartId,
      attempt,
      to: emailData.to,
      subject: emailData.subject
    });

    // For development, log email content
    if (process.env.NODE_ENV === 'development') {
      console.group('📧 Recovery Email Content');
      console.log('To:', emailData.to);
      console.log('Subject:', emailData.subject);
      console.log('Message:', emailData.personalizedMessage);
      console.log('Recovery URL:', emailData.recoveryUrl);
      console.groupEnd();
    }

    // Update cart status
    cart.recoveryAttempts++;
    cart.lastRecoveryAt = new Date().toISOString();
    cart.status = 'recovery_sent';
    abandonedCarts.set(cartId, cart);

    // Schedule next recovery attempt
    if (attempt === 'immediate') {
      scheduleRecoveryAttempt(cartId, 'one_hour');
    } else if (attempt === 'one_hour') {
      scheduleRecoveryAttempt(cartId, 'one_day');
    } else if (attempt === 'one_day') {
      scheduleRecoveryAttempt(cartId, 'three_days');
    }

    return true;

  } catch (error) {
    console.error('Failed to send recovery email:', error);
    return false;
  }
};

/**
 * Creates personalized recovery email data
 */
export const createRecoveryEmailData = (
  cart: AbandonedCart,
  attempt: 'immediate' | 'one_hour' | 'one_day' | 'three_days'
): RecoveryEmailData => {
  const userEmail = cart.billingInfo?.email || '';
  const userName = cart.billingInfo?.firstName || 'there';
  
  // Create cart summary
  const cartSummary = cart.cartItems.map(item => 
    `• Media outlet (${item.media_outlet_id.slice(0, 8)}...) - ${item.currency} ${item.price}`
  ).join('\n');

  // Generate subject and message based on attempt
  let subject = '';
  let personalizedMessage = '';
  let incentive: RecoveryEmailData['incentive'];

  switch (attempt) {
    case 'immediate':
      subject = 'Complete your order - Payment issue resolved';
      personalizedMessage = `Hi ${userName},\n\nWe noticed you had trouble completing your order a few minutes ago. We've made some improvements to our payment system, and you should be able to complete your purchase now.\n\nYour cart is saved and ready to go!`;
      break;
      
    case 'one_hour':
      subject = 'Your cart is waiting for you';
      personalizedMessage = `Hi ${userName},\n\nYou left some great media placements in your cart. Don't miss out on these opportunities to reach your target audience.\n\nComplete your order now to secure these placements.`;
      break;
      
    case 'one_day':
      subject = 'Still interested? 10% off your media order';
      personalizedMessage = `Hi ${userName},\n\nWe hate to see great marketing opportunities go to waste. To help you complete your order, we're offering 10% off your total.\n\nThis offer expires in 48 hours.`;
      incentive = {
        type: 'discount',
        value: '10%',
        description: '10% off your entire order'
      };
      break;
      
    case 'three_days':
      subject = 'Last chance - Your cart expires soon';
      personalizedMessage = `Hi ${userName},\n\nThis is a friendly reminder that your saved cart will expire in 24 hours. These media placements are popular and may not be available later.\n\nComplete your order now to avoid disappointment.`;
      break;
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now

  return {
    to: userEmail,
    subject,
    personalizedMessage,
    cartSummary,
    totalAmount: cart.totalAmount,
    currency: cart.currency,
    recoveryUrl: cart.recoveryUrl || '',
    expiresAt,
    incentive
  };
};

/**
 * Recovers cart from recovery token
 */
export const recoverCartFromToken = async (token: string): Promise<{
  success: boolean;
  cart?: AbandonedCart;
  error?: string;
}> => {
  try {
    // TODO: Replace with server-side token validation
    // const response = await fetch('/api/cart/validate-recovery-token', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ token })
    // });
    // const validation = await response.json();
    // if (!validation.valid) {
    //   return { success: false, error: validation.error };
    // }
    // const cartId = validation.cartId;
    
    // TEMPORARY: Insecure client-side validation - replace with server validation
    console.warn('Using insecure client-side token validation. Replace with server-side implementation.');
    const decoded = atob(token);
    const [cartId] = decoded.split(':');
    
    const cart = abandonedCarts.get(cartId);
    if (!cart) {
      return {
        success: false,
        error: 'Cart not found or has expired'
      };
    }

    // Check if cart has expired (7 days)
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    if (new Date(cart.abandonedAt).getTime() < weekAgo) {
      cart.status = 'expired';
      abandonedCarts.set(cartId, cart);
      return {
        success: false,
        error: 'Cart has expired'
      };
    }

    console.log('🔄 Cart recovered from token:', cartId);
    return {
      success: true,
      cart
    };

  } catch (error) {
    return {
      success: false,
      error: 'Invalid recovery token'
    };
  }
};

/**
 * Marks cart as recovered
 */
export const markCartAsRecovered = (cartId: string): void => {
  const cart = abandonedCarts.get(cartId);
  if (cart) {
    cart.status = 'recovered';
    abandonedCarts.set(cartId, cart);
    
    console.log('✅ Cart marked as recovered:', cartId);
  }
};

/**
 * Gets abandoned cart statistics
 */
export const getAbandonmentStatistics = (): {
  totalAbandoned: number;
  recoveryRate: number;
  averageCartValue: number;
  topFailureReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  recoveryEffectiveness: {
    immediateRecovery: number;
    oneHourRecovery: number;
    oneDayRecovery: number;
    threeDayRecovery: number;
  };
} => {
  const carts = Array.from(abandonedCarts.values());
  const totalAbandoned = carts.length;
  const recovered = carts.filter(cart => cart.status === 'recovered').length;
  
  // Calculate average cart value
  const totalValue = carts.reduce((sum, cart) => sum + cart.totalAmount, 0);
  const averageValue = totalAbandoned > 0 ? totalValue / totalAbandoned : 0;

  // Top failure reasons
  const failureReasons = new Map<string, number>();
  carts.forEach(cart => {
    if (cart.errorCode) {
      failureReasons.set(cart.errorCode, (failureReasons.get(cart.errorCode) || 0) + 1);
    }
  });

  const topFailures = Array.from(failureReasons.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: totalAbandoned > 0 ? (count / totalAbandoned) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalAbandoned,
    recoveryRate: totalAbandoned > 0 ? (recovered / totalAbandoned) * 100 : 0,
    averageCartValue: averageValue,
    topFailureReasons: topFailures,
    recoveryEffectiveness: {
      immediateRecovery: 0, // Would need more detailed tracking
      oneHourRecovery: 0,
      oneDayRecovery: 0,
      threeDayRecovery: 0
    }
  };
};

/**
 * Cleans up expired carts
 */
export const cleanupExpiredCarts = (): void => {
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  for (const [cartId, cart] of abandonedCarts.entries()) {
    if (new Date(cart.abandonedAt).getTime() < weekAgo) {
      abandonedCarts.delete(cartId);
    }
  }
  
  console.log('🧹 Cleaned up expired carts. Active carts:', abandonedCarts.size);
};

/**
 * Cart recovery utilities interface
 */
export const cartRecovery = {
  // Core functions
  trackAbandonment: trackCartAbandonment,
  recoverFromToken: recoverCartFromToken,
  markRecovered: markCartAsRecovered,

  // Notifications
  sendRecoveryNotification,
  scheduleRecovery: scheduleRecoveryAttempt,

  // Management
  getStatistics: getAbandonmentStatistics,
  cleanup: cleanupExpiredCarts,
  getAbandonedCarts: () => Array.from(abandonedCarts.values()),

  // URL generation
  generateRecoveryUrl,
  createEmailData: createRecoveryEmailData
};

// Automatic cleanup every 6 hours - store interval ID for cleanup
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

// Only start interval if not already running
if (!cleanupIntervalId) {
  cleanupIntervalId = setInterval(cleanupExpiredCarts, 6 * 60 * 60 * 1000);
}

// Export cleanup function for module unloading
export const stopCleanupInterval = () => {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
};

// Start cleanup function for manual control
export const startCleanupInterval = (): ReturnType<typeof setInterval> => {
  stopCleanupInterval();
  cleanupIntervalId = setInterval(cleanupExpiredCarts, 6 * 60 * 60 * 1000);
  return cleanupIntervalId;
};

// Make cart recovery available globally in development
if (import.meta.env.DEV) {
  (window as any).cartRecovery = cartRecovery;
  console.log('🔧 Cart recovery available globally as: window.cartRecovery');
  console.log('📚 Usage examples:');
  console.log('  - cartRecovery.getStatistics() - View abandonment statistics');
  console.log('  - cartRecovery.getAbandonedCarts() - View all abandoned carts');
  console.log('  - cartRecovery.recoverFromToken(token) - Recover cart from URL');
}
