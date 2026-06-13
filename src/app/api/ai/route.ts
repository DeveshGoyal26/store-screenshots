import type { NextRequest } from "next/server";

// Privacy contract: this route is a thin CORS proxy only.
// - The API key is received in the request body and forwarded directly to
//   Anthropic. It is NEVER written to disk, logs, environment, or any store.
// - The user's slide content (in the system prompt) is forwarded to Anthropic
//   and never persisted here.
// - No analytics, no telemetry, no database writes.

export async function POST(req: NextRequest) {
  let body: { messages: unknown[]; apiKey: string; system: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages, apiKey, system } = body;

  if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith("sk-")) {
    return Response.json({ error: "A valid Anthropic API key is required" }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages array is required" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: typeof system === "string" ? system : "",
        messages,
        stream: true,
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error reaching Anthropic";
    return Response.json({ error: msg }, { status: 502 });
  }

  if (!upstream.ok) {
    // Parse Anthropic's error without exposing the key
    const text = await upstream.text();
    let detail = text;
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      detail = parsed.error?.message ?? text;
    } catch {
      // keep raw text
    }
    return Response.json(
      { error: `Anthropic returned ${upstream.status}`, detail },
      { status: upstream.status },
    );
  }

  // Stream SSE response straight back to the client
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
