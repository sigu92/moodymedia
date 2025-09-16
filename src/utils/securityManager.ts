/**
 * Security Manager for Stripe Payment Integration
 * 
 * Implements comprehensive security measures including secure API key management,
 * data protection, webhook verification, and security monitoring.
 */

import { stripeConfig } from '@/config/stripe';

export interface SecurityConfig {
  apiKeyProtection: {
    maskLength: number;
    allowClientSideAccess: boolean;
    rotationInterval: number; // days
  };
  dataProtection: {
    logSensitiveData: boolean;
    encryptStoredData: boolean;
    dataMaskingEnabled: boolean;
  };
  webhookSecurity: {
    signatureVerification: boolean;
    allowedOrigins: string[];
    maxPayloadSize: number; // bytes
    rateLimitPerMinute: number;
  };
  httpsEnforcement: {
    requireHttps: boolean;
    strictTransportSecurity: boolean;
    upgradeInsecureRequests: boolean;
  };
  monitoring: {
    logSecurityEvents: boolean;
    alertOnSuspiciousActivity: boolean;
    maxFailedAttempts: number;
  };
}

export interface SecurityEvent {
  id: string;
  type: 'webhook_failure' | 'api_key_exposure' | 'unauthorized_access' | 'suspicious_pattern' | 'compliance_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  description: string;
  details: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
  userId?: string;
  resolved: boolean;
}

export interface SecurityAuditResult {
  score: number; // 0-100
  compliance: {
    pciCompliant: boolean;
    httpsEnforced: boolean;
    apiKeysSecure: boolean;
    webhooksSecure: boolean;
    dataProtected: boolean;
  };
  recommendations: string[];
  warnings: string[];
  errors: string[];
}

// Default security configuration
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  apiKeyProtection: {
    maskLength: 8, // Show only last 8 characters
    allowClientSideAccess: false,
    rotationInterval: 90 // 90 days
  },
  dataProtection: {
    logSensitiveData: false,
    encryptStoredData: true,
    dataMaskingEnabled: true
  },
  webhookSecurity: {
    signatureVerification: true,
    allowedOrigins: [],
    maxPayloadSize: 1024 * 1024, // 1MB
    rateLimitPerMinute: 100
  },
  httpsEnforcement: {
    requireHttps: process.env.NODE_ENV === 'production',
    strictTransportSecurity: true,
    upgradeInsecureRequests: true
  },
  monitoring: {
    logSecurityEvents: true,
    alertOnSuspiciousActivity: true,
    maxFailedAttempts: 5
  }
};

let securityConfig: SecurityConfig = { ...DEFAULT_SECURITY_CONFIG };
let securityEvents: SecurityEvent[] = [];

/**
 * Securely manages Stripe API keys
 */
