import { useState, useCallback } from "react";
import {
  incrementUsage,
  getUserPlan,
  processImageBackend,
  extractStyleFromBackend,
  ProcessingOptions,
  VisualStyle,
  DEFAULT_VISUAL_STYLE,
} from "@/lib/api";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";

export type ProcessingState =
  | "idle"
  | "uploading"
  | "generating"
  | "done";

export interface ExtractedIcon {
  id: number;
  dataUrl: string; // Used for preview (Supabase URL)
  svgContent: string;
  name: string;
}

export function getIconName(
  id: number,
  projectName: string,
  resLabel: string,
  date: string
): string {
  const paddedId = id.toString().padStart(2, '0');
  const proj = projectName.trim() || "Asset";
  return `GRIDXD_${proj}_${paddedId}_${resLabel}_${date}.png`;
}

export const statusMessages: Record<ProcessingState, string> = {
  idle: "",
  uploading: "Subiendo imagen...",
  generating: "Generando activos en la nube...",
  done: "¡Listo!",
};

export function useImageProcessor() {
  const [state, setState] = useState<ProcessingState>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [icons, setIcons] = useState<ExtractedIcon[]>([]);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedBackend, setUsedBackend] = useState(true);

  // Options
  const [removeBackground, setRemoveBackground] = useState(true);
  const [upscale, setUpscale] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(DEFAULT_VISUAL_STYLE);

  const { plan: authPlan } = useAuth();

  const updateIconNames = useCallback(() => {
    if (icons.length === 0) return;
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const resLabel = upscale ? "2K" : "HD";
    setIcons((prev) =>
      prev.map((icon) => ({
        ...icon,
        name: getIconName(icon.id, projectName, resLabel, today),
      }))
    );
  }, [projectName, upscale, icons.length]);

  const processImages = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      
      const validFiles = files.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          setError(`La imagen ${file.name} supera los 10MB`);
          return false;
        }
        if (!["image/jpeg", "image/png"].includes(file.type)) {
          setError(`Solo se aceptan JPG y PNG. Saltando ${file.name}`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      setError(null);
      setIcons([]);
      setZipUrl(null);
      setUsedBackend(true);

      const file = validFiles[0]; // Process only the first file for now to keep UI simple
      const url = URL.createObjectURL(file);
      setPreview(url);
      
      const planInfo = await getUserPlan();

      if (planInfo.plan === "free" && planInfo.remainingFreeUses <= 0) {
        setError("Has agotado tus usos gratuitos de hoy.");
        setState("idle");
        return;
      }

      const options: ProcessingOptions = {
        removeBackground,
        upscale,
        projectName: projectName || undefined,
      };

      try {
        setState("uploading");
        
        // Start processing and style extraction
        const result = await processImageBackend(file, options);
        
        if (result.visualStyle) {
          setVisualStyle(result.visualStyle);
        } else {
          const style = await extractStyleFromBackend(file);
          setVisualStyle(style);
        }

        setState("done");
        setIcons(result.images.map((img, i) => ({
          id: i + 1,
          dataUrl: img.url,
          svgContent: "",
          name: img.name
        })));
        setZipUrl(result.zipUrl);
        await incrementUsage();
      } catch (err) {
        logger.error("Processing error:", err);
        setError("Error al procesar la imagen en el servidor.");
        setState("idle");
      }
    },
    [removeBackground, upscale, projectName]
  );

  const reset = () => {
    setState("idle");
    setPreview(null);
    setIcons([]);
    setZipUrl(null);
    setError(null);
    setUsedBackend(true);
    setVisualStyle(DEFAULT_VISUAL_STYLE);
  };

  const injectGeneratedIcon = useCallback((svgContent: string, conceptName: string) => {
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const resLabel = upscale ? "2K" : "HD";
    
    setIcons(prev => {
      const newId = prev.length + 1;
      const newIcon: ExtractedIcon = {
        id: newId,
        dataUrl: "", 
        svgContent,
        name: `GRIDXD_GEN_${conceptName.toUpperCase()}_${newId.toString().padStart(2, "0")}_${resLabel}_${today}.svg`
      };
      return [...prev, newIcon];
    });
  }, [upscale]);

  return {
    state,
    preview,
    icons,
    zipUrl,
    error,
    usedBackend,
    visualStyle,
    processImages,
    reset,
    injectGeneratedIcon,
    // Provide a dummy for the editor state to avoid breaking ExtractMode completely yet
    detectedRegions: [],
    confirmRegions: async () => {},
    pendingImgEl: null,
    options: {
      removeBackground,
      setRemoveBackground,
      upscale,
      setUpscale,
      projectName,
      setProjectName,
      updateIconNames,
    },
  };
}
