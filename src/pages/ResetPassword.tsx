import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lock } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Escuchar el cambio en auth (el email link de supabase te loguea temporalmente)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMessage("Por favor, introduce tu nueva contraseña.");
      }
    });

    // Validar si tenemos hash
    if (!window.location.hash.includes("access_token")) {
      // Si no venimos de un link correcto, podríamos no estar recuperando la contraseña
      // Sin embargo, `supabase.auth.updateUser` solo funcionará si hay una sesión activa,
      // la cual se establece cuando se llega desde el email.
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("¡Contraseña actualizada con éxito! Redirigiendo...");
      setTimeout(() => navigate("/"), 3000);
    } catch (err: unknown) {
      const error = err as Error;
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-[-10%] w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-[-10%] w-32 h-32 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex justify-center mb-6 text-primary">
          <Lock className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-center text-foreground">Nueva contraseña</h2>
        <p className="text-sm text-center text-muted-foreground mb-6">Mínimo 6 caracteres.</p>

        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={loading || password.length < 6}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-105 transition-all glow-cyan disabled:opacity-50"
          >
            {loading ? "Actualizando..." : "Actualizar Contraseña"}
          </button>
        </form>

        {message && (
          <p className="text-sm text-center mt-4 text-primary font-medium">{message}</p>
        )}
      </div>
    </div>
  );
}
