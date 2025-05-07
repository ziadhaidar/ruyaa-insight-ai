
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { priceId, testMode } = await req.json();
    
    console.log("Create checkout called with priceId:", priceId, "testMode:", testMode);

    // Make sure we have a price ID
    if (!priceId) {
      throw new Error("No price ID provided");
    }

    // Initialize Stripe with the secret key from environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });
    
    console.log("Creating Stripe checkout session");

    // Get the origin for proper redirect URLs
    const origin = req.headers.get("origin") || "https://nour-al-ruyaa.vercel.app";
    
    // For test/free mode, create a $0 checkout session
    const sessionConfig = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment?payment_success=true`,
      cancel_url: `${origin}/payment`,
    };

    // If it's test mode (free tier), we'll use Stripe's test environment explicitly
    if (testMode) {
      console.log("Using Stripe test mode for free tier");
      // Modify the session for test mode if needed
      // This is mostly symbolic as we'll bypass the actual payment page in the frontend
    }
    
    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create(sessionConfig);
    
    console.log("Checkout session created:", session.id);
    console.log("Success URL set to:", `${origin}/payment?payment_success=true`);

    // Return the checkout URL
    return new Response(
      JSON.stringify({ 
        success: true, 
        url: session.url,
        testMode: testMode 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    // Handle errors
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
