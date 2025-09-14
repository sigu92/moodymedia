import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  validateMetric, 
  validateMetricWithWarnings, 
  validateMetrics, 
  validateWebsiteMetrics,
  METRIC_CONFIGS 
} from '@/utils/metricValidation';

describe('metricValidation', () => {
  beforeEach(() => {
    // Clear console warnings
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('validateMetric', () => {
    it('should return null for null, undefined, or empty string values', () => {
      expect(validateMetric(null, 'test', 0, 100)).toBe(null);
      expect(validateMetric(undefined, 'test', 0, 100)).toBe(null);
      expect(validateMetric('', 'test', 0, 100)).toBe(null);
    });

    it('should handle valid numeric values', () => {
      expect(validateMetric(50, 'test', 0, 100)).toBe(50);
      expect(validateMetric('75.5', 'test', 0, 100)).toBe(76); // Rounded
      expect(validateMetric(0, 'test', 0, 100)).toBe(0);
      expect(validateMetric(100, 'test', 0, 100)).toBe(100);
    });

    it('should return null for invalid numeric values', () => {
      expect(validateMetric('invalid', 'test', 0, 100)).toBe(null);
      expect(validateMetric('abc123', 'test', 0, 100)).toBe(null);
      expect(validateMetric(NaN, 'test', 0, 100)).toBe(null);
    });

    it('should clamp values outside the allowed range', () => {
      expect(validateMetric(-10, 'test', 0, 100)).toBe(0);
      expect(validateMetric(150, 'test', 0, 100)).toBe(100);
      expect(validateMetric('200', 'test', 0, 100)).toBe(100);
    });

    it('should log warnings for invalid and out-of-range values', () => {
      const consoleSpy = vi.spyOn(console, 'warn');

      validateMetric('invalid', 'test_field', 0, 100);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[MetricValidation] Invalid test_field value: invalid, setting to null'
      );

      validateMetric(150, 'test_field', 0, 100);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[MetricValidation] test_field value 150 out of range [0, 100], clamping to 100'
      );
    });
  });

  describe('validateMetricWithWarnings', () => {
    it('should return value and empty warnings for valid inputs', () => {
      const result = validateMetricWithWarnings(50, 'test', 0, 100);
      expect(result).toEqual({
        value: 50,
        warnings: []
      });
    });

    it('should return null and warning for invalid inputs', () => {
      const result = validateMetricWithWarnings('invalid', 'test_field', 0, 100);
      expect(result).toEqual({
        value: null,
        warnings: ['Invalid test_field value: invalid']
      });
    });

    it('should return clamped value and warning for out-of-range inputs', () => {
      const result = validateMetricWithWarnings(150, 'test_field', 0, 100);
      expect(result).toEqual({
        value: 100,
        warnings: ['test_field value 150 out of range [0, 100], clamped to 100']
      });
    });

    it('should return null and no warnings for empty values', () => {
      const result = validateMetricWithWarnings(null, 'test', 0, 100);
      expect(result).toEqual({
        value: null,
        warnings: []
      });
    });
  });

  describe('validateMetrics', () => {
    it('should validate multiple metrics and collect warnings', () => {
      const metrics = {
        ahrefs_dr: { value: 50, min: 0, max: 100 },
        spam_score: { value: 'invalid', min: 0, max: 100 },
        organic_traffic: { value: 1000, min: 0, max: Number.MAX_SAFE_INTEGER }
      };

      const result = validateMetrics(metrics);

      expect(result.values).toEqual({
        ahrefs_dr: 50,
        spam_score: null,
        organic_traffic: 1000
      });

      expect(result.warnings).toContain('Invalid spam_score value: invalid');
    });

    it('should handle empty metrics object', () => {
      const result = validateMetrics({});
      expect(result).toEqual({
        values: {},
        warnings: []
      });
    });
  });

  describe('validateWebsiteMetrics', () => {
    it('should validate standard website metrics using predefined configs', () => {
      const rawMetrics = {
        ahrefs_dr: 85,
        moz_da: '92.5',
        spam_score: 'invalid',
        organic_traffic: 50000,
        referring_domains: 150
      };

      const result = validateWebsiteMetrics(rawMetrics);

      expect(result.values).toEqual({
        ahrefs_dr: 85,
        moz_da: 93, // Rounded
        spam_score: null,
        organic_traffic: 50000,
        referring_domains: 150
      });

      expect(result.warnings).toContain('Invalid spam_score value: invalid');
    });

    it('should handle partial metrics data', () => {
      const rawMetrics = {
        ahrefs_dr: 85,
        organic_traffic: 25000
      };

      const result = validateWebsiteMetrics(rawMetrics);

      expect(result.values).toEqual({
        ahrefs_dr: 85,
        organic_traffic: 25000
      });

      expect(result.warnings).toEqual([]);
    });

    it('should clamp metrics that exceed predefined ranges', () => {
      const rawMetrics = {
        ahrefs_dr: 150, // Exceeds max of 100
        spam_score: -5   // Below min of 0
      };

      const result = validateWebsiteMetrics(rawMetrics);

      expect(result.values).toEqual({
        ahrefs_dr: 100, // Clamped to max
        spam_score: 0   // Clamped to min
      });

      expect(result.warnings).toContain('ahrefs_dr value 150 out of range [0, 100], clamped to 100');
      expect(result.warnings).toContain('spam_score value -5 out of range [0, 100], clamped to 0');
    });
  });

  describe('METRIC_CONFIGS', () => {
    it('should have correct ranges for all metric types', () => {
      expect(METRIC_CONFIGS.ahrefs_dr).toEqual({ min: 0, max: 100 });
      expect(METRIC_CONFIGS.moz_da).toEqual({ min: 0, max: 100 });
      expect(METRIC_CONFIGS.semrush_as).toEqual({ min: 0, max: 100 });
      expect(METRIC_CONFIGS.spam_score).toEqual({ min: 0, max: 100 });
      expect(METRIC_CONFIGS.organic_traffic).toEqual({ min: 0, max: Number.MAX_SAFE_INTEGER });
      expect(METRIC_CONFIGS.referring_domains).toEqual({ min: 0, max: Number.MAX_SAFE_INTEGER });
    });
  });
});
