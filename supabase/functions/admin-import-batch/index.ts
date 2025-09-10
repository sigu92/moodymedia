import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: any) => {
  console.log(`[admin-import-batch] ${step}`, details ? JSON.stringify(details) : '');
}

const normalizeDomain = (domain: string): string => {
  // Remove protocol and www, convert to lowercase
  return domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .toLowerCase()
    .trim();
}

const validateRow = (row: any, mapping: any) => {
  const errors = [];
  
  if (!row[mapping.domain]) {
    errors.push('Domain is required');
  } else {
    const domain = normalizeDomain(row[mapping.domain]);
    if (!domain || domain.length < 3) {
      errors.push('Invalid domain format');
    }
  }
  
  if (mapping.price && row[mapping.price]) {
    const price = Number(row[mapping.price]);
    if (isNaN(price) || price <= 0) {
      errors.push('Price must be a positive number');
    }
  }
  
  return errors;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting import batch request');

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

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { source, source_url, data, mapping, dry_run = false, admin_tags = [] } = body;

    logStep('Import parameters', { source, source_url, data_length: data?.length, mapping, dry_run, admin_tags });

    if (!source || !data || !mapping) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!['csv', 'xlsx', 'google_sheet'].includes(source)) {
      return new Response(JSON.stringify({ error: 'Invalid source type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate batch ID for this import
    const batchId = crypto.randomUUID();
    const results = [];
    let succeeded = 0;
    let failed = 0;

    // Get existing domains to prevent duplicates
    const { data: existingOutlets, error: existingError } = await supabase
      .from('media_outlets')
      .select('domain, id');

    if (existingError) {
      logStep('Failed to fetch existing outlets', existingError);
      return new Response(JSON.stringify({ error: 'Failed to fetch existing data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const existingDomains = new Set(
      (existingOutlets || []).map(outlet => normalizeDomain(outlet.domain))
    );

    // Validate and prepare rows
    for (const [index, row] of data.entries()) {
      const rowResult = {
        row_number: index + 1,
        data: row,
        errors: [],
        action: 'skip',
        outlet_id: null
      };

      // Validate row
      const validationErrors = validateRow(row, mapping);
      if (validationErrors.length > 0) {
        rowResult.errors = validationErrors;
        rowResult.action = 'error';
        failed++;
        results.push(rowResult);
        continue;
      }

      const normalizedDomain = normalizeDomain(row[mapping.domain]);
      
      // Check for duplicates
      if (existingDomains.has(normalizedDomain)) {
        rowResult.errors.push('Domain already exists');
        rowResult.action = 'duplicate';
        failed++;
        results.push(rowResult);
        continue;
      }

      // Prepare outlet data
      const outletData = {
        domain: normalizedDomain,
        price: mapping.price ? Number(row[mapping.price]) : 100,
        currency: mapping.currency ? row[mapping.currency] : 'EUR',
        country: mapping.country ? row[mapping.country] : 'SE',
        language: mapping.language ? row[mapping.language] : 'Swedish',
        category: mapping.category ? row[mapping.category] : 'General',
        admin_tags: admin_tags.length > 0 ? admin_tags : [],
        source: source,
        publisher_id: user.id, // Admin becomes the publisher for imported sites
        is_active: true
      };

      if (mapping.title && row[mapping.title]) {
        outletData.domain = `${normalizedDomain} (${row[mapping.title]})`;
      }

      rowResult.data = outletData;
      rowResult.action = 'insert';

      if (!dry_run) {
        // Insert media outlet
        const { data: insertedOutlet, error: insertError } = await supabase
          .from('media_outlets')
          .insert(outletData)
          .select('id')
          .single();

        if (insertError) {
          logStep('Insert error', insertError);
          rowResult.errors.push(`Insert failed: ${insertError.message}`);
          rowResult.action = 'error';
          failed++;
        } else {
          rowResult.outlet_id = insertedOutlet.id;
          succeeded++;
          
          // Add to existing domains to prevent duplicates in same batch
          existingDomains.add(normalizedDomain);

          // Create default metrics
          await supabase
            .from('metrics')
            .insert({
              media_outlet_id: insertedOutlet.id,
              ahrefs_dr: 0,
              moz_da: 0,
              semrush_as: 0,
              spam_score: 0,
              organic_traffic: 0,
              referring_domains: 0
            });
        }
      } else {
        // Dry run - just mark as would be inserted
        succeeded++;
      }

      results.push(rowResult);
    }

    // Create import record if not dry run
    if (!dry_run) {
      const importRecord = {
        batch_id: batchId,
        source,
        source_url,
        created_by: user.id,
        row_count: data.length,
        succeeded,
        failed,
        log_data: {
          mapping,
          admin_tags,
          results: results.slice(0, 100) // Store first 100 results in log
        }
      };

      const { error: importError } = await supabase
        .from('imports')
        .insert(importRecord);

      if (importError) {
        logStep('Import record error', importError);
        // Don't fail the request for import record errors
      }
    }

    const response = {
      batch_id: batchId,
      dry_run,
      summary: {
        total_rows: data.length,
        succeeded,
        failed,
        success_rate: data.length > 0 ? ((succeeded / data.length) * 100).toFixed(2) : 0
      },
      results: results,
      mapping_used: mapping,
      admin_tags_applied: admin_tags
    };

    logStep('Import completed', { dry_run, succeeded, failed, total: data.length });

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