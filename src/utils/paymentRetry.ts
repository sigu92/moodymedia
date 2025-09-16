/**
 * Payment Retry System
 * Handles retry logic for failed payment attempts with persistent storage
 */

import { supabase } from '@/integrations/supabase/client';

export interface RetrySession {
  sessionId: string;
  maxAttempts: number;
  currentAttempt: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxDelay: number;
  retryableErrors: string[];
  createdAt: number;
  lastAttemptAt?: number;
  nextRetryAt?: number;
  status: 'active' | 'exhausted' | 'cancelled';
  errorContext?: any; // Store error context for debugging
  retryFunction?: string; // Store serialized function reference
}

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  retryableErrors?: string[];
}

class PaymentRetrySystem {
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map(); // Keep timeouts in memory for active retries

  /**
   * Helper method to fetch session from database
   */
  private async getSessionFromDB(sessionId: string): Promise<RetrySession | null> {
    try {
      const { data, error } = await supabase
        .from('payment_retry_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error || !data) {
        console.warn(`Session ${sessionId} not found in database:`, error);
        return null;
      }

      // Convert database format back to RetrySession format
      return {
        sessionId: data.session_id,
        maxAttempts: data.max_attempts,
        currentAttempt: data.current_attempt,
        retryDelay: data.retry_delay,
        backoffMultiplier: data.backoff_multiplier,
        maxDelay: data.max_delay,
        retryableErrors: data.retryable_errors || [],
        createdAt: new Date(data.created_at).getTime(),
        lastAttemptAt: data.last_attempt_at ? new Date(data.last_attempt_at).getTime() : undefined,
        nextRetryAt: data.next_retry_at ? new Date(data.next_retry_at).getTime() : undefined,
        status: data.status,
        errorContext: data.error_context
      };
    } catch (err) {
      console.error('Error fetching session from database:', err);
      return null;
    }
  }

