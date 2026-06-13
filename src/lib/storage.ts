"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { cleanCustomDeviceFrame } from "./custom-frames";
import { PROJECT_SCHEMA_VERSION, STORAGE_KEY } from "./constants";
import { DEFAULT_PROJECT } from "./defaults";
import { coerceLocalized } from "./locale";
import { cleanScreenshotFit } from "./screenshot-fit";
import type {
  BackgroundMode,
  BackgroundPattern,
  CustomDeviceFrame,
  DecorElement,
  DecorElementKind,
  Device,
  DeviceFrameStyle,
  ElementTransform,
  ProjectState,
  ShapeKind,
  Slide,
  SlideBackground,
  TextElement,
} from "./types";

const HISTORY_LIMIT = 50;
// Coalesce rapid edits (typing, slider drags) into a single undo step.
const COALESCE_MS = 500;
// Debounce file/localStorage writes — frequent enough to feel instant, infrequent enough not to thrash disk.
const SAVE_DEBOUNCE_MS = 600;

const FRAME_STYLES: DeviceFrameStyle[] = [
  "flat",
  "tilt-left",
  "tilt-right",
  "perspective-left",
  "perspective-right",
  "lay-flat",
  "float",
];

const BACKGROUND_MODES: BackgroundMode[] = ["theme", "solid", "gradient"];
const BACKGROUND_PATTERNS: BackgroundPattern[] = ["none", "dots", "grid", "diagonal"];
const DECOR_KINDS: DecorElementKind[] = ["image", "shape", "pattern", "blob", "device-frame"];
const SHAPE_KINDS: ShapeKind[] = ["rectangle", "circle", "pill"];

function cleanSlideBackground(value: unknown): SlideBackground | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<SlideBackground>;
  const bg: SlideBackground = {};
  if (typeof raw.mode === "string" && BACKGROUND_MODES.includes(raw.mode as BackgroundMode)) {
    bg.mode = raw.mode as BackgroundMode;
  }
  if (typeof raw.color === "string") bg.color = raw.color;
  if (typeof raw.colorEnd === "string") bg.colorEnd = raw.colorEnd;
  if (typeof raw.angle === "number" && Number.isFinite(raw.angle)) bg.angle = raw.angle;
  if (typeof raw.pattern === "string" && BACKGROUND_PATTERNS.includes(raw.pattern as BackgroundPattern)) {
    bg.pattern = raw.pattern as BackgroundPattern;
  }
  if (typeof raw.patternColor === "string") bg.patternColor = raw.patternColor;
  if (typeof raw.patternOpacity === "number" && Number.isFinite(raw.patternOpacity)) {
    bg.patternOpacity = Math.max(0, Math.min(1, raw.patternOpacity));
  }
  if (typeof raw.patternSize === "number" && Number.isFinite(raw.patternSize)) {
    bg.patternSize = Math.max(0.25, Math.min(4, raw.patternSize));
  }
  if (typeof raw.patternDotSize === "number" && Number.isFinite(raw.patternDotSize)) {
    bg.patternDotSize = Math.max(0.25, Math.min(3, raw.patternDotSize));
  }
  if (typeof raw.glow === "boolean") bg.glow = raw.glow;
  return Object.keys(bg).length > 0 ? bg : undefined;
}

function cleanDecorElement(value: unknown): DecorElement | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<DecorElement>;
  if (typeof raw.id !== "string" || !raw.id.trim()) return undefined;
  if (typeof raw.kind !== "string" || !DECOR_KINDS.includes(raw.kind as DecorElementKind)) {
    return undefined;
  }
  const transform = cleanTransform(raw.transform);
  if (!transform) return undefined;
  const el: DecorElement = { id: raw.id, kind: raw.kind as DecorElementKind, transform };
  if (typeof raw.src === "string") el.src = raw.src;
  if (typeof raw.opacity === "number" && Number.isFinite(raw.opacity)) {
    el.opacity = Math.max(0, Math.min(1, raw.opacity));
  }
  if (typeof raw.borderRadius === "number" && Number.isFinite(raw.borderRadius)) {
    el.borderRadius = raw.borderRadius;
  }
  if (typeof raw.shape === "string" && SHAPE_KINDS.includes(raw.shape as ShapeKind)) {
    el.shape = raw.shape as ShapeKind;
  }
  if (typeof raw.fill === "string") el.fill = raw.fill;
  if (typeof raw.stroke === "string") el.stroke = raw.stroke;
  if (typeof raw.strokeWidth === "number" && Number.isFinite(raw.strokeWidth)) {
    el.strokeWidth = raw.strokeWidth;
  }
  if (typeof raw.pattern === "string" && BACKGROUND_PATTERNS.includes(raw.pattern as BackgroundPattern)) {
    el.pattern = raw.pattern as BackgroundPattern;
  }
  if (typeof raw.patternColor === "string") el.patternColor = raw.patternColor;
  if (typeof raw.patternOpacity === "number" && Number.isFinite(raw.patternOpacity)) {
    el.patternOpacity = Math.max(0, Math.min(1, raw.patternOpacity));
  }
  if (typeof raw.patternSize === "number" && Number.isFinite(raw.patternSize)) {
    el.patternSize = Math.max(0.25, Math.min(4, raw.patternSize));
  }
  if (typeof raw.blur === "number" && Number.isFinite(raw.blur)) {
    el.blur = Math.max(0, Math.min(200, raw.blur));
  }
  return el;
}

