import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Settings as SettingsIcon,
  User,
  Building,
  MapPin,
  CreditCard,
  FileText,
  Shield,
  Save,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Organization interface matching Profile.tsx
interface Organization {
  id: string;
  name: string;
  country: string;
  vat_number?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  postal_code?: string;
  state_province?: string;
  business_registration_number?: string;
  organizational_number?: string;
  tax_id?: string;
  contact_person_name?: string;
  contact_person_email?: string;
  phone_number?: string;
  website?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_routing_number?: string;
  iban?: string;
  swift_bic?: string;
  payment_terms?: string;
  default_currency?: string;
  invoice_notes?: string;
  created_at: string;
  updated_at?: string;
}

const Settings: React.FC = () => {
  const { user, userRole, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);

  // Organization form data
  const [orgForm, setOrgForm] = useState({
    name: '',
    country: '',
    vatNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    stateProvince: '',
    businessRegistrationNumber: '',
    organizationalNumber: '',
    taxId: '',
    contactPersonName: '',
    contactPersonEmail: '',
    phoneNumber: '',
    website: '',
    bankName: '',
    bankAccountNumber: '',
    bankRoutingNumber: '',
    iban: '',
    swiftBic: '',
    paymentTerms: '30 days',
    defaultCurrency: 'EUR',
    invoiceNotes: ''
  });

  // Personal form data
  const [personalForm, setPersonalForm] = useState({
    displayName: '',
    bio: ''
  });

  useEffect(() => {
    if (user) {
      fetchOrganization();
    }
  }, [user]);

  const fetchOrganization = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch organization if user has one
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profileData?.organization_id) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profileData.organization_id)
          .single();

        if (!orgError) {
          setOrganization(orgData);
          setOrgForm({
            name: orgData.name || '',
            country: orgData.country || '',
            vatNumber: orgData.vat_number || '',
            addressLine1: orgData.address_line_1 || '',
            addressLine2: orgData.address_line_2 || '',
            city: orgData.city || '',
            postalCode: orgData.postal_code || '',
            stateProvince: orgData.state_province || '',
            businessRegistrationNumber: orgData.business_registration_number || '',
            organizationalNumber: orgData.organizational_number || '',
            taxId: orgData.tax_id || '',
            contactPersonName: orgData.contact_person_name || '',
            contactPersonEmail: orgData.contact_person_email || '',
            phoneNumber: orgData.phone_number || '',
            website: orgData.website || '',
            bankName: orgData.bank_name || '',
            bankAccountNumber: orgData.bank_account_number || '',
            bankRoutingNumber: orgData.bank_routing_number || '',
            iban: orgData.iban || '',
            swiftBic: orgData.swift_bic || '',
            paymentTerms: orgData.payment_terms || '30 days',
            defaultCurrency: orgData.default_currency || 'EUR',
            invoiceNotes: orgData.invoice_notes || ''
          });
        }
      }

      // Set personal form data
      setPersonalForm({
        displayName: user.user_metadata?.display_name || '',
        bio: user.user_metadata?.bio || ''
      });

    } catch (error) {
      console.error('Error fetching organization:', error);
      toast({
        title: "Error",
        description: "Failed to load organization information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePersonal = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          display_name: personalForm.displayName,
          bio: personalForm.bio
        }
      });

      if (authError) throw authError;

      toast({
        title: "Success",
        description: "Personal information updated successfully",
      });

      fetchOrganization(); // Refresh data

    } catch (error) {
      console.error('Error saving personal info:', error);
      toast({
        title: "Error",
        description: "Failed to update personal information",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!user) return;

    try {
      setSaving(true);

      if (organization) {
        // Update existing organization
        const { error } = await supabase
          .from('organizations')
          .update({
            name: orgForm.name,
            country: orgForm.country,
            vat_number: orgForm.vatNumber || null,
            address_line_1: orgForm.addressLine1 || null,
            address_line_2: orgForm.addressLine2 || null,
            city: orgForm.city || null,
            postal_code: orgForm.postalCode || null,
            state_province: orgForm.stateProvince || null,
            business_registration_number: orgForm.businessRegistrationNumber || null,
            organizational_number: orgForm.organizationalNumber || null,
            tax_id: orgForm.taxId || null,
            contact_person_name: orgForm.contactPersonName || null,
            contact_person_email: orgForm.contactPersonEmail || null,
            phone_number: orgForm.phoneNumber || null,
            website: orgForm.website || null,
            bank_name: orgForm.bankName || null,
            bank_account_number: orgForm.bankAccountNumber || null,
            bank_routing_number: orgForm.bankRoutingNumber || null,
            iban: orgForm.iban || null,
            swift_bic: orgForm.swiftBic || null,
            payment_terms: orgForm.paymentTerms,
            default_currency: orgForm.defaultCurrency,
            invoice_notes: orgForm.invoiceNotes || null
          })
          .eq('id', organization.id);

        if (error) throw error;
      } else {
        // Create new organization
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: orgForm.name,
            country: orgForm.country,
            vat_number: orgForm.vatNumber || null,
            address_line_1: orgForm.addressLine1 || null,
            address_line_2: orgForm.addressLine2 || null,
            city: orgForm.city || null,
            postal_code: orgForm.postalCode || null,
            state_province: orgForm.stateProvince || null,
            business_registration_number: orgForm.businessRegistrationNumber || null,
            organizational_number: orgForm.organizationalNumber || null,
            tax_id: orgForm.taxId || null,
            contact_person_name: orgForm.contactPersonName || null,
            contact_person_email: orgForm.contactPersonEmail || null,
            phone_number: orgForm.phoneNumber || null,
            website: orgForm.website || null,
            bank_name: orgForm.bankName || null,
            bank_account_number: orgForm.bankAccountNumber || null,
            bank_routing_number: orgForm.bankRoutingNumber || null,
            iban: orgForm.iban || null,
            swift_bic: orgForm.swiftBic || null,
            payment_terms: orgForm.paymentTerms,
            default_currency: orgForm.defaultCurrency,
            invoice_notes: orgForm.invoiceNotes || null
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // Link organization to profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          const { error: linkError } = await supabase
            .from('profiles')
            .update({
              organization_id: newOrg.id
            })
            .eq('id', profileData.id);

          if (linkError) throw linkError;
        }
      }

      toast({
        title: "Success",
        description: "Organization information updated successfully",
      });

      fetchOrganization(); // Refresh data

    } catch (error) {
      console.error('Error saving organization:', error);
      toast({
        title: "Error",
        description: "Failed to update organization information",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings and organization information
          </p>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Email cannot be changed from this interface
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={personalForm.displayName}
                      onChange={(e) => setPersonalForm(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="Your display name"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={personalForm.bio}
                    onChange={(e) => setPersonalForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself..."
                    className="mt-2"
                    rows={3}
                  />
                </div>

                <Button onClick={handleSavePersonal} disabled={saving} className="w-full md:w-auto">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Personal Information
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organization Information Tab */}
          <TabsContent value="organization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Organization Information
                </CardTitle>
                <CardDescription>
                  Complete organization details for professional invoicing
                  {userRole === 'publisher' && ' (Required for publishers to receive payments)'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="orgName">Organization Name *</Label>
                      <Input
                        id="orgName"
                        value={orgForm.name}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Your company name"
                        className="mt-2"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <Select value={orgForm.country} onValueChange={(value) => setOrgForm(prev => ({ ...prev, country: value }))}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SE">Sweden</SelectItem>
                          <SelectItem value="NO">Norway</SelectItem>
                          <SelectItem value="DK">Denmark</SelectItem>
                          <SelectItem value="FI">Finland</SelectItem>
                          <SelectItem value="DE">Germany</SelectItem>
                          <SelectItem value="UK">United Kingdom</SelectItem>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                          <SelectItem value="NL">Netherlands</SelectItem>
                          <SelectItem value="FR">France</SelectItem>
                          <SelectItem value="ES">Spain</SelectItem>
                          <SelectItem value="IT">Italy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Business Registration */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Business Registration
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vatNumber">VAT Number</Label>
                      <Input
                        id="vatNumber"
                        value={orgForm.vatNumber}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, vatNumber: e.target.value }))}
                        placeholder="VAT registration number"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="businessRegNumber">Business Registration Number</Label>
                      <Input
                        id="businessRegNumber"
                        value={orgForm.businessRegistrationNumber}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, businessRegistrationNumber: e.target.value }))}
                        placeholder="Business registration number"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="orgNumber">Organizational Number (Sweden)</Label>
                      <Input
                        id="orgNumber"
                        value={orgForm.organizationalNumber}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, organizationalNumber: e.target.value }))}
                        placeholder="SE organizational number"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="taxId">Tax ID</Label>
                      <Input
                        id="taxId"
                        value={orgForm.taxId}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, taxId: e.target.value }))}
                        placeholder="Tax identification number"
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactName">Contact Person Name</Label>
                      <Input
                        id="contactName"
                        value={orgForm.contactPersonName}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, contactPersonName: e.target.value }))}
                        placeholder="Contact person name"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={orgForm.contactPersonEmail}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, contactPersonEmail: e.target.value }))}
                        placeholder="contact@company.com"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={orgForm.phoneNumber}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="+46 70 123 45 67"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={orgForm.website}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://www.company.com"
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveOrganization}
                  disabled={saving || !orgForm.name || !orgForm.country}
                  className="w-full"
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Organization Information
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Address Information Tab */}
          <TabsContent value="address" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </CardTitle>
                <CardDescription>
                  Your organization's billing and shipping address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="addressLine1">Address Line 1</Label>
                    <Input
                      id="addressLine1"
                      value={orgForm.addressLine1}
                      onChange={(e) => setOrgForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                      placeholder="Street address"
                      className="mt-2"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      value={orgForm.addressLine2}
                      onChange={(e) => setOrgForm(prev => ({ ...prev, addressLine2: e.target.value }))}
                      placeholder="Apartment, suite, etc. (optional)"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={orgForm.city}
                      onChange={(e) => setOrgForm(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={orgForm.postalCode}
                      onChange={(e) => setOrgForm(prev => ({ ...prev, postalCode: e.target.value }))}
                      placeholder="Postal code"
                      className="mt-2"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="stateProvince">State/Province</Label>
                    <Input
                      id="stateProvince"
                      value={orgForm.stateProvince}
                      onChange={(e) => setOrgForm(prev => ({ ...prev, stateProvince: e.target.value }))}
                      placeholder="State or province"
                      className="mt-2"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveOrganization} disabled={saving} className="w-full md:w-auto">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Address Information
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Information Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Billing & Banking Information
                </CardTitle>
                <CardDescription>
                  Configure payment settings and banking information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Banking Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Banking Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        value={orgForm.bankName}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, bankName: e.target.value }))}
                        placeholder="Bank name"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bankAccount">Bank Account Number</Label>
                      <Input
                        id="bankAccount"
                        value={orgForm.bankAccountNumber}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                        placeholder="Account number"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="iban">IBAN</Label>
                      <Input
                        id="iban"
                        value={orgForm.iban}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, iban: e.target.value }))}
                        placeholder="SE35 5000 0000 0549 1000 0003"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="swiftBic">SWIFT/BIC</Label>
                      <Input
                        id="swiftBic"
                        value={orgForm.swiftBic}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, swiftBic: e.target.value }))}
                        placeholder="SWEDSESS"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="routingNumber">Routing Number (US)</Label>
                      <Input
                        id="routingNumber"
                        value={orgForm.bankRoutingNumber}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, bankRoutingNumber: e.target.value }))}
                        placeholder="Routing number"
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Invoice Settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Invoice Settings
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      <Select value={orgForm.paymentTerms} onValueChange={(value) => setOrgForm(prev => ({ ...prev, paymentTerms: value }))}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7 days">7 days</SelectItem>
                          <SelectItem value="15 days">15 days</SelectItem>
                          <SelectItem value="30 days">30 days</SelectItem>
                          <SelectItem value="45 days">45 days</SelectItem>
                          <SelectItem value="60 days">60 days</SelectItem>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="defaultCurrency">Default Currency</Label>
                      <Select value={orgForm.defaultCurrency} onValueChange={(value) => setOrgForm(prev => ({ ...prev, defaultCurrency: value }))}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="SEK">SEK - Swedish Krona</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                          <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="invoiceNotes">Invoice Notes</Label>
                    <Textarea
                      id="invoiceNotes"
                      value={orgForm.invoiceNotes}
                      onChange={(e) => setOrgForm(prev => ({ ...prev, invoiceNotes: e.target.value }))}
                      placeholder="Additional notes to include on invoices..."
                      className="mt-2"
                      rows={3}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveOrganization} disabled={saving} className="w-full" size="lg">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Billing Information
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;