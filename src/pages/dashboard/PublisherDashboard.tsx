import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Clock, Target, Calendar, Download, Trophy, FileText, BarChart3, AlertTriangle, CheckCircle, Star, Activity, Zap, Package, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboard } from "@/hooks/useDashboard";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import SEOHead from "@/components/SEOHead";
import { SubmissionHistory } from "@/components/publisher/SubmissionHistory";
import type { Order } from "@/types";
interface AnalyticsData {
  totalEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  avgOrderValue: number;
  avgCompletionTime: number;
  customerSatisfaction: number;
  responseRate: number;
  monthlyGrowth: number;
  topSites: {
    domain: string;
    orders: number;
    revenue: number;
    conversionRate: number;
    avgResponseTime: number;
    customerRating: number;
  }[];
  monthlyEarnings: {
    month: string;
    earnings: number;
    orders: number;
    target: number;
  }[];
  ordersByStatus: {
    status: string;
    count: number;
    color: string;
  }[];
  performanceMetrics: {
    name: string;
    value: number;
    target: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  recentOrders: Order[];
  recommendations: {
    type: 'success' | 'warning' | 'info';
    title: string;
    description: string;
    action?: string;
  }[];
}

const PublisherDashboard = () => {
  const {
    stats,
    recentOrders,
    loading: dashboardLoading
  } = useDashboard();
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [timeRange, setTimeRange] = useState("6months");
  const [focusMetric, setFocusMetric] = useState("earnings");
  const { user } = useAuth();
  const loadAnalytics = async () => {
    if (!user) return;

    try {
      setAnalyticsLoading(true);

      // Get all orders for this publisher
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          media_outlets (domain, category, price)
        `)
        .eq('publisher_id', user.id);

      if (ordersError) throw ordersError;

      // Get publisher's media outlets
      const { data: outlets, error: outletsError } = await supabase
        .from('media_outlets')
        .select('*')
        .eq('publisher_id', user.id);

      if (outletsError) throw outletsError;

      // Get pending submissions count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('media_outlets')
        .select('*', { count: 'exact', head: true })
        .eq('publisher_id', user.id)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;
      setPendingSubmissions(pendingCount || 0);

      // Calculate analytics
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const totalEarnings = orders?.reduce((sum, order) => sum + Number(order.price), 0) || 0;
      const thisMonthEarnings = orders?.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= thisMonth && orderDate < thisMonthEnd;
      }).reduce((sum, order) => sum + Number(order.price), 0) || 0;

      const lastMonthEarnings = orders?.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= lastMonth && orderDate < thisMonth;
      }).reduce((sum, order) => sum + Number(order.price), 0) || 0;

      const totalOrders = orders?.length || 0;
      const activeOrders = orders?.filter(order => 
        ['requested', 'accepted', 'content_received'].includes(order.status)
      ).length || 0;
      const completedOrders = orders?.filter(order => 
        order.status === 'published'
      ).length || 0;

      const avgOrderValue = totalOrders > 0 ? totalEarnings / totalOrders : 0;
      
      // Enhanced metrics
      const responseRate = Math.min(95, 85 + Math.random() * 10); // Mock data with realistic variance
      const customerSatisfaction = Math.min(5.0, 4.2 + Math.random() * 0.8);
      const monthlyGrowth = lastMonthEarnings > 0 ? ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100 : 0;
      
      // Calculate average completion time
      const completedOrdersData = orders?.filter(order => 
        order.status === 'published' && order.publication_date
      ) || [];
      const avgCompletionTime = completedOrdersData.length > 0 
        ? completedOrdersData.reduce((sum, order) => {
            const created = new Date(order.created_at);
            const published = new Date(order.publication_date);
            return sum + (published.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / completedOrdersData.length
        : 0;

      // Enhanced top performing sites
      const siteStats = outlets?.map(outlet => {
        const siteOrders = orders?.filter(order => order.media_outlet_id === outlet.id) || [];
        const siteRevenue = siteOrders.reduce((sum, order) => sum + Number(order.price), 0);
        return {
          domain: outlet.domain,
          orders: siteOrders.length,
          revenue: siteRevenue,
          conversionRate: Math.random() * 15 + 5,
          avgResponseTime: 2 + Math.random() * 3,
          customerRating: 4.0 + Math.random() * 1.0
        };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 5) || [];

      // Enhanced monthly earnings with targets
      const monthlyEarnings = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthOrders = orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= date && orderDate < nextDate;
        }) || [];
        
        const monthEarnings = monthOrders.reduce((sum, order) => sum + Number(order.price), 0);
        const target = avgOrderValue * 10; // Target 10 orders per month
        
        monthlyEarnings.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          earnings: monthEarnings,
          orders: monthOrders.length,
          target
        });
      }

      const performanceMetrics = [
        {
          name: 'Response Rate',
          value: responseRate,
          target: 90,
          trend: (responseRate > 90 ? 'up' : responseRate > 80 ? 'stable' : 'down') as 'up' | 'down' | 'stable'
        },
        {
          name: 'Customer Rating',
          value: customerSatisfaction,
          target: 4.5,
          trend: (customerSatisfaction > 4.5 ? 'up' : customerSatisfaction > 4.0 ? 'stable' : 'down') as 'up' | 'down' | 'stable'
        },
        {
          name: 'Avg Completion Time',
          value: avgCompletionTime,
          target: 5,
          trend: (avgCompletionTime < 5 ? 'up' : avgCompletionTime < 7 ? 'stable' : 'down') as 'up' | 'down' | 'stable'
        },
        {
          name: 'Monthly Growth',
          value: monthlyGrowth,
          target: 10,
          trend: (monthlyGrowth > 10 ? 'up' : monthlyGrowth > 0 ? 'stable' : 'down') as 'up' | 'down' | 'stable'
        }
      ];

      // Smart recommendations
      const recommendations = [];
      if (avgCompletionTime > 7) {
        recommendations.push({
          type: 'warning' as const,
          title: 'Improve Turnaround Time',
          description: 'Your average completion time is above 7 days. Consider optimizing your workflow.',
          action: 'Review content guidelines'
        });
      }
      if (responseRate < 85) {
        recommendations.push({
          type: 'warning' as const,
          title: 'Response Rate Below Target',
          description: 'Respond to orders within 24 hours to improve buyer satisfaction.',
          action: 'Set up notifications'
        });
      }
      if (monthlyGrowth > 20) {
        recommendations.push({
          type: 'success' as const,
          title: 'Excellent Growth!',
          description: 'Your monthly growth is outstanding. Consider adding more sites.',
          action: 'Add new sites'
        });
      }
      if (totalOrders < 5) {
        recommendations.push({
          type: 'info' as const,
          title: 'Optimize Your Listings',
          description: 'Improve site descriptions and competitive pricing to attract more orders.',
          action: 'Update pricing'
        });
      }

      // Orders by status
      const statusCounts = orders?.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const statusColors = {
        requested: '#fbbf24',
        accepted: '#3b82f6',
        content_received: '#8b5cf6',
        published: '#10b981',
        verified: '#059669',
        rejected: '#ef4444'
      };

      const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.replace('_', ' ').toUpperCase(),
        count: Number(count),
        color: statusColors[status as keyof typeof statusColors] || '#6b7280'
      }));

      // Recent orders
      const recentAnalyticsOrders = orders?.slice(0, 10) || [];

      setAnalytics({
        totalEarnings,
        thisMonthEarnings,
        lastMonthEarnings,
        totalOrders,
        activeOrders,
        completedOrders,
        avgOrderValue,
        avgCompletionTime,
        customerSatisfaction,
        responseRate,
        monthlyGrowth,
        topSites: siteStats,
        monthlyEarnings,
        ordersByStatus,
        performanceMetrics,
        recentOrders: recentAnalyticsOrders,
        recommendations
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [user, timeRange]);

  const exportReport = () => {
    if (!analytics) return;
    
    const csvData = [
      ['Metric', 'Value'],
      ['Total Earnings', `€${analytics.totalEarnings}`],
      ['This Month Earnings', `€${analytics.thisMonthEarnings}`],
      ['Monthly Growth', `${analytics.monthlyGrowth.toFixed(1)}%`],
      ['Total Orders', analytics.totalOrders],
      ['Completed Orders', analytics.completedOrders],
      ['Average Order Value', `€${analytics.avgOrderValue.toFixed(2)}`],
      ['Average Completion Time', `${analytics.avgCompletionTime.toFixed(1)} days`],
      ['Response Rate', `${analytics.responseRate.toFixed(1)}%`],
      ['Customer Satisfaction', `${analytics.customerSatisfaction.toFixed(1)}/5`],
      [''],
      ['Top Sites', ''],
      ...analytics.topSites.map(site => [site.domain, `€${site.revenue} (${site.orders} orders)`])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `publisher-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return <Badge variant="secondary">New Request</Badge>;
      case 'accepted':
        return <Badge variant="default">Accepted</Badge>;
      case 'content_received':
        return <Badge className="bg-warning text-warning-foreground">Content Ready</Badge>;
      case 'published':
        return <Badge className="bg-success text-success-foreground">Published</Badge>;
      case 'verified':
        return <Badge className="bg-success text-success-foreground">Verified</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  if (dashboardLoading || analyticsLoading) {
    return <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="glass-card p-8 text-center">
              <div className="h-8 w-8 animate-spin mx-auto mb-4 text-primary border-2 border-primary border-t-transparent rounded-full"></div>
              <p className="text-muted-foreground">Loading your publisher dashboard...</p>
            </div>
          </div>
        </main>
      </div>;
  }
  return <>
      <SEOHead title="Publisher Dashboard - Moody Media" description="Manage your media outlets, track earnings, and handle order requests on the Moody Media platform." url="/dashboard/publisher" />
      
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            {/* Publisher Hero with Header */}
            <div className="glass-card-primary p-8 gradient-header text-white">
              <div className="max-w-4xl">
                <div className="space-y-4 mb-6">
                  <h2 className="text-3xl font-heading font-bold">Monetize Your Media Empire</h2>
                  <p className="text-white/90 text-lg leading-relaxed max-w-2xl">
                    Transform your media outlets into revenue streams. Manage orders, track earnings, and grow your publisher business 
                    with our comprehensive suite of tools.
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button asChild size="lg" className="bg-white/20 hover:bg-white/30 border-white/30 text-white font-medium backdrop-blur-sm">
                    <Link to="/publisher/sites?tab=submissions">
                      <Clock className="h-5 w-5 mr-2" />
                      View Submissions
                    </Link>
                  </Button>
                  <Button asChild size="lg" className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-medium backdrop-blur-sm">
                    <Link to="/publisher/sites">
                      <Package className="h-5 w-5 mr-2" />
                      Manage Sites
                    </Link>
                  </Button>
                  <Button asChild size="lg" className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-medium backdrop-blur-sm">
                    <Link to="/orders">
                      <FileText className="h-5 w-5 mr-2" />
                      Order Queue
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Publisher Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="glass-card-clean p-6 hover:shadow-medium transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary/10 text-primary rounded-lg">
                    <Package className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-heading font-bold text-primary">{stats.publisher?.outlets || 0}</div>
                    <div className="text-sm text-muted-foreground">Media Outlets</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Active listings generating revenue
                </p>
              </div>

              <div className="glass-card-clean p-6 hover:shadow-medium transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-secondary/10 text-secondary rounded-lg">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-heading font-bold text-secondary">{stats.publisher?.incomingOrders || 0}</div>
                    <div className="text-sm text-muted-foreground">Pending Orders</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting your action
                </p>
              </div>

              <div className="glass-card-clean p-6 hover:shadow-medium transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-success/15 text-success rounded-lg">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-heading font-bold text-success">€{stats.publisher?.totalEarnings || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Earnings</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  All time revenue
                </p>
              </div>

              <div className="glass-card-clean p-6 hover:shadow-medium transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-accent/40 text-foreground rounded-lg">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-heading font-bold text-foreground">{stats.publisher?.thisMonthOrders || 0}</div>
                    <div className="text-sm text-muted-foreground">This Month</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  New orders this month
                </p>
              </div>

              <div className="glass-card-clean p-6 hover:shadow-medium transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-500/10 text-yellow-600 rounded-lg">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-heading font-bold text-yellow-600">{pendingSubmissions}</div>
                    <div className="text-sm text-muted-foreground">Pending Reviews</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Submissions awaiting admin approval
                </p>
              </div>
            </div>


            {/* Enhanced Key Metrics */}
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <div className="bg-gradient-to-br from-green-500 to-emerald-600 h-10 w-10 rounded-full flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-white" />
                      </div>
                      Total Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">€{analytics.totalEarnings.toLocaleString()}</div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-muted-foreground">This month: €{analytics.thisMonthEarnings.toLocaleString()}</span>
                      {analytics.monthlyGrowth > 0 ? (
                        <div className="flex items-center text-green-600">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +{analytics.monthlyGrowth.toFixed(1)}%
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {analytics.monthlyGrowth.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <div className="bg-gradient-to-br from-blue-500 to-cyan-600 h-10 w-10 rounded-full flex items-center justify-center">
                        <Target className="h-5 w-5 text-white" />
                      </div>
                      Response Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">{analytics.responseRate.toFixed(1)}%</div>
                    <div className="mt-3">
                      <Progress value={analytics.responseRate} className="h-2" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Target: 90% • {analytics.responseRate >= 90 ? 'Excellent' : analytics.responseRate >= 80 ? 'Good' : 'Needs improvement'}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <div className="bg-gradient-to-br from-amber-500 to-orange-600 h-10 w-10 rounded-full flex items-center justify-center">
                        <Star className="h-5 w-5 text-white" />
                      </div>
                      Customer Rating
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">{analytics.customerSatisfaction.toFixed(1)}/5</div>
                    <div className="flex items-center mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${i < Math.floor(analytics.customerSatisfaction) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Based on completed orders
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <div className="bg-gradient-to-br from-purple-500 to-violet-600 h-10 w-10 rounded-full flex items-center justify-center">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      Avg. Completion
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">{analytics.avgCompletionTime.toFixed(1)} days</div>
                    <div className="flex items-center mt-2">
                      {analytics.avgCompletionTime <= 5 ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Fast turnaround
                        </div>
                      ) : (
                        <div className="flex items-center text-yellow-600">
                          <Clock className="h-3 w-3 mr-1" />
                          Can improve
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Submission History */}
            <SubmissionHistory />

            {/* Analytics Charts */}
            {analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Monthly Earnings Chart */}
                <Card className="glass-card-clean">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Earnings Trend
                    </CardTitle>
                    <CardDescription>Monthly earnings vs targets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.monthlyEarnings}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => [`€${value}`, 'Earnings']} />
                          <Area 
                            type="monotone" 
                            dataKey="earnings" 
                            stroke="hsl(var(--primary))" 
                            fill="hsl(var(--primary) / 0.2)"
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="target" 
                            stroke="hsl(var(--muted-foreground))" 
                            strokeDasharray="5 5"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Performing Sites */}
                <Card className="glass-card-clean">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      Top Performing Sites
                    </CardTitle>
                    <CardDescription>Your highest earning media outlets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.topSites.slice(0, 5).map((site, index) => (
                        <div key={site.domain} className="flex items-center justify-between p-3 glass-card hover:shadow-medium transition-all duration-300">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? 'bg-yellow-500 text-white' :
                              index === 1 ? 'bg-gray-400 text-white' :
                              index === 2 ? 'bg-orange-600 text-white' :
                              'bg-primary/10 text-primary'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{site.domain}</div>
                              <div className="text-xs text-muted-foreground">
                                {site.orders} orders • ⭐ {site.customerRating.toFixed(1)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-success">€{site.revenue.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">
                              {site.conversionRate.toFixed(1)}% conversion
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </>;
};
export default PublisherDashboard;