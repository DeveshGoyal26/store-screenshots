import {
  decorElementKey,
  isBuiltInElementId,
  isDecorElementId,
  isTextElementId,
  textElementKey,
  toDecorElementId,
  toTextElementId,
} from "./elements";
import { pickText } from "./locale";
import type { BuiltInElementId, DecorElement, ElementId, ElementTransform, LocalizedText, Slide, TextElement } from "./types";

export type DuplicateElementContext = {
  transform: ElementTransform;
  locale?: string;
};

function cloneTransformWithOffset(
  t: ElementTransform,
  offsetPx: number,
  zIndexDelta = 1,
): ElementTransform {
  return {
    ...t,
    x: t.x + offsetPx,
    y: t.y + offsetPx,
    zIndex: (t.zIndex ?? 1) + zIndexDelta,
    ...(t.screenshotFit ? { screenshotFit: { ...t.screenshotFit } } : {}),
  };
}

function cloneLocalizedText(field: LocalizedText | undefined): LocalizedText {
  if (!field) return {};
  return { ...field };
}

function omitBuiltInTransform(
  slide: Slide,
  key: BuiltInElementId,
): Partial<Record<BuiltInElementId, ElementTransform>> | undefined {
  if (!slide.transforms?.[key]) return slide.transforms;
  const next = { ...slide.transforms };
  delete next[key];
  return Object.keys(next).length > 0 ? next : undefined;
}

/** Same set as selectable draggable elements on the canvas. */
export function isDeviceFrameDecor(slide: Slide, id: ElementId): boolean {
  if (!isDecorElementId(id)) return false;
  const decor = slide.decorElements?.find((element) => element.id === decorElementKey(id));
  return decor?.kind === "device-frame";
}

export function isDeviceLikeElement(slide: Slide, id: ElementId): boolean {
  return id === "device" || id === "deviceSecondary" || isDeviceFrameDecor(slide, id);
}

/** Same set as selectable draggable elements on the canvas. */
export function isDeletableElement(id: ElementId, slide?: Slide): boolean {
  return isDuplicatableElement(id, slide);
}

export function listPresentElementIds(slide: Slide): ElementId[] {
  const present: ElementId[] = ["caption"];
  if (slide.layout !== "no-device") present.push("device");
  if (slide.layout === "two-devices") present.push("deviceSecondary");
  for (const element of slide.decorElements || []) present.push(toDecorElementId(element.id));
  for (const element of slide.textElements || []) present.push(toTextElementId(element.id));
  return present;
}


export function isDuplicatableElement(id: ElementId, slide?: Slide): boolean {
  if (isTextElementId(id) || isDecorElementId(id)) return true;
  if (!slide || !isBuiltInElementId(id)) return false;
  if (id === "caption") return true;
  if (id === "device") return slide.layout !== "no-device";
  if (id === "deviceSecondary") return slide.layout === "two-devices";
  return false;
}

