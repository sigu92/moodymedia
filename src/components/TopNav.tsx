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
    if (path === "/dashboard/marketplace") {
      return currentPath === "/" || currentPath === "/dashboard" || currentPath === "/dashboard/marketplace";
    }
    return currentPath === path;
  };

  const getNavClassName = (path: string) => {
    const baseClasses = "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200";
    return isActive(path) 
      ? `${baseClasses} bg-white text-black shadow-sm` 
      : `${baseClasses} text-gray-300 hover:text-white hover:bg-white/10`;
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
    <header className="h-16 flex items-center justify-between px-6 bg-black border-b border-gray-800 shadow-lg transition-all duration-200">
      {/* Logo - Hidden in marketplace mode */}
      <div className="flex items-center gap-4 opacity-0 pointer-events-none">
        <div className="text-lg font-bold text-white tracking-wide">
          MOODY MEDIA
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-1">
        {navigationItems.map((item, index) => {
          // Skip Cart from navigation - it will be moved to the right side
          if (item.title === "Cart") {
            return null;
          }

          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={getNavClassName(item.url)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
              {item.title === "Notifications" && getNotificationBadgeCount() && (
                <Badge variant="destructive" className="h-4 text-xs ml-1 px-1.5 bg-red-500 text-white">
                  {getNotificationBadgeCount()}
                </Badge>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Right Side: Role Management, Cart, and User Menu */}
      <div className="flex items-center gap-3">
        {/* Role Management */}
        {user && (
          <div className="flex items-center gap-2">
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

        {/* Cart - Moved to right side */}
        {user && (
          <div className="flex items-center">
            <CartIcon
              onClick={() => setIsCartOpen(true)}
              aria-expanded={isCartOpen}
              aria-controls="cart-sidebar"
            />
          </div>
        )}

        {/* User Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 rounded-full p-0 hover:bg-white/10">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-white text-black">
                    {getUserInitials(user.email || '')}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-lg">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium text-gray-900">{user.email?.split('@')[0]}</p>
                  <RoleIndicator size="sm" showIcon={false} />
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem asChild>
                <NavLink to="/profile" className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                  <User className="h-4 w-4" />
                  Profile Settings
                </NavLink>
              </DropdownMenuItem>
              {currentRole === 'admin' && (
                <DropdownMenuItem asChild>
                  <NavLink to="/admin" className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                    <Settings className="h-4 w-4" />
                    Admin Panel
                  </NavLink>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

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