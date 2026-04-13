import { useState } from "react";
import { 
  Plus, Home, User, Settings, Search, Menu, 
  ArrowLeft, Check, AlertTriangle, Bell, Trash, 
  Download, Sparkles, Loader2, Phone, Mail,
  Calendar, MapPin, Heart, Star, Eye, MessageSquare,
  Upload, Lock, ShoppingCart, FileText,
  type LucideIcon 
} from "lucide-react";
import { generateIconSVG, VisualStyle } from "@/lib/api";

interface SidebarIconGeneratorProps {
  visualStyle: VisualStyle;
  onIconGenerated: (svg: string, name: string) => void;
}

const GENERATABLE_ICONS = [
  { id: "home", name: "Home", icon: Home },
  { id: "user", name: "User", icon: User },
  { id: "settings", name: "Settings", icon: Settings },
  { id: "search", name: "Search", icon: Search },
  { id: "menu", name: "Menu", icon: Menu },
  { id: "back", name: "Back", icon: ArrowLeft },
  { id: "check", name: "Check", icon: Check },
  { id: "warning", name: "Warning", icon: AlertTriangle },
  { id: "bell", name: "Notification", icon: Bell },
  { id: "trash", name: "Delete", icon: Trash },
  { id: "plus", name: "Add", icon: Plus },
  { id: "download", name: "Download", icon: Download },
  { id: "phone", name: "Phone", icon: Phone },
  { id: "mail", name: "Email", icon: Mail },
  { id: "calendar", name: "Calendar", icon: Calendar },
  { id: "pin", name: "Location", icon: MapPin },
  { id: "heart", name: "Like", icon: Heart },
  { id: "star", name: "Rate", icon: Star },
  { id: "eye", name: "Show", icon: Eye },
  { id: "chat", name: "Chat", icon: MessageSquare },
  { id: "upload", name: "Upload", icon: Upload },
  { id: "lock", name: "Secure", icon: Lock },
  { id: "cart", name: "Cart", icon: ShoppingCart },
  { id: "file", name: "Doc", icon: FileText },
];

export const SidebarIconGenerator = ({ visualStyle, onIconGenerated }: SidebarIconGeneratorProps) => {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>("outline");

  const handleGenerate = async (iconId: string, iconName: string) => {
    if (generatingId) return;
    
    setGeneratingId(iconId);
    try {
      const svg = await generateIconSVG(iconId, visualStyle, selectedVariant);
      if (svg) {
        onIconGenerated(svg, iconId);
      }
    } catch (err) {
      console.error("Manual generation failed:", err);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="w-full md:w-64 bg-card border border-border rounded-2xl overflow-hidden shadow-xl flex flex-col h-fit animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="p-4 bg-muted/50 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-bold text-foreground">Generador IA</h3>
        </div>
      </div>
      
      <div className="p-4 space-y-5">
        {/* Style Selector */}
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Variante de Estilo</p>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/50">
            {["outline", "filled", "duotone"].map((v) => (
              <button
                key={v}
                onClick={() => setSelectedVariant(v)}
                className={`px-2 py-1.5 text-[10px] rounded-lg font-bold capitalize transition-all ${
                  selectedVariant === v 
                    ? "bg-background text-primary shadow-sm border border-border" 
                    : "text-muted-foreground hover:text-foreground hover:bg-background/20"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          Inyectar en el Pack
        </p>
        
        <div className="grid grid-cols-3 gap-2">
          {GENERATABLE_ICONS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleGenerate(item.id, item.name)}
              disabled={!!generatingId}
              className={`group flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                generatingId === item.id 
                  ? "bg-primary/10 border-primary/50" 
                  : "bg-muted/30 border-border/50 hover:bg-primary/5 hover:border-primary/20"
              }`}
            >
              <div className="relative">
                {generatingId === item.id ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
              <span className="text-[9px] mt-1.5 text-muted-foreground font-medium">{item.name}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-[10px] text-primary/80 leading-relaxed italic">
            "Estos iconos se generarán siguiendo el ADN visual detectado automáticamente."
          </p>
        </div>
      </div>
    </div>
  );
};
