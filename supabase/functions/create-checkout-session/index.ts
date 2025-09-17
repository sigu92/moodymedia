import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.17.0?target=deno';

// Environment variables
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || 'sk_test_YOUR_STRIPE_SECRET_KEY_HERE';
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('🔧 Environment variables check:');
console.log('🔑 STRIPE_SECRET_KEY:', stripeSecretKey ? '✅ Set' : '❌ Missing');
console.log('🌐 SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('🔐 SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

if (!stripeSecretKey || stripeSecretKey.includes('YOUR_STRIPE_SECRET_KEY')) {
  console.error('❌ STRIPE_SECRET_KEY not properly configured');
  throw new Error('Please set your STRIPE_SECRET_KEY environment variable');
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase environment variables missing');
  throw new Error('Missing Supabase environment variables');
}

// Initialize Stripe and Supabase
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🔄 Checkout session request received');
  console.log('📡 Request method:', req.method);
  console.log('📡 Request headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      console.log('❌ Method not allowed:', req.method);
      throw new Error('Method not allowed');
    }

    console.log('📦 Parsing request body...');
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('✅ Raw request body keys:', Object.keys(requestBody));
      console.log('✅ Raw request body:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      throw new Error(`Invalid JSON in request body: ${parseError.message}`);
    }
    
    // Handle both camelCase and lowercase variations
    let { billingInfo, cartItems, cartitems } = requestBody;
    const finalCartItems = cartItems || cartitems;
    
    console.log('✅ Extracted data:', { 
      billingInfo: !!billingInfo, 
      cartItems: cartItems ? cartItems.length : 'undefined',
      cartitems: cartitems ? cartitems.length : 'undefined',
      finalCartItems: finalCartItems ? finalCartItems.length : 'undefined',
      cartItemsType: typeof finalCartItems,
      cartItemsValue: finalCartItems,
      allKeys: Object.keys(requestBody)
    });

    // Get user from JWT token
    console.log('🔐 Checking authentication...');
    const authHeader = req.headers.get('Authorization');
    console.log('🔑 Auth header present:', !!authHeader);

    if (!authHeader) {
      console.log('❌ No authorization header');
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 Token extracted, length:', token.length);

    // Verify JWT token with Supabase
    console.log('🔐 Verifying JWT token with Supabase...');
    console.log('🔑 Token preview:', token.substring(0, 20) + '...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError) {
      console.log('❌ Supabase auth error:', authError);
      console.log('❌ Auth error details:', {
        message: authError.message,
        status: authError.status,
        name: authError.name
      });
      throw new Error(`Authentication error: ${authError.message}`);
    }

    if (!user) {
      console.log('❌ No user found in token');
      throw new Error('Invalid authentication - no user found');
    }

    console.log('✅ User authenticated:', user.id, user.email);

    // Validate required data
    console.log('🔍 Validating request data...');
    
    if (!finalCartItems || finalCartItems.length === 0) {
      console.log('❌ Missing or empty cartItems');
      throw new Error('Missing or empty cartItems');
    }

    // billingInfo is optional - if not provided, we'll use user email
    if (!billingInfo) {
      console.log('⚠️ No billingInfo provided, using user email');
      billingInfo = {
        email: user.email || 'customer@example.com',
        name: user.user_metadata?.full_name || 'Customer',
        company: user.user_metadata?.company || '',
        address: user.user_metadata?.address || '',
        city: user.user_metadata?.city || '',
        postalCode: user.user_metadata?.postal_code || '',
        country: user.user_metadata?.country || 'SE',
        vatNumber: user.user_metadata?.vat_number || ''
      };
    }

    console.log('✅ Data validation passed:', {
      billingInfoPresent: !!billingInfo,
      cartItemsCount: finalCartItems.length
    });

    // Calculate total amount (convert to cents for Stripe)
    console.log('💰 Calculating totals...');
    const subtotal = finalCartItems.reduce((sum: number, item: any) => sum + (item.finalPrice || item.price), 0);
    const vat = subtotal * 0.25; // 25% VAT
    const total = Math.round((subtotal + vat) * 100); // Convert to cents

    console.log('💰 Totals calculated:', { subtotal, vat, total });

    // Create line items for Stripe
    console.log('📦 Creating line items for Stripe...');
    const lineItems = finalCartItems.map((item: any) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: `Media Placement: ${item.domain}`,
          description: `${item.category} - ${item.niche || 'General'}`,
        },
        unit_amount: Math.round((item.finalPrice || item.price) * 100), // Convert to cents
      },
      quantity: 1,
    }));

    console.log('📦 Line items created:', lineItems.length);

    // Create checkout session
    console.log('💳 Creating Stripe checkout session...');
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${new URL(req.url).origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(req.url).origin}/checkout/cancel`,
      customer_email: billingInfo.email,
      metadata: {
        user_id: user.id,
        order_number: `MO-${Date.now()}`,
        billing_info: JSON.stringify(billingInfo),
        cart_items: JSON.stringify(finalCartItems),
      },
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['SE', 'US', 'GB', 'DE', 'AT', 'CH', 'NL', 'BE', 'FR'],
      },
    };

    console.log('💳 Session config:', {
      lineItemsCount: lineItems.length,
      customerEmail: billingInfo.email,
      successUrl: sessionConfig.success_url,
      cancelUrl: sessionConfig.cancel_url,
    });

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('✅ Stripe session created successfully:', {
      sessionId: session.id,
      url: session.url,
    });

    const responseData = {
      url: session.url,
      sessionId: session.id,
    };

    console.log('📤 Sending response:', responseData);

    return new Response(
      JSON.stringify(responseData),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('💥 Error creating checkout session:', error);
    console.error('💥 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    // Build error response - include stack only in development
    const isDevelopment = Deno.env.get('NODE_ENV') === 'development' || Deno.env.get('DEBUG') === 'true';
    const errorResponse: any = {
      error: error.message || 'Failed to create checkout session',
    };

    // Only include stack trace in development mode
    if (isDevelopment) {
      errorResponse.details = error.stack;
    }

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
