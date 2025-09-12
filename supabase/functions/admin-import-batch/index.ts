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
      .rpc('is_platform_admin', { _user_id: user.id });

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

    logStep('Import parameters received', {
      source,
      source_url,
      data_length: data?.length,
      mapping,
      dry_run,
      admin_tags,
      admin_tags_type: Array.isArray(admin_tags) ? 'array' : typeof admin_tags
    });

    // Validate required parameters
    if (!source) {
      logStep('Validation error: missing source');
      return new Response(JSON.stringify({ error: 'Missing required parameter: source' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!data || !Array.isArray(data)) {
      logStep('Validation error: missing or invalid data', { data_type: typeof data, is_array: Array.isArray(data) });
      return new Response(JSON.stringify({ error: 'Missing required parameter: data (must be array)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!mapping || typeof mapping !== 'object') {
      logStep('Validation error: missing or invalid mapping', { mapping_type: typeof mapping });
      return new Response(JSON.stringify({ error: 'Missing required parameter: mapping (must be object)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check data size limits (prevent memory issues with extremely large imports)
    if (data.length > 5000) {
      logStep('Data size limit exceeded', { data_length: data.length });
      return new Response(JSON.stringify({ error: 'Import too large. Maximum 5000 rows allowed per batch.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (data.length === 0) {
      logStep('Empty data array');
      return new Response(JSON.stringify({ error: 'No data to import' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!['csv', 'xlsx', 'google_sheet'].includes(source)) {
      logStep('Invalid source type', { source });
      return new Response(JSON.stringify({ error: 'Invalid source type. Must be: csv, xlsx, or google_sheet' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate admin_tags format
    if (!Array.isArray(admin_tags)) {
      logStep('Invalid admin_tags format', { admin_tags, admin_tags_type: typeof admin_tags });
      return new Response(JSON.stringify({ error: 'admin_tags must be an array' }), {
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

    // Process rows in batches to handle large datasets efficiently
    const BATCH_SIZE = 100; // Process 100 rows at a time
    const totalRows = data.length;

    logStep('Starting import processing', { total_rows: totalRows, batch_size: BATCH_SIZE });

    // Validate and prepare rows
    for (let batchStart = 0; batchStart < totalRows; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, totalRows);
      const batchData = data.slice(batchStart, batchEnd);

      logStep(`Processing batch ${Math.floor(batchStart/BATCH_SIZE) + 1}`, {
        batch_start: batchStart,
        batch_end: batchEnd,
        batch_size: batchData.length
      });

      for (const [index, row] of batchData.entries()) {
        const globalIndex = batchStart + index;
        const rowResult = {
          row_number: globalIndex + 1,
          data: row,
          errors: [],
          action: 'skip',
          outlet_id: null
        };

        try {
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
              logStep('Insert error for row ' + (globalIndex + 1), {
                error: insertError,
                domain: normalizedDomain,
                outlet_data: outletData
              });
              rowResult.errors.push(`Insert failed: ${insertError.message}`);
              rowResult.action = 'error';
              failed++;
            } else {
              rowResult.outlet_id = insertedOutlet.id;
              succeeded++;

              // Add to existing domains to prevent duplicates in same batch
              existingDomains.add(normalizedDomain);

              // Create default metrics
              const { error: metricsError } = await supabase
                .from('metrics')
                .insert({
                  media_outlet_id: insertedOutlet.id,
                  ahrefs_dr: mapping.ahrefs_dr ? Number(row[mapping.ahrefs_dr]) || 0 : 0,
                  moz_da: mapping.moz_da ? Number(row[mapping.moz_da]) || 0 : 0,
                  semrush_as: mapping.semrush_as ? Number(row[mapping.semrush_as]) || 0 : 0,
                  spam_score: mapping.spam_score ? Number(row[mapping.spam_score]) || 0 : 0,
                  organic_traffic: mapping.organic_traffic ? Number(row[mapping.organic_traffic]) || 0 : 0,
                  referring_domains: mapping.referring_domains ? Number(row[mapping.referring_domains]) || 0 : 0
                });

              if (metricsError) {
                logStep('Metrics insert error for row ' + (globalIndex + 1), {
                  error: metricsError,
                  outlet_id: insertedOutlet.id
                });
                // Don't fail the whole import for metrics errors, just log it
              }
            }
          } else {
            // Dry run - just mark as would be inserted
            succeeded++;
          }
        } catch (rowError) {
          logStep('Unexpected error processing row ' + (globalIndex + 1), {
            error: rowError,
            row_data: row
          });
          rowResult.errors.push(`Processing error: ${rowError.message}`);
          rowResult.action = 'error';
          failed++;
        }

        results.push(rowResult);
      }

      // Add small delay between batches to prevent overwhelming the database
      if (batchEnd < totalRows) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Create import record if not dry run
    if (!dry_run) {
      try {
        // Store only error results and summary in log_data to avoid size limits
        const errorResults = results.filter(r => r.errors.length > 0);
        const successfulCount = results.filter(r => r.action === 'insert' && r.errors.length === 0).length;

        const importRecord = {
          batch_id: batchId,
          source,
          source_url,
          created_by: user.id,
          row_count: data.length,
          succeeded: successfulCount,
          failed: results.filter(r => r.errors.length > 0).length,
          log_data: {
            mapping,
            admin_tags,
            total_processed: results.length,
            errors_summary: errorResults.slice(0, 50).map(r => ({
              row: r.row_number,
              domain: r.data?.domain || 'unknown',
              errors: r.errors
            })),
            performance: {
              total_rows: data.length,
              batch_size: BATCH_SIZE,
              batches_processed: Math.ceil(data.length / BATCH_SIZE)
            }
          }
        };

        const { error: importError } = await supabase
          .from('imports')
          .insert(importRecord);

        if (importError) {
          logStep('Import record creation failed', importError);
          // Don't fail the entire request for logging errors
        } else {
          logStep('Import record created successfully', { batch_id: batchId });
        }
      } catch (logError) {
        logStep('Import record creation error', logError);
        // Continue with response even if logging fails
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