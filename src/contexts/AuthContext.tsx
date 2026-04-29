import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { authService } from "@/api/authService";
import type { User, Session } from "@supabase/supabase-js";

type SubscriptionTier = "free" | "pro" | "proplus";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  tier: SubscriptionTier;
  subscribed: boolean;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  tier: "free",
  subscribed: false,
  checkSubscription: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [subscribed, setSubscribed] = useState(false);

  const checkSubscription = useCallback(async () => {
    try {
      const data = await authService.checkSubscription();
      setSubscribed(data.subscribed);
      setTier(data.tier as SubscriptionTier);
    } catch {
      setSubscribed(false);
      setTier("free");
    }
  }, []);

  useEffect(() => {
    const subscription = authService.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          setTimeout(checkSubscription, 0);
        } else {
          setSubscribed(false);
          setTier("free");
        }
      }
    );

    authService.getSession().then((session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkSubscription();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-refresh subscription every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, session, loading, tier, subscribed, checkSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}
