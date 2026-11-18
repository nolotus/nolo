import {
  preferredTopTaskEntries,
  resolveHistoryLayoutGeometry,
  resolveSurfacePaintWidth,
} from "./tuiLayout";
/**
 * 顶部固定运行区（fixed run zone）的逐行格式化。
 *
 * 用户需求（原话）：「agent 运行有标题，这个 running 能不能不显示在 context
 * 的旁边，而是像 agent 显示在上方，并且有标题、时间等，方便我了解。」
 *
 * 状态栏里那条 `⚙ N running` chip 只能报一个计数——它压在 `context: x%`
 * 旁边，看不出是哪个 run、跑了多久、做到哪一步。运行区把同一批活跃 run
 * 渲染成每条一行、固定在 composer 上方（banner/状态栏之间那块的顶部），
 * 每条都带「标题 · 执行者 · 步数/动作 · 计时」，一眼能扫。
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
  isAgentRunTerminalStatus,
  shortRunId,
} from "../../ai/tools/agent/agentRunDisplayHelpers";
import { displayAgentName } from "./agentRunPanelLines";
import {
  formatToolProgressFact,
  hasToolProgress,
  runProgressStalled,
} from "./runProgressHeartbeat";
import {
  activeInFlight,
  formatInFlightFact,
  formatUnassignedFact,
  runStatusTone,
  sanitizeRunSnapshotForNormal,
} from "./runSnapshotDisplay";
import { t, getCliLocale } from "./i18n";
import { fitAnsiLine, visibleWidth } from "./tuiAnsi";
import { themeText } from "./theme";
import type { RemoteTaskView } from "../../core/remoteTaskView";

/**
 * 运行区同时展开的 run 行数上限；多出来的折叠成 `+N more`。
 * 与 runDock 共用；workspace 通过 maxEntries 传入实际顶部预算。
 */
export const RUN_ZONE_MAX_ROWS = 7;

/**
 * 活动 agent run 的类型标记。用单列极简符号 ◈ 取代生硬的「agent / 智能体」
 * 类型字样与双宽彩色 emoji，行宽固定为 1 列，终态切换零水平跳动。
 */
export const RUN_ZONE_ICON = "◈";
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

/** 固定格式紧凑计时：`0:09`、`1:28`、`1:02:05`，避免文字长度变动推着整行抖动。 */
export function formatCompactClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/** 精炼步数/动作文案：`12步`（zh）/ `12 steps`（en），纯推理 run 保留模型调用心跳。 */
function formatZoneStepFact(snapshot: AgentRunSnapshot): string | undefined {
  const zh = getCliLocale() === "zh";
  const raw = snapshot.toolCallCount;
  const toolCount =
    typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
  if (toolCount !== undefined && toolCount > 0) {
    return zh ? `${toolCount}步` : `${toolCount} steps`;
  }
  const hasLlm =
    typeof snapshot.llmCallCount === "number" &&
    Number.isFinite(snapshot.llmCallCount) &&
    snapshot.llmCallCount > 0;
  if (toolCount === 0 && !hasToolProgress(snapshot) && !hasLlm) {
    return zh ? "0步" : "0 steps";
  }
  return formatToolProgressFact(snapshot);
}

/** 顶部运行区 spinner 帧间隔（ms），与底部 activityIndicator 保持同频 80ms。 */
export const RUN_ZONE_FRAME_INTERVAL_MS = 80;

/** Fixed-width 1-col running signal, driven at 80ms cadence to match the bottom activity indicator. */
function runningFrame(now: number): string {
  return ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"][
    Math.floor(now / RUN_ZONE_FRAME_INTERVAL_MS) % 10
  ]!;
}

