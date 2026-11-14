// packages/cli/tui/internalResumeGate.ts
//
// 后台完成唤醒「自动续跑」的门判定（纯函数）。
//
// 为什么单独抽出来：`resumeInternalCompletions` 原来把一串早退条件写在一个
// if 里，被挡住时日志和界面都只看到「什么都没发生」——用户看到的是队列里
// 那条后台结果一直挂着（2026-11-14 实测：停止后 3 分钟没有自动续跑，日志
// 里只有 run 终态到达与最终 drain-start，无法指认是哪一门挡住）。
//
// 这里给每个门一个具名原因，调用方据此记诊断、回传 UI。顺序与原实现的
// 短路顺序一致：先状态门，再看队列头是不是「本对话的 child-run-completed」。
// 判定只读结构，不 import core 的联合类型，避免把展示/诊断层拖进类型耦合。

/** 停止门：3 个本地阻断原因。 */
type InternalResumeStopGate =
  /** 用户停止过本次回复（Esc / Ctrl+C / `/stop`），等手动 resume。 */
  | "resume-stopped"
  /** pending 恢复读失败，状态不确定。 */
  | "recovery-blocked"
  /** pending 写盘失败。 */
  | "write-error";

/** 状态门：7 个排队/执行环境状态阻断原因。 */
export type InternalResumeStateGate =
  | InternalResumeStopGate
  /** 队列内核仍认为有 turn 在跑。 */
  | "queue-running"
  /** drain 被暂停（如等待确认）。 */
  | "drain-paused"
  /** 上一次 drain 出错，等用户处理。 */
  | "drain-error"
  /** 有一个已 claim 的 provider 批次等待结算。 */
  | "drain-batch";

/** 队列头门：3 个队列头形态不匹配原因。 */
export type InternalResumeHeadGate =
  /** 队列为空。 */
  | "empty-queue"
  /** 队列头不是后台完成事件（可能是用户消息或空 runs 等无效完成事件）。 */
  | "head-not-completion"
  /** 队列头的 run 不属于当前对话。 */
  | "head-not-this-dialog";

/** 挡住自动续跑的第一个门（null = 可以续跑）。 */
export type InternalResumeGate =
  | InternalResumeStateGate
  | InternalResumeHeadGate;

/** 停止门入参：只取停止判定需要的字段。 */
type InternalResumeStopGateInput = {
  internalResumeStopped: boolean;
  recoveryBlocked: boolean;
  writeError: string | undefined;
};

/** 状态门入参：只取状态判定需要的字段。 */
type InternalResumeStateGateInput = InternalResumeStopGateInput & {
  status: {
    running: boolean;
    drainPaused: boolean;
    lastDrainError: string | null;
    drainBatch?: unknown;
  };
};

/** 判定入参：状态门入参 + 队列与对话 ID。 */
export type InternalResumeGateInput = InternalResumeStateGateInput & {
  dialogId: string | null;
  status: InternalResumeStateGateInput["status"] & {
    queue: readonly { event?: unknown }[];
  };
};

/**
 * 只判停止门（3 个：resume-stopped / recovery-blocked / write-error）。全部通过返回 null。
 */
export function classifyInternalResumeStopGate(
  input: InternalResumeStopGateInput
): InternalResumeStopGate | null {
  if (input.internalResumeStopped) return "resume-stopped";
  if (input.recoveryBlocked) return "recovery-blocked";
  if (input.writeError) return "write-error";
  return null;
}

/**
 * 只判状态门（7 个）。全部通过返回 null。
 * 内部复用 classifyInternalResumeStopGate 作为第一层判定。
 */
export function classifyInternalResumeStateGate(
  input: InternalResumeStateGateInput
): InternalResumeStateGate | null {
  const stopGate = classifyInternalResumeStopGate(input);
  if (stopGate) return stopGate;
  if (input.status.running) return "queue-running";
  if (input.status.drainPaused) return "drain-paused";
  if (input.status.lastDrainError) return "drain-error";
  if (input.status.drainBatch) return "drain-batch";
  return null;
}

/**
 * 只判队列头（3 个）。全部通过返回 null。
 *
 * runs 非空是上游 invariant：空 runs 归入 head-not-completion。
 * dialogId 为空时任何 run 都算「不匹配」：没有对话身份就不自动续跑。
 */
export function classifyInternalResumeHeadGate(
  queue: readonly { event?: unknown }[],
  dialogId: string | null
): InternalResumeHeadGate | null {
  const head = queue[0];
  if (!head) return "empty-queue";
  const event = head.event;
  if (!event || typeof event !== "object") return "head-not-completion";
  if ((event as { kind?: unknown }).kind !== "child-run-completed") {
    return "head-not-completion";
  }
  const runs = (event as { runs?: unknown }).runs;
  // runs 非空是上游 invariant：空 runs 归入 head-not-completion
  if (!Array.isArray(runs) || runs.length === 0) return "head-not-completion";
  if (
    runs.some(
      (run) =>
        !dialogId ||
        (run as { parentDialogId?: string }).parentDialogId !== dialogId
    )
  ) {
    return "head-not-this-dialog";
  }
  return null;
}

/**
 * 返回第一个挡住自动续跑的门；全部通过返回 null。
 * 保持为状态门与队列头门的串联（state ?? head）。
 */
export function classifyInternalResumeGate(
  input: InternalResumeGateInput
): InternalResumeGate | null {
  return (
    classifyInternalResumeStateGate(input) ??
    classifyInternalResumeHeadGate(input.status.queue, input.dialogId)
  );
}
