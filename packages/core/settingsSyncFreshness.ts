/**
 * 账号级 settings 的**同步新鲜度**纯函数（CLI 与桌面端共用）。
 *
 * 背景：账号级偏好（skill 开关、内置 skill 开关、chrome connector 开关、
 * globalPrompt …）的真值在服务器上，客户端本地只有一份缓存副本。历史实现
 * 只在本地**缺失**时才去拉远端，本地一旦有记录就永不刷新——用户在 Web 上
 * 改的偏好永远不会进到任何一次 run/turn 的上下文里（桌面端与 CLI 侧是
 * 同一个 bug 的两份实现）。
 *
 * 修复思路（两侧一致）：**对齐过一次服务器之后**，按 TTL 判断是否需要再问
 * 一次服务器；远端不可用就继续用本地副本（不抛错、不清空偏好）。
 *
 * 为什么不用记录自己的 updatedAt 判断新鲜度：updatedAt 反映的是「这条记录
 * 什么时候被写进本地」，不是「上次跟服务器对齐的时刻」。实测事故里本地
 * updatedAt 比服务器新约 21 小时，却是一份很旧的副本。
 *
 * 本模块只放**纯函数 + 常量**：不含网络、不含存储。调用方（CLI 的
 * localRuntimeAdapter、桌面端的 desktopAccountSettings）负责 I/O 与节流。
 *
 * 唯一真值：TTL 判定、标记时间戳解析、标记记录构造、记录时间戳口径与
 * LWW 赢家判定**只在本模块实现一份**。CLI 侧
 * `packages/cli/client/localRuntimeSettingsFreshness.ts` 不再保留实现副本，
 * 改为从这里 re-export；两侧的常量与判定语义不会漂移。
 */

import { asOptionalPositiveFiniteNumber } from "./optionalPositiveNumber";

/**
 * TTL：距上次成功对齐服务器超过这个时长，就再问一次服务器。
 *
 * CLI 侧这个上限是**跨进程**的（标记落库）；桌面端是长驻进程，用进程内
 * 标记即可达到同样的「每分钟最多对齐一次」上限。
 */
export const SETTINGS_SYNC_TTL_MS = 60_000;

/**
 * 同一进程内的刷新重试节流（毫秒）。
 *
 * 远端不可用时标记不会更新（那是「没对齐」），所以进程内必须有独立节流，
 * 否则失败会退化成每一次 load/turn 都打一次网络。
 */
export const SETTINGS_REFRESH_RETRY_MS = 60_000;

/**
 * 本地副本**缺失**时的远端重试间隔（毫秒）。
 *
 * 与刷新间隔分开：缺失是「还没有任何副本」，值得更快重试。
 */
export const SETTINGS_REMOTE_MISS_RETRY_MS = 30_000;

/**
 * 账号 settings 这一次远端读的**专属预算**（毫秒）。
 *
 * 为什么需要：hybrid store 的远端 fallback 默认预算只有 250ms
 * （DEFAULT_HYBRID_READ_TIMEOUT_MS），而实测 `GET /api/v1/db/read/<key>`
 * 从本机往返要 592–668ms。250ms 必然超时，于是「刷新尝试过但远端被判
 * unavailable」——标记不写、本地副本永不更新，正是原始 bug 的成因。
 *
 * 为什么不给全局调大：全局调大会把 agent 记录、dialog 等**所有** hybrid 读
 * 的上限一起抬高。settings 同步只需要在「标记到期」时多等一会，因此改成
 * **按这一次调用**放宽预算（hybrid store 的 `read(key, { timeoutMs })`），
 * 其它调用方仍然走 250ms。
 *
 * 上限：这是**整体预算**（跨 server 共享），所以一次 settings 同步最多等
 * 3000ms，不会因为多 server 变成 N×3000ms。且只在同步标记到期时发生
 * （跨进程最多每分钟一次）。
 */
export const SETTINGS_REMOTE_READ_TIMEOUT_MS = 3_000;

