import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";

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

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

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
    return new Response(JSON.stringify({ error: `Webhook error: ${err.message}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const productId = sub.items.data[0]?.price?.product as string;
        const isActive = ["active", "trialing"].includes(sub.status);
        const userId = sub.metadata?.supabase_user_id;

        if (!userId) break;

        const plan = isActive ? (Deno.env.get("STRIPE_PRODUCT_PROPLUS") === productId ? "proplus" : "pro") : "free";

        const { error: upsertError } = await supabase
          .from("subscribers")
          .upsert({
            user_id: userId,
            plan: plan,
            status: sub.status as string,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (upsertError) throw upsertError;
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;

        if (!userId) break;

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
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
