import { useState, useEffect } from "react";
import { User, LogOut, Sun, Moon, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Header = () => {
  const { user, tier } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isSoundOn, setIsSoundOn] = useState(true);

  useEffect(() => {
    // Sync theme with document
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between">
      {/* Brand area (optional, can be empty if logo is in Hero) */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center border border-primary/20 backdrop-blur-md bg-white/10">
          <img src="/Grid Neon Sin Fondo.png" alt="GridXD Logo" className="w-full h-full object-contain" />
        </div>
      </div>

      {/* Action area */}
      <div className="flex items-center gap-2 sm:gap-4 p-1 rounded-2xl bg-background/40 backdrop-blur-xl border border-border/40 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
        
        {/* Toggle Sound */}
        <button
          onClick={() => setIsSoundOn(!isSoundOn)}
          className="p-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300"
          title={isSoundOn ? "Silenciar" : "Activar sonido"}
        >
          {isSoundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Toggle Theme */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300"
          title={isDark ? "Modo claro" : "Modo oscuro"}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="w-px h-6 bg-border/40 mx-1" />

        {/* User area */}
        {user ? (
          <div className="flex items-center gap-3 pr-2">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                {tier}
              </span>
              <span className="text-[11px] text-muted-foreground truncate max-w-[80px] hidden sm:block">
                {user.email}
              </span>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-300 active:scale-95"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setAuthOpen(true)}
            className="h-10 px-4 rounded-xl text-foreground font-semibold flex items-center gap-2 hover:bg-primary/10 hover:text-primary transition-all duration-300"
          >
            <User className="w-4 h-4" /> 
            <span className="hidden sm:inline">Entrar</span>
          </Button>
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
};

export default Header;
