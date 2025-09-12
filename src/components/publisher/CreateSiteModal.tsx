import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, Clock, DollarSign, Shield } from "lucide-react";
import { SubmissionProgressIndicator } from "./SubmissionProgressIndicator";

interface CreateSiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSiteCreated: () => void;
  editingSite?: any;
}

export function CreateSiteModal({ open, onOpenChange, onSiteCreated, editingSite }: CreateSiteModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedSite, setSubmittedSite] = useState<any>(null);
  const [formData, setFormData] = useState({
    domain: editingSite?.domain || '',
    price: editingSite?.price || 200,
    purchase_price: editingSite?.purchase_price || null,
    currency: editingSite?.currency || 'EUR',
    country: editingSite?.country || '',
    language: editingSite?.language || '',
    category: editingSite?.category || '',
    niches: editingSite?.niches?.join(', ') || '',
    guidelines: editingSite?.guidelines || '',
    lead_time_days: editingSite?.lead_time_days || 7,
    acceptsNoLicenseStatus: editingSite?.accepts_no_license_status || 'no',
    sponsorTagStatus: editingSite?.sponsor_tag_status || 'no',
    sponsorTagType: editingSite?.sponsor_tag_type || 'text',
    // SEO metrics fields
    ahrefs_dr: editingSite?.metrics?.ahrefs_dr || 0,
    moz_da: editingSite?.metrics?.moz_da || 0,
    semrush_as: editingSite?.metrics?.semrush_as || 0,
    spam_score: editingSite?.metrics?.spam_score || 0,
    organic_traffic: editingSite?.metrics?.organic_traffic || 0,
    referring_domains: editingSite?.metrics?.referring_domains || 0,
  });

  // Niche acceptance and multiplier state
  const [nicheRules, setNicheRules] = useState<Record<string, { accepted: boolean; multiplier: number }>>({
    casino: { accepted: false, multiplier: 2.0 },
    loans: { accepted: false, multiplier: 1.8 },
    adult: { accepted: false, multiplier: 1.5 },
    dating: { accepted: false, multiplier: 1.5 },
    cbd: { accepted: false, multiplier: 1.5 },
    crypto: { accepted: false, multiplier: 1.5 },
    forex: { accepted: false, multiplier: 1.8 }
  });

  const validateForm = () => {
    const errors: string[] = [];

    // Domain validation
    if (!formData.domain.trim()) {
      errors.push('Domain is required');
    } else {
      const normalizedDomain = formData.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').trim();
      if (normalizedDomain.length < 3) {
        errors.push('Domain must be at least 3 characters long');
      } else if (normalizedDomain.length > 253) {
        errors.push('Domain cannot exceed 253 characters');
      } else {
        // Basic domain format validation
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(normalizedDomain)) {
          errors.push('Invalid domain format');
        }
      }
    }

    // Required fields validation
    if (!formData.country.trim()) {
      errors.push('Country is required');
    } else if (formData.country.length > 100) {
      errors.push('Country name cannot exceed 100 characters');
    }

    if (!formData.language.trim()) {
      errors.push('Language is required');
    } else if (formData.language.length > 50) {
      errors.push('Language name cannot exceed 50 characters');
    }

    if (!formData.category.trim()) {
      errors.push('Category is required');
    } else if (formData.category.length > 100) {
      errors.push('Category name cannot exceed 100 characters');
    }

    // Price validation
    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      errors.push('Marketplace price must be a positive number');
    } else if (Number(formData.price) > 10000) {
      errors.push('Marketplace price cannot exceed €10,000');
    }

    // Purchase price validation (optional)
    if (formData.purchase_price !== null && formData.purchase_price !== undefined) {
      if (isNaN(Number(formData.purchase_price))) {
        errors.push('Purchase price must be a valid number');
      } else if (Number(formData.purchase_price) < 0) {
        errors.push('Purchase price cannot be negative');
      } else if (Number(formData.purchase_price) > 50000) {
        errors.push('Purchase price cannot exceed €50,000');
      }
    }

    // Optional field validation
    if (formData.guidelines && formData.guidelines.length > 2000) {
      errors.push('Guidelines cannot exceed 2000 characters');
    }

    if (formData.lead_time_days && (isNaN(Number(formData.lead_time_days)) || Number(formData.lead_time_days) < 1 || Number(formData.lead_time_days) > 365)) {
      errors.push('Lead time must be between 1 and 365 days');
    }

    // Niche validation
    const niches = formData.niches.split(',').map(n => n.trim()).filter(Boolean);
    if (niches.length > 20) {
      errors.push('Cannot have more than 20 niches');
    }

    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Client-side validation
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join('. '));
      return;
    }

    // Show confirmation dialog instead of submitting directly
    setShowConfirmation(true);
  };

  const handleConfirmedSubmit = async () => {
    if (!user) return;

    setLoading(true);
    setShowConfirmation(false);
    try {
      const siteData = {
        domain: formData.domain,
        price: formData.price,
        purchase_price: formData.purchase_price,
        currency: formData.currency,
        country: formData.country,
        language: formData.language,
        category: formData.category,
        niches: formData.niches.split(',').map(n => n.trim()).filter(Boolean),
        guidelines: formData.guidelines,
        lead_time_days: formData.lead_time_days,
        accepts_no_license_status: formData.acceptsNoLicenseStatus,
        sponsor_tag_status: formData.sponsorTagStatus,
        sponsor_tag_type: formData.sponsorTagType,
        publisher_id: user.id,
        status: 'pending', // Set to pending for admin approval
        submitted_by: user.id,
        submitted_at: new Date().toISOString(),
        is_active: false, // Not active until approved
      };

      let mediaOutletId;
      
      if (editingSite) {
        // Update existing media outlet
        const { error: updateError } = await supabase
          .from('media_outlets')
          .update(siteData)
          .eq('id', editingSite.id);
          
        if (updateError) throw updateError;
        
        // Update metrics
        const { error: metricsError } = await supabase
          .from('metrics')
          .update({
            ahrefs_dr: formData.ahrefs_dr,
            moz_da: formData.moz_da,
            semrush_as: formData.semrush_as,
            spam_score: formData.spam_score,
            organic_traffic: formData.organic_traffic,
            referring_domains: formData.referring_domains,
            updated_at: new Date().toISOString()
          })
          .eq('media_outlet_id', editingSite.id);
          
        if (metricsError) throw metricsError;
        
        mediaOutletId = editingSite.id;
      } else {
        // Create new media outlet
        const { data: mediaOutletData, error: insertError } = await supabase
          .from('media_outlets')
          .insert([siteData])
          .select('id')
          .single();
          
        if (insertError) throw insertError;
        mediaOutletId = mediaOutletData.id;
        
        // Create metrics for the new media outlet
        const { error: metricsError } = await supabase
          .from('metrics')
          .insert([{
            media_outlet_id: mediaOutletId,
            ahrefs_dr: formData.ahrefs_dr,
            moz_da: formData.moz_da,
            semrush_as: formData.semrush_as,
            spam_score: formData.spam_score,
            organic_traffic: formData.organic_traffic,
            referring_domains: formData.referring_domains,
            updated_at: new Date().toISOString()
          }]);
          
        if (metricsError) throw metricsError;
        
        // Create listing (inactive until approved)
        const { error: listingError } = await supabase
          .from('listings')
          .insert([{
            media_outlet_id: mediaOutletId,
            is_active: false // Not active until admin approval
          }]);
          
        if (listingError) throw listingError;
      }

      // Create niche rules
      const nicheRulesData = [];
      for (const [nicheSlug, rule] of Object.entries(nicheRules)) {
        if (rule.accepted || rule.multiplier !== 1.0) {
          // Get niche ID
          const { data: nicheData } = await supabase
            .from('niches')
            .select('id')
            .eq('slug', nicheSlug)
            .single();

          if (nicheData) {
            nicheRulesData.push({
              media_outlet_id: mediaOutletId,
              niche_id: nicheData.id,
              accepted: rule.accepted,
              multiplier: rule.multiplier
            });
          }
        }
      }

      if (nicheRulesData.length > 0) {
        const { error: nicheRulesError } = await supabase
          .from('outlet_niche_rules')
          .insert(nicheRulesData);
        
        if (nicheRulesError) throw nicheRulesError;
      }

      toast.success(editingSite ? 'Site updated and submitted for review' : 'Site submitted for review successfully');
      setSubmittedSite(siteData);
      setShowSuccess(true);
      setFormData({
        domain: '',
        price: 200,
        purchase_price: null,
        currency: 'EUR',
        country: '',
        language: '',
        category: '',
        niches: '',
        guidelines: '',
        lead_time_days: 7,
        acceptsNoLicenseStatus: 'no',
        sponsorTagStatus: 'no',
        sponsorTagType: 'text',
        ahrefs_dr: 0,
        moz_da: 0,
        semrush_as: 0,
        spam_score: 0,
        organic_traffic: 0,
        referring_domains: 0,
      });
      setNicheRules({
        casino: { accepted: false, multiplier: 2.0 },
        loans: { accepted: false, multiplier: 1.8 },
        adult: { accepted: false, multiplier: 1.5 },
        dating: { accepted: false, multiplier: 1.5 },
        cbd: { accepted: false, multiplier: 1.5 },
        crypto: { accepted: false, multiplier: 1.5 },
        forex: { accepted: false, multiplier: 1.8 }
      });
    } catch (error: any) {
      console.error('Error saving site:', error);

      // Handle different types of errors
      if (error.message?.includes('Domain already exists')) {
        toast.error('This domain is already submitted to the marketplace');
      } else if (error.message?.includes('Publisher role required')) {
        toast.error('You must have publisher privileges to submit websites');
      } else if (error.message?.includes('Validation failed')) {
        toast.error('Submission validation failed. Please check your input.');
      } else if (error.message?.includes('fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error('Failed to submit website. Please try again or contact support if the problem persists.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading">
            {editingSite ? 'Edit Site' : 'Add New Site'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain *</Label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                placeholder="example.com"
                required
                className="glass-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Marketplace Price (EUR) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                min="0"
                required
                className="glass-input"
              />
            </div>

            {/* Purchase Price field - only show for non-moody sites */}
            {formData.domain && !formData.domain.toLowerCase().includes('moody') && (
              <div className="space-y-2">
                <Label htmlFor="purchase_price">Your Asking Price (EUR)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  value={formData.purchase_price || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    purchase_price: e.target.value ? Number(e.target.value) : null
                  }))}
                  min="0"
                  step="0.01"
                  placeholder="What you want to charge for this website"
                  className="glass-input"
                />
                <p className="text-xs text-muted-foreground">
                  This is what you'll charge buyers. The marketplace price above is what customers will pay.
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select 
                value={formData.country}
                onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SE">Sweden</SelectItem>
                  <SelectItem value="DK">Denmark</SelectItem>
                  <SelectItem value="NO">Norway</SelectItem>
                  <SelectItem value="FI">Finland</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Language *</Label>
              <Select 
                value={formData.language}
                onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Swedish">Swedish</SelectItem>
                  <SelectItem value="Danish">Danish</SelectItem>
                  <SelectItem value="Norwegian">Norwegian</SelectItem>
                  <SelectItem value="Finnish">Finnish</SelectItem>
                  <SelectItem value="German">German</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gaming">Gaming</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Lifestyle">Lifestyle</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Health">Health</SelectItem>
                  <SelectItem value="News">News</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead_time">Lead Time (days)</Label>
              <Input
                id="lead_time"
                type="number"
                value={formData.lead_time_days}
                onChange={(e) => setFormData(prev => ({ ...prev, lead_time_days: Number(e.target.value) }))}
                min="1"
                className="glass-input"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="niches">Niches (comma-separated)</Label>
            <Input
              id="niches"
              value={formData.niches}
              onChange={(e) => setFormData(prev => ({ ...prev, niches: e.target.value }))}
              placeholder="technology, lifestyle, business"
              className="glass-input"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="guidelines">Content Guidelines</Label>
            <Textarea
              id="guidelines"
              value={formData.guidelines}
              onChange={(e) => setFormData(prev => ({ ...prev, guidelines: e.target.value }))}
              placeholder="Describe your content requirements, restrictions, and guidelines..."
              rows={4}
              className="glass-input"
            />
          </div>
          
          {/* Niche Acceptance Rules Section */}
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Niche Acceptance & Pricing Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(nicheRules).map(([nicheSlug, rule]) => (
                  <div key={nicheSlug} className="glass-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="capitalize font-semibold">{nicheSlug}</Label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={rule.accepted}
                          onChange={(e) => setNicheRules(prev => ({
                            ...prev,
                            [nicheSlug]: { ...prev[nicheSlug], accepted: e.target.checked }
                          }))}
                          className="rounded border-border"
                        />
                        <span className="text-sm text-muted-foreground">Accept</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${nicheSlug}-multiplier`} className="text-sm">Price Multiplier</Label>
                      <Input
                        id={`${nicheSlug}-multiplier`}
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        value={rule.multiplier}
                        onChange={(e) => setNicheRules(prev => ({
                          ...prev,
                          [nicheSlug]: { ...prev[nicheSlug], multiplier: Number(e.target.value) }
                        }))}
                        className="glass-input"
                      />
                      <p className="text-xs text-muted-foreground">
                        Price: €{(formData.price * rule.multiplier).toFixed(0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* License and Sponsor Tag Section */}
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Content & Licensing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="acceptsNoLicense">Accepts No License</Label>
                  <Select 
                    value={formData.acceptsNoLicenseStatus}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, acceptsNoLicenseStatus: value as 'yes' | 'no' | 'depends' }))}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="depends">Depends</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sponsorTag">Sponsor Tag</Label>
                  <Select 
                    value={formData.sponsorTagStatus}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, sponsorTagStatus: value as 'yes' | 'no' }))}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.sponsorTagStatus === 'yes' && (
                  <div className="space-y-2">
                    <Label htmlFor="sponsorTagType">Sponsor Tag Type</Label>
                    <Select 
                      value={formData.sponsorTagType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, sponsorTagType: value as 'image' | 'text' }))}
                    >
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* SEO Metrics Section */}
          <div className="space-y-4">{` `}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">SEO Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ahrefs_dr">Ahrefs DR</Label>
                  <Input
                    id="ahrefs_dr"
                    type="number"
                    value={formData.ahrefs_dr}
                    onChange={(e) => setFormData(prev => ({ ...prev, ahrefs_dr: Number(e.target.value) }))}
                    min="0"
                    max="100"
                    className="glass-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="moz_da">Moz DA</Label>
                  <Input
                    id="moz_da"
                    type="number"
                    value={formData.moz_da}
                    onChange={(e) => setFormData(prev => ({ ...prev, moz_da: Number(e.target.value) }))}
                    min="0"
                    max="100"
                    className="glass-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="semrush_as">Semrush AS</Label>
                  <Input
                    id="semrush_as"
                    type="number"
                    value={formData.semrush_as}
                    onChange={(e) => setFormData(prev => ({ ...prev, semrush_as: Number(e.target.value) }))}
                    min="0"
                    max="100"
                    className="glass-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="spam_score">Spam Score</Label>
                  <Input
                    id="spam_score"
                    type="number"
                    value={formData.spam_score}
                    onChange={(e) => setFormData(prev => ({ ...prev, spam_score: Number(e.target.value) }))}
                    min="0"
                    max="100"
                    className="glass-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="organic_traffic">Organic Traffic</Label>
                  <Input
                    id="organic_traffic"
                    type="number"
                    value={formData.organic_traffic}
                    onChange={(e) => setFormData(prev => ({ ...prev, organic_traffic: Number(e.target.value) }))}
                    min="0"
                    className="glass-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="referring_domains">Referring Domains</Label>
                  <Input
                    id="referring_domains"
                    type="number"
                    value={formData.referring_domains}
                    onChange={(e) => setFormData(prev => ({ ...prev, referring_domains: Number(e.target.value) }))}
                    min="0"
                    className="glass-input"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="glass-button"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="glass-button-primary"
            >
              {loading ? 'Saving...' : editingSite ? 'Update Site' : 'Create Site'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {/* Submission Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
      <DialogContent className="glass-card max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5 text-blue-500" />
            Submit Website for Review
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your website submission will be reviewed by our admin team before being listed on the marketplace.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm mb-1">Review Timeline</h4>
                <p className="text-sm text-muted-foreground">
                  Most submissions are reviewed within 24-48 hours during business days.
                  You will receive an email notification once your submission is processed.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Shield className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm mb-1">Quality Review</h4>
                <p className="text-sm text-muted-foreground">
                  Our team will verify your website's quality, SEO metrics, and content guidelines
                  to ensure it meets our marketplace standards.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm mb-1">Pricing Strategy</h4>
                <p className="text-sm text-muted-foreground">
                  While you can suggest your asking price, our admins may adjust the final marketplace
                  price based on market conditions and competitive positioning.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-yellow-600" />
              What happens next?
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• Your submission enters a "pending" status</li>
              <li>• You cannot edit the submission while under review</li>
              <li>• You'll receive email updates on the approval status</li>
              <li>• Approved sites become active in the marketplace</li>
              <li>• Rejected submissions include detailed feedback</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              className="glass-button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmedSubmit}
              disabled={loading}
              className="glass-button-primary"
            >
              {loading ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Success Dialog with Progress Indicator */}
    <Dialog open={showSuccess} onOpenChange={(open) => {
      if (!open) {
        setShowSuccess(false);
        onSiteCreated();
        onOpenChange(false);
      }
    }}>
      <DialogContent className="glass-card max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Submission Successful!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your website "{submittedSite?.domain}" has been submitted for review.
              Our admin team will evaluate it within 24-48 hours.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold">Submission Progress</h3>
            <SubmissionProgressIndicator
              status="pending"
              submittedAt={submittedSite?.submitted_at}
              className="border rounded-lg p-4 bg-muted/30"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              What to expect next
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• Track your submission status in the "Submissions" tab</li>
              <li>• You'll receive an email when your submission is reviewed</li>
              <li>• Check the SubmissionHistory component for detailed status updates</li>
              <li>• Approved sites will automatically become active in the marketplace</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowSuccess(false);
                onSiteCreated();
                onOpenChange(false);
              }}
              className="glass-button"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowSuccess(false);
                onSiteCreated();
                onOpenChange(false);
                // Could navigate to submissions tab here
              }}
              className="glass-button-primary"
            >
              View Submissions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Success Dialog with Progress Indicator */}
    <Dialog open={showSuccess} onOpenChange={(open) => {
      if (!open) {
        setShowSuccess(false);
        onSiteCreated();
        onOpenChange(false);
      }
    }}>
      <DialogContent className="glass-card max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Submission Successful!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your website "{submittedSite?.domain}" has been submitted for review.
              Our admin team will evaluate it within 24-48 hours.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold">Submission Progress</h3>
            <SubmissionProgressIndicator
              status="pending"
              submittedAt={submittedSite?.submitted_at}
              className="border rounded-lg p-4 bg-muted/30"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              What to expect next
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• Track your submission status in the "Submissions" tab</li>
              <li>• You'll receive an email when your submission is reviewed</li>
              <li>• Check the SubmissionHistory component for detailed status updates</li>
              <li>• Approved sites will automatically become active in the marketplace</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowSuccess(false);
                onSiteCreated();
                onOpenChange(false);
              }}
              className="glass-button"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowSuccess(false);
                onSiteCreated();
                onOpenChange(false);
                // Could navigate to submissions tab here
              }}
              className="glass-button-primary"
            >
              View Submissions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}