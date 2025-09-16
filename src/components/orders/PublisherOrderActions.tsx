import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, CheckCircle, XCircle, Eye, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PublisherOrderActionsProps {
  orderId?: string;
  status?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onMessage?: () => void;
  onViewDetails?: (orderId: string) => void;
}

export const PublisherOrderActions: React.FC<PublisherOrderActionsProps> = ({
  orderId,
  status,
  onApprove,
  onReject,
  onMessage,
  onViewDetails,
}) => {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    if (onViewDetails && orderId) {
      onViewDetails(orderId);
    } else if (orderId) {
      // Fallback: navigate to order details page
      navigate(`/orders/${orderId}`);
    } else {
      console.warn('Cannot view details: orderId is missing');
    }
  };
  const getActionsForStatus = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'in_review':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={onApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onReject}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        );
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'completed':
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onMessage}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Message
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleViewDetails}
              disabled={!orderId}
              title={!orderId ? "Order ID not available" : "View order details"}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        );
      default:
        return (
          <Badge variant="secondary">
            Status: {status || 'Unknown'}
          </Badge>
        );
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Order #{orderId}
      </div>
      {getActionsForStatus(status)}
    </div>
  );
};
