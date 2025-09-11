import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useNotifications } from "@/hooks/useNotifications";
import logoImage from '@/assets/moody-media-logo-new.png';
import { getNavigationItems } from "./navigation";
import { RoleIndicator } from "./RoleIndicator";
import { RoleSwitcher } from "./RoleSwitcher";
import { User, LogOut, Settings, RotateCcw, Shield } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export function AppSidebar() {
  const { state } = useSidebar();
  const { user, currentRole, userRoles, hasRole, isSystemAdmin, signOut, switchRole } = useAuth();
  const { cartItems } = useCart();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  

  const navigationItems = getNavigationItems(currentRole, userRoles);

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/" || currentPath === "/dashboard";
    }
    return currentPath === path;
  };

  const getNavClassName = (path: string) => {
    const baseClasses = "flex items-center gap-3 w-full rounded-lg transition-all duration-300";
    return isActive(path) 
      ? `${baseClasses} glass-button-primary text-primary-foreground font-medium shadow-glass` 
      : `${baseClasses} hover:glass-button text-muted-foreground hover:text-foreground`;
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
      case 'system_admin':
        return 'System Admin';
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
    <Sidebar
      className={`${state === "collapsed" ? "w-16" : "w-64"} bg-background border-r border-border`}
    >
      <SidebarHeader className="border-b border-border">
        <div className="flex items-center justify-center px-3 py-4">
          <img src={logoImage} alt="Moody Media" className="h-16 w-auto" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink 
                      to={item.url} 
                      className={getNavClassName(item.url)}
                      title={state === "collapsed" ? item.title : undefined}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {state !== "collapsed" && (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm">{item.title}</span>
                          {item.title === "Cart" && getCartBadgeCount() && (
                            <Badge variant="secondary" className="h-5 text-xs">
                              {getCartBadgeCount()}
                            </Badge>
                          )}
                          {item.title === "Notifications" && getNotificationBadgeCount() && (
                            <Badge variant="destructive" className="h-5 text-xs">
                              {getNotificationBadgeCount()}
                            </Badge>
                          )}
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2 space-y-2">
        {/* System Admin Button - Show prominently for system admins */}
        {user && isSystemAdmin && (
          <Button
            variant="default"
            size="sm"
            asChild
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold shadow-lg text-xs flex items-center gap-2"
            title={state === "collapsed" ? "System Administration" : undefined}
          >
            <NavLink to="/admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4 flex-shrink-0" />
              {state !== "collapsed" && <span>System Admin</span>}
            </NavLink>
          </Button>
        )}


        {/* Role Indicator and Switcher - Unified role management */}
        {user && (
          <div className="flex flex-col gap-2 px-2">
            {/* Role Indicator - Show current role */}
            <div className="flex items-center justify-center">
              <RoleIndicator
                size="sm"
                showIcon={state !== "collapsed"}
                className={state === "collapsed" ? "px-1" : ""}
              />
            </div>

            {/* Role Switcher - Show for publishers (can switch to buyer mode) */}
            <RoleSwitcher
              variant="outline"
              size="sm"
              className={state === "collapsed" ? "w-full px-1" : "w-full"}
              showText={state !== "collapsed"}
              compact={state === "collapsed"}
            />
          </div>
        )}

        {/* Publisher Promotion - Show for users without publisher role */}
        {user && !hasRole('publisher') && (
          <div className="glass-card p-3 border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="text-center space-y-2">
              <h4 className="text-sm font-semibold text-foreground">
                Do you have media sites?
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Start a publishing account and start selling your links here today
              </p>
              <Button 
                size="sm" 
                variant="premium"
                className="w-full text-xs h-8"
                onClick={() => navigate('/profile')}
              >
                Start Publishing
              </Button>
            </div>
          </div>
        )}

        {/* User Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start h-auto p-2 hover:bg-accent rounded-lg">
                <div className="flex items-center gap-3 w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getUserInitials(user.email || '')}
                    </AvatarFallback>
                  </Avatar>
                  {state !== "collapsed" && (
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">
                        {user.email?.split('@')[0]}
                      </p>
                      <div className="mt-1">
                        <RoleIndicator size="sm" showIcon={false} />
                      </div>
                    </div>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <NavLink to="/profile" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  Profile Settings
                </NavLink>
              </DropdownMenuItem>
              {hasRole('admin') && (
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
      </SidebarFooter>
    </Sidebar>
  );
}