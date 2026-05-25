import { useState, useCallback, useRef } from "react";
import {
  incrementUsage,
  getUserPlan,
  getProcessingStrategy,
  processImageBackend,
  extractStyleFromBackend,
  ProcessingOptions,
  VisualStyle,
  DEFAULT_VISUAL_STYLE,
} from "@/lib/api";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import type { WorkerRegion } from "@/workers/regionDetector.worker";

export type ProcessingState =
  | "idle"
  | "uploading"
  | "detecting"
  | "editing"      // ← NEW: user reviews/edits bounding boxes
  | "removing-bg"
  | "vectorizing"
  | "generating"
  | "done";

export interface Region {
  id: string;
  minX: number;  // natural image px
  minY: number;
  maxX: number;
  maxY: number;
}

export interface ExtractedIcon {
  id: number;
  dataUrl: string;
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
  detecting: "Detectando iconos...",
  editing: "Revisando regiones...",
  "removing-bg": "Eliminando fondos...",
  vectorizing: "Vectorizando (SVG)...",
  generating: "Generando archivos...",
  done: "¡Listo!",
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── PHASE 1: Detect bounding boxes — via Web Worker ────────────────────────
async function detectRegionsViaWorker(
  imgEl: HTMLImageElement
): Promise<Region[]> {
  const canvas = document.createElement("canvas");
  canvas.width = imgEl.naturalWidth || imgEl.width;
  canvas.height = imgEl.naturalHeight || imgEl.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imgEl, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const fallbackRegion: Region = { id: "region-0-fallback", minX: 0, minY: 0, maxX: canvas.width, maxY: canvas.height };

  const workerPromise = new Promise<Region[]>((resolve) => {
    const worker = new Worker(
      new URL("../workers/regionDetector.worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (e: MessageEvent<{ regions: WorkerRegion[]; error: string | null }>) => {
      worker.terminate();
      if (e.data.error) {
        logger.error("Worker region detection error:", e.data.error);
        resolve([fallbackRegion]);
      } else {
        resolve(e.data.regions);
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      logger.error("Worker error:", err);
      resolve([fallbackRegion]);
    };
    worker.postMessage({ imageData, width: canvas.width, height: canvas.height });
  });

  // 15s timeout — prevents silent worker hang from freezing the UI
  const timeoutPromise = new Promise<Region[]>((resolve) => {
    setTimeout(() => {
      logger.warn("detectRegionsViaWorker timed out after 15s — using full-image fallback");
      resolve([fallbackRegion]);
    }, 15000);
  });

  return Promise.race([workerPromise, timeoutPromise]);
}

// ─── PHASE 2: Extract icons from approved regions ────────────────────────────
export async function extractIconsFromRegions(
  imgEl: HTMLImageElement,
  regions: Region[],
  options: ProcessingOptions
): Promise<ExtractedIcon[]> {
  const ImageTracerModule = await import("imagetracerjs");
  const ImageTracer = ImageTracerModule.default || ImageTracerModule;

  const canvas = document.createElement("canvas");
  canvas.width = imgEl.width;
  canvas.height = imgEl.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imgEl, 0, 0);

  const width = canvas.width;
  const height = canvas.height;

  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const proj = options.projectName || "Project";

  return regions.map((r, i) => {
    const padding = 15;
    const sx = Math.max(0, r.minX - padding);
    const sy = Math.max(0, r.minY - padding);
    const sw = Math.min(width - sx, r.maxX - r.minX + padding * 2);
    const sh = Math.min(height - sy, r.maxY - r.minY + padding * 2);

    const outCanvas = document.createElement("canvas");
    const resolution = options.upscale ? 2048 : 1024;
    outCanvas.width = resolution;
    outCanvas.height = resolution;
    const outCtx = outCanvas.getContext("2d")!;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = sw;
    tempCanvas.height = sh;
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true })!;
    tempCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

    if (options.removeBackground) {
      const cropData = tempCtx.getImageData(0, 0, sw, sh);
      const pixels = cropData.data;

      const corners = [[0, 0], [sw - 1, 0], [0, sh - 1], [sw - 1, sh - 1]];
      const colorFreq: Record<string, number> = {};
      corners.forEach(([cx, cy]) => {
        const cp = (cy * sw + cx) * 4;
        const key = `${pixels[cp]},${pixels[cp + 1]},${pixels[cp + 2]}`;
        colorFreq[key] = (colorFreq[key] || 0) + 1;
      });

      let dominantColor = "255,255,255";
      let maxF = 0;
      for (const key in colorFreq) {
        if (colorFreq[key] > maxF) {
          maxF = colorFreq[key];
          dominantColor = key;
        }
      }

      const [bgR, bgG, bgB] = dominantColor.split(",").map(Number);
      const luminance = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
      if (luminance > 220 || luminance < 35) {
        for (let p = 0; p < pixels.length; p += 4) {
          const rVal = pixels[p], gVal = pixels[p + 1], bVal = pixels[p + 2];
          if (Math.abs(rVal - bgR) + Math.abs(gVal - bgG) + Math.abs(bVal - bgB) < 45) {
            pixels[p + 3] = 0;
          }
        }
        tempCtx.putImageData(cropData, 0, 0);
      }
    }

    const scale = Math.min((resolution * 0.9) / sw, (resolution * 0.9) / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    const dx = (resolution - dw) / 2;
    const dy2 = (resolution - dh) / 2;
    outCtx.drawImage(tempCanvas, 0, 0, sw, sh, dx, dy2, dw, dh);

    const id = i + 1;
    const paddedId = id.toString().padStart(2, "0");
    const resLabel = options.upscale ? "2K" : "HD";

    const svgString = ImageTracer.getSVGString(
      tempCtx.getImageData(0, 0, sw, sh),
      { ltres: 0.1, qtres: 1, pathomit: 8, colorsampling: 1, numberofcolors: 2, mincolorratio: 0.5 }
    );

    return {
      id,
      dataUrl: outCanvas.toDataURL("image/png"),
      svgContent: svgString,
      name: `GRIDXD_${proj}_${paddedId}_${resLabel}_${today}.png`,
    };
  });
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────
export function useImageProcessor() {
  const [state, setState] = useState<ProcessingState>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [icons, setIcons] = useState<ExtractedIcon[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usedBackend, setUsedBackend] = useState(false);

  // Editing state
  const [detectedRegions, setDetectedRegions] = useState<Region[]>([]);
  const [pendingImgEl, setPendingImgEl] = useState<HTMLImageElement | null>(null);
  const [pendingOptions, setPendingOptions] = useState<ProcessingOptions | null>(null);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(DEFAULT_VISUAL_STYLE);

  // Options
  const [removeBackground, setRemoveBackground] = useState(true);
  const [upscale, setUpscale] = useState(true);
  const [projectName, setProjectName] = useState("");

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

  // ─── Confirm edited regions and proceed to extraction ─────────────────────
  const confirmRegions = useCallback(
    async (editedRegions: Region[]) => {
      if (!pendingImgEl || !pendingOptions) return;
      if (editedRegions.length === 0) {
        setError("Debes mantener al menos una región.");
        return;
      }

      try {
        if (pendingOptions.removeBackground) {
          setState("removing-bg");
          await delay(400);
        }
        setState("vectorizing");
        await delay(300);
        setState("generating");

        const extracted = await extractIconsFromRegions(
          pendingImgEl,
          editedRegions,
          pendingOptions
        );

        setState("done");
        setIcons(extracted);
        await incrementUsage();
      } catch (err) {
        logger.error("Extraction error:", err);
        setError("Error al extraer los iconos. Intenta de nuevo.");
        setState("idle");
      }
    },
    [pendingImgEl, pendingOptions]
  );

  const processClientSide = useCallback(
    async (file: File, options: ProcessingOptions) => {
      setState("uploading");
      await delay(400);
      setState("detecting");

      // Kick off style extraction in parallel with image loading (never throws, always returns style)
      const stylePromise = extractStyleFromBackend(file);

      const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });

      await delay(300);

      const regions = await detectRegionsViaWorker(imgEl);

      // Always resolves to a VisualStyle (fallback if backend offline)
      const style = await stylePromise;
      setVisualStyle(style);

      setPendingImgEl(imgEl);
      setPendingOptions(options);
      setDetectedRegions(regions);
      setState("editing");
    },
    []
  );

