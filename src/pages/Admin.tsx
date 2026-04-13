import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Users, Key, Settings, Activity, ShieldCheck, Download, Server } from "lucide-react";

export default function Admin() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Métricas
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalExtractions: 0,
    totalImages: 0,
  });

  useEffect(() => {
    // Verificar si es Admin
    if (!loading && (!user || user.email !== "iberusdelasierra@gmail.com")) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    async function loadMetrics() {
      // 1. Número total de usuarios (Solo posible si tenemos permiso o vía Edge Function. Mock/real fallback)
      // Como el RLS bloquea listar a todos, crearemos un RPC "get_admin_metrics" o lo simularemos si falla.
      try {
        const { data, error } = await supabase.rpc('get_admin_metrics');
        if (!error && data) {
          setMetrics({
            totalUsers: data.total_users || 0,
            totalExtractions: data.total_extractions || 0,
            totalImages: data.total_images || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching metrics", err);
      } finally {
        setLoading(false);
      }
    }

    if (user?.email === "iberusdelasierra@gmail.com") {
      loadMetrics();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading || user?.email !== "iberusdelasierra@gmail.com") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Activity className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground text-sm font-semibold">Cargando Panel de Administración...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <ShieldCheck className="w-6 h-6" />
              <h1 className="text-3xl font-black">Admin Dashboard</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Visión global de GridXD • Autenticado como {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => navigate("/")} className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-semibold transition-colors">Volver al editor</button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-[-10%] w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
            <Users className="w-8 h-8 text-primary mb-4" />
            <p className="text-sm text-muted-foreground font-semibold">Usuarios Registrados</p>
            <h2 className="text-4xl font-black mt-2">{metrics.totalUsers}</h2>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-[-10%] w-24 h-24 bg-cyan-400/10 rounded-full blur-2xl group-hover:bg-cyan-400/20 transition-all" />
            <LineChart className="w-8 h-8 text-cyan-400 mb-4" />
            <p className="text-sm text-muted-foreground font-semibold">Extracciones (Procesos)</p>
            <h2 className="text-4xl font-black mt-2">{metrics.totalExtractions}</h2>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-[-10%] w-24 h-24 bg-purple-400/10 rounded-full blur-2xl group-hover:bg-purple-400/20 transition-all" />
            <Download className="w-8 h-8 text-purple-400 mb-4" />
            <p className="text-sm text-muted-foreground font-semibold">Total Imágenes Iconos</p>
            <h2 className="text-4xl font-black mt-2">{metrics.totalImages}</h2>
          </div>
        </div>

        {/* Ajustes Reales (Skeleton/UI real) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          {/* Ajustes de Plataforma */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-bold">Ajustes de Plataforma</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border bg-card/50 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">Límites Plan Free</h4>
                  <p className="text-xs text-muted-foreground">Extracciones por día</p>
                </div>
                <input type="number" defaultValue={3} className="w-16 px-3 py-1.5 bg-muted rounded border border-border text-center text-sm font-medium" />
              </div>

              <div className="p-4 rounded-xl border border-border bg-card/50 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">Coste de Generación DALL-E</h4>
                  <p className="text-xs text-muted-foreground">Créditos de API por Sistema (Modo 2)</p>
                </div>
                <input type="number" defaultValue={0.02} step={0.01} className="w-20 px-3 py-1.5 bg-muted rounded border border-border text-center text-sm font-medium" />
              </div>

              <button className="w-full py-2.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-lg text-sm font-bold transition-all">
                Guardar Cambios de Plataforma
              </button>
            </div>
          </div>

          {/* Integraciones & Secretos */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <Server className="w-5 h-5 text-amber-500" />
              <h3 className="text-xl font-bold">API & Integraciones</h3>
            </div>
            
            <div className="space-y-4">
              <div className="relative group">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Railway Backend URL (Producción)</label>
                <div className="flex">
                  <input type="text" readOnly value="https://gridxd-python-api-production.up.railway.app" className="flex-1 px-3 py-2 bg-muted/80 rounded-l-lg border border-border text-xs text-foreground font-mono focus:outline-none" />
                  <button className="px-3 bg-border rounded-r-lg text-xs font-semibold hover:bg-muted-foreground/20">Test</button>
                </div>
              </div>

              <div className="relative group">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Stripe Webhook Secret</label>
                <input type="password" value="whsec_XXXXXXXXXXXXXXXXXXXXX" readOnly className="w-full px-3 py-2 bg-muted/80 rounded border border-border text-xs text-foreground font-mono focus:outline-none" />
              </div>

              <div className="relative group">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">OpenAI API Key (Modo 2)</label>
                <input type="password" placeholder="sk-..." className="w-full px-3 py-2 bg-muted/80 rounded border border-border text-xs text-foreground font-mono focus:outline-none" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
