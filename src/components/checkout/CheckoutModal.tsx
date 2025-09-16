import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ArrowLeft, ArrowRight, AlertCircle, Loader2, CheckCircle2, Clock, CreditCard, ExternalLink } from 'lucide-react';
import { ProgressIndicator } from './ProgressIndicator';
import { preloadAllCheckoutComponents } from './lazy';
import {
  LazyStep1CartReview,
  LazyStep2PaymentMethod,
  LazyStep3BillingInfo,
  LazyStep4ContentUpload,
  LazyStep5OrderConfirmation
} from './lazy';
import { useCart } from '@/hooks/useCart';
import { useCheckout } from '@/hooks/useCheckout';
import { CheckoutValidationError } from '@/utils/checkoutUtils';
import { useToast } from '@/hooks/use-toast';
import { stripeConfig } from '@/config/stripe';

export interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export type CheckoutStep = 'cart-review' | 'payment-method' | 'billing-info' | 'content-upload' | 'confirmation';

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  onOpenChange,
  onComplete
}) => {
  const { cartItems } = useCart();
  const { toast } = useToast();
  const {
    currentStep,
    validationErrors,
    isLoading,
    isSubmitting,
    goToNextStep,
    goToPreviousStep,
    submitCheckout,
    resetCheckout,
    canGoNext,
    canGoBack,
    currentStepIndex,
    isLastStep
  } = useCheckout();

  // Loading states and progress feedback
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [stepValidation, setStepValidation] = useState<Record<CheckoutStep, boolean>>({
    'cart-review': false,
    'payment-method': false,
    'billing-info': false,
    'content-upload': false,
    'confirmation': false,
  });

  // Reset to first step when modal opens
  useEffect(() => {
    if (open) {
      // Preload all checkout components for better UX
      preloadAllCheckoutComponents();

      resetCheckout();
      setStepValidation({
        'cart-review': false,
        'payment-method': false,
        'billing-info': false,
        'content-upload': false,
        'confirmation': false,
      });
    }
  }, [open, resetCheckout]);

  // Debug step validation changes - only log when validation actually changes
  useEffect(() => {
    if (import.meta.env.DEV && currentStep === 'payment-method') {
      console.log('[MODAL STEP VALIDATION]', {
        stepValidation,
        currentStep,
        currentStepValid: stepValidation[currentStep],
        canGoNext: !isLastStep && stepValidation[currentStep],
        paymentMethodValid: stepValidation['payment-method']
      });
    }
  }, [stepValidation['payment-method'], currentStep]); // Only depend on payment-method validation and currentStep

  const handleNext = async () => {
    console.log('[NEXT BUTTON CLICK]', {
      currentStep,
      stepValidation: stepValidation[currentStep],
      allStepValidations: stepValidation,
      canGoNext,
      validationErrors,
      timestamp: new Date().toISOString()
    });

    // Check if current step is valid before proceeding
    if (!stepValidation[currentStep]) {
      console.log('[VALIDATION FAILED]', {
        currentStep,
        stepValidationForCurrent: stepValidation[currentStep],
        reason: 'Current step validation is false'
      });

      // Show validation error feedback
      toast({
        title: "Validation Error",
        description: `Please complete all required fields in the ${currentStep.replace('-', ' ')} step before proceeding.`,
        variant: "destructive"
      });

      // If there are specific validation errors, show the first one
      if (validationErrors.length > 0) {
        toast({
          title: "Please fix the following:",
          description: validationErrors[0].message,
          variant: "destructive"
        });
      }

      return;
    }

    console.log('[PROCEEDING TO NEXT STEP]');
    await goToNextStep();
  };

  const handleBack = () => {
    goToPreviousStep();
  };

  const handleStepValidationChange = (step: CheckoutStep, isValid: boolean) => {
    console.log('[STEP VALIDATION CHANGE]', {
      step,
      isValid,
      currentStep,
      timestamp: new Date().toISOString()
    });

    setStepValidation(prev => {
      const newState = {
        ...prev,
        [step]: isValid
      };

      console.log('[STEP VALIDATION UPDATED]', {
        step,
        oldValue: prev[step],
        newValue: isValid,
        changed: prev[step] !== isValid,
        fullState: newState,
        currentStepValid: newState[currentStep],
        canGoNext: newState[currentStep] && currentStep !== 'confirmation'
      });

      return newState;
    });
  };

  const handleComplete = async () => {
    setShowLoadingOverlay(true);
    setProgressMessage('Processing your order...');
    setEstimatedTime(3);

    // Determine if using Stripe or mock payments
    const isUsingStripe = stripeConfig.isConfigured();

    // Stripe-specific progress steps
    const progressSteps = isUsingStripe ? [
      { message: 'Validating order details...', time: 2 },
      { message: 'Creating Stripe checkout session...', time: 3 },
      { message: 'Redirecting to Stripe checkout...', time: 2 },
    ] : [
      { message: 'Validating order details...', time: 2 },
      { message: 'Processing mock payment...', time: 2 },
      { message: 'Creating order records...', time: 2 },
      { message: 'Sending confirmation...', time: 1 },
    ];

    for (const step of progressSteps) {
      setProgressMessage(step.message);
      setEstimatedTime(step.time);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    const success = await submitCheckout();
    if (success) {
      if (isUsingStripe) {
        try {
          setProgressMessage('Redirecting to Stripe...');
          setEstimatedTime(null);
          // Don't close the overlay immediately for Stripe - user will be redirected
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Stripe redirect error:', error);
          toast({
            title: "Redirect Error",
            description: "Failed to redirect to Stripe. Please try again or contact support.",
            variant: "destructive"
          });
        } finally {
          // Cleanup if redirect fails or takes too long
          setShowLoadingOverlay(false);
          onOpenChange(false);
          setProgressMessage('');
          setEstimatedTime(null);
        }
      } else {
        setProgressMessage('Order completed successfully!');
        setEstimatedTime(null);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setShowLoadingOverlay(false);
        onOpenChange(false);
        onComplete?.();
      }
    } else {
      setShowLoadingOverlay(false);
      setProgressMessage('');
      setEstimatedTime(null);
    }
  };

  const renderValidationErrors = () => {
    if (validationErrors.length === 0) return null;

    return (
      <div className="mx-4 sm:mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-destructive mb-2">
              Please fix the following errors:
            </h4>
            <ul className="text-sm text-destructive/80 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={`${error.field}-${index}`}>• {error.message}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderLoadingOverlay = () => {
    if (!showLoadingOverlay) return null;

    const isStripeFlow = progressMessage?.includes('Stripe') || progressMessage?.includes('checkout session');
    const isRedirecting = progressMessage?.includes('Redirecting');

    return (
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
        <div className="bg-background border rounded-lg p-6 shadow-lg max-w-sm w-full mx-4">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              {isStripeFlow ? (
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
              ) : (
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              )}
              
              {isRedirecting && (
                <ExternalLink className="h-4 w-4 text-blue-600 absolute -top-1 -right-1 animate-bounce" />
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {progressMessage || 'Processing...'}
              </h3>

              {isStripeFlow && (
                <p className="text-sm text-muted-foreground">
                  {stripeConfig.isTestMode ? 
                    'Using Stripe test mode - no real payment will be processed' :
                    'Secure payment processing via Stripe'
                  }
                </p>
              )}

              {estimatedTime && !isRedirecting && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Estimated time: {estimatedTime}s</span>
                </div>
              )}

              {isRedirecting ? (
                <div className="w-full bg-blue-100 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse transition-all duration-1000" style={{ width: '90%' }} />
                </div>
              ) : (
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              )}
            </div>

            {isRedirecting && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  You will be redirected to Stripe's secure checkout page. 
                  Do not close this window.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'cart-review':
        return (
          <LazyStep1CartReview
            onValidationChange={(isValid) => handleStepValidationChange('cart-review', isValid)}
          />
        );
      case 'payment-method':
        return (
          <LazyStep2PaymentMethod
            onValidationChange={(isValid) => handleStepValidationChange('payment-method', isValid)}
          />
        );
      case 'billing-info':
        return (
          <LazyStep3BillingInfo
            onValidationChange={(isValid) => handleStepValidationChange('billing-info', isValid)}
          />
        );
      case 'content-upload':
        return (
          <LazyStep4ContentUpload
            onValidationChange={(isValid) => handleStepValidationChange('content-upload', isValid)}
          />
        );
      case 'confirmation':
        return (
          <LazyStep5OrderConfirmation
            onValidationChange={(isValid) => handleStepValidationChange('confirmation', isValid)}
            onOrderComplete={(orderId) => {
              console.log('Order completed:', orderId);
              // Handle order completion - could navigate to success page or show success message
              onComplete?.();
            }}
          />
        );
      default:
        return null;
    }
  };

  const renderFooter = () => {

    return (
        <div className="flex flex-col gap-3 p-4 border-t bg-muted/50 sm:flex-row sm:justify-between sm:items-center sm:gap-0 sm:p-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={!canGoBack || isLoading || isSubmitting}
            className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-1"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowLeft className="h-4 w-4" />
            )}
            Back
          </Button>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 order-1 sm:order-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            {isLastStep ? (
              <Button
                onClick={handleComplete}
                disabled={isLoading || isSubmitting}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Complete Order'
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canGoNext || isLoading || isSubmitting || !stepValidation[currentStep]}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl h-[95vh] max-h-[90vh] overflow-hidden flex flex-col sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw]">
        <DialogHeader className="flex-shrink-0 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          <DialogTitle className="text-lg font-semibold sm:text-xl">
            Checkout
          </DialogTitle>
          <DialogDescription>
            Complete your order by reviewing your cart, providing billing information, and processing payment.
          </DialogDescription>

          <ProgressIndicator
            currentStep={currentStepIndex + 1}
            totalSteps={5}
            steps={[
              { id: 'cart-review', title: 'Cart Review', description: 'Review items' },
              { id: 'payment-method', title: 'Payment Method', description: 'Choose payment' },
              { id: 'billing-info', title: 'Billing Info', description: 'Enter details' },
              { id: 'content-upload', title: 'Content Upload', description: 'Upload content' },
              { id: 'confirmation', title: 'Confirmation', description: 'Confirm order' }
            ]}
          />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 relative min-h-0">
          {renderValidationErrors()}
          {renderStepContent()}
          {renderLoadingOverlay()}
        </div>

        {renderFooter()}
      </DialogContent>
    </Dialog>
  );
};
