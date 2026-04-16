import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2, Download, Sparkles, Lock, Maximize2 } from "lucide-react";
import { isBackendConfigured } from "@/lib/api";
import { SvgStyle, STYLE_META, canAccessStyle } from "@/lib/svgStyle";
import { useAuth } from "@/contexts/AuthContext";
import IconEditor from "@/components/IconEditor";
import { StyleCard } from "@/components/StyleCard";
import { SidebarIconGenerator } from "@/components/SidebarIconGenerator";

interface ExtractModeProps {
  processor: any; // useImageProcessor return type
  exportStyle: SvgStyle;
  setExportStyle: (s: SvgStyle) => void;
  onUpgrade: (s: SvgStyle) => void;
  onDownload: () => void;
}

const canvasBgStyles: Record<string, React.CSSProperties> = {
  grid: {
    backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(150,150,150,0.15) 1px, transparent 0)',
    backgroundSize: '24px 24px',
  },
  white: { background: '#ffffff' },
  black: { background: '#000000' },
  transparent: {
    backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
  },
};

export const ExtractMode = ({ processor, exportStyle, setExportStyle, onUpgrade, onDownload }: ExtractModeProps) => {
  const { tier } = useAuth();
  const [canvasMode, setCanvasMode] = useState<'grid' | 'white' | 'black' | 'transparent'>('grid');
  const [dragOver, setDragOver] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>(
    isBackendConfigured() ? 'checking' : 'offline'
  );

  useEffect(() => {
    if (isBackendConfigured()) {
      import("@/lib/api").then(({ checkBackendHealth }) => {
        checkBackendHealth().then(isOnline => {
          setBackendStatus(isOnline ? 'online' : 'offline');
        });
      });
    }
  }, []);

  if (state === "editing" && pendingImgEl) {
    return (
      <IconEditor
        imgEl={pendingImgEl}
        initialRegions={detectedRegions}
        onConfirm={confirmRegions}
        onCancel={reset}
      />
    );
  }

  if (state !== "idle" && state !== "done") {
    return (
      <div className="text-center py-16">
        {preview && (
          <div className="mb-8 inline-block rounded-lg overflow-hidden border border-border max-w-xs">
            <img src={preview} alt="Preview" className="w-full h-auto" />
          </div>
        )}
        <div className="flex items-center justify-center gap-3 text-primary">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg font-semibold">Procesando...</span>
        </div>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-foreground font-semibold">
            {icons.length} activos detectados
            <span className="ml-2 text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">
              PNG HD + SVG
            </span>
          </p>
          <div className="flex gap-3">
            <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 transition-colors">
              <X className="w-4 h-4" /> Nueva imagen
            </button>
            <button onClick={onDownload} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:scale-105 transition-all glow-cyan">
              <Download className="w-4 h-4" /> Descargar ZIP
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start mb-12">
          <div className="flex-1 w-full order-2 lg:order-1">
            {visualStyle && <StyleCard style={visualStyle} className="mb-6" />}

            <div className="relative rounded-2xl border border-border/50 overflow-hidden shadow-2xl">
              <div className="border-b border-border/50 bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                  <span className="ml-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Preview Assets</span>
                </div>
                <div className="flex items-center gap-1">
                  {(['grid', 'white', 'black', 'transparent'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setCanvasMode(mode)}
                      className={`w-7 h-7 rounded-md text-sm font-bold transition-all ${canvasMode === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:bg-muted'}`}
                    >
                      {mode === 'grid' ? '⊞' : mode === 'white' ? '○' : mode === 'black' ? '●' : '◧'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-8 pb-12 w-full max-h-[600px] overflow-y-auto" style={canvasBgStyles[canvasMode]}>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-6 max-w-5xl mx-auto">
                  {icons.map((icon: any) => (
                    <div key={icon.id} className="group relative flex flex-col items-center gap-3">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white dark:bg-[#0A0A0A] rounded-xl flex items-center justify-center border border-border/30 shadow-sm transition-all overflow-hidden relative hover-glow-premium">
                        {icon.name.includes("_GEN_") && <div className="absolute top-1 right-1 px-1 py-0.5 bg-primary/20 text-[6px] font-black text-primary rounded-[2px] uppercase tracking-wider z-20">AI</div>}
                        {icon.svgContent ? (
                          <div className="w-full h-full p-4 text-foreground" dangerouslySetInnerHTML={{ __html: icon.svgContent }} />
                        ) : (
                          <img src={icon.dataUrl} alt={icon.name} className={`w-full h-full object-contain p-4 ${!usedBackend ? "blur-[4px] scale-105" : ""}`} />
                        )}
                        {!usedBackend && !icon.svgContent && <div className="absolute inset-0 flex items-center justify-center bg-background/5 backdrop-blur-[2px]"><Lock className="w-5 h-5 text-primary" /></div>}
                      </div>
                      <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground truncate w-full text-center">{icon.name.replace('.png', '').replace('.svg', '')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {visualStyle && (
            <div className="order-1 lg:order-2">
              <SidebarIconGenerator visualStyle={visualStyle} onIconGenerated={(svg, name) => injectGeneratedIcon(svg, name)} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-end gap-2 px-2">
        <div className="flex items-center gap-1.5 mr-auto">
          <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">2K UHD</span>
          <span className="bg-green-500/10 text-green-500 text-[10px] px-2 py-0.5 rounded-full font-bold">SVG VECTOR</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? "bg-green-500 animate-pulse" : backendStatus === 'checking' ? "bg-amber-400 animate-bounce" : "bg-red-500"}`} />
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
          {backendStatus === 'online' ? "Railway API: Online" : backendStatus === 'checking' ? "Railway API: Connecting..." : "Railway API: Offline (Client Fallback)"}
        </span>
      </div>

      <div className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-6 bg-card border border-border p-8 rounded-2xl shadow-sm">
        <div className="flex flex-col gap-3">
          <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">Nombre Proyecto</label>
          <input
            type="text"
            placeholder="Ej: Dashboard_Icons"
            value={options.projectName}
            onChange={(e) => options.setProjectName(e.target.value)}
            className="w-full bg-muted border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-foreground"
          />
          <div className="grid grid-cols-3 gap-2 mt-1">
            <button onClick={() => options.setRemoveBackground(!options.removeBackground)} className={`flex items-center justify-center p-3 rounded-xl border transition-all ${options.removeBackground ? "bg-primary/20 border-primary text-primary" : "bg-muted border-border text-muted-foreground"}`}><Sparkles className="w-5 h-5" /></button>
            <button onClick={() => options.setUpscale(!options.upscale)} className={`flex items-center justify-center p-3 rounded-xl border transition-all ${options.upscale ? "bg-primary/20 border-primary text-primary" : "bg-muted border-border text-muted-foreground"}`}><Maximize2 className="w-5 h-5" /></button>
            <button onClick={() => {}} className="bg-muted border-border text-muted-foreground flex items-center justify-center p-3 rounded-xl border opacity-50"><Download className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Estilo Exportación</span>
            <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">{tier.toUpperCase()}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(["outline", "filled", "duotone"] as SvgStyle[]).map((s) => {
              const locked = !canAccessStyle(tier as any, s);
              const active = exportStyle === s;
              return (
                <button
                  key={s}
                  onClick={() => locked ? onUpgrade(s) : setExportStyle(s)}
                  className={`relative flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 transition-all ${locked ? "bg-muted/30 opacity-60" : active ? "border-primary bg-primary/10" : "bg-muted/30 hover:border-primary/40"}`}
                >
                  <span className="text-3xl">{STYLE_META[s].icon}</span>
                  <span className={`text-xs font-black uppercase ${active && !locked ? "text-primary" : "text-foreground"}`}>{STYLE_META[s].label}</span>
                  {locked && <Lock className="absolute top-2 right-2 w-3 h-3 text-muted-foreground" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const files = Array.from(e.dataTransfer.files); if (files.length > 0) processImages(files); }}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-16 text-center transition-all duration-300 ${dragOver ? "border-primary bg-primary/5 glow-cyan" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const files = e.target.files ? Array.from(e.target.files) : []; if (files.length > 0) processImages(files); }} />
        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-foreground font-semibold text-lg mb-2">Arrastra tus mockups aquí</p>
        <p className="text-muted-foreground text-sm">Detección automática en lote activada</p>
      </div>
    </>
  );
};
