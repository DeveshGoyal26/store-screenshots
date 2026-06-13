"use client";
import * as React from "react";
import { Bot, Key, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AI_PROVIDERS,
  type ProviderId,
  defaultModel,
  isValidModel,
  providerById,
} from "@/lib/ai-providers";
import { writeLocalized } from "@/lib/locale";
import type { ProjectState, Slide, SlideBackground, SlideLayout } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────
type ChatMessage = { role: "user" | "assistant"; content: string };

type SlidePatch = {
  label?:      string;
  headline?:   string;
  layout?:     SlideLayout;
  background?: Partial<SlideBackground>;
  inverted?:   boolean;
};

type Props = {
  activeSlide:  Slide | null;
  state:        ProjectState;
  locale:       string;
  onPatchSlide: (patch: Partial<Slide>) => void;
};

// ── localStorage keys ─────────────────────────────────────────────────────────
const LS = {
  provider:    "ai:provider:v1",
  model:       "ai:model:v1",
  key: (pid: ProviderId) => `ai:key:${pid}:v1`,
} as const;

function ls(key: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(key) ?? "";
}
function lsSet(key: string, val: string) {
  if (typeof window !== "undefined") localStorage.setItem(key, val);
}
function lsDel(key: string) {
  if (typeof window !== "undefined") localStorage.removeItem(key);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "Write a punchy headline for this slide",
  "Suggest a better label for this feature",
  "Make the headline more benefit-focused",
  "Give me 3 alternative headlines to try",
];

