import React, { useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettingsStatus } from '@/hooks/useSettings';

/**
 * Global warning component that shows when settings are incomplete
 * Should be placed at the top level of protected routes
 */
export const GlobalSettingsWarning: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isComplete, loading, refresh } = useSettingsStatus();

  // Refresh settings when component mounts or route changes
  useEffect(() => {
    refresh();
  }, [location.pathname, refresh]);

  // Don't show on settings page or while loading
  if (loading || isComplete || location.pathname === '/settings') {
    return null;
  }

  return (
    <Alert className="mx-4 mt-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertDescription className="text-orange-700 dark:text-orange-300">
        <div className="flex items-center justify-between">
          <span className="text-sm">
            Complete your organization settings to enable all features
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings')}
            className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900"
          >
            <Settings className="h-3 w-3 mr-1" />
            Settings
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};