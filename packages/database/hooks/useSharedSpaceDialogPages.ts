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
  /** 尚未查全且正受 origin 冷却门控的来源，不代表空页或撤权。 */
  deferredSourceCount: number;
  actionableSourceCount: number;
  loadingSpaces: string[];
  hasMoreSpaces: string[];
  /**
   * 手动加载。
   * - `retryFailed: false`：只推进健康来源，失败来源的自动重试额度保持不变（不清预算）。
   * - 默认 / `retryFailed: true`：手动尝试所有未耗尽来源（含失败来源），并重新开启失败来源的自动重试额度。
   */
  loadMore: (spaceId?: string, opts?: { retryFailed?: boolean }) => Promise<void>;
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
const ORIGIN_COOLDOWN_MS = 2000;
const isOriginOutage = (error: unknown) => {
  const status = statusOf(error);
  return status === undefined || status === 404 || status === 408 || status === 429 || status >= 500;
};
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

/**
 * 自动重试的节奏：故障后第 2s 与第 4s 各一次，最多两次，之后只能手动重试。
 * 用 performance.now() 做锚点，避免被 Date.now() 的替换（测试里的假时钟）扭曲。
 */
const AUTO_RETRY_OFFSETS_MS = [2000, 4000];
/** 自动恢复轮次上限：来源之间反复恢复-再失败时，不允许无界自动翻页。 */
const MAX_AUTO_ROUNDS = 3;
/** 来源正忙时的推迟间隔与次数上限。 */
const AUTO_RETRY_POSTPONE_MS = 200;
const MAX_AUTO_POSTPONES = 10;
const nowMs = () => (typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now());

/** 每个 origin 的自动重试账本：额度、时间锚点、待恢复的失败项。 */
interface AutoRetryRecord {
  /** 已消耗的自动重试次数（上限 = AUTO_RETRY_OFFSETS_MS.length）。 */
  attempts: number;
  /** 首次故障的单调时刻，用来把两次自动重试锚定在 2s / 4s。 */
  since: number;
  timer: ReturnType<typeof setTimeout> | null;
  /** 因来源正忙而推迟的次数，避免与在途请求抢同一个 origin。 */
  postponed: number;
  /** 该来源上待恢复的失败项（`${space}\n${origin}`）。 */
  keys: Set<string>;
}

