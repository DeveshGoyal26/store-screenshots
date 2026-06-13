import { DEFAULT_LOCALE } from "./locale";
import { DEFAULT_THEME_ID, PROJECT_SCHEMA_VERSION } from "./constants";
import type { Device, ProjectState, Slide } from "./types";

let _id = 0;
export const nid = () => `s_${Date.now().toString(36)}_${(_id++).toString(36)}`;

const en = (s: string) => ({ [DEFAULT_LOCALE]: s });

function makeStarterSlides(): Slide[] {
  return [
    {
      id: nid(),
      layout: "hero",
      label: en("MEET YOUR APP"),
      headline: en("Sell one\nidea per slide."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "device-bottom",
      label: en("FEATURE 01"),
      headline: en("Your headline\nlives here."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "two-devices",
      label: en("FEATURE 02"),
      headline: en("Show two\nscreens at once."),
      screenshot: "",
      screenshotSecondary: "",
    },
    {
      id: nid(),
      layout: "device-top",
      label: en("FEATURE 03"),
      headline: en("Flip the contrast\nfor visual rhythm."),
      screenshot: "",
      inverted: true,
    },
    {
      id: nid(),
      layout: "no-device",
      label: en("MORE"),
      headline: en("And so\nmuch more."),
      screenshot: "",
    },
  ];
}

function ipadStarter(): Slide[] {
  return [
    {
      id: nid(),
      layout: "hero",
      label: en("MEET YOUR APP"),
      headline: en("Made for\nthe big screen."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "device-bottom",
      label: en("FEATURE 01"),
      headline: en("Built for\nfocus."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "device-top",
      label: en("FEATURE 02"),
      headline: en("Always within reach."),
      screenshot: "",
      inverted: true,
    },
  ];
}

function tabletStarter(kind: "7" | "10"): Slide[] {
  return [
    {
      id: nid(),
      layout: "hero",
      label: en("MEET YOUR APP"),
      headline: en(kind === "7" ? "Pocket-sized\npower." : "Made for\nthe big screen."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "split-landscape",
      label: en("FEATURE 01"),
      headline: en("Wide canvas,\nbigger ideas."),
      screenshot: "",
    },
  ];
}

function fgStarter(): Slide[] {
  return [
    {
      id: nid(),
      layout: "split-landscape",
      label: en("FEATURE"),
      headline: en("Your tagline\ngoes here."),
      screenshot: "",
    },
  ];
}

function gameStarter(): Slide[] {
  return [
    {
      id: nid(),
      layout: "split-landscape",
      label: en("GAMEPLAY"),
      headline: en("Action-packed\nlandscape shots."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "hero",
      label: en("FEATURED"),
      headline: en("Show your game\nin full width."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "device-bottom",
      label: en("LEVEL UP"),
      headline: en("Highlight modes\nand mechanics."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "no-device",
      label: en("TAGLINE"),
      headline: en("Play now\nfor free."),
      screenshot: "",
    },
  ];
}

export const DEFAULT_PROJECT: ProjectState = {
  schemaVersion: PROJECT_SCHEMA_VERSION,
  appName: "My App",
  themeId: DEFAULT_THEME_ID,
  connectedCanvas: true,
  locales: [DEFAULT_LOCALE],
  locale: DEFAULT_LOCALE,
  device: "iphone",
  orientation: "portrait",
  appIcon: "",
  slidesByDevice: {
    iphone: makeStarterSlides(),
    android: makeStarterSlides(),
    ipad: ipadStarter(),
    "android-7": tabletStarter("7"),
    "android-10": tabletStarter("10"),
    "feature-graphic": fgStarter(),
    "game-iphone": gameStarter(),
    "game-android": gameStarter(),
  },
};

export function newSlide(layout: Slide["layout"] = "device-bottom"): Slide {
  return {
    id: nid(),
    layout,
    label: en("NEW"),
    headline: en("Edit this\nheadline."),
    screenshot: "",
  };
}

export function detectPlatform(device: Device): "ios" | "android" | "games" {
  if (device === "game-iphone" || device === "game-android") return "games";
  if (device === "iphone" || device === "ipad") return "ios";
  return "android";
}
