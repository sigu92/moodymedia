import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Download, Search, Filter, DollarSign, TrendingUp, CreditCard, Gift } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  memo: string;
  created_at: string;
}

interface ReferralTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  status: string;
  referrals: {
    code: string;
    referred_user_id: string;
  };
}

interface TransactionSummary {
  totalBalance: number;
  monthlySpent: number;
  totalEarned: number;
  pendingPayments: number;
}

export default function Transactions() {
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [referralTransactions, setReferralTransactions] = useState<ReferralTransaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary>({
    totalBalance: 0,
    monthlySpent: 0,
    totalEarned: 0,
    pendingPayments: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState("3months");
  const { user } = useAuth();

  const loadTransactions = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      const months = dateRange === "1month" ? 1 : dateRange === "3months" ? 3 : dateRange === "6months" ? 6 : 12;
      const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

      // Load wallet transactions
      const { data: walletData, error: walletError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (walletError) throw walletError;

      // Load referral transactions
      const { data: referralData, error: referralError } = await supabase
        .from('referral_transactions')
        .select(`
          *,
          referrals (
            code,
            referred_user_id
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (referralError) throw referralError;

      setWalletTransactions(walletData || []);
      setReferralTransactions(referralData || []);

      // Calculate summary
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const allWalletTransactions = walletData || [];
      const allReferralTransactions = referralData || [];

      const totalBalance = allWalletTransactions.reduce((sum, t) => {
        return sum + (t.type === 'credit' ? t.amount : -t.amount);
      }, 0);

      const monthlySpent = allWalletTransactions
        .filter(t => new Date(t.created_at) >= thisMonth && t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalEarned = allReferralTransactions
        .filter(t => t.type === 'reward')
        .reduce((sum, t) => sum + t.amount, 0);

      const pendingPayments = allReferralTransactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

      setSummary({
        totalBalance,
        monthlySpent,
        totalEarned,
        pendingPayments
      });

    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [user, dateRange]);

  const filteredWalletTransactions = walletTransactions.filter(transaction => {
    const matchesSearch = transaction.memo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         transaction.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const filteredReferralTransactions = referralTransactions.filter(transaction => {
    const matchesSearch = transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         transaction.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const exportTransactions = (type: 'wallet' | 'referral') => {
    const transactions = type === 'wallet' ? filteredWalletTransactions : filteredReferralTransactions;
    
    const headers = type === 'wallet' 
      ? ['Date', 'Type', 'Amount', 'Memo']
      : ['Date', 'Type', 'Amount', 'Description', 'Referral Code'];
    
    const csvData = [
      headers,
      ...transactions.map(t => type === 'wallet' 
        ? [
            format(new Date(t.created_at), 'yyyy-MM-dd'),
            t.type,
            t.amount,
            t.memo || ''
          ]
        : [
            format(new Date(t.created_at), 'yyyy-MM-dd'),
            t.type,
            t.amount,
            t.description || '',
            (t as ReferralTransaction).referrals?.code || ''
          ]
      )
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-transactions.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'debit':
        return <CreditCard className="h-4 w-4 text-red-600" />;
      case 'reward':
        return <Gift className="h-4 w-4 text-blue-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionBadgeVariant = (type: string) => {
    switch (type) {
      case 'credit':
      case 'reward':
        return 'default';
      case 'debit':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading transactions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground">Track your payments, earnings, and wallet activity</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card-light">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{summary.totalBalance.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Available funds</div>
          </CardContent>
        </Card>

        <Card className="glass-card-light">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-red-600" />
              This Month Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{summary.monthlySpent.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Current month</div>
          </CardContent>
        </Card>

        <Card className="glass-card-light">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-600" />
              Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{summary.totalEarned.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Referral rewards</div>
          </CardContent>
        </Card>

        <Card className="glass-card-light">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{summary.pendingPayments.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Awaiting payout</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card-light">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="credit">Credits</SelectItem>
                <SelectItem value="debit">Debits</SelectItem>
                <SelectItem value="reward">Rewards</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Tabs */}
      <Tabs defaultValue="wallet" className="space-y-4">
        <TabsList className="glass-card-light">
          <TabsTrigger value="wallet">Wallet Transactions</TabsTrigger>
          <TabsTrigger value="referral">Referral Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="wallet">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Wallet Transactions</CardTitle>
              <Button variant="outline" onClick={() => exportTransactions('wallet')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWalletTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWalletTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.type)}
                            <Badge variant={getTransactionBadgeVariant(transaction.type)}>
                              {transaction.type.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.memo || 'No description'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className={transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                            {transaction.type === 'credit' ? '+' : '-'}€{transaction.amount.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referral">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Referral Earnings</CardTitle>
              <Button variant="outline" onClick={() => exportTransactions('referral')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Referral Code</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferralTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No referral transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReferralTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.type)}
                            <Badge variant={getTransactionBadgeVariant(transaction.type)}>
                              {transaction.type.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.description || 'No description'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {transaction.referrals?.code || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className="text-green-600">
                            +€{transaction.amount.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}