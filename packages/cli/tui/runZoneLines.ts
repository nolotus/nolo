/**
 * 顶部固定运行区（fixed run zone）的逐行格式化。
 *
 * 用户需求（原话）：「agent 运行有标题，这个 running 能不能不显示在 context
 * 的旁边，而是像 agent 显示在上方，并且有标题、时间等，方便我了解。」
 *
 * 状态栏里那条 `⚙ N running` chip 只能报一个计数——它压在 `context: x%`
 * 旁边，看不出是哪个 run、跑了多久、做到哪一步。运行区把同一批活跃 run
 * 渲染成每条一行、固定在 composer 上方（banner/状态栏之间那块的顶部），
 * 每条都带「标题 · 执行者 · 已耗时 · 工具数」，一眼能扫。
 *
 * 数据仍然只走 agentRunSnapshot.ts 这一个解析器（与 transcript 卡片、run
 * detail 面板共用同一个 shape，三个界面不会对同一个 run 各说各话）。行数
 * 变化（出现/消失/折叠）经 composer 的 onInputLinesChange 既有路径重排，
 * 无 run 时返回 []——完全不占行。
 */

import { formatCreditsChip } from "../client/tokenUsage";
import type { AgentRunSnapshot } from "../client/agentRunSnapshot";
import {
  clipText,
  formatDuration,
  formatRunAge,
  isAgentRunTerminalStatus,
  shortRunId,
} from "../../ai/tools/agent/agentRunDisplayHelpers";
import { displayAgentName } from "./agentRunPanelLines";
import {
  activeInFlight,
  formatInFlightFact,
  formatUnassignedFact,
  runStatusTone,
  sanitizeRunSnapshotForNormal,
} from "./runSnapshotDisplay";
import { t } from "./i18n";
import { fitAnsiLine, visibleWidth } from "./tuiAnsi";
import { themeText } from "./theme";
import type { RemoteTaskView } from "../../core/remoteTaskView";

/**
 * 运行区同时展开的 run 行数上限；多出来的折叠成 `+N more`。
 * 与 runDock 的硬顶同值——两个面板吃的是同一块 composer 预留高度。
 */
export const RUN_ZONE_MAX_ROWS = 3;

/**
 * 运行中的 lead 图标：spec 要的是 `⚙`（沿用旧 running chip 的机器/齿轮语义），
 * 终态 run 仍用状态图标——`⚙` 挂在一个已经 done/failed 的 run 上是误导。
 */
/**
 * 远程任务证据的载体（契约 §10.2 / M3）。
 *
 * 远程任务不在本机 registry 里（`~/.nolo/runs/*.json` 没有它的记录），
 * 「它还在跑吗、花了多少、停止确认了吗」只能由控制面读通道（非模型，见
 * runRegistryPoller 的 remoteTasks 入口）送来的投影回答。这里只是读取侧
 * 关心的三个字段的结构声明，不改变 AgentRunSnapshot 本体的形状。
 */
export type RemoteTaskCarrier = {
  remoteTask?: RemoteTaskView;
  /** 末次证据到达的时刻（ms）。远端从未给过证据时为 undefined。 */
  lastEvidenceAt?: number;
  /** 按需取到的日志切片（已钳制到上限、已脱敏）；只在显式请求后才有值。 */
  logTail?: string;
};

export const STOP_CONFIRMED_LABEL = "已停止";
export const RECLAIMED_LABEL = "已按 TTL 到期回收";
export const STOP_UNCONFIRMED_LABEL = "停止未确认";
export const REMOTE_COST_UNKNOWN_LABEL = "费用未知";
/** 失去证据时的静态标记：不是「正在跑」，也不假装是终态。 */
export const REMOTE_UNKNOWN_GLYPH = "◌";

/** 远程证据是否「活着」：只有进程明确在跑才算；未知一律不算（禁撒谎）。 */
export function remoteTaskIsActive(carrier?: RemoteTaskCarrier): boolean {
  return carrier?.remoteTask?.process?.status === "running";
}

/**
 * 远程任务是否还没收敛（§10.2）：
 * run 的终态只说明本机那个 agent 结束了，说明不了远端进程/清理。
 * 未收敛时 run 不许从面板上退休——摘掉就等于对用户说「结束了」。
 */
