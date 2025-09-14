import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Database row type for order_items
interface OrderItemRow {
  id: string;
  order_id: string;
  cart_item_id: string | null;
  media_outlet_id: string;
  domain: string;
  category: string;
  niche: string | null;
  price: number;
  quantity: number;
  content_option: 'self-provided' | 'professional' | null;
  niche_id: string | null;
  uploaded_files: string[] | null;
  google_docs_links: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  cartItemId: string | null; // Can be null if cart item was deleted
  domain: string;
  category: string;
  niche: string | null; // Can be null in database
  price: number;
  quantity: number;
  contentOption: 'self-provided' | 'professional' | null; // Can be null in database
  nicheId?: string;
  uploadedFiles?: string[]; // File paths or URLs
  googleDocsLinks?: string[];
}

export interface OrderData {
  id?: string; // Optional for creation, required for updates
  orderNumber: string;
  userId: string;
  status: 'action_needed' | 'processing' | 'completed' | 'cancelled';
  totalAmount: number;
  subtotal: number;
  vatAmount: number;
  currency: string;

  // Billing Information
  billingInfo: {
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
  };

  // Payment Information
  paymentMethod: {
    type: 'stripe' | 'paypal' | 'invoice';
    poNumber?: string;
    paymentId?: string;
  };

  // Order Items
  items: OrderItem[];

  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// RPC response interface for create_order_with_items
interface CreateOrderRPCResponse {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface UseOrdersReturn {
  createOrder: (orderData: Omit<OrderData, 'id' | 'createdAt' | 'updatedAt'>) => Promise<OrderData | null>;
  updateOrderStatus: (orderId: string, status: OrderData['status']) => Promise<boolean>;
  getUserOrders: () => Promise<OrderData[]>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing orders in the database
 */
export const useOrders = (): UseOrdersReturn => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new order in the database
   */
  const createOrder = useCallback(async (
    orderData: Omit<OrderData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<OrderData | null> => {
    if (!user?.id) {
      setError('User not authenticated');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create the order record
      const orderRecord = {
        order_number: orderData.orderNumber,
        user_id: orderData.userId,
        status: orderData.status,
        total_amount: orderData.totalAmount,
        subtotal: orderData.subtotal,
        vat_amount: orderData.vatAmount,
        currency: orderData.currency,

        // Billing Information
        billing_first_name: orderData.billingInfo.firstName,
        billing_last_name: orderData.billingInfo.lastName,
        billing_company: orderData.billingInfo.company,
        billing_email: orderData.billingInfo.email,
        billing_phone: orderData.billingInfo.phone,
        billing_address_street: orderData.billingInfo.address.street,
        billing_address_city: orderData.billingInfo.address.city,
        billing_address_postal: orderData.billingInfo.address.postalCode,
        billing_address_country: orderData.billingInfo.address.country,
        billing_tax_id: orderData.billingInfo.taxId,

        // Payment Information
        payment_method: orderData.paymentMethod.type,
        payment_po_number: orderData.paymentMethod.poNumber,
        payment_id: orderData.paymentMethod.paymentId,

        // Metadata
        notes: orderData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Use RPC for atomic order creation (order + items in single transaction)
      const { data: orderResult, error: orderError } = await supabase.rpc('create_order_with_items', {
        order_record: orderRecord,
        order_items: orderData.items.map(item => ({
          cart_item_id: item.cartItemId,
          domain: item.domain,
          category: item.category,
          niche: item.niche,
          price: item.price,
          quantity: item.quantity,
          content_option: item.contentOption,
          niche_id: item.nicheId ?? null,
          uploaded_files: item.uploadedFiles ?? null,
          google_docs_links: item.googleDocsLinks ?? null,
        }))
      });

      if (orderError) {
        // If RPC fails, throw the error (no manual cleanup needed as transaction is atomic)
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      // Extract order data from RPC result with proper null checks
      if (!orderResult || typeof orderResult !== 'object' || !('id' in orderResult)) {
        throw new Error('Failed to create order: Invalid response from database');
      }

      const createdOrder = orderResult as CreateOrderRPCResponse;

      // Create notification for user
      await createOrderNotification(createdOrder.id, orderData.userId, orderData.orderNumber);

      // Create admin alert for content review if needed
      const hasSelfProvidedContent = orderData.items.some(item => item.contentOption === 'self-provided');
      if (hasSelfProvidedContent) {
        await createAdminAlert(createdOrder.id, orderData.orderNumber);
      }

      const result: OrderData = {
        ...orderData,
        id: createdOrder.id,
        createdAt: new Date(createdOrder.created_at),
        updatedAt: new Date(createdOrder.updated_at),
      };

      toast({
        title: "Order Created Successfully",
        description: `Order ${orderData.orderNumber} has been created and is being processed.`,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
      setError(errorMessage);

      toast({
        title: "Order Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Update order status
   */
  const updateOrderStatus = useCallback(async (
    orderId: string,
    status: OrderData['status']
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        throw new Error(`Failed to update order status: ${error.message}`);
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update order status';
      setError(errorMessage);
      return false;
    }
  }, []);

  /**
   * Get user's orders
   */
  const getUserOrders = useCallback(async (): Promise<OrderData[]> => {
    if (!user?.id) {
      setError('User not authenticated');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch orders: ${error.message}`);
      }

      // Transform the data to match our interface
      const transformedOrders: OrderData[] = orders.map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        userId: order.user_id,
        status: order.status,
        totalAmount: order.total_amount,
        subtotal: order.subtotal,
        vatAmount: order.vat_amount,
        currency: order.currency,

        billingInfo: {
          firstName: order.billing_first_name,
          lastName: order.billing_last_name,
          company: order.billing_company,
          email: order.billing_email,
          phone: order.billing_phone,
          address: {
            street: order.billing_address_street,
            city: order.billing_address_city,
            postalCode: order.billing_address_postal,
            country: order.billing_address_country,
          },
          taxId: order.billing_tax_id,
        },

        paymentMethod: {
          type: order.payment_method,
          poNumber: order.payment_po_number,
          paymentId: order.payment_id,
        },

        items: order.order_items.map((item: OrderItemRow) => ({
          id: item.id,
          cartItemId: item.cart_item_id,
          domain: item.domain,
          category: item.category,
          niche: item.niche,
          price: item.price,
          quantity: item.quantity,
          contentOption: item.content_option,
          nicheId: item.niche_id,
          uploadedFiles: item.uploaded_files,
          googleDocsLinks: item.google_docs_links,
        })),

        notes: order.notes,
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at),
      }));

      return transformedOrders;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch orders';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  return {
    createOrder,
    updateOrderStatus,
    getUserOrders,
    isLoading,
    error,
  };
};

/**
 * Create a notification for the user about their order
 */
const createOrderNotification = async (
  orderId: string,
  userId: string,
  orderNumber: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'order_confirmation',
        title: 'Order Placed Successfully',
        message: `Your order ${orderNumber} has been placed successfully. We will begin processing it shortly.`,
        data: { orderId, orderNumber },
        read: false,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to create order notification:', error);
    }
  } catch (error) {
    console.error('Error creating order notification:', error);
  }
};

/**
 * Create an admin alert for content review
 */
const createAdminAlert = async (
  orderId: string,
  orderNumber: string
): Promise<void> => {
  try {
    // Get all admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminError) {
      console.error('Failed to fetch admin users:', adminError);
      return;
    }

    // Create notifications for all admins
    const adminNotifications = adminUsers.map(admin => ({
      user_id: admin.user_id,
      type: 'admin_alert',
      title: 'Content Review Required',
      message: `Order ${orderNumber} requires content review. Self-provided content needs to be checked.`,
      data: { orderId, orderNumber, actionType: 'content_review' },
      read: false,
      created_at: new Date().toISOString(),
    }));

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(adminNotifications);

    if (notificationError) {
      console.error('Failed to create admin notifications:', notificationError);
    }
  } catch (error) {
    console.error('Error creating admin alerts:', error);
  }
};

/**
 * Generate a unique order number
 */
export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `MO-${timestamp}-${random}`;
};