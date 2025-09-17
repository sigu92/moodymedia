import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Clock } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from './DataTable';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface DateRange {
  from: Date;
  to: Date;
}

interface AnalyticsKPIs {
  total_orders: number;
  paid_orders: number;
  pending_orders: number;
  total_revenue: number;
  pending_revenue: number;
  avg_order_value: number;
  currency: string;
}

interface TopBuyer {
  buyer_id: string;
  total_spent: number;
  order_count: number;
}

interface TopWebsite {
  media_outlet_id: string;
  domain: string;
  total_revenue: number;
  order_count: number;
}

interface TimeSeriesData {
  created_at: string;
  price: number;
  status: string;
}

export function EconomyAnalytics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [interval, setInterval] = useState('day');
  const [currency, setCurrency] = useState('EUR');
  
  const [kpis, setKpis] = useState<AnalyticsKPIs | null>(null);
  const [topBuyers, setTopBuyers] = useState<TopBuyer[]>([]);
  const [topWebsites, setTopWebsites] = useState<TopWebsite[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);

  const handleDateRangeSelect = (range: string) => {
    const now = new Date();
    switch (range) {
      case 'today':
        setDateRange({ from: now, to: now });
        break;
      case '7d':
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case '30d':
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case 'qtd': {
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        setDateRange({ from: quarterStart, to: now });
        break;
      }
      case 'ytd': {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        setDateRange({ from: yearStart, to: now });
        break;
      }
    }
  };

  const fetchAnalytics = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to access analytics",
          variant: "destructive"
        });
        return;
      }

      const params = new URLSearchParams({
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd'),
        interval,
        currency
      });

      const response = await supabase.functions.invoke('admin-analytics', {
        body: {},
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw response.error;
      }

      const data = response.data;
      setKpis(data.kpis);
      setTopBuyers(data.top_buyers || []);
      setTopWebsites(data.top_websites || []);
      setTimeSeries(data.time_series || []);

    } catch (error) {
      console.error('Analytics fetch error:', error);
      toast({
        title: "Failed to fetch analytics",
        description: "There was an error loading the analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, interval, currency, toast]);

  const handleExportCSV = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd'),
        interval,
        currency,
        export: 'csv'
      });

      const response = await fetch(`https://fylrytiilgkjhqlyetde.supabase.co/functions/v1/admin-analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the data",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const buyerColumns = [
    {
      key: 'buyer_id' as keyof TopBuyer,
      header: 'Buyer ID',
      render: (value: string) => (
        <span className="font-mono text-sm">{value.substring(0, 8)}...</span>
      )
    },
    {
      key: 'order_count' as keyof TopBuyer,
      header: 'Orders',
      sortable: true
    },
    {
      key: 'total_spent' as keyof TopBuyer,
      header: 'Total Spent',
      sortable: true,
      render: (value: number) => formatCurrency(value)
    }
  ];

  const websiteColumns = [
    {
      key: 'domain' as keyof TopWebsite,
      header: 'Domain',
      render: (value: string) => (
        <span className="font-medium">{value}</span>
      )
    },
    {
      key: 'order_count' as keyof TopWebsite,
      header: 'Orders',
      sortable: true
    },
    {
      key: 'total_revenue' as keyof TopWebsite,
      header: 'Revenue',
      sortable: true,
      render: (value: number) => formatCurrency(value)
    }
  ];

  // Process time series data for charts
  const chartData = timeSeries.reduce((acc, item) => {
    const date = format(new Date(item.created_at), 'MMM dd');
    const existingEntry = acc.find(entry => entry.date === date);
    
    if (existingEntry) {
      existingEntry.revenue += Number(item.price);
      existingEntry.orders += 1;
    } else {
      acc.push({
        date,
        revenue: Number(item.price),
        orders: 1
      });
    }
    
    return acc;
  }, [] as Array<{ date: string; revenue: number; orders: number }>);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleDateRangeSelect('today')}
          >
            Today
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleDateRangeSelect('7d')}
          >
            7 Days
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleDateRangeSelect('30d')}
          >
            30 Days
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleDateRangeSelect('qtd')}
          >
            QTD
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleDateRangeSelect('ytd')}
          >
            YTD
          </Button>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-60 justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from && dateRange.to ? (
                `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
              ) : (
                'Select date range'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <Select value={interval} onValueChange={setInterval}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
          </SelectContent>
        </Select>

        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="SEK">SEK</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis ? formatCurrency(kpis.total_revenue) : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {kpis && kpis.pending_revenue > 0 && (
                <span>+{formatCurrency(kpis.pending_revenue)} pending</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.total_orders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {kpis && (
                <span>{kpis.paid_orders} paid, {kpis.pending_orders} pending</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis ? formatCurrency(kpis.avg_order_value) : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis && kpis.total_orders > 0 
                ? `${((kpis.paid_orders / kpis.total_orders) * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Orders to completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Buyers</CardTitle>
            <CardDescription>Customers by total spend</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={topBuyers}
              columns={buyerColumns}
              loading={loading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Websites</CardTitle>
            <CardDescription>Media outlets by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={topWebsites}
              columns={websiteColumns}
              loading={loading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}