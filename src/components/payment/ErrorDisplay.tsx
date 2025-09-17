import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertTriangle,
  CreditCard,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  ExternalLink,
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { ErrorDetails, ErrorContext } from '@/utils/errorHandling';
import { paymentRetry, RetrySession } from '@/utils/paymentRetry';
import { stripeConfig } from '@/config/stripe';

interface ErrorDisplayProps {
  error: Error | ErrorDetails | unknown;
  context: ErrorContext;
  errorDetails: ErrorDetails;
  retrySession?: RetrySession;
  onRetry?: () => Promise<void>;
  onContactSupport?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  context,
  errorDetails,
  retrySession,
  onRetry,
  onContactSupport,
  onDismiss,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const getErrorIcon = () => {
    switch (errorDetails.severity) {
      case 'critical':
        return <XCircle className="h-8 w-8 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-8 w-8 text-red-500" />;
      case 'medium':
        return <AlertCircle className="h-8 w-8 text-orange-500" />;
      case 'low':
        return <AlertCircle className="h-8 w-8 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-8 w-8 text-gray-500" />;
    }
  };

  const getErrorBadgeVariant = () => {
    switch (errorDetails.category) {
      case 'user_action_required':
        return 'default';
      case 'retry_recommended':
        return 'secondary';
      case 'system_issue':
        return 'destructive';
      case 'contact_support':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getCategoryLabel = () => {
    switch (errorDetails.category) {
      case 'user_action_required':
        return 'Action Required';
      case 'retry_recommended':
        return 'Retry Available';
      case 'system_issue':
        return 'System Issue';
      case 'contact_support':
        return 'Support Needed';
      default:
        return 'Error';
    }
  };

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const renderActionableSteps = () => {
    if (!errorDetails.actionableSteps.length) return null;

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm">What you can do:</h4>
        <ul className="space-y-2">
          {errorDetails.actionableSteps.map((step, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mt-0.5 flex-shrink-0">
                {index + 1}
              </div>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderRetryInformation = () => {
    if (!errorDetails.retryable || !retrySession) return null;

    const canRetry = retrySession.attempts.length < retrySession.config.maxAttempts;
    const nextRetryTime = retrySession.nextRetryAt ? new Date(retrySession.nextRetryAt) : null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry Information
          </h4>
          <Badge variant="outline" className="text-xs">
            Attempt {retrySession.attempts.length} of {retrySession.config.maxAttempts}
          </Badge>
        </div>

        {canRetry && (
          <div className="space-y-2">
            {nextRetryTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Next retry: {nextRetryTime.toLocaleTimeString()}
                </span>
              </div>
            )}
            
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again Now
                </>
              )}
            </Button>
          </div>
        )}

        {!canRetry && (
          <div className="text-sm text-muted-foreground">
            Maximum retry attempts reached. Please try a different payment method or contact support.
          </div>
        )}
      </div>
    );
  };

  const renderSupportInformation = () => {
    const { supportInfo } = errorDetails;
    if (!supportInfo?.contactRecommended) return null;

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Need Help?
        </h4>
        
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            {supportInfo.urgency === 'high' 
              ? "Our support team can help resolve this issue quickly."
              : "Contact support if the problem persists."
            }
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={onContactSupport}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Support
            </Button>
            
            {supportInfo.urgency === 'high' && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => window.open('tel:+1-555-SUPPORT', '_self')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Support
              </Button>
            )}
          </div>

          {supportInfo.includeTransactionId && context.sessionId && (
            <div className="text-xs text-muted-foreground p-2 bg-gray-50 rounded border">
              <strong>Transaction ID:</strong> {context.sessionId}
              <br />
              <span>Include this ID when contacting support for faster assistance.</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTechnicalDetails = () => {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between p-0 h-auto">
            <span className="text-sm font-medium">Technical Details</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-3 mt-3">
          <div className="text-xs font-mono bg-gray-50 p-3 rounded border space-y-1">
            <div><strong>Error Code:</strong> {errorDetails.code}</div>
            <div><strong>Error Type:</strong> {errorDetails.type}</div>
            <div><strong>Category:</strong> {errorDetails.category}</div>
            <div><strong>Severity:</strong> {errorDetails.severity}</div>
            <div><strong>Retryable:</strong> {errorDetails.retryable ? 'Yes' : 'No'}</div>
            {error?.message && (
              <div><strong>Raw Message:</strong> {error.message}</div>
            )}
            {context.timestamp && (
              <div><strong>Timestamp:</strong> {new Date(context.timestamp).toLocaleString()}</div>
            )}
          </div>
          
          {stripeConfig.isTestMode && (
            <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
              <strong>Development Mode:</strong> This error occurred in test mode. 
              Real payment processing may behave differently.
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <Card className={`border-l-4 ${
      errorDetails.severity === 'critical' ? 'border-l-red-500' :
      errorDetails.severity === 'high' ? 'border-l-red-400' :
      errorDetails.severity === 'medium' ? 'border-l-orange-400' :
      'border-l-yellow-400'
    } ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {getErrorIcon()}
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Payment Error</CardTitle>
              <Badge variant={getErrorBadgeVariant()}>
                {getCategoryLabel()}
              </Badge>
            </div>
            
            <p className="text-base text-foreground leading-relaxed">
              {errorDetails.userMessage}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Actionable Steps */}
        {renderActionableSteps()}

        {/* Retry Information */}
        {renderRetryInformation() && (
          <>
            <Separator />
            {renderRetryInformation()}
          </>
        )}

        {/* Support Information */}
        {renderSupportInformation() && (
          <>
            <Separator />
            {renderSupportInformation()}
          </>
        )}

        {/* Alternative Payment Methods */}
        {errorDetails.category === 'user_action_required' && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Alternative Payment Methods
              </h4>
              <div className="text-sm text-muted-foreground">
                Try using a different credit card, debit card, or digital wallet if available.
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Use Different Payment Method
              </Button>
            </div>
          </>
        )}

        {/* Security Notice */}
        {errorDetails.type === 'authentication_error' && (
          <>
            <Separator />
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Security Notice</p>
                <p className="text-blue-700 mt-1">
                  This error occurred during payment authentication. Your payment information is secure.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Technical Details */}
        <Separator />
        {renderTechnicalDetails()}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {onDismiss && (
            <Button
              onClick={onDismiss}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Dismiss
            </Button>
          )}
          
          {errorDetails.category === 'user_action_required' && (
            <Button
              onClick={() => window.location.reload()}
              variant="default"
              size="sm"
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ErrorDisplay;
