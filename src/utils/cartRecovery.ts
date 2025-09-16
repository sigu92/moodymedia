/**
 * Cart Recovery System
 * Handles cart abandonment tracking and recovery
 */

export interface CartAbandonmentData {
  userId: string;
  sessionId: string;
  cartItems: any[];
  billingInfo?: any;
  errorDetails?: any;
  metadata?: {
    totalAmount: number;
    currency: string;
    lastAttemptAt: string;
    abandonmentReason?: string;
  };
}

export interface RecoveryCampaign {
  id: string;
  userId: string;
  sessionId: string;
  type: 'email' | 'push' | 'browser';
  status: 'pending' | 'sent' | 'opened' | 'clicked' | 'converted' | 'expired';
  scheduledAt: number;
  sentAt?: number;
  openedAt?: number;
  clickedAt?: number;
  convertedAt?: number;
  metadata?: Record<string, any>;
}

class CartRecoverySystem {
  private abandonments: CartAbandonmentData[] = [];
  private campaigns: RecoveryCampaign[] = [];
  private maxAbandonments: number = 500;

  /**
   * Track cart abandonment
   */
  async trackAbandonment(
    userId: string,
    sessionId: string,
    cartItems: any[],
    billingInfo?: any,
    errorDetails?: any,
    metadata?: {
      totalAmount: number;
      currency: string;
      lastAttemptAt: string;
    }
  ): Promise<void> {
    const abandonment: CartAbandonmentData = {
      userId,
      sessionId,
      cartItems,
      billingInfo,
      errorDetails,
      metadata: {
        ...metadata,
        abandonmentReason: this.determineAbandonmentReason(errorDetails),
        timestamp: new Date().toISOString()
      }
    };

    this.abandonments.push(abandonment);

    // Keep only recent abandonments
    if (this.abandonments.length > this.maxAbandonments) {
      this.abandonments = this.abandonments.slice(-this.maxAbandonments);
    }

    // Schedule recovery campaigns
    await this.scheduleRecoveryCampaigns(abandonment);

    console.log('Cart abandonment tracked:', {
      userId,
      sessionId,
      itemCount: cartItems.length,
      totalAmount: metadata?.totalAmount
    });
  }

  /**
   * Schedule recovery campaigns
   */
  private async scheduleRecoveryCampaigns(abandonment: CartAbandonmentData): Promise<void> {
    const { userId, sessionId, metadata } = abandonment;
    const now = Date.now();

    // Email campaign - immediate
    const emailCampaign: RecoveryCampaign = {
      id: `email_${sessionId}_${now}`,
      userId,
      sessionId,
      type: 'email',
      status: 'pending',
      scheduledAt: now + 60000, // 1 minute delay
      metadata: {
        campaignType: 'immediate',
        priority: 'high'
      }
    };

    // Push notification - 5 minutes
    const pushCampaign: RecoveryCampaign = {
      id: `push_${sessionId}_${now}`,
      userId,
      sessionId,
      type: 'push',
      status: 'pending',
      scheduledAt: now + 5 * 60 * 1000, // 5 minutes
      metadata: {
        campaignType: 'follow_up',
        priority: 'medium'
      }
    };

    // Browser notification - 15 minutes
    const browserCampaign: RecoveryCampaign = {
      id: `browser_${sessionId}_${now}`,
      userId,
      sessionId,
      type: 'browser',
      status: 'pending',
      scheduledAt: now + 15 * 60 * 1000, // 15 minutes
      metadata: {
        campaignType: 'final_reminder',
        priority: 'low'
      }
    };

    this.campaigns.push(emailCampaign, pushCampaign, browserCampaign);

    // Schedule the campaigns
    this.scheduleCampaign(emailCampaign);
    this.scheduleCampaign(pushCampaign);
    this.scheduleCampaign(browserCampaign);
  }

  /**
   * Schedule a single campaign
   */
  private scheduleCampaign(campaign: RecoveryCampaign): void {
    const delay = campaign.scheduledAt - Date.now();
    
    if (delay <= 0) {
      this.executeCampaign(campaign);
      return;
    }

    setTimeout(() => {
      this.executeCampaign(campaign);
    }, delay);
  }

  /**
   * Execute a recovery campaign
   */
  private async executeCampaign(campaign: RecoveryCampaign): Promise<void> {
    if (campaign.status !== 'pending') {
      return;
    }

    try {
      campaign.status = 'sent';
      campaign.sentAt = Date.now();

      // Find the abandonment data
      const abandonment = this.abandonments.find(a => a.sessionId === campaign.sessionId);
      if (!abandonment) {
        campaign.status = 'expired';
        return;
      }

      // Execute based on campaign type
      switch (campaign.type) {
        case 'email':
          await this.sendRecoveryEmail(campaign, abandonment);
          break;
        case 'push':
          await this.sendPushNotification(campaign, abandonment);
          break;
        case 'browser':
          await this.sendBrowserNotification(campaign, abandonment);
          break;
      }

      console.log(`Recovery campaign executed: ${campaign.type} for session ${campaign.sessionId}`);

    } catch (error) {
      console.error(`Failed to execute campaign ${campaign.id}:`, error);
      campaign.status = 'expired';
    }
  }

