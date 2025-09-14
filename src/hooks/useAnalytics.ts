import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

export const useAnalytics = () => {
  const location = useLocation();

  // Track page views
  useEffect(() => {
    trackEvent({
      event: 'page_view',
      category: 'navigation',
      action: 'page_view',
      label: location.pathname,
      metadata: {
        pathname: location.pathname,
        search: location.search,
        timestamp: new Date().toISOString()
      }
    });
  }, [location]);

  const trackEvent = (eventData: AnalyticsEvent) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', eventData);
    }

    // In production, you would send to analytics service
    // For now, we'll just store in localStorage for demo purposes
    try {
      const analyticsData = JSON.parse(localStorage.getItem('analytics') || '[]');
      analyticsData.push({
        ...eventData,
        timestamp: new Date().toISOString(),
        sessionId: getSessionId()
      });

      // Keep only last 100 events
      if (analyticsData.length > 100) {
        analyticsData.splice(0, analyticsData.length - 100);
      }

      localStorage.setItem('analytics', JSON.stringify(analyticsData));
    } catch (error) {
      console.warn('Failed to store analytics data:', error);
    }
  };

  const trackError = (error: Error, context?: string) => {
    trackEvent({
      event: 'error',
      category: 'error',
      action: 'javascript_error',
      label: error.message,
      metadata: {
        stack: error.stack,
        context,
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    });
  };

  const trackUserAction = (action: string, label?: string, value?: number) => {
    trackEvent({
      event: 'user_action',
      category: 'interaction',
      action,
      label,
      value
    });
  };

  return {
    trackEvent,
    trackError,
    trackUserAction
  };
};

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};
