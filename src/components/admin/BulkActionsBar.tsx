import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Calculator, X } from 'lucide-react';
import { BulkMarginSummary } from './PendingApprovalsTab';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedSubmissions: string[];
  allSubmissions: any[];
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onApplyMargins: () => void;
  onClearSelection: () => void;
  loading?: boolean;
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  selectedSubmissions,
  allSubmissions,
  onBulkApprove,
  onBulkReject,
  onApplyMargins,
  onClearSelection,
  loading = false,
  className = ''
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t ${className}`}>
      <Card className="border-primary/30 ring-2 ring-primary/20 shadow-lg">
        <CardContent className="py-4">
          {/* Bulk Margin Summary */}
          <BulkMarginSummary
            selectedSubmissions={selectedSubmissions}
            allSubmissions={allSubmissions}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="px-3 py-1">
                  <Calculator className="h-3 w-3 mr-1" />
                  {selectedCount} selected
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onApplyMargins}
                  variant="outline"
                  disabled={loading}
                  className="border-blue-200 hover:bg-blue-50"
                >
                  <Calculator className="h-4 w-4 mr-1" />
                  Apply Margins
                </Button>

                <Button
                  size="sm"
                  onClick={onBulkApprove}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={loading}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Bulk Approve
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onBulkReject}
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
              onClick={onClearSelection}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-1" />
              Clear Selection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
