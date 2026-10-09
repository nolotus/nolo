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

/**
 * 运行区同时展开的 run 行数上限；多出来的折叠成 `+N more`。
 * 与 runDock 的硬顶同值——两个面板吃的是同一块 composer 预留高度。
 */
export const RUN_ZONE_MAX_ROWS = 3;

/**
 * 运行中的 lead 图标：spec 要的是 `⚙`（沿用旧 running chip 的机器/齿轮语义），
 * 终态 run 仍用状态图标——`⚙` 挂在一个已经 done/failed 的 run 上是误导。
 */
function runZoneLeadIcon(status: string): string {
  if (!isAgentRunTerminalStatus(status)) return "⚙";
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
  for (const snapshot of shown) {
    const icon = runZoneLeadIcon(snapshot.status);
    const label = runZoneLabel(snapshot, duplicateTitles);
    const { time, rest } = runZoneFacts(snapshot, now);
    const hasError = Boolean(snapshot.errorMessage);
    let factList = [...(time ? [time] : []), ...rest];
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
