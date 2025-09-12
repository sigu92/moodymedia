import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SubmissionHistory } from "@/components/publisher/SubmissionHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, Edit2, Trash2, MoreHorizontal, Download, Package, Search, Filter, Zap, Target, TrendingUp, AlertTriangle, CheckCircle, Star, DollarSign, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CSVImportModal } from "@/components/publisher/CSVImportModal";
import { BulkEditModal } from "@/components/publisher/BulkEditModal";
import { CreateSiteModal } from "@/components/publisher/CreateSiteModal";
import { GoogleSheetsImportModal } from "@/components/publisher/GoogleSheetsImportModal";
import { Progress } from "@/components/ui/progress";

interface MediaOutletWithMetrics {
  id: string;
  domain: string;
  language: string;
  country: string;
  category: string;
  niches: string[];
  price: number;
  currency: string;
  is_active: boolean;
  lead_time_days: number;
  guidelines: string;
  created_at: string;
  status: string;
  submitted_at?: string;
  reviewed_at?: string;
  review_notes?: string;
  metrics: {
    ahrefs_dr: number;
    moz_da: number;
    semrush_as: number;
    spam_score: number;
    organic_traffic: number;
    referring_domains: number;
  };
  performance?: {
    orders: number;
    revenue: number;
    avgRating: number;
    responseTime: number;
  };
}

interface SiteOptimization {
  id: string;
  domain: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  type: 'pricing' | 'description' | 'metrics' | 'guidelines';
  action: string;
}

