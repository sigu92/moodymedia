/**
 * Utility for validating and normalizing metric values
 * Used across the application for consistent metric data handling
 */

export interface MetricValidationResult {
  value: number | null;
  warnings: string[];
}

/**
 * Validates and normalizes a metric field value
 * @param value - The value to validate (string, number, undefined, null)
 * @param fieldName - The name of the field (for logging/warning purposes)
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns The normalized numeric value or null if invalid
 */
export const validateMetric = (
  value: string | number | undefined | null, 
  fieldName: string, 
  min: number, 
  max: number
): number | null => {
  if (value === null || value === undefined || value === '') return null;
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    console.warn(`[MetricValidation] Invalid ${fieldName} value: ${value}, setting to null`);
    return null;
  }
  
  if (numValue < min || numValue > max) {
    const clampedValue = Math.max(min, Math.min(max, numValue));
    console.warn(`[MetricValidation] ${fieldName} value ${numValue} out of range [${min}, ${max}], clamping to ${clampedValue}`);
    return clampedValue;
  }
  
  return Math.round(numValue);
};

/**
 * Enhanced version that returns both value and warnings
 * Useful for collecting validation warnings for user feedback
 */
export const validateMetricWithWarnings = (
  value: string | number | undefined | null, 
  fieldName: string, 
  min: number, 
  max: number
): MetricValidationResult => {
  const warnings: string[] = [];

  if (value === null || value === undefined || value === '') {
    return { value: null, warnings };
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    warnings.push(`Invalid ${fieldName} value: ${value}`);
    return { value: null, warnings };
  }
  
  if (numValue < min || numValue > max) {
    const clampedValue = Math.max(min, Math.min(max, numValue));
    warnings.push(`${fieldName} value ${numValue} out of range [${min}, ${max}], clamped to ${clampedValue}`);
    return { value: Math.round(clampedValue), warnings };
  }
  
  return { value: Math.round(numValue), warnings };
};

/**
 * Validates multiple metrics at once
 * Returns an object with normalized values and collected warnings
 */
export const validateMetrics = (
  metrics: Record<string, { value: string | number | undefined | null; min: number; max: number }>
): { values: Record<string, number | null>; warnings: string[] } => {
  const values: Record<string, number | null> = {};
  const warnings: string[] = [];

  for (const [fieldName, config] of Object.entries(metrics)) {
    const result = validateMetricWithWarnings(config.value, fieldName, config.min, config.max);
    values[fieldName] = result.value;
    warnings.push(...result.warnings);
  }

  return { values, warnings };
};

/**
 * Common metric field configurations
 * Standard ranges for typical website metrics
 */
export const METRIC_CONFIGS = {
  ahrefs_dr: { min: 0, max: 100 },
  moz_da: { min: 0, max: 100 },
  semrush_as: { min: 0, max: 100 },
  spam_score: { min: 0, max: 100 },
  organic_traffic: { min: 0, max: Number.MAX_SAFE_INTEGER },
  referring_domains: { min: 0, max: Number.MAX_SAFE_INTEGER },
} as const;

/**
 * Convenience function for validating standard website metrics
 * Uses predefined configurations for common metric types
 */
export const validateWebsiteMetrics = (
  rawMetrics: Partial<Record<keyof typeof METRIC_CONFIGS, string | number | undefined | null>>
): { values: Partial<Record<keyof typeof METRIC_CONFIGS, number | null>>; warnings: string[] } => {
  const metrics = Object.fromEntries(
    Object.entries(rawMetrics).map(([key, value]) => [
      key,
      { value, ...METRIC_CONFIGS[key as keyof typeof METRIC_CONFIGS] }
    ])
  );

  return validateMetrics(metrics);
};
