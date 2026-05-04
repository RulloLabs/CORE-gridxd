import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

/**
 * GridXD — Stripe Webhook Handler
 *
 * Updates `profiles.subscription_tier` in Supabase when Stripe fires:
 *  - customer.subscription.created
 *  - customer.subscription.updated
 *  - customer.subscription.deleted
 *
 * Required env vars (set in Supabase dashboard → Edge Functions → Secrets):
 *  STRIPE_SECRET_KEY
 *  STRIPE_WEBHOOK_SECRET      ← get from Stripe dashboard → Webhooks → Signing secret
 *  SUPABASE_URL
 *  SUPABASE_SERVICE_ROLE_KEY
 */

const PRODUCT_TO_PLAN: Record<string, string> = {
  prod_TPDRgnDAWN0YGl: "pro",      // Premium en Stripe
  prod_TPFYLTuQtsdQbY: "proplus",  // Enterprise en Stripe
};


// ─── Allowed origins (NO wildcard) ────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://gridxd.vercel.app",
  "https://gridxd-core-eta.vercel.app",
];

function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[2];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    return new Response(
      JSON.stringify({ error: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  // Verify Stripe signature
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: `Webhook error: ${err.message}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  console.log(`Processing Stripe event: ${event.type}`);

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const productId = sub.items.data[0]?.price?.product as string;
        const isActive = ["active", "trialing"].includes(sub.status);
        const userId = sub.metadata?.supabase_user_id;

        if (!userId) {
          console.warn("No supabase_user_id found in subscription metadata");
          break;
        }

        const plan = isActive ? (PRODUCT_TO_PLAN[productId] ?? "pro") : "free";

        // Upsert subscribers table
        const { error: upsertError } = await supabase
          .from("subscribers")
          .upsert({
            user_id: userId,
            plan: plan,
            status: sub.status as any,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (upsertError) throw upsertError;

        console.log(`✅ Updated user ${userId} → plan: ${plan}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;

        if (!userId) break;

        // Downgrade to free
        const { error: updateError } = await supabase
          .from("subscribers")
          .upsert({
            user_id: userId,
            plan: "free",
            status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (updateError) throw updateError;

        console.log(`✅ Downgraded user ${userId} → plan: free`);
        break;
      }

      case "invoice.payment_failed": {
        // Optional: notify user, don't downgrade immediately (Stripe handles dunning)
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`⚠️ Payment failed for customer: ${invoice.customer}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
