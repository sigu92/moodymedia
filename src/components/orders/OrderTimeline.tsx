import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Package } from 'lucide-react';

interface OrderData {
  id?: string;
  orderNumber?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
}

interface OrderTimelineProps {
  orderId?: string;
  status?: string;
  orderData?: OrderData;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ orderId, status, orderData }) => {
  // Compute stable timestamps once using useMemo to prevent re-computation on every render
  const stableTimestamps = useMemo(() => {
    const baseDate = orderData?.createdAt || new Date();
    return {
      orderPlaced: baseDate.toLocaleDateString(),
      paymentProcessed: new Date(baseDate.getTime() + 1 * 60 * 60 * 1000).toLocaleDateString(), // 1 hour later
      contentReview: orderData?.updatedAt?.toLocaleDateString() || 'In Progress',
      published: orderData?.completedAt?.toLocaleDateString() || (status === 'completed' ? baseDate.toLocaleDateString() : 'Pending')
    };
  }, [orderData?.createdAt, orderData?.updatedAt, orderData?.completedAt, status]);

  const steps = [
    {
      id: 1,
      title: 'Order Placed',
      description: 'Your order has been received',
      status: 'completed',
      timestamp: stableTimestamps.orderPlaced,
    },
    {
      id: 2,
      title: 'Payment Processed',
      description: 'Payment has been confirmed',
      status: 'completed',
      timestamp: stableTimestamps.paymentProcessed,
    },
    {
      id: 3,
      title: 'Content Review',
      description: 'Publisher is reviewing your content',
      status: status === 'completed' ? 'completed' : 'in_progress',
      timestamp: status === 'completed' ? stableTimestamps.contentReview : 'In Progress',
    },
    {
      id: 4,
      title: 'Published',
      description: 'Your link has been published',
      status: status === 'completed' ? 'completed' : 'pending',
      timestamp: status === 'completed' ? stableTimestamps.published : 'Pending',
    },
  ];

  const getStatusIcon = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'pending':
        return <Package className="h-5 w-5 text-gray-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Order Timeline
        </CardTitle>
        <CardDescription>
          Track the progress of your order #{orderId}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className={`rounded-full p-2 ${
                  step.status === 'completed' ? 'bg-green-100' :
                  step.status === 'in_progress' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {getStatusIcon(step.status)}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-0.5 h-12 mt-2 ${
                    step.status === 'completed' ? 'bg-green-200' : 'bg-gray-200'
                  }`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{step.title}</h3>
                  {getStatusBadge(step.status)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {step.description}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {step.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
