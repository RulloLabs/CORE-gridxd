import { useState } from "react";
import { X, Lock, Sparkles, Zap, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { stripeService } from "@/api/stripeService";
import { STRIPE_TIERS } from "@/lib/stripe-config";
import { type SvgStyle, STYLE_META } from "@/lib/svgStyle";
import { toast } from "sonner";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Which locked style triggered the modal */
  blockedStyle?: SvgStyle;
}

const UpgradeModal = ({ open, onClose, blockedStyle = "filled" }: UpgradeModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleUpgrade = async (tierKey: "pro" | "proplus") => {
    if (!user) {
      toast.error("Inicia sesión para continuar");
      onClose();
      return;
    }

    setLoading(true);
    try {
      const stripeTier = STRIPE_TIERS[tierKey];
      const url = await stripeService.createCheckoutSession(stripeTier.price_id);
      if (url) {
        window.open(url, "_blank");
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Error al crear sesión de pago");
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
        <div className="pointer-events-auto w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="relative p-6 pb-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Lock icon + blocked style */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Estilo bloqueado
                </p>
                <h3 className="text-base font-black text-foreground">
                  {meta.icon} {meta.label} — requiere PRO
                </h3>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Desbloquea <span className="text-foreground font-semibold">{meta.label}</span> y todos los estilos de exportación SVG con un plan de pago.
            </p>
          </div>

          {/* Plans */}
          <div className="px-6 pb-6 space-y-3">
            {/* PRO */}
            <button
              onClick={() => handleUpgrade("pro")}
              disabled={loading}
              className="w-full text-left p-4 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all group disabled:opacity-60"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-black text-foreground">Pro</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">POPULAR</span>
                </div>
                <span className="text-xl font-black text-foreground">9€<span className="text-sm font-medium text-muted-foreground">/mes</span></span>
              </div>
              <ul className="space-y-1">
                {["Outline + Filled + Duotone", "Export SVG ilimitados", "ZIP con naming automático"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3 h-3 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>

            {/* PRO+ */}
            <button
              onClick={() => handleUpgrade("proplus")}
              disabled={loading}
              className="w-full text-left p-4 rounded-xl border border-border bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/50 transition-all disabled:opacity-60"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="font-black text-foreground">Pro+</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">TODO</span>
                </div>
                <span className="text-xl font-black text-foreground">19€<span className="text-sm font-medium text-muted-foreground">/mes</span></span>
              </div>
              <ul className="space-y-1">
                {["Todo lo de Pro", "Export las 3 variantes (1 ZIP)", "Batch múltiples imágenes"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3 h-3 text-amber-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>

            <p className="text-center text-[10px] text-muted-foreground pt-1">
              Sin permanencia · Cancela cuando quieras · Pago seguro con Stripe
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UpgradeModal;
