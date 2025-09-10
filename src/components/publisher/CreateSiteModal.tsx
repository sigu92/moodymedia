import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CreateSiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSiteCreated: () => void;
  editingSite?: any;
}

export function CreateSiteModal({ open, onOpenChange, onSiteCreated, editingSite }: CreateSiteModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    domain: editingSite?.domain || '',
    price: editingSite?.price || 200,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const siteData = {
        domain: formData.domain,
        price: formData.price,
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
        is_active: true,
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
        
        // Create listing so it appears in marketplace
        const { error: listingError } = await supabase
          .from('listings')
          .insert([{
            media_outlet_id: mediaOutletId,
            is_active: true
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

      toast.success(editingSite ? 'Site updated successfully' : 'Site created successfully');
      onSiteCreated();
      onOpenChange(false);
      setFormData({
        domain: '',
        price: 200,
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
    } catch (error) {
      console.error('Error saving site:', error);
      toast.error('Failed to save site');
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
              <Label htmlFor="price">Price (EUR) *</Label>
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
}