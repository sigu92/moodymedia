import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertCircle, CreditCard, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCheckout } from '@/hooks/useCheckout';
import { useAuth } from '@/contexts/AuthContext';
import { dualReceiptSystem } from '@/utils/dualReceiptSystem';
import { toast } from '@/hooks/use-toast';
import { stripeConfig } from '@/config/stripe';

export const CheckoutSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { handleStripeReturn } = useCheckout();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [orderDetails, setOrderDetails] = useState<{
    orderId?: string;
    orderNumber?: string;
    amount?: number;
    currency?: string;
  }>({});

  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setVerificationStatus('error');
        setErrorMessage('No session ID found. Please contact support if you completed a payment.');
        setIsVerifying(false);
        return;
      }

      if (!user) {
        setVerificationStatus('error');
        setErrorMessage('Please log in to view your order status.');
        setIsVerifying(false);
        return;
      }

      try {
        setIsVerifying(true);
        
        // Handle the Stripe return and create order
        const success = await handleStripeReturn(sessionId);
        
        if (success) {
          setVerificationStatus('success');
          setOrderDetails({
            orderId: orderId || 'Unknown',
            orderNumber: `ORD-${Date.now()}`, // This would come from the actual order creation
            amount: 0, // This would come from session verification
            currency: 'EUR',
          });
          
          toast({
            title: "Payment Successful!",
            description: "Your order has been confirmed and will be processed shortly.",
          });
        } else {
          setVerificationStatus('error');
          setErrorMessage('Payment verification failed. Please contact support.');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setVerificationStatus('error');
        setErrorMessage('An error occurred while verifying your payment. Please contact support.');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, orderId, user, handleStripeReturn]);

  const handleGoToOrders = () => {
    navigate('/orders');
  };

  const handleGoToMarketplace = () => {
    navigate('/marketplace');
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <CreditCard className="h-6 w-6 text-blue-600 absolute top-3 left-3" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Verifying Payment</h3>
                <p className="text-muted-foreground">
                  Please wait while we confirm your payment and create your order...
                </p>
                {stripeConfig.isTestMode && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    Test mode: This is a simulated payment verification
                  </p>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              Payment Verification Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {errorMessage}
            </p>
            
            <div className="space-y-2">
              <h4 className="font-medium">What to do next:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Check your email for payment confirmation from Stripe</li>
                <li>• Contact our support team with your session ID: <code className="text-xs bg-gray-100 px-1 rounded">{sessionId}</code></li>
                <li>• Do not attempt to pay again until verification is complete</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleGoToOrders} variant="outline">
                View My Orders
              </Button>
              <Button onClick={handleGoToMarketplace}>
                Back to Marketplace
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-lg">Thank you for your order!</p>
            <p className="text-muted-foreground">
              Your payment has been processed successfully and your order is being prepared.
            </p>
          </div>

          {orderDetails.orderId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Order Details</h4>
              <div className="space-y-1 text-sm text-green-700">
                <p><strong>Order ID:</strong> {orderDetails.orderId}</p>
                {orderDetails.orderNumber && (
                  <p><strong>Order Number:</strong> {orderDetails.orderNumber}</p>
                )}
                <p><strong>Payment Method:</strong> Stripe</p>
                <p><strong>Status:</strong> Confirmed</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-medium">What happens next?</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <p>You'll receive an email confirmation shortly</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <p>Our team will review your order and begin processing</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <p>You can track progress in your orders dashboard</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleGoToOrders} className="w-full">
              <ShoppingBag className="h-4 w-4 mr-2" />
              View My Orders
            </Button>
            <Button onClick={handleGoToMarketplace} variant="outline" className="w-full">
              Continue Shopping
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
