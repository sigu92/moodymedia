import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRoles } = useAuth();

  const fetchOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          media_outlets!inner (
            domain,
            category,
            publisher_id
          )
        `);

      // Filter based on user roles
      if (userRoles?.includes('admin') || userRoles?.includes('system_admin')) {
        // Admins can see all orders
      } else if (userRoles?.includes('publisher')) {
        // Publishers see orders for their media outlets
        query = query.eq('publisher_id', user.id);
      } else {
        // Buyers see their own orders
        query = query.eq('buyer_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setOrders(data || []);
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
      const updateData: any = { status };
      
      if (publicationUrl) {
        updateData.publication_url = publicationUrl;
      }
      
      if (status === 'published') {
        updateData.publication_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status, publication_url: publicationUrl, publication_date: updateData.publication_date }
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
      const { error } = await supabase
        .from('orders')
        .update({
          briefing,
          anchor,
          target_url: targetUrl,
        })
        .eq('id', orderId)
        .eq('buyer_id', user.id); // Only buyers can update content

      if (error) throw error;

      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, briefing, anchor, target_url: targetUrl }
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
  }, [user, userRoles]);

  return {
    orders,
    loading,
    updateOrderStatus,
    updateOrderContent,
    refetch: fetchOrders
  };
};