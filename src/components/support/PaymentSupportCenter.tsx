import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HelpCircle,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Search,
  BookOpen,
  CreditCard,
  RefreshCw,
  Shield,
  FileText,
  Send
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface SupportTicket {
  id: string;
  subject: string;
  category: 'payment_failed' | 'card_declined' | 'refund_request' | 'technical_issue' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_for_customer' | 'resolved' | 'closed';
  description: string;
  userId: string;
  sessionId?: string;
  errorCode?: string;
  createdAt: string;
  updatedAt: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  notHelpful: number;
}

export const PaymentSupportCenter: React.FC = () => {
  const { user } = useAuth();
  const [faqFilter, setFaqFilter] = useState<'all' | PaymentCategory>('all');
  const [ticketCategory, setTicketCategory] = useState<PaymentCategory>('payment_failed');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [activeTab, setActiveTab] = useState<'faq' | 'contact'>('faq');
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    sessionId: '',
    errorCode: ''
  });

  // Mock FAQ data
  const faqs: FAQ[] = [
    {
      id: '1',
      question: 'Why was my payment declined?',
      answer: 'Payment declines can happen for several reasons: insufficient funds, expired card, incorrect billing information, or bank security measures. Try using a different payment method or contact your bank.',
      category: 'payment_failed',
      helpful: 45,
      notHelpful: 3
    },
    {
      id: '2',
      question: 'How long do refunds take to process?',
      answer: 'Refunds typically take 5-10 business days to appear in your account, depending on your bank. You\'ll receive an email confirmation when the refund is processed.',
      category: 'refund_request',
      helpful: 38,
      notHelpful: 2
    },
    {
      id: '3',
      question: 'Can I update my payment method after placing an order?',
      answer: 'Yes, you can update your payment method in your account settings. For pending orders, contact support to update the payment method before processing.',
      category: 'technical_issue',
      helpful: 29,
      notHelpful: 1
    },
    {
      id: '4',
      question: 'Is my payment information secure?',
      answer: 'Yes, we use industry-standard encryption and work with Stripe for secure payment processing. We never store your full credit card information on our servers.',
      category: 'technical_issue',
      helpful: 52,
      notHelpful: 0
    },
    {
      id: '5',
      question: 'What should I do if I see duplicate charges?',
      answer: 'If you see duplicate charges, first check if they are pending authorizations (which will drop off). If they are actual charges, contact support immediately with your transaction IDs.',
      category: 'payment_failed',
      helpful: 31,
      notHelpful: 2
    }
  ];

  const filteredFAQs = faqs.filter(faq => {
    // First check category match
    const categoryMatch = faqFilter === 'all' || faq.category === faqFilter;
    
    // If no search query, return based on category only
    if (searchQuery.trim() === '') {
      return categoryMatch;
    }
    
    // If search query exists, require both category AND text match
    const textMatch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                     faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    
    return categoryMatch && textMatch;
  });

  const handleSubmitTicket = async () => {
    if (!ticketForm.subject || !ticketForm.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in both subject and description.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingTicket(true);

    try {
      // In production, submit to support system
      const ticket: SupportTicket = {
        id: `ticket_${Date.now()}`,
        subject: ticketForm.subject,
        category: ticketCategory,
        priority: 'medium',
        status: 'open',
        description: ticketForm.description,
        userId: user?.id || '',
        sessionId: ticketForm.sessionId || undefined,
        errorCode: ticketForm.errorCode || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Support ticket submitted:', ticket);

      toast({
        title: "Support Ticket Created",
        description: `Your ticket #${ticket.id} has been submitted. We'll respond within 24 hours.`,
        duration: 8000,
      });

      // Reset form
      setTicketForm({
        subject: '',
        description: '',
        sessionId: '',
        errorCode: ''
      });

    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Failed to submit support ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const renderContactOptions = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="text-center">
        <CardContent className="pt-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-semibold mb-2">Email Support</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get help via email within 24 hours
          </p>
          <Button variant="outline" size="sm" className="w-full">
            Create Ticket
          </Button>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent className="pt-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-semibold mb-2">Live Chat</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Chat with support agents in real-time
          </p>
          <Button variant="outline" size="sm" className="w-full">
            Start Chat
          </Button>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent className="pt-6">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="h-6 w-6 text-orange-600" />
          </div>
          <h3 className="font-semibold mb-2">Phone Support</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Call us for urgent payment issues
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => window.open('tel:+1-555-SUPPORT', '_self')}
          >
            +1-555-SUPPORT
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderQuickActions = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button variant="outline" size="sm" className="h-auto flex-col py-3">
            <CreditCard className="h-5 w-5 mb-2" />
            <span className="text-xs">Retry Payment</span>
          </Button>
          <Button variant="outline" size="sm" className="h-auto flex-col py-3">
            <RefreshCw className="h-5 w-5 mb-2" />
            <span className="text-xs">Check Status</span>
          </Button>
          <Button variant="outline" size="sm" className="h-auto flex-col py-3">
            <FileText className="h-5 w-5 mb-2" />
            <span className="text-xs">Download Receipt</span>
          </Button>
          <Button variant="outline" size="sm" className="h-auto flex-col py-3">
            <AlertTriangle className="h-5 w-5 mb-2" />
            <span className="text-xs">Report Issue</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSupportHours = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Support Hours
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm">Email Support</span>
          <Badge variant="outline">24/7</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">Live Chat</span>
          <Badge variant="outline">9 AM - 9 PM EST</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">Phone Support</span>
          <Badge variant="outline">9 AM - 6 PM EST</Badge>
        </div>
        <Separator />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span>Currently online - Average response time: 2 hours</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <HelpCircle className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Payment Support Center</h1>
          <p className="text-muted-foreground">Get help with payment issues and questions</p>
        </div>
      </div>

      {renderContactOptions()}
      {renderQuickActions()}
      {renderSupportHours()}

      <Tabs value={activeTab} onValueChange={(value) => {
        if (value === 'faq' || value === 'contact') {
          setActiveTab(value);
        }
      }} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Contact Support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search FAQ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={faqFilter}
                  onChange={(e) => setFaqFilter(e.target.value as 'all' | PaymentCategory)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="payment_failed">Payment Failed</option>
                  <option value="card_declined">Card Declined</option>
                  <option value="refund_request">Refunds</option>
                  <option value="technical_issue">Technical Issues</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredFAQs.map((faq) => (
                  <Card key={faq.id} className="p-4">
                    <h3 className="font-medium mb-2">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{faq.answer}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          {faq.helpful} helpful
                        </span>
                        <span>{faq.notHelpful} not helpful</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          👍 Helpful
                        </Button>
                        <Button variant="ghost" size="sm">
                          👎 Not helpful
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
              <p className="text-sm text-muted-foreground">
                Can't find what you're looking for? Create a support ticket and we'll help you out.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                    placeholder="Brief description of your issue"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value as PaymentCategory)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="payment_failed">Payment Failed</option>
                    <option value="card_declined">Card Declined</option>
                    <option value="refund_request">Refund Request</option>
                    <option value="technical_issue">Technical Issue</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionId">Session ID (Optional)</Label>
                  <Input
                    id="sessionId"
                    value={ticketForm.sessionId}
                    onChange={(e) => setTicketForm({...ticketForm, sessionId: e.target.value})}
                    placeholder="cs_test_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="errorCode">Error Code (Optional)</Label>
                  <Input
                    id="errorCode"
                    value={ticketForm.errorCode}
                    onChange={(e) => setTicketForm({...ticketForm, errorCode: e.target.value})}
                    placeholder="card_declined, insufficient_funds, etc."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                  placeholder="Please describe your issue in detail. Include any error messages you saw and what you were trying to do when the problem occurred."
                  rows={6}
                />
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Privacy Notice</p>
                  <p className="text-blue-700 mt-1">
                    Your support request will be handled confidentially. We never share your information with third parties.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSubmitTicket}
                disabled={isSubmittingTicket}
                className="w-full"
                size="lg"
              >
                {isSubmittingTicket ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Support Ticket
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
