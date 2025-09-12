/**
 * Utility functions for calculating marketplace margins and prices
 */

export interface MarginCalculation {
  originalPrice: number; // Publisher's asking price
  finalPrice: number; // Marketplace selling price
  marginAmount: number; // Amount added/subtracted
  marginPercentage: number; // Percentage markup
  profit: number; // Final profit amount
}

export interface MarginType {
  type: 'fixed' | 'percentage';
  value: number;
}

/**
 * Calculate marketplace price with fixed amount margin
 * @param askingPrice - Publisher's asking price
 * @param fixedAmount - Amount to add (e.g., 100 for €100 markup)
 * @returns MarginCalculation object
 */
export function calculateFixedMargin(askingPrice: number, fixedAmount: number): MarginCalculation {
  const finalPrice = askingPrice + fixedAmount;
  const marginAmount = fixedAmount;
  const marginPercentage = askingPrice > 0 ? (fixedAmount / askingPrice) * 100 : 0;
  const profit = fixedAmount;

  return {
    originalPrice: askingPrice,
    finalPrice: Math.max(0, finalPrice), // Ensure non-negative
    marginAmount,
    marginPercentage,
    profit
  };
}

/**
 * Calculate marketplace price with percentage markup
 * @param askingPrice - Publisher's asking price
 * @param percentage - Markup percentage (e.g., 200 for 200% markup)
 * @returns MarginCalculation object
 */
export function calculatePercentageMargin(askingPrice: number, percentage: number): MarginCalculation {
  const markupMultiplier = 1 + (percentage / 100);
  const finalPrice = askingPrice * markupMultiplier;
  const marginAmount = finalPrice - askingPrice;
  const marginPercentage = percentage;
  const profit = marginAmount;

  return {
    originalPrice: askingPrice,
    finalPrice: Math.max(0, finalPrice), // Ensure non-negative
    marginAmount,
    marginPercentage,
    profit
  };
}

/**
 * Calculate marketplace price using MarginType configuration
 * @param askingPrice - Publisher's asking price
 * @param margin - Margin configuration
 * @returns MarginCalculation object
 */
export function calculateMargin(askingPrice: number, margin: MarginType): MarginCalculation {
  if (margin.type === 'fixed') {
    return calculateFixedMargin(askingPrice, margin.value);
  } else {
    return calculatePercentageMargin(askingPrice, margin.value);
  }
}

/**
 * Validate margin calculation inputs
 * @param askingPrice - Publisher's asking price
 * @param margin - Margin configuration
 * @returns Validation result
 */
export function validateMarginCalculation(askingPrice: number, margin: MarginType): { isValid: boolean; error?: string } {
  // Validate asking price
  if (typeof askingPrice !== 'number' || isNaN(askingPrice)) {
    return { isValid: false, error: 'Publisher asking price must be a valid number' };
  }

  if (askingPrice < 0) {
    return { isValid: false, error: 'Publisher asking price cannot be negative' };
  }

  if (askingPrice > 100000) {
    return { isValid: false, error: 'Publisher asking price cannot exceed €100,000' };
  }

  // Validate margin type
  if (!['fixed', 'percentage'].includes(margin.type)) {
    return { isValid: false, error: 'Margin type must be "fixed" or "percentage"' };
  }

  // Validate margin value
  if (typeof margin.value !== 'number' || isNaN(margin.value)) {
    return { isValid: false, error: 'Margin value must be a valid number' };
  }

  // Type-specific validation
  if (margin.type === 'fixed') {
    if (margin.value < -10000) {
      return { isValid: false, error: 'Fixed margin cannot be less than -€10,000' };
    }
    if (margin.value > 50000) {
      return { isValid: false, error: 'Fixed margin cannot exceed €50,000' };
    }
  } else if (margin.type === 'percentage') {
    if (margin.value < -50) {
      return { isValid: false, error: 'Percentage margin cannot be less than -50%' };
    }
    if (margin.value > 1000) {
      return { isValid: false, error: 'Percentage margin cannot exceed 1000%' };
    }
  }

  // Business logic validation
  const calculation = calculateMargin(askingPrice, margin);
  const finalPrice = calculation.finalPrice;

  // Ensure final price is reasonable
  if (finalPrice < 1) {
    return { isValid: false, error: 'Final marketplace price cannot be less than €1' };
  }

  if (finalPrice > 200000) {
    return { isValid: false, error: 'Final marketplace price cannot exceed €200,000' };
  }

  // Prevent unrealistic profit margins
  if (calculation.marginPercentage > 2000) {
    return { isValid: false, error: 'Profit margin cannot exceed 2000%' };
  }

  // Warn about negative margins (but allow them for special cases)
  if (calculation.marginPercentage < -25) {
    return { isValid: false, error: 'Negative margin cannot be worse than -25%' };
  }

  return { isValid: true };
}

/**
 * Validate bulk margin operations
 * @param operations - Array of margin operations to validate
 * @returns Validation result with detailed error information
 */
export function validateBulkMarginOperations(operations: Array<{ askingPrice: number; margin: MarginType; submissionId: string }>): {
  isValid: boolean;
  errors: Array<{ submissionId: string; error: string }>;
  warnings: Array<{ submissionId: string; warning: string }>;
} {
  const errors: Array<{ submissionId: string; error: string }> = [];
  const warnings: Array<{ submissionId: string; warning: string }> = [];

  operations.forEach(({ askingPrice, margin, submissionId }) => {
    const validation = validateMarginCalculation(askingPrice, margin);

    if (!validation.isValid && validation.error) {
      errors.push({ submissionId, error: validation.error });
    }

    // Additional bulk-specific validations
    const calculation = calculateMargin(askingPrice, margin);

    // Check for unusually high margins that might be errors
    if (calculation.marginPercentage > 500) {
      warnings.push({
        submissionId,
        warning: `Very high margin (${calculation.marginPercentage.toFixed(1)}%) - please verify this is intentional`
      });
    }

    // Check for potential data entry errors
    if (calculation.finalPrice > askingPrice * 10) {
      warnings.push({
        submissionId,
        warning: 'Final price is 10x higher than asking price - please verify'
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get predefined margin options for UI
 */
export const PREDEFINED_FIXED_MARGINS = [
  { label: '+€100', value: 100 },
  { label: '+€200', value: 200 },
  { label: '+€300', value: 300 }
];

export const PREDEFINED_PERCENTAGE_MARGINS = [
  { label: '+100%', value: 100 },
  { label: '+200%', value: 200 },
  { label: '+300%', value: 300 },
  { label: '+400%', value: 400 },
  { label: '+500%', value: 500 }
];

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(percentage: number): string {
  return `${percentage > 0 ? '+' : ''}${percentage}%`;
}

/**
 * Get profit margin category for UI styling
 */
export function getProfitMarginCategory(profit: number, originalPrice: number): 'excellent' | 'good' | 'fair' | 'poor' | 'loss' {
  if (profit < 0) return 'loss';
  if (originalPrice <= 0) return 'fair';

  const marginPercent = (profit / originalPrice) * 100;

  if (marginPercent >= 100) return 'excellent';
  if (marginPercent >= 50) return 'good';
  if (marginPercent >= 20) return 'fair';
  return 'poor';
}