export function duplicateElementPatch(
  slide: Slide,
  id: ElementId,
  newId: string,
  offsetPx = 32,
  ctx?: DuplicateElementContext,
): { patch: Partial<Slide>; selectId: ElementId } | null {
  if (isTextElementId(id)) {
    const textId = textElementKey(id);
    const src = slide.textElements?.find((element) => element.id === textId);
    if (!src) return null;
    const copy: TextElement = {
      ...src,
      id: newId,
      text: cloneLocalizedText(src.text),
      transform: cloneTransformWithOffset(src.transform, offsetPx, 1),
    };
    return {
      patch: { textElements: [...(slide.textElements || []), copy] },
      selectId: toTextElementId(newId),
    };
  }
  if (isDecorElementId(id)) {
    const decorId = decorElementKey(id);
    const src = slide.decorElements?.find((element) => element.id === decorId);
    if (!src) return null;
    const copy: DecorElement = {
      ...src,
      id: newId,
      transform: cloneTransformWithOffset(src.transform, offsetPx, 1),
    };
    return {
      patch: { decorElements: [...(slide.decorElements || []), copy] },
      selectId: toDecorElementId(newId),
    };
  }
  if (isBuiltInElementId(id) && ctx?.transform) {
    const t = ctx.transform;

    if (id === "caption") {
      const locales = new Set([
        ...Object.keys(slide.label || {}),
        ...Object.keys(slide.headline || {}),
      ]);
      const text: LocalizedText = {};
      for (const loc of locales) {
        const label = pickText(slide.label, loc);
        const headline = pickText(slide.headline, loc);
        const combined = [label, headline].filter(Boolean).join("\n");
        if (combined) text[loc] = combined;
      }
      const fallbackLocale = ctx.locale ?? "en";
      if (Object.keys(text).length === 0) {
        const label = pickText(slide.label, fallbackLocale);
        const headline = pickText(slide.headline, fallbackLocale);
        const combined = [label, headline].filter(Boolean).join("\n");
        if (combined) text[fallbackLocale] = combined;
      }
      const copy: TextElement = {
        id: newId,
        text,
        transform: cloneTransformWithOffset(t, offsetPx, 1),
        align: t.textAlign ?? "center",
      };
      return {
        patch: { textElements: [...(slide.textElements || []), copy] },
        selectId: toTextElementId(newId),
      };
    }

    if (id === "device" || id === "deviceSecondary") {
      const screenshot =
        id === "deviceSecondary"
          ? slide.screenshotSecondary || slide.screenshot
          : slide.screenshot;
      const copy: DecorElement = {
        id: newId,
        kind: "device-frame",
        src: screenshot,
        transform: cloneTransformWithOffset(t, offsetPx, 1),
        opacity: 1,
      };
      return {
        patch: { decorElements: [...(slide.decorElements || []), copy] },
        selectId: toDecorElementId(newId),
      };
    }
  }
  return null;
}

export function deleteElementPatch(slide: Slide, id: ElementId): Partial<Slide> | null {
  if (isTextElementId(id)) {
    const textId = textElementKey(id);
    const next = (slide.textElements || []).filter((element) => element.id !== textId);
    return { textElements: next.length > 0 ? next : undefined };
  }
  if (isDecorElementId(id)) {
    const decorId = decorElementKey(id);
    const next = (slide.decorElements || []).filter((element) => element.id !== decorId);
    return { decorElements: next.length > 0 ? next : undefined };
  }
  if (isBuiltInElementId(id)) {
    if (id === "caption") {
      return {
        label: {},
        headline: {},
        transforms: {
          ...(slide.transforms || {}),
          caption: { x: -5000, y: -5000, width: 1, height: 1, zIndex: -1 },
        },
      };
    }
    if (id === "device") {
      if (slide.layout === "two-devices") {
        const promoted = slide.transforms?.deviceSecondary;
        const nextTransforms = { ...(slide.transforms || {}) };
        delete nextTransforms.deviceSecondary;
        if (promoted) nextTransforms.device = promoted;
        else delete nextTransforms.device;
        return {
          layout: "hero",
          screenshot: slide.screenshotSecondary || slide.screenshot,
          screenshotSecondary: undefined,
          transforms: Object.keys(nextTransforms).length > 0 ? nextTransforms : undefined,
        };
      }
      if (slide.layout !== "no-device") {
        return {
          layout: "no-device",
          transforms: omitBuiltInTransform(slide, "device"),
        };
      }
      return null;
    }
    if (id === "deviceSecondary" && slide.layout === "two-devices") {
      return {
        layout: "hero",
        screenshotSecondary: undefined,
        transforms: omitBuiltInTransform(slide, "deviceSecondary"),
      };
    }
  }
  return null;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export const KEYBOARD_SHORTCUTS = [
  { keys: "Delete / Backspace", action: "Delete selected element" },
  { keys: "Esc", action: "Deselect element" },
  { keys: "↑ / k", action: "Previous slide" },
  { keys: "↓ / j", action: "Next slide" },
  { keys: "⌘ D", action: "Duplicate selected element (or slide if none selected)" },
  { keys: "⌘ Delete", action: "Delete slide" },
  { keys: "⌘ Z", action: "Undo" },
  { keys: "⌘ ⇧ Z", action: "Redo" },
  { keys: "[ / ]", action: "Send layer back / bring forward" },
  { keys: "⌘ [ / ⌘ ]", action: "Send to back / bring to front" },
  { keys: "f / s", action: "Move frame / pan screenshot (device selected)" },
  { keys: "?", action: "Show keyboard shortcuts" },
] as const;
