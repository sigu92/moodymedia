import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Settings, Mail, Smartphone, Calendar, Filter, Zap, Activity, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationPreference {
  id: string;
  type: string;
  label: string;
  description: string;
  channels: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    sms?: boolean;
  };
  enabled: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface PublisherNotificationData {
  priority?: 'high' | 'medium' | 'low';
  actionUrl?: string;
}

interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: unknown;
}

export default function PublisherNotificationCenter() {
  const { user, userRole } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [realtimeNotifications, setRealtimeNotifications] = useState<RealtimeNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Initialize notification preferences
  useEffect(() => {
    const defaultPreferences: NotificationPreference[] = [
      {
        id: 'new_order',
        type: 'order',
        label: 'New Order Received',
        description: 'When a buyer places a new order for your media outlets',
        channels: { email: true, push: true, inApp: true, sms: true },
        enabled: true,
        priority: 'high'
      },
      {
        id: 'order_message',
        type: 'communication',
        label: 'Order Messages',
        description: 'Messages from buyers regarding active orders',
        channels: { email: true, push: true, inApp: true },
        enabled: true,
        priority: 'high'
      },
      {
        id: 'payment_received',
        type: 'financial',
        label: 'Payment Received',
        description: 'When payment is processed for completed orders',
        channels: { email: true, push: false, inApp: true },
        enabled: true,
        priority: 'medium'
      },
      {
        id: 'order_deadline',
        type: 'deadline',
        label: 'Order Deadlines',
        description: 'Reminders for upcoming order deadlines',
        channels: { email: true, push: true, inApp: true },
        enabled: true,
        priority: 'high'
      },
      {
        id: 'site_performance',
        type: 'analytics',
        label: 'Site Performance Alerts',
        description: 'Significant changes in site metrics or performance',
        channels: { email: true, push: false, inApp: true },
        enabled: true,
        priority: 'medium'
      },
      {
        id: 'referral_activity',
        type: 'referral',
        label: 'Referral Activity',
        description: 'New referrals and referral milestone achievements',
        channels: { email: true, push: false, inApp: true },
        enabled: true,
        priority: 'low'
      },
      {
        id: 'system_updates',
        type: 'system',
        label: 'System Updates',
        description: 'Platform updates, maintenance notifications, and new features',
        channels: { email: true, push: false, inApp: true },
        enabled: false,
        priority: 'low'
      },
      {
        id: 'market_insights',
        type: 'insights',
        label: 'Market Insights',
        description: 'Weekly reports and market trends for publishers',
        channels: { email: true, push: false, inApp: false },
        enabled: true,
        priority: 'low'
      }
    ];

    setPreferences(defaultPreferences);
    setLoading(false);
  }, []);

  // Real-time notifications subscription
  useEffect(() => {
    if (!user || userRole !== 'publisher') return;

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('publisher-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification: RealtimeNotification = {
            id: payload.new.id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            priority: payload.new.data?.priority || 'medium',
            timestamp: payload.new.created_at,
            read: false,
            actionUrl: payload.new.data?.actionUrl,
            metadata: payload.new.data
          };

          setRealtimeNotifications(prev => [newNotification, ...prev]);

          // Show toast notification
          showToastNotification(newNotification);
        }
      )
      .subscribe();

    // Load existing notifications
    loadNotifications();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const notifications: RealtimeNotification[] = data?.map(notif => ({
        id: notif.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        priority: (notif.data as PublisherNotificationData)?.priority || 'medium',
        timestamp: notif.created_at,
        read: notif.read,
        actionUrl: (notif.data as PublisherNotificationData)?.actionUrl,
        metadata: notif.data
      })) || [];

      setRealtimeNotifications(notifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    }
  };

  const showToastNotification = (notification: RealtimeNotification) => {
    const toastConfig = {
      title: notification.title,
      description: notification.message,
      action: notification.actionUrl ? {
        label: "View",
        onClick: () => window.open(notification.actionUrl, '_blank')
      } : undefined
    };

    switch (notification.priority) {
      case 'high':
        toast.error(notification.title, { description: notification.message });
        break;
      case 'medium':
        toast.info(notification.title, { description: notification.message });
        break;
      default:
        toast(notification.title, { description: notification.message });
    }
  };

  const updatePreference = async (preferenceId: string, updates: Partial<NotificationPreference>) => {
    setPreferences(prev => 
      prev.map(pref => 
        pref.id === preferenceId 
          ? { ...pref, ...updates }
          : pref
      )
    );

    // Save to database
    try {
      await supabase
        .from('notification_settings')
        .upsert({
          user_id: user?.id,
          preference_id: preferenceId,
          settings: updates
        });
      
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      setRealtimeNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);

      setRealtimeNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );

      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const filteredNotifications = realtimeNotifications.filter(notif => 
    filterPriority === 'all' || notif.priority === filterPriority
  );

  const unreadCount = realtimeNotifications.filter(notif => !notif.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center glass-card-clean p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading notification center...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Notification Center
            </h1>
            <p className="text-muted-foreground text-lg">
              Real-time alerts and communication preferences
            </p>
          </div>
          <div className="flex gap-3">
            <Badge variant={unreadCount > 0 ? "destructive" : "secondary"} className="h-8 px-3">
              {unreadCount} unread
            </Badge>
            <Button onClick={markAllAsRead} variant="outline" className="glass-button">
              Mark All Read
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Live Feed
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="channels" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Channels
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Automation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            {/* Filter Controls */}
            <Card className="glass-card-clean">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-40 glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="low">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Live Notifications */}
            <Card className="glass-card-clean shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Real-time Notifications
                </CardTitle>
                <CardDescription>
                  Live updates and alerts for your publisher account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No notifications to display</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredNotifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg glass-card-light transition-all duration-200 cursor-pointer hover:shadow-medium ${
                          !notification.read ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          {getPriorityIcon(notification.priority)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold">{notification.title}</h4>
                              <span className="text-xs text-muted-foreground">
                                {new Date(notification.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                            {notification.actionUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2 glass-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(notification.actionUrl, '_blank');
                                }}
                              >
                                View Details
                              </Button>
                            )}
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            {/* Notification Preferences */}
            <Card className="glass-card-clean shadow-medium">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Customize what notifications you receive and how
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {preferences.map(preference => (
                    <div key={preference.id} className="p-4 border rounded-lg glass-card-light">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{preference.label}</h4>
                            <Badge variant={
                              preference.priority === 'high' ? 'destructive' :
                              preference.priority === 'medium' ? 'default' :
                              'secondary'
                            } className="text-xs">
                              {preference.priority.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{preference.description}</p>
                        </div>
                        <Switch
                          checked={preference.enabled}
                          onCheckedChange={(enabled) => updatePreference(preference.id, { enabled })}
                        />
                      </div>
                      
                      {preference.enabled && (
                        <div className="grid grid-cols-4 gap-4 pt-3 border-t">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <Switch
                              checked={preference.channels.email}
                              onCheckedChange={(email) => 
                                updatePreference(preference.id, {
                                  channels: { ...preference.channels, email }
                                })
                              }
                            />
                            <span className="text-xs">Email</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            <Switch
                              checked={preference.channels.push}
                              onCheckedChange={(push) => 
                                updatePreference(preference.id, {
                                  channels: { ...preference.channels, push }
                                })
                              }
                            />
                            <span className="text-xs">Push</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <Switch
                              checked={preference.channels.inApp}
                              onCheckedChange={(inApp) => 
                                updatePreference(preference.id, {
                                  channels: { ...preference.channels, inApp }
                                })
                              }
                            />
                            <span className="text-xs">In-App</span>
                          </div>
                          {preference.channels.sms !== undefined && (
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4 text-muted-foreground" />
                              <Switch
                                checked={preference.channels.sms}
                                onCheckedChange={(sms) => 
                                  updatePreference(preference.id, {
                                    channels: { ...preference.channels, sms }
                                  })
                                }
                              />
                              <span className="text-xs">SMS</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="channels" className="space-y-6">
            {/* Channel Settings */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <Card className="glass-card-clean shadow-medium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Email Preferences
                  </CardTitle>
                  <CardDescription>
                    Configure your email notification settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Daily digest email</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Weekly summary report</span>
                    <Switch defaultChecked />
                  </div>
                  <Button className="w-full glass-button-primary">
                    Save Email Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="automation" className="space-y-6">
            {/* Automation Rules */}
            <Card className="glass-card-clean shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Smart Notification Rules
                </CardTitle>
                <CardDescription>
                  Automated rules to reduce notification noise and prioritize important updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg glass-card-light">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Bundle similar notifications</h4>
                      <Switch defaultChecked />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Group similar notifications together to reduce clutter
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg glass-card-light">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Priority escalation</h4>
                      <Switch defaultChecked />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Automatically escalate urgent orders after 2 hours
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg glass-card-light">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Weekend pause</h4>
                      <Switch />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pause non-urgent notifications during weekends
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}