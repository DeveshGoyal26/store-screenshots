# Loop — App Store Screenshot Editor

Marketing screenshot editor for Loop (iOS + Android). Built with the [app-store-screenshots](https://github.com/ParthJadhav/app-store-screenshots) skill template.

## Quick start

```bash
cd mobile/store-screenshots
bun install   # first time only
bun dev       # → http://localhost:3000
```

Open the editor, tweak headlines/layouts, then click **Export bundle** for each platform.

## Play Store feature graphic (1024×500)

The editor has a dedicated **Feature Graphic** deck — same tool as phone screenshots.

1. Open http://localhost:3000
2. In the toolbar device dropdown, select **Feature Graphic**
3. Edit the headline / subtext inline (headline uses line 1 + yellow highlight on line 2)
4. Click **Export bundle** → downloads `feature-graphic/1024x500/en/01-feature-graphic.png`
5. Copy the PNG to the Play Store asset folder:

```bash
cp ~/Downloads/feature-graphic/1024x500/en/01-feature-graphic.png \
   ../store/play-store/feature-graphic.png
```

The banner auto-includes the app icon, Loop branding, and 3 Android phone screenshots (topic, quiz, live cohorts).

## What's seeded

- **Theme:** `loop-dark` (near-black + Loop red `#ED0331`)
- **iOS:** 8 slides from `mobile/store/screenshots/phone/ios/`
- **Android:** 8 slides from `mobile/store/screenshots/phone/android/`
- **Feature graphic:** Play Store banner deck

## Re-sync raw captures

After updating screenshots in `mobile/store/screenshots/phone/`, copy them in:

```bash
cp ../store/screenshots/phone/ios/*.png public/screenshots/apple/iphone/en/
cp ../store/screenshots/phone/android/*.png public/screenshots/android/phone/en/
# then renumber 01.png … 08.png from the prefixed filenames
```

Project state is saved to `app-store-screenshots.json` (commit this to preserve your deck).
