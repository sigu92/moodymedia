import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function logStep(step: string, data?: any) {
  console.log(`[admin-approve] ${step}`, data ? JSON.stringify(data) : '');
}

function validateApprovalRequest(data: any) {
  const errors = [];

  if (!data.submission_id || typeof data.submission_id !== 'string') {
    errors.push('Valid submission_id is required');
  }

  if (!['approve', 'reject'].includes(data.action)) {
    errors.push('Action must be either "approve" or "reject"');
  }

  if (data.action === 'approve') {
    if (data.marketplace_price === undefined || data.marketplace_price === null || isNaN(parseFloat(data.marketplace_price))) {
      errors.push('Marketplace price is required for approval');
    } else if (parseFloat(data.marketplace_price) <= 0) {
      errors.push('Marketplace price must be greater than 0');
    }
  }

  if (data.review_notes && typeof data.review_notes !== 'string') {
    errors.push('Review notes must be a string');
  }

  return errors;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting admin approval/rejection request');

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

    logStep('User authenticated', { userId: user.id });

    // Check if user is a system admin
    const { data: isAdmin, error: adminError } = await supabase
      .rpc('is_user_admin', { user_uuid: user.id });

    if (adminError) {
      logStep('Error checking admin status', { error: adminError });
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isAdmin) {
      logStep('User is not a system admin', { userId: user.id });
      return new Response(
        JSON.stringify({ error: 'System admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const approvalData = await req.json();
    logStep('Approval data received', {
      submissionId: approvalData.submission_id,
      action: approvalData.action
    });

    // Validate approval request
    const validationErrors = validateApprovalRequest(approvalData);
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

    // Get current submission data (for audit logging)
    const { data: currentSubmission, error: fetchError } = await supabase
      .from('media_outlets')
      .select('*')
      .eq('id', approvalData.submission_id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !currentSubmission) {
      logStep('Submission not found or not in pending status', {
        submissionId: approvalData.submission_id,
        error: fetchError
      });
      return new Response(
        JSON.stringify({ error: 'Submission not found or not pending approval' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const beforeData = { ...currentSubmission };
    const now = new Date().toISOString();

    let updateData: any = {
      reviewed_by: user.id,
      reviewed_at: now,
      review_notes: approvalData.review_notes || null
    };

    if (approvalData.action === 'approve') {
      // Approve the submission
      updateData.status = 'approved';
      updateData.price = parseFloat(approvalData.marketplace_price);
      updateData.is_active = true;

      logStep('Approving submission', {
        submissionId: approvalData.submission_id,
        marketplacePrice: approvalData.marketplace_price,
        purchasePrice: currentSubmission.purchase_price
      });

    } else if (approvalData.action === 'reject') {
      // Reject the submission
      updateData.status = 'rejected';
      updateData.is_active = false;

      logStep('Rejecting submission', {
        submissionId: approvalData.submission_id,
        reviewNotes: approvalData.review_notes
      });
    }

    // Update the media outlet
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('media_outlets')
      .update(updateData)
      .eq('id', approvalData.submission_id)
      .eq('status', 'pending') // Ensure it's still pending
      .select()
      .single();

    if (updateError || !updatedSubmission) {
      logStep('Update error', { error: updateError, submissionId: approvalData.submission_id });
      return new Response(
        JSON.stringify({ error: 'Failed to update submission: ' + updateError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For approved submissions, activate the listing
    if (approvalData.action === 'approve') {
      const { error: listingError } = await supabase
        .from('listings')
        .update({ is_active: true })
        .eq('media_outlet_id', approvalData.submission_id);

      if (listingError) {
        logStep('Listing activation error', { error: listingError, submissionId: approvalData.submission_id });
        // Don't fail the entire operation, but log the error
      }
    }

    // Log the action to audit_log
    const auditData = {
      actor_user_id: user.id,
      action: approvalData.action === 'approve' ? 'approve_submission' : 'reject_submission',
      target_table: 'media_outlets',
      target_id: approvalData.submission_id,
      before_data: beforeData,
      after_data: updatedSubmission,
      metadata: {
        marketplace_price: approvalData.marketplace_price,
        review_notes: approvalData.review_notes,
        profit_margin: approvalData.action === 'approve' && currentSubmission.purchase_price
          ? ((parseFloat(approvalData.marketplace_price) - currentSubmission.purchase_price) / parseFloat(approvalData.marketplace_price) * 100).toFixed(2) + '%'
          : null
      }
    };

    const { error: auditError } = await supabase
      .from('audit_log')
      .insert(auditData);

    if (auditError) {
      logStep('Audit logging error', { error: auditError });
      // Don't fail the operation, but log this error
    }

    logStep('Submission processed successfully', {
      submissionId: approvalData.submission_id,
      action: approvalData.action,
      newStatus: updatedSubmission.status
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Submission ${approvalData.action === 'approve' ? 'approved' : 'rejected'} successfully`,
        data: {
          id: updatedSubmission.id,
          domain: updatedSubmission.domain,
          status: updatedSubmission.status,
          marketplace_price: updatedSubmission.price,
          purchase_price: updatedSubmission.purchase_price,
          reviewed_at: updatedSubmission.reviewed_at,
          review_notes: updatedSubmission.review_notes
        }
      }),
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


