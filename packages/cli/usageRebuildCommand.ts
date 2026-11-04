/**
 * usageRebuildCommand.ts — `nolo usage rebuild`
 *
 * 从**明细计费记录**（`token-<userId>-<timestamp>…`）重建本地日聚合 DayStats
 * （`token-stats-day-user-<userId>-<date>`），把历史上缺失的
 * `cacheRead` / `cacheCreation` / `agents` / `entryPaths` 维度补回来。
 *
 * 为什么需要它：日聚合的写入侧一直在演进（缓存字段、agent 维度、失败计数都是后加的），
 * 早期写入路径落下的 DayStats 缺这些维度，且**不可从聚合本身回溯**——只有明细里
 * 还留着当时的 `cache_read_input_tokens` / `agentId`。所以要补就只能拿明细重算。
 *
 * ⚠️ 这是在改写用户本地的账本数据，设计上按「宁可少写、不可静默写错」：
 *   1. 默认 dry-run，不加 `--apply` 绝不写库；
 *   2. `--apply` 覆盖前先把原值备份到 `usage-backup-<userId>-<date>-<unixMs>`，备份失败整体中止
 *      （备份与写入分两批，备份批失败时一条统计都不写）。备份键**刻意不落在 `token-*` 命名空间**
 *      ——旧实现的 `token-stats-day-user-…-backup-…` 仍在 `createTokenStatsKey.rangeOfUser` 区间内，
 *      会被 `sumMonthBillableCost`（按 `…-<yyyy-MM>` 前缀 + `total.cost` 求和）和 `getTokenStats`
 *      （区间扫描 + 只过滤 `record.total`）当成一条正常统计再算一遍 → 月成本翻倍；
 *   3. 明细不足以解释现有统计（现有 total.calls > 重建值）的日期**默认跳过**并逐条报告
 *      「现有 N / 重建 M」，只有显式 `--force` 才覆盖；
 *   4. 现有 failedCount 大于重建值时保留现有值（`total.failedCount = max(...)`），
 *      失败记录是后加维度，旧数据没有明细可依据，直接覆盖等于抹掉证据；
 *   5. **billable 未知的日期一律不可重建**：成功明细的 `billable` 缺失或不是布尔值时，
 *      收费类别（platform/subscription）与成本金额都无法确定，重建值只能算是个「临时 0」。
 *      这类 (user, day) 在 dry-run 报告里明确标「不可重建」，apply / apply+force 都跳过且零写入；
 *      `--force` 只解除「会减少现有数据」的拦截，**不解除未知事实**。失败记录不贡献 cost，
 *      按既有口径不参与该判定（见 normalizeDetailRecord 的 billableUnknown）。
 *
 * 明细键的甄别（重要，见 classifyDetailKey 的注释）：
 *   `token-<userId>-` 前缀下混着**三种**东西：
 *     - `token-<userId>-<ts>`              —— 明细（createTokenKey.record）
 *     - `token-<userId>-<ts>-<chargeId>`   —— 明细（recordForCharge，同毫秒不覆盖）
 *     - `token-<userId>-call-<callId>`     —— **仍然是明细**（recordForStableCall）
 *     - `token-<userId>-failed-call-<id>`  —— 明细（失败记录，status=failed，tokens 全 0）
 *   判断依据必须是**值**（有 type=token / input_tokens 数），不能靠键形状，否则会把
 *   `call-*` 这一大批真实用量当成「非用量记录」丢掉，重建结果反而比现状更差。
 *   另外 `token-stats-*` / `token-charge-stats-*` 与 `token-<userId>-` 前缀在
 *   userId 段无边界编码时会互相串味（见 keys.ts 的说明），所以还要按值里的 userId 复核。
 */

import { format } from "date-fns";
import { createTokenKey, createTokenStatsKey, createUsageBackupKey } from "database/keys";
import { isLevelNotFoundError } from "database/levelNotFoundError";
import type { DayStats, ModelStats } from "ai/token/applyTokenUsageToDayStats";
import { applyTokenUsageToDayStats, normalizeStats } from "ai/token/applyTokenUsageToDayStats";
import { getDefaultCliLocalRuntimeDb } from "./localRuntimeDb";
import type { EnvLike } from "./cliEnvHelpers";
import { parseUsageArgs, resolveDateWindow, type UsageCommandOptions } from "./usageCommand";

/** rebuild 只写 put：一条原子批量写操作的形状。 */
export type RebuildWriteOp = { type: "put"; key: string; value: unknown };

/**
 * rebuild 专用的本地 db 面（只用到这三件事，测试里可以整块注入假实现）。
 *
 * 批量写的入口名两可，按「实际用到的最小结构」声明：真实本地库是
 * createLegacyServerDb() 的产物，暴露 batch(ops)（内部转发 authority 的 batchWrite，
 * 原子性一致）；测试注入的假 db 提供 batchWrite(ops)。由 writeRebuildOps 统一挑选；
 * 两者都没有时直接抛错，不静默退化成逐条 put（那会丢原子性）。
 */
export interface RebuildDb {
  get: (key: string) => Promise<unknown>;
  batch?: (ops: RebuildWriteOp[]) => Promise<unknown>;
  batchWrite?: (ops: RebuildWriteOp[]) => Promise<unknown>;
  iterator: (options: { gte: string; lte?: string }) => AsyncIterable<[string, unknown]>;
}

