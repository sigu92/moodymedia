import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Track error for analytics
    try {
      const analyticsData = JSON.parse(localStorage.getItem('analytics') || '[]');
      
      // Check if running in development mode
      const isDev = import.meta.env?.DEV || process.env.NODE_ENV === 'development';
      
      const analyticsEvent = {
        event: 'error',
        category: 'error',
        action: 'javascript_error',
        label: error.message?.substring(0, 200) || 'Unknown error', // Truncate error message
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
        redacted: !isDev,
        metadata: isDev ? {
          // Full details only in development
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent
        } : {
          // Redacted/minimal details in production
          stackHash: this.hashString(error.stack || ''),
          componentStackHash: this.hashString(errorInfo.componentStack || ''),
          urlOrigin: window.location.origin,
          browserName: this.getBrowserName()
        }
      };
      
      analyticsData.push(analyticsEvent);

      // Keep only last 100 events
      if (analyticsData.length > 100) {
        analyticsData.splice(0, analyticsData.length - 100);
      }

      localStorage.setItem('analytics', JSON.stringify(analyticsData));
    } catch (analyticsError) {
      console.warn('Failed to store error analytics:', analyticsError);
    }

    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private getSessionId = (): string => {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  };

  private hashString = (str: string): string => {
    // Simple hash function for production anonymization
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  };

  private getBrowserName = (): string => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      return (
        <Card className="w-full max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
            <CardDescription>
              An unexpected error occurred. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {import.meta.env?.DEV && this.state.error && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <Button onClick={this.handleRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Simple error fallback component for smaller error boundaries
export const ErrorFallback: React.FC<{ error?: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
    <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
    <p className="text-muted-foreground mb-4">
      {error?.message || 'An unexpected error occurred'}
    </p>
    <Button onClick={retry} variant="outline">
      <RefreshCw className="h-4 w-4 mr-2" />
      Try Again
    </Button>
  </div>
);
