import { useState, useRef } from "react";
import { Upload, X, Loader2, Sparkles, Lock, AlertTriangle, Download } from "lucide-react";
import { useIconGenerator } from "@/hooks/useIconGenerator";
import { StyleCard } from "@/components/StyleCard";
import { SvgStyle, STYLE_META, canAccessStyle } from "@/lib/svgStyle";
import { applyStyleToSvg } from "@/lib/svgStyle";
import { useAuth } from "@/contexts/AuthContext";

interface GenerateModeProps {
  onUpgrade: (style: SvgStyle) => void;
  projectName: string;
}

export const GenerateMode = ({ onUpgrade, projectName }: GenerateModeProps) => {
  const { tier } = useAuth();
  const generator = useIconGenerator();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-card border border-primary/20 rounded-2xl p-6 md:p-10 text-center shadow-lg relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
      
      {generator.state === "idle" && (
        <div className="relative z-10">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <h3 className="text-2xl font-bold text-foreground mb-3">
            Generador de Sistema de Iconos
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Sube tu logotipo y nuestra IA extraerá el "ADN Visual". Generaremos automáticamente 24 iconos clave que toda app necesita.
          </p>

          <div className="max-w-xs mx-auto mb-8 space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">1. Tamaño del Pack</p>
              <div className="grid grid-cols-3 gap-2 p-1 bg-muted/50 rounded-xl border border-border/50">
                {([8, 24, 48] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => generator.setPackSize(size)}
                    className={`px-3 py-2 text-[11px] rounded-lg font-bold transition-all ${
                      generator.packSize === size 
                        ? "bg-background text-primary shadow-sm border border-border" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {size} Icons
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">2. Estilo Base</p>
              <div className="grid grid-cols-3 gap-2 p-1 bg-muted/50 rounded-xl border border-border/50">
                {(["outline", "filled", "duotone"] as SvgStyle[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => generator.setActiveStyle(v)}
                    className={`px-3 py-2 text-[11px] rounded-lg font-bold capitalize transition-all ${
                      generator.activeStyle === v 
                        ? "bg-background text-primary shadow-sm border border-border" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-4">3. Sube tu referencia visual</p>
          <div 
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) generator.generateSystem(file, generator.activeStyle, generator.packSize);
            }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 transition-all cursor-pointer ${
              dragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            <input 
              ref={inputRef}
              type="file" 
              accept="image/*" 
              title="Subir logotipo"
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) generator.generateSystem(file, generator.activeStyle, generator.packSize);
              }} 
            />
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Sube tu logo para extraer el ADN</p>
            <p className="text-xs text-muted-foreground mt-1">SVG, PNG o JPG</p>
          </div>
        </div>
      )}

      {(generator.state === "analyzing" || generator.state === "generating") && (
        <div className="py-20 relative z-10">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div className="relative bg-card border border-primary/50 rounded-full w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            {generator.state === "analyzing" ? "Analizando ADN Visual..." : "Generando Iconos del Sistema..."}
          </h3>
          <p className="text-sm text-muted-foreground animate-pulse">
            Gemini Vision está interpretando tus trazos y colores
          </p>
        </div>
      )}

      {generator.state === "done" && generator.visualStyle && (
        <div className="relative z-10 text-left">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-foreground">Sistema Generado</h3>
            <button 
              onClick={generator.reset}
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Reiniciar
            </button>
          </div>

          <StyleCard style={generator.visualStyle} className="mb-8" />

          <div className="mb-6 flex items-center gap-4">
            <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground shrink-0">Preview Estilo:</span>
            <div className="flex gap-2">
              {(["outline", "filled", "duotone"] as SvgStyle[]).map((s) => {
                const locked = !canAccessStyle(tier as "free" | "pro" | "proplus", s);
                const active = generator.activeStyle === s;
                return (
                  <button
                    key={s}
                    onClick={() => locked ? onUpgrade(s) : generator.setActiveStyle(s)}
                    title={locked ? "Requiere plan PRO" : STYLE_META[s].description}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      locked
                        ? "border-border text-muted-foreground opacity-50 cursor-not-allowed"
                        : active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 cursor-pointer"
                    }`}
                  >
                    <span aria-hidden>{STYLE_META[s].icon}</span>
                    {STYLE_META[s].label}
                    {locked && <Lock className="w-2.5 h-2.5 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {generator.generatedIcons.map((icon) => {
              const primaryColor = generator.visualStyle?.color_primary || "currentColor";
              const previewSvg = icon.svgContent
                ? applyStyleToSvg(icon.svgContent, generator.activeStyle, primaryColor)
                : null;
              return (
                <div 
                  key={icon.id}
                  className="group bg-muted/30 border border-border/50 p-6 rounded-xl flex flex-col items-center justify-center gap-3 transition-all hover:border-primary/30 hover:bg-primary/5 relative"
                >
                  {icon.svgContent && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-primary/20 text-[8px] font-bold text-primary rounded uppercase tracking-wider">
                      AI
                    </div>
                  )}
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    {previewSvg ? (
                      <div 
                        className="w-full h-full transition-transform group-hover:scale-110"
                        ref={(el) => { if (el) el.style.color = `${primaryColor}`; }}
                        dangerouslySetInnerHTML={{ __html: previewSvg }}
                      />
                    ) : (
                      <icon.icon 
                        className="w-full h-full transition-transform group-hover:scale-110" 
                        ref={(el: SVGSVGElement | HTMLElement | null) => { 
                          if (el && el.style) {
                            el.style.color = `${primaryColor}`;
                            el.style.strokeWidth = `${generator.visualStyle?.stroke_width || 2}`;
                          }
                        }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{icon.name}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-10 p-6 rounded-xl bg-primary/5 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="font-bold text-foreground">¿Listo para exportar?</h4>
              <p className="text-sm text-muted-foreground">
                Exportando en estilo <span className="text-primary font-bold uppercase">{generator.activeStyle}</span> — {STYLE_META[generator.activeStyle].description}
              </p>
              {tier === "proplus" && (
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">
                   ✨ PRO+ BENEFIT: Puedes exportar todos los estilos en un ZIP
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {tier === "proplus" && (
                <button 
                  onClick={() => generator.downloadPack(projectName, generator.activeStyle, true)}
                  className="px-6 py-3 border border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-all flex items-center gap-2"
                >
                  Pack Completo (3 estilos)
                </button>
              )}
              <button 
                onClick={() => generator.downloadPack(projectName, generator.activeStyle)}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2 glow-cyan"
              >
                <Download className="w-5 h-5" /> Descargar {generator.activeStyle}
              </button>
            </div>
          </div>
        </div>
      )}

      {generator.error && (
        <div className="py-20 relative z-10">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">Ops! Algo salió mal</h3>
          <p className="text-sm text-muted-foreground mb-6">{generator.error}</p>
          <button 
            onClick={generator.reset}
            className="px-6 py-2 bg-muted rounded-lg font-bold hover:bg-muted/80 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
};
