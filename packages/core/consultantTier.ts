// 顾问档（consultant tier）：平台托管的高算力 / 高价位模型集合。
//
// 背景（2026-10-20 owner）：求助模式在解决不了时要能请「顾问」——
// 「价格贵、参数大的这批」模型（Opus 5.5 / Fable 5.1 / GPT-6.1 Sol / Kimi K3 /
// GPT-6 Astra）作为升级目标，询问用户时必须告知会消耗平台积分。
//
// 本模块是**唯一真相源**：清单、显示名、积分价目、派发 key、充值档位门槛、
// 工具支持能力都从这里派生，避免提示词块与广场条目各写一份口径。
//
// 分层约束：core 可以 import ../ai/llm（core/publicAgentSeeds 已是这个方向），
// 但 ai/llm 不得 import core —— 否则成环。故本模块放 core。

import { getModelConfig } from "../ai/llm/providers";
import { BUILTIN_AGENT_CATALOG } from "./builtinAgentCatalog";
import { publicAgentKey } from "./prefix";
import { isGptProModel } from "./gptProTier";

/**
 * 顾问档的付费通道口径。
 *
 * owner 决策（2026-10-20）：用户自己已有可用档位（自带 OAuth 订阅 / 自定义 API
 * 通道 / 本地）时，**不必**消耗平台积分去请平台托管的顾问 —— 优先走用户自己的通道。
 *
 * 判据复用平台既有付费口径 `ai/agent/agentBilling.ts` 的 `BillingSource`：
 * - `user_subscription` / `user_api` / `local`：用户自己的通道，费用由用户自己
 *   （或本地）承担，**不消耗平台积分**。
 * - `owner_subscription`：跑 owner 的订阅通道，调用者与平台都不出钱，同样不消耗
 *   调用者的平台积分（付款人不是当前用户，别与 user_subscription 混为一谈）。
 * - `platform_credits`：只有这一档才消耗平台积分。
 */
export type ConsultantBillingSource =
  | "user_subscription"
  | "user_api"
  | "owner_subscription"
  | "local"
  | "platform_credits";

/** 用户自己承担费用、不消耗平台积分的通道。 */
export const USER_OWN_BILLING_SOURCES: readonly ConsultantBillingSource[] = [
  "user_subscription",
  "user_api",
  "owner_subscription",
  "local",
] as const;

/** 是否为「不消耗平台积分」的通道。 */
export const isUserOwnChannelBilling = (source: unknown): boolean =>
  USER_OWN_BILLING_SOURCES.includes(source as ConsultantBillingSource);

/**
 * 平台托管顾问档（provider=nolo）一律走平台积分 —— 这是提示词块要向用户
 * **如实说明会消耗积分**的场景。
 */
export const PLATFORM_CONSULTANT_BILLING_SOURCE: ConsultantBillingSource =
  "platform_credits";

/**
 * 顾问档模型清单（平台 model id，单一真相源）。
 *
 * 排序：按输入价从高到低 —— 贵的排前面，便于在 token 预算里先考虑高价档。
 * 增删模型只改这一处。
 */
export const CONSULTANT_TIER_MODEL_IDS = [
  "anthropic/claude-fable-5-1",
  "gpt-6-astra",
  "anthropic/claude-opus-5-5",
  "kimi-k3",
  "gpt-6.1-sol",
] as const;

export type ConsultantTierModelId =
  (typeof CONSULTANT_TIER_MODEL_IDS)[number];

export interface ConsultantTierEntry {
  /** 平台 model id。 */
  model: string;
  /** 展示名（来自平台模型目录的 displayName，缺失时回落到 model id）。 */
  displayName: string;
  /**
   * 可派发的 agentKey（`agent-pub-<catalogId>`）。
   * 模型尚未上架广场时为 null —— 调用方必须容忍 null 并跳过该目标，
   * 不得编造 key。
   */
  agentKey: string | null;
  /** 积分 / 1M tokens（input / output）。目录解析不到时为 null。 */
  inputCreditsPerMTokens: number | null;
  outputCreditsPerMTokens: number | null;
  /**
   * 是否受 199 积分充值档位门槛约束（core/gptProTier 的 premium 判定）。
   * 为 true 时，未开通 199 档位的用户派它会被服务端 402 拒绝。
   */
  requiresProTier: boolean;
  /**
   * 上游是否支持工具调用。
   * - `true`：明确支持 → 可接工具型子任务。
   * - `false`：明确不支持（如 Claude 系）→ 只能当「顾问」出主意，由当前 agent 动手。
   * - `null`：**未声明**（官方页无模型级 tools 能力声明）→ 不得当成「不支持」
   *   （那会把可用的执行型档误伤成纯顾问），但也不得承诺它一定能调工具。
   */
  supportsTool: boolean | null;
  /**
   * 该档默认的付费通道。平台托管档恒为 `platform_credits`（消耗平台积分）；
   * 用户自带通道的同档模型由 `isUserOwnChannelBilling` 单独判定。
   */
  billingSource: ConsultantBillingSource;
}

const readModelDisplayName = (model: string): string => {
  try {
    const config = getModelConfig("nolo" as never, model);
    return config.displayName?.trim() || model;
  } catch {
    return model;
  }
};

const readModelPrice = (
  model: string,
): { input: number | null; output: number | null } => {
  try {
    const config = getModelConfig("nolo" as never, model);
    const price = config?.price;
    return {
      input: typeof price?.input === "number" ? price.input : null,
      output: typeof price?.output === "number" ? price.output : null,
    };
  } catch {
    return { input: null, output: null };
  }
};

/**
 * 读取工具能力。`undefined` = 目录未声明 → 返回 null（**不是 false**）：
 * 目录里「未声明」与「明确不支持」是两回事，塌成 false 会把可用的执行型档
 * 误判成纯顾问（gpt-6.1-sol 就是这种情况：官方页无模型级 tools 声明）。
 */
const readModelSupportsTool = (model: string): boolean | null => {
  try {
    const config = getModelConfig("nolo" as never, model);
    return typeof config.supportsTool === "boolean" ? config.supportsTool : null;
  } catch {
    return null;
  }
};

/** 按 model id 在平台 catalog 里反查可派发 key（未上架 → null）。 */
const lookupConsultantAgentKey = (model: string): string | null => {
  const entry = BUILTIN_AGENT_CATALOG.find((item) => item.model === model);
  if (!entry) return null;
  return publicAgentKey(entry.id);
};

/**
 * 解析顾问档全集（含未上架广场的条目 —— agentKey 为 null）。
 * 纯函数，无 IO。
 */
export const resolveConsultantTier = (): ConsultantTierEntry[] =>
  CONSULTANT_TIER_MODEL_IDS.map((model) => {
    const price = readModelPrice(model);
    return {
      model,
      displayName: readModelDisplayName(model),
      agentKey: lookupConsultantAgentKey(model),
      inputCreditsPerMTokens: price.input,
      outputCreditsPerMTokens: price.output,
      requiresProTier: isGptProModel("nolo", model),
      supportsTool: readModelSupportsTool(model),
      billingSource: PLATFORM_CONSULTANT_BILLING_SOURCE,
    };
  });

/**
 * 只要可派发的顾问（有 agentKey 的）。
 * 提示词块用这个 —— 派发不了的模型对用户没有意义。
 */
export const resolveDispatchableConsultantTier = (): ConsultantTierEntry[] =>
  resolveConsultantTier().filter(
    (entry): entry is ConsultantTierEntry & { agentKey: string } =>
      typeof entry.agentKey === "string" && entry.agentKey.length > 0,
  );
