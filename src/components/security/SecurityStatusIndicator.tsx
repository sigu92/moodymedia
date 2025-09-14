import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Shield, 
  Lock,
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  Settings,
  Key,
  Globe,
  Database,
  Activity
} from 'lucide-react';
import { securityManager, SecurityAuditResult } from '@/utils/securityManager';
import { secureLogger } from '@/utils/secureLogger';
import { toast } from '@/hooks/use-toast';

export const SecurityStatusIndicator: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
  const [securityEvents, setSecurityEvents] = useState(securityManager.getEvents());
  const [logStats, setLogStats] = useState(secureLogger.manager.getStats());

  useEffect(() => {
    // Run initial audit
    runSecurityAudit();

    // Update security events and stats periodically
    const interval = setInterval(() => {
      setSecurityEvents(securityManager.getEvents());
      setLogStats(secureLogger.manager.getStats());
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const runSecurityAudit = async () => {
    setIsRunningAudit(true);
    
    try {
      // Add small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = securityManager.audit();
      setAuditResult(result);
      
      // Log the audit
      secureLogger.audit.complianceEvent('security_audit_completed', 
        result.score >= 85 ? 'pass' : result.score >= 70 ? 'warning' : 'fail', 
        { score: result.score }
      );

      toast({
        title: "Security Audit Complete",
        description: `Security score: ${result.score}/100`,
        variant: result.score >= 85 ? "default" : "destructive",
      });

    } catch (error) {
      console.error('Security audit failed:', error);
      toast({
        title: "Audit Failed",
        description: "Failed to complete security audit",
        variant: "destructive",
      });
    } finally {
      setIsRunningAudit(false);
    }
  };

  const handleExportLogs = () => {
    try {
      const logs = secureLogger.manager.exportLogs('json');
      const blob = new Blob([logs], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `security-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      secureLogger.audit.adminAction('security_logs_exported');
      
      toast({
        title: "Logs Exported",
        description: "Security logs have been exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export security logs",
        variant: "destructive",
      });
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number): { variant: "default" | "secondary" | "destructive" | "outline", text: string } => {
    if (score >= 90) return { variant: "default", text: "Excellent" };
    if (score >= 80) return { variant: "secondary", text: "Good" };
    if (score >= 70) return { variant: "outline", text: "Fair" };
    return { variant: "destructive", text: "Poor" };
  };

  // Only show in development or when explicitly enabled
  if (process.env.NODE_ENV === 'production' && !showSensitiveInfo) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className={`${auditResult?.score ? getScoreColor(auditResult.score) : ''} bg-white border-2 shadow-lg hover:bg-gray-50`}
          >
            <Shield className="h-4 w-4 mr-2" />
            Security
            {auditResult && (
              <Badge variant={getScoreBadge(auditResult.score).variant} className="ml-2">
                {auditResult.score}
              </Badge>
            )}
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
                <Shield className="h-5 w-5" />
                Security Status
                <Button
                  onClick={runSecurityAudit}
                  disabled={isRunningAudit}
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                >
                  <RefreshCw className={`h-4 w-4 ${isRunningAudit ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Security Score */}
              {auditResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Security Score</span>
                    <Badge variant={getScoreBadge(auditResult.score).variant}>
                      {getScoreBadge(auditResult.score).text}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Progress value={auditResult.score} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0</span>
                      <span className={getScoreColor(auditResult.score)}>
                        {auditResult.score}/100
                      </span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Compliance Status */}
              {auditResult && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Compliance Status
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      {auditResult.compliance.pciCompliant ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span>PCI Compliant</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {auditResult.compliance.httpsEnforced ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span>HTTPS Enforced</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {auditResult.compliance.apiKeysSecure ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span>API Keys Secure</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {auditResult.compliance.webhooksSecure ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span>Webhooks Secure</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {auditResult.compliance.dataProtected ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span>Data Protected</span>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Recent Security Events */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Recent Events
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {securityEvents.length}
                  </Badge>
                </div>
                
                {securityEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No security events recorded</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {securityEvents.slice(-5).reverse().map((event) => (
                      <div key={event.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs">
                        <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                          event.severity === 'critical' ? 'bg-red-600' :
                          event.severity === 'high' ? 'bg-orange-600' :
                          event.severity === 'medium' ? 'bg-yellow-600' : 'bg-blue-600'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{event.description}</p>
                          <p className="text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Log Statistics */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Log Statistics
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="font-semibold text-blue-700">{logStats.totalEntries}</div>
                    <div className="text-blue-600 text-xs">Total Logs</div>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <div className="font-semibold text-red-700">{logStats.sensitiveEntries}</div>
                    <div className="text-red-600 text-xs">Sensitive</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="font-semibold text-green-700">{logStats.byLevel?.error || 0}</div>
                    <div className="text-green-600 text-xs">Errors</div>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded">
                    <div className="font-semibold text-purple-700">{logStats.byCategory?.security || 0}</div>
                    <div className="text-purple-600 text-xs">Security</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleExportLogs}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export Logs
                  </Button>
                  <Button
                    onClick={() => {
                      secureLogger.manager.clearLogs();
                      setLogStats(secureLogger.manager.getStats());
                      toast({ title: "Logs Cleared", description: "Old logs have been cleared" });
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Clear Logs
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('Security Events:', securityEvents);
                      console.log('Audit Result:', auditResult);
                      console.log('Security Config:', securityManager.getConfig());
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Log Status
                  </Button>
                  <Button
                    onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    {showSensitiveInfo ? (
                      <EyeOff className="h-3 w-3 mr-1" />
                    ) : (
                      <Eye className="h-3 w-3 mr-1" />
                    )}
                    {showSensitiveInfo ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>

              {/* Warnings and Recommendations */}
              {auditResult && (auditResult.warnings.length > 0 || auditResult.errors.length > 0 || auditResult.recommendations.length > 0) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    {auditResult.errors.length > 0 && (
                      <div className="space-y-1">
                        <h5 className="text-sm font-medium text-red-600 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Errors ({auditResult.errors.length})
                        </h5>
                        {auditResult.errors.slice(0, 2).map((error, index) => (
                          <p key={index} className="text-xs text-red-700 bg-red-50 p-2 rounded">
                            {error}
                          </p>
                        ))}
                      </div>
                    )}

                    {auditResult.warnings.length > 0 && (
                      <div className="space-y-1">
                        <h5 className="text-sm font-medium text-yellow-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Warnings ({auditResult.warnings.length})
                        </h5>
                        {auditResult.warnings.slice(0, 2).map((warning, index) => (
                          <p key={index} className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                            {warning}
                          </p>
                        ))}
                      </div>
                    )}

                    {auditResult.recommendations.length > 0 && (
                      <div className="space-y-1">
                        <h5 className="text-sm font-medium text-blue-600 flex items-center gap-1">
                          <Settings className="h-3 w-3" />
                          Recommendations ({auditResult.recommendations.length})
                        </h5>
                        {auditResult.recommendations.slice(0, 2).map((rec, index) => (
                          <p key={index} className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
                            {rec}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Environment Warning */}
              {process.env.NODE_ENV === 'production' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium">Production Environment</p>
                      <p>Security indicator visible. Ensure this is intentional for compliance monitoring.</p>
                    </div>
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
