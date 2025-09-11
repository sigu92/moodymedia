import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Search,
  ShoppingCart,
  FileText,
  Gift,
  Settings,
  Package,
  CreditCard,
  Bell,
  RotateCcw
} from "lucide-react";

interface DualRoleNavigationProps {
  className?: string;
}

export function DualRoleNavigation({ className = "" }: DualRoleNavigationProps) {
  const { currentRole, userRoles, switchRole } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  // Only show for dual-role users
  const hasDualRoles = userRoles?.includes('buyer') && userRoles?.includes('publisher');
  if (!hasDualRoles) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/" || currentPath === "/dashboard";
    }
    return currentPath === path;
  };

  const getNavClassName = (path: string, isPublisherItem: boolean = false) => {
    const baseClasses = "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 transform hover:scale-105";

    // Add visual distinction for publisher vs buyer items
    const roleClass = isPublisherItem
      ? "border-green-200 bg-green-50/50 text-green-700 hover:bg-green-100/70"
      : "border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/70";

    return isActive(path)
      ? `${baseClasses} ${roleClass} shadow-glass`
      : `${baseClasses} ${roleClass} text-muted-foreground hover:text-foreground hover:glass-button`;
  };

  const handleRoleSwitch = () => {
    const nextRole = currentRole === 'publisher' ? 'buyer' : 'publisher';
    switchRole(nextRole);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Role Switcher */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <Badge variant={currentRole === 'publisher' ? 'default' : 'secondary'}>
            {currentRole === 'publisher' ? 'Publisher Mode' : 'Buyer Mode'}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRoleSwitch}
          className="flex items-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Switch Mode
        </Button>
      </div>

      {/* Combined Navigation */}
      <div className="grid grid-cols-1 gap-1">
        {/* Dashboard - Context aware */}
        <NavLink
          to={currentRole === 'publisher' ? '/dashboard/publisher' : '/dashboard/marketplace'}
          className={getNavClassName(currentRole === 'publisher' ? '/dashboard/publisher' : '/dashboard/marketplace')}
        >
          <Home className="h-4 w-4" />
          <span>{currentRole === 'publisher' ? 'Publisher Dashboard' : 'Marketplace Dashboard'}</span>
        </NavLink>

        {/* Marketplace - Buyer focused */}
        <NavLink
          to="/marketplace"
          className={getNavClassName('/marketplace', false)}
        >
          <Search className="h-4 w-4" />
          <span>Marketplace</span>
        </NavLink>

        {/* Orders/Cart - Context aware */}
        {currentRole === 'publisher' ? (
          <NavLink
            to="/publisher/orders"
            className={getNavClassName('/publisher/orders', true)}
          >
            <FileText className="h-4 w-4" />
            <span>Order Management</span>
          </NavLink>
        ) : (
          <>
            <NavLink
              to="/cart"
              className={getNavClassName('/cart', false)}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Cart</span>
            </NavLink>
            <NavLink
              to="/orders"
              className={getNavClassName('/orders', false)}
            >
              <FileText className="h-4 w-4" />
              <span>Orders</span>
            </NavLink>
          </>
        )}

        {/* Sites - Publisher only */}
        {currentRole === 'publisher' && (
          <NavLink
            to="/publisher/sites"
            className={getNavClassName('/publisher/sites', true)}
          >
            <Package className="h-4 w-4" />
            <span>Sites</span>
          </NavLink>
        )}

        {/* Shared features */}
        <NavLink
          to="/transactions"
          className={getNavClassName('/transactions')}
        >
          <CreditCard className="h-4 w-4" />
          <span>Transactions</span>
        </NavLink>

        <NavLink
          to="/referral"
          className={getNavClassName('/referral')}
        >
          <Gift className="h-4 w-4" />
          <span>Referral</span>
        </NavLink>

        <NavLink
          to="/notifications"
          className={getNavClassName('/notifications')}
        >
          <Bell className="h-4 w-4" />
          <span>Notifications</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={getNavClassName('/settings')}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </NavLink>
      </div>
    </div>
  );
}

export default DualRoleNavigation;
