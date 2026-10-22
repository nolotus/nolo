import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSharedSpaceDialogPage, type SharedSpaceDialogSummary } from "database/client/sharedSpaceDialogPage";
import { normalizeSpaceId } from "database-engine/spaceLinkAccess";

export interface SharedSpaceDialogPagesState {
  identityKey: string;
  records: SharedSpaceDialogSummary[];
  recordsBySpace: Record<string, SharedSpaceDialogSummary[]>;
  /**
   * 空间级失败：只在该 Space 的**全部来源都失败、且从未有任何来源成功过**时成立。
   * 单个 origin 的故障只记在 (space, origin) 上，不传染整个 Space。
   */
  errorsBySpace: Record<string, string | null>;
  /** 可重试的 (space, origin) 失败来源数；展示层据此收敛成一个重试控件，不暴露 spaceId。 */
  failedSourceCount: number;
  /**
   * 健康（未失败）且游标未耗尽、可以继续往后翻的来源数。
   * 与 failedSourceCount 并列，展示层才能说清「这次点击会做什么」：
   * 只有 failedSourceCount > 0 → 重试；两者都 > 0 → 重试并加载更多。
   */
  pendingSourceCount: number;
  loadingSpaces: string[];
  hasMoreSpaces: string[];
  loadMore: (spaceId?: string) => Promise<void>;
}
export type SharedSpaceDialogPagesOptions = { enabled: boolean; spaceIds: string[]; account: string; token: string; origins: string[] };
type CodedError = Error & { status?: number; code?: string };
const statusOf = (error: unknown) => (error as CodedError | null)?.status;
const codeOf = (error: unknown) => (error as CodedError | null)?.code;
/**
 * 服务端 sharedSpaceDialogPage 用响应体的 `error` 字段区分两种 400：
 * - `Invalid spaceId`：spaceId 形态非法。请求本身注定 400，客户端也无从自愈 → 终态（停发请求、退出重试集合）。
 * - `Invalid dialog page request`：游标非法/绑定校验失败。**第一页已经加载过的记录必须保留**，
 *   只把该来源标成可重试，并受控地重置它的游标（下一轮从第一页整体重拉）。
 */
const INVALID_SPACE_ID = "Invalid spaceId";
/**
 * 终态判定必须**同时**约束 status === 400：`error` 只是服务端 400 分支的说明，只看 code 会把非 400 的故障误判成终态。
 * 各错误分支的实际归属（见 loadMore）：
 * - `Invalid spaceId` 被判为终态仅此一种：400 + 该 code → 清该来源数据、停发该来源请求；
 * - 401：按 origin 清空全部空间的数据、清该来源的失败/成功/restarting 集合并停用；健康来源不受影响，token 变化后可重新加载；
 * - 403：单来源撤权 → 清该来源数据、停发该来源请求；
 * - 400 非该 code（含读不出 code）：游标/请求形态非法 → 保留数据、重置游标从第一页重拉；
 * - 除上述 401/403 外的其它状态（含无 status，以及携带该 code 的非 400 状态）：普通可重试故障，保留数据与原游标。
 */
const isInvalidSpaceId = (error: unknown) => statusOf(error) === 400 && codeOf(error) === INVALID_SPACE_ID;
/** 游标/请求形态类的 400（非 Invalid spaceId，含读不出 code 的 400）：可恢复，需保留数据并重置游标重拉。 */
const isStaleCursor = (error: unknown) => statusOf(error) === 400 && !isInvalidSpaceId(error);
/** 403 = 成员权限被撤销：保持既有撤销语义（清该来源已加载数据并停止请求）。 */
const isRevoked = (error: unknown) => statusOf(error) === 403;
/**
 * 404 不再被当作「撤权」。服务端 sharedSpaceDialogPage 没有「空间不存在 → 404」分支
 * （不存在与无权限都回 403），所以 404 更可能来自旧版本服务没有该路由或代理/网关错误：
 * 静默吞掉会造成历史无声缺失。与 5xx/网络错误一样归为「该来源暂不可用但可手动重试」。
 */