/** 选一个可用的批量写入口（方法调用形式，保住 this 绑定）。 */
export async function writeRebuildOps(
  db: RebuildDb,
  ops: RebuildWriteOp[],
): Promise<unknown> {
  if (typeof db.batchWrite === "function") return db.batchWrite(ops);
  if (typeof db.batch === "function") return db.batch(ops);
  throw new Error("rebuild db 缺少批量写能力：既没有 batchWrite() 也没有 batch()");
}

export interface UsageRebuildOptions extends UsageCommandOptions {
  /** 真正写库；缺省 false（dry-run）。 */
  apply?: boolean;
  /** 允许覆盖「现有 calls > 重建值」的日期。 */
  force?: boolean;
}

/** 一条明细记录里重建所需的最小字段集。 */
export interface RebuildDetailRecord {
  userId: string;
  dateKey: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
  cost: number;
  model?: string;
  provider?: string;
  agentId?: string;
  entryPath?: string;
  billable: boolean;
  /**
   * `billable` 缺失或不是布尔值（历史明细 / 别的写入路径没写这个字段）。
   * 这种记录不能猜成 subscription——猜错就是把真实计费从月成本里抹掉，所以单独标记，
   * 由 planRebuild 把整个 (user, day) 判为「不可重建」。
   */
  billableUnknown: boolean;
  failed: boolean;
}

/** 明细键甄别的结果。`skip` 时带上原因，报告里逐类计数，不静默丢。 */
export type DetailKeyVerdict =
  | { kind: "candidate" }
  | { kind: "skip"; reason: "stats-namespace" | "foreign-namespace" | "not-token-prefix" };

const TOKEN_PREFIX = "token-";

/**
 * 判断一个键**是否属于某个用户的明细命名空间**（粗筛，只排除别的命名空间）。
 *
 * 真正的「是不是用量记录」必须看值（见 normalizeDetailRecord）——键形状做不到：
 * `call-*` / `failed-call-*` 也是明细，而 `token-charge-stats-*` 不是。
 */
export function classifyDetailKey(key: string): DetailKeyVerdict {
  if (!key.startsWith(TOKEN_PREFIX)) return { kind: "skip", reason: "not-token-prefix" };
  if (key.startsWith("token-stats-")) return { kind: "skip", reason: "stats-namespace" };
  if (key.startsWith("token-charge-stats-")) return { kind: "skip", reason: "stats-namespace" };
  if (key.startsWith("idx-")) return { kind: "skip", reason: "foreign-namespace" };
  return { kind: "candidate" };
}

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

/**
 * 键里 `<userId>` 段没有边界编码（userId 自身可含 `-`），因此这里**只在没有值可用时**兜底：
 * 末段是 10–13 位时间戳的键，倒数第二段之前就是 userId。
 * `call-*` 这类键（callId 可含 `-`）解析不出 userId，返回 undefined——交给值里的 userId。
 */
export function userIdFromDetailKey(key: string): string | undefined {
  if (!key.startsWith(TOKEN_PREFIX)) return undefined;
  const rest = key.slice(TOKEN_PREFIX.length);
  const match = /^(.*)-(\d{10,13})(?:-.*)?$/.exec(rest);
  return match ? match[1] : undefined;
}

/** 键末段的时间戳（`token-<user>-<ts>` / `token-<user>-<ts>-<chargeId>`）。 */
export function timestampFromDetailKey(key: string): number | undefined {
  const match = /-(\d{10,13})(?:-|$)/.exec(key);
  if (!match) return undefined;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * 值和键 → 一条可聚合的明细。返回 null 表示「这不是一条用量明细」。
 *
 * 判据全在值上：`type === "token"`（DataType.TOKEN）或带数值 `input_tokens`。
 * 这样 `call-*` / `failed-call-*`（真实明细）会被收下，而幂等标记 / 索引值会被排除。
 * `dateKey` 优先由 `timestamp` 按本地时区推出，与写入侧
 * `format(timestamp, "yyyy-MM-dd")` 完全同口径；只有 timestamp 缺失时才回退值里的 dateKey。
 */
export function normalizeDetailRecord(
  key: string,
  value: unknown,
): RebuildDetailRecord | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  const isTokenRecord = v.type === "token" || typeof v.input_tokens === "number";
  if (!isTokenRecord) return null;

  const userId = asNonEmptyString(v.userId) ?? userIdFromDetailKey(key);
  if (!userId) return null;

  const timestamp = asNumber(v.timestamp, asNumber(v.createdAt, Number.NaN)) ||
    asNumber(timestampFromDetailKey(key), Number.NaN);
  const dateKey =
    Number.isFinite(timestamp) && timestamp > 0
      ? format(new Date(timestamp), "yyyy-MM-dd")
      : asNonEmptyString(v.dateKey);
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const failed = v.status === "failed";
  const agentRaw = asNonEmptyString(v.agentId) ?? asNonEmptyString(v.cybotId);

  return {
    userId,
    dateKey,
    input: asNumber(v.input_tokens),
    output: asNumber(v.output_tokens),
    cacheRead: asNumber(v.cache_read_input_tokens),
    cacheCreation: asNumber(v.cache_creation_input_tokens),
    cost: asNumber(v.cost),
    model: asNonEmptyString(v.model),
    provider: asNonEmptyString(v.provider),
    agentId: agentRaw,
    entryPath: asNonEmptyString(v.entry_path),
    billable: v.billable === true,
    // 只有明确的 true/false 才算已知；缺失、null、字符串 "true"、1 一律按未知处理。
    billableUnknown: typeof v.billable !== "boolean",
    failed,
  };
}

