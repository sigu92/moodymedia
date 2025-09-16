// Stub Stripe configuration - all Stripe functionality removed
export const stripeConfig = {
  mode: 'test',
  getWarnings: () => [],
  isConfigured: () => false,
  getPublishableKey: () => '',
  getSecretKey: () => '',
};

/**
 * Validate Stripe environment configuration
 * TODO: Implement proper Stripe environment validation
 */
export function validateStripeEnvironment(): { isValid: boolean; errors: string[]; warnings: string[] } {
  console.warn('validateStripeEnvironment: Stub implementation - needs proper validation');

  return {
    isValid: false,
    errors: ['Stripe configuration not implemented yet'],
    warnings: ['Using stub Stripe implementation']
  };
}