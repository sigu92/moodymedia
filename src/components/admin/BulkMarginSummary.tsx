import React from 'react';
import { TrendingUp, TrendingDown, Minus, Calculator } from 'lucide-react';

interface MediaOutlet {
  id: string;
  purchase_price?: number;
  price?: number;
  admin_tags?: string[];
}

interface BulkMarginSummaryProps {
  selectedSubmissions: string[];
  allSubmissions: MediaOutlet[];
}

export function BulkMarginSummary({
  selectedSubmissions,
  allSubmissions
}: BulkMarginSummaryProps) {
  const selectedData = allSubmissions.filter(s => selectedSubmissions.includes(s.id));

  // Only calculate margins for submissions that have prices set (margins applied)
  // Include items with intentionally set 0% margins (price === purchase_price)
  const submissionsWithMargins = selectedData.filter(s =>
    s.price && s.price > 0 && s.purchase_price !== undefined
  );

  const totals = submissionsWithMargins.reduce(
    (acc, submission) => {
      const costPrice = submission.purchase_price || 0;
      const sellingPrice = submission.price || costPrice;
      const isMoody = submission.admin_tags?.includes('moody') || false;

      // For moody websites, profit is the entire selling price since we own the website
      const profit = isMoody ? sellingPrice : (sellingPrice - costPrice);

      return {
        totalCost: acc.totalCost + costPrice,
        totalRevenue: acc.totalRevenue + sellingPrice,
        totalProfit: acc.totalProfit + profit,
        count: acc.count + 1
      };
    },
    { totalCost: 0, totalRevenue: 0, totalProfit: 0, count: 0 }
  );

  const avgMargin = totals.totalCost > 0 ? (totals.totalProfit / totals.totalCost) * 100 : 0;

  const getMarginCategory = (margin: number) => {
    if (margin < 0) return 'loss';
    if (margin >= 100) return 'excellent';
    if (margin >= 50) return 'good';
    if (margin >= 20) return 'fair';
    return 'poor';
  };

  const category = getMarginCategory(avgMargin);
  const categoryColors = {
    excellent: 'text-green-600 bg-green-50 border-green-200',
    good: 'text-blue-600 bg-blue-50 border-blue-200',
    fair: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    poor: 'text-orange-600 bg-orange-50 border-orange-200',
    loss: 'text-red-600 bg-red-50 border-red-200'
  };

  const getMarginIcon = (category: string) => {
    switch (category) {
      case 'excellent':
      case 'good':
      case 'fair':
        return <TrendingUp className="h-4 w-4" />;
      case 'poor':
        return <Minus className="h-4 w-4" />;
      case 'loss':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  // If no margins have been applied yet, show a different state
  if (submissionsWithMargins.length === 0) {
    return (
      <div className="mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-sm text-gray-600">
            Ready to Apply Margins ({selectedData.length} sites selected)
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Click "Apply Margins" to set profit margins for selected websites before approving them.
        </p>
      </div>
    );
  }

  return (
    <div className={`mb-4 p-3 rounded-lg border ${categoryColors[category as keyof typeof categoryColors]}`}>
      <div className="flex items-center gap-2 mb-2">
        {getMarginIcon(category)}
        <span className="font-medium text-sm">
          Bulk Margin Summary ({submissionsWithMargins.length} sites with margins)
        </span>
        <span className="text-xs bg-white/50 px-2 py-1 rounded">
          {avgMargin >= 0 ? '+' : ''}{avgMargin.toFixed(1)}% avg margin
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Total Cost</div>
          <div className="font-semibold">€{totals.totalCost.toFixed(0)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Total Revenue</div>
          <div className="font-semibold">€{totals.totalRevenue.toFixed(0)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Total Profit</div>
          <div className="font-semibold">€{totals.totalProfit.toFixed(0)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Avg Margin</div>
          <div className="font-semibold">{avgMargin.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}
