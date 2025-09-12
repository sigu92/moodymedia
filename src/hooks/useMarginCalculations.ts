import { useState, useCallback } from 'react';
import {
  calculateMargin,
  validateMarginCalculation,
  type MarginType,
  type MarginCalculation
} from '@/utils/marginUtils';

interface UseMarginCalculationsReturn {
  selectedCalculation: MarginCalculation | null;
  isCalculating: boolean;
  error: string | null;
  calculateMarginForPrice: (askingPrice: number, margin: MarginType) => Promise<void>;
  clearCalculation: () => void;
  applyCalculation: (onApplied: (calculation: MarginCalculation) => void) => void;
}

export function useMarginCalculations(): UseMarginCalculationsReturn {
  const [selectedCalculation, setSelectedCalculation] = useState<MarginCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateMarginForPrice = useCallback(async (askingPrice: number, margin: MarginType) => {
    setIsCalculating(true);
    setError(null);

    try {
      // Validate inputs
      const validation = validateMarginCalculation(askingPrice, margin);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid margin calculation');
        return;
      }

      // Calculate margin
      const calculation = calculateMargin(askingPrice, margin);
      setSelectedCalculation(calculation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate margin');
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const clearCalculation = useCallback(() => {
    setSelectedCalculation(null);
    setError(null);
  }, []);

  const applyCalculation = useCallback((onApplied: (calculation: MarginCalculation) => void) => {
    if (selectedCalculation) {
      onApplied(selectedCalculation);
      clearCalculation();
    }
  }, [selectedCalculation, clearCalculation]);

  return {
    selectedCalculation,
    isCalculating,
    error,
    calculateMarginForPrice,
    clearCalculation,
    applyCalculation
  };
}
