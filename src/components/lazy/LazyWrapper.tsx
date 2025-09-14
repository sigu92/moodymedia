import React, { Suspense, ComponentType, lazy } from 'react';

// Generic lazy loading wrapper with error boundary
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Failed to load component</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback,
  errorFallback
}) => {
  return (
    <LazyErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback || <div className="animate-pulse p-8">Loading...</div>}>
        {children}
      </Suspense>
    </LazyErrorBoundary>
  );
};

// Utility function to create lazy-loaded components
export function createLazyComponent<T extends ComponentType<unknown>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return React.forwardRef<React.ElementRef<T>, React.ComponentProps<T>>((props, ref) => (
    <LazyWrapper fallback={fallback}>
      <LazyComponent {...props} ref={ref} />
    </LazyWrapper>
  ));
}

// Preload function for critical components
export const preloadComponent = (importFunc: () => Promise<unknown>) => {
  // Preload after a short delay to not block initial render
  setTimeout(() => {
    importFunc().catch(() => {
      // Silently fail preloading
    });
  }, 100);
};
