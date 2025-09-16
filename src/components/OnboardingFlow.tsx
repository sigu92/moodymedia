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
  Package,
  CreditCard,
  Plus,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const { user, userRoles, completeOnboardingWithServerSync } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;
  
  // Determine user's primary role (buyer by default)
  const primaryRole = userRoles?.includes('publisher') ? 'publisher' : 'buyer';
  
  // Publisher upsell state
  const [isAlsoPublisher, setIsAlsoPublisher] = useState<boolean | null>(null);
  
  // Calculate total steps - simplified flow
  const getTotalSteps = () => {
    if (primaryRole === 'publisher') {
      return 4; // Welcome + Profile + Organization + Media Outlet
    } else {
      return 4; // Welcome + Profile + Publisher Question + Completion
    }
  };
  
  const totalSteps = getTotalSteps();
  
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

  // Banking information removed - no longer required for onboarding

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

  // Function to add publisher role to user using secure RPC function
  const addPublisherRole = async (userId: string) => {
    try {
      console.log('🔄 Adding publisher role for user:', userId);
      console.log('🔍 DEBUG: About to call add_publisher_role RPC');

      // Step 1: Call the secure RPC function to add publisher role
      const { data, error } = await supabase.rpc('add_publisher_role', {
        p_user_id: userId
      });

      console.log('🔍 DEBUG: RPC call result:', { data, error });

      // Check if user already had publisher role
      if (data?.message === 'User already has publisher role') {
        console.log('ℹ️ User already had publisher role - this is expected behavior');
        return; // Success, no need to continue
      }

      if (error) {
        console.error('❌ Database error adding publisher role:', error);

        // Try fallback: direct insert if RPC fails
        console.log('🔄 Attempting fallback: direct role insertion...');
        const { error: insertError } = await supabase
          .from('user_role_assignments')
          .upsert({
            user_id: userId,
            role: 'publisher'
          }, { onConflict: 'user_id,role' });

        if (insertError) {
          console.error('❌ Fallback insertion also failed:', insertError);
          throw new Error(`Database error: ${error.message}`);
        } else {
          console.log('✅ Fallback insertion succeeded');
          return;
        }
      }

      if (data && !data.success) {
        console.error('❌ RPC function returned error:', data.error);
        throw new Error(data.error);
      }

      console.log('✅ Publisher role added to database successfully:', data);

      // Step 2: AuthContext will automatically refresh roles on next auth state change
      console.log('🔄 AuthContext will automatically refresh roles on next state change');

      console.log('🎉 Publisher role assignment and synchronization complete');

    } catch (error) {
      console.error('💥 Failed to add publisher role:', error);

      // Provide user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      toast({
        title: "Role Assignment Failed",
        description: `Could not assign publisher role: ${errorMessage}. Please try completing onboarding again.`,
        variant: "destructive",
      });

      throw error;
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    
    try {
      setSaving(true);

      // Validate required profile data
      if (!profileData.displayName || profileData.displayName.trim() === '') {
        throw new Error('Display name is required');
      }

      // Create/update profile using secure function (before comprehensive completion)
      console.log('🔄 Creating/updating profile...');
      const { data: profileResult, error: profileError } = await supabase.rpc('update_onboarding_profile', {
        p_user_id: user.id,
        p_display_name: profileData.displayName.trim(),
        p_bio: profileData.bio?.trim() || null,
        p_company: profileData.company?.trim() || null,
        p_country: profileData.country?.trim() || null,
        p_vat_number: profileData.vatNumber?.trim() || null
      });

      if (profileError) {
        console.error('❌ Database error updating profile:', profileError);
        throw new Error(`Failed to update user profile: ${profileError.message}`);
      }

      if (profileResult && !profileResult.success) {
        console.error('❌ Profile update failed:', profileResult.error);
        throw new Error(profileResult.error || 'Failed to update user profile');
      }

      console.log('✅ Profile updated successfully:', profileResult);

      // Handle publisher role assignment for buyers who chose to become publishers
      console.log('🔍 DEBUG: Publisher role assignment check');
      console.log('  - primaryRole:', primaryRole);
      console.log('  - isAlsoPublisher:', isAlsoPublisher);
      console.log('  - userRoles:', userRoles);
      console.log('  - user.id:', user.id);

      if (primaryRole === 'buyer' && isAlsoPublisher === true) {
        console.log('👤 User chose to become publisher, assigning role...');
        await addPublisherRole(user.id);
        console.log('✅ Publisher role assigned successfully');
      } else {
        console.log('❌ Publisher role assignment skipped:', {
          primaryRole,
          isAlsoPublisher,
          condition: primaryRole === 'buyer' && isAlsoPublisher === true
        });
      }

                 // Note: Role verification will happen in the comprehensive completion function
      // AuthContext will automatically sync roles on next state change

      // For original publishers only, create their first media outlet using secure function
      const shouldCreateMediaOutlet = primaryRole === 'publisher' && profileData.mediaOutletDomain;

      if (shouldCreateMediaOutlet) {
        // Validate media outlet data
        if (!profileData.mediaOutletDomain || profileData.mediaOutletDomain.trim() === '') {
          throw new Error('Media outlet domain is required');
        }
        if (!profileData.mediaOutletCategory || profileData.mediaOutletCategory.trim() === '') {
          throw new Error('Media outlet category is required');
        }
        const price = parseFloat(profileData.mediaOutletPrice);
        if (isNaN(price) || price <= 0) {
          throw new Error('Valid price is required for media outlet');
        }

        console.log('🔄 Creating media outlet...');
        const { data: mediaOutletResult, error: mediaOutletError } = await supabase.rpc('create_onboarding_media_outlet', {
          p_user_id: user.id,
          p_domain: profileData.mediaOutletDomain.trim(),
          p_category: profileData.mediaOutletCategory.trim(),
          p_price: price,
          p_niches: Array.isArray(profileData.mediaOutletNiches) ? profileData.mediaOutletNiches : [],
          p_country: profileData.country?.trim() || 'SE'
        });

        if (mediaOutletError) {
          console.error('❌ Database error creating media outlet:', mediaOutletError);
          throw new Error(`Failed to create media outlet: ${mediaOutletError.message}`);
        }

        if (mediaOutletResult && !mediaOutletResult.success) {
          console.error('❌ Media outlet creation failed:', mediaOutletResult.error);
          throw new Error(mediaOutletResult.error || 'Failed to create media outlet');
        }

        console.log('✅ Media outlet created successfully:', mediaOutletResult);
      }

      // Small delay to ensure database transactions are committed
      console.log('⏳ Waiting for database transactions to commit...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Use the comprehensive completion function from AuthContext
      console.log('🔄 Starting comprehensive onboarding completion...');
      await completeOnboardingWithServerSync();

      toast({
        title: "Welcome aboard! 🎉",
        description: "Your account has been set up successfully.",
      });

      onComplete();

    } catch (error) {
      console.error('💥 Onboarding completion error:', error);

      // Provide specific error messages based on error type
      let errorTitle = "Onboarding Failed";
      let errorDescription = "Failed to complete onboarding setup. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes('Database error')) {
          errorTitle = "Database Error";
          errorDescription = "There was a problem saving your information. Please check your connection and try again.";
        } else if (error.message.includes('Failed to update user metadata')) {
          errorTitle = "Account Setup Error";
          errorDescription = "Could not update your account settings. Please try again.";
        } else if (error.message.includes('Failed to add publisher role')) {
          errorTitle = "Role Assignment Error";
          errorDescription = "Could not set up your publisher account. Please try again.";
        } else if (error.message.includes('Failed to create media outlet')) {
          errorTitle = "Media Outlet Error";
          errorDescription = "Could not create your media outlet. Please try again.";
        } else if (error.message.includes('Failed to update profile')) {
          errorTitle = "Profile Error";
          errorDescription = "Could not save your profile information. Please try again.";
        }
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });

      // Check if we should retry
      if (retryCount < MAX_RETRIES && (
        error instanceof Error &&
        (error.message.includes('Database error') ||
         error.message.includes('Failed to update user metadata') ||
         error.message.includes('Failed to add publisher role'))
      )) {
        console.log(`🔄 Retrying onboarding completion (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
        setRetryCount(prev => prev + 1);

        // Show user feedback about retry
        toast({
          title: "Retrying...",
          description: `Attempting to complete setup again (${retryCount + 1}/${MAX_RETRIES})`,
          variant: "default",
        });

        // Keep loading state active during retry
        setSaving(true);

        // Add delay before retry
        setTimeout(() => {
          handleComplete();
        }, 1000 * (retryCount + 1)); // Exponential backoff

        return; // Don't show error toast yet, we're retrying
      }

      // Reset retry count on final failure
      setRetryCount(0);

      // Log additional context for debugging
      console.error('Onboarding error details:', {
        error: error instanceof Error ? error.message : String(error),
        userId: user?.id,
        primaryRole,
        isAlsoPublisher,
        step: currentStep,
        retryCount
      });
    } finally {
      setSaving(false);
    }
  };

  const getStepTitle = () => {
    if (primaryRole === 'publisher') {
      // Original publisher flow
      switch (currentStep) {
        case 1: return "Welcome! Let's get you set up";
        case 2: return "Tell us about yourself";
        case 3: return "Your organization";
        case 4: return "Set up your first media outlet";
        default: return "Getting started";
      }
    } else {
      // Simplified buyer flow
      switch (currentStep) {
        case 1: return "Welcome! Let's get you set up";
        case 2: return "Tell us about yourself";
        case 3: return "Do you have media websites?";
        case 4: return "You're all set!";
        default: return "Getting started";
      }
    }
  };

  const getStepDescription = () => {
    if (primaryRole === 'publisher') {
      // Original publisher flow
      switch (currentStep) {
        case 1: return "We'll help you set up your account in just a few steps";
        case 2: return "Add some personal information to complete your profile";
        case 3: return "Organization details are required for payments";
        case 4: return "Add your first media outlet to start receiving orders";
        default: return "";
      }
    } else {
      // Simplified buyer flow
      switch (currentStep) {
        case 1: return "We'll help you set up your account in just a few steps";
        case 2: return "Add some personal information to complete your profile";
        case 3: return "Do you have media websites you'd like to upload to our marketplace?";
        case 4: return "You're all set! Ready to explore the marketplace?";
        default: return "";
      }
    }
  };

  const getStepIcon = () => {
    if (primaryRole === 'publisher') {
      // Original publisher flow
      switch (currentStep) {
        case 1: return <Sparkles className="h-6 w-6" />;
        case 2: return <User className="h-6 w-6" />;
        case 3: return <Building className="h-6 w-6" />;
        case 4: return <Package className="h-6 w-6" />;
        default: return <User className="h-6 w-6" />;
      }
    } else {
      // Simplified buyer flow
      switch (currentStep) {
        case 1: return <Sparkles className="h-6 w-6" />;
        case 2: return <User className="h-6 w-6" />;
        case 3: return <Globe className="h-6 w-6" />;
        case 4: return <CheckCircle className="h-6 w-6" />;
        default: return <User className="h-6 w-6" />;
      }
    }
  };

  const isStepValid = () => {
    if (primaryRole === 'publisher') {
      // Original publisher flow validation
      switch (currentStep) {
        case 1: return true;
        case 2: return profileData.displayName.length > 0;
        case 3: return profileData.company && profileData.country;
        case 4: return profileData.mediaOutletDomain && profileData.mediaOutletCategory && profileData.mediaOutletPrice;
        default: return true;
      }
    } else {
      // Simplified buyer flow validation
      switch (currentStep) {
        case 1: return true;
        case 2: return profileData.displayName.length > 0;
        case 3: return isAlsoPublisher !== null; // Must answer the publisher question
        case 4: return true; // Completion step
        default: return true;
      }
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
                  <h3 className="text-lg font-medium">Welcome to <span className="text-teal-600 tracking-wide">MOODY MEDIA</span>! 👋</h3>
                  <p className="text-muted-foreground">
                    You're signed up as a <Badge variant="outline" className="mx-1">{primaryRole}</Badge>
                    {primaryRole === 'buyer' && "Ready to purchase high-quality link placements?"}
                    {primaryRole === 'publisher' && "Ready to monetize your media outlets?"}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {primaryRole === 'buyer' ? (
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

            {/* Step 3: Organization (Publisher), Publisher Question (Buyer), or Banking (Publisher) */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {primaryRole === 'publisher' ? (
                  // Original publisher organization step
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
                  // Simplified buyer publisher question step
                  <div className="text-center space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Do you have media websites?</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        If you own websites or blogs, you can upload them to our marketplace and start earning money by selling link placements.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                      <Button
                        variant={isAlsoPublisher === true ? "default" : "outline"}
                        className="h-20 flex flex-col items-center justify-center space-y-2"
                        onClick={() => setIsAlsoPublisher(true)}
                      >
                        <Globe className="h-6 w-6" />
                        <span>Yes, I have websites</span>
                        <span className="text-xs opacity-70">Add publisher rights</span>
                      </Button>
                      
                      <Button
                        variant={isAlsoPublisher === false ? "default" : "outline"}
                        className="h-20 flex flex-col items-center justify-center space-y-2"
                        onClick={() => setIsAlsoPublisher(false)}
                      >
                        <User className="h-6 w-6" />
                        <span>No, just buying</span>
                        <span className="text-xs opacity-70">Continue as buyer only</span>
                      </Button>
                    </div>

                    {isAlsoPublisher === true && (
                      <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-sm text-muted-foreground">
                          Perfect! We'll add publisher rights to your account. You can upload your websites later in your dashboard.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Media Outlet Setup (Publishers) or Completion (Buyers) */}
            {currentStep === 4 && (
              <div className="space-y-4">
                {primaryRole === 'publisher' ? (
                  // Media outlet setup for original publishers
                  <>
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
                      <div className="flex flex-wrap gap-2 mt-2 mb-3">
                        {profileData.mediaOutletNiches.map((niche) => (
                          <Badge key={niche} variant="secondary" className="flex items-center gap-1">
                            {niche}
                            <button
                              type="button"
                              onClick={() => removeNiche(niche)}
                              className="ml-1 hover:text-red-500"
                            >
                              ×
                            </button>
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
                  </>
                ) : (
                  // Completion step for buyers
                  <div className="text-center space-y-6">
                    <div className="space-y-4">
                      <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
                      <div>
                        <h3 className="text-2xl font-medium">Welcome to <span className="text-teal-600 tracking-wide">MOODY MEDIA</span>! 🎉</h3>
                        <p className="text-muted-foreground mt-2">
                          Your account is ready! {isAlsoPublisher ? "You now have both buyer and publisher rights." : "Start exploring our marketplace of quality media outlets."}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                      <div className="p-4 border rounded-lg bg-primary/5">
                        <Target className="h-8 w-8 text-primary mb-2" />
                        <h4 className="font-medium">Browse Media Outlets</h4>
                        <p className="text-sm text-muted-foreground">Find quality sites in your niche</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-primary/5">
                        <Users className="h-8 w-8 text-primary mb-2" />
                        <h4 className="font-medium">Easy Ordering</h4>
                        <p className="text-sm text-muted-foreground">Simple cart and checkout process</p>
                      </div>
                    </div>

                    {isAlsoPublisher && (
                      <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-sm">
                          🚀 <strong>Publisher Bonus:</strong> You can now upload your websites in your dashboard to start earning from link placements!
                        </p>
                      </div>
                    )}

                    {!isAlsoPublisher && (
                      <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-sm">
                          💡 <strong>Tip:</strong> You can always add publisher capabilities later in your profile settings if you decide to monetize your own websites.
                        </p>
                      </div>
                    )}
                  </div>
                )}
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