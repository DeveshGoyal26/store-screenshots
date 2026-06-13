"use client";
import * as React from "react";
import { Rnd } from "react-rnd";
import { RotateCw } from "lucide-react";
import type {
  BuiltInElementId,
  CustomDeviceFrame,
  DecorElement,
  Device,
  ElementId,
  ElementTransform,
  Orientation,
  SelectedElement,
  Slide,
  TextElement,
  Theme,
  TextAlign,
} from "@/lib/types";
import {
  patternOverlayStyle,
  resolveBackgroundCss,
} from "@/lib/background";
import {
  CANVAS,
  ANDROID_MOCKUP_RATIO,
  GAME_ANDROID_RATIO,
  GAME_IPHONE_RATIO,
  IPAD_RATIO,
  MK_RATIO,
  androidPhoneW,
  androidPhoneWSmall,
  featureGraphicPhoneW,
  featureGraphicPhoneWSmall,
  gameAndroidW,
  gameAndroidWSmall,
  gameIphoneW,
  gameIphoneWSmall,
  ipadW,
  phoneW,
  phoneWSmall,
  tabletLW,
  tabletPW,
} from "@/lib/constants";
import { customFrameAspect } from "@/lib/custom-frames";
import { toTextElementId, toDecorElementId, isDecorElementId, decorElementKey } from "@/lib/elements";
import { pickText, resolveScreenshot } from "@/lib/locale";
import { img } from "@/lib/image-cache";
import {
  canvasGuidePx,
  canvasSnapPx,
  guidesForRectCenter,
  snapPositionToCanvasCenter,
  type PanAxisGuide,
} from "@/lib/screenshot-align";
import type { DeviceFrameStyle, ScreenshotFit } from "@/lib/types";
import { CenterAlignmentGuides } from "./center-alignment-guides";
import {
  AndroidPhone,
  AndroidTabletL,
  AndroidTabletP,
  CustomPhone,
  GameAndroidLandscape,
  GameIphoneLandscape,
  IPad,
  Phone,
} from "./device-frames";

type FrameComp = React.ComponentType<{
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  hideEmpty?: boolean;
  frameStyle?: DeviceFrameStyle;
  screenshotFit?: ScreenshotFit;
  adjustScreenshot?: boolean;
  onScreenshotFitChange?: (fit: ScreenshotFit) => void;
}>;

export function getCanvas(device: Device, orientation: Orientation) {
  const c = CANVAS[device];
  if ((device === "android-7" || device === "android-10") && orientation === "landscape") {
    return { cW: c.wL!, cH: c.hL! };
  }
  return { cW: c.w, cH: c.h };
}

// Aspect ratio (w/h) of each device frame — must match device-frames.tsx
function getFrameAspect(device: Device, orientation: Orientation) {
  switch (device) {
    case "iphone":      return MK_RATIO;
    case "android":     return ANDROID_MOCKUP_RATIO;
    case "feature-graphic": return ANDROID_MOCKUP_RATIO;
    case "game-iphone":     return GAME_IPHONE_RATIO;
    case "game-android":    return GAME_ANDROID_RATIO;
    case "ipad":        return IPAD_RATIO;
    case "android-7":
    case "android-10":  return orientation === "landscape" ? 8 / 5 : 5 / 8;
    default:            return 1;
  }
}

export function getFrameForDevice(device: Device, orientation: Orientation): {
  Comp: FrameComp;
  widthFn: (cW: number, cH: number) => number;
  smallWidthFn: (cW: number, cH: number) => number;
} {
  switch (device) {
    case "iphone":
      return { Comp: Phone, widthFn: phoneW, smallWidthFn: phoneWSmall };
    case "ipad":
      return { Comp: IPad, widthFn: ipadW, smallWidthFn: (cW, cH) => ipadW(cW, cH, 0.6) };
    case "android":
      return { Comp: AndroidPhone, widthFn: androidPhoneW, smallWidthFn: androidPhoneWSmall };
    case "feature-graphic":
      return {
        Comp: AndroidPhone,
        widthFn: featureGraphicPhoneW,
        smallWidthFn: featureGraphicPhoneWSmall,
      };
    case "android-7":
    case "android-10":
      if (orientation === "landscape") {
        return { Comp: AndroidTabletL, widthFn: tabletLW, smallWidthFn: (cW, cH) => tabletLW(cW, cH, 0.5) };
      }
      return { Comp: AndroidTabletP, widthFn: tabletPW, smallWidthFn: (cW, cH) => tabletPW(cW, cH, 0.62) };
    case "game-iphone":
      return {
        Comp: GameIphoneLandscape,
        widthFn: gameIphoneW,
        smallWidthFn: gameIphoneWSmall,
      };
    case "game-android":
      return {
        Comp: GameAndroidLandscape,
        widthFn: gameAndroidW,
        smallWidthFn: gameAndroidWSmall,
      };
    default:
      return { Comp: Phone, widthFn: phoneW, smallWidthFn: phoneWSmall };
  }
}

type EditHandlers = {
  onLabelChange?: (v: string) => void;
  onHeadlineChange?: (v: string) => void;
  onTextElementTextChange?: (id: string, v: string) => void;
  onElementChange?: (id: ElementId, t: ElementTransform) => void;
  onSelectElement?: (id: ElementId | null) => void;
};

