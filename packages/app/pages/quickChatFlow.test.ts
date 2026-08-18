import { describe, expect, it } from "bun:test";

import {
  QUICK_CHAT_MODE_STORAGE_KEY,
  QUICK_CHAT_PERF_PREFIX,
  buildQuickChatExtraParts,
  buildQuickChatFirstMessageText,
  buildQuickChatRouteState,
  createQuickChatPerfEvent,
  formatQuickChatDialogTitle,
  normalizeQuickChatMode,
  persistQuickChatMode,
  readStoredQuickChatMode,
  resolveQuickChatAgentKey,
  resolveQuickChatPlaceholderKind,
  resolveQuickChatPlaceholderMeta,
  QUICK_CHAT_GENERAL_TIER_AGENT_KEYS,
  QUICK_CHAT_DEFAULT_TIER_AGENTS,
  resolveQuickChatLaunchSpecialist,
} from "./quickChatFlow";
import {
  BUILTIN_AGENT_CREATOR_AGENT_KEY,
  BUILTIN_FEEDBACK_AGENT_KEY,
} from "core/builtinAgents";
import type { QuickChatTier } from "./quickChatFlow";

describe("quickChatFlow", () => {
  it("resolves only whitelisted ?launch= slugs to specialists", () => {
    expect(resolveQuickChatLaunchSpecialist("feedback")?.agentKey).toBe(
      BUILTIN_FEEDBACK_AGENT_KEY,
    );
    expect(resolveQuickChatLaunchSpecialist(" feedback ")?.agentKey).toBe(
      BUILTIN_FEEDBACK_AGENT_KEY,
    );
    expect(resolveQuickChatLaunchSpecialist(null)).toBeNull();
    expect(resolveQuickChatLaunchSpecialist("")).toBeNull();
    // 任意 agent key 不能通过 URL 直达并自动发消息
    expect(resolveQuickChatLaunchSpecialist(BUILTIN_AGENT_CREATOR_AGENT_KEY)).toBeNull();
  });

  it("exposes only the general tiers as model-override eligible", () => {
    // 三档当前均指向 flash（balanced/quality 临时降配），Set 去重后 size 为 1。
    expect(QUICK_CHAT_GENERAL_TIER_AGENT_KEYS.size).toBe(1);
    expect(
      QUICK_CHAT_GENERAL_TIER_AGENT_KEYS.has(
        QUICK_CHAT_DEFAULT_TIER_AGENTS.flash,
      ),
    ).toBe(true);
    expect(
      QUICK_CHAT_GENERAL_TIER_AGENT_KEYS.has(
        QUICK_CHAT_DEFAULT_TIER_AGENTS.balanced,
      ),
    ).toBe(true);
    expect(
      QUICK_CHAT_GENERAL_TIER_AGENT_KEYS.has(
        QUICK_CHAT_DEFAULT_TIER_AGENTS.quality,
      ),
    ).toBe(true);
    // image 档与专职 agent 不适用模型层覆盖
    expect(
      QUICK_CHAT_GENERAL_TIER_AGENT_KEYS.has(
        QUICK_CHAT_DEFAULT_TIER_AGENTS.image,
      ),
    ).toBe(false);
    expect(
      QUICK_CHAT_GENERAL_TIER_AGENT_KEYS.has(BUILTIN_FEEDBACK_AGENT_KEY),
    ).toBe(false);
  });

  it("maps pending files into the sendFirstMessage extraParts contract", () => {
    const extraParts = buildQuickChatExtraParts([
      {
        id: "ocr-1",
        name: "scan.txt",
        type: "ocr_text",
        ocrText: "recognized text",
      },
      {
        id: "page-1",
        name: "spec",
        type: "page",
        pageKey: "page-user-1",
      },
      {
        id: "dialog-1",
        name: "source dialog",
        type: "dialog",
        dialogKey: "dialog-user-2",
      },
    ]);

    expect(extraParts).toEqual([
      { type: "text", text: "recognized text" },
      {
        type: "page",
        name: "spec",
        pageKey: "page-user-1",
        dialogKey: undefined,
      },
      {
        type: "dialog",
        name: "source dialog",
        pageKey: undefined,
        dialogKey: "dialog-user-2",
      },
    ]);
  });

  it("builds the route state that lets the destination render the first message immediately", () => {
    expect(buildQuickChatRouteState("  hello  ")).toEqual({
      isNew: true,
      quickChatFirstMessage: {
        text: "hello",
      },
    });

    expect(buildQuickChatRouteState("   ")).toEqual({
      isNew: true,
      quickChatFirstMessage: undefined,
    });
  });

  it("builds first-message text for image-only quick-chat turns", () => {
    expect(buildQuickChatFirstMessageText("  hello  ", true)).toBe("hello");
    expect(buildQuickChatFirstMessageText("  hello  ", false)).toBe("hello");
    expect(buildQuickChatFirstMessageText("   ", true)).toBe("请描述这张图片。");
    expect(buildQuickChatFirstMessageText("   ", false)).toBe("");
  });

  it("creates stable timing events for each quick-chat stage", () => {
    expect(QUICK_CHAT_PERF_PREFIX).toBe("[QuickChatPerf]");
    expect(
      createQuickChatPerfEvent("dialog-created", 1_000, 1_125, 222.4, {
        dialogKey: "dialog-user-1",
      })
    ).toMatchObject({
      stage: "dialog-created",
      elapsedMs: 125,
      atMs: 222.4,
      dialogKey: "dialog-user-1",
    });
  });

  it("formats quick-chat dialog titles without reading the agent config", () => {
    expect(
      formatQuickChatDialogTitle("nolo", new Date("2026-05-21T06:07:00"))
    ).toBe("nolo  05-21 06:07");
    expect(formatQuickChatDialogTitle("", new Date("2026-01-02T03:04:00"))).toBe(
      "Agent  01-02 03:04"
    );
  });
});

