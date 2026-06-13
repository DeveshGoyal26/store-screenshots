import { describe, expect, it } from "vitest";
import { sanitizeCssColor, sanitizeImageSrc, sanitizeLocale } from "../sanitize";

// ── sanitizeCssColor ──────────────────────────────────────────────────────────

describe("sanitizeCssColor", () => {
  // Valid hex formats
  it("accepts 3-digit hex", () => expect(sanitizeCssColor("#fff")).toBe("#fff"));
  it("accepts 6-digit hex", () => expect(sanitizeCssColor("#1a2b3c")).toBe("#1a2b3c"));
  it("accepts 8-digit hex (alpha)", () => expect(sanitizeCssColor("#1a2b3cff")).toBe("#1a2b3cff"));
  it("accepts uppercase hex", () => expect(sanitizeCssColor("#AABBCC")).toBe("#AABBCC"));

  // Valid functional formats
  it("accepts rgb()", () => expect(sanitizeCssColor("rgb(255, 0, 0)")).toBe("rgb(255, 0, 0)"));
  it("accepts rgba()", () => expect(sanitizeCssColor("rgba(0, 0, 0, 0.5)")).toBe("rgba(0, 0, 0, 0.5)"));
  it("accepts hsl()", () => expect(sanitizeCssColor("hsl(120, 100%, 50%)")).toBe("hsl(120, 100%, 50%)"));
  it("accepts hsla()", () => expect(sanitizeCssColor("hsla(120, 100%, 50%, 0.5)")).toBe("hsla(120, 100%, 50%, 0.5)"));
  it("accepts modern oklch()", () => expect(sanitizeCssColor("oklch(50% 0.2 240)")).toBe("oklch(50% 0.2 240)"));

  // Named colors and keywords
  it("accepts named color: red", () => expect(sanitizeCssColor("red")).toBe("red"));
  it("accepts named color: transparent", () => expect(sanitizeCssColor("transparent")).toBe("transparent"));
  it("accepts currentColor", () => expect(sanitizeCssColor("currentColor")).toBe("currentColor"));

  // Strips surrounding whitespace
  it("trims leading/trailing whitespace", () => expect(sanitizeCssColor("  #fff  ")).toBe("#fff"));

  // Injection attempts — all must return undefined
  it("blocks semicolon injection", () => expect(sanitizeCssColor("red; background: blue")).toBeUndefined());
  it("blocks brace injection", () => expect(sanitizeCssColor("red}body{color:blue")).toBeUndefined());
  it("blocks URL injection (slash)", () => expect(sanitizeCssColor("url(https://evil.com)")).toBeUndefined());
  it("blocks double-quote", () => expect(sanitizeCssColor('"red"')).toBeUndefined());
  it("blocks single-quote", () => expect(sanitizeCssColor("'red'")).toBeUndefined());
  it("blocks colon", () => expect(sanitizeCssColor("red: evil")).toBeUndefined());
  it("blocks backtick", () => expect(sanitizeCssColor("`red`")).toBeUndefined());
  it("blocks newline", () => expect(sanitizeCssColor("red\nblue")).toBeUndefined());

  // Length limit
  it("blocks strings longer than 50 chars", () =>
    expect(sanitizeCssColor("a".repeat(51))).toBeUndefined());
  it("accepts strings exactly 50 chars", () => {
    // 50 chars of safe characters — not a real color but passes the char-set gate
    const val = "a".repeat(50);
    expect(sanitizeCssColor(val)).toBe(val);
  });

  // Non-string inputs
  it("returns undefined for number", () => expect(sanitizeCssColor(255)).toBeUndefined());
  it("returns undefined for null", () => expect(sanitizeCssColor(null)).toBeUndefined());
  it("returns undefined for undefined", () => expect(sanitizeCssColor(undefined)).toBeUndefined());
  it("returns undefined for object", () => expect(sanitizeCssColor({})).toBeUndefined());

  // Empty string
  it("returns undefined for empty string", () => expect(sanitizeCssColor("")).toBeUndefined());
  it("returns undefined for whitespace-only string", () => expect(sanitizeCssColor("   ")).toBeUndefined());
});

// ── sanitizeImageSrc ──────────────────────────────────────────────────────────

