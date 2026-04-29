import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2, Download, Sparkles, Lock, Maximize2 } from "lucide-react";
import { isBackendConfigured } from "@/lib/api";
import { SvgStyle, STYLE_META, canAccessStyle } from "@/lib/svgStyle";
import { useAuth } from "@/contexts/AuthContext";
import IconEditor from "@/components/IconEditor";
import { StyleCard } from "@/components/StyleCard";
import { SidebarIconGenerator } from "@/components/SidebarIconGenerator";
import { useImageProcessor, ExtractedIcon } from "@/hooks/useImageProcessor";
import { UserTier } from "@/lib/api";

interface ExtractModeProps {
  processor: ReturnType<typeof useImageProcessor>;
  exportStyle: SvgStyle;
  setExportStyle: (s: SvgStyle) => void;
  onUpgrade: (s: SvgStyle) => void;
  onDownload: () => void;
}



export const ExtractMode = ({ processor, exportStyle, setExportStyle, onUpgrade, onDownload }: ExtractModeProps) => {
  const { tier } = useAuth();
  
  const {
    state,
    preview,
    icons,
    usedBackend,
    visualStyle,
    processImages,
    reset,
    injectGeneratedIcon,
    detectedRegions,
    confirmRegions,
    pendingImgEl,
    options
  } = processor;

  const inputRef = useRef<HTMLInputElement>(null);
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <p className="text-foreground font-semibold text-sm sm:text-base">
            {icons.length} activos detectados
            <span className="ml-2 text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">
              PNG HD + SVG
            </span>
          </p>
          <div className="flex gap-2 sm:gap-3">
            <button onClick={reset} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-muted text-foreground text-xs sm:text-sm font-semibold hover:bg-muted/80 transition-colors">
              <X className="w-4 h-4" /> <span className="hidden sm:inline">Nueva imagen</span>
            </button>
            <button onClick={onDownload} className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:scale-105 transition-all glow-cyan">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Descargar ZIP</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 items-start mb-8 lg:mb-12">
          <div className="flex-1 w-full order-2 lg:order-1">
            {visualStyle && <StyleCard style={visualStyle} className="mb-4 lg:mb-6" />}

            <div className="relative rounded-2xl border border-border/50 overflow-hidden shadow-2xl">
              <div className="border-b border-border/50 bg-white/80 dark:bg-black/80 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400/80" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400/80" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400/80" />
                  <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase hidden sm:inline">Preview Assets</span>
                </div>
                <div className="flex items-center gap-1">
                  {(['grid', 'white', 'black', 'transparent'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setCanvasMode(mode)}
                      className={`w-6 sm:w-7 h-6 sm:h-7 rounded-md text-[10px] sm:text-sm font-bold transition-all ${canvasMode === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:bg-muted'}`}
                    >
                      {mode === 'grid' ? '⊞' : mode === 'white' ? '○' : mode === 'black' ? '●' : '◧'}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-4 sm:p-6 lg:p-8 w-full max-h-[500px] sm:max-h-[600px] overflow-y-auto canvas-mode-${canvasMode}`} data-canvas-mode={canvasMode}>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-6 max-w-5xl mx-auto">
                  {icons.map((icon: ExtractedIcon) => (
                    <div key={icon.id} className="group relative flex flex-col items-center gap-2 sm:gap-3">
                      <div className="w-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-white dark:bg-[#0A0A0A] rounded-xl flex items-center justify-center border border-border/30 shadow-sm transition-all overflow-hidden relative hover-glow-premium">
                        {icon.name.includes("_GEN_") && <div className="absolute top-0.5 right-0.5 px-1 py-0.5 bg-primary/20 text-[5px] sm:text-[6px] font-black text-primary rounded-[2px] uppercase tracking-wider z-20">AI</div>}
                        {icon.svgContent ? (
                          <div className="w-full h-full p-2 sm:p-3 lg:p-4 text-foreground" dangerouslySetInnerHTML={{ __html: icon.svgContent }} />
                        ) : (
                          <img src={icon.dataUrl} alt={icon.name} className={`w-full h-full object-contain p-2 sm:p-3 lg:p-4 ${!usedBackend ? "blur-[4px] scale-105" : ""}`} />
                        )}
                        {!usedBackend && !icon.svgContent && <div className="absolute inset-0 flex items-center justify-center bg-background/5 backdrop-blur-[2px]"><Lock className="w-4 sm:w-5 h-4 sm:h-5 text-primary" /></div>}
                      </div>
                      <p className="text-[8px] sm:text-[9px] lg:text-[10px] font-medium text-muted-foreground truncate w-full text-center">{icon.name.replace('.png', '').replace('.svg', '')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {visualStyle && (
            <div className="order-1 lg:order-2 w-full lg:w-auto">
              <SidebarIconGenerator visualStyle={visualStyle} onIconGenerated={(svg, name) => injectGeneratedIcon(svg, name)} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-2 px-1 sm:px-2">
        <div className="flex items-center gap-1.5 order-2 sm:order-1">
          <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">2K UHD</span>
          <span className="bg-green-500/10 text-green-500 text-[10px] px-2 py-0.5 rounded-full font-bold hidden sm:inline">SVG VECTOR</span>
        </div>
        <div className="flex items-center gap-1.5 order-1 sm:order-2">
          <div className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? "bg-green-500 animate-pulse" : backendStatus === 'checking' ? "bg-amber-400 animate-bounce" : "bg-red-500"}`} />
          <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            {backendStatus === 'online' ? "Online" : backendStatus === 'checking' ? "Connecting..." : "Offline"}
          </span>
        </div>
      </div>

      <div className="mb-8 sm:mb-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 bg-card border border-border p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm">
        <div className="flex flex-col gap-2 sm:gap-3">
          <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">Nombre Proyecto</label>
          <input
            type="text"
            placeholder="Ej: Dashboard_Icons"
            value={options.projectName}
            onChange={(e) => options.setProjectName(e.target.value)}
            className="w-full bg-muted border border-border p-2 sm:p-3 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-foreground text-sm"
          />
          <div className="grid grid-cols-3 gap-2 mt-1">
            <button title="Remove background" onClick={() => options.setRemoveBackground(!options.removeBackground)} className={`flex items-center justify-center p-2 sm:p-3 rounded-xl border transition-all ${options.removeBackground ? "bg-primary/20 border-primary text-primary" : "bg-muted border-border text-muted-foreground"}`}><Sparkles className="w-4 sm:w-5 h-4 sm:h-5" /></button>
            <button title="Upscale resolution" onClick={() => options.setUpscale(!options.upscale)} className={`flex items-center justify-center p-2 sm:p-3 rounded-xl border transition-all ${options.upscale ? "bg-primary/20 border-primary text-primary" : "bg-muted border-border text-muted-foreground"}`}><Maximize2 className="w-4 sm:w-5 h-4 sm:h-5" /></button>
            <button title="Download options" onClick={() => {}} className="bg-muted border-border text-muted-foreground flex items-center justify-center p-2 sm:p-3 rounded-xl border opacity-50"><Download className="w-4 sm:w-5 h-4 sm:h-5" /></button>
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Estilo Exportación</span>
            <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">{tier.toUpperCase()}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {(["outline", "filled", "duotone"] as SvgStyle[]).map((s) => {
              const locked = !canAccessStyle(tier as UserTier["tier"], s);
              const active = exportStyle === s;
              return (
                <button
                  key={s}
                  onClick={() => locked ? onUpgrade(s) : setExportStyle(s)}
                  className={`relative flex flex-col items-center justify-center gap-1 sm:gap-2 p-3 sm:p-4 lg:p-5 rounded-xl border-2 transition-all ${locked ? "bg-muted/30 opacity-60" : active ? "border-primary bg-primary/10" : "bg-muted/30 hover:border-primary/40"}`}
                >
                  <span className="text-2xl sm:text-3xl">{STYLE_META[s].icon}</span>
                  <span className={`text-[10px] sm:text-xs font-black uppercase ${active && !locked ? "text-primary" : "text-foreground"}`}>{STYLE_META[s].label}</span>
                  {locked && <Lock className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 w-3 h-3 text-muted-foreground" />}
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
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 sm:p-12 lg:p-16 text-center transition-all duration-300 ${dragOver ? "border-primary bg-primary/5 glow-cyan" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple title="Upload images" className="hidden" onChange={(e) => { const files = e.target.files ? Array.from(e.target.files) : []; if (files.length > 0) processImages(files); }} />
        <Upload className="w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
        <p className="text-foreground font-semibold text-base sm:text-lg mb-1 sm:mb-2">Arrastra tus mockups aquí</p>
        <p className="text-muted-foreground text-xs sm:text-sm">Detección automática en lote activada</p>
      </div>
    </>
  );
};
