import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: any) => {
  console.log(`[admin-payouts] ${step}`, details ? JSON.stringify(details) : '');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting payouts request');

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
    const action = url.searchParams.get('action'); // 'stats', 'queue', or null for both
    const export_format = url.searchParams.get('export');

    if (req.method === 'GET') {
      // Get payout statistics
      const { data: referralStats, error: statsError } = await supabase
        .from('referrals')
        .select('status, reward_amount, total_spent');

      if (statsError) {
        logStep('Referral stats error', statsError);
        return new Response(JSON.stringify({ error: 'Failed to fetch referral stats' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const totalEarned = (referralStats || []).reduce((sum, ref) => sum + Number(ref.reward_amount || 0), 0);
      const totalSpent = (referralStats || []).reduce((sum, ref) => sum + Number(ref.total_spent || 0), 0);

      // Get payout requests
      const { data: payoutRequests, error: payoutsError } = await supabase
        .from('payout_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (payoutsError) {
        logStep('Payout requests error', payoutsError);
        return new Response(JSON.stringify({ error: 'Failed to fetch payout requests' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const pendingPayouts = (payoutRequests || []).filter(p => p.status === 'requested');
      const approvedPayouts = (payoutRequests || []).filter(p => p.status === 'approved');
      const paidPayouts = (payoutRequests || []).filter(p => p.status === 'paid');

      const totalPending = pendingPayouts.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalApproved = approvedPayouts.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalPaid = paidPayouts.reduce((sum, p) => sum + Number(p.amount), 0);

      if (export_format === 'csv') {
        const csvHeaders = 'ID,Referrer User ID,Amount,Status,Requested At,Processed At,Notes';
        const csvRows = (payoutRequests || []).map(payout => 
          `${payout.id},${payout.referrer_user_id},${payout.amount},${payout.status},${payout.requested_at},${payout.processed_at || ''},${payout.notes || ''}`
        );
        const csvData = [csvHeaders, ...csvRows].join('\n');

        return new Response(csvData, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="payouts.csv"'
          }
        });
      }

      const response = {
        stats: {
          total_earned: totalEarned,
          total_spent: totalSpent,
          total_pending: totalPending,
          total_approved: totalApproved,
          total_paid: totalPaid,
          conversion_rate: referralStats && referralStats.length > 0 
            ? (referralStats.filter(r => r.status === 'first_order_completed').length / referralStats.length * 100).toFixed(2)
            : 0
        },
        queue: payoutRequests || [],
        pending_count: pendingPayouts.length,
        approved_count: approvedPayouts.length
      };

      logStep('Payouts response prepared', { queue_count: payoutRequests?.length || 0 });

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (req.method === 'POST') {
      // Handle payout actions (approve, deny, mark paid)
      const body = await req.json();
      const { payout_id, action_type, notes } = body;

      if (!payout_id || !action_type) {
        return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      logStep('Payout action', { payout_id, action_type, notes });

      // Get current payout request
      const { data: currentPayout, error: fetchError } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('id', payout_id)
        .single();

      if (fetchError || !currentPayout) {
        logStep('Payout not found', fetchError);
        return new Response(JSON.stringify({ error: 'Payout request not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let newStatus = currentPayout.status;
      const updateData: any = {
        processed_by: user.id,
        processed_at: new Date().toISOString()
      };

      switch (action_type) {
        case 'approve':
          if (currentPayout.status !== 'requested') {
            return new Response(JSON.stringify({ error: 'Can only approve requested payouts' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          newStatus = 'approved';
          break;
        case 'deny':
          if (currentPayout.status !== 'requested') {
            return new Response(JSON.stringify({ error: 'Can only deny requested payouts' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          newStatus = 'denied';
          break;
        case 'mark_paid':
          if (currentPayout.status !== 'approved') {
            return new Response(JSON.stringify({ error: 'Can only mark approved payouts as paid' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          newStatus = 'paid';
          break;
        default:
          return new Response(JSON.stringify({ error: 'Invalid action type' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
      }

      updateData.status = newStatus;
      if (notes) {
        updateData.notes = notes;
      }

      // Update payout request
      const { error: updateError } = await supabase
        .from('payout_requests')
        .update(updateData)
        .eq('id', payout_id);

      if (updateError) {
        logStep('Update error', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update payout request' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create audit log entry
      const auditEntry = {
        actor_user_id: user.id,
        action: `payout_${action_type}`,
        target_table: 'payout_requests',
        target_id: payout_id,
        before_data: { status: currentPayout.status },
        after_data: { status: newStatus },
        metadata: { action_type, notes, amount: currentPayout.amount }
      };

      const { error: auditError } = await supabase
        .from('audit_log')
        .insert(auditEntry);

      if (auditError) {
        logStep('Audit log error', auditError);
        // Don't fail the request for audit errors
      }

      logStep('Payout action completed', { payout_id, action_type, new_status: newStatus });

      return new Response(JSON.stringify({
        message: `Payout ${action_type} completed`,
        payout_id,
        new_status: newStatus
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    logStep('Unexpected error', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})