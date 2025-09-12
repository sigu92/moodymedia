import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Activity, TrendingUp, AlertTriangle, Users, Eye, MousePointer, Download, RefreshCw, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

export const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  const loadAnalytics = () => {
    try {
      const data = JSON.parse(localStorage.getItem('analytics') || '[]');
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const filteredAnalytics = analytics.filter(event => {
    const eventTime = new Date(event.timestamp);
    const now = new Date();
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;

    return (now.getTime() - eventTime.getTime()) < (hours * 60 * 60 * 1000);
  });

  // Calculate metrics
  const totalEvents = filteredAnalytics.length;
  const uniqueSessions = new Set(filteredAnalytics.map(e => e.sessionId)).size;
  const errorEvents = filteredAnalytics.filter(e => e.category === 'error').length;
  const pageViews = filteredAnalytics.filter(e => e.event === 'page_view').length;
  const userActions = filteredAnalytics.filter(e => e.event === 'user_action').length;

  // Top pages
  const pageViewsByPath = filteredAnalytics
    .filter(e => e.event === 'page_view')
    .reduce((acc, event) => {
      const path = event.metadata?.pathname || event.label || 'unknown';
      acc[path] = (acc[path] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const topPages = Object.entries(pageViewsByPath)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  // Events by category
  const eventsByCategory = filteredAnalytics.reduce((acc, event) => {
    acc[event.category] = (acc[event.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(eventsByCategory).map(([category, count]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    count,
    fill: category === 'error' ? '#ef4444' : category === 'navigation' ? '#3b82f6' : category === 'interaction' ? '#10b981' : '#6b7280'
  }));

  // Hourly activity
  const hourlyActivity = Array.from({ length: 24 }, (_, hour) => {
    const hourEvents = filteredAnalytics.filter(event => {
      const eventHour = new Date(event.timestamp).getHours();
      return eventHour === hour;
    });
    return {
      hour: `${hour}:00`,
      events: hourEvents.length,
      errors: hourEvents.filter(e => e.category === 'error').length
    };
  });

  const exportAnalytics = () => {
    const csvData = [
      ['Timestamp', 'Event', 'Category', 'Action', 'Label', 'Value', 'Session ID'],
      ...filteredAnalytics.map(event => [
        event.timestamp,
        event.event,
        event.category,
        event.action,
        event.label || '',
        event.value || '',
        event.sessionId
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearAnalytics = () => {
    if (confirm('Are you sure you want to clear all analytics data?')) {
      localStorage.removeItem('analytics');
      setAnalytics([]);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Monitor user behavior and system health</p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="destructive" size="sm" onClick={clearAnalytics}>
            Clear Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{totalEvents.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Events</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{uniqueSessions}</div>
                <div className="text-sm text-muted-foreground">Unique Sessions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{pageViews.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Page Views</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MousePointer className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{userActions.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">User Actions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{errorEvents}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pages">Top Pages</TabsTrigger>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Event Categories</CardTitle>
                <CardDescription>Breakdown of events by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        label={({ category, count }) => `${category}: ${count}`}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Hourly Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Hourly Activity</CardTitle>
                <CardDescription>Events and errors by hour</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlyActivity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="events" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
              <CardDescription>Most visited pages in the selected time range</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead>Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPages.map((page, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{page.path}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{page.count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>Latest user interactions and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredAnalytics.slice(-50).reverse().map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {event.category}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm">{event.action}</div>
                        {event.label && <div className="text-xs text-muted-foreground">{event.label}</div>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{format(new Date(event.timestamp), 'HH:mm:ss')}</div>
                      <div>{format(new Date(event.timestamp), 'MMM dd')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Error Events
              </CardTitle>
              <CardDescription>JavaScript errors and system failures</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAnalytics.filter(e => e.category === 'error').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No errors recorded in the selected time range
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredAnalytics
                    .filter(e => e.category === 'error')
                    .slice(-20)
                    .reverse()
                    .map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-medium">{error.label}</div>
                          <div className="text-xs mt-1 opacity-75">
                            {format(new Date(error.timestamp), 'MMM dd, HH:mm:ss')}
                            {error.metadata?.url && ` • ${error.metadata.url}`}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
