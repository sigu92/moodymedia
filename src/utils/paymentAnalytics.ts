/**
 * Payment Analytics and Logging System
 * 
 * Tracks payment failures, success rates, user behavior,
 * and provides insights for improving payment conversion.
 */

import { supabase } from '@/integrations/supabase/client';
import { ErrorDetails, ErrorContext } from './errorHandling';
import { RetrySession } from './paymentRetry';

export interface PaymentEvent {
  eventId: string;
  type: 'payment_started' | 'payment_succeeded' | 'payment_failed' | 'payment_retry' | 'payment_abandoned';
  timestamp: string;
  userId?: string;
  sessionId?: string;
  orderId?: string;
  paymentIntentId?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  errorCode?: string;
  errorCategory?: string;
  retryAttempt?: number;
  metadata?: Record<string, any>;
}

export interface PaymentAnalytics {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  successRate: number;
  averageRetryAttempts: number;
  topFailureReasons: Array<{
    errorCode: string;
    count: number;
    percentage: number;
  }>;
  failuresByCategory: Record<string, number>;
  conversionFunnel: {
    paymentStarted: number;
    paymentCompleted: number;
    abandonmentRate: number;
  };
  retryEffectiveness: {
    retriedPayments: number;
    retrySuccessRate: number;
    averageAttemptsToSuccess: number;
  };
}

export interface UserBehaviorMetrics {
  userId: string;
  totalAttempts: number;
  successfulPayments: number;
  failedPayments: number;
  averagePaymentAmount: number;
  preferredPaymentMethod?: string;
  lastPaymentDate?: string;
  averageRetryAttempts: number;
  commonFailureReasons: string[];
  abandonment: {
    cartAbandonments: number;
    paymentAbandonments: number;
    averageTimeToAbandon: number; // in minutes
  };
}

// In-memory analytics storage (in production, this would be a database)
const paymentEvents: PaymentEvent[] = [];
const userSessions = new Map<string, {
  startedAt: number;
  events: PaymentEvent[];
  completed: boolean;
}>();

/**
 * Tracks a payment event
 */
export const trackPaymentEvent = async (
  type: PaymentEvent['type'],
  context: {
    userId?: string;
    sessionId?: string;
    orderId?: string;
    paymentIntentId?: string;
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    errorDetails?: ErrorDetails;
    retryAttempt?: number;
    metadata?: Record<string, any>;
  },
  suppressSessionTracking: boolean = false
): Promise<void> => {
  const event: PaymentEvent = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    timestamp: new Date().toISOString(),
    ...context,
    errorCode: context.errorDetails?.code,
    errorCategory: context.errorDetails?.category,
  };

  // Store event
  paymentEvents.push(event);

  // Track user session (unless suppressed to prevent recursion)
  if (context.userId && context.sessionId && !suppressSessionTracking) {
    trackUserSession(context.userId, context.sessionId, event);
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Payment event tracked:', {
      type: event.type,
      userId: event.userId,
      sessionId: event.sessionId,
      amount: event.amount,
      errorCode: event.errorCode
    });
  }

  // In production, send to analytics service
  try {
    // Example: analytics.track(event.type, event);
    
    // Store in local storage for development
    if (process.env.NODE_ENV === 'development') {
      const stored = JSON.parse(localStorage.getItem('payment_analytics') || '[]');
      stored.push(event);
      
      // Keep only last 500 events
      if (stored.length > 500) {
        stored.splice(0, stored.length - 500);
      }
      
      localStorage.setItem('payment_analytics', JSON.stringify(stored));
    }
  } catch (error) {
    console.warn('Failed to store analytics event:', error);
  }
};

/**
 * Tracks user session behavior
 */
