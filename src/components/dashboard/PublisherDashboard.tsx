import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package,
  Clock, 
  DollarSign,
  TrendingUp,
  FileText,
  BarChart3,
  Users,
  Upload,
  Settings,
  PlusCircle,
  Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardStats } from "@/hooks/useDashboard";
import { Order } from "@/types";

interface PublisherDashboardProps {
  stats: DashboardStats;
  recentOrders: Order[];
}

const PublisherDashboard = ({ stats, recentOrders }: PublisherDashboardProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested': return <Badge variant="secondary">New Request</Badge>;
      case 'accepted': return <Badge variant="default">Accepted</Badge>;
      case 'content_received': return <Badge className="bg-warning text-warning-foreground">Content Ready</Badge>;
      case 'published': return <Badge className="bg-success text-success-foreground">Published</Badge>;
      case 'verified': return <Badge className="bg-success text-success-foreground">Verified</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      {/* Publisher Hero */}
      <div className="glass-card p-8 mb-8 bg-gradient-moody text-white">
        <div className="max-w-4xl">
          <h2 className="text-2xl font-bold mb-2">Moody Media Publisher Hub</h2>
          <p className="text-white/80 mb-6">
            Monetize your media outlets effectively. Manage orders, track earnings, and grow your publisher business 
            with our comprehensive suite of tools.
          </p>
          <div className="flex gap-4">
            <Button asChild size="lg" className="bg-white/20 hover:bg-white/30 border-white/30">
              <Link to="/admin">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Media Outlet
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10">
              <Link to="/orders">
                <FileText className="h-4 w-4 mr-2" />
                Manage Orders
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Publisher Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media Outlets</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.publisher?.outlets || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active listings
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.publisher?.incomingOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting action
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">€{stats.publisher?.totalEarnings || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time revenue
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.publisher?.thisMonthOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              New orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance & Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Performance Overview
            </CardTitle>
            <CardDescription>Your publisher metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Response Rate</span>
                <span className="font-medium text-success flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  95%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Avg. Turnaround</span>
                <span className="font-medium">2.3 days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Customer Rating</span>
                <span className="font-medium flex items-center">
                  ⭐ 4.8/5
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Monthly Growth</span>
                <span className="font-medium text-success">+12%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Publisher Tools</CardTitle>
            <CardDescription>Manage your media outlets efficiently</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start glass-button-primary">
              <Link to="/orders">
                <FileText className="h-4 w-4 mr-2" />
                Order Queue ({stats.publisher?.incomingOrders || 0})
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start glass-button">
              <Link to="/admin">
                <Settings className="h-4 w-4 mr-2" />
                Manage Outlets
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start glass-button">
              <Link to="/content-guidelines">
                <Upload className="h-4 w-4 mr-2" />
                Update Guidelines
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Orders
            </CardTitle>
            <CardDescription>Latest order requests from buyers</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No recent orders</p>
                <Button asChild className="glass-button-primary">
                  <Link to="/marketplace">Optimize Your Listings</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 glass-card rounded-lg">
                    <div>
                      <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      {getStatusBadge(order.status)}
                      <p className="text-sm font-medium">€{order.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full glass-button">
                <Link to="/orders">View All Orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Media Portfolio
            </CardTitle>
            <CardDescription>Your outlet performance summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 glass-card rounded-lg">
                <div>
                  <p className="font-medium">Active Outlets</p>
                  <p className="text-sm text-muted-foreground">Receiving orders</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">{stats.publisher?.outlets || 0}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 glass-card rounded-lg">
                <div>
                  <p className="font-medium">Avg. Order Value</p>
                  <p className="text-sm text-muted-foreground">Per placement</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">€245</p>
                </div>
              </div>
              
              <div className="mt-4">
                <Button asChild variant="outline" className="w-full glass-button">
                  <Link to="/admin">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add New Outlet
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PublisherDashboard;