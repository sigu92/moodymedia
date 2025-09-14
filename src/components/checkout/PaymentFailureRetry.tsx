import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, CreditCard, HelpCircle, ArrowLeft } from 'lucide-react';
import { useCheckout } from '@/hooks/useCheckout';
import { stripeConfig } from '@/config/stripe';
import { toast } from '@/hooks/use-toast';

interface PaymentFailureRetryProps {
  error: string;
  sessionId?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  onContactSupport?: () => void;
}

export const PaymentFailureRetry: React.FC<PaymentFailureRetryProps> = ({
  error,
  sessionId,
  onRetry,
  onCancel,
  onContactSupport,
}) => {
  const { processStripePayment, formData } = useCheckout();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryPayment = async () => {
    if (!formData.billingInfo || !formData.paymentMethod) {
      toast({
        title: "Missing Information",
        description: "Please complete billing information before retrying payment.",
        variant: "destructive",
      });
      return;
    }

    setIsRetrying(true);

    try {
      const result = await processStripePayment(formData);
      
      if (result.success) {
        toast({
          title: "Payment Retry Successful",
          description: "Redirecting to secure checkout...",
        });
        onRetry?.();
      } else {
        toast({
          title: "Payment Retry Failed",
          description: result.error || "Please try again or contact support.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Payment retry error:', error);
      toast({
        title: "Retry Error",
        description: "An unexpected error occurred. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorType = (errorMessage: string): 'card' | 'network' | 'config' | 'unknown' => {
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('card') || lowerError.includes('declined') || lowerError.includes('insufficient')) {
      return 'card';
    }
    if (lowerError.includes('network') || lowerError.includes('timeout') || lowerError.includes('connection')) {
      return 'network';
    }
    if (lowerError.includes('configuration') || lowerError.includes('key') || lowerError.includes('api')) {
      return 'config';
    }
    return 'unknown';
  };

  const getRetryAdvice = (errorType: string) => {
    switch (errorType) {
      case 'card':
        return {
          title: 'Card Issue',
          suggestions: [
            'Try a different credit or debit card',
            'Verify your card details are correct',
            'Contact your bank to ensure the card is active',
            'Check if your card supports international transactions'
          ]
        };
      case 'network':
        return {
          title: 'Connection Issue',
          suggestions: [
            'Check your internet connection',
            'Try again in a few moments',
            'Refresh the page and retry',
            'Try from a different network if possible'
          ]
        };
      case 'config':
        return {
          title: 'System Issue',
          suggestions: [
            'This appears to be a system configuration issue',
            'Please contact our support team',
            'Try again later',
            'We apologize for the inconvenience'
          ]
        };
      default:
        return {
          title: 'Payment Issue',
          suggestions: [
            'Try using a different payment method',
            'Check your payment details',
            'Contact our support team if the issue persists',
            'Try again in a few minutes'
          ]
        };
    }
  };

  const errorType = getErrorType(error);
  const advice = getRetryAdvice(errorType);

  return (
    <div className="space-y-6">
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Payment Failed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>Error:</strong> {error}
            </p>
            {sessionId && (
              <p className="text-xs text-red-600 mt-2">
                Session ID: <code className="bg-red-100 px-1 rounded">{sessionId}</code>
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">{advice.title}</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {advice.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          {stripeConfig.isTestMode && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Test Mode:</strong> This is a test payment. Use card number 4242 4242 4242 4242 
                with any future expiry date and CVC for testing.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Button
            onClick={handleRetryPayment}
            disabled={isRetrying}
            className="flex items-center gap-2"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Retry Payment
              </>
            )}
          </Button>

          {errorType === 'config' || errorType === 'unknown' ? (
            <Button
              onClick={onContactSupport}
              variant="outline"
              className="flex items-center gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              Contact Support
            </Button>
          ) : null}
        </div>

        <Button
          onClick={onCancel}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Checkout
        </Button>
      </div>
    </div>
  );
};