/** 聚合 map 的键：`<userId>\u0000<dateKey>`（`\u0000` 不会出现在 userId 里）。 */
export const detailGroupKey = (userId: string, dateKey: string): string => `${userId}\u0000${dateKey}`;

export interface AggregateResult {
  /** key = detailGroupKey(userId, dateKey) */
  byDay: Map<string, DayStats>;
  /** 收下的明细条数。 */
  accepted: number;
  /** 因「值不是用量记录」被排除的条数。 */
  rejectedNonUsage: number;
  /** 因「取不到 userId / 日期」被排除的条数（会进报告，不静默丢）。 */
  rejectedUnkeyed: number;
  /** 明细里没有 agentId 的条数（agents 维度因此不完整，要提示）。 */
  missingAgent: number;
  /** 成功明细里 billable 未知的条数（失败记录不贡献 cost，不计入）。 */
  unknownBillable: number;
  /** key = detailGroupKey；值 = 该日成功明细里 billable 未知的条数 → 该日不可重建。 */
  unknownBillableByDay: Map<string, number>;
}

/**
 * 明细 → 按「用户 + 日」聚合的 DayStats。纯函数，不碰 db。
 *
 * 复用 applyTokenUsageToDayStats 作为唯一聚合实现（cache / agents / entryPaths /
 * billingCategory 的口径都在那里，自己再写一份必然漂移）。
 */
export function aggregateDetailsByDay(
  records: Iterable<RebuildDetailRecord>,
): AggregateResult {
  const byDay = new Map<string, DayStats>();
  let accepted = 0;
  let missingAgent = 0;
  let unknownBillable = 0;
  const unknownBillableByDay = new Map<string, number>();

  for (const record of records) {
    const key = detailGroupKey(record.userId, record.dateKey);
    const prev = byDay.get(key) ?? null;
    if (!record.agentId) missingAgent++;
    if (record.billableUnknown && !record.failed) {
      unknownBillable++;
      unknownBillableByDay.set(key, (unknownBillableByDay.get(key) ?? 0) + 1);
    }
    byDay.set(
      key,
      applyTokenUsageToDayStats(prev, {
        userId: record.userId,
        timeKey: record.dateKey,
        model: record.model,
        provider: record.provider,
        input_tokens: record.input,
        output_tokens: record.output,
        cost: record.cost,
        cache_read_input_tokens: record.cacheRead,
        cache_creation_input_tokens: record.cacheCreation,
        // 明细里没有 agentId 时**不传**：传了会让 applyTokenUsageToDayStats 建一个
        // "unknown" 桶，把「这一维没记录」伪装成「确实有这么多未知 agent 用量」。
        ...(record.agentId ? { agentId: record.agentId } : {}),
        ...(record.entryPath ? { entry_path: record.entryPath } : {}),
        ...(record.failed ? { status: "failed" as const } : {}),
        // 与 client/localRuntimeDialog.ts 同一口径：(billable ?? false) ? platform : subscription
        billingCategory: record.billable ? "platform" : "subscription",
      }),
    );
    accepted++;
  }

  return {
    byDay,
    accepted,
    rejectedNonUsage: 0,
    rejectedUnkeyed: 0,
    missingAgent,
    unknownBillable,
    unknownBillableByDay,
  };
}

export interface RebuildPlanEntry {
  userId: string;
  dateKey: string;
  statsKey: string;
  rebuilt: DayStats;
  /** 现有 DayStats（没有则为 null）。 */
  existing: DayStats | null;
  existingCalls: number;
  rebuiltCalls: number;
  existingFailed: number;
  rebuiltFailed: number;
  /** 现有 failedCount 高于重建值而被保留的部分。 */
  preservedFailed: number;
  /** 该日成功明细里 billable 未知的条数；> 0 时不可重建。 */
  unknownBillable: number;
  /** 因「billable 未知、收费类别/金额无法确定」被阻断（--force 也不解除）。 */
  blocked: boolean;
  action: "create" | "overwrite" | "skip";
  skipReason?: string;
  /** 覆盖会让现有数据变少的项（即使加了 --force 也照样记录，报告里必须显示原因）。 */
  regressions: string[];
}

/** 需要逐个比较的 token 指标（不比较「token 合计」：合计相等掩盖分项减少）。 */
const TOKEN_METRICS = ["input", "output", "cacheRead", "cacheCreation"] as const;

/** 需要逐个桶比较的维度；**每个桶独立比较，绝不跨桶求和**。 */
const DIMENSION_BUCKETS = [
  "models",
  "providers",
  "agents",
  "entryPaths",
  "categories",
  "modelCategories",
] as const;

const describeLoss = (before: ModelStats, after: ModelStats): string[] => {
  const diffs: string[] = [];
  if (after.count < before.count) diffs.push(`count ${before.count}→${after.count}`);
  if (after.cost < before.cost) diffs.push(`cost ${before.cost}→${after.cost}`);
  for (const metric of TOKEN_METRICS) {
    if (after.tokens[metric] < before.tokens[metric]) {
      diffs.push(`${metric} ${before.tokens[metric]}→${after.tokens[metric]}`);
    }
  }
  return diffs;
};

