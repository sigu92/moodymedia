import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useSettingsStatus } from "@/hooks/useSettings";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Cart = () => {
  const { cartItems, loading, removeFromCart } = useCart();
  const { isComplete } = useSettingsStatus();
  const { user } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.finalPrice || item.price), 0);
  const vatRate = 0.25; // 25% VAT
  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;

  const handleCheckout = async () => {
    // Filter out read-only items (recovered from backup)
    const checkoutItems = cartItems.filter(item => !item.readOnly);

    if (checkoutItems.length === 0) {
      if (cartItems.length > 0) {
        toast({
          title: "Cannot Checkout",
          description: "All cart items are read-only. Please refresh the page to restore functionality.",
          variant: "destructive",
        });
      }
      return;
    }

    if (!isComplete) {
      toast({
        title: "Settings Required",
        description: "Please complete your organization settings before placing orders.",
        variant: "destructive",
      });
      return;
    }

    setCheckoutLoading(true);
    try {
      // Check if we're in development mode (no Stripe key configured)
      // In development, bypass Edge Function and create mock checkout directly
      const isDevelopment = !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
                           import.meta.env.DEV;

      if (isDevelopment) {
        // Development mode: Create mock orders directly in database
        await createMockCheckout(checkoutItems);
      } else {
        // Production mode: Use Edge Function
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { cartItems: checkoutItems },
        });

        if (error) {
          throw error;
        }

        if (data?.url) {
          if (data.mock) {
            // For mock checkout, show a message and redirect after a delay
            toast({
              title: "Mock Checkout Created",
              description: "Redirecting to mock payment success page...",
            });

            // Redirect to mock success page after 1 second
            setTimeout(() => {
              window.location.href = data.url;
            }, 1000);
          } else {
            // Open real Stripe checkout in a new tab
            window.open(data.url, '_blank');
          }
        } else {
          throw new Error('No checkout URL received');
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const createMockCheckout = async (checkoutItems: any[]) => {
    try {
      // Create orders directly in database for development
      const orders = checkoutItems.map(item => ({
        buyer_id: user?.id,
        media_outlet_id: item.mediaOutletId,
        status: "requested",
        price: item.finalPrice || item.price,
        currency: item.currency,
        stripe_session_id: `mock_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        niche_id: item.nicheId,
        base_price: item.basePrice || item.price,
        price_multiplier: item.priceMultiplier || 1.0,
        final_price: item.finalPrice || item.price
      }));

      const { error: insertError } = await supabase
        .from('orders')
        .insert(orders);

      if (insertError) throw insertError;

      // Store cart items in localStorage as backup (will be cleared after successful payment)
      localStorage.setItem(`cart_backup_${user?.id}`, JSON.stringify({
        cartItems,
        timestamp: Date.now(),
        sessionId: mockSessionId
      }));

      toast({
        title: "Mock Checkout Created",
        description: `${orders.length} order(s) created successfully. Complete payment to clear cart.`,
      });

      // Redirect to payment success page with mock data
      const mockSessionId = `mock_session_${Date.now()}`;
      setTimeout(() => {
        window.location.href = `/payment-success?session_id=${mockSessionId}&mock=true`;
      }, 1000);

    } catch (error) {
      console.error('Mock checkout error:', error);
      throw new Error('Failed to create mock orders');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Shopping Cart</h1>
          <p className="text-muted-foreground">Review your selected media outlets before checkout</p>
        </div>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-6">Browse our marketplace to find media outlets for your campaigns</p>
              <Button asChild>
                <Link to="/marketplace">Browse Marketplace</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Cart Items ({cartItems.filter(item => !item.readOnly).length}
                    {cartItems.some(item => item.readOnly) && ` + ${cartItems.filter(item => item.readOnly).length} read-only`})
                  </CardTitle>
                  <CardDescription>Selected media outlets for publication</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className={`flex items-center justify-between p-4 border rounded-lg ${item.readOnly ? 'bg-muted/50 border-muted' : ''}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{item.domain}</h3>
                          <Badge variant="outline">{item.category}</Badge>
                          {item.readOnly && (
                            <Badge variant="secondary" className="text-xs">
                              Read-only
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Publication opportunity</span>
                          {item.readOnly && (
                            <span className="text-orange-600">
                              • Recovered from backup - limited functionality
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">€{item.finalPrice || item.price}</p>
                          <p className="text-sm text-muted-foreground">{item.currency}</p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className={`text-destructive hover:text-destructive ${item.readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => removeFromCart(item.id)}
                          disabled={item.readOnly}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>€{subtotal}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>VAT (25%)</span>
                    <span>€{vatAmount.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>€{total.toFixed(2)}</span>
                  </div>
                  
                  <Button
                    className="w-full mt-6"
                    onClick={handleCheckout}
                    disabled={checkoutLoading || cartItems.filter(item => !item.readOnly).length === 0}
                  >
                    {checkoutLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Checkout...
                      </>
                    ) : cartItems.filter(item => !item.readOnly).length === 0 && cartItems.length > 0 ? (
                      <>
                        Restore Cart Functionality
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      <>
                        Proceed to Checkout ({cartItems.filter(item => !item.readOnly).length} items)
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                  
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/marketplace">Continue Shopping</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Need Help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>• All purchases are secured and encrypted</p>
                  <p>• You can track order progress in real-time</p>
                  <p>• Publishers typically respond within 24-48 hours</p>
                  <p>• Full refund if order is not accepted</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;