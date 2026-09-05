// Pure semantic projection for the chat working signal. Keep this module
// independent of web presentation, i18n, and Redux.
import { useMemo } from "react";
import {
  hasVisibleAssistantContent,
  isAssistantToolStub,
} from "chat/messages/assistantMessageFacts";

import { isHiddenOrchestratorToolMessage } from "chat/messages/toolPresentation";
import { useHasStreamingMessage } from "chat/messages/messageSessionStore";
import { useActiveControllers } from "chat/dialog/dialogRuntimeStore";

export type ConversationActivity =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "thinking" }
  | { kind: "tool"; toolName: string }
  | { kind: "answering" }
  | { kind: "waiting-user" }
  | { kind: "syncing" };
export type ConversationActivityKind = ConversationActivity["kind"];

// ===== 输入契约（全部来自既有事实源，禁止新造事实）=====

export interface ConversationActivityInput {
  /** agent loop 有活跃 controller（dialogRuntimeStore.activeControllers）。 */
  isRunning: boolean;
  /** 本对话存在流式中的消息（messageSessionStore.streamingMessageId）。 */
  hasStreamingMessage: boolean;
  /** 流式 assistant 行已有可见正文（deriveTrailingAssistantFacts 派生）。 */
  hasVisibleAssistantText: boolean;
  /** reasoning 正在流出：streaming && 有 think && 正文未开始。 */
  isThinkingLive: boolean;
  /** toolRunStore 中 pending/running 且非 confirm 交互的 run（原始工具名）。 */
  activeToolNames: readonly string[];
  /** toolRunStore 中存在未决 confirm 交互（等待用户确认）。 */
  waitingForUser: boolean;
  /** 同步中。当前无真实事实源，恒为 falsy；出现事实后再接线。 */
  syncing?: boolean;
}

/** 无事发生时的稳定引用（消费方可直接判 kind）。 */
export const IDLE_ACTIVITY: ConversationActivity = { kind: "idle" };

/**
 * 纯投影：优先级 waiting-user → syncing → tool → thinking → answering →
 * starting → idle。输入只读、无副作用、可任意重放。
 */
export function projectConversationActivity(
  input: ConversationActivityInput
): ConversationActivity {
  if (input.waitingForUser) return { kind: "waiting-user" };
  if (input.syncing) return { kind: "syncing" };
  if (input.activeToolNames.length > 0) {
    const primary = input.activeToolNames[input.activeToolNames.length - 1];
    return { kind: "tool", toolName: primary };
  }
  if (input.isThinkingLive) return { kind: "thinking" };
  if (input.hasStreamingMessage && input.hasVisibleAssistantText) {
    return { kind: "answering" };
  }
  if (input.isRunning || input.hasStreamingMessage) return { kind: "starting" };
  return IDLE_ACTIVITY;
}

// ===== 消息尾部事实派生（纯函数，web/rn 共用）=====

export interface TrailingAssistantFacts {
  hasVisibleAssistantText: boolean;
  isThinkingLive: boolean;
}

const NO_TRAILING_FACTS: TrailingAssistantFacts = {
  hasVisibleAssistantText: false,
  isThinkingLive: false,
};

/**
 * 从消息列表尾部扫描流式 assistant 行，派生两个正文阶段事实：
 * - 跳过隐藏 orchestrator tool 行与 assistant tool stub（无可见正文）；
 * - 正文已出现 → answering 事实；只有 think 且正文未开始 → thinking live；
 * - 尾部是 user/tool（或无流式消息）→ 两者皆 false（此时由 isRunning /
 *   activeTools 决定 starting / tool）。
 */
export function deriveTrailingAssistantFacts(
  messages: readonly unknown[],
  hasStreamingMessage: boolean
): TrailingAssistantFacts {
  if (!hasStreamingMessage) return NO_TRAILING_FACTS;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i] as
      | { role?: string; content?: unknown; thinkContent?: unknown }
      | null;
    if (!msg) continue;
    if (isHiddenOrchestratorToolMessage(msg)) continue;
    if (msg.role !== "assistant") break;
    if (isAssistantToolStub(msg)) continue;

    const hasText = hasVisibleAssistantContent(msg);
    const think = typeof msg.thinkContent === "string" ? msg.thinkContent : "";
    return {
      hasVisibleAssistantText: hasText,
      isThinkingLive: !hasText && think.trim().length > 0,
    };
  }
  return NO_TRAILING_FACTS;
}

// ===== 只读 selector hook（store 只读，不写任何 state）=====

export interface UseConversationActivityArgs {
  /** 消息列表由调用方传入（MessageList 已订阅，避免二次 Redux 订阅）。 */
  messages: readonly unknown[];
  /** 会话 id（messageSessionStore / Redux messages 的 key）。 */
  dialogId?: string | null;
  /** 运行时 dialogKey（dialogRuntimeStore.activeControllers 的 key）。 */
  dialogKey?: string | null;
  /** Caller-owned snapshot; keeps this hook Redux/store-subscription free. */
  toolRuns: readonly { messageId?: string; status?: string; interaction?: string; toolName?: string }[];
}

/** Keep the global tool-run snapshot scoped to the current dialog. */
export function filterToolRunsForMessages<T extends { messageId?: string }>(
  runs: readonly T[],
  messages: readonly unknown[]
): T[] {
  const messageIds = new Set(
    messages.flatMap((message) => {
      const id = message && typeof message === "object" ? (message as { id?: unknown }).id : undefined;
      return typeof id === "string" ? [id] : [];
    })
  );
  return runs.filter((run) => typeof run.messageId === "string" && messageIds.has(run.messageId));
}

/** toolRunStore → 交互事实：非 confirm 的在途 run 与未决 confirm。 */
export function deriveToolRunFacts(runs: readonly {
  status?: string;
  interaction?: string;
  toolName?: string;
  messageId?: string;
}[]): Pick<ConversationActivityInput, "activeToolNames" | "waitingForUser"> {
  const activeToolNames: string[] = [];
  let waitingForUser = false;
  for (const run of runs) {
    const inFlight = run.status === "pending" || run.status === "running";
    if (!inFlight) continue;
    if (run.interaction === "confirm") {
      waitingForUser = true;
    } else if (typeof run.toolName === "string" && run.toolName) {
      activeToolNames.push(run.toolName);
    }
  }
  return { activeToolNames, waitingForUser };
}

/**
 * 组装既有事实并投影为 ConversationActivity。所有订阅均为只读；
 * isRunning 的计算与 MessageList 原逻辑逐字对齐（activeDialogKey 为空
 * 视为非运行，避免跨对话误报）。
 */
export function useConversationActivity(
  args: UseConversationActivityArgs
): ConversationActivity {
  const { messages, dialogId, dialogKey, toolRuns } = args;
  const hasStreamingMessage = useHasStreamingMessage(dialogId);
  const activeControllers = useActiveControllers(dialogKey ?? undefined);

  const isRunning =
    !!dialogKey && Object.keys(activeControllers).length > 0;

  const trailing = useMemo(
    () => deriveTrailingAssistantFacts(messages, hasStreamingMessage),
    [messages, hasStreamingMessage]
  );
  const toolFacts = useMemo(
    () => deriveToolRunFacts(filterToolRunsForMessages(toolRuns, messages)),
    [toolRuns, messages]
  );

  return projectConversationActivity({
    isRunning,
    hasStreamingMessage,
    hasVisibleAssistantText: trailing.hasVisibleAssistantText,
    isThinkingLive: trailing.isThinkingLive,
    activeToolNames: toolFacts.activeToolNames,
    waitingForUser: toolFacts.waitingForUser,
  });
}
