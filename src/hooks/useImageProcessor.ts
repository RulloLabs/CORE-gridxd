import { useState, useCallback, useRef } from "react";
import {
  incrementUsage,
  getUserPlan,
  getProcessingStrategy,
  processImageBackend,
  extractStyleFromBackend,
  ProcessingOptions,
  VisualStyle,
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

  return new Promise((resolve) => {
    const worker = new Worker(
      new URL("../workers/regionDetector.worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (e: MessageEvent<{ regions: WorkerRegion[]; error: string | null }>) => {
      worker.terminate();
      if (e.data.error) {
        logger.error("Worker region detection error:", e.data.error);
        // Fallback: treat whole image as one region
        resolve([{ id: "region-0-fallback", minX: 0, minY: 0, maxX: canvas.width, maxY: canvas.height }]);
      } else {
        resolve(e.data.regions);
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      logger.error("Worker error:", err);
      resolve([{ id: "region-0-fallback", minX: 0, minY: 0, maxX: canvas.width, maxY: canvas.height }]);
    };
    worker.postMessage({ imageData, width: canvas.width, height: canvas.height });
  });
}

// ─── PHASE 1 fallback (kept for reference, no longer used on main thread) ─────
function detectRegionsFromCanvas(
  imgEl: HTMLImageElement
): Region[] {
  const canvas = document.createElement("canvas");
  canvas.width = imgEl.width;
  canvas.height = imgEl.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imgEl, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  const visited = new Uint8Array(width * height);
  const rawRegions: { minX: number; minY: number; maxX: number; maxY: number }[] = [];
  const minSize = Math.min(width, height) * 0.05;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const pi = idx * 4;
      const brightness = (data[pi] + data[pi + 1] + data[pi + 2]) / 3;
      if (brightness > 230 || brightness < 25) {
        visited[idx] = 1;
        continue;
      }

      const queue: { x: number; y: number }[] = [{ x, y }];
      let minX = x, minY = y, maxX = x, maxY = y;
      visited[idx] = 1;
      let count = 0;

      while (queue.length > 0 && count < 50000) {
        const p = queue.pop()!;
        count++;
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = p.x + dx, ny = p.y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (visited[ni]) continue;
          visited[ni] = 1;

          const npi = ni * 4;
          const nb = (data[npi] + data[npi + 1] + data[npi + 2]) / 3;
          if (nb > 230 || nb < 25) continue;
          queue.push({ x: nx, y: ny });
        }
      }

      const rw = maxX - minX;
      const rh = maxY - minY;
      if (count > 20) {
        rawRegions.push({ minX, minY, maxX, maxY });
      }
    }
  }

  // Merge nearby regions (crucial for logos made of separate letters)
  let changed = true;
  const mergeDist = Math.min(width, height) * 0.04; // 4% of shortest side, e.g., 40px on 1080p

  while (changed) {
    changed = false;
    for (let i = 0; i < rawRegions.length; i++) {
      for (let j = i + 1; j < rawRegions.length; j++) {
        const r1 = rawRegions[i];
        const r2 = rawRegions[j];

        // Check if overlaps or is nearby
        const isNearby =
          r1.minX < r2.maxX + mergeDist &&
          r1.maxX + mergeDist > r2.minX &&
          r1.minY < r2.maxY + mergeDist &&
          r1.maxY + mergeDist > r2.minY;

        if (isNearby) {
          // Merge r2 into r1
          rawRegions[i] = {
            minX: Math.min(r1.minX, r2.minX),
            minY: Math.min(r1.minY, r2.minY),
            maxX: Math.max(r1.maxX, r2.maxX),
            maxY: Math.max(r1.maxY, r2.maxY),
          };
          rawRegions.splice(j, 1);
          changed = true;
          break; // break inner loop and restart
        }
      }
      if (changed) break; 
    }
  }

  // Filter out the tiny noise that didn't merge into anything significant
  const finalRegions = rawRegions.filter(r => {
    const rw = r.maxX - r.minX;
    const rh = r.maxY - r.minY;
    // Keep it if it has at least some significant width or height
    return (rw > minSize * 0.5 && rh > minSize * 0.5) || (rw > minSize * 1.5) || (rh > minSize * 1.5);
  });

  // Fallback: grid split when nothing found
  if (finalRegions.length === 0) {
    const cols = Math.ceil(Math.sqrt(Math.max(1, Math.floor(width / 100))));
    const rows = cols;
    const cellW = width / cols;
    const cellH = height / rows;
    for (let r = 0; r < rows && finalRegions.length < 9; r++) {
      for (let c = 0; c < cols && finalRegions.length < 9; c++) {
        finalRegions.push({
          minX: Math.round(c * cellW),
          minY: Math.round(r * cellH),
          maxX: Math.round((c + 1) * cellW),
          maxY: Math.round((r + 1) * cellH),
        });
      }
    }
  }

  return finalRegions.slice(0, 20).map((r, i) => ({
    id: `region-${i}-${Date.now()}`,
    ...r,
  }));
}

// ─── PHASE 2: Extract icons from approved regions ────────────────────────────
async function extractIconsFromRegions(
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
  const [visualStyle, setVisualStyle] = useState<VisualStyle | null>(null);

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
    setVisualStyle(null);
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
