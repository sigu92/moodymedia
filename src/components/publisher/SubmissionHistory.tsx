import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Calendar,
  Eye,
  Bell
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MediaOutlet, MediaOutletStatus } from "@/types";
import { format } from "date-fns";
import { SubmissionProgressIndicator } from "./SubmissionProgressIndicator";
import { useNotifications } from "@/hooks/useNotifications";

interface SubmissionHistoryProps {
  onViewDetails?: (submission: MediaOutlet) => void;
}

export function SubmissionHistory({ onViewDetails }: SubmissionHistoryProps) {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const [submissions, setSubmissions] = useState<MediaOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
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
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setSubmissions(data || []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [user]);

  const getStatusIcon = (status: MediaOutletStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: MediaOutletStatus) => {
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
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {labels[status]}
      </Badge>
    );
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Submission History
          </CardTitle>
          <CardDescription>Track the status of your website submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Submission History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Submission History
            </CardTitle>
            <CardDescription>
              Track the status of your website submissions and admin feedback
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSubmissions}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
            <p className="text-muted-foreground">
              Your website submissions will appear here once you submit them for review.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Reviewed</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{submission.domain}</div>
                        <div className="text-sm text-muted-foreground">
                          {submission.category} • {submission.country}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-3">
                        {getStatusBadge(submission.status)}
                        <SubmissionProgressIndicator
                          status={submission.status}
                          submittedAt={submission.submitted_at}
                          reviewedAt={submission.reviewed_at}
                          className="max-w-xs"
                        />
                        {submission.review_notes && (
                          <div className="text-xs">
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <MessageSquare className="h-3 w-3" />
                              Admin Feedback
                            </div>
                            <div className="text-xs bg-muted/50 p-2 rounded border-l-2 border-orange-300 text-foreground">
                              {submission.review_notes}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(submission.submitted_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {submission.reviewed_at ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {formatDate(submission.reviewed_at)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not reviewed</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-semibold">
                          €{submission.price}
                        </div>
                        {submission.purchase_price && (
                          <div className="text-muted-foreground">
                            Asking: €{submission.purchase_price}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {onViewDetails && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetails(submission)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Status Information */}
        {submissions.length > 0 && (
          <div className="mt-6 space-y-4">
            {/* Status Alerts */}
            {(() => {
              const pendingCount = submissions.filter(s => s.status === 'pending').length;
              const rejectedCount = submissions.filter(s => s.status === 'rejected').length;
              const activeCount = submissions.filter(s => s.status === 'active').length;

              return (
                <div className="space-y-3">
                  {pendingCount > 0 && (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{pendingCount} submission{pendingCount !== 1 ? 's' : ''} under review:</strong> Our admin team is evaluating your sites.
                        You'll receive an email notification once the review is complete.
                      </AlertDescription>
                    </Alert>
                  )}

                  {activeCount > 0 && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{activeCount} site{activeCount !== 1 ? 's' : ''} active:</strong> These sites are now live on the marketplace
                        and available for link building orders.
                      </AlertDescription>
                    </Alert>
                  )}

                  {rejectedCount > 0 && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{rejectedCount} submission{rejectedCount !== 1 ? 's' : ''} need{rejectedCount === 1 ? 's' : ''} revision:</strong> Review the admin feedback above,
                        make the suggested improvements, and resubmit your sites.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              );
            })()}

            {/* Recent Notifications */}
            {(() => {
              const submissionNotifications = notifications
                .filter(n => n.type === 'submission_status')
                .slice(0, 3);

              if (submissionNotifications.length === 0) return null;

              return (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Recent Status Updates
                  </h4>
                  <div className="space-y-2">
                    {submissionNotifications.map((notification) => (
                      <Alert key={notification.id} className="border-l-4 border-l-green-500">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertDescription className="flex items-center justify-between">
                          <span>{notification.message}</span>
                          <span className="text-xs text-muted-foreground ml-4">
                            {format(new Date(notification.created_at), 'MMM dd, HH:mm')}
                          </span>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {submissions.filter(s => s.status === 'pending').length}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {submissions.filter(s => s.status === 'active').length}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {submissions.filter(s => s.status === 'rejected').length}
                </div>
                <div className="text-sm text-muted-foreground">Rejected</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">
                  {submissions.length}
                </div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
