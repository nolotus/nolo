// packages/ai/agent/turnToolContext.ts

import type { RootState, AppDispatch } from "app/store";
import type { Agent, DialogConfig, ReferenceItem } from "app/types";
import { canonicalizeToolNames } from "ai/tools/toolNameAliases";
import {
  mergeReferences,
  resolveReferenceAssets,
  resolveToolsFromKeys,
  type ResolvedReferenceAssets,
  type ResolvedContentTools,
} from "./referenceUtils";
import {
  getFullChatContextKeys,
  deduplicateContextKeys,
} from "./getFullChatContextKeys";
import { extractCategorizedMentions } from "create/editor/utils/slateUtils";
import { asTrimmedString } from "core/trimmedString";

/**
 * Audit result of turn-level late-bound tools and references.
 */
export type TurnToolContext = {
  /** Canonical tool names derived from references and context pages for this turn. */
  referencedToolNames: string[];
  /** Canonical tool names derived from explicit mentions in userInput. */
  mentionedToolNames: string[];
  /** Whether the resolution was completely and confidently determined. */
  complete: boolean;
  /** If complete is false, the reasons why resolution was incomplete. */
  unresolvedReasons?: string[];

  // Optional intermediate assets for downstream pipeline reuse:
  resolvedReferences?: ReferenceItem[];
  referencedTools?: string[];
  contextTools?: string[];
  recommendedSkillTools?: string[];
  recommendedSkillHints?: string[];
  skillPromptPatches?: string[];
  referenceContentCache?: Map<string, any>;
  mergedContentCache?: Map<string, any>;
};

export type ResolveTurnToolContextInput = {
  agentConfig?: Agent | Record<string, any> | null;
  dialogConfig?: DialogConfig | Record<string, any> | null;
  userInput: unknown;
  state?: RootState | null;
  dispatch?: AppDispatch | any;
  runtimeOptions?: Record<string, any> | null;
};

const KNOWN_MENTION_RESOURCE_TYPES = new Set([
  "tool",
  "page",
  "agent",
  "space",
]);

type ExtractedMentionsResult = {
  toolNames: string[];
  mentionedPageKeys: string[];
  complete: boolean;
  unresolvedReasons: string[];
};

/**
 * Traverse Slate userInput to extract tool and page mentions safely with
 * fail-closed semantics for unknown or malformed mention nodes.
 */
function extractMentionsWithSafety(userInput: unknown): ExtractedMentionsResult {
  const toolNames: string[] = [];
  const mentionedPageKeys: string[] = [];
  const unresolvedReasons: string[] = [];
  let complete = true;

  if (!Array.isArray(userInput)) {
    return { toolNames, mentionedPageKeys, complete, unresolvedReasons };
  }

  const traverse = (nodes: any[]) => {
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;

      if (node.type === "mention") {
        const resourceType = asTrimmedString(node.resourceType);
        const resourceId = asTrimmedString(node.resourceId);

        if (!resourceType || !KNOWN_MENTION_RESOURCE_TYPES.has(resourceType)) {
          complete = false;
          unresolvedReasons.push(
            `unknown or missing mention resourceType: "${resourceType || "empty"}"`,
          );
        } else if (!resourceId) {
          complete = false;
          unresolvedReasons.push(
            `missing mention resourceId for type "${resourceType}"`,
          );
        } else {
          switch (resourceType) {
            case "tool":
              toolNames.push(resourceId);
              break;
            case "page":
              mentionedPageKeys.push(resourceId);
              break;
            case "agent":
            case "space":
              // Context-only mentions; do not carry executable tools.
              break;
          }
        }
      }

      // Also collect pageKey / dialogKey embedded in Slate node parts
      if (typeof node.pageKey === "string" && node.pageKey.trim()) {
        mentionedPageKeys.push(node.pageKey.trim());
      }

      if (Array.isArray(node.children)) {
        traverse(node.children);
      }
    }
  };

  try {
    traverse(userInput);
  } catch (error: any) {
    complete = false;
    unresolvedReasons.push(`failed to traverse userInput mentions: ${error?.message || error}`);
  }

  return {
    toolNames: [...new Set(toolNames)],
    mentionedPageKeys: [...new Set(mentionedPageKeys)],
    complete,
    unresolvedReasons,
  };
}

/**
 * Single source of truth for resolving turn-level late-bound tools from:
 * 1. agentConfig.references
 * 2. dialogConfig.extraReferences (e.g. from prior loadSkill actions)
 * 3. userInput mentions (@tool, @page, embedded keys)
 * 4. dialog context pages (history references, input references)
 *
 * Designed to be shared by both the server-owned admission gate and legacy
 * client-owned execution paths so neither side guesses or recreates the surface.
 */
