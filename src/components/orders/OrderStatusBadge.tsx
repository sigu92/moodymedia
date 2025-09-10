import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, FileText, Globe, Verified } from "lucide-react";

interface OrderStatusBadgeProps {
  status: string;
  showIcon?: boolean;
}

export const OrderStatusBadge = ({ status, showIcon = false }: OrderStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'requested':
        return {
          variant: 'secondary' as const,
          className: 'text-amber-700 bg-amber-50 border-amber-200',
          icon: Clock,
          label: 'Requested'
        };
      case 'accepted':
        return {
          variant: 'default' as const,
          className: 'text-blue-700 bg-blue-50 border-blue-200',
          icon: CheckCircle,
          label: 'Accepted'
        };
      case 'content_received':
        return {
          variant: 'outline' as const,
          className: 'text-purple-700 bg-purple-50 border-purple-200',
          icon: FileText,
          label: 'Content Received'
        };
      case 'published':
        return {
          variant: 'default' as const,
          className: 'text-green-700 bg-green-50 border-green-200',
          icon: Globe,
          label: 'Published'
        };
      case 'verified':
        return {
          variant: 'secondary' as const,
          className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          icon: Verified,
          label: 'Verified'
        };
      default:
        return {
          variant: 'secondary' as const,
          className: 'text-muted-foreground bg-muted',
          icon: Clock,
          label: status.replace('_', ' ')
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
};