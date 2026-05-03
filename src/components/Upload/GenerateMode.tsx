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
  setProjectName?: (name: string) => void;
}

export const GenerateMode = ({ onUpgrade, projectName, setProjectName }: GenerateModeProps) => {
  const { plan } = useAuth();
  const generator = useIconGenerator();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!projectName && setProjectName) {
      const defaultName = file.name.split('.').slice(0, -1).join('.') || file.name;
      setProjectName(defaultName.replace(/[^a-zA-Z0-9_-]/g, '_'));
    }
    generator.generateSystem(file, generator.activeStyle, generator.packSize);
  };

  return (
    <div className="relative glass-card rounded-[3rem] p-8 md:p-16 text-center overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-breath" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] pointer-events-none animate-pulse-glow" />
      
      {generator.state === "idle" && (
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 mb-8 animate-float">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          
          <h3 className="text-4xl font-black text-foreground mb-4 tracking-tight">
            AI Icon <span className="text-gradient-cyan">Generator</span>
          </h3>
          <p className="text-muted-foreground max-w-lg mx-auto mb-12 text-lg">
            Sube tu logotipo y nuestra IA extraerá su esencia visual para generar automáticamente un sistema de iconos coherente y profesional.
          </p>

          <div className="max-w-md mx-auto mb-12 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-3">
              <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">1. Tamaño del Pack</p>
              <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
                {([8, 24, 48] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => generator.setPackSize(size)}
                    title={`Pack de ${size} iconos`}
                    aria-pressed={generator.packSize === size}
                    className={`flex-1 py-3 text-xs rounded-xl font-black transition-all duration-300 ${
                      generator.packSize === size 
                        ? "bg-primary text-primary-foreground shadow-xl shadow-primary/30" 
                        : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] text-secondary font-black uppercase tracking-[0.2em]">2. Estilo Base</p>
              <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
                {(["outline", "filled", "duotone"] as SvgStyle[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => generator.setActiveStyle(v)}
                    title={`Estilo: ${STYLE_META[v].label}`}
                    aria-pressed={generator.activeStyle === v}
                    className={`flex-1 py-3 text-xs rounded-xl font-black capitalize transition-all duration-300 ${
                      generator.activeStyle === v 
                        ? "bg-secondary text-secondary-foreground shadow-xl shadow-secondary/30" 
                        : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    }`}
                  >
                    {v.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-md mx-auto mb-12">
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">3. Nombre del Proyecto (Opcional)</p>
              <input
                type="text"
                placeholder="Ej: MyBrand_Icons"
                value={projectName}
                onChange={(e) => setProjectName?.(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-3 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-foreground transition-all focus:bg-white/10 text-center placeholder:opacity-30"
              />
            </div>
          </div>

          <div className="max-w-lg mx-auto">
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mb-4">4. Referencia Visual</p>
            <label 
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
              className={`premium-dropzone group ${dragOver ? "premium-dropzone-active" : "premium-dropzone-idle border-white/10 bg-white/[0.02]"}`}
            >
              <input 
                ref={inputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                title="Seleccionar archivos"
                aria-label="Subir logo"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }} 
              />
              <div className="relative w-16 h-16 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-primary/40 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true" />
              </div>
              <p className="text-foreground font-black text-lg mb-1">Carga tu logotipo</p>
              <p className="text-muted-foreground text-xs font-medium">SVG, PNG o JPG aceptados</p>
              
              {/* Scanning effect line */}
              <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent top-0 animate-shine opacity-0 group-hover:opacity-100" />
            </label>
          </div>
        </div>
      )}

      {(generator.state === "analyzing" || generator.state === "generating") && (
        <div className="py-24 relative z-10">
          <div className="relative w-32 h-32 mx-auto mb-10">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse" />
            <div className="relative bg-card/80 backdrop-blur-xl border-2 border-primary/50 rounded-[2.5rem] w-full h-full flex items-center justify-center shadow-2xl">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
            
            {/* Scanning Ring */}
            <div className="absolute -inset-4 border border-primary/20 rounded-full animate-breath" />
          </div>
          
          <h3 className="text-3xl font-black text-foreground mb-4">
            {generator.state === "analyzing" ? "Analizando ADN Visual" : "Esculpiendo Iconos"}
          </h3>
          <div className="flex items-center justify-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <p className="text-muted-foreground font-bold text-sm tracking-wide uppercase">
              {generator.state === "analyzing" ? "Interpretando trazos y paleta" : "Generando variantes de sistema"}
            </p>
          </div>
        </div>
      )}

      {generator.state === "done" && generator.visualStyle && (
        <div className="relative z-10 text-left">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em] mb-2">Generación Completada</p>
              <h3 className="text-4xl font-black text-foreground">Sistema <span className="text-gradient-cyan">GridXD</span></h3>
            </div>
            <button 
              onClick={generator.reset}
              className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Nuevo Proyecto
            </button>
          </div>

          <StyleCard style={generator.visualStyle} className="mb-12" />

          <div className="mb-10 flex flex-col sm:flex-row sm:items-center gap-6 p-6 rounded-3xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground">Variantes de Estilo:</span>
            <div className="flex flex-wrap gap-3">
              {(["outline", "filled", "duotone"] as SvgStyle[]).map((s) => {
                const locked = !canAccessStyle(plan as any, s);
                const active = generator.activeStyle === s;
                return (
                  <button
                    key={s}
                    onClick={() => locked ? onUpgrade(s) : generator.setActiveStyle(s)}
                    title={locked ? "Requiere plan PRO" : STYLE_META[s].description}
                    aria-pressed={active}
                    className={`group relative flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-xs font-black transition-all duration-300 ${
                      locked
                        ? "border-white/5 text-muted-foreground opacity-40 cursor-not-allowed bg-transparent"
                        : active
                        ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10"
                        : "border-white/10 text-muted-foreground hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-base" aria-hidden>{STYLE_META[s].icon}</span>
                    {STYLE_META[s].label}
                    {locked && <Lock className="w-3 h-3 ml-1 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {generator.generatedIcons.map((icon) => {
              const primaryColor = generator.visualStyle?.color_primary || "currentColor";
              const strokeWidth = generator.visualStyle?.stroke_width || 2;
              const previewSvg = icon.svgContent
                ? applyStyleToSvg(icon.svgContent, generator.activeStyle, primaryColor)
                : null;
              
              return (
                <button 
                  key={icon.id}
                  className="group relative flex flex-col items-center gap-4 transition-all duration-500"
                  aria-label={`Vista previa del icono ${icon.name}`}
                  style={{ 
                    "--icon-color": primaryColor,
                    "--icon-stroke": String(strokeWidth)
                  } as React.CSSProperties}
                >
                  <div className="w-full aspect-square glass-panel rounded-[2.5rem] flex items-center justify-center relative overflow-hidden transition-all duration-500 group-hover:border-primary/40 group-hover:shadow-2xl group-hover:shadow-primary/20 group-hover:-translate-y-2 group-active:scale-95">
                    {/* Background Light */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {icon.svgContent && (
                      <div className="absolute top-4 right-4 px-2 py-0.5 bg-primary text-[6px] font-black text-primary-foreground rounded-full uppercase tracking-widest z-10 shadow-lg shadow-primary/20">
                        AI
                      </div>
                    )}
                    
                    <div className="relative w-16 h-16 flex items-center justify-center z-10">
                      {previewSvg ? (
                        <div 
                          className="w-full h-full transition-all duration-500 group-hover:scale-110 text-[var(--icon-color)]"
                          style={{ 
                            filter: "drop-shadow(0 0 8px var(--icon-color))" 
                          }}
                          dangerouslySetInnerHTML={{ __html: previewSvg }}
                          aria-hidden="true"
                        />
                      ) : (
                        <icon.icon 
                          className="w-full h-full transition-all duration-500 group-hover:scale-110 text-[var(--icon-color)]" 
                          strokeWidth={strokeWidth}
                        />
                      )}
                    </div>

                    {/* Glass Shine */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.03] to-white/[0.08] pointer-events-none" />
                  </div>
                  
                  <div className="text-center">
                    <span className="block text-[9px] font-black tracking-[0.25em] text-muted-foreground uppercase transition-colors group-hover:text-foreground">
                      {icon.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-16 p-8 rounded-[2.5rem] glass-panel border-primary/20 flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 text-center lg:text-left space-y-2">
              <h4 className="text-2xl font-black text-foreground tracking-tight">¿Listo para exportar?</h4>
              <p className="text-muted-foreground max-w-md">
                Estás exportando el pack <span className="text-primary font-black uppercase tracking-widest">{generator.activeStyle}</span> optimizado para desarrollo.
              </p>
              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Nombre del proyecto"
                  value={projectName}
                  onChange={(e) => setProjectName?.(e.target.value)}
                  className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm text-foreground transition-all focus:bg-white/10 placeholder:opacity-30"
                />
              </div>
            </div>
            
            <div className="relative z-10 flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              {plan === "proplus" && (
                <button 
                  onClick={() => (generator as any).downloadPack(projectName, generator.activeStyle, true)}
                  className="premium-button premium-button-outline"
                >
                  Pack Maestro (ZIP)
                </button>
              )}
              <button 
                onClick={() => generator.downloadPack(projectName, generator.activeStyle)}
                className="premium-button premium-button-primary px-12 group animate-shine"
              >
                <Download className="w-5 h-5 group-hover:animate-bounce" /> Descargar Sistema
              </button>
            </div>
          </div>
        </div>
      )}

      {generator.error && (
        <div className="py-24 relative z-10">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-destructive/20">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <h3 className="text-2xl font-black text-foreground mb-3 tracking-tight">Ups! No pudimos generar el sistema</h3>
          <p className="text-muted-foreground mb-10 max-w-sm mx-auto font-medium">{generator.error}</p>
          <button 
            onClick={generator.reset}
            className="premium-button premium-button-outline"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
};
