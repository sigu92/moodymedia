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
import { ProfitAnalyticsTab } from './ProfitAnalyticsTab';
import { UserSummaryCard } from './UserSummaryCard';
import { MediaOutlet } from '@/types';

interface SubmissionStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

interface UserGroup {
  userId: string;
  email?: string;
  name?: string;
  pendingCount: number;
  totalSubmissions: number;
  lastSubmissionDate: string;
}

export function MarketplaceManager() {
  const [submissions, setSubmissions] = useState<MediaOutlet[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SubmissionStats>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const { toast } = useToast();

  const loadData = async () => {
    await Promise.all([loadUserGroups(), loadSubmissions()]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadUserGroups = async () => {
    try {
      console.log('[MarketplaceManager] Loading user groups...');

      // Query to group pending submissions by user and get user info
      const { data, error } = await supabase
        .from('media_outlets')
        .select(`
          submitted_by,
          submitted_at
        `)
        .eq('status', 'pending')
        .not('submitted_by', 'is', null)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('[MarketplaceManager] Error loading user groups:', error);
        return;
      }

      // Group submissions by user and count them
      const userGroupsMap = new Map<string, UserGroup>();

      data?.forEach((submission) => {
        const userId = submission.submitted_by;
        if (!userId) return;

        const existingGroup = userGroupsMap.get(userId);
        if (existingGroup) {
          existingGroup.pendingCount += 1;
          existingGroup.totalSubmissions += 1;
          // Update last submission date if this is newer
          if (new Date(submission.submitted_at) > new Date(existingGroup.lastSubmissionDate)) {
            existingGroup.lastSubmissionDate = submission.submitted_at;
          }
        } else {
          // Use user ID as display name for now (could be enhanced later with user lookup)
          const userName = `User ${userId.slice(0, 8)}`;

          userGroupsMap.set(userId, {
            userId,
            name: userName,
            pendingCount: 1,
            totalSubmissions: 1,
            lastSubmissionDate: submission.submitted_at
          });
        }
      });

      // Convert map to array and sort by pending count (descending)
      const userGroupsArray = Array.from(userGroupsMap.values())
        .sort((a, b) => b.pendingCount - a.pendingCount);

      // Only log detailed user group info in development
      if (import.meta.env.DEV) {
        console.log('[MarketplaceManager] Loaded user groups:', userGroupsArray.length, 'groups');
        console.log('[MarketplaceManager] User group summary:', userGroupsArray.map(g => ({
          userId: g.userId,
          pendingCount: g.pendingCount,
          totalSubmissions: g.totalSubmissions
        })));
      } else {
        console.log('[MarketplaceManager] Loaded user groups:', userGroupsArray.length, 'groups');
      }
      setUserGroups(userGroupsArray);

    } catch (error) {
      console.error('[MarketplaceManager] Error in loadUserGroups:', error);
      toast({
        title: "Error",
        description: "Failed to load user groups",
        variant: "destructive"
      });
    }
  };

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      console.log('[MarketplaceManager] Starting to load submissions...');

      const { data: userData } = await supabase.auth.getUser();
      console.log('[MarketplaceManager] Current user:', userData?.user?.id, userData?.user?.email);

      let query = supabase
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

      // Filter by selected user if one is selected
      if (selectedUserId) {
        query = query.eq('submitted_by', selectedUserId);
      }

      const { data, error } = await query;

      console.log('[MarketplaceManager] Query result:', {
        error,
        dataCount: data?.length || 0,
        data: data?.slice(0, 3) // Log first 3 items for debugging
      });

      if (error) {
        console.error('[MarketplaceManager] Database error:', error);
        throw error;
      }

      setSubmissions(data || []);

      // Calculate stats
      const pendingCount = data?.filter(s => s.status === 'pending').length || 0;
      const activeCount = data?.filter(s => s.status === 'active').length || 0;
      const rejectedCount = data?.filter(s => s.status === 'rejected').length || 0;
      const totalCount = data?.length || 0;

      console.log('[MarketplaceManager] Calculated stats:', {
        pending: pendingCount,
        active: activeCount,
        rejected: rejectedCount,
        total: totalCount
      });

      setStats({
        pending: pendingCount,
        approved: activeCount,
        rejected: rejectedCount,
        total: totalCount
      });

      console.log('[MarketplaceManager] Submissions loaded successfully');

    } catch (error) {
      console.error('[MarketplaceManager] Error loading submissions:', error);
      toast({
        title: "Error",
        description: `Failed to load marketplace submissions: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = async (userId: string | null) => {
    setSelectedUserId(userId);
    // Reload submissions with the new filter
    await loadSubmissions();
  };

  const handleSelectAllUserSubmissions = async (userId: string) => {
    // This will be handled by the PendingApprovalsTab component
    // For now, just select the user to show their submissions
    await handleUserSelect(userId);
    // TODO: Pass this to PendingApprovalsTab to auto-select all submissions
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
    <PendingApprovalsTab
      submissions={submissions}
      onRefresh={loadData}
      selectedUserId={selectedUserId}
      onUserSelect={handleUserSelect}
    />
  );

  const renderApprovedListings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Active Listings ({stats.approved})
          </CardTitle>
          <CardDescription>
            View and manage active marketplace listings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Active Listings Tab</h3>
            <p className="text-muted-foreground">
              This tab will show all active marketplace listings.
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
    <ProfitAnalyticsTab />
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
                    Active Listings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
                  <p className="text-sm text-muted-foreground mt-1">Live on marketplace</p>
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

      {/* User Groups Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">User Submissions</h3>
          {selectedUserId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUserSelect(null)}
            >
              Show All Users
            </Button>
          )}
        </div>

        {userGroups.length === 0 ? (
          <Card className="p-6 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-semibold mb-2">No Pending Submissions</h4>
            <p className="text-muted-foreground">
              There are currently no pending submissions from users. New submissions will appear here grouped by user.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {userGroups.map((userGroup) => (
              <UserSummaryCard
                key={userGroup.userId}
                userGroup={userGroup}
                isSelected={selectedUserId === userGroup.userId}
                onClick={() => handleUserSelect(userGroup.userId)}
                onSelectAll={userGroup.pendingCount > 1 ? () => handleSelectAllUserSubmissions(userGroup.userId) : undefined}
              />
            ))}
          </div>
        )}
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
                Active Listings ({stats.approved})
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