export async function resolveTurnToolContext(
  input: ResolveTurnToolContextInput,
): Promise<TurnToolContext> {
  const unresolvedReasons: string[] = [];
  let isComplete = true;

  // 1. Mentions in current userInput
  const mentionResult = extractMentionsWithSafety(input.userInput);
  if (!mentionResult.complete) {
    isComplete = false;
    unresolvedReasons.push(...mentionResult.unresolvedReasons);
  }
  const mentionedToolNames = canonicalizeToolNames(mentionResult.toolNames);

  // 2. Direct references (Agent references + Dialog extraReferences)
  const agentRefs = Array.isArray(input.agentConfig?.references)
    ? (input.agentConfig!.references as ReferenceItem[])
    : [];
  const dialogExtraRefs = Array.isArray(input.dialogConfig?.extraReferences)
    ? (input.dialogConfig!.extraReferences as ReferenceItem[])
    : [];
  const mergedReferences = mergeReferences(agentRefs, dialogExtraRefs);

  let refAssets: ResolvedReferenceAssets = {
    references: [],
    referencedTools: [],
    recommendedSkillTools: [],
    recommendedSkillHints: [],
    skillPromptPatches: [],
    contentByKey: new Map(),
  };

  if (mergedReferences.length > 0) {
    try {
      refAssets = await resolveReferenceAssets(
        mergedReferences,
        input.dispatch,
      );
      // Check if any reference could not be loaded and might harbor unknown tools
      for (const ref of mergedReferences) {
        if (ref?.dbKey && !refAssets.contentByKey.has(ref.dbKey)) {
          isComplete = false;
          unresolvedReasons.push(`failed to resolve reference content for "${ref.dbKey}"`);
        }
      }
    } catch (error: any) {
      isComplete = false;
      unresolvedReasons.push(`failed to resolve reference assets: ${error?.message || error}`);
    }
  }

  // 3. Turn context pages (from history keys and current input keys)
  let contextToolsResult: ResolvedContentTools = {
    tools: [],
    recommendedSkillTools: [],
    recommendedSkillHints: [],
    skillPromptPatches: [],
    contentByKey: new Map(),
  };

  const hasContextEngine = Boolean(
    input.state &&
    input.dispatch &&
    (input.state as any).message,
  );
  if (hasContextEngine) {
    try {
      const agentConfigWithReferences = {
        ...(input.agentConfig ?? {}),
        references: refAssets.references,
        referencedTools: refAssets.referencedTools,
        recommendedSkillTools: refAssets.recommendedSkillTools,
        recommendedSkillHints: refAssets.recommendedSkillHints,
        skillPromptPatches: refAssets.skillPromptPatches,
      };

      const keySets = await getFullChatContextKeys(
        input.state!,
        input.dispatch,
        agentConfigWithReferences,
        input.userInput as any,
        (input.dialogConfig as DialogConfig) ?? undefined,
      );

      // Add mentioned page keys to currentInputContext
      for (const pk of mentionResult.mentionedPageKeys) {
        keySets.currentInputKeys.add(pk);
      }

      const finalKeys = deduplicateContextKeys(keySets);
      const allContextKeys = new Set<string>([
        ...finalKeys.botInstructionsContext,
        ...finalKeys.currentInputContext,
        ...finalKeys.historyContext,
        ...finalKeys.botKnowledgeContext,
      ]);

      if (allContextKeys.size > 0) {
        contextToolsResult = await resolveToolsFromKeys(
          Array.from(allContextKeys),
          input.dispatch,
          refAssets.contentByKey,
        );
      }
    } catch (error: any) {
      isComplete = false;
      unresolvedReasons.push(`failed to resolve context keys: ${error?.message || error}`);
    }
  } else if (mentionResult.mentionedPageKeys.length > 0) {
    // There are page mentions that could bear tools, but no context engine to inspect them.
    isComplete = false;
    unresolvedReasons.push("cannot inspect mentioned pages without store dispatch");
  }

  const allReferencedTools = [
    ...(refAssets.referencedTools ?? []),
    ...(contextToolsResult.tools ?? []),
  ];
  const referencedToolNames = canonicalizeToolNames(allReferencedTools);

  const recommendedSkillTools = [
    ...(refAssets.recommendedSkillTools ?? []),
    ...(contextToolsResult.recommendedSkillTools ?? []),
  ];
  const recommendedSkillHints = [
    ...(refAssets.recommendedSkillHints ?? []),
    ...(contextToolsResult.recommendedSkillHints ?? []),
  ];
  const skillPromptPatches = [
    ...(refAssets.skillPromptPatches ?? []),
    ...(contextToolsResult.skillPromptPatches ?? []),
  ];

  return {
    referencedToolNames,
    mentionedToolNames,
    complete: isComplete,
    ...(unresolvedReasons.length > 0 ? { unresolvedReasons } : {}),
    resolvedReferences: refAssets.references,
    referencedTools: refAssets.referencedTools,
    contextTools: contextToolsResult.tools,
    recommendedSkillTools,
    recommendedSkillHints,
    skillPromptPatches,
    referenceContentCache: refAssets.contentByKey,
    mergedContentCache: new Map([
      ...refAssets.contentByKey,
      ...contextToolsResult.contentByKey,
    ]),
  };
}
