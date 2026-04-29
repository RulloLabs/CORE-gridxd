import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User, Settings, CreditCard, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { stripeService } from "@/api/stripeService";
import { toast } from "sonner";

const UserMenu = () => {
  const { user, tier } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.email?.charAt(0).toUpperCase() || "U";

  const handlePortal = async () => {
    setIsPortalLoading(true);
    try {
      const url = await stripeService.createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Error al abrir el portal de facturación");
    } finally {
      setIsPortalLoading(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 pr-3 rounded-2xl bg-muted/50 hover:bg-muted transition-all duration-300 border border-border/40"
      >
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xs shadow-lg shadow-primary/20">
          {initials}
        </div>
        <div className="flex flex-col items-start leading-none hidden sm:flex">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{tier}</span>
          <span className="text-[11px] font-medium text-foreground truncate max-w-[100px]">{user.email?.split('@')[0]}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-card border border-border shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-3 border-b border-border/50 mb-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-primary mb-0.5">{tier} Account</p>
            <p className="text-sm font-semibold text-foreground truncate">{user.email}</p>
          </div>

          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors text-left">
            <User className="w-4 h-4" /> Mi Perfil
          </button>
          
          <button 
            onClick={handlePortal}
            disabled={isPortalLoading}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors text-left disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" /> {isPortalLoading ? "Cargando..." : "Mi Plan"}
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors text-left">
            <Settings className="w-4 h-4" /> Ajustes
          </button>

          <div className="h-px bg-border/50 my-1 mx-2" />

          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/5 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
