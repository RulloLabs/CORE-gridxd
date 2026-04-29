import { useEffect, useState } from "react";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const CheckoutSuccess = () => {
  const { checkSubscription, tier } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const refresh = async () => {
      await checkSubscription();
      setChecking(false);
    };
    refresh();
  }, [checkSubscription]);

  useEffect(() => {
    if (!checking) {
      const timeout = setTimeout(() => navigate("/"), 6000);
      return () => clearTimeout(timeout);
    }
  }, [checking, navigate]);

  return (
    <section className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center glow-cyan">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
        </div>

        <h1 className="text-3xl font-black">
          <span className="text-gradient-cyan">¡Suscripción activada!</span>
        </h1>

        <p className="text-muted-foreground text-lg">
          Tu plan{" "}
          <span className="text-primary font-bold uppercase">
            {checking ? "..." : tier}
          </span>{" "}
          ya está activo. Prepárate para procesar iconos sin límites.
        </p>

        {checking ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Verificando suscripción…
          </div>
        ) : (
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-primary text-primary-foreground font-bold text-lg transition-all hover:scale-105 glow-cyan"
          >
            Ir al procesador <ArrowRight className="w-5 h-5" />
          </button>
        )}

        <p className="text-muted-foreground text-sm">
          Serás redirigido automáticamente en unos segundos…
        </p>
      </div>
    </section>
  );
};

export default CheckoutSuccess;