/**
 * 覆盖前会丢掉什么。返回空数组 = 覆盖后每一项都不比现在少，可以放心写。
 *
 * 为什么不能只看 `total.count`：成本、cache 分项、agents/entryPaths 这些维度都是后加的，
 * 重建拿不到明细的维度会归零/建不出桶。只比 count 就会出现「count 一样、cost 却被清零」
 * 或「agent 桶整个消失」的静默改写——账本变少但看起来没变。
 *
 * 也**不做跨桶求和**：`A 桶少 3、B 桶多 3` 求和后总量一致，会把「桶消失」伪装成平账。
 * 只有逐项、逐桶比较才能说清「这次覆盖会动到什么」。
 */
export function detectOverwriteRisks(existing: DayStats | null, rebuilt: DayStats): string[] {
  if (existing === null) return [];
  const risks: string[] = [];
  const before = normalizeStats(existing.total);
  const after = normalizeStats(rebuilt.total);
  const totalLosses = describeLoss(before, after);
  if (totalLosses.length > 0) risks.push(`total 减少: ${totalLosses.join(", ")}`);

  for (const bucket of DIMENSION_BUCKETS) {
    const beforeBucket = (existing[bucket] ?? {}) as Record<string, ModelStats>;
    const afterBucket = (rebuilt[bucket] ?? {}) as Record<string, ModelStats>;
    for (const [name, rawBefore] of Object.entries(beforeBucket)) {
      const losses = describeLoss(normalizeStats(rawBefore), normalizeStats(afterBucket[name]));
      if (losses.length === 0) continue;
      const label = `${bucket}/${name}`;
      risks.push(
        afterBucket[name] === undefined
          ? `${label} 桶会整体消失（${losses.join(", ")}）`
          : `${label} 减少: ${losses.join(", ")}`,
      );
    }
  }
  return risks;
}

/**
 * 判定每个日期的动作。
 *
 * 保守覆盖保护：现有值的**任何一项**在重建后变少（count / cost / token 分项，
 * 或 models/providers/agents/entryPaths/categories/modelCategories 里任一已有桶的 count/cost/token），
 * 都说明这天有明细之外来源贡献过统计（历史写入路径只写聚合不写明细，或明细已被清理，
 * 或该维度当时还没写），默认只报告不覆盖；`--force` 才写，且风险原因仍进报告。
 *
 * `failedCount` 不走这个判定：它是后加维度、明细里没有可依据的证据，被抹掉就等于
 * 删证据，所以一律 `max(现有, 重建)` 保留（见下面 preservedFailed）。
 */
export function planRebuild(args: {
  rebuiltByDay: Iterable<DayStats>;
  existingByKey: Map<string, DayStats | null>;
  /** key = detailGroupKey；该日成功明细里 billable 未知的条数（缺省视为全部已知）。 */
  unknownBillableByDay?: Map<string, number>;
  force?: boolean;
}): RebuildPlanEntry[] {
  const plans: RebuildPlanEntry[] = [];
  for (const rebuilt of args.rebuiltByDay) {
    const { userId, timeKey } = rebuilt;
    const statsKey = createTokenStatsKey(userId, timeKey);
    const groupKey = detailGroupKey(userId, timeKey);
    const existing = args.existingByKey.get(groupKey) ?? null;
    const existingTotal = normalizeStats(existing?.total);
    const rebuiltTotal = normalizeStats(rebuilt.total);

    const preservedFailed = Math.max(0, existingTotal.failedCount - rebuiltTotal.failedCount);
    const merged: DayStats = preservedFailed > 0
      ? {
          ...rebuilt,
          total: { ...rebuilt.total, failedCount: rebuiltTotal.failedCount + preservedFailed },
        }
      : rebuilt;

    // 未知事实优先于覆盖保护：billable 缺失/非布尔时收费类别与成本金额都定不下来，
    // 重建值只能算临时 0，不是准确重建结果。--force 只解除「会减少现有数据」的拦截，
    // 不解除未知事实——猜一个类别写进账本比少补一天更糟。
    const unknownBillable = args.unknownBillableByDay?.get(groupKey) ?? 0;
    const blocked = unknownBillable > 0;
    const regressions = detectOverwriteRisks(existing, merged);
    const skip = blocked || (regressions.length > 0 && !args.force);

    plans.push({
      userId,
      dateKey: timeKey,
      statsKey,
      rebuilt: merged,
      existing,
      existingCalls: existingTotal.count,
      rebuiltCalls: rebuiltTotal.count,
      existingFailed: existingTotal.failedCount,
      rebuiltFailed: rebuiltTotal.failedCount,
      preservedFailed,
      unknownBillable,
      blocked,
      action: skip ? "skip" : existing === null ? "create" : "overwrite",
      regressions,
      ...(skip
        ? {
            skipReason: blocked
              ? `有 ${unknownBillable} 条成功明细的 billable 缺失或非布尔，收费类别与金额无法确定，不可重建` +
                `（--force 也不解除；先补齐明细再重建）` +
                (regressions.length > 0 ? `。此外覆盖还会减少现有数据：${regressions.join("；")}` : "")
              : `覆盖会减少现有数据（现有 ${existingTotal.count} 次 / 重建 ${rebuiltTotal.count} 次）：${regressions.join("；")}。已跳过；确认要覆盖请加 --force`,
          }
        : {}),
    });
  }
  return plans.sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.userId.localeCompare(b.userId));
}

