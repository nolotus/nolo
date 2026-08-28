import type { Agent } from "app/types";
import { DataType } from "create/types";
import { createAgentKey } from "database/keys";
import { ulid } from "ulid";
import {
  normalizeReferences,
  type FormData as AgentFormData,
} from "ai/agent/createAgentSchema";
import { ALL_MODELS, type ModelWithProvider } from "ai/llm/models";
import { getModelPricing } from "ai/llm/getPricing";
import {
  buildCreateSkillAgentArgs,
  type CreateSkillAgentToolArgs,
} from "./skillAgentArgs";

export {
  buildCreateSkillAgentArgs,
  type CreateSkillAgentToolArgs,
  type SkillAgentMode,
} from "./skillAgentArgs";

const findModelConfig = (
  modelName: string,
  provider?: string
): ModelWithProvider | null => {
  const name = (modelName ?? "").trim();
  const prov = (provider ?? "").trim();
  if (!name) return null;
  if (prov) {
    const exact = ALL_MODELS.find((m) => m.name === name && m.provider === prov);
    if (exact) return exact;
  }
  const matches = ALL_MODELS.filter((m) => m.name === name);
  return matches.length === 1 ? matches[0] : null;
};

export const buildSkillAgentRecord = (options: {
  userId: string;
  currentSpaceId?: string;
  args: CreateSkillAgentToolArgs;
}): Agent & { dbKey: string; publicDbKey: string } => {
  const createArgs = buildCreateSkillAgentArgs(options.args);
  const now = Date.now();
  const id = ulid();
  const dbKey = createAgentKey.private(options.userId, id);
  const publicDbKey = createAgentKey.public(id);
  const modelConfig = findModelConfig(createArgs.model, createArgs.provider);
  const pricing = getModelPricing(
    modelConfig?.provider || createArgs.provider,
    createArgs.model
  );
  const references = normalizeReferences((createArgs.references as any) ?? []);
  const tags = ["skill", "builder", options.args.mode ?? "creator_evaluator"];

  return {
    id,
    dbKey,
    type: DataType.AGENT,
    userId: options.userId,
    name: createArgs.name,
    model: createArgs.model,
    provider: modelConfig?.provider || createArgs.provider,
    apiSource: "platform",
    useServerProxy: true,
    hasVision: Boolean(modelConfig?.hasVision),
    prompt: createArgs.prompt ?? "",
    introduction: createArgs.introduction ?? "",
    greeting: createArgs.greeting,
    isPublic: !!createArgs.isPublic,
    tags,
    tools: createArgs.tools ?? [],
    references,
    linkedSpaces: createArgs.linkedSpaces ?? [],
    customProviderUrl: "",
    apiKey: "",
    whitelist: [],
    inputPrice: pricing?.inputPrice ?? 0,
    outputPrice: pricing?.outputPrice ?? 0,
    temperature: createArgs.temperature,
    reasoning_effort: createArgs.reasoning_effort,
    createdAt: now,
    updatedAt: now,
    dialogCount: 0,
    messageCount: 0,
    tokenCount: 0,
    spaceId: options.currentSpaceId,
    publicDbKey,
  } as unknown as Agent & { dbKey: string; publicDbKey: string };
};
