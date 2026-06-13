import type { CSSProperties } from "react";
import type { BackgroundPattern, SlideBackground, Theme } from "./types";

function shade(hex: string, percent: number) {
  const c = hex.replace("#", "");
  const num = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const amt = Math.round((255 * percent) / 100);
  r = Math.max(0, Math.min(255, r + amt));
  g = Math.max(0, Math.min(255, g + amt));
  b = Math.max(0, Math.min(255, b + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function themeBackgroundCss(theme: Theme, inverted?: boolean): string {
  if (inverted) {
    return `linear-gradient(160deg, ${theme.bgAlt} 0%, ${shade(theme.bgAlt, -8)} 100%)`;
  }
  return `linear-gradient(160deg, ${theme.bg} 0%, ${shade(theme.bg, -6)} 100%)`;
}

export function resolveBackgroundCss(
  bg: SlideBackground | undefined,
  theme: Theme,
  inverted?: boolean,
): string {
  const mode = bg?.mode ?? "theme";
  if (mode === "theme") return themeBackgroundCss(theme, inverted);
  if (mode === "solid") return bg?.color || theme.bg;
  const start = bg?.color || theme.bg;
  const end = bg?.colorEnd || shade(start, -12);
  const angle = bg?.angle ?? 160;
  return `linear-gradient(${angle}deg, ${start} 0%, ${end} 100%)`;
}

export function resolveExportBackgroundColor(
  bg: SlideBackground | undefined,
  theme: Theme,
  inverted?: boolean,
): string {
  const mode = bg?.mode ?? "theme";
  if (mode === "theme") return inverted ? theme.bgAlt : theme.bg;
  if (mode === "solid") return bg?.color || theme.bg;
  return bg?.color || theme.bg;
}

export function patternOverlayStyle(
  pattern: BackgroundPattern | undefined,
  cW: number,
  options?: { color?: string; opacity?: number; size?: number; dotSize?: number },
): CSSProperties | null {
  if (!pattern || pattern === "none") return null;
  const color = options?.color || "rgba(255,255,255,0.35)";
  const opacity = options?.opacity ?? 0.35;
  const scale = Math.max(0.25, options?.size ?? 1);
  const spacing = Math.max(14, scale * cW * 0.04);
  const dotScale = Math.max(0.25, options?.dotSize ?? 1);
  const dotPx = Math.max(1.5, spacing * 0.16 * dotScale);

  switch (pattern) {
    case "dots":
      return {
        backgroundImage: `radial-gradient(circle, ${color} ${dotPx}px, transparent ${dotPx}px)`,
        backgroundSize: `${spacing}px ${spacing}px`,
        backgroundRepeat: "repeat",
        opacity,
      };
    case "grid":
      return {
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: `${spacing}px ${spacing}px`,
        backgroundRepeat: "repeat",
        opacity,
      };
    case "diagonal":
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${color} 0, ${color} 1px, transparent 0, transparent ${spacing * 0.75}px)`,
        opacity,
      };
    default:
      return null;
  }
}
