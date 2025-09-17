import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { OrderItem } from '@/hooks/useOrders';

// Billing information interface
export interface BillingInfo {
  firstName: string;
  lastName: string;
  company?: string;
  email: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  taxId?: string;
}

// Payment method interface
export interface PaymentMethod {
  type: 'stripe' | 'paypal' | 'fortnox' | 'invoice';
  methodType?: 'card' | 'paypal' | 'bank_transfer';
  cardBrand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  poNumber?: string;
  paymentId?: string;
  tokenId?: string;
  billingAddress?: BillingInfo['address'];
  metadata?: Record<string, unknown>;
}

export interface Order {
  id: string;
  order_number?: string;
  buyer_id: string;
  status: 'requested' | 'accepted' | 'content_received' | 'published' | 'verified' | 'cancelled';
  total_amount?: number;
  subtotal?: number;
  vat_amount?: number;
  currency?: string;
  billing_info?: BillingInfo;
  payment_method?: PaymentMethod;
  order_items?: OrderItem[];
  stripe_customer_id?: string;
  stripe_session_id?: string;
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
  notes?: string;
  // Additional fields from the actual schema
  anchor?: string;
  base_price?: number;
  briefing?: string;
  final_price?: number;
  media_outlet_id?: string;
  niche_id?: string;
  price?: number;
  title?: string;
  description?: string;
  category?: string;
  domain?: string;
}

export interface OrderManagementStatus {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  loadOrders: () => Promise<void>;
  getOrder: (orderId: string) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<boolean>;
  cancelOrder: (orderId: string) => Promise<boolean>;
  getOrderBySessionId: (sessionId: string) => Promise<Order | null>;
}

export const useOrderManagement = (): OrderManagementStatus => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's orders
  const loadOrders = useCallback(async () => {
    if (!user?.id) {
      setOrders([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setOrders(data || []);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Get specific order by ID
  const getOrder = useCallback(async (orderId: string): Promise<Order | null> => {
    if (!user?.id) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('buyer_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      return data;
    } catch (err) {
      console.error('Error fetching order:', err);
      return null;
    }
  }, [user?.id]);

  // Get order by Stripe session ID
  const getOrderBySessionId = useCallback(async (sessionId: string): Promise<Order | null> => {
    if (!user?.id) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('stripe_session_id', sessionId)
        .eq('buyer_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      return data;
    } catch (err) {
      console.error('Error fetching order by session ID:', err);
      return null;
    }
  }, [user?.id]);

  // Update order status
  const updateOrderStatus = useCallback(async (orderId: string, status: 'requested' | 'accepted' | 'content_received' | 'published' | 'verified' | 'cancelled'): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('buyer_id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status, updated_at: new Date().toISOString() }
          : order
      ));

      toast({
        title: "Success",
        description: `Order status updated to ${status}`,
      });

      return true;
    } catch (err) {
      console.error('Error updating order status:', err);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
      return false;
    }
  }, [user?.id]);

  // Cancel order
  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('buyer_id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: 'cancelled', updated_at: new Date().toISOString() }
          : order
      ));

      toast({
        title: "Success",
        description: "Order cancelled successfully",
      });

      return true;
    } catch (err) {
      console.error('Error cancelling order:', err);
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive",
      });
      return false;
    }
  }, [user?.id]);

  // Load orders on mount
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return {
    orders,
    isLoading,
    error,
    loadOrders,
    getOrder,
    updateOrderStatus,
    cancelOrder,
    getOrderBySessionId,
  };
};
