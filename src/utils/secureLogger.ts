/**
 * Secure Logger for Stripe Payment Integration
 * 
 * Implements secure logging practices with sensitive data protection,
 * audit trails, and compliance-ready log management.
 */

import { securityManager } from './securityManager';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  environment: string;
  sensitive: boolean;
  piiMasked: boolean;
}

export interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  maskSensitiveData: boolean;
  includeStackTrace: boolean;
  maxLogSize: number; // MB
  retentionDays: number;
  encryptLogs: boolean;
  categories: {
    payment: boolean;
    security: boolean;
    webhook: boolean;
    error: boolean;
    audit: boolean;
    performance: boolean;
  };
}

// Log level hierarchy for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4
};

// Default logger configuration
const DEFAULT_CONFIG: LoggerConfig = {
  enabled: true,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  maskSensitiveData: true,
  includeStackTrace: process.env.NODE_ENV !== 'production',
  maxLogSize: 10, // 10 MB
  retentionDays: 30,
  encryptLogs: process.env.NODE_ENV === 'production',
  categories: {
    payment: true,
    security: true,
    webhook: true,
    error: true,
    audit: true,
    performance: process.env.NODE_ENV !== 'production'
  }
};

let loggerConfig: LoggerConfig = { ...DEFAULT_CONFIG };
let logEntries: LogEntry[] = [];

/**
 * Sensitive data patterns for detection and masking
 */
const SENSITIVE_PATTERNS = {
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  apiKey: /\b(sk_|pk_)[a-zA-Z0-9_]+/g,
  webhookSecret: /whsec_[a-zA-Z0-9_]+/g,
  token: /\b[A-Za-z0-9_-]{20,}\b/g
};

/**
 * PII (Personally Identifiable Information) fields that should be masked
 */
const PII_FIELDS = [
  'email', 'phone', 'address', 'name', 'firstName', 'lastName',
  'creditCard', 'cardNumber', 'cvv', 'cvc', 'ssn', 'dob',
  'password', 'token', 'apiKey', 'secret', 'key'
];

/**
 * Detects if data contains sensitive information
 */
const containsSensitiveData = (data: any): boolean => {
  if (typeof data === 'string') {
    return Object.values(SENSITIVE_PATTERNS).some(pattern => pattern.test(data));
  }

  if (typeof data === 'object' && data !== null) {
    const jsonString = JSON.stringify(data);
    return Object.values(SENSITIVE_PATTERNS).some(pattern => pattern.test(jsonString)) ||
           Object.keys(data).some(key => PII_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase())));
  }

  return false;
};

/**
 * Masks sensitive data for safe logging
 */
const maskSensitiveData = (data: any): any => {
  if (!loggerConfig.maskSensitiveData) {
    return data;
  }

  return securityManager.data.maskSensitiveData(data);
};

/**
 * Creates a log entry with proper formatting and security measures
 */
