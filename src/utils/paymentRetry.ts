/**
 * Payment Retry Mechanisms for Stripe Integration
 * 
 * Handles automatic and manual retry logic for failed payments,
 * including exponential backoff, circuit breaker patterns,
 * and user-controlled retry attempts.
 */

import { errorHandler, ErrorDetails, ErrorContext } from './errorHandling';
import { toast } from '@/hooks/use-toast';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  jitterEnabled: boolean;
  circuitBreakerThreshold: number;
}

export interface RetryAttempt {
  attemptNumber: number;
  timestamp: string;
  error: any;
  errorDetails: ErrorDetails;
  nextRetryAt?: string;
  userInitiated: boolean;
}

export interface RetrySession {
  sessionId: string;
  originalContext: ErrorContext;
  attempts: RetryAttempt[];
  config: RetryConfig;
  status: 'active' | 'succeeded' | 'failed' | 'abandoned' | 'circuit_broken';
  createdAt: string;
  lastAttemptAt: string;
  nextRetryAt?: string;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  exponentialBackoff: true,
  jitterEnabled: true,
  circuitBreakerThreshold: 5 // Break circuit after 5 consecutive failures
};

// In-memory retry sessions storage
const retrySessions = new Map<string, RetrySession>();
let circuitBreakerFailures = 0;
let circuitBreakerLastFailure = 0;

/**
 * Creates a new retry session for a failed payment
 */
