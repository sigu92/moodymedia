import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityItem {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: any;
  created_at: string;
}

export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  order_updates: boolean;
  marketing_emails: boolean;
  referral_updates: boolean;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    order_updates: true,
    marketing_emails: false,
    referral_updates: true,
  });
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Load notifications and activity feed
  const loadNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notificationsError) throw notificationsError;

      // Fetch activity feed
      const { data: activityData, error: activityError } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (activityError) throw activityError;

      // Fetch notification settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        // Create default settings if they don't exist
        const { data: newSettings, error: createError } = await supabase
          .from('notification_settings')
          .insert({
            user_id: user.id,
            email_notifications: true,
            push_notifications: true,
            order_updates: true,
            marketing_emails: false,
            referral_updates: true,
          })
          .select()
          .single();

        if (createError) throw createError;
        setNotificationSettings(newSettings);
      } else if (settingsData) {
        setNotificationSettings(settingsData);
      }

      setNotifications(notificationsData || []);
      setActivityFeed(activityData || []);
      setUnreadCount((notificationsData || []).filter(n => !n.read).length);

    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      toast({
        title: "Success",
        description: "All notifications marked as read",
      });

    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
    }
  };

  // Update notification settings
  const updateNotificationSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!user) return;

    try {
      const updatedSettings = { ...notificationSettings, ...newSettings };

      const { error } = await supabase
        .from('notification_settings')
        .update(updatedSettings)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotificationSettings(updatedSettings);

      toast({
        title: "Settings Updated",
        description: "Your notification preferences have been saved",
      });

    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive",
      });
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      const deletedNotification = notifications.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  // Create notification (for testing)
  const createTestNotification = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('create_notification', {
        target_user_id: user.id,
        notification_type: 'test',
        notification_title: 'Test Notification',
        notification_message: 'This is a test notification to verify the system is working.',
        notification_data: { test: true, timestamp: new Date().toISOString() }
      });

      if (error) throw error;

      toast({
        title: "Test Notification Created",
        description: "A test notification has been added to your feed",
      });

      // Reload notifications
      loadNotifications();

    } catch (error) {
      console.error('Error creating test notification:', error);
      toast({
        title: "Error",
        description: "Failed to create test notification",
        variant: "destructive",
      });
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    let notificationsChannel: any;
    let activityChannel: any;

    const setupRealtimeSubscriptions = () => {
      // Subscribe to notifications
      notificationsChannel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Show toast for new notification
            toast({
              title: newNotification.title,
              description: newNotification.message,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updatedNotification = payload.new as Notification;
            setNotifications(prev => 
              prev.map(n => 
                n.id === updatedNotification.id ? updatedNotification : n
              )
            );
          }
        )
        .subscribe();

      // Subscribe to activity feed
      activityChannel = supabase
        .channel('activity_feed')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_feed',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newActivity = payload.new as ActivityItem;
            setActivityFeed(prev => [newActivity, ...prev.slice(0, 99)]);
          }
        )
        .subscribe();
    };

    setupRealtimeSubscriptions();

    return () => {
      if (notificationsChannel) {
        supabase.removeChannel(notificationsChannel);
      }
      if (activityChannel) {
        supabase.removeChannel(activityChannel);
      }
    };
  }, [user]);

  // Load data on mount and user change
  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setNotifications([]);
      setActivityFeed([]);
      setUnreadCount(0);
      setLoading(false);
    }
  }, [user]);

  return {
    notifications,
    activityFeed,
    notificationSettings,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateNotificationSettings,
    createTestNotification,
    refetch: loadNotifications,
  };
};