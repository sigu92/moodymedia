import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Eye,
  User,
  Calendar,
  Globe,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MediaOutlet {
  id: string;
  domain: string;
  category: string;
  country: string;
  language: string;
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

interface PendingApprovalsTabProps {
  submissions: MediaOutlet[];
  onRefresh: () => void;
}

export function PendingApprovalsTab({ submissions, onRefresh }: PendingApprovalsTabProps) {
  const [pendingSubmissions, setPendingSubmissions] = useState<MediaOutlet[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'submitted_at' | 'domain' | 'price' | 'ahrefs_dr'>('submitted_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedSubmission, setSelectedSubmission] = useState<MediaOutlet | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [marketplacePrice, setMarketplacePrice] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBulkPricing, setShowBulkPricing] = useState(false);
  const [bulkPrice, setBulkPrice] = useState<number>(0);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const pending = submissions.filter(s => s.status === 'pending');
    setPendingSubmissions(pending);
    // Clear selections when submissions change
    setSelectedSubmissions([]);
    setShowBulkActions(false);
  }, [submissions]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSubmissions(filteredAndSortedSubmissions.map(s => s.id));
    } else {
      setSelectedSubmissions([]);
    }
  };

  const handleSelectSubmission = (submissionId: string, checked: boolean) => {
    if (checked) {
      setSelectedSubmissions(prev => [...prev, submissionId]);
    } else {
      setSelectedSubmissions(prev => prev.filter(id => id !== submissionId));
    }
  };

  const clearSelection = () => {
    setSelectedSubmissions([]);
    setShowBulkActions(false);
  };

  const filteredAndSortedSubmissions = pendingSubmissions
    .filter(submission => {
      const matchesSearch = submission.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           submission.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || submission.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'domain':
          aValue = a.domain.toLowerCase();
          bValue = b.domain.toLowerCase();
          break;
        case 'price':
          aValue = a.purchase_price || 0;
          bValue = b.purchase_price || 0;
          break;
        case 'ahrefs_dr':
          aValue = a.metrics?.ahrefs_dr || 0;
          bValue = b.metrics?.ahrefs_dr || 0;
          break;
        case 'submitted_at':
        default:
          aValue = new Date(a.submitted_at);
          bValue = new Date(b.submitted_at);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const getUniqueCategories = () => {
    const categories = [...new Set(pendingSubmissions.map(s => s.category))];
    return categories.sort();
  };

  const calculateProfitMargin = (purchasePrice: number, marketplacePrice: number) => {
    if (purchasePrice <= 0) return 0;
    return ((marketplacePrice - purchasePrice) / purchasePrice) * 100;
  };

  const handleApprove = async (submission: MediaOutlet) => {
    if (marketplacePrice <= 0) {
      toast({
        title: "Error",
        description: "Please set a marketplace price",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('media_outlets')
        .update({
          status: 'approved',
          price: marketplacePrice,
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin', // This should be the current admin user
          review_notes: reviewNotes,
          is_active: true
        })
        .eq('id', submission.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${submission.domain} has been approved and added to the marketplace`,
      });

      setShowReviewModal(false);
      setSelectedSubmission(null);
      setReviewNotes('');
      setMarketplacePrice(0);
      onRefresh();

    } catch (error) {
      console.error('Error approving submission:', error);
      toast({
        title: "Error",
        description: "Failed to approve submission",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (submission: MediaOutlet) => {
    if (!reviewNotes.trim()) {
      toast({
        title: "Error",
        description: "Please provide feedback for rejection",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('media_outlets')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin', // This should be the current admin user
          review_notes: reviewNotes
        })
        .eq('id', submission.id);

      if (error) throw error;

      toast({
        title: "Submission Rejected",
        description: `${submission.domain} has been rejected with feedback provided`,
      });

      setShowReviewModal(false);
      setSelectedSubmission(null);
      setReviewNotes('');
      onRefresh();

    } catch (error) {
      console.error('Error rejecting submission:', error);
      toast({
        title: "Error",
        description: "Failed to reject submission",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (submission: MediaOutlet) => {
    setSelectedSubmission(submission);
    setMarketplacePrice(submission.purchase_price || 100);
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const handleBulkApprove = () => {
    setBulkAction('approve');
    setBulkPrice(100); // Default price
    setShowBulkPricing(true);
  };

  const handleBulkReject = () => {
    setBulkAction('reject');
    setShowBulkPricing(true);
  };

  const executeBulkAction = async () => {
    if (selectedSubmissions.length === 0) return;

    setLoading(true);
    try {
      const selectedSubs = filteredAndSortedSubmissions.filter(s =>
        selectedSubmissions.includes(s.id)
      );

      if (bulkAction === 'approve') {
        // Bulk approve with the same price
        const updates = selectedSubs.map(submission => ({
          id: submission.id,
          status: 'approved',
          price: bulkPrice,
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin', // This should be the current admin user
          is_active: true
        }));

        for (const update of updates) {
          const { error } = await supabase
            .from('media_outlets')
            .update(update)
            .eq('id', update.id);

          if (error) throw error;
        }

        toast({
          title: "Bulk Approval Complete",
          description: `Successfully approved ${selectedSubs.length} submissions`,
        });

      } else if (bulkAction === 'reject') {
        // Bulk reject
        const updates = selectedSubs.map(submission => ({
          id: submission.id,
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin', // This should be the current admin user
          review_notes: reviewNotes || 'Bulk rejected by admin'
        }));

        for (const update of updates) {
          const { error } = await supabase
            .from('media_outlets')
            .update(update)
            .eq('id', update.id);

          if (error) throw error;
        }

        toast({
          title: "Bulk Rejection Complete",
          description: `Successfully rejected ${selectedSubs.length} submissions`,
        });
      }

      clearSelection();
      setShowBulkPricing(false);
      setBulkAction(null);
      setBulkPrice(0);
      setReviewNotes('');
      onRefresh();

    } catch (error) {
      console.error('Error executing bulk action:', error);
      toast({
        title: "Error",
        description: "Failed to process bulk action",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderTableView = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" />
          Pending Approvals ({filteredAndSortedSubmissions.length})
        </CardTitle>
        <CardDescription>
          Review and approve website submissions for marketplace inclusion
        </CardDescription>
      </CardHeader>
      <CardContent>
        {filteredAndSortedSubmissions.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Submissions</h3>
            <p className="text-muted-foreground">
              All submissions have been reviewed. New submissions will appear here.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedSubmissions.length === filteredAndSortedSubmissions.length && filteredAndSortedSubmissions.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Asking Price</TableHead>
                  <TableHead>DR</TableHead>
                  <TableHead>Traffic</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedSubmissions.includes(submission.id)}
                        onChange={(e) => handleSelectSubmission(submission.id, e.target.checked)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{submission.domain}</div>
                        <div className="text-sm text-muted-foreground">
                          {submission.country} • {submission.language}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{submission.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-semibold">
                          €{submission.purchase_price || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={submission.metrics?.ahrefs_dr >= 30 ? 'default' : 'secondary'}
                        className="font-mono"
                      >
                        {submission.metrics?.ahrefs_dr || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {submission.metrics?.organic_traffic ?
                          `${(submission.metrics.organic_traffic / 1000).toFixed(1)}K` :
                          'N/A'
                        }
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(submission.submitted_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => openReviewModal(submission)}
                        className="mr-2"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredAndSortedSubmissions.map((submission) => (
        <Card key={submission.id} className={`hover:shadow-md transition-shadow ${selectedSubmissions.includes(submission.id) ? 'ring-2 ring-primary' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedSubmissions.includes(submission.id)}
                  onChange={(e) => handleSelectSubmission(submission.id, e.target.checked)}
                  className="rounded"
                />
                <Badge variant="secondary">Pending</Badge>
              </div>
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{submission.domain}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Globe className="h-3 w-3" />
                {submission.category} • {submission.country}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Asking Price</div>
                <div className="font-semibold">€{submission.purchase_price || 'N/A'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Domain Rating</div>
                <div className="font-semibold">{submission.metrics?.ahrefs_dr || 'N/A'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Traffic</div>
                <div className="font-semibold">
                  {submission.metrics?.organic_traffic ?
                    `${(submission.metrics.organic_traffic / 1000).toFixed(1)}K` :
                    'N/A'
                  }
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Submitted</div>
                <div className="font-semibold text-xs">
                  {format(new Date(submission.submitted_at), 'MMM dd')}
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => openReviewModal(submission)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Review Submission
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Show bulk actions when submissions are selected
  useEffect(() => {
    setShowBulkActions(selectedSubmissions.length > 0);
  }, [selectedSubmissions]);

  return (
    <div className="space-y-6">
      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <Card className="border-primary/30 ring-2 ring-primary/20 animate-fade-in">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedSubmissions.length} submission{selectedSubmissions.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleBulkApprove}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Bulk Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkReject}
                    disabled={loading}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Bulk Reject
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={loading}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search domains or categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {getUniqueCategories().map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted_at">Sort by Date</SelectItem>
                  <SelectItem value="domain">Sort by Domain</SelectItem>
                  <SelectItem value="price">Sort by Price</SelectItem>
                  <SelectItem value="ahrefs_dr">Sort by DR</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </Button>
            </div>

            <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)} className="w-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="table">Table</TabsTrigger>
                <TabsTrigger value="cards">Cards</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === 'table' ? renderTableView() : renderCardView()}

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Review Submission: {selectedSubmission?.domain}
            </DialogTitle>
            <DialogDescription>
              Review the submission details and set the marketplace pricing
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Submission Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Domain</label>
                  <div className="text-lg font-semibold">{selectedSubmission.domain}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <div className="text-sm">{selectedSubmission.category}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Country & Language</label>
                  <div className="text-sm">{selectedSubmission.country} • {selectedSubmission.language}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Submitted</label>
                  <div className="text-sm">{format(new Date(selectedSubmission.submitted_at), 'PPP')}</div>
                </div>
              </div>

              {/* SEO Metrics */}
              <div>
                <h4 className="text-sm font-medium mb-3">SEO Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <div className="text-2xl font-bold">{selectedSubmission.metrics?.ahrefs_dr || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">Domain Rating</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <div className="text-2xl font-bold">{selectedSubmission.metrics?.moz_da || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">Domain Authority</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <div className="text-2xl font-bold">{selectedSubmission.metrics?.organic_traffic ?
                      `${(selectedSubmission.metrics.organic_traffic / 1000).toFixed(1)}K` : 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">Monthly Traffic</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <div className="text-2xl font-bold">{selectedSubmission.metrics?.referring_domains || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">Referring Domains</div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Pricing Strategy</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Publisher's Asking Price</label>
                    <div className="text-lg font-semibold text-green-600">
                      €{selectedSubmission.purchase_price || 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Marketplace Price *</label>
                    <Input
                      type="number"
                      value={marketplacePrice}
                      onChange={(e) => setMarketplacePrice(Number(e.target.value))}
                      placeholder="Set marketplace price"
                      min="0"
                      step="5"
                    />
                  </div>
                </div>

                {selectedSubmission.purchase_price && marketplacePrice > 0 && (
                  <Alert>
                    <BarChart3 className="h-4 w-4" />
                    <AlertDescription>
                      Profit margin: <span className="font-semibold">
                        {calculateProfitMargin(selectedSubmission.purchase_price, marketplacePrice).toFixed(1)}%
                      </span>
                      {calculateProfitMargin(selectedSubmission.purchase_price, marketplacePrice) < 20 && (
                        <span className="text-orange-600 ml-2">(Consider higher price for better margins)</span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Review Notes */}
              <div>
                <label className="text-sm font-medium">Review Notes</label>
                <textarea
                  className="w-full mt-2 p-3 border rounded-md min-h-24 resize-none"
                  placeholder="Add any feedback, notes, or requirements for this submission..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>

              {/* Actions */}
              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedSubmission)}
                  disabled={loading || !reviewNotes.trim()}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedSubmission)}
                  disabled={loading || marketplacePrice <= 0}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Pricing Modal */}
      <Dialog open={showBulkPricing} onOpenChange={setShowBulkPricing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'approve' ? 'Bulk Approve Submissions' : 'Bulk Reject Submissions'}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'approve'
                ? `Set marketplace price for ${selectedSubmissions.length} selected submissions`
                : `Add rejection notes for ${selectedSubmissions.length} selected submissions`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {bulkAction === 'approve' && (
              <div>
                <label className="text-sm font-medium">Marketplace Price (€)</label>
                <Input
                  type="number"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(Number(e.target.value))}
                  placeholder="Enter price for all selected submissions"
                  min="0"
                  step="5"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This price will be applied to all selected submissions
                </p>
              </div>
            )}

            {bulkAction === 'reject' && (
              <div>
                <label className="text-sm font-medium">Rejection Notes</label>
                <textarea
                  className="w-full mt-1 p-3 border rounded-md min-h-20 resize-none"
                  placeholder="Provide feedback for rejected submissions..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  These notes will be shared with all rejected publishers
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkPricing(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={executeBulkAction}
              disabled={loading || (bulkAction === 'approve' && bulkPrice <= 0) || (bulkAction === 'reject' && !reviewNotes.trim())}
            >
              {loading ? 'Processing...' : bulkAction === 'approve' ? 'Approve All' : 'Reject All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