const trackUserSession = (userId: string, sessionId: string, event: PaymentEvent): void => {
  const sessionKey = `${userId}_${sessionId}`;
  
  if (!userSessions.has(sessionKey)) {
    userSessions.set(sessionKey, {
      startedAt: Date.now(),
      events: [],
      completed: false
    });
  }

  const session = userSessions.get(sessionKey)!;
  session.events.push(event);

  // Mark session as completed if payment succeeded
  if (event.type === 'payment_succeeded') {
    session.completed = true;
  }

  // Mark as abandoned if user hasn't completed payment in 30 minutes
  if (Date.now() - session.startedAt > 30 * 60 * 1000 && !session.completed) {
    trackPaymentEvent('payment_abandoned', {
      userId,
      sessionId,
      metadata: { sessionDuration: Date.now() - session.startedAt }
    }, true); // Suppress session tracking to prevent recursion
  }
};

/**
 * Calculates payment analytics from stored events
 */
export const calculatePaymentAnalytics = (
  startDate?: Date,
  endDate?: Date
): PaymentAnalytics => {
  let events = paymentEvents;

  // Filter by date range if provided
  if (startDate || endDate) {
    events = events.filter(event => {
      const eventDate = new Date(event.timestamp);
      if (startDate && eventDate < startDate) return false;
      if (endDate && eventDate > endDate) return false;
      return true;
    });
  }

  const totalPayments = events.filter(e => e.type === 'payment_started').length;
  const successfulPayments = events.filter(e => e.type === 'payment_succeeded').length;
  const failedPayments = events.filter(e => e.type === 'payment_failed').length;
  const retriedPayments = events.filter(e => e.type === 'payment_retry').length;
  const abandonedPayments = events.filter(e => e.type === 'payment_abandoned').length;

  // Calculate failure reasons
  const failureReasons = new Map<string, number>();
  const failureCategories = new Map<string, number>();
  
  events.filter(e => e.type === 'payment_failed').forEach(event => {
    if (event.errorCode) {
      failureReasons.set(event.errorCode, (failureReasons.get(event.errorCode) || 0) + 1);
    }
    if (event.errorCategory) {
      failureCategories.set(event.errorCategory, (failureCategories.get(event.errorCategory) || 0) + 1);
    }
  });

  const topFailureReasons = Array.from(failureReasons.entries())
    .map(([code, count]) => ({
      errorCode: code,
      count,
      percentage: failedPayments > 0 ? (count / failedPayments) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Calculate retry effectiveness
  const retrySuccesses = events.filter(e => 
    e.type === 'payment_succeeded' && (e.retryAttempt || 0) > 1
  ).length;

  return {
    totalPayments,
    successfulPayments,
    failedPayments,
    successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
    averageRetryAttempts: calculateAverageRetryAttempts(events),
    topFailureReasons,
    failuresByCategory: Object.fromEntries(failureCategories),
    conversionFunnel: {
      paymentStarted: totalPayments,
      paymentCompleted: successfulPayments,
      abandonmentRate: totalPayments > 0 ? (abandonedPayments / totalPayments) * 100 : 0
    },
    retryEffectiveness: {
      retriedPayments,
      retrySuccessRate: retriedPayments > 0 ? (retrySuccesses / retriedPayments) * 100 : 0,
      averageAttemptsToSuccess: calculateAverageAttemptsToSuccess(events)
    }
  };
};

/**
 * Calculates average retry attempts across all payments
 */
const calculateAverageRetryAttempts = (events: PaymentEvent[]): number => {
  const paymentSessions = new Map<string, number>();
  
  events.forEach(event => {
    if (event.sessionId && event.retryAttempt) {
      paymentSessions.set(event.sessionId, Math.max(
        paymentSessions.get(event.sessionId) || 0,
        event.retryAttempt
      ));
    }
  });

  const totalAttempts = Array.from(paymentSessions.values()).reduce((sum, attempts) => sum + attempts, 0);
  return paymentSessions.size > 0 ? totalAttempts / paymentSessions.size : 0;
};

/**
 * Calculates average attempts needed for successful payments
 */
const calculateAverageAttemptsToSuccess = (events: PaymentEvent[]): number => {
  const successfulSessions = new Map<string, number>();
  
  events.forEach(event => {
    if (event.type === 'payment_succeeded' && event.sessionId) {
      const attempts = event.retryAttempt || 1;
      successfulSessions.set(event.sessionId, attempts);
    }
  });

  const totalAttempts = Array.from(successfulSessions.values()).reduce((sum, attempts) => sum + attempts, 0);
  return successfulSessions.size > 0 ? totalAttempts / successfulSessions.size : 0;
};

/**
 * Gets user behavior metrics for a specific user
 */
export const getUserBehaviorMetrics = async (userId: string): Promise<UserBehaviorMetrics | null> => {
  const userEvents = paymentEvents.filter(event => event.userId === userId);
  
  if (userEvents.length === 0) {
    return null;
  }

  const paymentAttempts = userEvents.filter(e => e.type === 'payment_started').length;
  const successfulPayments = userEvents.filter(e => e.type === 'payment_succeeded').length;
  const failedPayments = userEvents.filter(e => e.type === 'payment_failed').length;
  const abandonments = userEvents.filter(e => e.type === 'payment_abandoned').length;

  // Calculate average payment amount
  const amounts = userEvents
    .filter(e => e.amount && e.type === 'payment_succeeded')
    .map(e => e.amount!);
  const averageAmount = amounts.length > 0 ? amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length : 0;

  // Find preferred payment method
  const paymentMethods = new Map<string, number>();
  userEvents.filter(e => e.paymentMethod).forEach(event => {
    paymentMethods.set(event.paymentMethod!, (paymentMethods.get(event.paymentMethod!) || 0) + 1);
  });
  const preferredMethod = paymentMethods.size > 0 ? 
    Array.from(paymentMethods.entries()).sort((a, b) => b[1] - a[1])[0][0] : undefined;

  // Calculate common failure reasons
  const failureReasons = new Map<string, number>();
  userEvents.filter(e => e.type === 'payment_failed' && e.errorCode).forEach(event => {
    failureReasons.set(event.errorCode!, (failureReasons.get(event.errorCode!) || 0) + 1);
  });
  const commonFailures = Array.from(failureReasons.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([code]) => code);

  // Calculate average time to abandon
  const userSess = Array.from(userSessions.values())
    .filter(session => session.events.some(e => e.userId === userId));
  const abandonedSessions = userSess.filter(session => 
    session.events.some(e => e.type === 'payment_abandoned')
  );
  const avgTimeToAbandon = abandonedSessions.length > 0 ?
    abandonedSessions.reduce((sum, session) => {
      const abandonEvent = session.events.find(e => e.type === 'payment_abandoned');
      const startEvent = session.events.find(e => e.type === 'payment_started');
      if (abandonEvent && startEvent) {
        return sum + (new Date(abandonEvent.timestamp).getTime() - new Date(startEvent.timestamp).getTime());
      }
      return sum;
    }, 0) / abandonedSessions.length / (60 * 1000) : 0; // Convert to minutes

  const lastPayment = userEvents
    .filter(e => e.type === 'payment_succeeded')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  return {
    userId,
    totalAttempts: paymentAttempts,
    successfulPayments,
    failedPayments,
    averagePaymentAmount: averageAmount,
    preferredPaymentMethod: preferredMethod,
    lastPaymentDate: lastPayment?.timestamp,
    averageRetryAttempts: calculateAverageRetryAttempts(userEvents),
    commonFailureReasons: commonFailures,
    abandonment: {
      cartAbandonments: 0, // Would need cart events to calculate
      paymentAbandonments: abandonments,
      averageTimeToAbandon: avgTimeToAbandon
    }
  };
};

/**
 * Generates analytics report for admin dashboard
 */
export const generateAnalyticsReport = (period: 'day' | 'week' | 'month' = 'week'): {
  summary: PaymentAnalytics;
  trends: Array<{
    date: string;
    successful: number;
    failed: number;
    abandoned: number;
  }>;
  insights: string[];
} => {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  const summary = calculatePaymentAnalytics(startDate, now);

  // Generate daily trends
  const trends = [];
  const daysInPeriod = period === 'day' ? 1 : period === 'week' ? 7 : 30;
  
  for (let i = daysInPeriod - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));
    
    const dayEvents = paymentEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= dayStart && eventDate <= dayEnd;
    });

    trends.push({
      date: dayStart.toISOString().split('T')[0],
      successful: dayEvents.filter(e => e.type === 'payment_succeeded').length,
      failed: dayEvents.filter(e => e.type === 'payment_failed').length,
      abandoned: dayEvents.filter(e => e.type === 'payment_abandoned').length
    });
  }

  // Generate insights
  const insights = [];
  
  if (summary.successRate < 80) {
    insights.push(`Payment success rate is ${summary.successRate.toFixed(1)}% - consider investigating common failure causes`);
  }
  
  if (summary.averageRetryAttempts > 2) {
    insights.push(`Users require an average of ${summary.averageRetryAttempts.toFixed(1)} attempts - review error handling`);
  }
  
  if (summary.conversionFunnel.abandonmentRate > 20) {
    insights.push(`${summary.conversionFunnel.abandonmentRate.toFixed(1)}% abandonment rate - consider UX improvements`);
  }
  
  if (summary.topFailureReasons.length > 0) {
    const topReason = summary.topFailureReasons[0];
    insights.push(`Most common failure: ${topReason.errorCode} (${topReason.percentage.toFixed(1)}% of failures)`);
  }

  return {
    summary,
    trends,
    insights
  };
};

