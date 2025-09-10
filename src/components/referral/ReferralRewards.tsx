import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Gift, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Target,
  TrendingUp,
  Coins
} from "lucide-react";
import { ReferralData, ReferralTransaction } from "@/hooks/useReferrals";

interface ReferralRewardsProps {
  referrals: ReferralData[];
  transactions: ReferralTransaction[];
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    totalEarnings: number;
    pendingEarnings: number;
    paidEarnings: number;
    conversionRate: number;
  };
}

export const ReferralRewards = ({ referrals, transactions, stats }: ReferralRewardsProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Milestone rewards
  const milestones = [
    { referrals: 1, reward: 25, bonus: 0, description: "First referral bonus" },
    { referrals: 5, reward: 25, bonus: 50, description: "5 referrals milestone" },
    { referrals: 10, reward: 25, bonus: 100, description: "10 referrals milestone" },
    { referrals: 25, reward: 25, bonus: 250, description: "25 referrals milestone" },
    { referrals: 50, reward: 25, bonus: 500, description: "50 referrals milestone" },
  ];

  const currentMilestone = milestones.find(m => stats.activeReferrals < m.referrals) || milestones[milestones.length - 1];
  const nextMilestoneProgress = currentMilestone ? (stats.activeReferrals / currentMilestone.referrals) * 100 : 100;

  // Payout threshold
  const payoutThreshold = 50;
  const payoutProgress = (stats.pendingEarnings / payoutThreshold) * 100;

  // Tier system
  const getTierInfo = (referrals: number) => {
    if (referrals >= 50) return { name: "Diamond", color: "text-blue-600", bgColor: "bg-blue-50", commission: 30 };
    if (referrals >= 25) return { name: "Platinum", color: "text-purple-600", bgColor: "bg-purple-50", commission: 27.5 };
    if (referrals >= 10) return { name: "Gold", color: "text-yellow-600", bgColor: "bg-yellow-50", commission: 25 };
    if (referrals >= 5) return { name: "Silver", color: "text-gray-600", bgColor: "bg-gray-50", commission: 25 };
    return { name: "Bronze", color: "text-amber-600", bgColor: "bg-amber-50", commission: 25 };
  };

  const currentTier = getTierInfo(stats.activeReferrals);
  const nextTier = getTierInfo(stats.activeReferrals + 1);

  return (
    <div className="space-y-6">
      {/* Current Tier & Progress */}
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Your Referral Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full ${currentTier.bgColor} ${currentTier.color} font-medium`}>
                {currentTier.name} Tier
              </div>
              <span className="text-sm text-muted-foreground">
                €{currentTier.commission} per referral
              </span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{stats.activeReferrals}</div>
              <div className="text-sm text-muted-foreground">active referrals</div>
            </div>
          </div>

          {currentTier.name !== "Diamond" && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress to {nextTier.name}</span>
                <span>{stats.activeReferrals}/{currentMilestone.referrals}</span>
              </div>
              <Progress value={nextMilestoneProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payout Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Payout Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">€{stats.pendingEarnings}</div>
              <div className="text-sm text-muted-foreground">Pending earnings</div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress to payout</span>
                <span>€{stats.pendingEarnings}/€{payoutThreshold}</span>
              </div>
              <Progress value={Math.min(payoutProgress, 100)} className="h-3" />
            </div>

            <div className="text-center text-sm text-muted-foreground">
              {stats.pendingEarnings >= payoutThreshold ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Ready for payout!
                </div>
              ) : (
                <span>€{payoutThreshold - stats.pendingEarnings} more needed for payout</span>
              )}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Last payout:</span>
                <span className="text-muted-foreground">
                  {transactions.find(t => t.status === 'paid')?.paid_at 
                    ? new Date(transactions.find(t => t.status === 'paid')!.paid_at!).toLocaleDateString()
                    : 'No payouts yet'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>Next payout:</span>
                <span className="text-muted-foreground">1st of next month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Milestone Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Milestone Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {milestones.map((milestone, index) => {
              const isCompleted = stats.activeReferrals >= milestone.referrals;
              const isCurrent = currentMilestone.referrals === milestone.referrals;
              
              return (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isCompleted ? 'bg-green-50 border-green-200' : 
                    isCurrent ? 'bg-primary/5 border-primary/20' : 
                    'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : isCurrent ? (
                      <Target className="h-5 w-5 text-primary" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="font-medium">
                        {milestone.referrals} referrals
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {milestone.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      €{milestone.reward + milestone.bonus}
                    </div>
                    {milestone.bonus > 0 && (
                      <div className="text-xs text-green-600">
                        +€{milestone.bonus} bonus
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Earnings History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Earnings History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No earnings yet</p>
              <p className="text-sm">Start referring to see your earnings history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 10).map((transaction) => (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      transaction.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {transaction.status === 'paid' ? 
                        <CheckCircle className="h-4 w-4" /> : 
                        <Clock className="h-4 w-4" />
                      }
                    </div>
                    <div>
                      <div className="font-medium capitalize">{transaction.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.description}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">€{transaction.amount}</div>
                    <Badge 
                      variant={transaction.status === 'paid' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reward Information */}
      <Card>
        <CardHeader>
          <CardTitle>How Rewards Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">🎯 Referral Rewards</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• €25 for each successful referral</li>
                <li>• Bonus rewards at milestones</li>
                <li>• Higher commissions for top performers</li>
                <li>• No limit on earnings potential</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">💰 Payout Terms</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Minimum payout: €50</li>
                <li>• Monthly payout processing</li>
                <li>• Paid via bank transfer or PayPal</li>
                <li>• Detailed earning reports available</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};