import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { AlertTriangle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStatus } from '@/hooks/useSettings';

interface CompletionGuardProps {
  children: React.ReactNode;
  showBanner?: boolean;
  blockAction?: boolean;
  actionLabel?: string;
  onAttemptAction?: () => void;
}

/**
 * Component that guards features requiring complete settings
 * Shows banners and modals when settings are incomplete
 */
export const CompletionGuard: React.FC<CompletionGuardProps> = ({
  children,
  showBanner = true,
  blockAction = false,
  actionLabel = "this action",
  onAttemptAction,
}) => {
  const navigate = useNavigate();
  const { isComplete, loading } = useSettingsStatus();
  const [showModal, setShowModal] = React.useState(false);

  const handleActionAttempt = () => {
    if (!isComplete) {
      setShowModal(true);
    } else if (onAttemptAction) {
      onAttemptAction();
    }
  };

  const goToSettings = () => {
    setShowModal(false);
    navigate('/settings');
  };

  // Don't show anything while loading
  if (loading) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Banner for incomplete settings */}
      {showBanner && !isComplete && (
        <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            <div className="flex items-center justify-between">
              <span>
                Almost there! Please complete your Settings so notifications, orders, and website uploads work.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToSettings}
                className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900"
              >
                <Settings className="h-3 w-3 mr-1" />
                Go to Settings
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Render children with potential action blocking */}
      {blockAction && !isComplete ? (
        React.cloneElement(children as React.ReactElement, {
          onClick: handleActionAttempt,
          disabled: true,
          title: `Complete your settings to enable ${actionLabel}`,
        })
      ) : (
        children
      )}

      {/* Modal for action attempts when settings incomplete */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings Required
            </DialogTitle>
            <DialogDescription>
              We need your Settings to send orders and notifications. Please complete your organization details to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={goToSettings}>
              Go to Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * Higher-order component version of CompletionGuard
 */
export const withCompletionGuard = <P extends object>(
  Component: React.ComponentType<P>,
  guardOptions?: Omit<CompletionGuardProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <CompletionGuard {...guardOptions}>
      <Component {...props} />
    </CompletionGuard>
  );
  
  WrappedComponent.displayName = `withCompletionGuard(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};