/**
 * Exports analytics data for external analysis
 */
export const exportAnalyticsData = (format: 'json' | 'csv' = 'json'): string => {
  if (format === 'csv') {
    const headers = 'Event ID,Type,Timestamp,User ID,Session ID,Amount,Currency,Payment Method,Error Code,Error Category,Retry Attempt';
    const rows = paymentEvents.map(event => 
      [
        event.eventId,
        event.type,
        event.timestamp,
        event.userId || '',
        event.sessionId || '',
        event.amount || '',
        event.currency || '',
        event.paymentMethod || '',
        event.errorCode || '',
        event.errorCategory || '',
        event.retryAttempt || ''
      ].join(',')
    );
    
    return [headers, ...rows].join('\n');
  }

  return JSON.stringify(paymentEvents, null, 2);
};

/**
 * Payment analytics utilities interface
 */
export const paymentAnalytics = {
  // Event tracking
  track: trackPaymentEvent,

  // Analytics calculation
  calculate: calculatePaymentAnalytics,
  getUserMetrics: getUserBehaviorMetrics,
  generateReport: generateAnalyticsReport,

  // Data management
  export: exportAnalyticsData,
  getStoredEvents: () => [...paymentEvents],
  clearEvents: (options?: { force?: boolean }) => {
    // Create backup before clearing
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `payment_analytics_backup_${timestamp}`;
    
    const backupData = {
      events: [...paymentEvents],
      sessions: Array.from(userSessions.entries()),
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(backupKey, JSON.stringify(backupData));
      console.log(`📦 Analytics backup created: ${backupKey}`);
    } catch (error) {
      console.error('Failed to create analytics backup:', error);
      if (!options?.force) {
        throw new Error('Failed to create backup. Use { force: true } to clear without backup.');
      }
    }
    
    // Clear data
    paymentEvents.length = 0;
    userSessions.clear();
    localStorage.removeItem('payment_analytics');
    
    return { backupKey, backupSize: JSON.stringify(backupData).length };
  },

  // Development helpers
  getEventCount: () => paymentEvents.length,
  getSessionCount: () => userSessions.size
};

// Make payment analytics available globally in development
if (import.meta.env.DEV) {
  (window as any).paymentAnalytics = paymentAnalytics;
  console.log('🔧 Payment analytics available globally as: window.paymentAnalytics');
  console.log('📚 Usage examples:');
  console.log('  - paymentAnalytics.calculate() - Get payment analytics');
  console.log('  - paymentAnalytics.generateReport("week") - Generate weekly report');
  console.log('  - paymentAnalytics.export("csv") - Export data as CSV');
}
