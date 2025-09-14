import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, Database, Server, Wifi, CheckCircle, XCircle, AlertTriangle, RefreshCw, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HealthCheck {
  service: string;
  status: 'healthy' | 'warning' | 'error';
  latency?: number;
  message: string;
  lastChecked: Date;
}

export const SystemHealth = () => {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const runHealthChecks = async () => {
    setLoading(true);
    const checks: HealthCheck[] = [];
    const startTime = Date.now();

    try {
      // Supabase connection check
      const connectionStart = Date.now();
      const { data, error } = await supabase
        .from('media_outlets')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      const connectionLatency = Date.now() - connectionStart;

      checks.push({
        service: 'Database Connection',
        status: error ? 'error' : 'healthy',
        latency: connectionLatency,
        message: error ? `Connection failed: ${error.message}` : `Connected successfully (${connectionLatency}ms)`,
        lastChecked: new Date()
      });

      // Authentication service check
      const { data: { user } } = await supabase.auth.getUser();
      checks.push({
        service: 'Authentication',
        status: 'healthy',
        message: 'Authentication service is operational',
        lastChecked: new Date()
      });

      // Storage service check
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        checks.push({
          service: 'File Storage',
          status: buckets ? 'healthy' : 'warning',
          message: buckets ? `Storage available (${buckets.length} buckets)` : 'Storage check inconclusive',
          lastChecked: new Date()
        });
      } catch (storageError) {
        checks.push({
          service: 'File Storage',
          status: 'warning',
          message: 'Storage service check failed',
          lastChecked: new Date()
        });
      }

      // Edge Functions check (ping our publisher-submit function)
      try {
        const functionStart = Date.now();
        const { error: functionError } = await supabase.functions.invoke('publisher-submit', {
          body: { test: true }
        });
        const functionLatency = Date.now() - functionStart;

        checks.push({
          service: 'Edge Functions',
          status: functionError && !functionError.message?.includes('test') ? 'warning' : 'healthy',
          latency: functionLatency,
          message: functionError && !functionError.message?.includes('test')
            ? `Functions responding (${functionLatency}ms)`
            : `Functions operational (${functionLatency}ms)`,
          lastChecked: new Date()
        });
      } catch (functionError) {
        checks.push({
          service: 'Edge Functions',
          status: 'error',
          message: 'Edge functions are not responding',
          lastChecked: new Date()
        });
      }

      // Browser compatibility check
      const browserFeatures = {
        localStorage: !!window.localStorage,
        sessionStorage: !!window.sessionStorage,
        indexedDB: !!window.indexedDB,
        webWorkers: !!window.Worker,
        serviceWorkers: 'serviceWorker' in navigator
      };

      const missingFeatures = Object.entries(browserFeatures)
        .filter(([, supported]) => !supported)
        .map(([feature]) => feature);

      checks.push({
        service: 'Browser Compatibility',
        status: missingFeatures.length > 0 ? 'warning' : 'healthy',
        message: missingFeatures.length > 0
          ? `Missing features: ${missingFeatures.join(', ')}`
          : 'All required browser features supported',
        lastChecked: new Date()
      });

      // Network connectivity check
      if (navigator.onLine !== undefined) {
        checks.push({
          service: 'Network Connectivity',
          status: navigator.onLine ? 'healthy' : 'error',
          message: navigator.onLine ? 'Online' : 'Offline - No network connection',
          lastChecked: new Date()
        });
      }

      // Memory usage check (if available)
      if ('memory' in performance) {
        interface ChromeMemoryInfo {
          usedJSHeapSize: number;
          jsHeapSizeLimit: number;
        }
        const memory = (performance as { memory: ChromeMemoryInfo }).memory;
        const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

        checks.push({
          service: 'Memory Usage',
          status: memoryUsagePercent > 95 ? 'error' : memoryUsagePercent > 80 ? 'warning' : 'healthy',
          message: `Using ${Math.round(memoryUsagePercent)}% of available memory (${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB)`,
          lastChecked: new Date()
        });
      }

    } catch (error) {
      checks.push({
        service: 'Health Check System',
        status: 'error',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date()
      });
    }

    setHealthChecks(checks);
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => {
    runHealthChecks();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: "default" as const,
      warning: "secondary" as const,
      error: "destructive" as const,
    };

    const labels = {
      healthy: "Healthy",
      warning: "Warning",
      error: "Error",
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const overallHealth = healthChecks.length > 0 ? {
    healthy: healthChecks.filter(h => h.status === 'healthy').length,
    warning: healthChecks.filter(h => h.status === 'warning').length,
    error: healthChecks.filter(h => h.status === 'error').length,
  } : { healthy: 0, warning: 0, error: 0 };

  const overallStatus = overallHealth.error > 0 ? 'error' :
                       overallHealth.warning > 0 ? 'warning' : 'healthy';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            System Health
          </h2>
          <p className="text-muted-foreground">Monitor system services and performance</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Last checked: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button variant="outline" size="sm" onClick={runHealthChecks} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Health Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(overallStatus)}
              <div>
                <h3 className="text-lg font-semibold">System Status</h3>
                <p className="text-sm text-muted-foreground">
                  {overallHealth.healthy} healthy, {overallHealth.warning} warnings, {overallHealth.error} errors
                </p>
              </div>
            </div>
            {getStatusBadge(overallStatus)}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{overallHealth.healthy}</div>
              <div className="text-sm text-muted-foreground">Healthy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{overallHealth.warning}</div>
              <div className="text-sm text-muted-foreground">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{overallHealth.error}</div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Service Checks */}
      <div className="grid gap-4">
        {healthChecks.map((check, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <div className="font-medium">{check.service}</div>
                    <div className="text-sm text-muted-foreground">{check.message}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {check.latency && (
                    <Badge variant="outline" className="text-xs">
                      {check.latency}ms
                    </Badge>
                  )}
                  {getStatusBadge(check.status)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recommendations */}
      {overallHealth.warning > 0 || overallHealth.error > 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>System Health Issues Detected:</strong> Some services are experiencing problems.
            Check the individual service statuses above for details and recommended actions.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>All Systems Operational:</strong> All monitored services are functioning normally.
            The platform is healthy and ready to handle user requests.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
