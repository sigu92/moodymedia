import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DataTable, Column } from './DataTable';
import { DollarSign, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface PayoutRequest {
  id: string;
  referrer_user_id: string;
  amount: number;
  status: 'requested' | 'approved' | 'paid' | 'denied';
  notes?: string;
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
}

interface PayoutStats {
  total_earned: number;
  total_spent: number;
  total_pending: number;
  total_approved: number;
  total_paid: number;
}

interface PayoutsResponse {
  stats: PayoutStats;
  payout_queue: PayoutRequest[];
}

export function PayoutsManagement() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [stats, setStats] = useState<PayoutStats>({
    total_earned: 0,
    total_spent: 0,
    total_pending: 0,
    total_approved: 0,
    total_paid: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'approve' | 'deny' | 'mark_paid' | null;
    payout: PayoutRequest | null;
  }>({
    open: false,
    action: null,
    payout: null,
  });
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  const columns: Column<PayoutRequest>[] = [
    {
      key: 'referrer_user_id',
      header: 'User ID',
      render: (value) => (
        <span className="font-mono text-xs">{value.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          €{Number(value).toFixed(2)}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => {
        const variants = {
          requested: { variant: 'secondary' as const, icon: Clock },
          approved: { variant: 'default' as const, icon: CheckCircle },
          paid: { variant: 'default' as const, icon: CheckCircle },
          denied: { variant: 'destructive' as const, icon: XCircle },
        };
        const config = variants[value as keyof typeof variants];
        const Icon = config.icon;
        return (
          <Badge variant={config.variant} className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {value}
          </Badge>
        );
      },
    },
    {
      key: 'requested_at',
      header: 'Requested',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'processed_at',
      header: 'Processed',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      key: 'id',
      header: 'Actions',
      render: (_, payout) => (
        <div className="flex gap-2">
          {payout.status === 'requested' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openActionDialog('approve', payout)}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openActionDialog('deny', payout)}
              >
                Deny
              </Button>
            </>
          )}
          {payout.status === 'approved' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openActionDialog('mark_paid', payout)}
            >
              Mark Paid
            </Button>
          )}
        </div>
      ),
    },
  ];

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-payouts', {
        body: null,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) throw error;

      const response: PayoutsResponse = data;
      setPayouts(response.payout_queue);
      setStats(response.stats);
    } catch (error) {
      console.error('Error fetching payouts:', error);
      toast({
        title: "Error loading payouts",
        description: "Failed to fetch payout data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleExport = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-payouts', {
        body: null,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) throw error;

      // Create and download CSV
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'payout_requests.csv';
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: "Payout data has been exported",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export payout data",
        variant: "destructive",
      });
    }
  };

  const openActionDialog = (action: 'approve' | 'deny' | 'mark_paid', payout: PayoutRequest) => {
    setActionDialog({
      open: true,
      action,
      payout,
    });
    setNotes('');
  };

  const closeActionDialog = () => {
    setActionDialog({
      open: false,
      action: null,
      payout: null,
    });
    setNotes('');
  };

  const handlePayoutAction = async () => {
    if (!actionDialog.action || !actionDialog.payout) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-payouts', {
        body: {
          payout_id: actionDialog.payout.id,
          action: actionDialog.action,
          notes: notes || undefined,
        },
      });

      if (error) throw error;

      toast({
        title: "Action completed",
        description: data.message,
      });

      // Refresh the data
      await fetchPayouts();
      closeActionDialog();
    } catch (error) {
      console.error('Payout action error:', error);
      toast({
        title: "Action failed",
        description: "Failed to process payout action",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const getActionDialogContent = () => {
    if (!actionDialog.action || !actionDialog.payout) return null;

    const actionLabels = {
      approve: 'Approve',
      deny: 'Deny',
      mark_paid: 'Mark as Paid',
    };

    const actionDescriptions = {
      approve: 'This will approve the payout request and allow it to be processed.',
      deny: 'This will deny the payout request. Please provide a reason.',
      mark_paid: 'This will mark the payout as paid and complete the process.',
    };

    return {
      title: `${actionLabels[actionDialog.action]} Payout Request`,
      description: actionDescriptions[actionDialog.action],
    };
  };

  const dialogContent = getActionDialogContent();

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">€{stats.total_earned.toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Total Earned</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">€{stats.total_pending.toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">€{stats.total_approved.toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Approved</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">€{stats.total_paid.toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Paid</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">€{stats.total_spent.toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Total Spent</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
          <CardDescription>Manage referral payout requests and track payment status</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={payouts}
            columns={columns}
            loading={loading}
            onExport={handleExport}
            emptyMessage="No payout requests found"
          />
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={closeActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogContent?.title}</DialogTitle>
            <DialogDescription>{dialogContent?.description}</DialogDescription>
          </DialogHeader>
          
          {actionDialog.payout && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">User ID:</span>
                  <p className="font-mono">{actionDialog.payout.referrer_user_id}</p>
                </div>
                <div>
                  <span className="font-medium">Amount:</span>
                  <p>€{Number(actionDialog.payout.amount).toFixed(2)}</p>
                </div>
                <div>
                  <span className="font-medium">Requested:</span>
                  <p>{new Date(actionDialog.payout.requested_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <p className="capitalize">{actionDialog.payout.status}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">
                  Notes {actionDialog.action === 'deny' && <span className="text-destructive">*</span>}
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter notes or reason..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handlePayoutAction}
              disabled={actionLoading || (actionDialog.action === 'deny' && !notes.trim())}
            >
              {actionLoading ? 'Processing...' : dialogContent?.title.split(' ')[0]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}