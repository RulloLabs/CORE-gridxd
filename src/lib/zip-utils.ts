import { ExtractedIcon } from "@/hooks/useImageProcessor";
import { GeneratedIcon } from "@/hooks/useIconGenerator";
import { applyStyleToSvg, SvgStyle, STYLE_META } from "@/lib/svgStyle";
import { VisualStyle } from "@/lib/api";
import JSZip from "jszip";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export interface ZipExportOptions {
  projectName: string;
  exportStyles: SvgStyle[];
  visualStyle?: VisualStyle | null;
  compress?: boolean;
}

export async function downloadAssetsZip(
  icons: ExtractedIcon[],
  options: ZipExportOptions
) {
  try {
    if (icons.length === 0) {
      toast.error("No hay iconos para exportar.");
      return;
    }
    toast.info("Generando archivo ZIP, por favor espera...");
    const zip = new JSZip();
    const { projectName, exportStyles, visualStyle, compress } = options;
    const primaryColor = visualStyle?.color_primary || "#7c3aed";
    const timestamp = new Date().toISOString().split("T")[0].replace(/-/g, "");

    // Helper: resolve an icon's image data as a Blob (supports both base64 and HTTP URLs)
    const resolveImageBlob = async (dataUrl: string): Promise<Blob | null> => {
      if (!dataUrl) return null;
      if (dataUrl.startsWith("data:")) {
        // Standard base64 data URL
        const [header, base64] = dataUrl.split(",");
        if (!base64) return null;
        const mime = header.split(":")[1]?.split(";")[0] || "image/png";
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime });
      }
      if (dataUrl.startsWith("http")) {
        // Remote URL from Cloud Run / Supabase Storage — fetch it
        try {
          const res = await fetch(dataUrl);
          if (!res.ok) return null;
          return await res.blob();
        } catch {
          return null;
        }
      }
      return null;
    };

    // Create folder structure for each style
    for (const style of exportStyles) {
      const styleFolder = exportStyles.length > 1 ? zip.folder(style) : zip;
      if (!styleFolder) continue;

      for (const icon of icons) {
        // PNG — only in first style folder to avoid duplication
        if (icon.dataUrl && style === exportStyles[0]) {
          const blob = await resolveImageBlob(icon.dataUrl);
          if (blob) {
            const arrayBuf = await blob.arrayBuffer();
            styleFolder.file(icon.name, arrayBuf);
          }
        }

        // SVG — apply requested style transform
        if (icon.svgContent) {
          const styledSvg = applyStyleToSvg(icon.svgContent, style, primaryColor);
          // Normalise the svg filename cleanly
          const baseName = icon.name.replace(/\.(png|svg)$/, "");
          styleFolder.file(`${baseName}.${style}.svg`, styledSvg);
        }
      }
    }

    // Add DNA manifest if we have visual style
    if (visualStyle) {
      const manifest = {
        projectName,
        timestamp,
        dna: visualStyle,
        styles: exportStyles,
        iconCount: icons.length,
      };
      zip.file("design-dna.json", JSON.stringify(manifest, null, 2));
    }

    // README
    const readme = `# ${projectName} - GRIDXD Assets
    
Generado por GRIDXD (2026)
Fecha: ${timestamp}
Estilos incluidos: ${exportStyles.join(", ")}

## Design DNA
- Estilo Base: ${visualStyle?.style || "Detected"}
- Color Primario: ${primaryColor}
- Mood: ${visualStyle?.mood || "Standard"}

---
gridxd.io - Professional Icon Extraction & Generation`;

    zip.file("README.md", readme);

    const content = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: compress ? 9 : 6 }
    });

    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, "-")}-assets.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Descarga completada correctamente");
  } catch (error) {
    logger.error("Error generating ZIP: %o", error);
    toast.error("Hubo un error al generar el archivo ZIP. Por favor, inténtalo de nuevo.");
  }
}

/**
 * Download a single icon as SVG (with style applied) or PNG.
 */
export async function downloadSingleIcon(
  data: { svgContent?: string; dataUrl?: string; name: string },
  style: SvgStyle,
  primaryColor: string = "#7c3aed"
) {
  const baseName = data.name.replace(/\.(png|svg)$/, "");

  // Prefer SVG download — cleaner for vector assets
  if (data.svgContent) {
    const styledSvg = applyStyleToSvg(data.svgContent, style, primaryColor);
    const blob = new Blob([styledSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.${style}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // Fallback: download PNG
  if (data.dataUrl) {
    const a = document.createElement("a");
    a.href = data.dataUrl;
    a.download = `${baseName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export async function downloadGeneratorPack(
  icons: GeneratedIcon[],
  visualStyle: VisualStyle,
  options: ZipExportOptions
) {
  try {
    toast.info("Generando archivo ZIP del sistema, por favor espera...");
    const zip = new JSZip();
    const { projectName, exportStyles, compress } = options;
    const primaryColor = visualStyle.color_primary;

    for (const style of exportStyles) {
      const styleFolder = zip.folder(`icons/${style}`);
      if (!styleFolder) continue;

      icons.forEach(icon => {
        if (icon.svgContent) {
          const styledSvg = applyStyleToSvg(icon.svgContent, style, primaryColor);
          styleFolder.file(icon.name, styledSvg);
        }
      });
    }

    // Manifest
    const manifest = {
      projectName,
      version: "1.0.0",
      dna: visualStyle,
      styles: exportStyles,
      icons: icons.map(i => i.name)
    };
    zip.file("style-dna.json", JSON.stringify(manifest, null, 2));

    // README
    const readme = `# ${projectName} — GridXD Icon System

Generado por GridXD "The System Generator".
Estilos exportados: ${exportStyles.join(", ")}

## Design DNA
- Color Primario: ${primaryColor}
- Stroke: ${visualStyle.stroke_width}px
- Mood: ${visualStyle.mood}

gridxd.io — Design Intelligence`;

    zip.file("README.md", readme);

    const content = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: compress ? 9 : 6 }
    });

    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, "-")}-system-pack.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Descarga del sistema completada correctamente");
  } catch (error) {
    logger.error("Error generating ZIP: %o", error);
    toast.error("Hubo un error al generar el archivo ZIP. Por favor, inténtalo de nuevo.");
  }
}
