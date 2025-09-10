import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedPublisherRouteProps {
  children: React.ReactNode;
  restrictBuyerRoutes?: boolean; // If true, publishers are redirected away from this route
}

export function ProtectedPublisherRoute({ children, restrictBuyerRoutes = false }: ProtectedPublisherRouteProps) {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="h-8 w-8 animate-spin mx-auto mb-4 text-primary border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If restrictBuyerRoutes is true and user is a publisher, redirect to publisher dashboard
  if (restrictBuyerRoutes && userRole === 'publisher') {
    return <Navigate to="/dashboard/publisher" replace />;
  }

  return <>{children}</>;
}

export default ProtectedPublisherRoute;