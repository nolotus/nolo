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