/** 取标记里的「上次成功对齐时刻」（毫秒）。取不到返回 null＝从未对齐过。 */
export function resolveSettingsSyncMarkerTimestamp(marker: unknown): number | null {
  if (!marker || typeof marker !== "object") return null;
  const value = (marker as Record<string, unknown>).syncedAt;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

/**
 * 是否该去问一次服务器。
 *
 * - 从未对齐过（没有标记 / 标记不可读）→ 该问（这正是事故里被永久压制的路径）；
 * - 距上次对齐 ≥ TTL → 该问；
 * - 否则 → 不问（本地副本还在有效期内）。
 */
export function isSettingsSyncDue(
  marker: unknown,
  nowMs: number,
  ttlMs: number = SETTINGS_SYNC_TTL_MS,
): boolean {
  const stamp = resolveSettingsSyncMarkerTimestamp(marker);
  if (stamp === null) return true;
  return nowMs - stamp >= ttlMs;
}

/**
 * 记录时间戳口径（与 hybrid store 的 `getHybridRecordTimestamp` 逐条对齐）。
 *
 * 为什么需要一份：hybrid store 用 LWW（远端记录时间戳更新才替换本地）决定
 * 「远端是否赢下」，而 CLI 侧要判断「这次刷新是否真的对齐」，就必须用
 * **同一口径**比较远端与本地的时间戳。hybrid 里那个函数没有导出，且
 * `packages/agent-runtime/hybridRecordStore.ts` 不在改动范围内，所以这里
 * 复刻它的候选顺序与解析规则——两边口径一旦漂移，「谁更新」的判断就会分叉。
 *
 * 候选顺序：updatedAt → updated_at → createdAt → created → meta.createdAt。
 * 每个候选：正有限数字直接采用；非空字符串按 `Date.parse` 解析，解析不出正数
 * 就看下一个候选。全都没有 → 0（视为「无时间戳」）。
 */
export function resolveSettingsRecordTimestamp(record: unknown): number {
  if (!record || typeof record !== "object") return 0;
  const source = record as Record<string, any>;
  const candidates = [
    source.updatedAt,
    source.updated_at,
    source.createdAt,
    source.created,
    source?.meta?.createdAt,
  ];
  for (const candidate of candidates) {
    const asNumber = asOptionalPositiveFiniteNumber(candidate);
    if (asNumber !== undefined) return asNumber;
    if (typeof candidate === "string" && candidate.trim()) {
      const parsed = asOptionalPositiveFiniteNumber(Date.parse(candidate));
      if (parsed !== undefined) return parsed;
    }
  }
  return 0;
}

/**
 * 这次远端刷新是否真的让**远端记录赢下 LWW**。
 *
 * hybrid store 的 `read(key, { remote: true })` 在远端不比本地新时（远端缺
 * 时间戳、或远端 updatedAt 更旧）会**返回本地记录**，所以「拿到了一条记录」
 * 不等于「和服务器对齐了」。只有远端时间戳严格大于本地时间戳时，才说明
 * 服务器那份才是新的、且已经被采纳。
 *
 * 注意这里比较的是「刷新后拿到的记录」与「刷新前的本地副本」：
 * 远端赢下时 hybrid store 会把远端写回本地库并返回远端记录，
 * 远端没赢下时返回的就是原样的本地记录 → 两者时间戳相等 → 判定为「没赢」。
 */
export function didRemoteSettingsWinRefresh(
  localRecord: unknown,
  refreshedRecord: unknown,
): boolean {
  return (
    resolveSettingsRecordTimestamp(refreshedRecord) >
    resolveSettingsRecordTimestamp(localRecord)
  );
}

/** 标记记录内容（写本地库，不写服务器）。 */
export function buildSettingsSyncMarkerRecord(
  userId: string,
  syncedAtMs: number,
): Record<string, unknown> {
  return { userId, syncedAt: syncedAtMs };
}
