import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Initialize Supabase client with proper environment variable validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is not configured')
    }
    
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not configured')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get and validate the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header must start with "Bearer "' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const token = authHeader.slice(7) // Remove "Bearer " prefix

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { email: requestEmail, name, metadata } = await req.json()

    // Use authenticated user's email as canonical email for security
    const canonicalEmail = user.email;
    if (!canonicalEmail) {
      return new Response(
        JSON.stringify({ error: 'User email not available' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // If request includes email and it differs from authenticated user's email, reject
    if (requestEmail && requestEmail.toLowerCase() !== canonicalEmail.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Cannot create customer for different email address' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Use canonical email from authenticated user
    const trimmedEmail = canonicalEmail.trim().toLowerCase();

    // Sanitize email for Stripe search query to prevent injection
    const sanitizedEmail = trimmedEmail.replace(/["\\]/g, '\\$&');
    
    // Check if customer already exists in Stripe by email using search API for better performance
    const searchResponse = await stripe.customers.search({
      query: `email:"${sanitizedEmail}"`,
      limit: 1,
    })

    let customer
    if (searchResponse.data.length > 0) {
      // Customer exists, return existing customer
      customer = searchResponse.data[0]
      
      // Update metadata if provided - ensure all values are strings for Stripe
      if (metadata && Object.keys(metadata).length > 0) {
        const sanitizedMetadata = Object.entries(metadata).reduce((acc, [key, value]) => {
          acc[key] = value != null ? String(value) : '';
          return acc;
        }, {} as Record<string, string>);
        
        customer = await stripe.customers.update(customer.id, {
          metadata: {
            ...customer.metadata,
            ...sanitizedMetadata,
            updated_at: new Date().toISOString(),
          }
        })
      }
    } else {
      // Create new customer - ensure all metadata values are strings for Stripe
      const sanitizedMetadata = metadata ? Object.entries(metadata).reduce((acc, [key, value]) => {
        acc[key] = value != null ? String(value) : '';
        return acc;
      }, {} as Record<string, string>) : {};
      
      customer = await stripe.customers.create({
        email: trimmedEmail,
        name: name || undefined,
        metadata: {
          user_id: user?.id || '',
          created_via: 'moodymedia_api',
          created_at: new Date().toISOString(),
          ...sanitizedMetadata,
        }
      })
    }

    // Log customer creation/retrieval
    console.log(`Stripe customer ${searchResponse.data.length > 0 ? 'retrieved' : 'created'}:`, {
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      userId: user.id,
    })

    return new Response(
      JSON.stringify({
        id: customer.id,
        email: customer.email,
        name: customer.name,
        metadata: customer.metadata,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in create-customer function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while creating customer' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
