// packages/cli/tui/completionNoticeDisplay.ts
//
// CLI 侧后台任务终态通知的**纯展示**层：只做「终态事实 → 屏幕文案」的映射，
// 不碰唤醒 payload、模型输入、投递、ack、任务执行与计费。
//
// 措辞与图标取自 chat/messages/contextualFragment.ts 的共享展示模型
// （web / RN 共用同一份语义与文案），CLI 只补共享模型不知道的两件事：
// - 主体统一叫「后台任务」：run 终态与进程任务终态都是后台任务，屏幕上
//   不出现 run / [done] 这类机器词；
// - 标题优先取完整 title（派发时调用方给的短标题），agent 标签只在没有
//   title 时兜底；机器 id（run-xxx）不当标题用。
//
// 本模块刻意不 import 控制 / 存储链（agentRunControl、run 记录读取、watcher）：
// client 侧（cliRemoteDialogSync）要用同一份措辞，静态引入 watcher 会把
// 控制与存储链一起拖进它的依赖图。
//
// 跨事件合组：连续到达的后台完成通知在屏幕上是**一个通知组**（一个组头 +
// 每条任务一行完整标题与耗时）。合组只发生在显示层：结构化元信息挂在
// Turn 旁边的侧表里（不改 Turn 结构 → 不动行数缓存 / offset / source
// mapping 口径），判定「能不能并入上一条」只看屏幕上有无可见输出，不解析
// 通知文案猜状态。

import {
  buildNoticeDisplay,
  describeContextualNotice,
  formatContextualNoticeMeta,
  formatContextualNoticeSummary,
  formatContextualOutcomeLabel,
  formatContextualTaskLine,
  formatDurationMs,
  taskStatusOutcome,
  type ContextualNoticeDisplay,
  type ContextualTaskDisplay,
} from "../../chat/messages/contextualFragment";
import {
  formatRunAge,
  isAgentNameFallback,
  resolveRunLabel,
} from "../../ai/tools/agent/agentRunDisplayHelpers";

/** CLI 通知里的主体名词（run 终态与进程任务终态统一叫「后台任务」）。 */
const CLI_NOTICE_SUBJECT = "后台任务";
const CLI_NOTICE_SUBJECT_SPEC = { label: CLI_NOTICE_SUBJECT, countWord: "个" };

/** 展示用的单条后台任务（只含展示字段）。 */
export type CliNoticeTask = {
  /** 完整标题（不截断）；空串表示没有可读标题。 */
  title: string;
  /** 终态状态词（done / failed / killed / exited / stopped / …）。 */
  status: string;
  /** 耗时（次级信息，可空；支持格式化字符串或毫秒数）。 */
  duration?: string | number;
  /** 退出码（次级信息，可空）。 */
  exitCode?: number;
};

/** 展示标题需要的 run 身份字段（只读）。 */
export type CliNoticeRun = {
  runId: string;
  agentKey?: string;
  agentName?: string;
  title?: string;
};

/**
 * 后台 run 的结构化终态（只需要展示相关字段）。
 *
 * 刻意不 import core / 控制链的 run 类型：这里只按结构取字段，
 * 与 ChildRunCompletedTurnEvent.runs 结构兼容即可。
 */
export type CliNoticeRunRecord = {
  runId: string;
  agentKey?: string;
  agentName?: string;
  title?: string;
  status?: string;
  startedAt?: string | number;
  endedAt?: string | number;
  finishedAt?: string | number;
};

/** 把 ContextualNoticeDisplay 渲染成 CLI 纯文本单行/多行（复用共享展示模型）。 */
function renderContextualNoticeDisplay(display: ContextualNoticeDisplay): string {
  if (display.tasks.length === 0) return display.headline ?? display.subject;
  if (display.tasks.length === 1) {
    return formatContextualNoticeSummary(display);
  }
  const meta = formatContextualNoticeMeta(display);
  const headline = display.headline ?? display.subject;
  return [
    `${headline}${meta ? ` · ${meta}` : ""}`,
    ...display.tasks.map((task) => formatContextualTaskLine(task)),
  ].join("\n");
}

/**
 * 直接吃结构化任务的渲染入口（不经过 XML 编解码 / describeContextualNotice）。
 *
 * 单条：一行说清主体、标题与结果；多条：一行组标题 + 每行一个任务。
 * 语义与共享展示模型保持逐字节一致。
 */
