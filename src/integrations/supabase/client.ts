import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const missingEnv =
  !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY
    ? `Missing env vars: ${!SUPABASE_URL ? "VITE_SUPABASE_URL " : ""}${!SUPABASE_PUBLISHABLE_KEY ? "VITE_SUPABASE_PUBLISHABLE_KEY" : ""}`
    : null;

if (missingEnv) {
  console.warn(`[supabase] ${missingEnv}. Auth & DB features will fail.`);
}

const ERR_MSG = `Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.`;

const err = () => Promise.reject(new Error(ERR_MSG));

const noopSub = { unsubscribe: () => {} };

const createQb = () => {
  const ops = {} as Record<string, unknown>;
  const chain = new Proxy(ops, {
    get(t, prop: string) {
      if (prop === "then") return undefined;
      if (prop === "single") return err;
      return () => chain;
    },
  });
  return chain;
};

export const supabase = missingEnv
  ? ({
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: noopSub } }),
        signInWithOAuth: async () => ({ data: { url: "" }, error: new Error(ERR_MSG) }),
        signOut: async () => ({ error: null }),
        updateUser: async () => ({ data: { user: null }, error: new Error(ERR_MSG) }),
        refreshSession: err,
        setSession: err,
        verifyOtp: err,
        resend: err,
        signUp: err,
        signInWithPassword: err,
        signInWithIdToken: err,
        signInWithSSO: err,
        exchangeCodeForSession: err,
        getProvider: () => null,
        getUser: async () => ({ data: { user: null }, error: null }),
        startAutoRefresh: () => noopSub,
        stopAutoRefresh: () => {},
      },
      from: () => createQb(),
      functions: {
        invoke: async () => ({ data: null, error: new Error(ERR_MSG) }),
        setAuth: () => {},
      },
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: new Error(ERR_MSG) }),
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
          list: async () => ({ data: null, error: new Error(ERR_MSG) }),
          remove: async () => ({ data: null, error: new Error(ERR_MSG) }),
          createSignedUploadUrl: async () => ({ data: null, error: new Error(ERR_MSG) }),
          copy: async () => ({ data: null, error: new Error(ERR_MSG) }),
          move: async () => ({ data: null, error: new Error(ERR_MSG) }),
          createSignedUrl: async () => ({ data: null, error: new Error(ERR_MSG) }),
          update: async () => ({ data: null, error: new Error(ERR_MSG) }),
        }),
      },
      rpc: async () => ({ data: null, error: new Error(ERR_MSG) }),
      channel: () => ({ subscribe: noopSub, on: () => ({}) }),
      realtime: { subscribe: noopSub },
      getUrl: () => "",
      headers: {} as Record<string, string>,
    }) as unknown as SupabaseClient<Database>
  : createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