type Props = {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  editable?: boolean;
  edit?: EditHandlers;
  selectedElementId?: ElementId | null;
  // Preview scale (1.0 = full size). Used so react-rnd maps drag deltas correctly
  // when the canvas is rendered inside a CSS-transformed container.
  previewScale?: number;
  /** When true, suppress the "Drop a screenshot here" placeholder. Used for export. */
  hideEmpty?: boolean;
  customFrames?: CustomDeviceFrame[];
};

type DeckEditHandlers = {
  onLabelChange?: (slideId: string, v: string) => void;
  onHeadlineChange?: (slideId: string, v: string) => void;
  onTextElementTextChange?: (slideId: string, id: string, v: string) => void;
  onElementChange?: (slideId: string, id: ElementId, t: ElementTransform) => void;
  onSelectElement?: (element: SelectedElement | null) => void;
  onSelectScreen?: (slideId: string) => void;
};

type DeckCanvasProps = {
  slides: Slide[];
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  connectedCanvas?: boolean;
  editable?: boolean;
  edit?: DeckEditHandlers;
  selectedElement?: SelectedElement | null;
  activeSlideId?: string | null;
  previewScale?: number;
  hideEmpty?: boolean;
  showGuides?: boolean;
  customFrames?: CustomDeviceFrame[];
};

// ---------- Editable text helpers ----------

