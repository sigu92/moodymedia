import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Clock, FileText, ExternalLink, Edit, CheckCircle, Loader2, Calendar, AlertCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useOrders, OrderData } from "@/hooks/useOrders";
import { useAuth } from "@/contexts/AuthContext";
import { OrderStatus } from "@/types";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { PublisherOrderActions } from "@/components/orders/PublisherOrderActions";
import { toast } from "@/hooks/use-toast";

const Orders = () => {
  const { getUserOrders, isLoading, updateOrderStatus, updateOrderContent } = useOrders();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const { userRoles, user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [editingContent, setEditingContent] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contentForm, setContentForm] = useState({
    briefing: '',
    anchor: '',
    targetUrl: ''
  });
  const [publicationUrl, setPublicationUrl] = useState('');

  // Memoized loadOrders function to prevent infinite re-renders
  const loadOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }

    try {
      setLoadingError(null);
      const fetchedOrders = await getUserOrders();
      setOrders(fetchedOrders);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load orders';
      console.error('Error loading orders:', error);
      setLoadingError(errorMessage);

      // Show user-friendly error message
      toast({
        title: "Error Loading Orders",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [user, getUserOrders]);

  // Load orders on component mount and when user changes
  useEffect(() => {
    loadOrders();
  }, [loadOrders]); // Only depend on the memoized loadOrders function

  const handleStatusUpdate = async (orderId: string, newStatus: OrderData['status'], publicationUrl?: string) => {
    await updateOrderStatus(orderId, newStatus, publicationUrl);
    // Refresh orders list after update
    const refreshedOrders = await getUserOrders();
    setOrders(refreshedOrders);
  };

  const handleContentUpdate = async () => {
    if (!selectedOrder) return;
    
    await updateOrderContent(
      selectedOrder.id,
      contentForm.briefing,
      contentForm.anchor,
      contentForm.targetUrl
    );
    setEditingContent(false);
    // Refresh orders list after content update
    const refreshedOrders = await getUserOrders();
    setOrders(refreshedOrders);
  };

  const openContentEditor = (order: OrderData) => {
    setSelectedOrder(order);
    setContentForm({
      briefing: order.briefing ?? '',
      anchor: order.anchor ?? '',
      targetUrl: order.target_url ?? ''
    });
    setEditingContent(true);
  };

  const canEditStatus = (order: OrderData) => {
    if (userRoles?.includes('admin') || userRoles?.includes('system_admin')) return true;
    if (userRoles?.includes('publisher') && order.publisherId) return true;
    return false;
  };

  const canEditContent = (order: OrderData) => {
    if (userRoles?.includes('admin') || userRoles?.includes('system_admin')) return true;
    if (userRoles?.includes('buyer')) return true;
    return false;
  };

  const filteredOrders = orders.filter(order => {
    let roleFilter = false;
    if (userRoles?.includes('publisher')) {
      // For publishers, we would need publisher_id in the data
      // For now, show all orders for publishers (this needs proper role-based filtering)
      roleFilter = true;
    } else if (userRoles?.includes('admin') || userRoles?.includes('system_admin')) {
      roleFilter = true; // Admins can see all
    } else {
      // For buyers, check if this is their order
      roleFilter = order.userId === user?.id;
    }

    if (statusFilter === 'all') return roleFilter;
    return roleFilter && order.status === statusFilter;
  });

  const getOrdersByStatus = (status?: string) => {
    return orders.filter(order => {
      let roleMatch = false;
      if (userRoles?.includes('publisher')) {
        // For publishers, we would need publisher_id in the data
        // For now, show all orders for publishers (this needs proper role-based filtering)
        roleMatch = true;
      } else if (userRoles?.includes('admin') || userRoles?.includes('system_admin')) {
        roleMatch = true; // Admins can see all
      } else {
        // For buyers, check if this is their order
        roleMatch = order.userId === user?.id;
      }
      return status ? roleMatch && order.status === status : roleMatch;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center glass-card-clean p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if loading failed
  if (loadingError) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center glass-card-clean p-8">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Failed to Load Orders</h3>
              <p className="text-muted-foreground mb-6">{loadingError}</p>
              <Button onClick={() => loadOrders()} className="glass-button-primary">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {userRoles?.includes('publisher') ? 'Order Management' : 'My Orders'}
          </h1>
          <p className="text-muted-foreground text-lg">
            {userRoles?.includes('publisher') 
              ? 'Manage incoming order requests from buyers'
              : (userRoles?.includes('admin') || userRoles?.includes('system_admin'))
              ? 'Manage all orders in the system'
              : 'Track your publication orders and their progress'
            }
          </p>
        </div>

        {/* Status Filter Tabs */}
        <Card className="glass-card-clean">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className={statusFilter === 'all' ? 'glass-button-primary' : 'glass-button'}
              >
                All Orders ({getOrdersByStatus().length})
              </Button>
              <Button
                variant={statusFilter === 'requested' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('requested')}
                className={statusFilter === 'requested' ? 'glass-button-primary' : 'glass-button'}
              >
                Pending ({getOrdersByStatus('requested').length})
              </Button>
              <Button
                variant={statusFilter === 'accepted' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('accepted')}
                className={statusFilter === 'accepted' ? 'glass-button-primary' : 'glass-button'}
              >
                Active ({getOrdersByStatus('accepted').length})
              </Button>
              <Button
                variant={statusFilter === 'published' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('published')}
                className={statusFilter === 'published' ? 'glass-button-primary' : 'glass-button'}
              >
                Published ({getOrdersByStatus('published').length})
              </Button>
              <Button
                variant={statusFilter === 'verified' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('verified')}
                className={statusFilter === 'verified' ? 'glass-button-primary' : 'glass-button'}
              >
                Completed ({getOrdersByStatus('verified').length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {filteredOrders.length === 0 ? (
          <Card className="glass-card-clean">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="glass-card-primary h-24 w-24 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">No orders found</h3>
              <p className="text-muted-foreground max-w-md text-center">
                {userRoles?.includes('publisher')
                  ? 'When buyers place orders for your media outlets, they will appear here.'
                  : 'When you place orders, they will appear here for you to track.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order, index) => (
              <Card key={order.id} className="glass-card-clean hover:shadow-medium transition-all duration-300 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-secondary/5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-3">
                        <div className="glass-card p-2">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        Order #{order.id.slice(0, 8)}...
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Status: {order.status}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={order.status} />
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">€{order.price}</div>
                        <div className="text-sm text-muted-foreground">{order.currency}</div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Order Details */}
                    <div className="space-y-6">
                      <div className="glass-card p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-primary" />
                          Media Outlet
                        </h4>
                        <div className="space-y-2">
                          <p className="font-medium text-lg">{order.media_outlets?.domain}</p>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="secondary" className="glass-button-secondary">{order.media_outlets?.category}</Badge>
                            <Badge variant="outline" className="glass-button">€{order.price}</Badge>
                          </div>
                        </div>
                      </div>

                      {order.briefing && (
                        <div className="glass-card p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Edit className="h-4 w-4 text-primary" />
                              Content Brief
                            </h4>
                            {canEditContent(order) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openContentEditor(order)}
                                className="glass-button"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Briefing:</p>
                              <p className="text-sm bg-muted/30 p-3 rounded-lg mt-1">{order.briefing}</p>
                            </div>
                            {order.anchor && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Anchor Text:</p>
                                <p className="text-sm bg-muted/30 p-2 rounded mt-1 font-medium">{order.anchor}</p>
                              </div>
                            )}
                            {order.target_url && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Target URL:</p>
                                <a
                                  href={order.target_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline break-all"
                                >
                                  {order.target_url}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {order.publication_url && (
                        <div className="glass-card p-4">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Published Article
                          </h4>
                          <a
                            href={order.publication_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="glass-button-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Published Content
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Timeline and Actions */}
                    <div className="space-y-6">
                      <div className="glass-card p-4">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          Order Timeline
                        </h4>
                        <OrderTimeline 
                          currentStatus={order.status}
                          createdAt={order.created_at}
                          updatedAt={order.updated_at}
                          publicationDate={order.publication_date}
                        />
                      </div>

                      {canEditStatus(order) && (
                        <div className="glass-card p-4">
                          <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <Edit className="h-4 w-4 text-primary" />
                            Publisher Actions
                          </h4>
                          <PublisherOrderActions
                            order={order}
                            onStatusUpdate={handleStatusUpdate}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Content Edit Dialog */}
        <Dialog open={editingContent} onOpenChange={setEditingContent}>
          <DialogContent className="glass-card max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Order Content</DialogTitle>
              <DialogDescription>
                Update the content brief, anchor text, and target URL for this order.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="briefing">Content Briefing</Label>
                <Textarea
                  id="briefing"
                  value={contentForm.briefing}
                  onChange={(e) => setContentForm(prev => ({ ...prev, briefing: e.target.value }))}
                  placeholder="Describe the content requirements..."
                  className="glass-input mt-1"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="anchor">Anchor Text</Label>
                <Input
                  id="anchor"
                  value={contentForm.anchor}
                  onChange={(e) => setContentForm(prev => ({ ...prev, anchor: e.target.value }))}
                  placeholder="Enter anchor text..."
                  className="glass-input mt-1"
                />
              </div>

              <div>
                <Label htmlFor="targetUrl">Target URL</Label>
                <Input
                  id="targetUrl"
                  type="url"
                  value={contentForm.targetUrl}
                  onChange={(e) => setContentForm(prev => ({ ...prev, targetUrl: e.target.value }))}
                  placeholder="https://example.com"
                  className="glass-input mt-1"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleContentUpdate} className="glass-button-primary">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingContent(false)} className="glass-button">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Orders;