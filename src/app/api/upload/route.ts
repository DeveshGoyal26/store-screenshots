import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// On Vercel the public/ directory is read-only (part of the static build).
// When running in that environment we return the data URL directly so the
// client can store it in project state / localStorage.
// This keeps uploads functional without requiring external object storage.
const IS_READONLY = Boolean(process.env.VERCEL);

const UPLOAD_DIRS = {
  screenshot: {
    rel: path.join("public", "screenshots", "uploaded"),
    prefix: "/screenshots/uploaded",
  },
  frame: {
    rel: path.join("public", "frames", "uploaded"),
    prefix: "/frames/uploaded",
  },
} as const;

type UploadCategory = keyof typeof UPLOAD_DIRS;

const ALLOWED_MIME: Record<string, string> = {
  "image/png":  "png",
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
};

// Max 8 MB per upload
const MAX_BYTES = 8 * 1024 * 1024;

function parseDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  const m = /^data:([^;]{1,64});base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  try {
    const bytes = Buffer.from(m[2].replace(/\s/g, ""), "base64");
    return { mime, bytes };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: { dataUrl?: string; category?: string };
  try {
    body = (await req.json()) as { dataUrl?: string; category?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.dataUrl || typeof body.dataUrl !== "string") {
    return NextResponse.json({ ok: false, error: "Missing dataUrl" }, { status: 400 });
  }

  const category: UploadCategory = body.category === "frame" ? "frame" : "screenshot";
  const parsed = parseDataUrl(body.dataUrl);

  if (!parsed) {
    return NextResponse.json({ ok: false, error: "Invalid or unsupported data URL" }, { status: 400 });
  }

  const ext = ALLOWED_MIME[parsed.mime];
  if (!ext) {
    return NextResponse.json(
      { ok: false, error: `Unsupported image type: ${parsed.mime}` },
      { status: 400 },
    );
  }

  if (parsed.bytes.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Image exceeds 8 MB limit" },
      { status: 413 },
    );
  }

  // On read-only deployments (Vercel), return the data URL directly so the
  // client stores it in-memory / localStorage. No file I/O attempted.
  if (IS_READONLY) {
    return NextResponse.json({ ok: true, path: body.dataUrl, ephemeral: true });
  }

  const { rel: uploadDirRel, prefix: publicPrefix } = UPLOAD_DIRS[category];

  // Filename is derived from content hash — safe, no user-controlled path segments.
  const hash    = createHash("sha1").update(parsed.bytes).digest("hex").slice(0, 16);
  const filename = `${hash}.${ext}`;
  const absDir   = path.join(process.cwd(), uploadDirRel);
  const absFile  = path.join(absDir, filename);

  // Guard against path traversal (should be impossible given the hash filename,
  // but double-check that the resolved path stays inside the upload directory).
  if (!absFile.startsWith(absDir + path.sep) && absFile !== absDir) {
    return NextResponse.json({ ok: false, error: "Invalid file path" }, { status: 400 });
  }

  try {
    await fs.mkdir(absDir, { recursive: true });
    // Only write if the file doesn't already exist (content-addressed dedup).
    try {
      await fs.access(absFile);
    } catch {
      await fs.writeFile(absFile, parsed.bytes);
    }
    return NextResponse.json({ ok: true, path: `${publicPrefix}/${filename}` });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
