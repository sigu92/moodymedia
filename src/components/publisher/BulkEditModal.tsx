import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Edit3, 
  Save, 
  X, 
  CheckCircle, 
  DollarSign,
  Globe,
  Tag,
  FileText,
  Archive
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MediaOutlet {
  id: string;
  domain: string;
  category: string;
  price: number;
  currency: string;
  country: string;
  language: string;
  is_active: boolean;
  lead_time_days: number;
  guidelines: string;
  niches: string[];
}

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSites: MediaOutlet[];
  onUpdate: () => void;
}

export function BulkEditModal({ isOpen, onClose, selectedSites, onUpdate }: BulkEditModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pricing');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Bulk edit values
  const [bulkPrice, setBulkPrice] = useState('');
  const [priceAdjustment, setPriceAdjustment] = useState({ type: 'fixed', value: '' });
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkCountry, setBulkCountry] = useState('');
  const [bulkLanguage, setBulkLanguage] = useState('');
  const [bulkLeadTime, setBulkLeadTime] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkGuidelines, setBulkGuidelines] = useState('');
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);

  const availableNiches = [
    'Technology', 'Health', 'Finance', 'Travel', 'Food', 'Fashion', 
    'Sports', 'Entertainment', 'Business', 'Education', 'Lifestyle', 
    'Real Estate', 'Automotive', 'Gaming', 'Beauty', 'Fitness'
  ];

  const calculatePreview = () => {
    return selectedSites.map(site => {
      let newPrice = site.price;
      
      if (bulkPrice) {
        newPrice = parseFloat(bulkPrice);
      } else if (priceAdjustment.value) {
        const adjustment = parseFloat(priceAdjustment.value);
        if (priceAdjustment.type === 'fixed') {
          newPrice = site.price + adjustment;
        } else if (priceAdjustment.type === 'percentage') {
          newPrice = site.price * (1 + adjustment / 100);
        }
      }

      return {
        ...site,
        price: newPrice,
        category: bulkCategory || site.category,
        country: bulkCountry || site.country,
        language: bulkLanguage || site.language,
        lead_time_days: bulkLeadTime ? parseInt(bulkLeadTime) : site.lead_time_days,
        is_active: bulkStatus ? bulkStatus === 'active' : site.is_active,
        guidelines: bulkGuidelines || site.guidelines,
        niches: selectedNiches.length > 0 ? selectedNiches : site.niches
      };
    });
  };

  const previewChanges = calculatePreview();

  const applyBulkChanges = async () => {
    if (!user) return;

    setLoading(true);
    setProgress(0);

    try {
      const changes = calculatePreview();
      const total = changes.length;

      for (let i = 0; i < changes.length; i++) {
        const site = changes[i];
        
        const updateData: any = {};
        
        if (bulkPrice || priceAdjustment.value) {
          updateData.price = site.price;
        }
        if (bulkCategory) updateData.category = site.category;
        if (bulkCountry) updateData.country = site.country;
        if (bulkLanguage) updateData.language = site.language;
        if (bulkLeadTime) updateData.lead_time_days = site.lead_time_days;
        if (bulkStatus) updateData.is_active = site.is_active;
        if (bulkGuidelines) updateData.guidelines = site.guidelines;
        if (selectedNiches.length > 0) updateData.niches = site.niches;

        const { error } = await supabase
          .from('media_outlets')
          .update(updateData)
          .eq('id', site.id)
          .eq('publisher_id', user.id);

        if (error) throw error;

        setProgress(((i + 1) / total) * 100);
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast.success(`Successfully updated ${changes.length} sites`);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error applying bulk changes:', error);
      toast.error('Failed to apply bulk changes');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Edit3 className="h-5 w-5 text-primary" />
            Bulk Edit - {selectedSites.length} Sites Selected
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pricing" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pricing
              </TabsTrigger>
              <TabsTrigger value="niche-pricing" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Niche Pricing
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Content
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pricing" className="space-y-4">
              <Card className="glass-card-clean">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Pricing Updates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Set Fixed Price (EUR)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 250"
                        value={bulkPrice}
                        onChange={(e) => setBulkPrice(e.target.value)}
                        className="glass-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Or Apply Adjustment</Label>
                      <div className="flex gap-2">
                        <Select value={priceAdjustment.type} onValueChange={(value) => setPriceAdjustment(prev => ({ ...prev, type: value }))}>
                          <SelectTrigger className="w-32 glass-input">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed €</SelectItem>
                            <SelectItem value="percentage">%</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder={priceAdjustment.type === 'fixed' ? '±50' : '±10'}
                          value={priceAdjustment.value}
                          onChange={(e) => setPriceAdjustment(prev => ({ ...prev, value: e.target.value }))}
                          className="glass-input"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="niche-pricing" className="space-y-4">
              <Card className="glass-card-clean">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-purple-600" />
                    Niche Pricing Rules
                  </CardTitle>
                  <CardDescription>
                    Set acceptance and multipliers for specialized niches
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['casino', 'loans', 'adult', 'dating', 'cbd', 'crypto', 'forex'].map(niche => (
                      <div key={niche} className="space-y-2 p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label className="capitalize font-semibold">{niche}</Label>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`accept-${niche}`}
                              // checked={nicheSettings[niche]?.accepted || false}
                              // onCheckedChange={(checked) => setNicheSettings(prev => ({
                              //   ...prev,
                              //   [niche]: { ...prev[niche], accepted: checked }
                              // }))}
                            />
                            <Label htmlFor={`accept-${niche}`} className="text-sm">Accept</Label>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Multiplier:</Label>
                          <Input
                            type="number"
                            placeholder="1.0"
                            min="1.0"
                            max="5.0"
                            step="0.1"
                            className="w-20 glass-input"
                            // value={nicheSettings[niche]?.multiplier || ''}
                            // onChange={(e) => setNicheSettings(prev => ({
                            //   ...prev,
                            //   [niche]: { ...prev[niche], multiplier: parseFloat(e.target.value) || 1.0 }
                            // }))}
                          />
                          <span className="text-xs text-muted-foreground">
                            Default: {niche === 'casino' ? '2.0' : niche === 'loans' || niche === 'forex' ? '1.8' : '1.5'}x
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-muted/20 rounded-lg">
                    <h4 className="font-semibold mb-2">Preview: Price Impact</h4>
                    <div className="text-sm text-muted-foreground">
                      Base price €250 would become:
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                        <div>Casino: €500 (2.0x)</div>
                        <div>Loans: €450 (1.8x)</div>
                        <div>Adult: €375 (1.5x)</div>
                        <div>Dating: €375 (1.5x)</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card className="glass-card-clean">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    Site Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Select value={bulkCountry} onValueChange={setBulkCountry}>
                        <SelectTrigger className="glass-input">
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
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select value={bulkLanguage} onValueChange={setBulkLanguage}>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Swedish">Swedish</SelectItem>
                          <SelectItem value="Norwegian">Norwegian</SelectItem>
                          <SelectItem value="Danish">Danish</SelectItem>
                          <SelectItem value="Finnish">Finnish</SelectItem>
                          <SelectItem value="German">German</SelectItem>
                          <SelectItem value="English">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={bulkCategory} onValueChange={setBulkCategory}>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Blog">Blog</SelectItem>
                          <SelectItem value="News">News</SelectItem>
                          <SelectItem value="Magazine">Magazine</SelectItem>
                          <SelectItem value="Niche">Niche</SelectItem>
                          <SelectItem value="Directory">Directory</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={bulkStatus} onValueChange={setBulkStatus}>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <Card className="glass-card-clean">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Content Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label>Lead Time (Days)</Label>
                         <Input
                           type="number"
                           placeholder="e.g., 7"
                           value={bulkLeadTime}
                           onChange={(e) => setBulkLeadTime(e.target.value)}
                           className="glass-input"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label>Accepts No License</Label>
                         <Select onValueChange={(value) => {}}>
                           <SelectTrigger className="glass-input">
                             <SelectValue placeholder="Select option" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="true">Yes</SelectItem>
                             <SelectItem value="false">No</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label>Sponsor Tag</Label>
                         <Select onValueChange={(value) => {}}>
                           <SelectTrigger className="glass-input">
                             <SelectValue placeholder="Select tag type" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="text">Text</SelectItem>
                             <SelectItem value="image">Image</SelectItem>
                             <SelectItem value="unknown">Unknown</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                       <div className="space-y-2">
                         <Label>Sale Price (EUR)</Label>
                         <Input
                           type="number"
                           placeholder="Optional sale price"
                           className="glass-input"
                         />
                       </div>
                     </div>
                     <div className="space-y-2">
                       <Label>Guidelines</Label>
                       <Input
                         placeholder="Update content guidelines..."
                         value={bulkGuidelines}
                         onChange={(e) => setBulkGuidelines(e.target.value)}
                         className="glass-input"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Sale Note</Label>
                       <Input
                         placeholder="e.g., Limited time offer"
                         className="glass-input"
                       />
                     </div>
                    <div className="space-y-2">
                      <Label>Niches</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {availableNiches.map(niche => (
                          <div key={niche} className="flex items-center space-x-2">
                            <Checkbox
                              id={niche}
                              checked={selectedNiches.includes(niche)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedNiches(prev => [...prev, niche]);
                                } else {
                                  setSelectedNiches(prev => prev.filter(n => n !== niche));
                                }
                              }}
                            />
                            <Label htmlFor={niche} className="text-sm">{niche}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Preview Table */}
          {previewChanges.some(site => 
            site.price !== selectedSites.find(s => s.id === site.id)?.price ||
            site.category !== selectedSites.find(s => s.id === site.id)?.category ||
            site.is_active !== selectedSites.find(s => s.id === site.id)?.is_active
          ) && (
            <Card className="glass-card-clean">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Preview Changes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Price Change</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewChanges.slice(0, 5).map(site => {
                      const original = selectedSites.find(s => s.id === site.id)!;
                      return (
                        <TableRow key={site.id}>
                          <TableCell className="font-medium">{site.domain}</TableCell>
                          <TableCell>
                            {original.price !== site.price ? (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground line-through">€{original.price}</span>
                                <span className="text-green-600 font-semibold">€{site.price}</span>
                              </div>
                            ) : (
                              <span>€{site.price}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {original.category !== site.category ? (
                              <Badge variant="outline">{site.category}</Badge>
                            ) : (
                              site.category
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={site.is_active ? "default" : "secondary"}>
                              {site.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {previewChanges.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    ... and {previewChanges.length - 5} more changes
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Progress Bar */}
          {loading && (
            <Card className="glass-card-clean">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Applying changes...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading} className="glass-button">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={applyBulkChanges} 
              disabled={loading}
              className="glass-button-primary"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Applying...' : `Apply Changes (${selectedSites.length} sites)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}