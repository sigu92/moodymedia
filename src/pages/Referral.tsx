import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, TrendingUp, DollarSign, Gift, Trophy, Target } from "lucide-react";
import { useReferrals } from "@/hooks/useReferrals";
import { ReferralShare } from "@/components/referral/ReferralShare";
import { ReferralAnalytics } from "@/components/referral/ReferralAnalytics";
import { ReferralRewards } from "@/components/referral/ReferralRewards";

const Referral = () => {
  const { 
    referralCode, 
    referrals, 
    transactions, 
    stats, 
    loading, 
    copyReferralLink, 
    generateSocialShareLinks 
  } = useReferrals();

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
          <h1 className="text-3xl font-bold text-foreground mb-2">Referral Program</h1>
          <p className="text-muted-foreground">
            Earn €25 for each successful referral and help grow our community
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="share" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Share & Earn
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Rewards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <ReferralAnalytics 
              referrals={referrals}
              transactions={transactions}
              stats={stats}
            />
          </TabsContent>

          <TabsContent value="share" className="space-y-6">
            <ReferralShare
              referralCode={referralCode}
              onCopy={copyReferralLink}
              generateSocialLinks={generateSocialShareLinks}
            />
          </TabsContent>

          <TabsContent value="rewards" className="space-y-6">
            <ReferralRewards
              referrals={referrals}
              transactions={transactions}
              stats={stats}
            />
          </TabsContent>

        </Tabs>

        {/* Program Terms */}
        <div className="mt-12 p-6 bg-muted/30 rounded-lg">
          <h3 className="font-semibold mb-4">📋 Referral Program Terms</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="space-y-2">
              <p>• <strong>€25 reward</strong> per successful referral</p>
              <p>• <strong>10% discount</strong> for new users</p>
              <p>• Reward paid after first completed order</p>
              <p>• Minimum payout threshold: €50</p>
            </div>
            <div className="space-y-2">
              <p>• Monthly payout processing</p>
              <p>• No limit on referrals</p>
              <p>• Self-referrals not allowed</p>
              <p>• Terms subject to change with notice</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Referral;