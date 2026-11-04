// packages/chat/web/sidebar/dialogUnreadSummaryStore.ts
//
// 轻量未读摘要 Store (GET /api/dialogs/unread-summary)
// 满足端到端全量未读对话归属，彻底规避 recentItems (200) 截断漏报：
//   1. 冷启动 / 用户登录 / serverOrigin 切换时按需拉取；
//   2. 回到前台（visibilitychange）时触发失效刷新（节流 >= 2s，无自建定时轮询）；
//   3. 当 SSE 收到 dialog.done / dialog.failed 但该 dialog 尚未载入（unknown）时，自动重拉 summary；
//   4. 严格竞态防护：请求序号 + (userId, serverOrigin) 双重绑定，过期响应与延迟 body 绝不覆盖当前用户；
//   5. 统一已读抑制：唯一真源是 spaceDialogStore.clearedDialogTimestamps（只读消费），
//      本 store 不持有也不写入自己的已读时间戳，避免跨包双写与倒挂；summary 与 recentItems 均受同一抑制保护；
//   6. 若出现新终态（unreadAt 晚于上次清除时间 或新 SSE），该 dialog 重新复活为未读；
//      注意：本 store 不导出「标记已读」入口——已读一律走 spaceDialogStore.clearDialogUnread
//      （生产调用点：create/space/markDialogReadThunk），此处只消费其结果。
//   7. 接口未部署（404/500）时保持 status: "unavailable" | "error" 可解释，不伪装成空。

import { useSyncExternalStore } from "react";
import { asOptionalTrimmedString } from "core/optionalString";
import { getClearedDialogTimestamps } from "create/space/spaceDialogStore";

export interface UnreadDialogSummaryItem {
  dialogId: string;
  dialogKey: string;
  primaryAgentKey: string | null;
  unreadAt: number;
}

export type UnreadSummaryStatus =
  | "idle"
  | "loading"
  | "ok"
  | "unavailable"
  | "error";

export interface DialogUnreadSummaryState {
  status: UnreadSummaryStatus;
  unreadDialogs: UnreadDialogSummaryItem[];
  error: string | null;
  userId: string | null;
  serverOrigin: string | null;
}

const createInitialState = (): DialogUnreadSummaryState => ({
  status: "idle",
  unreadDialogs: [],
  error: null,
  userId: null,
  serverOrigin: null,
});

let state: DialogUnreadSummaryState = createInitialState();
const listeners = new Set<() => void>();
let version = 0;

let currentRequestSeq = 0;
let lastVisibilityRefreshAt = 0;
const VISIBILITY_THROTTLE_MS = 2000;

const notify = (): void => {
  version += 1;
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* subscriber error ignore */
    }
  }
};

export function subscribeDialogUnreadSummary(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDialogUnreadSummarySnapshot(): number {
  return version;
}

export function getDialogUnreadSummaryState(): Readonly<DialogUnreadSummaryState> {
  return state;
}

export function resetDialogUnreadSummaryState(): void {
  currentRequestSeq += 1;
  state = createInitialState();
  notify();
}

/**
 * 说明（原 markDialogSummaryRead 已删除）：
 * 本 store 不导出「标记已读」入口。已读的唯一写入口是
 * spaceDialogStore.clearDialogUnread（生产调用点 create/space/markDialogReadThunk），
 * 本 store 只通过 getClearedDialogTimestamps() 只读消费。
 * 理由：原先的 markDialogSummaryRead 生产 0 调用，且它写入的 clearedDialogTimestamps
 * 字段既不在 DialogUnreadSummaryState 契约里，又与 spaceDialogStore 形成双写，
 * 与本文件头第 5 条（抑制统一由 spaceDialogStore 管理）矛盾；双写还会让「谁先写」决定红点状态。
 */

/**
 * 当 SSE 触发 dialog.done 或 dialog.failed 时调用：
 * 若该 dialogId 属于当前已知未读（在 unreadDialogs 中）或本机曾标记已读
 * （spaceDialogStore.clearedDialogTimestamps，唯一已读真源），返回 false；
 * 完全未知则返回 true 表示需要触发重拉以获取所属 agent。
 *
 * 本函数只读：解除已读抑制是 spaceDialogStore.applySpaceEvent 的职责（单写入口），
 * 此处不重复写已读时间戳。
 */
export function registerTerminalDialogEvent(dialogId: string): boolean {
  let isKnown = getClearedDialogTimestamps()[dialogId] !== undefined;

  for (const item of state.unreadDialogs) {
    if (item.dialogId === dialogId) {
      isKnown = true;
      break;
    }
  }

  return !isKnown;
}

export type FetchUnreadSummaryFunction = (
  url: string,
  options: { headers: Record<string, string>; signal?: AbortSignal }
) => Promise<Response>;

/**
 * 核心加载方法：带竞态保护、账号绑定与错误可解释性。
 */
function areEqualSummaries(
  a: UnreadDialogSummaryItem[],
  b: UnreadDialogSummaryItem[]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const itemA = a[i];
    const itemB = b[i];
    if (
      !itemA ||
      !itemB ||
      itemA.dialogId !== itemB.dialogId ||
      itemA.unreadAt !== itemB.unreadAt ||
      itemA.primaryAgentKey !== itemB.primaryAgentKey
    ) {
      return false;
    }
  }
  return true;
}

