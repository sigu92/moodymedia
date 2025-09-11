import { useState, useEffect } from 'react';
import { dashboard, favorites, cart } from '@/integrations/postgresql/helpers';
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
  const { user, userRole } = useAuth();

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Hämta order statistik
      const orderStats = await dashboard.getOrderStats(user.id, userRole || 'buyer');

      // Hämta cart statistik
      const cartStats = await dashboard.getCartStats(user.id);

      // Hämta favorites
      const favoritesData = await favorites.getByUserId(user.id);

      let publisherStats;
      if (userRole === 'publisher') {
        publisherStats = await dashboard.getPublisherStats(user.id);
      }

      setStats({
        orders: {
          total: parseInt(orderStats.total) || 0,
          pending: parseInt(orderStats.pending) || 0,
          completed: parseInt(orderStats.completed) || 0,
          thisMonth: parseInt(orderStats.this_month) || 0,
          revenue: parseFloat(orderStats.revenue) || 0
        },
        favorites: { total: favoritesData.length },
        cart: {
          items: parseInt(cartStats.items) || 0,
          value: parseFloat(cartStats.value) || 0
        },
        publisher: publisherStats ? {
          outlets: parseInt(publisherStats.outlets) || 0,
          incomingOrders: parseInt(publisherStats.incoming_orders) || 0,
          totalEarnings: parseFloat(publisherStats.total_earnings) || 0,
          thisMonthOrders: parseInt(publisherStats.this_month_orders) || 0
        } : undefined
      });

      // Sätt favoriterade media (begränsa till 5)
      setFavoritedMedia(favoritesData.slice(0, 5));

      // Generera recent activity baserat på favorites (för enkelhetens skull)
      const activity: RecentActivity[] = favoritesData.slice(0, 3).map(fav => ({
        id: fav.id,
        type: 'order' as const,
        title: 'Favorite Added',
        description: `Added ${fav.domain} to favorites`,
        date: fav.created_at,
        status: 'active'
      }));

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
  }, [user, userRole]);

  return {
    stats,
    recentActivity,
    recentOrders,
    favoritedMedia,
    loading,
    refetch: fetchDashboardData
  };
};
