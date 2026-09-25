import type { Agent } from "app/types";
import { getAgentPriceHint } from "ai/llm/getPricing";
import {
  shouldShowAgentTokenCost,
  toNonEmptyString,
} from "./agentDisplayUtils";
import {
  formatQuotaSummary,
  formatQuotaTooltip,
  type AgentQuota,
} from "../quotaSnapshot";

/** Loose agent shape for badge resolution (Agent index signature fields vary). */
export type AgentBadgeSource = {
  apiSource?: Agent["apiSource"] | string | null;
  customProviderUrl?: unknown;
  hasVision?: unknown;
  inputPrice?: number;
  outputPrice?: number;
  runtimeBinding?: Agent["runtimeBinding"] | null;
  model?: string;
  imageModel?: string;
  provider?: string;
  imageConfig?: Agent["imageConfig"];
  imageWorkflow?: Agent["imageWorkflow"];
  quota?: AgentQuota;
} | null | undefined;

export type AgentBadgeMeta = {
  isCliAgent: boolean;
  priceHint: ReturnType<typeof getAgentPriceHint>;
  shouldShowTokenCost: boolean;
  showImagePrice: boolean;
  showCliBadge: boolean;
  showVisionBadge: boolean;
  /** AgentBlock-style local custom (includes 127.0.0.1 OR localhost). */
  isMachineBoundLocalCustomAgent: boolean;
  showRuntimeBadge: boolean;
  /** 远程电脑 | 当前设备本地直连 | 默认环境 */
  runtimeLabel: string;
  runtimeMachineId: string | undefined;
  /** AgentPage-style: only 127.0.0.1 substring (existing behavior). */
  isPageLocalCustomRuntime: boolean;
  /** 配额快照简短摘要（如 "73%已用 · 5h · 2.5h后重置"）。 */
  quotaText?: string;
  /** 配额快照全量详情提示（多行文本）。 */
  quotaTooltip?: string;
};

/**
 * Pure badge/meta resolver shared by AgentCard, AgentBlock, and AgentPage.
 * Surfaces keep their own JSX; this consolidates detection flags only.
 */
export function resolveAgentBadgeMeta(agent: AgentBadgeSource): AgentBadgeMeta {
  const isCliAgent = agent?.apiSource === "cli";
  const customProviderUrl = agent?.customProviderUrl;
  const isMachineBoundLocalCustomAgent =
    agent?.apiSource === "custom" &&
    typeof customProviderUrl === "string" &&
    (customProviderUrl.includes("127.0.0.1") ||
      customProviderUrl.includes("localhost"));
  const isPageLocalCustomRuntime =
    agent?.apiSource === "custom" &&
    !!toNonEmptyString(customProviderUrl)?.includes("127.0.0.1");
  const runtimeMachineId =
    typeof agent?.runtimeBinding?.machineId === "string"
      ? agent.runtimeBinding.machineId
      : undefined;
  const runtimeLabel = runtimeMachineId
    ? "远程电脑"
    : isMachineBoundLocalCustomAgent
      ? "当前设备本地直连"
      : "默认环境";
  const priceHint = agent
    ? getAgentPriceHint(agent as Parameters<typeof getAgentPriceHint>[0])
    : null;
  const shouldShowTokenCost = shouldShowAgentTokenCost(
    agent as Parameters<typeof shouldShowAgentTokenCost>[0],
    priceHint
  );
  const showImagePrice = !!priceHint && !isCliAgent && priceHint.type === "per_image";
  const showCliBadge = isCliAgent;
  const showVisionBadge = !!agent?.hasVision;
  const showRuntimeBadge = isCliAgent || isMachineBoundLocalCustomAgent;
  const rawQuota = agent?.quota;
  const quotaText = formatQuotaSummary(rawQuota);
  const quotaTooltip = formatQuotaTooltip(rawQuota);

  return {
    isCliAgent,
    priceHint,
    shouldShowTokenCost,
    showImagePrice,
    showCliBadge,
    showVisionBadge,
    isMachineBoundLocalCustomAgent,
    showRuntimeBadge,
    runtimeLabel,
    runtimeMachineId,
    isPageLocalCustomRuntime,
    quotaText,
    quotaTooltip,
  };
}