export async function refreshDialogUnreadSummary(args: {
  userId?: string | null;
  authToken?: string | null;
  serverOrigin?: string | null;
  fetcher?: FetchUnreadSummaryFunction;
  now?: number;
}): Promise<void> {
  const effectiveUserId = asOptionalTrimmedString(args.userId);
  const effectiveServer = asOptionalTrimmedString(args.serverOrigin) ?? "";
  const effectiveToken = asOptionalTrimmedString(args.authToken);

  // 账号登出或无用户：同步清空，切断上一个账号的数据
  if (!effectiveUserId) {
    currentRequestSeq += 1;
    if (state.userId !== null || state.unreadDialogs.length > 0 || state.status !== "idle") {
      state = createInitialState();
      notify();
    }
    return;
  }

  // 账号或 serverOrigin 发生切换：立即清理老数据
  if (state.userId !== effectiveUserId || state.serverOrigin !== effectiveServer) {
    state = {
      ...createInitialState(),
      status: "loading",
      userId: effectiveUserId,
      serverOrigin: effectiveServer,
    };
    notify();
  }

  const thisSeq = ++currentRequestSeq;
  const boundKey = `${effectiveUserId}@@${effectiveServer}`;

  const defaultFetcher: FetchUnreadSummaryFunction = (url, opts) =>
    fetch(url, { method: "GET", headers: opts.headers, signal: opts.signal });
  const doFetch = args.fetcher ?? defaultFetcher;

  const endpoint = effectiveServer
    ? `${effectiveServer.replace(/\/+$/, "")}/api/dialogs/unread-summary`
    : "/api/dialogs/unread-summary";

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (effectiveToken) {
    headers.Authorization = `Bearer ${effectiveToken}`;
  }

  try {
    const res = await doFetch(endpoint, { headers });

    // 竞态守卫：如果本请求返回时用户已切换或已有更新的请求在飞，直接丢弃
    if (thisSeq !== currentRequestSeq || `${effectiveUserId}@@${effectiveServer}` !== boundKey) {
      return;
    }

    if (res.status === 200) {
      const payload: unknown = await res.json();

      // 二次竞态守卫：在 await res.json() 解析延迟期间，若用户或服务发生切换，绝对丢弃
      if (thisSeq !== currentRequestSeq || `${effectiveUserId}@@${effectiveServer}` !== boundKey) {
        return;
      }

      const payloadObj =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : null;
      const rawList = Array.isArray(payloadObj?.unreadDialogs)
        ? payloadObj.unreadDialogs
        : [];
      
      const filtered: UnreadDialogSummaryItem[] = [];
      const cleared = getClearedDialogTimestamps();

      for (const item of rawList) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        const dialogId = asOptionalTrimmedString(record.dialogId);
        const dialogKey = asOptionalTrimmedString(record.dialogKey);
        const rawUnreadAt = record.unreadAt;
        const unreadAt =
          typeof rawUnreadAt === "number" &&
          Number.isFinite(rawUnreadAt) &&
          rawUnreadAt > 0
            ? rawUnreadAt
            : 0;
        if (!dialogId || !dialogKey || unreadAt <= 0) continue;

        // 若本地在此之前有过针对该 dialog 的清读，且 unreadAt 没有变大，说明此条已被用户本地阅读
        const clearedAt = cleared[dialogId];
        if (typeof clearedAt === "number" && unreadAt <= clearedAt) {
          continue;
        }

        filtered.push({
          dialogId,
          dialogKey,
          primaryAgentKey: asOptionalTrimmedString(record.primaryAgentKey) ?? null,
          unreadAt,
        });
      }

      if (
        state.status === "ok" &&
        state.error === null &&
        areEqualSummaries(state.unreadDialogs, filtered)
      ) {
        return;
      }

      state = {
        ...state,
        status: "ok",
        unreadDialogs: filtered,
        error: null,
        userId: effectiveUserId,
        serverOrigin: effectiveServer,
      };
      notify();
      return;
    }

    if (res.status === 401) {
      if (state.status === "unavailable" && state.error === "Unauthorized (401)") return;
      state = {
        ...state,
        status: "unavailable",
        error: "Unauthorized (401)",
        userId: effectiveUserId,
        serverOrigin: effectiveServer,
      };
      notify();
      return;
    }

    if (res.status === 404) {
      if (state.status === "unavailable" && state.error === "Endpoint /api/dialogs/unread-summary not deployed (404)") return;
      state = {
        ...state,
        status: "unavailable",
        error: "Endpoint /api/dialogs/unread-summary not deployed (404)",
        userId: effectiveUserId,
        serverOrigin: effectiveServer,
      };
      notify();
      return;
    }

    state = {
      ...state,
      status: "error",
      error: `HTTP ${res.status}`,
      userId: effectiveUserId,
      serverOrigin: effectiveServer,
    };
    notify();
  } catch (err: unknown) {
    if (thisSeq !== currentRequestSeq || `${effectiveUserId}@@${effectiveServer}` !== boundKey) {
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    state = {
      ...state,
      status: "error",
      error: message,
      userId: effectiveUserId,
      serverOrigin: effectiveServer,
    };
    notify();
  }
}

/**
 * 供组件响应式订阅 summary 状态
 */
export function useDialogUnreadSummary(): Readonly<DialogUnreadSummaryState> {
  useSyncExternalStore(
    subscribeDialogUnreadSummary,
    getDialogUnreadSummaryState,
    getDialogUnreadSummaryState
  );
  return state;
}

/**
 * 挂载回到前台（visibilitychange）失效重拉监听器（节流 >= 2s，无定时器轮询）
 */
export function setupVisibilityRefresh(triggerRefresh: () => void): () => void {
  if (typeof document === "undefined") return () => {};

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      const now = Date.now();
      if (now - lastVisibilityRefreshAt >= VISIBILITY_THROTTLE_MS) {
        lastVisibilityRefreshAt = now;
        triggerRefresh();
      }
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