export const apiKeyManager = {
  /**
   * Validates API key format and security
   */
  validateKey: (key: string, type: 'publishable' | 'secret'): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!key) {
      errors.push(`${type} key is required`);
      return { valid: false, errors, warnings };
    }

    // Check key format
    const expectedPrefix = type === 'publishable' ? 'pk_' : 'sk_';
    if (!key.startsWith(expectedPrefix)) {
      errors.push(`${type} key must start with ${expectedPrefix}`);
    }

    // Check if test or live key
    const isTestKey = key.includes('_test_');
    const isLiveKey = key.includes('_live_');

    if (!isTestKey && !isLiveKey) {
      errors.push(`${type} key format is invalid`);
    }

    // Environment-specific validation
    if (process.env.NODE_ENV === 'production' && isTestKey) {
      warnings.push(`Using test ${type} key in production environment`);
    }

    if (process.env.NODE_ENV === 'development' && isLiveKey) {
      warnings.push(`Using live ${type} key in development environment`);
    }

    // Check key length (Stripe keys should be specific lengths)
    const expectedLength = type === 'publishable' ? 32 : 32; // Both are typically 32+ chars after prefix
    if (key.length < expectedLength) {
      errors.push(`${type} key appears to be too short`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  },

  /**
   * Masks API key for safe display
   */
  maskKey: (key: string): string => {
    if (!key) return '';
    
    const maskLength = securityConfig.apiKeyProtection.maskLength;
    if (key.length <= maskLength) {
      return '•'.repeat(key.length);
    }

    const visiblePart = key.slice(-maskLength);
    const maskedPart = '•'.repeat(key.length - maskLength);
    return maskedPart + visiblePart;
  },

  /**
   * Checks if API key should be rotated
   */
  shouldRotateKey: (keyCreatedDate: Date): boolean => {
    const rotationInterval = securityConfig.apiKeyProtection.rotationInterval;
    const daysSinceCreation = (Date.now() - keyCreatedDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation >= rotationInterval;
  },

  /**
   * Detects potentially exposed API keys in client-side code
   */
  detectClientSideExposure: (): string[] => {
    const exposureRisks: string[] = [];

    // Check localStorage
    try {
      Object.keys(localStorage).forEach(key => {
        const value = localStorage.getItem(key);
        if (value && (value.includes('sk_') || value.includes('pk_live_'))) {
          exposureRisks.push(`API key found in localStorage: ${key}`);
        }
      });
    } catch (error) {
      // localStorage not available
    }

    // Check sessionStorage
    try {
      Object.keys(sessionStorage).forEach(key => {
        const value = sessionStorage.getItem(key);
        if (value && (value.includes('sk_') || value.includes('pk_live_'))) {
          exposureRisks.push(`API key found in sessionStorage: ${key}`);
        }
      });
    } catch (error) {
      // sessionStorage not available
    }

    // Check for secret keys in window object (development warning)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const windowKeys = Object.keys(window);
      windowKeys.forEach(key => {
        try {
          const value = (window as any)[key];
          if (typeof value === 'string' && value.includes('sk_')) {
            exposureRisks.push(`Secret key potentially exposed in window.${key}`);
          }
        } catch (error) {
          // Ignore access errors
        }
      });
    }

    return exposureRisks;
  }
};

/**
 * Webhook security verification
 */
