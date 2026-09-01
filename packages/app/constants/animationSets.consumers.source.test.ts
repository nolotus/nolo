import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const appRoot = join(import.meta.dir, "..");
const packagesRoot = join(import.meta.dir, "../..");

const readApp = (rel: string) => readFileSync(join(appRoot, rel), "utf8");
const readPkg = (rel: string) => readFileSync(join(packagesRoot, rel), "utf8");

/**
 * Locks the contract after removing the AI response animation picker:
 * settings no longer exposes multi-set selection, and chat consumers use
 * fixed pending indicators (OrbActivityIndicator / StreamingPendingIndicator)
 * with no wave-glyph cycling.
 */
describe("animationSets consumers (source)", () => {
  test("ChatConfigSections does not contain multi-set animation UI", () => {
    const src = readApp("settings/web/chat-config/ChatConfigSections.tsx");
    expect(src).not.toContain("ANIMATION_SET_NAMES");
    expect(src).not.toContain("AnimationOption");
    expect(src).not.toContain("selectPreferredAnimationSet");
    expect(src).not.toContain("setPreferredAnimationSet");
    expect(src).not.toContain("chat.animationSet.title");
  });

  test("AnimationOption component no longer exists", () => {
    const path = join(
      appRoot,
      "settings/web/chat-config/AnimationOption.tsx",
    );
    expect(existsSync(path)).toBe(false);
  });

  test("web ThinkingSection uses OrbActivityIndicator (no wave glyphs)", () => {
    const src = readPkg("chat/messages/web/ThinkingSection.tsx");
    expect(src).not.toContain("selectPreferredAnimationSet");
    expect(src).not.toContain("useStreamingSymbol");
    expect(src).not.toContain("getStaticAnimationSymbol");
    expect(src).toContain("OrbActivityIndicator");
    expect(src).not.toMatch(/\[["']·["']\s*,\s*["']~/);
  });

  test("AssistantReplyPending uses OrbActivityIndicator (no wave glyphs)", () => {
    const src = readPkg("chat/messages/web/AssistantReplyPending.tsx");
    expect(src).not.toContain("selectPreferredAnimationSet");
    expect(src).not.toContain("useStreamingSymbol");
    expect(src).not.toContain("getStaticAnimationSymbol");
    expect(src).toContain("OrbActivityIndicator");
    expect(src).not.toMatch(/\[["']·["']\s*,\s*["']~/);
  });
});
