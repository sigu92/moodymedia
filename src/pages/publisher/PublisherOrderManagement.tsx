import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { 
  Bell, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  FileText, 
  ExternalLink, 
  Calendar,
  User,
  Filter,
  Search,
  RotateCcw,
  Send,
  Archive,
  Star,
  AlertTriangle,
  Zap,
  Activity,
  TrendingUp,
  DollarSign,
  Target
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { OrderStatus } from "@/types";

interface OrderWithDetails {
  id: string;
  status: string;
  price: number;
  currency: string;
  created_at: string;
  updated_at: string;
  briefing: string;
  anchor: string;
  target_url: string;
  publication_url: string;
  publication_date: string;
  buyer_id: string;
  publisher_id: string;
  media_outlet_id: string;
  media_outlets: {
    domain: string;
    category: string;
    guidelines: string;
    lead_time_days: number;
  };
  buyer_profile?: {
    email: string;
    company?: string;
  };
}

interface OrderMessage {
  id: string;
  order_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  updated_at: string;
  sender_type: 'buyer' | 'publisher' | 'system';
  is_read: boolean;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: {
    id: string;
    name: string;
    description: string;
    estimatedDays: number;
    required: boolean;
    autoComplete?: boolean;
  }[];
}

export default function PublisherOrderManagement() {
  const { user, userRole } = useAuth();
  const { orders, loading, updateOrderStatus } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [realTimeOrders, setRealTimeOrders] = useState<OrderWithDetails[]>([]);

  // Real-time order updates
  useEffect(() => {
    if (!user || userRole !== 'publisher') return;

    const channel = supabase
      .channel('publisher-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `publisher_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time order update:', payload);
          
          if (payload.eventType === 'INSERT') {
            toast.success('New order received!', {
              description: `Order for ${payload.new.media_outlets?.domain}`,
              action: {
                label: "View",
                onClick: () => setSelectedOrder(payload.new as OrderWithDetails)
              }
            });
          } else if (payload.eventType === 'UPDATE') {
            toast.info('Order status updated', {
              description: `Order ${payload.new.id.slice(0, 8)} - ${payload.new.status}`
            });
          }
          
          // Refresh orders list
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole]);

  // Load orders with enhanced details
  const loadOrders = async () => {
    if (!user || userRole !== 'publisher') return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          media_outlets (
            domain,
            category,
            guidelines,
            lead_time_days
          )
        `)
        .eq('publisher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRealTimeOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    }
  };

  // Fetch messages for current order (using mock data for now)
  const fetchMessages = async (orderId: string) => {
    if (!user) return;

    try {
      // Mock messages data until schema is updated
      const mockMessages: OrderMessage[] = [
        {
          id: '1',
          order_id: orderId,
          sender_id: user.id,
          message: 'Order has been received and is being processed.',
          sender_type: 'publisher',
          is_read: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  // Send a new message (mock for now)
  const sendMessage = async (orderId: string, message: string) => {
    if (!user || !message.trim()) return;

    try {
      // Mock sending message
      const newMsg: OrderMessage = {
        id: Date.now().toString(),
        order_id: orderId,
        sender_id: user.id,
        message: message.trim(),
        sender_type: userRole === 'publisher' ? 'publisher' : 'buyer',
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');

      toast.success('Message sent');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Workflow templates
  useEffect(() => {
    setWorkflowTemplates([
      {
        id: 'standard',
        name: 'Standard Article Workflow',
        description: 'Standard process for article publications',
        steps: [
          { id: '1', name: 'Content Review', description: 'Review brief and requirements', estimatedDays: 1, required: true },
          { id: '2', name: 'Content Creation', description: 'Write and optimize content', estimatedDays: 2, required: true },
          { id: '3', name: 'Client Review', description: 'Send draft for approval', estimatedDays: 1, required: false },
          { id: '4', name: 'Publication', description: 'Publish on website', estimatedDays: 1, required: true },
          { id: '5', name: 'Verification', description: 'Confirm publication live', estimatedDays: 0, required: true, autoComplete: true }
        ]
      },
      {
        id: 'premium',
        name: 'Premium Content Workflow',
        description: 'Enhanced process for high-value content',
        steps: [
          { id: '1', name: 'Strategy Session', description: 'Discuss content strategy', estimatedDays: 1, required: true },
          { id: '2', name: 'Research & Outline', description: 'Research topic and create outline', estimatedDays: 1, required: true },
          { id: '3', name: 'Content Creation', description: 'Write comprehensive content', estimatedDays: 3, required: true },
          { id: '4', name: 'SEO Optimization', description: 'Optimize for search engines', estimatedDays: 1, required: true },
          { id: '5', name: 'Client Review', description: 'Client approval process', estimatedDays: 2, required: true },
          { id: '6', name: 'Publication', description: 'Publish and promote', estimatedDays: 1, required: true },
          { id: '7', name: 'Performance Tracking', description: 'Monitor performance', estimatedDays: 7, required: false }
        ]
      }
    ]);
  }, []);

  // Filter orders
  const filteredOrders = realTimeOrders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = order.media_outlets?.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.includes(searchTerm);
    
    // Priority logic (mock)
    const isHighPriority = order.price > 300;
    const matchesPriority = priorityFilter === 'all' || 
                           (priorityFilter === 'high' && isHighPriority) ||
                           (priorityFilter === 'normal' && !isHighPriority);
    
    return matchesStatus && matchesSearch && matchesPriority;
  });

  // Get order priority
  const getOrderPriority = (order: OrderWithDetails) => {
    if (order.price > 300) return 'high';
    return 'normal';
  };

  // Get order urgency
  const getOrderUrgency = (order: OrderWithDetails) => {
    const daysOld = Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysOld > 3) return 'urgent';
    if (daysOld > 1) return 'moderate';
    return 'low';
  };

  useEffect(() => {
    loadOrders();
  }, [user, userRole]);

  // Load messages when order is selected
  useEffect(() => {
    if (selectedOrder) {
      fetchMessages(selectedOrder.id);
    }
  }, [selectedOrder]);

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus, publicationUrl?: string) => {
    try {
      await updateOrderStatus(orderId, newStatus, publicationUrl);
      loadOrders();
      
      // Auto-send status update message (mock for now)
      if (selectedOrder && selectedOrder.id === orderId) {
        const statusMessage: OrderMessage = {
          id: Date.now().toString(),
          order_id: orderId,
          sender_id: user?.id || '',
          message: `Order status updated to: ${newStatus}${publicationUrl ? ` - Publication URL: ${publicationUrl}` : ''}`,
          sender_type: 'system',
          is_read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, statusMessage]);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="glass-card p-8 text-center">
              <div className="h-8 w-8 animate-spin mx-auto mb-4 text-primary border-2 border-primary border-t-transparent rounded-full"></div>
              <p className="text-muted-foreground">Loading order management system...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (userRole !== 'publisher') {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <Card className="glass-card p-8 text-center max-w-md mx-auto">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Publisher Access Required</h3>
            <p className="text-muted-foreground">
              This advanced order management system is only available for publishers.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Order Management Pro
            </h1>
            <p className="text-muted-foreground text-lg">
              Advanced workflow management and real-time collaboration
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="glass-button">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
              {filteredOrders.filter(o => o.status === 'requested').length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                  {filteredOrders.filter(o => o.status === 'requested').length}
                </Badge>
              )}
            </Button>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="w-48 glass-button">
                <SelectValue placeholder="Workflow Template" />
              </SelectTrigger>
              <SelectContent>
                {workflowTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="orders">Active Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            {/* Filters */}
            <Card className="glass-card-clean">
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 glass-input"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40 glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="requested">Requested</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="content_received">Content Ready</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-40 glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card className="glass-card-clean shadow-medium">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border/30">
                      <TableHead className="font-semibold">Order</TableHead>
                      <TableHead className="font-semibold">Domain</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Priority</TableHead>
                      <TableHead className="font-semibold">Value</TableHead>
                      <TableHead className="font-semibold">Due Date</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order, index) => {
                      const priority = getOrderPriority(order);
                      const urgency = getOrderUrgency(order);
                      const dueDate = new Date(order.created_at);
                      dueDate.setDate(dueDate.getDate() + (order.media_outlets?.lead_time_days || 7));
                      
                      return (
                        <TableRow 
                          key={order.id} 
                          className="hover:bg-primary/5 transition-colors duration-200 cursor-pointer"
                          onClick={() => setSelectedOrder(order)}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                urgency === 'urgent' ? 'bg-red-500' :
                                urgency === 'moderate' ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`} />
                              <div>
                                <div className="font-semibold">#{order.id.slice(0, 8)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(order.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.media_outlets?.domain}</div>
                              <Badge variant="outline" className="text-xs mt-1">
                                {order.media_outlets?.category}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              order.status === 'requested' ? 'secondary' :
                              order.status === 'accepted' ? 'default' :
                              order.status === 'published' ? 'default' :
                              'outline'
                            } className="glass-button">
                              {order.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={priority === 'high' ? 'destructive' : 'secondary'}>
                              {priority.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-green-600">€{order.price}</span>
                          </TableCell>
                          <TableCell>
                            <div className={`text-sm ${
                              dueDate < new Date() ? 'text-red-600 font-semibold' : 'text-muted-foreground'
                            }`}>
                              {dueDate.toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                  setShowMessageDialog(true);
                                }}
                                className="glass-button"
                              >
                                <MessageSquare className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                }}
                                className="glass-button"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Message Dialog */}
        <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
          <DialogContent className="glass-card max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Order Communication - #{selectedOrder?.id.slice(0, 8)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {messages.map(message => (
                  <div key={message.id} className={`p-3 rounded-lg ${
                    message.sender_type === 'publisher' ? 'bg-primary/10 ml-4' : 'bg-muted/50 mr-4'
                  }`}>
                    <div className="text-sm">{message.message}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(message.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="glass-input"
                  rows={3}
                />
                <Button onClick={() => selectedOrder && sendMessage(selectedOrder.id, newMessage)} className="glass-button-primary">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </main>
    </div>
  );
}