  /**
   * Helper method to update session in database
   */
  private async updateSessionInDB(sessionId: string, updates: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('payment_retry_sessions')
        .update(updates)
        .eq('session_id', sessionId);

      if (error) {
        console.error(`Failed to update session ${sessionId}:`, error);
      }
    } catch (err) {
      console.error(`Error updating session ${sessionId}:`, err);
    }
  }

  /**
   * Create a retry session (persistent)
   */
  async createSession(
    error: any,
    context: any,
    options: RetryOptions = {}
  ): Promise<RetrySession> {
    const {
      maxAttempts = 3,
      initialDelay = 1000,
      backoffMultiplier = 2,
      maxDelay = 30000,
      retryableErrors = [
        'network_error',
        'timeout',
        'rate_limit',
        'temporary_failure',
        'service_unavailable'
      ]
    } = options;

    const sessionId = `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: RetrySession = {
      sessionId,
      maxAttempts,
      currentAttempt: 0,
      retryDelay: initialDelay,
      backoffMultiplier,
      maxDelay,
      retryableErrors,
      createdAt: Date.now(),
      status: 'active',
      errorContext: context
    };

    try {
      // Store session in database
      const { error: dbError } = await supabase
        .from('payment_retry_sessions')
        .insert({
          session_id: sessionId,
          max_attempts: maxAttempts,
          current_attempt: 0,
          retry_delay: initialDelay,
          backoff_multiplier: backoffMultiplier,
          max_delay: maxDelay,
          retryable_errors: retryableErrors,
          status: 'active',
          error_context: context,
          created_at: new Date(session.createdAt).toISOString()
        });

      if (dbError) {
        console.error('Failed to create persistent retry session:', dbError);
        // Fall back to in-memory session for critical functionality
        return session;
      }

      console.log(`Created persistent retry session: ${sessionId}`);
      return session;
    } catch (err) {
      console.error('Error creating retry session:', err);
      // Return session anyway for critical functionality
      return session;
    }
  }

  /**
   * Schedule an auto-retry
   */
  async scheduleAutoRetry(
    sessionId: string,
    retryFunction: () => Promise<any>
  ): Promise<void> {
    // Fetch session from database
    const session = await this.getSessionFromDB(sessionId);
    if (!session || session.status !== 'active') {
      console.warn(`Retry session ${sessionId} not found or not active`);
      return;
    }

    if (session.currentAttempt >= session.maxAttempts) {
      await this.updateSessionInDB(sessionId, { status: 'exhausted' });
      console.warn(`Max retry attempts reached for session ${sessionId}`);
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      session.retryDelay * Math.pow(session.backoffMultiplier, session.currentAttempt),
      session.maxDelay
    );

    const nextRetryAt = Date.now() + delay;
    const newAttempt = session.currentAttempt + 1;

    // Update session in database
    await this.updateSessionInDB(sessionId, {
      current_attempt: newAttempt,
      next_retry_at: new Date(nextRetryAt).toISOString(),
      last_attempt_at: new Date(Date.now()).toISOString()
    });

    console.log(`Scheduling retry ${newAttempt}/${session.maxAttempts} for session ${sessionId} in ${delay}ms`);

    // Clear existing timeout if any
    const existingTimeout = this.retryTimeouts.get(sessionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule the retry
    const timeout = setTimeout(async () => {
      try {
        // Update session with attempt timestamp
        await this.updateSessionInDB(sessionId, {
          last_attempt_at: new Date().toISOString()
        });

        console.log(`Executing retry ${newAttempt}/${session.maxAttempts} for session ${sessionId}`);

        const result = await retryFunction();

        if (result.success) {
          console.log(`Retry successful for session ${sessionId}`);
          await this.updateSessionInDB(sessionId, { status: 'cancelled' });
          this.retryTimeouts.delete(sessionId);
        } else {
          // Schedule next retry if not successful
          await this.scheduleAutoRetry(sessionId, retryFunction);
        }
      } catch (error) {
        console.error(`Retry failed for session ${sessionId}:`, error);

        // Check if error is retryable
        if (this.isRetryableError(error, session.retryableErrors)) {
          await this.scheduleAutoRetry(sessionId, retryFunction);
        } else {
          console.warn(`Non-retryable error for session ${sessionId}, cancelling retries`);
          await this.updateSessionInDB(sessionId, { status: 'cancelled' });
          this.retryTimeouts.delete(sessionId);
        }
      }
    }, delay);

    this.retryTimeouts.set(sessionId, timeout);
  }

  /**
   * Cancel a retry session
   */
  async cancelSession(sessionId: string): Promise<void> {
    // Update session status in database
    await this.updateSessionInDB(sessionId, { status: 'cancelled' });

    // Clear timeout if exists
    const timeout = this.retryTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(sessionId);
    }

    console.log(`Retry session ${sessionId} cancelled`);
  }

  /**
   * Get retry session status
   */
  async getSessionStatus(sessionId: string): Promise<RetrySession | null> {
    return await this.getSessionFromDB(sessionId);
  }

  /**
   * Get all active retry sessions
   */
  async getActiveSessions(): Promise<RetrySession[]> {
    try {
      const { data, error } = await supabase
        .from('payment_retry_sessions')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching active sessions:', error);
        return [];
      }

      if (!data) return [];

      // Convert database format back to RetrySession format
      return data.map(item => ({
        sessionId: item.session_id,
        maxAttempts: item.max_attempts,
        currentAttempt: item.current_attempt,
        retryDelay: item.retry_delay,
        backoffMultiplier: item.backoff_multiplier,
        maxDelay: item.max_delay,
        retryableErrors: item.retryable_errors || [],
        createdAt: new Date(item.created_at).getTime(),
        lastAttemptAt: item.last_attempt_at ? new Date(item.last_attempt_at).getTime() : undefined,
        nextRetryAt: item.next_retry_at ? new Date(item.next_retry_at).getTime() : undefined,
        status: item.status,
        errorContext: item.error_context
      }));
    } catch (err) {
      console.error('Error getting active sessions:', err);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - maxAge).toISOString();

      // Update expired sessions to cancelled status
      const { data, error } = await supabase
        .from('payment_retry_sessions')
        .update({ status: 'cancelled' })
        .lt('created_at', cutoffDate)
        .neq('status', 'cancelled')
        .select('session_id');

      if (error) {
        console.error('Error cleaning up expired sessions:', error);
        return;
      }

      if (data && data.length > 0) {
        // Clear any timeouts for expired sessions
        data.forEach(session => {
          const timeout = this.retryTimeouts.get(session.session_id);
          if (timeout) {
            clearTimeout(timeout);
            this.retryTimeouts.delete(session.session_id);
          }
        });

        console.log(`Cleaned up ${data.length} expired retry sessions`);
      }
    } catch (err) {
      console.error('Error in cleanupExpiredSessions:', err);
    }
  }

  /**
   * Get retry statistics
   */
  async getStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    exhaustedSessions: number;
    cancelledSessions: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('payment_retry_sessions')
        .select('status');

      if (error) {
        console.error('Error getting retry stats:', error);
        return {
          totalSessions: 0,
          activeSessions: 0,
          exhaustedSessions: 0,
          cancelledSessions: 0
        };
      }

      if (!data) {
        return {
          totalSessions: 0,
          activeSessions: 0,
          exhaustedSessions: 0,
          cancelledSessions: 0
        };
      }

      const stats = data.reduce((acc, session) => {
        acc.totalSessions++;
        switch (session.status) {
          case 'active':
            acc.activeSessions++;
            break;
          case 'exhausted':
            acc.exhaustedSessions++;
            break;
          case 'cancelled':
            acc.cancelledSessions++;
            break;
        }
        return acc;
      }, {
        totalSessions: 0,
        activeSessions: 0,
        exhaustedSessions: 0,
        cancelledSessions: 0
      });

      return stats;
    } catch (err) {
      console.error('Error getting retry statistics:', err);
      return {
        totalSessions: 0,
        activeSessions: 0,
        exhaustedSessions: 0,
        cancelledSessions: 0
      };
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any, retryableErrors: string[]): boolean {
    if (!error) return false;

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';

    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase()) ||
      errorCode.includes(retryableError.toLowerCase())
    );
  }
}

// Export singleton instance
export const paymentRetry = new PaymentRetrySystem();