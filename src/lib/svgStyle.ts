/**
 * SVG Style Transformer — GridXD Pack Styles Engine
 *
 * Applies visual style (outline) to any SVG string.
 * Pure client-side — no backend required.
 */

export type SvgStyle = "outline";

/**
 * Apply a visual style to a raw SVG string.
 * @param svgString  The original SVG markup
 * @param style      Target style variant
 * @param color      Primary brand color (hex or CSS color)
 * @returns          Transformed SVG string
 */
export function applyStyleToSvg(
  svgString: string,
  style: SvgStyle,
  color: string = "currentColor"
): string {
  if (!svgString) return svgString;

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return svgString;

  // Normalize: remove inline styles that conflict
  svg.querySelectorAll("[fill],[stroke],[style]").forEach((el) => {
    el.removeAttribute("style");
  });

  switch (style) {
    case "outline":
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", color);
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.querySelectorAll("path, circle, rect, polygon, ellipse, line, polyline").forEach((el) => {
        el.setAttribute("fill", "none");
        el.setAttribute("stroke", color);
        el.setAttribute("stroke-width", "2");
      });
      break;
  }

  return new XMLSerializer().serializeToString(svg);
}

/** Always true — outline is available for all users */
export function canAccessStyle(): boolean {
  return true;
}

/** Style metadata for UI rendering */
export const STYLE_META: Record<SvgStyle, { label: string; description: string; icon: string }> = {
  outline: {
    label: "Outline",
    description: "Contorno limpio, 2px stroke",
    icon: "○",
  },
};
