import type { BuiltInElementId, DecorElementId, ElementId, TextElementId } from "./types";

export const BUILT_IN_ELEMENT_IDS: BuiltInElementId[] = [
  "caption",
  "device",
  "deviceSecondary",
];

export const TEXT_ELEMENT_PREFIX = "text:";
export const DECOR_ELEMENT_PREFIX = "decor:";

export function isBuiltInElementId(id: ElementId | string): id is BuiltInElementId {
  return (BUILT_IN_ELEMENT_IDS as string[]).includes(id);
}

export function isTextElementId(id: ElementId | string | null | undefined): id is TextElementId {
  return typeof id === "string" && id.startsWith(TEXT_ELEMENT_PREFIX);
}

export function isDecorElementId(id: ElementId | string | null | undefined): id is DecorElementId {
  return typeof id === "string" && id.startsWith(DECOR_ELEMENT_PREFIX);
}

export function toTextElementId(id: string): TextElementId {
  return `${TEXT_ELEMENT_PREFIX}${id}` as TextElementId;
}

export function toDecorElementId(id: string): DecorElementId {
  return `${DECOR_ELEMENT_PREFIX}${id}` as DecorElementId;
}

export function textElementKey(id: TextElementId | ElementId): string {
  return isTextElementId(id) ? id.slice(TEXT_ELEMENT_PREFIX.length) : id;
}

export function decorElementKey(id: DecorElementId | ElementId): string {
  return isDecorElementId(id) ? id.slice(DECOR_ELEMENT_PREFIX.length) : id;
}
