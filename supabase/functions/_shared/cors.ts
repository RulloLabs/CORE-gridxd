/**
 * Shared CORS configuration for all Supabase Edge Functions.
 * Single source of truth for allowed origins.
 */
export const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://gridxd.vercel.app",
  "https://gridxd-core-eta.vercel.app",
];

export function getCorsHeaders(origin: string | null) {
  const isAllowed =
    origin &&
    (ALLOWED_ORIGINS.includes(origin) ||
     origin.endsWith(".vercel.app") ||
     origin.endsWith(".localhost"));
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : "https://gridxd.vercel.app",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, stripe-signature",
    Vary: "Origin",
  };
}
