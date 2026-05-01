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
   * Sign in with Google
   */
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes: "email profile openid",
      }
    });
    if (error) throw error;
    if (data?.url) window.location.href = data.url;
    return data;
  },

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  /**
   * Update user profile
   */
  async updateProfile(profile: { id: string; full_name?: string; avatar_url?: string }) {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(profile)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Upload avatar image
   */
  async uploadAvatar(userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/avatar.${fileExt}`;
    
    // Upload to public "avatars" bucket
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  /**
   * Update user metadata
   */
  async updateUserMetadata(metadata: { full_name?: string; avatar_url?: string | null }) {
    const { data, error } = await supabase.auth.updateUser({
      data: metadata
    });
    if (error) throw error;
    return data;
  },

  /**
   * Check user subscription status
   */
  async checkSubscription() {
    const { data, error } = await supabase.functions.invoke("check-subscription");
    if (error) throw error;
    return {
      subscribed: data.subscribed ?? false,
      plan: data.plan ?? "free"
    };
  }
};