export default function PublisherSites() {
  const [searchParams] = useSearchParams();
  const [sites, setSites] = useState<MediaOutletWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [editingSite, setEditingSite] = useState<MediaOutletWithMetrics | null>(null);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showGoogleSheetsImport, setShowGoogleSheetsImport] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showCreateSite, setShowCreateSite] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'domain' | 'price' | 'orders' | 'revenue'>('domain');
  const [optimizations, setOptimizations] = useState<SiteOptimization[]>([]);
  const { user } = useAuth();

  const loadSites = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load sites with metrics and performance data
      const { data, error } = await supabase
        .from('media_outlets')
        .select(`
          *,
          metrics (
            ahrefs_dr,
            moz_da,
            semrush_as,
            spam_score,
            organic_traffic,
            referring_domains
          )
        `)
        .eq('publisher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get orders data for performance metrics
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('media_outlet_id, price, status')
        .eq('publisher_id', user.id);

      if (ordersError) throw ordersError;

      // Calculate performance metrics
      const sitesWithPerformance = data?.map(site => {
        const siteOrders = orders?.filter(order => order.media_outlet_id === site.id) || [];
        const revenue = siteOrders.reduce((sum, order) => sum + Number(order.price), 0);

        return {
          id: site.id,
          domain: site.domain,
          language: site.language,
          country: site.country,
          category: site.category,
          niches: site.niches || [],
          price: Number(site.price),
          currency: site.currency,
          is_active: site.is_active,
          lead_time_days: site.lead_time_days,
          guidelines: site.guidelines || '',
          created_at: site.created_at,
          status: site.status,
          submitted_at: site.submitted_at,
          reviewed_at: site.reviewed_at,
          review_notes: site.review_notes,
          metrics: {
            ahrefs_dr: site.metrics?.[0]?.ahrefs_dr || 0,
            moz_da: site.metrics?.[0]?.moz_da || 0,
            semrush_as: site.metrics?.[0]?.semrush_as || 0,
            spam_score: site.metrics?.[0]?.spam_score || 0,
            organic_traffic: site.metrics?.[0]?.organic_traffic || 0,
            referring_domains: site.metrics?.[0]?.referring_domains || 0,
          },
          performance: {
            orders: siteOrders.length,
            revenue,
            avgRating: 4.2 + Math.random() * 0.8, // Mock rating
            responseTime: 2 + Math.random() * 3, // Mock response time
          }
        };
      }) || [];

      setSites(sitesWithPerformance);
      generateOptimizations(sitesWithPerformance);
    } catch (error) {
      console.error('Error loading sites:', error);
      toast.error('Failed to load sites');
    } finally {
      setLoading(false);
    }
  };

  const generateOptimizations = (sites: MediaOutletWithMetrics[]) => {
    const optimizations: SiteOptimization[] = [];

    sites.forEach(site => {
      // Price optimization
      if (site.performance && site.performance.orders === 0 && site.price > 300) {
        optimizations.push({
          id: site.id,
          domain: site.domain,
          suggestion: 'Consider lowering price to attract first orders',
          impact: 'high',
          type: 'pricing',
          action: 'Reduce price by 15-20%'
        });
      }

      // Metrics optimization
      if (site.metrics.ahrefs_dr < 20) {
        optimizations.push({
          id: site.id,
          domain: site.domain,
          suggestion: 'Low DR may affect order volume',
          impact: 'medium',
          type: 'metrics',
          action: 'Update metrics or improve SEO'
        });
      }

      // Guidelines optimization
      if (!site.guidelines || site.guidelines.length < 50) {
        optimizations.push({
          id: site.id,
          domain: site.domain,
          suggestion: 'Add detailed content guidelines',
          impact: 'medium',
          type: 'guidelines',
          action: 'Write comprehensive guidelines'
        });
      }

      // Performance optimization
      if (site.performance && site.performance.orders > 0 && site.performance.avgRating < 4.0) {
        optimizations.push({
          id: site.id,
          domain: site.domain,
          suggestion: 'Improve customer satisfaction',
          impact: 'high',
          type: 'description',
          action: 'Review and improve service quality'
        });
      }
    });

    setOptimizations(optimizations);
  };

  useEffect(() => {
    loadSites();
  }, [user]);

  const handleToggleActive = async (siteId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('media_outlets')
        .update({ is_active: isActive })
        .eq('id', siteId);

      if (error) throw error;

      setSites(prev => prev.map(site => 
        site.id === siteId ? { ...site, is_active: isActive } : site
      ));

      toast.success(`Site ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating site:', error);
      toast.error('Failed to update site');
    }
  };

  const handleUpdatePrice = async (siteId: string, newPrice: number) => {
    try {
      const { error } = await supabase
        .from('media_outlets')
        .update({ price: newPrice })
        .eq('id', siteId);

      if (error) throw error;

      setSites(prev => prev.map(site => 
        site.id === siteId ? { ...site, price: newPrice } : site
      ));

      toast.success('Price updated');
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Failed to update price');
    }
  };

  const handleSelectSite = (siteId: string, checked: boolean) => {
    if (checked) {
      setSelectedSites(prev => [...prev, siteId]);
    } else {
      setSelectedSites(prev => prev.filter(id => id !== siteId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSites(filteredSites.map(site => site.id));
    } else {
      setSelectedSites([]);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary" as const,
      approved: "default" as const,
      active: "default" as const,
      rejected: "destructive" as const,
    };

    const labels = {
      pending: "Pending Review",
      approved: "Activated",
      active: "Active",
      rejected: "Rejected",
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getStatusMessage = (site: MediaOutletWithMetrics) => {
    switch (site.status) {
      case 'pending':
        return {
          type: 'info' as const,
          title: 'Under Review',
          message: 'Your submission is being reviewed by our admin team. Most reviews are completed within 24-48 hours.',
          action: 'Check the Submissions tab for updates.'
        };
      case 'approved':
        return {
          type: 'success' as const,
          title: 'Activated on Marketplace',
          message: 'Your site has been approved and is now live on the marketplace.',
          action: 'Your site is available for link building orders.'
        };
      case 'active':
        return {
          type: 'success' as const,
          title: 'Live on Marketplace',
          message: 'Your site is now active and available for link building orders.',
          action: 'Manage pricing and monitor performance in the overview.'
        };
      case 'rejected':
        return {
          type: 'warning' as const,
          title: 'Submission Needs Improvement',
          message: 'Your submission was not approved. Check the Submissions tab for detailed feedback.',
          action: 'Review admin feedback and resubmit with improvements.'
        };
      default:
        return null;
    }
  };

  const exportToCSV = () => {
    const headers = ['Domain', 'Price', 'Currency', 'Country', 'Language', 'Category', 'Active', 'Lead Time (days)', 'DR', 'Traffic', 'Orders', 'Revenue'];
    const csvContent = [
      headers.join(','),
      ...sites.map(site => [
        site.domain,
        site.price,
        site.currency,
        site.country,
        site.language,
        site.category,
        site.is_active,
        site.lead_time_days,
        site.metrics.ahrefs_dr,
        site.metrics.organic_traffic,
        site.performance?.orders || 0,
        site.performance?.revenue || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `publisher-sites-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Filter and sort sites
  const filteredSites = sites
    .filter(site => {
      const matchesSearch = site.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           site.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && site.is_active) ||
                           (filterStatus === 'inactive' && !site.is_active);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return b.price - a.price;
        case 'orders':
          return (b.performance?.orders || 0) - (a.performance?.orders || 0);
        case 'revenue':
          return (b.performance?.revenue || 0) - (a.performance?.revenue || 0);
        default:
          return a.domain.localeCompare(b.domain);
      }
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="glass-card p-8 text-center">
              <div className="h-8 w-8 animate-spin mx-auto mb-4 text-primary border-2 border-primary border-t-transparent rounded-full"></div>
              <p className="text-muted-foreground">Loading site analytics...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Site Management Pro
            </h1>
            <p className="text-muted-foreground text-lg">
              Advanced tools for managing and optimizing your media outlets
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowCSVImport(true)} className="glass-button hover:shadow-medium">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button variant="outline" onClick={() => setShowGoogleSheetsImport(true)} className="glass-button hover:shadow-medium">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Import Google Sheets
            </Button>
            <Button
              onClick={() => setShowCreateSite(true)}
              className="glass-button-primary shadow-glass"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Site
            </Button>
          </div>
        </div>

        <Tabs defaultValue={searchParams.get('tab') || 'overview'} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="management">Site Management</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Status-Based Alerts */}
            {(() => {
              const pendingCount = sites.filter(s => s.status === 'pending').length;
              const rejectedCount = sites.filter(s => s.status === 'rejected').length;
              const activeCount = sites.filter(s => s.status === 'active').length;

              return (
                <div className="space-y-4">
                  {pendingCount > 0 && (
                    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 dark:text-blue-200">
                        <strong>{pendingCount} site{pendingCount !== 1 ? 's' : ''} under review:</strong> Your submissions are being evaluated by our admin team.
                        Most reviews are completed within 24-48 hours. Check the Submissions tab for updates.
                      </AlertDescription>
                    </Alert>
                  )}

                  {rejectedCount > 0 && (
                    <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800 dark:text-orange-200">
                        <strong>{rejectedCount} submission{rejectedCount !== 1 ? 's' : ''} need{rejectedCount === 1 ? 's' : ''} improvement:</strong> Review admin feedback in the Submissions tab
                        and consider resubmitting with the suggested changes.
                      </AlertDescription>
                    </Alert>
                  )}

                  {activeCount > 0 && (
                    <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        <strong>{activeCount} site{activeCount !== 1 ? 's' : ''} active:</strong> Your sites are now live on the marketplace
                        and available for link building orders.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              );
            })()}

            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Total Sites
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{sites.length}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {sites.filter(s => s.is_active).length} active, {sites.filter(s => s.status === 'pending').length} pending
                  </p>
                </CardContent>
              </Card>
              
              <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    €{sites.reduce((sum, s) => sum + (s.performance?.revenue || 0), 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">All time earnings</p>
                </CardContent>
              </Card>
              
              <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    Avg. Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {sites.length > 0 ? (sites.reduce((sum, s) => sum + (s.performance?.avgRating || 0), 0) / sites.length).toFixed(1) : '0.0'}
                  </div>
                  <div className="flex items-center mt-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                    <span className="text-sm text-muted-foreground">Customer rating</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Optimizations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">{optimizations.length}</div>
                  <p className="text-sm text-muted-foreground mt-1">Suggested improvements</p>
                </CardContent>
              </Card>
            </div>

            {/* Submission Status Overview */}
            <Card className="glass-card-clean shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Submission Status Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="text-2xl font-bold text-yellow-600">
                      {sites.filter(s => s.status === 'pending').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending Review</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-2xl font-bold text-green-600">
                      {sites.filter(s => s.status === 'active').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-2xl font-bold text-red-600">
                      {sites.filter(s => s.status === 'rejected').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Rejected</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-2xl font-bold text-blue-600">
                      {sites.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Submissions</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Performance Overview */}
            <Card className="glass-card-clean shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {sites.slice(0, 3).map((site, index) => (
                    <div key={site.id} className="glass-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold">{site.domain}</span>
                        <Badge variant={site.is_active ? "default" : "secondary"}>
                          {site.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Orders:</span>
                          <span className="font-medium">{site.performance?.orders || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Revenue:</span>
                          <span className="font-medium">€{site.performance?.revenue || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Rating:</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{site.performance?.avgRating.toFixed(1) || '0.0'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="management" className="space-y-6">
            {/* Search and Filter */}
            <Card className="glass-card-clean">
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search sites..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 glass-input"
                      />
                    </div>
                  </div>
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger className="w-40 glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sites</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Inactive Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-40 glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="domain">Sort by Domain</SelectItem>
                      <SelectItem value="price">Sort by Price</SelectItem>
                      <SelectItem value="orders">Sort by Orders</SelectItem>
                      <SelectItem value="revenue">Sort by Revenue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedSites.length > 0 && (
              <Card className="glass-card border-primary/30 ring-2 ring-primary/20 animate-fade-in">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedSites.length} site{selectedSites.length !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBulkEdit(true)}
                        className="glass-button"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Bulk Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSites([])}
                        className="glass-button"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Sites Table */}
            <Card className="glass-card-clean shadow-medium">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border/30">
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedSites.length === filteredSites.length && filteredSites.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded glass-button"
                        />
                      </TableHead>
                      <TableHead className="font-semibold">Domain</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Price</TableHead>
                      <TableHead className="font-semibold">Country</TableHead>
                      <TableHead className="font-semibold">DR</TableHead>
                      <TableHead className="font-semibold">Orders</TableHead>
                      <TableHead className="font-semibold">Revenue</TableHead>
                      <TableHead className="font-semibold">Rating</TableHead>
                      <TableHead className="font-semibold">Active</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSites.map((site, index) => (
                      <TableRow 
                        key={site.id} 
                        className="hover:bg-primary/5 transition-colors duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedSites.includes(site.id)}
                            onChange={(e) => handleSelectSite(site.id, e.target.checked)}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold text-foreground">{site.domain}</div>
                            <div className="text-xs text-muted-foreground flex gap-1 mt-1">
                              {site.niches.slice(0, 2).map(niche => (
                                <Badge key={niche} variant="outline" className="text-xs px-2 py-0 glass-button">
                                  {niche}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            {getStatusBadge(site.status)}
                            {site.status !== 'active' && site.review_notes && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Has feedback
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={site.price}
                            onChange={(e) => handleUpdatePrice(site.id, Number(e.target.value))}
                            className="w-20 text-sm glass-input"
                            min="0"
                            step="5"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="glass-button">{site.country}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={site.metrics.ahrefs_dr >= 30 ? 'default' : 'secondary'} className="glass-button-primary">
                            {site.metrics.ahrefs_dr}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{site.performance?.orders || 0}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-green-600">€{site.performance?.revenue || 0}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{site.performance?.avgRating.toFixed(1) || '0.0'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={site.is_active}
                            onCheckedChange={(checked) => handleToggleActive(site.id, checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingSite(site)}
                            className="glass-button hover:glass-button-primary"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <SubmissionHistory />
          </TabsContent>

          <TabsContent value="optimization" className="space-y-6">
            {/* Optimization Suggestions */}
            <Card className="glass-card-clean shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Smart Optimization Suggestions
                </CardTitle>
                <CardDescription>
                  AI-powered recommendations to improve your site performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {optimizations.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <p className="text-muted-foreground">All sites are well optimized!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {optimizations.map((opt, index) => (
                      <div key={index} className={`p-4 rounded-lg border-l-4 glass-card-light ${
                        opt.impact === 'high' ? 'border-l-red-500' :
                        opt.impact === 'medium' ? 'border-l-yellow-500' :
                        'border-l-blue-500'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">{opt.domain}</span>
                              <Badge variant={
                                opt.impact === 'high' ? 'destructive' :
                                opt.impact === 'medium' ? 'default' :
                                'secondary'
                              }>
                                {opt.impact} impact
                              </Badge>
                              <Badge variant="outline">{opt.type}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{opt.suggestion}</p>
                            <p className="text-sm font-medium text-primary">{opt.action}</p>
                          </div>
                          <Button size="sm" variant="outline" className="glass-button">
                            Apply Fix
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {/* Performance Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card-clean shadow-medium">
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sites
                      .sort((a, b) => (b.performance?.revenue || 0) - (a.performance?.revenue || 0))
                      .slice(0, 5)
                      .map((site, index) => (
                        <div key={site.id} className="flex items-center gap-3 p-3 glass-card-light rounded-lg">
                          <Badge variant="outline" className="h-8 w-8 p-0 flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          <div className="flex-1">
                            <div className="font-semibold">{site.domain}</div>
                            <div className="text-sm text-muted-foreground">
                              {site.performance?.orders || 0} orders • €{site.performance?.revenue || 0}
                            </div>
                          </div>
                          <Progress 
                            value={(site.performance?.revenue || 0) / Math.max(...sites.map(s => s.performance?.revenue || 0)) * 100} 
                            className="w-20 h-2"
                          />
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card-clean shadow-medium">
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Average Response Time</span>
                      <span className="font-semibold">
                        {sites.length > 0 ? (sites.reduce((sum, s) => sum + (s.performance?.responseTime || 0), 0) / sites.length).toFixed(1) : '0.0'}h
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Order Fulfillment Rate</span>
                      <span className="font-semibold text-green-600">96.5%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average Customer Rating</span>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">
                          {sites.length > 0 ? (sites.reduce((sum, s) => sum + (s.performance?.avgRating || 0), 0) / sites.length).toFixed(1) : '0.0'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Revenue Growth (30d)</span>
                      <span className="font-semibold text-green-600">+12.3%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <CSVImportModal
          isOpen={showCSVImport}
          onClose={() => setShowCSVImport(false)}
          onSuccess={loadSites}
        />

        <BulkEditModal
          isOpen={showBulkEdit}
          onClose={() => setShowBulkEdit(false)}
          selectedSites={sites.filter(site => selectedSites.includes(site.id))}
          onUpdate={() => {
            loadSites();
            setSelectedSites([]);
          }}
        />

        <CreateSiteModal
          open={showCreateSite || !!editingSite}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateSite(false);
              setEditingSite(null);
            }
          }}
          onSiteCreated={loadSites}
          editingSite={editingSite}
        />

        <GoogleSheetsImportModal
          open={showGoogleSheetsImport}
          onOpenChange={setShowGoogleSheetsImport}
          onImportComplete={loadSites}
        />
        </div>
      </main>
    </div>
  );
}