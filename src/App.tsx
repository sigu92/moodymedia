import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedPublisherRoute from "./components/publisher/ProtectedPublisherRoute";
import SystemAdminRoute from "./components/admin/SystemAdminRoute";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { TopNav } from "./components/TopNav";
import SEOHead from "./components/SEOHead";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MarketplaceDashboard from "./pages/dashboard/MarketplaceDashboard";
import PublisherDashboard from "./pages/dashboard/PublisherDashboard";
import PublisherSites from "./pages/publisher/PublisherSites";

import PublisherOrderManagement from "./pages/publisher/PublisherOrderManagement";
import PublisherNotificationCenter from "./pages/publisher/PublisherNotificationCenter";
import PublisherReferral from "./pages/publisher/PublisherReferral";
import Transactions from "./pages/Transactions";
import Marketplace from "./pages/Marketplace";
import Orders from "./pages/Orders";
import Referral from "./pages/Referral";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Notifications from "./pages/Notifications";
import Admin from "./pages/Admin";
import AdminSystem from "./pages/AdminSystem";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import PriceAnalytics from "./pages/PriceAnalytics";
import LinkMonitoring from "./pages/LinkMonitoring";
import Settings from "./pages/Settings";
import { CheckoutSuccess } from "./pages/CheckoutSuccess";
import { CheckoutCancel } from "./pages/CheckoutCancel";
import { CheckoutRecover } from "./pages/CheckoutRecover";
import { OrderConfirmationPage } from "./components/orders/OrderConfirmationPage";
import { TestModeIndicator } from "./components/development/TestModeIndicator";
import { PaymentSimulator } from "./components/development/PaymentSimulator";
import { SecurityStatusIndicator } from "./components/security/SecurityStatusIndicator";

const queryClient = new QueryClient();

// Layout component to handle conditional rendering
const AppLayout = () => {
  const location = useLocation();

  // Define routes that should use marketplace mode (TopNav instead of sidebar)
  const marketplaceRoutes = [
    '/marketplace',
    '/dashboard/marketplace',
    '/orders',
    '/checkout/success',
    '/checkout/cancel',
    '/checkout/recover',
    '/orders/confirmation',
    '/price-analytics',
    '/link-monitoring',
    '/referral'  // Referral can be accessed by both buyers and publishers
  ];

  // Define routes that should ALWAYS show sidebar (never marketplace mode)
  const sidebarOnlyRoutes = [
    '/dashboard',  // Main dashboard - always show sidebar
    '/dashboard/publisher',
    '/publisher/',
    '/admin',
    '/profile',
    '/settings',
    '/notifications'
  ];

  // Publisher routes that should NOT use marketplace mode
  const publisherRoutes = [
    '/publisher/',
    '/dashboard/publisher'
  ];

  // Check if current path is marketplace mode
  const isMarketplace = marketplaceRoutes.some(route =>
    location.pathname === route || location.pathname.startsWith(route + '/')
  );

  // Check if current path is publisher route
  const isPublisherRoute = publisherRoutes.some(route =>
    location.pathname === route || location.pathname.startsWith(route + '/')
  );

  // Check if current path should ALWAYS show sidebar
  const isSidebarOnlyRoute = sidebarOnlyRoutes.some(route =>
    location.pathname === route || location.pathname.startsWith(route + '/')
  );

  // Use marketplace mode for buyer routes, but NOT for publisher routes or sidebar-only routes
  const shouldUseMarketplaceMode = isMarketplace && !isPublisherRoute && !isSidebarOnlyRoute;
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Conditionally render sidebar with smooth transition - Fixed positioning */}
        <div className={`fixed left-0 top-0 z-40 h-full transition-all duration-500 ease-in-out ${shouldUseMarketplaceMode ? 'w-0 opacity-0 -translate-x-full' : 'w-auto opacity-100 translate-x-0'} overflow-hidden`}>
          <AppSidebar />
        </div>

        <div className={`flex-1 flex flex-col transition-all duration-500 ease-in-out ${shouldUseMarketplaceMode ? 'ml-0' : 'ml-64'}`}>
          {/* Conditionally render header content */}
          {shouldUseMarketplaceMode ? (
            <TopNav />
          ) : (
            <header className="h-12 flex items-center border-b border-border bg-background px-4 transition-all duration-500 ease-in-out">
              <SidebarTrigger className="ml-4" />
              <h1 className="ml-4 font-semibold">Moody Media</h1>
            </header>
          )}

          <main className="flex-1">
            <Routes>
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/marketplace" element={
                <ProtectedRoute>
                  <MarketplaceDashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/publisher" element={<ProtectedRoute requiredRole="publisher"><PublisherDashboard /></ProtectedRoute>} />
              <Route path="/publisher/sites" element={<ProtectedRoute requiredRole="publisher"><PublisherSites /></ProtectedRoute>} />
              
              <Route path="/publisher/orders" element={<ProtectedRoute requiredRole="publisher"><PublisherOrderManagement /></ProtectedRoute>} />
              <Route path="/publisher/notifications" element={<ProtectedRoute requiredRole="publisher"><PublisherNotificationCenter /></ProtectedRoute>} />
              <Route path="/publisher/referral" element={<ProtectedRoute requiredRole="publisher"><PublisherReferral /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
              <Route path="/dashboard/admin" element={<ProtectedRoute requiredRole="admin"><Dashboard /></ProtectedRoute>} />
              <Route path="/marketplace" element={
                <ProtectedRoute>
                  <Marketplace />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/referral" element={
                <ProtectedRoute>
                  <Referral />
                </ProtectedRoute>
              } />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/cart" element={<Navigate to="/marketplace" replace />} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/price-analytics" element={
                <ProtectedRoute>
                  <PriceAnalytics />
                </ProtectedRoute>
              } />
              <Route path="/link-monitoring" element={
                <ProtectedRoute>
                  <LinkMonitoring />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={<SystemAdminRoute><AdminSystem /></SystemAdminRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              
              {/* Checkout flow routes */}
              <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccess /></ProtectedRoute>} />
              <Route path="/checkout/cancel" element={<ProtectedRoute><CheckoutCancel /></ProtectedRoute>} />
              <Route path="/checkout/recover" element={<ProtectedRoute><CheckoutRecover /></ProtectedRoute>} />
              <Route path="/orders/:orderId/confirmation" element={<ProtectedRoute><OrderConfirmationPage /></ProtectedRoute>} />
              <Route path="/orders/confirmation/:orderId" element={<ProtectedRoute><OrderConfirmationPage /></ProtectedRoute>} />
              
              {/* Development routes */}
              {process.env.NODE_ENV === 'development' && (
                <Route path="/dev/payment-simulator" element={<ProtectedRoute><PaymentSimulator /></ProtectedRoute>} />
              )}
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {/* Development tools - only in development mode */}
        {process.env.NODE_ENV === 'development' && <TestModeIndicator />}
        {/* Security status indicator - configurable per environment */}
        <SecurityStatusIndicator />
        <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes without sidebar */}
            <Route path="/" element={
              <>
                <SEOHead 
                  title="Premium SEO Marketplace - Quality Backlinks & Publishers"
                  description="Connect with 500+ verified publishers, get quality backlinks with transparent pricing. Real metrics, guaranteed results. Join 2,000+ SEO professionals."
                  keywords="SEO marketplace, quality backlinks, link building, verified publishers, Ahrefs DR, Moz DA, digital marketing"
                  url="/"
                />
                <Index />
              </>
            } />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes with conditional layout */}
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
