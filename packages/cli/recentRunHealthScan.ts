// cli/recentRunHealthScan.ts
//
// `listAgents` 的旁路健康扫描：只读 `~/.nolo/runs/` 里最近的 run 主记录，投影成
// `RecentRunHealthSample`，交给纯聚合器（ai/agent/recentRunHealth）判定快败。
//
// 设计约束（任何一条都不能破）：
//   - 绝不阻塞 / 绝不抛错给 `listAgents`：目录不存在、权限不足、坏 JSON、并发写读到的
//     半截文件，全部逐项静默跳过；最外层再兜一层 try/catch 返回 `undefined`。
//   - 有界：先按 mtime 收敛到最近窗口内，再设文件数量硬上限与单次时间预算兜底，
//     目录里有几万个历史 run 也不会变成一次全量读盘。
//   - 只报当前候选里存在的 agentKey：调用方没给候选、或记录不属于候选，一律不输出，
//     避免泄露无关旧条目。
//   - 只读：不写缓存、不加锁、不改 `~/.nolo/runs/` 内任何文件。

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  aggregateRecentRunHealth,
  formatRecentRunHealthContext,
  RECENT_RUN_HEALTH_WINDOW_HOURS,
  type RecentRunHealthAlert,
  type RecentRunHealthSample,
} from "ai/agent/recentRunHealth";
import { resolveRunsDir } from "./agentRunControl";

/** 单次最多解析的 run 主记录数。 */
export const RECENT_RUN_HEALTH_MAX_FILES = 200;
/** 单次最多 stat 的目录条目数（mtime 排序需要 stat，先给 stat 也设上限）。 */
export const RECENT_RUN_HEALTH_MAX_STAT_ENTRIES = 1_000;
/** 单次扫描的时间预算（毫秒）；超预算即停止解析，用已读到的样本出结论。 */
export const RECENT_RUN_HEALTH_SCAN_BUDGET_MS = 50;

/** run 目录里的伴生文件：不是主记录，扫了只会读到无关内容（与 run 控制层同口径）。 */
const COMPANION_SUFFIXES = [".isolation.json", ".dialog.json"] as const;
const COMPANION_INFIXES = [".result."] as const;
const ACK_PREFIXES = ["acked-", "busy-ack-"] as const;

export type ScanRecentRunHealthOptions = {
  /** 当前候选 agentKey；为空/缺省时不做任何 IO（没有候选就没有可标注的对象）。 */
  agentKeys?: readonly string[];
  /** 直接指定 run 目录（测试用）；缺省按 `env.NOLO_HOME` 解析。 */
  runsDir?: string;
  env?: Record<string, string | undefined>;
  /** 参照时刻（毫秒）；缺省取 `clock()`。 */
  now?: number;
  maxFiles?: number;
  maxStatEntries?: number;
  budgetMs?: number;
  /** 可注入时钟，便于确定性测试预算分支。 */
  clock?: () => number;
};

function isRunRecordFileName(entry: string): boolean {
  if (!entry.endsWith(".json")) return false;
  if (COMPANION_SUFFIXES.some((suffix) => entry.endsWith(suffix))) return false;
  if (COMPANION_INFIXES.some((infix) => entry.includes(infix))) return false;
  if (ACK_PREFIXES.some((prefix) => entry.startsWith(prefix))) return false;
  return true;
}

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

/**
 * 扫描窗口内的 run 主记录，投影成聚合器输入。
 *
 * 只返回 `agentKeys` 候选集合内、窗口内的记录；任何读/解析失败都只是少一条样本。
 */