/** 协议层归一化：服务端只接受裸 spaceId（`space-` 前缀会被 400 拒绝），取不到合法 id 就跳过该 Space。 */
const normalizeSpaceIds = (spaceIds: readonly string[]): string[] =>
  [...new Set(spaceIds.map((spaceId) => normalizeSpaceId(spaceId)).filter((spaceId): spaceId is string => Boolean(spaceId)))].sort();

export function useSharedSpaceDialogPages({ enabled, spaceIds, account, token, origins }: SharedSpaceDialogPagesOptions): SharedSpaceDialogPagesState {
  const sortedSpaces = normalizeSpaceIds(spaceIds);
  const sortedOrigins = [...new Set(origins)].sort();
  const identityKey = JSON.stringify([enabled, account, token, sortedOrigins, sortedSpaces]);
  const generation = useRef(0);
  const busy = useRef(new Set<string>());
  const failed = useRef(new Set<string>());
  const succeeded = useRef(new Set<string>());
  const unauthorizedOrigins = useRef(new Set<string>());
  /** 需要「重置游标并整体重拉」的来源：上一轮因游标非法失败，保留的数据等这一轮替换。 */
  const restarting = useRef(new Set<string>());
  const cursors = useRef(new Map<string, string | null | undefined>());
  const [state, setState] = useState<{ key: string; sources: Record<string, SharedSpaceDialogSummary[]>; errors: Record<string, string | null>; failedSources: number; loading: string[] }>({ key: identityKey, sources: {}, errors: {}, failedSources: 0, loading: [] });

  useEffect(() => {
    generation.current++;
    const ownGeneration = generation.current;
    busy.current.clear();
    failed.current.clear();
    succeeded.current.clear();
    unauthorizedOrigins.current.clear();
    restarting.current.clear();
    cursors.current = new Map(sortedSpaces.flatMap((space) => sortedOrigins.map((origin) => [`${space}\n${origin}`, undefined] as const)));
    setState({ key: identityKey, sources: {}, errors: {}, failedSources: 0, loading: [] });
    return () => { if (generation.current === ownGeneration) generation.current++; busy.current.clear(); };
  }, [identityKey]);

  /**
   * 一次点击同时做两件事：重试所有失败来源 + 推进所有健康且未加载完的来源。
   * 判据是**每个来源自己的游标**（`cursor !== null`），而不是「有没有任何失败来源」的全局集合——
   * 否则只要某个来源持续失败（例如 502），健康来源的后续分页就永远推不动。
   * 失败来源在失败时保留原游标（见下方错误分支），因此它们天然落进同一批 targets 被重试。
   */
  const loadMore = useCallback(async (requested?: string) => {
    if (!enabled || !account || !token || sortedOrigins.length === 0) return;
    const run = generation.current;
    const requestedSpace = requested === undefined ? null : normalizeSpaceId(requested);
    const targets = sortedSpaces.filter((space) => (!requestedSpace || requestedSpace === space) && !busy.current.has(space) && sortedOrigins.some((origin) => !unauthorizedOrigins.current.has(origin) && cursors.current.get(`${space}\n${origin}`) !== null));
    if (!targets.length) return;
    for (const space of targets) busy.current.add(space);
    setState((current) => current.key === identityKey ? { ...current, loading: [...new Set([...current.loading, ...targets])] } : current);
    const settled = await Promise.all(targets.map(async (spaceId) => {
      const pages = await Promise.all(sortedOrigins.filter((server) => !unauthorizedOrigins.current.has(server)).map(async (server) => {
        const key = `${spaceId}\n${server}`;
        const cursor = cursors.current.get(key);
        if (cursor === null) return { server, skipped: true as const };
        // 上一轮游标被判定非法 → 这一轮从第一页重拉，并在成功时整体替换该来源数据（受控重置）。
        const restart = restarting.current.has(key);
        try { return { server, restart, page: await fetchSharedSpaceDialogPage({ server, spaceId, authToken: token, cursor: restart ? null : cursor ?? null, limit: 100 }) }; }
        catch (error) { return { server, restart, error }; }
      }));
      return { spaceId, pages };
    }));
    if (run !== generation.current) return;
    const unauthorizedServers = new Set(settled.flatMap(({ pages }) => pages.filter((item) => "error" in item && statusOf(item.error) === 401).map((item) => item.server)));
    for (const origin of unauthorizedServers) unauthorizedOrigins.current.add(origin);
    setState((current) => {
      if (current.key !== identityKey) return current;
      const sources = { ...current.sources }, errors = { ...current.errors };
      if (unauthorizedServers.size) {
        for (const origin of unauthorizedServers) {
          for (const space of sortedSpaces) {
            const key = `${space}\n${origin}`;
            failed.current.delete(key);
            succeeded.current.delete(key);
            restarting.current.delete(key);
            cursors.current.set(key, null);
            delete sources[key];
          }
        }
      }
      for (const { spaceId, pages } of settled) {
        let failure: string | null = null;
        for (const item of pages) {
          if ("skipped" in item) continue;
          const key = `${spaceId}\n${item.server}`;
          // 401 来源已停用；忽略本批次与其它并发 loadMore 的迟到结果，避免数据/游标复活。
          if (unauthorizedOrigins.current.has(item.server)) continue;
          if ("error" in item) {
            const error = item.error;
            if (isRevoked(error) || isInvalidSpaceId(error)) {
              // 终态：403 撤权 / 非法 spaceId 都无法靠重试自愈 → 清该来源数据、停发请求、退出重试集合。
              failed.current.delete(key);
              restarting.current.delete(key);
              cursors.current.set(key, null);
              delete sources[key];
            } else {
              // 可恢复来源故障（5xx / 网络 / 404 旧路由 / 游标非法）：保留已加载数据、保留可重试提示。
              failed.current.add(key);
              if (isStaleCursor(error)) restarting.current.add(key);
              failure = error instanceof Error ? error.message : "历史查询失败";
            }
          } else {
            failed.current.delete(key);
            restarting.current.delete(key);
            succeeded.current.add(key);
            cursors.current.set(key, item.page.nextCursor);
            sources[key] = item.restart ? item.page.records : [...(sources[key] ?? []), ...item.page.records];
          }
        }
        // 只要该 Space 有任意一个来源成功过，就不标成整体失败：单来源故障不波及整块共享历史。
        const everSucceeded = sortedOrigins.some((origin) => succeeded.current.has(`${spaceId}\n${origin}`));
        if (failure !== null && !everSucceeded) errors[spaceId] = failure;
        else delete errors[spaceId];
      }
      return { key: identityKey, sources, errors, failedSources: failed.current.size, loading: current.loading.filter((space) => !targets.includes(space)) };
    });
    for (const space of targets) busy.current.delete(space);
  }, [enabled, account, token, identityKey]);
  useEffect(() => { if (enabled) void loadMore(); }, [loadMore, enabled, identityKey]);
  const valid = state.key === identityKey;
  const recordsBySpace: Record<string, SharedSpaceDialogSummary[]> = valid
    ? Object.fromEntries(sortedSpaces.map((space) => [space, sortedOrigins.flatMap((origin) => state.sources[`${space}\n${origin}`] ?? [])]))
    : {};
  const pendingSourceCount = valid
    ? sortedSpaces.reduce((sum, space) => sum + sortedOrigins.filter((origin) => {
      const key = `${space}\n${origin}`;
      return cursors.current.get(key) !== null && !failed.current.has(key);
    }).length, 0)
    : 0;
  return {
    identityKey,
    recordsBySpace,
    records: Object.values(recordsBySpace).flat(),
    errorsBySpace: valid ? state.errors : {},
    failedSourceCount: valid ? state.failedSources : 0,
    pendingSourceCount,
    loadingSpaces: valid ? state.loading : [],
    hasMoreSpaces: valid ? sortedSpaces.filter((space) => sortedOrigins.some((origin) => cursors.current.get(`${space}\n${origin}`) !== null)) : [],
    loadMore,
  };
}
