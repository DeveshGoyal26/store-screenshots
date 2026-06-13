// Edge runtime: no cold-start, streaming-friendly, no filesystem access needed.
export const runtime = "edge";

import type { NextRequest } from "next/server";

// ── Provider whitelist ────────────────────────────────────────────────────────
// The endpoint URLs are hardcoded here; clients cannot supply arbitrary URLs.
// The key prefix check is a fast sanity gate — the upstream API enforces real auth.

const PROVIDERS = {
  anthropic: {
    endpoint: "https://api.anthropic.com/v1/messages",
    keyPrefix: "sk-ant-",
    models: new Set([
      "claude-haiku-4-5-20251001",
      "claude-sonnet-4-6",
      "claude-opus-4-8",
    ]),
    defaultModel: "claude-haiku-4-5-20251001",
  },
  openai: {
    endpoint: "https://api.openai.com/v1/chat/completions",
    keyPrefix: "sk-",
    models: new Set(["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"]),
    defaultModel: "gpt-4o-mini",
  },
  // Gemini endpoint includes the model name; the base URL is expanded in the handler.
  gemini: {
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    keyPrefix: "AIza",
    models: new Set(["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]),
    defaultModel: "gemini-2.0-flash",
  },
} as const;

type ProviderId = keyof typeof PROVIDERS;

// ── Input limits ──────────────────────────────────────────────────────────────
const MAX_MESSAGES    = 20;      // total turns per request
const MAX_MSG_LEN     = 4_000;   // characters per message
const MAX_FIELD_LEN   = 300;     // characters for each context field

// ── Types ─────────────────────────────────────────────────────────────────────
interface SlideContext {
  layout?:   string;
  label?:    string;
  headline?: string;
  inverted?: boolean;
}
interface AiContext {
  appName?: string;
  device?:  string;
  locale?:  string;
  slide?:   SlideContext | null;
}
interface RequestBody {
  provider?: string;
  model?:    string;
  apiKey?:   string;
  messages?: unknown[];
  context?:  AiContext;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function bad(msg: string, status = 400) {
  return Response.json({ error: msg }, { status });
}

// The system prompt is built entirely server-side.
// The client sends structured context (appName, device, current slide) —
// never a raw system string — so we fully control what reaches the model.
function buildSystem(ctx: AiContext): string {
  const cap = (s: unknown, n: number) => String(s ?? "").slice(0, n);

  const appName = cap(ctx.appName, MAX_FIELD_LEN) || "My App";
  const device  = cap(ctx.device,  40)            || "iphone";
  const locale  = cap(ctx.locale,  10)            || "en";

  let slideCtx = "No slide selected.";
  if (ctx.slide) {
    const s = ctx.slide;
    slideCtx = `Current slide:
  layout:   ${cap(s.layout, 40) || "hero"}
  label:    "${cap(s.label, MAX_FIELD_LEN)}"
  headline: "${cap(s.headline, MAX_FIELD_LEN)}"
  inverted: ${s.inverted ? "yes" : "no"}`;
  }

  return `You are an AI copywriting assistant embedded in an App Store screenshot editor.

App name: "${appName}"
Device: ${device}
Active locale: ${locale}

${slideCtx}

Help the user write compelling App Store / Play Store marketing copy and make design suggestions.

Available layouts: hero, device-bottom, device-top, two-devices, no-device, split-landscape

When you want to suggest changes that can be applied directly, output a JSON object in a fenced block tagged "apply". Only include fields you want to change:

\`\`\`apply
{"headline": "Set up in 60 seconds\\nno credit card needed", "label": "ONBOARDING"}
\`\`\`

Supported patch fields:
- headline  — string, \\n for line breaks, 2-3 short lines max
- label     — string, 1-3 words, ALL CAPS recommended
- layout    — one of the available layouts above
- inverted  — boolean (true = dark background variant)

Rules for great App Store copy:
• Benefit-first, concrete, punchy — max 6-8 words per headline line
• Label: category name in uppercase, 1-3 words
• No buzzwords: avoid "seamless", "innovative", "powerful", "robust"
• Numbers beat adjectives ("30% faster" > "much faster")`;
}

// Normalized SSE helpers — both providers' wire formats collapse to:
//   data: {"text":"chunk"}\n\n
//   data: [DONE]\n\n
const enc = new TextEncoder();
function sseText(chunk: string)  { return enc.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`); }
function sseDone()               { return enc.encode("data: [DONE]\n\n"); }
function sseErr(msg: string)     { return enc.encode(`data: ${JSON.stringify({ error: msg })}\n\n`); }

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── Parse body ──
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return bad("Invalid JSON body");
  }

  // ── Validate provider ──
  const pid = body.provider as ProviderId;
  if (!pid || !(pid in PROVIDERS)) {
    return bad(`provider must be one of: ${Object.keys(PROVIDERS).join(", ")}`);
  }
  const prov = PROVIDERS[pid];

  // ── Validate model (strict whitelist) ──
  const model = typeof body.model === "string" && prov.models.has(body.model as never)
    ? body.model
    : prov.defaultModel;

  // ── Validate API key ──
  const apiKey = body.apiKey;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith(prov.keyPrefix)) {
    return bad(`API key for ${pid} must start with "${prov.keyPrefix}"`);
  }
  // Reject suspiciously short keys (all real keys are ≥ 40 chars)
  if (apiKey.length < 20) {
    return bad("API key is too short to be valid");
  }

  // ── Validate messages ──
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return bad("messages must be a non-empty array");
  }
  if (body.messages.length > MAX_MESSAGES) {
    return bad(`messages must not exceed ${MAX_MESSAGES} entries`);
  }

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of body.messages) {
    if (!m || typeof m !== "object") return bad("each message must be an object");
    const msg = m as Record<string, unknown>;
    if (msg.role !== "user" && msg.role !== "assistant") {
      return bad('each message.role must be "user" or "assistant"');
    }
    if (typeof msg.content !== "string") return bad("each message.content must be a string");
    if (msg.content.length > MAX_MSG_LEN) {
      return bad(`message content must not exceed ${MAX_MSG_LEN} characters`);
    }
    messages.push({ role: msg.role, content: msg.content });
  }

  // Enforce alternating roles (prevents prompt stuffing)
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].role === messages[i - 1].role) {
      return bad("messages must alternate between user and assistant roles");
    }
  }
  if (messages[0].role !== "user") {
    return bad("first message must have role user");
  }

  // ── Build system prompt server-side ──
  const system = buildSystem(body.context ?? {});

  // ── Call upstream provider ──
  let upstream: Response;
  try {
    if (pid === "anthropic") {
      upstream = await fetch(prov.endpoint, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({ model, max_tokens: 1024, system, messages, stream: true }),
      });
    } else if (pid === "gemini") {
      // Gemini endpoint: base/model:streamGenerateContent?alt=sse
      // Roles: user→user, assistant→model (Gemini naming convention)
      const geminiUrl = `${prov.endpoint}/${model}:streamGenerateContent?alt=sse`;
      upstream = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : m.role,
            parts: [{ text: m.content }],
          })),
          generationConfig: { maxOutputTokens: 1024 },
        }),
      });
    } else {
      // OpenAI
      upstream = await fetch(prov.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [{ role: "system", content: system }, ...messages],
          stream: true,
        }),
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return bad(`Could not reach ${pid}: ${msg}`, 502);
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    let detail = text;
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } | string };
      if (typeof parsed.error === "string") detail = parsed.error;
      else if (typeof parsed.error?.message === "string") detail = parsed.error.message;
    } catch { /* keep raw text */ }
    // Never echo the API key back; strip anything that looks like it
    const safe = detail.replace(/sk-[A-Za-z0-9_-]{8,}/g, "[redacted]");
    return bad(safe, upstream.status);
  }

  // ── Normalize SSE stream ──────────────────────────────────────────────────
  // Both Anthropic and OpenAI SSE formats are translated to:
  //   data: {"text":"…"}\n\n  (text chunk)
  //   data: [DONE]\n\n         (end of stream)
  //   data: {"error":"…"}\n\n  (error mid-stream)
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body?.getReader();
      if (!reader) { controller.close(); return; }
      const dec = new TextDecoder();
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") break;
            try {
              const ev = JSON.parse(raw) as Record<string, unknown>;
              let chunk: string | undefined;
              if (pid === "anthropic") {
                if (ev.type === "content_block_delta") {
                  const delta = ev.delta as Record<string, unknown> | undefined;
                  if (delta?.type === "text_delta") chunk = String(delta.text ?? "");
                }
              } else if (pid === "gemini") {
                // Gemini: { candidates: [{ content: { parts: [{ text }] } }] }
                type GeminiCandidate = { content?: { parts?: Array<{ text?: string }> } };
                const candidates = ev.candidates as GeminiCandidate[] | undefined;
                chunk = candidates?.[0]?.content?.parts?.[0]?.text;
              } else {
                // OpenAI
                const choices = ev.choices as Array<{ delta?: { content?: string } }> | undefined;
                chunk = choices?.[0]?.delta?.content;
              }
              if (chunk) controller.enqueue(sseText(chunk));
            } catch { /* skip malformed line */ }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Stream error";
        controller.enqueue(sseErr(msg));
      } finally {
        controller.enqueue(sseDone());
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
