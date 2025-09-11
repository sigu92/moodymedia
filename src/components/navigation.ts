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
  // If user has system admin role, always show admin navigation
  if (userRoles?.includes('system_admin')) {
    return adminItems;
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

// New function to get navigation items for dual-role users
export const getDualRoleNavigationItems = (currentRole: string | null, userRoles?: string[]): NavigationItem[] => {
  // Only return dual navigation if user has both buyer and publisher roles
  if (!userRoles?.includes('buyer') || !userRoles?.includes('publisher')) {
    // Fall back to regular navigation
    return getNavigationItems(currentRole, userRoles);
  }

  // For dual-role users, combine both buyer and publisher navigation items
  // Remove duplicates and prioritize based on current role
  const allItems = [...buyerItems, ...publisherItems];

  // Remove duplicate items (Dashboard, Settings, etc.)
  const uniqueItems = allItems.filter((item, index, self) =>
    index === self.findIndex(t => t.title === item.title && t.url === item.url)
  );

  // For dual-role users, we want to show both marketplace and order management
  // But keep only one dashboard and settings
  return uniqueItems.map(item => {
    // If it's dashboard, show based on current role context
    if (item.title === 'Dashboard') {
      return currentRole === 'publisher'
        ? { ...item, title: 'Publisher Dashboard', url: '/dashboard/publisher' }
        : { ...item, title: 'Marketplace Dashboard', url: '/dashboard/marketplace' };
    }

    // If it's order-related, show appropriate one based on current role
    if (item.title === 'Orders' || item.title === 'Order Management') {
      return currentRole === 'publisher'
        ? { title: 'Order Management', url: '/publisher/orders', icon: item.icon }
        : { title: 'Orders', url: '/orders', icon: item.icon };
    }

    return item;
  });
};