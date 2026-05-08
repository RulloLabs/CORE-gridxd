import { ExtractedIcon } from "@/hooks/useImageProcessor";
import { GeneratedIcon } from "@/hooks/useIconGenerator";
import { applyStyleToSvg, SvgStyle, STYLE_META } from "@/lib/svgStyle";
import { VisualStyle } from "@/lib/api";
import JSZip from "jszip";
import { toast } from "sonner";

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
    toast.info("Generando archivo ZIP, por favor espera...");
    const zip = new JSZip();
    const { projectName, exportStyles, visualStyle, compress } = options;
    const primaryColor = visualStyle?.color_primary || "#7c3aed";
    const timestamp = new Date().toISOString().split("T")[0].replace(/-/g, "");

    // Create folder structure for each style
    for (const style of exportStyles) {
      const styleFolder = exportStyles.length > 1 ? zip.folder(style) : zip;
      if (!styleFolder) continue;

      for (const icon of icons) {
        // Handle PNGs only in the first style or root if requested
        if (icon.dataUrl && style === exportStyles[0]) {
          const base64 = icon.dataUrl.split(",")[1];
          styleFolder.file(icon.name, base64, { base64: true });
        }

        // Handle SVGs
        if (icon.svgContent) {
          const styledSvg = applyStyleToSvg(icon.svgContent, style, primaryColor);
          const svgName = icon.name.replace(".png", `.${style}.svg`).replace(".svg", `.${style}.svg`).replace(`.${style}.${style}.svg`, `.${style}.svg`);
          styleFolder.file(svgName, styledSvg);
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

    // Add simple README
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
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Descarga completada correctamente");
  } catch (error) {
    console.error("Error generating ZIP:", error);
    toast.error("Hubo un error al generar el archivo ZIP. Por favor, inténtalo de nuevo.");
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
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Descarga del sistema completada correctamente");
  } catch (error) {
    console.error("Error generating ZIP:", error);
    toast.error("Hubo un error al generar el archivo ZIP. Por favor, inténtalo de nuevo.");
  }
}
