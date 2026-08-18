import {
  shouldShowAgentTokenCost,
  toNonEmptyString
} from "/public/assets/chunks/chunk-CA74EWBF.js";
import {
  getAgentPriceHint
} from "/public/assets/chunks/chunk-5IJJ57JD.js";

// packages/ai/agent/web/agentBadges.ts
function resolveAgentBadgeMeta(agent) {
  const isCliAgent = agent?.apiSource === "cli";
  const customProviderUrl = agent?.customProviderUrl;
  const isMachineBoundLocalCustomAgent = agent?.apiSource === "custom" && typeof customProviderUrl === "string" && (customProviderUrl.includes("127.0.0.1") || customProviderUrl.includes("localhost"));
  const isPageLocalCustomRuntime = agent?.apiSource === "custom" && !!toNonEmptyString(customProviderUrl)?.includes("127.0.0.1");
  const runtimeMachineId = typeof agent?.runtimeBinding?.machineId === "string" ? agent.runtimeBinding.machineId : void 0;
  const runtimeLabel = runtimeMachineId ? "\u8FDC\u7A0B\u7535\u8111" : isMachineBoundLocalCustomAgent ? "\u5F53\u524D\u8BBE\u5907\u672C\u5730\u76F4\u8FDE" : "\u9ED8\u8BA4\u73AF\u5883";
  const priceHint = agent ? getAgentPriceHint(agent) : null;
  const shouldShowTokenCost = shouldShowAgentTokenCost(
    agent,
    priceHint
  );
  const showImagePrice = !!priceHint && !isCliAgent && priceHint.type === "per_image";
  const showCliBadge = isCliAgent;
  const showVisionBadge = !!agent?.hasVision;
  const showRuntimeBadge = isCliAgent || isMachineBoundLocalCustomAgent;
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
    isPageLocalCustomRuntime
  };
}

export {
  resolveAgentBadgeMeta
};