function cleanTransform(value: unknown): ElementTransform | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<ElementTransform>;
  const required = [raw.x, raw.y, raw.width, raw.height];
  if (!required.every((n) => typeof n === "number" && Number.isFinite(n))) return undefined;
  const screenshotFit = cleanScreenshotFit(raw.screenshotFit);
  const frameStyle =
    typeof raw.frameStyle === "string" && FRAME_STYLES.includes(raw.frameStyle as DeviceFrameStyle)
      ? (raw.frameStyle as DeviceFrameStyle)
      : undefined;
  return {
    x: raw.x!,
    y: raw.y!,
    width: Math.max(1, raw.width!),
    height: Math.max(1, raw.height!),
    ...(typeof raw.rotation === "number" && Number.isFinite(raw.rotation)
      ? { rotation: raw.rotation }
      : {}),
    ...(typeof raw.zIndex === "number" && Number.isFinite(raw.zIndex)
      ? { zIndex: raw.zIndex }
      : {}),
    ...(frameStyle ? { frameStyle } : {}),
    ...(screenshotFit ? { screenshotFit } : {}),
    ...(typeof raw.customFrameId === "string" && raw.customFrameId.trim()
      ? { customFrameId: raw.customFrameId.trim() }
      : {}),
    ...(raw.textAlign === "left" || raw.textAlign === "center" || raw.textAlign === "right"
      ? { textAlign: raw.textAlign }
      : {}),
  };
}

function cleanTextElement(value: unknown): TextElement | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<TextElement>;
  if (typeof raw.id !== "string" || !raw.id.trim()) return undefined;
  const transform = cleanTransform(raw.transform);
  if (!transform) return undefined;
  return {
    id: raw.id,
    text: coerceLocalized(raw.text as unknown),
    transform,
    ...(typeof raw.fontSize === "number" && Number.isFinite(raw.fontSize)
      ? { fontSize: raw.fontSize }
      : {}),
    ...(typeof raw.fontWeight === "number" && Number.isFinite(raw.fontWeight)
      ? { fontWeight: raw.fontWeight }
      : {}),
    ...(typeof raw.color === "string" ? { color: raw.color } : {}),
    ...(raw.align === "left" || raw.align === "center" || raw.align === "right"
      ? { align: raw.align }
      : {}),
  };
}

// Migrate older projects into the current schema while keeping legacy decks
// visually stable until they explicitly opt into connected canvas.
function migrateSlide(slide: Slide): Slide {
  const transforms = slide.transforms
    ? Object.fromEntries(
        Object.entries(slide.transforms)
          .map(([id, transform]) => [id, cleanTransform(transform)])
          .filter((entry): entry is [string, ElementTransform] => !!entry[1]),
      )
    : undefined;
  const textElements = Array.isArray(slide.textElements)
    ? slide.textElements.map(cleanTextElement).filter((t): t is TextElement => !!t)
    : undefined;
  const decorElements = Array.isArray(slide.decorElements)
    ? slide.decorElements.map(cleanDecorElement).filter((d): d is DecorElement => !!d)
    : undefined;
  const background = cleanSlideBackground(slide.background);

  return {
    ...slide,
    label: coerceLocalized(slide.label as unknown),
    headline: coerceLocalized(slide.headline as unknown),
    ...(background ? { background } : { background: undefined }),
    ...(transforms && Object.keys(transforms).length > 0 ? { transforms } : { transforms: undefined }),
    ...(textElements && textElements.length > 0 ? { textElements } : { textElements: undefined }),
    ...(decorElements && decorElements.length > 0 ? { decorElements } : { decorElements: undefined }),
  };
}

function mergeWithDefaults(parsed: Partial<ProjectState>): ProjectState {
  const connectedCanvas =
    typeof parsed.connectedCanvas === "boolean"
      ? parsed.connectedCanvas
      : false;
  const themeId =
    typeof parsed.themeId === "string" && parsed.themeId.trim()
      ? parsed.themeId
      : DEFAULT_PROJECT.themeId;
  const slidesByDevice = parsed.slidesByDevice
    ? Object.fromEntries(
        Object.entries(parsed.slidesByDevice).map(([device, slides]) => [
          device,
          Array.isArray(slides) ? slides.map((slide) => migrateSlide(slide as Slide)) : [],
        ]),
      )
    : {};
  const merged: ProjectState = {
    ...DEFAULT_PROJECT,
    ...parsed,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    themeId,
    connectedCanvas,
    slidesByDevice: {
      ...DEFAULT_PROJECT.slidesByDevice,
      ...slidesByDevice,
    } as ProjectState["slidesByDevice"],
  };
  // Clamp the active locale into the project's locale list so a stale
  // `locale` (e.g. from a project that dropped languages) doesn't show blank.
  if (!merged.locales || merged.locales.length === 0) {
    merged.locales = [...DEFAULT_PROJECT.locales];
  }
  if (!merged.locales.includes(merged.locale)) {
    merged.locale = merged.locales[0];
  }
  if (Array.isArray(parsed.customFrames)) {
    merged.customFrames = parsed.customFrames
      .map(cleanCustomDeviceFrame)
      .filter((frame): frame is CustomDeviceFrame => !!frame);
  }
  return merged;
}

