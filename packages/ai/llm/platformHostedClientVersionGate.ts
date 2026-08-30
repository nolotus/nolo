// packages/ai/llm/platformHostedClientVersionGate.ts
//
// 客户端版本闸门第 2 层「使用时拒绝」的唯一判定入口。
//
// 三个消费方共用同一份判定，保证「server 拒绝」「本地 self-check 拒绝」
// 「目录置灰」三处口径一致：
// 1. packages/server/handlers/chatHandler.ts（chat proxy 路径）
// 2. packages/server/handlers/agentRun/loopUpstream.ts（server agentRun 主路径）
// 3. packages/agent-runtime/providerResolution.ts（本地 CLI 直连 self-check）
//
// ── 范围（宿主拍板）───────────────────────────────────────────────────
// 只管平台托管模型（provider=nolo 家族）。用户自定义模型（apiSource=custom /
// customProviderUrl）与 OAuth 订阅模型走用户自己的凭据与选择，平台不设闸。
//
// ── 诚实的局限（fail-open）─────────────────────────────────────────────
// 不带 x-nolo-client-version 头的旧客户端在使用时**拦不住**。这是有意的：
// web 前端、server 内部调用（scheduler / 自动化 / 委派子 agent）同样不带这个
// 头，在这里 fail-closed 会把它们全部打死。旧客户端受保护的方式是：
//   (a) 目录层 minClientVersion 下发 → 新客户端置灰；
//   (b) 升级后客户端自带的本地 self-check → 一分钱都不烧。
// 不要试图 hack「无头请求也拒绝」。

import {
  buildClientVersionUpgradeMessage,
  CLIENT_VERSION_TOO_OLD_CODE,
  isClientVersionBelow,
} from "core/clientVersionGate";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { isNoloHostedProvider } from "./kimi";
import { resolvePlatformHostedMinClientVersion } from "./platformHostedRoutingTable";

export {
  CLIENT_VERSION_TOO_OLD_CODE,
  NOLO_CLIENT_VERSION_HEADER,
  readClientVersionHeader,
} from "core/clientVersionGate";

export type PlatformHostedClientVersionGateInput = {
  /** 记录/请求侧的 provider（"nolo" / legacy "ollama-cloud" 才进闸）。 */
  provider?: string | null;
  model?: string | null;
  /** 客户端声明的版本；缺失 = fail-open 放行。 */
  clientVersion?: string | null;
  /** apiSource==="custom" 或带 customProviderUrl：用户自带上游，不设闸。 */
  isCustomApi?: boolean;
  /** 用户显式自带 key / OAuth 凭据：用户自己的选择，不设闸。 */
  hasExplicitCredential?: boolean;
};

export type PlatformHostedClientVersionGateDecision =
  | { readonly blocked: false }
  | {
      readonly blocked: true;
      readonly code: typeof CLIENT_VERSION_TOO_OLD_CODE;
      readonly message: string;
      readonly model: string;
      readonly minClientVersion: string;
      readonly clientVersion?: string;
    };

const PASS: PlatformHostedClientVersionGateDecision = { blocked: false };

/**
 * 判断这次「平台托管模型使用」是否该因客户端版本过低而拒绝。
 *
 * 纯函数：不读 env、不读 header、不抛异常。调用方负责取版本头/自身版本，
 * 并把 blocked 结果翻译成各自通道的错误（HTTP JSON / throw / 本地报错）。
 */
export function evaluatePlatformHostedClientVersionGate(
  input: PlatformHostedClientVersionGateInput,
): PlatformHostedClientVersionGateDecision {
  // 用户自带上游或自带凭据 → 不设闸
  if (input.isCustomApi || input.hasExplicitCredential) return PASS;
  // 非平台托管 provider（custom / openai / anthropic / OAuth 订阅…）→ 不设闸
  if (!isNoloHostedProvider(input.provider)) return PASS;

  const model = asTrimmedLowercaseString(input.model);
  if (!model) return PASS;

  const minClientVersion = resolvePlatformHostedMinClientVersion(model);
  if (!minClientVersion) return PASS; // 该模型未门控

  const clientVersion = input.clientVersion?.trim() || undefined;
  if (!isClientVersionBelow(clientVersion, minClientVersion)) return PASS;

  return {
    blocked: true,
    code: CLIENT_VERSION_TOO_OLD_CODE,
    message: buildClientVersionUpgradeMessage({
      model,
      minClientVersion,
      ...(clientVersion ? { clientVersion } : {}),
    }),
    model,
    minClientVersion,
    ...(clientVersion ? { clientVersion } : {}),
  };
}

/**
 * 结构化 detail（走既有 detail 通道，让 CLI 能渲染成友好提示而不是裸文案）。
 * 形状对齐 PLATFORM_LLM_BUSY 的三层贯通：code + 可读 message + 机器可读字段。
 */
export function buildClientVersionGateErrorDetail(
  decision: Extract<
    PlatformHostedClientVersionGateDecision,
    { blocked: true }
  >,
): Record<string, unknown> {
  return {
    reason: CLIENT_VERSION_TOO_OLD_CODE,
    model: decision.model,
    minClientVersion: decision.minClientVersion,
    ...(decision.clientVersion ? { clientVersion: decision.clientVersion } : {}),
    upgradeCommand: "npx nolo-cli@latest",
    retryable: false,
  };
}
