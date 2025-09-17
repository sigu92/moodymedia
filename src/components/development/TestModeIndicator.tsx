import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  TestTube, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Activity,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { stripeConfig } from '@/config/stripe';
import { developmentMockSystem, MockPaymentConfig } from '@/utils/developmentMockSystem';

export const TestModeIndicator: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mockConfig, setMockConfig] = useState(developmentMockSystem.getCurrentConfig());
  const [stats, setStats] = useState(developmentMockSystem.getStats());
  const [status, setStatus] = useState(developmentMockSystem.getStatus());

  useEffect(() => {
    // Update status periodically
    const interval = setInterval(() => {
      setStatus(developmentMockSystem.getStatus());
      setStats(developmentMockSystem.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleConfigUpdate = (updates: Partial<MockPaymentConfig>) => {
    const newConfig = { ...mockConfig, ...updates };
    setMockConfig(newConfig);
    developmentMockSystem.updateConfig(updates);
  };

  const handleResetConfig = () => {
    developmentMockSystem.resetConfig();
    setMockConfig(developmentMockSystem.getCurrentConfig());
  };

  const handleClearStats = () => {
    developmentMockSystem.clearStats();
    setStats(developmentMockSystem.getStats());
  };

  const getStatusColor = () => {
    if (!status.isDevelopment) return 'bg-gray-500';
    if (status.isMockEnabled) return 'bg-blue-500';
    if (status.isTestMode) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!status.isDevelopment) return 'Production';
    if (status.isMockEnabled) return 'Mock Payments';
    if (status.isTestMode) return 'Stripe Test Mode';
    return 'Stripe Live Mode';
  };

  // Only show in development
  if (!status.isDevelopment) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className={`${getStatusColor()} text-white border-0 shadow-lg hover:opacity-80`}
          >
            <TestTube className="h-4 w-4 mr-2" />
            {getStatusText()}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Card className="w-96 mt-2 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TestTube className="h-5 w-5" />
                Development Environment
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant={status.isMockEnabled ? "default" : "outline"}>
                  {status.isMockEnabled ? "Mock Enabled" : "Mock Disabled"}
                </Badge>
                <Badge variant={status.isTestMode ? "secondary" : "outline"}>
                  {status.isTestMode ? "Test Mode" : "Live Mode"}
                </Badge>
                <Badge variant={status.stripeConfigured ? "default" : "destructive"}>
                  {status.stripeConfigured ? "Configured" : "Not Configured"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Current Status */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Current Status
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Environment:</span>
                    <span className="font-mono">{status.environment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Mode:</span>
                    <span className="font-mono">
                      {status.isMockEnabled ? 'Mock' : status.isTestMode ? 'Test' : 'Live'}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Mock Configuration */}
              {status.isMockEnabled && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Mock Configuration
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="simulate-delays" className="text-sm">
                        Simulate Delays
                      </Label>
                      <Switch
                        id="simulate-delays"
                        checked={mockConfig.simulateDelays}
                        onCheckedChange={(checked) => 
                          handleConfigUpdate({ simulateDelays: checked })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">
                        Failure Rate: {mockConfig.failureRate}%
                      </Label>
                      <Slider
                        value={[mockConfig.failureRate]}
                        onValueChange={([value]) => 
                          handleConfigUpdate({ failureRate: value })
                        }
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">
                        Network Error Rate: {mockConfig.networkErrorRate}%
                      </Label>
                      <Slider
                        value={[mockConfig.networkErrorRate]}
                        onValueChange={([value]) => 
                          handleConfigUpdate({ networkErrorRate: value })
                        }
                        max={20}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">
                        Default Delay: {mockConfig.defaultDelay}ms
                      </Label>
                      <Slider
                        value={[mockConfig.defaultDelay]}
                        onValueChange={([value]) => 
                          handleConfigUpdate({ defaultDelay: value })
                        }
                        min={100}
                        max={10000}
                        step={100}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Statistics */}
              {stats.totalAttempts > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Test Statistics
                    </h4>
                    <Button
                      onClick={handleClearStats}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Success: {stats.successRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Failure: {stats.failureRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>Avg: {stats.averageDelay.toFixed(0)}ms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-3 w-3" />
                      <span>Total: {stats.totalAttempts}</span>
                    </div>
                  </div>

                  {Object.keys(stats.scenarioUsage).length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Scenario Usage:</Label>
                      <div className="space-y-1">
                        {Object.entries(stats.scenarioUsage).map(([scenario, count]) => (
                          <div key={scenario} className="flex justify-between text-xs">
                            <span className="capitalize">{scenario.replace(/_/g, ' ')}</span>
                            <span>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Quick Actions</h4>
                <div className="flex gap-2">
                  <Button
                    onClick={handleResetConfig}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Reset Config
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('Current Mock Config:', mockConfig);
                      console.log('Development Status:', status);
                      console.log('Test Statistics:', stats);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Log Status
                  </Button>
                </div>
              </div>

              {/* Warnings */}
              {status.isTestMode && !status.isMockEnabled && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Stripe Test Mode Active</p>
                    <p>Using real Stripe test API. Test cards will work, but no real charges will be made.</p>
                  </div>
                </div>
              )}

              {!status.stripeConfigured && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Stripe Not Configured</p>
                    <p>Add Stripe keys to .env file to enable test mode.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
