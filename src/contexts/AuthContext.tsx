import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { authService } from "@/api/authService";
import type { User, Session } from "@supabase/supabase-js";

type SubscriptionPlan = "free" | "pro" | "proplus";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  plan: SubscriptionPlan;
  subscribed: boolean;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  plan: "free",
  subscribed: false,
  checkSubscription: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [subscribed, setSubscribed] = useState(false);

  const checkSubscription = useCallback(async () => {
    try {
      const data = await authService.checkSubscription();
      setSubscribed(data.subscribed);
      setPlan(data.plan as SubscriptionPlan);
    } catch {
      setSubscribed(false);
      setPlan("free");
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
          setPlan("free");
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
  }, [checkSubscription]);

  // Auto-refresh subscription only when page is visible
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 5 * 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") checkSubscription();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, checkSubscription]);

  return (
    <AuthContext.Provider value={{ user, session, loading, plan, subscribed, checkSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}
