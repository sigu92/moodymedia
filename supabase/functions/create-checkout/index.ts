import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "600",
};

// Zod schema for request body validation
const LineItemSchema = z.object({
  price_data: z.object({
    currency: z.string().default('eur'),
    product_data: z.object({
      name: z.string(),
      description: z.string().optional(),
      metadata: z.record(z.string()).optional(),
    }),
    unit_amount: z.number().int().positive(),
  }).optional(),
  price: z.string().optional(),
  quantity: z.number().int().positive().default(1),
});

const ShippingAddressCollectionSchema = z.object({
  allowed_countries: z.array(z.string()).default(['US', 'CA', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'SE', 'NO', 'DK', 'FI']),
});

const AutomaticTaxSchema = z.object({
  enabled: z.boolean(),
});

const CreateCheckoutRequestSchema = z.object({
  line_items: z.array(LineItemSchema).min(1, "At least one line item is required").refine((items) => {
    return items.every(item => item.price || item.price_data);
  }, "Each line item must have either 'price' or 'price_data'"),
  customer_id: z.string().optional(),
  customer_email: z.string().email().optional(),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  metadata: z.record(z.string()).optional(),
  mode: z.enum(['payment', 'setup', 'subscription']).default('payment'),
  billing_address_collection: z.enum(['auto', 'required']).default('required'),
  shipping_address_collection: ShippingAddressCollectionSchema.optional(),
  payment_method_types: z.array(z.string()).default(['card']),
  allow_promotion_codes: z.boolean().default(true),
  automatic_tax: AutomaticTaxSchema.optional(),
  currency: z.string().default('eur'),
});

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
      logStep("Stripe key not configured");
      return new Response(JSON.stringify({ 
        error: "Stripe is not configured. Please contact support.",
        code: "STRIPE_NOT_CONFIGURED"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 503,
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

    // Validate request body
    const requestBody = await req.json();
    
    let validatedData;
    try {
      validatedData = CreateCheckoutRequestSchema.parse(requestBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        logStep("Validation error", { errors: error.errors });
        return new Response(JSON.stringify({ 
          error: `Invalid request data: ${errorMessage}`,
          details: error.errors 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      throw error;
    }

    // Extract validated data
    const {
      line_items,
      customer_id,
      customer_email,
      success_url,
      cancel_url,
      metadata,
      mode,
      billing_address_collection,
      shipping_address_collection,
      payment_method_types,
      allow_promotion_codes,
      automatic_tax,
      currency
    } = validatedData;

    logStep("Line items received", { itemCount: line_items.length });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Use provided customer_id or customer_email
    const finalCustomerId = customer_id;
    const finalCustomerEmail = customer_email || user.email;
    
    logStep("Customer info", { customerId: finalCustomerId, email: finalCustomerEmail });

    // Validate and get safe origin for URLs
    const incomingOrigin = req.headers.get("origin") || new URL(req.url).origin;
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://moodymedia.app',
      'https://app.moodymedia.com',
      // Add your production domains here
    ];
    
    let safeOrigin = incomingOrigin;
    if (!allowedOrigins.includes(incomingOrigin)) {
      // Use first allowed origin as fallback or return error
      safeOrigin = allowedOrigins[0];
      logStep("Origin not in allowlist, using fallback", { incomingOrigin, safeOrigin });
    }

    // Create checkout session
    const sessionConfig: any = {
      line_items,
      mode,
      success_url: success_url || `${safeOrigin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${safeOrigin}/cart?canceled=true`,
      payment_method_types,
      billing_address_collection,
      client_reference_id: user.id,
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