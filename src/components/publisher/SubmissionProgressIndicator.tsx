import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface SubmissionProgressIndicatorProps {
  status: string;
  submittedAt?: string;
  reviewedAt?: string;
  className?: string;
}

export function SubmissionProgressIndicator({
  status,
  submittedAt,
  reviewedAt,
  className = ""
}: SubmissionProgressIndicatorProps) {
  const getProgressValue = (status: string) => {
    switch (status) {
      case 'pending':
        return 50;
      case 'approved':
      case 'active':
        return 100;
      case 'rejected':
        return 100;
      default:
        return 0;
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Under Review',
          description: submittedAt ? 'Submitted and waiting for admin approval' : 'Draft submission',
          icon: Clock,
          color: 'text-yellow-500',
          progressColor: 'bg-yellow-500'
        };
      case 'approved':
      case 'active':
        return {
          label: 'Approved',
          description: 'Site approved and available on marketplace',
          icon: CheckCircle,
          color: 'text-green-500',
          progressColor: 'bg-green-500'
        };
      case 'rejected':
        return {
          label: 'Rejected',
          description: 'Submission was not approved',
          icon: XCircle,
          color: 'text-red-500',
          progressColor: 'bg-red-500'
        };
      default:
        return {
          label: 'Draft',
          description: 'Not yet submitted',
          icon: AlertCircle,
          color: 'text-gray-500',
          progressColor: 'bg-gray-500'
        };
    }
  };

  const statusInfo = getStatusInfo(status);
  const progressValue = getProgressValue(status);
  const Icon = statusInfo.icon;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${statusInfo.color}`} />
          <span className="text-sm font-medium">{statusInfo.label}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {Math.round(progressValue)}% Complete
        </Badge>
      </div>

      <Progress
        value={progressValue}
        className="h-2"
      />

      <p className="text-xs text-muted-foreground">
        {statusInfo.description}
      </p>

      {/* Timeline */}
      <div className="flex items-center justify-between text-xs">
        <div className={`flex items-center gap-1 ${status === 'pending' || status === 'approved' || status === 'active' || status === 'rejected' ? 'text-green-600' : 'text-muted-foreground'}`}>
          <CheckCircle className="h-3 w-3" />
          <span>Submitted</span>
        </div>
        <div className={`flex items-center gap-1 ${status === 'approved' || status === 'active' || status === 'rejected' ? 'text-green-600' : status === 'pending' ? 'text-yellow-600' : 'text-muted-foreground'}`}>
          <Clock className="h-3 w-3" />
          <span>Review</span>
        </div>
        <div className={`flex items-center gap-1 ${status === 'approved' || status === 'active' ? 'text-green-600' : status === 'rejected' ? 'text-red-600' : 'text-muted-foreground'}`}>
          {status === 'rejected' ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
          <span>Decision</span>
        </div>
      </div>
    </div>
  );
}
