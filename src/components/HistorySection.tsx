import { useState } from "react";
import { Trash2, Clock, Cpu, Monitor, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { useProcessingHistory } from "@/hooks/useProcessingHistory";
import { useAuth } from "@/contexts/AuthContext";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RelativeTime({ iso }: { iso: string }) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return <span>Ahora mismo</span>;
  if (mins < 60) return <span>Hace {mins}m</span>;
  if (hours < 24) return <span>Hace {hours}h</span>;
  return <span>Hace {days}d</span>;
}

const HistorySection = () => {
  const { user } = useAuth();
  const { history, loading, tableReady, deleteEntry } = useProcessingHistory();
  const [expanded, setExpanded] = useState(true);

  // Don't render if not logged in or table isn't ready
  if (!user) return null;

  return (
    <section id="history" className="py-12 px-4 border-t border-border/30">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between mb-6 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-foreground">Historial de Procesamiento</h3>
              <p className="text-xs text-muted-foreground">
                {loading
                  ? "Cargando..."
                  : tableReady === false
                  ? "Tabla pendiente de configurar"
                  : `${history.length} sesión${history.length !== 1 ? "es" : ""} guardada${history.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <div className="text-muted-foreground group-hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {expanded && (
          <>
            {/* Table not ready notice */}
            {tableReady === false && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Tabla de historial pendiente</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ejecuta la migración SQL en{" "}
                    <a
                      href="https://supabase.com/dashboard/project/ptwtioobecgrmlwqwbpf/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Supabase SQL Editor
                    </a>{" "}
                    para activar esta función. El archivo está en{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      supabase/migrations/20260413_processing_history.sql
                    </code>
                  </p>
                </div>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/50 bg-card p-4 animate-pulse"
                  >
                    <div className="flex gap-3">
                      <div className="w-14 h-14 rounded-lg bg-muted shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 bg-muted rounded w-2/3" />
                        <div className="h-2.5 bg-muted rounded w-1/2" />
                        <div className="h-2.5 bg-muted rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* History grid */}
            {!loading && tableReady && history.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="group relative rounded-xl border border-border/50 bg-card hover:border-primary/20 hover:bg-card/80 transition-all duration-200 p-4"
                  >
                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-lg overflow-hidden border border-border/30 bg-muted/30 shrink-0 flex items-center justify-center">
                        {entry.thumbnail ? (
                          <img
                            src={entry.thumbnail}
                            alt={entry.project_name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-2xl">🖼️</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {entry.project_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {entry.icon_count} icono{entry.icon_count !== 1 ? "s" : ""}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              entry.resolution === "2K"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {entry.resolution}
                          </span>
                          {entry.used_backend ? (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500">
                              <Cpu className="w-2.5 h-2.5" />
                              Railway
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                              <Monitor className="w-2.5 h-2.5" />
                              Local
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Date footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                      <span
                        className="text-[11px] text-muted-foreground"
                        title={formatDate(entry.created_at)}
                      >
                        <RelativeTime iso={entry.created_at} />
                      </span>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-500/10 text-red-400"
                        title="Eliminar del historial"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && tableReady && history.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/50 p-10 text-center">
                <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-semibold text-muted-foreground">Sin historial aún</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Procesa tu primera imagen para verla aquí
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default HistorySection;
