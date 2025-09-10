import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface ReferralData {
  id: string;
  code: string;
  status: string;
  reward_amount: number;
  reward_paid: boolean;
  first_order_date?: string;
  total_orders: number;
  total_spent: number;
  created_at: string;
  referred_user_id?: string;
}

export interface ReferralTransaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  description?: string;
  created_at: string;
  paid_at?: string;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  conversionRate: number;
}

export const useReferrals = () => {
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [transactions, setTransactions] = useState<ReferralTransaction[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const generateOrFetchReferralCode = async () => {
    if (!user) return;

    try {
      // Check if user already has a referral code
      const { data: existingCode, error } = await supabase
        .from('referrals')
        .select('code')
        .eq('user_id', user.id)
        .eq('referred_user_id', null) // Main referral code, not a referred entry
        .single();

      if (existingCode) {
        setReferralCode(existingCode.code);
      } else {
        // Generate new referral code
        const timestamp = Date.now().toString(36).toUpperCase();
        const userPrefix = user.email?.slice(0, 3).toUpperCase() || 'USR';
        const newCode = `${userPrefix}${timestamp}`;
        
        const { error: insertError } = await supabase
          .from('referrals')
          .insert({
            user_id: user.id,
            code: newCode,
            status: 'active'
          });

        if (insertError) throw insertError;
        setReferralCode(newCode);
      }
    } catch (error) {
      console.error('Error with referral code:', error);
      toast({
        title: "Error",
        description: "Failed to generate referral code",
        variant: "destructive",
      });
    }
  };

  const fetchReferralData = async () => {
    if (!user) return;

    try {
      // Fetch user's referrals (people they referred)
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select('*')
        .eq('user_id', user.id)
        .not('referred_user_id', 'is', null);

      if (referralError) throw referralError;

      // Fetch referral transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('referral_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionError) throw transactionError;

      setReferrals(referralData || []);
      setTransactions(transactionData || []);

      // Calculate stats
      const activeReferrals = referralData?.filter(r => r.status === 'first_order_completed').length || 0;
      const totalReferrals = referralData?.length || 0;
      const pendingEarnings = transactionData?.filter(t => t.status === 'pending').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const paidEarnings = transactionData?.filter(t => t.status === 'paid').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const conversionRate = totalReferrals > 0 ? Math.round((activeReferrals / totalReferrals) * 100) : 0;

      setStats({
        totalReferrals,
        activeReferrals,
        totalEarnings: pendingEarnings + paidEarnings,
        pendingEarnings,
        paidEarnings,
        conversionRate
      });

    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast({
        title: "Error",
        description: "Failed to load referral data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = (medium: 'general' | 'email' | 'social' = 'general') => {
    const baseUrl = window.location.origin;
    const referralLink = `${baseUrl}/?ref=${referralCode}&utm_source=referral&utm_medium=${medium}`;
    
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });

    return referralLink;
  };

  const generateSocialShareLinks = () => {
    const referralLink = encodeURIComponent(`${window.location.origin}/?ref=${referralCode}`);
    const shareText = encodeURIComponent("Join this amazing SEO marketplace and get 10% off your first order!");
    
    return {
      twitter: `https://twitter.com/intent/tweet?text=${shareText}&url=${referralLink}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${referralLink}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${referralLink}`,
      email: `mailto:?subject=${encodeURIComponent("Special Offer - SEO Marketplace")}&body=${shareText}%20${referralLink}`
    };
  };

  const markTransactionAsPaid = async (transactionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('referral_transactions')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Transaction Updated",
        description: "Transaction marked as paid",
      });

      // Refresh data
      fetchReferralData();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      });
    }
  };

  const createReferralReward = async (referralId: string, amount: number, description: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('referral_transactions')
        .insert({
          user_id: user.id,
          referral_id: referralId,
          amount: amount,
          type: 'reward',
          description: description,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Reward Created",
        description: `€${amount} reward added to your account`,
      });

      fetchReferralData();
    } catch (error) {
      console.error('Error creating reward:', error);
      toast({
        title: "Error",
        description: "Failed to create reward",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      generateOrFetchReferralCode();
      fetchReferralData();
    }
  }, [user]);

  return {
    referralCode,
    referrals,
    transactions,
    stats,
    loading,
    copyReferralLink,
    generateSocialShareLinks,
    markTransactionAsPaid,
    createReferralReward,
    refetch: fetchReferralData
  };
};