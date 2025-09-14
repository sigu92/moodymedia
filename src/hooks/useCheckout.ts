import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { CheckoutValidator, CheckoutFormData, CheckoutValidationError, calculateVATForCountry, getVATConfig } from '@/utils/checkoutUtils';
import { MockPaymentProcessor, MockPaymentResult } from '@/utils/mockPaymentProcessor';
import { stripeConfig, validateStripeEnvironment } from '@/config/stripe';
import { useOrders, OrderItem } from '@/hooks/useOrders';
import { generateOrderNumber } from '@/hooks/useOrders';
import { 
  createStripeSession, 
  createOrGetStripeCustomer,
  validateCartForStripe,
  convertCartToStripeLineItems,
  generateCheckoutUrls,
  createSessionMetadata,
  calculateOrderTotals,
  handleStripeError
} from '@/utils/stripeUtils';
import { customerManager } from '@/utils/customerUtils';
import { developmentMockSystem } from '@/utils/developmentMockSystem';
import { errorHandler, ErrorContext } from '@/utils/errorHandling';
import { paymentRetry } from '@/utils/paymentRetry';
import { paymentAnalytics } from '@/utils/paymentAnalytics';
import { cartRecovery } from '@/utils/cartRecovery';

export type CheckoutStep = 'cart-review' | 'billing-payment' | 'content-upload' | 'confirmation';

const CHECKOUT_STEPS: CheckoutStep[] = ['cart-review', 'billing-payment', 'content-upload', 'confirmation'];

// Interface for Stripe payment results
export interface StripePaymentResult {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  customerId?: string;
  error?: string;
  requiresRedirect: boolean;
}

export interface UseCheckoutReturn {
  // State
  currentStep: CheckoutStep;
  formData: CheckoutFormData;
  validationErrors: CheckoutValidationError[];
  isLoading: boolean;
  isSubmitting: boolean;

  // Actions
  goToNextStep: () => Promise<boolean>;
  goToPreviousStep: () => void;
  goToStep: (step: CheckoutStep) => void;
  updateFormData: (data: Partial<CheckoutFormData>) => void;
  submitCheckout: () => Promise<boolean>;
  resetCheckout: () => void;

  // Stripe-specific actions
  processStripePayment: (formData: CheckoutFormData) => Promise<StripePaymentResult>;
  handleStripeReturn: (sessionId: string) => Promise<{ success: boolean; orderData?: any; sessionData?: any }>;

  // Validation
  validateCurrentStep: () => CheckoutValidationError[];
  hasValidationErrors: boolean;

  // Computed values
  canGoNext: boolean;
  canGoBack: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  currentStepIndex: number;
  progress: number;
}

