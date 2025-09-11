import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'publisher'>('buyer');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user, needsOnboarding, userRoles, loading } = useAuth();
  const navigate = useNavigate();

  // Get referral code from URL parameters
  const referralCode = searchParams.get('ref');

  useEffect(() => {
    // Only redirect if user exists AND we have determined onboarding status AND roles are loaded
    if (user && !loading && userRoles !== null) {
      if (needsOnboarding) {
        // Redirect to dashboard so onboarding can show
        navigate('/dashboard', { replace: true });
      } else {
        // User has completed onboarding, redirect to appropriate dashboard
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, needsOnboarding, userRoles, loading, navigate]);

  // Show referral banner if there's a referral code
  useEffect(() => {
    if (referralCode) {
      toast({
        title: "🎉 Special Offer!",
        description: "You've been invited! Sign up to get 10% off your first order.",
        duration: 6000,
      });
    }
  }, [referralCode]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    // Don't navigate here - let the useEffect handle redirection after onboarding status is determined
    if (!error) {
      // AuthContext will handle redirection once onboarding status is checked
      console.log('✅ Sign in successful - waiting for onboarding check...');
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    const { error } = await signUp(email, password, selectedRole, referralCode || undefined);
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/5 p-4">
      <div className="w-full max-w-md space-y-6">
        {referralCode && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 text-center">
            <h3 className="font-semibold text-green-800 mb-1">🎉 You've been invited!</h3>
            <p className="text-sm text-green-700">
              Sign up now and get <strong>10% off</strong> your first order
            </p>
            <p className="text-xs text-green-600 mt-1">
              Referral code: <code className="bg-white px-1 rounded">{referralCode}</code>
            </p>
          </div>
        )}
        
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Moody Media
          </h1>
          <p className="text-muted-foreground mt-2">
            Your SEO marketplace platform
          </p>
        </div>

        <Card className="glass-card border-white/10">
          <CardHeader className="text-center">
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="glass-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="glass-input"
                    />
                  </div>
                  
                  <Button type="submit" className="w-full glass-button" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role-select">Account Type</Label>
                    <Select value={selectedRole} onValueChange={(value: 'buyer' | 'publisher') => setSelectedRole(value)}>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Select your account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buyer">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">SEO Buyer</span>
                            <span className="text-xs text-muted-foreground">Purchase link placements</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="publisher">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Media Publisher</span>
                            <span className="text-xs text-muted-foreground">Offer link placement services</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="glass-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="glass-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="glass-input"
                    />
                  </div>
                  
                  <Button type="submit" className="w-full glass-button" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;