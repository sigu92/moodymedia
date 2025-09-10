import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: any) => {
  console.log(`[admin-accounts] ${step}`, details ? JSON.stringify(details) : '');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting accounts overview request');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      logStep('Auth error', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is platform admin
    const { data: isAdmin, error: adminError } = await supabase
      .rpc('is_platform_admin');

    if (adminError || !isAdmin) {
      logStep('Admin check failed', { isAdmin, adminError });
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const sort_by = url.searchParams.get('sort_by') || 'created_at';
    const sort_order = url.searchParams.get('sort_order') || 'desc';
    const min_orders = url.searchParams.get('min_orders');
    const min_spend = url.searchParams.get('min_spend');
    const has_pending = url.searchParams.get('has_pending') === 'true';
    const export_format = url.searchParams.get('export');

    const offset = (page - 1) * limit;

    logStep('Accounts parameters', { page, limit, sort_by, sort_order, min_orders, min_spend, has_pending });

    // Get all users with their profiles and roles
    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        created_at,
        user_roles!user_roles_user_id_fkey (
          role
        )
      `)
      .order('created_at', { ascending: false });

    if (usersError) {
      logStep('Users query error', usersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user emails from auth.users (using service role key)
    const userIds = usersData?.map(u => u.user_id) || [];
    
    // Get orders aggregated by user
    const { data: orderStats, error: ordersError } = await supabase
      .from('orders')
      .select('buyer_id, price, status, created_at')
      .in('buyer_id', userIds);

    if (ordersError) {
      logStep('Orders query error', ordersError);
    }

    // Get referral earnings
    const { data: referralStats, error: referralError } = await supabase
      .from('referral_transactions')
      .select('user_id, amount, status')
      .in('user_id', userIds);

    if (referralError) {
      logStep('Referral query error', referralError);
    }

    // Aggregate data per user
    const accountsData = (usersData || []).map(userProfile => {
      const userId = userProfile.user_id;
      const userOrders = (orderStats || []).filter(o => o.buyer_id === userId);
      const userReferrals = (referralStats || []).filter(r => r.user_id === userId);

      const totalOrders = userOrders.length;
      const paidOrders = userOrders.filter(o => ['published', 'verified'].includes(o.status));
      const pendingOrders = userOrders.filter(o => ['requested', 'accepted', 'content_received'].includes(o.status));

      const totalSpend = paidOrders.reduce((sum, order) => sum + Number(order.price), 0);
      const pendingPayments = pendingOrders.reduce((sum, order) => sum + Number(order.price), 0);
      const referralEarnings = userReferrals.reduce((sum, ref) => sum + Number(ref.amount), 0);

      const lastOrderDate = userOrders.length > 0 
        ? new Date(Math.max(...userOrders.map(o => new Date(o.created_at).getTime())))
        : null;

      return {
        user_id: userId,
        created_at: userProfile.created_at,
        role: userProfile.user_roles?.role || 'buyer',
        total_orders: totalOrders,
        paid_orders: paidOrders.length,
        pending_orders: pendingOrders.length,
        total_spend: totalSpend,
        pending_payments: pendingPayments,
        referral_earnings: referralEarnings,
        last_order_date: lastOrderDate,
        // Email will need to be fetched separately with admin privileges
        email: `user_${userId.substring(0, 8)}` // Placeholder - would need auth.users access
      };
    });

    // Apply filters
    let filteredAccounts = accountsData;

    if (min_orders) {
      filteredAccounts = filteredAccounts.filter(a => a.total_orders >= parseInt(min_orders));
    }

    if (min_spend) {
      filteredAccounts = filteredAccounts.filter(a => a.total_spend >= parseFloat(min_spend));
    }

    if (has_pending) {
      filteredAccounts = filteredAccounts.filter(a => a.pending_payments > 0);
    }

    // Apply sorting
    filteredAccounts.sort((a, b) => {
      let aVal = a[sort_by as keyof typeof a];
      let bVal = b[sort_by as keyof typeof b];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (sort_order === 'desc') {
        return bVal > aVal ? 1 : -1;
      } else {
        return aVal > bVal ? 1 : -1;
      }
    });

    // Apply pagination
    const totalCount = filteredAccounts.length;
    const paginatedAccounts = filteredAccounts.slice(offset, offset + limit);

    if (export_format === 'csv') {
      const csvHeaders = 'User ID,Created At,Role,Total Orders,Total Spend,Pending Payments,Referral Earnings';
      const csvRows = filteredAccounts.map(account => 
        `${account.user_id},${account.created_at},${account.role},${account.total_orders},${account.total_spend},${account.pending_payments},${account.referral_earnings}`
      );
      const csvData = [csvHeaders, ...csvRows].join('\n');

      return new Response(csvData, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="accounts.csv"'
        }
      });
    }

    const response = {
      accounts: paginatedAccounts,
      pagination: {
        page,
        limit,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / limit)
      },
      filters: { min_orders, min_spend, has_pending, sort_by, sort_order }
    };

    logStep('Accounts response prepared', { count: paginatedAccounts.length, total: totalCount });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logStep('Unexpected error', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})