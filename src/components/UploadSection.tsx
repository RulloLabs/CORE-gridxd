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
  const { plan } = useAuth();
  const [activeMode, setActiveMode] = useState<"extract" | "generate">("extract");
  const [exportStyle, setExportStyle] = useState<SvgStyle>("outline");
  const [upgradeStyle, setUpgradeStyle] = useState<SvgStyle | null>(null);

  const handleDownloadZip = async () => {
    const { icons, options, visualStyle, zipUrl } = processor;
    
    if (zipUrl) {
      window.open(zipUrl, '_blank');
      return;
    }

    if (icons.length === 0) return;
    
    // PRO+ exports all 3 styles, others export selected style only
    const styles: SvgStyle[] = (plan === "proplus") ? ["outline", "filled", "duotone"] : [exportStyle];
    const name = options.projectName.trim() || "GridXD_Export";

    await downloadAssetsZip(icons, {
      projectName: name,
      exportStyles: styles,
      visualStyle,
      compress: true
    });
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
        <div className="flex justify-center mb-10 sm:mb-16">
          <div className="bg-foreground/5 p-2 rounded-[2rem] flex items-center gap-2 border border-border shadow-2xl backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <button
              onClick={() => setActiveMode("extract") }
              className={`relative z-10 flex items-center gap-3 px-6 py-4 rounded-[1.5rem] transition-all duration-500 ${
                activeMode === "extract" 
                  ? "bg-foreground/10 text-foreground shadow-xl ring-1 ring-foreground/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              <Upload className={`w-5 h-5 ${activeMode === "extract" ? "animate-bounce" : ""}`} />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Modo Manual</p>
                <p className="text-sm font-bold">Extraer de Mockup</p>
              </div>
            </button>

            <div className="w-px h-8 bg-border mx-1" />

            <button
              onClick={() => setActiveMode("generate")}
              className={`relative z-10 flex items-center gap-3 px-6 py-4 rounded-[1.5rem] transition-all duration-500 ${
                activeMode === "generate" 
                  ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/20 glow-cyan ring-1 ring-primary/50" 
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              <Sparkles className={`w-5 h-5 ${activeMode === "generate" ? "animate-pulse" : ""}`} />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Modo IA</p>
                <p className="text-sm font-bold">Generar Sistema</p>
              </div>
            </button>
          </div>
        </div>

        {/* UPSELL NOTIFICATION — triggered from ExtractMode when free users reach backend quality */}
        {processor.state === "done" && processor.icons.length > 0 && plan === "free" && (
          <div className="mb-4 sm:mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-6 text-center animate-in fade-in slide-in-from-top-4">
            <Sparkles className="w-6 sm:w-8 h-6 sm:h-8 text-primary mx-auto mb-2 sm:mb-3" />
            <p className="text-foreground font-bold text-base sm:text-lg mb-1.5 sm:mb-2">
              Has extraído {processor.icons.length} iconos listos.
            </p>
            <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">
              Mejora la precisión y descarga en HD con detección avanzada y eliminación de fondo real.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <button
                onClick={() => { window.location.hash = "#pricing"; }}
                className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:scale-105 transition-all glow-cyan"
              >
                Activar Pro — 9€/mes
              </button>
              <button
                onClick={handleDownloadZip}
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
            setProjectName={processor.options.setProjectName}
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