export function renderNoticeElements({
  tasks,
}: {
  tasks: CliNoticeTask[];
}): string {
  if (tasks.length === 0) return "";
  const taskDisplays: ContextualTaskDisplay[] = tasks.map((task) => {
    const outcome = taskStatusOutcome(task.status, task.exitCode);
    const duration =
      typeof task.duration === "number"
        ? formatDurationMs(task.duration)
        : task.duration?.trim() || undefined;
    return {
      title: task.title || CLI_NOTICE_SUBJECT_SPEC.label,
      outcome,
      outcomeLabel: formatContextualOutcomeLabel(outcome),
      ...(duration ? { duration } : {}),
      ...(task.exitCode !== undefined ? { exitCode: task.exitCode } : {}),
    };
  });
  const display = buildNoticeDisplay(
    "background_task_completion",
    CLI_NOTICE_SUBJECT_SPEC,
    taskDisplays,
  );
  return renderContextualNoticeDisplay(display);
}

/**
 * 把展示片段渲染成 CLI 通知文本（历史消息文本反解路径，dialogPicker.ts 使用）。
 *
 * 单条：一行说清主体、标题与结果；多条：一行组标题 + 每行一个任务。
 * 耗时 / 退出码是次要信息；成功 / 失败 / 已取消的语义与文案来自共享展示模型。
 *
 * @param fragment 展示片段（background_run_completion / background_task_completion）
 * @param titles 逐条标题（覆盖片段里解析出的占位值；空串 = 没有可读标题）
 */
export function renderCliNotice(fragment: string, titles: string[]): string {
  const display = describeContextualNotice(fragment);
  if (!display) return "";
  if (display.tasks.length === 0) return display.headline ?? display.subject;
  const tasks = display.tasks.map((task, index) => ({
    ...task,
    // 调用方给的标题优先；给不出时用共享模型解析出的标题（主体名兜底），
    // 内部 taskId 不冒成标题。
    title: titles[index] || task.title,
  }));
  const cliDisplay = buildNoticeDisplay(
    display.kind,
    CLI_NOTICE_SUBJECT_SPEC,
    tasks,
    display.fullText,
  );
  return renderContextualNoticeDisplay(cliDisplay);
}

/** 便捷入口：后台任务终态 → CLI 通知文本（直接走结构化渲染）。 */
export function buildCliNoticeText(tasks: CliNoticeTask[]): string {
  return renderNoticeElements({ tasks });
}

/**
 * 展示标题：完整 title 优先于 agent 标签；机器 id 不当标题用。
 */
export function resolveNoticeTitle(run: CliNoticeRun): string {
  const raw = typeof run.title === "string" ? run.title.trim() : "";
  if (raw) return raw;
  const label = resolveRunLabel({
    agentName: run.agentName,
    agentKey: run.agentKey,
    runId: run.runId,
  });
  // resolveRunLabel 兜底到 runId（run-xxx）时那不是可读标题，宁可不给标题。
  if (label === String(run.runId) || isAgentNameFallback(label)) return "";
  return label.trim();
}

/** 时间戳读取：毫秒数或 ISO 字符串；读不出来就当没有（不猜）。 */
function readNoticeTimestamp(value: string | number | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

/** 耗时（次级信息）：口径与 run 终态通知一致（共享的 formatRunAge）。 */
function formatNoticeDuration(run: CliNoticeRunRecord, nowMs: number): string {
  const startedAt = readNoticeTimestamp(run.startedAt);
  const finishedAt = readNoticeTimestamp(run.endedAt ?? run.finishedAt);
  if (startedAt === undefined || finishedAt === undefined) return "";
  return formatRunAge({ startedAt, finishedAt }, nowMs) || "";
}

/**
 * 后台 run 的结构化终态 → 展示用任务列表（标题 / 状态 / 耗时）。
 *
 * 这是合组需要的**结构化**来源：不解析任何格式化文案，状态词直接取
 * run 的终态字段，标题走 resolveNoticeTitle，耗时走共享的 formatRunAge。
 */
export function buildNoticeTasksFromRuns(
  runs: readonly CliNoticeRunRecord[],
  nowMs: number = Date.now(),
): CliNoticeTask[] {
  return runs.map((run) => ({
    title: resolveNoticeTitle({
      runId: run.runId,
      agentKey: run.agentKey,
      agentName: run.agentName,
      title: run.title,
    }),
    status: String(run.status ?? ""),
    duration: formatNoticeDuration(run, nowMs),
  }));
}

/**
 * TUI-only 的后台完成通知元信息。
 *
 * 放在 Turn 旁边的侧表里而不是 Turn 字段上：Turn 是 tuiHistory 的共享
 * 类型，给它加字段会牵动行数缓存 / offset / source mapping 的口径；
 * 侧表只影响「这条通知能不能并入上一条」的判定，不影响任何渲染口径。
 */
export type TuiNoticeMeta = {
  /** 这一条通知携带的后台任务终态（展示字段）。 */
  tasks: CliNoticeTask[];
};

const noticeMetaByTurn = new WeakMap<object, TuiNoticeMeta>();

/** 记下「这条 turn 是一条后台完成通知」。 */
export function setTurnNoticeMeta(turn: object, meta: TuiNoticeMeta): void {
  noticeMetaByTurn.set(turn, meta);
}

/** 读回「这条 turn 是不是后台完成通知」。 */
export function getTurnNoticeMeta(turn: object): TuiNoticeMeta | undefined {
  return noticeMetaByTurn.get(turn);
}

/**
 * 找出「下一条通知可以并入」的上一条通知 turn 下标；-1 = 不能合并。
 *
 * 判定只看屏幕上有无可见输出，不解析通知文案：
 * - 内容为空的轮（模型这一轮没吐出可见文字）跳过；
 * - 命中带通知元信息的轮 → 可合并（返回它的下标）；
 * - 撞到任何有可见内容的轮（用户发言 / assistant 输出 / tool 回显）→ 断开：
 *   用户看得见的输出准确打断通知组。
 */
export function findMergeableNoticeTurnIndex(
  turns: readonly { content: string }[],
): number {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i]!;
    if (turn.content.trim().length === 0) continue;
    return getTurnNoticeMeta(turn) ? i : -1;
  }
  return -1;
}