function loadFromLocalStorage(): ProjectState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return mergeWithDefaults(JSON.parse(raw) as Partial<ProjectState>);
  } catch {
    return null;
  }
}

async function loadFromFile(): Promise<
  { ok: true; state: ProjectState | null } | { ok: false; error: string }
> {
  if (typeof window === "undefined") return { ok: false, error: "Window is not available" };
  try {
    const resp = await fetch("/api/project", { cache: "no-store" });
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    const json = (await resp.json()) as { ok: boolean; state: Partial<ProjectState> | null };
    if (!json.ok) return { ok: false, error: "Project response was not ok" };
    if (!json.state) return { ok: true, state: null };
    return { ok: true, state: mergeWithDefaults(json.state) };
  } catch {
    return { ok: false, error: "Project file could not be loaded" };
  }
}

function saveToLocalStorage(state: ProjectState): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") return { ok: true };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

async function saveToFile(state: ProjectState): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof window === "undefined") return { ok: true };
  try {
    const resp = await fetch("/api/project", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state),
    });
    if (!resp.ok) {
      return { ok: false, error: `HTTP ${resp.status}` };
    }
    const json = (await resp.json()) as { ok: boolean; error?: string };
    if (!json.ok) return { ok: false, error: json.error || "Unknown error" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

type Updater = ProjectState | ((prev: ProjectState) => ProjectState);

function applyUpdater(updater: Updater, prev: ProjectState): ProjectState {
  return typeof updater === "function" ? updater(prev) : updater;
}

export function useProject() {
  const [state, _setState] = useState<ProjectState>(DEFAULT_PROJECT);
  const [hydrated, setHydrated] = useState(false);
  const [fileReady, setFileReady] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // History stacks live in refs — they don't drive any rendered UI, so
  // mutating them never needs to re-render.
  const pastRef = useRef<ProjectState[]>([]);
  const futureRef = useRef<ProjectState[]>([]);
  const lastPushAt = useRef(0);

  // Hydrate: prefer file (git-tracked) → localStorage (cache) → defaults.
  // localStorage is consulted first for instant paint, then file overwrites if present.
  useEffect(() => {
    let cancelled = false;
    const cached = loadFromLocalStorage();
    if (cached) _setState(cached);

    void (async () => {
      const fromFile = await loadFromFile();
      if (cancelled) return;
      if (fromFile.ok) {
        if (fromFile.state) {
          _setState(fromFile.state);
        } else {
          _setState(DEFAULT_PROJECT);
        }
        setFileReady(true);
      } else {
        setFileReady(false);
        setSaveError(fromFile.error);
      }
      pastRef.current = [];
      futureRef.current = [];
      lastPushAt.current = 0;
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced autosave to BOTH localStorage (fast, offline) and file (git-trackable).
  useEffect(() => {
    if (!hydrated || !fileReady) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const localResult = saveToLocalStorage(state);
      void saveToFile(state).then((fileResult) => {
        if (fileResult.ok && localResult.ok) {
          setSavedAt(Date.now());
          setSaveError(null);
        } else if (!fileResult.ok && !localResult.ok) {
          setSaveError(fileResult.error);
        } else if (!fileResult.ok) {
          // Local cache succeeded but file save failed — work isn't git-portable yet.
          setSavedAt(Date.now());
          setSaveError(`File save failed: ${fileResult.error}`);
        } else {
          setSavedAt(Date.now());
          setSaveError(localResult.ok ? null : localResult.error);
        }
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, hydrated, fileReady]);

  const setState = useCallback((updater: Updater) => {
    _setState((prev) => {
      const next = applyUpdater(updater, prev);
      if (next === prev) return prev;
      const now = Date.now();
      if (now - lastPushAt.current > COALESCE_MS) {
        pastRef.current.push(prev);
        if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
        futureRef.current.length = 0;
      }
      lastPushAt.current = now;
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    _setState((cur) => {
      const prev = pastRef.current.pop();
      if (prev === undefined) return cur;
      futureRef.current.push(cur);
      // Reset coalescing so the next edit after an undo creates a fresh history entry.
      lastPushAt.current = 0;
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    _setState((cur) => {
      const next = futureRef.current.pop();
      if (next === undefined) return cur;
      pastRef.current.push(cur);
      lastPushAt.current = 0;
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_PROJECT);
  }, [setState]);

  const resetDevice = useCallback((device: Device) => {
    setState((prev) => ({
      ...prev,
      slidesByDevice: {
        ...prev.slidesByDevice,
        [device]: DEFAULT_PROJECT.slidesByDevice[device],
      },
    }));
  }, [setState]);

  return {
    state,
    setState,
    hydrated,
    savedAt,
    saveError,
    reset,
    resetDevice,
    undo,
    redo,
  };
}
