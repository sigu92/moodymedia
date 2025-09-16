import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BillingFormData {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

interface Step3BillingInfoProps {
  onNext?: () => void;
  onValidationChange?: (isValid: boolean) => void;
  initialData?: Partial<BillingFormData>;
}

/**
 * Step 3: Billing Information
 *
 * This is a temporary stub implementation.
 * TODO: Implement full billing information form when rebuilding checkout
 */
export const Step3BillingInfo: React.FC<Step3BillingInfoProps> = ({
  onNext,
  onValidationChange,
  initialData = {}
}) => {
  const [formData, setFormData] = useState<BillingFormData>({
    firstName: initialData.firstName || '',
    lastName: initialData.lastName || '',
    email: initialData.email || '',
    address: initialData.address || '',
    city: initialData.city || '',
    postalCode: initialData.postalCode || '',
    country: initialData.country || ''
  });

  const [isValid, setIsValid] = useState(false);

  // Basic validation
  const validateForm = () => {
    const requiredFields = ['firstName', 'lastName', 'email', 'address', 'city', 'postalCode', 'country'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const valid = requiredFields.every(field => formData[field as keyof BillingFormData]?.trim()) &&
                  emailRegex.test(formData.email);

    setIsValid(valid);
    onValidationChange?.(valid);
    return valid;
  };

  // Update form data and validate
  const updateField = (field: keyof BillingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTimeout(validateForm, 100); // Debounce validation
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Billing Information</h2>
        <p className="text-muted-foreground">
          Please provide your billing details to complete the order.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This is a temporary implementation. The full billing form will be rebuilt.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Billing Details</CardTitle>
          <CardDescription>
            Enter your billing information below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="Enter your email address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Street Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Enter your street address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code *</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => updateField('postalCode', e.target.value)}
                placeholder="Postal code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => updateField('country', e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            {isValid ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            <span className={`text-sm ${isValid ? 'text-green-600' : 'text-yellow-600'}`}>
              {isValid ? 'Form is valid' : 'Please fill in all required fields'}
            </span>
          </div>

          {onNext && (
            <div className="flex justify-end pt-4">
              <Button
                onClick={onNext}
                disabled={!isValid}
                className="min-w-[120px]"
              >
                Continue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
