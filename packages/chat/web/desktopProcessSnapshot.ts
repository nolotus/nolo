// packages/chat/web/desktopProcessSnapshot.ts
//
// 桌面宿主进程对账状态机（从 MessageInputContextPanels 抽出，便于单测）。
//
// 为什么需要它：右栏「运行中进程」的数据来自消息里的 `metadata.processLaunch`，
// 而那条记录的 status 在进程自然退出、宿主重启后不会被改写——重开对话就会把
// 早已死掉的 pid 当成 running 显示（幽灵条目）。唯一可靠的真值是宿主进程注册表，
// 但 webview 无法反向调用宿主，只能发消息 + 由宿主 executeJavascript 回灌。
//
// 三态语义（关键，别再退回二态）：只回「谁还活着」的两态语义下，任何覆盖缺口
// ——发送失败的批次、超长的 taskId、超时或过期的轮次——都会被读成「已退出」，
// 从而把真实进程藏掉、连带把它的停止入口弄丢。所以回灌必须同时给出 `checked`
// （宿主确实核对过的 taskId）：
//   - checked 且 alive     → 确认存活
//   - checked 且未 alive    → 确认退出（要过滤掉）
//   - 未 checked            → 未知（保留，不产生否定结论）

export type DesktopProcessSnapshot = {
  alive: Set<string>;
  checked: Set<string>;
};

export type DesktopSnapshotListener = (snapshot: DesktopProcessSnapshot) => void;

export const DESKTOP_PROCESS_BATCH_SIZE = 50;
export const DESKTOP_PROCESS_MAX_TASK_ID_CHARS = 200;
export const DESKTOP_PROCESS_QUERY_INTERVAL_MS = 5_000;
export const DESKTOP_PROCESS_CYCLE_TIMEOUT_MS = 8_000;

type TimerHandle = ReturnType<typeof setTimeout>;

export type DesktopProcessSnapshotClient = {
  subscribe(taskIds: string[], listener: DesktopSnapshotListener): () => void;
  /** 立刻发起一轮查询（在途时只置待查标记）。 */
  query(): void;
  /** 宿主回灌入口：`__noloSetDesktopProcesses(requestId, aliveIds, checkedIds)`。 */
  handleReply(requestId: unknown, alive: unknown, checked: unknown): void;
  /**
   * 本地确认某个 taskId 已结束（用户在面板上点了「停止」）。
   *
   * 为什么需要：面板的乐观状态只在面板自己身上，而「要不要开右栏槽位」由
   * 另一处消费者决定。不下沉到共享层，点停止后整条右栏会保留一个空白槽位，
   * 直到下一轮宿主快照才收起（最多一个轮询周期）。
   */
  markStopped(taskId: string): void;
  dispose(): void;
  /** 诊断/测试用：当前订阅者数量。 */
  consumerCount(): number;
};

export type DesktopProcessSnapshotClientOptions = {
  send: (message: unknown) => void;
  intervalMs?: number;
  cycleTimeoutMs?: number;
  setTimer?: (fn: () => void, ms: number) => TimerHandle;
  clearTimer?: (handle: TimerHandle) => void;
  /** 轮询句柄与「一次性超时」必须分开：setTimeout/setInterval 语义不同。 */
  setRepeater?: (fn: () => void, ms: number) => TimerHandle;
  clearRepeater?: (handle: TimerHandle) => void;
};

const toIdSet = (value: unknown): Set<string> =>
  new Set(
    Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : []
  );

type Cycle = {
  batches: Map<number, string[]>;
  results: Map<number, DesktopProcessSnapshot>;
  timeout: TimerHandle | null;
};

