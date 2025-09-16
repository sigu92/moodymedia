import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowLeft, Clock, FileText, ExternalLink, AlertCircle } from "lucide-react";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { useOrders } from "@/hooks/useOrders";
import { toast } from "@/hooks/use-toast";

interface OrderDetails {
  id: string;
  status: string;
  price: number;
  currency: string;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    url: string;
    price: number;
    status: string;
  }>;
}

export const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getOrderById, isLoading, error: apiError } = useOrders();

  useEffect(() => {
    const loadOrderDetails = async () => {
      if (!orderId) {
        setError('Order ID is required');
        setLoading(false);
        return;
      }

      try {
        // Fetch order details from the API
        const orderData = await getOrderById(orderId);

        if (!orderData) {
          setError('Order not found or you do not have permission to view this order');
          setLoading(false);
          return;
        }

        // Transform OrderData to OrderDetails interface
        const transformedOrder: OrderDetails = {
          id: orderData.id || orderId,
          status: orderData.status,
          price: orderData.totalAmount,
          currency: orderData.currency,
          createdAt: orderData.createdAt.toISOString(),
          items: orderData.items.map(item => ({
            id: item.id,
            name: `${item.domain} - ${item.category}`,
            url: `https://${item.domain}`,
            price: item.price * item.quantity,
            status: orderData.status === 'completed' ? 'published' : 'pending'
          }))
        };

        setOrder(transformedOrder);
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load order details';
        setError(errorMessage);
        console.error('Error loading order details:', error);

        // Show user-friendly error message
        toast({
          title: "Error Loading Order",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadOrderDetails();
  }, [orderId, getOrderById]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-4">
            {error ? 'Error Loading Order' : 'Order Not Found'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {error || "The order you're looking for doesn't exist or you don't have permission to view it."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link to="/orders">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground">
            Your order has been successfully processed and is now being fulfilled.
          </p>
        </div>

        {/* Order Summary */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                <CardDescription>
                  Placed on {new Date(order.createdAt).toLocaleDateString()}
                </CardDescription>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        View published link
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">€{item.price}</div>
                    <OrderStatusBadge status={item.status} />
                  </div>
                </div>
              ))}

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>€{order.price}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              What happens next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-0.5">1</Badge>
                <div>
                  <p className="font-medium">Content Review</p>
                  <p className="text-sm text-muted-foreground">
                    Our team will review your content to ensure it meets quality standards.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-0.5">2</Badge>
                <div>
                  <p className="font-medium">Publication</p>
                  <p className="text-sm text-muted-foreground">
                    Once approved, your content will be published on the target website.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-0.5">3</Badge>
                <div>
                  <p className="font-medium">Link Live</p>
                  <p className="text-sm text-muted-foreground">
                    You'll receive a notification when your backlink goes live.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link to="/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              View All Orders
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/marketplace">Browse More Links</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