/**
 * 备份键：`usage-backup-<userId>-<dateKey>-<unixMs>`。
 *
 * **必须在所有正常统计前缀/范围之外**，否则备份值会被读取路径当成一条真实统计：
 *   - `sumMonthBillableCost`（auth/server/budgetAlert.ts）按 `…-<yyyy-MM>` 前缀匹配后累加 `total.cost`；
 *   - `getTokenStats`（ai/token/query.ts）按 `rangeOfUser` 区间扫描，只过滤 `record.total`；
 *   - `nolo usage` 只靠「键末 10 位是日期」的正则自救，救不了上面两条。
 * 旧实现用 `createTokenStatsKey(userId, "<date>-backup-<ms>")`，键仍落在区间内 → 月成本翻倍。
 *
 * `usage-` 开头的键在字典序上大于 `token-…\uffff`，因此不在任何 `token-*` 扫描区间里
 * （明细扫描 `createTokenKey.rangeOfUser` 与日统计扫描都以上述上界收尾）。
 * 代价：删号/数据生命周期只清 `token-*` 与 `token-stats-*` 范围，备份键不在其列 → 由
 * `delete.ts` 显式按 `createUsageBackupKey.rangeOfUser` + `value.userId` 随用户删除。
 * 键的唯一真值在 `database/keys.ts` 的 `createUsageBackupKey`（本函数只是这里沿用旧名）。
 */
export function backupStatsKey(userId: string, dateKey: string, nowMs: number): string {
  return createUsageBackupKey(userId, dateKey, nowMs);
}

/**
 * 扫描明细。单账号用精确区间；`--all-users` 扫全部 `token-` 前缀。
 *
 * 内存约束：只有聚合结果进 map，明细逐条丢——明细可能几十万条，
 * 全量进内存会把 CLI 顶爆。
 */
export async function scanDetails(args: {
  db: RebuildDb;
  /** 缺省 = 跨所有账号。 */
  userId?: string;
  from?: string;
  to?: string;
}): Promise<AggregateResult & { totalScanned: number; skippedKeys: number }> {
  const range = args.userId
    ? createTokenKey.rangeOfUser(args.userId)
    : { start: TOKEN_PREFIX, end: `${TOKEN_PREFIX}\uffff` };

  const byDay = new Map<string, DayStats>();
  let totalScanned = 0;
  let skippedKeys = 0;
  let accepted = 0;
  let rejectedNonUsage = 0;
  let rejectedUnkeyed = 0;
  let missingAgent = 0;
  let unknownBillable = 0;
  const unknownBillableByDay = new Map<string, number>();

  for await (const [rawKey, value] of args.db.iterator({ gte: range.start, lte: range.end })) {
    const key = String(rawKey);
    const verdict = classifyDetailKey(key);
    if (verdict.kind === "skip") {
      skippedKeys++;
      continue;
    }
    totalScanned++;

    const record = normalizeDetailRecord(key, value);
    if (!record) {
      // 值不是用量记录（幂等标记 / 索引等）——按「非用量」排除。
      if (value && typeof value === "object" && (value as any).type === "token") rejectedUnkeyed++;
      else rejectedNonUsage++;
      continue;
    }
    // 单账号模式下 key 区间是粗筛（userId 段无边界编码），按值复核，防止把别人的用量算进来。
    if (args.userId && record.userId !== args.userId) {
      rejectedUnkeyed++;
      continue;
    }
    if (args.from && record.dateKey < args.from) continue;
    if (args.to && record.dateKey > args.to) continue;

    if (!record.agentId) missingAgent++;
    const groupKey = detailGroupKey(record.userId, record.dateKey);
    if (record.billableUnknown && !record.failed) {
      unknownBillable++;
      unknownBillableByDay.set(groupKey, (unknownBillableByDay.get(groupKey) ?? 0) + 1);
    }
    byDay.set(
      groupKey,
      applyTokenUsageToDayStats(byDay.get(groupKey) ?? null, {
        userId: record.userId,
        timeKey: record.dateKey,
        model: record.model,
        provider: record.provider,
        input_tokens: record.input,
        output_tokens: record.output,
        cost: record.cost,
        cache_read_input_tokens: record.cacheRead,
        cache_creation_input_tokens: record.cacheCreation,
        ...(record.agentId ? { agentId: record.agentId } : {}),
        ...(record.entryPath ? { entry_path: record.entryPath } : {}),
        ...(record.failed ? { status: "failed" as const } : {}),
        billingCategory: record.billable ? "platform" : "subscription",
      }),
    );
    accepted++;
  }

  return {
    byDay,
    accepted,
    rejectedNonUsage,
    rejectedUnkeyed,
    missingAgent,
    unknownBillable,
    unknownBillableByDay,
    totalScanned,
    skippedKeys,
  };
}

const readOption = (args: string[], flag: string): string | undefined => {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
};

const hasFlag = (args: string[], flag: string): boolean => args.includes(flag);

/**
 * 解析参数。`--from/--to` 的校验与窗口语义直接复用 usageCommand 的 parseUsageArgs，
 * 不另抄一份（抄一份就会在两处漂移）。
 */
export function parseRebuildArgs(args: string[]): UsageRebuildOptions {
  const base = parseUsageArgs(args);
  if (base.days !== undefined) {
    throw new Error("usage rebuild 不支持 --days：重建窗口要显式给 --from/--to（或省略表示全部历史）");
  }
  if (base.groupBy !== undefined || base.agent || base.provider || base.model) {
    throw new Error("usage rebuild 不接受 --by / --agent / --provider / --model：它只重建聚合");
  }
  return { ...base, apply: hasFlag(args, "--apply"), force: hasFlag(args, "--force") };
}

const formatInt = (value: number): string => value.toLocaleString("en-US");

