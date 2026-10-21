import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  getAgentRuns,
  getAgentRunsVersion,
  getRemoteTasks,
  hydrateFromServer,
  tickAgentRuns,
  subscribeAgentRuns,
  getAgentRunElapsedMs,
  type AgentRunScope,
  type AgentRunEvent,
  type RemoteTaskCard,
  applyAgentRunEvent,
} from "./agentRunStore";

/** §7.2-b：回前台 / 可见性恢复重拉的最小节流（≥2s，禁止假设缓存新鲜）。 */
export const AGENT_RUN_HYDRATE_THROTTLE_MS = 2_000;

/** `controlAgentRun { action:"list" }` 的传输缝（测试注入，避免真网络）。 */
export type AgentRunListFetcher = (body: { action: "list" }) => Promise<unknown>;

export const CONTROL_AGENT_RUN_ENDPOINT = "/api/agent/runs/control";

/** 生产默认实现：POST `controlAgentRun { action:"list" }`（当前 userId 域）。 */
export const defaultAgentRunListFetcher: AgentRunListFetcher = async (body) => {
  const response = await fetch(CONTROL_AGENT_RUN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`agent run list failed: ${response.status}`);
  }
  return response.json();
};

export type HydrationTarget = {
  addEventListener(type: string, listener: () => void, options?: unknown): void;
  removeEventListener(type: string, listener: () => void): void;
};

export type AgentRunHydrationOptions = {
  scope: AgentRunScope;
  fetchList?: AgentRunListFetcher;
  /** 默认 `window`（`visibilitychange` 在 document 上冒泡到 window，`focus` 在 window） */
  target?: HydrationTarget;
  /** 注入可见性读取（测试无需真实 DOM）；默认读 `document.visibilityState` */
  readVisibilityState?: () => string | undefined;
  now?: () => number;
  throttleMs?: number;
};

function defaultReadVisibilityState(): string | undefined {
  if (typeof document === "undefined") return "visible";
  return document.visibilityState;
}

function defaultTarget(): HydrationTarget | undefined {
  if (typeof window === "undefined") return undefined;
  return window as unknown as HydrationTarget;
}

/**
 * §7.2 正拉接线（净新增）：
 * a) **挂载时**拉一次（不节流）；
 * b) `visibilitychange`（hidden→visible）与 `focus` 时重拉，节流 ≥2s。
 * 结果一律经 `hydrateFromServer` → `applyAgentRunEvent`（单一汇聚点）灌入 store。
 * 拉取失败只降级不抛（刷新不是关键路径，SSE 仍是主路径）。
 */
export function installAgentRunHydration(options: AgentRunHydrationOptions): () => void {
  const { scope } = options;
  if (!scope?.userId) return () => {};
  const fetchList = options.fetchList ?? defaultAgentRunListFetcher;
  const target = options.target ?? defaultTarget();
  const readVisibilityState = options.readVisibilityState ?? defaultReadVisibilityState;
  const now = options.now ?? (() => Date.now());
  // 节流下限硬钳制在契约值，调用方无法把它调松。
  const throttleMs = Math.max(AGENT_RUN_HYDRATE_THROTTLE_MS, options.throttleMs ?? 0);
  let lastHydrateAt = Number.NEGATIVE_INFINITY;
  let disposed = false;

  const hydrate = (force: boolean) => {
    if (disposed) return;
    const timestamp = now();
    if (!force && timestamp - lastHydrateAt < throttleMs) return;
    lastHydrateAt = timestamp;
    void Promise.resolve()
      .then(() => fetchList({ action: "list" }))
      .then((payload) => {
        if (disposed) return;
        hydrateFromServer(payload, scope);
      })
      .catch((error) => {
        console.warn("[agent-runs] hydrate from server failed:", error);
      });
  };

  const onVisibilityChange = () => {
    if (readVisibilityState() === "visible") hydrate(false);
  };
  const onFocus = () => hydrate(false);

  // a) 挂载正拉：刷新后 store 非空靠这一步，不靠 SSE 重放。
  hydrate(true);
  target?.addEventListener("visibilitychange", onVisibilityChange);
  target?.addEventListener("focus", onFocus);

  return () => {
    disposed = true;
    target?.removeEventListener("visibilitychange", onVisibilityChange);
    target?.removeEventListener("focus", onFocus);
  };
}

