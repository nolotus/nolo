/**
 * Turn transcript（localLoop 拆分第二批）：一个 turn 的两本账。
 *
 * - 发送视图（working）：发给 provider 的消息序列。轮内压缩会把它整体换成
 *   「摘要 + 保留尾部」投影（replaceWorkingHistory），前缀由调用方保留在
 *   重建视图内。
 * - 持久化原文（raw）：从首轮起独立累计的本轮原始消息。压缩只换发送视图，
 *   绝不动原文——持久化锚点坐标系（store 全量历史 + 本轮原始消息）才能对齐。
 *
 * 不变量：
 * 1. push/pushTool/popLast 两本账严格同步（注入边界「预置 assistant 再撤回」
 *    依赖 popLast 同时撤回两本账）；
 * 2. replaceWorkingHistory 只替换发送视图，raw 不受任何影响；
 * 3. persisted(...) 返回 raw 的持久化形态（首条 user 消息换成 paste 展开），
 *    不修改内部状态。
 */
import type {
  AgentRuntimeChatMessage,
  AgentRuntimeMessageContent,
} from "./types";

/**
 * 把本轮消息的持久化形态算出来：首条 user 消息替换为 persistedInput 展开
 * （TUI paste 全文），并带上 context_reference 紧凑引用。provider 发送视图
 * 始终保留紧凑引用；持久化只发生在这里与 saveTurn。
 */
export function applyPersistedTurnInput(
  messages: AgentRuntimeChatMessage[],
  persistedInput: AgentRuntimeMessageContent | undefined,
  persistedInputReference: AgentRuntimeMessageContent | undefined,
): AgentRuntimeChatMessage[] {
  if (persistedInput === undefined && persistedInputReference === undefined) {
    return messages;
  }
  let replaced = false;
  return messages.map((message) => {
    if (replaced || message.role !== "user") return message;
    replaced = true;
    return {
      ...message,
      ...(persistedInput !== undefined ? { content: persistedInput } : {}),
      ...(persistedInputReference !== undefined
        ? { context_reference: persistedInputReference }
        : {}),
    };
  });
}

export type TurnTranscript = {
  /** 当前发送视图（可变数组引用，与拆分前 localLoop 的 messages 同一语义）。 */
  working(): AgentRuntimeChatMessage[];
  /**
   * 用重建后的完整工作视图（前缀 + 投影历史）替换发送视图。
   * 只在轮内压缩投影时调用；持久化原文不动。
   */
  replaceWorkingHistory(nextWorkingView: AgentRuntimeChatMessage[]): void;
  /** 追加一条消息：发送视图与持久化原文两本账同步。 */
  push(msg: AgentRuntimeChatMessage): void;
  /** 追加工具消息：先经 capTool（单条输出硬上限）裁剪，再两本账同步。 */
  pushTool(msg: AgentRuntimeChatMessage): void;
  /** 撤回最后一次追加（两本账同步各弹一条），返回发送视图弹出的消息。 */
  popLast(): AgentRuntimeChatMessage | undefined;
  /** 持久化形态：raw 原文 + persistedInput 展开（不改内部状态）。 */
  persisted(
    persistedInput: AgentRuntimeMessageContent | undefined,
    persistedInputReference: AgentRuntimeMessageContent | undefined,
  ): AgentRuntimeChatMessage[];
};

export function createTurnTranscript(args: {
  /** buildMessages 产出的初始发送视图（前缀 + 历史 + 本轮输入）。 */
  initialWorking: AgentRuntimeChatMessage[];
  /** 初始发送视图中属于「前缀 + 历史」的条数；raw 从其后开始累计。 */
  prefixCount: number;
  historyCount: number;
  /**
   * 单条工具输出硬上限裁剪（只截字符串 content 的 tool 消息）。
   * 缺省时 pushTool 不裁剪。
   */
  capToolMessage?: (msg: AgentRuntimeChatMessage) => AgentRuntimeChatMessage;
}): TurnTranscript {
  let working = args.initialWorking;
  // 本轮产出消息的原始记录（持久化用）。轮内压缩会把工作视图换成
  // 「摘要 + 保留尾部」投影；持久化不能跟投影走（否则丢本轮原始消息、且与
  // 持久化锚点的 canonical 坐标系错位），所以从首轮起独立累计原始消息。
  const raw: AgentRuntimeChatMessage[] = args.initialWorking.slice(
    args.prefixCount + args.historyCount,
  );
  const cap = args.capToolMessage ?? ((msg: AgentRuntimeChatMessage) => msg);
  return {
    working: () => working,
    replaceWorkingHistory: (nextWorkingView) => {
      working = nextWorkingView;
    },
    push: (msg) => {
      working.push(msg);
      raw.push(msg);
    },
    pushTool: (msg) => {
      const capped = cap(msg);
      working.push(capped);
      raw.push(capped);
    },
    popLast: () => {
      raw.pop();
      return working.pop();
    },
    persisted: (persistedInput, persistedInputReference) =>
      applyPersistedTurnInput(raw, persistedInput, persistedInputReference),
  };
}
