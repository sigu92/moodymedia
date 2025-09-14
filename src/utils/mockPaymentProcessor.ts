import { CheckoutFormData } from './checkoutUtils';

export interface MockPaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
  simulatedDelay?: number;
}

export interface MockPaymentProcessorOptions {
  simulateDelay?: boolean;
  simulateFailure?: boolean;
  failureReason?: 'insufficient_funds' | 'card_declined' | 'network_error' | 'timeout';
}

/**
 * Mock payment processor for testing purposes
 * Simulates different payment scenarios and provides realistic feedback
 */
export class MockPaymentProcessor {
  private static readonly SIMULATED_PROCESSING_TIME = 3000; // 3 seconds
  private static readonly FAILURE_RATE = 0.1; // 10% failure rate for testing
  private static enableRandomFailures = false; // Disabled by default for deterministic testing

  /**
   * Process a mock payment
   */
  static async processPayment(
    formData: CheckoutFormData,
    options: MockPaymentProcessorOptions = {}
  ): Promise<MockPaymentResult> {
    const {
      simulateDelay = true,
      simulateFailure = false,
      failureReason = 'card_declined'
    } = options;

    // Simulate network delay
    if (simulateDelay) {
      await new Promise(resolve => setTimeout(resolve, this.SIMULATED_PROCESSING_TIME));
    }

    // Simulate controlled failures for testing
    const shouldFail = simulateFailure || (this.enableRandomFailures && Math.random() < this.FAILURE_RATE);

    if (shouldFail) {
      return this.simulateFailure(failureReason);
    }

    // Validate required payment data
    if (!formData.paymentMethod?.type) {
      return {
        success: false,
        error: 'Payment method is required',
      };
    }

    if (formData.paymentMethod.type === 'stripe' && !formData.billingInfo) {
      return {
        success: false,
        error: 'Billing information is required for card payments',
      };
    }

    if (formData.paymentMethod.type === 'invoice' && !formData.paymentMethod.poNumber) {
      return {
        success: false,
        error: 'PO number is required for invoice payments',
      };
    }

    // Simulate successful payment
    return this.simulateSuccess(formData);
  }

  /**
   * Simulate a successful payment
   */
  private static simulateSuccess(formData: CheckoutFormData): MockPaymentResult {
    const paymentId = `mock_pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('Mock Payment Success:', {
      paymentId,
      paymentMethod: formData.paymentMethod?.type,
      amount: this.calculateMockAmount(formData),
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      paymentId,
      simulatedDelay: this.SIMULATED_PROCESSING_TIME,
    };
  }

  /**
   * Simulate a payment failure
   */
  private static simulateFailure(reason: string): MockPaymentResult {
    const errorMessages = {
      insufficient_funds: 'Payment declined: Insufficient funds',
      card_declined: 'Payment declined: Card was declined by issuer',
      network_error: 'Payment failed: Network connection error',
      timeout: 'Payment failed: Request timed out',
    };

    const errorMessage = errorMessages[reason as keyof typeof errorMessages] || 'Payment failed: Unknown error';

    console.log('Mock Payment Failure:', {
      reason,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      error: errorMessage,
      simulatedDelay: this.SIMULATED_PROCESSING_TIME,
    };
  }

  /**
   * Calculate mock payment amount for logging
   */
  private static calculateMockAmount(formData: CheckoutFormData): number {
    // This is a simplified calculation for demonstration
    if (!formData.cartItems || formData.cartItems.length === 0) {
      return 0;
    }

    // Mock calculation - in real implementation this would be more complex
    const baseAmount = formData.cartItems.length * 50; // Mock base price per item
    const vat = baseAmount * 0.25; // 25% VAT

    return Math.round((baseAmount + vat) * 100) / 100;
  }

  /**
   * Get available test scenarios for manual testing
   */
  static getTestScenarios() {
    return {
      success: {
        simulateDelay: true,
        simulateFailure: false,
      },
      failure_insufficient_funds: {
        simulateDelay: true,
        simulateFailure: true,
        failureReason: 'insufficient_funds' as const,
      },
      failure_card_declined: {
        simulateDelay: true,
        simulateFailure: true,
        failureReason: 'card_declined' as const,
      },
      failure_network_error: {
        simulateDelay: true,
        simulateFailure: true,
        failureReason: 'network_error' as const,
      },
      failure_timeout: {
        simulateDelay: true,
        simulateFailure: true,
        failureReason: 'timeout' as const,
      },
      fast_success: {
        simulateDelay: false,
        simulateFailure: false,
      },
    };
  }
}

/**
 * Utility function to simulate Stripe payment intent creation
 */
export const createMockPaymentIntent = async (
  amount: number,
  currency: string = 'EUR'
): Promise<{ clientSecret: string; paymentIntentId: string }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    clientSecret: `mock_cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    paymentIntentId: `mock_pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
};

/**
 * Utility function to simulate PayPal payment creation
 */
export const createMockPayPalPayment = async (
  amount: number,
  currency: string = 'EUR'
): Promise<{ approvalUrl: string; paymentId: string }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    approvalUrl: `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token=mock_${Date.now()}`,
    paymentId: `mock_paypal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
};
