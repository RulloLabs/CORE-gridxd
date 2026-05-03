import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { stripeService } from "@/api/stripeService";
import { STRIPE_PLANS } from "@/lib/stripe-config";
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
    planKey: null as string | null,
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
    planKey: "pro",
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
    planKey: "proplus",
  },
];

const PricingSection = () => {
  const { user, plan: currentPlan } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleActivate = async (planKey: string | null) => {
    if (!planKey) {
      window.location.hash = "#upload";
      return;
    }

    if (!user) {
      setAuthOpen(true);
      return;
    }

    // If already on a paid plan, redirect to portal for upgrade/downgrade
    if (currentPlan !== "free") {
      setLoadingPlan(planKey);
      try {
        const url = await stripeService.createPortalSession();
        if (url) {
          window.location.href = url;
        }
      } catch (err: unknown) {
        const error = err as Error;
        toast.error(error.message || "Error al abrir portal de suscripción");
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    const stripePlan = STRIPE_PLANS[planKey as keyof typeof STRIPE_PLANS];
    if (!stripePlan) return;

    setLoadingPlan(planKey);
    try {
      const url = await stripeService.createCheckoutSession(stripePlan.price_id);
      if (url) {
        window.location.href = url;
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Error al crear sesión de pago");
    } finally {
      setLoadingPlan(null);
    }
  };

  const isCurrentPlan = (planKey: string | null) => {
    if (!planKey) return currentPlan === "free";
    return currentPlan === planKey;
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 px-4 md:px-0">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex-shrink-0 w-[85vw] sm:w-[45vw] md:w-full snap-center rounded-[2.5rem] p-8 sm:p-10 border transition-all duration-500 hover:-translate-y-2 ${
                plan.highlighted
                  ? "bg-gradient-to-br from-primary/10 via-card to-background border-primary/50 shadow-2xl shadow-primary/20 scale-105 z-10"
                  : "glass-card border-white/10 hover:border-white/20 shadow-xl"
              } ${isCurrentPlan(plan.planKey) ? "ring-2 ring-primary ring-offset-4 ring-offset-background" : ""}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1 bg-primary text-primary-foreground text-[10px] sm:text-xs font-black rounded-full flex items-center gap-1.5 shadow-xl shadow-primary/20 whitespace-nowrap">
                  <Sparkles className="w-3.5 h-3.5" />
                  RECOMENDADO
                </div>
              )}

              {isCurrentPlan(plan.planKey) && (
                <div className="absolute -top-3 right-4 sm:right-6 px-2 py-0.5 sm:px-3 sm:py-1 bg-accent text-accent-foreground text-[10px] sm:text-xs font-bold rounded-full shadow-md whitespace-nowrap">
                  TU PLAN
                </div>
              )}

              <h3 className="text-xl sm:text-2xl font-black mb-1 sm:mb-2 text-foreground tracking-tight">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-5xl sm:text-6xl font-black tracking-tighter text-foreground">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground font-black text-sm uppercase tracking-widest">{plan.period}</span>
                )}
              </div>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed font-medium">
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
                onClick={() => handleActivate(plan.planKey)}
                disabled={isCurrentPlan(plan.planKey) || (loadingPlan !== null && loadingPlan === plan.planKey)}
                className={`w-full py-4 rounded-2xl font-black text-sm transition-all shadow-xl ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:scale-105 active:scale-95 shadow-primary/20 glow-cyan"
                    : "bg-white/5 text-foreground hover:bg-white/10 active:scale-95 border border-white/10"
                } disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 uppercase tracking-widest`}
              >
                {(loadingPlan !== null && loadingPlan === plan.planKey)
                  ? "Cargando..."
                  : isCurrentPlan(plan.planKey)
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
