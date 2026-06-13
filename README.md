# App Store Screenshot Editor

A self-hosted marketing screenshot editor for iOS and Android apps. Drop in your raw screenshots, customize headlines and layouts, and export store-ready graphics.

## Quick start

```bash
bun install   # first time only
bun dev       # → http://localhost:3000
```

## Usage

1. Open [http://localhost:3000](http://localhost:3000)
2. Set your **app name** in the top toolbar
3. Pick a **theme** (Clean Light, Dark Bold, Warm Editorial, Ocean Fresh, Bloom Roast)
4. Select a **device** (iPhone, iPad, Android Phone, Android Tablet, Feature Graphic, Game)
5. For each slide: upload a screenshot, edit the label and headline
6. Click **Export bundle** to download all slides as PNGs

## Adding your screenshots

Drop your raw app screenshots into the appropriate folder and reference them in `app-store-screenshots.json`, or upload them directly in the editor UI.

| Platform | Folder |
|----------|--------|
| iPhone | `public/screenshots/apple/iphone/en/` |
| iPad | `public/screenshots/apple/ipad/en/` |
| Android Phone | `public/screenshots/android/phone/en/` |

## Saving your project

Your current deck is stored in `app-store-screenshots.json`. Commit this file to preserve your work between sessions.

## Supported devices

- **iPhone** — 6.9", 6.5", 6.3", 6.1" export sizes
- **iPad** — 13" and 12.9" iPad Pro
- **Android Phone** — 1080×1920
- **Android 7" / 10" Tablet** — portrait and landscape
- **Feature Graphic** — 1024×500 Play Store banner
- **Game · iPhone / Android** — landscape screenshots

## Layouts

| Layout | Description |
|--------|-------------|
| Hero | Centered device, headline above |
| Device bottom | Headline top, device anchored below |
| Device top | Flipped — device on top |
| Two devices | Layered back + front phones |
| No device | Big standalone headline |
| Split landscape | Caption left, device right |
