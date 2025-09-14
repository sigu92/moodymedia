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
  BarChart3,
  Calculator,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ProfitMarginCell } from './ProfitMarginDisplay';
import { BulkActionsBar } from './BulkActionsBar';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import { MarginControls } from './MarginControls';
import { BulkOperationErrorBoundary } from './BulkOperationErrorBoundary';
import { BulkMarginSummary } from './BulkMarginSummary';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { MediaOutlet } from '@/types';

interface MarginCalculation {
  marginType?: 'fixed' | 'percentage';
  marginAmount?: number;
  marginPercentage?: number;
}

interface PendingApprovalsTabProps {
  submissions: MediaOutlet[];
  onRefresh: () => void;
  selectedUserId?: string | null;
  onUserSelect?: (userId: string | null) => void;
}

export function PendingApprovalsTab({ submissions, onRefresh, selectedUserId, onUserSelect }: PendingApprovalsTabProps) {
  console.log('[PendingApprovalsTab] Props:', { submissionsCount: submissions?.length, selectedUserId, onUserSelect: !!onUserSelect });

  const [pendingSubmissions, setPendingSubmissions] = useState<MediaOutlet[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'submitted_at' | 'domain' | 'price' | 'ahrefs_dr'>('submitted_at');

  // Bulk operations
  const bulkOps = useBulkOperations();
  const [showMarginDialog, setShowMarginDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
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

  // Bulk margin application
  const handleApplyMargins = () => {
    setShowMarginDialog(true);
  };

  const handleMarginApplied = async (marginCalculation: MarginCalculation) => {
    // Apply the margin to all selected submissions
    const marginType = marginCalculation.marginType || 'fixed';
    const marginValue = marginType === 'fixed'
      ? marginCalculation.marginAmount
      : marginCalculation.marginPercentage;

    const success = await bulkOps.applyMarginsToSelection(
      selectedSubmissions,
      { type: marginType, value: marginValue },
      (completed, total) => {
        console.log(`Applied margins to ${completed}/${total} submissions`);
      }
    );

    if (success) {
      setShowMarginDialog(false);
      onRefresh(); // Refresh the data
    }
  };

  // Updated bulk approve with confirmation
  const handleBulkApprove = () => {
    setConfirmAction('approve');
    setShowConfirmDialog(true);
  };

  // Updated bulk reject with confirmation
  const handleBulkReject = () => {
    setConfirmAction('reject');
    setShowConfirmDialog(true);
  };

  // Execute confirmed bulk action
  const executeConfirmedBulkAction = async () => {
    if (!confirmAction) return;

    setShowConfirmDialog(false);
    let success = false;

    if (confirmAction === 'approve') {
      success = await bulkOps.approveBulk(
        selectedSubmissions,
        0, // Not used in new workflow - prices already set
        reviewNotes,
        (completed, total) => {
          console.log(`Approved ${completed}/${total} submissions`);
        }
      );
    } else if (confirmAction === 'reject') {
      success = await bulkOps.rejectBulk(
        selectedSubmissions,
        reviewNotes,
        (completed, total) => {
          console.log(`Rejected ${completed}/${total} submissions`);
        }
      );
    }

    if (success) {
      clearSelection();
      // Refresh data after a short delay to ensure backend operations complete
      setTimeout(() => onRefresh(), 1000);
    }
  };

  const filteredAndSortedSubmissions = pendingSubmissions
    .filter(submission => {
      const matchesSearch = submission.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           submission.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || submission.category === categoryFilter;
      const matchesUser = !selectedUserId || submission.submitted_by === selectedUserId;

      const result = matchesSearch && matchesCategory && matchesUser;
      if (!result && selectedUserId) {
        console.log('[PendingApprovalsTab] Filtering out submission:', submission.domain, 'user:', submission.submitted_by, 'selectedUserId:', selectedUserId);
      }

      return result;
    })
    .sort((a, b) => {
      let aValue: string | number | Date, bValue: string | number | Date;

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
    // Client-side validation
    if (marketplacePrice <= 0) {
      toast({
        title: "Validation Error",
        description: "Please set a marketplace price greater than €0",
        variant: "destructive"
      });
      return;
    }

    if (marketplacePrice > 10000) {
      toast({
        title: "Validation Error",
        description: "Marketplace price cannot exceed €10,000",
        variant: "destructive"
      });
      return;
    }

    if (reviewNotes.length > 2000) {
      toast({
        title: "Validation Error",
        description: "Review notes cannot exceed 2000 characters",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Call the admin-approve edge function with proper error handling
      const { data, error } = await supabase.functions.invoke('admin-approve', {
        body: {
          submission_id: submission.id,
          action: 'approve',
          marketplace_price: marketplacePrice,
          review_notes: reviewNotes.trim() || null
        }
      });

      if (error) {
        console.error('Admin approve function error:', error);

        // Handle different error types
        if (error.message?.includes('already been reviewed')) {
          toast({
            title: "Concurrent Modification",
            description: "This submission has already been reviewed by another administrator. Refreshing...",
            variant: "destructive"
          });
          onRefresh(); // Refresh to show current state
          return;
        }

        if (error.message?.includes('current status is')) {
          toast({
            title: "Invalid Status",
            description: error.message,
            variant: "destructive"
          });
          onRefresh(); // Refresh to show current state
          return;
        }

        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error occurred');
      }

      toast({
        title: "Success",
        description: `${submission.domain} has been approved and is now active on the marketplace`,
      });

      setShowReviewModal(false);
      setSelectedSubmission(null);
      setReviewNotes('');
      setMarketplacePrice(0);
      onRefresh();

    } catch (error: unknown) {
      console.error('Error approving submission:', error);

      // Handle network/API errors
      if (error.message?.includes('fetch')) {
        toast({
          title: "Network Error",
          description: "Unable to connect to approval service. Please check your connection and try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Approval Failed",
          description: error.message || "Failed to approve submission. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (submission: MediaOutlet) => {
    // Client-side validation
    if (!reviewNotes.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide feedback explaining why this submission was rejected",
        variant: "destructive"
      });
      return;
    }

    if (reviewNotes.length > 2000) {
      toast({
        title: "Validation Error",
        description: "Review notes cannot exceed 2000 characters",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Call the admin-approve edge function with proper error handling
      const { data, error } = await supabase.functions.invoke('admin-approve', {
        body: {
          submission_id: submission.id,
          action: 'reject',
          review_notes: reviewNotes.trim()
        }
      });

      if (error) {
        console.error('Admin reject function error:', error);

        // Handle different error types
        if (error.message?.includes('already been reviewed')) {
          toast({
            title: "Concurrent Modification",
            description: "This submission has already been reviewed by another administrator. Refreshing...",
            variant: "destructive"
          });
          onRefresh(); // Refresh to show current state
          return;
        }

        if (error.message?.includes('current status is')) {
          toast({
            title: "Invalid Status",
            description: error.message,
            variant: "destructive"
          });
          onRefresh(); // Refresh to show current state
          return;
        }

        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error occurred');
      }

      toast({
        title: "Submission Rejected",
        description: `${submission.domain} has been rejected with feedback provided`,
      });

      setShowReviewModal(false);
      setSelectedSubmission(null);
      setReviewNotes('');
      onRefresh();

    } catch (error: unknown) {
      console.error('Error rejecting submission:', error);

      // Handle network/API errors
      if (error.message?.includes('fetch')) {
        toast({
          title: "Network Error",
          description: "Unable to connect to approval service. Please check your connection and try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Rejection Failed",
          description: error.message || "Failed to reject submission. Please try again.",
          variant: "destructive"
        });
      }
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


  const executeBulkAction = async () => {
    if (selectedSubmissions.length === 0) return;

    // Client-side validation
    if (bulkAction === 'approve' && bulkPrice <= 0) {
      toast({
        title: "Validation Error",
        description: "Please set a marketplace price greater than €0",
        variant: "destructive"
      });
      return;
    }

    if (bulkAction === 'approve' && bulkPrice > 10000) {
      toast({
        title: "Validation Error",
        description: "Marketplace price cannot exceed €10,000",
        variant: "destructive"
      });
      return;
    }

    if (bulkAction === 'reject' && !reviewNotes.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide feedback explaining why these submissions were rejected",
        variant: "destructive"
      });
      return;
    }

    if (reviewNotes.length > 2000) {
      toast({
        title: "Validation Error",
        description: "Review notes cannot exceed 2000 characters",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const selectedSubs = filteredAndSortedSubmissions.filter(s =>
        selectedSubmissions.includes(s.id)
      );

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      // Process each submission individually to handle partial failures gracefully
      for (const submission of selectedSubs) {
        try {
          const { data, error } = await supabase.functions.invoke('admin-approve', {
            body: {
              submission_id: submission.id,
              action: bulkAction,
              marketplace_price: bulkAction === 'approve' ? bulkPrice : undefined,
              review_notes: reviewNotes.trim() || null
            }
          });

          if (error || !data?.success) {
            console.error(`Failed to process ${submission.domain}:`, error || data?.error);
            failureCount++;
            results.push({ domain: submission.domain, success: false, error: error?.message || data?.error });
          } else {
            successCount++;
            results.push({ domain: submission.domain, success: true });
          }
        } catch (submissionError: unknown) {
          console.error(`Exception processing ${submission.domain}:`, submissionError);
          failureCount++;
          results.push({ domain: submission.domain, success: false, error: submissionError.message });
        }
      }

      // Show results
      if (successCount > 0) {
        toast({
          title: bulkAction === 'approve' ? "Bulk Approval Complete" : "Bulk Rejection Complete",
          description: `${successCount} of ${selectedSubs.length} submissions processed successfully`,
        });
      }

      if (failureCount > 0) {
        toast({
          title: "Some Actions Failed",
          description: `${failureCount} submissions could not be processed. Check console for details.`,
          variant: "destructive"
        });
      }

      clearSelection();
      setShowBulkPricing(false);
      setBulkAction(null);
      setBulkPrice(0);
      setReviewNotes('');
      onRefresh();

    } catch (error: unknown) {
      console.error('Bulk action error:', error);
      toast({
        title: "Bulk Action Failed",
        description: "Unable to process bulk action. Please check your connection and try again.",
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
                  <TableHead>Marketplace Price</TableHead>
                  <TableHead>Profit</TableHead>
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
                      <div className="text-sm">
                        <div className="font-semibold">
                          €{(submission.price && submission.price > 0) ? submission.price : (submission.purchase_price || 'N/A')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {submission.purchase_price && (submission.price || submission.purchase_price) ? (
                        <ProfitMarginCell
                          costPrice={submission.purchase_price}
                          sellingPrice={submission.price || submission.purchase_price}
                          adminTags={submission.admin_tags}
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
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

  // Debug logging for filtered submissions
  useEffect(() => {
    console.log('[PendingApprovalsTab] Filtered submissions:', filteredAndSortedSubmissions.length, 'selectedUserId:', selectedUserId);
  }, [filteredAndSortedSubmissions.length, selectedUserId]);

  return (
    <div className="space-y-6">
      {/* Fixed Bulk Actions Bar with Error Boundary */}
      <BulkOperationErrorBoundary
        operationName="bulk approval workflow"
        onRetry={() => {
          // Clear any failed state and allow retry
          bulkOps.clearResults();
        }}
      >
        <BulkActionsBar
          selectedCount={selectedSubmissions.length}
          selectedSubmissions={selectedSubmissions}
          allSubmissions={filteredAndSortedSubmissions}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
          onApplyMargins={handleApplyMargins}
          onClearSelection={clearSelection}
          loading={loading || bulkOps.isProcessing}
        />
      </BulkOperationErrorBoundary>

      {/* Enhanced Progress indicator for bulk operations */}
      {bulkOps.isProcessing && (
        <Card>
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Bulk Operation in Progress</h4>
                <Badge variant="secondary" className="text-xs">
                  {bulkOps.progress.completed}/{bulkOps.progress.total}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{bulkOps.progress.currentOperation}</span>
                  <span>{Math.round((bulkOps.progress.completed / bulkOps.progress.total) * 100)}%</span>
                </div>
                <Progress
                  value={(bulkOps.progress.completed / bulkOps.progress.total) * 100}
                  className="w-full h-2"
                />
              </div>

              {/* Estimated time remaining (simple calculation) */}
              {bulkOps.progress.completed > 0 && (
                <div className="text-xs text-muted-foreground">
                  Processing at ~{Math.round(bulkOps.progress.completed / Math.max(1, (Date.now() - Date.now() + 1000) / 1000))} items/sec
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operation Results Summary */}
      {bulkOps.results.length > 0 && !bulkOps.isProcessing && (
        <Card>
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Operation Results</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={bulkOps.clearResults}
                  className="text-xs"
                >
                  Clear
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {bulkOps.results.filter(r => r.success).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Successful</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {bulkOps.results.filter(r => !r.success).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {bulkOps.results.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>

              {/* Show errors if any */}
              {bulkOps.results.some(r => r.error) && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="text-sm">
                      <strong>Errors occurred:</strong>
                      <ul className="mt-2 space-y-1">
                        {bulkOps.results
                          .filter(r => r.error)
                          .slice(0, 3) // Show first 3 errors
                          .map((result, index) => (
                            <li key={index} className="text-xs">
                              {result.submissionId.slice(0, 8)}...: {result.error}
                            </li>
                          ))}
                        {bulkOps.results.filter(r => r.error).length > 3 && (
                          <li className="text-xs text-muted-foreground">
                            ...and {bulkOps.results.filter(r => r.error).length - 3} more
                          </li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
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
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
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

            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as typeof viewMode)} className="w-auto">
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

                {/* Margin Controls */}
                {selectedSubmission.purchase_price && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Quick Margin Calculator
                    </h5>
                    <MarginControls
                      askingPrice={selectedSubmission.purchase_price}
                      onMarginApplied={(calculation) => {
                        setMarketplacePrice(calculation.finalPrice);
                      }}
                      currentMarketplacePrice={marketplacePrice}
                      disabled={loading}
                    />
                  </div>
                )}

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
                  disabled={loading}
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
                  variant="outline"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleApprove(selectedSubmission)}
                  disabled={loading || marketplacePrice <= 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Calculator className="h-4 w-4 mr-1" />
                  Apply & Approve
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

      {/* Margin Application Dialog */}
      <Dialog open={showMarginDialog} onOpenChange={setShowMarginDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Apply Margins to {selectedSubmissions.length} Submissions
            </DialogTitle>
            <DialogDescription className="space-y-1">
              <div>Apply profit margins to selected submissions.</div>
              <div className="text-sm text-muted-foreground">
                Publisher's uploaded price = cost to platform • Added margin = platform profit • Final price = customer pays
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <MarginControls
              askingPrice={0} // Not used in bulk mode - margins applied to each submission's individual asking price
              onMarginApplied={handleMarginApplied}
              disabled={bulkOps.isProcessing}
              isBulkMode={true}
              selectedSubmissionCount={selectedSubmissions.length}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMarginDialog(false)}
              disabled={bulkOps.isProcessing}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'approve' ? 'Step 2: Approve & Publish Submissions' : 'Bulk Reject Submissions'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'approve'
                ? `This will approve and publish all selected submissions that have margins applied. Only submissions with set marketplace prices will be processed.`
                : `This will reject ${selectedSubmissions.length} selected submissions. All publishers will receive the rejection feedback.`
              }
            </DialogDescription>
          </DialogHeader>


          <div className="space-y-2">
            <Label htmlFor="bulk-notes">
              {confirmAction === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
            </Label>
            <Textarea
              id="bulk-notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={
                confirmAction === 'approve'
                  ? "Optional notes about the approval decision..."
                  : "Please provide feedback explaining the rejection..."
              }
              rows={3}
            />
          </div>

          {/* Summary of affected submissions */}
          <Alert>
            <AlertDescription>
              <div className="text-sm">
                <strong>Summary:</strong>
                <ul className="mt-2 space-y-1">
                  {confirmAction === 'approve' ? (
                    <>
                      <li>• Only submissions with applied margins will be approved and published</li>
                      <li>• Submissions without margins will be skipped</li>
                      <li>• Marketplace prices are already set from Step 1</li>
                      <li>• Websites will go live on the marketplace immediately</li>
                    </>
                  ) : (
                    <>
                      <li>• {selectedSubmissions.length} submissions will be rejected</li>
                      <li>• Publishers will receive rejection feedback</li>
                    </>
                  )}
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={bulkOps.isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={executeConfirmedBulkAction}
              disabled={
                bulkOps.isProcessing ||
                (confirmAction === 'reject' && !reviewNotes.trim())
              }
              variant={confirmAction === 'approve' ? 'default' : 'destructive'}
            >
              {bulkOps.isProcessing ? 'Processing...' : `Confirm ${confirmAction === 'approve' ? 'Approval' : 'Rejection'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
