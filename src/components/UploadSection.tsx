import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, Loader2, Download, Sparkles, Lock, AlertTriangle, Maximize2 } from "lucide-react";
import { useImageProcessor, statusMessages } from "@/hooks/useImageProcessor";
import { useIconGenerator } from "@/hooks/useIconGenerator";
import { isBackendAvailable } from "@/lib/api";
import { applyStyleToSvg, canAccessStyle, STYLE_META, type SvgStyle } from "@/lib/svgStyle";
import { useAuth } from "@/contexts/AuthContext";
import IconEditor from "@/components/IconEditor";
import { StyleCard } from "@/components/StyleCard";
import { SidebarIconGenerator } from "@/components/SidebarIconGenerator";
import { useProcessingHistory } from "@/hooks/useProcessingHistory";
import UpgradeModal from "@/components/UpgradeModal";

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
  const { state, preview, icons, error, usedBackend, visualStyle, processImage, reset, options, detectedRegions, confirmRegions, pendingImgEl, injectGeneratedIcon } = useImageProcessor();
  const { tier } = useAuth();
  const generator = useIconGenerator();
  const { saveToHistory } = useProcessingHistory();
  const [dragOver, setDragOver] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('grid');
  const [compressZip, setCompressZip] = useState(false);
  const [activeMode, setActiveMode] = useState<"extract" | "generate">("extract");
  const [genVariant, setGenVariant] = useState<string>("outline");
  const [exportStyle, setExportStyle] = useState<SvgStyle>("outline");
  const [upgradeStyle, setUpgradeStyle] = useState<SvgStyle | null>(null);
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

  // Sync AI Generated Icons to main workspace when done
  useEffect(() => {
    if (generator.state === "done" && generator.generatedIcons.length > 0) {
      // Avoid duplicate injection if already synced
      const alreadyHasGen = icons.some(i => i.name.includes("_GEN_"));
      if (!alreadyHasGen) {
        generator.generatedIcons.forEach(icon => {
          if (icon.svgContent) {
            injectGeneratedIcon(icon.svgContent, icon.id);
          }
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generator.state]);

  const handleDownloadZip = async () => {
    // Show upsell for free users before download
    if (!usedBackend && !showUpsell) {
      setShowUpsell(true);
      return;
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    // Apply selected style to each icon
    const primaryColor = visualStyle?.color_primary || "#7c3aed";

    for (const icon of icons) {
      // Optionally compress PNG before adding to ZIP
      const pngDataUrl = compressZip
        ? await compressIcon(icon.dataUrl)
        : icon.dataUrl;
      const base64 = pngDataUrl.split(",")[1];
      zip.file(icon.name, base64, { base64: true });

      // Apply style transform to SVG
      if (icon.svgContent) {
        const styledSvg = applyStyleToSvg(icon.svgContent, exportStyle, primaryColor);
        const svgName = icon.name.replace(".png", `.${exportStyle}.svg`);
        zip.file(svgName, styledSvg);
      }
    }

    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${options.projectName || "gridxd"}-${exportStyle}-assets.zip`;
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
    if (file) {
      if (activeMode === "generate") {
        generator.generateSystem(file, genVariant);
      } else {
        processImage(file);
      }
    }
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

                {/* Style Selection before Upload */}
                <div className="max-w-xs mx-auto mb-8 space-y-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">1. Elige tu estilo base</p>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-muted/50 rounded-xl border border-border/50">
                    {["outline", "filled", "duotone"].map((v) => (
                      <button
                        key={v}
                        onClick={() => setGenVariant(v)}
                        className={`px-3 py-2 text-[11px] rounded-lg font-bold capitalize transition-all ${
                          genVariant === v 
                            ? "bg-background text-primary shadow-sm border border-border" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-4">2. Sube tu referencia visual</p>
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) generator.generateSystem(file, genVariant);
                  }}
                  onClick={() => inputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-12 transition-all cursor-pointer ${
                    dragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
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

                {/* Style Preview Switcher */}
                <div className="mb-6 flex items-center gap-4">
                  <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground shrink-0">Preview Estilo:</span>
                  <div className="flex gap-2">
                    {(["outline", "filled", "duotone"] as SvgStyle[]).map((s) => {
                      const locked = !canAccessStyle(tier as "free" | "pro" | "proplus", s);
                      const active = generator.activeStyle === s;
                      return (
                        <button
                          key={s}
                          onClick={() => locked ? setUpgradeStyle(s) : generator.setActiveStyle(s)}
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
                              style={{ color: primaryColor }}
                              dangerouslySetInnerHTML={{ __html: previewSvg }}
                            />
                          ) : (
                            <icon.icon 
                              className="w-full h-full transition-transform group-hover:scale-110" 
                              style={{ 
                                color: primaryColor,
                                strokeWidth: generator.visualStyle?.stroke_width || 2
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
                  <div>
                    <h4 className="font-bold text-foreground">¿Listo para exportar?</h4>
                    <p className="text-sm text-muted-foreground">
                      Exportando en estilo <span className="text-primary font-bold uppercase">{generator.activeStyle}</span> — {STYLE_META[generator.activeStyle].description}
                    </p>
                  </div>
                  <button 
                    onClick={() => generator.downloadPack(options.projectName, generator.activeStyle)}
                    className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2 glow-cyan"
                  >
                    <Download className="w-5 h-5" /> Descargar Pack {generator.activeStyle.charAt(0).toUpperCase() + generator.activeStyle.slice(1)}
                  </button>
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
        <div className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-6 bg-card border border-border p-8 rounded-2xl shadow-sm">
          {/* Col 1: Project Name */}
          <div className="flex flex-col gap-3">
            <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">
              Nombre del Proyecto
            </label>
            <input
              type="text"
              placeholder="Ej: Dashboard_Icons"
              value={options.projectName}
              onChange={(e) => options.setProjectName(e.target.value)}
              className="w-full bg-muted border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-foreground"
            />
            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={() => options.setRemoveBackground(!options.removeBackground)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-xs font-bold ${
                  options.removeBackground ? "bg-primary/10 border-primary text-primary" : "bg-muted border-border text-muted-foreground"
                }`}
              >
                <span>Eliminar Fondo</span>
                <Sparkles className={`w-3.5 h-3.5 ${options.removeBackground ? "opacity-100" : "opacity-40"}`} />
              </button>
              <button
                onClick={() => options.setUpscale(!options.upscale)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-xs font-bold ${
                  options.upscale ? "bg-primary/10 border-primary text-primary" : "bg-muted border-border text-muted-foreground"
                }`}
              >
                <span>{options.upscale ? "Calidad 2K UHD" : "Calidad Standard"}</span>
                <Maximize2 className={`w-3.5 h-3.5 ${options.upscale ? "opacity-100" : "opacity-40"}`} />
              </button>
              <button
                onClick={() => setCompressZip(!compressZip)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-xs font-bold ${
                  compressZip ? "bg-primary/10 border-primary text-primary" : "bg-muted border-border text-muted-foreground"
                }`}
              >
                <span>{compressZip ? "ZIP Comprimido" : "ZIP Normal"}</span>
                <Download className={`w-3.5 h-3.5 ${compressZip ? "opacity-100" : "opacity-40"}`} />
              </button>
            </div>
          </div>

          {/* Col 2+3: Style Selector */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                Estilo de Exportación SVG
              </span>
              {tier === "free" && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  FREE — Solo Outline
                </span>
              )}
              {tier === "pro" && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                  PRO — 3 Estilos
                </span>
              )}
              {tier === "proplus" && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full">
                  PRO+ — All Variants
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(["outline", "filled", "duotone"] as SvgStyle[]).map((s) => {
                const meta = STYLE_META[s];
                const locked = !canAccessStyle(tier as "free" | "pro" | "proplus", s);
                const active = exportStyle === s;
                return (
                  <button
                    key={s}
                    onClick={() => {
                      if (locked) {
                        setUpgradeStyle(s);
                        return;
                      }
                      setExportStyle(s);
                    }}
                    title={locked ? "Requiere plan PRO" : meta.description}
                    className={`relative flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 transition-all ${
                      locked
                        ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                        : active
                        ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                        : "border-border bg-muted/30 hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                    }`}
                  >
                    {locked && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    {active && !locked && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                    <span className="text-3xl leading-none" aria-hidden>{meta.icon}</span>
                    <span className={`text-xs font-black uppercase tracking-wider ${active && !locked ? "text-primary" : "text-foreground"}`}>
                      {meta.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground text-center leading-tight">
                      {meta.description}
                    </span>
                    {locked && (
                      <span className="text-[8px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full mt-0.5">
                        PRO
                      </span>
                    )}
                  </button>
                );
              })}
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

            {/* MAIN CONTENT ROW: PREVIEW + GENERATOR SIDEBAR */}
            <div className="flex flex-col lg:flex-row gap-8 items-start mb-12">
              <div className="flex-1 w-full order-2 lg:order-1">
                {/* Visual DNA card — shown when Gemini analysis is available */}
                {visualStyle && (
                  <StyleCard style={visualStyle} className="mb-6" />
                )}

                {/* PREMIUM FIGMA-STYLE PREVIEW CANVAS */}
                <div className="relative rounded-2xl border border-border/50 overflow-hidden shadow-2xl">
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
                    className="p-8 pb-12 w-full max-h-[600px] overflow-y-auto transition-all duration-500"
                    style={canvasBgStyles[canvasMode]}
                  >
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-6 max-w-5xl mx-auto">
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
                            {icon.name.includes("_GEN_") && (
                              <div className="absolute top-1 right-1 px-1 py-0.5 bg-primary/20 text-[6px] font-black text-primary rounded-[2px] uppercase tracking-wider z-20">
                                AI
                              </div>
                            )}
                            {icon.svgContent ? (
                              <div 
                                className="w-full h-full p-4 text-foreground transition-transform group-hover:scale-110" 
                                dangerouslySetInnerHTML={{ __html: icon.svgContent }}
                              />
                            ) : (
                              <img
                                src={icon.dataUrl}
                                alt={icon.name}
                                className={`w-full h-full object-contain p-4 ${
                                  !usedBackend ? "blur-[4px] scale-105" : ""
                                }`}
                              />
                            )}
                            {!usedBackend && !icon.svgContent && (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/5 backdrop-blur-[2px]">
                                <Lock className="w-5 h-5 text-primary drop-shadow-md" />
                              </div>
                            )}
                          </div>
                          
                          {/* Label below icon */}
                          <div className="w-full text-center px-1">
                            <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground group-hover:text-foreground truncate transition-colors">
                              {icon.name.replace('.png', '').replace('.svg', '')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SIDEBAR FOR GENERATION */}
              {visualStyle && (
                <div className="order-1 lg:order-2">
                  <SidebarIconGenerator 
                    visualStyle={visualStyle} 
                    onIconGenerated={(svg, name) => injectGeneratedIcon(svg, name)} 
                  />
                  <div className="mt-4 p-4 rounded-2xl bg-muted/30 border border-border/50 text-center">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Estado del Pack</p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${Math.min((icons.length / 24) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-foreground">{icons.length}/24</span>
                    </div>
                  </div>
                </div>
              )}
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

      {/* Upsell Modal — shown when FREE user clicks a locked style */}
      <UpgradeModal
        open={upgradeStyle !== null}
        onClose={() => setUpgradeStyle(null)}
        blockedStyle={upgradeStyle ?? "filled"}
      />
  );
};

export default UploadSection;
