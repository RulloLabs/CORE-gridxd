/**
 * GridXD API Service
 * 
 * Handles communication with the external Python backend (Railway/Render).
 * Falls back to client-side Canvas processing for free users.
 */

// Configure this with your deployed backend URL
const API_BASE_URL = import.meta.env.VITE_GRIDXD_API_URL || "";

export interface ProcessingOptions {
  removeBackground: boolean;
  upscale: boolean;
  projectName?: string;
}

// ── Visual Style DNA returned by Gemini Vision ──────────────────────────────
export interface VisualStyle {
  style: "outline" | "filled" | "duotone";
  stroke_width: number;
  corner_radius: "sharp" | "soft" | "rounded";
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  color_bg: string;
  mood: "minimal" | "playful" | "corporate" | "luxury" | "techno";
  complexity: "simple" | "medium" | "detailed";
  grid_size: number;
  visual_weight: "light" | "regular" | "bold";
  notes: string;
}

export interface ProcessedResult {
  zipUrl: string;
  images: { url: string; name: string }[];
  visualStyle?: VisualStyle;
}

export interface UserTier {
  tier: "free" | "pro" | "proplus";
  remainingFreeUses: number;
}

/**
 * Check if a real backend is configured and available
 */
export function isBackendConfigured(): boolean {
  return !!API_BASE_URL;
}

/**
 * Perform a real health check against the backend
 */
