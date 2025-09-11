import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { User, Package, Shield } from "lucide-react";

interface RoleIndicatorProps {
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function RoleIndicator({
  size = "sm",
  showIcon = true,
  className = ""
}: RoleIndicatorProps) {
  const { currentRole } = useAuth();

  const getRoleConfig = (role: string | null) => {
    switch (role) {
      case 'publisher':
        return {
          label: 'Publisher',
          icon: Package,
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 hover:bg-green-200'
        };
      case 'admin':
        return {
          label: 'Admin',
          icon: Shield,
          variant: 'default' as const,
          className: 'bg-orange-100 text-orange-800 hover:bg-orange-200'
        };
      case 'system_admin':
        return {
          label: 'System Admin',
          icon: Shield,
          variant: 'default' as const,
          className: 'bg-red-100 text-red-800 hover:bg-red-200'
        };
      default:
        return {
          label: 'Buyer',
          icon: User,
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
        };
    }
  };

  const config = getRoleConfig(currentRole);
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: "h-5 px-2 py-0.5 text-xs min-h-[20px]",
    md: "h-6 px-2.5 py-1 text-sm min-h-[24px]",
    lg: "h-7 px-3 py-1.5 text-sm min-h-[28px]"
  };

  const iconSizeClasses = {
    sm: "h-3 w-3 flex-shrink-0",
    md: "h-3.5 w-3.5 flex-shrink-0",
    lg: "h-4 w-4 flex-shrink-0"
  };

  return (
    <Badge
      variant={config.variant}
      className={`${sizeClasses[size]} ${config.className} ${className} font-medium flex items-center gap-1.5 transition-colors select-none`}
      aria-label={`Current role: ${config.label}`}
    >
      {showIcon && <IconComponent className={iconSizeClasses[size]} />}
      <span>{config.label}</span>
    </Badge>
  );
}

export default RoleIndicator;
