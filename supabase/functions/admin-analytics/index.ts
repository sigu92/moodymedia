import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: any) => {
  console.log(`[admin-analytics] ${step}`, details ? JSON.stringify(details) : '');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting admin analytics request');

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
      .rpc('is_user_admin');

    if (adminError || !isAdmin) {
      logStep('Admin check failed', { isAdmin, adminError });
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = url.searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    const interval = url.searchParams.get('interval') || 'day';
    const currency = url.searchParams.get('currency') || 'EUR';
    const export_format = url.searchParams.get('export');

    logStep('Analytics parameters', { startDate, endDate, interval, currency, export_format });

    // Get KPIs
    const { data: kpis, error: kpisError } = await supabase
      .from('orders')
      .select('id, price, currency, status, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .eq('currency', currency);

    if (kpisError) {
      logStep('KPIs query error', kpisError);
      return new Response(JSON.stringify({ error: 'Failed to fetch KPIs' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate KPIs
    const totalOrders = kpis?.length || 0;
    const paidOrders = kpis?.filter(o => o.status === 'published' || o.status === 'verified') || [];
    const pendingOrders = kpis?.filter(o => ['requested', 'accepted', 'content_received'].includes(o.status)) || [];
    
    const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.price), 0);
    const pendingRevenue = pendingOrders.reduce((sum, order) => sum + Number(order.price), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / paidOrders.length : 0;

    // Get top buyers
    const { data: topBuyers, error: buyersError } = await supabase
      .from('orders')
      .select(`
        buyer_id,
        price,
        profiles!orders_buyer_id_fkey (
          user_id
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .in('status', ['published', 'verified']);

    if (buyersError) {
      logStep('Top buyers query error', buyersError);
    }

    // Aggregate top buyers
    const buyerStats = (topBuyers || []).reduce((acc: any, order) => {
      const buyerId = order.buyer_id;
      if (!acc[buyerId]) {
        acc[buyerId] = { buyer_id: buyerId, total_spent: 0, order_count: 0 };
      }
      acc[buyerId].total_spent += Number(order.price);
      acc[buyerId].order_count += 1;
      return acc;
    }, {});

    const topBuyersList = Object.values(buyerStats)
      .sort((a: any, b: any) => b.total_spent - a.total_spent)
      .slice(0, 10);

    // Get top websites
    const { data: topWebsites, error: websitesError } = await supabase
      .from('orders')
      .select(`
        media_outlet_id,
        price,
        media_outlets!orders_media_outlet_id_fkey (
          domain
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .in('status', ['published', 'verified']);

    if (websitesError) {
      logStep('Top websites query error', websitesError);
    }

    // Aggregate top websites
    const websiteStats = (topWebsites || []).reduce((acc: any, order) => {
      const outletId = order.media_outlet_id;
      if (!acc[outletId]) {
        acc[outletId] = { 
          media_outlet_id: outletId, 
          domain: order.media_outlets?.domain,
          total_revenue: 0, 
          order_count: 0 
        };
      }
      acc[outletId].total_revenue += Number(order.price);
      acc[outletId].order_count += 1;
      return acc;
    }, {});

    const topWebsitesList = Object.values(websiteStats)
      .sort((a: any, b: any) => b.total_revenue - a.total_revenue)
      .slice(0, 10);

    // Time series data (simplified for now)
    const timeSeries = await supabase
      .from('orders')
      .select('created_at, price, status')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at');

    const response = {
      kpis: {
        total_orders: totalOrders,
        paid_orders: paidOrders.length,
        pending_orders: pendingOrders.length,
        total_revenue: totalRevenue,
        pending_revenue: pendingRevenue,
        avg_order_value: avgOrderValue,
        currency
      },
      top_buyers: topBuyersList,
      top_websites: topWebsitesList,
      time_series: timeSeries.data || [],
      date_range: { start_date: startDate, end_date: endDate, interval }
    };

    if (export_format === 'csv') {
      // Simple CSV export for KPIs
      const csvData = `Metric,Value,Currency
Total Orders,${totalOrders},${currency}
Paid Orders,${paidOrders.length},${currency}
Total Revenue,${totalRevenue},${currency}
Average Order Value,${avgOrderValue.toFixed(2)},${currency}`;

      return new Response(csvData, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="analytics.csv"'
        }
      });
    }

    logStep('Analytics response prepared', { kpiCount: Object.keys(response.kpis).length });

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