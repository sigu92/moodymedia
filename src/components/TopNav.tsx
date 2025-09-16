import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getNavigationItems, getContextAwareNavigation } from "./navigation";
import { RoleIndicator } from "./RoleIndicator";
import { RoleSwitcher } from "./RoleSwitcher";
import { CartIcon } from "./cart/CartIcon";
import { CartSidebar } from "./cart/CartSidebar";
import { CheckoutModal } from "./checkout/CheckoutModal";
import { User, LogOut, Settings } from "lucide-react";
// import logoImage from '@/assets/moody-media-logo-new.png';
import { useState } from "react";

export function TopNav() {
  const { user, userRoles, currentRole, signOut } = useAuth();
  const { cartItems, cartCount, clearCart } = useCart();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Use context-aware navigation for dual-role users, regular navigation for single-role users
  const hasDualRoles = userRoles?.includes('buyer') && userRoles?.includes('publisher');
  const navigationItems = hasDualRoles
    ? getContextAwareNavigation(currentRole, userRoles, currentPath)
    : getNavigationItems(currentRole, userRoles);

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/" || currentPath === "/dashboard";
    }
    return currentPath === path;
  };

  const getNavClassName = (path: string) => {
    const baseClasses = "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 transform hover:scale-105";
    return isActive(path) 
      ? `${baseClasses} glass-button-primary text-primary-foreground shadow-glass` 
      : `${baseClasses} text-muted-foreground hover:text-foreground hover:glass-button`;
  };

  const getUserInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  const getRoleDisplayName = (role: string | null) => {
    switch (role) {
      case 'publisher':
        return 'Publisher';
      case 'admin':
        return 'Administrator';
      default:
        return 'Buyer';
    }
  };

  const getCartBadgeCount = () => {
    return cartCount > 0 ? cartCount : undefined;
  };

  const getNotificationBadgeCount = () => {
    return unreadCount > 0 ? unreadCount : undefined;
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-background/95 backdrop-blur-sm border-b border-border shadow-soft transition-all duration-500 ease-out animate-slide-in-right">
      {/* Logo - Hidden in marketplace mode */}
      <div className="flex items-center gap-4 opacity-0 pointer-events-none">
        <div className="text-lg font-bold text-teal-600 tracking-wide">
          MOODY MEDIA
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-1 animate-fade-in">
        {navigationItems.map((item, index) => {
          // Special handling for Cart - render as CartIcon instead of NavLink
          if (item.title === "Cart") {
            return (
              <div
                key={item.title}
                style={{ animationDelay: `${index * 30}ms` }}
                className="animate-fade-in"
              >
                <CartIcon
                  onClick={() => setIsCartOpen(true)}
                  aria-expanded={isCartOpen}
                  aria-controls="cart-sidebar"
                />
              </div>
            );
          }

          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={getNavClassName(item.url)}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
              {item.title === "Notifications" && getNotificationBadgeCount() && (
                <Badge variant="destructive" className="h-4 text-xs ml-1 px-1.5">
                  {getNotificationBadgeCount()}
                </Badge>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Role Management */}
      {user && (
        <div className="flex items-center gap-2 ml-2 mr-2 sm:gap-3 sm:ml-4 sm:mr-4">
          <RoleIndicator size="sm" showIcon={true} />
          <RoleSwitcher
            variant="outline"
            size="sm"
            showIcon={true}
            showText={true}
            className="hidden xs:inline-flex sm:inline-flex"
          />
          {/* Mobile: Show compact switcher */}
          <RoleSwitcher
            variant="outline"
            size="sm"
            showIcon={false}
            showText={false}
            compact={true}
            className="inline-flex xs:hidden sm:hidden"
          />
        </div>
      )}

      {/* User Menu */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full p-0 animate-scale-in">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {getUserInitials(user.email || '')}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 animate-scale-in">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-medium">{user.email?.split('@')[0]}</p>
                <RoleIndicator size="sm" showIcon={false} />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <NavLink to="/profile" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Profile Settings
              </NavLink>
            </DropdownMenuItem>
            {currentRole === 'admin' && (
              <DropdownMenuItem asChild>
                <NavLink to="/admin" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Admin Panel
                </NavLink>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer text-destructive">
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Cart Sidebar */}
      <CartSidebar
        id="cart-sidebar"
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        onOpenCheckout={() => setIsCheckoutOpen(true)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        onComplete={async () => {
          try {
            // Clear cart after successful payment
            await clearCart();

            // Close both checkout and cart modals
            setIsCheckoutOpen(false);
            setIsCartOpen(false);

            // Navigate to orders page to show the completed order
            navigate('/orders');

            console.log('Checkout completed successfully!');
          } catch (error) {
            console.error('Error handling checkout completion:', error);

            // Still close modals and navigate, but log the error
            setIsCheckoutOpen(false);
            setIsCartOpen(false);
            navigate('/orders');
          }
        }}
      />
    </header>
  );
}