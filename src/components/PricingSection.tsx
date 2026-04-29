import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { stripeService } from "@/api/stripeService";
import { STRIPE_TIERS } from "@/lib/stripe-config";
import AuthModal from "@/components/AuthModal";
import { toast } from "sonner";

const plans = [
  {
    name: "Free",
    price: "0€",
    period: "",
    description: "Empieza gratis. Sin fricción.",
    features: [
      "3 imágenes/día",
      "PNG básico (512px)",
      "Detección por Canvas",
      "Sin registro",
    ],
    cta: "Empezar gratis",
    highlighted: false,
    tierKey: null as string | null,
  },
  {
    name: "Pro",
    price: "9€",
    period: "/mes",
    description: "Ahorra 2h de trabajo manual por imagen.",
    features: [
      "Imágenes ilimitadas",
      "PNG HD (1024px)",
      "Detección avanzada (OpenCV)",
      "Eliminación de fondo real (rembg)",
      "Export SVG",
      "Naming automático",
    ],
    cta: "Activar Pro",
    highlighted: true,
    tierKey: "pro",
  },
  {
    name: "Pro+",
    price: "19€",
    period: "/mes",
    description: "Automatiza tu flujo completo.",
    features: [
      "Todo lo de Pro",
      "Batch (varias imágenes a la vez)",
      "Historial guardado",
      "API access",
      "Soporte prioritario",
    ],
    cta: "Activar Pro+",
    highlighted: false,
    tierKey: "proplus",
  },
];

const PricingSection = () => {
  const { user, tier: currentTier } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleActivate = async (tierKey: string | null) => {
    if (!tierKey) {
      window.location.hash = "#upload";
      return;
    }

    if (!user) {
      setAuthOpen(true);
      return;
    }

    // If already on a paid plan, redirect to portal for upgrade/downgrade
    if (currentTier !== "free") {
      setLoadingTier(tierKey);
      try {
        const url = await stripeService.createPortalSession();
        if (url) {
          window.location.href = url;
        }
      } catch (err: unknown) {
        const error = err as Error;
        toast.error(error.message || "Error al abrir portal de suscripción");
      } finally {
        setLoadingTier(null);
      }
      return;
    }

    const stripeTier = STRIPE_TIERS[tierKey as keyof typeof STRIPE_TIERS];
    if (!stripeTier) return;

    setLoadingTier(tierKey);
    try {
      const url = await stripeService.createCheckoutSession(stripeTier.price_id);
      if (url) {
        window.location.href = url;
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Error al crear sesión de pago");
    } finally {
      setLoadingTier(null);
    }
  };

  const isCurrentPlan = (tierKey: string | null) => {
    if (!tierKey) return currentTier === "free";
    return currentTier === tierKey;
  };

  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Deja de recortar a mano
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-lg mx-auto">
          Cada minuto recortando iconos es un minuto que no estás diseñando
        </p>

        <div className="flex md:grid md:grid-cols-3 gap-4 lg:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex-shrink-0 w-[85vw] sm:w-[45vw] md:w-full snap-center rounded-2xl lg:rounded-[2rem] p-5 sm:p-6 lg:p-8 border transition-all duration-300 ${
                plan.highlighted
                  ? "bg-card border-primary glow-cyan"
                  : "bg-card border-border hover:border-muted-foreground/30 shadow-xl"
              } ${isCurrentPlan(plan.tierKey) ? "ring-2 ring-primary" : ""}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 sm:px-4 sm:py-1 bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold rounded-full flex items-center gap-1 shadow-lg whitespace-nowrap">
                  <Sparkles className="w-3 h-3" />
                  POPULAR
                </div>
              )}

              {isCurrentPlan(plan.tierKey) && (
                <div className="absolute -top-3 right-4 sm:right-6 px-2 py-0.5 sm:px-3 sm:py-1 bg-accent text-accent-foreground text-[10px] sm:text-xs font-bold rounded-full shadow-md whitespace-nowrap">
                  TU PLAN
                </div>
              )}

              <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl sm:text-5xl font-black">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground font-medium text-sm sm:text-base">{plan.period}</span>
                )}
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed">
                {plan.description}
              </p>

              <ul className="space-y-2 sm:space-y-4 mb-6 sm:mb-10">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-primary" />
                    </div>
                    <span className="text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleActivate(plan.tierKey)}
                disabled={isCurrentPlan(plan.tierKey) || (loadingTier !== null && loadingTier === plan.tierKey)}
                className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-lg ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:scale-105 active:scale-95 glow-cyan"
                    : "bg-muted text-foreground hover:bg-muted/80 active:scale-95"
                } disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100`}
              >
                {(loadingTier !== null && loadingTier === plan.tierKey)
                  ? "Cargando..."
                  : isCurrentPlan(plan.tierKey)
                  ? "Plan actual"
                  : plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  );
};

export default PricingSection;
