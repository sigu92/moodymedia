import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Users, TrendingUp, DollarSign, Gift, Trophy, Target, Star, Zap, Calendar, Share2 } from "lucide-react";
import { useReferrals } from "@/hooks/useReferrals";
import { useAuth } from "@/contexts/AuthContext";
import { ReferralShare } from "@/components/referral/ReferralShare";
import { ReferralAnalytics } from "@/components/referral/ReferralAnalytics";
import { ReferralRewards } from "@/components/referral/ReferralRewards";

const PublisherReferral = () => {
  const { userRole } = useAuth();
  const { 
    referralCode, 
    referrals, 
    transactions, 
    stats, 
    loading, 
    copyReferralLink, 
    generateSocialShareLinks 
  } = useReferrals();

  // Publisher-specific referral benefits
  const publisherBenefits = [
    {
      icon: DollarSign,
      title: "Higher Commission Rates",
      description: "Earn €35 per publisher referral vs €25 for buyer referrals",
      highlight: true
    },
    {
      icon: Star,
      title: "Premium Publisher Bonus",
      description: "Extra €15 when referred publisher reaches 10 completed orders",
      highlight: true
    },
    {
      icon: Target,
      title: "Network Growth Rewards",
      description: "Build your publisher network and earn recurring bonuses",
      highlight: false
    },
    {
      icon: Gift,
      title: "Early Access Features",
      description: "Get priority access to new publisher tools and features",
      highlight: false
    }
  ];

  const publisherMilestones = [
    { referrals: 1, reward: "€35", bonus: "Welcome bonus", achieved: (stats?.totalReferrals || 0) >= 1 },
    { referrals: 5, reward: "€200", bonus: "Network builder", achieved: (stats?.totalReferrals || 0) >= 5 },
    { referrals: 10, reward: "€500", bonus: "Community leader", achieved: (stats?.totalReferrals || 0) >= 10 },
    { referrals: 25, reward: "€1,500", bonus: "Elite publisher", achieved: (stats?.totalReferrals || 0) >= 25 },
    { referrals: 50, reward: "€3,500", bonus: "Master networker", achieved: (stats?.totalReferrals || 0) >= 50 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="glass-card p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading referral data...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="glass-card-primary p-8 gradient-header text-white rounded-lg">
            <h1 className="text-4xl font-heading font-bold mb-3">Publisher Referral Program</h1>
            <p className="text-white/90 text-lg">
              Grow the publisher network and earn premium rewards for building our community
            </p>
          </div>
        </div>

        {/* Publisher-specific benefits */}
        {userRole === 'publisher' && (
          <div className="mb-8">
            <Card className="glass-card-clean shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Publisher Exclusive Benefits
                </CardTitle>
                <CardDescription>
                  Enhanced rewards for growing our publisher community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {publisherBenefits.map((benefit, index) => (
                    <div 
                      key={index}
                      className={`p-4 rounded-lg glass-card-light transition-all duration-300 hover:shadow-medium ${
                        benefit.highlight ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                          <benefit.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">{benefit.title}</h4>
                          <p className="text-sm text-muted-foreground">{benefit.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="share" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share & Earn
            </TabsTrigger>
            <TabsTrigger value="milestones" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Milestones
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
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

          <TabsContent value="milestones" className="space-y-6">
            {/* Publisher-specific milestones */}
            <Card className="glass-card-clean shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Publisher Network Milestones
                </CardTitle>
                <CardDescription>
                  Special rewards for building the publisher community
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {publisherMilestones.map((milestone, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 glass-card-light rounded-lg">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      milestone.achieved 
                        ? 'bg-green-500 border-green-500' 
                        : 'border-muted-foreground'
                    }`}>
                      {milestone.achieved && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{milestone.referrals} Publisher Referrals</span>
                        <Badge variant={milestone.achieved ? "default" : "secondary"}>
                          {milestone.reward}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{milestone.bonus}</p>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {Math.min(stats?.totalReferrals || 0, milestone.referrals)}/{milestone.referrals}
                      </div>
                      <Progress 
                        value={Math.min((stats?.totalReferrals || 0) / milestone.referrals * 100, 100)} 
                        className="w-20 h-2 mt-1"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Progress to next milestone */}
            <Card className="glass-card-clean shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Next Milestone Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const nextMilestone = publisherMilestones.find(m => !m.achieved);
                  const currentReferrals = stats?.totalReferrals || 0;
                  
                  if (!nextMilestone) {
                    return (
                      <div className="text-center py-8">
                        <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">All Milestones Achieved!</h3>
                        <p className="text-muted-foreground">
                          Congratulations! You've unlocked all publisher milestones.
                        </p>
                      </div>
                    );
                  }
                  
                  const remaining = nextMilestone.referrals - currentReferrals;
                  const progress = (currentReferrals / nextMilestone.referrals) * 100;
                  
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{nextMilestone.bonus}</h4>
                          <p className="text-sm text-muted-foreground">
                            {remaining} more referral{remaining !== 1 ? 's' : ''} to unlock {nextMilestone.reward}
                          </p>
                        </div>
                        <Badge variant="outline" className="glass-button">
                          {currentReferrals}/{nextMilestone.referrals}
                        </Badge>
                      </div>
                      <Progress value={progress} className="h-3" />
                      <p className="text-xs text-muted-foreground">
                        {progress.toFixed(1)}% complete
                      </p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="space-y-6">
            <ReferralRewards
              referrals={referrals}
              transactions={transactions}
              stats={stats}
            />
          </TabsContent>

        </Tabs>

        {/* Enhanced Program Terms for Publishers */}
        <div className="mt-12">
          <Card className="glass-card-clean">
            <CardHeader>
              <CardTitle>📋 Publisher Referral Program Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <p>• <strong>€35 reward</strong> per successful publisher referral</p>
                  <p>• <strong>€15 bonus</strong> when referred publisher completes 10 orders</p>
                  <p>• <strong>€25 reward</strong> per buyer referral</p>
                  <p>• <strong>10% discount</strong> for all new referrals</p>
                  <p>• Milestone bonuses for network growth</p>
                </div>
                <div className="space-y-2">
                  <p>• Monthly payout processing</p>
                  <p>• Minimum payout threshold: €50</p>
                  <p>• No limit on referrals</p>
                  <p>• Self-referrals not allowed</p>
                  <p>• Enhanced tracking for publisher accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PublisherReferral;