import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  CreditCard, 
  Mail, 
  Shield, 
  Trash2, 
  Star, 
  Plus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useCustomer } from '@/hooks/useCustomer';
import { useAuth } from '@/contexts/AuthContext';
import { stripeConfig } from '@/config/stripe';
import { toast } from '@/hooks/use-toast';

export const CustomerManagement: React.FC = () => {
  const { user } = useAuth();
  const {
    profile,
    paymentMethods,
    isLoading,
    error,
    createCustomer,
    updateCustomer,
    syncCustomer,
    setDefaultPaymentMethod,
    removePaymentMethod,
    hasStripeCustomer,
    getDefaultPaymentMethod
  } = useCustomer();

  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerName, setCustomerName] = useState('');

  const handleCreateCustomer = async () => {
    if (!customerEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address for the customer account.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingCustomer(true);
    
    try {
      const success = await createCustomer(customerEmail, customerName || undefined);
      if (success) {
        setCustomerName('');
      }
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleSyncCustomer = async () => {
    setIsSyncing(true);
    
    try {
      await syncCustomer();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    await setDefaultPaymentMethod(paymentMethodId);
  };

  const handleRemovePaymentMethod = async (paymentMethodId: string, isDefault: boolean) => {
    if (isDefault) {
      toast({
        title: "Cannot Remove Default",
        description: "Please set a different payment method as default before removing this one.",
        variant: "destructive",
      });
      return;
    }

    await removePaymentMethod(paymentMethodId);
  };

  const formatCardBrand = (brand: string): string => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const formatExpiryDate = (month: number, year: number): string => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  const defaultPaymentMethod = getDefaultPaymentMethod();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading customer information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <User className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Customer Management</h2>
        {stripeConfig.isTestMode && (
          <Badge variant="secondary">Test Mode</Badge>
        )}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span>Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Customer Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasStripeCustomer ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Stripe Customer Active</p>
                    <p className="text-sm text-muted-foreground">
                      Customer ID: {profile?.stripe_customer_id}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSyncCustomer}
                  disabled={isSyncing}
                  variant="outline"
                  size="sm"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Email:</span> {profile?.stripe_customer_email}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {
                    profile?.stripe_customer_created_at 
                      ? new Date(profile.stripe_customer_created_at).toLocaleDateString()
                      : 'Unknown'
                  }
                </div>
              </div>

              {stripeConfig.shouldUseMockPayments() && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Development Mode:</strong> This is a test customer account. 
                    No real payment processing will occur.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium">No Stripe Customer</p>
                  <p className="text-sm text-muted-foreground">
                    Create a customer account to enable payments and save payment methods.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Email Address *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Name (Optional)</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer Name"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleCreateCustomer}
                  disabled={isCreatingCustomer || !customerEmail}
                  className="w-full"
                >
                  {isCreatingCustomer ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating Customer...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Stripe Customer
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      {hasStripeCustomer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Saved Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentMethods.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No payment methods saved</p>
                <p className="text-sm">
                  Payment methods will be saved automatically when you make a payment.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((paymentMethod) => {
                  const isDefault = defaultPaymentMethod?.id === paymentMethod.id;
                  
                  return (
                    <div
                      key={paymentMethod.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-6 bg-gray-100 rounded">
                          <CreditCard className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {formatCardBrand(paymentMethod.card?.brand || 'card')} 
                              •••• {paymentMethod.card?.last4}
                            </span>
                            {isDefault && (
                              <Badge variant="default" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Expires {formatExpiryDate(
                              paymentMethod.card?.exp_month || 0, 
                              paymentMethod.card?.exp_year || 0
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isDefault && (
                          <Button
                            onClick={() => handleSetDefaultPaymentMethod(paymentMethod.id)}
                            variant="outline"
                            size="sm"
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Set Default
                          </Button>
                        )}
                        <Button
                          onClick={() => handleRemovePaymentMethod(paymentMethod.id, isDefault)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {stripeConfig.shouldUseMockPayments() && paymentMethods.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-amber-800">
                  <strong>Development Mode:</strong> These are mock payment methods for testing. 
                  In production, these would be real saved payment methods.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer Email Verification */}
      {hasStripeCustomer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Address</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.stripe_customer_email}
                </p>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              This email address is used for payment receipts and customer communication. 
              Updates to this email will be synchronized with your Stripe customer account.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
