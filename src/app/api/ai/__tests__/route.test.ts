import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function jsonBody(res: Response) {
  return res.json() as Promise<{ error?: string }>;
}

/** Minimal valid payload — mutate individual fields per test */
function validBase(provider: "anthropic" | "openai" | "gemini" = "anthropic") {
  const keys: Record<string, string> = {
    anthropic: "sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    openai: "sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    gemini: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  };
  const models: Record<string, string> = {
    anthropic: "claude-haiku-4-5-20251001",
    openai: "gpt-4o-mini",
    gemini: "gemini-2.0-flash",
  };
  return {
    provider,
    model: models[provider],
    apiKey: keys[provider],
    messages: [{ role: "user", content: "Hello" }],
    context: { appName: "Test App", device: "iphone", locale: "en" },
  };
}

/** Build a minimal SSE stream that emits one text chunk then [DONE] */
function mockSseStream(chunks: string[], isMidStreamError = false): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
      }
      if (!isMidStreamError) controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

/** Anthropic SSE chunk format */
function anthropicChunk(text: string) {
  return JSON.stringify({
    type: "content_block_delta",
    delta: { type: "text_delta", text },
  });
}

/** OpenAI SSE chunk format */
function openaiChunk(text: string) {
  return JSON.stringify({
    choices: [{ delta: { content: text } }],
  });
}

/** Gemini SSE chunk format */
function geminiChunk(text: string, finishReason?: string) {
  return JSON.stringify({
    candidates: [
      {
        content: { parts: [{ text }], role: "model" },
        ...(finishReason ? { finishReason } : {}),
      },
    ],
  });
}

/** Drain an SSE Response and collect all text chunks. */
async function collectSse(res: Response): Promise<{ texts: string[]; errors: string[] }> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const texts: string[] = [];
  const errors: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") continue;
      try {
        const ev = JSON.parse(raw) as { text?: string; error?: string };
        if (ev.text) texts.push(ev.text);
        if (ev.error) errors.push(ev.error);
      } catch { /* skip */ }
    }
  }
  return { texts, errors };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Input validation ──────────────────────────────────────────────────────────

describe("provider validation", () => {
  it("rejects missing provider", async () => {
    const { provider: _, ...body } = validBase();
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(400);
    expect((await jsonBody(res)).error).toMatch(/provider/);
  });

  it("rejects unknown provider", async () => {
    const res = await POST(makeRequest({ ...validBase(), provider: "evil-provider" }) as never);
    expect(res.status).toBe(400);
    expect((await jsonBody(res)).error).toMatch(/provider/);
  });

  it("accepts anthropic", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([anthropicChunk("hi")]));
    const res = await POST(makeRequest(validBase("anthropic")) as never);
    expect(res.status).toBe(200);
  });

  it("accepts openai", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([openaiChunk("hi")]));
    const res = await POST(makeRequest(validBase("openai")) as never);
    expect(res.status).toBe(200);
  });

  it("accepts gemini", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([geminiChunk("hi")]));
    const res = await POST(makeRequest(validBase("gemini")) as never);
    expect(res.status).toBe(200);
  });
});

describe("model validation", () => {
  it("falls back to default model for unknown model id", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([anthropicChunk("ok")]));
    const res = await POST(makeRequest({ ...validBase(), model: "nonexistent-model" }) as never);
    // Should not reject — falls back to defaultModel
    expect(res.status).toBe(200);
    const [call] = fetchMock.mock.calls;
    const sentBody = JSON.parse(call[1].body as string) as { model: string };
    expect(sentBody.model).toBe("claude-haiku-4-5-20251001");
  });

  it("uses the specified model when valid", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([anthropicChunk("ok")]));
    const res = await POST(makeRequest({ ...validBase(), model: "claude-sonnet-4-6" }) as never);
    expect(res.status).toBe(200);
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { model: string };
    expect(sentBody.model).toBe("claude-sonnet-4-6");
  });
});

