/**
 * 分享动作的内核：载荷 → thunk → 链接 → 事件。
 *
 * 抽这一层的原因：`useShareWorkflow`（顶栏 / 详情页，带 ShareModal 状态机）需要
 * 「同一份载荷形状 + 同一个 thunk + 同一个 web 链接 + 同一个 `nolo:share-created` 事件」。
 * （历史上 AppCard 的「发布到社区」也走这里；该入口 2026-11-14 已随 AppCard
 * 去管理化移除，发布到社区现在只在 app 页面的分享弹窗里。）
 * 早期 AppCard 自己 `dispatch(share({…}))` 拼一遍，字段一漂移，分享落地页就会读不到 `data.url`。
 *
 * 这一层是纯函数：不碰 React、不碰 toast / 剪贴板（调用方各自决定怎么提示），
 * 因此可以在卡片、详情页、hook 三处共用，也能直接单测。
 */

import { createShareLink, createWebSharePath } from "share/link";
import type { ShareType } from "share/types";

export type ShareVisibility = "private" | "community";

export interface SharePayload {
  type: ShareType;
  data: Record<string, unknown>;
  title: string;
}

/** thunk 入参：payload 就是 `share.data` 那一层，visibility 决定可见范围。 */
export interface ShareThunkArg extends SharePayload {
  visibility: ShareVisibility;
}

export interface ShareRunResult {
  token: string;
  /** 给人点的 web 链接（协议链接只在没有 origin 时兜底）。 */
  webLink: string;
  visibility: ShareVisibility;
}

export const buildShareThunkArg = (
  payload: SharePayload,
  visibility: ShareVisibility
): ShareThunkArg => ({ ...payload, visibility });

/**
 * web 链接：优先本运行时 server（跨机分享也指回来源 server），其次当前 origin，
 * 最后才退回 `nolo://` 协议链接。
 */
export const resolveWebShareLink = (
  token: string,
  options: { server?: string | null; windowOrigin?: string | null } = {}
): string => {
  const path = createWebSharePath(token);
  if (options.server) return `${options.server}${path}`;
  if (options.windowOrigin) return `${options.windowOrigin}${path}`;
  return createShareLink(token);
};

/** 分享创建成功的事件：侧栏/列表靠它刷新（SSR 下没有 window 就跳过）。 */
export const announceShareCreated = (
  token: string,
  target: EventTarget | null | undefined = typeof window !== "undefined"
    ? window
    : undefined
): void => {
  if (!target) return;
  try {
    target.dispatchEvent(new CustomEvent("nolo:share-created", { detail: { token } }));
  } catch {
    // 事件只是「侧栏/列表刷新」的信号：通知失败不能把已经建好的分享判成失败。
  }
};

export type ShareDispatcher = (action: unknown) => {
  unwrap: () => Promise<{ token: string }>;
};

export interface RunShareArgs {
  dispatch: ShareDispatcher;
  payload: SharePayload;
  visibility: ShareVisibility;
  server?: string | null;
  windowOrigin?: string | null;
  /**
   * thunk 动作创建者，默认 `database/dbSlice` 的 `share`。
   * 只在测试里注入：dbSlice 会拉起 share/action 那串依赖，单测不必背它。
   */
  shareAction?: (arg: ShareThunkArg) => unknown;
}

/**
 * 唯一的分发点：`dispatch(share({...payload, visibility})).unwrap()`。
 * 失败原样抛出，由调用方决定文案（详情页/顶栏写进 ShareModal，卡片只 toast）。
 */
export const runShare = async ({
  dispatch,
  payload,
  visibility,
  server,
  windowOrigin,
  shareAction,
}: RunShareArgs): Promise<ShareRunResult> => {
  // 惰性取 thunk 创建者：dbSlice 会静态拉起 share/action → settings → …
  // 分享是一次性动作，不值得让每个 import 本模块的 bundle 都背上那条链。
  const createAction =
    shareAction ?? (await import("database/dbSlice")).share;
  const result = await dispatch(
    createAction(buildShareThunkArg(payload, visibility))
  ).unwrap();
  const webLink = resolveWebShareLink(result.token, { server, windowOrigin });
  announceShareCreated(result.token);
  return { token: result.token, webLink, visibility };
};

/** 供调用方直接拿到当前 origin（SSR / 测试里为空）。 */
export const currentWindowOrigin = (): string | null =>
  typeof window !== "undefined" && window.location ? window.location.origin : null;