export function createDesktopProcessSnapshotClient(
  options: DesktopProcessSnapshotClientOptions
): DesktopProcessSnapshotClient {
  const {
    send,
    intervalMs = DESKTOP_PROCESS_QUERY_INTERVAL_MS,
    cycleTimeoutMs = DESKTOP_PROCESS_CYCLE_TIMEOUT_MS,
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = (handle) => clearTimeout(handle),
    setRepeater = (fn, ms) => setInterval(fn, ms),
    clearRepeater = (handle) => clearInterval(handle),
  } = options;

  const consumers = new Map<
    number,
    { taskIds: string[]; listener: DesktopSnapshotListener }
  >();
  let consumerSeq = 0;
  let requestSeq = 0;
  let cycle: Cycle | null = null;
  /** 在途期间又有新请求：只置标记，等本轮完成/超时再起一轮（背压，避免堆积）。 */
  let pending = false;
  let interval: TimerHandle | null = null;
  let disposed = false;
  /** 本地已确认结束的 taskId（用户点过「停止」）：宿主再报 alive 也不复活。 */
  const stoppedTaskIds = new Set<string>();
  let lastSnapshot: DesktopProcessSnapshot | null = null;

  const clearCycleTimeout = (current: Cycle) => {
    if (current.timeout) {
      clearTimer(current.timeout);
      current.timeout = null;
    }
  };

  const collectTaskIds = (): string[] => {
    const union = new Set<string>();
    for (const consumer of consumers.values()) {
      for (const taskId of consumer.taskIds) {
        if (
          typeof taskId === "string" &&
          taskId.length > 0 &&
          taskId.length <= DESKTOP_PROCESS_MAX_TASK_ID_CHARS
        ) {
          union.add(taskId);
        }
      }
    }
    return Array.from(union);
  };

  const startCycle = () => {
    if (disposed || cycle) return;
    const ids = collectTaskIds();
    if (ids.length === 0) return;

    const current: Cycle = {
      batches: new Map(),
      results: new Map(),
      timeout: null,
    };
    cycle = current;
    current.timeout = setTimer(() => {
      // 超时 = 未知：不广播任何否定性结论，下一轮重查；未 checked 的条目保留。
      if (cycle === current) cycle = null;
      if (pending) {
        pending = false;
        startCycle();
      }
    }, cycleTimeoutMs);

    // 宿主单次上限 50 个：超过必须拆批，否则第 51 个起的真实进程永远不会被
    // 查询，会被误判成已退出。
    for (
      let offset = 0;
      offset < ids.length;
      offset += DESKTOP_PROCESS_BATCH_SIZE
    ) {
      const batch = ids.slice(offset, offset + DESKTOP_PROCESS_BATCH_SIZE);
      const requestId = ++requestSeq;
      current.batches.set(requestId, batch);
      try {
        send({ type: "nolo-desktop-process-query", requestId, taskIds: batch });
      } catch {
        // 这一批没发出去：从账本移除。它的 taskId 不会进 checked，调用方按
        // 未知保留——绝不能被当成已退出。
        current.batches.delete(requestId);
      }
    }
    if (current.batches.size === 0) {
      clearCycleTimeout(current);
      if (cycle === current) cycle = null;
    }
  };

  const requestNext = () => {
    if (cycle) {
      pending = true;
      return;
    }
    startCycle();
  };

  const emit = (snapshot: DesktopProcessSnapshot) => {
    const alive = new Set<string>();
    for (const taskId of snapshot.alive) {
      if (!stoppedTaskIds.has(taskId)) alive.add(taskId);
    }
    // 本地停止等价于「已核对且不存活」：让所有消费者立刻收回这一条，
    // 不必等下一轮宿主快照（否则右栏会保留一个空白槽位一个轮询周期）。
    const checked = new Set(snapshot.checked);
    for (const taskId of stoppedTaskIds) checked.add(taskId);
    const view: DesktopProcessSnapshot = { alive, checked };
    for (const consumer of consumers.values()) consumer.listener(view);
  };

  const handleReply = (requestId: unknown, alive: unknown, checked: unknown) => {
    if (disposed) return;
    if (typeof requestId !== "number" || !Number.isFinite(requestId)) return;
    const current = cycle;
    if (!current || !current.batches.has(requestId)) return; // 过期或未知批次

    current.results.set(requestId, {
      alive: toIdSet(alive),
      checked: toIdSet(checked),
    });
    if (current.results.size < current.batches.size) return; // 等本轮所有批次

    clearCycleTimeout(current);
    cycle = null;

    const merged: DesktopProcessSnapshot = { alive: new Set(), checked: new Set() };
    for (const result of current.results.values()) {
      for (const taskId of result.alive) merged.alive.add(taskId);
      for (const taskId of result.checked) merged.checked.add(taskId);
    }
    lastSnapshot = merged;
    emit(merged);

    if (pending) {
      pending = false;
      startCycle();
    }
  };

  const dispose = () => {
    disposed = true;
    if (interval) {
      clearRepeater(interval);
      interval = null;
    }
    if (cycle) {
      clearCycleTimeout(cycle);
      cycle = null;
    }
    pending = false;
    lastSnapshot = null;
    stoppedTaskIds.clear();
    consumers.clear();
  };

  return {
    subscribe(taskIds, listener) {
      if (disposed) return () => {};
      const id = ++consumerSeq;
      consumers.set(id, { taskIds, listener });
      if (!interval) {
        interval = setRepeater(() => {
          if (!disposed) requestNext();
        }, intervalMs);
      }
      requestNext();
      return () => {
        consumers.delete(id);
        if (consumers.size === 0) {
          if (interval) {
            clearRepeater(interval);
            interval = null;
          }
          if (cycle) {
            clearCycleTimeout(cycle);
            cycle = null;
          }
          pending = false;
        }
      };
    },
    query: requestNext,
    handleReply,
    markStopped(taskId) {
      if (disposed || typeof taskId !== "string" || taskId.length === 0) return;
      stoppedTaskIds.add(taskId);
      // 首轮快照还没回来时 lastSnapshot 为 null：这时也要派发一次。
      // 三态语义下空快照不会误伤任何未核对项（未 checked 一律保留），
      // 只会让已停止的这条立刻变成「已核对且不存活」，右栏才能当场收起。
      emit(lastSnapshot ?? { alive: new Set<string>(), checked: new Set<string>() });
    },
    dispose,
    consumerCount: () => consumers.size,
  };
}
