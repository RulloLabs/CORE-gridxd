import { useState } from "react";
import { Upload, Sparkles } from "lucide-react";
import { useImageProcessor } from "@/hooks/useImageProcessor";
import { useAuth } from "@/contexts/AuthContext";
import UpgradeModal from "@/components/UpgradeModal";
import { SvgStyle } from "@/lib/svgStyle";
import { ExtractMode } from "./Upload/ExtractMode";
import { GenerateMode } from "./Upload/GenerateMode";
import { downloadAssetsZip } from "@/lib/zip-utils";

const UploadSection = () => {
  const processor = useImageProcessor();
  const { tier } = useAuth();
  const [showUpsell, setShowUpsell] = useState(false);
  const [activeMode, setActiveMode] = useState<"extract" | "generate">("extract");
  const [exportStyle, setExportStyle] = useState<SvgStyle>("outline");
  const [upgradeStyle, setUpgradeStyle] = useState<SvgStyle | null>(null);

  const handleDownloadZip = async () => {
    // Show upsell for free users before download if they didn't use backend
    if (!processor.usedBackend && tier === "free" && !showUpsell) {
      setShowUpsell(true);
      return;
    }

    const { icons, options, visualStyle } = processor;
    
    // PRO+ can export all 3 styles
    const styles: SvgStyle[] = (tier === "proplus") ? ["outline", "filled", "duotone"] : [exportStyle];

    await downloadAssetsZip(icons, {
      projectName: options.projectName || "gridxd",
      exportStyles: styles,
      visualStyle,
      compress: true
    });
    
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
        <div className="flex justify-center mb-6 sm:mb-10">
          <div className="bg-muted/80 p-1.5 sm:p-2 rounded-2xl flex items-center gap-1 sm:gap-2 border border-border shadow-lg">
            <button
              onClick={() => setActiveMode("extract")}
              title="Modo Extraer (Cortar iconos)"
              className={`p-3 sm:p-4 rounded-xl transition-all ${activeMode === "extract" ? "bg-card text-primary shadow-md border border-border scale-110" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
            >
              <Upload className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            <div className="w-px h-6 sm:h-8 bg-border/50" />
            <button
              onClick={() => setActiveMode("generate")}
              title="Modo Crear Sistema (IA)"
              className={`p-3 sm:p-4 rounded-xl transition-all ${activeMode === "generate" ? "bg-primary text-primary-foreground shadow-lg glow-cyan scale-110" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
            >
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          </div>
        </div>

        {/* UPSELL NOTIFICATION */}
        {showUpsell && processor.state === "done" && (
          <div className="mb-4 sm:mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-6 text-center animate-in fade-in slide-in-from-top-4">
            <Sparkles className="w-6 sm:w-8 h-6 sm:h-8 text-primary mx-auto mb-2 sm:mb-3" />
            <p className="text-foreground font-bold text-base sm:text-lg mb-1.5 sm:mb-2">
              Has generado {processor.icons.length} iconos listos.
            </p>
            <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">
              Mejora la precisión y descarga en HD con detección avanzada (OpenCV) y eliminación de fondo real.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <button
                onClick={() => window.location.hash = "#pricing"}
                className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:scale-105 transition-all glow-cyan"
              >
                Activar Pro — 9€/mes
              </button>
              <button
                onClick={() => {
                  setShowUpsell(false);
                  handleDownloadZip();
                }}
                className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg border border-border text-muted-foreground text-xs sm:text-sm font-semibold hover:bg-muted/30 transition-colors"
              >
                Descargar versión básica
              </button>
            </div>
          </div>
        )}

        {activeMode === "extract" ? (
          <ExtractMode 
            processor={processor} 
            exportStyle={exportStyle} 
            setExportStyle={setExportStyle}
            onUpgrade={(s) => setUpgradeStyle(s)}
            onDownload={handleDownloadZip}
          />
        ) : (
          <GenerateMode 
            projectName={processor.options.projectName}
            onUpgrade={(s) => setUpgradeStyle(s)}
          />
        )}
      </div>

      <UpgradeModal 
        open={!!upgradeStyle} 
        onClose={() => setUpgradeStyle(null)} 
      />
    </section>
  );
};

export default UploadSection;
