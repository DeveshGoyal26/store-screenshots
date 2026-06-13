import type { CustomDeviceFrame, FrameScreenInset } from "./types";

export const DEFAULT_FRAME_SCREEN: FrameScreenInset = {
  L: 8,
  T: 8,
  W: 84,
  H: 84,
  RX: 4,
  RY: 4,
};

export function customFrameAspect(frame: CustomDeviceFrame): number {
  return frame.width / Math.max(1, frame.height);
}

export function cleanFrameScreenInset(value: unknown): FrameScreenInset | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<FrameScreenInset>;
  const inset: Partial<FrameScreenInset> = {};
  if (typeof raw.L === "number" && Number.isFinite(raw.L)) {
    inset.L = Math.max(0, Math.min(40, raw.L));
  }
  if (typeof raw.T === "number" && Number.isFinite(raw.T)) {
    inset.T = Math.max(0, Math.min(40, raw.T));
  }
  if (typeof raw.W === "number" && Number.isFinite(raw.W)) {
    inset.W = Math.max(20, Math.min(100, raw.W));
  }
  if (typeof raw.H === "number" && Number.isFinite(raw.H)) {
    inset.H = Math.max(20, Math.min(100, raw.H));
  }
  if (typeof raw.RX === "number" && Number.isFinite(raw.RX)) {
    inset.RX = Math.max(0, Math.min(50, raw.RX));
  }
  if (typeof raw.RY === "number" && Number.isFinite(raw.RY)) {
    inset.RY = Math.max(0, Math.min(50, raw.RY));
  }
  return Object.keys(inset).length > 0 ? (inset as FrameScreenInset) : undefined;
}

export function cleanCustomDeviceFrame(value: unknown): CustomDeviceFrame | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<CustomDeviceFrame>;
  if (typeof raw.id !== "string" || !raw.id.trim()) return undefined;
  if (typeof raw.src !== "string" || !raw.src.trim()) return undefined;
  if (typeof raw.width !== "number" || !Number.isFinite(raw.width) || raw.width < 1) return undefined;
  if (typeof raw.height !== "number" || !Number.isFinite(raw.height) || raw.height < 1) {
    return undefined;
  }
  const screen = cleanFrameScreenInset(raw.screen) ?? DEFAULT_FRAME_SCREEN;
  return {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Custom frame",
    src: raw.src,
    width: Math.round(raw.width),
    height: Math.round(raw.height),
    screen: { ...DEFAULT_FRAME_SCREEN, ...screen },
  };
}

export function readImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read image dimensions"));
    img.src = src;
  });
}
