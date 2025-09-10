import { NavLink, useLocation } from "react-router-dom";
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
import { getNavigationItems } from "./navigation";
import { User, LogOut, Settings } from "lucide-react";
import logoImage from '@/assets/moody-media-logo-new.png';

export function TopNav() {
  const { user, userRole, signOut } = useAuth();
  const { cartItems } = useCart();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const currentPath = location.pathname;

  const navigationItems = getNavigationItems(userRole);

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
    return cartItems.length > 0 ? cartItems.length : undefined;
  };

  const getNotificationBadgeCount = () => {
    return unreadCount > 0 ? unreadCount : undefined;
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-background/95 backdrop-blur-sm border-b border-border shadow-soft transition-all duration-500 ease-out animate-slide-in-right">
      {/* Logo - Hidden in marketplace mode */}
      <div className="flex items-center gap-4 opacity-0 pointer-events-none">
        <img src={logoImage} alt="Moody Media" className="h-8 w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-1 animate-fade-in">
        {navigationItems.map((item, index) => (
          <NavLink 
            key={item.title}
            to={item.url} 
            className={getNavClassName(item.url)}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
            {item.title === "Cart" && getCartBadgeCount() && (
              <Badge variant="secondary" className="h-4 text-xs ml-1 px-1.5">
                {getCartBadgeCount()}
              </Badge>
            )}
            {item.title === "Notifications" && getNotificationBadgeCount() && (
              <Badge variant="destructive" className="h-4 text-xs ml-1 px-1.5">
                {getNotificationBadgeCount()}
              </Badge>
            )}
          </NavLink>
        ))}
      </nav>

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
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user.email?.split('@')[0]}</p>
                <p className="text-xs text-muted-foreground">
                  {getRoleDisplayName(userRole)}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <NavLink to="/profile" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Profile Settings
              </NavLink>
            </DropdownMenuItem>
            {userRole === 'admin' && (
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
    </header>
  );
}