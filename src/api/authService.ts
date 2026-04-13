import { supabase } from "@/integrations/supabase/client";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";

/**
 * Service to handle Authentication operations.
 * Abstracts Supabase auth calls to make backend migration trivially easy.
 */
export const authService = {
  /**
   * Get the current user session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Sign out the user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get auth state change listener
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange(callback);
    return data.subscription;
  },

  /**
   * Check user subscription status
   */
  async checkSubscription() {
    const { data, error } = await supabase.functions.invoke("check-subscription");
    if (error) throw error;
    return {
      subscribed: data.subscribed ?? false,
      tier: data.tier ?? "free"
    };
  }
};
