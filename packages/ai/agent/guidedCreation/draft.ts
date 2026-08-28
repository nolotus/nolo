import type { FormData as AgentFormData } from "ai/agent/createAgentSchema";
import { asTrimmedString } from "core/trimmedString";
import { DEFAULT_ENABLED_PACKS } from "ai/tools/toolPacks";
import type { GuidedAgentDraft, GuidedAgentValidationResult } from "./types";

const trim = (value: unknown) => asTrimmedString(value);

export const validateGuidedAgentDraft = (
  draft: GuidedAgentDraft
): GuidedAgentValidationResult => {
  const missing: string[] = [];

  if (!trim(draft.name)) missing.push("name");
  if (!trim(draft.model)) missing.push("model");
  if (!trim(draft.provider)) missing.push("provider");
  if (!trim(draft.prompt)) missing.push("prompt");
  if (!trim(draft.introduction)) missing.push("introduction");

  return missing.length === 0 ? { ok: true } : { ok: false, missing };
};

export const mergeGuidedAgentDraft = (
  current: GuidedAgentDraft,
  next: Partial<GuidedAgentDraft>
): GuidedAgentDraft => ({
  ...current,
  ...next,
  capabilityIds: next.capabilityIds ?? current.capabilityIds,
  toolIds: next.toolIds ?? current.toolIds,
  references: next.references ?? current.references,
  tags: next.tags ?? current.tags,
  unresolved: next.unresolved ?? current.unresolved,
  assemblyNotes: next.assemblyNotes ?? current.assemblyNotes,
  suggestedSkillIdeas: next.suggestedSkillIdeas ?? current.suggestedSkillIdeas,
  suggestedWorkflowIdeas:
    next.suggestedWorkflowIdeas ?? current.suggestedWorkflowIdeas,
  suggestedEvalCases: next.suggestedEvalCases ?? current.suggestedEvalCases,
});

export const buildAgentFormDataFromGuidedDraft = (
  draft: GuidedAgentDraft
): AgentFormData => {
  const tools = Array.from(new Set(draft.toolIds.filter(Boolean)));
  const needsHostedShell =
    tools.includes("execShell") || draft.capabilityIds.includes("imageProcessing");

  return {
    name: trim(draft.name),
    model: trim(draft.model),
    provider: trim(draft.provider),
    apiSource: "platform",
    // 新建草稿预勾选默认启用的能力包（web-search / long-term-memory /
    // agent-orchestration），让面板显示与运行时 fallback/ensure 一致
    // （LOW-R4-2）。注意：createAgentSchema 的 API default 保持 []，
    // 由调用方显式声明，避免静默扩大工具面。
    disabledTools: [],
    enabledPacks: [...DEFAULT_ENABLED_PACKS],
    allowFork: false,
    useServerProxy: true,
    enableThinking: false,
    defaultInteractionMode: "text",
    hasVision: false,
    prompt: trim(draft.prompt),
    introduction: trim(draft.introduction),
    greeting: `你好，我是${trim(draft.name) || "你的 AI 助手"}。你想先让我帮你做什么？`,
    isPublic: draft.isPublic === true,
    tags: draft.tags.map((tag) => trim(tag)).filter(Boolean).join(", "),
    tools,
    references: draft.references
      .filter((reference) => reference.selected === true)
      .map((reference) => ({
        dbKey: reference.dbKey,
        title: reference.title || "",
        type: reference.type === "instruction" ? "instruction" : "knowledge",
      })),
    linkedSpaces: [],
    customProviderUrl: "",
    apiKey: "",
    inputPrice: 0,
    outputPrice: 0,
    whitelist: [],
    reasoning_effort: "medium" as const,
    ...(needsHostedShell
      ? {
          runtimeToolPolicy: {
            version: 1,
            runtimeTools: ["execShell"],
            workspace: { mode: "lease" },
          },
        }
      : {}),
  };
};
