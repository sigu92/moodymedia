import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { CheckoutValidator, CheckoutFormData, CheckoutValidationError, calculateVATForCountry, getVATConfig } from '@/utils/checkoutUtils';
import { MockPaymentProcessor, MockPaymentResult } from '@/utils/mockPaymentProcessor';
import { stripeConfig, validateStripeEnvironment } from '@/config/stripe';
import { useOrders, OrderItem } from '@/hooks/useOrders';
import { generateOrderNumber } from '@/hooks/useOrders';

export type CheckoutStep = 'cart-review' | 'billing-payment' | 'content-upload' | 'confirmation';

const CHECKOUT_STEPS: CheckoutStep[] = ['cart-review', 'billing-payment', 'content-upload', 'confirmation'];

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
          setValidationErrors([{
            field: 'stripe_config',
            message: `Stripe configuration error: ${stripeValidation.errors.join(', ')}`
          }]);
          return false;
        }
      }
      
      console.log(`Processing payment with ${shouldUseMock ? 'mock' : 'Stripe'} processor...`);
      
      const paymentResult: MockPaymentResult = await MockPaymentProcessor.processPayment(formData, {
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

      // Log successful payment for debugging
      console.log('Payment processed successfully:', {
        paymentId: paymentResult.paymentId,
        paymentMethod: formData.paymentMethod?.type,
        simulatedDelay: paymentResult.simulatedDelay,
      });

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
