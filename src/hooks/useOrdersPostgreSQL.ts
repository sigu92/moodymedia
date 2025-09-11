import { useState, useEffect } from 'react';
import { orders } from '@/integrations/postgresql/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Order {
  id: string;
  buyer_id: string;
  publisher_id: string;
  media_outlet_id: string;
  status: 'requested' | 'accepted' | 'content_received' | 'published' | 'verified';
  price: number;
  currency: string;
  briefing?: string;
  anchor?: string;
  target_url?: string;
  publication_url?: string;
  publication_date?: string;
  created_at: string;
  updated_at: string;
  stripe_session_id?: string;
  media_outlets?: {
    domain: string;
    category: string;
    publisher_id: string;
  };
}

export const useOrders = () => {
  const [ordersList, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRole } = useAuth();

  const fetchOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const data = await orders.getByUserRole(user.id, userRole || 'buyer');
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status'], publicationUrl?: string) => {
    if (!user) return;

    try {
      const updatedOrder = await orders.updateStatus(orderId, status, publicationUrl);

      // Uppdatera lokal state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, ...updatedOrder }
            : order
        )
      );

      toast({
        title: "Order Updated",
        description: `Order status changed to ${status}`,
      });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
    }
  };

  const updateOrderContent = async (orderId: string, briefing: string, anchor: string, targetUrl: string) => {
    if (!user) return;

    try {
      const updatedOrder = await orders.updateContent(orderId, user.id, briefing, anchor, targetUrl);

      // Uppdatera lokal state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, ...updatedOrder }
            : order
        )
      );

      toast({
        title: "Content Updated",
        description: "Order content has been updated",
      });
    } catch (error) {
      console.error('Error updating order content:', error);
      toast({
        title: "Error",
        description: "Failed to update order content",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user, userRole]);

  return {
    orders: ordersList,
    loading,
    updateOrderStatus,
    updateOrderContent,
    refetch: fetchOrders
  };
};
