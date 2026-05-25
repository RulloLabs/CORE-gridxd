import { useState, useEffect } from "react";
import { X, Lock, Sparkles, Zap, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { stripeService } from "@/api/stripeService";
import { STRIPE_PLANS } from "@/lib/stripe-config";
import { type SvgStyle, STYLE_META } from "@/lib/svgStyle";
import { toast } from "sonner";
import AuthModal from "@/components/AuthModal";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Which locked style triggered the modal */
  blockedStyle?: SvgStyle;
}

const UpgradeModal = ({ open, onClose, blockedStyle = "filled" }: UpgradeModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<"pro" | "proplus" | null>(null);

  // Auto-checkout immediately after successful login/signup
  useEffect(() => {
    if (user && pendingPlan) {
      const checkout = async () => {
        const planToCheckout = pendingPlan;
        setPendingPlan(null);
        setAuthOpen(false);
        setLoading(true);
        try {
          const stripePlan = STRIPE_PLANS[planToCheckout];
          const url = await stripeService.createCheckoutSession(stripePlan.price_id);
          if (url) {
            window.location.href = url;
            onClose();
          }
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Error al crear sesión de pago");
        } finally {
          setLoading(false);
        }
      };
      checkout();
    }
  }, [user, pendingPlan, onClose]);

  if (!open) return null;

  const handleUpgrade = async (planKey: "pro" | "proplus") => {
    if (!user) {
      setPendingPlan(planKey);
      setAuthOpen(true);
      return;
    }

    setLoading(true);
    try {
      const stripePlan = STRIPE_PLANS[planKey];
      const url = await stripeService.createCheckoutSession(stripePlan.price_id);
      if (url) {
        window.location.href = url;
        onClose();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al crear sesión de pago");
    } finally {
      setLoading(false);
    }
  };

  const meta = STYLE_META[blockedStyle];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg glass-card border border-white/10 rounded-[2.5rem] shadow-2xl shadow-black/60 animate-in fade-in slide-in-from-bottom-8 duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
          {/* Header */}
          <div className="relative p-12 pb-0 text-center">
            <button
              onClick={onClose}
              title="Cerrar"
              aria-label="Cerrar modal"
              className="absolute top-8 right-8 p-2 rounded-full hover:bg-white/5 transition-all text-muted-foreground hover:text-foreground hover:rotate-90"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Lock icon + blocked style */}
            <div className="inline-flex flex-col items-center gap-6 mb-10">
              <div className="relative group">
                <div className="absolute inset-0 bg-amber-500/30 rounded-[2rem] blur-2xl group-hover:bg-amber-500/50 transition-all duration-500" />
                <div className="relative w-24 h-24 rounded-[2rem] bg-gradient-to-br from-amber-400/20 to-amber-600/30 border border-amber-500/30 flex items-center justify-center shadow-2xl backdrop-blur-md">
                  <Lock className="w-10 h-10 text-amber-500 animate-breath" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.4em] animate-pulse">
                  Contenido Reservado
                </p>
                <h3 className="text-4xl font-black text-foreground tracking-tighter">
                  {meta.icon} {meta.label} <span className="text-muted-foreground/30">Vector</span>
                </h3>
              </div>
            </div>

            <p className="text-lg text-muted-foreground mb-12 leading-relaxed max-w-sm mx-auto font-medium">
              Desbloquea el motor de exportación vectorial y lleva tus diseños al <span className="text-foreground font-extrabold italic">siguiente nivel</span>.
            </p>
          </div>

          {/* Plans */}
          <div className="px-10 pb-14 space-y-6">
            {/* PRO */}
            <button
              onClick={() => handleUpgrade("pro")}
              disabled={loading}
              className="w-full text-left p-8 rounded-[2.5rem] border-2 border-primary/40 bg-primary/[0.03] hover:bg-primary/[0.07] transition-all group disabled:opacity-60 relative overflow-hidden card-hover-effect"
            >
              <div className="absolute top-0 right-0 p-4">
                <span className="text-[9px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-3 py-1 rounded-full shadow-lg shadow-primary/20">Popular</span>
              </div>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-inner">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <span className="block font-black text-xl text-foreground">Plan PRO</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Individual</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-foreground">9€</span>
                    <span className="text-sm font-bold text-muted-foreground">/mes</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3 mb-2">
                {["SVG Vector ilimitados", "Detección en lote (25/m)", "Soporte Estándar"].map(f => (
                  <div key={f} className="flex items-center gap-3 text-sm text-muted-foreground/80 font-medium">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </button>

            {/* PRO+ */}
            <button
              onClick={() => handleUpgrade("proplus")}
              disabled={loading}
              className="w-full text-left p-8 rounded-[2.5rem] border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition-all disabled:opacity-60 card-hover-effect relative group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/20 shadow-inner">
                    <Zap className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <span className="block font-black text-xl text-foreground">Plan EXPERTO</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500/70">PRO PLUS</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-foreground">19€</span>
                    <span className="text-sm font-bold text-muted-foreground">/mes</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {["Todo lo de Pro", "Exportación 3-en-1 (Batch)", "Acceso Anticipado IA"].map(f => (
                  <div key={f} className="flex items-center gap-3 text-sm text-muted-foreground/80 font-medium">
                    <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-amber-500" />
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </button>

            <div className="text-center space-y-6 pt-6">
              <p className="text-[11px] text-muted-foreground/50 leading-relaxed font-bold uppercase tracking-widest">
                Seguridad de Grado Bancario · Stripe Verified
              </p>
              <div className="flex items-center justify-center gap-6 opacity-20 grayscale transition-opacity hover:opacity-50">
                <span className="text-[9px] font-black tracking-[0.3em] uppercase">Visa</span>
                <span className="text-[9px] font-black tracking-[0.3em] uppercase">Mastercard</span>
                <span className="text-[9px] font-black tracking-[0.3em] uppercase">Apple Pay</span>
                <span className="text-[9px] font-black tracking-[0.3em] uppercase">Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Auth Modal Overlay */}
      {authOpen && (
        <AuthModal
          open={authOpen}
          onClose={() => {
            setAuthOpen(false);
            setPendingPlan(null);
          }}
        />
      )}
    </>
  );
};

export default UpgradeModal;