export function scanRecentRunHealthSamples(options: ScanRecentRunHealthOptions = {}): RecentRunHealthSample[] {
  const clock = options.clock ?? Date.now;
  const agentKeys = new Set(
    (options.agentKeys ?? [])
      .map((key) => (typeof key === "string" ? key.trim() : ""))
      .filter((key): key is string => key.length > 0),
  );
  // 没有候选 = 没有可标注对象；直接返回，避免为一次空列表去读盘。
  if (agentKeys.size === 0) return [];

  const nowMs = typeof options.now === "number" && Number.isFinite(options.now) ? options.now : clock();
  const sinceMs = nowMs - RECENT_RUN_HEALTH_WINDOW_HOURS * 3_600_000;
  const maxFiles = positiveInt(options.maxFiles, RECENT_RUN_HEALTH_MAX_FILES);
  const maxStatEntries = positiveInt(options.maxStatEntries, RECENT_RUN_HEALTH_MAX_STAT_ENTRIES);
  const budgetMs = positiveInt(options.budgetMs, RECENT_RUN_HEALTH_SCAN_BUDGET_MS);
  const deadline = clock() + budgetMs;

  let runsDir: string;
  try {
    runsDir = options.runsDir ?? resolveRunsDir(options.env);
  } catch {
    return [];
  }

  let entries: string[];
  try {
    entries = readdirSync(runsDir);
  } catch {
    // 目录不存在 / 不可读：静默降级，等同于「没有近期样本」。
    return [];
  }

  const recentFiles: Array<{ path: string; mtimeMs: number }> = [];
  // 先按文件名倒序：`~/.nolo/runs/` 的主记录普遍叫 `run-<ISO 时间戳>-...`，名字倒序
  // ≈ 时间倒序，于是「只 stat 前 N 个」截掉的是更旧的一端（readdir 顺序是任意的，
  // 直接按 readdir 顺序 stat 会在两万条历史里漏掉刚跑完的 run）。
  const candidates = entries.filter(isRunRecordFileName).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  for (const entry of candidates.slice(0, maxStatEntries)) {
    const path = join(runsDir, entry);
    try {
      const stat = statSync(path);
      if (!stat.isFile() || stat.mtimeMs < sinceMs) continue;
      recentFiles.push({ path, mtimeMs: stat.mtimeMs });
    } catch {
      continue;
    }
  }
  if (recentFiles.length === 0) return [];
  // mtime 倒序：最新的 run 先读，文件上限截断时丢的是更旧的一端。
  recentFiles.sort((a, b) => b.mtimeMs - a.mtimeMs);

  const samples: RecentRunHealthSample[] = [];
  for (const file of recentFiles.slice(0, maxFiles)) {
    if (clock() > deadline) break;
    try {
      const parsed = JSON.parse(readFileSync(file.path, "utf8")) as Record<string, unknown> | null;
      if (!parsed || typeof parsed !== "object") continue;
      const agentKey = typeof parsed.agentKey === "string" ? parsed.agentKey : "";
      if (!agentKeys.has(agentKey)) continue;
      if (typeof parsed.status !== "string" || typeof parsed.startedAt !== "string") continue;
      samples.push({
        agentKey,
        status: parsed.status,
        startedAt: parsed.startedAt,
        endedAt: typeof parsed.endedAt === "string" ? parsed.endedAt : undefined,
        toolCallCount: typeof parsed.toolCallCount === "number" ? parsed.toolCallCount : undefined,
      });
    } catch {
      continue;
    }
  }
  return samples;
}

/** 扫描 + 聚合：拿到候选级告警（供测试与其它只读消费者使用）。 */
export function scanRecentRunHealthAlerts(options: ScanRecentRunHealthOptions = {}): RecentRunHealthAlert[] {
  try {
    const now = typeof options.now === "number" && Number.isFinite(options.now)
      ? options.now
      : (options.clock ?? Date.now)();
    return aggregateRecentRunHealth(scanRecentRunHealthSamples(options), { now });
  } catch {
    return [];
  }
}

/**
 * `listAgents` 用的最终文本：无告警时返回 `undefined`（字段完全省略）。
 * 任何失败路径都返回 `undefined`，绝不会把异常抛给列表命令。
 */
export function resolveRecentRunHealthContext(options: ScanRecentRunHealthOptions = {}): string | undefined {
  try {
    return formatRecentRunHealthContext(scanRecentRunHealthAlerts(options));
  } catch {
    return undefined;
  }
}
