import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, X, Globe, AlertTriangle, Clock } from "lucide-react";
import { Order } from "@/hooks/useOrders";
import { OrderStatusBadge } from "./OrderStatusBadge";

interface PublisherOrderActionsProps {
  order: Order;
  onStatusUpdate: (orderId: string, status: string, publicationUrl?: string) => Promise<void>;
}

export const PublisherOrderActions = ({ order, onStatusUpdate }: PublisherOrderActionsProps) => {
  const [publicationUrl, setPublicationUrl] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(order.id, newStatus, publicationUrl || undefined);
      setPublicationUrl('');
      setRejectionReason('');
    } finally {
      setIsUpdating(false);
    }
  };

  const canAccept = order.status === 'requested';
  const canMarkReceived = order.status === 'accepted' && order.briefing && order.anchor && order.target_url;
  const canPublish = order.status === 'content_received';
  const canVerify = order.status === 'published';

  const getEstimatedDelivery = () => {
    if (!order.media_outlets) return null;
    const leadTime = 7; // Default lead time, could come from media outlet
    const orderDate = new Date(order.created_at);
    const deliveryDate = new Date(orderDate.getTime() + leadTime * 24 * 60 * 60 * 1000);
    return deliveryDate.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Publisher Actions</span>
          <OrderStatusBadge status={order.status} showIcon />
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Order Summary */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Order Value:</span>
            <span className="text-lg font-semibold">€{order.price} {order.currency}</span>
          </div>
          
          {getEstimatedDelivery() && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Est. Delivery:</span>
              <span className="text-sm text-muted-foreground">{getEstimatedDelivery()}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Content Requirements Check */}
        {order.status === 'accepted' && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Content Requirements Status:</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {order.briefing ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-600" />
                )}
                <span className="text-sm">Briefing {order.briefing ? 'provided' : 'pending'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {order.anchor ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-600" />
                )}
                <span className="text-sm">Anchor text {order.anchor ? 'provided' : 'pending'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {order.target_url ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-600" />
                )}
                <span className="text-sm">Target URL {order.target_url ? 'provided' : 'pending'}</span>
              </div>
            </div>
            
            {!canMarkReceived && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700">
                  Waiting for buyer to provide all content requirements
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {canAccept && (
            <div className="flex gap-2">
              <Button 
                onClick={() => handleStatusUpdate('accepted')} 
                disabled={isUpdating}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Order
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleStatusUpdate('rejected')} 
                disabled={isUpdating}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </div>
          )}

          {canMarkReceived && (
            <Button 
              onClick={() => handleStatusUpdate('content_received')} 
              disabled={isUpdating}
              className="w-full"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Content Received
            </Button>
          )}

          {canPublish && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="publication-url">Publication URL *</Label>
                <Input
                  id="publication-url"
                  placeholder="https://yourdomain.com/published-article"
                  value={publicationUrl}
                  onChange={(e) => setPublicationUrl(e.target.value)}
                  className="mt-2"
                />
              </div>
              <Button 
                onClick={() => handleStatusUpdate('published')} 
                disabled={isUpdating || !publicationUrl}
                className="w-full"
              >
                <Globe className="h-4 w-4 mr-2" />
                Mark as Published
              </Button>
            </div>
          )}

          {canVerify && (
            <Button 
              onClick={() => handleStatusUpdate('verified')} 
              disabled={isUpdating}
              variant="outline"
              className="w-full"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Verify Publication
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};