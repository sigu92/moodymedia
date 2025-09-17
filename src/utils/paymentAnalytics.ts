/**
 * Payment Analytics System
 * Tracks payment-related events and metrics
 */

export interface PaymentEvent {
  eventType: string;
  userId?: string;
  sessionId?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface PaymentMetrics {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  totalRevenue: number;
  averagePaymentAmount: number;
  conversionRate: number;
  topPaymentMethods: Array<{ method: string; count: number }>;
  dailyStats: Array<{ date: string; payments: number; revenue: number }>;
}

class PaymentAnalyticsSystem {
  private events: PaymentEvent[] = [];
  private maxEvents: number = 1000;

  /**
   * Track a payment event
   */
  async track(
    eventType: string,
    data: {
      userId?: string;
      sessionId?: string;
      amount?: number;
      currency?: string;
      paymentMethod?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<void> {
    const event: PaymentEvent = {
      eventType,
      userId: data.userId,
      sessionId: data.sessionId,
      amount: data.amount,
      currency: data.currency || 'EUR',
      paymentMethod: data.paymentMethod,
      metadata: data.metadata,
      timestamp: Date.now()
    };

    this.events.push(event);

    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('Payment Analytics Event:', event);
    }

    // In a real application, you would send this to your analytics service
    // await this.sendToAnalyticsService(event);
  }

  /**
   * Track payment initiation
   */
  async trackPaymentInitiated(
    userId: string,
    amount: number,
    currency: string = 'EUR',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.track('payment_initiated', {
      userId,
      amount,
      currency,
      metadata: {
        ...metadata,
        source: 'checkout'
      }
    });
  }

  /**
   * Track payment success
   */
  async trackPaymentSuccess(
    userId: string,
    sessionId: string,
    amount: number,
    paymentMethod: string,
    currency: string = 'EUR',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.track('payment_success', {
      userId,
      sessionId,
      amount,
      currency,
      paymentMethod,
      metadata: {
        ...metadata,
        success: true
      }
    });
  }

  /**
   * Track payment failure
   */
  async trackPaymentFailed(
    userId: string,
    sessionId: string,
    amount: number,
    error: string,
    currency: string = 'EUR',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.track('payment_failed', {
      userId,
      sessionId,
      amount,
      currency,
      metadata: {
        ...metadata,
        error,
        success: false
      }
    });
  }

  /**
   * Track cart abandonment
   */
  async trackCartAbandonment(
    userId: string,
    sessionId: string,
    amount: number,
    step: string,
    currency: string = 'EUR',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.track('cart_abandonment', {
      userId,
      sessionId,
      amount,
      currency,
      metadata: {
        ...metadata,
        abandonmentStep: step
      }
    });
  }

  /**
   * Track checkout completion
   */
  async trackCheckoutCompleted(
    userId: string,
    sessionId: string,
    amount: number,
    itemCount: number,
    currency: string = 'EUR',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.track('checkout_completed', {
      userId,
      sessionId,
      amount,
      currency,
      metadata: {
        ...metadata,
        itemCount,
        completionTime: Date.now()
      }
    });
  }

  /**
   * Get payment metrics
   */
  getMetrics(timeRange?: { start: number; end: number }): PaymentMetrics {
    let filteredEvents = this.events;

    if (timeRange) {
      filteredEvents = this.events.filter(
        event => event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
      );
    }

    const paymentEvents = filteredEvents.filter(e => 
      ['payment_initiated', 'payment_success', 'payment_failed'].includes(e.eventType)
    );

    const successfulPayments = paymentEvents.filter(e => e.eventType === 'payment_success');
    const failedPayments = paymentEvents.filter(e => e.eventType === 'payment_failed');

    const totalRevenue = successfulPayments.reduce((sum, e) => sum + (e.amount || 0), 0);
    const averagePaymentAmount = successfulPayments.length > 0 
      ? totalRevenue / successfulPayments.length 
      : 0;

    const conversionRate = paymentEvents.length > 0 
      ? successfulPayments.length / paymentEvents.length 
      : 0;

    // Group by payment method
    const paymentMethodCounts = new Map<string, number>();
    successfulPayments.forEach(e => {
      if (e.paymentMethod) {
        paymentMethodCounts.set(e.paymentMethod, (paymentMethodCounts.get(e.paymentMethod) || 0) + 1);
      }
    });

    const topPaymentMethods = Array.from(paymentMethodCounts.entries())
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count);

    // Daily stats (last 30 days)
    const dailyStats = this.getDailyStats(filteredEvents);

    return {
      totalPayments: paymentEvents.length,
      successfulPayments: successfulPayments.length,
      failedPayments: failedPayments.length,
      totalRevenue,
      averagePaymentAmount,
      conversionRate,
      topPaymentMethods,
      dailyStats
    };
  }

  /**
   * Get daily statistics
   */
  private getDailyStats(events: PaymentEvent[]): Array<{ date: string; payments: number; revenue: number }> {
    const dailyMap = new Map<string, { payments: number; revenue: number }>();

    events.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { payments: 0, revenue: 0 };
      
      existing.payments++;
      if (event.amount && event.eventType === 'payment_success') {
        existing.revenue += event.amount;
      }
      
      dailyMap.set(date, existing);
    });

    return Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: string, limit: number = 100): PaymentEvent[] {
    return this.events
      .filter(e => e.eventType === eventType)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get user payment history
   */
  getUserPaymentHistory(userId: string, limit: number = 50): PaymentEvent[] {
    return this.events
      .filter(e => e.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear all events (for testing)
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Export events for analysis
   */
  exportEvents(): PaymentEvent[] {
    return [...this.events];
  }

  /**
   * Import events (for testing or data migration)
   */
  importEvents(events: PaymentEvent[]): void {
    this.events = [...this.events, ...events].slice(-this.maxEvents);
  }
}

// Export singleton instance
export const paymentAnalytics = new PaymentAnalyticsSystem();