import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: any) => {
  console.log(`[admin-websites-bulk-update] ${step}`, details ? JSON.stringify(details) : '');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting bulk update request');

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

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { action, website_ids, percentage, fixed_amount, new_price, floor, ceiling, round_to_99 } = body;

    logStep('Bulk update parameters', { action, website_ids, percentage, fixed_amount, new_price });

    if (!action || !website_ids || !Array.isArray(website_ids)) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get current websites data
    const { data: websites, error: fetchError } = await supabase
      .from('media_outlets')
      .select('id, domain, price, admin_tags')
      .in('id', website_ids);

    if (fetchError) {
      logStep('Failed to fetch websites', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch websites' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const updates = [];
    const auditEntries = [];

    for (const website of websites || []) {
      const oldPrice = Number(website.price);
      let newCalculatedPrice = oldPrice;

      // Apply price calculation based on action
      switch (action) {
        case 'percentage_increase':
          newCalculatedPrice = oldPrice * (1 + (percentage || 0) / 100);
          break;
        case 'percentage_decrease':
          newCalculatedPrice = oldPrice * (1 - (percentage || 0) / 100);
          break;
        case 'fixed_increase':
          newCalculatedPrice = oldPrice + (fixed_amount || 0);
          break;
        case 'fixed_decrease':
          newCalculatedPrice = oldPrice - (fixed_amount || 0);
          break;
        case 'set_price':
          newCalculatedPrice = new_price || oldPrice;
          break;
      }

      // Apply floor/ceiling constraints
      if (floor && newCalculatedPrice < floor) {
        newCalculatedPrice = floor;
      }
      if (ceiling && newCalculatedPrice > ceiling) {
        newCalculatedPrice = ceiling;
      }

      // Apply rounding to .99
      if (round_to_99) {
        newCalculatedPrice = Math.floor(newCalculatedPrice) + 0.99;
      }

      // Ensure price is not negative
      if (newCalculatedPrice < 0) {
        newCalculatedPrice = 0;
      }

      // Round to 2 decimal places
      newCalculatedPrice = Math.round(newCalculatedPrice * 100) / 100;

      if (newCalculatedPrice !== oldPrice) {
        updates.push({
          id: website.id,
          price: newCalculatedPrice
        });

        auditEntries.push({
          actor_user_id: user.id,
          action: 'bulk_price_update',
          target_table: 'media_outlets',
          target_id: website.id,
          before_data: { price: oldPrice, domain: website.domain },
          after_data: { price: newCalculatedPrice, domain: website.domain },
          metadata: { action_type: action, percentage, fixed_amount, new_price }
        });
      }
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No updates needed', 
        updated_count: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Perform bulk update
    const updatePromises = updates.map(update => 
      supabase
        .from('media_outlets')
        .update({ price: update.price })
        .eq('id', update.id)
    );

    const updateResults = await Promise.all(updatePromises);
    
    // Check for update errors
    const updateErrors = updateResults.filter(result => result.error);
    if (updateErrors.length > 0) {
      logStep('Update errors', updateErrors);
      return new Response(JSON.stringify({ error: 'Some updates failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Insert audit entries
    if (auditEntries.length > 0) {
      const { error: auditError } = await supabase
        .from('audit_log')
        .insert(auditEntries);

      if (auditError) {
        logStep('Audit log error', auditError);
        // Don't fail the request for audit errors, just log them
      }
    }

    logStep('Bulk update completed', { updated_count: updates.length });

    return new Response(JSON.stringify({
      message: 'Bulk update completed',
      updated_count: updates.length,
      updates: updates.map(u => ({
        id: u.id,
        new_price: u.price
      }))
    }), {
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