describe("API key validation", () => {
  it("rejects missing API key", async () => {
    const { apiKey: _, ...body } = validBase();
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(400);
    expect((await jsonBody(res)).error).toMatch(/key/i);
  });

  it("rejects key with wrong prefix for anthropic", async () => {
    const res = await POST(makeRequest({ ...validBase("anthropic"), apiKey: "sk-oai-xxxxxxxxxxxxxxxx" }) as never);
    expect(res.status).toBe(400);
    expect((await jsonBody(res)).error).toMatch(/sk-ant-/);
  });

  it("rejects key with wrong prefix for openai", async () => {
    // OpenAI prefix is "sk-"; Gemini's AIza prefix must be rejected
    const res = await POST(makeRequest({ ...validBase("openai"), apiKey: "AIzaSyNotAnOpenAiKeyXXXXX" }) as never);
    expect(res.status).toBe(400);
  });

  it("rejects key with wrong prefix for gemini", async () => {
    const res = await POST(makeRequest({ ...validBase("gemini"), apiKey: "sk-ant-xxxxxxxxxxxxxxxx" }) as never);
    expect(res.status).toBe(400);
    expect((await jsonBody(res)).error).toMatch(/AIza/);
  });

  it("rejects key that is too short", async () => {
    const res = await POST(makeRequest({ ...validBase("anthropic"), apiKey: "sk-ant-short" }) as never);
    expect(res.status).toBe(400);
    expect((await jsonBody(res)).error).toMatch(/short/i);
  });

  it("does not echo the API key in error messages", async () => {
    const key = "sk-ant-api03-secretsecretkey12345678";
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: `Invalid key: ${key}` } }), { status: 401 }),
    );
    const res = await POST(makeRequest({ ...validBase("anthropic"), apiKey: key }) as never);
    const body = await jsonBody(res);
    expect(body.error).not.toContain(key);
    expect(body.error).toContain("[redacted]");
  });
});

describe("messages validation", () => {
  it("rejects missing messages", async () => {
    const { messages: _, ...body } = validBase();
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(400);
    expect((await jsonBody(res)).error).toMatch(/messages/);
  });

  it("rejects empty messages array", async () => {
    const res = await POST(makeRequest({ ...validBase(), messages: [] }) as never);
    expect(res.status).toBe(400);
  });

  it("rejects more than 20 messages", async () => {
    const messages = Array.from({ length: 21 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "msg",
    }));
    const res = await POST(makeRequest({ ...validBase(), messages }) as never);
    expect(res.status).toBe(400);
    expect((await jsonBody(res)).error).toMatch(/20/);
  });

  it("rejects message with content over 4000 chars", async () => {
    const res = await POST(makeRequest({
      ...validBase(),
      messages: [{ role: "user", content: "x".repeat(4001) }],
    }) as never);
    expect(res.status).toBe(400);
    expect((await jsonBody(res)).error).toMatch(/4000/);
  });

  it("rejects non-alternating roles", async () => {
    const res = await POST(makeRequest({
      ...validBase(),
      messages: [
        { role: "user", content: "Hello" },
        { role: "user", content: "Hello again" },
      ],
    }) as never);
    expect(res.status).toBe(400);
    expect((await jsonBody(res)).error).toMatch(/alternate/);
  });

  it("rejects first message with role=assistant", async () => {
    const res = await POST(makeRequest({
      ...validBase(),
      messages: [{ role: "assistant", content: "Hi I am an assistant" }],
    }) as never);
    expect(res.status).toBe(400);
    expect((await jsonBody(res)).error).toMatch(/first/);
  });

  it("accepts alternating user/assistant messages", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([anthropicChunk("ok")]));
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
      { role: "user", content: "Continue" },
    ];
    const res = await POST(makeRequest({ ...validBase(), messages }) as never);
    expect(res.status).toBe(200);
  });
});

// ── Anthropic upstream integration ────────────────────────────────────────────

describe("Anthropic upstream", () => {
  it("calls the correct endpoint", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([anthropicChunk("ok")]));
    await POST(makeRequest(validBase("anthropic")) as never);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.anthropic.com/v1/messages");
  });

  it("sends x-api-key and anthropic-version headers", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([anthropicChunk("ok")]));
    await POST(makeRequest(validBase("anthropic")) as never);
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe(validBase("anthropic").apiKey);
    expect(headers["anthropic-version"]).toBe("2023-06-01");
  });

  it("streams and normalises text chunks", async () => {
    fetchMock.mockResolvedValueOnce(
      mockSseStream([anthropicChunk("Hello"), anthropicChunk(" world")]),
    );
    const res = await POST(makeRequest(validBase("anthropic")) as never);
    const { texts } = await collectSse(res);
    expect(texts).toEqual(["Hello", " world"]);
  });
});

// ── OpenAI upstream integration ───────────────────────────────────────────────

