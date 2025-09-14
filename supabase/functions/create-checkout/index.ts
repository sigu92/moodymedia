import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Check if Stripe secret key is configured
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("Stripe key not configured - returning mock data");
      
      // Return mock checkout URL for development/demo purposes
      const origin = req.headers.get("origin") || "http://localhost:3000";
      const mockSessionId = `mock_session_${Date.now()}`;
      
      return new Response(JSON.stringify({ 
        url: `${origin}/payment-success?session_id=${mockSessionId}&mock=true`,
        mock: true,
        message: "Mock checkout created - Stripe integration not configured yet"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create Supabase client for authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get request body
    const { 
      line_items, 
      customer_id, 
      customer_email, 
      success_url, 
      cancel_url, 
      metadata,
      mode = 'payment',
      billing_address_collection = 'required',
      shipping_address_collection,
      payment_method_types = ['card'],
      allow_promotion_codes = true,
      automatic_tax,
      currency = 'eur'
    } = await req.json();
    
    if (!line_items || line_items.length === 0) {
      throw new Error("No line items provided");
    }

    logStep("Line items received", { itemCount: line_items.length });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Use provided customer_id or customer_email
    const finalCustomerId = customer_id;
    const finalCustomerEmail = customer_email || user.email;
    
    logStep("Customer info", { customerId: finalCustomerId, email: finalCustomerEmail });

    // Create checkout session
    const sessionConfig: any = {
      line_items,
      mode,
      success_url: success_url || `${req.headers.get("origin") || "http://localhost:3000"}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${req.headers.get("origin") || "http://localhost:3000"}/cart?canceled=true`,
      payment_method_types,
      billing_address_collection,
      metadata: {
        user_id: user.id,
        ...metadata,
      },
    };

    // Add customer information
    if (finalCustomerId) {
      sessionConfig.customer = finalCustomerId;
    } else if (finalCustomerEmail) {
      sessionConfig.customer_email = finalCustomerEmail;
    }

    // Add shipping address collection if provided
    if (shipping_address_collection) {
      sessionConfig.shipping_address_collection = shipping_address_collection;
    }

    // Add promotion codes support
    if (allow_promotion_codes) {
      sessionConfig.allow_promotion_codes = allow_promotion_codes;
    }

    // Add automatic tax if configured
    if (automatic_tax) {
      sessionConfig.automatic_tax = automatic_tax;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ 
      sessionId: session.id,
      url: session.url,
      customerId: session.customer,
      paymentIntentId: session.payment_intent,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});