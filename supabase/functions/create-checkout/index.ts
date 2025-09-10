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
    const { cartItems } = await req.json();
    if (!cartItems || cartItems.length === 0) {
      throw new Error("No cart items provided");
    }

    logStep("Cart items received", { itemCount: cartItems.length });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("Creating new customer");
    }

    // Create line items from cart
    const lineItems = cartItems.map((item: any) => ({
      price_data: {
        currency: item.currency.toLowerCase(),
        product_data: {
          name: `Publication on ${item.domain}${item.nicheName ? ` (${item.nicheName})` : ''}`,
          description: `${item.category} - DR ${item.metrics?.dr || 'N/A'}${item.priceMultiplier > 1 ? ` - ${item.priceMultiplier}x multiplier` : ''}`,
        },
        unit_amount: Math.round((item.finalPrice || item.price) * 100), // Convert to cents
      },
      quantity: 1,
    }));

    logStep("Line items created", { itemCount: lineItems.length });

    // Create checkout session
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?canceled=true`,
      metadata: {
        user_id: user.id,
        cart_items: JSON.stringify(cartItems.map((item: any) => ({
          mediaOutletId: item.mediaOutletId,
          price: item.price,
          currency: item.currency,
          nicheId: item.nicheId,
          basePrice: item.basePrice,
          priceMultiplier: item.priceMultiplier,
          finalPrice: item.finalPrice
        }))),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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