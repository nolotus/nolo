import { buildConsultationModeBlock } from "./consultationMode";
import type { ContextBlockScope } from "./contextBlockScope";
import { CREDENTIAL_HYGIENE_RULE } from "./credentialHygiene";
import { DELETE_SAFETY_RED_LINE } from "./deleteSafety";
import { DISPATCH_BACKEND_POLICY } from "./dispatchBackendPolicy";
import { DISPATCH_CANDIDATE_POLICY } from "./dispatchCandidatePolicy";
import { PARALLEL_DISPATCH_DEFAULT_RULE } from "./parallelDispatchDefault";
import { VERIFY_BEFORE_CONCLUDING_RULE } from "./verifyBeforeConcluding";
import { WORKTREE_ISOLATION_PRELUDE } from "./worktreeIsolationPrelude";

export type PlatformStaticContextLayer = {
  id: string;
  owner: "platform";
  cacheScope: "static";
  content: string;
};

/**
 * 顶部固定平台层的权威有序清单（四条装配线唯一真源）。
 *
 * 顺序与层 ID 属于前缀缓存契约，不得随意重排或改名：
 * 1. buildSystemPrompt (`packages/ai/agent/buildSystemPrompt.ts`)
 * 2. runtimeSystemMessages (`packages/server/handlers/agentRun/runtimeSystemMessages.ts`)
 * 3. localLoop (`packages/agent-runtime/localLoop.ts`)
 * 4. estimateCliContext (`packages/cli/client/estimateCliContext.ts`)
 */
export const PLATFORM_STATIC_LAYER_IDS = [
  "delete-safety-red-line",
  "credential-hygiene",
  "verify-before-concluding",
  "parallel-dispatch-default",
  "dispatch-backend-policy",
  "dispatch-candidate-policy",
  "consultation-mode",
  "worktree-isolation-prelude",
] as const;

export function buildPlatformStaticContextLayers(): PlatformStaticContextLayer[] {
  return [
    {
      id: "delete-safety-red-line",
      owner: "platform",
      cacheScope: "static",
      content: DELETE_SAFETY_RED_LINE,
    },
    {
      id: "credential-hygiene",
      owner: "platform",
      cacheScope: "static",
      content: CREDENTIAL_HYGIENE_RULE,
    },
    {
      id: "verify-before-concluding",
      owner: "platform",
      cacheScope: "static",
      content: VERIFY_BEFORE_CONCLUDING_RULE,
    },
    {
      id: "parallel-dispatch-default",
      owner: "platform",
      cacheScope: "static",
      content: PARALLEL_DISPATCH_DEFAULT_RULE,
    },
    {
      id: "dispatch-backend-policy",
      owner: "platform",
      cacheScope: "static",
      content: DISPATCH_BACKEND_POLICY,
    },
    {
      id: "dispatch-candidate-policy",
      owner: "platform",
      cacheScope: "static",
      content: DISPATCH_CANDIDATE_POLICY,
    },
    {
      id: "consultation-mode",
      owner: "platform",
      cacheScope: "static",
      content: buildConsultationModeBlock(),
    },
    {
      id: "worktree-isolation-prelude",
      owner: "platform",
      cacheScope: "static",
      content: WORKTREE_ISOLATION_PRELUDE,
    },
  ];
}

/**
 * localLoop 兼容投影：localLoop 块作用域只有 `session | turn`（无 `static`），
 * 顶部固定层以 `session` 占位，由数组首位保证最顶位置。
 */
export function buildPlatformStaticScopedBlocks(): ContextBlockScope[] {
  return buildPlatformStaticContextLayers().map((layer) => ({
    content: layer.content,
    cacheScope: "session" as const,
  }));
}

/**
 * 纯文本块列表投影：供上下文 token 估算器（estimateCliContext）使用。
 */
export function buildPlatformStaticPromptBlocks(): string[] {
  return buildPlatformStaticContextLayers().map((layer) => layer.content);
}