export const useCheckout = (): UseCheckoutReturn => {
  const { user } = useAuth();
  const { cartItems, clearCart } = useCart();
  const { createOrder } = useOrders();

  // Process Stripe payment by creating checkout session
  const processStripePayment = useCallback(async (formData: CheckoutFormData): Promise<StripePaymentResult> => {
    try {
      // Check if we should use mock payments
      if (developmentMockSystem.shouldUseMock()) {
        console.log('🧪 Using mock payment system');
        
        // Create mock session data
        const mockSessionData = {
          lineItems: cartItems.map(item => ({
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Media placement - ${item.outlet?.domain || 'Unknown outlet'}`
              },
              unit_amount: Math.round((item.finalPrice || item.basePrice) * 100)
            },
            quantity: 1
          })),
          customerId: user?.id || 'mock_customer',
          customerEmail: formData.billingInfo.email,
          successUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}/checkout/cancel`,
          metadata: {
            mock_payment: 'true',
            user_id: user?.id || '',
            cart_items: JSON.stringify(cartItems.map(item => ({ 
              id: item.id, 
              price: item.finalPrice || item.basePrice 
            })))
          }
        };

        // Process mock payment
        const mockResult = await developmentMockSystem.createSession(mockSessionData);
        
        // Record the attempt
        developmentMockSystem.recordAttempt(mockResult);

        if (mockResult.success) {
          return {
            success: true,
            checkoutUrl: mockResult.checkoutUrl,
            sessionId: mockResult.sessionId,
            requiresRedirect: true,
          };
        } else {
          return {
            success: false,
            error: mockResult.error || 'Mock payment failed',
            requiresRedirect: false,
          };
        }
      }

      // Validate cart for Stripe processing
      const cartValidation = validateCartForStripe(cartItems);
      if (!cartValidation.isValid) {
        return {
          success: false,
          error: cartValidation.errors.join(', '),
          requiresRedirect: false,
        };
      }

      // Create or get Stripe customer
      const customerEmail = formData.billingInfo?.email || user?.email;
      if (!customerEmail) {
        return {
          success: false,
          error: 'Customer email is required for payment processing',
          requiresRedirect: false,
        };
      }

      // Use customer manager to get or create customer
      const customerName = `${formData.billingInfo?.firstName || ''} ${formData.billingInfo?.lastName || ''}`.trim();
      
      const customerResult = await customerManager.getOrCreate(
        user?.id || '',
        customerEmail,
        customerName || undefined
      );

      if (!customerResult.success || !customerResult.customerId) {
        return {
          success: false,
          error: customerResult.error || 'Failed to create or retrieve customer',
          requiresRedirect: false,
        };
      }

      const customer = { id: customerResult.customerId };

      // Convert cart items to Stripe line items
      const lineItems = convertCartToStripeLineItems(cartItems);

      // Generate checkout URLs
      const baseUrl = window.location.origin;
      const { successUrl, cancelUrl } = generateCheckoutUrls(baseUrl);

      // Create session metadata
      const metadata = createSessionMetadata(formData, user?.id);

      // Create Stripe checkout session
      const sessionData = await createStripeSession({
        lineItems,
        customerId: customer.id,
        customerEmail,
        successUrl,
        cancelUrl,
        metadata,
        mode: 'payment',
        billingAddressCollection: 'required',
        shippingAddressCollection: {
          allowed_countries: ['US', 'CA', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'SE', 'NO', 'DK', 'FI'],
        },
      });

      return {
        success: true,
        sessionId: sessionData.sessionId,
        checkoutUrl: sessionData.url,
        customerId: sessionData.customerId,
        requiresRedirect: true,
      };
    } catch (error) {
      console.error('Error processing Stripe payment:', error);
      
      // Create error context
      const errorContext: ErrorContext = {
        userId: user?.id,
        sessionId: undefined,
        amount: calculateOrderTotals(cartItems).totalWithVAT,
        currency: 'EUR',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Handle error with comprehensive error system
      const errorDetails = errorHandler.display(error, errorContext, {
        showToast: true,
        includeErrorCode: true
      });

      // Track analytics
      await paymentAnalytics.track('payment_failed', {
        userId: user?.id,
        amount: errorContext.amount,
        currency: errorContext.currency,
        errorDetails,
        metadata: { stage: 'session_creation' }
      });

      // Create retry session if error is retryable
      if (errorDetails.retryable) {
        const retrySession = paymentRetry.createSession(error, errorContext);
        
        // Schedule auto-retry for appropriate errors
        if (errorHandler.shouldRetry(errorDetails, 1)) {
          paymentRetry.scheduleAutoRetry(retrySession.sessionId, async () => {
            return await processStripePayment(formData);
          });
        }
      }

      // Track cart abandonment for certain error types
      if (errorDetails.category === 'user_action_required' || 
          errorDetails.severity === 'high') {
        await cartRecovery.trackAbandonment(
          user?.id || '',
          errorContext.sessionId || `session_${Date.now()}`,
          cartItems,
          formData.billingInfo,
          errorDetails,
          {
            totalAmount: errorContext.amount || 0,
            currency: errorContext.currency || 'EUR',
            lastAttemptAt: errorContext.timestamp
          }
        );
      }

      return {
        success: false,
        error: errorDetails.userMessage,
        requiresRedirect: false,
      };
    }
  }, [cartItems, user]);

  // Handle return from Stripe checkout
  const handleStripeReturn = useCallback(async (sessionId: string): Promise<{ success: boolean; orderData?: any; sessionData?: any }> => {
    try {
      // Verify payment completion
      const { verifyPaymentCompletion } = await import('@/utils/stripeUtils');
      const paymentVerification = await verifyPaymentCompletion(sessionId);

      if (!paymentVerification.isCompleted) {
        setValidationErrors([{
          field: 'payment',
          message: 'Payment was not completed. Please try again.'
        }]);
        return { success: false };
      }

      // Retrieve pending order data from session storage
      const pendingOrderData = sessionStorage.getItem('pending_order_data');
      if (!pendingOrderData) {
        setValidationErrors([{
          field: 'general',
          message: 'Order data not found. Please start checkout again.'
        }]);
        return { success: false };
      }

      const orderData = JSON.parse(pendingOrderData);
      const { formData: storedFormData, cartItems: storedCartItems } = orderData;

      // Create order record with Stripe payment details
      const orderNumber = generateOrderNumber();
      const orderTotals = calculateOrderTotals(storedCartItems);

      // Build lookup map for O(1) access instead of O(n) find per cart item
      const formItemsLookup = new Map();
      if (storedFormData.cartItems) {
        storedFormData.cartItems.forEach((fi: any) => {
          formItemsLookup.set(fi.id, fi);
        });
      }

      const orderItems: OrderItem[] = storedCartItems.map((cartItem: any) => {
        const formItem = formItemsLookup.get(cartItem.id);
        
        // Log warning if domain is missing to surface data issues
        if (!cartItem.domain) {
          console.warn(`Cart item ${cartItem.id} is missing domain information`, cartItem);
        }
        
        return {
          id: cartItem.id,
          mediaOutletId: cartItem.mediaOutletId,
          domain: cartItem.domain ?? '',
          category: cartItem.category || 'General',
          price: cartItem.finalPrice || cartItem.price,
          quantity: cartItem.quantity || 1,
          contentOption: formItem?.contentOption || 'self-provided',
          niche: cartItem.nicheName,
          uploadedFiles: [],
          googleDocsLinks: [],
        };
      });

      const orderResult = await createOrder({
        orderNumber,
        publisherId: orderItems[0]?.mediaOutletId || orderItems[0]?.media_outlet_id || '',
        items: orderItems,
        billingInfo: storedFormData.billingInfo,
        contentPreferences: storedFormData.contentPreferences,
        notes: storedFormData.notes,
        paymentMethod: 'stripe',
        paymentId: paymentVerification.paymentIntentId,
        status: 'paid',
        subtotal: orderTotals.subtotal,
        vatAmount: orderTotals.vatAmount,
        totalAmount: orderTotals.total,
        // Stripe-specific fields
        stripeSessionId: sessionId,
        stripeCustomerId: paymentVerification.customerId,
        stripePaymentIntentId: paymentVerification.paymentIntentId,
        paymentMethodType: paymentVerification.paymentMethodType,
        paymentMethodLast4: paymentVerification.paymentMethodLast4,
      });

      if (!orderResult.success) {
        setValidationErrors([{
          field: 'general',
          message: orderResult.error || 'Failed to create order after successful payment. Please contact support.'
        }]);
        return { success: false };
      }

      // Clear cart and session storage
      await clearCart();
      sessionStorage.removeItem('stripe_session_id');
      sessionStorage.removeItem('pending_order_data');

      console.log('Order created successfully after Stripe payment:', {
        orderId: orderResult.orderId,
        orderNumber,
        paymentIntentId: paymentVerification.paymentIntentId,
      });

      return { 
        success: true, 
        orderData: {
          orderId: orderResult.orderId,
          orderNumber,
          amount: orderTotals.total,
          currency: 'EUR',
        },
        sessionData: paymentVerification
      };
    } catch (error) {
      console.error('Error handling Stripe return:', error);
      setValidationErrors([{
        field: 'general',
        message: 'Failed to process payment completion. Please contact support.'
      }]);
      return { success: false };
    }
  }, [createOrder, clearCart]);

  // State - initialize formData synchronously with cart items to avoid race condition
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('cart-review');
  const [formData, setFormData] = useState<CheckoutFormData>(() => ({
    cartItems: cartItems.map(item => ({
      id: item.id,
      quantity: item.quantity ?? 1,
      nicheId: undefined, // Will be set by user in step 1
      contentOption: 'self-provided' as const, // Default, will be set by user
    }))
  }));
  const [validationErrors, setValidationErrors] = useState<CheckoutValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Computed values
  const currentStepIndex = CHECKOUT_STEPS.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === CHECKOUT_STEPS.length - 1;
  const canGoNext = !isLastStep;
  const canGoBack = !isFirstStep;
  const progress = ((currentStepIndex + 1) / CHECKOUT_STEPS.length) * 100;
  const hasValidationErrors = validationErrors.length > 0;

  // Reset validation errors when step changes
  useEffect(() => {
    setValidationErrors([]);
  }, [currentStep]);

  // Update cart items in form data when cart changes (after initial load)
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      cartItems: cartItems.map(item => ({
        id: item.id,
        quantity: item.quantity ?? 1,
        nicheId: prev.cartItems?.find(fi => fi.id === item.id)?.nicheId, // Preserve existing nicheId
        contentOption: prev.cartItems?.find(fi => fi.id === item.id)?.contentOption || 'self-provided', // Preserve existing contentOption
      }))
    }));
  }, [cartItems]);

  // Actions
  const validateCurrentStep = useCallback((): CheckoutValidationError[] => {
    return CheckoutValidator.validateStep(currentStep, formData);
  }, [currentStep, formData]);

  const goToNextStep = useCallback(async (): Promise<boolean> => {
    if (!canGoNext) return false;

    setIsLoading(true);

    try {
      // Validate current step
      const errors = CheckoutValidator.validateStep(currentStep, formData);
      setValidationErrors(errors);

      if (errors.length > 0) {
        return false;
      }

      // Clear errors and proceed to next step
      setValidationErrors([]);
      const nextStep = CHECKOUT_STEPS[currentStepIndex + 1];
      setCurrentStep(nextStep);
      return true;
    } catch (error) {
      console.error('Error validating step:', error);
      setValidationErrors([{
        field: 'general',
        message: 'An error occurred while validating the form. Please try again.'
      }]);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [canGoNext, currentStep, formData, currentStepIndex]);

  const goToPreviousStep = useCallback(() => {
    if (!canGoBack) return;

    const prevStep = CHECKOUT_STEPS[currentStepIndex - 1];
    setCurrentStep(prevStep);
    setValidationErrors([]); // Clear errors when going back
  }, [canGoBack, currentStepIndex]);

  const goToStep = useCallback((step: CheckoutStep) => {
    const stepIndex = CHECKOUT_STEPS.indexOf(step);
    if (stepIndex >= 0 && stepIndex <= currentStepIndex) {
      setCurrentStep(step);
      setValidationErrors([]);
    }
  }, [currentStepIndex]);

  const updateFormData = useCallback((data: Partial<CheckoutFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
    // Clear validation errors for fields that were updated
    setValidationErrors([]);
  }, []);

  const submitCheckout = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setValidationErrors([{
        field: 'auth',
        message: 'You must be logged in to complete checkout.'
      }]);
      return false;
    }

    setIsSubmitting(true);

    try {
      // Final validation of all data
      const errors = CheckoutValidator.validateStep('confirmation', formData);
      if (errors.length > 0) {
        setValidationErrors(errors);
        return false;
      }

      // Validate Stripe configuration before processing payment
      const shouldUseMock = stripeConfig.shouldUseMockPayments();
      
      if (!shouldUseMock) {
        // If we're trying to use real Stripe, validate configuration
        const stripeValidation = validateStripeEnvironment();
        if (!stripeValidation.isValid) {
          setValidationErrors([
            {
              field: 'stripe_config',
              message: `Stripe configuration error: ${stripeValidation.errors.join(', ')}`
            },
            {
              field: 'general',
              message: `Stripe configuration error: ${stripeValidation.errors.join(', ')}`
            }
          ]);
          return false;
        }
      }
      
      console.log(`Processing payment with ${shouldUseMock ? 'mock' : 'Stripe'} processor...`);
      
      // Declare paymentResult at function scope
      let paymentResult: MockPaymentResult | any;
      
      // Select and instantiate appropriate payment processor
      if (shouldUseMock) {
        // Use mock payment processor for development/testing
        paymentResult = await MockPaymentProcessor.processPayment(formData, {
          simulateDelay: true, // Enable realistic delay simulation
          simulateFailure: false, // Set to true to test failure scenarios
        });

        if (!paymentResult.success) {
          setValidationErrors([{
            field: 'payment',
            message: paymentResult.error || 'Payment processing failed. Please try again.'
          }]);
          return false;
        }

        // Log successful mock payment for debugging
        console.log('Mock payment processed successfully:', {
          paymentId: paymentResult.paymentId,
          paymentMethod: formData.paymentMethod?.type,
          simulatedDelay: paymentResult.simulatedDelay,
        });
      } else {
        // Use real Stripe payment processing
        const stripeResult = await processStripePayment(formData);
        paymentResult = stripeResult;

        if (!stripeResult.success) {
          setValidationErrors([{
            field: 'payment',
            message: stripeResult.error || 'Payment processing failed. Please try again.'
          }]);
          return false;
        }

        // For Stripe payments, we need to redirect to checkout
        if (stripeResult.requiresRedirect && stripeResult.checkoutUrl) {
          console.log('Redirecting to Stripe checkout:', stripeResult.checkoutUrl);
          
          // Store session data for later verification
          if (stripeResult.sessionId) {
            sessionStorage.setItem('stripe_session_id', stripeResult.sessionId);
            sessionStorage.setItem('pending_order_data', JSON.stringify({
              formData,
              cartItems,
              timestamp: Date.now(),
            }));
          }

          // Redirect to Stripe checkout
          window.location.href = stripeResult.checkoutUrl;
          return true; // Return true as the redirect is successful
        }

        console.log('Stripe payment session created:', {
          sessionId: stripeResult.sessionId,
          customerId: stripeResult.customerId,
        });
      }

      // Create order record in database
      console.log('Creating order record...');
      const orderNumber = generateOrderNumber();

      // Prepare order items
      const orderItems: OrderItem[] = cartItems.map(cartItem => {
        const formItem = formData.cartItems?.find(fi => fi.id === cartItem.id);
        return {
          id: `${cartItem.id}_${Date.now()}`,
          cartItemId: cartItem.id,
          domain: cartItem.domain,
          category: cartItem.category,
          niche: cartItem.nicheId,
          price: cartItem.finalPrice || cartItem.price,
          quantity: formItem?.quantity || 1,
          contentOption: formItem?.contentOption || 'self-provided',
          nicheId: formItem?.nicheId,
          uploadedFiles: [], // Would be populated from uploaded files state
          googleDocsLinks: [], // Would be populated from uploaded links state
        };
      });

      // Calculate totals with country-specific VAT (with FP precision fixes)
      const rawSubtotal = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
      const subtotal = Math.round(rawSubtotal * 100) / 100; // Round to cents to avoid FP drift
      const billingCountry = formData.billingInfo?.address?.country;
      const taxId = formData.billingInfo?.taxId;
      const vatAmount = await calculateVATForCountry(subtotal, billingCountry, taxId);
      const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100; // Round final total to cents

      // Create order data
      const orderData = {
        orderNumber,
        userId: user.id,
        status: 'action_needed' as const,
        totalAmount,
        subtotal,
        vatAmount,
        currency: 'EUR',

        billingInfo: formData.billingInfo!,
        paymentMethod: {
          type: formData.paymentMethod?.type || 'stripe',
          poNumber: formData.paymentMethod?.poNumber,
          paymentId: paymentResult.paymentId,
        },

        items: orderItems,

        notes: `Payment processed via ${formData.paymentMethod?.type || 'stripe'}`,
      };

      // Create the order in database
      const createdOrder = await createOrder(orderData);

      if (!createdOrder) {
        setValidationErrors([{
          field: 'order_creation',
          message: 'Failed to create order record. Please contact support.'
        }]);
        return false;
      }

      console.log('Order created successfully:', createdOrder.id);

      // Clear cart on successful checkout
      await clearCart();

      return true;
    } catch (error) {
      console.error('Checkout submission error:', error);
      setValidationErrors([{
        field: 'general',
        message: 'An error occurred during checkout. Please try again.'
      }]);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.id, formData, clearCart, cartItems, createOrder]);

  const resetCheckout = useCallback(() => {
    setCurrentStep('cart-review');
    setFormData(prev => ({
      cartItems: prev.cartItems && prev.cartItems.length > 0
        ? prev.cartItems
        : cartItems.map(item => ({ id: item.id, quantity: item.quantity ?? 1, contentOption: 'self-provided' as const })),
    }));
    setValidationErrors([]);
    setIsLoading(false);
    setIsSubmitting(false);
  }, [cartItems]);

  return {
    // State
    currentStep,
    formData,
    validationErrors,
    isLoading,
    isSubmitting,

    // Actions
    goToNextStep,
    goToPreviousStep,
    goToStep,
    updateFormData,
    submitCheckout,
    resetCheckout,

    // Stripe-specific actions
    processStripePayment,
    handleStripeReturn,

    // Validation
    validateCurrentStep,
    hasValidationErrors,

    // Computed values
    canGoNext,
    canGoBack,
    isFirstStep,
    isLastStep,
    currentStepIndex,
    progress,
  };
};