export function runZoneLeadIcon(status: string, carrier?: RemoteTaskCarrier): string {
  if (!isAgentRunTerminalStatus(status)) {
    // 远程任务失去证据时不摆「正在跑」的转轮：那是我们唯一确定不知道的事。
    if (carrier?.remoteTask && !remoteTaskIsActive(carrier)) return REMOTE_UNKNOWN_GLYPH;
    return RUN_ZONE_ICON;
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

/** 终态简写：已完成 / 失败 / 已取消（英文 done / failed / cancelled）。 */
function runZoneTerminalLabel(status: string): string {
  const zh = getCliLocale() === "zh";
  switch (status) {
    case "done":
      return zh ? "已完成" : "done";
    case "killed":
    case "cancelled":
      return zh ? "已取消" : "cancelled";
    default:
      return zh ? "失败" : "failed";
  }
}

/**
 * 运行区里 run 的主标签与可选模型后缀：
 * - 有 `title` 时主标签是 `title`（重名附加 `#id`），模型名作为淡色后缀 ` · <name>`；
 *   若同屏有 ≥2 条带 `title` 的任务使用同一模型，则仅首条附带模型后缀。
 * - 无 `title` 时保留各自模型名（或 `◈`）与 `#id` 以区分并发行。
 */
function runZoneLabelParts(
  snapshot: AgentRunSnapshot,
  duplicateTitles: ReadonlySet<string>,
  omitSharedAgent: boolean
): { main: string; agentSuffix: string } {
  const short = shortRunId(snapshot.runId);
  const idSuffix = short ? ` #${short}` : "";
  const title = snapshot.title?.trim();
  if (title) {
    const main = `${title}${duplicateTitles.has(title) ? idSuffix : ""}`;
    if (omitSharedAgent) return { main, agentSuffix: "" };
    const name = displayAgentName(snapshot, { fallback: "" });
    return { main, agentSuffix: name ? ` · ${name}` : "" };
  }
  const fallback = isAgentRunTerminalStatus(snapshot.status) ? RUN_ZONE_ICON : "";
  const name = displayAgentName(snapshot, { fallback });
  const main = name ? `${name}${idSuffix}` : short ? `#${short}` : "";
  return { main, agentSuffix: "" };
}

/**
 * 每条 run 的事实串：紧凑计时（`0:28`）与右侧事实列表（停滞、动作、步数、积分、错误）。
 * startedAt 缺失时不输出计时（宁缺勿错：旧服务端不发这个字段）。
 */
function runZoneFacts(
  snapshot: AgentRunSnapshot,
  now: number
): { time: string | null; terminalLabel: string | null; rest: string[]; stalled: boolean } {
  const facts: string[] = [];
  let time: string | null = null;
  let terminalLabel: string | null = null;

  const startedAt = snapshot.startedAt;
  const hasStart = typeof startedAt === "number" && Number.isFinite(startedAt) && startedAt > 0;
  if (isAgentRunTerminalStatus(snapshot.status)) {
    terminalLabel = runZoneTerminalLabel(snapshot.status);
    if (hasStart) {
      const end =
        typeof snapshot.finishedAt === "number" &&
        Number.isFinite(snapshot.finishedAt) &&
        snapshot.finishedAt > 0
          ? snapshot.finishedAt
          : now;
      time = formatCompactClock(Math.max(0, end - startedAt));
    }
  } else if (hasStart) {
    time = formatCompactClock(Math.max(0, now - startedAt));
  }

  const unassigned = formatUnassignedFact(snapshot);
  if (unassigned) facts.push(unassigned);

  // 「此刻在做什么」压过「最后做过什么」：前者带自己的计时，看得出卡没卡住。
  const inFlight = activeInFlight(snapshot);
  if (inFlight) {
    facts.push(formatInFlightFact(inFlight, now));
  } else {
    const lastTool = snapshot.lastToolNames?.[snapshot.lastToolNames.length - 1];
    if (lastTool) facts.push(clipText(lastTool, 20));
  }

  // 步数/心跳（12步 / 12 steps / 3 次模型调用）
  const stepFact = formatZoneStepFact(snapshot);
  if (stepFact) facts.push(stepFact);

  if (typeof snapshot.credits === "number" && Number.isFinite(snapshot.credits)) {
    facts.push(formatCreditsChip(snapshot.credits, { compact: true }));
  }

  if (snapshot.errorMessage) facts.push(clipText(snapshot.errorMessage, 40));

  return { time, terminalLabel, rest: facts, stalled: runProgressStalled(snapshot, now) };
}

/**
 * 终端尺寸驱动的降级（均可选；缺省 = 不降级，保持旧行为）。
 *
 * 行数预算来自 tuiLayout；workspace 的 maxEntries 已扣除 composer/modal/history。
 * 宽度（columns）——耗时是用户盯的字段，永远保；顺序：先丢次要事实
 *   （从末尾：错误/当前动作/积分/tools/未分配），再截断标题/agent，
 *   时间任何宽度都不动（标题最少留 1 列 + …）。
 */
export type RunZoneLayout = { columns?: number; rows?: number; maxEntries?: number };

export const RUN_ZONE_COMPACT_ROWS = 16;
export const RUN_ZONE_TINY_ROWS = 10;

export function resolveRunZoneMaxRows(maxRows: number, rows?: number): number {
  if (typeof rows !== "number" || !Number.isFinite(rows)) return maxRows;
  return Math.min(maxRows, preferredTopTaskEntries(rows));
}

/**
 * run 侧行预算：面板总高减去「仍在跑的后台进程」预留的那一行。
 *
 * 进程与 run 共用同一块面板高度，所以进程在跑时 run 少一条可见行——这是
 * 真实布局事实，不能按「面板里能放下几条」来估。
 */
export function runZoneRunRowBudget(totalRows: number, activeProcCount: number): number {
  const procReserve = activeProcCount > 0 && totalRows > 1 ? 1 : 0;
  return Math.max(1, totalRows - procReserve);
}

/**
 * 固定运行区**真实逐行可见**的 run 计划：先按终端行预算降级，再按 maxRows
 * 切片，切掉的进 `+N more`。渲染（formatRunZoneLines）、面板（runDock）与
 * 「这张 run 是否已常驻可见」的查询共用这一份规则——三处各写一遍就会漂移，
 * 而漂移的代价是聊天里静默丢掉一条看不见的 run 的启动回执。
 */
export function planRunZoneRows(
  snapshots: AgentRunSnapshot[],
  maxRows: number = RUN_ZONE_MAX_ROWS,
  layout: RunZoneLayout = {}
): { shown: AgentRunSnapshot[]; hidden: number } {
  const budget = Math.max(1, resolveRunZoneMaxRows(maxRows, layout.rows));
  const shown = snapshots.slice(0, budget);
  return { shown, hidden: Math.max(0, snapshots.length - shown.length) };
}

function resolveZoneHorizontalLayout(columns?: number): {
  leftPad: string;
  contentWidth: number;
} | null {
  if (typeof columns !== "number" || !Number.isFinite(columns) || columns <= 0) return null;
  const geom = resolveHistoryLayoutGeometry(columns);
  const leftPad = " ".repeat(geom.marginLeft);
  const targetTotal = Math.min(
    columns,
    Math.max(1, resolveSurfacePaintWidth(columns) - geom.marginRight)
  );
  const contentWidth = Math.max(1, targetTotal - geom.marginLeft);
  return { leftPad, contentWidth };
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
  const hLayout = resolveZoneHorizontalLayout(layout.columns);

  const display = snapshots.map(sanitizeRunSnapshotForNormal);
  const { shown } = planRunZoneRows(display, maxRows, layout);

  // title 只在「唯一」时才能替代短 id 去区分 run；同名并发保留短 id。
  const titleCounts = new Map<string, number>();
  for (const snapshot of shown) {
    const title = snapshot.title?.trim();
    if (title) titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
  }
  const duplicateTitles = new Set(
    [...titleCounts].filter(([, count]) => count > 1).map(([title]) => title)
  );

  // 同模型并发去重：可见带 title 的任务里有 ≥2 条使用同一模型名时，仅首条展示
  // ` · <agentName>`，后续同名任务省略模型名以腾出宽度给进度详情。
  const titledAgentCounts = new Map<string, number>();
  for (const snapshot of shown) {
    if (!snapshot.title?.trim()) continue;
    const name = displayAgentName(snapshot, { fallback: "" });
    if (name) titledAgentCounts.set(name, (titledAgentCounts.get(name) ?? 0) + 1);
  }
  const seenSharedAgents = new Set<string>();

  const lines: string[] = [];
  // 远程证据在 sanitize 之前按位置抓住：清洗后的快照不再带这些字段，而
  // 「远端还在不在跑」正是运行区要说的那句话。
  const carriers = snapshots.map((snapshot) => snapshot as RemoteTaskCarrier);
  for (const [index, snapshot] of shown.entries()) {
    const carrier = carriers[index];
    const clock = remoteTaskClock(carrier, now);
    // 活跃 run 前导直接用 1 列 runningFrame(now)；远程未知 ◌；终态 ✓/✗/⊘；pending 等 ◈。
    const icon =
      snapshot.status === "running" && (!carrier?.remoteTask || remoteTaskIsActive(carrier))
        ? runningFrame(now)
        : runZoneLeadIcon(snapshot.status, carrier);

    const rawTitle = snapshot.title?.trim();
    const rawAgentName = rawTitle ? displayAgentName(snapshot, { fallback: "" }) : "";
    let omitSharedAgent = false;
    if (rawTitle && rawAgentName && (titledAgentCounts.get(rawAgentName) ?? 0) >= 2) {
      if (seenSharedAgents.has(rawAgentName)) {
        omitSharedAgent = true;
      } else {
        seenSharedAgents.add(rawAgentName);
      }
    }

    const { main, agentSuffix } = runZoneLabelParts(snapshot, duplicateTitles, omitSharedAgent);
    const fullLabel = `${main}${agentSuffix}`;
    const { time, terminalLabel, rest, stalled } = runZoneFacts(snapshot, clock ?? now);
    const remoteFacts = remoteTaskFacts(carrier, now);
    // 远端费用显式未知时不显示积分 chip——「未知」不是「0」。
    const hideCredits = remoteCostIsExplicitlyUnknown(carrier);
    const base = hideCredits ? rest.filter((fact) => !fact.startsWith("⚡")) : rest;
    const hasError = Boolean(snapshot.errorMessage);

    // 停滞提示与终态词排在最前；连证据时间都没有（clock === null）时不显示计时。
    const middleFacts = [
      ...(terminalLabel ? [terminalLabel] : []),
      ...(stalled ? [t("runStalled")] : []),
      ...base,
      ...remoteFacts,
    ];
    const tailClock = time && clock !== null ? time : null;

    const terminal = isAgentRunTerminalStatus(snapshot.status);
    const formatTitle = (text: string) => (terminal ? text : `\x1b[1m${text}\x1b[22m`);

    if (!hLayout) {
      // 未传 layout.columns：保持干净的单行 `·` 串联，不塞左右对齐空白。
      const allFacts = [...middleFacts, ...(tailClock ? [tailClock] : [])];
      const factsPart = allFacts.length > 0 ? ` · ${allFacts.join(" · ")}` : "";
      if (!colorEnabled) {
        lines.push(`${icon} ${fullLabel}${factsPart}`);
      } else {
        const coloredLabel =
          formatTitle(main) +
          (agentSuffix ? themeText(agentSuffix, "muted", true) : "");
        lines.push(
          themeText(icon, runStatusTone(snapshot.status), true) +
            " " +
            coloredLabel +
            themeText(factsPart, hasError ? "danger" : stalled ? "warning" : "chrome", true)
        );
      }
      continue;
    }

    const { leftPad, contentWidth } = hLayout;
    const minGap = 2;
    const buildRight = (facts: string[], clockStr: string | null): string => {
      const mid = facts.join(" · ");
      if (mid && clockStr) return `${mid}  ${clockStr}`;
      return mid || clockStr || "";
    };
    const keep = (terminalLabel ? 1 : 0) + (stalled ? 1 : 0);
    // 1) 从末尾丢次要事实，终态词、停滞提示与尾端计时优先保留。
    while (
      middleFacts.length > keep &&
      (() => {
        const right = buildRight(middleFacts, tailClock);
        const gap = right ? minGap : 0;
        return visibleWidth(`${icon} ${fullLabel}`) + gap + visibleWidth(right) > contentWidth;
      })()
    ) {
      middleFacts.pop();
    }
    // 2) 若极窄下连 keep 也挤到标题不足 1 列，释放 keep 以便计时与标题可读。
    while (
      middleFacts.length > 0 &&
      (() => {
        const right = buildRight(middleFacts, tailClock);
        const gap = right ? minGap : 0;
        return visibleWidth(`${icon} `) + 1 + gap + visibleWidth(right) > contentWidth;
      })()
    ) {
      middleFacts.pop();
    }

    const rightStr = buildRight(middleFacts, tailClock);
    const gapAllowance = rightStr ? minGap : 0;
    const roomForLabel =
      contentWidth - visibleWidth(`${icon} `) - gapAllowance - visibleWidth(rightStr);
    const shownLabel =
      visibleWidth(fullLabel) > roomForLabel
        ? fitAnsiLine(fullLabel, Math.max(1, roomForLabel))
        : fullLabel;

    const leftPlain = `${icon} ${shownLabel}`;
    const leftWidth = visibleWidth(leftPlain);
    const rightWidth = visibleWidth(rightStr);
    const gap =
      rightStr && leftWidth + minGap + rightWidth <= contentWidth
        ? " ".repeat(contentWidth - leftWidth - rightWidth)
        : rightStr
          ? "  "
          : "";

    if (!colorEnabled) {
      const body = rightStr ? `${leftPlain}${gap}${rightStr}` : leftPlain;
      lines.push(`${leftPad}${visibleWidth(body) > contentWidth ? fitAnsiLine(body, contentWidth) : body}`);
      continue;
    }

    const shownMain = shownLabel.startsWith(main) ? main : shownLabel;
    const shownSuffix = shownLabel.startsWith(main) ? shownLabel.slice(main.length) : "";
    const coloredLabel =
      formatTitle(shownMain) +
      (shownSuffix ? themeText(shownSuffix, "muted", true) : "");
    const midStr = middleFacts.join(" · ");
    const midTone = hasError ? "danger" : stalled ? "warning" : "chrome";
    const coloredRight =
      (midStr ? themeText(midStr, midTone, true) : "") +
      (midStr && tailClock ? "  " : "") +
      (tailClock ? themeText(tailClock, "chrome", true) : "");

    const coloredBody = `${themeText(icon, runStatusTone(snapshot.status), true)} ${coloredLabel}${gap}${coloredRight}`;
    lines.push(
      `${leftPad}${visibleWidth(coloredBody) > contentWidth ? fitAnsiLine(coloredBody, contentWidth) : coloredBody}`
    );
  }

  const hidden = display.length - shown.length;
  if (hidden > 0) {
    const more = t("runZoneMore", String(hidden));
    const prefix = `${hLayout?.leftPad ?? ""}  `;
    lines.push(colorEnabled ? themeText(`${prefix}${more}`, "chrome") : `${prefix}${more}`);
  }
  return lines;
}

// ─── Background processes in the same zone ──────────────────────────────────

/**
 * 运行区里的一条后台进程行（`processRegistry.listBackground()` 的 running 视图）。
 *
 * 只声明渲染真正需要的字段：这是纯格式化模块，不该把整个 `RegisteredProcess`
 * （带 resultCapsule / owner / 事件日志游标）拖进来。
 */
export type RunZoneProc = {
  pid: number;
  label?: string;
  command?: string;
  /** 拉起时刻（ms）；缺失时不输出耗时——宁缺勿编。 */
  startedAt: number;
  /** `running` / `exited` / `killed`。缺省视为 running（旧调用方）。 */
  status?: string;
  /** 仅退出时有意义；killed 时不可信，渲染时不显示。 */
  exitCode?: number;
  /** registry 记下的真实用时（ms）；残留行优先用它算「用时」。 */
  durationMs?: number;
};

/**
 * 进程行类型标记：`$`（1 列固定宽度）。
 * 与 Subagent 行共享「第 1 列 1 字符状态符（⠋/✓/✗/⊘）+ 空格 + 内容」的网格，
 * 既避免和主输入框提示符 `❯` 混淆，又保证运行态切到终态严格 0 列宽跳动。
 */
export const PROC_ZONE_ICON = "$";

/** 成功退出后仍在运行区停留的时长。 */
export const PROC_LINGER_SUCCESS_MS = 3_000;
/**
 * 失败退出停留得更久：`exit 1` 是必须看见的信号，一帧就消失等于没报。
 */
export const PROC_LINGER_FAILURE_MS = 10_000;
/** 最多同时展示几条残留（失败优先），避免残留挤占活跃项的行预算。 */
export const PROC_LINGER_MAX_ROWS = 2;

/** 这条进程行是残留（已退出）还是仍在跑。缺省 status 视为 running。 */
export function procZoneFinished(proc: RunZoneProc): boolean {
  return (proc.status ?? "running") !== "running";
}

/**
 * 进程行终态状态图标：成功退出 `✓`、失败退出 `✗`、被 kill `⊘`；非终态返回 `$`。
 * 在 `formatProcZoneLines` 里非终态前导固定使用 1 列 `runningFrame(now)`，终态使用本图标，
 * 后接 `$ <标题>`，从而保持运行态到终态严格 0 列宽跳动。
 */
export function procZoneLeadIcon(proc: RunZoneProc): string {
  const status = proc.status ?? "running";
  if (status === "killed") return "⊘";
  if (status === "exited") return (proc.exitCode ?? 0) === 0 ? "✓" : "✗";
  return PROC_ZONE_ICON;
}

/**
 * 残留窗口时长：失败比成功留得久。仍在跑返回 0（不进入残留集合）。
 */
export function procLingerMs(proc: RunZoneProc): number {
  if (!procZoneFinished(proc)) return 0;
  const failed = proc.status === "killed" || (proc.exitCode ?? 0) !== 0;
  return failed ? PROC_LINGER_FAILURE_MS : PROC_LINGER_SUCCESS_MS;
}

/**
 * 进程行的标题：label 优先（调用方给的人话短标签），空标签回退到 command 的
 * 首行摘要——绝不输出空标题或 `undefined`。
 */
export function procZoneTitle(proc: RunZoneProc, maxWidth = 40): string {
  const label = proc.label?.trim();
  if (label) return label;
  const command = proc.command?.split("\n")[0]?.trim() ?? "";
  return command ? clipText(command, maxWidth) : `pid ${proc.pid}`;
}

/**
 * 渲染后台进程行：与 Subagent 行共享统一对齐网格：
 * - 前导固定 `[1列状态符: ⠋/✓/✗/⊘] + 空格 + $ + 空格`，终态切换 0 水平跳动
 * - 传入 `layout.columns` 时左右两端对齐：`左 [状态 $ 标题]` + `右 [pid/exit/cancelled  m:ss]`
 * - 未传 `layout.columns` 时保持干净的 `·` 分隔单行摘要：`⠋ $ <标题> · pid 12345 · for 8s`
 */
export function formatProcZoneLines(
  procs: readonly RunZoneProc[],
  colorEnabled: boolean,
  now: number = Date.now(),
  maxRows: number = RUN_ZONE_MAX_ROWS,
  layout: RunZoneLayout = {}
): string[] {
  if (procs.length === 0) return [];
  maxRows = resolveRunZoneMaxRows(maxRows, layout.rows);
  const hLayout = resolveZoneHorizontalLayout(layout.columns);
  const shown = procs.slice(0, Math.max(1, maxRows));

  const lines: string[] = [];
  for (const proc of shown) {
    const finished = procZoneFinished(proc);
    const isFailed = finished && (proc.status === "killed" || (proc.exitCode ?? 0) !== 0);
    const statusIcon =
      !finished && (proc.status === undefined || proc.status === "running")
        ? runningFrame(now)
        : procZoneLeadIcon(proc);
    const leadPrefix = `${statusIcon} ${PROC_ZONE_ICON} `;

    const startedAt = proc.startedAt;
    // 残留优先用 registry 记下的真实用时；没有就退回「现在 - 拉起时刻」。
    // 两者都没有时不输出耗时——宁缺勿编。
    const durationMs = proc.durationMs;
    const elapsedMs =
      finished && typeof durationMs === "number" && Number.isFinite(durationMs)
        ? Math.max(0, durationMs)
        : typeof startedAt === "number" && Number.isFinite(startedAt) && startedAt > 0
          ? Math.max(0, now - startedAt)
          : null;

    const middleFacts: string[] = [];
    if (finished) {
      // 被 kill 的没有可信 exitCode，不编一个 0 出来（图标 ⊘ 已经说明结局）。
      if (proc.status === "killed") {
        middleFacts.push(t("runZoneCancelled"));
      } else {
        middleFacts.push(t("procZoneExit", String(proc.exitCode ?? 0)));
      }
    } else {
      middleFacts.push(t("procZonePid", String(proc.pid)));
    }

    const title = procZoneTitle(proc);
    const statusTone = !finished ? "info" : isFailed ? "danger" : "success";
    const factTone = isFailed ? "danger" : "chrome";
    const formatTitle = (text: string) => (finished ? text : `\x1b[1m${text}\x1b[22m`);

    if (!hLayout) {
      // 未传 layout.columns：干净的单行 `·` 摘要，保持 title 在前、时间在后。
      const timeFact =
        elapsedMs !== null
          ? t(finished ? "procZoneTook" : "runZoneFor", formatDuration(elapsedMs))
          : null;
      const allFacts = [...middleFacts, ...(timeFact ? [timeFact] : [])];
      const factsPart = allFacts.length > 0 ? ` · ${allFacts.join(" · ")}` : "";
      if (!colorEnabled) {
        lines.push(`${leadPrefix}${title}${factsPart}`);
      } else {
        lines.push(
          themeText(statusIcon, statusTone, true) +
            " " +
            themeText(PROC_ZONE_ICON, "muted", true) +
            " " +
            formatTitle(title) +
            themeText(factsPart, factTone, true)
        );
      }
      continue;
    }

    const { leftPad, contentWidth } = hLayout;
    const tailClock = elapsedMs !== null ? formatCompactClock(elapsedMs) : null;
    const minGap = 2;
    const buildRight = (facts: string[], clockStr: string | null): string => {
      const mid = facts.join(" · ");
      if (mid && clockStr) return `${mid}  ${clockStr}`;
      return mid || clockStr || "";
    };

    // 1) 从末尾丢次要事实（pid / exit / cancelled），紧凑时钟与标题优先保留。
    while (
      middleFacts.length > 0 &&
      (() => {
        const right = buildRight(middleFacts, tailClock);
        const gap = right ? minGap : 0;
        return visibleWidth(`${leadPrefix}${title}`) + gap + visibleWidth(right) > contentWidth;
      })()
    ) {
      middleFacts.pop();
    }

    const rightStr = buildRight(middleFacts, tailClock);
    const gapAllowance = rightStr ? minGap : 0;
    const roomForTitle = contentWidth - visibleWidth(leadPrefix) - gapAllowance - visibleWidth(rightStr);
    const shownTitle =
      visibleWidth(title) > roomForTitle
        ? fitAnsiLine(title, Math.max(1, roomForTitle))
        : title;

    const leftPlain = `${leadPrefix}${shownTitle}`;
    const leftWidth = visibleWidth(leftPlain);
    const rightWidth = visibleWidth(rightStr);
    const gap =
      rightStr && leftWidth + minGap + rightWidth <= contentWidth
        ? " ".repeat(contentWidth - leftWidth - rightWidth)
        : rightStr
          ? "  "
          : "";

    if (!colorEnabled) {
      const body = rightStr ? `${leftPlain}${gap}${rightStr}` : leftPlain;
      lines.push(`${leftPad}${visibleWidth(body) > contentWidth ? fitAnsiLine(body, contentWidth) : body}`);
      continue;
    }

    const midStr = middleFacts.join(" · ");
    const coloredRight =
      (midStr ? themeText(midStr, factTone, true) : "") +
      (midStr && tailClock ? "  " : "") +
      (tailClock ? themeText(tailClock, "chrome", true) : "");
    const coloredBody =
      `${themeText(statusIcon, statusTone, true)} ${themeText(PROC_ZONE_ICON, "muted", true)} ` +
      `${formatTitle(shownTitle)}${gap}${coloredRight}`;
    lines.push(
      `${leftPad}${visibleWidth(coloredBody) > contentWidth ? fitAnsiLine(coloredBody, contentWidth) : coloredBody}`
    );
  }

  const hidden = procs.length - shown.length;
  if (hidden > 0) {
    const more = t("runZoneMore", String(hidden));
    const prefix = `${hLayout?.leftPad ?? ""}  `;
    lines.push(colorEnabled ? themeText(`${prefix}${more}`, "chrome") : `${prefix}${more}`);
  }
  return lines;
}


/** One composer row, not individual run visibility evidence or acceptance. */
export function formatBackgroundSummary(
  snapshots: AgentRunSnapshot[],
  procs: readonly RunZoneProc[],
  colorEnabled = false,
  columns = 80,
): string[] {
  if (!snapshots.length && !procs.length) return [];
  const zh = getCliLocale() === "zh";
  const groups = new Map<string, { count: number; name: string }>();
  const add = (label: string, name: string) => {
    const group = groups.get(label);
    if (group) group.count += 1;
    else groups.set(label, { count: 1, name });
  };
  for (const raw of snapshots) {
    const snapshot = sanitizeRunSnapshotForNormal(raw);
    const name = snapshot.title || snapshot.taskPreview || snapshot.agentName || shortRunId(snapshot.runId);
    const remote = raw as AgentRunSnapshot & RemoteTaskCarrier;
    if (remoteTaskUnsettled(remote)) {
      add(zh ? "远端待确认" : "remote unsettled", name);
    } else if (isAgentRunTerminalStatus(snapshot.status)) {
      add(runZoneTerminalLabel(snapshot.status), name);
    } else if (snapshot.status === "running") {
      // inFlight only carries a tool name, not blocking/waiting evidence.
      add(t("runZoneRunning"), name);
    } else if (snapshot.status === "pending") {
      add(t("runZonePending"), name);
    } else if (snapshot.status === "cancelling") {
      add(t("runZoneCancelling"), name);
    } else {
      add(zh ? "状态待确认" : "status unknown", name);
    }
  }
  for (const proc of procs) {
    const safe = sanitizeRunSnapshotForNormal({ runId: "", status: "running", logKey: "",
      title: proc.label || proc.command || "process" });
    add(!procZoneFinished(proc) ? t("runZoneRunning")
      : proc.status === "killed" ? t("runZoneCancelled")
      : (proc.exitCode ?? 0) === 0 ? t("runZoneDone") : t("runZoneFailed"), safe.title!);
  }
  // Pair each status with its own task before adding another group. On narrow
  // terminals the highest-priority task name survives instead of an unrelated name.
  const urgent = [t("runZoneFailed"), zh ? "远端待确认" : "remote unsettled",
    zh ? "状态待确认" : "status unknown"];
  const priority = (label: string) => urgent.includes(label) ? urgent.indexOf(label) : urgent.length;
  const facts = [...groups].sort(([a], [b]) => priority(a) - priority(b))
    .map(([label, group]) => `${group.count} ${label}: ${clipText(group.name, 18)}`)
    .join(" · ");
  const terminal = snapshots.some(s => isAgentRunTerminalStatus(s.status)) || procs.some(procZoneFinished);
  const text = fitAnsiLine(`${zh ? "后台" : "Background"}: ${facts}`,
    Math.max(1, columns - 1));
  const tone = groups.has(t("runZoneFailed")) ? "danger" : terminal ? "muted" : "warning";
  return [colorEnabled ? themeText(text, tone) : text];
}
