import { VisualStyle } from "@/lib/api";
import { Sparkles } from "lucide-react";

interface StyleCardProps {
  style: VisualStyle;
  className?: string;
}

const MOOD_EMOJI: Record<string, string> = {
  minimal: "⬜",
  playful: "🎨",
  corporate: "🏢",
  luxury: "💎",
  techno: "⚡",
};

const CORNER_LABEL: Record<string, string> = {
  sharp: "Sharp",
  soft: "Soft",
  rounded: "Rounded",
};

const STYLE_LABEL: Record<string, string> = {
  outline: "Outline",
  filled: "Filled",
  duotone: "Duotone",
};

const WEIGHT_LABEL: Record<string, string> = {
  light: "Light",
  regular: "Regular",
  bold: "Bold",
};

export function StyleCard({ style, className = "" }: StyleCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg ${className}`}
      style={{ borderColor: `${style.color_accent}30` }}
    >
      {/* Ambient glow from primary color */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(ellipse at top left, ${style.color_primary}, transparent 70%)`,
        }}
      />

      {/* Header */}
      <div className="relative flex items-center gap-3 border-b border-border/40 px-5 py-4">
        <Sparkles className="h-4 w-4 shrink-0" style={{ color: style.color_accent }} />
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
            Visual DNA · Gemini Vision
          </p>
          <p className="text-sm font-semibold text-foreground leading-tight mt-0.5">
            {style.notes}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="relative grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-3 md:grid-cols-4">
        {/* Color Palette */}
        <div className="col-span-2 sm:col-span-3 md:col-span-4">
          <p className="mb-2 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            Paleta de Color
          </p>
          <div className="flex items-center gap-2">
            {[
              { color: style.color_primary, label: "Primary" },
              { color: style.color_secondary, label: "Secondary" },
              { color: style.color_accent, label: "Accent" },
              { color: style.color_bg, label: "BG" },
            ].map(({ color, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div
                  className="h-8 w-8 rounded-lg border border-border/40 shadow-sm transition-transform hover:scale-110"
                  style={{ background: color }}
                  title={color}
                />
                <span className="text-[9px] font-mono text-muted-foreground">{label}</span>
              </div>
            ))}
            {/* Hex values */}
            <div className="ml-auto flex flex-col gap-0.5 text-right">
              <span className="font-mono text-[10px] text-muted-foreground">{style.color_primary}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{style.color_accent}</span>
            </div>
          </div>
        </div>

        {/* Style */}
        <Pill label="Estilo" value={STYLE_LABEL[style.style] ?? style.style} accent={style.color_accent} />

        {/* Stroke Width */}
        <Pill label="Stroke" value={`${style.stroke_width}px`} accent={style.color_accent} />

        {/* Corner Radius */}
        <Pill
          label="Esquinas"
          value={CORNER_LABEL[style.corner_radius] ?? style.corner_radius}
          accent={style.color_accent}
        />

        {/* Mood */}
        <Pill
          label="Mood"
          value={`${MOOD_EMOJI[style.mood] ?? ""} ${style.mood}`}
          accent={style.color_accent}
        />

        {/* Complexity */}
        <Pill label="Complejidad" value={style.complexity} accent={style.color_accent} />

        {/* Visual Weight */}
        <Pill
          label="Peso Visual"
          value={WEIGHT_LABEL[style.visual_weight] ?? style.visual_weight}
          accent={style.color_accent}
        />

        {/* Grid Size */}
        <Pill label="Grid" value={`${style.grid_size}×${style.grid_size}`} accent={style.color_accent} />
      </div>

      {/* Footer badge */}
      <div className="relative flex items-center justify-between border-t border-border/40 px-5 py-2.5">
        <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">
          Análisis IA aplicado al pack de iconos
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{
            background: `${style.color_accent}20`,
            color: style.color_accent,
            border: `1px solid ${style.color_accent}40`,
          }}
        >
          {style.style}
        </span>
      </div>
    </div>
  );
}

// ─── Internal helper ──────────────────────────────────────────────────────────
function Pill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">
        {label}
      </span>
      <span
        className="rounded-md px-2 py-1 text-xs font-semibold capitalize"
        style={{
          background: `${accent}15`,
          color: accent,
          border: `1px solid ${accent}25`,
        }}
      >
        {value}
      </span>
    </div>
  );
}
