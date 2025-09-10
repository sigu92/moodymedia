import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function logStep(step: string, data?: any) {
  console.log(`[publisher-import-batch] ${step}`, data ? JSON.stringify(data) : '');
}

function normalizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .toLowerCase()
    .trim();
}

function validateRow(row: any, mapping: any) {
  const errors = [];
  
  // Check required fields
  if (!row[mapping.domain] || row[mapping.domain].trim() === '') {
    errors.push('Domain is required');
  }
  
  if (!row[mapping.price] || isNaN(parseFloat(row[mapping.price]))) {
    errors.push('Valid price is required');
  }
  
  if (!row[mapping.country] || row[mapping.country].trim() === '') {
    errors.push('Country is required');
  }
  
  if (!row[mapping.language] || row[mapping.language].trim() === '') {
    errors.push('Language is required');
  }
  
  if (!row[mapping.category] || row[mapping.category].trim() === '') {
    errors.push('Category is required');
  }
  
  return errors;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting publisher import batch request');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify the user's JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      logStep('Authentication failed', { authError });
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: corsHeaders }
      );
    }

    logStep('User authenticated', { userId: user.id });

    // Parse request body
    const { source, data, mapping, dry_run = false } = await req.json();
    
    if (!source || !data || !mapping) {
      logStep('Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: source, data, mapping' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate source
    if (!['csv', 'xlsx', 'google_sheet'].includes(source)) {
      logStep('Invalid source type', { source });
      return new Response(
        JSON.stringify({ error: 'Invalid source type' }),
        { status: 400, headers: corsHeaders }
      );
    }

    logStep('Processing import', { source, rowCount: data.length, dryRun: dry_run });

    // Get existing media outlets for duplicate checking
    const { data: existingOutlets, error: outletsError } = await supabase
      .from('media_outlets')
      .select('domain');
      
    if (outletsError) {
      logStep('Error fetching existing outlets', { error: outletsError });
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const existingDomains = new Set(existingOutlets?.map(o => normalizeDomain(o.domain)) || []);
    logStep('Existing domains loaded', { count: existingDomains.size });

    const results = [];
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 1;
      
      // Validate row
      const validationErrors = validateRow(row, mapping);
      
      if (validationErrors.length > 0) {
        results.push({
          row: rowNumber,
          domain: row[mapping.domain] || 'Unknown',
          success: false,
          errors: validationErrors,
          skipped: false
        });
        failureCount++;
        continue;
      }

      const normalizedDomain = normalizeDomain(row[mapping.domain]);
      
      // Check for duplicates
      if (existingDomains.has(normalizedDomain)) {
        results.push({
          row: rowNumber,
          domain: row[mapping.domain],
          success: false,
          errors: ['Domain already exists'],
          skipped: true
        });
        skippedCount++;
        continue;
      }

      // Prepare outlet data
      const outletData = {
        domain: row[mapping.domain].trim(),
        price: parseFloat(row[mapping.price]),
        currency: row[mapping.currency] || 'EUR',
        country: row[mapping.country].trim(),
        language: row[mapping.language].trim(),
        category: row[mapping.category].trim(),
        niches: row[mapping.niches] ? row[mapping.niches].split(',').map((n: string) => n.trim()).filter(Boolean) : [],
        guidelines: row[mapping.guidelines] || null,
        lead_time_days: row[mapping.lead_time_days] ? parseInt(row[mapping.lead_time_days]) : 7,
        min_word_count: row[mapping.min_word_count] ? parseInt(row[mapping.min_word_count]) : 500,
        max_word_count: row[mapping.max_word_count] ? parseInt(row[mapping.max_word_count]) : 1500,
        turnaround_time: row[mapping.turnaround_time] || '3-5 business days',
        required_format: row[mapping.required_format] || 'markdown',
        content_types: row[mapping.content_types] ? row[mapping.content_types].split(',').map((t: string) => t.trim()).filter(Boolean) : ['article', 'blog_post'],
        forbidden_topics: row[mapping.forbidden_topics] ? row[mapping.forbidden_topics].split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        accepts_no_license: row[mapping.accepts_no_license] === 'true' || row[mapping.accepts_no_license] === '1',
        sponsor_tag_status: row[mapping.sponsor_tag_status] || 'no',
        sponsor_tag_type: row[mapping.sponsor_tag_type] || 'text',
        sponsor_tag: row[mapping.sponsor_tag] || 'unknown',
        sale_price: row[mapping.sale_price] ? parseFloat(row[mapping.sale_price]) : null,
        sale_note: row[mapping.sale_note] || null,
        admin_tags: row[mapping.admin_tags] ? row[mapping.admin_tags].split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        source: source,
        publisher_id: user.id, // Set to current user
        is_active: true
      };

      if (!dry_run) {
        try {
          // Insert media outlet
          const { data: insertedOutlet, error: insertError } = await supabase
            .from('media_outlets')
            .insert(outletData)
            .select()
            .single();

          if (insertError) {
            logStep('Insert error', { error: insertError, domain: outletData.domain });
            results.push({
              row: rowNumber,
              domain: outletData.domain,
              success: false,
              errors: [insertError.message],
              skipped: false
            });
            failureCount++;
            continue;
          }

          // Create metrics record
          const metricsData = {
            media_outlet_id: insertedOutlet.id,
            ahrefs_dr: row[mapping.ahrefs_dr] ? parseInt(row[mapping.ahrefs_dr]) : 0,
            moz_da: row[mapping.moz_da] ? parseInt(row[mapping.moz_da]) : 0,
            semrush_as: row[mapping.semrush_as] ? parseInt(row[mapping.semrush_as]) : 0,
            spam_score: row[mapping.spam_score] ? parseInt(row[mapping.spam_score]) : 0,
            organic_traffic: row[mapping.organic_traffic] ? parseInt(row[mapping.organic_traffic]) : 0,
            referring_domains: row[mapping.referring_domains] ? parseInt(row[mapping.referring_domains]) : 0
          };

          const { error: metricsError } = await supabase
            .from('metrics')
            .insert(metricsData);

          if (metricsError) {
            logStep('Metrics insert error', { error: metricsError, domain: outletData.domain });
            // Delete the outlet if metrics failed
            await supabase.from('media_outlets').delete().eq('id', insertedOutlet.id);
            results.push({
              row: rowNumber,
              domain: outletData.domain,
              success: false,
              errors: ['Failed to create metrics: ' + metricsError.message],
              skipped: false
            });
            failureCount++;
            continue;
          }

          // Create listing
          const { error: listingError } = await supabase
            .from('listings')
            .insert({
              media_outlet_id: insertedOutlet.id,
              is_active: true
            });

          if (listingError) {
            logStep('Listing insert error', { error: listingError, domain: outletData.domain });
          }

          logStep('Successfully processed', { domain: outletData.domain, outletId: insertedOutlet.id });
          existingDomains.add(normalizedDomain);

        } catch (error) {
          logStep('Unexpected error processing row', { error, domain: outletData.domain });
          results.push({
            row: rowNumber,
            domain: outletData.domain,
            success: false,
            errors: ['Unexpected error: ' + (error as Error).message],
            skipped: false
          });
          failureCount++;
          continue;
        }
      }

      results.push({
        row: rowNumber,
        domain: outletData.domain,
        success: true,
        errors: [],
        skipped: false
      });
      successCount++;
    }

    const response = {
      message: dry_run ? 'Validation completed' : 'Import completed',
      total: data.length,
      succeeded: successCount,
      failed: failureCount,
      skipped: skippedCount,
      results: results
    };

    logStep('Import completed', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logStep('Unexpected error', { error: error.message });
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + (error as Error).message }),
      { status: 500, headers: corsHeaders }
    );
  }
});