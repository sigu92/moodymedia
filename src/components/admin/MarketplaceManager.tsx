import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Package,
  DollarSign,
  BarChart3,
  Users,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PendingApprovalsTab } from './PendingApprovalsTab';

interface MediaOutlet {
  id: string;
  domain: string;
  category: string;
  price: number;
  purchase_price?: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'active';
  submitted_at: string;
  reviewed_at?: string;
  submitted_by: string;
  reviewed_by?: string;
  review_notes?: string;
  is_active: boolean;
  created_at: string;
  metrics?: {
    ahrefs_dr: number;
    moz_da: number;
    semrush_as: number;
    spam_score: number;
    organic_traffic: number;
    referring_domains: number;
  };
}

interface SubmissionStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export function MarketplaceManager() {
  const [submissions, setSubmissions] = useState<MediaOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SubmissionStats>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const { toast } = useToast();

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoading(true);

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
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSubmissions(data || []);

      // Calculate stats
      const pendingCount = data?.filter(s => s.status === 'pending').length || 0;
      const approvedCount = data?.filter(s => s.status === 'approved' || s.status === 'active').length || 0;
      const rejectedCount = data?.filter(s => s.status === 'rejected').length || 0;
      const totalCount = data?.length || 0;

      setStats({
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        total: totalCount
      });

    } catch (error) {
      console.error('Error loading submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load marketplace submissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
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
      approved: "Approved",
      active: "Active",
      rejected: "Rejected",
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const renderPendingApprovals = () => (
    <PendingApprovalsTab submissions={submissions} onRefresh={loadSubmissions} />
  );

  const renderApprovedListings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Approved Listings ({stats.approved})
          </CardTitle>
          <CardDescription>
            View and manage approved marketplace listings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Approved Listings Tab</h3>
            <p className="text-muted-foreground">
              This tab will show all approved marketplace listings.
              Implementation will be completed in subsequent tasks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderRejectedSubmissions = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Rejected Submissions ({stats.rejected})
          </CardTitle>
          <CardDescription>
            Review rejected submissions and admin feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Rejected Submissions Tab</h3>
            <p className="text-muted-foreground">
              This tab will show rejected submissions with feedback.
              Implementation will be completed in subsequent tasks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderProfitAnalytics = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Profit Analytics
          </CardTitle>
          <CardDescription>
            Analyze profit margins and pricing strategies across marketplace listings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Profit Analytics Tab</h3>
            <p className="text-muted-foreground">
              This tab will contain profit margin analytics and pricing insights.
              Implementation will be completed in task 4.6.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Marketplace Manager</CardTitle>
            <CardDescription>Loading marketplace data...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin mx-auto text-primary border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-sm text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Approved Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-sm text-muted-foreground mt-1">Active on marketplace</p>
          </CardContent>
        </Card>

        <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Rejected Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-sm text-muted-foreground mt-1">Require improvement</p>
          </CardContent>
        </Card>

        <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Total Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.total}</div>
            <p className="text-sm text-muted-foreground mt-1">All time submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Interface */}
      <Card className="glass-card-clean shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Marketplace Manager
          </CardTitle>
          <CardDescription>
            Centralized management interface for marketplace submissions and approvals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Approvals ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved Listings ({stats.approved})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Rejected Submissions ({stats.rejected})
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Profit Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-6">
              {renderPendingApprovals()}
            </TabsContent>

            <TabsContent value="approved" className="space-y-6">
              {renderApprovedListings()}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-6">
              {renderRejectedSubmissions()}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {renderProfitAnalytics()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
