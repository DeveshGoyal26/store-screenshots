/** Pan distance (% of screen) that snaps to center. */
export const SCREENSHOT_PAN_SNAP = 1.5;
/** Pan distance (% of screen) that shows a center alignment guide. */
export const SCREENSHOT_PAN_GUIDE = 10;

export type PanAxisGuide = "snapped" | "near" | null;

export function snapPan(value: number): number {
  return Math.abs(value) <= SCREENSHOT_PAN_SNAP ? 0 : value;
}

export function panAxisGuide(value: number): PanAxisGuide {
  if (Math.abs(value) <= SCREENSHOT_PAN_SNAP) return "snapped";
  if (Math.abs(value) <= SCREENSHOT_PAN_GUIDE) return "near";
  return null;
}

export function clampPan(value: number): number {
  return Math.max(-80, Math.min(80, value));
}

/** Canvas slide center alignment (pixels). */
export const CANVAS_SNAP_FRAC = 0.012;
export const CANVAS_GUIDE_FRAC = 0.05;

export function canvasSnapPx(cW: number): number {
  return Math.max(8, cW * CANVAS_SNAP_FRAC);
}

export function canvasGuidePx(cW: number): number {
  return Math.max(36, cW * CANVAS_GUIDE_FRAC);
}

export function axisGuidePx(deltaPx: number, guidePx: number, snapPx: number): PanAxisGuide {
  if (Math.abs(deltaPx) <= snapPx) return "snapped";
  if (Math.abs(deltaPx) <= guidePx) return "near";
  return null;
}

export function guidesForRectCenter(
  x: number,
  y: number,
  w: number,
  h: number,
  centerX: number,
  centerY: number,
  guidePx: number,
  snapPx: number,
): { x: PanAxisGuide; y: PanAxisGuide } {
  return {
    x: axisGuidePx(x + w / 2 - centerX, guidePx, snapPx),
    y: axisGuidePx(y + h / 2 - centerY, guidePx, snapPx),
  };
}

export function snapPositionToCanvasCenter(
  x: number,
  y: number,
  w: number,
  h: number,
  centerX: number,
  centerY: number,
  snapPx: number,
): { x: number; y: number } {
  let nx = x;
  let ny = y;
  if (Math.abs(x + w / 2 - centerX) <= snapPx) nx = centerX - w / 2;
  if (Math.abs(y + h / 2 - centerY) <= snapPx) ny = centerY - h / 2;
  return { x: nx, y: ny };
}
