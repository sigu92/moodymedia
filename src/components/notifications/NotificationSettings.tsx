import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Package, 
  Gift, 
  Megaphone,
  Settings
} from "lucide-react";

export const NotificationSettings = () => {
  const { 
    notificationSettings, 
    updateNotificationSettings, 
    notifications,
    unreadCount 
  } = useNotifications();

  const settingsOptions = [
    {
      key: 'email_notifications' as const,
      title: 'Email Notifications',
      description: 'Receive notifications via email',
      icon: <Mail className="h-4 w-4" />,
    },
    {
      key: 'push_notifications' as const,
      title: 'Push Notifications',
      description: 'Receive push notifications in your browser',
      icon: <Smartphone className="h-4 w-4" />,
    },
    {
      key: 'order_updates' as const,
      title: 'Order Updates',
      description: 'Get notified about order status changes',
      icon: <Package className="h-4 w-4" />,
    },
    {
      key: 'referral_updates' as const,
      title: 'Referral Updates',
      description: 'Get notified about referral rewards and signups',
      icon: <Gift className="h-4 w-4" />,
    },
    {
      key: 'submission_updates' as const,
      title: 'Submission Status Updates',
      description: 'Get notified when your website submissions are approved or rejected',
      icon: <Megaphone className="h-4 w-4" />,
    },
    {
      key: 'marketing_emails' as const,
      title: 'Marketing Emails',
      description: 'Receive promotional emails and updates',
      icon: <Megaphone className="h-4 w-4" />,
    },
  ];

  const handleSettingChange = (key: keyof typeof notificationSettings, value: boolean) => {
    updateNotificationSettings({ [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Notifications</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <Bell className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
              <Badge variant="destructive" className="h-8 w-8 rounded-full p-0 flex items-center justify-center">
                {unreadCount}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email Enabled</p>
                <p className="text-2xl font-bold">
                  {notificationSettings.email_notifications ? 'Yes' : 'No'}
                </p>
              </div>
              <Mail className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {settingsOptions.map((option, index) => (
            <div key={option.key}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-muted rounded-lg">
                    {option.icon}
                  </div>
                  <div className="space-y-1">
                    <Label 
                      htmlFor={option.key}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {option.title}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={option.key}
                  checked={notificationSettings[option.key]}
                  onCheckedChange={(checked) => handleSettingChange(option.key, checked)}
                />
              </div>
              {index < settingsOptions.length - 1 && <Separator className="mt-6" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2">Notification Frequency</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Control how often you receive notifications. Real-time notifications are delivered immediately, 
              while batched notifications are sent at specific intervals.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Real-time</Button>
              <Button variant="ghost" size="sm">Hourly</Button>
              <Button variant="ghost" size="sm">Daily</Button>
            </div>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2">Quiet Hours</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Set specific hours when you don't want to receive notifications.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">From</Label>
                <input 
                  type="time" 
                  className="px-2 py-1 border rounded text-sm"
                  defaultValue="22:00"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">To</Label>
                <input 
                  type="time" 
                  className="px-2 py-1 border rounded text-sm"
                  defaultValue="08:00"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2">Notification History</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Manage your notification history and data retention.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Export History
              </Button>
              <Button variant="outline" size="sm">
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};