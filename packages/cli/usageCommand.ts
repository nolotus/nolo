/**
 * usageCommand.ts — `nolo usage`
 *
 * 读取本地 DayStats 聚合（`token-stats-day-user-<userId>-<date>`），按维度汇总
 * 调用次数 / 输入 / 输出 / 缓存命中 / 缓存写入 / 费用。
 *
 * 为什么必须走 LevelDB iterator 而不是日志扫描：
 * 日聚合记录会随 compaction 落入 `.ldb`（SSTable，压缩块），按文本扒日志只能读到
 * 未压缩 `.log` 里的最近一两天，历史用量因此事实上查不了。iterator 读的是逻辑
 * key 空间，覆盖 .log + .ldb 全量。
 *
 * 数据维度（DayStats，见 ai/token/applyTokenUsageToDayStats.ts）：
 *   - total        当天合计
 *   - models       按模型
 *   - providers    按 provider
 *   - agents       按 agent（缺失时归 "unknown"）
 *   - entryPaths   按入口路径
 *
 * 注意：`cacheRead` / `cacheCreation` 为 0 有两种含义——「真没命中」或「该写入路径
 * 没记」，历史数据无法回溯区分；新数据在补齐写入路径后为真实读数。
 */

import { format } from "date-fns";
import { createTokenStatsKey } from "database/keys";
import type { DayStats, ModelStats } from "ai/token/applyTokenUsageToDayStats";
import { normalizeStats } from "ai/token/applyTokenUsageToDayStats";
import { getDefaultCliLocalRuntimeDb } from "./localRuntimeDb";
import type { EnvLike } from "./cliEnvHelpers";

/** 汇总维度。 */
type GroupBy = "day" | "provider" | "model" | "agent" | "entry";

export interface UsageCommandOptions {
  /** 相对天数窗口（含今天）。与 from/to 互斥。 */
  days?: number;
  /** 起始日期 YYYY-MM-DD（本地日期）。 */
  from?: string;
  /** 结束日期 YYYY-MM-DD（本地日期，含）。 */
  to?: string;
  /** 汇总维度；默认 provider。 */
  groupBy?: GroupBy;
  /** 只看某个 agent（按 agentId 精确匹配）。 */
  agent?: string;
  /** 只统计指定 provider。 */
  provider?: string;
  /** 只统计指定 model。 */
  model?: string;
  /**
   * 跨本地所有账号汇总。
   *
   * 本机 LevelDB 可能同时存着多个账号的日聚合（真实登录用户 + 共享/切换过的
   * 账号，实测本机就存在两个 userId 的桶）。默认只读当前登录账号，否则
   * 「我本地跑了多少」会把别人的用量算进来；显式传 --all-users 才合并。
   */
  allUsers?: boolean;
  /** JSON 输出。 */
  json?: boolean;
}

/** 单个维度的汇总。 */
export interface UsageBucket {
  calls: number;
  failedCalls: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
  cost: number;
}

export interface UsageSummary {
  from: string;
  to: string;
  daysWithData: number;
  total: UsageBucket;
  groups: Record<string, UsageBucket>;
  /** 过滤维度与分组维度不同、且分组不是 day 时为 true：只给 total，不给分解。 */
  breakdownUnavailable?: boolean;
  /** 实际生效的过滤维度（多于一个过滤项时取 agent > provider > model）。 */
  filterDimension?: GroupBy;
  /** 实际生效的分组维度。 */
  groupBy?: GroupBy;
  /**
   * 单账号模式下、本机还存在几个别的账号桶。
   *
   * 默认只读当前账号是正确的（不把别人的用量算进自己账上），但**静默**会让人
   * 以为数据没了。这个数只在输出里提示存在性，不参与任何金额计算。
   */
  otherUserBuckets?: number;
}

const emptyBucket = (): UsageBucket => ({
  calls: 0,
  failedCalls: 0,
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheCreation: 0,
  cost: 0,
});

const addBucket = (target: UsageBucket, source: ModelStats): void => {
  const s = normalizeStats(source);
  target.calls += s.count;
  target.failedCalls += s.failedCount;
  target.input += s.tokens.input;
  target.output += s.tokens.output;
  target.cacheRead += s.tokens.cacheRead;
  target.cacheCreation += s.tokens.cacheCreation;
  target.cost += s.cost;
};

const readOption = (args: string[], flag: string): string | undefined => {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
};

const hasFlag = (args: string[], flag: string): boolean => args.includes(flag);

/**
 * 解析命令行参数。
 *
 * 日期一律按本地时区（与写入侧 `date-fns/format(timestamp, "yyyy-MM-dd")` 一致）；
 * 不要按 UTC 解析，否则东八区凌晨的记录会落到前一天。
 */
