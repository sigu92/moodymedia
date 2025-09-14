/**
 * Development Mock System for Stripe Integration
 * 
 * Provides comprehensive mock payment functionality for development
 * with test mode indicators, realistic simulation, and easy switching.
 */

import { stripeConfig } from '@/config/stripe';

export interface MockPaymentConfig {
  enabled: boolean;
  forceTestMode: boolean;
  simulateDelays: boolean;
  defaultDelay: number;
  failureRate: number; // Percentage (0-100)
  networkErrorRate: number; // Percentage (0-100)
  customScenarios: {
    [key: string]: MockPaymentScenario;
  };
}

export interface MockPaymentScenario {
  id: string;
  name: string;
  description: string;
  outcome: 'success' | 'failure' | 'network_error' | 'timeout';
  errorCode?: string;
  errorMessage?: string;
  delay?: number;
  metadata?: Record<string, any>;
}

export interface MockPaymentResult {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  customerId?: string;
  paymentIntentId?: string;
  receiptUrl?: string;
  receiptNumber?: string;
  error?: string;
  simulatedDelay?: number;
  testScenario?: string;
}

// Default mock configuration
const DEFAULT_MOCK_CONFIG: MockPaymentConfig = {
  enabled: process.env.NODE_ENV === 'development',
  forceTestMode: false,
  simulateDelays: true,
  defaultDelay: 2000,
  failureRate: 10, // 10% failure rate for realistic testing
  networkErrorRate: 2, // 2% network error rate
  customScenarios: {}
};

// Mock payment scenarios for testing
const MOCK_SCENARIOS: Record<string, MockPaymentScenario> = {
  success_fast: {
    id: 'success_fast',
    name: 'Quick Success',
    description: 'Successful payment with minimal delay',
    outcome: 'success',
    delay: 500
  },
  success_slow: {
    id: 'success_slow',
    name: 'Slow Success',
    description: 'Successful payment with realistic delay',
    outcome: 'success',
    delay: 3000
  },
  card_declined: {
    id: 'card_declined',
    name: 'Card Declined',
    description: 'Payment fails due to card decline',
    outcome: 'failure',
    errorCode: 'card_declined',
    errorMessage: 'Your card was declined.',
    delay: 1500
  },
  insufficient_funds: {
    id: 'insufficient_funds',
    name: 'Insufficient Funds',
    description: 'Payment fails due to insufficient funds',
    outcome: 'failure',
    errorCode: 'insufficient_funds',
    errorMessage: 'Your card has insufficient funds.',
    delay: 1200
  },
  expired_card: {
    id: 'expired_card',
    name: 'Expired Card',
    description: 'Payment fails due to expired card',
    outcome: 'failure',
    errorCode: 'expired_card',
    errorMessage: 'Your card has expired.',
    delay: 1000
  },
  network_error: {
    id: 'network_error',
    name: 'Network Error',
    description: 'Payment fails due to network issues',
    outcome: 'network_error',
    errorCode: 'network_error',
    errorMessage: 'Network connection error. Please try again.',
    delay: 5000
  },
  timeout: {
    id: 'timeout',
    name: 'Request Timeout',
    description: 'Payment fails due to timeout',
    outcome: 'timeout',
    errorCode: 'timeout',
    errorMessage: 'Request timed out. Please try again.',
    delay: 10000
  },
  authentication_required: {
    id: 'authentication_required',
    name: 'Authentication Required',
    description: 'Payment requires additional authentication',
    outcome: 'failure',
    errorCode: 'authentication_required',
    errorMessage: 'Additional authentication required.',
    delay: 2000
  }
};

// Current mock configuration
let mockConfig: MockPaymentConfig = { ...DEFAULT_MOCK_CONFIG };

/**
 * Checks if mock payments should be used
 */
export const shouldUseMockPayments = (): boolean => {
  // Force mock if explicitly enabled
  if (mockConfig.enabled) return true;
  
  // Use mock if Stripe is not properly configured
  if (!stripeConfig.isConfigured()) return true;
  
  // Use mock if forced test mode
  if (mockConfig.forceTestMode) return true;
  
  return false;
};

/**
 * Gets the current development mode status
 */
export const getDevelopmentStatus = (): {
  isDevelopment: boolean;
  isTestMode: boolean;
  isMockEnabled: boolean;
  stripeConfigured: boolean;
  environment: string;
} => {
  return {
    isDevelopment: process.env.NODE_ENV === 'development',
    isTestMode: stripeConfig.isTestMode,
    isMockEnabled: shouldUseMockPayments(),
    stripeConfigured: stripeConfig.isConfigured(),
    environment: process.env.NODE_ENV || 'unknown'
  };
};