describe("OpenAI upstream", () => {
  it("calls the correct endpoint", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([openaiChunk("ok")]));
    await POST(makeRequest(validBase("openai")) as never);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("sends Authorization: Bearer header", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([openaiChunk("ok")]));
    await POST(makeRequest(validBase("openai")) as never);
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${validBase("openai").apiKey}`);
  });

  it("injects system message as first content item", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([openaiChunk("ok")]));
    await POST(makeRequest(validBase("openai")) as never);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("copywriting assistant");
  });

  it("streams and normalises text chunks", async () => {
    fetchMock.mockResolvedValueOnce(
      mockSseStream([openaiChunk("Foo"), openaiChunk(" bar")]),
    );
    const res = await POST(makeRequest(validBase("openai")) as never);
    const { texts } = await collectSse(res);
    expect(texts).toEqual(["Foo", " bar"]);
  });
});

// ── Gemini upstream integration ───────────────────────────────────────────────

describe("Gemini upstream", () => {
  it("calls model-specific streamGenerateContent endpoint", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([geminiChunk("ok")]));
    await POST(makeRequest(validBase("gemini")) as never);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).toContain("gemini-2.0-flash");
    expect(url).toContain("streamGenerateContent");
    expect(url).toContain("alt=sse");
  });

  it("sends x-goog-api-key header (not Bearer)", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([geminiChunk("ok")]));
    await POST(makeRequest(validBase("gemini")) as never);
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["x-goog-api-key"]).toBe(validBase("gemini").apiKey);
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("sends system prompt as system_instruction.parts", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([geminiChunk("ok")]));
    await POST(makeRequest(validBase("gemini")) as never);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      system_instruction: { parts: Array<{ text: string }> };
    };
    expect(body.system_instruction.parts[0].text).toContain("copywriting assistant");
  });

  it("maps assistant role to 'model' in contents", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([geminiChunk("ok")]));
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
      { role: "user", content: "Next" },
    ];
    await POST(makeRequest({ ...validBase("gemini"), messages }) as never);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      contents: Array<{ role: string }>;
    };
    expect(body.contents[0].role).toBe("user");
    expect(body.contents[1].role).toBe("model");
    expect(body.contents[2].role).toBe("user");
  });

  it("streams and normalises Gemini text chunks", async () => {
    fetchMock.mockResolvedValueOnce(
      mockSseStream([
        geminiChunk("Hello"),
        geminiChunk(" Gemini", "STOP"),
      ]),
    );
    const res = await POST(makeRequest(validBase("gemini")) as never);
    const { texts } = await collectSse(res);
    expect(texts).toEqual(["Hello", " Gemini"]);
  });

  it("uses gemini-specific model when specified", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([geminiChunk("ok")]));
    await POST(makeRequest({ ...validBase("gemini"), model: "gemini-1.5-pro" }) as never);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("gemini-1.5-pro");
  });

  it("falls back to gemini-2.0-flash for unknown gemini model", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([geminiChunk("ok")]));
    await POST(makeRequest({ ...validBase("gemini"), model: "gemini-99-ultra" }) as never);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("gemini-2.0-flash");
  });

  it("rejects gemini key missing AIza prefix", async () => {
    const res = await POST(makeRequest({ ...validBase("gemini"), apiKey: "sk-ant-notgoogle" }) as never);
    expect(res.status).toBe(400);
    expect((await jsonBody(res)).error).toMatch(/AIza/);
  });

  it("sends generationConfig with maxOutputTokens", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([geminiChunk("ok")]));
    await POST(makeRequest(validBase("gemini")) as never);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      generationConfig: { maxOutputTokens: number };
    };
    expect(body.generationConfig.maxOutputTokens).toBe(1024);
  });
});

// ── Upstream error handling ───────────────────────────────────────────────────

describe("upstream error handling", () => {
  it("returns 502 when fetch throws (network error)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const res = await POST(makeRequest(validBase()) as never);
    expect(res.status).toBe(502);
  });

  it("returns upstream status on 401", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 }),
    );
    const res = await POST(makeRequest(validBase()) as never);
    expect(res.status).toBe(401);
  });

  it("extracts error.message from upstream JSON", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { message: "Rate limit exceeded" } }),
        { status: 429 },
      ),
    );
    const res = await POST(makeRequest(validBase()) as never);
    const body = await jsonBody(res);
    expect(body.error).toContain("Rate limit exceeded");
  });

  it("redacts API key if upstream echoes it in error text", async () => {
    const key = validBase("openai").apiKey;
    fetchMock.mockResolvedValueOnce(
      new Response(`{"error":"bad key: ${key}"}`, { status: 400 }),
    );
    const res = await POST(makeRequest(validBase("openai")) as never);
    const body = await jsonBody(res);
    expect(body.error).not.toContain(key);
  });
});

// ── System prompt server-side construction ────────────────────────────────────

describe("system prompt", () => {
  it("includes appName from context", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([anthropicChunk("ok")]));
    await POST(makeRequest({ ...validBase(), context: { appName: "MyTestApp", device: "iphone", locale: "en" } }) as never);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { system: string };
    expect(body.system).toContain("MyTestApp");
  });

  it("caps context field to 300 chars to prevent prompt injection", async () => {
    fetchMock.mockResolvedValueOnce(mockSseStream([anthropicChunk("ok")]));
    const longName = "A".repeat(400);
    await POST(makeRequest({
      ...validBase(),
      context: { appName: longName, device: "iphone", locale: "en" },
    }) as never);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { system: string };
    // Should be capped — the 400-char name should not appear in full
    expect(body.system).not.toContain(longName);
    expect(body.system).toContain("A".repeat(300));
  });
});