export function parseUsageArgs(args: string[]): UsageCommandOptions {
  const options: UsageCommandOptions = {};

  const daysRaw = readOption(args, "--days");
  if (daysRaw !== undefined) {
    const parsed = Number.parseInt(daysRaw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`--days 必须是正整数，收到 ${JSON.stringify(daysRaw)}`);
    }
    options.days = parsed;
  }

  const from = readOption(args, "--from");
  const to = readOption(args, "--to");
  if (from !== undefined) options.from = normalizeDateArg(from, "--from");
  if (to !== undefined) options.to = normalizeDateArg(to, "--to");
  if (options.from && options.to && options.from > options.to) {
    throw new Error(`--from (${options.from}) 不能晚于 --to (${options.to})`);
  }

  const groupRaw = readOption(args, "--by") ?? readOption(args, "--group-by");
  if (groupRaw !== undefined) {
    const normalized = groupRaw.trim().toLowerCase();
    const allowed: GroupBy[] = ["day", "provider", "model", "agent", "entry"];
    if (!allowed.includes(normalized as GroupBy)) {
      throw new Error(`--by 只支持 ${allowed.join(" / ")}，收到 ${JSON.stringify(groupRaw)}`);
    }
    options.groupBy = normalized as GroupBy;
  }

  const agent = readOption(args, "--agent");
  if (agent !== undefined) options.agent = agent.trim();
  const provider = readOption(args, "--provider");
  if (provider !== undefined) options.provider = provider.trim();
  const model = readOption(args, "--model");
  if (model !== undefined) options.model = model.trim();

  // 空串不能静默当成「没传」：用户写了 --agent "" 就是想过滤，静默忽略会给出全量数字。
  for (const [flag, value] of [
    ["--agent", agent],
    ["--provider", provider],
    ["--model", model],
  ] as const) {
    if (value !== undefined && !value.trim()) {
      throw new Error(`${flag} 需要非空值`);
    }
  }

  // 多个过滤项无法求交集：DayStats 只有各维度独立的边际合计，没有交叉表。
  // 悄悄只用一个会把别的用量算进来，且用户看不出。
  const filterCount = [
    options.agent !== undefined,
    options.provider !== undefined,
    options.model !== undefined,
  ].filter(Boolean).length;
  if (filterCount > 1) {
    throw new Error(
      "--agent / --provider / --model 只能同时给一个：日聚合没有交叉表，多个过滤项无法求交集",
    );
  }

  // --days 与 --from/--to 是两种互斥的窗口表达；同时给会让 --days 被静默忽略。
  if (options.days !== undefined && (options.from !== undefined || options.to !== undefined)) {
    throw new Error("--days 与 --from/--to 互斥，只能给一种");
  }

  options.allUsers = hasFlag(args, "--all-users");

  options.json = hasFlag(args, "--json");
  return options;
}

function normalizeDateArg(value: string, flag: string): string {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`${flag} 需要 YYYY-MM-DD，收到 ${JSON.stringify(value)}`);
  }
  return trimmed;
}

/** 把 options 收敛成闭区间 [from, to]（本地日期）。 */
export function resolveDateWindow(options: UsageCommandOptions, now = new Date()): { from: string; to: string } {
  const today = format(now, "yyyy-MM-dd");
  const to = options.to ?? today;
  if (options.from) return { from: options.from, to };
  const days = options.days ?? 30;
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  return { from: format(start, "yyyy-MM-dd"), to };
}

const groupKeyFor = (stats: DayStats, groupBy: GroupBy, dateKey: string): Record<string, ModelStats> => {
  switch (groupBy) {
    case "day":
      return { [dateKey]: stats.total };
    case "provider":
      return stats.providers ?? {};
    case "model":
      return stats.models ?? {};
    case "agent":
      return stats.agents ?? {};
    case "entry":
      return stats.entryPaths ?? {};
  }
};

/**
 * 从若干条 DayStats 汇总成 UsageSummary（纯函数，测试直接注入数据）。
 *
 * 过滤语义（重要）：DayStats 只存**各自独立的边际合计**——`models` / `providers` /
 * `agents` / `entryPaths` 各一份，没有「agent × provider」这类交叉表。因此：
 *   - 过滤维度与分组维度相同（`--agent X --by agent`）→ 精确；
 *   - 分组维度是 `day` → 每条记录本身就是一个日期，取该日的过滤桶即精确；
 *   - 其余组合（如 `--agent X --by provider`）**原理上无法精确拆分**：
 *     当日 provider 桶里混着别的 agent 的用量。此时只给精确的 total，
 *     不给分组，并在结果里标记 `breakdownUnavailable`，绝不编一份看着像真的分解。
 */
