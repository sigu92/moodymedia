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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

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
    const { email, name, metadata } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if customer already exists in Stripe by email
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    })

    let customer
    if (existingCustomers.data.length > 0) {
      // Customer exists, return existing customer
      customer = existingCustomers.data[0]
      
      // Update metadata if provided
      if (metadata && Object.keys(metadata).length > 0) {
        customer = await stripe.customers.update(customer.id, {
          metadata: {
            ...customer.metadata,
            ...metadata,
            updated_at: new Date().toISOString(),
          }
        })
      }
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email,
        name: name || undefined,
        metadata: {
          ...metadata,
          created_via: 'moodymedia_api',
          created_at: new Date().toISOString(),
        }
      })
    }

    // Log customer creation/retrieval
    console.log(`Stripe customer ${existingCustomers.data.length > 0 ? 'retrieved' : 'created'}:`, {
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