export const createRetrySession = (
  originalError: any,
  context: ErrorContext,
  config: Partial<RetryConfig> = {}
): RetrySession => {
  const sessionId = `retry_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const errorDetails = errorHandler.map(originalError);
  
  const retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  const session: RetrySession = {
    sessionId,
    originalContext: context,
    attempts: [{
      attemptNumber: 1,
      timestamp: new Date().toISOString(),
      error: originalError,
      errorDetails,
      userInitiated: false
    }],
    config: retryConfig,
    status: 'active',
    createdAt: new Date().toISOString(),
    lastAttemptAt: new Date().toISOString()
  };

  // Calculate next retry time if applicable
  if (errorDetails.retryable && errorHandler.shouldRetry(errorDetails, 1)) {
    const delay = calculateDelay(1, errorDetails, retryConfig);
    session.nextRetryAt = new Date(Date.now() + delay).toISOString();
  }

  retrySessions.set(sessionId, session);
  
  console.log('🔄 Created retry session:', {
    sessionId,
    errorCode: errorDetails.code,
    retryable: errorDetails.retryable,
    nextRetryAt: session.nextRetryAt
  });

  return session;
};

/**
 * Calculates retry delay with exponential backoff and jitter
 */
export const calculateDelay = (
  attemptNumber: number,
  errorDetails: ErrorDetails,
  config: RetryConfig
): number => {
  let delay = config.baseDelay;

  // Apply exponential backoff
  if (config.exponentialBackoff) {
    delay = config.baseDelay * Math.pow(2, attemptNumber - 1);
  }

  // Add jitter to prevent thundering herd
  if (config.jitterEnabled) {
    const jitter = Math.random() * config.baseDelay * 0.5;
    delay += jitter;
  }

  // Cap at maximum delay
  delay = Math.min(delay, config.maxDelay);

  // Special handling for rate limit errors
  if (errorDetails.type === 'rate_limit_error') {
    delay = Math.max(delay, 60000); // Minimum 1 minute for rate limits
  }

  return delay;
};

/**
 * Checks if circuit breaker should prevent retries
 */
export const checkCircuitBreaker = (config: RetryConfig): boolean => {
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);

  // Reset circuit breaker if it's been 5 minutes since last failure
  if (circuitBreakerLastFailure < fiveMinutesAgo) {
    circuitBreakerFailures = 0;
  }

  return circuitBreakerFailures >= config.circuitBreakerThreshold;
};

/**
 * Records a circuit breaker failure
 */
export const recordCircuitBreakerFailure = (): void => {
  circuitBreakerFailures++;
  circuitBreakerLastFailure = Date.now();
  
  console.warn('⚡ Circuit breaker failure recorded:', {
    failures: circuitBreakerFailures,
    threshold: DEFAULT_RETRY_CONFIG.circuitBreakerThreshold
  });
};

/**
 * Attempts to retry a payment with the given session
 */
export const attemptRetry = async (
  sessionId: string,
  retryFunction: () => Promise<any>,
  userInitiated: boolean = false
): Promise<{
  success: boolean;
  result?: any;
  error?: any;
  shouldContinueRetrying: boolean;
  nextRetryAt?: string;
}> => {
  const session = retrySessions.get(sessionId);
  if (!session) {
    throw new Error('Retry session not found');
  }

  // Check circuit breaker
  if (checkCircuitBreaker(session.config)) {
    session.status = 'circuit_broken';
    retrySessions.set(sessionId, session);
    
    toast({
      title: "Service Temporarily Unavailable",
      description: "Payment processing is temporarily unavailable. Please try again later.",
      variant: "destructive",
      duration: 8000,
    });

    return {
      success: false,
      shouldContinueRetrying: false,
      error: new Error('Circuit breaker is open')
    };
  }

  const attemptNumber = session.attempts.length + 1;

  // Check if we've exceeded max attempts
  if (attemptNumber > session.config.maxAttempts) {
    session.status = 'failed';
    retrySessions.set(sessionId, session);
    
    return {
      success: false,
      shouldContinueRetrying: false,
      error: new Error('Maximum retry attempts exceeded')
    };
  }

  try {
    console.log(`🔄 Attempting retry ${attemptNumber} for session ${sessionId}`);
    
    // Show user feedback for manual retries
    if (userInitiated) {
      toast({
        title: "Retrying Payment",
        description: `Attempt ${attemptNumber} of ${session.config.maxAttempts}...`,
        duration: 3000,
      });
    }

    const result = await retryFunction();

    // Success - update session
    session.status = 'succeeded';
    session.lastAttemptAt = new Date().toISOString();
    session.attempts.push({
      attemptNumber,
      timestamp: new Date().toISOString(),
      error: null,
      errorDetails: errorHandler.map(null), // Success mapping
      userInitiated
    });
    
    retrySessions.set(sessionId, session);
    
    console.log('✅ Retry succeeded for session:', sessionId);
    
    if (userInitiated) {
      toast({
        title: "Payment Successful!",
        description: "Your payment has been processed successfully.",
        duration: 5000,
      });
    }

    return {
      success: true,
      result,
      shouldContinueRetrying: false
    };

  } catch (error) {
    console.log('❌ Retry failed for session:', sessionId, error);
    
    const errorDetails = errorHandler.map(error);
    
    // Record the attempt
    const attempt: RetryAttempt = {
      attemptNumber,
      timestamp: new Date().toISOString(),
      error,
      errorDetails,
      userInitiated
    };

    session.attempts.push(attempt);
    session.lastAttemptAt = new Date().toISOString();

    // Check if we should continue retrying
    const shouldContinue = errorDetails.retryable && 
                          attemptNumber < session.config.maxAttempts &&
                          errorHandler.shouldRetry(errorDetails, attemptNumber);

    if (shouldContinue && !userInitiated) {
      // Calculate next retry time
      const delay = calculateDelay(attemptNumber, errorDetails, session.config);
      session.nextRetryAt = new Date(Date.now() + delay).toISOString();
      attempt.nextRetryAt = session.nextRetryAt;
    } else {
      session.status = 'failed';
      session.nextRetryAt = undefined;
    }

    retrySessions.set(sessionId, session);

    // Record circuit breaker failure for non-user errors
    if (!userInitiated && errorDetails.severity === 'high') {
      recordCircuitBreakerFailure();
    }

    // Display error to user
    errorHandler.display(error, session.originalContext, {
      showToast: userInitiated,
      includeErrorCode: attemptNumber > 1
    });

    return {
      success: false,
      error,
      shouldContinueRetrying: shouldContinue,
      nextRetryAt: session.nextRetryAt
    };
  }
};

/**
 * Schedules automatic retry for a session
 */
export const scheduleAutoRetry = (
  sessionId: string,
  retryFunction: () => Promise<any>
): void => {
  const session = retrySessions.get(sessionId);
  if (!session || !session.nextRetryAt) {
    return;
  }

  const delay = new Date(session.nextRetryAt).getTime() - Date.now();
  if (delay <= 0) {
    return;
  }

  console.log(`⏰ Scheduling auto-retry for session ${sessionId} in ${delay}ms`);

  setTimeout(async () => {
    const currentSession = retrySessions.get(sessionId);
    if (!currentSession || currentSession.status !== 'active') {
      return;
    }

    try {
      await attemptRetry(sessionId, retryFunction, false);
    } catch (error) {
      console.error('Auto-retry failed:', error);
    }
  }, delay);
};

/**
 * Gets retry session information
 */
export const getRetrySession = (sessionId: string): RetrySession | null => {
  return retrySessions.get(sessionId) || null;
};

/**
 * Gets all active retry sessions
 */
export const getActiveRetrySessions = (): RetrySession[] => {
  return Array.from(retrySessions.values()).filter(session => 
    session.status === 'active'
  );
};

/**
 * Abandons a retry session (user cancelled)
 */
export const abandonRetrySession = (sessionId: string): void => {
  const session = retrySessions.get(sessionId);
  if (session) {
    session.status = 'abandoned';
    retrySessions.set(sessionId, session);
    
    console.log('🚫 Retry session abandoned:', sessionId);
  }
};

/**
 * Cleans up old retry sessions
 */
export const cleanupOldSessions = (): void => {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  for (const [sessionId, session] of retrySessions.entries()) {
    const sessionTime = new Date(session.createdAt).getTime();
    
    if (sessionTime < oneDayAgo) {
      retrySessions.delete(sessionId);
    }
  }
  
  console.log('🧹 Cleaned up old retry sessions. Active sessions:', retrySessions.size);
};

/**
 * Gets retry statistics for analytics
 */
export const getRetryStatistics = (): {
  totalSessions: number;
  activeSessions: number;
  successRate: number;
  averageAttempts: number;
  circuitBreakerStatus: {
    failures: number;
    isOpen: boolean;
    lastFailure: string | null;
  };
} => {
  const allSessions = Array.from(retrySessions.values());
  const activeSessions = allSessions.filter(s => s.status === 'active').length;
  const successfulSessions = allSessions.filter(s => s.status === 'succeeded').length;
  const totalAttempts = allSessions.reduce((sum, s) => sum + s.attempts.length, 0);

  return {
    totalSessions: allSessions.length,
    activeSessions,
    successRate: allSessions.length > 0 ? successfulSessions / allSessions.length : 0,
    averageAttempts: allSessions.length > 0 ? totalAttempts / allSessions.length : 0,
    circuitBreakerStatus: {
      failures: circuitBreakerFailures,
      isOpen: checkCircuitBreaker(DEFAULT_RETRY_CONFIG),
      lastFailure: circuitBreakerLastFailure > 0 ? new Date(circuitBreakerLastFailure).toISOString() : null
    }
  };
};

/**
 * Payment retry utilities interface
 */
export const paymentRetry = {
  // Core functions
  createSession: createRetrySession,
  attemptRetry,
  scheduleAutoRetry,

  // Session management
  getSession: getRetrySession,
  getActiveSessions: getActiveRetrySessions,
  abandonSession: abandonRetrySession,

  // Utilities
  calculateDelay,
  checkCircuitBreaker,
  getStatistics: getRetryStatistics,
  cleanup: cleanupOldSessions,

  // Configuration
  getDefaultConfig: () => ({ ...DEFAULT_RETRY_CONFIG }),
  updateDefaultConfig: (config: Partial<RetryConfig>) => {
    Object.assign(DEFAULT_RETRY_CONFIG, config);
  }
};

// Automatic cleanup every hour
setInterval(cleanupOldSessions, 60 * 60 * 1000);

// Make payment retry available globally in development
if (import.meta.env.DEV) {
  (window as any).paymentRetry = paymentRetry;
  console.log('🔧 Payment retry available globally as: window.paymentRetry');
  console.log('📚 Usage examples:');
  console.log('  - paymentRetry.createSession(error, context) - Create retry session');
  console.log('  - paymentRetry.attemptRetry(sessionId, fn, true) - Manual retry');
  console.log('  - paymentRetry.getStatistics() - View retry statistics');
}
