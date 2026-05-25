import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2, Download, Sparkles, Lock, Maximize2 } from "lucide-react";
import { SvgStyle, STYLE_META, canAccessStyle } from "@/lib/svgStyle";
import { useAuth } from "@/contexts/AuthContext";
import IconEditor from "@/components/IconEditor";
import { StyleCard } from "@/components/StyleCard";
import { IconPreviewModal } from "@/components/IconPreviewModal";
import { useImageProcessor, ExtractedIcon } from "@/hooks/useImageProcessor";
import { downloadSingleIcon } from "@/lib/zip-utils";

interface ExtractModeProps {
  processor: ReturnType<typeof useImageProcessor>;
  exportStyle: SvgStyle;
  setExportStyle: (s: SvgStyle) => void;
  onUpgrade: (s: SvgStyle) => void;
  onDownload: () => void;
}

export const ExtractMode = ({ processor, exportStyle, setExportStyle, onUpgrade, onDownload }: ExtractModeProps) => {
  const { plan } = useAuth();

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
  const [previewIcon, setPreviewIcon] = useState<ExtractedIcon | null>(null);

  const primaryColor = visualStyle?.color_primary || "#7c3aed";

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <p className="text-foreground font-semibold text-sm sm:text-base">
            {icons.length} activos detectados
            <span className="ml-2 text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">
              PNG HD + SVG
            </span>
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={reset}
              className="flex-1 sm:flex-none premium-button premium-button-outline !py-2 !px-4 text-sm flex items-center justify-center gap-2"
              title="Cargar otra imagen"
            >
              <X className="w-4 h-4" /> Nueva imagen
            </button>
            <button
              onClick={onDownload}
              className="flex-1 sm:flex-none premium-button premium-button-primary !py-2 !px-6 text-sm flex items-center justify-center gap-2 animate-shine"
              title="Descargar todos los activos en un ZIP"
            >
              <Download className="w-4 h-4" /> ZIP
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start mb-12">
          <div className="flex-1 w-full order-2 lg:order-1">
            {visualStyle && <StyleCard style={visualStyle} className="mb-6" />}

            <div className="relative rounded-2xl border border-white/10 overflow-hidden shadow-2xl glass-card">
              <div className="border-b border-white/5 bg-white/5 dark:bg-black/20 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <span className="ml-2 sm:ml-3 text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase opacity-70">Preview Assets</span>
                </div>
                <div className="flex items-center gap-1">
                  {(['grid', 'white', 'black', 'transparent'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setCanvasMode(mode)}
                      title={`Fondo: ${mode}`}
                      aria-label={`Cambiar a fondo ${mode}`}
                      className={`w-7 h-7 rounded-md text-sm font-bold transition-all ${canvasMode === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:bg-muted'}`}
                    >
                      {mode === 'grid' ? '⊞' : mode === 'white' ? '○' : mode === 'black' ? '●' : '◧'}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-4 sm:p-6 lg:p-10 w-full max-h-[700px] overflow-y-auto canvas-bg-${canvasMode} no-scrollbar`}>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
                  {icons.map((icon: ExtractedIcon) => (
                    <div
                      key={icon.id}
                      className="group relative flex flex-col items-center gap-2 sm:gap-3 transition-transform hover:scale-105 active:scale-95"
                    >
                      <button
                        onClick={() => setPreviewIcon(icon)}
                        className="relative w-full aspect-square bg-white/5 dark:bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-sm transition-all overflow-hidden hover:border-primary/30 hover:bg-primary/5"
                        title={icon.name}
                        aria-label={`Preview: ${icon.name}`}
                      >
                        {icon.name.includes("_GEN_") && (
                          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-primary/20 text-[7px] font-black text-primary rounded-[3px] uppercase tracking-wider z-20">
                            AI
                          </div>
                        )}
                        {icon.svgContent ? (
                          <div
                            className="w-full h-full p-4 sm:p-5 text-foreground transition-colors group-hover:text-primary"
                            dangerouslySetInnerHTML={{ __html: icon.svgContent }}
                            aria-hidden="true"
                          />
                        ) : (
                          <img
                            src={icon.dataUrl}
                            alt={icon.name}
                            className={`w-full h-full object-contain p-4 sm:p-5 transition-all ${!usedBackend ? "blur-[4px] opacity-40 scale-95" : "group-hover:scale-110"}`}
                          />
                        )}
                        {!usedBackend && !icon.svgContent && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[3px]">
                            <span title="Activo Bloqueado (Requiere suscripción)">
                              <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-primary drop-shadow-lg" />
                            </span>
                          </div>
                        )}

                        {/* Individual download overlay on hover */}
                        {icon.svgContent && (
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadSingleIcon(icon, exportStyle, primaryColor); }}
                            className="absolute bottom-1 right-1 w-7 h-7 rounded-lg bg-primary/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-primary shadow-lg z-20"
                            title="Descargar SVG"
                            aria-label={`Descargar ${icon.name}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </button>
                      <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground truncate w-full text-center group-hover:text-foreground transition-colors leading-tight">
                        {icon.name.replace('.png', '').replace('.svg', '')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <IconPreviewModal
          icon={previewIcon}
          onClose={() => setPreviewIcon(null)}
          activeStyle={exportStyle}
          visualStyle={visualStyle}
        />
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
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hidden sm:inline">
          Cloud Run API: Online
        </span>
      </div>

      <div className="mb-16 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 relative">
        <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 blur-3xl opacity-50 -z-10" />

        <div className="lg:col-span-4 flex flex-col gap-6 glass-card p-6 sm:p-8 lg:p-10 rounded-[2rem] lg:rounded-[2.5rem] border-white/20 shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <label htmlFor="project-name-input" className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground">
                Proyecto
              </label>
            </div>
            <input
              id="project-name-input"
              type="text"
              placeholder="Ej: Dashboard_Icons"
              value={options.projectName}
              onChange={(e) => options.setProjectName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 sm:p-5 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-primary outline-none font-black text-foreground transition-all focus:bg-white/10 text-base sm:text-lg placeholder:opacity-30"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-6 bg-primary rounded-full opacity-50" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground">IA Engine</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => options.setRemoveBackground(!options.removeBackground)}
                className={`flex flex-col items-center justify-center gap-3 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all duration-500 ${options.removeBackground ? "bg-primary/20 border-primary text-primary shadow-2xl shadow-primary/20 scale-105" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"}`}
              >
                <Sparkles className={`w-5 h-5 sm:w-6 sm:h-6 ${options.removeBackground ? "animate-pulse" : ""}`} />
                <span className="text-[9px] font-black uppercase tracking-widest text-center">Sin Fondo</span>
              </button>
              <button
                onClick={() => options.setUpscale(!options.upscale)}
                className={`flex flex-col items-center justify-center gap-3 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all duration-500 ${options.upscale ? "bg-primary/20 border-primary text-primary shadow-2xl shadow-primary/20 scale-105" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"}`}
              >
                <Maximize2 className={`w-5 h-5 sm:w-6 sm:h-6 ${options.upscale ? "animate-pulse" : ""}`} />
                <span className="text-[9px] font-black uppercase tracking-widest text-center">Ultra 2K</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6 glass-card p-6 sm:p-8 lg:p-10 rounded-[2rem] lg:rounded-[2.5rem] border-white/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
            <div className="w-40 h-40 bg-primary rounded-full blur-[80px]" />
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <span className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground">Motor de Exportación SVG</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg">{plan} access</span>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-6 h-full">
            {(["outline", "filled", "duotone"] as SvgStyle[]).map((s) => {
              const locked = !canAccessStyle(plan as "free" | "pro" | "proplus", s);
              const active = exportStyle === s;
              return (
                <button
                  key={s}
                  onClick={() => locked ? onUpgrade(s) : setExportStyle(s)}
                  className={`relative group flex flex-col items-center justify-center gap-3 sm:gap-5 p-4 sm:p-6 lg:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-2 transition-all duration-700 ${
                    locked
                      ? "bg-black/40 border-white/5 opacity-40 grayscale cursor-not-allowed"
                      : active
                        ? "border-primary bg-primary/10 shadow-2xl shadow-primary/20 scale-[1.02]"
                        : "bg-white/5 border-white/10 hover:border-primary/40 hover:bg-white/10"
                  }`}
                >
                  <span className={`text-3xl sm:text-4xl lg:text-6xl transition-all duration-700 ${active && !locked ? "drop-shadow-[0_0_25px_hsl(var(--cyan))] scale-110" : "group-hover:scale-110 group-hover:rotate-3"}`}>
                    {STYLE_META[s].icon}
                  </span>
                  <div className="text-center">
                    <span className={`block text-xs font-black uppercase tracking-[0.2em] mb-1 ${active && !locked ? "text-primary" : "text-foreground"}`}>
                      {STYLE_META[s].label}
                    </span>
                    <span className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest hidden sm:block">{STYLE_META[s].description.split(' ')[0]} mode</span>
                  </div>
                  {locked && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center justify-center gap-2">
                      <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-white/50" />
                      <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">Pro Only</span>
                    </div>
                  )}
                  {active && !locked && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 sm:w-12 h-1 bg-primary rounded-full shadow-[0_0_15px_hsl(var(--primary))]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const files = Array.from(e.dataTransfer.files); if (files.length > 0) processImages(files); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        tabIndex={0}
        className={`relative block w-full cursor-pointer rounded-[1.5rem] sm:rounded-[2rem] border-2 border-dashed p-6 sm:p-10 text-center transition-all duration-500 group overflow-hidden ${
          dragOver
            ? "border-primary bg-primary/10"
            : "border-white/10 bg-white/5 hover:border-primary/20"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          title="Seleccionar archivos"
          aria-label="Subir imágenes"
          onChange={(e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            if (files.length > 0) processImages(files);
            e.target.value = '';
          }}
        />
        <div className="relative z-10 flex items-center justify-center gap-4">
          <Upload className={`w-5 h-5 sm:w-6 sm:h-6 ${dragOver ? "text-primary animate-bounce" : "text-muted-foreground group-hover:text-primary transition-colors"}`} aria-hidden="true" />
          <p className="text-foreground font-bold tracking-tight text-sm sm:text-base">Haz clic o arrastra más archivos para procesar en lote</p>
        </div>
      </label>
    </>
  );
};
