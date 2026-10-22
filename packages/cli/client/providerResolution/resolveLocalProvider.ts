/**
 * 本地 runtime 的 provider 路由：按顺序试每条 transport，第一条命中的胜出。
 *
 * **顺序是语义的一部分**，不要随手调整：
 * 1. 本地 CLI 子进程 —— agent 显式声明了 cliProvider，最特殊，先判。
 * 2-4. 三条 OAuth 专用 wire（Antigravity CCA / Anthropic messages / Codex responses）
 *      —— 它们都不是 OpenAI-compatible，必须先于任何通用分支拦下，否则会被
 *      兜底通道当成普通 /chat/completions 打过去（历史上就是这么 404 的）。
 * 5. Cursor Connect。
 * 6. Gemini 3 + tools 的 native 路由 —— 必须先于 platform proxy，后者传不了
 *    thought_signature。
 * 7. custom provider 的三条 native wire（gemini / openai-responses /
 *    anthropic-messages）—— 一个 resolver 按目录声明的 `nativeProtocol` 分派，
 *    占原来三条中最早的那个位置；先于 owner/platform proxy。
 * 8. owner-required（仅契约存在时；见下方短路说明）。
 * 9. 平台代理。
 * 10. 直连 OpenAI-compatible —— 兜底，永远命中，返回类型上不为 null。
 *
 * **owner-required 短路（安全关键）**：`ctx.ownerOriginExecution` 存在时，
 * 上面的数组**根本不进入遍历**——Antigravity/Claude/Codex 等更早的 transport
 * 不检查契约，会直接用 `apiKeyRefResolver` 读发起者本机凭据并以其身份执行
 * （既不发 owner 扩展也不验证 owner ack）。契约存在 = adapter 已判定本机
 * 用户 ≠ credential owner，模型必须走服务端 owner-required 代理；此时直接
 * 调 owner resolver 且 fail-closed（返回 null 等价于契约损坏，抛错而不是
 * 静默落到下一条本机通道）。契约缺省时数组逐字遍历，旧优先级不变。
 *
 * 拆分前这里是一个 940 行的闭包，分支靠缩进和上下文位置隐式排序；现在顺序被这
 * 个数组显式表达，增删一条通道只动一行 + 一个文件。
 */
import type { AgentRuntimeProvider } from "../../../agent-runtime";

import { resolveAnthropicOAuthTransport } from "./anthropicOAuthTransport";
import { resolveAntigravityTransport } from "./antigravityTransport";
import { resolveCliProviderTransport } from "./cliProviderTransport";
import { resolveCodexOAuthTransport } from "./codexOAuthTransport";
import { resolveCustomNativeTransport } from "./customNativeTransport";
import { resolveCursorTransport } from "./cursorTransport";
import { resolveDevinTransport } from "./devinTransport";
import { resolveDirectOpenAiCompatibleTransport } from "./directOpenAiCompatibleTransport";
import { resolveGeminiNativeToolTransport } from "./geminiNativeToolTransport";
import { resolveOwnerOAuthProxyTransport } from "./ownerOAuthProxyTransport";
import { resolvePlatformProxyTransport } from "./platformProxyTransport";
import type { ProviderResolutionContext, ProviderResolver } from "./providerResolutionContext";

const TRANSPORTS: readonly ProviderResolver[] = [
  resolveCliProviderTransport,
  resolveAntigravityTransport,
  resolveAnthropicOAuthTransport,
  resolveCodexOAuthTransport,
  resolveCursorTransport,
  resolveDevinTransport,
  resolveGeminiNativeToolTransport,
  // 三条 custom native wire（gemini / openai-responses / anthropic-messages）由
  // 这一个 resolver 按目录 `nativeProtocol` 分派：三种 wire 互斥（一个模型的
  // marker 只有一个值），因此合并到原来三条中最早的位置后，与邻居的相对顺序和
  // 命中结果逐字不变。
  resolveCustomNativeTransport,
  // owner-required 是 platform-proxy 的语义超集（同一条 server wire + 额外
  // 准入扩展）。必须排在它前面：ownerOriginExecution 存在时走 owner 通道，
  // 缺省时落到 platform-proxy，旧行为不变。
  resolveOwnerOAuthProxyTransport,
  resolvePlatformProxyTransport,
  // 兜底必须留在最后。
  resolveDirectOpenAiCompatibleTransport,
];

export async function resolveLocalProvider(
  ctx: ProviderResolutionContext,
): Promise<AgentRuntimeProvider> {
  if (ctx.ownerOriginExecution) {
    // owner-required：不遍历旧数组。任何更早的 transport（Antigravity /
    // Claude / Codex OAuth）命中都会读发起者本机凭据，必须在这里短路。
    // fail-closed：resolver 返回 null 视为契约损坏，抛错而非落回本机通道。
    const provider = await resolveOwnerOAuthProxyTransport(ctx);
    if (!provider) {
      throw new Error(
        "owner-required dispatch contract present but owner transport declined; refusing local credential fallback",
      );
    }
    return provider;
  }
  for (const transport of TRANSPORTS) {
    const provider = await transport(ctx);
    if (provider) return provider;
  }
  // 兜底通道要么返回 provider 要么抛错，走到这里说明 TRANSPORTS 被改坏了。
  throw new Error(
    "no local provider transport matched; the OpenAI-compatible fallback must be last in TRANSPORTS",
  );
}