  // ─── Main entry point ──────────────────────────────────────────────────────
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
      setUsedBackend(false);

      // Simple mode: if only one file, we can show preview and editor
      if (validFiles.length === 1) {
        const file = validFiles[0];
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

        const strategy = getProcessingStrategy(planInfo);
        if (strategy === "backend") {
          try {
            setState("uploading");
            const result = await processImageBackend(file, options);
            setUsedBackend(true);
            setState("done");
            setIcons(result.images.map((img, i) => ({
              id: i + 1,
              dataUrl: img.url,
              svgContent: "",
              name: img.name
            })));
            await incrementUsage();
          } catch (err) {
            await processClientSide(file, options);
          }
        } else {
          await processClientSide(file, options);
        }
        return;
      }

      // Batch Mode (Multiple Files)
      const batchPlanInfo = await getUserPlan();
      if (batchPlanInfo.plan === "free" && batchPlanInfo.remainingFreeUses <= 0) {
        setError("Has agotado tus usos gratuitos de hoy.");
        setState("idle");
        return;
      }

      setState("uploading");
      let allExtracted: ExtractedIcon[] = [];
      
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const options: ProcessingOptions = {
          removeBackground,
          upscale,
          projectName: `${projectName || "Batch"}_${i+1}`,
        };

        try {
          // In batch mode we skip the editor for now and use auto-detection
          const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
          });

          // Use worker for batch too
          const regions = await detectRegionsViaWorker(imgEl);
          const extracted = await extractIconsFromRegions(imgEl, regions, options);
          
          allExtracted = [...allExtracted, ...extracted.map((icon, idx) => ({
            ...icon,
            id: allExtracted.length + idx + 1
          }))];
          
          setIcons([...allExtracted]);
          setPreview(URL.createObjectURL(file)); // Show current file as preview
        } catch (err) {
          logger.error(`Error processing batch file ${file.name}:`, err);
        }
      }
      
      setState("done");
      await incrementUsage();
    },
    [removeBackground, upscale, projectName, processClientSide]
  );

  const reset = () => {
    setState("idle");
    setPreview(null);
    setIcons([]);
    setError(null);
    setUsedBackend(false);
    setDetectedRegions([]);
    setPendingImgEl(null);
    setPendingOptions(null);
    setVisualStyle(DEFAULT_VISUAL_STYLE);
  };

  const injectGeneratedIcon = useCallback((svgContent: string, conceptName: string) => {
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const resLabel = upscale ? "2K" : "HD";
    
    setIcons(prev => {
      const newId = prev.length + 1;
      const newIcon: ExtractedIcon = {
        id: newId,
        dataUrl: "", // Should handle this if we need a preview, but for now we rely on svg
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
    error,
    usedBackend,
    visualStyle,
    processImages,
    reset,
    injectGeneratedIcon,
    // Editor
    detectedRegions,
    confirmRegions,
    pendingImgEl,
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
