# App Store Screenshot Editor

A free, open-source screenshot editor for App Store and Google Play listings. Design polished marketing slides, add headlines and layouts, then export production-ready PNGs — all from your browser, all on your own machine.

**No accounts. No subscriptions. No data collection. Ever.**

---

## What it does

- Design screenshot slides for iPhone, iPad, Android phones, tablets, and Play Store feature graphics
- Pick from 5 built-in themes or customise colours freely
- Add headlines, labels, shapes, blobs, text overlays, and custom device frames
- AI copywriting assistant (bring your own Anthropic or OpenAI key)
- Export a ZIP of every slide at every required store resolution in one click
- Undo/redo, drag-to-reorder, per-locale copy, and keyboard shortcuts

---

## Getting started

You need [Node.js 18+](https://nodejs.org) or [Bun](https://bun.sh) installed.

```bash
# 1. Clone the repo
git clone https://github.com/DeveshGoyal26/store-screenshots.git
cd store-screenshots

# 2. Install dependencies
bun install          # or: npm install

# 3. Start the editor
bun dev              # or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the editor loads instantly.

### First steps

1. Type your **app name** in the top toolbar
2. Choose a **theme** from the palette
3. Select a **device** (iPhone, Android, iPad, Feature Graphic…)
4. For each slide — pick a layout, upload a screenshot, write a headline
5. Click **Export bundle** to download a ZIP of every slide

---

## AI assistant

The editor has a built-in AI copywriting assistant that can write and improve your headlines, labels, and copy. Click the **AI** tab in the right panel to use it.

**You bring your own API key** — the assistant works with:

| Provider | Where to get a key |
|---|---|
| Anthropic (Claude) | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI (GPT) | [platform.openai.com](https://platform.openai.com) |

Your key is stored only in your browser's `localStorage`. It is never sent to any server other than the AI provider you chose — and even then, only to process your request. See the [Privacy & Security](#privacy--security) section for the full picture.

---

## Adding your screenshots

Drop raw screenshots into the matching folder, or upload them directly in the editor UI.

| Platform | Drop files here |
|---|---|
| iPhone | `public/screenshots/apple/iphone/en/` |
| iPad | `public/screenshots/apple/ipad/en/` |
| Android Phone | `public/screenshots/android/phone/en/` |

Name them `01.png`, `02.png` … and they'll appear in the picker automatically.

---

## Saving your project

Your deck is auto-saved to two places:

- **`app-store-screenshots.json`** in the project root — git-tracked, portable
- **Browser `localStorage`** — instant offline cache

Commit `app-store-screenshots.json` to preserve your work and share it with teammates.

---

## Deploying to Vercel

```bash
npm i -g vercel
vercel --prod
```

Vercel auto-detects Next.js. When running on Vercel:
- Project state is saved to `localStorage` only (filesystem is read-only on serverless)
- Uploaded images are stored as data URLs in your browser session
- The AI assistant works exactly the same

---

## Supported devices & export sizes

| Device | Export sizes |
|---|---|
| iPhone | 6.9", 6.5", 6.3", 6.1" |
| iPad | 13" iPad, 12.9" iPad Pro |
| Android Phone | 1080×1920 |
| Android 7" Tablet | 1200×1920 portrait, 1920×1200 landscape |
| Android 10" Tablet | 1600×2560 portrait, 2560×1600 landscape |
| Feature Graphic | 1024×500 (Play Store banner) |
| Game · iPhone | 2868×1320, 2778×1284, 2436×1125 landscape |
| Game · Android | 1920×1080, 2560×1440 landscape |

---

## Layouts

| Layout | What it looks like |
|---|---|
| Hero | Headline centred above a floating device |
| Device bottom | Headline at top, device anchored to the bottom |
| Device top | Flipped — device up, headline below |
| Two devices | Layered front + back phones |
| No device | Full-bleed headline card |
| Split landscape | Caption on the left, device on the right |

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `↑` / `↓` or `j` / `k` | Navigate between slides |
| `⌘D` | Duplicate slide or selected element |
| `⌘⌫` | Delete slide |
| `⌫` / `Delete` | Delete selected element |
| `[` / `]` | Send backward / bring forward |
| `⌘[` / `⌘]` | Send to back / bring to front |
| `⌘Z` / `⌘⇧Z` | Undo / Redo |
| `?` | Show all shortcuts |

---

## Privacy & Security

This project was built with a firm belief: **your data belongs to you**.

### What this editor does NOT do

- Does not collect any analytics, telemetry, or usage data
- Does not create accounts or require sign-up
- Does not send your screenshots, app name, or project data to any external server
- Does not store your API key anywhere other than your own browser
- Does not log requests on the server side

### What actually happens with your data

| Data | Where it lives | Who can see it |
|---|---|---|
| Project state (slides, text) | `localStorage` + local `app-store-screenshots.json` | Only you |
| Uploaded screenshots | Your local `public/` folder | Only you |
| API key (for AI features) | Your browser's `localStorage` | Only you |
| AI chat messages | In-memory React state — cleared on page reload | Only you + the AI provider |

### How the AI assistant handles your data

When you use the AI tab:

1. Your message and the current slide's text are sent to the AI provider you chose (Anthropic or OpenAI) using your own API key
2. The `/api/ai` route on this server acts only as a thin CORS proxy — it forwards the request and streams the response. It does **not** log, store, or inspect the content
3. Your API key travels in the request body and is used once to authenticate with the AI provider. It is **never written to disk, a database, or any log**
4. Chat history exists only in your browser's memory for the current session

### Self-hosting means you are in control

Because you run this on your own machine (or your own Vercel/server deployment), there is no third party between you and your data. The only external services involved are:

- The AI provider you explicitly chose and whose key you supplied
- Vercel's hosting infrastructure (if you deployed there) — which only serves static files and runs the API proxy

If you have concerns about a specific data flow, the entire codebase is open source and auditable. The AI proxy is in [`src/app/api/ai/route.ts`](src/app/api/ai/route.ts) (< 150 lines).

---

## Contributing

Contributions are very welcome. Here's how to get involved:

### Found a bug?

Open an issue at [github.com/DeveshGoyal26/store-screenshots/issues](https://github.com/DeveshGoyal26/store-screenshots/issues) with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your OS and browser

### Want to add a feature?

1. Open an issue first to discuss the idea — this avoids duplicate work
2. Fork the repo and create a branch: `git checkout -b feature/your-idea`
3. Make your changes and run `npx tsc --noEmit` to check types
4. Open a pull request with a clear description of what changed and why

### Project structure

```
src/
  app/
    api/
      ai/         → AI proxy route (edge runtime, multi-provider)
      project/    → Read/write project JSON
      upload/     → Image upload handler
    page.tsx      → Entry point
  components/
    editor/       → All editor UI components
    ui/           → Base UI primitives (shadcn)
  lib/
    types.ts      → All TypeScript types
    constants.ts  → Themes, canvas sizes, device config
    defaults.ts   → Default project state and starter slides
    storage.ts    → State management, undo/redo, persistence
    ai-providers.ts → AI provider/model config
```

### Running the project locally

```bash
bun dev          # dev server at http://localhost:3000
bun run build    # production build
npx tsc --noEmit # type check only
```

---

## License

MIT — free to use, modify, and distribute. See `LICENSE` for details.

---

Built with [Next.js](https://nextjs.org), [Tailwind CSS](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), and [html-to-image](https://github.com/bubkoo/html-to-image).
