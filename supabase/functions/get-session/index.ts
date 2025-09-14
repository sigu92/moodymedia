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
    const { session_id } = await req.json()

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent', 'payment_intent.payment_method', 'customer']
    })

    // Extract relevant information with proper type safety
    const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null
    const paymentMethod = paymentIntent?.payment_method as Stripe.PaymentMethod | null
    const customer = session.customer as Stripe.Customer | null

    const sessionData = {
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      created: session.created,
      expires_at: session.expires_at,
      
      // Payment details
      payment_intent: {
        id: paymentIntent?.id,
        status: paymentIntent?.status,
        amount: paymentIntent?.amount,
        currency: paymentIntent?.currency,
      },
      
      // Payment method details
      payment_method: paymentMethod ? {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.type === 'card' && paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year,
        } : null,
      } : null,
      
      // Customer details
      customer: customer ? {
        id: customer.id,
        email: customer.email ?? null,
        name: customer.name ?? null,
      } : null,
      
      // Metadata
      metadata: session.metadata,
      
      // URLs
      success_url: session.success_url,
      cancel_url: session.cancel_url,
    }

    console.log('Session retrieved successfully:', {
      sessionId: session.id,
      status: session.status,
      userId: user.id,
    })

    return new Response(
      JSON.stringify(sessionData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in get-session function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while retrieving session' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
