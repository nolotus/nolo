// 轻量 LLM 意图分类器：根据用户消息 + 可选 agent 列表，
// 由小模型判断该消息应该路由给哪个 agent（返回 agentKey）。
// 复用前端 runLlm thunk，走服务端 proxy 但用真实 agent 配置。
//
// 纯逻辑（prompt 构建 / 输出解析 / 短问候 / 复杂度兜底）的单一真相源在
// agent-runtime/quickChatIntentCore（CLI 共用）；本文件保留 redux 调用通道。

import { runLlm } from "ai/agent/agentSlice";
import type { Agent } from "app/types";
import { toErrorMessage } from "core/errorMessage";
import {
  INTENT_MODEL,
  INTENT_PROVIDER,
  QUICK_CHAT_INTENT_TIMEOUT_MS,
  buildQuickChatIntentSystemPrompt,
  isShortGreeting,
  parseQuickChatIntentResult,
  type QuickChatIntentResult,
  type TierAgentOption,
} from "agent-runtime/quickChatIntentCore";

// re-export：保持 web 既有 import 路径不变（quickChatFlow / 测试 / CLI 之外的调用方）。
export {
  INTENT_MODEL,
  INTENT_PROVIDER,
  QUICK_CHAT_INTENT_TIMEOUT_MS,
  buildQuickChatIntentSystemPrompt,
  estimateComplexity,
  isShortGreeting,
  parseQuickChatIntentResult,
  TIER_DESCRIPTIONS,
} from "agent-runtime/quickChatIntentCore";
export type { QuickChatIntentResult, QuickChatSkillKind, TierAgentOption } from "agent-runtime/quickChatIntentCore";

const QUICK_CHAT_DEBUG = false;

export const QUICK_CHAT_INTENT_LLM_CONFIG = {
  apiSource: "platform" as const,
  useServerProxy: true,
  provider: INTENT_PROVIDER,
  model: INTENT_MODEL,
};

export interface ClassifyQuickChatIntentOptions {
  /** 覆盖默认超时（仅测试用）。 */
  timeoutMs?: number;
}

/**
 * 对 quick-chat 用户输入做 agent 路由分类。
 *
 * 主路径：`dispatch(runLlm(...)).unwrap()`，从 routeOptions 中选 agentKey。
 * 仅当 LLM 失败、空响应或 JSON 无效时调用 `resolveFallbackAgentKey()`。
 *
 * 优化：
 * - 短问候/闲聊（`isShortGreeting`）→ 直接返回 flash 档，不调 LLM。
 * - LLM 调用加超时（`QUICK_CHAT_INTENT_TIMEOUT_MS`），超时走 fallback。
 */
export async function classifyQuickChatIntent(
  text: string,
  tierAgents: TierAgentOption[],
  dispatch: (action: unknown) => unknown,
  resolveFallbackAgentKey: () => string,
  options: ClassifyQuickChatIntentOptions = {},
): Promise<QuickChatIntentResult> {
  const fallback = () => resolveFallbackAgentKey();
  const timeoutMs = options.timeoutMs ?? QUICK_CHAT_INTENT_TIMEOUT_MS;

  if (!text.trim()) {
    return { agentKey: fallback(), classified: false };
  }

  // 快速通道：明显的短问候/闲聊 → flash 档，跳过 LLM。
  if (isShortGreeting(text)) {
    const flashAgent = tierAgents.find((t) => t.tier === "flash");
    if (flashAgent) {
      QUICK_CHAT_DEBUG &&
        console.log("[QuickChatIntent] short greeting → flash (skip LLM)");
      return { agentKey: flashAgent.agentKey, classified: true };
    }
  }

  const systemPrompt = buildQuickChatIntentSystemPrompt(tierAgents);

  const llmConfig: Partial<Agent> & Pick<Agent, "provider" | "model"> = {
    ...QUICK_CHAT_INTENT_LLM_CONFIG,
    prompt: systemPrompt,
  };

  try {
    const dispatched = dispatch(
      runLlm({
        llmConfig,
        content: text,
        isStreaming: false,
      }),
    ) as { unwrap?: () => Promise<string> };

    const llmPromise: Promise<string> =
      typeof dispatched?.unwrap === "function"
        ? dispatched.unwrap()
        : typeof dispatched === "string"
          ? Promise.resolve(dispatched)
          : Promise.resolve("");

    // 超时兜底：保证用户点发送后最多等 ~timeoutMs 就进入下一步。
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<string>((_, reject) => {
      timeoutHandle = setTimeout(
        () =>
          reject(
            new Error(
              `[QuickChatIntent] classifier LLM timeout after ${timeoutMs}ms`,
            ),
          ),
        timeoutMs,
      );
    });

    let content: string;
    try {
      content = await Promise.race([llmPromise, timeoutPromise]);
    } finally {
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    }

    QUICK_CHAT_DEBUG && console.log("[QuickChatIntent] LLM content:", content);
    if (!content.trim()) {
      return { agentKey: fallback(), classified: false };
    }

    const parsed = parseQuickChatIntentResult(content, tierAgents);
    if (!parsed) {
      return { agentKey: fallback(), classified: false };
    }
    QUICK_CHAT_DEBUG && console.log("[QuickChatIntent] parsed:", parsed);
    return {
      agentKey: parsed.agentKey,
      classified: true,
      confidence: parsed.confidence,
      skills: parsed.skills,
    };
  } catch (err) {
    QUICK_CHAT_DEBUG && console.log("[QuickChatIntent] error:", toErrorMessage(err));
    return { agentKey: fallback(), classified: false };
  }
}
