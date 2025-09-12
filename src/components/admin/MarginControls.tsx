import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, Euro, Percent, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  calculateMargin,
  validateMarginCalculation,
  PREDEFINED_FIXED_MARGINS,
  PREDEFINED_PERCENTAGE_MARGINS,
  formatCurrency,
  formatPercentage,
  getProfitMarginCategory,
  type MarginType,
  type MarginCalculation
} from '@/utils/marginUtils';

interface MarginControlsProps {
  askingPrice: number;
  onMarginApplied: (calculation: MarginCalculation) => void;
  currentMarketplacePrice?: number;
  disabled?: boolean;
}

export function MarginControls({
  askingPrice,
  onMarginApplied,
  currentMarketplacePrice,
  disabled = false
}: MarginControlsProps) {
  const [customFixedAmount, setCustomFixedAmount] = useState<string>('');
  const [customPercentage, setCustomPercentage] = useState<string>('');
  const [selectedCalculation, setSelectedCalculation] = useState<MarginCalculation | null>(null);
  const [error, setError] = useState<string>('');

  const handleMarginSelect = (margin: MarginType) => {
    setError('');

    const validation = validateMarginCalculation(askingPrice, margin);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid margin calculation');
      return;
    }

    const calculation = calculateMargin(askingPrice, margin);
    setSelectedCalculation(calculation);
  };

  const handleCustomFixedMargin = () => {
    const amount = parseFloat(customFixedAmount);
    if (isNaN(amount)) {
      setError('Please enter a valid fixed amount');
      return;
    }

    handleMarginSelect({ type: 'fixed', value: amount });
  };

  const handleCustomPercentageMargin = () => {
    const percentage = parseFloat(customPercentage);
    if (isNaN(percentage)) {
      setError('Please enter a valid percentage');
      return;
    }

    handleMarginSelect({ type: 'percentage', value: percentage });
  };

  const handleApplyMargin = () => {
    if (selectedCalculation) {
      onMarginApplied(selectedCalculation);
      setSelectedCalculation(null);
      setError('');
    }
  };

  const getProfitBadgeVariant = (category: string) => {
    switch (category) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'fair': return 'outline';
      case 'poor': return 'outline';
      case 'loss': return 'destructive';
      default: return 'outline';
    }
  };

  const getProfitBadgeColor = (category: string) => {
    switch (category) {
      case 'excellent': return 'text-green-700 bg-green-100';
      case 'good': return 'text-blue-700 bg-blue-100';
      case 'fair': return 'text-yellow-700 bg-yellow-100';
      case 'poor': return 'text-orange-700 bg-orange-100';
      case 'loss': return 'text-red-700 bg-red-100';
      default: return '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Margin Calculator
        </CardTitle>
        <CardDescription>
          Set marketplace price based on publisher asking price: {formatCurrency(askingPrice)}
          {currentMarketplacePrice && currentMarketplacePrice !== askingPrice && (
            <span className="ml-2 text-muted-foreground">
              (Current: {formatCurrency(currentMarketplacePrice)})
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Fixed Amount Margins */}
        <div>
          <Label className="text-sm font-medium mb-3 flex items-center gap-2">
            <Euro className="h-4 w-4" />
            Fixed Amount Margins
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {PREDEFINED_FIXED_MARGINS.map((margin) => (
              <Button
                key={margin.value}
                variant="outline"
                size="sm"
                onClick={() => handleMarginSelect({ type: 'fixed', value: margin.value })}
                disabled={disabled}
                className="h-8"
              >
                {margin.label}
              </Button>
            ))}
          </div>

          {/* Custom Fixed Amount */}
          <div className="flex gap-2 mt-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Custom € amount"
                value={customFixedAmount}
                onChange={(e) => setCustomFixedAmount(e.target.value)}
                disabled={disabled}
                className="h-8"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCustomFixedMargin}
              disabled={disabled || !customFixedAmount}
              className="h-8"
            >
              Apply €
            </Button>
          </div>
        </div>

        <Separator />

        {/* Percentage Margins */}
        <div>
          <Label className="text-sm font-medium mb-3 flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Percentage Margins
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {PREDEFINED_PERCENTAGE_MARGINS.slice(0, 3).map((margin) => (
              <Button
                key={margin.value}
                variant="outline"
                size="sm"
                onClick={() => handleMarginSelect({ type: 'percentage', value: margin.value })}
                disabled={disabled}
                className="h-8"
              >
                {margin.label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {PREDEFINED_PERCENTAGE_MARGINS.slice(3).map((margin) => (
              <Button
                key={margin.value}
                variant="outline"
                size="sm"
                onClick={() => handleMarginSelect({ type: 'percentage', value: margin.value })}
                disabled={disabled}
                className="h-8"
              >
                {margin.label}
              </Button>
            ))}
          </div>

          {/* Custom Percentage */}
          <div className="flex gap-2 mt-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Custom % markup"
                value={customPercentage}
                onChange={(e) => setCustomPercentage(e.target.value)}
                disabled={disabled}
                className="h-8"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCustomPercentageMargin}
              disabled={disabled || !customPercentage}
              className="h-8"
            >
              Apply %
            </Button>
          </div>
        </div>

        {/* Calculation Preview */}
        {selectedCalculation && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">Margin Preview:</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Publisher Price:</span>
                    <span className="ml-2 font-medium">{formatCurrency(selectedCalculation.originalPrice)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Marketplace Price:</span>
                    <span className="ml-2 font-medium">{formatCurrency(selectedCalculation.finalPrice)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Margin Amount:</span>
                    <span className="ml-2 font-medium">{formatCurrency(selectedCalculation.marginAmount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Margin %:</span>
                    <span className="ml-2 font-medium">{formatPercentage(selectedCalculation.marginPercentage)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-muted-foreground">Profit:</span>
                  <Badge
                    variant={getProfitBadgeVariant(getProfitMarginCategory(selectedCalculation.profit, selectedCalculation.originalPrice))}
                    className={getProfitBadgeColor(getProfitMarginCategory(selectedCalculation.profit, selectedCalculation.originalPrice))}
                  >
                    {formatCurrency(selectedCalculation.profit)} ({formatPercentage(selectedCalculation.marginPercentage)})
                  </Badge>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handleApplyMargin}
                    disabled={disabled}
                  >
                    Apply This Margin
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCalculation(null)}
                    disabled={disabled}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