export function remoteTaskUnsettled(carrier?: RemoteTaskCarrier): boolean {
  const view = carrier?.remoteTask;
  if (!view) return false;
  // 停止请求还没被确认（含 stop-unverified / pending）＝还没停干净。
  if (view.cleanup?.pending || view.cleanup?.status === "stop-unverified") return true;
  // 远端清理已按 TTL 到期回收或已停止确认（且非 pending）＝已收敛
  if (
    view.cleanup?.status === "expired" ||
    (view.cleanup?.status === "stopped" && !view.cleanup.pending)
  ) {
    return false;
  }
  const status = view.process?.status;
  // 进程状态未知时按未收敛处理：未知 ≠ 已结束。
  return status === undefined || status === "running";
}

/**
 * elapsed 的时钟（§8.2 未知禁撒谎）。
 *
 * 没有活跃证据时，「已运行 12m」是我们编出来的：不知道它还在不在走。返回
 * lastEvidenceAt 让计时冻结在最后一次证据那一刻；返回 null 表示连证据时间都
 * 没有，此时调用方宁可不显示耗时。
 */
export function remoteTaskClock(
  carrier: RemoteTaskCarrier | undefined,
  now: number
): number | null {
  if (!carrier?.remoteTask || remoteTaskIsActive(carrier)) return now;
  const at = carrier.lastEvidenceAt;
  if (typeof at !== "number" || !Number.isFinite(at) || at <= 0) return null;
  return Math.min(at, now);
}

/** 「最后心跳 12s 前」；没有证据时间就什么都不说（不编心跳）。 */
export function formatRemoteHeartbeat(
  lastEvidenceAt: number | undefined,
  now: number
): string | null {
  if (typeof lastEvidenceAt !== "number" || !Number.isFinite(lastEvidenceAt) || lastEvidenceAt <= 0) {
    return null;
  }
  return `最后心跳 ${formatDuration(Math.max(0, now - lastEvidenceAt))} 前`;
}

/** 远程任务的显式事实：心跳 / 远端进程 / 停止回执 / 费用未知。 */
export function remoteTaskFacts(
  carrier: RemoteTaskCarrier | undefined,
  now: number
): string[] {
  const view = carrier?.remoteTask;
  if (!view) return [];
  const facts: string[] = [];
  const heartbeat = formatRemoteHeartbeat(carrier?.lastEvidenceAt, now);
  if (heartbeat) facts.push(heartbeat);
  const status = view.process?.status;
  if (status === "running") facts.push("远端运行中");
  else if (status === "stopped" || status === "exited" || status === "failed") {
    facts.push(`远端 ${status}`);
  } else facts.push("远端状态未知");
  const cleanup = view.cleanup;
  if (cleanup) {
    // expired 是按 TTL 到期回收，严禁显示为已停止；
    // 只有 stopped 且非 pending 才是已确认停止；
    // pending: true（如 stopped + pending: true）或 stop-unverified 一律保持停止未确认。
    if (cleanup.status === "expired") {
      facts.push(RECLAIMED_LABEL);
    } else if (cleanup.status === "stopped" && !cleanup.pending) {
      facts.push(STOP_CONFIRMED_LABEL);
    } else {
      facts.push(STOP_UNCONFIRMED_LABEL);
    }
  }
  // 显式未知（cost: null）与「缺失」不同：未知要明说。
  if (view.cost === null) facts.push(REMOTE_COST_UNKNOWN_LABEL);
  return facts;
}

/** 远端费用显式未知（cost: null）——未知不是 0，积分 chip 不许顶上来。 */
export function remoteCostIsExplicitlyUnknown(carrier?: RemoteTaskCarrier): boolean {
  return carrier?.remoteTask?.cost === null;
}

export function runZoneLeadIcon(status: string, carrier?: RemoteTaskCarrier): string {
  if (!isAgentRunTerminalStatus(status)) {
    // 远程任务失去证据时不摆「正在跑」的转轮：那是我们唯一确定不知道的事。
    if (carrier?.remoteTask && !remoteTaskIsActive(carrier)) return REMOTE_UNKNOWN_GLYPH;
    return "⚙";
  }
  switch (status) {
    case "done":
      return "✓";
    case "killed":
    case "cancelled":
      return "⊘";
    default:
      return "✗"; // failed / timeout / orphaned
  }
}

/** 终态文案：完成 / 失败 / 已取消（timeout、orphaned 归入失败）。 */
function runZoneTerminalLabel(status: string): string {
  switch (status) {
    case "done":
      return t("runZoneDone");
    case "killed":
    case "cancelled":
      return t("runZoneCancelled");
    default:
      return t("runZoneFailed");
  }
}