const summarizeBuckets = (map: Record<string, ModelStats> | undefined): string => {
  const entries = Object.entries(map ?? {});
  if (entries.length === 0) return "{}";
  const shown = entries.slice(0, 4).map(([k, v]) => `${k}:${formatInt(normalizeStats(v).count)}`);
  return `{${shown.join(", ")}${entries.length > 4 ? `, …+${entries.length - 4}` : ""}}`;
};

const REBUILD_TEXT = [
  "用法: nolo usage rebuild [选项]",
  "",
  "  从明细计费记录（token-<userId>-<timestamp>…）重建本地日聚合 DayStats，",
  "  补回历史上缺失的 cacheRead / cacheCreation / agents / entryPaths 维度。",
  "",
  "  默认 dry-run：只打印将发生的变更，不写库。",
  "",
  "选项:",
  "  --from <date>        只重建该日期起（YYYY-MM-DD，本地日期）",
  "  --to <date>          只重建到该日期（含）",
  "  --all-users          处理本机所有账号（默认只处理当前登录账号）",
  "  --apply              真正写库（先备份原值）",
  "  --force              允许覆盖「现有调用数 > 重建值」的日期",
  "  --json               输出 JSON",
  "  -h, --help           显示本帮助",
  "",
  "说明:",
  "  · 重建只依赖明细。某天现有 total.calls 大于重建值时，说明该天有明细之外的来源，",
  "    默认跳过并在报告里逐条列出「现有 N / 重建 M」。",
  "  · 现有 failedCount 高于重建值时会保留现有值（失败记录是后加维度，旧数据无明细可依）。",
].join("\n");

export interface RebuildReport {
  scope: "user" | "all";
  userId: string;
  applied: boolean;
  force: boolean;
  window: { from?: string; to?: string };
  scanned: {
    detailCandidates: number;
    skippedNonUserKeys: number;
    accepted: number;
    rejectedNonUsage: number;
    rejectedUnkeyed: number;
    missingAgent: number;
    /** 成功明细里 billable 未知的条数（这些日期不可重建）。 */
    unknownBillable: number;
  };
  days: Array<{
    userId: string;
    dateKey: string;
    action: RebuildPlanEntry["action"];
    existingCalls: number;
    rebuiltCalls: number;
    existingFailed: number;
    rebuiltFailed: number;
    preservedFailed: number;
    existingCacheRead: number;
    rebuiltCacheRead: number;
    existingCacheCreation: number;
    rebuiltCacheCreation: number;
    existingAgents: string[];
    rebuiltAgents: string[];
    /** 成功明细里 billable 未知的条数；> 0 表示该日不可重建。 */
    unknownBillable: number;
    blocked: boolean;
    /** --force 覆盖时仍保留的风险原因（默认跳过的原因写在 skipReason）。 */
    regressions?: string[];
    skipReason?: string;
  }>;
  written: number;
  skipped: number;
  backups: Array<{ userId: string; dateKey: string; backupKey: string; hadOriginal: boolean }>;
}

function buildReport(args: {
  plans: RebuildPlanEntry[];
  scan: Awaited<ReturnType<typeof scanDetails>>;
  userId: string;
  allUsers: boolean;
  options: UsageRebuildOptions;
  window: { from?: string; to?: string };
  backups: RebuildReport["backups"];
  applied: boolean;
}): RebuildReport {
  const days = args.plans.map((plan) => {
    const existingTotal = normalizeStats(plan.existing?.total);
    const rebuiltTotal = normalizeStats(plan.rebuilt.total);
    return {
      userId: plan.userId,
      dateKey: plan.dateKey,
      action: plan.action,
      existingCalls: plan.existingCalls,
      rebuiltCalls: plan.rebuiltCalls,
      existingFailed: plan.existingFailed,
      rebuiltFailed: plan.rebuiltFailed,
      preservedFailed: plan.preservedFailed,
      existingCacheRead: existingTotal.tokens.cacheRead,
      rebuiltCacheRead: rebuiltTotal.tokens.cacheRead,
      existingCacheCreation: existingTotal.tokens.cacheCreation,
      rebuiltCacheCreation: rebuiltTotal.tokens.cacheCreation,
      existingAgents: Object.keys(plan.existing?.agents ?? {}),
      rebuiltAgents: Object.keys(plan.rebuilt.agents ?? {}),
      unknownBillable: plan.unknownBillable,
      blocked: plan.blocked,
      ...(plan.regressions.length > 0 ? { regressions: plan.regressions } : {}),
      ...(plan.skipReason ? { skipReason: plan.skipReason } : {}),
    };
  });

  return {
    scope: args.allUsers ? "all" : "user",
    userId: args.userId,
    applied: args.applied,
    force: args.options.force === true,
    window: args.window,
    scanned: {
      detailCandidates: args.scan.totalScanned,
      skippedNonUserKeys: args.scan.skippedKeys,
      accepted: args.scan.accepted,
      rejectedNonUsage: args.scan.rejectedNonUsage,
      rejectedUnkeyed: args.scan.rejectedUnkeyed,
      missingAgent: args.scan.missingAgent,
      unknownBillable: args.scan.unknownBillable,
    },
    days,
    written: args.plans.filter((p) => p.action !== "skip").length,
    skipped: args.plans.filter((p) => p.action === "skip").length,
    backups: args.backups,
  };
}

