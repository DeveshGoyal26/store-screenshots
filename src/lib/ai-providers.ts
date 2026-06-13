// Shared provider/model config used by both the AI assistant UI and the
// /api/ai route (the route has its own inline copy for Edge-runtime safety).

export const AI_PROVIDERS = {
  anthropic: {
    label: "Anthropic",
    keyPlaceholder: "sk-ant-api03-…",
    keyHint: "console.anthropic.com",
    models: [
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 · fastest" },
      { id: "claude-sonnet-4-6",         label: "Claude Sonnet 4.6" },
      { id: "claude-opus-4-8",           label: "Claude Opus 4.8 · most capable" },
    ],
    defaultModel: "claude-haiku-4-5-20251001",
  },
  openai: {
    label: "OpenAI",
    keyPlaceholder: "sk-proj-…",
    keyHint: "platform.openai.com",
    models: [
      { id: "gpt-4o-mini",  label: "GPT-4o mini · fastest" },
      { id: "gpt-4o",       label: "GPT-4o" },
      { id: "gpt-4-turbo",  label: "GPT-4 Turbo" },
    ],
    defaultModel: "gpt-4o-mini",
  },
  gemini: {
    label: "Google Gemini",
    keyPlaceholder: "AIzaSy…",
    keyHint: "aistudio.google.com",
    models: [
      { id: "gemini-2.0-flash",   label: "Gemini 2.0 Flash · fastest" },
      { id: "gemini-1.5-flash",   label: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro",     label: "Gemini 1.5 Pro · most capable" },
    ],
    defaultModel: "gemini-2.0-flash",
  },
} as const;

export type ProviderId = keyof typeof AI_PROVIDERS;

export function providerById(id: string): ProviderId {
  return id in AI_PROVIDERS ? (id as ProviderId) : "anthropic";
}

export function defaultModel(pid: ProviderId): string {
  return AI_PROVIDERS[pid].defaultModel;
}

export function isValidModel(pid: ProviderId, mid: string): boolean {
  return (AI_PROVIDERS[pid].models as ReadonlyArray<{ id: string }>).some((m) => m.id === mid);
}
