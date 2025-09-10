import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Building, 
  Globe, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Target,
  Users,
  Package
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const { user, userRole } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setSaving] = useState(false);
  
  const totalSteps = userRole === 'publisher' ? 4 : 3;
  
  const [profileData, setProfileData] = useState({
    displayName: '',
    bio: '',
    company: '',
    country: '',
    vatNumber: '',
    website: '',
    mediaOutletName: '',
    mediaOutletDomain: '',
    mediaOutletCategory: '',
    mediaOutletNiches: [] as string[],
    mediaOutletPrice: ''
  });

  const [newNiche, setNewNiche] = useState('');

  const addNiche = () => {
    if (newNiche && !profileData.mediaOutletNiches.includes(newNiche)) {
      setProfileData(prev => ({
        ...prev,
        mediaOutletNiches: [...prev.mediaOutletNiches, newNiche]
      }));
      setNewNiche('');
    }
  };

  const removeNiche = (niche: string) => {
    setProfileData(prev => ({
      ...prev,
      mediaOutletNiches: prev.mediaOutletNiches.filter(n => n !== niche)
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    
    try {
      setSaving(true);

      // Update user metadata
      await supabase.auth.updateUser({
        data: {
          display_name: profileData.displayName,
          bio: profileData.bio,
          onboarding_completed: true
        }
      });

      // Create/update profile
      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id
        });

      // Create organization if provided
      if (profileData.company && profileData.country) {
        const { data: org } = await supabase
          .from('organizations')
          .insert({
            name: profileData.company,
            country: profileData.country,
            vat_number: profileData.vatNumber || null
          })
          .select()
          .single();

        if (org) {
          await supabase
            .from('profiles')
            .update({
              organization_id: org.id
            })
            .eq('user_id', user.id);
        }
      }

      // For publishers, create their first media outlet
      if (userRole === 'publisher' && profileData.mediaOutletDomain) {
        await supabase
          .from('media_outlets')
          .insert({
            publisher_id: user.id,
            domain: profileData.mediaOutletDomain,
            category: profileData.mediaOutletCategory,
            niches: profileData.mediaOutletNiches,
            price: parseFloat(profileData.mediaOutletPrice) || 0,
            currency: 'EUR',
            country: profileData.country,
            language: 'English'
          });

        // Create default metrics for the media outlet
        const { data: mediaOutlet } = await supabase
          .from('media_outlets')
          .select('id')
          .eq('publisher_id', user.id)
          .eq('domain', profileData.mediaOutletDomain)
          .single();

        if (mediaOutlet) {
          await supabase
            .from('metrics')
            .insert({
              media_outlet_id: mediaOutlet.id,
              ahrefs_dr: 10,
              moz_da: 10,
              semrush_as: 10,
              spam_score: 0,
              organic_traffic: 1000,
              referring_domains: 50
            });
        }
      }

      toast({
        title: "Welcome aboard! 🎉",
        description: "Your account has been set up successfully.",
      });

      onComplete();

    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Welcome! Let's get you set up";
      case 2: return "Tell us about yourself";
      case 3: return userRole === 'publisher' ? "Your organization" : "Almost done!";
      case 4: return "Set up your first media outlet";
      default: return "Getting started";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "We'll help you set up your account in just a few steps";
      case 2: return "Add some personal information to complete your profile";
      case 3: return userRole === 'publisher' ? "Organization details are required for payments" : "Review your information";
      case 4: return "Add your first media outlet to start receiving orders";
      default: return "";
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 1: return <Sparkles className="h-6 w-6" />;
      case 2: return <User className="h-6 w-6" />;
      case 3: return userRole === 'publisher' ? <Building className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />;
      case 4: return <Package className="h-6 w-6" />;
      default: return <User className="h-6 w-6" />;
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return true;
      case 2: return profileData.displayName.length > 0;
      case 3: 
        return userRole === 'publisher' 
          ? profileData.company && profileData.country
          : true;
      case 4: 
        return profileData.mediaOutletDomain && 
               profileData.mediaOutletCategory && 
               profileData.mediaOutletPrice;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="glass-card border-white/10">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                {getStepIcon()}
              </div>
              <div>
                <CardTitle className="text-2xl">{getStepTitle()}</CardTitle>
                <CardDescription className="mt-1">
                  {getStepDescription()}
                </CardDescription>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Step {currentStep} of {totalSteps}</span>
                <span>{Math.round((currentStep / totalSteps) * 100)}% complete</span>
              </div>
              <Progress value={(currentStep / totalSteps) * 100} className="w-full" />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Welcome to Moody Media! 👋</h3>
                  <p className="text-muted-foreground">
                    You're signed up as a <Badge variant="outline" className="mx-1">{userRole}</Badge>
                    {userRole === 'buyer' && "Ready to purchase high-quality link placements?"}
                    {userRole === 'publisher' && "Ready to monetize your media outlets?"}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {userRole === 'buyer' ? (
                    <>
                      <div className="p-4 border rounded-lg">
                        <Target className="h-8 w-8 text-primary mb-2" />
                        <h4 className="font-medium">Find Quality Links</h4>
                        <p className="text-sm text-muted-foreground">Browse verified media outlets</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <Users className="h-8 w-8 text-primary mb-2" />
                        <h4 className="font-medium">Easy Ordering</h4>
                        <p className="text-sm text-muted-foreground">Simple cart and checkout process</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 border rounded-lg">
                        <Package className="h-8 w-8 text-primary mb-2" />
                        <h4 className="font-medium">Manage Outlets</h4>
                        <p className="text-sm text-muted-foreground">Add your media properties</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <Target className="h-8 w-8 text-primary mb-2" />
                        <h4 className="font-medium">Earn Revenue</h4>
                        <p className="text-sm text-muted-foreground">Get paid for quality content</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Personal Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="displayName">Display Name *</Label>
                    <Input
                      id="displayName"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="Your display name"
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input
                      id="website"
                      value={profileData.website}
                      onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://yourwebsite.com"
                      className="mt-2"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="bio">Bio (Optional)</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself..."
                    className="mt-2"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Organization (Publisher) or Summary (Buyer) */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {userRole === 'publisher' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="company">Company Name *</Label>
                        <Input
                          id="company"
                          value={profileData.company}
                          onChange={(e) => setProfileData(prev => ({ ...prev, company: e.target.value }))}
                          placeholder="Your company name"
                          className="mt-2"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="country">Country *</Label>
                        <Select value={profileData.country} onValueChange={(value) => setProfileData(prev => ({ ...prev, country: value }))}>
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
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="vatNumber">VAT Number (Optional)</Label>
                      <Input
                        id="vatNumber"
                        value={profileData.vatNumber}
                        onChange={(e) => setProfileData(prev => ({ ...prev, vatNumber: e.target.value }))}
                        placeholder="Your VAT registration number"
                        className="mt-2"
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                    <div>
                      <h3 className="text-lg font-medium">You're all set!</h3>
                      <p className="text-muted-foreground">
                        Your account is ready. You can now start browsing the marketplace.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: First Media Outlet (Publishers only) */}
            {currentStep === 4 && userRole === 'publisher' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mediaOutletDomain">Domain *</Label>
                    <Input
                      id="mediaOutletDomain"
                      value={profileData.mediaOutletDomain}
                      onChange={(e) => setProfileData(prev => ({ ...prev, mediaOutletDomain: e.target.value }))}
                      placeholder="example.com"
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="mediaOutletCategory">Category *</Label>
                    <Select value={profileData.mediaOutletCategory} onValueChange={(value) => setProfileData(prev => ({ ...prev, mediaOutletCategory: value }))}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="News">News</SelectItem>
                        <SelectItem value="Tech">Technology</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Lifestyle">Lifestyle</SelectItem>
                        <SelectItem value="Sports">Sports</SelectItem>
                        <SelectItem value="Health">Health</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="mediaOutletPrice">Price per Article (EUR) *</Label>
                  <Input
                    id="mediaOutletPrice"
                    type="number"
                    value={profileData.mediaOutletPrice}
                    onChange={(e) => setProfileData(prev => ({ ...prev, mediaOutletPrice: e.target.value }))}
                    placeholder="299"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>Niches (Optional)</Label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-2">
                    {profileData.mediaOutletNiches.map((niche) => (
                      <Badge key={niche} variant="secondary" className="cursor-pointer" onClick={() => removeNiche(niche)}>
                        {niche} ×
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newNiche}
                      onChange={(e) => setNewNiche(e.target.value)}
                      placeholder="Add niche..."
                      onKeyPress={(e) => e.key === 'Enter' && addNiche()}
                    />
                    <Button type="button" variant="outline" onClick={addNiche}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              <Button 
                variant="outline" 
                onClick={handleBack}
                disabled={currentStep === 1}
                className="glass-button"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              <Button 
                onClick={handleNext}
                disabled={!isStepValid() || loading}
                className="glass-button"
              >
                {currentStep === totalSteps ? (
                  loading ? "Setting up..." : "Complete Setup"
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingFlow;