"use client";
import * as React from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCw,
  Trash2,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LAYOUT_HINT, LAYOUT_LABEL } from "@/lib/constants";
import { DEVICE_FRAME_STYLE_LABEL } from "@/lib/frame-styles";
import { deleteElementPatch, isDeletableElement, isDeviceLikeElement } from "@/lib/element-actions";
import { nid } from "@/lib/defaults";
import {
  isBuiltInElementId,
  isDecorElementId,
  isTextElementId,
  decorElementKey,
  textElementKey,
  toDecorElementId,
  toTextElementId,
} from "@/lib/elements";
import { pickText, writeLocalized } from "@/lib/locale";
import type {
  BuiltInElementId,
  CustomDeviceFrame,
  DecorElement,
  Device,
  DeviceEditMode,
  DeviceFrameStyle,
  ElementId,
  ElementTransform,
  Orientation,
  ScreenshotFit,
  ScreenshotAlign,
  ScreenshotFitMode,
  Slide,
  SlideLayout,
  TextAlign,
  TextElement,
  Theme,
} from "@/lib/types";
import { snapPan } from "@/lib/screenshot-align";
import { BackgroundControls } from "./background-controls";
import { CustomFrameControls } from "./custom-frame-controls";
import { Screenshot3dControls } from "./screenshot-3d-controls";
import { ScreenshotPicker } from "./screenshot-picker";
import { getCanvas, getElementTransform } from "./slide-canvas";
import { mergedFit } from "@/lib/screenshot-fit";

type Props = {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  locale: string;
  theme: Theme;
  appIcon?: string;
  selectedElementId: ElementId | null;
  deviceEditMode?: DeviceEditMode;
  onDeviceEditModeChange?: (mode: DeviceEditMode) => void;
  onChange: (patch: Partial<Slide>) => void;
  onSelectElement: (id: ElementId | null) => void;
  customFrames?: CustomDeviceFrame[];
  onCustomFramesChange?: (frames: CustomDeviceFrame[]) => void;
};

const ELEMENT_LABEL: Record<BuiltInElementId, string> = {
  caption: "Headline",
  device: "Device",
  deviceSecondary: "Back device",
};

export function Inspector({
  slide,
  device,
  orientation,
  locale,
  theme,
  appIcon,
  selectedElementId,
  deviceEditMode = "frame",
  onDeviceEditModeChange,
  onChange,
  onSelectElement,
  customFrames = [],
  onCustomFramesChange,
}: Props) {
  const isFeatureGraphicDevice = device === "feature-graphic";
  const isNoDevice = slide.layout === "no-device";
  const layoutValue = slide.layout === "feature-graphic" ? "two-devices" : slide.layout;
  const layoutOptions = Object.entries(LAYOUT_LABEL).filter(
    ([layout]) => layout !== "feature-graphic",
  );
  const localeLabel = slide.label?.[locale] ?? "";
  const localeHeadline = slide.headline?.[locale] ?? "";
  const headlineDefault = "One idea\nper slide.";
  const labelPlaceholder = localeLabel ? "FEATURE 01" : pickText(slide.label, locale) || "FEATURE 01";
  const headlinePlaceholder = localeHeadline
    ? headlineDefault
    : pickText(slide.headline, locale) || headlineDefault;

  function setLocaleField(key: "label" | "headline", value: string) {
    onChange({ [key]: writeLocalized(slide[key], locale, value) } as Partial<Slide>);
  }

  function addOrganicBackgroundShapes() {
    const { cW, cH } = getCanvas(device, orientation);
    const accent = theme.accent;
    const dark = theme.bg;
    const blobs: DecorElement[] = [
      {
        id: nid(),
        kind: "blob",
        fill: dark,
        opacity: 0.65,
        blur: 56,
        transform: {
          x: -cW * 0.12,
          y: cH * 0.08,
          width: cW * 0.55,
          height: cW * 0.55,
          rotation: 0,
          zIndex: 1,
        },
      },
      {
        id: nid(),
        kind: "blob",
        fill: accent,
        opacity: 0.45,
        blur: 72,
        transform: {
          x: cW * 0.52,
          y: cH * 0.55,
          width: cW * 0.48,
          height: cW * 0.48,
          rotation: 0,
          zIndex: 1,
        },
      },
      {
        id: nid(),
        kind: "pattern",
        pattern: "dots",
        patternColor: "rgba(255,255,255,0.55)",
        patternOpacity: 0.35,
        patternSize: 1.2,
        transform: {
          x: cW * 0.62,
          y: cH * 0.68,
          width: cW * 0.34,
          height: cH * 0.28,
          rotation: 0,
          zIndex: 2,
        },
      },
    ];
    onChange({
      background: {
        mode: "gradient",
        color: theme.bg,
        colorEnd: accent,
        angle: 155,
        glow: true,
        pattern: "none",
        ...slide.background,
      },
      decorElements: [...(slide.decorElements || []), ...blobs],
    });
  }

  React.useEffect(() => {
    if (slide.layout !== "feature-graphic") return;
    onChange({
      layout: "two-devices",
      screenshotSecondary: slide.screenshotSecondary || slide.screenshot,
    });
  }, [onChange, slide.layout, slide.screenshot, slide.screenshotSecondary]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Screen settings</h2>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            editing · {locale.toUpperCase()}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {isFeatureGraphicDevice ? "1024×500 Play Store banner · " : ""}
          {LAYOUT_HINT[layoutValue]}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Layout</Label>
          <Select
            value={layoutValue}
            onValueChange={(layout) => {
              const next = layout as SlideLayout;
              onChange({
                layout: next,
                transforms: undefined,
                screenshotSecondary:
                  next === "two-devices" ? slide.screenshotSecondary || slide.screenshot : undefined,
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {layoutOptions.map(([layout, label]) => (
                <SelectItem key={layout} value={layout}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Label</Label>
          <Input
            value={localeLabel}
            onChange={(e) => setLocaleField("label", e.target.value)}
            placeholder={labelPlaceholder}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label className="text-xs">Headline</Label>
            <span className="text-[10px] text-muted-foreground">newline = break</span>
          </div>
          <Textarea
            value={localeHeadline}
            onChange={(e) => setLocaleField("headline", e.target.value)}
            rows={3}
            placeholder={headlinePlaceholder}
          />
        </div>

        {!isNoDevice && (
          <div className="space-y-1.5">
            <Label className="text-xs">
              {slide.layout === "two-devices" ? "Front device screenshot" : "Screenshot"}
            </Label>
            <ScreenshotPicker
              label="Primary"
              value={slide.screenshot}
              locale={locale}
              onChange={(v) => onChange({ screenshot: v })}
            />
          </div>
        )}

        {slide.layout === "two-devices" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Back device screenshot</Label>
            <ScreenshotPicker
              label="Secondary (back layer)"
              value={slide.screenshotSecondary || ""}
              locale={locale}
              onChange={(v) => onChange({ screenshotSecondary: v })}
            />
          </div>
        )}

        <BackgroundControls
          slide={slide}
          theme={theme}
          onChange={onChange}
          onAddOrganicShapes={() => addOrganicBackgroundShapes()}
        />

        <ElementTransformControls
          slide={slide}
          device={device}
          orientation={orientation}
          locale={locale}
          theme={theme}
          appIcon={appIcon}
          selectedElementId={selectedElementId}
          deviceEditMode={deviceEditMode}
          onDeviceEditModeChange={onDeviceEditModeChange}
          onChange={onChange}
          onSelectElement={onSelectElement}
          customFrames={customFrames}
          onCustomFramesChange={onCustomFramesChange}
        />

        {isFeatureGraphicDevice && (
          <p className="rounded-md border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
            Exports as PNG 1024×500 (Play Store limit 15 MB). Use Move frame to position the device; switch to Pan screenshot to fit inside the screen.
          </p>
        )}

      </div>
    </div>
  );
}

function ElementTransformControls({
  slide,
  device,
  orientation,
  locale,
  theme,
  appIcon,
  selectedElementId,
  deviceEditMode = "frame",
  onDeviceEditModeChange,
  onChange,
  onSelectElement,
  customFrames = [],
  onCustomFramesChange,
}: {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  locale: string;
  theme: Theme;
  appIcon?: string;
  selectedElementId: ElementId | null;
  deviceEditMode?: DeviceEditMode;
  onDeviceEditModeChange?: (mode: DeviceEditMode) => void;
  onChange: (patch: Partial<Slide>) => void;
  onSelectElement: (id: ElementId | null) => void;
  customFrames?: CustomDeviceFrame[];
  onCustomFramesChange?: (frames: CustomDeviceFrame[]) => void;
}) {
  const present: ElementId[] = ["caption"];
  if (slide.layout !== "no-device") present.push("device");
  if (slide.layout === "two-devices") present.push("deviceSecondary");
  for (const element of slide.decorElements || []) present.push(toDecorElementId(element.id));
  for (const element of slide.textElements || []) present.push(toTextElementId(element.id));

  const transforms = slide.transforms || {};
  const activeId =
    selectedElementId && present.includes(selectedElementId) ? selectedElementId : null;
  const activeTransform = activeId
    ? getElementTransform(slide, device, orientation, activeId)
    : undefined;
  const activeTextElement =
    activeId && isTextElementId(activeId)
      ? slide.textElements?.find((element) => element.id === textElementKey(activeId))
      : null;

  const activeDecorElement =
    activeId && isDecorElementId(activeId)
      ? slide.decorElements?.find((element) => element.id === decorElementKey(activeId))
      : null;

  function getTransform(id: ElementId) {
    return getElementTransform(slide, device, orientation, id);
  }

  function patchElement(id: ElementId, patch: Partial<ElementTransform>) {
    const cur = getTransform(id);
    if (!cur) return;
    if (isTextElementId(id)) {
      const textId = textElementKey(id);
      onChange({
        textElements: (slide.textElements || []).map((element) =>
          element.id === textId
            ? { ...element, transform: { ...element.transform, ...patch } }
            : element,
        ),
      });
      return;
    }
    if (isDecorElementId(id)) {
      const decorId = decorElementKey(id);
      onChange({
        decorElements: (slide.decorElements || []).map((element) => {
          if (element.id !== decorId) return element;
          const merged: ElementTransform = { ...element.transform, ...patch };
          if (patch.screenshotFit) {
            merged.screenshotFit = { ...element.transform.screenshotFit, ...patch.screenshotFit };
          }
          return { ...element, transform: merged };
        }),
      });
      return;
    }
    if (!isBuiltInElementId(id)) return;
    const merged: ElementTransform = { ...cur, ...patch };
    if (patch.screenshotFit) {
      merged.screenshotFit = { ...cur.screenshotFit, ...patch.screenshotFit };
    }
    onChange({
      transforms: { ...transforms, [id]: merged },
    });
  }

  function patchTextElement(id: string, patch: Partial<TextElement>) {
    onChange({
      textElements: (slide.textElements || []).map((element) =>
        element.id === id ? { ...element, ...patch } : element,
      ),
    });
  }

  function setTextElementValue(element: TextElement, value: string) {
    patchTextElement(element.id, { text: writeLocalized(element.text, locale, value) });
  }

  function deleteActiveElement() {
    if (!activeId || !isDeletableElement(activeId, slide)) return;
    const patch = deleteElementPatch(slide, activeId);
    if (!patch) return;
    onChange(patch);
    onSelectElement(null);
  }

  function addDecorElement(kind: DecorElement["kind"], extra?: Partial<DecorElement>) {
    const { cW, cH } = getCanvas(device, orientation);
    const id = nid();
    const zIndex =
      Math.max(
        1,
        ...present.map((elementId) => getTransform(elementId)?.zIndex ?? defaultZ(elementId)),
      ) + 1;

    const base: DecorElement = {
      id,
      kind,
      transform: {
        x: cW * 0.1,
        y: cH * 0.1,
        width: cW * 0.25,
        height: cH * 0.25,
        rotation: 0,
        zIndex,
      },
      opacity: 1,
      ...extra,
    };

    if (kind === "image") {
      base.src = appIcon || "/app-icon.png";
      base.transform = {
        x: cW * 0.08,
        y: cH * 0.08,
        width: cW * 0.14,
        height: cW * 0.14,
        rotation: 0,
        zIndex: 6,
      };
      base.borderRadius = 16;
    } else if (kind === "shape") {
      base.shape = "rectangle";
      base.fill = theme.accent;
      base.opacity = 0.75;
      base.transform = {
        x: cW * 0.55,
        y: cH * 0.12,
        width: cW * 0.32,
        height: cH * 0.18,
        rotation: 0,
        zIndex: 2,
      };
    } else if (kind === "pattern") {
      base.pattern = "grid";
      base.patternColor = "rgba(255,255,255,0.35)";
      base.patternOpacity = 0.45;
      base.transform = {
        x: 0,
        y: 0,
        width: cW,
        height: cH,
        rotation: 0,
        zIndex: 1,
      };
    } else if (kind === "blob") {
      base.fill = theme.accent;
      base.opacity = 0.5;
      base.blur = 48;
      base.transform = {
        x: cW * 0.05,
        y: cH * 0.45,
        width: cW * 0.42,
        height: cW * 0.42,
        rotation: 0,
        zIndex: 1,
      };
    }

    onChange({ decorElements: [...(slide.decorElements || []), base] });
    onSelectElement(toDecorElementId(id));
  }

  function addTextElement() {
    const { cW, cH } = getCanvas(device, orientation);
    const id = nid();
    const zIndex =
      Math.max(
        5,
        ...present.map((elementId) => getTransform(elementId)?.zIndex ?? defaultZ(elementId)),
      ) + 1;
    const element: TextElement = {
      id,
      text: writeLocalized({}, locale, "New text"),
      transform: {
        x: cW * 0.18,
        y: cH * 0.42,
        width: cW * 0.64,
        height: cH * 0.12,
        rotation: 0,
        zIndex,
      },
      fontSize: Math.round(Math.min(cW, cH) * 0.065),
      fontWeight: 800,
      align: "center",
    };
    onChange({ textElements: [...(slide.textElements || []), element] });
    onSelectElement(toTextElementId(id));
  }

  // Z-order: re-rank zIndex among present elements so they remain contiguous.
  function reorder(id: ElementId, dir: "front" | "back" | "up" | "down") {
    const ranked = [...present].sort((a, b) => {
      const za = getTransform(a)?.zIndex ?? defaultZ(a);
      const zb = getTransform(b)?.zIndex ?? defaultZ(b);
      return za - zb;
    });
    const idx = ranked.indexOf(id);
    if (idx === -1) return;
    let target = idx;
    if (dir === "front") target = ranked.length - 1;
    else if (dir === "back") target = 0;
    else if (dir === "up") target = Math.min(ranked.length - 1, idx + 1);
    else if (dir === "down") target = Math.max(0, idx - 1);
    if (target === idx) return;
    ranked.splice(idx, 1);
    ranked.splice(target, 0, id);
    const nextTransforms = { ...transforms };
    const nextTextElements = (slide.textElements || []).map((element) => ({
      ...element,
      transform: { ...element.transform },
    }));
    const nextDecorElements = (slide.decorElements || []).map((element) => ({
      ...element,
      transform: { ...element.transform },
    }));
    ranked.forEach((eid, i) => {
      const cur = getTransform(eid);
      if (!cur) return;
      if (isTextElementId(eid)) {
        const textId = textElementKey(eid);
        const textElement = nextTextElements.find((element) => element.id === textId);
        if (textElement) textElement.transform = { ...textElement.transform, zIndex: i + 1 };
      } else if (isDecorElementId(eid)) {
        const decorId = decorElementKey(eid);
        const decorElement = nextDecorElements.find((element) => element.id === decorId);
        if (decorElement) decorElement.transform = { ...decorElement.transform, zIndex: i + 1 };
      } else if (isBuiltInElementId(eid)) {
        nextTransforms[eid] = { ...cur, zIndex: i + 1 };
      }
    });
    onChange({
      transforms: nextTransforms,
      textElements: nextTextElements,
      decorElements: nextDecorElements.length > 0 ? nextDecorElements : undefined,
    });
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Label className="text-xs font-semibold">Elements</Label>
          <p className="text-[11px] text-muted-foreground">
            {activeId
              ? "Fine-tune the selected element's rotation and stacking."
              : "Click an element on the canvas to fine-tune its rotation and stacking."}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={addTextElement}>
            <Plus className="h-3.5 w-3.5" />
            Text
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => addDecorElement("image")}
          >
            <Plus className="h-3.5 w-3.5" />
            Logo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => addDecorElement("shape")}
          >
            <Plus className="h-3.5 w-3.5" />
            Shape
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => addDecorElement("pattern")}
          >
            <Plus className="h-3.5 w-3.5" />
            Grid
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => addDecorElement("blob")}
          >
            <Plus className="h-3.5 w-3.5" />
            Blob
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {present.map((id) => (
          <Button
            key={id}
            type="button"
            variant={activeId === id ? "secondary" : "outline"}
            size="sm"
            className="h-7 px-2 text-[10px]"
            onClick={() => onSelectElement(id)}
          >
            {elementListLabel(id, slide, locale)}
          </Button>
        ))}
      </div>

      {activeId ? (
        <ActiveElementPanel
          slide={slide}
          activeId={activeId}
          device={device}
          deviceEditMode={deviceEditMode}
          onDeviceEditModeChange={onDeviceEditModeChange}
          transform={activeTransform}
          textElement={activeTextElement || undefined}
          decorElement={activeDecorElement || undefined}
          locale={locale}
          onRotate={(rotation) => patchElement(activeId, { rotation })}
          onReorder={(dir) => reorder(activeId, dir)}
          onFrameStyleChange={(frameStyle) => patchElement(activeId, { frameStyle })}
          onScreenshotFitChange={(screenshotFit) => patchElement(activeId, { screenshotFit })}
          onDecorPatch={(patch) => {
            if (!activeDecorElement) return;
            onChange({
              decorElements: (slide.decorElements || []).map((element) =>
                element.id === activeDecorElement.id ? { ...element, ...patch } : element,
              ),
            });
          }}
          onTextChange={(value) => {
            if (activeTextElement) setTextElementValue(activeTextElement, value);
          }}
          onTextPatch={(patch) => {
            if (activeTextElement) patchTextElement(activeTextElement.id, patch);
          }}
          onTransformPatch={(patch) => {
            if (activeId) patchElement(activeId, patch);
          }}
          customFrames={customFrames}
          onCustomFramesChange={onCustomFramesChange}
          onDelete={deleteActiveElement}
          canDelete={activeId ? isDeletableElement(activeId, slide) : false}
        />
      ) : (
        <div className="rounded border border-dashed bg-background/40 p-4 text-center text-[11px] text-muted-foreground">
          No element selected
        </div>
      )}
    </div>
  );
}

function ActiveElementPanel({
  slide,
  activeId,
  device,
  deviceEditMode = "frame",
  onDeviceEditModeChange,
  transform,
  textElement,
  decorElement,
  locale,
  onRotate,
  onReorder,
  onFrameStyleChange,
  onScreenshotFitChange,
  onDecorPatch,
  onTextChange,
  onTextPatch,
  onTransformPatch,
  customFrames = [],
  onCustomFramesChange,
  onDelete,
  canDelete,
}: {
  slide: Slide;
  activeId: ElementId;
  device: Device;
  deviceEditMode?: DeviceEditMode;
  onDeviceEditModeChange?: (mode: DeviceEditMode) => void;
  transform: ElementTransform | undefined;
  textElement?: TextElement;
  decorElement?: DecorElement;
  locale: string;
  onRotate: (rotation: number) => void;
  onReorder: (dir: "front" | "back" | "up" | "down") => void;
  onFrameStyleChange: (style: DeviceFrameStyle) => void;
  onScreenshotFitChange: (fit: ScreenshotFit) => void;
  onDecorPatch: (patch: Partial<DecorElement>) => void;
  onTextChange: (value: string) => void;
  onTextPatch: (patch: Partial<TextElement>) => void;
  onTransformPatch: (patch: Partial<ElementTransform>) => void;
  customFrames?: CustomDeviceFrame[];
  onCustomFramesChange?: (frames: CustomDeviceFrame[]) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const engaged = !!transform;
  const rotation = transform?.rotation ?? 0;
  const label = elementLabel(activeId, slide);
  const isDevice = activeId ? isDeviceLikeElement(slide, activeId) : false;
  const isCaption = activeId === "caption";
  const defaultFitScale = 1;
  const frameStyle = transform?.frameStyle ?? "flat";
  const fit = mergedFit(transform?.screenshotFit);
  return (
    <div className="space-y-2 rounded border bg-background/60 p-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-medium">
          {textElement && <Type className="h-3.5 w-3.5" />}
          {label}
        </span>
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:text-destructive"
            onClick={onDelete}
            title="Delete element"
            aria-label="Delete element"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : !engaged ? (
          <span className="text-[10px] text-muted-foreground">drag to enable</span>
        ) : null}
      </div>

      {decorElement && (
        <DecorElementPanel element={decorElement} onPatch={onDecorPatch} />
      )}

      {textElement && (
        <TextElementPanel
          element={textElement}
          locale={locale}
          onTextChange={onTextChange}
          onTextPatch={onTextPatch}
        />
      )}

      {isCaption && engaged && (
        <div className="space-y-1 rounded border bg-muted/30 p-2">
          <Label className="text-[11px] text-muted-foreground">Text alignment</Label>
          <TextAlignButtons
            value={transform?.textAlign ?? "center"}
            onChange={(align) => onTransformPatch({ textAlign: align })}
          />
        </div>
      )}

      {isDevice && engaged && (
        <>
          {onDeviceEditModeChange ? (
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Edit mode</Label>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  type="button"
                  variant={deviceEditMode === "frame" ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-[10px]"
                  onClick={() => onDeviceEditModeChange("frame")}
                >
                  Move frame
                </Button>
                <Button
                  type="button"
                  variant={deviceEditMode === "screenshot" ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-[10px]"
                  onClick={() => onDeviceEditModeChange("screenshot")}
                >
                  Pan screenshot
                </Button>
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {deviceEditMode === "frame"
                  ? "Drag anywhere on the device to move or resize the frame."
                  : "Drag inside the purple screen to pan. Scroll to zoom. Use 3D stretch sliders to match perspective frames."}
              </p>
            </div>
          ) : null}

          {onCustomFramesChange ? (
            <CustomFrameControls
              device={device}
              customFrames={customFrames}
              customFrameId={transform?.customFrameId}
              onCustomFramesChange={onCustomFramesChange}
              onTransformPatch={onTransformPatch}
            />
          ) : null}

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Device presentation</Label>
            <Select
              value={frameStyle}
              onValueChange={(value) => onFrameStyleChange(value as DeviceFrameStyle)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEVICE_FRAME_STYLE_LABEL).map(([value, itemLabel]) => (
                  <SelectItem key={value} value={value}>
                    {itemLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 rounded border border-dashed bg-muted/20 p-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-muted-foreground">Screenshot fit</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => onScreenshotFitChange(mergedFit(undefined, defaultFitScale))}
            >
              Reset
            </Button>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              {deviceEditMode === "screenshot"
                ? "Alignment guides snap when the screenshot is centered on an axis."
                : "Switch to Pan screenshot to adjust fit inside the screen."}
            </p>

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Fit mode</Label>
              <div className="grid grid-cols-2 gap-1">
                {(["cover", "contain"] as ScreenshotFitMode[]).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={fit.mode === mode ? "secondary" : "outline"}
                    size="sm"
                    className="h-7 text-[10px] capitalize"
                    onClick={() => onScreenshotFitChange({ ...fit, mode })}
                  >
                    {mode === "cover" ? "Fill frame" : "Fit inside"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Vertical align</Label>
              <div className="grid grid-cols-3 gap-1">
                {(["top", "center", "bottom"] as ScreenshotAlign[]).map((align) => (
                  <Button
                    key={align}
                    type="button"
                    variant={fit.align === align ? "secondary" : "outline"}
                    size="sm"
                    className="h-7 text-[10px] capitalize"
                    onClick={() => onScreenshotFitChange({ ...fit, align })}
                  >
                    {align}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[10px]"
                onClick={() =>
                  onScreenshotFitChange({
                    ...fit,
                    scale: defaultFitScale,
                    offsetX: 0,
                    offsetY: 0,
                    mode: "cover",
                    align: "top",
                  })
                }
              >
                Fill & top
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[10px]"
                onClick={() =>
                  onScreenshotFitChange({
                    ...fit,
                    scale: defaultFitScale,
                    offsetX: 0,
                    offsetY: 0,
                    mode: "contain",
                    align: "center",
                  })
                }
              >
                Fit & center
              </Button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Zoom</span>
                <span className="tabular-nums">{Math.round(fit.scale * 100)}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={300}
                step={1}
                value={Math.round(fit.scale * 100)}
                onChange={(e) =>
                  onScreenshotFitChange({ ...fit, scale: Number(e.target.value) / 100 })
                }
                className="w-full"
                aria-label="Screenshot zoom"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Pan horizontal</span>
                <span className="tabular-nums">{Math.round(fit.offsetX)}%</span>
              </div>
              <input
                type="range"
                min={-80}
                max={80}
                step={1}
                value={Math.round(fit.offsetX)}
                onChange={(e) =>
                  onScreenshotFitChange({
                    ...fit,
                    offsetX: snapPan(Number(e.target.value)),
                  })
                }
                className="w-full"
                aria-label="Screenshot horizontal pan"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Pan vertical</span>
                <span className="tabular-nums">{Math.round(fit.offsetY)}%</span>
              </div>
              <input
                type="range"
                min={-80}
                max={80}
                step={1}
                value={Math.round(fit.offsetY)}
                onChange={(e) =>
                  onScreenshotFitChange({
                    ...fit,
                    offsetY: snapPan(Number(e.target.value)),
                  })
                }
                className="w-full"
                aria-label="Screenshot vertical pan"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 w-full text-[10px]"
              onClick={() => onScreenshotFitChange({ ...fit, offsetX: 0, offsetY: 0 })}
            >
              Center in frame
            </Button>

            <Screenshot3dControls fit={transform?.screenshotFit} onScreenshotFitChange={onScreenshotFitChange} />
          </div>
        </>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <RotateCw className="h-3 w-3" /> Rotation
          </Label>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {rotation}°
          </span>
        </div>
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={rotation}
          disabled={!engaged}
          onChange={(e) => onRotate(Number(e.target.value))}
          className="w-full disabled:opacity-50"
          aria-label={`${label} rotation`}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Layer</Label>
        <div className="grid grid-cols-4 gap-1">
          <LayerButton disabled={!engaged} onClick={() => onReorder("back")} label="Send to back">
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </LayerButton>
          <LayerButton disabled={!engaged} onClick={() => onReorder("down")} label="Send backward">
            <ChevronDown className="h-3.5 w-3.5" />
          </LayerButton>
          <LayerButton disabled={!engaged} onClick={() => onReorder("up")} label="Bring forward">
            <ChevronUp className="h-3.5 w-3.5" />
          </LayerButton>
          <LayerButton disabled={!engaged} onClick={() => onReorder("front")} label="Bring to front">
            <ArrowUpToLine className="h-3.5 w-3.5" />
          </LayerButton>
        </div>
      </div>
    </div>
  );
}

function TextElementPanel({
  element,
  locale,
  onTextChange,
  onTextPatch,
}: {
  element: TextElement;
  locale: string;
  onTextChange: (value: string) => void;
  onTextPatch: (patch: Partial<TextElement>) => void;
}) {
  const text = element.text?.[locale] ?? pickText(element.text, locale);
  return (
    <div className="space-y-2 rounded border bg-muted/30 p-2">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Text</Label>
        <Textarea
          value={text}
          rows={2}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Overlay text"
        />
      </div>
      <div className="grid grid-cols-[1fr_76px] gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Size</Label>
          <Input
            type="number"
            min={12}
            max={400}
            value={Math.round(element.fontSize || 72)}
            onChange={(event) => onTextPatch({ fontSize: Number(event.target.value) || 72 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Color</Label>
          <Input
            type="color"
            value={element.color || "#171717"}
            className="h-9 p-1"
            onChange={(event) => onTextPatch({ color: event.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Text alignment</Label>
        <TextAlignButtons
          value={element.align ?? "center"}
          onChange={(align) => onTextPatch({ align })}
        />
      </div>
    </div>
  );
}

function TextAlignButtons({
  value,
  onChange,
}: {
  value: TextAlign;
  onChange: (align: TextAlign) => void;
}) {
  const options: { align: TextAlign; label: string; icon: React.ReactNode }[] = [
    { align: "left", label: "Align left", icon: <AlignLeft className="h-3.5 w-3.5" /> },
    { align: "center", label: "Align center", icon: <AlignCenter className="h-3.5 w-3.5" /> },
    { align: "right", label: "Align right", icon: <AlignRight className="h-3.5 w-3.5" /> },
  ];
  return (
    <div className="grid grid-cols-3 gap-1">
      {options.map(({ align, label, icon }) => (
        <Button
          key={align}
          type="button"
          variant={value === align ? "secondary" : "outline"}
          size="sm"
          className="h-7 px-0"
          onClick={() => onChange(align)}
          title={label}
          aria-label={label}
        >
          {icon}
        </Button>
      ))}
    </div>
  );
}

function LayerButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 px-0"
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

function elementLabel(id: ElementId, slide?: Slide): string {
  if (isBuiltInElementId(id)) return ELEMENT_LABEL[id];
  if (isDecorElementId(id) && slide) {
    const decor = slide.decorElements?.find((element) => element.id === decorElementKey(id));
    if (decor?.kind === "device-frame") return "Device frame";
    if (decor?.kind === "pattern") return "Grid";
    if (decor?.kind === "blob") return "Blob";
    if (decor?.kind === "shape") return "Shape";
    if (decor?.kind === "image") return "Logo";
  }
  if (isDecorElementId(id)) return "Layer";
  return "Text";
}

function elementListLabel(id: ElementId, slide: Slide, locale: string): string {
  if (isBuiltInElementId(id)) return ELEMENT_LABEL[id];
  if (isTextElementId(id)) {
    const textId = textElementKey(id);
    const textElement = slide.textElements?.find((element) => element.id === textId);
    const snippet = pickText(textElement?.text, locale).trim().split("\n")[0];
    return snippet ? `Text: ${snippet.slice(0, 18)}${snippet.length > 18 ? "…" : ""}` : "Text";
  }
  if (isDecorElementId(id)) {
    const decorId = decorElementKey(id);
    const decor = slide.decorElements?.find((element) => element.id === decorId);
    if (decor?.kind === "device-frame") return "Device frame";
    if (decor?.kind === "pattern") return "Grid";
    if (decor?.kind === "blob") return "Blob";
    if (decor?.kind === "shape") return "Shape";
    if (decor?.kind === "image") return "Logo";
  }
  return "Layer";
}

function defaultZ(id: ElementId): number {
  if (isDecorElementId(id)) return 2;
  if (isTextElementId(id)) return 5;
  if (id === "deviceSecondary") return 2;
  if (id === "device") return 3;
  return 4; // caption on top
}

function DecorElementPanel({
  element,
  onPatch,
}: {
  element: DecorElement;
  onPatch: (patch: Partial<DecorElement>) => void;
}) {
  if (element.kind === "image") {
    return (
      <div className="space-y-2 rounded border bg-muted/30 p-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Image / logo</Label>
          <ScreenshotPicker
            label="Image"
            value={element.src || ""}
            locale="en"
            onChange={(v) => onPatch({ src: v })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Opacity</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={Math.round((element.opacity ?? 1) * 100)}
              onChange={(e) => onPatch({ opacity: Number(e.target.value) / 100 })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Corner radius</Label>
            <Input
              type="number"
              min={0}
              max={200}
              value={Math.round(element.borderRadius ?? 0)}
              onChange={(e) => onPatch({ borderRadius: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>
    );
  }

  if (element.kind === "shape") {
    return (
      <div className="space-y-2 rounded border bg-muted/30 p-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Shape</Label>
          <Select
            value={element.shape ?? "rectangle"}
            onValueChange={(value) =>
              onPatch({ shape: value as DecorElement["shape"] })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rectangle">Rectangle</SelectItem>
              <SelectItem value="circle">Circle</SelectItem>
              <SelectItem value="pill">Pill</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Fill</Label>
            <Input
              type="color"
              value={element.fill || "#E53935"}
              className="h-9 p-1"
              onChange={(e) => onPatch({ fill: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Opacity</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={Math.round((element.opacity ?? 0.85) * 100)}
              onChange={(e) => onPatch({ opacity: Number(e.target.value) / 100 })}
            />
          </div>
        </div>
      </div>
    );
  }

  if (element.kind === "blob") {
    return (
      <div className="space-y-2 rounded border bg-muted/30 p-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Fill</Label>
            <Input
              type="color"
              value={element.fill || "#E53935"}
              className="h-9 p-1"
              onChange={(e) => onPatch({ fill: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Opacity</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={Math.round((element.opacity ?? 0.55) * 100)}
              onChange={(e) => onPatch({ opacity: Number(e.target.value) / 100 })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Soft blur</span>
            <span className="tabular-nums">{Math.round(element.blur ?? 48)}px</span>
          </div>
          <input
            type="range"
            min={8}
            max={120}
            value={Math.round(element.blur ?? 48)}
            onChange={(e) => onPatch({ blur: Number(e.target.value) })}
            className="w-full"
            aria-label="Blob blur"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded border bg-muted/30 p-2">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Pattern</Label>
        <Select
          value={element.pattern ?? "grid"}
          onValueChange={(value) => onPatch({ pattern: value as DecorElement["pattern"] })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dots">Dots</SelectItem>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="diagonal">Diagonal</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Pattern color</Label>
        <Input
          type="color"
          value={element.patternColor || "#ffffff"}
          className="h-9 p-1"
          onChange={(e) => onPatch({ patternColor: e.target.value })}
        />
      </div>
    </div>
  );
}
