import type { ScreenshotFit } from "./types";

export const DEFAULT_FIT: Required<ScreenshotFit> = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  mode: "cover",
  align: "top",
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
  skewX: 0,
  skewY: 0,
  perspective: 800,
};

export function mergedFit(fit?: ScreenshotFit, defaultScale = 1): Required<ScreenshotFit> {
  return {
    scale: fit?.scale ?? defaultScale,
    offsetX: fit?.offsetX ?? DEFAULT_FIT.offsetX,
    offsetY: fit?.offsetY ?? DEFAULT_FIT.offsetY,
    mode: fit?.mode ?? DEFAULT_FIT.mode,
    align: fit?.align ?? DEFAULT_FIT.align,
    rotateX: fit?.rotateX ?? DEFAULT_FIT.rotateX,
    rotateY: fit?.rotateY ?? DEFAULT_FIT.rotateY,
    rotateZ: fit?.rotateZ ?? DEFAULT_FIT.rotateZ,
    skewX: fit?.skewX ?? DEFAULT_FIT.skewX,
    skewY: fit?.skewY ?? DEFAULT_FIT.skewY,
    perspective: fit?.perspective ?? DEFAULT_FIT.perspective,
  };
}

export function screenshotHas3d(fit: Required<ScreenshotFit>): boolean {
  return (
    fit.rotateX !== 0 ||
    fit.rotateY !== 0 ||
    fit.rotateZ !== 0 ||
    fit.skewX !== 0 ||
    fit.skewY !== 0
  );
}

/** CSS transform for screenshot image inside the screen cutout. */
export function screenshotImageTransform(fit: Required<ScreenshotFit>): string {
  const parts = [
    `translate(calc(-50% + ${fit.offsetX}%), calc(-50% + ${fit.offsetY}%))`,
    `scale(${fit.scale})`,
  ];
  if (fit.rotateX) parts.push(`rotateX(${fit.rotateX}deg)`);
  if (fit.rotateY) parts.push(`rotateY(${fit.rotateY}deg)`);
  if (fit.rotateZ) parts.push(`rotateZ(${fit.rotateZ}deg)`);
  if (fit.skewX) parts.push(`skewX(${fit.skewX}deg)`);
  if (fit.skewY) parts.push(`skewY(${fit.skewY}deg)`);
  return parts.join(" ");
}

export function cleanScreenshotFit(value: unknown): ScreenshotFit | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<ScreenshotFit>;
  const fit: ScreenshotFit = {};
  if (typeof raw.scale === "number" && Number.isFinite(raw.scale)) {
    fit.scale = Math.max(0.5, Math.min(3, raw.scale));
  }
  if (typeof raw.offsetX === "number" && Number.isFinite(raw.offsetX)) {
    fit.offsetX = Math.max(-80, Math.min(80, raw.offsetX));
  }
  if (typeof raw.offsetY === "number" && Number.isFinite(raw.offsetY)) {
    fit.offsetY = Math.max(-80, Math.min(80, raw.offsetY));
  }
  if (raw.mode === "cover" || raw.mode === "contain") fit.mode = raw.mode;
  if (raw.align === "top" || raw.align === "center" || raw.align === "bottom") {
    fit.align = raw.align;
  }
  if (typeof raw.rotateX === "number" && Number.isFinite(raw.rotateX)) {
    fit.rotateX = Math.max(-45, Math.min(45, raw.rotateX));
  }
  if (typeof raw.rotateY === "number" && Number.isFinite(raw.rotateY)) {
    fit.rotateY = Math.max(-45, Math.min(45, raw.rotateY));
  }
  if (typeof raw.rotateZ === "number" && Number.isFinite(raw.rotateZ)) {
    fit.rotateZ = Math.max(-45, Math.min(45, raw.rotateZ));
  }
  if (typeof raw.skewX === "number" && Number.isFinite(raw.skewX)) {
    fit.skewX = Math.max(-30, Math.min(30, raw.skewX));
  }
  if (typeof raw.skewY === "number" && Number.isFinite(raw.skewY)) {
    fit.skewY = Math.max(-30, Math.min(30, raw.skewY));
  }
  if (typeof raw.perspective === "number" && Number.isFinite(raw.perspective)) {
    fit.perspective = Math.max(300, Math.min(2000, raw.perspective));
  }
  return Object.keys(fit).length > 0 ? fit : undefined;
}