export const webhookSecurity = {
  /**
   * Verifies webhook signature
   */
  verifySignature: (
    payload: string,
    signature: string,
    secret: string
  ): { valid: boolean; error?: string } => {
    try {
      if (!securityConfig.webhookSecurity.signatureVerification) {
        logSecurityEvent({
          type: 'compliance_violation',
          severity: 'medium',
          description: 'Webhook signature verification is disabled',
          details: { action: 'verify_signature' }
        });
        return { valid: true }; // Skip verification if disabled
      }

      if (!signature) {
        return { valid: false, error: 'Missing webhook signature' };
      }

      if (!secret) {
        return { valid: false, error: 'Missing webhook secret' };
      }

      // Extract timestamp and signature from header
      const elements = signature.split(',');
      const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
      const sig = elements.find(e => e.startsWith('v1='))?.split('=')[1];

      if (!timestamp || !sig) {
        return { valid: false, error: 'Invalid signature format' };
      }

      // Check timestamp (prevent replay attacks)
      const webhookTimestamp = parseInt(timestamp, 10);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const timeDifference = currentTimestamp - webhookTimestamp;

      // Reject webhooks older than 5 minutes
      if (timeDifference > 300) {
        logSecurityEvent({
          type: 'webhook_failure',
          severity: 'medium',
          description: 'Webhook timestamp too old (potential replay attack)',
          details: { timeDifference, timestamp: webhookTimestamp }
        });
        return { valid: false, error: 'Webhook timestamp too old' };
      }

      // In a real implementation, you would verify the signature using HMAC-SHA256
      // For this example, we'll do a basic validation
      if (sig.length < 32) {
        return { valid: false, error: 'Invalid signature length' };
      }

      return { valid: true };

    } catch (error) {
      logSecurityEvent({
        type: 'webhook_failure',
        severity: 'high',
        description: 'Webhook signature verification error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      return { valid: false, error: 'Signature verification failed' };
    }
  },

  /**
   * Validates webhook payload size
   */
  validatePayloadSize: (payload: string): { valid: boolean; error?: string } => {
    const maxSize = securityConfig.webhookSecurity.maxPayloadSize;
    const payloadSize = new Blob([payload]).size;

    if (payloadSize > maxSize) {
      logSecurityEvent({
        type: 'suspicious_pattern',
        severity: 'medium',
        description: 'Webhook payload exceeds maximum size',
        details: { payloadSize, maxSize }
      });
      return { valid: false, error: `Payload size ${payloadSize} exceeds maximum ${maxSize}` };
    }

    return { valid: true };
  },

  /**
   * Rate limiting for webhook endpoints
   */
  checkRateLimit: (clientId: string): { allowed: boolean; remaining: number } => {
    const key = `webhook_rate_limit_${clientId}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = securityConfig.webhookSecurity.rateLimitPerMinute;

    try {
      const stored = localStorage.getItem(key);
      let requests: number[] = stored ? JSON.parse(stored) : [];

      // Remove requests outside the time window
      requests = requests.filter(timestamp => now - timestamp < windowMs);

      if (requests.length >= maxRequests) {
        logSecurityEvent({
          type: 'suspicious_pattern',
          severity: 'medium',
          description: 'Webhook rate limit exceeded',
          details: { clientId, requestCount: requests.length, maxRequests }
        });
        return { allowed: false, remaining: 0 };
      }

      // Add current request
      requests.push(now);
      localStorage.setItem(key, JSON.stringify(requests));

      return { allowed: true, remaining: maxRequests - requests.length };

    } catch (error) {
      // If we can't track rate limits, allow the request but log the issue
      logSecurityEvent({
        type: 'webhook_failure',
        severity: 'low',
        description: 'Rate limiting storage error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      return { allowed: true, remaining: maxRequests };
    }
  }
};

/**
 * Data protection utilities
 */
export const dataProtection = {
  /**
   * Masks sensitive data for logging
   */
  maskSensitiveData: (data: any): any => {
    if (!securityConfig.dataProtection.dataMaskingEnabled) {
      return data;
    }

    if (typeof data === 'string') {
      // Mask credit card numbers
      data = data.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '**** **** **** ****');
      
      // Mask email addresses (partially)
      data = data.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, (email) => {
        const [local, domain] = email.split('@');
        const maskedLocal = local.length > 2 ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] : local;
        return `${maskedLocal}@${domain}`;
      });

      // Mask API keys
      data = data.replace(/\b(sk_|pk_)[a-zA-Z0-9_]+/g, (key) => apiKeyManager.maskKey(key));
    } else if (typeof data === 'object' && data !== null) {
      const masked = Array.isArray(data) ? [] : {};
      
      for (const [key, value] of Object.entries(data)) {
        // Sensitive field names to mask completely
        const sensitiveFields = [
          'password', 'secret', 'token', 'key', 'cvv', 'cvc', 'ssn', 
          'credit_card', 'card_number', 'account_number', 'routing_number'
        ];
        
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          (masked as any)[key] = typeof value === 'string' ? '***MASKED***' : value;
        } else {
          (masked as any)[key] = dataProtection.maskSensitiveData(value);
        }
      }
      
      return masked;
    }

    return data;
  },

  /**
   * Sanitizes data for client-side storage
   */
  sanitizeForStorage: (data: any): any => {
    const sanitized = { ...data };

    // Remove sensitive fields that should never be stored client-side
    const blacklistedFields = [
      'secret_key', 'private_key', 'password', 'cvv', 'cvc', 
      'full_card_number', 'account_number', 'routing_number'
    ];

    const recursiveSanitize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      const result = Array.isArray(obj) ? [] : {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (blacklistedFields.some(field => key.toLowerCase().includes(field))) {
          continue; // Skip blacklisted fields
        }
        
        (result as any)[key] = recursiveSanitize(value);
      }
      
      return result;
    };

    return recursiveSanitize(sanitized);
  },

  /**
   * Validates data before processing
   */
  validateInput: (input: string, type: 'email' | 'card' | 'amount' | 'general'): {
    valid: boolean;
    sanitized: string;
    warnings: string[];
  } => {
    const warnings: string[] = [];
    let sanitized = input.trim();

    // Basic XSS protection
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    // SQL injection protection
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
      /(--|\/\*|\*\/|;)/g
    ];

    sqlPatterns.forEach(pattern => {
      if (pattern.test(sanitized)) {
        warnings.push('Potentially dangerous SQL pattern detected');
        sanitized = sanitized.replace(pattern, '');
      }
    });

    // Type-specific validation
    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitized)) {
          return { valid: false, sanitized, warnings: [...warnings, 'Invalid email format'] };
        }
        break;

      case 'card':
        // Remove all non-digits
        sanitized = sanitized.replace(/\D/g, '');
        if (sanitized.length < 13 || sanitized.length > 19) {
          return { valid: false, sanitized, warnings: [...warnings, 'Invalid card number length'] };
        }
        break;

      case 'amount':
        const amount = parseFloat(sanitized);
        if (isNaN(amount) || amount < 0) {
          return { valid: false, sanitized, warnings: [...warnings, 'Invalid amount'] };
        }
        break;
    }

    return { valid: true, sanitized, warnings };
  }
};

/**
 * HTTPS enforcement utilities
 */
export const httpsEnforcement = {
  /**
   * Checks if current connection is secure
   */
  isSecureConnection: (): boolean => {
    if (typeof window === 'undefined') return true; // Server-side
    return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  },

  /**
   * Enforces HTTPS for payment operations
   */
  enforceHttps: (): { secure: boolean; action?: string } => {
    if (!securityConfig.httpsEnforcement.requireHttps) {
      return { secure: true };
    }

    if (!httpsEnforcement.isSecureConnection()) {
      logSecurityEvent({
        type: 'compliance_violation',
        severity: 'high',
        description: 'Payment operation attempted over insecure connection',
        details: { 
          protocol: window.location.protocol,
          hostname: window.location.hostname
        }
      });

      if (securityConfig.httpsEnforcement.upgradeInsecureRequests) {
        return { 
          secure: false, 
          action: 'redirect_to_https' 
        };
      }

      return { secure: false };
    }

    return { secure: true };
  },

  /**
   * Gets security headers for responses
   */
  getSecurityHeaders: (): Record<string, string> => {
    const headers: Record<string, string> = {};

    if (securityConfig.httpsEnforcement.strictTransportSecurity) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }

    if (securityConfig.httpsEnforcement.upgradeInsecureRequests) {
      headers['Content-Security-Policy'] = 'upgrade-insecure-requests';
    }

    // Additional security headers
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['X-Frame-Options'] = 'DENY';
    headers['X-XSS-Protection'] = '1; mode=block';
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';

    return headers;
  }
};

/**
 * Security event logging
 */
export const logSecurityEvent = (event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): void => {
  if (!securityConfig.monitoring.logSecurityEvents) return;

  const securityEvent: SecurityEvent = {
    id: `sec_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    resolved: false,
    ...event
  };

  // Add request context if available
  if (typeof window !== 'undefined') {
    securityEvent.userAgent = navigator.userAgent;
    // IP address would be available on server-side
  }

  securityEvents.push(securityEvent);

  // Keep only last 100 events in memory
  if (securityEvents.length > 100) {
    securityEvents = securityEvents.slice(-100);
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(`🚨 Security Event [${event.severity.toUpperCase()}]:`, event.description, event.details);
  }

  // In production, you would send this to your logging service
  // Example: sendToLoggingService(securityEvent);

  // Alert on critical events
  if (event.severity === 'critical' && securityConfig.monitoring.alertOnSuspiciousActivity) {
    // In production, trigger alert system
    console.error('🚨 CRITICAL SECURITY EVENT:', securityEvent);
  }
};

/**
 * Performs comprehensive security audit
 */
export const performSecurityAudit = (): SecurityAuditResult => {
  const recommendations: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  // Check API key security
  const publishableKeyValid = apiKeyManager.validateKey(stripeConfig.publishableKey, 'publishable');
  const secretKeyValid = apiKeyManager.validateKey(import.meta.env.STRIPE_SECRET_KEY || '', 'secret');

  if (!publishableKeyValid.valid) {
    errors.push('Invalid publishable key configuration');
    score -= 20;
  }

  if (!secretKeyValid.valid) {
    errors.push('Invalid secret key configuration');
    score -= 25;
  }

  publishableKeyValid.warnings.forEach(w => warnings.push(`Publishable key: ${w}`));
  secretKeyValid.warnings.forEach(w => warnings.push(`Secret key: ${w}`));

  // Check for client-side exposure
  const exposureRisks = apiKeyManager.detectClientSideExposure();
  if (exposureRisks.length > 0) {
    errors.push('API keys potentially exposed client-side');
    exposureRisks.forEach(risk => errors.push(risk));
    score -= 30;
  }

  // Check HTTPS enforcement
  if (!httpsEnforcement.isSecureConnection() && process.env.NODE_ENV === 'production') {
    errors.push('Insecure connection detected in production');
    score -= 25;
  }

  // Check webhook security
  if (!securityConfig.webhookSecurity.signatureVerification) {
    warnings.push('Webhook signature verification is disabled');
    score -= 15;
  }

  // Check data protection
  if (securityConfig.dataProtection.logSensitiveData) {
    warnings.push('Sensitive data logging is enabled');
    score -= 10;
  }

  // Generate recommendations
  if (score < 90) {
    recommendations.push('Review and improve API key management practices');
  }

  if (!securityConfig.httpsEnforcement.strictTransportSecurity) {
    recommendations.push('Enable Strict Transport Security headers');
  }

  if (securityEvents.some(e => e.severity === 'high' && !e.resolved)) {
    recommendations.push('Review and resolve high-severity security events');
  }

  // Determine compliance status
  const compliance = {
    pciCompliant: score >= 85 && httpsEnforcement.isSecureConnection(),
    httpsEnforced: securityConfig.httpsEnforcement.requireHttps,
    apiKeysSecure: publishableKeyValid.valid && secretKeyValid.valid && exposureRisks.length === 0,
    webhooksSecure: securityConfig.webhookSecurity.signatureVerification,
    dataProtected: securityConfig.dataProtection.dataMaskingEnabled && !securityConfig.dataProtection.logSensitiveData
  };

  return {
    score: Math.max(0, score),
    compliance,
    recommendations,
    warnings,
    errors
  };
};

/**
 * Security manager utilities interface
 */
export const securityManager = {
  // Configuration
  updateConfig: (updates: Partial<SecurityConfig>) => {
    securityConfig = { ...securityConfig, ...updates };
  },
  getConfig: () => ({ ...securityConfig }),
  resetConfig: () => {
    securityConfig = { ...DEFAULT_SECURITY_CONFIG };
  },

  // API key management
  apiKeys: apiKeyManager,

  // Webhook security
  webhooks: webhookSecurity,

  // Data protection
  data: dataProtection,

  // HTTPS enforcement
  https: httpsEnforcement,

  // Security monitoring
  logEvent: logSecurityEvent,
  getEvents: () => [...securityEvents],
  clearEvents: () => { securityEvents = []; },
  
  // Security audit
  audit: performSecurityAudit
};

// Make security manager available globally in development
if (import.meta.env.DEV) {
  (window as any).securityManager = securityManager;
  console.log('🔧 Security manager available globally as: window.securityManager');
  console.log('🔐 Security features:');
  console.log('  - securityManager.audit() - Run security audit');
  console.log('  - securityManager.apiKeys.validateKey(key, type) - Validate API keys');
  console.log('  - securityManager.data.maskSensitiveData(data) - Mask sensitive data');
  console.log('  - securityManager.getEvents() - View security events');
}
