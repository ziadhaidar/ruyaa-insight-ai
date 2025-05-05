
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
    const { priceId } = await req.json();
    
    console.log("Create checkout called with priceId:", priceId);

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
    
    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
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
    });
    
    console.log("Checkout session created:", session.id);
    console.log("Success URL set to:", `${origin}/payment?payment_success=true`);

    // Return the checkout URL
    return new Response(
      JSON.stringify({ 
        success: true, 
        url: session.url 
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
