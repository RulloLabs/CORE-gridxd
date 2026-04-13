import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, Loader2, Download, Sparkles, Lock } from "lucide-react";
import { useImageProcessor, statusMessages } from "@/hooks/useImageProcessor";
import { isBackendAvailable } from "@/lib/api";
import IconEditor from "@/components/IconEditor";
import { useProcessingHistory } from "@/hooks/useProcessingHistory";

type CanvasMode = "grid" | "white" | "black" | "transparent";

const canvasBgStyles: Record<CanvasMode, React.CSSProperties> = {
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

// Compress a dataUrl PNG to a smaller size using canvas scaling
async function compressIcon(dataUrl: string, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Scale down to 1024 max for ZIP (keep 2K only as source)
      const MAX = 1024;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

const UploadSection = () => {
  const { state, preview, icons, error, usedBackend, processImage, reset, options, detectedRegions, confirmRegions, pendingImgEl } = useImageProcessor();
  const { saveToHistory } = useProcessingHistory();
  const [dragOver, setDragOver] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('grid');
  const [compressZip, setCompressZip] = useState(false);
  const [activeMode, setActiveMode] = useState<"extract" | "generate">("extract");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-rename when project name changes
  useEffect(() => {
    options.updateIconNames();
  }, [options.projectName, options.upscale]);

  // Auto-save to Supabase history when processing completes
  useEffect(() => {
    if (state === "done" && icons.length > 0) {
      saveToHistory({
        project_name: options.projectName || "Sin nombre",
        icon_count: icons.length,
        resolution: options.upscale ? "2K" : "HD",
        used_backend: usedBackend,
        firstIconDataUrl: icons[0]?.dataUrl,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const handleDownloadZip = async () => {
    // Show upsell for free users before download
    if (!usedBackend && !showUpsell) {
      setShowUpsell(true);
      return;
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const icon of icons) {
      // Optionally compress PNG before adding to ZIP
      const pngDataUrl = compressZip
        ? await compressIcon(icon.dataUrl)
        : icon.dataUrl;
      const base64 = pngDataUrl.split(",")[1];
      zip.file(icon.name, base64, { base64: true });
      
      // Add SVG
      if (icon.svgContent) {
        const svgName = icon.name.replace(".png", ".svg");
        zip.file(svgName, icon.svgContent);
      }
    }

    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${options.projectName || "gridxd"}-assets-hd.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setShowUpsell(false);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processImage(file);
    },
    [processImage]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleReset = () => {
    reset();
    setShowUpsell(false);
  };

  return (
    <section id="upload" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Crea tu Design System
        </h2>
        <p className="text-muted-foreground text-center mb-8 max-w-lg mx-auto">
          Extrae iconos listos para producción desde mockups o genera un pack completo desde cero basándote en tu logo.
        </p>

        {/* MODO SELECTOR UI */}
        <div className="flex justify-center mb-10">
          <div className="bg-muted/50 p-1 rounded-xl flex items-center gap-1 border border-border">
            <button
              onClick={() => setActiveMode("extract")}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeMode === "extract"
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ✂️ Modo Extraer
            </button>
            <button
              onClick={() => setActiveMode("generate")}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeMode === "generate"
                  ? "bg-primary text-primary-foreground shadow-sm glow-cyan"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ✨ Modo Crear Sistema
            </button>
          </div>
        </div>

        {activeMode === "generate" ? (
          <div className="bg-card border border-primary/20 rounded-2xl p-10 text-center shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-3">
                Generador de Sistema de Iconos
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                Sube tu logotipo y nuestra IA extraerá el "ADN Visual". Generaremos automáticamente los 24 iconos clave que toda app necesita (Navegación, Usuario, Sistema, etc.) usando el estilo exacto de tu marca.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto mb-8 text-left opacity-70">
                <div className="bg-muted p-3 rounded-lg text-xs font-mono">icon-home.svg</div>
                <div className="bg-muted p-3 rounded-lg text-xs font-mono">icon-user.svg</div>
                <div className="bg-muted p-3 rounded-lg text-xs font-mono">icon-settings.svg</div>
                <div className="bg-muted p-3 rounded-lg text-xs font-mono">icon-search.svg</div>
              </div>

              <div className="inline-block bg-primary/20 text-primary border border-primary/30 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
                Próximamente en Q3 2026
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* SETTINGS PANEL */}
        <div className="mb-4 flex items-center justify-end gap-2 px-2">
          <div className="flex items-center gap-1.5 mr-auto">
            <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">2K UHD</span>
            <span className="bg-green-500/10 text-green-500 text-[10px] px-2 py-0.5 rounded-full font-bold">SVG VECTOR</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${isBackendAvailable() ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            {isBackendAvailable() ? "Railway API: Connected" : "Local Engine: Active"}
          </span>
        </div>
        <div className="mb-10 grid grid-cols-1 md:grid-cols-4 gap-6 bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-foreground">Nombre del Proyecto</label>
            <input 
              type="text" 
              placeholder="Ej: Dashboard_Icons"
              value={options.projectName}
              onChange={(e) => options.setProjectName(e.target.value)}
              className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          
          <div className="flex flex-col justify-center gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">Eliminar Fondo</span>
                <span className="text-[10px] text-muted-foreground">Activa transparencia PNG</span>
              </div>
              <input 
                type="checkbox" 
                checked={options.removeBackground}
                onChange={(e) => options.setRemoveBackground(e.target.checked)}
                className="w-5 h-5 accent-primary"
              />
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground flex items-center gap-1">
                  Alta Resolución 
                  <span className="bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded-full">PRO</span>
                </span>
                <span className="text-[10px] text-muted-foreground">Escalado 2K con IA</span>
              </div>
              <input 
                type="checkbox" 
                checked={options.upscale}
                onChange={(e) => options.setUpscale(e.target.checked)}
                className="w-5 h-5 accent-primary"
              />
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">Compresión ZIP</span>
                <span className="text-[10px] text-muted-foreground">Reduce tamaño ~50%</span>
              </div>
              <input 
                type="checkbox" 
                checked={compressZip}
                onChange={(e) => setCompressZip(e.target.checked)}
                className="w-5 h-5 accent-primary"
              />
            </div>
          </div>
        </div>

        {state === "idle" && !preview ? (

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative cursor-pointer rounded-xl border-2 border-dashed p-16 text-center transition-all duration-300 ${
              dragOver
                ? "border-primary bg-primary/5 glow-cyan"
                : "border-border hover:border-primary/40 hover:bg-muted/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-semibold text-lg mb-2">
              Arrastra tu imagen aquí
            </p>
            <p className="text-muted-foreground text-sm">
              JPG o PNG · Máximo 10MB
            </p>
          </div>

        ) : state === "editing" && pendingImgEl ? (

          <IconEditor
            imgEl={pendingImgEl}
            initialRegions={detectedRegions}
            onConfirm={confirmRegions}
            onCancel={reset}
          />

        ) : state !== "done" ? (
          <div className="text-center py-16">
            {preview && (
              <div className="mb-8 inline-block rounded-lg overflow-hidden border border-border max-w-xs">
                <img src={preview} alt="Preview" className="w-full h-auto" />
              </div>
            )}
            <div className="flex items-center justify-center gap-3 text-primary">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-lg font-semibold">
                {statusMessages[state]}
              </span>
            </div>
            <div className="mt-6 w-64 mx-auto h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{
                  width:
                    state === "uploading"
                      ? "25%"
                      : state === "detecting"
                      ? "50%"
                      : state === "removing-bg"
                      ? "75%"
                      : state === "generating"
                      ? "90%"
                      : "0%",
                }}
              />
            </div>
          </div>
        ) : (
          <div>
            {/* Upsell overlay */}
            {showUpsell && (
              <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
                <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
                <p className="text-foreground font-bold text-lg mb-2">
                  Has generado {icons.length} iconos listos.
                </p>
                <p className="text-muted-foreground text-sm mb-4">
                  Mejora la precisión y descarga en HD con detección avanzada (OpenCV) y eliminación de fondo real.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => window.location.hash = "#pricing"}
                    className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-105 transition-all glow-cyan"
                  >
                    <Sparkles className="w-4 h-4 inline mr-2" />
                    Activar Pro — 9€/mes
                  </button>
                  <button
                    onClick={() => {
                      setShowUpsell(false);
                      handleDownloadZip();
                    }}
                    className="px-6 py-3 rounded-lg border border-border text-muted-foreground font-semibold hover:bg-muted/30 transition-colors text-sm"
                  >
                    Descargar versión básica
                  </button>
                </div>
                <p className="text-muted-foreground text-xs mt-3">
                  Ahorra 2h de trabajo manual por cada imagen procesada
                </p>
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
              <p className="text-foreground font-semibold">
                {icons.length} activos detectados
                <span className="ml-2 text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">
                  PNG HD + SVG
                </span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 transition-colors"
                >
                  <X className="w-4 h-4" /> Nueva imagen
                </button>
                <button
                  onClick={handleDownloadZip}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:scale-105 transition-all glow-cyan"
                >
                  <Download className="w-4 h-4" /> Descargar ZIP
                </button>
              </div>
            </div>

            {/* PREMIUM FIGMA-STYLE PREVIEW CANVAS */}
            <div className="relative rounded-2xl border border-border/50 overflow-hidden shadow-2xl mb-8">
              {/* Toolbar/Header mimicking a design tool */}
              <div className="border-b border-border/50 bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                  <span className="ml-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Design System Preview · {icons.length} Assets
                  </span>
                </div>
                {/* Modo Diseño Controls */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground mr-2 font-semibold uppercase tracking-wider">Fondo</span>
                  {([ 
                    { mode: 'grid' as CanvasMode, label: '⊞', title: 'Cuadrícula' },
                    { mode: 'white' as CanvasMode, label: '○', title: 'Blanco' },
                    { mode: 'black' as CanvasMode, label: '●', title: 'Negro' },
                    { mode: 'transparent' as CanvasMode, label: '◧', title: 'Transparente' },
                  ]).map(({ mode, label, title }) => (
                    <button
                      key={mode}
                      title={title}
                      onClick={() => setCanvasMode(mode)}
                      className={`w-7 h-7 rounded-md text-sm font-bold transition-all ${
                        canvasMode === mode
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Canvas Area — Dynamic Background Mode */}
              <div 
                className="p-8 pb-12 w-full max-h-[500px] overflow-y-auto transition-all duration-500"
                style={canvasBgStyles[canvasMode]}
              >
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-6 max-w-5xl mx-auto">
                  {icons.map((icon) => (
                    <div
                      key={icon.id}
                      className={`group relative flex flex-col items-center gap-3 transition-all duration-300 ${!usedBackend ? "opacity-80" : ""}`}
                    >
                      {/* Icon Base */}
                      <div 
                        className={`w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white dark:bg-[#0A0A0A] rounded-xl flex items-center justify-center border border-border/30 shadow-sm transition-all overflow-hidden relative hover-glow-premium ${
                          usedBackend ? "animate-breath" : ""
                        }`}
                      >
                        <img
                          src={icon.dataUrl}
                          alt={icon.name}
                          className={`w-full h-full object-contain p-4 ${
                            !usedBackend ? "blur-[4px] scale-105" : ""
                          }`}
                        />
                        {!usedBackend && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/5 backdrop-blur-[2px]">
                            <Lock className="w-5 h-5 text-primary drop-shadow-md" />
                          </div>
                        )}
                      </div>
                      
                      {/* Label below icon */}
                      <div className="w-full text-center px-1">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground group-hover:text-foreground truncate transition-colors">
                          {icon.name.replace('.png', '')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {!usedBackend && !showUpsell && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => window.location.hash = "#pricing"}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-105 transition-all glow-cyan"
                >
                  <Sparkles className="w-4 h-4" />
                  Desbloquear en HD — desde 9€/mes
                </button>
                <p className="text-muted-foreground text-xs mt-2">
                  Ahorra 2h de trabajo manual por cada imagen
                </p>
              </div>
            )}

            {icons.length > 0 && (
              <p className="text-center text-muted-foreground text-sm mt-8">
                {icons.length} activos en 2K y SVG listos. Descárgalos en un ZIP.
              </p>
            )}
          </div>
        )}
        </>
        )}

        {error && (
          <p className="text-destructive text-center mt-4 font-medium">
            {error}
          </p>
        )}
      </div>
    </section>
  );
};

export default UploadSection;