export function useSharedSpaceDialogPages({ enabled, spaceIds, account, token, origins }: SharedSpaceDialogPagesOptions): SharedSpaceDialogPagesState {
  const sortedSpaces = normalizeSpaceIds(spaceIds);
  const sortedOrigins = [...new Set(origins)].sort();
  const identityKey = JSON.stringify([enabled, account, token, sortedOrigins, sortedSpaces]);
  const generation = useRef(0);
  const controllers = useRef(new Set<AbortController>());
  // These gates belong to this hook identity, never a persistent capability blacklist.
  const busy = useRef(new Set<string>());
  const cooldowns = useRef(new Map<string, number>());
  const nextSpaces = useRef(new Map<string, number>());
  const wakeups = useRef(new Set<ReturnType<typeof setTimeout>>());
  const failed = useRef(new Set<string>());
  const succeeded = useRef(new Set<string>());
  const unauthorizedOrigins = useRef(new Set<string>());
  /** 需要「重置游标并整体重拉」的来源：上一轮因游标非法失败，保留的数据等这一轮替换。 */
  const restarting = useRef(new Set<string>());
  const cursors = useRef(new Map<string, string | null | undefined>());
  /** 有界自动重试账本（按 origin）；手动重试可以重新开启额度。 */
  const autoRetry = useRef(new Map<string, AutoRetryRecord>());
  /** 自动恢复轮次计数（按 origin），只被手动加载重置，用来给自动恢复封顶。 */
  const autoRounds = useRef(new Map<string, number>());
  /** 已经发出过请求的 (space, origin)：用来识别「从未请求过」的 deferred 空间。 */
  const issued = useRef(new Set<string>());
  /** 自动恢复入口：runLoad 与 scheduleAutoRetry 互相引用，用 ref 打断循环依赖。 */
  const autoRecoveryRef = useRef<(origin: string, run: number) => void>(() => {});
  const [state, setState] = useState<{ key: string; sources: Record<string, SharedSpaceDialogSummary[]>; errors: Record<string, string | null>; failedSources: number; loading: string[] }>({ key: identityKey, sources: {}, errors: {}, failedSources: 0, loading: [] });

  useEffect(() => {
    generation.current++;
    for (const controller of controllers.current) controller.abort();
    controllers.current.clear();
    const ownGeneration = generation.current;
    busy.current.clear();
    cooldowns.current.clear();
    nextSpaces.current.clear();
    for (const timer of wakeups.current) clearTimeout(timer);
    wakeups.current.clear();
    for (const record of autoRetry.current.values()) if (record.timer) clearTimeout(record.timer);
    autoRetry.current.clear();
    autoRounds.current.clear();
    issued.current.clear();
    failed.current.clear();
    succeeded.current.clear();
    unauthorizedOrigins.current.clear();
    restarting.current.clear();
    cursors.current = new Map(sortedSpaces.flatMap((space) => sortedOrigins.map((origin) => [`${space}\n${origin}`, undefined] as const)));
    setState({ key: identityKey, sources: {}, errors: {}, failedSources: 0, loading: [] });
    return () => {
      if (generation.current === ownGeneration) generation.current++;
      for (const controller of controllers.current) controller.abort();
      controllers.current.clear();
      busy.current.clear();
      for (const timer of wakeups.current) clearTimeout(timer);
      wakeups.current.clear();
      // 身份变化/卸载：旧的自动重试计时器必须失效，否则会对新身份继续发请求。
      for (const record of autoRetry.current.values()) if (record.timer) clearTimeout(record.timer);
      autoRetry.current.clear();
    };
  }, [identityKey]);

  /** 故障来源登记自动重试：只登记失败来源，健康来源完全不受影响。 */
  const scheduleAutoRetry = useCallback((origin: string, key: string, run: number) => {
    if (unauthorizedOrigins.current.has(origin)) return;
    let entry = autoRetry.current.get(origin);
    if (!entry) {
      entry = { attempts: 0, since: nowMs(), timer: null, postponed: 0, keys: new Set<string>() };
      autoRetry.current.set(origin, entry);
    }
    const record = entry;
    record.keys.add(key);
    if (record.timer || record.attempts >= AUTO_RETRY_OFFSETS_MS.length) return;
    const offset = AUTO_RETRY_OFFSETS_MS[record.attempts] ?? AUTO_RETRY_OFFSETS_MS[AUTO_RETRY_OFFSETS_MS.length - 1];
    record.attempts += 1;
    const arm = (delay: number) => {
      record.timer = setTimeout(() => {
        record.timer = null;
        if (run !== generation.current) return;
        if (busy.current.has(origin)) {
          // 来源正忙：推迟而不是抢占，保持 origin 串行。
          if (record.postponed < MAX_AUTO_POSTPONES) { record.postponed += 1; arm(AUTO_RETRY_POSTPONE_MS); }
          return;
        }
        autoRecoveryRef.current(origin, run);
      }, Math.max(0, delay));
    };
    arm(offset - (nowMs() - record.since));
  }, []);

  /** 失败来源恢复（或进入终态）后清掉它的计时器与额度。 */
  const clearAutoRetry = useCallback((origin: string, key?: string) => {
    const record = autoRetry.current.get(origin);
    if (!record) return;
    if (key !== undefined) record.keys.delete(key);
    if (record.keys.size) return;
    if (record.timer) clearTimeout(record.timer);
    autoRetry.current.delete(origin);
  }, []);

  /** Each origin advances independently, with a single in-flight request and fair recovery. */
  const runLoad = useCallback(async (
    requested: string | null,
    opts: { retryFailed: boolean; origin?: string; scope?: (key: string) => boolean },
  ) => {
    if (!enabled || !account || !token || sortedOrigins.length === 0) return;
    const run = generation.current;
    const originsToLoad = sortedOrigins.filter((origin) => {
      if (opts.origin && origin !== opts.origin) return false;
      if (busy.current.has(origin) || unauthorizedOrigins.current.has(origin)) return false;
      // 自动恢复不受冷却门控：它只针对已登记的失败项，不是新的翻页。
      if (opts.scope) return true;
      return (cooldowns.current.get(origin) ?? 0) <= Date.now();
    });
    if (!opts.scope && opts.retryFailed) {
      // 手动重试：真正被触达的失败来源重新开启自动重试额度（下一轮故障又能自动重试两次）。
      // 没被触达的来源（例如还在冷却里）保留原有计时器与额度。
      for (const origin of originsToLoad) {
        const record = autoRetry.current.get(origin);
        if (!record) continue;
        record.attempts = 0;
        record.since = nowMs();
        record.postponed = 0;
        if (record.timer) { clearTimeout(record.timer); record.timer = null; }
        autoRounds.current.delete(origin);
      }
    }
    // Claim all gates synchronously: repeated clicks cannot create a second in-flight request.
    for (const origin of originsToLoad) busy.current.add(origin);
    await Promise.all(originsToLoad.map(async (server) => {
      const start = nextSpaces.current.get(server) ?? 0;
      const ordered = [...sortedSpaces.slice(start), ...sortedSpaces.slice(0, start)];
      const targets = ordered.filter((space) => {
        if (requested !== null && requested !== space) return false;
        const key = `${space}\n${server}`;
        if (opts.scope) return opts.scope(key);
        // 手动：默认连失败来源一起重试；retryFailed=false 时只推进健康来源。
        if (!opts.retryFailed && failed.current.has(key)) return false;
        return cursors.current.get(key) !== null;
      });
      if (!targets.length) { busy.current.delete(server); return; }
      setState((current) => current.key === identityKey ? { ...current, loading: [...new Set([...current.loading, ...targets])] } : current);
      for (const spaceId of targets) {
        if (run !== generation.current || unauthorizedOrigins.current.has(server)) break;
        const key = `${spaceId}\n${server}`;
        const cursor = cursors.current.get(key);
        const restart = restarting.current.has(key);
        issued.current.add(key);
        const controller = new AbortController();
        controllers.current.add(controller);
        const item = await (async () => {
          try { return { server, restart, page: await fetchSharedSpaceDialogPage({ server, spaceId, authToken: token, cursor: restart ? null : cursor ?? null, limit: 100, signal: controller.signal }) }; }
          catch (error) { return { server, restart, error }; }
          finally { controllers.current.delete(controller); }
        })();
        if (run !== generation.current) return;
        nextSpaces.current.set(server, (sortedSpaces.indexOf(spaceId) + 1) % sortedSpaces.length);
        const outage = "error" in item && isOriginOutage(item.error);
        if (outage) {
          cooldowns.current.set(server, Date.now() + ORIGIN_COOLDOWN_MS);
          const timer = setTimeout(() => {
            wakeups.current.delete(timer);
            if (run === generation.current) setState((current) => ({ ...current }));
          }, ORIGIN_COOLDOWN_MS);
          wakeups.current.add(timer);
        }
        const failureError = "error" in item ? item.error : undefined;
        const unauthorized = failureError !== undefined && statusOf(failureError) === 401;
        const terminal = failureError !== undefined && !unauthorized && (isRevoked(failureError) || isInvalidSpaceId(failureError));
        if (unauthorized) {
          // 401：整个 origin 停用，它的自动重试计时器一并作废。
          unauthorizedOrigins.current.add(server);
          const record = autoRetry.current.get(server);
          if (record?.timer) clearTimeout(record.timer);
          autoRetry.current.delete(server);
        } else if (terminal) {
          // 403 撤权 / 非法 spaceId：不可自愈，退出自动重试集合。
          clearAutoRetry(server, key);
        } else if (failureError !== undefined) {
          scheduleAutoRetry(server, key, run);
        } else {
          // 失败来源恢复：清掉它的自动重试计时器。
          clearAutoRetry(server, key);
        }
        // 失败集合同步维护：健康来源判定（retryFailed:false）不能等 React 状态刷新。
        if (!unauthorized && !terminal) {
          if (failureError !== undefined) failed.current.add(key); else failed.current.delete(key);
        }
        const settled = [{ spaceId, pages: [item] }];
        const unauthorizedServers = new Set(settled.flatMap(({ pages }) => pages.filter((item) => "error" in item && statusOf(item.error) === 401).map((item) => item.server)));
        for (const origin of unauthorizedServers) unauthorizedOrigins.current.add(origin);
        setState((current) => {
          if (current.key !== identityKey || run !== generation.current) return current;
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
            if (failure !== null && !everSucceeded && sortedOrigins.every((origin) => failed.current.has(`${spaceId}\n${origin}`) || cursors.current.get(`${spaceId}\n${origin}`) === null)) errors[spaceId] = failure;
            else delete errors[spaceId];
          }
          return { key: identityKey, sources, errors, failedSources: failed.current.size, loading: current.loading };
        });
        if (outage || unauthorizedOrigins.current.has(server)) break;
      }
      if (run !== generation.current) return;
      busy.current.delete(server);
      setState((current) => current.key === identityKey ? { ...current, loading: busy.current.size ? current.loading : [] } : current);
    }));
  }, [enabled, account, token, identityKey]);

  /**
   * 自动恢复：只针对已登记的失败来源。
   * 阶段一重试失败项；阶段二在来源恢复后推进「从未请求过」的 deferred 空间（每空间一页）。
   * 已加载的健康页不会被自动继续翻页。
   */
  const runAutoRecovery = useCallback(async (origin: string, run: number) => {
    if (run !== generation.current) return;
    const record = autoRetry.current.get(origin);
    if (!record) return;
    const rounds = autoRounds.current.get(origin) ?? 0;
    if (rounds >= MAX_AUTO_ROUNDS) return;
    autoRounds.current.set(origin, rounds + 1);
    const keys = record.keys;
    await runLoad(null, { retryFailed: false, origin, scope: (key) => keys.has(key) });
    if (run !== generation.current) return;
    const current = autoRetry.current.get(origin);
    if (current && current.keys.size > 0) return;
    await runLoad(null, { retryFailed: false, origin, scope: (key) => !issued.current.has(key) && !keys.has(key) });
  }, [runLoad]);
  autoRecoveryRef.current = (origin: string, run: number) => { void runAutoRecovery(origin, run); };

  const loadMore = useCallback(async (requested?: string, options?: { retryFailed?: boolean }) => {
    const retryFailed = options?.retryFailed ?? true;
    await runLoad(requested === undefined ? null : normalizeSpaceId(requested), { retryFailed });
  }, [runLoad]);
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
  const deferredSourceCount = valid ? sortedSpaces.reduce((sum, space) => sum + sortedOrigins.filter((origin) =>
    cursors.current.get(`${space}\n${origin}`) !== null && (cooldowns.current.get(origin) ?? 0) > Date.now()).length, 0) : 0;
  const actionableSourceCount = valid ? sortedSpaces.reduce((sum, space) => sum + sortedOrigins.filter((origin) =>
    cursors.current.get(`${space}\n${origin}`) !== null && !busy.current.has(origin) && (cooldowns.current.get(origin) ?? 0) <= Date.now()).length, 0) : 0;
  return {
    identityKey,
    recordsBySpace,
    records: Object.values(recordsBySpace).flat(),
    errorsBySpace: valid ? state.errors : {},
    failedSourceCount: valid ? state.failedSources : 0,
    pendingSourceCount,
    deferredSourceCount,
    actionableSourceCount,
    loadingSpaces: valid && busy.current.size > 0 ? state.loading : [],
    hasMoreSpaces: valid ? sortedSpaces.filter((space) => sortedOrigins.some((origin) => cursors.current.get(`${space}\n${origin}`) !== null)) : [],
    loadMore,
  };
}
