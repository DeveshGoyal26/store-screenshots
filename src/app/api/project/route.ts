import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// On Vercel and other read-only serverless hosts the filesystem is immutable.
// We detect this via the VERCEL env var that Vercel sets automatically.
// When read-only: GET still works (reads the bundled default file); POST is a
// no-op that returns ok=true so the client doesn't show a persistent error —
// localStorage already holds the user's work.
const IS_READONLY = Boolean(process.env.VERCEL);

const PROJECT_FILE = "app-store-screenshots.json";

function filePath() {
  return path.join(process.cwd(), PROJECT_FILE);
}

export async function GET() {
  try {
    const raw = await fs.readFile(filePath(), "utf8");
    const parsed = JSON.parse(raw);
    return NextResponse.json({ ok: true, state: parsed });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: true, state: null });
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  // On read-only environments, skip the write — localStorage is the source of truth.
  if (IS_READONLY) {
    return NextResponse.json({ ok: true, readonly: true });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const pretty = JSON.stringify(body, null, 2) + "\n";
    await fs.writeFile(filePath(), pretty, "utf8");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
