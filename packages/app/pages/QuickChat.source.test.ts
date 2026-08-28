import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "QuickChat.tsx"), "utf8");

describe("QuickChat source", () => {
  it("preloads the runtime and dialog send path when the shell activates", () => {
    expect(source).toContain("preloadQuickChatRuntimeDependencies");
    expect(source).toContain("quickChatRuntimeImport()");
    expect(source).toContain("quickChatPreloadScheduled");
    expect(source).toContain("scheduleQuickChatRuntimeDependencyPreload");
    expect(source).toContain("QUICK_CHAT_PERF_PREFIX");
    expect(source).toContain("logQuickChatPreloadStage");
    expect(source).toContain("quick-chat-preload-scheduled");
    expect(source).toContain("quick-chat-preload-started");
    expect(source).toContain("quick-chat-preload-settled");
    expect(source).toContain("quickChatPreloadSettled");
    expect(source).toContain("quickChatRuntimeReadyCallbacks");
    expect(source).toContain("onQuickChatRuntimeReady");
    expect(source).toContain("setRuntimeActive(true)");
    expect(source).toContain("quick-chat-agent-prewarm-started");
    expect(source).toContain("quick-chat-agent-prewarm-settled");
    expect(source).toContain("dispatch(read({ dbKey: defaultAgentId }))");
    expect(source).toContain("atMs: performance.now()");
    expect(source).toContain("QUICK_CHAT_IDLE_PRELOAD_TIMEOUT_MS = 500");
    expect(source).toContain("QUICK_CHAT_FALLBACK_PRELOAD_DELAY_MS = 250");
    expect(source).toContain("requestIdleCallback");
    expect(source).toContain("cancelIdleCallback");
    expect(source).toContain("timeout: QUICK_CHAT_IDLE_PRELOAD_TIMEOUT_MS");
    expect(source).toContain("QUICK_CHAT_FALLBACK_PRELOAD_DELAY_MS");
    expect(source).toContain('scheduleQuickChatRuntimeDependencyPreload("module")');
    expect(source).toContain('import("render/page/PageLoader")');
    expect(source).toContain('import("chat/dialog/actions/createDialogAction")');
    expect(source).toContain('import("chat/dialog/actions/handleSendMessageAction")');
    expect(source).toContain('import("ai/agent/streamAgentChatTurn")');
    expect(source).toContain("void preloadQuickChatRuntimeDependencies();");
  });

  it("routes specialist chips directly to built-in agents", () => {
    expect(source).toContain('action: "specialist"');
    expect(source).toContain("BUILTIN_AGENT_CREATOR_AGENT_KEY");
    expect(source).toContain("BUILTIN_APP_BUILDER_AGENT_KEY");
    expect(source).toContain("chipCreateAgent");
    expect(source).toContain("chipCreateApp");
    // 反馈入口不再是 chip，改由用户菜单经 /chat?launch=feedback 进入。
    expect(source).not.toContain("chipFeedbackAgent");
  });

  it("launches whitelisted specialists from the ?launch= param", () => {
    expect(source).toContain("resolveQuickChatLaunchSpecialist");
    expect(source).toContain("hasLaunchedRef");
    expect(source).toContain("launchSpecialist.agentKey");
  });

  it("supports compact Space Home surface without hero or chips", () => {
    expect(source).toContain('"space-home-compact"');
    expect(source).toContain("spaceId?: string");
    expect(source).toContain("isCompact");
    expect(source).toContain("const showGreeting = !isCompact && surface !== \"home-primary\"");
    expect(source).toContain("!isCompact && <QuickChatChips");
    expect(source).toContain("spaceId={spaceId}");
    expect(source).toContain("onPersonalizationClick={isCompact ? undefined : startPersonalization}");
  });

  it("attaches viewTransitionStyle for quick-chat-composer when on home-primary surface", () => {
    expect(source).toContain("QUICK_CHAT_COMPOSER_VT_NAME");
    expect(source).toContain("viewTransitionStyle(");
  });
});
