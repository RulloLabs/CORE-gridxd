import { useState, useRef, useCallback, useEffect } from "react";
import { Check, Trash2, RotateCcw, MousePointer, Sparkles } from "lucide-react";
import type { Region } from "@/hooks/useImageProcessor";

interface IconEditorProps {
  imgEl: HTMLImageElement;
  initialRegions: Region[];
  onConfirm: (regions: Region[]) => void;
  onCancel: () => void;
}

type DragAction = 
  | { type: 'draw'; startX: number; startY: number }
  | { type: 'move'; id: string;  startX: number; startY: number; origMinX: number; origMinY: number; origMaxX: number; origMaxY: number }
  | { type: 'resize-br'; id: string; origMaxX: number; origMaxY: number };

function generateId() {
  return `region-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

const IconEditor = ({ imgEl, initialRegions, onConfirm, onCancel }: IconEditorProps) => {
  const [regions, setRegions] = useState<Region[]>(initialRegions);
  const [action, setAction] = useState<DragAction | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState({ w: imgEl.naturalWidth, h: imgEl.naturalHeight });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [isRefining, setIsRefining] = useState(false);

  // Measure the displayed image dimensions
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDisplaySize({ w: rect.width, h: rect.height });
    };
    const observer = new ResizeObserver(measure);
    if (containerRef.current) {
      observer.observe(containerRef.current);
      measure();
    }
    return () => observer.disconnect();
  }, []);

  // Convert natural image px → display px
  const toDisplay = useCallback(
    (x: number, y: number) => ({
      x: (x / imgSize.w) * displaySize.w,
      y: (y / imgSize.h) * displaySize.h,
    }),
    [imgSize, displaySize]
  );

  // Convert display px → natural image px
  const toNatural = useCallback(
    (x: number, y: number) => ({
      x: (x / displaySize.w) * imgSize.w,
      y: (y / displaySize.h) * imgSize.h,
    }),
    [imgSize, displaySize]
  );

  const getEventPos = (e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    };
  };

  const refineOpticalAdjustment = useCallback(() => {
    setIsRefining(true);
    
    setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = imgEl.naturalWidth;
      canvas.height = imgEl.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(imgEl, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const refined = regions.map((r) => {
        let minX = r.maxX, minY = r.maxY, maxX = r.minX, maxY = r.minY;
        let found = false;

        // Iterate within the current region to find actual non-empty pixels
        for (let y = Math.floor(Math.max(0, r.minY)); y < Math.ceil(Math.min(canvas.height, r.maxY)); y++) {
          for (let x = Math.floor(Math.max(0, r.minX)); x < Math.ceil(Math.min(canvas.width, r.maxX)); x++) {
            const idx = (y * canvas.width + x) * 4;
            const aVal = data[idx + 3];
            const rVal = data[idx];
            const gVal = data[idx + 1];
            const bVal = data[idx + 2];
            
            // Brightness check for background (white/light or dark/black)
            const brightness = (rVal + gVal + bVal) / 3;
            // Un píxel se considera objetivo si no es totalmente opaco blanco/negro del fondo
            const isTarget = aVal > 30 && (brightness < 240 && brightness > 15);

            if (isTarget) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
              found = true;
            }
          }
        }

        if (!found) return r;

        // Content size
        const contentW = maxX - minX;
        const contentH = maxY - minY;

        if (contentW <= 0 || contentH <= 0) return r;

        // Maintain some squareness/aspect ratio and padding
        const size = Math.max(contentW, contentH);
        const padding = size * 0.15;
        const targetW = contentW + padding * 2;
        const targetH = contentH + padding * 2;
        
        const centerX = minX + contentW / 2;
        const centerY = minY + contentH / 2;

        return {
          ...r,
          minX: Math.max(0, Math.round(centerX - targetW / 2)),
          minY: Math.max(0, Math.round(centerY - targetH / 2)),
          maxX: Math.min(canvas.width, Math.round(centerX + targetW / 2)),
          maxY: Math.min(canvas.height, Math.round(centerY + targetH / 2)),
        };
      });

      // Filter out invalid regions (0 width/height) to prevent extraction errors
      const validRefined = refined.filter(r => r.maxX - r.minX > 5 && r.maxY - r.minY > 5);
      
      setRegions(validRefined);
      setIsRefining(false);
    }, 50);
  }, [regions, imgEl]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Si dimos click en un botón HTML (borrar todo, confirmar, etc) saltamos
    if ((e.target as HTMLElement).closest('[data-region-btn]')) return;
    
    // Si dimos click en algún overlay de svg que tenga accion
    const target = e.target as SVGElement;
    const actionType = target.getAttribute("data-action");
    const regionId = target.getAttribute("data-id");

    const { x, y } = getEventPos(e);

    if (actionType === "move" && regionId) {
      const region = regions.find(r => r.id === regionId);
      if (region) {
        setAction({ type: "move", id: regionId, startX: x, startY: y, origMinX: region.minX, origMinY: region.minY, origMaxX: region.maxX, origMaxY: region.maxY });
      }
      return;
    }

    if (actionType === "resize-br" && regionId) {
      const region = regions.find(r => r.id === regionId);
      if (region) {
        setAction({ type: "resize-br", id: regionId, origMaxX: region.maxX, origMaxY: region.maxY });
      }
      return;
    }

    // Default: Empieza a dibujar uno nuevo
    setAction({ type: 'draw', startX: x, startY: y });
    setDraft({ x, y, w: 0, h: 0 });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!action) return;
    const { x, y } = getEventPos(e);

    if (action.type === "draw") {
      const minX = Math.min(action.startX, x);
      const minY = Math.min(action.startY, y);
      const w = Math.abs(x - action.startX);
      const h = Math.abs(y - action.startY);
      setDraft({ x: minX, y: minY, w, h });
    } 
    else if (action.type === "move") {
      const dxDisplay = x - action.startX;
      const dyDisplay = y - action.startY;
      const dx = (dxDisplay / displaySize.w) * imgSize.w;
      const dy = (dyDisplay / displaySize.h) * imgSize.h;
      
      setRegions(prev => prev.map(r => {
        if (r.id === action.id) {
          const w = action.origMaxX - action.origMinX;
          const h = action.origMaxY - action.origMinY;
          // Constrain movement
          const newMinX = Math.max(0, Math.min(imgSize.w - w, action.origMinX + dx));
          const newMinY = Math.max(0, Math.min(imgSize.h - h, action.origMinY + dy));
          return {
            ...r,
            minX: newMinX,
            minY: newMinY,
            maxX: newMinX + w,
            maxY: newMinY + h
          };
        }
        return r;
      }));
    }
    else if (action.type === "resize-br") {
      setRegions(prev => prev.map(r => {
        if (r.id === action.id) {
          const pt = toNatural(Math.max(x, 0), Math.max(y, 0));
          // Minimum size 10x10 px
          const newMaxX = Math.max(r.minX + 10, pt.x);
          const newMaxY = Math.max(r.minY + 10, pt.y);
          return {
            ...r,
            maxX: newMaxX,
            maxY: newMaxY
          };
        }
        return r;
      }));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!action) return;

    if (action.type === "draw" && draft) {
      if (draft.w >= 10 && draft.h >= 10) {
        const topLeft = toNatural(draft.x, draft.y);
        const bottomRight = toNatural(draft.x + draft.w, draft.y + draft.h);

        setRegions((prev) => [
          ...prev,
          {
            id: generateId(),
            minX: Math.round(topLeft.x),
            minY: Math.round(topLeft.y),
            maxX: Math.round(bottomRight.x),
            maxY: Math.round(bottomRight.y),
          },
        ]);
      }
    }

    setAction(null);
    setDraft(null);
  };

  const deleteRegion = (id: string) => {
    setRegions((prev) => prev.filter((r) => r.id !== id));
    setHoveredId(null);
  };

  const handleConfirmClean = () => {
    // Evita pasar cajas rotas/negativas al servidor que causan fallos de cv2/extract
    const validRegions = regions.filter(r => r.maxX - r.minX > 5 && r.maxY - r.minY > 5);
    onConfirm(validRegions);
  };

  return (
    <div className="rounded-2xl border border-primary/30 overflow-hidden shadow-2xl mb-8 bg-black/95">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-amber-400/80" />
            <div className="w-3 h-3 rounded-full bg-green-400/80" />
          </div>
          <span className="text-xs font-bold tracking-widest text-primary uppercase ml-2">
            ✏️ Editor de Detección
          </span>
          <span className="text-[11px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {regions.length} región{regions.length !== 1 ? "es" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refineOpticalAdjustment}
            disabled={regions.length === 0 || isRefining}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all border border-amber-500/20 disabled:opacity-30"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isRefining ? 'animate-spin' : ''}`} />
            {isRefining ? "Ajustando..." : "Ajuste Óptico"}
          </button>
          <button
            onClick={() => setRegions([])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Borrar todo
          </button>
          <button
            onClick={() => setRegions(initialRegions)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted/20 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted/20 transition-colors border border-border/50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmClean}
            disabled={regions.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            Confirmar selección
          </button>
        </div>
      </div>

      {/* ── Hint bar ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b border-primary/10 text-[11px] text-muted-foreground">
        <MousePointer className="w-3 h-3 text-primary shrink-0" />
        <span>
          <strong className="text-foreground/70">Arrastra en vacío</strong> añadir ·{" "}
          <strong className="text-foreground/70">Pincha cuadro</strong> arrastrar/escalar ·{" "}
          <strong className="text-foreground/70">Ajuste Óptico</strong> centrar automático
        </span>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        className="relative select-none overflow-hidden cursor-crosshair"
        style={{ maxHeight: "60vh" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { if (action) { setAction(null); setDraft(null); } }}
      >
        <img
          src={imgEl.src}
          alt="Imagen fuente"
          draggable={false}
          className="w-full h-auto block pointer-events-none"
          style={{ maxHeight: "60vh", objectFit: "contain" }}
        />

        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${displaySize.w} ${displaySize.h}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {regions.map((r) => {
            const tl = toDisplay(r.minX, r.minY);
            const br = toDisplay(r.maxX, r.maxY);
            const w = Math.max(0, br.x - tl.x);
            const h = Math.max(0, br.y - tl.y);
            const isHovered = hoveredId === r.id;

            return (
              <g key={r.id} onMouseEnter={() => setHoveredId(r.id)} onMouseLeave={() => setHoveredId(null)}>
                {/* Drag zone invisible */}
                <rect
                  x={tl.x}
                  y={tl.y}
                  width={w}
                  height={h}
                  fill="transparent"
                  cursor="move"
                  data-action="move"
                  data-id={r.id}
                  className="pointer-events-auto"
                />
                
                {/* Box visible */}
                <rect
                  x={tl.x}
                  y={tl.y}
                  width={w}
                  height={h}
                  fill={isHovered ? "hsl(var(--primary) / 0.08)" : "hsl(var(--primary) / 0.04)"}
                  stroke="hsl(var(--primary))"
                  strokeWidth={isHovered || action?.id === r.id ? 2 : 1.5}
                  strokeDasharray={isHovered || action?.id === r.id ? "none" : "6 3"}
                  rx={4}
                  className="transition-all duration-75 pointer-events-none"
                />
                
                {/* Resize handle BR */}
                <rect
                  x={br.x - 6}
                  y={br.y - 6}
                  width={12}
                  height={12}
                  fill="white"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  rx={2}
                  cursor="nwse-resize"
                  data-action="resize-br"
                  data-id={r.id}
                  className="pointer-events-auto hover:fill-primary"
                />

                <rect x={tl.x} y={tl.y - 18} width={Math.min(w, 60)} height={16} fill="hsl(var(--primary))" rx={3} className="pointer-events-none" />
                <text x={tl.x + 4} y={tl.y - 6} fill="white" fontSize={9} fontWeight="bold" className="pointer-events-none">
                  #{regions.indexOf(r) + 1}
                </text>
              </g>
            );
          })}

          {draft && draft.w > 4 && draft.h > 4 && (
            <rect
              x={draft.x}
              y={draft.y}
              width={draft.w}
              height={draft.h}
              fill="hsl(var(--primary) / 0.06)"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              rx={4}
              className="pointer-events-none"
            />
          )}
        </svg>

        {regions.map((r) => {
          const br = toDisplay(r.maxX, r.maxY);
          const btnX = br.x - 12;
          const btnY = toDisplay(r.minX, r.minY).y - 12;

          return (
            <button
              key={`btn-${r.id}`}
              data-region-btn="true"
              onMouseEnter={() => setHoveredId(r.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={(e) => { e.stopPropagation(); deleteRegion(r.id); }}
              className="absolute w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center hover:bg-red-600 transition-all shadow-lg z-20"
              style={{ left: `${btnX}px`, top: `${btnY}px`, transform: "translate(-50%, -50%)" }}
            >
              ×
            </button>
          );
        })}
      </div>

      <div className="px-4 py-2 bg-black/50 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Imagen: {imgSize.w}×{imgSize.h}px</span>
        <span className="text-primary font-semibold">
          {regions.length} iconos listos para exportar
        </span>
      </div>
    </div>
  );
};

export default IconEditor;
