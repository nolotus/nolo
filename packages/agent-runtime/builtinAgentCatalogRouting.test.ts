import { describe, expect, it } from "bun:test";

import { BUILTIN_AGENT_CATALOG } from "core/builtinAgentCatalog";
import {
  hasPlatformHostedUpstreamRoute,
  resolvePlatformHostedCredentialProvider,
} from "./platformProviderEndpoints";
import { platformHostedModels } from "ai/llm/platformHosted";
import { resolveBuiltinPlatformAgentRoute } from "./builtinPlatformAgentRoute";
import { publicAgentKey } from "core/prefix";

/**
 * catalog 与分流表的一致性闸门。
 *
 * catalog（`packages/core/builtinAgentCatalog.ts`）说某个 agent 用什么模型，
 * platformHosted / platformProviderEndpoints 那套 `isPlatformHostedXxxModel`
 * 决定这个模型打到哪个上游、用谁的 key。两张表是分开手写的——只要换代时只改了
 * catalog、忘了分流表，请求就会在运行时落空。
 *
 * 落空的表现极其难查：不是「不认识这个模型」，而是退到 provider 级兜底，拿着
 * 一把不相干的 key 去打客户端传来的 url，最后以上游 401 出现
 * （见 docs/incidents/2026-08-13-nolo-chat-leveldb-lock-and-chat-401.md，
 * 以及 2026-08-22 同形态的 deepseek-v4-flash-vision-exp）。
 *
 * 所以这条测试在 CI 里替你盯着：catalog 里每个聊天模型都必须能解析出上游。
 */
describe("builtinAgentCatalog × 平台分流表", () => {
  // 图片档 agent 的 chat 模型仍走普通聊天路由，这里不需要额外排除；
  // 真正没有 chat 上游的条目（如果将来出现）应当显式列在这里并写明原因。
  const EXEMPT_MODELS = new Set<string>();

  it("catalog 里每个模型都能解析出上游端点", () => {
    const unrouted = BUILTIN_AGENT_CATALOG.filter(
      (entry) =>
        !EXEMPT_MODELS.has(entry.model) &&
        !hasPlatformHostedUpstreamRoute(entry.provider, entry.model),
    ).map((entry) => `${entry.name}(${entry.provider}/${entry.model})`);

    expect(unrouted).toEqual([]);
  });

  it("内置 6 个 agent 的服务端权威路由都算得出端点", () => {
    for (const entry of BUILTIN_AGENT_CATALOG.filter((e) => e.group === "builtin")) {
      const route = resolveBuiltinPlatformAgentRoute(publicAgentKey(entry.id));
      expect(route).not.toBeNull();
      expect(route!.provider).toBe(entry.provider);
      expect(route!.model).toBe(entry.model);
      // 端点解析不出来 = 该 agent 上线即 PLATFORM_MODEL_UNROUTED
      expect(route!.endpoint).toBeTruthy();
    }
  });

  it("每个平台托管模型都同时算得出端点和 key 的来源（两张表必须逐条对齐）", () => {
    // 回归：kimi-k3 与 gemini-3.7-flash 曾经只在端点表里有、key 侧没有对应
    // 分支，靠 getNoloKey("nolo") 的 OLLAMA_API_KEY 兜底才通过前置检查。兜底
    // 删除后它们会在能被正确路由之前就被判成「服务器紧张」。
    const misaligned = (platformHostedModels as Array<{ name: string }>)
      .filter(
        (m) =>
          !hasPlatformHostedUpstreamRoute("nolo", m.name) ||
          !resolvePlatformHostedCredentialProvider("nolo", m.name),
      )
      .map((m) => m.name);

    expect(misaligned).toEqual([]);
  });

  it("catalog 里的 nolo 托管模型都算得出 key 的来源", () => {
    const missingCredential = BUILTIN_AGENT_CATALOG.filter(
      (entry) =>
        entry.provider === "nolo" &&
        !resolvePlatformHostedCredentialProvider(entry.provider, entry.model),
    ).map((entry) => `${entry.name}(${entry.model})`);

    expect(missingCredential).toEqual([]);
  });

  it("未知模型不会被兜底路由（兜底一旦回归，上面两条就形同虚设）", () => {
    expect(hasPlatformHostedUpstreamRoute("nolo", "model-that-does-not-exist")).toBe(false);
    expect(hasPlatformHostedUpstreamRoute("ollama-cloud", "model-that-does-not-exist")).toBe(false);
    expect(resolvePlatformHostedCredentialProvider("nolo", "model-that-does-not-exist")).toBeUndefined();
  });
});
