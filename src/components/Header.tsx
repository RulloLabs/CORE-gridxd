import { useState, useEffect } from "react";
import { User, LogOut, Sun, Moon, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import UserMenu from "@/components/UserMenu";

const Header = () => {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isSoundOn, setIsSoundOn] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, [isDark]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between">
      {/* Brand — horizontal lockup: logo + wordmark */}
      <div className="flex items-center gap-3">
        <img
          src="/LogoMainGRIDXD.png"
          alt="GridXD"
          className="w-10 h-10 object-contain"
        />
        <div className="flex flex-col leading-none">
          <span className="text-sm font-black tracking-tight text-foreground uppercase">GridXD</span>
          <span className="text-[10px] font-medium text-muted-foreground tracking-wider hidden sm:block">Design Intelligence</span>
        </div>
      </div>

      {/* Action area */}
      <div className="flex items-center gap-2 sm:gap-4 p-1 rounded-2xl bg-background/40 backdrop-blur-xl border border-border/40 shadow-xl overflow-visible animate-in fade-in slide-in-from-top-4 duration-700">
        
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
          <UserMenu />
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
