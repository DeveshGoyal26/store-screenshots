export type Device =
  | "iphone"
  | "ipad"
  | "android"
  | "android-7"
  | "android-10"
  | "feature-graphic"
  | "game-iphone"
  | "game-android";

export type Orientation = "portrait" | "landscape";

export type Platform = "ios" | "android" | "games";

// Layouts the editor can render. Vary across slides for visual rhythm.
export type SlideLayout =
  | "hero"             // centered device, headline above
  | "device-bottom"    // headline top, device bottom-center
  | "device-top"       // device top, headline bottom (contrast)
  | "two-devices"      // back + front phones, headline above
  | "no-device"        // big headline + decorative blob, no device
  | "split-landscape"  // landscape tablets only: caption left + device right
  | "feature-graphic"; // 1024×500 banner with icon + name + tagline

// Per-element rect in canvas pixel space. Optional rotation in degrees and zIndex.
export type ScreenshotFitMode = "cover" | "contain";
export type ScreenshotAlign = "top" | "center" | "bottom";
export type TextAlign = "left" | "center" | "right";

export type ScreenshotFit = {
  /** Zoom inside the screen cutout (1 = fill width). */
  scale?: number;
  /** Horizontal pan as % of screen width. */
  offsetX?: number;
  /** Vertical pan as % of screen height. */
  offsetY?: number;
  /** How the screenshot fills the screen cutout. */
  mode?: ScreenshotFitMode;
  /** Vertical anchor before pan/zoom offsets. */
  align?: ScreenshotAlign;
  /** 3D tilt / perspective stretch inside the screen cutout (degrees). */
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  skewX?: number;
  skewY?: number;
  /** Perspective distance in px for 3D stretch (lower = stronger). */
  perspective?: number;
};

/** Screen hole on a custom frame PNG, as % of frame image size. */
export type FrameScreenInset = {
  L: number;
  T: number;
  W: number;
  H: number;
  RX?: number;
  RY?: number;
};

export type CustomDeviceFrame = {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  screen: FrameScreenInset;
};

export type DeviceFrameStyle =
  | "flat"
  | "tilt-left"
  | "tilt-right"
  | "perspective-left"
  | "perspective-right"
  | "lay-flat"
  | "float";

export type ElementTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  /** 3D presentation of the device shell (CSS perspective). */
  frameStyle?: DeviceFrameStyle;
  /** Pan/zoom of the screenshot inside the screen cutout. */
  screenshotFit?: ScreenshotFit;
  /** When set, use a project custom frame PNG instead of the built-in device shell. */
  customFrameId?: string;
  /** Horizontal text alignment (caption element). */
  textAlign?: TextAlign;
};

export type BackgroundMode = "theme" | "solid" | "gradient";
export type BackgroundPattern = "none" | "dots" | "grid" | "diagonal";
export type ShapeKind = "rectangle" | "circle" | "pill";
export type DecorElementKind = "image" | "shape" | "pattern" | "blob" | "device-frame";

export type SlideBackground = {
  mode?: BackgroundMode;
  color?: string;
  colorEnd?: string;
  angle?: number;
  pattern?: BackgroundPattern;
  patternColor?: string;
  patternOpacity?: number;
  /** Grid spacing multiplier for pattern overlay. */
  patternSize?: number;
  /** Dot radius multiplier (dots pattern only). */
  patternDotSize?: number;
  /** Soft accent glow blobs (default on for theme mode). */
  glow?: boolean;
};

export type DecorElement = {
  id: string;
  kind: DecorElementKind;
  transform: ElementTransform;
  /** image / logo */
  src?: string;
  opacity?: number;
  borderRadius?: number;
  /** shape */
  shape?: ShapeKind;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** pattern tile block */
  pattern?: BackgroundPattern;
  patternColor?: string;
  patternOpacity?: number;
  patternSize?: number;
  /** soft organic blob */
  blur?: number;
};

export type BuiltInElementId = "caption" | "device" | "deviceSecondary";
export type TextElementId = `text:${string}`;
export type DecorElementId = `decor:${string}`;
export type ElementId = BuiltInElementId | TextElementId | DecorElementId;

export type DeviceEditMode = "frame" | "screenshot";

export type SelectedElement = {
  slideId: string;
  elementId: ElementId;
  /** When the selected element is a device frame. Defaults to "frame". */
  deviceEditMode?: DeviceEditMode;
};

// Per-locale text keyed by locale code (e.g. "en", "de"). A locale is absent
// if the user hasn't typed anything for it; renderers fall back to en (see
// lib/locale.ts). The set of locales a project targets lives on
// ProjectState.locales.
export type LocalizedText = Partial<Record<string, string>>;

export type TextElement = {
  id: string;
  text: LocalizedText;
  transform: ElementTransform;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  align?: TextAlign;
};

export type Slide = {
  id: string;
  layout: SlideLayout;
  label: LocalizedText;       // tiny uppercase caption above headline, per locale
  headline: LocalizedText;    // multi-line; newlines are intentional, per locale
  screenshot: string;         // path under /screenshots/ — may contain {locale}
  screenshotSecondary?: string; // for two-devices layout — may contain {locale}
  inverted?: boolean;         // dark background variant
  background?: SlideBackground;
  // Per-element overrides; when present, replaces layout default placement.
  transforms?: Partial<Record<BuiltInElementId, ElementTransform>>;
  textElements?: TextElement[];
  decorElements?: DecorElement[];
};

export type ThemeId =
  | "clean-light"
  | "dark-bold"
  | "warm-editorial"
  | "ocean-fresh"
  | "bloom-roast";

export type Theme = {
  id: string;
  name: string;
  bg: string;          // primary background
  bgAlt: string;       // inverted background
  fg: string;          // text on bg
  fgAlt: string;       // text on bgAlt
  accent: string;
  muted: string;
};

export type ProjectState = {
  schemaVersion?: number;
  appName: string;
  themeId: string;
  // v1 projects render as isolated screens until the user opts into connected crops.
  connectedCanvas: boolean;
  // Locales this project targets. Drives the toolbar dropdown and bulk export.
  // Single-locale projects ship as ["en"] and hide the locale UI.
  locales: string[];
  locale: string;
  device: Device;
  orientation: Orientation;
  // Per-device slide decks so platform switching preserves work
  slidesByDevice: Record<Device, Slide[]>;
  appIcon?: string;    // path under /public (e.g. /app-icon.png)
  /** User-uploaded device frame PNGs with configurable screen cutouts. */
  customFrames?: CustomDeviceFrame[];
};
