import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function logStep(step: string, data?: any) {
  console.log(`[publisher-submit] ${step}`, data ? JSON.stringify(data) : '');
}

function normalizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .toLowerCase()
    .trim();
}

function validateSubmission(data: any) {
  const errors = [];

  // Domain validation
  if (!data.domain || typeof data.domain !== 'string' || data.domain.trim() === '') {
    errors.push('Domain is required');
  } else {
    const normalizedDomain = normalizeDomain(data.domain);
    if (normalizedDomain.length < 3) {
      errors.push('Domain must be at least 3 characters long');
    }
    if (normalizedDomain.length > 253) {
      errors.push('Domain cannot exceed 253 characters');
    }
    // Basic domain format validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(normalizedDomain)) {
      errors.push('Invalid domain format');
    }
  }

  // Required field validation
  if (!data.country || typeof data.country !== 'string' || data.country.trim() === '') {
    errors.push('Country is required');
  } else if (data.country.length > 100) {
    errors.push('Country name cannot exceed 100 characters');
  }

  if (!data.language || typeof data.language !== 'string' || data.language.trim() === '') {
    errors.push('Language is required');
  } else if (data.language.length > 50) {
    errors.push('Language name cannot exceed 50 characters');
  }

  if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') {
    errors.push('Category is required');
  } else if (data.category.length > 100) {
    errors.push('Category name cannot exceed 100 characters');
  }

  // Price validation
  if (data.price === undefined || data.price === null || isNaN(parseFloat(data.price))) {
    errors.push('Valid marketplace price is required');
  } else {
    const price = parseFloat(data.price);
    if (price <= 0) {
      errors.push('Marketplace price must be greater than 0');
    } else if (price > 10000) {
      errors.push('Marketplace price cannot exceed €10,000');
    }
  }

  // Purchase price validation (optional for company-owned sites)
  if (data.purchase_price !== undefined && data.purchase_price !== null) {
    if (isNaN(parseFloat(data.purchase_price))) {
      errors.push('Purchase price must be a valid number');
    } else {
      const purchasePrice = parseFloat(data.purchase_price);
      if (purchasePrice < 0) {
        errors.push('Purchase price cannot be negative');
      } else if (purchasePrice > 50000) {
        errors.push('Purchase price cannot exceed €50,000');
      }
    }
  }

  // Optional field validation
  if (data.guidelines && typeof data.guidelines !== 'string') {
    errors.push('Guidelines must be a string');
  } else if (data.guidelines && data.guidelines.length > 2000) {
    errors.push('Guidelines cannot exceed 2000 characters');
  }

  if (data.lead_time_days !== undefined && (isNaN(parseInt(data.lead_time_days)) || parseInt(data.lead_time_days) < 1 || parseInt(data.lead_time_days) > 365)) {
    errors.push('Lead time must be between 1 and 365 days');
  }

  // Array field validation
  if (data.niches && (!Array.isArray(data.niches) || data.niches.some((n: any) => typeof n !== 'string'))) {
    errors.push('Niches must be an array of strings');
  } else if (data.niches && data.niches.length > 20) {
    errors.push('Cannot have more than 20 niches');
  }

  return errors;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting publisher website submission');

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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user's JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      logStep('Authentication failed', { authError });
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('User authenticated', { userId: user.id, email: user.email });

    // Check if user has publisher role
    const { data: userRoles, error: roleError } = await supabase
      .from('user_role_assignments')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'publisher');

    if (roleError) {
      logStep('Error checking user roles', { error: roleError });
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userRoles || userRoles.length === 0) {
      logStep('User does not have publisher role', { userId: user.id });
      return new Response(
        JSON.stringify({ error: 'Publisher role required to submit websites' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const submissionData = await req.json();
    logStep('Submission data received', { domain: submissionData.domain, userId: user.id });

    // Validate submission data
    const validationErrors = validateSubmission(submissionData);
    if (validationErrors.length > 0) {
      logStep('Validation failed', { errors: validationErrors });
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: validationErrors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicate domain (global check)
    const normalizedDomain = normalizeDomain(submissionData.domain);
    const { data: existingOutlet, error: checkError } = await supabase
      .from('media_outlets')
      .select('id, domain, status, publisher_id')
      .eq('domain', normalizedDomain)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
      logStep('Error checking for existing domain', { error: checkError });
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingOutlet) {
      // Allow resubmission of rejected sites by the same publisher
      if (existingOutlet.publisher_id === user.id && existingOutlet.status === 'rejected') {
        logStep('Allowing resubmission of rejected site', {
          domain: normalizedDomain,
          existingId: existingOutlet.id,
          status: existingOutlet.status
        });
        // Continue with submission - will update existing record
      } else {
        logStep('Domain already exists and cannot be resubmitted', {
          domain: normalizedDomain,
          existingPublisher: existingOutlet.publisher_id,
          status: existingOutlet.status
        });
        return new Response(
          JSON.stringify({ error: 'Domain already exists in the marketplace' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Prepare outlet data for submission (pending approval)
    const outletData = {
      domain: normalizedDomain,
      price: parseFloat(submissionData.price),
      purchase_price: submissionData.purchase_price ? parseFloat(submissionData.purchase_price) : null,
      currency: submissionData.currency || 'EUR',
      country: submissionData.country.trim(),
      language: submissionData.language.trim(),
      category: submissionData.category.trim(),
      niches: Array.isArray(submissionData.niches)
        ? submissionData.niches.map((n: string) => n.trim()).filter(Boolean)
        : [],
      guidelines: submissionData.guidelines || null,
      lead_time_days: submissionData.lead_time_days ? parseInt(submissionData.lead_time_days) : 7,
      accepts_no_license: submissionData.accepts_no_license === true,
      accepts_no_license_status: submissionData.accepts_no_license_status || 'no',
      sponsor_tag_status: submissionData.sponsor_tag_status || 'no',
      sponsor_tag_type: submissionData.sponsor_tag_type || 'text',
      publisher_id: user.id,
      status: 'pending', // Start as pending for admin approval
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
      is_active: false // Not active until approved
    };

    logStep('Processing media outlet', {
      domain: outletData.domain,
      status: outletData.status,
      isUpdate: !!existingOutlet
    });

    let insertedOutlet;

    if (existingOutlet) {
      // Update existing rejected submission
      const { data: updatedOutlet, error: updateError } = await supabase
        .from('media_outlets')
        .update(outletData)
        .eq('id', existingOutlet.id)
        .select()
        .single();

      if (updateError) {
        logStep('Update error for resubmission', { error: updateError, domain: outletData.domain });
        return new Response(
          JSON.stringify({ error: 'Failed to resubmit website: ' + updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      insertedOutlet = updatedOutlet;
    } else {
      // Insert new media outlet
      const { data: newOutlet, error: insertError } = await supabase
        .from('media_outlets')
        .insert(outletData)
        .select()
        .single();

      if (insertError) {
        logStep('Insert error', { error: insertError, domain: outletData.domain });
        return new Response(
          JSON.stringify({ error: 'Failed to submit website: ' + insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      insertedOutlet = newOutlet;
    }

    // Handle metrics (insert for new, update for existing)
    if (submissionData.metrics) {
      const metricsData = {
        media_outlet_id: insertedOutlet.id,
        ahrefs_dr: submissionData.metrics.ahrefs_dr ? parseInt(submissionData.metrics.ahrefs_dr) : 0,
        moz_da: submissionData.metrics.moz_da ? parseInt(submissionData.metrics.moz_da) : 0,
        semrush_as: submissionData.metrics.semrush_as ? parseInt(submissionData.metrics.semrush_as) : 0,
        spam_score: submissionData.metrics.spam_score ? parseInt(submissionData.metrics.spam_score) : 0,
        organic_traffic: submissionData.metrics.organic_traffic ? parseInt(submissionData.metrics.organic_traffic) : 0,
        referring_domains: submissionData.metrics.referring_domains ? parseInt(submissionData.metrics.referring_domains) : 0
      };

      if (existingOutlet) {
        // Update existing metrics
        const { error: metricsError } = await supabase
          .from('metrics')
          .update(metricsData)
          .eq('media_outlet_id', insertedOutlet.id);

        if (metricsError) {
          logStep('Metrics update error for resubmission', { error: metricsError, domain: outletData.domain });
          return new Response(
            JSON.stringify({ error: 'Failed to update website metrics' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // Insert new metrics
        const { error: metricsError } = await supabase
          .from('metrics')
          .insert(metricsData);

        if (metricsError) {
          logStep('Metrics insert error', { error: metricsError, domain: outletData.domain });
          // Delete the outlet if metrics failed
          await supabase.from('media_outlets').delete().eq('id', insertedOutlet.id);
          return new Response(
            JSON.stringify({ error: 'Failed to save website metrics' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Handle listing (create for new, ensure inactive for resubmissions)
    if (!existingOutlet) {
      // Create new listing for new submissions
      const { error: listingError } = await supabase
        .from('listings')
        .insert({
          media_outlet_id: insertedOutlet.id,
          is_active: false // Not active until approved
        });

      if (listingError) {
        logStep('Listing insert error', { error: listingError, domain: outletData.domain });
        // Clean up on error
        await supabase.from('media_outlets').delete().eq('id', insertedOutlet.id);
        return new Response(
          JSON.stringify({ error: 'Failed to create marketplace listing' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Ensure listing is inactive for resubmissions
      const { error: listingError } = await supabase
        .from('listings')
        .update({ is_active: false })
        .eq('media_outlet_id', insertedOutlet.id);

      if (listingError) {
        logStep('Listing update error for resubmission', { error: listingError, domain: outletData.domain });
        // Don't fail the entire operation, but log the error
      }
    }

    logStep('Website submission successful', {
      outletId: insertedOutlet.id,
      domain: outletData.domain,
      status: 'pending',
      submitted_by: outletData.submitted_by
    });

    const responseData = {
      success: true,
      message: 'Website submitted successfully for admin approval',
      data: {
        id: insertedOutlet.id,
        domain: outletData.domain,
        status: 'pending',
        submitted_at: outletData.submitted_at
      }
    };

    console.log('[publisher-submit] Returning success response:', responseData);

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logStep('Unexpected error', { error: error.message });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