/**
 * 运行区里 run 的名字：title 优先（派单时填的短标题就是为了在这里区分并发
 * run），没有 title 退回 agent 名，两者都没有时用 runId 短码兜底——绝不输出
 * "undefined"。
 *
 * title 在时 agent 名退成次要信息（`title · agent`），并省掉短 id——标题已经
 * 承担了区分职责；没有 title 时短 id 是唯一的区分手段，必须保留。title 重复
 * 时（同名并发）短 id 也保留，否则两行长得一模一样。
 */
function runZoneLabel(
  snapshot: AgentRunSnapshot,
  duplicateTitles: ReadonlySet<string>
): string {
  const name = displayAgentName(snapshot);
  const short = shortRunId(snapshot.runId);
  const idSuffix = short ? ` #${short}` : "";
  const title = snapshot.title?.trim();
  if (title) {
    return `${title}${duplicateTitles.has(title) ? idSuffix : ""} · ${name}`;
  }
  // 无 title：agent 名是主标识；displayAgentName 已把自动生成的内部身份折叠成
  // "Sub-agent"，此时短 id 是区分多个 Sub-agent 的唯一手段。
  return `${name}${idSuffix}`;
}

/**
 * 每条 run 的事实串：`已运行 1m23s · 12 tools · Edit 3s · ⚡0.04 · <err>`。
 *
 * - 运行中的 run 报「已耗时」（spec 明确要求时间），计时从 startedAt 算到 now；
 *   终态 run 报 `<status> <age>`（年龄冻结在 finishedAt），因为「已运行」对一条
 *   已结束的 run 语义不通——用户要看的是它跑了多久才结束。
 * - startedAt 缺失时不输出耗时（宁缺勿错：旧服务端不发这个字段）。
 */
function runZoneFacts(
  snapshot: AgentRunSnapshot,
  now: number
): { time: string | null; rest: string[] } {
  const facts: string[] = [];
  let time: string | null = null;

  if (isAgentRunTerminalStatus(snapshot.status)) {
    // 用时 = finishedAt - startedAt（formatRunAge 在有 finishedAt 时冻结于它）。
    const age = formatRunAge(snapshot, now);
    const label = runZoneTerminalLabel(snapshot.status);
    time = age ? `${label} · ${t("runZoneTook", age)}` : label;
  } else {
    const startedAt = snapshot.startedAt;
    if (typeof startedAt === "number" && Number.isFinite(startedAt) && startedAt > 0) {
      time = t("runZoneFor", formatDuration(Math.max(0, now - startedAt)));
    }
  }

  const unassigned = formatUnassignedFact(snapshot);
  if (unassigned) facts.push(unassigned);

  if (typeof snapshot.toolCallCount === "number" && Number.isFinite(snapshot.toolCallCount)) {
    facts.push(t("runToolsCount", String(snapshot.toolCallCount)));
  }
  if (typeof snapshot.credits === "number" && Number.isFinite(snapshot.credits)) {
    facts.push(formatCreditsChip(snapshot.credits, { compact: true }));
  }
  // 「此刻在做什么」压过「最后做过什么」：前者带自己的计时，看得出卡没卡住。
  const inFlight = activeInFlight(snapshot);
  if (inFlight) {
    facts.push(formatInFlightFact(inFlight, now));
  } else {
    const lastTool = snapshot.lastToolNames?.[snapshot.lastToolNames.length - 1];
    if (lastTool) facts.push(clipText(lastTool, 20));
  }
  if (snapshot.errorMessage) facts.push(clipText(snapshot.errorMessage, 40));

  return { time, rest: facts };
}

/**
 * 终端尺寸驱动的降级（均可选；缺省 = 不降级，保持旧行为）。
 *
 * 行数（rows = 终端总高度）——运行区与 spinner/队列/composer 共用底部预留区，
 * 历史区拿剩下的，所以越矮越要收：
 *   rows < 10 → 1 条 run（+N 折叠行）；rows < 16 → 最多 2 条；否则 maxRows(3)。
 *   依据：composer 本体（分隔线 ×2 + 输入 + 状态栏）约 4-5 行，spinner 1 行，
 *   运行区最坏 3+1=4 行；24 行终端留给历史 ≥ 24-5-1-4=14 行，没问题。16 行
 *   以下最坏只剩 6 行以内，砍到 2 条（≤3 行）；10 行以下砍到 1 条（≤2 行）。
 * 宽度（columns）——耗时是用户盯的字段，永远保；顺序：先丢次要事实
 *   （从末尾：错误/当前动作/积分/tools/未分配），再截断标题/agent，
 *   时间任何宽度都不动（标题最少留 1 列 + …）。
 */
export type RunZoneLayout = { columns?: number; rows?: number };

export const RUN_ZONE_COMPACT_ROWS = 16;
export const RUN_ZONE_TINY_ROWS = 10;