function formatRebuildReport(report: RebuildReport): string {
  const lines: string[] = [];
  const scopeLabel = report.scope === "all" ? "本机所有账号" : report.userId;
  lines.push(
    `范围: ${scopeLabel}    窗口: ${report.window.from ?? "最早"} → ${report.window.to ?? "今天"}`,
  );
  lines.push(
    `明细: 候选 ${formatInt(report.scanned.detailCandidates)} 条（收下 ${formatInt(report.scanned.accepted)}，` +
      `非用量 ${formatInt(report.scanned.rejectedNonUsage)}，取不到 userId/日期 ${formatInt(report.scanned.rejectedUnkeyed)}）`,
  );
  if (report.scanned.missingAgent > 0) {
    lines.push(
      `注意: 有 ${formatInt(report.scanned.missingAgent)} 条明细没有 agentId/cybotId，这些用量不会进 agents 维度。`,
    );
  }
  if (report.scanned.unknownBillable > 0) {
    lines.push(
      `注意: 有 ${formatInt(report.scanned.unknownBillable)} 条成功明细的 billable 缺失或不是布尔值，` +
        `收费类别与金额无法确定 —— 这些日期不可重建（--force 也不解除；补齐明细后再重建）。`,
    );
  }
  if (report.days.length === 0) {
    lines.push("");
    lines.push("所选窗口内没有可重建的明细。");
    return lines.join("\n");
  }

  lines.push("");
  lines.push(report.applied ? "变更（已写入）:" : "变更（dry-run，未写库；加 --apply 才会写）:");
  for (const day of report.days) {
    const head = `  ${day.dateKey}  ${day.userId}`;
    if (day.blocked) {
      lines.push(
        `${head}  不可重建 —— ${formatInt(day.unknownBillable)} 条成功明细的 billable 未知；` +
          `收费类别/金额无法确定，重建值不算准确结果，故不写库（--force 也不覆盖）`,
      );
      if (day.skipReason) lines.push(`      ${day.skipReason}`);
      continue;
    }
    if (day.action === "skip") {
      lines.push(`${head}  跳过 —— 现有 ${formatInt(day.existingCalls)} / 重建 ${formatInt(day.rebuiltCalls)} 次调用`);
      if (day.skipReason) lines.push(`      ${day.skipReason}`);
      continue;
    }
    lines.push(
      `${head}  ${day.action === "create" ? "新建" : "覆盖"}` +
        `  调用 ${formatInt(day.existingCalls)} → ${formatInt(day.rebuiltCalls)}` +
        `  缓存读 ${formatInt(day.existingCacheRead)} → ${formatInt(day.rebuiltCacheRead)}` +
        `  缓存写 ${formatInt(day.existingCacheCreation)} → ${formatInt(day.rebuiltCacheCreation)}`,
    );
    lines.push(
      `      agent 桶 ${day.existingAgents.length} → ${day.rebuiltAgents.length}` +
        (day.rebuiltAgents.length > 0 ? `（${day.rebuiltAgents.slice(0, 4).join(", ")}${day.rebuiltAgents.length > 4 ? ", …" : ""}）` : ""),
    );
    if (day.preservedFailed > 0) {
      lines.push(
        `      保留现有 failedCount: 现有 ${formatInt(day.existingFailed)} / 重建 ${formatInt(day.rebuiltFailed)}（保留 ${formatInt(day.preservedFailed)}）`,
      );
    }
    if (day.regressions && day.regressions.length > 0) {
      lines.push(`      ⚠ 强制覆盖会让现有数据变少: ${day.regressions.join("；")}`);
    }
  }

  lines.push("");
  lines.push(`合计: 待写 ${formatInt(report.written)} 天，跳过 ${formatInt(report.skipped)} 天`);
  const blockedDays = report.days.filter((day) => day.blocked).length;
  if (blockedDays > 0) {
    lines.push(`其中 billable 未知不可重建 ${formatInt(blockedDays)} 天（临时 0 不作为准确重建结果，未写库）`);
  }
  if (report.applied) {
    const withOriginal = report.backups.filter((b) => b.hadOriginal).length;
    lines.push(`已写入 ${formatInt(report.written)} 个日聚合键；备份 ${formatInt(withOriginal)} 个原值键`);
    if (withOriginal > 0) {
      lines.push("回滚：把 backup-* 键的值写回对应日聚合键即可。");
    }
  } else if (report.skipped > 0) {
    lines.push("被跳过的日期说明该天存在明细之外的来源；确认后可用 --force 覆盖。");
  }
  return lines.join("\n");
}

export interface RebuildDeps {
  env: EnvLike;
  output?: { write: (text: string) => void };
  errorOutput?: { write: (text: string) => void };
  db?: RebuildDb;
  userId?: string;
  /** 备份键里的 unixMs；测试注入固定值。 */
  nowMs?: () => number;
}

async function resolveRebuildUserId(env: EnvLike): Promise<string> {
  // 与写入侧/读侧共用同一个解析函数：自建路径会导致「重建到 A 桶、usage 读 B 桶」。
  const { resolveLocalUserId } = await import("./client/cliAgentConfigHelpers");
  return resolveLocalUserId(env);
}

/**
 * 命令入口。
 *
 * 返回码：0 = 成功（含 dry-run）；1 = 参数/读库错误；2 = 备份失败（整体中止，未写任何统计）。
 */
