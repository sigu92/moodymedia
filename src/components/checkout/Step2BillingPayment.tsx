import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CreditCard, Building, FileText, Save, Loader2, CheckCircle } from 'lucide-react';
import { useCheckout } from '@/hooks/useCheckout';
import { useAuth } from '@/contexts/AuthContext';
import { useSettingsStatus } from '@/hooks/useSettings';
import { CheckoutValidationError } from '@/utils/checkoutUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Step2BillingPaymentProps {
  onValidationChange?: (isValid: boolean) => void;
}

type PaymentMethodType = 'stripe' | 'paypal' | 'invoice';

interface BillingFormData {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  taxId: string;
  saveForFuture: boolean;
}

interface PaymentMethodData {
  type: PaymentMethodType;
  poNumber: string;
}

export const Step2BillingPayment: React.FC<Step2BillingPaymentProps> = ({ onValidationChange }) => {
  const { user, session, signOut } = useAuth();
  const { formData, updateFormData, validationErrors } = useCheckout();
  const { settings, loading: settingsLoading } = useSettingsStatus();

  // Form state
  const [billingForm, setBillingForm] = useState<BillingFormData>({
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: '',
    },
    taxId: '',
    saveForFuture: true,
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodData>({
    type: 'stripe',
    poNumber: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [billingSaved, setBillingSaved] = useState(false);

  // Load existing billing data from user settings or checkout form
  useEffect(() => {
    if (formData.billingInfo) {
      setBillingForm({
        firstName: formData.billingInfo.firstName || '',
        lastName: formData.billingInfo.lastName || '',
        company: formData.billingInfo.company || '',
        email: formData.billingInfo.email || user?.email || '',
        phone: formData.billingInfo.phone || '',
        address: {
          street: formData.billingInfo.address?.street || '',
          city: formData.billingInfo.address?.city || '',
          postalCode: formData.billingInfo.address?.postalCode || '',
          country: formData.billingInfo.address?.country || '',
        },
        taxId: formData.billingInfo.taxId || '',
        saveForFuture: true,
      });
    } else if (settings) {
      // Load from user settings if available
      setBillingForm(prev => ({
        ...prev,
        firstName: settings.name?.split(' ')[0] || '',
        lastName: settings.name?.split(' ').slice(1).join(' ') || '',
        company: settings.company_name || '',
        email: settings.primary_email || user?.email || '',
      }));
    } else if (user?.email) {
      setBillingForm(prev => ({
        ...prev,
        email: user.email,
      }));
    }

    if (formData.paymentMethod) {
      setPaymentMethod({
        type: formData.paymentMethod.type || 'stripe',
        poNumber: formData.paymentMethod.poNumber || '',
      });
    }
  }, [formData.billingInfo, formData.paymentMethod, settings, user?.email]);

  // Update checkout form data when local form changes
  useEffect(() => {
    const billingInfo = {
      firstName: billingForm.firstName,
      lastName: billingForm.lastName,
      company: billingForm.company,
      email: billingForm.email,
      phone: billingForm.phone,
      address: billingForm.address,
      taxId: billingForm.taxId,
    };

    const paymentMethodData = {
      type: paymentMethod.type,
      poNumber: paymentMethod.type === 'invoice' ? paymentMethod.poNumber : undefined,
    };

    updateFormData({
      billingInfo,
      paymentMethod: paymentMethodData,
    });
  }, [billingForm, paymentMethod, updateFormData]);

  // Validation
  useEffect(() => {
    const isBillingValid = !!(
      billingForm.firstName.trim() &&
      billingForm.lastName.trim() &&
      billingForm.email.trim() &&
      billingForm.address.street.trim() &&
      billingForm.address.city.trim() &&
      billingForm.address.postalCode.trim() &&
      billingForm.address.country.trim()
    );

    const isPaymentValid = paymentMethod.type === 'invoice'
      ? !!paymentMethod.poNumber.trim()
      : !!paymentMethod.type;

    const isValid = isBillingValid && isPaymentValid;
    onValidationChange?.(isValid);
  }, [billingForm, paymentMethod, onValidationChange]);

  const handleBillingFormChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setBillingForm(prev => {
        const parentValue = prev[parent as keyof BillingFormData];

        // Safely handle nested updates with fallback for undefined parent objects
        const safeParentValue = parentValue && typeof parentValue === 'object' ? parentValue : {};

        return {
          ...prev,
          [parent]: {
            ...safeParentValue,
            [child]: value,
          },
        };
      });
    } else {
      setBillingForm(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handlePaymentMethodChange = (type: PaymentMethodType) => {
    setPaymentMethod(prev => ({
      ...prev,
      type,
      poNumber: type === 'invoice' ? prev.poNumber : '',
    }));
  };

  const handleSaveBillingInfo = async () => {
    // Comprehensive auth validation - check both user and valid session
    if (!user?.id || !session || session.expires_at && session.expires_at * 1000 < Date.now()) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please sign in again to save billing information.",
        variant: "destructive",
      });

      // Optionally trigger sign out to clear invalid session
      try {
        await signOut();
      } catch (error) {
        console.error('Error signing out:', error);
      }

      return;
    }

    setIsLoading(true);

    try {
      // Save billing information to user metadata or settings
      const billingData = {
        billing_first_name: billingForm.firstName,
        billing_last_name: billingForm.lastName,
        billing_company: billingForm.company,
        billing_email: billingForm.email,
        billing_phone: billingForm.phone,
        billing_address_street: billingForm.address.street,
        billing_address_city: billingForm.address.city,
        billing_address_postal: billingForm.address.postalCode,
        billing_address_country: billingForm.address.country,
        billing_tax_id: billingForm.taxId,
      };

      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: billingData,
      });

      if (error) throw error;

      setBillingSaved(true);
      toast({
        title: "Success",
        description: "Billing information saved for future orders",
      });
    } catch (error) {
      console.error('Error saving billing info:', error);
      toast({
        title: "Error",
        description: "Failed to save billing information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFieldError = (fieldName: string): string | undefined => {
    const error = validationErrors.find(error => error.field === fieldName);
    return error?.message;
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading billing information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Billing Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={billingForm.firstName}
                onChange={(e) => handleBillingFormChange('firstName', e.target.value)}
                placeholder="Enter first name"
                className={getFieldError('firstName') ? 'border-destructive' : ''}
              />
              {getFieldError('firstName') && (
                <p className="text-sm text-destructive">{getFieldError('firstName')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={billingForm.lastName}
                onChange={(e) => handleBillingFormChange('lastName', e.target.value)}
                placeholder="Enter last name"
                className={getFieldError('lastName') ? 'border-destructive' : ''}
              />
              {getFieldError('lastName') && (
                <p className="text-sm text-destructive">{getFieldError('lastName')}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company (Optional)</Label>
            <Input
              id="company"
              value={billingForm.company}
              onChange={(e) => handleBillingFormChange('company', e.target.value)}
              placeholder="Enter company name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={billingForm.email}
                onChange={(e) => handleBillingFormChange('email', e.target.value)}
                placeholder="Enter email address"
                className={getFieldError('email') ? 'border-destructive' : ''}
              />
              {getFieldError('email') && (
                <p className="text-sm text-destructive">{getFieldError('email')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={billingForm.phone}
                onChange={(e) => handleBillingFormChange('phone', e.target.value)}
                placeholder="Enter phone number"
                className={getFieldError('phone') ? 'border-destructive' : ''}
              />
              {getFieldError('phone') && (
                <p className="text-sm text-destructive">{getFieldError('phone')}</p>
              )}
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Address *</Label>

            <div className="space-y-2">
              <Label htmlFor="street">Street Address *</Label>
              <Input
                id="street"
                value={billingForm.address.street}
                onChange={(e) => handleBillingFormChange('address.street', e.target.value)}
                placeholder="Enter street address"
                className={getFieldError('street') ? 'border-destructive' : ''}
              />
              {getFieldError('street') && (
                <p className="text-sm text-destructive">{getFieldError('street')}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={billingForm.address.city}
                  onChange={(e) => handleBillingFormChange('address.city', e.target.value)}
                  placeholder="Enter city"
                  className={getFieldError('city') ? 'border-destructive' : ''}
                />
                {getFieldError('city') && (
                  <p className="text-sm text-destructive">{getFieldError('city')}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input
                  id="postalCode"
                  value={billingForm.address.postalCode}
                  onChange={(e) => handleBillingFormChange('address.postalCode', e.target.value)}
                  placeholder="Enter postal code"
                  className={getFieldError('postalCode') ? 'border-destructive' : ''}
                />
                {getFieldError('postalCode') && (
                  <p className="text-sm text-destructive">{getFieldError('postalCode')}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select
                  value={billingForm.address.country}
                  onValueChange={(value) => handleBillingFormChange('address.country', value)}
                >
                  <SelectTrigger className={getFieldError('country') ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="AT">Austria</SelectItem>
                    <SelectItem value="CH">Switzerland</SelectItem>
                    <SelectItem value="NL">Netherlands</SelectItem>
                    <SelectItem value="BE">Belgium</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                  </SelectContent>
                </Select>
                {getFieldError('country') && (
                  <p className="text-sm text-destructive">{getFieldError('country')}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxId">Tax ID / VAT Number (Optional)</Label>
            <Input
              id="taxId"
              value={billingForm.taxId}
              onChange={(e) => handleBillingFormChange('taxId', e.target.value)}
              placeholder="Enter tax ID or VAT number"
              className={getFieldError('taxId') ? 'border-destructive' : ''}
            />
            {getFieldError('taxId') && (
              <p className="text-sm text-destructive">{getFieldError('taxId')}</p>
            )}
          </div>

          {/* Save for Future Orders */}
          <div className="flex items-center space-x-2 pt-4">
            <Checkbox
              id="saveForFuture"
              checked={billingForm.saveForFuture}
              onCheckedChange={(checked) => setBillingForm(prev => ({ ...prev, saveForFuture: checked as boolean }))}
            />
            <Label htmlFor="saveForFuture" className="text-sm">
              Save billing information for future orders
            </Label>
          </div>

          {billingForm.saveForFuture && (
            <Button
              onClick={handleSaveBillingInfo}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : billingSaved ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {billingSaved ? 'Billing Info Saved' : 'Save Billing Information'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Method Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="stripe"
                name="paymentMethod"
                value="stripe"
                checked={paymentMethod.type === 'stripe'}
                onChange={() => handlePaymentMethodChange('stripe')}
                className="w-4 h-4 text-primary"
              />
              <Label htmlFor="stripe" className="flex items-center gap-2 cursor-pointer">
                <CreditCard className="h-4 w-4" />
                Credit Card / Debit Card (Stripe)
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="paypal"
                name="paymentMethod"
                value="paypal"
                checked={paymentMethod.type === 'paypal'}
                onChange={() => handlePaymentMethodChange('paypal')}
                className="w-4 h-4 text-primary"
              />
              <Label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer">
                <Building className="h-4 w-4" />
                PayPal
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="invoice"
                name="paymentMethod"
                value="invoice"
                checked={paymentMethod.type === 'invoice'}
                onChange={() => handlePaymentMethodChange('invoice')}
                className="w-4 h-4 text-primary"
              />
              <Label htmlFor="invoice" className="flex items-center gap-2 cursor-pointer">
                <FileText className="h-4 w-4" />
                Invoice Payment
              </Label>
            </div>
          </div>

          {getFieldError('paymentType') && (
            <p className="text-sm text-destructive">{getFieldError('paymentType')}</p>
          )}

          {/* PO Number for Invoice Payment */}
          {paymentMethod.type === 'invoice' && (
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="poNumber">Purchase Order Number *</Label>
              <Input
                id="poNumber"
                value={paymentMethod.poNumber}
                onChange={(e) => setPaymentMethod(prev => ({ ...prev, poNumber: e.target.value }))}
                placeholder="Enter PO number"
                className={getFieldError('poNumber') ? 'border-destructive' : ''}
              />
              {getFieldError('poNumber') && (
                <p className="text-sm text-destructive">{getFieldError('poNumber')}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Invoice payment requires a valid purchase order number. Payment terms: Net 30 days.
              </p>
            </div>
          )}

          {/* Payment Method Info */}
          {paymentMethod.type === 'stripe' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <CreditCard className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Secure Payment Processing</p>
                  <p className="mt-1">
                    Your payment information is securely processed by Stripe. We accept all major credit and debit cards.
                  </p>
                </div>
              </div>
            </div>
          )}

          {paymentMethod.type === 'paypal' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Building className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">PayPal Payment</p>
                  <p className="mt-1">
                    You will be redirected to PayPal to complete your payment securely.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* General Validation Errors */}
      {validationErrors.some(error => error.field === 'general' || error.field === 'auth') && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">
              {validationErrors.find(error => error.field === 'general' || error.field === 'auth')?.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
