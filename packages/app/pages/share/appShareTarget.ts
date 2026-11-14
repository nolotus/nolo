/**
 * 「探索 › 应用」→ app 预览页 → 运行 这条链路的纯逻辑。
 *
 * 事实依据（2026-11 核对，勿凭记忆改）：
 * - 应用分享把 `{ appId, name, url, appKey? }` 写进 `share.data`（见
 *   `packages/app/components/AppSharePanel.tsx`；历史上 AppCard 也写过，
 *   该入口 2026-11-14 随 AppCard 去管理化移除），
 *   服务端 `toShareSummary` 只把 `data.url` 透出为 `ShareSummary.url`，**没有** appKey 字段。
 * - `url` 是应用运行地址 `/apps/<appId>`（沙箱入口）。这层对访客是可打开的：
 *   `resolveSandboxRuntimeContext` 只在「有 spaceId 且 private」时拦空间成员。
 * - 应用页 `/<appKey>` 走 `/api/app/get`，服务端按 `canAccessAppRecord(userId, record, "guest")`
 *   判定：**无 spaceId 时只有 owner 能读**。所以访客的可用入口是运行地址，
 *   应用页只对「作者本人（发布者）」提供，绝不为这条链路放宽权限。
 */
import { resolveAppRouteKey } from "app/utils/appKeys";
import { asTrimmedString } from "core/trimmedString";
import { normalizeAppHttpUrl } from "core/appHttpUrl";

export interface AppShareData {
  appId: string | null;
  /** 新分享直接带 appKey；老分享（本次改动之前发布的）没有这个字段。 */
  appKey: string | null;
  name: string | null;
  /** 应用运行地址：`<serverOrigin>/apps/<appId>`。 */
  url: string | null;
}

export const readAppShareData = (
  data: Record<string, unknown> | null | undefined
): AppShareData => ({
  appId: asTrimmedString((data as any)?.appId) || null,
  appKey: asTrimmedString((data as any)?.appKey) || null,
  name: asTrimmedString((data as any)?.name) || null,
  // 这个值会直接变成可点击的「打开应用」链接：只接受 http(s) 绝对地址。
  // 前缀判断会放过 `javascript:alert(1)` 这类值（review H2），所以走解析校验。
  url: normalizeAppHttpUrl(asTrimmedString((data as any)?.url)) ?? null,
});

/** 访客能直接打开的地址：应用运行入口。拿不到就是 null（不编造）。 */
export const resolveAppShareRuntimePath = (
  data: Record<string, unknown> | null | undefined
): string | null => readAppShareData(data).url;

/**
 * 应用页 key（`/<appKey>`）。优先用分享里带的 appKey；老分享只有 appId 时退回
 * legacy `app-<appId>`（`getAppRecordByKey` 有 appId 索引兜底查询）。
 * 这个值只用于「作者本人回自己的应用页」，不当作访客入口。
 */
export const resolveAppShareAppKey = (
  data: Record<string, unknown> | null | undefined
): string | null => {
  const { appId, appKey } = readAppShareData(data);
  return resolveAppRouteKey(appKey, appId);
};

/** 只有发布者本人（作者）才给「在 Nolo 打开应用页」——该页是 owner 级读权限。 */
export const isAppShareOwner = (
  authorId?: string | null,
  viewerId?: string | null
): boolean => {
  const author = asTrimmedString(authorId);
  const viewer = asTrimmedString(viewerId);
  return Boolean(author && viewer && author === viewer);
};

/** 来源 server 的 host（拿不到就 null，不在 UI 上编一个域名）。 */
export const describeAppShareOrigin = (
  originServer?: string | null
): string | null => {
  const origin = asTrimmedString(originServer);
  if (!origin) return null;
  try {
    return new URL(origin).host || null;
  } catch {
    return origin.replace(/^https?:\/\//, "") || null;
  }
};

// 失败归类与文案的唯一真值是 `core/appRuntimeFailure`（服务端失败页 + 详情页共用
// 同一份 reason 判定）。这里只做再导出，保持 share/* 既有导入路径稳定。
export {
  describeAppRuntimeFailure,
  readAppRuntimeErrorText,
} from "core/appRuntimeFailure";
export type {
  AppRuntimeFailureCopy,
  AppRuntimeFailureReason,
} from "core/appRuntimeFailure";