/**
 * Simulates a Stripe checkout session creation
 */
export const mockCreateCheckoutSession = async (
  sessionData: {
    lineItems: any[];
    customerId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, any>;
  },
  scenario?: string
): Promise<MockPaymentResult> => {
  const startTime = Date.now();
  
  try {
    // Select scenario
    let selectedScenario: MockPaymentScenario;
    
    if (scenario && MOCK_SCENARIOS[scenario]) {
      selectedScenario = MOCK_SCENARIOS[scenario];
    } else {
      selectedScenario = selectRandomScenario();
    }
    
    console.log('🧪 Mock payment scenario:', selectedScenario.name);
    
    // Simulate processing delay
    const delay = selectedScenario.delay || mockConfig.defaultDelay;
    if (mockConfig.simulateDelays && delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Generate mock IDs
    const sessionId = `cs_test_mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const paymentIntentId = `pi_test_mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const customerId = sessionData.customerId || `cus_test_mock_${Math.random().toString(36).slice(2)}`;
    
    // Handle different outcomes
    switch (selectedScenario.outcome) {
      case 'success':
        return {
          success: true,
          sessionId,
          checkoutUrl: `${window.location.origin}/checkout/mock-success?session_id=${sessionId}`,
          customerId,
          paymentIntentId,
          receiptUrl: `https://stripe.com/receipts/mock_${sessionId}`,
          receiptNumber: `rcpt_mock_${Date.now()}`,
          simulatedDelay: Date.now() - startTime,
          testScenario: selectedScenario.id
        };
        
      case 'failure':
        return {
          success: false,
          error: selectedScenario.errorMessage || 'Payment failed',
          simulatedDelay: Date.now() - startTime,
          testScenario: selectedScenario.id
        };
        
      case 'network_error':
        throw new Error(selectedScenario.errorMessage || 'Network error');
        
      case 'timeout':
        throw new Error(selectedScenario.errorMessage || 'Request timeout');
        
      default:
        return {
          success: false,
          error: 'Unknown scenario outcome',
          simulatedDelay: Date.now() - startTime,
          testScenario: selectedScenario.id
        };
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Mock payment error',
      simulatedDelay: Date.now() - startTime
    };
  }
};

/**
 * Selects a random scenario based on configured failure rates
 */
const selectRandomScenario = (): MockPaymentScenario => {
  const random = Math.random() * 100;
  
  // Network errors (most rare)
  if (random < mockConfig.networkErrorRate) {
    return MOCK_SCENARIOS.network_error;
  }
  
  // Payment failures
  if (random < mockConfig.failureRate) {
    const failureScenarios = [
      MOCK_SCENARIOS.card_declined,
      MOCK_SCENARIOS.insufficient_funds,
      MOCK_SCENARIOS.expired_card,
      MOCK_SCENARIOS.authentication_required
    ];
    return failureScenarios[Math.floor(Math.random() * failureScenarios.length)];
  }
  
  // Success scenarios (most common)
  const successScenarios = [
    MOCK_SCENARIOS.success_fast,
    MOCK_SCENARIOS.success_slow
  ];
  return successScenarios[Math.floor(Math.random() * successScenarios.length)];
};

/**
 * Simulates payment verification
 */
export const mockVerifyPayment = async (sessionId: string): Promise<{
  success: boolean;
  orderData?: any;
  paymentDetails?: any;
  error?: string;
}> => {
  // Simulate verification delay
  if (mockConfig.simulateDelays) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Mock successful verification
  return {
    success: true,
    orderData: {
      sessionId,
      status: 'paid',
      amount: 5000, // $50.00
      currency: 'eur'
    },
    paymentDetails: {
      paymentMethod: 'card',
      last4: '4242',
      brand: 'visa',
      receiptUrl: `https://stripe.com/receipts/mock_${sessionId}`,
      receiptNumber: `rcpt_mock_${Date.now()}`
    }
  };
};

/**
 * Updates mock configuration
 */
export const updateMockConfig = (updates: Partial<MockPaymentConfig>): void => {
  mockConfig = { ...mockConfig, ...updates };
  
  // Store in localStorage for persistence
  localStorage.setItem('mock_payment_config', JSON.stringify(mockConfig));
  
  console.log('🧪 Mock payment config updated:', mockConfig);
};

/**
 * Loads mock configuration from localStorage
 */
export const loadMockConfig = (): MockPaymentConfig => {
  try {
    const stored = localStorage.getItem('mock_payment_config');
    if (stored) {
      const parsed = JSON.parse(stored);
      mockConfig = { ...DEFAULT_MOCK_CONFIG, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load mock config from localStorage:', error);
  }
  
  return mockConfig;
};

/**
 * Resets mock configuration to defaults
 */
export const resetMockConfig = (): void => {
  mockConfig = { ...DEFAULT_MOCK_CONFIG };
  localStorage.removeItem('mock_payment_config');
  console.log('🧪 Mock payment config reset to defaults');
};

/**
 * Gets available mock scenarios
 */
export const getMockScenarios = (): Record<string, MockPaymentScenario> => {
  return { ...MOCK_SCENARIOS, ...mockConfig.customScenarios };
};

/**
 * Adds a custom mock scenario
 */
export const addCustomScenario = (scenario: MockPaymentScenario): void => {
  mockConfig.customScenarios[scenario.id] = scenario;
  updateMockConfig(mockConfig);
  console.log('🧪 Custom scenario added:', scenario.name);
};

/**
 * Removes a custom mock scenario
 */
export const removeCustomScenario = (scenarioId: string): void => {
  delete mockConfig.customScenarios[scenarioId];
  updateMockConfig(mockConfig);
  console.log('🧪 Custom scenario removed:', scenarioId);
};

/**
 * Gets mock payment statistics
 */
export const getMockStats = (): {
  totalAttempts: number;
  successRate: number;
  failureRate: number;
  averageDelay: number;
  scenarioUsage: Record<string, number>;
} => {
  const attempts = JSON.parse(localStorage.getItem('mock_payment_attempts') || '[]');
  
  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      successRate: 0,
      failureRate: 0,
      averageDelay: 0,
      scenarioUsage: {}
    };
  }
  
  const successful = attempts.filter((a: any) => a.success).length;
  const totalDelay = attempts.reduce((sum: number, a: any) => sum + (a.delay || 0), 0);
  
  const scenarioUsage: Record<string, number> = {};
  attempts.forEach((a: any) => {
    if (a.scenario) {
      scenarioUsage[a.scenario] = (scenarioUsage[a.scenario] || 0) + 1;
    }
  });
  
  return {
    totalAttempts: attempts.length,
    successRate: (successful / attempts.length) * 100,
    failureRate: ((attempts.length - successful) / attempts.length) * 100,
    averageDelay: totalDelay / attempts.length,
    scenarioUsage
  };
};

/**
 * Records a mock payment attempt for statistics
 */
export const recordMockAttempt = (result: MockPaymentResult): void => {
  const attempts = JSON.parse(localStorage.getItem('mock_payment_attempts') || '[]');
  
  attempts.push({
    timestamp: new Date().toISOString(),
    success: result.success,
    scenario: result.testScenario,
    delay: result.simulatedDelay,
    error: result.error
  });
  
  // Keep only last 100 attempts
  if (attempts.length > 100) {
    attempts.splice(0, attempts.length - 100);
  }
  
  localStorage.setItem('mock_payment_attempts', JSON.stringify(attempts));
};

/**
 * Development mock system utilities interface
 */
export const developmentMockSystem = {
  // Configuration
  shouldUseMock: shouldUseMockPayments,
  getStatus: getDevelopmentStatus,
  updateConfig: updateMockConfig,
  loadConfig: loadMockConfig,
  resetConfig: resetMockConfig,

  // Mock payment operations
  createSession: mockCreateCheckoutSession,
  verifyPayment: mockVerifyPayment,

  // Scenario management
  getScenarios: getMockScenarios,
  addScenario: addCustomScenario,
  removeScenario: removeCustomScenario,

  // Statistics and monitoring
  getStats: getMockStats,
  recordAttempt: recordMockAttempt,

  // Development helpers
  getCurrentConfig: () => mockConfig,
  clearStats: () => localStorage.removeItem('mock_payment_attempts')
};

// Initialize mock config on load
loadMockConfig();

// Make development mock system available globally in development
if (import.meta.env.DEV) {
  (window as any).developmentMockSystem = developmentMockSystem;
  console.log('🔧 Development mock system available globally as: window.developmentMockSystem');
  console.log('📚 Usage examples:');
  console.log('  - developmentMockSystem.updateConfig({failureRate: 50}) - Set 50% failure rate');
  console.log('  - developmentMockSystem.createSession(data, "card_declined") - Test specific scenario');
  console.log('  - developmentMockSystem.getStats() - View testing statistics');
}
