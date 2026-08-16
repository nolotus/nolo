/**
 * Shared builder for agent seed records used by platform presets and
 * createSpaceAgents shared-space seeds. Resolves structural defaults plus
 * model price/vision metadata so call sites only pass what's unique.
 */

import { getModelPricing } from "../../packages/ai/llm/getPricing";
import { getModelConfig } from "../../packages/ai/llm/providers";
import type { PublicImageAgentMode } from "../../packages/app/types";

export interface AgentSeedDefaults {
  isPublic: boolean;
  allowFork: boolean;
  hasVision: boolean;
  tools: string[];
}

/** Full seed shape written by setup/create scripts (matches former AgentSeedConfig). */
export type AgentSeed = {
  id: string;
  presetKey?: string;
  name: string;
  provider?: string;
  apiSource?: "platform" | "custom";
  model: string;
  customProviderUrl?: string;
  apiKeyEnv?: string;
  apiKeyFromAgentKey?: string;
  imageModel?: string;
  isPublic: boolean;
  allowFork: boolean;
  platformAudit?: boolean;
  hasImageOutput?: boolean;
  imageWorkflow?: PublicImageAgentMode;
  imageConfig?: {
    enabled: boolean;
    imageSize?: "1K" | "2K" | "4K";
  };
  introduction: string;
  greeting: string | { text: string; menu?: unknown[] };
  prompt: string;
  tools: string[];
  tags: string[];
  references?: Array<{ dbKey: string; title: string; type: "knowledge" | "instruction" }>;
  inputPrice?: number;
  outputPrice?: number;
  hasVision?: boolean;
  maxConcurrent?: number;
};

export type AgentSeedInput = {
  id: string;
  presetKey?: string;
  name: string;
  provider?: string;
  apiSource?: "platform" | "custom";
  model: string;
  customProviderUrl?: string;
  apiKeyEnv?: string;
  apiKeyFromAgentKey?: string;
  imageModel?: string;
  isPublic?: boolean;
  allowFork?: boolean;
  platformAudit?: boolean;
  hasImageOutput?: boolean;
  imageWorkflow?: PublicImageAgentMode;
  imageConfig?: {
    enabled: boolean;
    imageSize?: "1K" | "2K" | "4K";
  };
  introduction: string;
  greeting: string | { text: string; menu?: unknown[] };
  prompt: string;
  tools?: string[];
  tags?: string[];
  references?: Array<{ dbKey: string; title: string; type: "knowledge" | "instruction" }>;
  inputPrice?: number;
  outputPrice?: number;
  hasVision?: boolean;
  maxConcurrent?: number;
};

export const AGENT_SEED_DEFAULTS: AgentSeedDefaults = {
  isPublic: true,
  allowFork: true,
  hasVision: false,
  tools: [],
};

/**
 * Resolve model input/output prices and vision flag — same semantics as
 * createSpaceAgents `getModelPrice`.
 */
export function resolveModelPrice(
  provider: string,
  model: string
): { input: number; output: number; hasVision: boolean } {
  const pricing = getModelPricing(provider, model);
  const modelConfig = getModelConfig(provider as any, model);
  if (!pricing) {
    throw new Error(`未找到模型价格元数据: ${provider}/${model}`);
  }
  return {
    input: pricing.inputPrice,
    output: pricing.outputPrice,
    hasVision: !!modelConfig.hasVision,
  };
}

/**
 * Apply structural defaults and fill missing price/vision from model registry.
 * Does not invent provider when omitted (buildAgentRecord defaults to openai).
 * Generic so callers keep literal `presetKey` / field types for AGENT_PRESETS maps.
 */
export function defineAgentSeed<const T extends AgentSeedInput>(input: T): T & AgentSeed {
  const providerForLookup = input.provider ?? "openai";
  const tools: string[] = input.tools ? [...input.tools] : [...AGENT_SEED_DEFAULTS.tools];
  const isPublic = input.isPublic ?? AGENT_SEED_DEFAULTS.isPublic;
  const allowFork = input.allowFork ?? AGENT_SEED_DEFAULTS.allowFork;
  const tags: string[] = input.tags ? [...input.tags] : [];

  let inputPrice = input.inputPrice;
  let outputPrice = input.outputPrice;
  let hasVision = input.hasVision;
  const pricesProvided =
    input.inputPrice !== undefined || input.outputPrice !== undefined;

  if (inputPrice === undefined || outputPrice === undefined) {
    const pricing = getModelPricing(providerForLookup, input.model);
    if (!pricing) {
      throw new Error(`未找到模型价格元数据: ${providerForLookup}/${input.model}`);
    }
    if (inputPrice === undefined) inputPrice = pricing.inputPrice;
    if (outputPrice === undefined) outputPrice = pricing.outputPrice;
  }

  if (hasVision === undefined) {
    // Mirror buildAgentRecord: explicit prices → hasVision defaults false;
    // registry path → vision from model config (same as getModelPrice).
    if (pricesProvided) {
      hasVision = AGENT_SEED_DEFAULTS.hasVision;
    } else {
      const modelConfig = getModelConfig(providerForLookup as any, input.model);
      hasVision = !!modelConfig.hasVision;
    }
  }

  return {
    ...input,
    tools,
    isPublic,
    allowFork,
    tags,
    inputPrice,
    outputPrice,
    hasVision,
  } as T & AgentSeed;
}
