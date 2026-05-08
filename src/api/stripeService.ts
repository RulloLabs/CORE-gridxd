import { supabase } from "@/integrations/supabase/client";

/**
 * Service to handle Stripe operations.
 * Abstracts Supabase Edge Function calls to make backend migration trivially easy.
 */
export const stripeService = {
  /**
   * Creates a Stripe Checkout Session for a specific plan
   * @param priceId The Stripe price ID
   * @returns The checkout URL
   */
  async createCheckoutSession(priceId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId, returnUrl: window.location.origin },
    });

    if (error) {
      throw new Error(error.message || "Error al crear sesión de pago");
    }

    if (!data?.url) {
      throw new Error("No se recibió URL de checkout válida");
    }

    return data.url;
  },

  /**
   * Creates a Stripe Customer Portal Session for managing subscriptions
   * @returns The portal URL
   */
  async createPortalSession(): Promise<string> {
    const { data, error } = await supabase.functions.invoke("customer-portal", {
      body: { returnUrl: window.location.origin },
    });

    if (error) {
      throw new Error(error.message || "Error al acceder al portal de gestión");
    }

    if (!data?.url) {
      throw new Error("No se recibió URL de portal válida");
    }

    return data.url;
  },
};
