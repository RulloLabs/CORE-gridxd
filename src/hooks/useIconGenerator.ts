import { useState, useCallback } from "react";
import { extractStyleFromBackend, generateIconSVG, VisualStyle } from "@/lib/api";
import { logger } from "@/lib/logger";
import { applyStyleToSvg, type SvgStyle } from "@/lib/svgStyle";
import { downloadGeneratorPack } from "@/lib/zip-utils";
import { 
  Home, User, Settings, Search, Menu, ArrowLeft, 
  Check, AlertTriangle, Bell, Trash, Plus, Download,
  Phone, Mail, Calendar, MapPin, Heart, Star,
  Eye, MessageSquare, Upload, Lock, ShoppingCart, FileText,
  ExternalLink, Share, Edit, Copy, Save, Filter, LogOut, LogIn,
  UserPlus, UserMinus, Camera, Image, Video, Music, Mic, Volume2,
  Cloud, Wind, Sun, Moon, Map, Navigation, Briefcase, GraduationCap,
  type LucideIcon 
} from "lucide-react";

export type GeneratedIcon = {
  id: string;
  name: string;
  icon: LucideIcon;
  svgContent?: string;
};

const CORE_ICONS: GeneratedIcon[] = [
  { id: "home", name: "icon-home.svg", icon: Home },
  { id: "user", name: "icon-user.svg", icon: User },
  { id: "settings", name: "icon-settings.svg", icon: Settings },
  { id: "search", name: "icon-search.svg", icon: Search },
  { id: "menu", name: "icon-menu.svg", icon: Menu },
  { id: "back", name: "icon-back.svg", icon: ArrowLeft },
  { id: "check", name: "icon-check.svg", icon: Check },
  { id: "warning", name: "icon-warning.svg", icon: AlertTriangle },
  // 8 Icons
  { id: "notif", name: "icon-bell.svg", icon: Bell },
  { id: "delete", name: "icon-trash.svg", icon: Trash },
  { id: "add", name: "icon-plus.svg", icon: Plus },
  { id: "download", name: "icon-download.svg", icon: Download },
  { id: "phone", name: "icon-phone.svg", icon: Phone },
  { id: "mail", name: "icon-mail.svg", icon: Mail },
  { id: "calendar", name: "icon-calendar.svg", icon: Calendar },
  { id: "pin", name: "icon-pin.svg", icon: MapPin },
  { id: "heart", name: "icon-heart.svg", icon: Heart },
  { id: "star", name: "icon-star.svg", icon: Star },
  { id: "eye", name: "icon-eye.svg", icon: Eye },
  { id: "chat", name: "icon-chat.svg", icon: MessageSquare },
  { id: "upload", name: "icon-upload.svg", icon: Upload },
  { id: "lock", name: "icon-lock.svg", icon: Lock },
  { id: "cart", name: "icon-cart.svg", icon: ShoppingCart },
  { id: "file", name: "icon-file.svg", icon: FileText },
  // 24 Icons
  { id: "external", name: "icon-external.svg", icon: ExternalLink },
  { id: "share", name: "icon-share.svg", icon: Share },
  { id: "edit", name: "icon-edit.svg", icon: Edit },
  { id: "copy", name: "icon-copy.svg", icon: Copy },
  { id: "save", name: "icon-save.svg", icon: Save },
  { id: "filter", name: "icon-filter.svg", icon: Filter },
  { id: "logout", name: "icon-logout.svg", icon: LogOut },
  { id: "login", name: "icon-login.svg", icon: LogIn },
  { id: "userplus", name: "icon-user-plus.svg", icon: UserPlus },
  { id: "userminus", name: "icon-user-minus.svg", icon: UserMinus },
  { id: "camera", name: "icon-camera.svg", icon: Camera },
  { id: "image", name: "icon-image.svg", icon: Image },
  { id: "video", name: "icon-video.svg", icon: Video },
  { id: "music", name: "icon-music.svg", icon: Music },
  { id: "mic", name: "icon-mic.svg", icon: Mic },
  { id: "volume", name: "icon-volume.svg", icon: Volume2 },
  { id: "cloud", name: "icon-cloud.svg", icon: Cloud },
  { id: "wind", name: "icon-wind.svg", icon: Wind },
  { id: "sun", name: "icon-sun.svg", icon: Sun },
  { id: "moon", name: "icon-moon.svg", icon: Moon },
  { id: "map", name: "icon-map.svg", icon: Map },
  { id: "navigation", name: "icon-navigation.svg", icon: Navigation },
  { id: "briefcase", name: "icon-briefcase.svg", icon: Briefcase },
  { id: "graduation", name: "icon-graduation.svg", icon: GraduationCap },
  // 48 Icons
];