describe("resolveQuickChatAgentKey", () => {
  const agents: Record<Exclude<QuickChatTier, "image">, string> = {
    flash: "agent-user-flash",
    balanced: "agent-user-balanced",
    quality: "agent-user-quality",
  };
  const resolveTierAgent = (tier: Exclude<QuickChatTier, "image">) => agents[tier];

  it("routes image turns to flash tier (preprocessing pipeline handles images)", async () => {
    const result = await resolveQuickChatAgentKey({
      hasImages: true,
      resolveTierAgent,
    });
    expect(result.agentKey).toBe("agent-user-flash");
  });

  it("routes text-only turns to the flash tier agent (binary: no classifier)", async () => {
    const result = await resolveQuickChatAgentKey({
      hasImages: false,
      resolveTierAgent,
    });
    expect(result.agentKey).toBe("agent-user-flash");
  });

  it("no longer returns skills (LLM classification removed)", async () => {
    const result = await resolveQuickChatAgentKey({
      hasImages: false,
      resolveTierAgent,
    });
    expect("skills" in result).toBe(false);
  });
});

describe("normalizeQuickChatMode", () => {
  it("accepts auto and migrates legacy custom, code, research to auto", () => {
    expect(normalizeQuickChatMode({ mode: "auto" })).toEqual({ mode: "auto" });
    expect(normalizeQuickChatMode({ mode: "research" })).toEqual({
      mode: "auto",
    });
    expect(normalizeQuickChatMode({ mode: "custom" })).toEqual({ mode: "auto" });
    expect(normalizeQuickChatMode({ mode: "code" })).toEqual({ mode: "auto" });
  });

  it("defaults invalid payloads to auto", () => {
    expect(normalizeQuickChatMode(null)).toEqual({ mode: "auto" });
    expect(normalizeQuickChatMode({})).toEqual({ mode: "auto" });
    expect(normalizeQuickChatMode({ mode: "unknown" })).toEqual({
      mode: "auto",
    });
  });
});

describe("resolveQuickChatPlaceholderKind / Meta", () => {
  it("always prefers empty state over mode", () => {
    expect(resolveQuickChatPlaceholderKind("auto", true)).toBe("empty");
    expect(resolveQuickChatPlaceholderMeta("auto", true)).toMatchObject({
      key: "quickChat.emptyPlaceholder",
    });
  });

  it("maps auto when not empty", () => {
    expect(resolveQuickChatPlaceholderKind("auto", false)).toBe("auto");
    expect(resolveQuickChatPlaceholderMeta("auto", false).key).toBe(
      "quickChat.placeholderAuto",
    );
  });
});

describe("readStoredQuickChatMode / persistQuickChatMode", () => {
  const makeMemoryStorage = (seed?: Record<string, string>) => {
    const map = new Map<string, string>(Object.entries(seed ?? {}));
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      snapshot: () => Object.fromEntries(map.entries()),
    };
  };

  it("reads a stored mode and writes via persist", () => {
    const storage = makeMemoryStorage({
      [QUICK_CHAT_MODE_STORAGE_KEY]: JSON.stringify({ mode: "auto" }),
    });
    expect(readStoredQuickChatMode(storage)).toEqual({ mode: "auto" });

    persistQuickChatMode({ mode: "auto" }, storage);
    expect(storage.snapshot()[QUICK_CHAT_MODE_STORAGE_KEY]).toBe(
      JSON.stringify({ mode: "auto" }),
    );
    expect(readStoredQuickChatMode(storage)).toEqual({ mode: "auto" });
  });

  it("rewrites legacy custom to auto on read", () => {
    const customStorage = makeMemoryStorage({
      [QUICK_CHAT_MODE_STORAGE_KEY]: JSON.stringify({ mode: "custom" }),
    });
    expect(readStoredQuickChatMode(customStorage)).toEqual({ mode: "auto" });
    expect(customStorage.snapshot()[QUICK_CHAT_MODE_STORAGE_KEY]).toBe(
      JSON.stringify({ mode: "auto" }),
    );
  });

  it("normalizes legacy code to auto on read (no write-back)", () => {
    const codeStorage = makeMemoryStorage({
      [QUICK_CHAT_MODE_STORAGE_KEY]: JSON.stringify({ mode: "code" }),
    });
    expect(readStoredQuickChatMode(codeStorage)).toEqual({ mode: "auto" });
  });

  it("falls back to auto for invalid values and broken JSON", () => {
    const invalid = makeMemoryStorage({
      [QUICK_CHAT_MODE_STORAGE_KEY]: JSON.stringify({ mode: "nope" }),
    });
    expect(readStoredQuickChatMode(invalid)).toEqual({ mode: "auto" });

    const broken = makeMemoryStorage({
      [QUICK_CHAT_MODE_STORAGE_KEY]: "{not-json",
    });
    expect(readStoredQuickChatMode(broken)).toEqual({ mode: "auto" });

    expect(readStoredQuickChatMode(null)).toEqual({ mode: "auto" });
  });
});