function parsePatches(text: string): Array<{ marker: string; patch: SlidePatch }> {
  const out: Array<{ marker: string; patch: SlidePatch }> = [];
  const re = /```apply\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    try {
      const patch = JSON.parse(m[1].trim()) as SlidePatch;
      // Only accept known keys to avoid unexpected mutations
      const safe: SlidePatch = {};
      if (typeof patch.headline === "string") safe.headline = patch.headline;
      if (typeof patch.label    === "string") safe.label    = patch.label;
      if (typeof patch.inverted === "boolean") safe.inverted = patch.inverted;
      if (typeof patch.layout   === "string") safe.layout   = patch.layout as SlideLayout;
      if (patch.background && typeof patch.background === "object") {
        safe.background = patch.background;
      }
      if (Object.keys(safe).length > 0) out.push({ marker: m[0], patch: safe });
    } catch { /* skip malformed block */ }
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

// ── Sub-components ────────────────────────────────────────────────────────────
function AssistantBubble({
  message,
  slide,
  onApply,
}: {
  message: ChatMessage;
  slide:   Slide | null;
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
        <p key={key++} className="whitespace-pre-wrap text-xs leading-relaxed">{before}</p>,
      );
    }
    remaining = remaining.slice(idx + marker.length);
    parts.push(
      <div key={key++} className="my-2 space-y-2 rounded-md border border-primary/25 bg-primary/5 p-2.5">
        <p className="text-[10px] leading-snug text-muted-foreground">{patchSummary(patch)}</p>
        <Button
          type="button"
          size="sm"
          className="h-7 w-full gap-1.5 text-xs"
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
      <p key={key++} className="whitespace-pre-wrap text-xs leading-relaxed">{remaining}</p>,
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

function TypingDots() {
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

// ── Setup screen ──────────────────────────────────────────────────────────────
function KeySetupScreen({
  provider,
  onProviderChange,
  onSave,
}: {
  provider:         ProviderId;
  onProviderChange: (pid: ProviderId) => void;
  onSave:           (key: string) => void;
}) {
  const [keyDraft, setKeyDraft] = React.useState("");
  const cfg = AI_PROVIDERS[provider];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Key className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-semibold">Connect your AI key</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Your key is stored only in your browser&apos;s localStorage —
          never sent to any server or database.
        </p>
      </div>

      <div className="w-full space-y-2">
        <Select value={provider} onValueChange={(v) => { onProviderChange(v as ProviderId); setKeyDraft(""); }}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(AI_PROVIDERS) as Array<[ProviderId, typeof AI_PROVIDERS[ProviderId]]>).map(
              ([pid, p]) => (
                <SelectItem key={pid} value={pid}>{p.label}</SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        <Input
          type="password"
          placeholder={cfg.keyPlaceholder}
          value={keyDraft}
          autoComplete="off"
          onChange={(e) => setKeyDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && keyDraft.trim() && onSave(keyDraft.trim())}
        />

        <Button
          className="w-full"
          size="sm"
          disabled={!keyDraft.trim()}
          onClick={() => onSave(keyDraft.trim())}
        >
          Save key &amp; start chatting
        </Button>
      </div>

      <p className="text-[10px] text-center leading-relaxed text-muted-foreground">
        Get a free key at{" "}
        <span className="font-mono">{cfg.keyHint}</span>
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AiAssistant({ activeSlide, state, locale, onPatchSlide }: Props) {
  const [provider, setProvider] = React.useState<ProviderId>(() => providerById(ls(LS.provider)));
  const [model,    setModel]    = React.useState<string>(() => {
    const saved = ls(LS.model);
    const pid   = providerById(ls(LS.provider));
    return isValidModel(pid, saved) ? saved : defaultModel(pid);
  });
  const [apiKey,   setApiKey]   = React.useState<string>(() => ls(LS.key(providerById(ls(LS.provider)))));

  const [messages,  setMessages]  = React.useState<ChatMessage[]>([]);
  const [input,     setInput]     = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [error,     setError]     = React.useState<string | null>(null);

  const bottomRef = React.useRef<HTMLDivElement>(null);
  const abortRef  = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Provider / model switching ──
  function switchProvider(pid: ProviderId) {
    setProvider(pid);
    lsSet(LS.provider, pid);
    const newModel = defaultModel(pid);
    setModel(newModel);
    lsSet(LS.model, newModel);
    setApiKey(ls(LS.key(pid)));
    setMessages([]);
    setError(null);
  }

  function switchModel(mid: string) {
    setModel(mid);
    lsSet(LS.model, mid);
  }

  // ── Key management ──
  function saveKey(key: string) {
    lsSet(LS.key(provider), key);
    setApiKey(key);
  }

  function removeKey() {
    lsDel(LS.key(provider));
    setApiKey("");
    setMessages([]);
    setError(null);
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
  }

  // ── Apply AI patch to slide ──
  function applyPatch(patch: SlidePatch) {
    if (!activeSlide) return;
    const out: Partial<Slide> = {};
    if (patch.headline !== undefined)
      out.headline   = writeLocalized(activeSlide.headline, locale, patch.headline);
    if (patch.label !== undefined)
      out.label      = writeLocalized(activeSlide.label, locale, patch.label);
    if (patch.layout   !== undefined) out.layout   = patch.layout;
    if (patch.inverted !== undefined) out.inverted = patch.inverted;
    if (patch.background !== undefined)
      out.background = { ...activeSlide.background, ...patch.background };
    onPatchSlide(out);
  }

  // ── Send message ──
  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !apiKey || streaming) return;
    setError(null);

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setStreaming(true);

    // Append empty assistant placeholder so streaming updates it in-place
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        signal: abortRef.current.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          apiKey,
          messages: history.map(({ role, content }) => ({ role, content })),
          context: {
            appName: state.appName,
            device:  state.device,
            locale,
            slide: activeSlide
              ? {
                  layout:   activeSlide.layout,
                  label:    activeSlide.label?.[locale] ?? "",
                  headline: activeSlide.headline?.[locale] ?? "",
                  inverted: !!activeSlide.inverted,
                }
              : null,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
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
            // Our normalized format: { text } or { error }
            const ev = JSON.parse(raw) as { text?: string; error?: string };
            if (ev.error) throw new Error(ev.error);
            if (ev.text) {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                copy[copy.length - 1] = { ...last, content: last.content + ev.text };
                return copy;
              });
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== "Unexpected token") {
              throw parseErr;
            }
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setMessages((prev) =>
          prev[prev.length - 1]?.content === "" ? prev.slice(0, -1) : prev,
        );
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
      setMessages((prev) =>
        prev[prev.length - 1]?.content === "" ? prev.slice(0, -1) : prev,
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  // ── No key → setup screen ──
  if (!apiKey) {
    return (
      <KeySetupScreen
        provider={provider}
        onProviderChange={switchProvider}
        onSave={saveKey}
      />
    );
  }

  const cfg          = AI_PROVIDERS[provider];
  const lastIsEmpty  = messages.length > 0 && messages[messages.length - 1].content === "" && streaming;

  // ── Chat screen ──
  return (
    <div className="flex h-full flex-col">

      {/* Status + remove key */}
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
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

      {/* Provider + model selectors */}
      <div className="flex shrink-0 gap-1.5 border-b px-2 py-1.5">
        <Select value={provider} onValueChange={(v) => switchProvider(v as ProviderId)}>
          <SelectTrigger className="h-7 flex-1 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(AI_PROVIDERS) as Array<[ProviderId, typeof AI_PROVIDERS[ProviderId]]>).map(
              ([pid, p]) => (
                <SelectItem key={pid} value={pid} className="text-xs">{p.label}</SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        <Select value={model} onValueChange={switchModel}>
          <SelectTrigger className="h-7 flex-[2] text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cfg.models.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Context pill */}
      {activeSlide && (
        <div className="shrink-0 border-b bg-muted/30 px-3 py-1">
          <p className="truncate text-[10px] text-muted-foreground">
            <span className="font-medium text-foreground">{state.appName}</span>
            {" · "}
            {activeSlide.layout}
            {activeSlide.headline?.[locale] && (
              <> · <span className="italic">&ldquo;{activeSlide.headline[locale]?.split("\n")[0]}&rdquo;</span></>
            )}
          </p>
        </div>
      )}

      {/* Messages */}
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
            <AssistantBubble key={i} message={msg} slide={activeSlide} onApply={applyPatch} />
          ),
        )}

        {lastIsEmpty && <TypingDots />}

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 space-y-1 border-t p-2">
        <div className="flex gap-1.5">
          <Textarea
            rows={2}
            className="resize-none text-xs"
            placeholder="Ask AI to write copy, suggest changes…"
            value={input}
            disabled={streaming}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
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
        <p className="text-[10px] text-muted-foreground">Enter · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
