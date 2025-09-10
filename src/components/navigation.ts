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

export const getNavigationItems = (userRole: string | null): NavigationItem[] => {
  switch (userRole) {
    case 'publisher':
      return publisherItems;
    case 'admin':
      return adminItems;
    default:
      return buyerItems;
  }
};