export function summarizeUsage(
  records: ReadonlyArray<{ dateKey: string; stats: DayStats }>,
  options: UsageCommandOptions,
): UsageSummary {
  const groupBy: GroupBy = options.groupBy ?? "provider";
  const total = emptyBucket();
  const groups: Record<string, UsageBucket> = {};
  // 数「有数据的天数」，不是记录条数：--all-users 时同一天可能有多个账号桶。
  const datesWithData = new Set<string>();

  const filterDimension: GroupBy | undefined = options.agent
    ? "agent"
    : options.provider
      ? "provider"
      : options.model
        ? "model"
        : undefined;

  if (filterDimension) {
    const wanted = (options.agent ?? options.provider ?? options.model ?? "").trim();
    // 只有「过滤维度 == 分组维度」或「按天分组」时，边际合计才足以精确拆分。
    const canBreakdown = groupBy === "day" || groupBy === filterDimension;
    for (const record of records) {
      const buckets = groupKeyFor(record.stats, filterDimension, record.dateKey);
      const matched = buckets[wanted];
      if (!matched) continue;
      datesWithData.add(record.dateKey);
      addBucket(total, matched);
      if (!canBreakdown) continue;
      if (groupBy === "day") {
        // 一条记录就是一个日期：该日的过滤桶即精确切分。
        addBucket((groups[record.dateKey] ??= emptyBucket()), matched);
      } else {
        addBucket((groups[wanted] ??= emptyBucket()), matched);
      }
    }
    return {
      from: options.from ?? "",
      to: options.to ?? "",
      daysWithData: datesWithData.size,
      total,
      groups,
      breakdownUnavailable: !canBreakdown,
      filterDimension,
      groupBy,
    };
  }

  for (const record of records) {
    datesWithData.add(record.dateKey);
    addBucket(total, record.stats.total);
    for (const [name, bucket] of Object.entries(groupKeyFor(record.stats, groupBy, record.dateKey))) {
      addBucket((groups[name] ??= emptyBucket()), bucket);
    }
  }
  return {
    from: options.from ?? "",
    to: options.to ?? "",
    daysWithData: datesWithData.size,
    total,
    groups,
    groupBy,
  };
}

/** 统计本机有哪些账号桶（只用于提示，不参与计算）。 */
export async function countUserBuckets(args: {
  db: Awaited<ReturnType<typeof getDefaultCliLocalRuntimeDb>>;
}): Promise<Set<string>> {
  const users = new Set<string>();
  const prefix = "token-stats-day-user-";
  let seen = 0;
  for await (const [key] of args.db.iterator({ gte: prefix, lte: `${prefix}\uffff` })) {
    const rest = String(key).slice(prefix.length);
    // 键尾是 10 位日期，前面是 userId（可能自身含 '-'）。
    if (rest.length <= 11) continue;
    users.add(rest.slice(0, rest.length - 11));
    // 只需知道个数，扫到一定量即可停止，避免把整库拉进来。
    if (++seen >= 5000) break;
  }
  return users;
}

