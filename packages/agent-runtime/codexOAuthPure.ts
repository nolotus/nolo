// packages/agent-runtime/codexOAuthPure.ts
//
// 纯字符串判定函数，不依赖 Node.js 模块（fs/os/path/crypto），可安全被 Web
// Bundle / 浏览器端代码引用。与 devinOAuthPure.ts 同一惯例。
//
// 为什么单独成一个文件：容器模块 codexResponsesProvider 顶部 import 了
// node:crypto 并在模块加载期 randomUUID()，一旦进入浏览器可达图会让 esbuild
// platform:"browser" 构建直接失败（见 scripts/dev/verifyWebBundleGuard.ts 的
// alpha 事故护栏）。devin/devinChannelWindows.ts 需要这条判据，而它本身在
// web 图里（packages/ai/context/contextOccupancy.ts → chat UI）。
// codexResponsesProvider 仍 re-export 本函数，公开 API 不变。

import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { isGpt62DeveloperPrefixModel } from "../integrations/openai/responsesPromptLayout";

/** 判定 agent 是否走 ChatGPT Codex OAuth 通道（apiKeyRef 归一为 "chatgpt"）。 */
export function isCodexOAuthAgent(
  agent:
    | { apiKeyRef?: string | null; provider?: string | null }
    | null
    | undefined,
): boolean {
  if (!agent) return false;
  const ref = agent.apiKeyRef?.trim().toLowerCase();
  return ref === "chatgpt";
}

/**
 * Call only after the caller has already selected the Codex OAuth route.
 *
 * Deliberately keyed on the route plus "no custom base URL" only: real ChatGPT
 * OAuth agent records are created with `apiSource: "custom"`, so excluding that
 * value silently disabled this layout for every agent it was meant to help.
 * A custom endpoint is still excluded by `customProviderUrl`.
 */
export function usesCodexDeveloperPrefix(
  // `apiSource` is accepted for call-site compatibility and deliberately never
  // read: real ChatGPT OAuth agent records carry `apiSource: "custom"`.
  agent: { customProviderUrl?: string | null; apiSource?: string | null },
  model: unknown,
): boolean {
  return !agent.customProviderUrl &&
    isGpt62DeveloperPrefixModel(asTrimmedLowercaseString(model).replace(/^openai\//, ""));
}
