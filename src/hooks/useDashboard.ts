import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface DashboardStats {
  orders: {
    total: number;
    pending: number;
    completed: number;
    thisMonth: number;
    revenue: number;
  };
  favorites: {
    total: number;
  };
  cart: {
    items: number;
    value: number;
  };
  publisher?: {
    outlets: number;
    incomingOrders: number;
    totalEarnings: number;
    thisMonthOrders: number;
  };
}

export interface RecentActivity {
  id: string;
  type: 'order' | 'publication' | 'payment';
  title: string;
  description: string;
  date: string;
  status?: string;
  amount?: number;
}

export const useDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    orders: { total: 0, pending: 0, completed: 0, thisMonth: 0, revenue: 0 },
    favorites: { total: 0 },
    cart: { items: 0, value: 0 }
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [favoritedMedia, setFavoritedMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRoles } = useAuth();

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch orders statistics
      const ordersQuery = supabase
        .from('orders')
        .select(`
          *,
          media_outlets!inner (
            domain,
            category
          )
        `);

      if (userRoles?.includes('publisher')) {
        ordersQuery.eq('publisher_id', user.id);
      } else if (!userRoles?.includes('admin') && !userRoles?.includes('system_admin')) {
        ordersQuery.eq('buyer_id', user.id);
      }

      const { data: orders } = await ordersQuery;

      // Fetch cart items
      const { data: cartItems } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id);

      // Fetch favorites
      const { data: favorites } = await supabase
        .from('favorites')
        .select(`
          *,
          media_outlets!inner (
            domain,
            category,
            price,
            currency
          )
        `)
        .eq('user_id', user.id);

      // Calculate statistics
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const orderStats = {
        total: orders?.length || 0,
        pending: orders?.filter(o => ['requested', 'accepted', 'content_received'].includes(o.status)).length || 0,
        completed: orders?.filter(o => ['published', 'verified'].includes(o.status)).length || 0,
        thisMonth: orders?.filter(o => new Date(o.created_at) >= thisMonth).length || 0,
        revenue: orders?.reduce((sum, o) => sum + Number(o.price), 0) || 0
      };

      const cartStats = {
        items: cartItems?.length || 0,
        value: cartItems?.reduce((sum, item) => sum + Number(item.price), 0) || 0
      };

      let publisherStats;
      if (userRoles?.includes('publisher')) {
        const { data: outlets } = await supabase
          .from('media_outlets')
          .select('*')
          .eq('publisher_id', user.id);

        publisherStats = {
          outlets: outlets?.length || 0,
          incomingOrders: orders?.filter(o => ['requested', 'accepted'].includes(o.status)).length || 0,
          totalEarnings: orders?.reduce((sum, o) => sum + Number(o.price), 0) || 0,
          thisMonthOrders: orders?.filter(o => new Date(o.created_at) >= thisMonth).length || 0
        };
      }

      setStats({
        orders: orderStats,
        favorites: { total: favorites?.length || 0 },
        cart: cartStats,
        publisher: publisherStats
      });

      // Set recent orders (limit to 5)
      setRecentOrders(orders?.slice(0, 5) || []);

      // Set favorited media (limit to 5)
      setFavoritedMedia(favorites?.slice(0, 5) || []);

      // Generate recent activity
      const activity: RecentActivity[] = [];
      
      orders?.slice(0, 3).forEach(order => {
        activity.push({
          id: order.id,
          type: 'order',
          title: `Order ${order.status}`,
          description: `Order for ${order.media_outlets?.domain || 'unknown outlet'}`,
          date: order.updated_at,
          status: order.status,
          amount: order.price
        });
      });

      setRecentActivity(activity);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user, userRoles]);

  return {
    stats,
    recentActivity,
    recentOrders,
    favoritedMedia,
    loading,
    refetch: fetchDashboardData
  };
};