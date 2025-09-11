import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface RoleSwitcherProps {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
  compact?: boolean;
}

export function RoleSwitcher({
  variant = "outline",
  size = "sm",
  className = "",
  showIcon = true,
  showText = true,
  compact = false
}: RoleSwitcherProps) {
  const { currentRole, userRoles, hasRole, switchRole } = useAuth();
  const navigate = useNavigate();

  // Determine if user should see the switcher
  // Show if: user has both buyer AND publisher roles
  const hasDualRoles = hasRole('publisher') && hasRole('buyer');
  const shouldShowSwitcher = hasDualRoles;

  if (!shouldShowSwitcher) {
    return null;
  }

  // Debug logging for dual-role detection
  console.log('🔄 RoleSwitcher:', {
    currentRole,
    userRoles,
    hasDualRoles,
    shouldShowSwitcher
  });

  const handleRoleSwitch = () => {
    const nextRole = currentRole === 'publisher' ? 'buyer' : 'publisher';

    // Switch the role in state
    switchRole(nextRole);

    // Navigate to appropriate dashboard
    if (nextRole === 'publisher') {
      navigate('/dashboard/publisher', { replace: true });
    } else {
      navigate('/dashboard/marketplace', { replace: true });
    }
  };

  const getButtonText = () => {
    if (compact) {
      return currentRole === 'publisher' ? 'Buyer' : 'Publisher';
    }
    return `Switch to ${currentRole === 'publisher' ? 'Buyer' : 'Publisher'}`;
  };

  const buttonSize = compact ? "sm" : (size === "md" ? "sm" : size);
  const buttonClasses = compact
    ? "h-8 px-2 text-xs min-h-[32px] touch-manipulation"
    : size === "sm" ? "h-8 text-xs min-h-[32px]" : size === "lg" ? "h-10 text-sm min-h-[40px]" : "h-9 text-sm min-h-[36px]";

  return (
    <Button
      variant={variant}
      size={buttonSize}
      onClick={handleRoleSwitch}
      className={`${buttonClasses} ${className} flex items-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-primary/20 focus:outline-none`}
      title={compact ? `Switch to ${currentRole === 'publisher' ? 'Buyer' : 'Publisher'} mode` : undefined}
      aria-label={compact ? `Switch to ${currentRole === 'publisher' ? 'Buyer' : 'Publisher'} mode` : undefined}
    >
      {showIcon && <RotateCcw className="h-3.5 w-3.5 flex-shrink-0" />}
      {showText && (
        <span className={compact ? "hidden sm:inline" : ""}>
          {getButtonText()}
        </span>
      )}
    </Button>
  );
}

export default RoleSwitcher;