describe("sanitizeImageSrc", () => {
  // Valid relative paths
  it("accepts root-relative path", () =>
    expect(sanitizeImageSrc("/screenshots/en/01.png")).toBe("/screenshots/en/01.png"));
  it("accepts deeply nested path", () =>
    expect(sanitizeImageSrc("/frames/uploaded/abc123.jpg")).toBe("/frames/uploaded/abc123.jpg"));
  it("accepts path with dots in filename", () =>
    expect(sanitizeImageSrc("/public/my-app.icon.png")).toBe("/public/my-app.icon.png"));

  // Valid data URLs
  it("accepts PNG data URL", () =>
    expect(sanitizeImageSrc("data:image/png;base64,abc123==")).toBe("data:image/png;base64,abc123=="));
  it("accepts JPEG data URL", () =>
    expect(sanitizeImageSrc("data:image/jpeg;base64,/9j/4AA")).toBe("data:image/jpeg;base64,/9j/4AA"));
  it("accepts WebP data URL", () =>
    expect(sanitizeImageSrc("data:image/webp;base64,abc")).toBe("data:image/webp;base64,abc"));

  // Injection attempts — all must return undefined
  it("blocks javascript: protocol", () =>
    expect(sanitizeImageSrc("javascript:alert(1)")).toBeUndefined());
  it("blocks vbscript: protocol", () =>
    expect(sanitizeImageSrc("vbscript:evil()")).toBeUndefined());
  it("blocks data:text/html XSS", () =>
    expect(sanitizeImageSrc("data:text/html,<script>alert(1)</script>")).toBeUndefined());
  it("blocks data:application/javascript", () =>
    expect(sanitizeImageSrc("data:application/javascript;base64,YWxlcnQ=")).toBeUndefined());
  it("blocks arbitrary https URL", () =>
    expect(sanitizeImageSrc("https://external.com/image.png")).toBeUndefined());
  it("blocks protocol-relative URL", () =>
    expect(sanitizeImageSrc("//evil.com/image.png")).toBeUndefined());
  it("blocks path with space (potential path traversal)", () =>
    expect(sanitizeImageSrc("/screenshots/en/my file.png")).toBeUndefined());
  it("blocks path with query string", () =>
    expect(sanitizeImageSrc("/img.png?x=../../etc/passwd")).toBeUndefined());

  // Non-string inputs
  it("returns undefined for null", () => expect(sanitizeImageSrc(null)).toBeUndefined());
  it("returns undefined for number", () => expect(sanitizeImageSrc(42)).toBeUndefined());
  it("returns undefined for empty string", () => expect(sanitizeImageSrc("")).toBeUndefined());
  it("returns undefined for whitespace", () => expect(sanitizeImageSrc("  ")).toBeUndefined());
});

// ── sanitizeLocale ────────────────────────────────────────────────────────────

describe("sanitizeLocale", () => {
  // Valid locale codes
  it("accepts 2-char code: en", () => expect(sanitizeLocale("en")).toBe("en"));
  it("accepts 2-char code: fr", () => expect(sanitizeLocale("fr")).toBe("fr"));
  it("accepts region code: zh-CN", () => expect(sanitizeLocale("zh-CN")).toBe("zh-CN"));
  it("accepts region code: pt-BR", () => expect(sanitizeLocale("pt-BR")).toBe("pt-BR"));
  it("accepts script subtag: zh-Hans", () => expect(sanitizeLocale("zh-Hans")).toBe("zh-Hans"));

  // Invalid / malicious values
  it("blocks single char", () => expect(sanitizeLocale("e")).toBeUndefined());
  it("blocks path traversal: ../evil", () => expect(sanitizeLocale("../evil")).toBeUndefined());
  it("blocks semicolons", () => expect(sanitizeLocale("en;evil")).toBeUndefined());
  it("blocks too-long code", () => expect(sanitizeLocale("en-US-extra-long-code")).toBeUndefined());
  it("blocks digit-only", () => expect(sanitizeLocale("123")).toBeUndefined());

  // Non-string inputs
  it("returns undefined for null", () => expect(sanitizeLocale(null)).toBeUndefined());
  it("returns undefined for number", () => expect(sanitizeLocale(42)).toBeUndefined());
  it("returns undefined for empty string", () => expect(sanitizeLocale("")).toBeUndefined());
});
