import { supabase } from "@/integrations/supabase/client";

export const stripeService = {
  async createCheckoutSession(priceId: string): Promise<{ url: string | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, returnUrl: window.location.origin },
      });

      if (error) return { url: null, error: `El servicio de pagos no está disponible: ${error.message}` };
      if (!data?.url) return { url: null, error: "No se recibió URL de checkout válida." };

      return { url: data.url, error: null };
    } catch {
      return { url: null, error: "Error de conexión con el servicio de pagos." };
    }
  },

  async createPortalSession(): Promise<{ url: string | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { returnUrl: window.location.origin },
      });

      if (error) return { url: null, error: "El portal de suscripción no está disponible ahora." };
      if (!data?.url) return { url: null, error: "No se recibió URL del portal." };

      return { url: data.url, error: null };
    } catch {
      return { url: null, error: "Error de conexión con el portal de suscripción." };
    }
  },
};
