import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityFeed } from "@/components/notifications/ActivityFeed";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { 
  Bell, 
  Activity, 
  Settings, 
  CheckCircle,
  AlertCircle,
  Info,
  Gift,
  Package
} from "lucide-react";

const Notifications = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    createTestNotification 
  } = useNotifications();

  const recentNotifications = notifications.slice(0, 5);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_update':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'referral_signup':
      case 'referral_reward':
        return <Gift className="h-4 w-4 text-green-600" />;
      case 'system':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Notifications
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your notifications and activity feed
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={createTestNotification}
              className="glass-button hover:shadow-medium"
            >
              <Bell className="h-4 w-4 mr-2" />
              Test Notification
            </Button>
            {unreadCount > 0 && (
              <Button 
                onClick={markAllAsRead}
                className="glass-button-primary shadow-glass"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark All Read ({unreadCount})
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Notifications</p>
                  <p className="text-3xl font-bold text-foreground">{notifications.length}</p>
                </div>
                <div className="glass-button-primary h-12 w-12 rounded-full flex items-center justify-center">
                  <Bell className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Unread</p>
                  <p className="text-3xl font-bold text-foreground">{unreadCount}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-pink-600 h-12 w-12 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">{unreadCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Order Updates</p>
                  <p className="text-3xl font-bold text-foreground">
                    {notifications.filter(n => n.type === 'order_update').length}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 h-12 w-12 rounded-full flex items-center justify-center shadow-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Referral Rewards</p>
                  <p className="text-3xl font-bold text-foreground">
                    {notifications.filter(n => n.type.includes('referral')).length}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 h-12 w-12 rounded-full flex items-center justify-center shadow-lg">
                  <Gift className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="recent" className="space-y-6">
          <TabsList className="glass-card p-1 h-auto">
            <TabsTrigger value="recent" className="flex items-center gap-2 glass-button data-[state=active]:glass-button-primary">
              <Bell className="h-4 w-4" />
              Recent Notifications
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2 glass-button data-[state=active]:glass-button-primary">
              <Activity className="h-4 w-4" />
              Activity Feed
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 glass-button data-[state=active]:glass-button-primary">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="space-y-6">
            <Card className="glass-card-clean shadow-medium">
              <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-secondary/5">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Bell className="h-5 w-5 text-primary" />
                  Recent Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {recentNotifications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="glass-card-primary h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Bell className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">No notifications yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      You'll see notifications here when you have activity on your account.
                      Try creating a test notification to see how it looks.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentNotifications.map((notification, index) => (
                      <div
                        key={notification.id}
                        className={`glass-card p-4 border-l-4 transition-all duration-300 hover:shadow-medium hover:scale-[1.02] ${
                          notification.read ? 'border-l-gray-300' : 'border-l-primary'
                        } ${!notification.read ? 'ring-2 ring-primary/20' : ''}`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`${notification.read ? 'opacity-60' : ''} transition-opacity`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className={`font-semibold text-base ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="glass-button hover:glass-button-primary shrink-0"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Mark Read
                                </Button>
                              )}
                            </div>
                            
                            <p className="text-muted-foreground mt-2 leading-relaxed">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between mt-4">
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </span>
                              
                              <Badge variant="outline" className="glass-button text-xs">
                                {notification.type.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                          
                          {!notification.read && (
                            <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {notifications.length > 5 && (
                      <div className="text-center pt-6">
                        <Button 
                          variant="outline" 
                          className="glass-button hover:glass-button-primary"
                          onClick={() => window.location.href = '/notifications'}
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          View All Notifications ({notifications.length})
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="glass-card-clean shadow-medium">
              <ActivityFeed />
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="glass-card-clean shadow-medium">
              <NotificationSettings />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Notifications;
