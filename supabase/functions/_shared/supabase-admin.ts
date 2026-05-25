/**
 * Shared Supabase admin client for Edge Functions.
 * Uses SERVICE_ROLE_KEY — only use in trusted server-side contexts.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

export function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}