export function useAgentRuns(scope?: AgentRunScope) {
  const getSnapshot = useCallback(() => getAgentRunsVersion(), []);
  useSyncExternalStore(subscribeAgentRuns, getSnapshot, getSnapshot);
  const snapshot = getAgentRuns(scope);
  useEffect(() => {
    const timer = setInterval(tickAgentRuns, 1000);
    return () => clearInterval(timer);
  }, []);
  // §7.2：挂载 + 回前台/可见性恢复的正拉接线（scope 变化即重装）。
  useEffect(() => {
    return installAgentRunHydration({ scope: scope ?? { userId: "" } });
  }, [scope?.userId, scope?.dialogId, scope?.workspaceId]);
  // Scope filtering is also applied at render time so an event received before
  // the current dialog changed can never leak into another dialog.
  return snapshot.map((run) => ({ ...run, elapsedMs: getAgentRunElapsedMs(run) }));
}

/** 远程任务卡片（§7.3 终态后仍可见、§7.2 刷新后仍可见）。 */
export function useRemoteTaskCards(scope?: AgentRunScope): RemoteTaskCard[] {
  const getSnapshot = useCallback(() => getAgentRunsVersion(), []);
  useSyncExternalStore(subscribeAgentRuns, getSnapshot, getSnapshot);
  useEffect(() => {
    const timer = setInterval(tickAgentRuns, 1000);
    return () => clearInterval(timer);
  }, []);
  return getRemoteTasks(scope);
}

/** SSE integration seam; the transport only needs to pass parsed events here. */
export function applyAgentRunEventFromStream(event: AgentRunEvent, scope: AgentRunScope) {
  return applyAgentRunEvent(event, scope);
}

/* ═══ §7.2/§7.3 消费侧接线：`dialog-<id>` 帧 → store ═══════════════════════ */

/**
 * 服务端扇出通道（`publishRemoteTaskFrame()` → `eventBus.pushEvent`）：
 * 每帧只发到 `dialog-{scope.dialogId}`。消费侧订阅的 dialogId 必须与卡片过滤
 * 用的 `AgentRunScope.dialogId` **同一取值**，否则要么收不到自己的帧，要么把
 * 别的对话的帧当成自己的。
 */
export const AGENT_RUN_STREAM_CHANNEL_PREFIX = "dialog-";

export function agentRunStreamChannel(dialogId: string): string {
  return `${AGENT_RUN_STREAM_CHANNEL_PREFIX}${dialogId}`;
}

/** `subscribeSharedSse` 以 `server:channel` 作选举/去重 key（`app/realtime/sharedSse`）。 */
export function agentRunStreamSubscriptionKey(server: string, dialogId: string): string {
  return `${server}:${agentRunStreamChannel(dialogId)}`;
}

/** 传输缝：生产 = `subscribeSharedSse`，测试注入即可（避免真网络/真锁）。 */
export type AgentRunStreamSubscriber = (args: {
  key: string;
  url: string;
  headers: Record<string, string>;
  onEvent: (event: Record<string, unknown>) => void;
  onTerminalStatus?: (status: number) => void;
}) => () => void;

function isStreamRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 帧 → store 的**唯一**消费路由（第一层，LOW-2 fail closed）。护栏（缺一不可）：
 * 1. 未知 `type` → default-ignore（不 throw、不落库、不改状态）；
 * 2. 帧 scope 非对象 / 缺 `userId` / `userId` 与本视图不一致 → 丢弃；
 * 3. **对话视图**（scope 带 `dialogId`）：帧必须自带与之精确相等的
 *    `scope.dialogId`；缺 `dialogId`、值不匹配一律丢弃 —— 绝不「以通道归属为准」
 *    收下无对话归属的帧，也绝不「先落库再按视图过滤」；
 *    **用户级全局视图**（scope 无 `dialogId`）：接受本用户任意对话的帧；
 * 4. 其余交给 `applyAgentRunEventFromStream`：store 侧 `matchesScope` 再兜底校验
 *    一次（两层独立成立），再做 `eventSeq` 判重与 `stripUndefined` 增量 merge
 *    （单一 merge，M1 冻结，本函数不碰状态）。
 */
export function routeAgentRunStreamEvent(frame: unknown, scope: AgentRunScope): boolean {
  if (!isStreamRecord(frame)) return false;
  const type = frame.type;
  if (type !== "remote_task" && type !== "agent_run") return false;
  // 无 scope / scope 不是对象 / 无 userId / 跨用户 ⇒ 无法判归属：fail closed 丢弃，
  // 而不是把它送进 store（store 的 scope 校验会解引用 `event.scope.userId`）。
  const frameScope = isStreamRecord(frame.scope) ? frame.scope : undefined;
  if (!frameScope || typeof frameScope.userId !== "string") return false;
  if (frameScope.userId !== scope.userId) return false;
  // 对话视图：帧必须自带本对话的 `dialogId`（缺失 ≠ 本对话，此层先丢一次）。
  if (scope.dialogId !== undefined) {
    const frameDialogId = frameScope.dialogId;
    if (typeof frameDialogId !== "string" || frameDialogId !== scope.dialogId) return false;
  }
  return applyAgentRunEventFromStream(frame as unknown as AgentRunEvent, scope);
}

