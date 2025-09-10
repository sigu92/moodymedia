import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Heart, 
  ShoppingCart, 
  TrendingUp, 
  Clock, 
  Target,
  FileText,
  Search,
  Star
} from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardStats } from "@/hooks/useDashboard";

interface MarketplaceDashboardProps {
  stats: DashboardStats;
  recentOrders: any[];
  favoritedMedia: any[];
}

const MarketplaceDashboard = ({ stats, recentOrders, favoritedMedia }: MarketplaceDashboardProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested': return <Badge variant="secondary">Requested</Badge>;
      case 'accepted': return <Badge variant="default">Accepted</Badge>;
      case 'content_received': return <Badge variant="outline">Content Received</Badge>;
      case 'published': return <Badge className="bg-success text-success-foreground">Published</Badge>;
      case 'verified': return <Badge className="bg-success text-success-foreground">Verified</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Förbättrad Hero-sektion */}
      <div className="glass-card-primary p-8 gradient-header text-white">
        <div className="max-w-4xl">
          <h2 className="text-3xl font-heading font-bold mb-3">Welcome to Moody Media Marketplace</h2>
          <p className="text-white/90 mb-6 text-lg leading-relaxed max-w-2xl">
            Discover premium SEO opportunities with transparent pricing and real metrics. 
            Connect with verified publishers and grow your digital presence.
          </p>
          <div className="flex gap-4">
            <Button asChild size="lg" className="bg-white/20 hover:bg-white/30 border-white/30 text-white font-medium backdrop-blur-sm">
              <Link to="/marketplace">
                <Search className="h-5 w-5 mr-2" />
                Browse Publishers
              </Link>
            </Button>
            <Button asChild size="lg" className="glass-button bg-white/10 hover:bg-white/20 border-white/20 text-white">
              <Link to="/offers">
                <Star className="h-5 w-5 mr-2" />
                Create Offer
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Ren statistik-översikt */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card-clean p-6 hover:shadow-medium transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <Clock className="h-6 w-6" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-heading font-bold text-primary">{stats.orders.pending}</div>
              <div className="text-sm text-muted-foreground">Active Orders</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.orders.total} total orders placed
          </p>
        </div>

        <div className="glass-card-clean p-6 hover:shadow-medium transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-secondary/10 text-secondary rounded-lg">
              <Heart className="h-6 w-6" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-heading font-bold text-secondary">{stats.favorites.total}</div>
              <div className="text-sm text-muted-foreground">Saved Publishers</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Ready to order from favorites
          </p>
        </div>

        <div className="glass-card-clean p-6 hover:shadow-medium transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-success/15 text-success rounded-lg">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-heading font-bold text-success">€{stats.cart.value}</div>
              <div className="text-sm text-muted-foreground">Cart Value</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.cart.items} items ready to checkout
          </p>
        </div>

        <div className="glass-card-clean p-6 hover:shadow-medium transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-accent/40 text-foreground rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-heading font-bold text-foreground">€{stats.orders.revenue}</div>
              <div className="text-sm text-muted-foreground">Total Investment</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.orders.thisMonth} orders this month
          </p>
        </div>
      </div>

      {/* Performance & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="glass-card-clean">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-heading">Campaign Performance</CardTitle>
                <CardDescription>Your marketplace insights</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium">Order Success Rate</span>
                <span className="font-semibold text-foreground">{stats.orders.completed}/{stats.orders.total}</span>
              </div>
              <Progress 
                value={stats.orders.total > 0 ? (stats.orders.completed / stats.orders.total) * 100 : 0} 
                className="h-3"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {stats.orders.total > 0 ? Math.round((stats.orders.completed / stats.orders.total) * 100) : 0}% completion rate
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-4">
                <div className="text-sm text-muted-foreground mb-1">Avg. Delivery</div>
                <div className="text-lg font-semibold text-foreground">2.3 days</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-sm text-muted-foreground mb-1">Publisher Rating</div>
                <div className="text-lg font-semibold text-foreground flex items-center">
                  ⭐ 4.7/5
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card-clean">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 text-secondary rounded-lg">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-heading">Quick Actions</CardTitle>
                <CardDescription>Fast access to key features</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild size="lg" className="w-full justify-start glass-button-primary h-14">
              <Link to="/marketplace">
                <Search className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Find Publishers</div>
                  <div className="text-xs opacity-80">Browse 500+ verified outlets</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full justify-start glass-button h-14">
              <Link to="/cart">
                <ShoppingCart className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">View Cart ({stats.cart.items})</div>
                  <div className="text-xs opacity-70">€{stats.cart.value} ready to checkout</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full justify-start glass-button h-14">
              <Link to="/orders">
                <FileText className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Track Orders</div>
                  <div className="text-xs opacity-70">{stats.orders.pending} active campaigns</div>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="glass-card-clean">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-heading">Recent Orders</CardTitle>
                <CardDescription>Track your latest SEO campaigns</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="glass-card p-8 inline-block">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4 font-medium">No orders yet</p>
                  <Button asChild className="glass-button-primary">
                    <Link to="/marketplace">Start Your First Campaign</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="glass-card p-4 hover:shadow-medium transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-secondary/10 text-secondary rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">#{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        {getStatusBadge(order.status)}
                        <p className="text-lg font-semibold">€{order.price}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6">
              <Button asChild variant="outline" className="w-full glass-button">
                <Link to="/orders">View All Orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card-clean">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/15 text-success rounded-lg">
                <Heart className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-heading">Saved Publishers</CardTitle>
                <CardDescription>Your favorite media outlets</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {favoritedMedia.length === 0 ? (
              <div className="text-center py-12">
                <div className="glass-card p-8 inline-block">
                  <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4 font-medium">No saved publishers yet</p>
                  <Button asChild className="glass-button-primary">
                    <Link to="/marketplace">Discover Publishers</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {favoritedMedia.map((item) => (
                  <div key={item.id} className="glass-card p-4 hover:shadow-medium transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-success/15 text-success rounded-lg flex items-center justify-center">
                          <Heart className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{item.media_outlets?.domain}</p>
                          <p className="text-sm text-muted-foreground">{item.media_outlets?.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">€{item.media_outlets?.price}</p>
                        <p className="text-xs text-muted-foreground">{item.media_outlets?.currency}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6">
              <Button asChild variant="outline" className="w-full glass-button">
                <Link to="/marketplace">Browse More</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketplaceDashboard;