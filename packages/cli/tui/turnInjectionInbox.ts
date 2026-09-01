/**
 * 回合内注入收件箱（turn injection inbox）
 *
 * 背景：后台 run 到达终态时，runCompletionWatcher 会推一个
 * `child-run-completed` 唤醒事件。当前 turn 空闲时直接开新 turn；但当前 turn
 * 正忙时，旧实现把它压进 chat 消息队列（「消息队列有一条后台run已完成」），
 * 用户要等整个 turn 跑完才被消费。
 *
 * 现在改为：busy 时把唤醒文本投进「当前 turn 的注入收件箱」，由 local loop
 * 在每轮开头 / 正常完成前 drain 出来，作为 user 消息直接注入正在执行的
 * agent loop，模型在本 turn 内即可看到。
 *
 * 生命周期：runOneAgentTurn 开始时创建、结束（含 abort/异常）时关闭。关闭后
 * 到达的注入不再接收（push 返回 false），调用方据此走回退路径（落回 chat
 * 队列），保证唤醒永不丢失。
 */

/**
 * 一条待注入条目：`text` 是送进模型的全文，`fallback` 是兜底重投 chat 队列时
 * 要用的原始载荷（通常就是原唤醒事件，保留 displayText 与 markAcknowledged
 * 过滤所需的结构）。
 */
export interface TurnInjectionEntry<TFallback = unknown> {
  text: string;
  fallback: TFallback;
}

export interface TurnInjectionInbox<TFallback = unknown> {
  /**
   * 投递一条注入条目。收件箱已关闭时返回 false，调用方必须自行兜底
   * （通常是落回 chat 队列）。
   */
  push: (entry: TurnInjectionEntry<TFallback>) => boolean;
  /** 取走并清空全部待注入文本；供 local loop 的 drainInjections 回调使用。 */
  drain: () => string[];
  /** 关闭收件箱并返回尚未被 loop 消化的残留条目，供 finally 兜底重投。 */
  close: () => TurnInjectionEntry<TFallback>[];
  /** 当前待注入条目数（测试与诊断用）。 */
  readonly size: number;
  readonly closed: boolean;
}

/**
 * 在「可能正在流式输出 assistant 段」的 transcript 里安全插入一行状态提示。
 *
 * 为什么不能直接用 emitCommandOutput / appendLocalTurn：
 * appendLocalTurn 会先 finalizeCurrentTurn，把 history.currentRole 置为 null；
 * 而 createHistoryOutputStream.write 只调 applyOutputChunkToCurrentTurn，
 * 永远不会把 currentRole 重新设回 "assistant"。于是注入提示之后模型继续流出的
 * 文本会写进 currentContent 但 currentRole 仍是 null，finalizeCurrentTurn 直接
 * 早退——后续 assistant 输出被静默吞掉（既不保存也不渲染）。
 *
 * 这里的处理：
 *  1) 若当前正在流式输出 assistant 段，先让它按已有内容正常收尾（保留 blocks）；
 *  2) 插入 local 角色的状态行；
 *  3) 立刻 startTurn(assistant) 重开一个流式段，让后续 chunk 有处可去。
 * 结果是时间顺序正确的三段：assistant(前半) → 状态行 → assistant(后半)。
 *
 * 当前没有流式 assistant 段时，行为与普通 appendLocalTurn 完全一致。
 */
export function appendStreamSafeNotice(
  history: TurnHistoryLike,
  text: string,
  deps: StreamSafeNoticeDeps,
): void {
  const wasStreamingAssistant = history.currentRole === "assistant";
  // 没有任何未完成内容时，先摘掉 currentRole，避免 appendLocalTurn 的
  // finalize 往 transcript 里塞一条空 assistant turn。
  if (wasStreamingAssistant && !history.currentContent) {
    history.currentRole = null;
    history.currentBlocks = [];
  }
  deps.appendLocalTurn(history, "", text);
  // 关键：重开 assistant 流式段，否则后续 chunk 会因 currentRole===null 丢失。
  if (wasStreamingAssistant) deps.startTurn(history, "assistant");
}

/** appendStreamSafeNotice 只需要 TurnHistory 的这几个可变字段。 */
export interface TurnHistoryLike {
  currentRole: string | null;
  currentContent: string;
  currentBlocks: unknown[];
}

export interface StreamSafeNoticeDeps {
  appendLocalTurn: (history: any, command: string, output: string) => void;
  startTurn: (history: any, role: any) => void;
}

export function createTurnInjectionInbox<
  TFallback = unknown,
>(): TurnInjectionInbox<TFallback> {
  let pending: TurnInjectionEntry<TFallback>[] = [];
  let closed = false;
  return {
    push(entry) {
      if (closed) return false;
      if (!entry || typeof entry.text !== "string" || !entry.text.trim()) return false;
      pending.push(entry);
      return true;
    },
    drain() {
      if (pending.length === 0) return [];
      const taken = pending;
      pending = [];
      return taken.map((entry) => entry.text);
    },
    close() {
      closed = true;
      const remaining = pending;
      pending = [];
      return remaining;
    },
    get size() {
      return pending.length;
    },
    get closed() {
      return closed;
    },
  };
}