export type InstallAgentRunEventStreamOptions = {
  /** 必须带 `userId` + `dialogId`（userId-only 的跨对话入口不订阅单对话通道）。 */
  scope: AgentRunScope;
  server: string | null;
  token: string | null;
  subscribe: AgentRunStreamSubscriber;
  /** 观测缝：仅在测试/诊断时注入，不参与状态。 */
  onFrame?: (event: Record<string, unknown>, applied: boolean) => void;
  onTerminalStatus?: (status: number) => void;
};

/**
 * §7.2/§7.3 SSE 消费接线（净新增，主路径）。
 *
 * 降级语义（**不假装实时**）：
 * - 缺对话域 / server / token ⇒ 不订阅、不合成任何状态：事实源退回既有正拉
 *   （`installAgentRunHydration` 的挂载 + 回前台/`visibilitychange` 重拉）；
 * - 断线由 sharedSse 内核按 `Last-Event-ID` 游标重连补齐；重连后的缺口由
 *   `hydrateFromServer` 在同一次正拉里收敛（本函数不写「已连接/正在运行」这类
 *   乐观状态，卡片活性只由 store 的证据时间（`lastEvidenceAt`）决定）；
 * - 401/403 经 `onTerminalStatus` 上报后内核停止重试，卡片按既有失联阈值退化为
 *   unknown / 需处置，不显示「运行中」假活。
 */
export function installAgentRunEventStream(
  options: InstallAgentRunEventStreamOptions,
): () => void {
  const { scope, server, token, subscribe } = options;
  const dialogId = scope?.dialogId;
  if (!scope?.userId || !dialogId || !server || !token) return () => {};

  let disposed = false;
  const unsubscribe = subscribe({
    key: agentRunStreamSubscriptionKey(server, dialogId),
    url: `${server}/api/events/${agentRunStreamChannel(dialogId)}`,
    headers: { Authorization: `Bearer ${token}` },
    onEvent: (event) => {
      if (disposed) return;
      const applied = routeAgentRunStreamEvent(event, scope);
      options.onFrame?.(event, applied);
    },
    ...(options.onTerminalStatus ? { onTerminalStatus: options.onTerminalStatus } : {}),
  });

  return () => {
    disposed = true;
    unsubscribe();
  };
}

export type AgentRunEventStreamHookOptions = {
  userId?: string | null;
  dialogId?: string | null;
  server?: string | null;
  token?: string | null;
  /** 注入订阅实现（测试用）；缺省懒加载 `app/realtime/sharedSse`。 */
  subscribe?: AgentRunStreamSubscriber;
};

/**
 * React 绑定：订阅当前对话的 `dialog-{dialogId}` 通道。`dialogId`/`userId`/
 * `server`/`token` 任一变化即重装（旧订阅先 dispose），因此切对话既不残留
 * 旧订阅、也不会把旧对话的卡片泄进新视图。
 */
export function useAgentRunEventStream(options: AgentRunEventStreamHookOptions): void {
  const { userId, dialogId, server, token, subscribe } = options;
  useEffect(() => {
    if (!userId || !dialogId || !server || !token) return;
    const scope: AgentRunScope = { userId, dialogId };
    let disposed = false;
    let dispose: (() => void) | null = null;
    const start = (subscriber: AgentRunStreamSubscriber) => {
      if (disposed) return;
      dispose = installAgentRunEventStream({ scope, server, token, subscribe: subscriber });
    };
    if (subscribe) {
      start(subscribe);
    } else {
      // 懒加载：sharedSse 依赖 Effect/浏览器锁，只在真正要订阅时才拉进来。
      void import("app/realtime/sharedSse")
        .then((mod) => start(mod.subscribeSharedSse as unknown as AgentRunStreamSubscriber))
        .catch((error) => {
          console.warn("[agent-runs] SSE 订阅不可用，事实源退回正拉:", error);
        });
    }
    return () => {
      disposed = true;
      dispose?.();
    };
  }, [userId, dialogId, server, token, subscribe]);
}
