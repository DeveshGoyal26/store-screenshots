"use client";
import * as React from "react";
import { Bot, Key, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { writeLocalized } from "@/lib/locale";
import type { ProjectState, Slide, SlideBackground, SlideLayout } from "@/lib/types";

// ---------- types ----------

type ChatMessage = { role: "user" | "assistant"; content: string };

type SlidePatch = {
  label?: string;
  headline?: string;
  layout?: SlideLayout;
  background?: Partial<SlideBackground>;
  inverted?: boolean;
};

type Props = {
  activeSlide: Slide | null;
  state: ProjectState;
  locale: string;
  onPatchSlide: (patch: Partial<Slide>) => void;
};

// ---------- constants ----------

const KEY_STORAGE = "ai-assistant:api-key:v1";

const SUGGESTIONS = [
  "Write a punchy headline for this slide",
  "Suggest a better label for this feature",
  "Make the headline more benefit-focused",
  "Give me 3 alternative headlines to choose from",
];

// ---------- helpers ----------

function buildSystem(state: ProjectState, slide: Slide | null, locale: string): string {
  const slideCtx = slide
    ? `Current slide:
  layout: ${slide.layout}
  label: "${slide.label?.[locale] ?? ""}"
  headline: "${slide.headline?.[locale] ?? ""}"
  dark variant: ${slide.inverted ? "yes" : "no"}`
    : "No slide selected.";

  return `You are an AI copywriting assistant embedded in an App Store screenshot editor.

App name: "${state.appName}"
Device: ${state.device}
Active locale: ${locale}

${slideCtx}

Your job: help write compelling App Store / Play Store marketing copy and make design suggestions.

Available layouts: hero, device-bottom, device-top, two-devices, no-device, split-landscape

When you want to suggest changes that can be applied directly to the slide, include a JSON object inside a fenced code block tagged "apply". Only include fields you want to change:

\`\`\`apply
{"headline": "Set up in 60 seconds\\nno credit card needed", "label": "ONBOARDING"}
\`\`\`

Supported patch fields:
- headline  — string, use \\n for line breaks, 2–3 short lines max
- label     — string, 1–3 words, ALL CAPS recommended
- layout    — one of the available layouts listed above
- inverted  — boolean, true = dark background variant

Rules for great App Store copy:
• Headline: benefit-first, concrete, punchy — max 6–8 words per line
• Label: category/feature name in uppercase, 1–3 words
• No buzzwords: avoid "seamless", "innovative", "powerful", "robust"
• Focus on what the user gains, not what the feature does
• Numbers beat adjectives ("30% faster" > "much faster")`;
}

function parsePatches(text: string): Array<{ marker: string; patch: SlidePatch }> {
  const out: Array<{ marker: string; patch: SlidePatch }> = [];
  const re = /```apply\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    try {
      const patch = JSON.parse(m[1].trim()) as SlidePatch;
      out.push({ marker: m[0], patch });
    } catch {
      // malformed JSON — skip
    }
  }
  return out;
}

function patchSummary(patch: SlidePatch): string {
  return Object.entries(patch)
    .map(([k, v]) => {
      if (typeof v === "string") return `${k}: "${v.replace(/\n/g, " / ")}"`;
      if (typeof v === "boolean") return `${k}: ${v}`;
      return `${k}: ${JSON.stringify(v)}`;
    })
    .join("  ·  ");
}

// ---------- sub-components ----------

function AssistantBubble({
  message,
  slide,
  onApply,
}: {
  message: ChatMessage;
  slide: Slide | null;
  onApply: (patch: SlidePatch) => void;
}) {
  const patches = parsePatches(message.content);
  const parts: React.ReactNode[] = [];
  let remaining = message.content;
  let key = 0;

  for (const { marker, patch } of patches) {
    const idx = remaining.indexOf(marker);
    const before = idx > 0 ? remaining.slice(0, idx) : "";
    if (before.trim()) {
      parts.push(
        <p key={key++} className="whitespace-pre-wrap text-xs leading-relaxed">
          {before}
        </p>,
      );
    }
    remaining = remaining.slice(idx + marker.length);

    parts.push(
      <div
        key={key++}
        className="my-2 rounded-md border border-primary/25 bg-primary/5 p-2.5 space-y-2"
      >
        <p className="text-[10px] text-muted-foreground leading-snug">{patchSummary(patch)}</p>
        <Button
          type="button"
          size="sm"
          className="h-7 w-full text-xs gap-1.5"
          disabled={!slide}
          onClick={() => onApply(patch)}
        >
          <Sparkles className="h-3 w-3" />
          Apply to slide
        </Button>
      </div>,
    );
  }

  if (remaining.trim()) {
    parts.push(
      <p key={key++} className="whitespace-pre-wrap text-xs leading-relaxed">
        {remaining}
      </p>,
    );
  }

  return (
    <div className="flex gap-2">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1 space-y-1 text-foreground">{parts}</div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-1 pt-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- main component ----------

export function AiAssistant({ activeSlide, state, locale, onPatchSlide }: Props) {
  const [apiKey, setApiKey] = React.useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(KEY_STORAGE) ?? "";
  });
  const [keyDraft, setKeyDraft] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const bottomRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function saveKey() {
    const k = keyDraft.trim();
    if (!k) return;
    localStorage.setItem(KEY_STORAGE, k);
    setApiKey(k);
    setKeyDraft("");
  }

  function removeKey() {
    localStorage.removeItem(KEY_STORAGE);
    setApiKey("");
    setMessages([]);
  }

  function applyPatch(patch: SlidePatch) {
    if (!activeSlide) return;
    const out: Partial<Slide> = {};
    if (patch.headline !== undefined)
      out.headline = writeLocalized(activeSlide.headline, locale, patch.headline);
    if (patch.label !== undefined)
      out.label = writeLocalized(activeSlide.label, locale, patch.label);
    if (patch.layout !== undefined) out.layout = patch.layout;
    if (patch.inverted !== undefined) out.inverted = patch.inverted;
    if (patch.background !== undefined)
      out.background = { ...activeSlide.background, ...patch.background };
    onPatchSlide(out);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !apiKey || streaming) return;
    setError(null);

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setStreaming(true);

    // Append placeholder assistant message so streaming can update it in-place
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          apiKey,
          system: buildSystem(state, activeSlide, locale),
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string; detail?: string };
        throw new Error(err.detail ?? err.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const dec = new TextDecoder();
      let buf = "";

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
            const ev = JSON.parse(raw) as {
              type: string;
              delta?: { type: string; text?: string };
            };
            if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) {
              const chunk = ev.delta.text;
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                copy[copy.length - 1] = { ...last, content: last.content + chunk };
                return copy;
              });
            }
          } catch {
            // malformed SSE line — ignore
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // user cancelled — remove empty assistant placeholder
        setMessages((prev) =>
          prev[prev.length - 1]?.content === "" ? prev.slice(0, -1) : prev,
        );
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setMessages((prev) =>
        prev[prev.length - 1]?.content === "" ? prev.slice(0, -1) : prev,
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  // ---------- API key setup screen ----------

  if (!apiKey) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Key className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold">Connect your Anthropic key</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Your key is stored only in your browser&apos;s localStorage —
            never sent to any server or database beyond Anthropic itself.
          </p>
        </div>
        <div className="w-full space-y-2">
          <Input
            type="password"
            placeholder="sk-ant-api03-…"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveKey()}
            autoComplete="off"
          />
          <Button
            className="w-full"
            size="sm"
            disabled={!keyDraft.trim()}
            onClick={saveKey}
          >
            Save key &amp; start chatting
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          Get a free key at{" "}
          <span className="font-mono">console.anthropic.com</span>
          <br />
          Only you ever see this key.
        </p>
      </div>
    );
  }

  // ---------- chat ----------

  const lastIsEmpty =
    messages.length > 0 && messages[messages.length - 1].content === "" && streaming;

  return (
    <div className="flex h-full flex-col">
      {/* status bar */}
      <div className="flex items-center justify-between border-b px-3 py-1.5 shrink-0">
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          API key active
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-5 gap-1 px-1.5 text-[10px] text-muted-foreground"
          onClick={removeKey}
          title="Remove stored API key"
        >
          <X className="h-3 w-3" />
          Remove key
        </Button>
      </div>

      {/* slide context pill */}
      {activeSlide && (
        <div className="border-b bg-muted/30 px-3 py-1 shrink-0">
          <p className="truncate text-[10px] text-muted-foreground">
            <span className="font-medium text-foreground">{state.appName}</span>
            {" · "}
            {activeSlide.layout}
            {activeSlide.headline?.[locale] ? (
              <>
                {" · "}
                <span className="italic">
                  &ldquo;{activeSlide.headline[locale]?.split("\n")[0]}&rdquo;
                </span>
              </>
            ) : null}
          </p>
        </div>
      )}

      {/* message list */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-medium text-muted-foreground">Try asking:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="block w-full rounded border border-dashed px-2.5 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
                onClick={() => send(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground">
                {msg.content}
              </div>
            </div>
          ) : (
            <AssistantBubble
              key={i}
              message={msg}
              slide={activeSlide}
              onApply={applyPatch}
            />
          ),
        )}

        {lastIsEmpty && <TypingIndicator />}

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="shrink-0 border-t p-2 space-y-1">
        <div className="flex gap-1.5">
          <Textarea
            rows={2}
            className="resize-none text-xs"
            placeholder="Ask AI to write copy, suggest changes…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
          />
          <Button
            type="button"
            size="icon"
            className="h-auto shrink-0 self-end"
            disabled={!input.trim() || streaming}
            onClick={() => send(input)}
            title="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
