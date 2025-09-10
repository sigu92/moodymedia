import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import NotFound from '@/pages/NotFound';

interface SystemAdminRouteProps {
  children: React.ReactNode;
}

export function SystemAdminRoute({ children }: SystemAdminRouteProps) {
  const { isSystemAdmin, loading } = useAuth();

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

  // Only system_admin and admin roles can access
  if (!isSystemAdmin) {
    return <NotFound />;
  }

  return <>{children}</>;
}

export default SystemAdminRoute;