/**
 * 通知组的显示文本：一个组头 + 每条任务一行（完整标题 + 耗时）。
 *
 * 单条时没有组头（与单条通知一致）；多条时组头里的计数是整组的条数。
 */
export function buildNoticeGroupText(tasks: CliNoticeTask[]): string {
  return buildCliNoticeText(tasks);
}

/** 历史里的一轮（做合组判定只需要 content）。 */
export type NoticeTurnLike = { content: string };

/**
 * Turn 的 blocks 投影（结构与 tuiHistory.TurnBlock 对齐）。
 *
 * 刻意不 import tuiHistory：本模块是纯展示层，不把历史模块拖进依赖图。
 */
type NoticeTurnBlock = { kind: "assistant" | "tool"; content: string };

/**
 * 合组后重建 blocks 投影。
 *
 * blocks 与 content 是同一份内容的两份投影：合组换掉了 content，blocks
 * 若不重建就停在首次通知那一轮（stale）。通知轮的 blocks 只有 assistant
 * 文本块，因此按同一 kind 重建为一条承载合并后正文的块；含 tool 块的
 * 轮不做结构改写（保留原样，不删用户数据）。
 */
function rebuildNoticeBlocks(
  blocks: readonly NoticeTurnBlock[] | undefined,
  content: string
): NoticeTurnBlock[] | undefined {
  if (!blocks || blocks.length === 0) {
    return blocks as NoticeTurnBlock[] | undefined;
  }
  if (blocks.some((block) => block.kind !== "assistant")) {
    return blocks as NoticeTurnBlock[];
  }
  return [{ kind: "assistant", content }];
}

/**
 * 把新到的后台完成通知并入上一条通知轮（跨事件合组）。
 *
 * 命中条件：上一条**可见**轮就是通知轮——中间只允许没有可见输出的空轮；
 * 撞到用户发言 / assistant 输出 / tool 回显就断开（可见输出准确打断）。
 *
 * 命中时把那条通知轮的内容换成「一个组头 + 每条任务一行」的组合文本，
 * 并把合并后的任务列表记到新对象上。**换新对象**是必须的：行数与行内容
 * 缓存按 Turn 对象身份命中，内容变了必须让缓存失效，否则屏幕留着旧行。
 * offset / source mapping 仍由 content 推导，换对象不影响它们的一致性。
 *
 * @param turns 历史轮数组（就地更新）
 * @param noticeTasks 新通知携带的后台任务终态
 * @param styleContent 文本样式（通知行是 dim 的，样式由调用方给）
 * @returns 被并入的那一轮（新对象）；null = 不能并入，调用方自己新建一轮
 */
export function mergeNoticeGroup<T extends NoticeTurnLike>(
  turns: T[],
  noticeTasks: CliNoticeTask[],
  styleContent: (text: string) => string,
): T | null {
  const index = findMergeableNoticeTurnIndex(turns);
  if (index < 0) return null;
  const target = turns[index]!;
  const prevTasks = getTurnNoticeMeta(target)?.tasks ?? [];
  const mergedTasks = [...prevTasks, ...noticeTasks];
  const mergedContent = styleContent(buildNoticeGroupText(mergedTasks));
  // blocks 与 content 是两份投影：content 换代了，blocks 同步重建，
  // 否则它停在首次通知那一轮（stale）。原本没有 blocks 就不凭空造一个。
  const rebuiltBlocks = rebuildNoticeBlocks(
    (target as unknown as { blocks?: NoticeTurnBlock[] }).blocks,
    mergedContent
  );
  const merged = Object.assign({}, target, {
    content: mergedContent,
    ...(rebuiltBlocks ? { blocks: rebuiltBlocks } : {}),
  }) as T;
  turns[index] = merged;
  setTurnNoticeMeta(merged, { tasks: mergedTasks });
  return merged;
}
