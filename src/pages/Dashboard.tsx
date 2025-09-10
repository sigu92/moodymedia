import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingFlow from "@/components/OnboardingFlow";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { userRole, needsOnboarding, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to role-specific dashboard
    if (userRole && !needsOnboarding) {
      if (userRole === 'publisher') {
        navigate('/dashboard/publisher', { replace: true });
      } else if (userRole === 'admin') {
        navigate('/dashboard/admin', { replace: true });
      } else {
        navigate('/dashboard/marketplace', { replace: true });
      }
    }
  }, [userRole, needsOnboarding, navigate]);

  if (needsOnboarding) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="glass-card p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Redirecting to your dashboard...</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;