function EditableText({
  value,
  editable,
  onChange,
  style,
  multiline = false,
  placeholder,
  onFocus,
}: {
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  style?: React.CSSProperties;
  multiline?: boolean;
  placeholder?: string;
  onFocus?: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const incoming = value || "";
    if (el.textContent !== incoming && document.activeElement !== el) {
      el.textContent = incoming;
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (!onChange) return;
    const text = (e.currentTarget.innerText || "").replace(/\u00a0/g, " ");
    onChange(multiline ? text : text.replace(/\n/g, ""));
  };

  return (
    <div
      ref={ref}
      contentEditable={editable}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onInput={handleInput}
      onFocus={() => onFocus?.()}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onMouseDown={(e) => {
        // Allow text editing without starting an Rnd drag.
        if (editable) {
          e.stopPropagation();
          onFocus?.();
        }
      }}
      onPointerDown={(e) => {
        if (editable) e.stopPropagation();
      }}
      style={{
        outline: "none",
        whiteSpace: multiline ? "pre-wrap" : "nowrap",
        cursor: editable ? "text" : "default",
        ...style,
      }}
    />
  );
}

// ---------- Caption (label + headline) ----------

function Caption({
  cW,
  cH,
  slide,
  theme,
  locale,
  editable,
  edit,
  align = "center",
  inverted,
  onFocus,
}: {
  cW: number;
  cH: number;
  slide: Slide;
  theme: Theme;
  locale: string;
  editable?: boolean;
  edit?: EditHandlers;
  align?: TextAlign;
  inverted?: boolean;
  onFocus?: () => void;
}) {
  const fg = inverted ? theme.fgAlt : theme.fg;
  const accent = theme.accent;
  // Scale typography off the *shorter* dimension so landscape layouts don't
  // produce headlines so tall they overlap the device frame.
  const unit = Math.min(cW, cH);
  return (
    <div style={{ textAlign: align, position: "relative", width: "100%" }}>
      <EditableText
        value={pickText(slide.label, locale)}
        editable={editable}
        onChange={edit?.onLabelChange}
        onFocus={onFocus}
        placeholder="LABEL"
        style={{
          fontSize: unit * 0.028,
          fontWeight: 600,
          letterSpacing: unit * 0.0015,
          color: accent,
          textTransform: "uppercase",
          marginBottom: unit * 0.018,
          minHeight: unit * 0.03,
        }}
      />
      <EditableText
        value={pickText(slide.headline, locale)}
        editable={editable}
        multiline
        onChange={edit?.onHeadlineChange}
        onFocus={onFocus}
        placeholder="Headline goes here"
        style={{
          fontSize: unit * 0.092,
          fontWeight: 700,
          lineHeight: 0.96,
          letterSpacing: -unit * 0.001,
          color: fg,
        }}
      />
    </div>
  );
}

// ---------- Decorative blob ----------

function Blob({
  cW,
  color,
  x,
  y,
  size,
  opacity = 0.4,
}: {
  cW: number;
  color: string;
  x: number;
  y: number;
  size: number;
  opacity?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}%`,
        aspectRatio: "1 / 1",
        background: color,
        borderRadius: "50%",
        filter: `blur(${cW * 0.06}px)`,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

// ---------- Default element rects per layout ----------

type Rect = { x: number; y: number; width: number; height: number };
type LayoutRects = {
  caption?: Rect & { align?: TextAlign };
  device?: Rect;
  deviceSecondary?: Rect;
};

function getDefaultRects(
  layout: Slide["layout"],
  cW: number,
  cH: number,
  frameAspect: number,
  fwFrac: number,
  fwSmallFrac: number,
): LayoutRects {
  const deviceW = fwFrac * cW;
  const deviceH = deviceW / frameAspect;
  const smallW = fwSmallFrac * cW;
  const smallH = smallW / frameAspect;
  const capW = cW * 0.84;
  const capH = cH * 0.28;

  switch (layout) {
    case "hero":
      return {
        caption: { x: cW * 0.08, y: cH * 0.09, width: capW, height: capH, align: "center" },
        device: {
          x: (cW - deviceW) / 2,
          y: cH - deviceH + deviceH * 0.15,
          width: deviceW,
          height: deviceH,
        },
      };
    case "device-bottom":
      return {
        caption: { x: cW * 0.08, y: cH * 0.08, width: capW, height: capH, align: "center" },
        device: {
          x: (cW - deviceW) / 2,
          y: cH - deviceH - cH * 0.02,
          width: deviceW,
          height: deviceH,
        },
      };
    case "device-top":
      return {
        caption: { x: cW * 0.08, y: cH * 0.65, width: capW, height: capH, align: "center" },
        device: {
          x: (cW - deviceW) / 2,
          y: -cH * 0.1,
          width: deviceW,
          height: deviceH,
        },
      };
    case "two-devices":
      return {
        caption: { x: cW * 0.08, y: cH * 0.08, width: capW, height: capH, align: "center" },
        deviceSecondary: {
          x: -cW * 0.06,
          y: cH - smallH - cH * 0.05,
          width: smallW,
          height: smallH,
        },
        device: {
          x: cW - deviceW * 0.9 + cW * 0.06,
          y: cH - deviceH * 0.9 - cH * 0.02,
          width: deviceW * 0.9,
          height: (deviceW * 0.9) / frameAspect,
        },
      };
    case "no-device":
      return {
        caption: {
          x: cW * 0.1,
          y: cH * 0.35,
          width: cW * 0.8,
          height: cH * 0.3,
          align: "center",
        },
      };
    case "split-landscape":
      return {
        caption: {
          x: cW * 0.05,
          y: cH * 0.25,
          width: cW * 0.38,
          height: cH * 0.5,
          align: "left",
        },
        device: {
          x: cW - deviceW + cW * 0.03,
          y: (cH - deviceH) / 2,
          width: deviceW,
          height: deviceH,
        },
      };
    case "feature-graphic":
      return getDefaultRects("two-devices", cW, cH, frameAspect, fwFrac, fwSmallFrac);
    default:
      return {};
  }
}

function rectFor(
  id: BuiltInElementId,
  slide: Slide,
  defaults: LayoutRects,
): (Rect & { align?: TextAlign }) | undefined {
  const saved = slide.transforms?.[id];
  const def = defaults[id];
  if (!def && !saved) return undefined;
  if (!saved) return def;
  return {
    x: saved.x,
    y: saved.y,
    width: saved.width,
    height: saved.height,
    align: saved.textAlign ?? (def as { align?: TextAlign } | undefined)?.align ?? "center",
  };
}

function getSlideGeometry(slide: Slide, device: Device, orientation: Orientation) {
  const { cW, cH } = getCanvas(device, orientation);
  const { Comp: Frame, widthFn, smallWidthFn } = getFrameForDevice(device, orientation);
  const frameAspect = getFrameAspect(device, orientation);
  const fwFrac = widthFn(cW, cH);
  const fwSmallFrac = smallWidthFn(cW, cH);
  const defaults = getDefaultRects(slide.layout, cW, cH, frameAspect, fwFrac, fwSmallFrac);
  return { cW, cH, Frame, frameAspect, defaults };
}

export function getElementTransform(
  slide: Slide,
  device: Device,
  orientation: Orientation,
  id: ElementId,
): ElementTransform | undefined {
  if (id.startsWith("text:")) {
    const textId = id.slice("text:".length);
    const textElement = slide.textElements?.find((element) => element.id === textId);
    return textElement?.transform;
  }
  if (isDecorElementId(id)) {
    const decorId = decorElementKey(id);
    return slide.decorElements?.find((element) => element.id === decorId)?.transform;
  }
  const { defaults } = getSlideGeometry(slide, device, orientation);
  const rect = rectFor(id as BuiltInElementId, slide, defaults);
  if (!rect) return undefined;
  const saved = slide.transforms?.[id as BuiltInElementId];
  const def = defaults[id as BuiltInElementId];
  const captionAlign =
    id === "caption"
      ? saved?.textAlign ?? (def as { align?: TextAlign } | undefined)?.align ?? "center"
      : undefined;
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    rotation: saved?.rotation ?? 0,
    zIndex: saved?.zIndex ?? defaultElementZ(id as BuiltInElementId),
    ...(saved?.frameStyle ? { frameStyle: saved.frameStyle } : {}),
    ...(saved?.screenshotFit ? { screenshotFit: saved.screenshotFit } : {}),
    ...(saved?.customFrameId ? { customFrameId: saved.customFrameId } : {}),
    ...(captionAlign ? { textAlign: captionAlign } : {}),
  };
}

function defaultElementZ(id: BuiltInElementId): number {
  if (id === "deviceSecondary") return 2;
  if (id === "device") return 3;
  return 4;
}

// ---------- Main single-screen canvas ----------

export function SlideCanvas({
  slide,
  device,
  orientation,
  theme,
  locale,
  appName,
  appIcon,
  editable,
  edit,
  selectedElementId = null,
  previewScale = 1,
  hideEmpty,
  customFrames,
}: Props) {
  const { cW, cH } = getCanvas(device, orientation);

  const handleBackgroundMouseDown = editable
    ? (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) edit?.onSelectElement?.(null);
      }
    : undefined;

  return (
    <div
      onMouseDown={handleBackgroundMouseDown}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <SlideBackground slide={slide} cW={cW} cH={cH} theme={theme} />
      <SlideElements
        slide={slide}
        device={device}
        orientation={orientation}
        theme={theme}
        locale={locale}
        editable={editable}
        edit={edit}
        selectedElementId={selectedElementId}
        previewScale={previewScale}
        hideEmpty={hideEmpty}
        screenX={0}
        boundsW={cW}
        boundsH={cH}
        allowCrossScreen={false}
        customFrames={customFrames}
      />
    </div>
  );
}

// ---------- Connected deck canvas ----------

export function DeckCanvas({
  slides,
  device,
  orientation,
  theme,
  locale,
  appName,
  appIcon,
  connectedCanvas = true,
  editable,
  edit,
  selectedElement = null,
  activeSlideId = null,
  previewScale = 1,
  hideEmpty,
  showGuides = false,
  customFrames,
}: DeckCanvasProps) {
  const { cW, cH } = getCanvas(device, orientation);
  const totalW = Math.max(1, slides.length) * cW;

  return (
    <div
      style={{
        width: totalW,
        height: cH,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {slides.map((slide, index) => {
        const screenX = index * cW;
        const active = activeSlideId === slide.id;
        return (
          <div
            key={`${slide.id}-bg`}
            onMouseDown={(e) => {
              if (!editable || e.defaultPrevented) return;
              edit?.onSelectScreen?.(slide.id);
              edit?.onSelectElement?.(null);
            }}
            style={{
              position: "absolute",
              left: screenX,
              top: 0,
              width: cW,
              height: cH,
              overflow: "hidden",
            }}
          >
            <SlideBackground slide={slide} cW={cW} cH={cH} theme={theme} />
            {showGuides && <ScreenGuide cW={cW} cH={cH} index={index} active={active} />}
          </div>
        );
      })}

      {slides.map((slide, index) => {
        const selectedElementId =
          selectedElement?.slideId === slide.id ? selectedElement.elementId : null;
        const slideDeviceEditMode =
          selectedElement?.slideId === slide.id &&
          (selectedElement.elementId === "device" || selectedElement.elementId === "deviceSecondary")
            ? selectedElement.deviceEditMode ?? "frame"
            : "frame";
        const perSlideEdit: EditHandlers | undefined = editable
          ? {
              onLabelChange: (v) => edit?.onLabelChange?.(slide.id, v),
              onHeadlineChange: (v) => edit?.onHeadlineChange?.(slide.id, v),
              onTextElementTextChange: (id, v) => edit?.onTextElementTextChange?.(slide.id, id, v),
              onElementChange: (id, t) => edit?.onElementChange?.(slide.id, id, t),
              onSelectElement: (id) => {
                edit?.onSelectScreen?.(slide.id);
                edit?.onSelectElement?.(id ? { slideId: slide.id, elementId: id } : null);
              },
            }
          : undefined;

        const elements = (
          <SlideElements
            key={`${slide.id}-elements`}
            slide={slide}
            device={device}
            orientation={orientation}
            theme={theme}
            locale={locale}
            editable={editable}
            edit={perSlideEdit}
            selectedElementId={selectedElementId}
            deviceEditMode={slideDeviceEditMode}
            previewScale={previewScale}
            hideEmpty={hideEmpty}
            screenX={connectedCanvas ? index * cW : 0}
            boundsW={connectedCanvas ? totalW : cW}
            boundsH={cH}
            allowCrossScreen={connectedCanvas}
            customFrames={customFrames}
          />
        );
        if (connectedCanvas) return elements;
        return (
          <div
            key={`${slide.id}-elements-isolated`}
            style={{
              position: "absolute",
              left: index * cW,
              top: 0,
              width: cW,
              height: cH,
              overflow: "hidden",
            }}
          >
            {elements}
          </div>
        );
      })}
    </div>
  );
}

function SlideBackground({
  slide,
  cW,
  cH,
  theme,
}: {
  slide: Slide;
  cW: number;
  cH: number;
  theme: Theme;
}) {
  const inverted = !!slide.inverted;
  const bg = slide.background;
  const showGlow = bg?.glow !== false;
  const patternStyle = patternOverlayStyle(bg?.pattern, cW, {
    color: bg?.patternColor || (inverted ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.12)"),
    opacity: bg?.patternOpacity ?? 0.35,
    size: bg?.patternSize ?? 1.26,
    dotSize: bg?.patternDotSize,
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: resolveBackgroundCss(bg, theme, inverted),
        color: inverted ? theme.fgAlt : theme.fg,
      }}
    >
      {patternStyle ? (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", ...patternStyle }} />
      ) : null}
      {showGlow ? (
        <>
          <Blob cW={cW} color={theme.accent} x={-15} y={-10} size={55} opacity={inverted ? 0.25 : 0.32} />
          <Blob cW={cW} color={theme.accent} x={70} y={75} size={45} opacity={inverted ? 0.18 : 0.25} />
        </>
      ) : null}
    </div>
  );
}

function ScreenGuide({
  cW,
  cH,
  index,
  active,
}: {
  cW: number;
  cH: number;
  index: number;
  active: boolean;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        outline: `${active ? Math.max(4, cW * 0.003) : Math.max(2, cW * 0.0015)}px solid ${
          active ? "rgba(91, 124, 250, 0.95)" : "rgba(15, 23, 42, 0.22)"
        }`,
        outlineOffset: active ? -Math.max(4, cW * 0.003) : -Math.max(2, cW * 0.0015),
        boxShadow: active
          ? "inset 0 0 0 9999px rgba(91, 124, 250, 0.03)"
          : "inset 0 0 0 1px rgba(255, 255, 255, 0.22)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: cW * 0.035,
          top: cH * 0.024,
          borderRadius: cW * 0.018,
          padding: `${cH * 0.006}px ${cW * 0.018}px`,
          background: active ? "rgba(91, 124, 250, 0.92)" : "rgba(15, 23, 42, 0.72)",
          color: "white",
          fontSize: Math.max(24, cW * 0.022),
          lineHeight: 1,
          fontWeight: 700,
          letterSpacing: 0,
        }}
      >
        {index + 1}
      </div>
    </div>
  );
}

function SlideElements({
  slide,
  device,
  orientation,
  theme,
  locale,
  editable,
  edit,
  selectedElementId,
  deviceEditMode = "frame",
  previewScale,
  hideEmpty,
  screenX,
  boundsW,
  boundsH,
  allowCrossScreen,
  customFrames,
}: {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  editable?: boolean;
  edit?: EditHandlers;
  selectedElementId: ElementId | null;
  deviceEditMode?: "frame" | "screenshot";
  previewScale: number;
  hideEmpty?: boolean;
  screenX: number;
  boundsW: number;
  boundsH: number;
  allowCrossScreen: boolean;
  customFrames?: CustomDeviceFrame[];
}) {
  const screenshot = resolveScreenshot(slide.screenshot, locale);
  const screenshotSecondary = resolveScreenshot(slide.screenshotSecondary, locale);
  const { cW, cH, Frame, frameAspect, defaults } = getSlideGeometry(slide, device, orientation);
  const inverted = !!slide.inverted;
  const captionRect = rectFor("caption", slide, defaults);
  const deviceRect = rectFor("device", slide, defaults);
  const secondaryRect = rectFor("deviceSecondary", slide, defaults);

  const [canvasGuides, setCanvasGuides] = React.useState<{
    x: PanAxisGuide;
    y: PanAxisGuide;
  } | null>(null);
  const canvasCenter = React.useMemo(
    () => ({ x: screenX + cW / 2, y: cH / 2 }),
    [screenX, cW, cH],
  );
  const canvasSnap = React.useMemo(
    () => ({ snapPx: canvasSnapPx(cW), guidePx: canvasGuidePx(cW) }),
    [cW],
  );
  const alignProps = editable
    ? {
        canvasCenter,
        canvasSnap,
        onAlignGuidesChange: setCanvasGuides,
      }
    : {};

  function toGlobal(rect: Rect): Rect {
    return { ...rect, x: rect.x + screenX };
  }

  function toLocal(t: ElementTransform): ElementTransform {
    return { ...t, x: t.x - screenX };
  }

  function renderCaption() {
    if (!captionRect) return null;
    const saved = slide.transforms?.caption;
    const rotation = saved?.rotation ?? 0;
    const zIndex = saved?.zIndex ?? 4;
    const inner = (
      <Caption
        cW={cW}
        cH={cH}
        slide={slide}
        theme={theme}
        locale={locale}
        editable={editable}
        edit={edit}
        align={captionRect.align || "center"}
        inverted={inverted}
        onFocus={() => edit?.onSelectElement?.("caption")}
      />
    );
    return (
      <Movable
        rect={toGlobal(captionRect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        {...alignProps}
        onChange={(t) =>
          edit?.onElementChange?.(
            "caption",
            toLocal({
              ...saved,
              ...t,
              rotation: t.rotation ?? saved?.rotation ?? rotation,
              zIndex: t.zIndex ?? saved?.zIndex ?? zIndex,
            }),
          )
        }
        zIndex={zIndex}
        selected={selectedElementId === "caption"}
        onSelect={() => edit?.onSelectElement?.("caption")}
        allowOverflow={allowCrossScreen}
      >
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-start" }}>
          {inner}
        </div>
      </Movable>
    );
  }

  function renderDevice(id: "device" | "deviceSecondary", rect: Rect, src: string, extraStyle?: React.CSSProperties) {
    const saved = slide.transforms?.[id];
    const rotation = saved?.rotation ?? 0;
    const zIndex = saved?.zIndex ?? (id === "deviceSecondary" ? 2 : 3);
    const frameStyle = saved?.frameStyle ?? "flat";
    const screenshotFit = saved?.screenshotFit;
    const customFrame = saved?.customFrameId
      ? customFrames?.find((frame) => frame.id === saved.customFrameId)
      : undefined;
    const deviceFrameAspect = customFrame ? customFrameAspect(customFrame) : frameAspect;
    const adjustScreenshot =
      editable && selectedElementId === id && deviceEditMode === "screenshot";
    return (
      <Movable
        rect={toGlobal(rect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        {...alignProps}
        onChange={(t) =>
          edit?.onElementChange?.(
            id,
            toLocal({
              ...saved,
              ...t,
              rotation: t.rotation ?? saved?.rotation ?? rotation,
              zIndex: t.zIndex ?? saved?.zIndex ?? zIndex,
            }),
          )
        }
        lockAspectRatio={deviceFrameAspect}
        zIndex={zIndex}
        allowOverflow
        selected={selectedElementId === id}
        onSelect={() => edit?.onSelectElement?.(id)}
      >
        {customFrame ? (
          <CustomPhone
            frameSrc={customFrame.src}
            frameWidth={customFrame.width}
            frameHeight={customFrame.height}
            screen={customFrame.screen}
            src={src}
            hideEmpty={hideEmpty}
            frameStyle={frameStyle}
            screenshotFit={screenshotFit}
            adjustScreenshot={adjustScreenshot}
            onScreenshotFitChange={(fit) =>
              edit?.onElementChange?.(id, {
                ...getElementTransform(slide, device, orientation, id)!,
                screenshotFit: fit,
              })
            }
            style={{ width: "100%", height: "100%", ...extraStyle }}
          />
        ) : (
          <Frame
            src={src}
            hideEmpty={hideEmpty}
            frameStyle={frameStyle}
            screenshotFit={screenshotFit}
            adjustScreenshot={adjustScreenshot}
            onScreenshotFitChange={(fit) =>
              edit?.onElementChange?.(id, {
                ...getElementTransform(slide, device, orientation, id)!,
                screenshotFit: fit,
              })
            }
            style={{ width: "100%", height: "100%", ...extraStyle }}
          />
        )}
      </Movable>
    );
  }

  function renderTextElement(textElement: TextElement, index: number) {
    const elementId = toTextElementId(textElement.id);
    const rect = textElement.transform;
    const rotation = rect.rotation ?? 0;
    const zIndex = rect.zIndex ?? 5 + index;
    const textColor = textElement.color || (inverted ? theme.fgAlt : theme.fg);
    return (
      <Movable
        key={textElement.id}
        rect={toGlobal(rect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        {...alignProps}
        onChange={(t) =>
          edit?.onElementChange?.(
            elementId,
            toLocal({
              ...t,
              rotation: t.rotation ?? rotation,
              zIndex: t.zIndex ?? zIndex,
            }),
          )
        }
        zIndex={zIndex}
        selected={selectedElementId === elementId}
        onSelect={() => edit?.onSelectElement?.(elementId)}
        allowOverflow={allowCrossScreen}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent:
              textElement.align === "right"
                ? "flex-end"
                : textElement.align === "left"
                  ? "flex-start"
                  : "center",
            padding: `${Math.min(cW, cH) * 0.012}px`,
          }}
        >
          <EditableText
            value={pickText(textElement.text, locale)}
            editable={editable}
            multiline
            onChange={(value) => edit?.onTextElementTextChange?.(textElement.id, value)}
            onFocus={() => edit?.onSelectElement?.(elementId)}
            placeholder="Text"
            style={{
              width: "100%",
              color: textColor,
              fontSize: textElement.fontSize ?? Math.min(cW, cH) * 0.06,
              fontWeight: textElement.fontWeight ?? 700,
              lineHeight: 1.05,
              textAlign: textElement.align ?? "center",
              textShadow: inverted ? "0 2px 18px rgba(0,0,0,0.22)" : "0 2px 18px rgba(255,255,255,0.2)",
            }}
          />
        </div>
      </Movable>
    );
  }

  return (
    <>
      {(slide.decorElements || [])
        .filter((el) => (el.transform.zIndex ?? decorDefaultZ(el)) < 4)
        .map((el, index) => renderDecorElement(el, index))}
      {secondaryRect &&
        renderDevice(
          "deviceSecondary",
          secondaryRect,
          screenshotSecondary || screenshot,
          { opacity: 0.85 },
        )}
      {deviceRect && renderDevice("device", deviceRect, screenshot)}
      {renderCaption()}
      {(slide.decorElements || [])
        .filter((el) => (el.transform.zIndex ?? decorDefaultZ(el)) >= 4)
        .map((el, index) => renderDecorElement(el, index))}
      {(slide.textElements || []).map(renderTextElement)}
      {editable && canvasGuides ? (
        <div
          style={{
            position: "absolute",
            left: screenX,
            top: 0,
            width: cW,
            height: cH,
            pointerEvents: "none",
            zIndex: 10000,
          }}
        >
          <CenterAlignmentGuides x={canvasGuides.x} y={canvasGuides.y} />
        </div>
      ) : null}
    </>
  );

  function decorDefaultZ(el: DecorElement): number {
    if (el.kind === "device-frame") return 3;
    if (el.kind === "blob") return 1;
    if (el.kind === "pattern") return 1;
    if (el.kind === "shape") return 2;
    return 6;
  }

  function renderDecorElement(element: DecorElement, index: number) {
    const elementId = toDecorElementId(element.id);
    const rect = element.transform;
    const rotation = rect.rotation ?? 0;
    const zIndex = rect.zIndex ?? decorDefaultZ(element);
    const resolvedSrc = element.src ? img(resolveScreenshot(element.src, locale)) : "";
    let lockAspectRatio: number | undefined;
    const adjustScreenshot =
      editable && selectedElementId === elementId && deviceEditMode === "screenshot";

    let inner: React.ReactNode = null;
    if (element.kind === "device-frame" && resolvedSrc) {
      const frameStyle = rect.frameStyle ?? "flat";
      const screenshotFit = rect.screenshotFit;
      const customFrame = rect.customFrameId
        ? customFrames?.find((frame) => frame.id === rect.customFrameId)
        : undefined;
      lockAspectRatio = customFrame ? customFrameAspect(customFrame) : frameAspect;
      inner = customFrame ? (
        <CustomPhone
          frameSrc={customFrame.src}
          frameWidth={customFrame.width}
          frameHeight={customFrame.height}
          screen={customFrame.screen}
          src={resolvedSrc}
          hideEmpty={hideEmpty}
          frameStyle={frameStyle}
          screenshotFit={screenshotFit}
          adjustScreenshot={adjustScreenshot}
          onScreenshotFitChange={(fit) =>
            edit?.onElementChange?.(elementId, {
              ...rect,
              screenshotFit: fit,
            })
          }
        />
      ) : (
        <Frame
          src={resolvedSrc}
          hideEmpty={hideEmpty}
          frameStyle={frameStyle}
          screenshotFit={screenshotFit}
          adjustScreenshot={adjustScreenshot}
          onScreenshotFitChange={(fit) =>
            edit?.onElementChange?.(elementId, {
              ...rect,
              screenshotFit: fit,
            })
          }
        />
      );
    } else if (element.kind === "image" && resolvedSrc) {
      inner = (
        <img
          src={resolvedSrc}
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            opacity: element.opacity ?? 1,
            borderRadius: element.borderRadius ?? 0,
          }}
        />
      );
    } else if (element.kind === "shape") {
      const shape = element.shape ?? "rectangle";
      const radius =
        shape === "circle" ? "50%" : shape === "pill" ? "999px" : `${element.borderRadius ?? 12}px`;
      inner = (
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: radius,
            background: element.fill || theme.accent,
            opacity: element.opacity ?? 0.85,
            border: element.stroke
              ? `${element.strokeWidth ?? 2}px solid ${element.stroke}`
              : undefined,
            boxSizing: "border-box",
          }}
        />
      );
    } else if (element.kind === "pattern") {
      const patternSpan = Math.max(rect.width, rect.height, 1);
      const pat = patternOverlayStyle(element.pattern ?? "grid", patternSpan, {
        color: element.patternColor || "rgba(255,255,255,0.4)",
        opacity: element.patternOpacity ?? 0.5,
        size: element.patternSize ?? 1,
      });
      inner = (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          {editable && (
            <div
              aria-hidden
              style={{ position: "absolute", inset: 0, zIndex: 1, cursor: "move" }}
            />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: element.borderRadius ?? 0,
              overflow: "hidden",
              background: element.fill || "transparent",
              pointerEvents: "none",
              ...pat,
            }}
          />
        </div>
      );
    } else if (element.kind === "blob") {
      const blurPx = element.blur ?? 48;
      inner = (
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: element.fill || theme.accent,
            opacity: element.opacity ?? 0.55,
            filter: `blur(${blurPx}px)`,
            transform: "scale(1.08)",
          }}
        />
      );
    }

    return (
      <Movable
        key={element.id}
        rect={toGlobal(rect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        {...alignProps}
        onChange={(t) =>
          edit?.onElementChange?.(
            elementId,
            toLocal({
              ...rect,
              ...t,
              rotation: t.rotation ?? rotation,
              zIndex: t.zIndex ?? zIndex,
            }),
          )
        }
        zIndex={zIndex}
        selected={selectedElementId === elementId}
        onSelect={() => edit?.onSelectElement?.(elementId)}
        allowOverflow={
          allowCrossScreen ||
          element.kind === "blob" ||
          element.kind === "pattern" ||
          element.kind === "device-frame"
        }
        lockAspectRatio={lockAspectRatio}
      >
        <div style={{ width: "100%", height: "100%" }}>{inner}</div>
      </Movable>
    );
  }
}

// ---------- Movable wrapper ----------

// Fraction of an element's width/height that must remain inside the canvas
// when overflow is allowed. Keeps a graspable handle visible so the user can
// always drag the element back onto the canvas.
const MIN_VISIBLE_FRAC = 0.1;

function clampRect(
  r: { x: number; y: number; width: number; height: number },
  boundsW: number,
  boundsH: number,
  allowOverflow = false,
) {
  if (allowOverflow) {
    const width = r.width;
    const height = r.height;
    const minVisX = Math.max(8, width * MIN_VISIBLE_FRAC);
    const minVisY = Math.max(8, height * MIN_VISIBLE_FRAC);
    const x = Math.max(-(width - minVisX), Math.min(r.x, boundsW - minVisX));
    const y = Math.max(-(height - minVisY), Math.min(r.y, boundsH - minVisY));
    return { x, y, width, height };
  }
  const width = Math.min(r.width, boundsW);
  const height = Math.min(r.height, boundsH);
  const x = Math.max(0, Math.min(r.x, boundsW - width));
  const y = Math.max(0, Math.min(r.y, boundsH - height));
  return { x, y, width, height };
}

function Movable({
  rect,
  boundsW,
  boundsH,
  editable,
  previewScale,
  onChange,
  children,
  lockAspectRatio,
  zIndex,
  rotation = 0,
  allowOverflow = false,
  selected = false,
  onSelect,
  canvasCenter,
  canvasSnap,
  onAlignGuidesChange,
}: {
  rect: Rect;
  boundsW: number;
  boundsH: number;
  editable?: boolean;
  previewScale: number;
  onChange: (t: ElementTransform) => void;
  children: React.ReactNode;
  lockAspectRatio?: number | boolean;
  zIndex?: number;
  rotation?: number;
  allowOverflow?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  canvasCenter?: { x: number; y: number };
  canvasSnap?: { snapPx: number; guidePx: number };
  onAlignGuidesChange?: (guides: { x: PanAxisGuide; y: PanAxisGuide } | null) => void;
}) {
  const rotationRef = React.useRef(rotation);
  React.useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  function startRotate(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    onSelect?.();

    const root = e.currentTarget.closest(".rnd-editable") as HTMLElement | null;
    if (!root) return;
    const box = root.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const startAngle = pointerAngle(e.clientX, e.clientY, centerX, centerY);
    const startRotation = rotationRef.current;

    const handleMove = (event: PointerEvent) => {
      event.preventDefault();
      const nextRotation = normalizeRotation(
        startRotation + pointerAngle(event.clientX, event.clientY, centerX, centerY) - startAngle,
      );
      rotationRef.current = nextRotation;
      onChange({
        x: display.x,
        y: display.y,
        width: display.width,
        height: display.height,
        rotation: nextRotation,
        zIndex,
      });
    };
    const stopRotate = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopRotate);
      window.removeEventListener("pointercancel", stopRotate);
    };

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", stopRotate, { once: true });
    window.addEventListener("pointercancel", stopRotate, { once: true });
  }

  // Rotation lives on the inner wrapper so the Rnd's axis-aligned rect remains
  // the authoritative bounding box for drag/resize math. A bare mousedown
  // listener (no stopPropagation — that would prevent react-rnd from starting
  // a drag) marks the element as the current selection.
  const rotated = (
    <div
      onMouseDown={() => {
        if (editable) onSelect?.();
      }}
      style={{
        width: "100%",
        height: "100%",
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  );

  // Non-editable (export/thumb) path: plain absolute-positioned div, no Rnd.
  if (!editable) {
    return (
      <div
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          zIndex,
        }}
      >
        {rotated}
      </div>
    );
  }

  const display = clampRect(rect, boundsW, boundsH, allowOverflow);
  const controlScale = Math.max(0.05, previewScale);
  const interactionZIndex =
    selected && editable ? 10000 + (zIndex ?? 0) : zIndex;

  function updateAlignGuides(x: number, y: number) {
    if (!canvasCenter || !canvasSnap || !onAlignGuidesChange) return;
    onAlignGuidesChange(
      guidesForRectCenter(
        x,
        y,
        display.width,
        display.height,
        canvasCenter.x,
        canvasCenter.y,
        canvasSnap.guidePx,
        canvasSnap.snapPx,
      ),
    );
  }

  function snapDragPosition(x: number, y: number) {
    if (!canvasCenter || !canvasSnap) return { x, y };
    return snapPositionToCanvasCenter(
      x,
      y,
      display.width,
      display.height,
      canvasCenter.x,
      canvasCenter.y,
      canvasSnap.snapPx,
    );
  }

  return (
    <Rnd
      bounds={allowOverflow ? undefined : "parent"}
      scale={previewScale}
      lockAspectRatio={lockAspectRatio}
      position={{ x: display.x, y: display.y }}
      size={{ width: display.width, height: display.height }}
      onDragStart={() => onSelect?.()}
      onResizeStart={() => onSelect?.()}
      onDrag={(_e, d) => updateAlignGuides(d.x, d.y)}
      onDragStop={(_e, d) => {
        onAlignGuidesChange?.(null);
        const snapped = snapDragPosition(d.x, d.y);
        const next = clampRect(
          { x: snapped.x, y: snapped.y, width: display.width, height: display.height },
          boundsW,
          boundsH,
          allowOverflow,
        );
        onChange({ ...next, rotation, zIndex });
      }}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        const next = clampRect(
          {
            x: position.x,
            y: position.y,
            width: parseFloat(ref.style.width),
            height: parseFloat(ref.style.height),
          },
          boundsW,
          boundsH,
          allowOverflow,
        );
        onChange({ ...next, rotation, zIndex });
      }}
      style={{ zIndex: interactionZIndex }}
      resizeHandleStyles={handleStyle}
      className={selected ? "rnd-editable rnd-selected" : "rnd-editable"}
    >
      {rotated}
      <button
        type="button"
        className="rnd-rotate-handle"
        style={{
          right: -14 / controlScale,
          top: -14 / controlScale,
          width: 28 / controlScale,
          height: 28 / controlScale,
        }}
        onPointerDown={startRotate}
        title="Rotate"
        aria-label="Rotate element"
      >
        <RotateCw style={{ width: 14 / controlScale, height: 14 / controlScale }} />
      </button>
    </Rnd>
  );
}

function pointerAngle(x: number, y: number, centerX: number, centerY: number) {
  return (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;
}

function normalizeRotation(degrees: number) {
  let next = degrees;
  while (next > 180) next -= 360;
  while (next < -180) next += 360;
  return Math.round(next);
}

// Subtle resize handles (visible only on hover via globals.css).
const handleSize = 14;
const handleStyle: Record<string, React.CSSProperties> = {
  top: { height: handleSize },
  right: { width: handleSize },
  bottom: { height: handleSize },
  left: { width: handleSize },
  topRight: { width: handleSize, height: handleSize },
  bottomRight: { width: handleSize, height: handleSize },
  bottomLeft: { width: handleSize, height: handleSize },
  topLeft: { width: handleSize, height: handleSize },
};
