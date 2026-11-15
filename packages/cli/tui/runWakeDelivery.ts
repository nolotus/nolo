import type { InternalTurnEvent } from "core/chat/internalTurnEvent";
import type { ChatQueueStatus } from "core/chat/chatQueueStatus";
import type { FixedInputController } from "./tuiRawInput";
import type { TurnInjectionInbox } from "./turnInjectionInbox";
import { traceChildRunWake, queueWakeFields } from "./runWakeDiagnostics";

/** Workspace wake routing, extracted unchanged so pause/inbox boundaries use the real scheduler in tests. */
export function createRunWakeHandler(deps: {
  isDone: () => boolean;
  isBusy: () => boolean;
  getDialogId: () => string | null;
  fixedInput: Pick<FixedInputController, "active" | "isPaused">;
  getInbox: () => TurnInjectionInbox<any> | null;
  getQueueStatus: () => ChatQueueStatus | undefined;
  enqueue: (event: InternalTurnEvent | string) => ChatQueueStatus;
  printLine: (text: string) => void;
  repaint: () => void;
  runIdle: (event: InternalTurnEvent | string) => Promise<void>;
  drainQueue: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const handler = (event: InternalTurnEvent | string) => {
    if (deps.isDone()) { traceChildRunWake("delivery-done", event, deps.getDialogId()); return false; }
    const busy = deps.isBusy();
    const paused = deps.fixedInput.isPaused();
    const turnInjectionInbox = deps.getInbox();
    const fixedInput = deps.fixedInput;
    const trace = (stage: string, extra: Record<string, unknown> = {}) => traceChildRunWake(stage, event, deps.getDialogId(), { busy, paused, inboxPresent: !!turnInjectionInbox, ...queueWakeFields(deps.getQueueStatus()), ...extra });
    if (busy || paused) {
      // auto-review-continuation 的专用入队分支已移除：该事件类型随续跑
      // 状态机下线，不再有生产者（2026-11-15）。
      // 直投当前进行中的 agent loop：唤醒不再挂进 chat 消息队列等整个 turn
      // 跑完，而是作为 user 消息在下一轮 provider 调用注入本 turn，模型当场
      // 消化。收件箱不可用（无进行中 turn / 已关闭）时才落回 chat 队列。
      const text = typeof event === "string" ? event : event.text;
      const injected =
        !!turnInjectionInbox && turnInjectionInbox.push({ text, fallback: event });
      trace("delivery-inbox-attempt", { inboxPushResult: injected });
      if (injected) {
        // 立即在 transcript 印一行紧凑 dim 状态行，让用户马上看到唤醒已被
        // 本轮吸收（不再出现在队列 UI）。
        //
        // 注意：这里不能用 emitCommandOutput。它走 appendLocalTurn，而
        // appendLocalTurn 会 finalizeCurrentTurn 把 currentRole 置 null；
        // createHistoryOutputStream.write 只调 applyOutputChunkToCurrentTurn，
        // 不会把 currentRole 设回 assistant —— 注入发生在流式输出中途时，
        // 之后模型继续流出的文本会被静默吞掉（不保存也不渲染）。
        // appendStreamSafeNotice 会在插入状态行后重开 assistant 流式段。
        // 显示文案优先用 displayText（系统事件的紧凑单行）；string 事件只有 text。
        const displayText =
          typeof event === "string"
            ? event
            : event.kind === "user"
              ? event.text
              : (event.displayText ?? event.text);
        if (displayText) deps.printLine(displayText);
      } else {
        const status = deps.enqueue(event);
        trace("delivery-queue", queueWakeFields(status));
        // 这里刻意不补打印：inbox 不可用时的兜底与 run 终态唤醒共用本分支，
        // 排队事实已经由 composer 的队列 UI 呈现；在此额外印 transcript 行会
        // 让 run wake 的既有显示语义跟着变化，也会与队列 UI 重复。
      }
      if (fixedInput.active && !fixedInput.isPaused()) {
        deps.repaint();
      }
      return true;
    }
    trace("delivery-idle-turn");
    if (typeof event !== "string" && event.kind === "child-run-completed") {
      // Queue admission is synchronous. Provider success is not the delivery ack.
      deps.enqueue(event);
      void deps.drainQueue().catch(deps.onError);
    } else {
      void deps.runIdle(event).catch(deps.onError);
    }
    return true;
  };
  return Object.assign(handler, {
    async resumeAfterInputPause() {
      if (deps.isDone() || deps.isBusy() || deps.fixedInput.isPaused()) return;
      await deps.drainQueue();
    },
  });
}

/** Ledger reconciliation is a consequence of admitted child results, not an ack. */
export function deliverChildCompletion(
  event: InternalTurnEvent | string,
  receive: ((event: InternalTurnEvent | string) => boolean) | null,
  reconcile: () => void,
): boolean {
  const accepted = receive?.(event) ?? false;
  if (accepted) {
    try { reconcile(); } catch {
      // Receipt already belongs to the receiver. A ledger failure must not
      // turn admission into rejection and duplicate the child result.
      traceChildRunWake("reconcile-after-admission-failed", event, null);
    }
  }
  return accepted;
}
