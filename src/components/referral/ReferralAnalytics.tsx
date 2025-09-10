import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Clock, 
  DollarSign, 
  User, 
  Calendar,
  TrendingUp,
  ShoppingCart
} from "lucide-react";
import { ReferralData, ReferralTransaction } from "@/hooks/useReferrals";

interface ReferralAnalyticsProps {
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

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'signup_completed':
      return <Badge variant="secondary" className="text-blue-700 bg-blue-50">Signed Up</Badge>;
    case 'first_order_completed':
      return <Badge variant="default" className="text-green-700 bg-green-50">Active</Badge>;
    case 'pending':
      return <Badge variant="outline" className="text-amber-700 bg-amber-50">Pending</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const ReferralAnalytics = ({ referrals, transactions, stats }: ReferralAnalyticsProps) => {
  const recentReferrals = referrals.slice(0, 5);
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">{stats.totalReferrals}</p>
              </div>
              <User className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{stats.activeReferrals}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{stats.conversionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold">€{stats.totalEarnings}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="text-sm font-medium">€{stats.pendingEarnings}</span>
              </div>
              <Progress 
                value={stats.totalEarnings > 0 ? (stats.pendingEarnings / stats.totalEarnings) * 100 : 0} 
                className="h-2"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Paid</span>
                <span className="text-sm font-medium">€{stats.paidEarnings}</span>
              </div>
              <Progress 
                value={stats.totalEarnings > 0 ? (stats.paidEarnings / stats.totalEarnings) * 100 : 0} 
                className="h-2 bg-green-100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Referrals */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            {recentReferrals.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No referrals yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentReferrals.map((referral) => (
                  <div 
                    key={referral.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(referral.status)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="h-4 w-4" />
                          {referral.total_orders} orders
                        </span>
                        <span className="text-muted-foreground">
                          €{referral.total_spent} spent
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">€{referral.reward_amount}</p>
                      {referral.reward_paid && (
                        <CheckCircle className="h-4 w-4 text-green-600 mx-auto mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{transaction.type}</span>
                        {transaction.status === 'pending' ? (
                          <Clock className="h-4 w-4 text-amber-600" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {transaction.description}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">€{transaction.amount}</p>
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
      </div>
    </div>
  );
};