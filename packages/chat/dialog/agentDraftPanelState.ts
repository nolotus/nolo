import type { Agent } from "app/types";
import type { GuidedAgentDraft } from "ai/agent/guidedCreation/types";
import { asOptionalFiniteNumber } from "core/optionalNumber";
import { asOptionalJsonRecord } from "../messages/parseJsonRecord";

export type AgentDraftSidePanelState =
  | {
      kind: "draft";
      draft: GuidedAgentDraft;
      version: number | null;
      createdAgent: null;
    }
  | {
      kind: "created";
      draft: GuidedAgentDraft;
      version: number | null;
      createdAgent: Partial<Agent>;
    };

const parseToolMessageContent = (content: unknown): any | null => {
  if (!content) return null;
  // Already-parsed payloads pass through (including non-record shapes callers
  // may still inspect); only string content is forced through the JSON seam.
  if (typeof content !== "string") return content;
  return asOptionalJsonRecord(content) ?? null;
};

const readDraftVersion = (message: any): number | null => {
  if (message?.toolName !== "prepareAgentDraft") return null;
  const parsed = parseToolMessageContent(message?.content);
  return asOptionalFiniteNumber(parsed?.version) ?? null;
};

const buildDraftFromCreatedAgent = (agent: any): GuidedAgentDraft => ({
  name: typeof agent?.name === "string" ? agent.name : "",
  introduction: typeof agent?.introduction === "string" ? agent.introduction : "",
  prompt: typeof agent?.prompt === "string" ? agent.prompt : "",
  promptSummary: "",
  provider: typeof agent?.provider === "string" ? agent.provider : "",
  model: typeof agent?.model === "string" ? agent.model : "",
  isPublic: agent?.isPublic === true,
  capabilityIds: (Array.isArray(agent?.tools) ? agent.tools : []) as any,
  toolIds: Array.isArray(agent?.tools) ? agent.tools : [],
  references: Array.isArray(agent?.references) ? agent.references : [],
  tags: Array.isArray(agent?.tags) ? agent.tags : [],
  unresolved: [],
});

export const resolveLatestAgentDraftSidePanelState = (
  messages: readonly any[],
): AgentDraftSidePanelState | null => {
  const latestDraftVersion =
    messages
      .map(readDraftVersion)
      .reverse()
      .find((version): version is number => version != null) ?? null;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as any;
    const parsed = parseToolMessageContent(message?.content);
    if (!parsed || typeof parsed !== "object" || parsed.error) continue;

    if (message?.toolName === "createAgent") {
      return {
        kind: "created",
        draft: buildDraftFromCreatedAgent(parsed),
        version: latestDraftVersion,
        createdAgent: parsed,
      };
    }

    if (message?.toolName === "prepareAgentDraft") {
      if (parsed?.draft && typeof parsed.draft === "object") {
        return {
          kind: "draft",
          draft: parsed.draft,
          version: readDraftVersion(message),
          createdAgent: null,
        };
      }
    }
  }
  return null;
};
