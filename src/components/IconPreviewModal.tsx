import { X, Download } from "lucide-react";
import { SvgStyle, applyStyleToSvg } from "@/lib/svgStyle";
import { downloadSingleIcon } from "@/lib/zip-utils";

interface PreviewIcon {
  id: number | string;
  name: string;
  svgContent?: string;
  dataUrl?: string;
}

interface IconPreviewModalProps {
  icon: PreviewIcon | null;
  onClose: () => void;
  activeStyle: SvgStyle;
  primaryColor?: string;
  visualStyle?: { color_primary?: string } | null;
}

export function IconPreviewModal({ icon, onClose, activeStyle, primaryColor, visualStyle }: IconPreviewModalProps) {
  if (!icon) return null;

  const color = primaryColor || visualStyle?.color_primary || "#7c3aed";
  const baseName = icon.name.replace(/\.(png|svg)$/, "");

  const previewSvg = icon.svgContent
    ? applyStyleToSvg(icon.svgContent, activeStyle, color)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${baseName}`}
      tabIndex={0}
    >
      <div
        className="relative glass-card rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border-primary/20 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors z-10"
          aria-label="Cerrar preview"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-6">
          <div className="w-48 h-48 sm:w-56 sm:h-56 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 overflow-hidden">
            {previewSvg ? (
              <div
                className="w-full h-full p-10 text-foreground"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
                aria-hidden="true"
              />
            ) : icon.dataUrl ? (
              <img
                src={icon.dataUrl}
                alt={icon.name}
                className="w-full h-full object-contain p-6"
              />
            ) : (
              <div className="text-muted-foreground text-sm">Sin preview</div>
            )}
          </div>

          <div className="text-center w-full">
            <p className="text-sm font-black text-foreground break-all mb-1">
              {baseName}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              {icon.svgContent ? `SVG · ${activeStyle}` : "PNG"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {icon.svgContent && (
              <button
                onClick={() => downloadSingleIcon(
                  { svgContent: icon.svgContent, name: icon.name },
                  activeStyle,
                  color
                )}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:scale-105 transition-all"
              >
                <Download className="w-4 h-4" /> SVG
              </button>
            )}
            {icon.dataUrl && (
              <button
                onClick={() => downloadSingleIcon(
                  { dataUrl: icon.dataUrl, name: icon.name },
                  activeStyle,
                  color
                )}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-white/10 text-foreground text-sm font-bold hover:bg-white/5 transition-all"
              >
                <Download className="w-4 h-4" /> PNG
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