export type GeneratorState = "idle" | "analyzing" | "generating" | "done" | "error";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function useIconGenerator() {
  const [state, setState] = useState<GeneratorState>("idle");
  const [visualStyle, setVisualStyle] = useState<VisualStyle | null>(null);
  const [generatedIcons, setGeneratedIcons] = useState<GeneratedIcon[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeStyle, setActiveStyle] = useState<SvgStyle>("outline");
  const [packSize, setPackSize] = useState<number>(24);

  const generateSystem = useCallback(async (referenceFile: File, variant: string = "outline", size: number = 24) => {
    try {
      setError(null);
      setGeneratedIcons([]);
      setState("analyzing");
      setPackSize(size);
      
      // 1. Extract Visual DNA — always returns a style (fallback if backend offline)
      const style = await extractStyleFromBackend(referenceFile);
      setVisualStyle(style);
      await delay(1500);

      setState("generating");

      // 2. Parallel generation in batches of 5
      const selectedIcons = CORE_ICONS.slice(0, size);
      const systemIcons: GeneratedIcon[] = new Array(selectedIcons.length);
      const BATCH_SIZE = 5;

      for (let batchStart = 0; batchStart < selectedIcons.length; batchStart += BATCH_SIZE) {
        const batch = selectedIcons.slice(batchStart, batchStart + BATCH_SIZE);

        const results = await Promise.allSettled(
          batch.map((baseIcon) => generateIconSVG(baseIcon.id, style, variant))
        );

        results.forEach((result, i) => {
          const globalIdx = batchStart + i;
          const baseIcon = batch[i];
          if (result.status === "fulfilled") {
            systemIcons[globalIdx] = { ...baseIcon, svgContent: result.value || undefined };
          } else {
            logger.error(`Error generating ${baseIcon.id}:`, result.reason);
            systemIcons[globalIdx] = baseIcon; // Fallback to Lucide icon
          }
        });

        setGeneratedIcons([...systemIcons.filter(Boolean)]);

        if (batchStart + BATCH_SIZE < selectedIcons.length) {
          await delay(800);
        }
      }

      setState("done");
    } catch (err) {
      logger.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "Error al generar el sistema.");
      setState("error");
    }
  }, []);

  const reset = () => {
    setState("idle");
    setVisualStyle(null);
    setGeneratedIcons([]);
    setError(null);
  };

  const downloadPack = async (projectName: string = "gridxd-system", style: SvgStyle = "outline", allStyles: boolean = false) => {
    if (!visualStyle) return;

    // Normalize empty name — always produce a valid filename
    const safeName = projectName.trim() || "GridXD_System";

    try {
      const exportStyles: SvgStyle[] = allStyles ? ["outline", "filled", "duotone"] : [style];

      await downloadGeneratorPack(generatedIcons, visualStyle, {
        projectName: safeName,
        exportStyles,
        compress: true
      });
    } catch (err) {
      console.error("Download error:", err);
      setError("No se pudo generar el archivo de descarga.");
    }
  };

  return {
    state,
    visualStyle,
    generatedIcons,
    error,
    activeStyle,
    setActiveStyle,
    packSize,
    setPackSize,
    generateSystem,
    reset,
    downloadPack,
  };
}
