import type { Agent } from "app/types";
import { getPublicImageAgentMode } from "ai/agent/utils/publicImageAgentMode";
import { resolveAgentImageInputSupport } from "ai/llm/agentCapabilities";
import { getApproxPricePerImage } from "ai/llm/imagePricing";
import { getModelConfig, getProviderByModelName, type Provider } from "ai/llm/providers";
import type { Model } from "ai/llm/types";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { asTrimmedString } from "core/trimmedString";

export interface FavoriteAgentSummary {
  agentKey: string;
  name: string;
}

export interface FavoriteAgentSource {
  agentKey: string;
  agent: Pick<Agent, "name"> | null | undefined;
}

export interface ImageUiConfig {
  showControls: boolean;
  supportsImageConfig: boolean;
  supportedAspectRatios: string[];
  supportedImageSizes: ("1K" | "2K" | "4K")[];
  pricePerImage?: number;
  waitHint?: string;
  defaultImageProfileKey?: ImageProfileOption["key"];
  imageProfiles?: ImageProfileOption[];
  pricingModel?: Pick<
    Model,
    "pricePerImage" | "imageTokenPricePerMillion" | "imageOutputTokenEstimateBySize"
  >;
}

export interface ImageProfileOption {
  key: "speed" | "quality";
  label: string;
  imageModelOverride: string;
  waitHint?: string;
  pricePerImage?: number;
  pricingModel?: Pick<
    Model,
    "pricePerImage" | "imageTokenPricePerMillion" | "imageOutputTokenEstimateBySize"
  >;
}

const formatImageWaitHint = (
  range?: Model["imageGenerationWaitTimeSeconds"]
) => {
  if (!range || typeof range.min !== "number" || typeof range.max !== "number") {
    return undefined;
  }
  return `通常需要 ${range.min}-${range.max} 秒`;
};

export function normalizeFavoriteAgentSummary(
  agentKey: string,
  agent: Pick<Agent, "name"> | null | undefined
): FavoriteAgentSummary {
  const rawName = asTrimmedString(agent?.name);
  return {
    agentKey,
    name: rawName || agentKey,
  };
}

export function resolveFavoriteAgentSummaries(
  sources: FavoriteAgentSource[]
): FavoriteAgentSummary[] {
  return sources.flatMap((source) =>
    source.agent
      ? [normalizeFavoriteAgentSummary(source.agentKey, source.agent)]
      : []
  );
}

export function filterFavoriteAgentsByQuery(input: {
  favoriteAgents: FavoriteAgentSummary[];
  isAgentMentionActive: boolean;
  query: string;
}): FavoriteAgentSummary[] {
  const { favoriteAgents, isAgentMentionActive, query } = input;
  if (!isAgentMentionActive || favoriteAgents.length === 0) return [];

  const normalizedQuery = asTrimmedLowercaseString(query);
  if (!normalizedQuery) return favoriteAgents;

  return favoriteAgents.filter((agent) => {
    const name = agent.name.toLowerCase();
    const key = agent.agentKey.toLowerCase();
    return name.includes(normalizedQuery) || key.includes(normalizedQuery);
  });
}

function resolveAgentModelIdentity(agent: Partial<Agent> | null | undefined) {
  const safeAgent = agent ?? {};
  let providerKey = (safeAgent.provider || "").toLowerCase();
  let modelName = safeAgent.model ?? "";

  if (modelName.includes("/")) {
    const slash = modelName.indexOf("/");
    if (!providerKey) providerKey = modelName.slice(0, slash);
    modelName = modelName.slice(slash + 1);
  }

  let modelConfig: Model | null = null;

  try {
    modelConfig = getModelConfig(providerKey as Provider, modelName);
  } catch {
    try {
      const detected = getProviderByModelName(modelName);
      if (detected) {
        modelConfig = getModelConfig(detected, modelName);
        providerKey = detected;
      }
    } catch {
      modelConfig = null;
    }
  }

  return { providerKey, modelConfig };
}

function toPricingModel(
  modelConfig: Model | null | undefined
): ImageUiConfig["pricingModel"] | undefined {
  if (!modelConfig) return undefined;
  return {
    pricePerImage: modelConfig.pricePerImage,
    imageTokenPricePerMillion: modelConfig.imageTokenPricePerMillion,
    imageOutputTokenEstimateBySize:
      modelConfig.imageOutputTokenEstimateBySize,
  };
}

