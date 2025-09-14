import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  Download, 
  Mail, 
  Calendar,
  CreditCard,
  MapPin,
  Package,
  ExternalLink,
  Share2,
  Copy,
  Loader2,
  AlertTriangle,
  FileText,
  Receipt
} from 'lucide-react';
import { receiptManager, ReceiptData } from '@/utils/receiptManager';
import { emailNotifications } from '@/utils/emailNotifications';
import { toast } from '@/hooks/use-toast';

interface OrderConfirmationPageProps {
  orderId?: string;
}

export const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({
  orderId: propOrderId
}) => {
  const { orderId: paramOrderId } = useParams();
  const navigate = useNavigate();
  
  const orderId = propOrderId || paramOrderId;
  
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSendingReceipt, setIsSendingReceipt] = useState(false);
  const [receiptSent, setReceiptSent] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError('Order ID not provided');
      setIsLoading(false);
      return;
    }

    loadReceiptData();
  }, [orderId]);

  const loadReceiptData = async () => {
    if (!orderId) return;

    try {
      setIsLoading(true);
      const result = await receiptManager.get(orderId);
      
      if (result.success && result.receiptData) {
        setReceiptData(result.receiptData);
      } else {
        setError(result.error || 'Failed to load order data');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading receipt data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReceipt = async () => {
    if (!orderId) return;

    setIsSendingReceipt(true);
    try {
      const result = await emailNotifications.sendCustomReceipt(orderId);
      
      if (result.success) {
        setReceiptSent(true);
        toast({
          title: "Receipt Sent!",
          description: `A detailed receipt has been sent to ${receiptData?.customerEmail}`,
          duration: 5000,
        });
      } else {
        toast({
          title: "Failed to Send Receipt",
          description: result.error || "Please try again later",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send receipt",
        variant: "destructive",
      });
    } finally {
      setIsSendingReceipt(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!receiptData) return;

    try {
      const html = receiptManager.generateHTML(receiptData);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${receiptData.orderNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Receipt Downloaded",
        description: "Receipt has been saved to your downloads",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download receipt",
        variant: "destructive",
      });
    }
  };

  const handleCopyOrderNumber = () => {
    if (receiptData) {
      navigator.clipboard.writeText(receiptData.orderNumber);
      toast({
        title: "Copied!",
        description: "Order number copied to clipboard",
      });
    }
  };

  const handleShare = async () => {
    if (!receiptData) return;

    const shareData = {
      title: `Order ${receiptData.orderNumber} Confirmation`,
      text: `My order ${receiptData.orderNumber} has been confirmed!`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Fallback to copy URL
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Order confirmation link copied to clipboard",
        });
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Order confirmation link copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading order confirmation...</span>
        </div>
      </div>
    );
  }

  if (error || !receiptData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Order Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button 
              onClick={() => navigate('/orders')} 
              className="w-full"
            >
              View All Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-green-800 mb-2">Order Confirmed!</h1>
          <p className="text-xl text-gray-600 mb-4">
            Thank you for your order. Your payment has been processed successfully.
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-gray-500">Order Number:</span>
            <span className="font-bold text-lg">{receiptData.orderNumber}</span>
            <Button
              onClick={handleCopyOrderNumber}
              variant="ghost"
              size="sm"
              className="p-1 h-auto"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Button
            onClick={handleDownloadReceipt}
            variant="default"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Receipt
          </Button>
          
          <Button
            onClick={handleSendReceipt}
            disabled={isSendingReceipt || receiptSent}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isSendingReceipt ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : receiptSent ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Receipt Sent
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Email Receipt
              </>
            )}
          </Button>

          {receiptData.paymentDetails.stripeReceiptUrl && (
            <Button
              onClick={() => window.open(receiptData.paymentDetails.stripeReceiptUrl, '_blank')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Stripe Receipt
            </Button>
          )}

          <Button
            onClick={handleShare}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {receiptData.orderItems.map((item, index) => (
                  <div key={index} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.description}</h3>
                      {item.metadata?.niche && (
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Niche:</strong> {item.metadata.niche}
                        </p>
                      )}
                      {item.metadata?.targetUrl && (
                        <p className="text-sm text-gray-600">
                          <strong>Target URL:</strong> {item.metadata.targetUrl}
                        </p>
                      )}
                      {item.metadata?.guidelines && (
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Guidelines:</strong> {item.metadata.guidelines}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-2">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {receiptManager.formatCurrency(item.totalPrice, receiptData.totals.currency)}
                      </p>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{receiptManager.formatCurrency(receiptData.totals.subtotal, receiptData.totals.currency)}</span>
                  </div>
                  {receiptData.totals.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>{receiptManager.formatCurrency(receiptData.totals.tax, receiptData.totals.currency)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Paid:</span>
                    <span>{receiptManager.formatCurrency(receiptData.totals.total, receiptData.totals.currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Order Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium">Order Placed & Payment Confirmed</p>
                      <p className="text-sm text-gray-500">
                        {receiptManager.formatDate(receiptData.orderDate)}
                      </p>
                    </div>
                    <Badge variant="default">Complete</Badge>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium">Publisher Review</p>
                      <p className="text-sm text-gray-500">
                        Within 24 hours
                      </p>
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium">Content Creation</p>
                      <p className="text-sm text-gray-500">
                        2-5 business days
                      </p>
                    </div>
                    <Badge variant="outline">Upcoming</Badge>
                  </div>
                  
                  {receiptData.estimatedDelivery && (
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium">Publication</p>
                        <p className="text-sm text-gray-500">
                          Expected: {receiptManager.formatDate(receiptData.estimatedDelivery)}
                        </p>
                      </div>
                      <Badge variant="outline">Upcoming</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment & Contact Info */}
          <div className="space-y-6">
            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="font-medium">
                    {receiptData.paymentDetails.paymentMethod.charAt(0).toUpperCase() + receiptData.paymentDetails.paymentMethod.slice(1)}
                    {receiptData.paymentDetails.paymentMethodLast4 && ` •••• ${receiptData.paymentDetails.paymentMethodLast4}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Paid
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {receiptManager.formatDate(receiptData.paymentDetails.paymentDate)}
                  </span>
                </div>
                {receiptData.paymentDetails.paymentIntentId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment ID:</span>
                    <span className="font-mono text-xs">
                      {receiptData.paymentDetails.paymentIntentId.slice(0, 16)}...
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing Address */}
            {receiptData.billingAddress && receiptData.billingAddress.street && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    {receiptData.customerName && <p className="font-medium">{receiptData.customerName}</p>}
                    {receiptData.billingAddress.company && <p>{receiptData.billingAddress.company}</p>}
                    <p>{receiptData.billingAddress.street}</p>
                    <p>{receiptData.billingAddress.city} {receiptData.billingAddress.postalCode}</p>
                    <p>{receiptData.billingAddress.country}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => navigate('/orders')}
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View All Orders
                </Button>
                
                <Button 
                  onClick={() => navigate('/marketplace')}
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Continue Shopping
                </Button>
                
                <Button 
                  onClick={() => navigate('/support')}
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>

            {/* Support Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-blue-900">Need Help?</h3>
                  <p className="text-sm text-blue-700">
                    Our support team is here to help with any questions about your order.
                  </p>
                  <p className="text-sm text-blue-600">
                    <strong>Email:</strong> support@moodymedia.com<br />
                    <strong>Reference:</strong> {receiptData.orderNumber}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
