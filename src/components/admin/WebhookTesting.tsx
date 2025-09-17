import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Webhook, 
  Play, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Trash2, 
  RefreshCw,
  AlertTriangle,
  Info,
  ExternalLink
} from 'lucide-react';
import { webhookTester, mockStripeEvents } from '@/utils/webhookTesting';
import { toast } from '@/hooks/use-toast';

// Define proper types for webhook testing
interface WebhookTestResult {
  test: string;
  success: boolean;
  error?: string;
  response?: Record<string, unknown>;
}

interface WebhookTestSummary {
  total: number;
  passed: number;
  failed: number;
}

interface WebhookTestResults {
  results: WebhookTestResult[];
  summary: WebhookTestSummary;
}

interface WebhookResponse {
  success: boolean;
  response?: Record<string, unknown>;
  error?: string;
}

export const WebhookTesting: React.FC = () => {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  
  const [testResults, setTestResults] = useState<WebhookTestResults | null>(null);
  const [customEventType, setCustomEventType] = useState('checkout.session.completed');
  const [customSessionId, setCustomSessionId] = useState('');
  const [customPaymentIntentId, setCustomPaymentIntentId] = useState('');
  const [customCustomerId, setCustomCustomerId] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [webhookResponse, setWebhookResponse] = useState<WebhookResponse | null>(null);

  const handleRunAllTests = async () => {
    setIsRunningTests(true);
    setTestResults(null);

    try {
      const results = await webhookTester.runTests();
      setTestResults(results);
      
      if (results.summary.failed === 0) {
        toast({
          title: "All Tests Passed! ✅",
          description: `${results.summary.passed}/${results.summary.total} webhook tests completed successfully.`,
        });
      } else {
        toast({
          title: "Some Tests Failed ⚠️",
          description: `${results.summary.passed}/${results.summary.total} tests passed. Check details below.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: "Test Error",
        description: "Failed to run webhook tests. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleSendCustomWebhook = async () => {
    setIsSendingWebhook(true);
    setWebhookResponse(null);

    try {
      let event;
      
      switch (customEventType) {
        case 'checkout.session.completed':
          if (!customSessionId) {
            toast({
              title: "Missing Session ID",
              description: "Please enter a session ID for checkout.session.completed event.",
              variant: "destructive",
            });
            return;
          }
          event = mockStripeEvents.checkoutSessionCompleted(customSessionId, customCustomerId || undefined);
          break;
          
        case 'payment_intent.succeeded':
          if (!customPaymentIntentId) {
            toast({
              title: "Missing Payment Intent ID",
              description: "Please enter a payment intent ID for payment_intent.succeeded event.",
              variant: "destructive",
            });
            return;
          }
          event = mockStripeEvents.paymentIntentSucceeded(customPaymentIntentId, customCustomerId || undefined);
          break;
          
        case 'payment_intent.payment_failed':
          if (!customPaymentIntentId) {
            toast({
              title: "Missing Payment Intent ID",
              description: "Please enter a payment intent ID for payment_intent.payment_failed event.",
              variant: "destructive",
            });
            return;
          }
          event = mockStripeEvents.paymentIntentFailed(customPaymentIntentId, customCustomerId || undefined);
          break;
          
        case 'customer.created':
          if (!customCustomerId || !customEmail) {
            toast({
              title: "Missing Customer Details",
              description: "Please enter both customer ID and email for customer.created event.",
              variant: "destructive",
            });
            return;
          }
          event = mockStripeEvents.customerCreated(customCustomerId, customEmail);
          break;
          
        default:
          toast({
            title: "Unknown Event Type",
            description: "Selected event type is not supported.",
            variant: "destructive",
          });
          return;
      }

      let result;
      
      // Route to the appropriate sender based on event type
      if (customEventType === 'checkout.session.completed') {
        result = await webhookTester.sendCheckoutCompleted(customSessionId, customCustomerId);
      } else {
        // For other event types, send the constructed event
        result = await webhookTester.sendEvent(event);
      }
      
      setWebhookResponse(result);

      if (result.success) {
        toast({
          title: "Webhook Sent! ✅",
          description: "Custom webhook event sent successfully.",
        });
      } else {
        toast({
          title: "Webhook Failed ❌",
          description: result.error || "Failed to send webhook.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Webhook send error:', error);
      toast({
        title: "Webhook Error",
        description: "Failed to send webhook. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsSendingWebhook(false);
    }
  };

  const handleCreateTestOrder = async () => {
    if (!customSessionId) {
      toast({
        title: "Missing Session ID",
        description: "Please enter a session ID to create a test order.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingOrder(true);

    try {
      const result = await webhookTester.createTestOrder(customSessionId);
      
      if (result.success) {
        toast({
          title: "Test Order Created! ✅",
          description: `Order ID: ${result.orderId}`,
        });
      } else {
        toast({
          title: "Failed to Create Order ❌",
          description: result.error || "Unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Create order error:', error);
      toast({
        title: "Create Order Error",
        description: "Failed to create test order. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleCleanupTestOrders = async () => {
    setIsCleaningUp(true);

    try {
      const result = await webhookTester.cleanupTestOrders();
      
      if (result.success) {
        toast({
          title: "Cleanup Complete! ✅",
          description: `Deleted ${result.deletedCount} test orders.`,
        });
      } else {
        toast({
          title: "Cleanup Failed ❌",
          description: result.error || "Unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      toast({
        title: "Cleanup Error",
        description: "Failed to cleanup test orders. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const generateRandomIds = () => {
    const timestamp = Date.now();
    setCustomSessionId(`cs_test_${timestamp}`);
    setCustomPaymentIntentId(`pi_test_${timestamp}`);
    setCustomCustomerId(`cus_test_${timestamp}`);
    setCustomEmail(`test+${timestamp}@example.com`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Webhook className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Webhook Testing</h2>
        <Badge variant="secondary">Development</Badge>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm text-blue-800">
              <p className="font-medium">Development Webhook Testing</p>
              <p>
                This tool allows you to test Stripe webhooks in development mode. Since Stripe can't reach localhost directly,
                we simulate webhook events by sending them to your local Supabase edge function.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span>Webhook URL:</span>
                <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                  {webhookTester.getWebhookUrl()}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(webhookTester.getWebhookUrl(), '_blank')}
                  className="h-6 px-2"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test All Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Run All Webhook Tests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Runs a comprehensive test suite covering all webhook event types with various scenarios.
          </p>
          
          <Button
            onClick={handleRunAllTests}
            disabled={isRunningTests}
            className="w-full"
          >
            {isRunningTests ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Running Tests...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>

          {/* Test Results */}
          {testResults && (
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Test Results</h4>
                <div className="flex gap-2">
                  <Badge variant={testResults.summary.failed === 0 ? "default" : "destructive"}>
                    {testResults.summary.passed}/{testResults.summary.total} Passed
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                {testResults.results.map((result: WebhookTestResult, index: number) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">{result.test}</span>
                    </div>
                    {result.error && (
                      <span className="text-sm text-red-600">{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Webhook Sender */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Send Custom Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Send individual webhook events with custom parameters.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={generateRandomIds}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Generate IDs
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type</Label>
              <Select value={customEventType} onValueChange={setCustomEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkout.session.completed">checkout.session.completed</SelectItem>
                  <SelectItem value="payment_intent.succeeded">payment_intent.succeeded</SelectItem>
                  <SelectItem value="payment_intent.payment_failed">payment_intent.payment_failed</SelectItem>
                  <SelectItem value="customer.created">customer.created</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customCustomerId">Customer ID</Label>
              <Input
                id="customCustomerId"
                value={customCustomerId}
                onChange={(e) => setCustomCustomerId(e.target.value)}
                placeholder="cus_test_customer"
              />
            </div>

            {(customEventType === 'checkout.session.completed') && (
              <div className="space-y-2">
                <Label htmlFor="customSessionId">Session ID *</Label>
                <Input
                  id="customSessionId"
                  value={customSessionId}
                  onChange={(e) => setCustomSessionId(e.target.value)}
                  placeholder="cs_test_session"
                  required
                />
              </div>
            )}

            {(customEventType === 'payment_intent.succeeded' || customEventType === 'payment_intent.payment_failed') && (
              <div className="space-y-2">
                <Label htmlFor="customPaymentIntentId">Payment Intent ID *</Label>
                <Input
                  id="customPaymentIntentId"
                  value={customPaymentIntentId}
                  onChange={(e) => setCustomPaymentIntentId(e.target.value)}
                  placeholder="pi_test_payment"
                  required
                />
              </div>
            )}

            {customEventType === 'customer.created' && (
              <div className="space-y-2">
                <Label htmlFor="customEmail">Email *</Label>
                <Input
                  id="customEmail"
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="test@example.com"
                  required
                />
              </div>
            )}
          </div>

          <Button
            onClick={handleSendCustomWebhook}
            disabled={isSendingWebhook}
            className="w-full"
          >
            {isSendingWebhook ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Send Webhook
              </>
            )}
          </Button>

          {/* Webhook Response */}
          {webhookResponse && (
            <div className="mt-4">
              <Label>Response</Label>
              <Textarea
                value={JSON.stringify(webhookResponse, null, 2)}
                readOnly
                className="mt-2 font-mono text-sm"
                rows={8}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Test Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create test orders and clean up test data for webhook testing.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleCreateTestOrder}
              disabled={isCreatingOrder || !customSessionId}
              variant="outline"
              className="flex-1"
            >
              {isCreatingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Create Test Order
                </>
              )}
            </Button>

            <Button
              onClick={handleCleanupTestOrders}
              disabled={isCleaningUp}
              variant="outline"
              className="flex-1"
            >
              {isCleaningUp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cleanup Test Orders
                </>
              )}
            </Button>
          </div>

          {!customSessionId && (
            <p className="text-sm text-amber-600">
              Enter a Session ID above to create test orders.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