function resolveImageProfiles(args: {
  providerKey: string;
  modelConfig: Model | null;
}): {
  imageProfiles: ImageProfileOption[];
  defaultImageProfileKey?: ImageProfileOption["key"];
} {
  const { providerKey, modelConfig } = args;
  if (!modelConfig?.imageGenerationProfiles?.length) {
    return { imageProfiles: [] };
  }

  const imageProfiles = modelConfig.imageGenerationProfiles.flatMap((profile) => {
    let profileModelConfig: Model | null = null;
    try {
      profileModelConfig = getModelConfig(
        providerKey as Provider,
        profile.imageModel
      );
    } catch {
      profileModelConfig = null;
    }

    const pricingModel = toPricingModel(profileModelConfig);
    return [
      {
        key: profile.key,
        label: profile.label,
        imageModelOverride: profile.imageModel,
        waitHint:
          formatImageWaitHint(profile.waitTimeSeconds) ??
          formatImageWaitHint(profileModelConfig?.imageGenerationWaitTimeSeconds),
        pricingModel,
        pricePerImage:
          getApproxPricePerImage(pricingModel, undefined) ?? undefined,
      },
    ];
  });

  return {
    imageProfiles,
    defaultImageProfileKey: modelConfig.imageGenerationProfiles.find(
      (profile) => profile.imageModel === modelConfig.name
    )?.key,
  };
}

export function resolveMessageInputAgentUi(input: {
  agent?: Partial<Agent> | null;
  userId: string | null;
}): {
  switchModelQueryUserId: string | null;
  currentModelCapabilities: {
    hasImageOutput: boolean;
    hasVision: boolean;
    provider: string;
  } | null;
  imageUiConfig: ImageUiConfig | null;
} {
  const { agent, userId } = input;
  const safeAgent = agent ?? {};
  const switchModelQueryUserId =
    asOptionalTrimmedString(userId) ??
    asOptionalTrimmedString(safeAgent.userId) ??
    null;

  const { providerKey, modelConfig } = resolveAgentModelIdentity(safeAgent);
  const hasVision = resolveAgentImageInputSupport(safeAgent as any);

  if (!modelConfig) {
    return {
      switchModelQueryUserId,
      currentModelCapabilities: {
        hasImageOutput: false,
        hasVision,
        provider: providerKey || "custom",
      },
      imageUiConfig: null,
    };
  }

  const imageMode = getPublicImageAgentMode(agent as any);
  const hasImageOutput =
    !!(modelConfig.hasImageOutput ?? (modelConfig as any).supportsImageOutput) ||
    imageMode === "continuous";

  const currentModelCapabilities = {
    hasImageOutput,
    hasVision,
    provider: providerKey,
  };

  if (!hasImageOutput) {
    return {
      switchModelQueryUserId,
      currentModelCapabilities,
      imageUiConfig: {
        showControls: false,
        supportsImageConfig: false,
        supportedAspectRatios: [],
        supportedImageSizes: [],
        waitHint: undefined,
        defaultImageProfileKey: undefined,
        imageProfiles: [],
        pricingModel: undefined,
      },
    };
  }

  const supportsImageConfig =
    !!modelConfig.supportsImageConfig || imageMode === "continuous";

  const supportedAspectRatios =
    modelConfig.supportedAspectRatios ??
    (imageMode === "continuous"
      ? ["1:1", "4:3", "16:9", "9:16"]
      : ["1:1", "4:3", "16:9", "9:16", "21:9"]);

  const supportedImageSizes =
    (modelConfig.supportedImageSizes as ("1K" | "2K" | "4K")[]) ??
    (imageMode === "continuous" ? ["1K", "2K"] : ["1K", "2K", "4K"]);

  const pricingModel = toPricingModel(modelConfig);
  const { imageProfiles, defaultImageProfileKey } = resolveImageProfiles({
    providerKey,
    modelConfig,
  });

  return {
    switchModelQueryUserId,
    currentModelCapabilities,
    imageUiConfig: {
      showControls: true,
      supportsImageConfig,
      supportedAspectRatios,
      supportedImageSizes,
      waitHint: formatImageWaitHint(modelConfig.imageGenerationWaitTimeSeconds),
      defaultImageProfileKey,
      imageProfiles,
      pricePerImage:
        getApproxPricePerImage(pricingModel, undefined) ?? undefined,
      pricingModel,
    },
  };
}
