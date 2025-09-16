import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useCart } from "@/hooks/useCart";
// import logoImage from '@/assets/moody-media-logo.png';
import { 
  ShoppingCart, 
  BarChart3, 
  FileText, 
  Gift, 
  Wallet,
  Settings,
  Home,
  User,
  LogOut
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const location = useLocation();
  const { user, userRole, signOut } = useAuth();
  const { cartItems } = useCart();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'publisher', 'buyer'] },
    { name: 'Marketplace', href: '/marketplace', icon: BarChart3, roles: ['admin', 'publisher', 'buyer'] },
    { name: 'Orders', href: '/orders', icon: FileText, roles: ['admin', 'publisher', 'buyer'] },
    { name: 'Offers', href: '/offers', icon: Gift, roles: ['admin', 'publisher', 'buyer'] },
    { name: 'Content Guidelines', href: '/content-guidelines', icon: FileText, roles: ['admin', 'publisher', 'buyer'] },
    { name: 'Referral', href: '/referral', icon: Gift, roles: ['admin', 'publisher', 'buyer'] },
    { name: 'Pricing', href: '/pricing', icon: Gift, roles: [] },
    { name: 'About', href: '/about', icon: Gift, roles: [] },
    { name: 'Cart', href: '/cart', icon: ShoppingCart, roles: ['buyer'] },
    { name: 'Admin', href: '/admin', icon: Settings, roles: ['admin'] },
  ];

  const visibleNavigation = navigation.filter(item => 
    !userRole || item.roles.includes(userRole) || userRole === 'admin'
  );

  const getUserInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="text-xl font-bold text-teal-600 tracking-wide">
                MOODY MEDIA
              </div>
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-1">
            {visibleNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'glass-button-active text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                {/* Notifications */}
                <NotificationCenter />

                {/* Cart */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative"
                  onClick={() => window.location.href = '/cart'}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartItems.length > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {cartItems.length}
                    </Badge>
                  )}
                </Button>
              </>
            )}
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full glass-button">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getUserInitials(user.email || 'U')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 glass-card border-white/10" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.email}</p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">
                        {userRole || 'buyer'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="hover:bg-white/5" asChild>
                    <Link to="/dashboard" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem 
                    className="hover:bg-white/5 text-red-400 hover:text-red-300"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" className="glass-button" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;