export function resolveRunZoneMaxRows(maxRows: number, rows?: number): number {
  if (typeof rows !== "number" || !Number.isFinite(rows)) return maxRows;
  if (rows < RUN_ZONE_TINY_ROWS) return Math.min(maxRows, 1);
  if (rows < RUN_ZONE_COMPACT_ROWS) return Math.min(maxRows, 2);
  return maxRows;
}

/**
 * 渲染固定运行区：活跃 run 每条一行，超过 maxRows 折叠成 `+N more`。
 * 空列表返回 []——无 run 时运行区一行都不占。
 *
 * 调用方负责把 sanitizeRunSnapshotForNormal 过的快照传进来（normal 模式剥
 * ANSI/OSC、隐 raw error/log）；这里自己做一遍兜底，因为该函数是导出的，
 * 直接调用它的人不该拿到未清洗的 raw 输出。
 */
export function formatRunZoneLines(
  snapshots: AgentRunSnapshot[],
  colorEnabled: boolean,
  now: number = Date.now(),
  maxRows: number = RUN_ZONE_MAX_ROWS,
  layout: RunZoneLayout = {}
): string[] {
  if (snapshots.length === 0) return [];
  maxRows = resolveRunZoneMaxRows(maxRows, layout.rows);
  const columns =
    typeof layout.columns === "number" && layout.columns > 0 ? layout.columns : undefined;

  const display = snapshots.map(sanitizeRunSnapshotForNormal);
  const shown = display.slice(0, Math.max(1, maxRows));

  // title 只在「唯一」时才能替代短 id 去区分 run；同名并发保留短 id。
  const titleCounts = new Map<string, number>();
  for (const snapshot of shown) {
    const title = snapshot.title?.trim();
    if (title) titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
  }
  const duplicateTitles = new Set(
    [...titleCounts].filter(([, count]) => count > 1).map(([title]) => title)
  );

  const lines: string[] = [];
  // 远程证据在 sanitize 之前按位置抓住：清洗后的快照不再带这些字段，而
  // 「远端还在不在跑」正是运行区要说的那句话。
  const carriers = snapshots.map((snapshot) => snapshot as RemoteTaskCarrier);
  for (const [index, snapshot] of shown.entries()) {
    const carrier = carriers[index];
    const clock = remoteTaskClock(carrier, now);
    const icon = runZoneLeadIcon(snapshot.status, carrier);
    const label = runZoneLabel(snapshot, duplicateTitles);
    const { time, rest } = runZoneFacts(snapshot, clock ?? now);
    const remoteFacts = remoteTaskFacts(carrier, now);
    // 远端费用显式未知时不显示积分 chip——「未知」不是「0」。
    const hideCredits = remoteCostIsExplicitlyUnknown(carrier);
    const base = hideCredits ? rest.filter((fact) => !fact.startsWith("⚡")) : rest;
    const hasError = Boolean(snapshot.errorMessage);
    // 连证据时间都没有（clock === null）时不显示耗时：宁缺勿编。
    let factList = [
      ...(time && clock !== null ? [time] : []),
      ...base,
      ...remoteFacts,
    ];
    let shownLabel = label;
    if (columns !== undefined) {
      const fixed = (l: string, f: string[]) =>
        visibleWidth(`${icon} ${l}${f.length ? ` · ${f.join(" · ")}` : ""}`);
      // 1) 丢次要事实（从末尾），时间永远留在 factList[0]。
      const keep = time ? 1 : 0;
      while (factList.length > keep && fixed(label, factList) > columns) factList.pop();
      // 2) 还放不下：截断标题/agent，时间不动。
      if (fixed(label, factList) > columns) {
        const tail = factList.length ? ` · ${factList.join(" · ")}` : "";
        const room = columns - visibleWidth(`${icon} `) - visibleWidth(tail);
        shownLabel = fitAnsiLine(label, Math.max(1, room));
      }
    }
    const factsPart = factList.length > 0 ? ` · ${factList.join(" · ")}` : "";

    if (!colorEnabled) {
      lines.push(`${icon} ${shownLabel}${factsPart}`);
      continue;
    }
    lines.push(
      themeText(icon, runStatusTone(snapshot.status), true) +
        " " +
        themeText(shownLabel, "chrome", true) +
        themeText(factsPart, hasError ? "danger" : "chrome")
    );
  }

  const hidden = display.length - shown.length;
  if (hidden > 0) {
    const more = t("runZoneMore", String(hidden));
    lines.push(colorEnabled ? themeText(`  ${more}`, "chrome") : `  ${more}`);
  }
  return lines;
}