  /**
   * Send recovery email
   */
  private async sendRecoveryEmail(campaign: RecoveryCampaign, abandonment: CartAbandonmentData): Promise<void> {
    // In a real application, you would integrate with an email service
    console.log('Sending recovery email:', {
      userId: campaign.userId,
      sessionId: campaign.sessionId,
      itemCount: abandonment.cartItems.length,
      totalAmount: abandonment.metadata?.totalAmount
    });

    // Simulate email sending
    await this.delay(1000);
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(campaign: RecoveryCampaign, abandonment: CartAbandonmentData): Promise<void> {
    // In a real application, you would integrate with a push notification service
    console.log('Sending push notification:', {
      userId: campaign.userId,
      sessionId: campaign.sessionId,
      itemCount: abandonment.cartItems.length
    });

    // Simulate push notification
    await this.delay(500);
  }

  /**
   * Send browser notification
   */
  private async sendBrowserNotification(campaign: RecoveryCampaign, abandonment: CartAbandonmentData): Promise<void> {
    // Guard against non-browser environments (SSR/Node.js)
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      console.log('Browser notification skipped - not in browser environment');
      return;
    }

    try {
      // Check if Notification API is available and permission is granted
      if (Notification.permission === 'granted') {
        new Notification('Complete Your Purchase', {
          body: `You have ${abandonment.cartItems.length} items in your cart worth €${abandonment.metadata?.totalAmount || 0}`,
          icon: '/favicon.ico',
          tag: campaign.sessionId
        });
      } else {
        console.log('Browser notification skipped - permission not granted');
      }
    } catch (error) {
      console.error('Error sending browser notification:', error);
    }

    // Always log for server-side telemetry
    console.log('Sending browser notification:', {
      userId: campaign.userId,
      sessionId: campaign.sessionId,
      itemCount: abandonment.cartItems.length,
      environment: typeof window !== 'undefined' ? 'browser' : 'server'
    });
  }

  /**
   * Track campaign interaction
   */
  async trackCampaignInteraction(
    campaignId: string,
    interaction: 'opened' | 'clicked' | 'converted'
  ): Promise<void> {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      console.warn(`Campaign ${campaignId} not found`);
      return;
    }

    const now = Date.now();

    switch (interaction) {
      case 'opened':
        campaign.status = 'opened';
        campaign.openedAt = now;
        break;
      case 'clicked':
        campaign.status = 'clicked';
        campaign.clickedAt = now;
        break;
      case 'converted':
        campaign.status = 'converted';
        campaign.convertedAt = now;
        break;
    }

    console.log(`Campaign interaction tracked: ${interaction} for ${campaignId}`);
  }

  /**
   * Get abandonment statistics
   */
  getAbandonmentStats(): {
    totalAbandonments: number;
    recentAbandonments: number;
    recoveryRate: number;
    averageCartValue: number;
  } {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    const recentAbandonments = this.abandonments.filter(a => 
      new Date(a.metadata?.timestamp || 0).getTime() > oneDayAgo
    );

    const totalValue = this.abandonments.reduce((sum, a) => 
      sum + (a.metadata?.totalAmount || 0), 0
    );

    const averageCartValue = this.abandonments.length > 0 
      ? totalValue / this.abandonments.length 
      : 0;

    const convertedCampaigns = this.campaigns.filter(c => c.status === 'converted').length;
    const totalCampaigns = this.campaigns.length;
    const recoveryRate = totalCampaigns > 0 ? convertedCampaigns / totalCampaigns : 0;

    return {
      totalAbandonments: this.abandonments.length,
      recentAbandonments: recentAbandonments.length,
      recoveryRate,
      averageCartValue
    };
  }

  /**
   * Get user's abandonment history
   */
  getUserAbandonments(userId: string): CartAbandonmentData[] {
    return this.abandonments
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.metadata?.timestamp || 0).getTime() - new Date(a.metadata?.timestamp || 0).getTime());
  }

  /**
   * Clear old data
   */
  cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    
    // Remove old abandonments
    this.abandonments = this.abandonments.filter(a => {
      const timestamp = new Date(a.metadata?.timestamp || 0).getTime();
      return now - timestamp < maxAge;
    });

    // Remove old campaigns
    this.campaigns = this.campaigns.filter(c => {
      const timestamp = c.scheduledAt;
      return now - timestamp < maxAge;
    });

    console.log('Cart recovery data cleaned up');
  }

  /**
   * Determine abandonment reason
   */
  private determineAbandonmentReason(errorDetails?: any): string {
    if (!errorDetails) return 'user_action';

    if (errorDetails.category === 'user_action_required') {
      return 'user_action_required';
    }

    if (errorDetails.severity === 'high') {
      return 'technical_error';
    }

    if (errorDetails.category === 'payment') {
      return 'payment_issue';
    }

    return 'unknown';
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const cartRecovery = new CartRecoverySystem();