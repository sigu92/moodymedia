import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency, formatPercentage, getProfitMarginCategory } from '@/utils/marginUtils';

interface ProfitMarginDisplayProps {
  costPrice: number; // Publisher asking price (purchase_price)
  sellingPrice: number; // Marketplace price (price)
  showLabels?: boolean;
  compact?: boolean;
  className?: string;
}

export function ProfitMarginDisplay({
  costPrice,
  sellingPrice,
  showLabels = true,
  compact = false,
  className = ''
}: ProfitMarginDisplayProps) {
  // Calculate profit metrics
  const profit = sellingPrice - costPrice;
  const marginPercentage = costPrice > 0 ? (profit / costPrice) * 100 : 0;
  const profitCategory = getProfitMarginCategory(profit, costPrice);

  // Get styling based on profit category
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'excellent':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          icon: <TrendingUp className="h-3 w-3" />
        };
      case 'good':
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
          icon: <TrendingUp className="h-3 w-3" />
        };
      case 'fair':
        return {
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          icon: <Minus className="h-3 w-3" />
        };
      case 'poor':
        return {
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          borderColor: 'border-orange-200',
          icon: <TrendingDown className="h-3 w-3" />
        };
      case 'loss':
        return {
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          icon: <TrendingDown className="h-3 w-3" />
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          icon: <Minus className="h-3 w-3" />
        };
    }
  };

  const styles = getCategoryStyles(profitCategory);

  if (compact) {
    // Compact version for table cells
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`${styles.bgColor} ${styles.textColor} ${styles.borderColor} border flex items-center gap-1 px-2 py-1 text-xs font-medium`}
            >
              {styles.icon}
              {formatPercentage(marginPercentage)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-sm">
              <div>Cost: {formatCurrency(costPrice)}</div>
              <div>Price: {formatCurrency(sellingPrice)}</div>
              <div>Profit: {formatCurrency(profit)}</div>
              <div>Margin: {formatPercentage(marginPercentage)}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full version for detailed views
  return (
    <div className={`space-y-2 ${className}`}>
      {showLabels && (
        <div className="text-sm font-medium text-muted-foreground">
          Profit Margin
        </div>
      )}

      {/* Profit Badge */}
      <Badge
        variant="outline"
        className={`${styles.bgColor} ${styles.textColor} ${styles.borderColor} border flex items-center gap-2 px-3 py-2`}
      >
        {styles.icon}
        <span className="font-semibold">{formatPercentage(marginPercentage)}</span>
        <span className="text-sm">({formatCurrency(profit)})</span>
      </Badge>

      {/* Detailed Breakdown */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Publisher Cost:</span>
          <span className="font-medium">{formatCurrency(costPrice)}</span>
        </div>
        <div className="flex justify-between">
          <span>Marketplace Price:</span>
          <span className="font-medium">{formatCurrency(sellingPrice)}</span>
        </div>
        <div className="flex justify-between border-t pt-1 mt-1">
          <span>Profit:</span>
          <span className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Utility component for table cell display
export function ProfitMarginCell({ costPrice, sellingPrice }: { costPrice: number; sellingPrice: number }) {
  return (
    <ProfitMarginDisplay
      costPrice={costPrice}
      sellingPrice={sellingPrice}
      showLabels={false}
      compact={true}
    />
  );
}
