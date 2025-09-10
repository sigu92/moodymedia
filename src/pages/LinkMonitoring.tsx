import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Link,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  BarChart3,
  Zap,
  Target,
  Eye,
  RefreshCw,
  Search,
  Calendar,
  TrendingUp,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LinkMonitoringData {
  id: string;
  orderId: string;
  domain: string;
  targetUrl: string;
  publicationUrl: string;
  anchorText: string;
  publicationDate: string;
  status: 'pending' | 'live' | 'removed' | 'error';
  lastChecked: string;
  statusCode: number;
  responseTime: number;
  indexStatus: 'indexed' | 'not_indexed' | 'pending';
  backlinks: number;
  socialShares: number;
  firstSeen: string;
  metricHistory: MetricSnapshot[];
}

interface MetricSnapshot {
  date: string;
  status: string;
  responseTime: number;
  backlinks: number;
  socialShares: number;
}

interface MonitoringStats {
  totalLinks: number;
  liveLinks: number;
  removedLinks: number;
  avgResponseTime: number;
  indexedLinks: number;
  healthScore: number;
}

export default function LinkMonitoringSystem() {
  const { user } = useAuth();
  const [links, setLinks] = useState<LinkMonitoringData[]>([]);
  const [stats, setStats] = useState<MonitoringStats>({
    totalLinks: 0,
    liveLinks: 0,
    removedLinks: 0,
    avgResponseTime: 0,
    indexedLinks: 0,
    healthScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLink, setSelectedLink] = useState<LinkMonitoringData | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (user) {
      loadMonitoringData();
    }
  }, [user]);

  const loadMonitoringData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Mock data for demonstration
      const mockLinks: LinkMonitoringData[] = [
        {
          id: '1',
          orderId: 'order_123',
          domain: 'techblog.com',
          targetUrl: 'https://example.com/product',
          publicationUrl: 'https://techblog.com/review-awesome-product',
          anchorText: 'awesome product review',
          publicationDate: '2024-01-15',
          status: 'live',
          lastChecked: new Date().toISOString(),
          statusCode: 200,
          responseTime: 850,
          indexStatus: 'indexed',
          backlinks: 12,
          socialShares: 45,
          firstSeen: '2024-01-15',
          metricHistory: [
            { date: '2024-01-15', status: 'live', responseTime: 800, backlinks: 8, socialShares: 20 },
            { date: '2024-01-20', status: 'live', responseTime: 850, backlinks: 12, socialShares: 45 }
          ]
        },
        {
          id: '2',
          orderId: 'order_124',
          domain: 'healthnews.se',
          targetUrl: 'https://example.com/health-product',
          publicationUrl: 'https://healthnews.se/artikel/ny-halsoprodukt',
          anchorText: 'ny hälsoprodukt',
          publicationDate: '2024-01-10',
          status: 'removed',
          lastChecked: new Date().toISOString(),
          statusCode: 404,
          responseTime: 0,
          indexStatus: 'not_indexed',
          backlinks: 0,
          socialShares: 12,
          firstSeen: '2024-01-10',
          metricHistory: [
            { date: '2024-01-10', status: 'live', responseTime: 950, backlinks: 5, socialShares: 12 },
            { date: '2024-01-25', status: 'removed', responseTime: 0, backlinks: 0, socialShares: 12 }
          ]
        },
        {
          id: '3',
          orderId: 'order_125',
          domain: 'bizjournal.no',
          targetUrl: 'https://example.com/business-tool',
          publicationUrl: 'https://bizjournal.no/business-efficiency-tools',
          anchorText: 'business efficiency tools',
          publicationDate: '2024-01-20',
          status: 'live',
          lastChecked: new Date().toISOString(),
          statusCode: 200,
          responseTime: 650,
          indexStatus: 'pending',
          backlinks: 3,
          socialShares: 8,
          firstSeen: '2024-01-20',
          metricHistory: [
            { date: '2024-01-20', status: 'live', responseTime: 650, backlinks: 3, socialShares: 8 }
          ]
        }
      ];

      setLinks(mockLinks);

      // Calculate stats
      const liveLinks = mockLinks.filter(l => l.status === 'live').length;
      const removedLinks = mockLinks.filter(l => l.status === 'removed').length;
      const indexedLinks = mockLinks.filter(l => l.indexStatus === 'indexed').length;
      const avgResponseTime = mockLinks
        .filter(l => l.status === 'live')
        .reduce((sum, l) => sum + l.responseTime, 0) / liveLinks || 0;
      
      const healthScore = Math.round((liveLinks / mockLinks.length) * 100);

      setStats({
        totalLinks: mockLinks.length,
        liveLinks,
        removedLinks,
        avgResponseTime: Math.round(avgResponseTime),
        indexedLinks,
        healthScore
      });

    } catch (error) {
      console.error('Error loading monitoring data:', error);
      toast.error('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const checkAllLinks = async () => {
    setIsMonitoring(true);
    toast.info('Starting link monitoring check...');
    
    // Simulate monitoring process
    for (let i = 0; i < links.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Update progress or status here
    }
    
    setIsMonitoring(false);
    toast.success('Link monitoring check completed');
    loadMonitoringData();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'removed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getIndexStatusBadge = (status: string) => {
    switch (status) {
      case 'indexed':
        return <Badge variant="default" className="text-xs">Indexed</Badge>;
      case 'not_indexed':
        return <Badge variant="destructive" className="text-xs">Not Indexed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Unknown</Badge>;
    }
  };

  const filteredLinks = links.filter(link => {
    const matchesSearch = link.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         link.anchorText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || link.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center glass-card-clean p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading link monitoring data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Link Monitoring System
            </h1>
            <p className="text-muted-foreground text-lg">
              Monitor and track your published links across all orders
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={checkAllLinks} 
              disabled={isMonitoring}
              className="glass-button-primary"
            >
              {isMonitoring ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check All Links
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
            <CardContent className="p-4 text-center">
              <Link className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.totalLinks}</div>
              <p className="text-sm text-muted-foreground">Total Links</p>
            </CardContent>
          </Card>

          <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{stats.liveLinks}</div>
              <p className="text-sm text-muted-foreground">Live Links</p>
            </CardContent>
          </Card>

          <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
            <CardContent className="p-4 text-center">
              <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{stats.removedLinks}</div>
              <p className="text-sm text-muted-foreground">Removed</p>
            </CardContent>
          </Card>

          <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
            <CardContent className="p-4 text-center">
              <Activity className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{stats.avgResponseTime}ms</div>
              <p className="text-sm text-muted-foreground">Avg Response</p>
            </CardContent>
          </Card>

          <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
            <CardContent className="p-4 text-center">
              <Search className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{stats.indexedLinks}</div>
              <p className="text-sm text-muted-foreground">Indexed</p>
            </CardContent>
          </Card>

          <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{stats.healthScore}%</div>
              <p className="text-sm text-muted-foreground">Health Score</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="monitoring" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="monitoring">Link Monitoring</TabsTrigger>
            <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
            <TabsTrigger value="alerts">Alert Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="monitoring" className="space-y-6">
            {/* Filters */}
            <Card className="glass-card-clean">
              <CardContent className="p-4">
                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search domains or anchor text..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 glass-input"
                      />
                    </div>
                  </div>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-md border glass-input"
                  >
                    <option value="all">All Status</option>
                    <option value="live">Live</option>
                    <option value="removed">Removed</option>
                    <option value="pending">Pending</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Links Table */}
            <Card className="glass-card-clean shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5 text-primary" />
                  Monitored Links ({filteredLinks.length})
                </CardTitle>
                <CardDescription>
                  Real-time monitoring of all your published links
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border/30">
                      <TableHead>Domain</TableHead>
                      <TableHead>Anchor Text</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Index Status</TableHead>
                      <TableHead>Metrics</TableHead>
                      <TableHead>Last Checked</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLinks.map((link, index) => (
                      <TableRow 
                        key={link.id} 
                        className="hover:bg-primary/5 transition-colors duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div>{link.domain}</div>
                            <div className="text-xs text-muted-foreground">
                              Published: {new Date(link.publicationDate).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-48 truncate" title={link.anchorText}>
                            {link.anchorText}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(link.status)}
                            <span className="capitalize">{link.status}</span>
                            {link.statusCode && (
                              <Badge variant="outline" className="text-xs">
                                {link.statusCode}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {link.status === 'live' ? (
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${
                                link.responseTime < 1000 ? 'bg-green-500' :
                                link.responseTime < 2000 ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                              <span className="text-sm">{link.responseTime}ms</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getIndexStatusBadge(link.indexStatus)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            <div>Backlinks: {link.backlinks}</div>
                            <div>Shares: {link.socialShares}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(link.lastChecked).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.open(link.publicationUrl, '_blank')}
                              className="glass-button text-xs"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedLink(link)}
                              className="glass-button text-xs"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card-clean">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Link Health Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Overall Health Score</span>
                        <span className="font-semibold">{stats.healthScore}%</span>
                      </div>
                      <Progress value={stats.healthScore} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Index Rate</span>
                        <span className="font-semibold">{Math.round((stats.indexedLinks / stats.totalLinks) * 100)}%</span>
                      </div>
                      <Progress value={(stats.indexedLinks / stats.totalLinks) * 100} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uptime Rate</span>
                        <span className="font-semibold">{Math.round((stats.liveLinks / stats.totalLinks) * 100)}%</span>
                      </div>
                      <Progress value={(stats.liveLinks / stats.totalLinks) * 100} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card-clean">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="glass-card p-4">
                      <div className="text-sm text-muted-foreground">Average Response Time</div>
                      <div className="text-2xl font-bold">{stats.avgResponseTime}ms</div>
                      <div className="text-xs text-green-600">↓ 15% faster than last month</div>
                    </div>
                    
                    <div className="glass-card p-4">
                      <div className="text-sm text-muted-foreground">Total Backlinks Generated</div>
                      <div className="text-2xl font-bold">{links.reduce((sum, l) => sum + l.backlinks, 0)}</div>
                      <div className="text-xs text-blue-600">↑ 23 new this week</div>
                    </div>
                    
                    <div className="glass-card p-4">
                      <div className="text-sm text-muted-foreground">Social Engagement</div>
                      <div className="text-2xl font-bold">{links.reduce((sum, l) => sum + l.socialShares, 0)}</div>
                      <div className="text-xs text-purple-600">↑ 12% increase</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <Card className="glass-card-clean">
              <CardHeader>
                <CardTitle>Monitoring Alerts</CardTitle>
                <CardDescription>
                  Configure alerts for link status changes and performance issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="glass-card p-4">
                    <h4 className="font-semibold mb-2">Link Removal Detection</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Get notified immediately when any of your published links are removed or return 404 errors.
                    </p>
                    <Badge variant="default">Active</Badge>
                  </div>
                  
                  <div className="glass-card p-4">
                    <h4 className="font-semibold mb-2">Performance Degradation</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Alert when link response times exceed 3 seconds or availability drops below 95%.
                    </p>
                    <Badge variant="secondary">Paused</Badge>
                  </div>
                  
                  <div className="glass-card p-4">
                    <h4 className="font-semibold mb-2">Index Status Changes</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Monitor Google index status and get notified of de-indexing events.
                    </p>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}