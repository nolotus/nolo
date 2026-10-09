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
import {
  attachmentKindsInContent,
  toolsForAttachmentKinds,
} from "ai/attachments/toolsForAttachments";

/**
 * Audit result of turn-level late-bound tools and references.
 */
export type TurnToolContext = {
  /** Canonical tool names derived from references and context pages for this turn. */
  referencedToolNames: string[];
  /**
   * 附件推导出的工具名（当前输入 + 已加载历史附件的 kind → 工具），同样并入
   * `referencedToolNames`（server-owned 工具面按现有 referencedToolNames 保持一致）。
   * 只是「能力提示」：不授予执行/计费，mediaJobTool 自己的报价确认门仍在。
   */
  attachmentToolNames?: string[];
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

  // 附件能力提示（当前输入 + 已加载历史附件）：附件 kind 没有持久字段，只能从内存里的
  // 消息现推。刻意不读 pendingFiles —— 待发附件在消息落库后就是消息 content 的一部分，
  // 后续轮次（例如用户选「第二档」）照样要看得见 mediaJobTool。
  let attachmentKinds: readonly string[] = attachmentKindsInContent(input.userInput);
  let attachmentKindsIncomplete = false;

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

      // 附件 kind 不是引用 key：单独取出，不混进 keys（下面对 keys 做优先级去重）。
      // 压缩掉且已不在内存的旧历史 → incomplete（待发现），不再扫数据库。
      attachmentKinds = [...(keySets.attachmentKinds ?? [])];
      attachmentKindsIncomplete = keySets.attachmentKindsIncomplete === true;

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

  if (attachmentKindsIncomplete) {
    // 旧历史（被压缩且已不在内存的附件）无法判定：报 incomplete 待发现，不扫数据库。
    isComplete = false;
    unresolvedReasons.push(
      "attachment kinds before summarization are not in memory (pending discovery)",
    );
  }
  const attachmentToolNames = toolsForAttachmentKinds(attachmentKinds);

  const allReferencedTools = [
    ...(refAssets.referencedTools ?? []),
    ...(contextToolsResult.tools ?? []),
    ...attachmentToolNames,
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
    attachmentToolNames,
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
