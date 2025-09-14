import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, RefreshCw, ShoppingCart, ArrowLeft, Clock, AlertTriangle } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { stripeConfig } from '@/config/stripe';

export const CheckoutCancel: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cartItems } = useCart();
  
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Clean up any pending session data
    const cleanup = async () => {
      setIsCleaningUp(true);
      
      try {
        // Clean up session storage
        if (sessionId) {
          sessionStorage.removeItem('stripe_session_id');
          sessionStorage.removeItem('pending_order_data');
        }

        // Wait a moment to show the cleanup state
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error during cleanup:', error);
      } finally {
        setIsCleaningUp(false);
      }
    };

    cleanup();
  }, [sessionId]);

  const handleRetryCheckout = () => {
    navigate('/checkout');
  };

  const handleBackToCart = () => {
    navigate('/cart');
  };

  const handleBackToMarketplace = () => {
    navigate('/marketplace');
  };

  if (isCleaningUp) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <RefreshCw className="h-12 w-12 animate-spin text-orange-600" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Cleaning up session...</h3>
                <p className="text-muted-foreground">
                  Please wait while we restore your cart.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <XCircle className="h-6 w-6" />
            Checkout Cancelled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-lg">No worries!</p>
            <p className="text-muted-foreground">
              Your payment was cancelled and no charges were made. Your cart items are still saved and ready when you're ready to continue.
            </p>
          </div>

          {sessionId && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-medium text-orange-800">Session Information</h4>
                  <p className="text-sm text-orange-700">
                    Session ID: <code className="text-xs bg-orange-100 px-1 rounded">{sessionId}</code>
                  </p>
                  <p className="text-xs text-orange-600">
                    This session has been cancelled and cleaned up.
                  </p>
                </div>
              </div>
            </div>
          )}

          {stripeConfig.isTestMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-medium text-blue-800">Test Mode</h4>
                  <p className="text-sm text-blue-700">
                    This was a test checkout session. No real payment would have been processed.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-medium">What would you like to do next?</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                <p>Continue shopping and add more items</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                <p>Review your cart and try checking out again</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                <p>Contact support if you experienced any issues</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {cartItems.length > 0 ? (
              <>
                <Button onClick={handleRetryCheckout} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Checkout Again ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})
                </Button>
                <Button onClick={handleBackToCart} variant="outline" className="w-full">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Review Cart
                </Button>
              </>
            ) : (
              <Button onClick={handleBackToMarketplace} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Marketplace
              </Button>
            )}
            
            <Button onClick={handleBackToMarketplace} variant="ghost" className="w-full">
              Continue Shopping
            </Button>
          </div>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Need help? <button className="text-primary hover:underline">Contact Support</button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
