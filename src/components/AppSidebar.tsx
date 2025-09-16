import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
// import logoImage from '@/assets/moody-media-logo-new.png';
import { getContextAwareNavigation } from "./navigation";
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
  const { user, currentRole, userRoles, hasRole, isSystemAdmin, signOut, switchRole, fetchUserRoles } = useAuth();
  const { cartItems } = useCart();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  

  const navigationItems = getContextAwareNavigation(currentRole, userRoles, currentPath);

  const isActive = (path: string) => {
    if (path === "/dashboard/marketplace") {
      return currentPath === "/" || currentPath === "/dashboard" || currentPath === "/dashboard/marketplace";
    }
    return currentPath === path;
  };

  const getNavClassName = (path: string) => {
    const baseClasses = "flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-200 font-medium";
    return isActive(path) 
      ? `${baseClasses} bg-black text-white shadow-sm` 
      : `${baseClasses} text-gray-600 hover:bg-gray-50 hover:text-gray-900`;
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

  const handleStartPublishing = async () => {
    if (!user) return;

    try {
      // Assign publisher role using the add_publisher_role function
      const { data, error } = await supabase.rpc('add_publisher_role', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error assigning publisher role:', error);
        toast({
          title: "Error",
          description: "Failed to set up your publishing account. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Also ensure buyer role exists (should already exist, but just in case)
      await supabase
        .from('user_role_assignments')
        .upsert({
          user_id: user.id,
          role: 'buyer'
        }, { onConflict: 'user_id,role' });

      // Immediately refresh user roles in auth context for instant UI update
      await fetchUserRoles(user.id);

      toast({
        title: "Welcome to Publishing!",
        description: "Your account now has both buyer and publisher roles. You can switch between them using the role switcher.",
      });

      // Navigate to settings page where they can fill out organization info
      navigate('/settings');

    } catch (error) {
      console.error('Error in handleStartPublishing:', error);
      toast({
        title: "Error",
        description: "Failed to set up your publishing account. Please try again.",
        variant: "destructive",
      });
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
      className={`${state === "collapsed" ? "w-16" : "w-64"} bg-white border-r border-gray-200`}
    >
      <SidebarHeader className="border-b border-gray-200 py-6">
        <div className="flex items-center justify-center px-6">
          <div className="text-xl font-bold text-gray-800 tracking-wide">
            MOODY MEDIA
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupLabel className={`${state === "collapsed" ? "sr-only" : ""} text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4`}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-auto p-0">
                    <NavLink 
                      to={item.url} 
                      className={getNavClassName(item.url)}
                      title={state === "collapsed" ? item.title : undefined}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {state !== "collapsed" && (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-medium">{item.title}</span>
                          {item.title === "Cart" && getCartBadgeCount() && (
                            <span className="bg-black text-white text-xs px-2 py-1 rounded-full">
                              {getCartBadgeCount()}
                            </span>
                          )}
                          {item.title === "Notifications" && getNotificationBadgeCount() && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                              {getNotificationBadgeCount()}
                            </span>
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

      <SidebarFooter className="border-t border-gray-200 p-4 space-y-3">
        {/* System Admin Button - Show prominently for system admins */}
        {user && isSystemAdmin && (
          <Button
            variant="default"
            size="sm"
            asChild
            className="w-full bg-black text-white hover:bg-gray-800 font-medium text-sm flex items-center gap-2 p-3 rounded-lg"
            title={state === "collapsed" ? "System Administration" : undefined}
          >
            <NavLink to="/admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4 flex-shrink-0" />
              {state !== "collapsed" && <span>System Admin</span>}
            </NavLink>
          </Button>
        )}


        {/* Role Switcher - Show for users who can switch roles */}
        {user && (
          <div className="flex flex-col gap-2 px-2">
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
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-center space-y-3">
              <h4 className="text-sm font-semibold text-gray-800">
                Do you have media sites?
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Start a publishing account and start selling your links here today
              </p>
              <Button
                size="sm"
                className="w-full text-xs h-8 bg-black text-white hover:bg-gray-800 rounded-lg"
                onClick={handleStartPublishing}
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
              <Button variant="ghost" className="w-full justify-start h-auto p-3 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 w-full">
                  <Avatar className="h-8 w-8 bg-gray-100">
                    <AvatarFallback className="text-xs font-medium text-gray-700 bg-gray-100">
                      {getUserInitials(user.email || '')}
                    </AvatarFallback>
                  </Avatar>
                  {state !== "collapsed" && (
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-800 truncate">
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
            <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-lg">
              <DropdownMenuLabel className="text-gray-700 font-medium">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem asChild>
                <NavLink to="/profile" className="flex items-center gap-2 cursor-pointer text-gray-700 hover:bg-gray-50">
                  <User className="h-4 w-4" />
                  Profile Settings
                </NavLink>
              </DropdownMenuItem>
              {(hasRole('admin') || isSystemAdmin) && (
                <DropdownMenuItem asChild>
                  <NavLink to="/admin" className="flex items-center gap-2 cursor-pointer text-gray-700 hover:bg-gray-50">
                    <Settings className="h-4 w-4" />
                    {isSystemAdmin ? 'System Admin' : 'Admin Panel'}
                  </NavLink>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer text-red-600 hover:bg-red-50">
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