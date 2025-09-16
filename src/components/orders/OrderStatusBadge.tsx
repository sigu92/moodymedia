import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, XCircle, Loader2 } from "lucide-react";

interface OrderStatusBadgeProps {
  status: string;
}

export const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'published':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800 hover:bg-green-100',
        };
      case 'pending':
      case 'in_review':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
        };
      case 'processing':
      case 'in_progress':
        return {
          variant: 'secondary' as const,
          icon: Loader2,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
        };
      case 'cancelled':
      case 'rejected':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          className: '',
        };
      case 'failed':
        return {
          variant: 'destructive' as const,
          icon: AlertCircle,
          className: '',
        };
      default:
        return {
          variant: 'outline' as const,
          icon: Clock,
          className: '',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`}>
      <config.icon className="h-3 w-3" />
      <span className="capitalize">{status.replace('_', ' ')}</span>
    </Badge>
  );
};