export async function checkBackendHealth(): Promise<boolean> {
  if (!API_BASE_URL) {
    console.warn("API_BASE_URL no está configurada.");
    return false;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    console.log(`Verificando salud del backend en: ${API_BASE_URL}/health`);
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: "GET",
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.error(`Backend respondió con error: ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    console.log("Backend operativo:", data);
    return true;
  } catch (err) {
    console.error("No se pudo conectar con el backend de Railway. Verifica la URL y las variables de entorno:", err);
    return false;
  }
}

/**
 * Process image via the real Python backend (OpenCV + rembg)
 * Only available for Pro users when backend is deployed
 */
export async function processImageBackend(file: File, options: ProcessingOptions): Promise<ProcessedResult> {
  if (!API_BASE_URL) {
    throw new Error("Backend no configurado. Configura VITE_GRIDXD_API_URL.");
  }

  const formData = new FormData();
  formData.append("image", file);
  formData.append("remove_background", String(options.removeBackground));
  formData.append("upscale", String(options.upscale));
  
  if (options.projectName) {
    formData.append("project_name", options.projectName);
  }
  
  // 🧠 PROMPT MAESTRO (Strict Output Quality Rules for the AI Generator on Railway)
  const systemPrompt = `You are a senior product designer specialized in creating premium icon systems like Apple SF Symbols, Linear Icons, and modern SaaS design systems.

Generate a cohesive icon pack based on the user input.

GLOBAL DESIGN SYSTEM RULES (MANDATORY):
- 24x24 grid for all icons
- Optical centering (not mathematical centering)
- Consistent visual weight across all icons
- 2px stroke width for outline style (never vary)
- Rounded line caps and rounded joins
- Minimal, modern, SaaS-grade design
- No gradients, no shadows, no textures
- No 3D effects
- No decorative elements
- No background elements
- No mixed styles under any condition

PACK COHERENCE RULES:
- All icons must belong to the same visual family
- Same level of detail across entire set
- Same stroke behavior and corner radius logic
- Consistent geometry language across all icons
- Treat the output as a single design system, not independent icons

COMPOSITION RULES:
- Center each icon visually within the canvas
- Occupy ~80% of available space
- Maintain clear silhouette readability at small sizes
- Prioritize simplicity and instant recognition

OUTPUT QUALITY RULE:
The result must look like a professional icon set ready to be sold in a design marketplace or used in a SaaS product UI. Ensure the icon set feels like it was designed by a single senior product designer in a top-tier SaaS company.

FAIL CONDITIONS (DO NOT DO):
- inconsistent styles between icons
- overly complex shapes
- random artistic variations
- mixed filled + outline styles
- low readability at small scale`;

  formData.append("system_prompt", systemPrompt);

  const response = await fetch(`${API_BASE_URL}/process-image`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Error del servidor de Railway" })) as { detail?: string };
    throw new Error(errorData.detail || `Error ${response.status}`);
  }

  const result = await response.json();
  
  // Prepend API_BASE_URL to absolute paths returned by the backend
  if (result.zipUrl && result.zipUrl.startsWith("/")) {
    result.zipUrl = `${API_BASE_URL}${result.zipUrl}`;
  }
  
  if (result.images) {
    result.images = result.images.map((img: any) => ({
      ...img,
      url: img.url.startsWith("/") ? `${API_BASE_URL}${img.url}` : img.url
    }));
  }

  return result;
}



/**
 * Get current user tier info
 * For now returns free tier; will integrate with auth + Stripe later
 */
export function getUserTier(): UserTier {
  // TODO: Replace with real auth + subscription check
  const dailyUses = parseInt(localStorage.getItem("gridxd_daily_uses") || "0", 10);
  const lastUseDate = localStorage.getItem("gridxd_last_use_date") || "";
  const today = new Date().toISOString().split("T")[0];

  if (lastUseDate !== today) {
    localStorage.setItem("gridxd_daily_uses", "0");
    localStorage.setItem("gridxd_last_use_date", today);
    return { tier: "free", remainingFreeUses: 3 };
  }

  return { tier: "free", remainingFreeUses: Math.max(0, 3 - dailyUses) };
}

/**
 * Increment daily usage counter for free tier
 */
export function incrementUsage(): void {
  const today = new Date().toISOString().split("T")[0];
  const lastUseDate = localStorage.getItem("gridxd_last_use_date") || "";
  
  if (lastUseDate !== today) {
    localStorage.setItem("gridxd_daily_uses", "1");
    localStorage.setItem("gridxd_last_use_date", today);
  } else {
    const current = parseInt(localStorage.getItem("gridxd_daily_uses") || "0", 10);
    localStorage.setItem("gridxd_daily_uses", String(current + 1));
  }
}

/**
 * Determine processing strategy based on user tier and backend availability
 */
export function getProcessingStrategy(tier: UserTier): "client" | "backend" {
  if (tier.tier === "free") return "client";
  if (!isBackendConfigured()) return "client";
  return "backend";
}

/**
 * Call the backend /extract-style endpoint.
 * Sends the image and receives the visual DNA (Gemini Vision analysis).
 * Available to all users — the backend falls back to defaults if no API key.
 */
export async function extractStyleFromBackend(file: File): Promise<VisualStyle | null> {
  if (!API_BASE_URL) return null;

  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_BASE_URL}/extract-style`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.warn("Backend response for style extraction was not OK:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("Style extraction data received:", data);
    
    // Support both {style: {...}} and raw style object
    const style = data?.style || data;
    
    // Validate that it looks like a VisualStyle
    if (style && typeof style === 'object' && 'stroke_width' in style) {
      return style as VisualStyle;
    }
    
    console.error("Invalid style format received:", data);
    return null;
  } catch (err) {
    console.error("Error in extractStyleFromBackend:", err);
    return null;
  }
}

export async function generateIconSVG(
  iconName: string, 
  dna: VisualStyle,
  variant: string = "outline"
): Promise<string | null> {
  if (!API_BASE_URL) return null;

  try {
    const formData = new FormData();
    formData.append("icon_name", iconName);
    formData.append("dna", JSON.stringify(dna));
    formData.append("variant", variant);

    const response = await fetch(`${API_BASE_URL}/generate-icon`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Icon generation backend error:", response.status, errData);
      return null;
    }

    const data = await response.json();
    return (data?.svg as string) || (typeof data === 'string' ? data : null);
  } catch (err) {
    console.error("Icon generation error:", err);
    return null;
  }
}
