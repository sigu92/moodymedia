import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  Clock, 
  CreditCard, 
  CheckCircle, 
  Gift,
  RefreshCw,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { cartRecovery, AbandonedCart } from '@/utils/cartRecovery';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const CheckoutRecover: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setCartItems } = useCart();
  const { user } = useAuth();
  
  const [cart, setCart] = useState<AbandonedCart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid recovery link');
      setIsLoading(false);
      return;
    }

    // Recover cart from token
    const result = cartRecovery.recoverFromToken(token);
    if (!result.success) {
      setError(result.error || 'Failed to recover cart');
      setIsLoading(false);
      return;
    }

    setCart(result.cart!);
    setIsLoading(false);
  }, [searchParams]);

  const handleRecoverCart = async () => {
    if (!cart || !user) return;

    // Check if user matches cart owner
    if (cart.userId !== user.id) {
      toast({
        title: "Access Denied",
        description: "This cart belongs to a different user. Please log in with the correct account.",
        variant: "destructive",
      });
      return;
    }

    setIsRecovering(true);

    try {
      // Restore cart items
      await setCartItems(cart.cartItems);

      // Mark cart as recovered
      cartRecovery.markRecovered(cart.id);

      toast({
        title: "Cart Recovered!",
        description: "Your items have been restored. Complete your checkout now.",
        duration: 5000,
      });

      // Navigate to checkout
      navigate('/checkout');

    } catch (error) {
      console.error('Failed to recover cart:', error);
      toast({
        title: "Recovery Failed",
        description: "Failed to restore your cart. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRecovering(false);
    }
  };

  const formatPrice = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const calculateTimeSinceAbandonment = (): string => {
    if (!cart) return '';
    
    const now = new Date();
    const abandoned = new Date(cart.abandonedAt);
    const diffInMinutes = Math.floor((now.getTime() - abandoned.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Recovering your cart...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Recovery Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button 
              onClick={() => navigate('/checkout')} 
              className="w-full"
            >
              Start New Order
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Cart Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This cart recovery link is invalid or has expired.
            </p>
            <Button 
              onClick={() => navigate('/marketplace')} 
              className="w-full"
            >
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome Back!</h1>
          <p className="text-lg text-muted-foreground">
            Your cart is exactly as you left it
          </p>
        </div>

        {/* Cart Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Cart Recovery
              </CardTitle>
              <Badge variant="outline">
                Abandoned {calculateTimeSinceAbandonment()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.failureReason && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Previous issue:</strong> {cart.failureReason}
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  This issue may have been resolved. Try completing your order again.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cart Total:</span>
              <span className="font-semibold text-lg">
                {formatPrice(cart.totalAmount, cart.currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Cart Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cart.cartItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">Media Placement</p>
                    <p className="text-sm text-muted-foreground">
                      Outlet ID: {item.media_outlet_id.slice(0, 8)}...
                    </p>
                    {item.niche_id && (
                      <p className="text-xs text-muted-foreground">
                        Niche: {item.niche_id.slice(0, 8)}...
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatPrice(item.price, item.currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <span className="font-medium">Total:</span>
              <span className="font-bold text-lg">
                {formatPrice(cart.totalAmount, cart.currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Incentive Offer */}
        {cart.recoveryAttempts > 0 && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Gift className="h-5 w-5" />
                Special Offer for You!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-green-700">
                  Complete your order now and get <strong>10% off</strong> your total purchase!
                </p>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Offer expires in 24 hours</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing Information Preview */}
        {cart.billingInfo && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {cart.billingInfo.firstName && (
                  <div>
                    <span className="font-medium">Name:</span> {cart.billingInfo.firstName} {cart.billingInfo.lastName}
                  </div>
                )}
                {cart.billingInfo.email && (
                  <div>
                    <span className="font-medium">Email:</span> {cart.billingInfo.email}
                  </div>
                )}
                {cart.billingInfo.company && (
                  <div>
                    <span className="font-medium">Company:</span> {cart.billingInfo.company}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={handleRecoverCart}
            disabled={isRecovering}
            size="lg"
            className="w-full"
          >
            {isRecovering ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Recovering Cart...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                Complete My Order
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>

          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/marketplace')}
              variant="outline"
              className="flex-1"
            >
              Continue Shopping
            </Button>
            <Button
              onClick={() => navigate('/checkout')}
              variant="outline"
              className="flex-1"
            >
              Start Fresh
            </Button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Secure Recovery</p>
              <p className="text-blue-700 mt-1">
                Your cart data is encrypted and securely stored. This recovery link is unique and expires after 7 days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
