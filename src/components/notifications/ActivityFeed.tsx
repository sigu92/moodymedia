import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, ActivityItem } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

interface ActivityMetadata {
  media_domain?: string;
  old_status?: string;
  new_status?: string;
  reward_amount?: number;
  amount?: number;
  achievement_name?: string;
}
import { 
  Activity, 
  Package, 
  Gift, 
  User, 
  DollarSign, 
  ShoppingCart,
  Star,
  TrendingUp,
  UserPlus,
  Award
} from "lucide-react";

export const ActivityFeed = () => {
  const { activityFeed, loading, createTestNotification } = useNotifications();

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'order_created':
      case 'order_status_changed':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'referral_signup':
      case 'referral_reward_earned':
        return <Gift className="h-4 w-4 text-green-600" />;
      case 'cart_item_added':
        return <ShoppingCart className="h-4 w-4 text-purple-600" />;
      case 'favorite_added':
        return <Star className="h-4 w-4 text-yellow-600" />;
      case 'profile_updated':
        return <User className="h-4 w-4 text-gray-600" />;
      case 'payment_completed':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'achievement_earned':
        return <Award className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityColor = (action: string) => {
    const colors = {
      order_created: 'border-l-blue-500',
      order_status_changed: 'border-l-blue-500',
      referral_signup: 'border-l-green-500',
      referral_reward_earned: 'border-l-green-500',
      cart_item_added: 'border-l-purple-500',
      favorite_added: 'border-l-yellow-500',
      profile_updated: 'border-l-gray-500',
      payment_completed: 'border-l-green-500',
      achievement_earned: 'border-l-purple-500',
      default: 'border-l-gray-500'
    };
    
    return colors[action as keyof typeof colors] || colors.default;
  };

  const getActivityDescription = (activity: ActivityItem) => {
    const { action, entity_type, metadata } = activity;
    const meta = metadata as ActivityMetadata;
    
    switch (action) {
      case 'order_created':
        return `Created a new order for ${meta.media_domain || 'a media outlet'}`;
      case 'order_status_changed':
        return `Order status changed from ${meta.old_status} to ${meta.new_status}`;
      case 'referral_signup':
        return 'Someone signed up using your referral code';
      case 'referral_reward_earned':
        return `Earned €${meta.reward_amount} from referral program`;
      case 'cart_item_added':
        return `Added ${meta.media_domain || 'a media outlet'} to cart`;
      case 'favorite_added':
        return `Added ${meta.media_domain || 'a media outlet'} to favorites`;
      case 'profile_updated':
        return 'Updated profile information';
      case 'payment_completed':
        return `Completed payment of €${meta.amount}`;
      case 'achievement_earned':
        return `Earned achievement: ${meta.achievement_name}`;
      default:
        return `Performed ${action} on ${entity_type}`;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Feed
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={createTestNotification}
          >
            Test Notification
          </Button>
          <Badge variant="secondary">{activityFeed.length}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : activityFeed.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No activity yet</h3>
              <p className="text-sm text-muted-foreground">
                Your activity will appear here as you use the platform
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {activityFeed.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-start gap-3 p-3 border-l-4 rounded-lg transition-colors hover:bg-muted/30 ${getActivityColor(activity.action)}`}
                >
                  <div className="mt-0.5">
                    {getActivityIcon(activity.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      {getActivityDescription(activity)}
                    </p>
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                      
                      <Badge variant="outline" className="text-xs">
                        {activity.action.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};