// Provider 解析覆盖（AgentRuntimeProviderResolveOptions）在 CLI 侧的落地。
//
// 为什么需要它：自动上下文压缩的摘要调用是**纯文本补全**——压缩 system prompt
// 明确禁止调工具——但它复用了主对话轮那个「带完整工具面」的 provider 实例。
// 所有 transport 都在解析期从 agentConfig 推导工具 schema 并注入上游请求
// （实测 15 个工具 ≈ 13.3k token、全量注册表 157 个 ≈ 66k token，prepareTools
// JSON 实测），叠加在已经 ~30k token 的摘要 prompt 上，把 gpt-6.x（ChatGPT
// 后端）的摘要延迟推到 60s 超时边缘（2026-11-03 本机日志：一次 59.4s 成功，
// 其余 20+ 次全部 60s 超时）。
//
// 为什么在解析期做而不是加 per-call 开关：cursor / devin / customNative 三条
// 通道在**构造 provider 时**就把工具烤进实例（createCursorProvider /
// createDevinProvider / createCustomNativeProvider），per-call options 到不了
// 那一层。解析期覆盖是唯一能统一覆盖全部 transport 的位置。
import type {
  AgentRuntimeAgentConfig,
  AgentRuntimeProviderResolveOptions,
} from "../agentRuntimeLocal";

/** CLI 内部字段（未进 AgentRuntimeAgentConfig 公共类型，调用方一直用 as any）。 */
type ToolSurfaceAwareConfig = AgentRuntimeAgentConfig & {
  toolSurface?: { finalToolNames?: string[] };
  runScopedToolSurface?: { finalToolNames?: string[] };
};

/**
 * 把解析覆盖项落到 exposed agent config 上；无覆盖时原样返回（同一引用）。
 *
 * 工具面真值来源是 `runScopedToolSurface.finalToolNames`——
 * `resolveProviderOpenAiToolBundle` 优先读它（localRuntimeTools.ts），所以覆盖
 * 该字段即可让所有 transport 解析出空工具面。`toolSurface.finalToolNames` 是
 * 同一份 canonical checkpoint 记录，一并同步，避免诊断口径分叉。
 *
 * `prompt` 覆盖只对「会把 agent 人设并进请求」的通道有实际效果（Codex 的
 * instructions）；其余通道的 system 内容来自消息本身，改了不生效也无害。
 */
export function resolveProviderResolveOverrides(
  agentConfig: AgentRuntimeAgentConfig,
  options?: AgentRuntimeProviderResolveOptions,
): AgentRuntimeAgentConfig {
  if (!options) return agentConfig;
  const { toolNames, prompt } = options;
  if (toolNames === undefined && prompt === undefined) return agentConfig;

  const current = agentConfig as ToolSurfaceAwareConfig;
  return {
    ...agentConfig,
    ...(toolNames !== undefined
      ? {
          toolNames,
          exposedToolNames: toolNames,
          toolSurface: { ...current.toolSurface, finalToolNames: toolNames },
          runScopedToolSurface: {
            ...current.runScopedToolSurface,
            finalToolNames: toolNames,
          },
        }
      : {}),
    ...(prompt !== undefined ? { prompt } : {}),
  };
}