export async function runUsageRebuildCommand(
  args: string[],
  deps: RebuildDeps,
): Promise<number> {
  const output = deps.output ?? process.stdout;
  const errorOutput = deps.errorOutput ?? process.stderr;

  if (hasFlag(args, "-h") || hasFlag(args, "--help")) {
    output.write(`${REBUILD_TEXT}\n`);
    return 0;
  }

  let options: UsageRebuildOptions;
  const window: { from?: string; to?: string } = {};
  try {
    options = parseRebuildArgs(args);
    // 有 from/to 才收窄窗口；都没给就是「全部历史」——重建的整个目的就是补历史，
    // 默认 30 天窗口会让用户以为补完了、实际上昨天以前的都被静默忽略。
    if (options.from !== undefined || options.to !== undefined) {
      const resolved = resolveDateWindow(options);
      window.from = resolved.from;
      window.to = resolved.to;
    }
  } catch (error) {
    errorOutput.write(`[nolo] ${error instanceof Error ? error.message : String(error)}\n`);
    errorOutput.write(`${REBUILD_TEXT}\n`);
    return 1;
  }

  const userId = deps.userId?.trim() || (await resolveRebuildUserId(deps.env));
  const allUsers = options.allUsers === true;
  const nowMs = deps.nowMs ?? (() => Date.now());

  let db: RebuildDb;
  try {
    db = deps.db ?? (await getDefaultCliLocalRuntimeDb());
  } catch (error) {
    errorOutput.write(
      `[nolo] 打开本地库失败: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 1;
  }

  let scan: Awaited<ReturnType<typeof scanDetails>>;
  try {
    scan = await scanDetails({
      db,
      userId: allUsers ? undefined : userId,
      from: window.from,
      to: window.to,
    });
  } catch (error) {
    errorOutput.write(
      `[nolo] 扫描明细失败: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 1;
  }

  // 先读全部现有值（供对比/备份），一 key 一次 get。
  const existingByKey = new Map<string, DayStats | null>();
  for (const rebuilt of scan.byDay.values()) {
    const statsKey = createTokenStatsKey(rebuilt.userId, rebuilt.timeKey);
    let existing: DayStats | null = null;
    try {
      const raw = await db.get(statsKey);
      existing = raw && typeof raw === "object" ? (raw as DayStats) : null;
    } catch (error) {
      // 只有**明确的 not-found** 才能当「不存在」。其它读故障（EIO/权限/值解析）一律停下：
      // 当成不存在会把动作降级为 create —— 既不备份、又绕过 over-count 守卫，直接覆盖真值。
      // 这里在读阶段就返回，因此后面一条统计都不会写。
      if (!isLevelNotFoundError(error)) {
        const reason = error instanceof Error ? error.message : String(error);
        errorOutput.write(`[nolo] 读取现有日聚合失败（${statsKey}）: ${reason}\n`);
        errorOutput.write(`[nolo] 无法确认该键是否真的不存在，已中止；本次未写入任何日聚合。\n`);
        return 1;
      }
      existing = null;
    }
    existingByKey.set(detailGroupKey(rebuilt.userId, rebuilt.timeKey), existing);
  }

  const plans = planRebuild({
    rebuiltByDay: scan.byDay.values(),
    existingByKey,
    unknownBillableByDay: scan.unknownBillableByDay,
    force: options.force === true,
  });

  const writable = plans.filter((plan) => plan.action !== "skip");
  const backups: RebuildReport["backups"] = [];
  let writeError = 0;

  if (options.apply) {
    const stamp = nowMs();
    const backupOps: Array<{ type: "put"; key: string; value: unknown }> = [];
    for (const plan of writable) {
      const backupKey = backupStatsKey(plan.userId, plan.dateKey, stamp);
      backups.push({
        userId: plan.userId,
        dateKey: plan.dateKey,
        backupKey,
        hadOriginal: plan.existing !== null,
      });
      if (plan.existing !== null) {
        backupOps.push({ type: "put", key: backupKey, value: plan.existing });
      }
    }

    // 备份是**独立一批**先落库：备份批失败时一条统计都不写（不能出现「写了但没备份」）。
    if (backupOps.length > 0) {
      try {
        await writeRebuildOps(db, backupOps);
      } catch (error) {
        errorOutput.write(
          `[nolo] 备份原值失败，已整体中止、未写入任何日聚合: ${error instanceof Error ? error.message : String(error)}\n`,
        );
        return 2;
      }
    }

    const statsOps = writable.map((plan) => ({
      type: "put" as const,
      key: plan.statsKey,
      value: plan.rebuilt,
    }));
    if (statsOps.length > 0) {
      try {
        await writeRebuildOps(db, statsOps);
      } catch (error) {
        errorOutput.write(
          `[nolo] 写入日聚合失败: ${error instanceof Error ? error.message : String(error)}\n`,
        );
        errorOutput.write(`[nolo] 原值已备份到 usage-backup-* 键，可回滚。\n`);
        writeError = 1;
      }
    }
  }

  const report = buildReport({
    plans,
    scan,
    userId,
    allUsers,
    options,
    window,
    backups,
    applied: options.apply === true && writeError === 0,
  });

  if (options.json) {
    output.write(`${JSON.stringify(report, null, 2)}\n`);
    return writeError;
  }
  if (allUsers) output.write("范围: 本机所有账号\n");
  output.write(`${formatRebuildReport(report)}\n`);
  return writeError;
}

/** 便于报告/调试：某个日聚合在重建后的维度摘要。 */
export function describeDayStats(stats: DayStats): string {
  const total = normalizeStats(stats.total);
  return (
    `calls=${total.count} failed=${total.failedCount} ` +
    `cacheRead=${total.tokens.cacheRead} cacheCreation=${total.tokens.cacheCreation} ` +
    `models=${summarizeBuckets(stats.models)} agents=${summarizeBuckets(stats.agents)}`
  );
}
