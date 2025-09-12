import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Building,
  Shield,
  Save,
  Loader2,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  organization_id?: string;
  created_at: string;
}


const Profile = () => {
  const { user, userRole, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [profileForm, setProfileForm] = useState({
    email: '',
    displayName: '',
    bio: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      setProfile(profileData);

      // Set profile form data
      setProfileForm({
        email: user.email || '',
        displayName: user.user_metadata?.display_name || '',
        bio: user.user_metadata?.bio || ''
      });

    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          display_name: profileForm.displayName,
          bio: profileForm.bio
        }
      });
      
      if (authError) throw authError;
      
      // Create or update profile if it doesn't exist
      if (!profile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id
          });
          
        if (profileError) throw profileError;
      }
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      
      fetchProfile(); // Refresh data
      
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal account information
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Profile Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{profileForm.displayName || 'Set your display name'}</p>
                  <p className="text-sm text-muted-foreground">{profileForm.email}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Account Type</span>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {userRole?.charAt(0).toUpperCase() + userRole?.slice(1)}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant="default" className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    Active
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Member Since</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(profile?.created_at || '').toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
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
                    value={profileForm.email}
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
                    value={profileForm.displayName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Your display name"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              <Button onClick={handleSaveProfile} disabled={saving} className="w-full md:w-auto">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Organization Settings Link */}
          {hasRole('publisher') && (
            <Card className="mt-8 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <Building className="h-8 w-8 text-primary mx-auto" />
                  <div>
                    <h3 className="font-semibold">Organization Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete your organization information for professional invoicing and payments
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/settings'}
                    className="w-full md:w-auto"
                  >
                    Go to Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;