import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MediaOutlet {
  id: string;
  domain: string;
  price: number;
  purchase_price?: number;
  currency: string;
  category: string;
  status: 'active' | 'pending' | 'rejected';
  submitted_at: string;
  reviewed_at: string;
  admin_tags: string[];
}

interface ProfitData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageMargin: number;
  listingsCount: number;
  profitableListings: number;
  unprofitableListings: number;
  zeroMarginListings: number;
  topPerformers: MediaOutlet[];
  underperformers: MediaOutlet[];
  categoryBreakdown: { [key: string]: { revenue: number; profit: number; count: number; avgMargin: number } };
  monthlyTrends: { month: string; revenue: number; profit: number; count: number }[];
}

export function ProfitAnalyticsTab() {
  const [profitData, setProfitData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y' | 'all'>('90d');
  const { toast } = useToast();

  const fetchProfitAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all active listings with pricing data
      const { data: listings, error } = await supabase
        .from('media_outlets')
        .select('*')
        .eq('status', 'active')
        .eq('is_active', true)
        .order('reviewed_at', { ascending: false });

      if (error) throw error;

      if (!listings || listings.length === 0) {
        setProfitData({
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          averageMargin: 0,
          listingsCount: 0,
          profitableListings: 0,
          unprofitableListings: 0,
          zeroMarginListings: 0,
          topPerformers: [],
          underperformers: [],
          categoryBreakdown: {},
          monthlyTrends: []
        });
        return;
      }

      // Calculate profit analytics
      const profitAnalytics = calculateProfitAnalytics(listings, timeRange);
      setProfitData(profitAnalytics);

    } catch (error) {
      console.error('Error fetching profit analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load profit analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateProfitAnalytics = (listings: MediaOutlet[], range: string): ProfitData => {
    // Filter by time range if needed
    let filteredListings = listings;
    if (range !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      switch (range) {
        case '30d':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoffDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filteredListings = listings.filter(listing =>
        new Date(listing.reviewed_at) >= cutoffDate
      );
    }

    let totalRevenue = 0;
    let totalCost = 0;
    let profitableListings = 0;
    let unprofitableListings = 0;
    let zeroMarginListings = 0;

    const categoryBreakdown: { [key: string]: { revenue: number; profit: number; count: number; margins: number[] } } = {};
    const monthlyTrends: { [key: string]: { revenue: number; profit: number; count: number } } = {};

    // Process each listing
    filteredListings.forEach(listing => {
      const revenue = listing.price;
      const cost = listing.purchase_price || 0;
      const profit = revenue - cost;
      const margin = cost > 0 ? (profit / revenue) * 100 : 0;

      totalRevenue += revenue;
      totalCost += cost;

      // Categorize by profitability
      if (profit > 0) {
        profitableListings++;
      } else if (profit < 0) {
        unprofitableListings++;
      } else {
        zeroMarginListings++;
      }

      // Category breakdown
      if (!categoryBreakdown[listing.category]) {
        categoryBreakdown[listing.category] = { revenue: 0, profit: 0, count: 0, margins: [] };
      }
      categoryBreakdown[listing.category].revenue += revenue;
      categoryBreakdown[listing.category].profit += profit;
      categoryBreakdown[listing.category].count++;
      categoryBreakdown[listing.category].margins.push(margin);

      // Monthly trends
      const monthKey = new Date(listing.reviewed_at).toISOString().slice(0, 7); // YYYY-MM format
      if (!monthlyTrends[monthKey]) {
        monthlyTrends[monthKey] = { revenue: 0, profit: 0, count: 0 };
      }
      monthlyTrends[monthKey].revenue += revenue;
      monthlyTrends[monthKey].profit += profit;
      monthlyTrends[monthKey].count++;
    });

    // Calculate averages for categories
    Object.keys(categoryBreakdown).forEach(category => {
      const cat = categoryBreakdown[category];
      cat.avgMargin = cat.margins.reduce((sum, margin) => sum + margin, 0) / cat.margins.length;
    });

    // Sort listings by profit margin for top/under performers
    const listingsWithMargins = filteredListings.map(listing => ({
      ...listing,
      profit: listing.price - (listing.purchase_price || 0),
      margin: listing.purchase_price ? ((listing.price - listing.purchase_price) / listing.price) * 100 : 0
    })).sort((a, b) => b.margin - a.margin);

    const topPerformers = listingsWithMargins.slice(0, 5);
    const underperformers = listingsWithMargins.filter(l => l.margin < 20).slice(0, 5);

    // Convert monthly trends to array
    const monthlyTrendsArray = Object.entries(monthlyTrends)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: data.revenue,
        profit: data.profit,
        count: data.count
      }));

    return {
      totalRevenue,
      totalCost,
      totalProfit: totalRevenue - totalCost,
      averageMargin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
      listingsCount: filteredListings.length,
      profitableListings,
      unprofitableListings,
      zeroMarginListings,
      topPerformers,
      underperformers,
      categoryBreakdown: Object.fromEntries(
        Object.entries(categoryBreakdown).map(([cat, data]) => [
          cat,
          {
            revenue: data.revenue,
            profit: data.profit,
            count: data.count,
            avgMargin: data.avgMargin
          }
        ])
      ),
      monthlyTrends: monthlyTrendsArray
    };
  };

  useEffect(() => {
    fetchProfitAnalytics();
  }, [timeRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMarginBadgeVariant = (margin: number) => {
    if (margin >= 30) return 'default';
    if (margin >= 20) return 'secondary';
    return 'destructive';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading profit analytics...</div>
      </div>
    );
  }

  if (!profitData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Profit Analytics</h2>
          <p className="text-muted-foreground">
            Analyze profit margins and pricing trends across active marketplace listings
          </p>
        </div>

        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as typeof timeRange)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(profitData.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {profitData.listingsCount} active listings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(profitData.totalProfit)}</div>
            <p className="text-xs text-muted-foreground">
              Average margin: {profitData.averageMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Distribution</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Profitable</span>
                <span>{profitData.profitableListings}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-yellow-600">Break-even</span>
                <span>{profitData.zeroMarginListings}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600">Loss-making</span>
                <span>{profitData.unprofitableListings}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profitData.listingsCount > 0
                ? Math.round((profitData.profitableListings / profitData.listingsCount) * 100)
                : 0}%
            </div>
            <Progress
              value={profitData.listingsCount > 0 ? (profitData.profitableListings / profitData.listingsCount) * 100 : 0}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Profitable listings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Top Performing Listings
          </CardTitle>
          <CardDescription>
            Highest profit margin listings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profitData.topPerformers.length > 0 ? (
            <div className="space-y-4">
              {profitData.topPerformers.map((listing, index) => (
                <div key={listing.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{listing.domain}</div>
                      <div className="text-sm text-muted-foreground">{listing.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(listing.price)}</div>
                    <Badge variant={getMarginBadgeVariant(listing.purchase_price ? ((listing.price - listing.purchase_price) / listing.price) * 100 : 0)}>
                      {listing.purchase_price ? `${(((listing.price - listing.purchase_price) / listing.price) * 100).toFixed(1)}%` : 'N/A'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No listings found</p>
          )}
        </CardContent>
      </Card>

      {/* Underperformers */}
      {profitData.underperformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Underperforming Listings
            </CardTitle>
            <CardDescription>
              Listings with margins below 20%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profitData.underperformers.map((listing, index) => (
                <div key={listing.id} className="flex items-center justify-between p-3 border rounded border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{listing.domain}</div>
                      <div className="text-sm text-muted-foreground">{listing.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(listing.price)}</div>
                    <Badge variant="destructive">
                      {listing.purchase_price ? `${(((listing.price - listing.purchase_price) / listing.price) * 100).toFixed(1)}%` : 'N/A'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Category Performance
          </CardTitle>
          <CardDescription>
            Profit margins by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(profitData.categoryBreakdown)
              .sort(([, a], [, b]) => b.avgMargin - a.avgMargin)
              .map(([category, data]) => (
                <div key={category} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{category}</span>
                      <span className="text-sm text-muted-foreground">
                        {data.count} listings • {formatCurrency(data.revenue)} revenue
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Progress
                          value={Math.min(data.avgMargin, 100)}
                          className="h-2"
                        />
                      </div>
                      <span className={`text-sm font-medium ${getMarginColor(data.avgMargin)}`}>
                        {data.avgMargin.toFixed(1)}% margin
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      {profitData.monthlyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Trends
            </CardTitle>
            <CardDescription>
              Revenue and profit trends over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profitData.monthlyTrends.slice(-6).map((month, index) => (
                <div key={month.month} className="flex items-center justify-between p-3 border rounded">
                  <div className="font-medium">{month.month}</div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium">{formatCurrency(month.revenue)}</div>
                      <div className="text-muted-foreground">Revenue</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-green-600">{formatCurrency(month.profit)}</div>
                      <div className="text-muted-foreground">Profit</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{month.count}</div>
                      <div className="text-muted-foreground">Listings</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
