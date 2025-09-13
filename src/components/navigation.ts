import { 
  Home, 
  Search, 
  ShoppingCart, 
  FileText, 
  Gift, 
  Settings,
  Users,
  BarChart3,
  Package,
  CreditCard,
  Bell
} from "lucide-react";

export interface NavigationItem {
  title: string;
  url: string;
  icon: any;
  roles?: string[];
}

export const buyerItems: NavigationItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Marketplace", url: "/marketplace", icon: Search },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Cart", url: "/cart", icon: ShoppingCart },
  { title: "Orders", url: "/orders", icon: FileText },
  { title: "Transactions", url: "/transactions", icon: CreditCard },
  { title: "Referral", url: "/referral", icon: Gift },
  { title: "Settings", url: "/settings", icon: Settings },
];

export const publisherItems: NavigationItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Order Management", url: "/publisher/orders", icon: FileText },
  { title: "Sites", url: "/publisher/sites", icon: Package },
  { title: "Notifications", url: "/publisher/notifications", icon: Bell },
  { title: "Transactions", url: "/transactions", icon: CreditCard },
  { title: "Referral", url: "/publisher/referral", icon: Gift },
  { title: "Settings", url: "/settings", icon: Settings },
];

export const adminItems: NavigationItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "User Management", url: "/admin", icon: Users },
  { title: "Orders", url: "/orders", icon: FileText },
  { title: "Marketplace", url: "/marketplace", icon: Search },
  { title: "Analytics", url: "/marketplace", icon: BarChart3 },
  { title: "Settings", url: "/admin", icon: Settings },
];

export const getNavigationItems = (userRole: string | null, userRoles?: string[]): NavigationItem[] => {
  // System admins see the same navigation as regular users
  // (they get system admin functionality through the prominent button in sidebar footer)
  if (userRoles?.includes('system_admin')) {
    // System admins use regular navigation based on their current role
    if (userRole === 'publisher') {
      return publisherItems;
    }
    // Default to buyer navigation for system admins
    return buyerItems;
  }

  // If user has admin role, show admin navigation
  if (userRole === 'admin' || userRoles?.includes('admin')) {
    return adminItems;
  }

  // If current role is publisher, show publisher navigation
  if (userRole === 'publisher') {
    return publisherItems;
  }

  // Default to buyer navigation
  return buyerItems;
};

// Context-aware navigation for dual-role users
// Shows navigation based on current route context, not currentRole
export const getContextAwareNavigation = (currentRole: string | null, userRoles?: string[], currentPath?: string): NavigationItem[] => {
  // If user is system admin, use regular navigation logic (they see same nav as regular users)
  if (userRoles?.includes('system_admin')) {
    const effectiveRole = currentRole === 'publisher' ? 'publisher' : 'buyer';
    const hasDualRoles = userRoles?.includes('buyer') && userRoles?.includes('publisher');
    if (!hasDualRoles) {
      return getNavigationItems(effectiveRole, userRoles);
    }
  }

  // If user doesn't have dual roles, use standard navigation
  const hasDualRoles = userRoles?.includes('buyer') && userRoles?.includes('publisher');
  if (!hasDualRoles) {
    return getNavigationItems(currentRole, userRoles);
  }

  // Define route contexts - determine navigation based on current page location
  const buyerRoutes = ['/marketplace', '/cart', '/orders', '/transactions'];
  const publisherRoutes = ['/publisher', '/dashboard/publisher', '/publisher/orders', '/publisher/sites'];

  // Special handling for dashboard - show based on currentRole context
  const isDashboard = currentPath === '/dashboard' || currentPath === '/';
  const isPublisherDashboard = currentPath === '/dashboard/publisher';

  // Determine context based on current path
  const isOnBuyerRoute = buyerRoutes.some(route => currentPath?.startsWith(route));
  const isOnPublisherRoute = publisherRoutes.some(route => currentPath?.startsWith(route)) || isPublisherDashboard;

  // For dashboard pages, use currentRole to determine context
  if (isDashboard && currentRole === 'publisher') {
    return publisherItems.map(item => ({
      ...item,
      title: item.title === 'Dashboard' ? 'Publisher Dashboard' : item.title
    }));
  }

  if (isDashboard && currentRole !== 'publisher') {
    return buyerItems.map(item => ({
      ...item,
      title: item.title === 'Dashboard' ? 'Marketplace Dashboard' : item.title
    }));
  }

  // For specific routes, show context-appropriate navigation
  if (isOnPublisherRoute) {
    return publisherItems.map(item => ({
      ...item,
      title: item.title === 'Dashboard' ? 'Publisher Dashboard' : item.title
    }));
  }

  if (isOnBuyerRoute) {
    return buyerItems.map(item => ({
      ...item,
      title: item.title === 'Dashboard' ? 'Marketplace Dashboard' : item.title
    }));
  }

  // Default: use currentRole for navigation
  if (currentRole === 'publisher') {
    return publisherItems.map(item => ({
      ...item,
      title: item.title === 'Dashboard' ? 'Publisher Dashboard' : item.title
    }));
  }

  // Default to buyer navigation
  return buyerItems.map(item => ({
    ...item,
    title: item.title === 'Dashboard' ? 'Marketplace Dashboard' : item.title
  }));
};

// Legacy function - kept for backward compatibility but should not be used
// TODO: Remove this function after confirming new navigation works
export const getDualRoleNavigationItems = (currentRole: string | null, userRoles?: string[]): NavigationItem[] => {
  // This function is deprecated - use getContextAwareNavigation instead
  console.warn('getDualRoleNavigationItems is deprecated - use getContextAwareNavigation');
  return getContextAwareNavigation(currentRole, userRoles);
};