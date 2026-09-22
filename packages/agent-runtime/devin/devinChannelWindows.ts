// agent-runtime/devin/devinChannelWindows.ts

import { getModelContextWindow } from "../../ai/llm/getModelContextWindow";
import { isDevinOAuthAgent } from "../devinOAuth";

/**
 * Devin OAuth 通道的 context window 真值。
 *
 * 两个来源互相印证：
 *
 * 1. **上游 live catalog**（`GetCliModelConfigs`，ConnectRPC 只读元数据）：
 *    每个 ClientModelConfig 自带 context window 字段（#18）。对账号 token
 *    实拉过 213 个模型，SWE 家族实测值：
 *      swe-2-max / swe-2-high / swe-2-medium = 262000
 *      swe-1.7 / swe-1.7-medium             = 262000
 *      swe-1.7-lightning(-medium)           = 202752
 *      swe-1.6(-fast)                       = 200000（免费档默认）
 *    同目录里经此通道转售的厂商模型与厂商原生值可以不同：
 *      gpt-5.2（MODEL_GPT_5_2_*）           = 384000（OpenAI 原生表是 1047576）
 *      claude-sonnet-4.6                    = 200000（与 anthropic 表一致）
 *
 * 2. **实证探针**（swe-2-max，本机 token，unlimited-free 档）：
 *    250K token 请求完整返回（`prompt_tokens=250493`，新解码的 #7 usage
 *    实账），275K token 请求被上游拒。250K 过 / 275K 拒与 #18=262000
 *    的目录值一致——目录即通道事实，不是客户端默认值。
 *
 * 曾经踩过的坑：请求侧 CompletionConfig 的 context window 默认值（128000）
 * 是客户端发下去的 hint，不是模型能力；按它填表会把窗口砍掉一半还多。
 *
 * 只登记「与全局 MODEL_LOOKUP_MAP 不同或通道独占」的 id；其余模型走全局表，
 * 本文件不追求覆盖 213 个上游模型。
 */
const DEVIN_CHANNEL_CONTEXT_WINDOWS: Record<string, number> = {
  // SWE-2 家族（含 providerRegistry 里的 swe-2 裸选项，上游无该 selector，
  // 与同族同窗）。
  "swe-2-max": 262_000,
  "swe-2-high": 262_000,
  "swe-2-medium": 262_000,
  "swe-2": 262_000,
  // SWE-1.7 家族。
  "swe-1.7": 262_000,
  "swe-1.7-medium": 262_000,
  "swe-1.7-lightning": 202_752,
  // 经 devin 通道转售、且与厂商原生窗口不同的模型。
  "gpt-5.2": 384_000,
};

/** agent 配置里识别 devin 通道所需的最小字段。 */
type AgentChannelRef = {
  model?: string | null;
  provider?: string | null;
  apiKeyRef?: string | null;
};

/**
 * devin 通道内某个 model id 的 context window；未登记的 id 返回 undefined，
 * 由调用方回落到全局表。
 */
export const devinChannelContextWindow = (
  model?: string | null,
): number | undefined => {
  const raw = model?.trim();
  if (!raw) return undefined;
  return DEVIN_CHANNEL_CONTEXT_WINDOWS[raw];
};

/**
 * 通道感知的 context window 解析：devin 通道用通道真值表（未登记 id 回落
 * 全局表），其余通道一律全局表。窗口解析不必在每个调用点重复判断通道。
 *
 * 通道判据直接用 devinOAuth.isDevinOAuthAgent（trim + 小写归一），
 * 不在这里维护第二份近亲复写。
 */
export const resolveAgentContextWindow = (agent: AgentChannelRef): number =>
  (isDevinOAuthAgent(agent) ? devinChannelContextWindow(agent.model) : undefined) ??
  getModelContextWindow(agent.model ?? "");

export { DEVIN_CHANNEL_CONTEXT_WINDOWS };