const createLogEntry = (
  level: LogLevel,
  category: string,
  message: string,
  data?: any,
  context?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
  }
): LogEntry => {
  const timestamp = new Date().toISOString();
  const id = `log_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  // Check if data contains sensitive information
  const sensitive = containsSensitiveData(data) || containsSensitiveData(message);
  
  // Mask sensitive data if enabled
  const maskedData = sensitive ? maskSensitiveData(data) : data;
  const maskedMessage = sensitive ? maskSensitiveData(message) : message;

  return {
    id,
    timestamp,
    level,
    category,
    message: maskedMessage,
    data: maskedData,
    userId: context?.userId,
    sessionId: context?.sessionId,
    requestId: context?.requestId,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    environment: process.env.NODE_ENV || 'unknown',
    sensitive,
    piiMasked: sensitive && loggerConfig.maskSensitiveData
  };
};

/**
 * Checks if a log entry should be recorded based on configuration
 */
const shouldLog = (level: LogLevel, category: string): boolean => {
  if (!loggerConfig.enabled) return false;
  
  // Check log level
  if (LOG_LEVELS[level] < LOG_LEVELS[loggerConfig.level]) return false;
  
  // Check category filter
  const categoryKey = category.toLowerCase() as keyof typeof loggerConfig.categories;
  if (categoryKey in loggerConfig.categories && !loggerConfig.categories[categoryKey]) {
    return false;
  }
  
  return true;
};

/**
 * Stores log entry with rotation and cleanup
 */
const storeLogEntry = (entry: LogEntry): void => {
  logEntries.push(entry);
  
  // Implement log rotation based on size and retention
  const maxEntries = Math.floor((loggerConfig.maxLogSize * 1024 * 1024) / 1000); // Rough estimate
  if (logEntries.length > maxEntries) {
    logEntries = logEntries.slice(-Math.floor(maxEntries * 0.8)); // Keep 80% when rotating
  }
  
  // Remove old entries based on retention policy
  const retentionMs = loggerConfig.retentionDays * 24 * 60 * 60 * 1000;
  const cutoffTime = Date.now() - retentionMs;
  logEntries = logEntries.filter(entry => new Date(entry.timestamp).getTime() > cutoffTime);
  
  // In production, you would send logs to external service
  if (process.env.NODE_ENV === 'production') {
    // Example: sendToLoggingService(entry);
  }
};

/**
 * Core logging function
 */
const log = (
  level: LogLevel,
  category: string,
  message: string,
  data?: any,
  context?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
  }
): void => {
  if (!shouldLog(level, category)) return;
  
  const entry = createLogEntry(level, category, message, data, context);
  storeLogEntry(entry);
  
  // Console output for development
  if (process.env.NODE_ENV === 'development') {
    const consoleMethod = level === 'critical' || level === 'error' ? 'error' :
                         level === 'warn' ? 'warn' : 'log';
    
    console[consoleMethod](
      `[${entry.timestamp}] ${level.toUpperCase()} [${category}]:`,
      message,
      data ? (entry.sensitive ? '***SENSITIVE DATA MASKED***' : data) : ''
    );
  }
  
  // Log security events for critical and error levels
  if ((level === 'critical' || level === 'error') && category === 'security') {
    securityManager.logEvent({
      type: 'compliance_violation',
      severity: level === 'critical' ? 'critical' : 'high',
      description: message,
      details: entry.sensitive ? { maskedData: true } : data
    });
  }
};

/**
 * Payment-specific logging functions
 */
export const paymentLogger = {
  /**
   * Logs payment processing events
   */
  paymentProcessed: (
    orderId: string,
    amount: number,
    currency: string,
    paymentMethod: string,
    userId?: string
  ) => {
    log('info', 'payment', 'Payment processed successfully', {
      orderId,
      amount,
      currency,
      paymentMethod,
      // Explicitly exclude sensitive payment details
      cardDetails: '***MASKED***'
    }, { userId });
  },

  /**
   * Logs payment failures
   */
  paymentFailed: (
    orderId: string,
    error: string,
    errorCode?: string,
    userId?: string
  ) => {
    log('error', 'payment', 'Payment processing failed', {
      orderId,
      error,
      errorCode
    }, { userId });
  },

  /**
   * Logs refund operations
   */
  refundProcessed: (
    orderId: string,
    refundId: string,
    amount: number,
    reason: string,
    userId?: string
  ) => {
    log('info', 'payment', 'Refund processed', {
      orderId,
      refundId,
      amount,
      reason
    }, { userId });
  },

  /**
   * Logs checkout session creation
   */
  checkoutSessionCreated: (
    sessionId: string,
    amount: number,
    currency: string,
    userId?: string
  ) => {
    log('info', 'payment', 'Checkout session created', {
      sessionId,
      amount,
      currency
    }, { userId });
  }
};

/**
 * Security-specific logging functions
 */
export const securityLogger = {
  /**
   * Logs authentication events
   */
  authEvent: (event: string, userId?: string, success: boolean = true) => {
    log(success ? 'info' : 'warn', 'security', `Authentication event: ${event}`, {
      success,
      event
    }, { userId });
  },

  /**
   * Logs API key usage
   */
  apiKeyUsage: (keyType: 'publishable' | 'secret', operation: string, success: boolean = true) => {
    log('info', 'security', `API key usage: ${keyType}`, {
      keyType,
      operation,
      success,
      // Never log actual key values
      keyMasked: true
    });
  },

  /**
   * Logs webhook events
   */
  webhookEvent: (eventType: string, webhookId: string, success: boolean = true) => {
    log(success ? 'info' : 'error', 'webhook', `Webhook event: ${eventType}`, {
      eventType,
      webhookId,
      success
    });
  },

  /**
   * Logs security violations
   */
  securityViolation: (violation: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any) => {
    log(severity as LogLevel, 'security', `Security violation: ${violation}`, {
      violation,
      severity,
      details: maskSensitiveData(details)
    });
  },

  /**
   * Logs access attempts
   */
  accessAttempt: (resource: string, action: string, success: boolean, userId?: string) => {
    log(success ? 'info' : 'warn', 'security', `Access attempt: ${action} on ${resource}`, {
      resource,
      action,
      success
    }, { userId });
  }
};

/**
 * Audit-specific logging functions
 */
export const auditLogger = {
  /**
   * Logs data access events
   */
  dataAccess: (table: string, operation: 'read' | 'write' | 'delete', recordId?: string, userId?: string) => {
    log('info', 'audit', `Data access: ${operation} on ${table}`, {
      table,
      operation,
      recordId,
      timestamp: new Date().toISOString()
    }, { userId });
  },

  /**
   * Logs configuration changes
   */
  configChange: (setting: string, oldValue: any, newValue: any, userId?: string) => {
    log('info', 'audit', `Configuration changed: ${setting}`, {
      setting,
      oldValue: maskSensitiveData(oldValue),
      newValue: maskSensitiveData(newValue),
      timestamp: new Date().toISOString()
    }, { userId });
  },

  /**
   * Logs admin actions
   */
  adminAction: (action: string, target?: string, userId?: string) => {
    log('info', 'audit', `Admin action: ${action}`, {
      action,
      target,
      timestamp: new Date().toISOString()
    }, { userId });
  },

  /**
   * Logs compliance events
   */
  complianceEvent: (event: string, status: 'pass' | 'fail' | 'warning', details?: any) => {
    log(status === 'fail' ? 'error' : status === 'warning' ? 'warn' : 'info', 'audit', 
        `Compliance event: ${event}`, {
      event,
      status,
      details: maskSensitiveData(details),
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Performance logging functions
 */
export const performanceLogger = {
  /**
   * Logs performance metrics
   */
  metric: (name: string, value: number, unit: string, context?: any) => {
    log('debug', 'performance', `Performance metric: ${name}`, {
      name,
      value,
      unit,
      context,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Logs API response times
   */
  apiTiming: (endpoint: string, method: string, duration: number, statusCode: number) => {
    log('debug', 'performance', `API timing: ${method} ${endpoint}`, {
      endpoint,
      method,
      duration,
      statusCode,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Logs payment processing times
   */
  paymentTiming: (operation: string, duration: number, success: boolean) => {
    log('debug', 'performance', `Payment timing: ${operation}`, {
      operation,
      duration,
      success,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Log management functions
 */
export const logManager = {
  /**
   * Updates logger configuration
   */
  updateConfig: (updates: Partial<LoggerConfig>) => {
    const oldConfig = { ...loggerConfig };
    loggerConfig = { ...loggerConfig, ...updates };
    
    auditLogger.configChange('logger_config', oldConfig, loggerConfig);
  },

  /**
   * Gets current configuration
   */
  getConfig: () => ({ ...loggerConfig }),

  /**
   * Gets log entries with filtering
   */
  getLogs: (filters?: {
    level?: LogLevel;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    sensitive?: boolean;
  }) => {
    let filtered = [...logEntries];

    if (filters) {
      if (filters.level) {
        const minLevel = LOG_LEVELS[filters.level];
        filtered = filtered.filter(entry => LOG_LEVELS[entry.level] >= minLevel);
      }

      if (filters.category) {
        filtered = filtered.filter(entry => entry.category === filters.category);
      }

      if (filters.startDate) {
        filtered = filtered.filter(entry => new Date(entry.timestamp) >= filters.startDate!);
      }

      if (filters.endDate) {
        filtered = filtered.filter(entry => new Date(entry.timestamp) <= filters.endDate!);
      }

      if (filters.userId) {
        filtered = filtered.filter(entry => entry.userId === filters.userId);
      }

      if (filters.sensitive !== undefined) {
        filtered = filtered.filter(entry => entry.sensitive === filters.sensitive);
      }
    }

    return filtered;
  },

  /**
   * Exports logs for compliance/audit purposes
   */
  exportLogs: (format: 'json' | 'csv' = 'json') => {
    const logs = logManager.getLogs();
    
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'category', 'message', 'userId', 'sensitive'];
      const csvContent = [
        headers.join(','),
        ...logs.map(log => 
          headers.map(header => JSON.stringify(log[header as keyof LogEntry] || '')).join(',')
        )
      ].join('\n');
      
      return csvContent;
    }
    
    return JSON.stringify(logs, null, 2);
  },

  /**
   * Clears old logs
   */
  clearLogs: (olderThan?: Date) => {
    const cutoff = olderThan || new Date(Date.now() - (loggerConfig.retentionDays * 24 * 60 * 60 * 1000));
    const beforeCount = logEntries.length;
    
    logEntries = logEntries.filter(entry => new Date(entry.timestamp) > cutoff);
    
    const removedCount = beforeCount - logEntries.length;
    log('info', 'audit', `Cleared ${removedCount} old log entries`, { cutoff: cutoff.toISOString() });
  },

  /**
   * Gets log statistics
   */
  getStats: () => {
    const stats = {
      totalEntries: logEntries.length,
      byLevel: {} as Record<LogLevel, number>,
      byCategory: {} as Record<string, number>,
      sensitiveEntries: 0,
      oldestEntry: logEntries.length > 0 ? logEntries[0].timestamp : null,
      newestEntry: logEntries.length > 0 ? logEntries[logEntries.length - 1].timestamp : null
    };

    logEntries.forEach(entry => {
      stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
      stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;
      if (entry.sensitive) stats.sensitiveEntries++;
    });

    return stats;
  }
};

/**
 * Secure logger utilities interface
 */
export const secureLogger = {
  // Core logging
  log,

  // Specialized loggers
  payment: paymentLogger,
  security: securityLogger,
  audit: auditLogger,
  performance: performanceLogger,

  // Log management
  manager: logManager,

  // Utility functions
  maskData: maskSensitiveData,
  hasSensitiveData: containsSensitiveData
};

// Make secure logger available globally in development
if (import.meta.env.DEV) {
  (window as any).secureLogger = secureLogger;
  console.log('🔧 Secure logger available globally as: window.secureLogger');
  console.log('📚 Usage examples:');
  console.log('  - secureLogger.payment.paymentProcessed(orderId, amount, currency, method, userId)');
  console.log('  - secureLogger.security.securityViolation(violation, severity, details)');
  console.log('  - secureLogger.manager.getLogs({level: "error", category: "payment"})');
  console.log('  - secureLogger.manager.getStats() - View logging statistics');
}
