/**
 * GridXD API Service v2
 *
 * - All protected endpoints now send the Supabase JWT in Authorization header
 * - Typed with Zod schemas for backend responses
 * - Console.* replaced with conditional logger
 * - Rate limiting moved to backend (localStorage check is now secondary UX-only)
 */
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

const API_BASE_URL = import.meta.env.VITE_GRIDXD_API_URL || "";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────
export const VisualStyleSchema = z.object({
  style: z.enum(["outline", "filled", "duotone"]),
  stroke_width: z.number(),
  corner_radius: z.enum(["sharp", "soft", "rounded"]),
  color_primary: z.string(),
  color_secondary: z.string(),
  color_accent: z.string(),
  color_bg: z.string(),
  mood: z.enum(["minimal", "playful", "corporate", "luxury", "techno"]),
  complexity: z.enum(["simple", "medium", "detailed"]),
  grid_size: z.number(),
  visual_weight: z.enum(["light", "regular", "bold"]),
  notes: z.string(),
});

export type VisualStyle = z.infer<typeof VisualStyleSchema>;

const BackendImageSchema = z.object({
  url: z.string(),
  name: z.string(),
});

const ProcessedResultSchema = z.object({
  zipUrl: z.string(),
  images: z.array(BackendImageSchema),
  visualStyle: VisualStyleSchema.optional(),
});

export type ProcessingOptions = {
  removeBackground: boolean;
  upscale: boolean;
  projectName?: string;
};

export type ProcessedResult = z.infer<typeof ProcessedResultSchema>;

export interface UserPlanInfo {
  plan: "free" | "pro" | "proplus";
  remainingFreeUses: number;
}

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// ─── Backend health (public — no auth) ───────────────────────────────────────
export function isBackendConfigured(): boolean {
  return !!API_BASE_URL;
}

export async function checkBackendHealth(): Promise<boolean> {
  if (!API_BASE_URL) {
    logger.warn("API_BASE_URL not configured.");
    return false;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    logger.log(`Checking backend health at: ${API_BASE_URL}/health`);
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      logger.error(`Backend responded with error: ${response.status}`);
      return false;
    }
    const data = await response.json();
    logger.log("Backend operational:", data);
    return true;
  } catch (err) {
    logger.error("Could not connect to backend server:", err);
    return false;
  }
}

// ─── Process Image (PROTECTED) ────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior product designer specialized in creating premium icon systems like Apple SF Symbols, Linear Icons, and modern SaaS design systems.
Generate a cohesive icon pack based on the user input.
GLOBAL DESIGN SYSTEM RULES (MANDATORY):
- 24x24 grid for all icons
- Optical centering (not mathematical centering)
- Consistent visual weight across all icons
- 2px stroke width for outline style (never vary)
- Rounded line caps and rounded joins
- Minimal, modern, SaaS-grade design
- No gradients, no shadows, no textures, no 3D effects, no decorative elements
PACK COHERENCE RULES:
- All icons must belong to the same visual family
- Same level of detail across entire set
- Treat the output as a single design system, not independent icons
OUTPUT QUALITY RULE:
The result must look like a professional icon set ready to be sold in a design marketplace.`;

export async function processImageBackend(
  file: File,
  options: ProcessingOptions
): Promise<ProcessedResult> {
  if (!API_BASE_URL) {
    throw new Error("Backend not configured. Set VITE_GRIDXD_API_URL.");
  }

  const authHeaders = await getAuthHeaders();
  const formData = new FormData();
  formData.append("image", file);
  formData.append("remove_background", String(options.removeBackground));
  formData.append("upscale", String(options.upscale));
  if (options.projectName) formData.append("project_name", options.projectName);
  formData.append("system_prompt", SYSTEM_PROMPT);

  const response = await fetch(`${API_BASE_URL}/process-image`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Backend server error" })) as { detail?: string };
    throw new Error(errorData.detail || `Error ${response.status}`);
  }

  const raw = await response.json();

  // Prepend API_BASE_URL to relative paths
  if (raw.zipUrl?.startsWith("/")) raw.zipUrl = `${API_BASE_URL}${raw.zipUrl}`;
  if (raw.images) {
    raw.images = raw.images.map((img: { url: string; name: string }) => ({
      ...img,
      url: img.url.startsWith("/") ? `${API_BASE_URL}${img.url}` : img.url,
    }));
  }

  return ProcessedResultSchema.parse(raw);
}

// ─── Default VisualStyle fallback (used when backend is unavailable) ──────────
export const DEFAULT_VISUAL_STYLE: VisualStyle = {
  style: "outline",
  stroke_width: 2,
  corner_radius: "rounded",
  color_primary: "#7c3aed",
  color_secondary: "#a78bfa",
  color_accent: "#06b6d4",
  color_bg: "#0f0f0f",
  mood: "minimal",
  complexity: "simple",
  grid_size: 24,
  visual_weight: "regular",
  notes: "Estilo base generado automáticamente.",
};

// ─── Extract Style (PROTECTED) ────────────────────────────────────────────────
export async function extractStyleFromBackend(
  file: File
): Promise<VisualStyle> {
  // Generate a color hint from the file name for a slightly personalised fallback
  const seed = file.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = seed % 360;
  const fallback: VisualStyle = {
    ...DEFAULT_VISUAL_STYLE,
    color_primary: `hsl(${hue}, 70%, 55%)`,
    color_secondary: `hsl(${(hue + 30) % 360}, 60%, 65%)`,
    color_accent: `hsl(${(hue + 180) % 360}, 80%, 50%)`,
    notes: `Estilo generado a partir de: ${file.name}`,
  };

  if (!API_BASE_URL) return fallback;

  try {
    const authHeaders = await getAuthHeaders();
    const formData = new FormData();
    formData.append("image", file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_BASE_URL}/extract-style`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn("Style extraction backend error:", response.status, "— using fallback");
      return fallback;
    }

    const data = await response.json();
    logger.log("Style extraction received:", data);

    const styleRaw = data?.style || data;
    const parsed = VisualStyleSchema.safeParse(styleRaw);
    if (!parsed.success) {
      logger.error("Invalid style format:", parsed.error, "— using fallback");
      return fallback;
    }
    return parsed.data;
  } catch (err) {
    logger.warn("extractStyleFromBackend failed — using fallback:", err);
    return fallback;
  }
}

