import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import Stripe from 'https://esm.sh/stripe@14.21.0'

// In-memory cache and rate limiting (TTL ~5-10s)
const sessionCache = new Map<string, { data: any; expires: number }>()
const userRequestTimes = new Map<string, number[]>()

const CACHE_TTL = 10 * 1000 // 10 seconds
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 requests per minute per user

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Allow': 'POST' } 
      }
    )
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

    // Rate limiting check
    const now = Date.now()
    const userRequests = userRequestTimes.get(user.id) || []
    const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW)
    
    if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
      console.log('Rate limit exceeded for user:', user.id)
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Update request tracking
    recentRequests.push(now)
    userRequestTimes.set(user.id, recentRequests)

    // Check cache first
    const cacheKey = `${user.id}:${session_id}`
    const cached = sessionCache.get(cacheKey)
    if (cached && cached.expires > now) {
      console.log('Returning cached session data for:', session_id)
      return new Response(
        JSON.stringify(cached.data),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent', 'payment_intent.payment_method', 'customer']
    })

    // IDOR Protection: Verify session belongs to authenticated user
    const sessionUserId = session.metadata?.user_id || session.client_reference_id;
    const sessionEmail = typeof session.customer === 'object' && session.customer ? session.customer.email : 
                       session.customer_details?.email;
    
    const userMatches = sessionUserId === user.id || 
                       (sessionEmail && sessionEmail.toLowerCase() === user.email?.toLowerCase());
    
    if (!userMatches) {
      console.log('Access denied: Session does not belong to user', { 
        sessionId: session_id, 
        userId: user.id,
        sessionUserId,
        sessionEmail 
      });
      return new Response(
        JSON.stringify({ error: 'Session not found or access denied' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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

    // Cache the response
    sessionCache.set(cacheKey, {
      data: sessionData,
      expires: now + CACHE_TTL
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
