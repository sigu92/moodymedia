import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface BulkOperationErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
  operationName?: string;
}

interface BulkOperationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class BulkOperationErrorBoundary extends Component<
  BulkOperationErrorBoundaryProps,
  BulkOperationErrorBoundaryState
> {
  constructor(props: BulkOperationErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): BulkOperationErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Bulk operation error boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Log error to external service if available
    const globalWindow = window as typeof window & {
      errorReporter?: {
        report: (error: Error, context: { componentStack: string; operation: string }) => void;
      };
    };

    if (typeof window !== 'undefined' && globalWindow.errorReporter) {
      globalWindow.errorReporter.report(error, {
        componentStack: errorInfo.componentStack,
        operation: this.props.operationName || 'bulk_operation'
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      const operationName = this.props.operationName || 'bulk operation';

      return (
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Bulk Operation Failed</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              An error occurred during the {operationName}. This might be due to network issues,
              server errors, or data validation problems.
            </p>

            {import.meta.env?.DEV && this.state.error && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {'\n\nComponent Stack:'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-2">
              If this error persists, please contact support with the operation details.
            </p>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap bulk operations with error boundaries
 */
export function withBulkOperationErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  operationName?: string
) {
  const WrappedComponent = (props: P) => (
    <BulkOperationErrorBoundary operationName={operationName}>
      <Component {...props} />
    </BulkOperationErrorBoundary>
  );

  WrappedComponent.displayName = `withBulkOperationErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
