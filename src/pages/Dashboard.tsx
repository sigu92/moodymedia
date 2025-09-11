import { useNavigate } from "react-router-dom";
import OnboardingFlow from "@/components/OnboardingFlow";
import { useAuth } from "@/contexts/AuthContext";
import { RoleSwitcher } from "@/components/RoleSwitcher";

const Dashboard = () => {
  const { user, userRoles, needsOnboarding, completeOnboardingWithServerSync } = useAuth();
  const navigate = useNavigate();

  // Removed automatic redirection - users should stay on /dashboard
  // and navigate to specific areas as needed
  console.log('🏠 Dashboard: User on main dashboard');
  console.log('📊 Current roles:', userRoles);
  console.log('✅ Onboarding completed:', !needsOnboarding);

  // Enhanced completion handler that uses comprehensive server sync
  const handleOnboardingComplete = async () => {
    try {
      console.log('🏁 Dashboard: Starting comprehensive onboarding completion...');

      // Step 1: Execute comprehensive completion
      await completeOnboardingWithServerSync();
      console.log('✅ Dashboard: Comprehensive completion successful');

      // Step 2: Add small delay to ensure all state updates have propagated
      console.log('⏳ Dashboard: Allowing state updates to propagate...');
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('🎉 Dashboard: Onboarding completion process complete');

    } catch (error) {
      console.error('💥 Dashboard: Onboarding completion failed:', error);

      // Log detailed error context for debugging
      console.error('Dashboard completion failure details:', {
        error: error instanceof Error ? error.message : String(error),
        userId: user?.id,
        userRoles: userRoles?.length,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });

      // Note: Error handling simplified - comprehensive completion handles all cases
      console.log('📝 Dashboard: Onboarding completion failed - user can retry');
    }
  };

  if (needsOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Moody Media</h1>
              <p className="text-muted-foreground">Your SEO marketplace platform</p>
            </div>

            {/* Role Switcher for dual-role users */}
            <div className="flex items-center gap-4">
              <RoleSwitcher
                variant="outline"
                size="sm"
                showIcon={true}
                showText={true}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Quick Actions */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/marketplace')}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-primary font-semibold">M</span>
                  </div>
                  <div>
                    <div className="font-medium">Browse Marketplace</div>
                    <div className="text-sm text-muted-foreground">Find media outlets for your campaigns</div>
                  </div>
                </div>
              </button>

              {userRoles?.includes('publisher') && (
                <button
                  onClick={() => navigate('/dashboard/publisher')}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 font-semibold">P</span>
                    </div>
                    <div>
                      <div className="font-medium">Publisher Dashboard</div>
                      <div className="text-sm text-muted-foreground">Manage your media outlets</div>
                    </div>
                  </div>
                </button>
              )}

              <button
                onClick={() => navigate('/orders')}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">O</span>
                  </div>
                  <div>
                    <div className="font-medium">View Orders</div>
                    <div className="text-sm text-muted-foreground">Track your campaigns</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Account Status */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4">Account Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <span className="text-sm">Account Setup</span>
                <span className="text-green-600 font-medium">Complete</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <span className="text-sm">User Roles</span>
                <div className="flex flex-wrap gap-1">
                  {userRoles?.includes('system_admin') && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">System Admin</span>
                  )}
                  {userRoles?.includes('admin') && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Admin</span>
                  )}
                  {userRoles?.includes('publisher') && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Publisher</span>
                  )}
                  {userRoles?.includes('buyer') && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Buyer</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <span className="text-sm">Features</span>
                <span className="text-purple-600 font-medium">Enabled</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4">Get Started</h2>
            <div className="space-y-3">
              <div className="p-3 border border-border rounded-lg">
                <h3 className="font-medium mb-1">Explore the Marketplace</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Browse verified media outlets and place your first order
                </p>
                <button
                  onClick={() => navigate('/marketplace')}
                  className="text-sm text-primary hover:underline"
                >
                  Start browsing →
                </button>
              </div>

              <div className="p-3 border border-border rounded-lg">
                <h3 className="font-medium mb-1">Need Help?</h3>
                <p className="text-sm text-muted-foreground">
                  Check out our pricing and analytics tools
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => navigate('/pricing')}
                    className="text-sm text-primary hover:underline"
                  >
                    Pricing
                  </button>
                  <span className="text-muted-foreground">•</span>
                  <button
                    onClick={() => navigate('/price-analytics')}
                    className="text-sm text-primary hover:underline"
                  >
                    Analytics
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;