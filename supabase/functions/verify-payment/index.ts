import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const { sessionId } = await req.json();
    
    // Handle mock sessions (when Stripe is not configured)
    if (!stripeKey || sessionId.startsWith('mock_session_')) {
      logStep("Processing mock payment verification", { sessionId });
      
      // Use service role key for database operations
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Get user from session metadata (passed in mock session ID)
      let userId: string;
      if (sessionId.startsWith('mock_session_')) {
        // For mock sessions, we need to get the actual user ID from the request header
        // The timestamp is just for uniqueness, we need the actual authenticated user
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
          throw new Error("No authorization header found for mock session");
        }

        // Create client with anon key to verify the user token
        const supabaseAuth = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? ""
        );

        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
          authHeader.replace('Bearer ', '')
        );

        if (authError || !user) {
          throw new Error("Invalid user token");
        }

        userId = user.id;
        logStep("Extracted user ID from auth token", { userId });
      } else {
        throw new Error("Invalid mock session format");
      }

      // Fetch actual cart items for this user
      const { data: cartItems, error: cartError } = await supabaseService
        .from("cart_items")
        .select("media_outlet_id, price, currency, niche_id, base_price, price_multiplier, final_price")
        .eq("user_id", userId);

      if (cartError) {
        logStep("Error fetching cart items", { error: cartError });
        throw cartError;
      }

      if (!cartItems || cartItems.length === 0) {
        logStep("No cart items found for user", { userId });
        return new Response(JSON.stringify({ 
          success: false, 
          error: "No cart items found",
          mock: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Create orders from cart items
      const orders = cartItems.map((item: any) => ({
        buyer_id: userId,
        media_outlet_id: item.media_outlet_id,
        status: "requested",
        price: item.final_price || item.price,
        currency: item.currency,
        stripe_session_id: sessionId,
        niche_id: item.niche_id,
        base_price: item.base_price || item.price,
        price_multiplier: item.price_multiplier || 1.0,
        final_price: item.final_price || item.price
      }));

      const { error: insertError } = await supabaseService
        .from("orders")
        .insert(orders);

      if (insertError) {
        logStep("Error creating mock orders", { error: insertError });
        throw insertError;
      }

      // Clear user's cart
      const { error: clearCartError } = await supabaseService
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      if (clearCartError) {
        logStep("Error clearing cart", { error: clearCartError });
        // Don't throw error for cart clearing failure
      }

      const totalAmount = cartItems.reduce((sum: number, item: any) => sum + (item.price * 100), 0);
      
      logStep("Mock orders created successfully", { orderCount: orders.length, totalAmount });

      return new Response(JSON.stringify({ 
        success: true, 
        orders: orders.length,
        amount: totalAmount,
        mock: true,
        message: "Mock payment processed successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!sessionId) {
      throw new Error("No session ID provided");
    }

    // Use service role key for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve the checkout session with expanded data
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'payment_intent.payment_method']
    });
    
    logStep("Session retrieved", { 
      sessionId, 
      status: session.payment_status,
      amount: session.amount_total 
    });

    // Return session details for verification
    const paymentIntent = session.payment_intent as any;
    const paymentMethod = paymentIntent?.payment_method as any;

    return new Response(JSON.stringify({
      status: session.status,
      payment_status: session.payment_status,
      payment_intent_id: paymentIntent?.id,
      customer_id: session.customer,
      payment_method_type: paymentMethod?.type,
      payment_method_last4: paymentMethod?.card?.last4,
      amount_total: session.amount_total,
      currency: session.currency,
      metadata: session.metadata,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

    // Legacy order creation logic - moved to handleStripeReturn in frontend
    /*
    if (session.payment_status === "paid") {
      // Parse cart items from metadata
      const cartItems = JSON.parse(session.metadata?.cart_items || "[]");
      const userId = session.metadata?.user_id;

      if (!userId || cartItems.length === 0) {
        throw new Error("Invalid session metadata");
      }

      // Create orders for each cart item
      const orders = cartItems.map((item: any) => ({
        buyer_id: userId,
        media_outlet_id: item.mediaOutletId,
        status: "requested",
        price: item.finalPrice || item.price,
        currency: item.currency,
        stripe_session_id: sessionId,
        niche_id: item.nicheId,
        base_price: item.basePrice || item.price,
        price_multiplier: item.priceMultiplier || 1.0,
        final_price: item.finalPrice || item.price
      }));

      const { error: insertError } = await supabaseService
        .from("orders")
        .insert(orders);

      if (insertError) {
        logStep("Error creating orders", { error: insertError });
        throw insertError;
      }

      // Clear user's cart
      const { error: clearCartError } = await supabaseService
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      if (clearCartError) {
        logStep("Error clearing cart", { error: clearCartError });
        // Don't throw error for cart clearing failure
      }

      logStep("Orders created successfully", { orderCount: orders.length });

      return new Response(JSON.stringify({ 
        success: true, 
        orders: orders.length,
        amount: session.amount_total 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        status: session.payment_status 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    */
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});