/** 本地 LevelDB 里按用户 + 日期窗口读取 DayStats。 */
export async function readLocalDayStats(args: {
  db: Awaited<ReturnType<typeof getDefaultCliLocalRuntimeDb>>;
  /** 缺省表示跨所有本地账号。 */
  userId?: string;
  from: string;
  to: string;
}): Promise<Array<{ dateKey: string; stats: DayStats }>> {
  const out: Array<{ dateKey: string; stats: DayStats }> = [];
  // 所有账号的键都在 `token-stats-day-user-` 前缀下，日期是键的最后 10 位。
  // 跨账号时不能按 createTokenStatsKey(userId, date) 收窄（会漏掉别的账号），
  // 只能扫前缀再按日期后缀过滤；单账号时用精确区间，避免把别人扫进来。
  const startKey = args.userId ? createTokenStatsKey(args.userId, args.from) : "token-stats-day-user-";
  const endKey = args.userId ? createTokenStatsKey(args.userId, args.to) : "token-stats-day-user-\uffff";
  for await (const [key, value] of args.db.iterator({ gte: startKey, lte: endKey })) {
    if (!value || typeof value !== "object") continue;
    // 只认「用户日期」这条主键，跳过同前缀下的幂等标记等旁支记录。
    if (typeof (value as DayStats).total !== "object") continue;
    const dateKey = String(key).slice(String(key).length - 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    if (dateKey < args.from || dateKey > args.to) continue;
    out.push({ dateKey, stats: value as DayStats });
  }
  return out.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

const formatInt = (value: number): string => value.toLocaleString("en-US");

/** 表格输出（窄屏友好：每行一个维度，不画宽表）。 */
export function formatUsageSummary(summary: UsageSummary, options: UsageCommandOptions): string {
  const lines: string[] = [];
  const groupBy = options.groupBy ?? "provider";
  lines.push(`窗口: ${summary.from} → ${summary.to}（有数据 ${summary.daysWithData} 天）`);
  const t = summary.total;
  const cacheRate = t.input > 0 ? ((t.cacheRead / t.input) * 100).toFixed(1) : "—";
  // 回显生效的过滤条件：不回显时用户得自己记住用过哪个 --agent/--provider/--model，
  // 拿错数字也看不出来。
  if (summary.filterDimension) {
    const filters = [options.agent, options.provider, options.model].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    lines.push(`过滤: ${summary.filterDimension} = ${filters[0]}`);
  }
  if (summary.otherUserBuckets && summary.otherUserBuckets > 0) {
    lines.push(`另有 ${summary.otherUserBuckets} 个账号桶未计入（用 --all-users 合并）`);
  }
  lines.push(
    `合计: 调用 ${formatInt(t.calls)} 次` +
      (t.failedCalls > 0 ? `（失败 ${formatInt(t.failedCalls)}）` : "") +
      ` / 输入 ${formatInt(t.input)} / 输出 ${formatInt(t.output)}`,
  );
  lines.push(
    `     缓存命中 ${formatInt(t.cacheRead)}（${cacheRate}%）/ 缓存写入 ${formatInt(t.cacheCreation)} / 费用 ${t.cost.toFixed(6)}`,
  );

  const entries = Object.entries(summary.groups).sort((a, b) => b[1].input - a[1].input);
  if (entries.length === 0) {
    lines.push("");
    // 过滤维度与分组维度不同：DayStats 没有交叉表，原理上拆不出来。
    if (summary.breakdownUnavailable) {
      lines.push(
        `按 ${summary.filterDimension} 过滤、又要求按 ${summary.groupBy} 分解：日聚合只有各维度的独立合计，没有交叉表，无法精确拆分。`,
      );
      lines.push("上面合计是精确的；要分解请把 --by 改成与过滤维度一致（或改用 --by day）。");
      return lines.join("\n");
    }
    // 合计有量但该维度为空 = 历史记录由尚未写入该维度的旧路径产生，不是「完全没有用量」。
    // 两者混为一谈会让人误判账本丢了数据。
    if (t.calls > 0) {
      lines.push(`该维度在所选窗口内没有记录：合计的 ${formatInt(t.calls)} 次调用来自未写入 ${groupBy} 维度的旧记录。`);
      lines.push("（缓存字段同理：历史日聚合没有 cacheRead/cacheCreation，新记录才会带上。）");
    } else {
      lines.push("所选窗口内无用量记录。");
    }
    return lines.join("\n");
  }

  lines.push("");
  lines.push(`按 ${groupBy} 分组:`);
  for (const [name, bucket] of entries) {
    const rate = bucket.input > 0 ? ((bucket.cacheRead / bucket.input) * 100).toFixed(1) : "—";
    lines.push(
      `  ${name}` +
        `  调用 ${formatInt(bucket.calls)}` +
        `  输入 ${formatInt(bucket.input)}` +
        `  输出 ${formatInt(bucket.output)}` +
        `  缓存 ${formatInt(bucket.cacheRead)}（${rate}%）` +
        (bucket.cost > 0 ? `  费用 ${bucket.cost.toFixed(6)}` : ""),
    );
  }
  return lines.join("\n");
}

const USAGE_TEXT = [
  "用法: nolo usage [选项]",
  "",
  "  从本地 LevelDB 日聚合（token-stats-day-user-*）汇总用量。",
  "  走 iterator 读取，覆盖已 compaction 进 .ldb 的历史记录。",
  "",
  "选项:",
  "  --days <n>           最近 n 天（默认 30）",
  "  --from <date>        起始日期 YYYY-MM-DD",
  "  --to <date>          结束日期 YYYY-MM-DD（含）",
  "  --by <dim>           day | provider | model | agent | entry（默认 provider）",
  "  --agent <agentId>    只看某个 agent",
  "  --provider <name>    只看某个 provider",
  "  --model <id>         只看某个 model",
  "  --all-users          合并本机所有账号的统计（默认只看当前登录账号）",
  "  --json               输出 JSON",
  "  -h, --help           显示本帮助",
  "",
  "子命令:",
  "  rebuild              从明细重建日聚合（补回 cache / agents 维度，默认 dry-run）",
  "                       见 `nolo usage rebuild --help`",
].join("\n");

/**
 * 命令入口。
 *
 * userId 来源：登录态（token 里的 userId）优先；未登录时退回 `local`
 * （CLI 本地 run 在无登录态时写入 `token-stats-day-user-local-*`）。
 */
export async function runUsageCommand(
  args: string[],
  deps: {
    env: EnvLike;
    output?: { write: (text: string) => void };
    errorOutput?: { write: (text: string) => void };
    db?: Awaited<ReturnType<typeof getDefaultCliLocalRuntimeDb>>;
    userId?: string;
  },
): Promise<number> {
  const output = deps.output ?? process.stdout;
  const errorOutput = deps.errorOutput ?? process.stderr;

  // 子命令分发：`nolo usage rebuild …`（从明细重建日聚合）。
  // 必须放在 usage 自己的 help / 参数解析之前：rebuild 的 `--from/--apply/--force`
  // 与 usage 的过滤项语义不同，先走 usage 的解析器会把它们按 usage 的规则判成非法组合。
  if (args[0] === "rebuild") {
    const { runUsageRebuildCommand } = await import("./usageRebuildCommand");
    return runUsageRebuildCommand(args.slice(1), deps);
  }

  if (hasFlag(args, "-h") || hasFlag(args, "--help")) {
    output.write(`${USAGE_TEXT}\n`);
    return 0;
  }

  let options: UsageCommandOptions;
  const window = { from: "", to: "" };
  try {
    options = parseUsageArgs(args);
    const resolved = resolveDateWindow(options);
    window.from = resolved.from;
    window.to = resolved.to;
  } catch (error) {
    errorOutput.write(`[nolo] ${error instanceof Error ? error.message : String(error)}\n`);
    errorOutput.write(`${USAGE_TEXT}\n`);
    return 1;
  }

  const userId = deps.userId?.trim() || (await resolveUsageUserId(deps.env));

  let db: Awaited<ReturnType<typeof getDefaultCliLocalRuntimeDb>>;
  let records: Array<{ dateKey: string; stats: DayStats }>;
  let otherUserBuckets = 0;
  try {
    // 打开库也在 try 内：锁冲突/库损坏发生在 open 阶段，不能在 try 外抛裸异常。
    db = deps.db ?? (await getDefaultCliLocalRuntimeDb());
    records = await readLocalDayStats({
      db,
      // --all-users 时传 undefined：跨账号扫前缀，由日期后缀过滤窗口。
      userId: options.allUsers ? undefined : userId,
      from: window.from,
      to: window.to,
    });
    // 单账号模式顺带提示「本机还有别的账号桶」，否则用户会以为数据丢了。
    // 失败不影响主结果——这只是提示。
    if (!options.allUsers) {
      try {
        const users = await countUserBuckets({ db });
        otherUserBuckets = Math.max(0, users.size - (users.has(userId) ? 1 : 0));
      } catch {
        otherUserBuckets = 0;
      }
    }
  } catch (error) {
    // 只有「本地库不存在」才是空结果；锁冲突 / 库损坏必须报错，不能伪装成 0 用量。
    if (isLocalDbMissingError(error)) {
      records = [];
    } else {
      errorOutput.write(
        `[nolo] 读取本地用量统计失败: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      return 1;
    }
  }

  const summary = summarizeUsage(records, options);
  summary.from = window.from;
  summary.to = window.to;
  summary.otherUserBuckets = otherUserBuckets;

  if (options.json) {
    output.write(`${JSON.stringify({ userId: options.allUsers ? "all" : userId, ...summary }, null, 2)}\n`);
    return 0;
  }
  if (options.allUsers) {
    output.write("范围: 本机所有账号\n");
  }
  output.write(`${formatUsageSummary(summary, options)}\n`);
  return 0;
}

async function resolveUsageUserId(env: EnvLike): Promise<string> {
  // 必须与写入侧共用同一个解析函数：写侧（localRuntimeAdapter → resolveLocalUserId）
  // 优先看 NOLO_LOCAL_USER_ID / NOLO_USER_ID，再看 auth token。读侧自建一条路径
  // 会导致「写进了 X 桶、却去读 local 桶」，静默输出「无用量记录」——数据在库里。
  const { resolveLocalUserId } = await import("./client/cliAgentConfigHelpers");
  return resolveLocalUserId(env);
}

function isLocalDbMissingError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  if (code === "LEVEL_NOT_FOUND") return true;
  const message = error instanceof Error ? error.message : String(error);
  return /does not exist|no such file|ENOENT/i.test(message);
}
