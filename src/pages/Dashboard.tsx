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
    <div className="min-h-screen bg-white">
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-3">Welcome to <span className="text-green-600 tracking-wide">MOODY MEDIA</span></h1>
              <p className="text-lg text-gray-600">Your premium SEO marketplace platform</p>
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

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Quick Actions</h2>
            <div className="space-y-4">
              <button
                onClick={() => navigate('/marketplace')}
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">M</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Browse Marketplace</div>
                    <div className="text-sm text-gray-600">Find media outlets for your campaigns</div>
                  </div>
                </div>
              </button>

              {userRoles?.includes('publisher') && (
                <button
                  onClick={() => navigate('/dashboard/publisher')}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">P</span>
                  </div>
                    <div>
                      <div className="font-semibold text-gray-800">Publisher Dashboard</div>
                      <div className="text-sm text-gray-600">Manage your media outlets</div>
                    </div>
                  </div>
                </button>
              )}

              <button
                onClick={() => navigate('/orders')}
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">O</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">View Orders</div>
                    <div className="text-sm text-gray-600">Track your campaigns</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Account Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-sm font-medium text-gray-700">Account Setup</span>
                <span className="text-green-600 font-semibold">Complete</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-sm font-medium text-gray-700">User Roles</span>
                <div className="flex flex-wrap gap-2">
                  {userRoles?.includes('system_admin') && (
                    <span className="text-xs bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium">System Admin</span>
                  )}
                  {userRoles?.includes('admin') && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">Admin</span>
                  )}
                  {userRoles?.includes('publisher') && (
                    <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">Publisher</span>
                  )}
                  {userRoles?.includes('buyer') && (
                    <span className="text-xs bg-gray-100 text-gray-800 px-3 py-1 rounded-full font-medium">Buyer</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-sm font-medium text-gray-700">Features</span>
                <span className="text-green-600 font-semibold">Enabled</span>
              </div>
            </div>
          </div>

          {/* Get Started */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Get Started</h2>
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                <h3 className="font-semibold text-gray-800 mb-2">Explore the Marketplace</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Browse verified media outlets and place your first order
                </p>
                <button
                  onClick={() => navigate('/marketplace')}
                  className="text-sm text-black font-medium hover:text-gray-600 transition-colors"
                >
                  Start browsing →
                </button>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                <h3 className="font-semibold text-gray-800 mb-2">Need Help?</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Check out our pricing and analytics tools
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/pricing')}
                    className="text-sm text-black font-medium hover:text-gray-600 transition-colors"
                  >
                    Pricing
                  </button>
                  <span className="text-gray-400">•</span>
                  <button
                    onClick={() => navigate('/price-analytics')}
                    className="text-sm text-black font-medium hover:text-gray-600 transition-colors"
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