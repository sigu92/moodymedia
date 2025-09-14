import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, FileText, CreditCard, Building, ExternalLink, AlertTriangle, Loader2, ShoppingCart, User, MapPin } from 'lucide-react';
import { useCheckout } from '@/hooks/useCheckout';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, calculateItemTotal, calculateSubtotal, calculateVAT, calculateTotal } from '@/utils/checkoutUtils';
import { toast } from '@/hooks/use-toast';
import { stripeConfig } from '@/config/stripe';

interface PaymentDetails {
  stripeReceiptUrl?: string;
  paymentIntentId?: string;
  paymentMethodType?: string;
  paymentMethodLast4?: string;
}

interface Step4OrderConfirmationProps {
  onValidationChange?: (isValid: boolean) => void;
  onOrderComplete?: (orderId: string) => void;
}

export const Step4OrderConfirmation: React.FC<Step4OrderConfirmationProps> = ({
  onValidationChange,
  onOrderComplete
}) => {
  const { user } = useAuth();
  const { cartItems } = useCart();
  const { formData, submitCheckout, validationErrors, isSubmitting } = useCheckout();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({});

  // Generate robust order ID once using crypto.randomUUID
  const [orderNumber] = useState<string>(() => {
    const uuid = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
      ? globalThis.crypto.randomUUID()
      : `mo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `MO-${uuid}`;
  });

  // Validation
  useEffect(() => {
    const isValid = acceptTerms && cartItems.length > 0;
    onValidationChange?.(isValid);
  }, [acceptTerms, cartItems, onValidationChange]);

  // Load payment details from session storage (if returning from Stripe)
  useEffect(() => {
    const loadPaymentDetails = () => {
      const sessionId = sessionStorage.getItem('stripe_session_id');
      const pendingOrderData = sessionStorage.getItem('pending_order_data');
      
      if (sessionId && pendingOrderData) {
        try {
          const orderData = JSON.parse(pendingOrderData);
          // In a real app, we would fetch the session details from Stripe
          // For now, we'll set mock data if in test mode
          if (stripeConfig.isTestMode || stripeConfig.shouldUseMockPayments()) {
            setPaymentDetails({
              paymentIntentId: `pi_test_${Date.now()}`,
              paymentMethodType: 'card',
              paymentMethodLast4: '4242',
              stripeReceiptUrl: `https://pay.stripe.com/receipts/test_${sessionId}`,
            });
          }
        } catch (error) {
          console.error('Error loading payment details:', error);
        }
      }
    };

    loadPaymentDetails();
  }, []);

  const handleOrderSubmit = async () => {
    if (!acceptTerms) {
      toast({
        title: "Terms Required",
        description: "Please accept the terms and conditions to proceed.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to complete your order.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingOrder(true);

    try {
      // Submit the order using the checkout hook
      const success = await submitCheckout();

      if (success) {
        toast({
          title: "Order Submitted Successfully",
          description: `Order ${orderNumber} has been placed successfully.`,
        });

        // Call the completion callback with the order number
        onOrderComplete?.(orderNumber);
      } else {
        toast({
          title: "Order Submission Failed",
          description: "There was an error processing your order. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Order submission error:', error);
      toast({
        title: "Order Submission Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const getCartItemById = (id: string) => {
    return cartItems.find(item => item.id === id);
  };

  const getFormItemById = (id: string) => {
    return formData.cartItems?.find(item => item.id === id);
  };

  const getItemTotal = (cartItemId: string) => {
    const cartItem = getCartItemById(cartItemId);
    const formItem = getFormItemById(cartItemId);

    if (!cartItem || !formItem) return 0;

    const nicheMultiplier = 1.0; // Could be enhanced with actual niche data
    return calculateItemTotal(
      cartItem.finalPrice || cartItem.price,
      formItem.quantity,
      formItem.contentOption,
      nicheMultiplier
    );
  };

  const calculateOrderTotals = () => {
    if (!cartItems.length || !formData.cartItems) return { subtotal: 0, vat: 0, total: 0 };

    const itemsWithPrices = cartItems.map(cartItem => {
      const formItem = getFormItemById(cartItem.id);
      return {
        price: cartItem.finalPrice || cartItem.price,
        quantity: formItem?.quantity || 1,
        contentOption: formItem?.contentOption || 'self-provided' as const,
        nicheMultiplier: 1.0, // Could be enhanced
      };
    });

    const subtotal = calculateSubtotal(itemsWithPrices);
    const vat = calculateVAT(subtotal);
    const total = calculateTotal(subtotal, vat);

    return { subtotal, vat, total };
  };

  const { subtotal, vat, total } = calculateOrderTotals();

  // Show loading state if still submitting
  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Processing Your Order</h3>
          <p className="text-muted-foreground">Please wait while we process your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Order Summary Header */}
      <div className="text-center">
        <h3 className="text-2xl font-semibold mb-2">Order Confirmation</h3>
        <p className="text-muted-foreground mb-4">
          Please review your order details below and confirm your purchase.
        </p>
        <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
          <span className="text-sm font-medium">Order Number:</span>
          <Badge variant="secondary" className="font-mono">{orderNumber}</Badge>
        </div>
      </div>

      {/* Cart Items Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Order Items ({cartItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cartItems.map((cartItem) => {
            const formItem = getFormItemById(cartItem.id);
            const itemTotal = getItemTotal(cartItem.id);

            return (
              <div key={cartItem.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-base">{cartItem.domain}</h4>
                      <p className="text-sm text-muted-foreground">
                        Category: {cartItem.category} • Niche: {cartItem.niche}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          DR: {cartItem.domainRating}
                        </Badge>
                        {cartItem.monthlyTraffic && (
                          <Badge variant="outline" className="text-xs">
                            Traffic: {cartItem.monthlyTraffic.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(itemTotal)}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {formItem?.quantity || 1}
                      </p>
                    </div>
                  </div>

                  {/* Item Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 pt-3 border-t">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">Content Option</Label>
                      <div className="flex items-center gap-2">
                        {formItem?.contentOption === 'professional' ? (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-sm">Professional Writing (+€25)</span>
                          </>
                        ) : (
                          <>
                            <FileText className="h-3 w-3 text-blue-600" />
                            <span className="text-sm">Self-Provided Content</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">Target Niche</Label>
                      <p className="text-sm">{formItem?.nicheId || 'Not specified'}</p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">Base Price</Label>
                      <p className="text-sm">{formatCurrency(cartItem.finalPrice || cartItem.price)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Billing Information Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Billing Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formData.billingInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Contact Information</Label>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm">{formData.billingInfo.firstName} {formData.billingInfo.lastName}</p>
                    {formData.billingInfo.company && (
                      <p className="text-sm text-muted-foreground">{formData.billingInfo.company}</p>
                    )}
                    <p className="text-sm">{formData.billingInfo.email}</p>
                    {formData.billingInfo.phone && (
                      <p className="text-sm">{formData.billingInfo.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Billing Address
                  </Label>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm">{formData.billingInfo.address.street}</p>
                    <p className="text-sm">
                      {formData.billingInfo.address.city}, {formData.billingInfo.address.postalCode}
                    </p>
                    <p className="text-sm">{formData.billingInfo.address.country}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <AlertCircle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Billing information not available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formData.paymentMethod ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {formData.paymentMethod.type === 'stripe' && (
                    <>
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <div>
                        <span className="font-medium">
                          {paymentDetails.paymentMethodType === 'card' ? 'Credit/Debit Card' : 'Stripe Payment'}
                        </span>
                        {paymentDetails.paymentMethodLast4 && (
                          <p className="text-sm text-muted-foreground">
                            •••• •••• •••• {paymentDetails.paymentMethodLast4}
                          </p>
                        )}
                        {stripeConfig.isTestMode && (
                          <Badge variant="secondary" className="text-xs ml-2">Test Mode</Badge>
                        )}
                      </div>
                    </>
                  )}
                  {formData.paymentMethod.type === 'paypal' && (
                    <>
                      <Building className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">PayPal</span>
                    </>
                  )}
                  {formData.paymentMethod.type === 'fortnox' && (
                    <>
                      <FileText className="h-5 w-5 text-green-600" />
                      <div>
                        <span className="font-medium">Invoice Payment</span>
                        {formData.paymentMethod.poNumber && (
                          <p className="text-sm text-muted-foreground">
                            PO Number: {formData.paymentMethod.poNumber}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <Badge variant="secondary">Ready</Badge>
              </div>

              {/* Stripe Payment Details */}
              {formData.paymentMethod.type === 'stripe' && (
                <div className="space-y-3">
                  {paymentDetails.paymentIntentId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">Payment Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Payment ID:</span>
                          <span className="font-mono text-blue-800">{paymentDetails.paymentIntentId}</span>
                        </div>
                        {paymentDetails.paymentMethodType && (
                          <div className="flex justify-between">
                            <span className="text-blue-700">Method:</span>
                            <span className="text-blue-800 capitalize">{paymentDetails.paymentMethodType}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {paymentDetails.stripeReceiptUrl && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-2">Receipt</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-700">
                          Your Stripe receipt is available for download
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newWindow = window.open(paymentDetails.stripeReceiptUrl, '_blank', 'noopener,noreferrer');
                            if (newWindow) newWindow.opener = null;
                          }}
                          className="text-green-700 border-green-300 hover:bg-green-100"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Receipt
                        </Button>
                      </div>
                    </div>
                  )}

                  {!stripeConfig.shouldUseMockPayments() && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-gray-800">Secure Payment Processed</p>
                          <p className="text-gray-600 mt-1">
                            Your payment has been securely processed by Stripe. 
                            You will receive an email confirmation shortly.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <AlertCircle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Payment method not selected</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Upload Status */}
      {cartItems.some(item => {
        const formItem = getFormItemById(item.id);
        return formItem?.contentOption === 'self-provided';
      }) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cartItems
                .filter(item => getFormItemById(item.id)?.contentOption === 'self-provided')
                .map((cartItem) => {
                  // Check for uploaded content - look for uploadedFiles or googleDocsLinks in formData
                  const formItem = getFormItemById(cartItem.id);
                  const hasContent = Boolean(
                    (formItem?.uploadedFiles && formItem.uploadedFiles.length > 0) ||
                    (formItem?.googleDocsLinks && formItem.googleDocsLinks.length > 0)
                  );
                  return (
                    <div key={cartItem.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {hasContent ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{cartItem.domain}</p>
                          <p className="text-xs text-muted-foreground">
                            {hasContent ? 'Content uploaded' : 'Content required'}
                          </p>
                        </div>
                      </div>
                      {hasContent && (
                        <Badge variant="secondary" className="text-xs">
                          Ready
                        </Badge>
                      )}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Total */}
      <Card>
        <CardHeader>
          <CardTitle>Order Total</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Subtotal ({cartItems.length} item{cartItems.length > 1 ? 's' : ''})</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>VAT (25%)</span>
            <span>{formatCurrency(vat)}</span>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>

          {formData.cartItems?.some(item => item.contentOption === 'professional') && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Professional Content Writing Included</p>
                  <p className="mt-1">
                    Expert writers will create high-quality content tailored to your selected niches
                    and publisher guidelines. Content will be delivered within 3-5 business days.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                  I accept the Terms and Conditions *
                </Label>
                <div className="mt-2 text-sm text-muted-foreground space-y-1">
                  <p>
                    By placing this order, I agree to the following:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>All content will be submitted according to publisher guidelines</li>
                    <li>Payment is due according to the selected payment method terms</li>
                    <li>Professional content writing will be delivered within 3-5 business days</li>
                    <li>I understand the refund policy and cancellation terms</li>
                    <li>I acknowledge that all information provided is accurate</li>
                  </ul>
                </div>
              </div>
            </div>

            {!acceptTerms && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-800">
                  Please accept the terms and conditions to proceed with your order.
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                {validationErrors.map((error, index) => (
                  <p key={index} className="text-sm text-destructive">
                    {error.message}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex justify-center pt-6">
        <Button
          onClick={handleOrderSubmit}
          disabled={!acceptTerms || isSubmittingOrder || cartItems.length === 0}
          size="lg"
          className="px-8"
        >
          {isSubmittingOrder ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing Order...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Place Order - {formatCurrency(total)}
            </>
          )}
        </Button>
      </div>

      {/* Order Notes */}
      <div className="text-center text-sm text-muted-foreground">
        <p>After placing your order, you will receive a confirmation email with order details.</p>
        <p className="mt-1">For questions, please contact our support team.</p>
      </div>
    </div>
  );
};