// ─── Generate Icon SVG (PROTECTED) ───────────────────────────────────────────
export async function generateIconSVG(
  iconName: string,
  dna: VisualStyle,
  variant: string = "outline"
): Promise<string | null> {
  if (!API_BASE_URL) return null;
  try {
    const authHeaders = await getAuthHeaders();
    const formData = new FormData();
    formData.append("icon_name", iconName);
    formData.append("dna", JSON.stringify(dna));
    formData.append("variant", variant);

    // 20s timeout — prevents a single slow icon from blocking the whole batch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(`${API_BASE_URL}/generate-icon`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({})) as Record<string, unknown>;
      logger.error("Icon generation backend error:", response.status, errData);
      return null;
    }

    const data = await response.json() as { svg?: string };
    return data?.svg || (typeof data === "string" ? data : null);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      logger.warn(`generateIconSVG timeout for "${iconName}" — using Lucide fallback`);
    } else {
      logger.error("generateIconSVG error:", err);
    }
    return null;
  }
}

// ─── Rate limiting (Authenticated: Supabase / Anonymous: localStorage) ────────
export async function getUserPlan(): Promise<UserPlanInfo> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    try {
      // Fetch plan and usage from 'subscribers' table
      const { data, error } = await supabase
        .from('subscribers')
        .select('plan, daily_uses, last_reset_date')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows'
        logger.error("Error fetching user plan:", error);
      }

      const today = new Date().toISOString().split("T")[0];
      const plan = (data?.plan as "free" | "pro" | "proplus") || "free";
      
      let dailyUses = data?.daily_uses || 0;
      if (data?.last_reset_date && data.last_reset_date !== today) {
        dailyUses = 0;
      }

      const limit = plan === 'free' ? 3 : plan === 'pro' ? 100 : 999999;
      return { 
        plan, 
        remainingFreeUses: Math.max(0, limit - dailyUses) 
      };
    } catch (err) {
      logger.error("Failed to fetch user plan from DB:", err);
    }
  }

  // Fallback for anonymous or error
  const dailyUses = parseInt(localStorage.getItem("gridxd_daily_uses") || "0", 10);
  const lastUseDate = localStorage.getItem("gridxd_last_use_date") || "";
  const today = new Date().toISOString().split("T")[0];

  if (lastUseDate !== today) {
    localStorage.setItem("gridxd_daily_uses", "0");
    localStorage.setItem("gridxd_last_use_date", today);
    return { plan: "free", remainingFreeUses: 3 };
  }
  return { plan: "free", remainingFreeUses: Math.max(0, 3 - dailyUses) };
}

export async function incrementUsage(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    try {
      // Call the server-side RPC function we created in the migration
      const { data, error } = await supabase.rpc('check_and_increment_usage', {
        p_user_id: session.user.id
      });

      if (error) {
        logger.error("Error calling incrementUsage RPC:", error);
        return false;
      }
      return !!data; // Returns boolean from the SQL function
    } catch (err) {
      logger.error("RPC incrementUsage failed:", err);
      return false;
    }
  }

  // Fallback to localStorage for anonymous
  const today = new Date().toISOString().split("T")[0];
  const lastUseDate = localStorage.getItem("gridxd_last_use_date") || "";
  
  if (lastUseDate !== today) {
    localStorage.setItem("gridxd_daily_uses", "1");
    localStorage.setItem("gridxd_last_use_date", today);
  } else {
    const current = parseInt(localStorage.getItem("gridxd_daily_uses") || "0", 10);
    localStorage.setItem("gridxd_daily_uses", String(current + 1));
  }
  return true;
}


