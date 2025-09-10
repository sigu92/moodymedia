import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, ArrowRight, FileText, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface OrderContent {
  orderId: string;
  domain: string;
  price: number;
  briefing: string;
  anchor: string;
  targetUrl: string;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [incompleteOrders, setIncompleteOrders] = useState<any[]>([]);
  const [contentSubmissionOpen, setContentSubmissionOpen] = useState(false);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [orderContents, setOrderContents] = useState<OrderContent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const { user } = useAuth();

  const sessionId = searchParams.get("session_id");
  const isMock = searchParams.get('mock') === 'true';

  useEffect(() => {
    verifyPaymentAndLoadOrders();
  }, [sessionId, user]);

  const verifyPaymentAndLoadOrders = async () => {
    if (!sessionId) {
      setVerifying(false);
      setLoading(false);
      return;
    }

    try {
      // Verify payment first
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId },
      });

      if (error) {
        console.error('Payment verification error:', error);
        toast.error("Could not verify payment. Please contact support if you were charged.");
        setVerifying(false);
        setLoading(false);
        return;
      }

      setPaymentData(data);
      setVerifying(false);

      if (data.success && user) {
        // Load recent orders after successful payment
        await loadOrdersFromPayment();
        
        if (data.mock) {
          toast.success(`${data.orders} demo order(s) created successfully.`);
        } else {
          toast.success(`${data.orders} order(s) created successfully.`);
        }
      }
    } catch (error) {
      console.error('Payment verification failed:', error);
      setVerifying(false);
      setLoading(false);
    }
  };

  const loadOrdersFromPayment = async () => {
    if (!user) return;

    try {
      // Fetch orders created in the last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const { data: recentOrders, error } = await supabase
        .from('orders')
        .select(`
          *,
          media_outlets (domain, category)
        `)
        .eq('buyer_id', user.id)
        .eq('status', 'requested')
        .gte('created_at', tenMinutesAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(recentOrders || []);

      // Find orders that need content submission
      const needingContent = (recentOrders || []).filter(order => 
        !order.briefing || !order.anchor || !order.target_url
      );

      setIncompleteOrders(needingContent);

      // Initialize content forms
      setOrderContents(needingContent.map(order => ({
        orderId: order.id,
        domain: order.media_outlets?.domain || '',
        price: order.price,
        briefing: order.briefing || '',
        anchor: order.anchor || '',
        targetUrl: order.target_url || ''
      })));

      // Show content submission dialog if there are incomplete orders
      if (needingContent.length > 0) {
        setTimeout(() => setContentSubmissionOpen(true), 1000); // Small delay for better UX
      }

    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderContent = (field: keyof OrderContent, value: string) => {
    setOrderContents(prev => prev.map((content, index) => 
      index === currentOrderIndex 
        ? { ...content, [field]: value }
        : content
    ));
  };

  const submitOrderContent = async () => {
    const currentContent = orderContents[currentOrderIndex];
    
    if (!currentContent.briefing || !currentContent.anchor || !currentContent.targetUrl) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Basic URL validation
    try {
      new URL(currentContent.targetUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          briefing: currentContent.briefing,
          anchor: currentContent.anchor,
          target_url: currentContent.targetUrl
        })
        .eq('id', currentContent.orderId);

      if (error) throw error;

      toast.success('Content details saved successfully');

      // Move to next order or close dialog
      if (currentOrderIndex < orderContents.length - 1) {
        setCurrentOrderIndex(prev => prev + 1);
      } else {
        setContentSubmissionOpen(false);
        toast.success('All orders are ready for processing!');
      }

    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to save content details');
    } finally {
      setSubmitting(false);
    }
  };

  const skipCurrentOrder = () => {
    if (currentOrderIndex < orderContents.length - 1) {
      setCurrentOrderIndex(prev => prev + 1);
    } else {
      setContentSubmissionOpen(false);
    }
  };

  const currentContent = orderContents[currentOrderIndex];
  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, order) => sum + Number(order.price), 0);

  if (verifying) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <h3 className="text-lg font-medium mb-2">Verifying Payment</h3>
                <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (!paymentData?.success) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-xl font-medium mb-2">Payment Status Unknown</h3>
                <p className="text-muted-foreground mb-6 text-center">
                  We couldn't verify your payment status. If you were charged, please contact support.
                </p>
                
                <div className="flex gap-4">
                  <Button asChild>
                    <Link to="/orders">Check Orders</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/cart">Return to Cart</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12">
        {/* Success Message */}
        <div className="max-w-2xl mx-auto text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {paymentData.mock ? "Mock Payment Successful!" : "Payment Successful!"}
          </h1>
          <p className="text-muted-foreground">
            {paymentData.mock 
              ? "Your demo orders have been created for testing the workflow."
              : "Thank you for your purchase. Your orders have been created and sent to publishers."
            }
          </p>
        </div>

        {/* Order Summary */}
        <Card className="glass-card max-w-2xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Orders:</span>
              <span>{totalOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Amount:</span>
              <span className="font-semibold">€{totalAmount.toFixed(2)}</span>
            </div>
            
            {orders.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Orders Created:</h4>
                <div className="space-y-2">
                  {orders.map((order) => (
                    <div key={order.id} className="flex justify-between items-center text-sm">
                      <span>{order.media_outlets?.domain}</span>
                      <span>€{order.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {incompleteOrders.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-800">Content Submission Required</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      {incompleteOrders.length} order(s) need content details (briefing, anchor text, target URL) 
                      to begin processing.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-100"
                      onClick={() => setContentSubmissionOpen(true)}
                    >
                      Add Content Details
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="glass-card-light max-w-2xl mx-auto mb-8">
          <CardHeader>
            <CardTitle>What Happens Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">1</span>
              </div>
              <div>
                <h4 className="font-medium">Publishers Review Your Orders</h4>
                <p className="text-sm text-muted-foreground">
                  Publishers will review your content requirements and accept your orders.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">2</span>
              </div>
              <div>
                <h4 className="font-medium">Content Creation</h4>
                <p className="text-sm text-muted-foreground">
                  Publishers create high-quality content according to your briefing.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">3</span>
              </div>
              <div>
                <h4 className="font-medium">Publication & Verification</h4>
                <p className="text-sm text-muted-foreground">
                  Content is published with your link and you'll receive the publication URL.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button asChild variant="outline">
            <Link to="/orders">
              <FileText className="h-4 w-4 mr-2" />
              View Orders
            </Link>
          </Button>
          <Button asChild>
            <Link to="/marketplace">
              Continue Shopping
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Content Submission Dialog */}
        <Dialog open={contentSubmissionOpen} onOpenChange={setContentSubmissionOpen}>
          <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Add Content Details
                {orderContents.length > 1 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({currentOrderIndex + 1} of {orderContents.length})
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            {currentContent && (
              <div className="space-y-6">
                {/* Order Info */}
                <div className="bg-primary/5 rounded-lg p-4">
                  <h3 className="font-medium text-sm text-muted-foreground mb-1">Publishing on:</h3>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{currentContent.domain}</span>
                    <span className="text-sm font-medium">€{currentContent.price}</span>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="briefing">Content Briefing *</Label>
                    <Textarea
                      id="briefing"
                      placeholder="Describe the content you want published. Include topic, key points, tone, and any specific requirements..."
                      value={currentContent.briefing}
                      onChange={(e) => updateOrderContent('briefing', e.target.value)}
                      className="mt-1 min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Be specific about your content requirements, target audience, and any guidelines.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="anchor">Anchor Text *</Label>
                    <Input
                      id="anchor"
                      placeholder="Your clickable link text"
                      value={currentContent.anchor}
                      onChange={(e) => updateOrderContent('anchor', e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The text that will be clickable in the published article.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="targetUrl">Target URL *</Label>
                    <Input
                      id="targetUrl"
                      type="url"
                      placeholder="https://your-website.com/page"
                      value={currentContent.targetUrl}
                      onChange={(e) => updateOrderContent('targetUrl', e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The URL your anchor text will link to.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={skipCurrentOrder}>
                    Skip for Now
                  </Button>
                  <Button onClick={submitOrderContent} disabled={submitting}>
                    {submitting ? 'Saving...' : currentOrderIndex < orderContents.length - 1 ? 'Save & Next' : 'Save & Finish'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}