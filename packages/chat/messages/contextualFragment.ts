/**
 * ContextualFragment —— 系统注入进 user role 的上下文片段识别注册表。
 *
 * 问题：后台 run 终态唤醒等系统事件以 user role 落进对话历史（模型侧需要
 * 完整上下文），但 web/RN 渲染层只看 role，把它们整段渲染成假用户消息。
 *
 * 方案（参照 Codex CLI 的 ContextualUserFragment 模式）：系统注入的
 * user-role 文本用固定标记包裹；本注册表是唯一的格式真源，web/RN/TUI
 * 渲染层统一从这里识别，命中则折叠为紧凑状态行，不进用户气泡。
 *
 * 规则：
 * - 纯函数、零运行时依赖，web/rn/cli 三端都能安全 import。
 * - legacy 格式匹配必须是「开头前缀 + 结构匹配」，不能只看包含——用户在
 *   正文里引用这些标记（比如粘贴一段旧日志）不得误判成系统片段。
 * - 新格式用精确 tag 包裹匹配（trim 后 startsWith + endsWith）。
 * - 不做数据迁移：存量消息靠这里的 legacy 匹配兜底。
 */

/** 上下文片段种类。 */
export type ContextualFragmentKind =
  /** 新格式：buildWakeMessage 产出的后台 run 终态标记。 */
  | "background_run_completion"
  /** 新格式：进程任务（launchProcess / detach 的 execShell）终态标记。 */
  | "background_task_completion"
  /** TUI legacy：旧版 buildWakeMessage 的【后台 run 终态通知】格式。 */
  | "tui_legacy_wake"
  /** legacy：旧版 runtime 注入 user 消息头部的时间块（已移除，存量对话）。 */
  | "legacy_time_block";

const BACKGROUND_RUN_OPEN = "<background_run_completion";
const BACKGROUND_RUN_CLOSE = "</background_run_completion>";
const BACKGROUND_TASK_OPEN = "<background_task_completion";
const BACKGROUND_TASK_CLOSE = "</background_task_completion>";

// —— legacy 标记常量（格式来源见注释；不得随意改动，存量数据靠它识别） ——

/** TUI legacy 首行前缀（旧版 buildWakeMessage）。 */
const TUI_LEGACY_PREFIX = "【后台 run 终态通知】";
/** legacy 时间块首行（已移除的 buildCurrentTimeBlock）。 */
const TIME_BLOCK_PREFIX = "--- 当前时间 ---";

/** legacy 唤醒摘要的结构特征：正文必须有 key: value 结构行（TUI 端是 runId/status）。 */
const TUI_LEGACY_STRUCTURE = /^\s*runId: /m;
/** 时间块结构特征：buildCurrentTimeBlock 的正文固定有「当前日期:」行。 */
const TIME_BLOCK_STRUCTURE = /^\s*当前日期: /;

type FragmentMatcher = {
  kind: ContextualFragmentKind;
  match: (text: string) => boolean;
};

/** 注册表按序匹配：新格式优先，legacy 兜底。 */
const registry: readonly FragmentMatcher[] = [
  {
    kind: "background_run_completion",
    match: (text) => {
      const trimmed = text.trim();
      return (
        trimmed.startsWith(BACKGROUND_RUN_OPEN) &&
        trimmed.endsWith(BACKGROUND_RUN_CLOSE)
      );
    },
  },
  {
    kind: "background_task_completion",
    match: (text) => {
      const trimmed = text.trim();
      return (
        trimmed.startsWith(BACKGROUND_TASK_OPEN) &&
        trimmed.endsWith(BACKGROUND_TASK_CLOSE)
      );
    },
  },
  {
    kind: "tui_legacy_wake",
    match: (text) =>
      text.startsWith(TUI_LEGACY_PREFIX) && TUI_LEGACY_STRUCTURE.test(text),
  },
  {
    kind: "legacy_time_block",
    match: (text) => {
      const lines = text.split("\n");
      return (
        lines[0]?.trim() === TIME_BLOCK_PREFIX &&
        lines.slice(1).some((line) => TIME_BLOCK_STRUCTURE.test(line))
      );
    },
  },
];

/**
 * 识别一段 user-role 文本是否为系统注入的上下文片段。
 * 未命中返回 null（普通用户消息，走原渲染路径，零行为变化）。
 */
export function matchContextualFragment(
  text: string
): ContextualFragmentKind | null {
  if (typeof text !== "string" || !text) return null;
  for (const matcher of registry) {
    if (matcher.match(text)) return matcher.kind;
  }
  return null;
}

// ===================== 共享纯展示模型（web / RN / TUI 共用） =====================

/**
 * 展示模型边界：只做「唤醒文本 → 展示结构」的纯映射，不碰唤醒 payload、
 * 执行、持久化与计费。web / RN / TUI 共用同一份结构与文案，避免三端各写
 * 一套措辞（双实现漂移）。
 *
 * 文案约定：
 * - 用户可见主体统一叫「后台任务」（进程任务与 agent run 都不叫「后台 run」）；
 * - 成功 / 失败 / 已取消 / 部分完成 四种语义显式建模，多任务混合即部分完成；
 * - 任务标题完整保留（不截断），窄屏换行交给 UI 层；
 * - 耗时、退出码、runId 都是次要信息。
 */

/** 完成态语义（成功 / 失败 / 已取消 / 多任务混合的部分完成）。 */
export type ContextualOutcome =
  | "success"
  | "failure"
  | "cancelled"
  | "partial";

/** 单个后台任务 / run 的展示信息（纯展示，UI 直接取用）。 */
export type ContextualTaskDisplay = {
  /** 完整标题（不截断；窄屏换行由 UI 负责）。 */
  title: string;
  /** 次要标识（runId / childDialogId）。 */
  identifier?: string;
  /** Original machine evidence; absent on older notice formats. */
  runStatus?: string;
  childDialogId?: string;
  /** 结果语义。 */
  outcome: ContextualOutcome;
  /** 结果文案（次级）。 */
  outcomeLabel: string;
  /** 耗时（次级）。 */
  duration?: string;
  /** 退出码（次级）。 */
  exitCode?: number;
};

/** 一条完成通知的展示模型（纯展示）。 */
export type ContextualNoticeDisplay = {
  /** 片段种类。 */
  kind: ContextualFragmentKind;
  /** 主体名词：后台任务（进程任务与 agent run 统一称呼，用户可见不出现 run）。 */
  subject: string;
  /** 整组结果语义。 */
  outcome: ContextualOutcome;
  /** 整组结果文案。 */
  outcomeLabel: string;
  /** 组标题：多任务时给出；单任务时为 null（标题由任务行承载）。 */
  headline: string | null;
  /** 组标题右侧次要信息（成功 / 失败计数）。 */
  headlineMeta?: string;
  /** 逐条任务（空数组 = 只有组标题的兼容态）。 */
  tasks: ContextualTaskDisplay[];
  /** 详情入口展开的全文。 */
  fullText: string;
};

const OUTCOME_LABEL: Record<ContextualOutcome, string> = {
  success: "已完成",
  failure: "失败",
  cancelled: "已取消",
  partial: "部分完成",
};

const OUTCOME_ICON: Record<ContextualOutcome, string> = {
  success: "✓",
  failure: "✗",
  cancelled: "■",
  partial: "◐",
};

/** 主体名词与量词：用户可见统一「后台任务」，量词跟主体走。 */
const SUBJECT_TASK = { label: "后台任务", countWord: "个" };
const SUBJECT_RUN = { label: "后台任务", countWord: "个" };

/** 结果语义 → 文案（UI 与 TUI 共用）。 */
export function formatContextualOutcomeLabel(
  outcome: ContextualOutcome
): string {
  return OUTCOME_LABEL[outcome];
}

/** 结果语义 → 图标（UI 与 TUI 共用）。 */
export function formatContextualOutcomeIcon(outcome: ContextualOutcome): string {
  return OUTCOME_ICON[outcome];
}

const firstColonValue = (text: string, key: string): string =>
  new RegExp(`(?:^|\\n)\\s*${key}: ([^\\n]*)`).exec(text)?.[1]?.trim() ?? "";

const attrValue = (attrs: string, name: string): string =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1]?.trim() ?? "";

/**
 * XML 实体解码（生产端用 escapeXmlAttribute 转义过属性值）。
 *
 * 顺序要紧：&amp; 放最后解，否则 "&amp;lt;" 会被解成 "<"。
 */
function decodeXmlAttribute(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** run 状态 → 语义（done=成功；killed/stopped=已取消；其余=失败）。 */
function runStatusOutcome(status: string): ContextualOutcome {
  const s = status.trim().toLowerCase();
  if (!s) return "failure";
  if (s === "done" || s === "succeeded" || s === "success" || s === "ok") {
    return "success";
  }
  if (
    s === "killed" ||
    s === "stopped" ||
    s === "cancelled" ||
    s === "canceled"
  ) {
    return "cancelled";
  }
  return "failure";
}

/** 任务状态词与退出码 → 语义（exited 且退出码 0=成功；非零退出码=失败；stopped=已取消）。 */
export function taskStatusOutcome(status: string, exitCode?: number): ContextualOutcome {
  const s = status.trim().toLowerCase();
  if (
    s === "stopped" ||
    s === "cancelled" ||
    s === "canceled" ||
    s === "killed"
  ) {
    return "cancelled";
  }
  if (
    s === "exited" ||
    s === "done" ||
    s === "succeeded" ||
    s === "success" ||
    s === "ok"
  ) {
    return exitCode !== undefined && exitCode !== 0 ? "failure" : "success";
  }
  return "failure";
}

/** 毫秒 → 人读耗时（次级信息）。 */
export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

/** 进程任务终态行：[Background task <id> (label: "x") finished: status=exited exitCode=0] */
const TASK_LINE =
  /^\[Background task (\S+?)(?: \(label: "((?:[^"\\]|\\.)*)"\))? finished: status=(\w+)(?: exitCode=(-?\d+))?\]$/;
/** result capsule 元信息行：result capsule (duration=1234ms, tail-only): */
const CAPSULE_META = /^result capsule \(([^)]*)\):/;

/**
 * 解析进程任务终态列表。
 *
 * 只认「整行就是任务终态行」的形态（行首锚定），避免把 capsule 里的
 * stdout 原文误认成任务——stdout 是任意文本，包含相同字面量的概率低但非零，
 * 剩余风险与 payload 格式绑定，不在本块的展示层改动范围内。
 */
function parseBackgroundTasks(text: string): ContextualTaskDisplay[] {
  const tasks: ContextualTaskDisplay[] = [];
  let current: ContextualTaskDisplay | null = null;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const taskMatch = TASK_LINE.exec(line);
    if (taskMatch) {
      const exitCode =
        taskMatch[4] !== undefined ? Number(taskMatch[4]) : undefined;
      const outcome = taskStatusOutcome(taskMatch[3], exitCode);
      const label = taskMatch[2]
        ? taskMatch[2].replace(/\\(["\\])/g, "$1").trim()
        : "";
      current = {
        // 标题完整保留：不截断，窄屏换行交给 UI。
        // 无 label 时不给内部 id 当标题：退回主体名「后台任务」，
        // taskId 只留在 identifier / fullText（机器标识不进标题）。
        title: label || SUBJECT_TASK.label,
        identifier: taskMatch[1],
        outcome,
        outcomeLabel: OUTCOME_LABEL[outcome],
        ...(exitCode !== undefined ? { exitCode } : {}),
      };
      tasks.push(current);
      continue;
    }
    const capsule = CAPSULE_META.exec(line);
    if (capsule && current) {
      const duration = /duration=(\d+)ms/.exec(capsule[1]);
      if (duration) current.duration = formatDurationMs(Number(duration[1]));
    }
  }
  return tasks;
}

/** 解析 run 终态列表（<run ... /> 与 <run ...>…</run> 的开标签属性一致）。 */
function parseBackgroundRuns(text: string): ContextualTaskDisplay[] {
  const tasks: ContextualTaskDisplay[] = [];
  for (const match of text.matchAll(/<run\b([^>]*?)(?:\/>|>)/g)) {
    const attrs = match[1];
    const runId = attrValue(attrs, "runId");
    const agent = attrValue(attrs, "agent");
    // 真实任务标题优先：生产端给了 title 就用它，其次才是 agent 标签 / runId。
    const title = decodeXmlAttribute(attrValue(attrs, "title"));
    const status = attrValue(attrs, "status");
    const duration = attrValue(attrs, "duration");
    const exitCodeRaw = attrValue(attrs, "exitCode");
    const outcome = runStatusOutcome(status);
    tasks.push({
      title: title || agent || runId || SUBJECT_RUN.label,
      ...(runId ? { identifier: runId } : {}),
      ...(status ? { runStatus: status } : {}),
      ...(attrValue(attrs, "childDialogId") && attrValue(attrs, "childDialogId") !== "missing"
        ? { childDialogId: decodeXmlAttribute(attrValue(attrs, "childDialogId")) } : {}),
      outcome,
      outcomeLabel: OUTCOME_LABEL[outcome],
      ...(duration ? { duration } : {}),
      ...(exitCodeRaw ? { exitCode: Number(exitCodeRaw) } : {}),
    });
  }
  return tasks;
}

/** 整组语义：全部一致取该语义，混合即部分完成。 */
function combineOutcome(tasks: ContextualTaskDisplay[]): ContextualOutcome {
  if (tasks.length === 0) return "success";
  const distinct = new Set(tasks.map((task) => task.outcome));
  if (distinct.size === 1) return tasks[0].outcome;
  return "partial";
}

/** 整组结果文案：单条用基础词，多条区分「全部」与「部分」。 */
function groupOutcomeLabel(
  outcome: ContextualOutcome,
  taskCount: number
): string {
  if (outcome === "partial") return OUTCOME_LABEL.partial;
  if (taskCount <= 1) return OUTCOME_LABEL[outcome];
  if (outcome === "success") return "全部完成";
  if (outcome === "failure") return "全部失败";
  return "全部已取消";
}

/** 计数摘要（次要信息）：2 成功 · 1 失败。 */
function outcomeCountsMeta(tasks: ContextualTaskDisplay[]): string {
  const count = { success: 0, failure: 0, cancelled: 0 };
  for (const task of tasks) {
    if (
      task.outcome === "success" ||
      task.outcome === "failure" ||
      task.outcome === "cancelled"
    ) {
      count[task.outcome] += 1;
    }
  }
  const parts: string[] = [];
  if (count.success) parts.push(`${count.success} 成功`);
  if (count.failure) parts.push(`${count.failure} 失败`);
  if (count.cancelled) parts.push(`${count.cancelled} 已取消`);
  return parts.join(" · ");
}

/** 组装展示模型（新格式：run / 进程任务 / TUI 结构化通知）。 */
export function buildNoticeDisplay(
  kind: ContextualFragmentKind,
  subject: { label: string; countWord: string },
  tasks: ContextualTaskDisplay[],
  fullText = ""
): ContextualNoticeDisplay {
  const outcome = combineOutcome(tasks);
  const isGroup = tasks.length > 1;
  // 主体以拉丁字母结尾时补一个空格，中文主体不补（当前主体统一为中文）。
  const tailSpace = /[A-Za-z0-9]$/.test(subject.label) ? " " : "";
  const headline = isGroup
    ? `${tasks.length} ${subject.countWord}${subject.label}${tailSpace}已结束`
    : null;
  const headlineMeta =
    isGroup && outcome === "partial" ? outcomeCountsMeta(tasks) : undefined;
  return {
    kind,
    subject: subject.label,
    outcome,
    outcomeLabel: groupOutcomeLabel(outcome, tasks.length),
    headline,
    ...(headlineMeta ? { headlineMeta } : {}),
    tasks,
    fullText,
  };
}

/**
 * 兼容态（存量对话的 legacy 片段）：没有结构化任务，只给一行组标题，
 * 保留原始 status 词（done/failed）便于与旧记录对照。
 */
function buildLegacyDisplay(
  kind: ContextualFragmentKind,
  text: string
): ContextualNoticeDisplay {
  if (kind === "legacy_time_block") {
    const date = firstColonValue(text, "当前日期");
    const time = firstColonValue(text, "当前本地时间");
    const stamp = [date, time].filter(Boolean).join(" ");
    return {
      kind,
      subject: "时间块",
      outcome: "success",
      outcomeLabel: OUTCOME_LABEL.success,
      headline: `后台时间块${stamp ? ` · ${stamp}` : ""}`,
      tasks: [],
      fullText: text,
    };
  }
  const runId = firstColonValue(text, "runId");
  const status = firstColonValue(text, "status");
  const duration = firstColonValue(text, "duration");
  const outcome = runStatusOutcome(status);
  return {
    kind,
    subject: SUBJECT_RUN.label,
    outcome,
    outcomeLabel: OUTCOME_LABEL[outcome],
    headline: `后台任务 终态${runId ? ` · ${runId}` : ""}${
      status ? ` · ${status}` : ""
    }${duration ? ` · ${duration}` : ""}`,
    tasks: [],
    fullText: text,
  };
}

/**
 * 渲染层用：把片段全文映射为共享展示模型（识别失败返回 null）。
 *
 * 这是本块的单一真值：web 状态行、RN 状态行与后续 TUI 复用都从这里的
 * 纯函数取文案，不各自解析 payload。
 */
export function describeContextualNotice(
  text: string
): ContextualNoticeDisplay | null {
  const kind = matchContextualFragment(text);
  if (!kind) return null;
  if (kind === "background_run_completion") {
    return buildNoticeDisplay(kind, SUBJECT_RUN, parseBackgroundRuns(text), text);
  }
  if (kind === "background_task_completion") {
    return buildNoticeDisplay(kind, SUBJECT_TASK, parseBackgroundTasks(text), text);
  }
  return buildLegacyDisplay(kind, text);
}

/** 单条任务的次要信息（结果 + 耗时 + 退出码 + 标识符）。 */
export function formatContextualTaskMeta(task: ContextualTaskDisplay): string {
  const parts = [task.outcomeLabel];
  if (task.duration) parts.push(task.duration);
  // 机器标识（runId）不占摘要空间：完整详情（fullText）里仍在，模型字段不删。
  // exit 0 是成功默认态、不展示；非零退出码保留（失败要看得见原因）。
  if (task.exitCode !== undefined && task.exitCode !== 0) {
    parts.push(`exit ${task.exitCode}`);
  }
  return parts.join(" · ");
}

/** 单条任务的完整一行（图标 + 标题 + 次要信息）。 */
export function formatContextualTaskLine(task: ContextualTaskDisplay): string {
  return `${OUTCOME_ICON[task.outcome]} ${task.title} · ${formatContextualTaskMeta(
    task
  )}`;
}

/**
 * 通知的标题部分：多任务给组标题，单条给「主体「标题」」，legacy 给兼容文案。
 */
export function formatContextualNoticeTitle(
  display: ContextualNoticeDisplay
): string {
  if (display.tasks.length === 0) return display.headline ?? display.subject;
  if (display.tasks.length === 1) {
    const task = display.tasks[0];
    return task.title && task.title !== display.subject
      ? `${display.subject}「${task.title}」`
      : display.subject;
  }
  return display.headline ?? display.subject;
}

/** 通知的次要信息部分：单条是结果/耗时，多条是组结果与计数。 */
export function formatContextualNoticeMeta(
  display: ContextualNoticeDisplay
): string {
  if (display.tasks.length === 0) return "";
  if (display.tasks.length === 1) {
    return formatContextualTaskMeta(display.tasks[0]);
  }
  const counts = display.headlineMeta ?? "";
  return counts ? `${display.outcomeLabel} · ${counts}` : display.outcomeLabel;
}

/**
 * 整条通知的单行摘要（TUI / 窄屏复用）。
 * 单条：一行说清主体、标题与结果；多条：组标题 + 组结果 + 计数。
 */
export function formatContextualNoticeSummary(
  display: ContextualNoticeDisplay
): string {
  const icon = OUTCOME_ICON[display.outcome];
  const title = formatContextualNoticeTitle(display);
  const meta = formatContextualNoticeMeta(display);
  return `${icon} ${title}${meta ? ` · ${meta}` : ""}`;
}

/** 兼容旧调用点的摘要结构（statusLine 现在由共享展示模型派生）。 */
export type ContextualFragmentSummary = {
  kind: ContextualFragmentKind;
  /** 紧凑状态行（UI 单行显示）。 */
  statusLine: string;
  /** 失败态（决定 ✓/✗ 图标）。 */
  failed: boolean;
  /** 展开时显示的全文。 */
  fullText: string;
};

/** 渲染层用：从片段全文提取紧凑状态行（识别失败返回 null）。 */
export function describeContextualFragment(
  text: string
): ContextualFragmentSummary | null {
  const display = describeContextualNotice(text);
  if (!display) return null;
  return {
    kind: display.kind,
    statusLine: formatContextualNoticeSummary(display),
    failed: display.outcome === "failure" || display.outcome === "partial",
    fullText: display.fullText,
  };
}

// ===================== 相邻后台完成消息分组（纯展示层） =====================

/** 可合组的后台完成通知种类（时间块不是完成通知，不参与合组）。 */
const GROUPABLE_KINDS: ReadonlySet<ContextualFragmentKind> = new Set([
  "background_run_completion",
  "background_task_completion",
  "tui_legacy_wake",
]);

/**
 * 相邻后台完成消息的分组信息（纯展示）。
 *
 * 只做视觉合组：不合并持久消息、不改模型输入；每条通知仍是一条消息，
 * 详情入口与全文都留在各自条目上。
 */
export type ContextualNoticeGroup = {
  /** 组内序号（0 = 组首，按展示顺序）。 */
  index: number;
  /** 组内条数（1 = 未成组，渲染层按普通单条处理）。 */
  size: number;
  /** 整组结果语义（决定组头图标与色调）。 */
  outcome: ContextualOutcome;
  /** 组头文案（整组只出现一次，不在每条上重复主体）。 */
  title: string;
  /** 组头右侧次要信息（结果与计数）。 */
  meta: string;
};

/**
 * 组头文案与次要信息：整组一个结果语义，混合即部分完成 + 计数。
 *
 * 计数口径 = **任务数**（把每条通知里的任务 flatten 后的条数），不是消息
 * 条数：一条唤醒消息可以携带多个任务，组头数字必须与下方逐行任务对得上。
 * legacy 片段没有结构化任务，按 1 计。
 */
function buildContextualGroupHeader(
  displays: ContextualNoticeDisplay[]
): { outcome: ContextualOutcome; title: string; meta: string } {
  // 逐任务口径：通知带任务就按任务算，legacy 通知按一条算。
  const outcomes: ContextualOutcome[] = [];
  for (const display of displays) {
    if (display.tasks.length > 0) {
      for (const task of display.tasks) outcomes.push(task.outcome);
    } else {
      outcomes.push(display.outcome);
    }
  }
  const distinct = new Set(outcomes);
  const outcome: ContextualOutcome =
    distinct.size === 1 ? (outcomes[0] as ContextualOutcome) : "partial";
  const counts = { success: 0, failure: 0, cancelled: 0 };
  for (const one of outcomes) {
    if (one === "success" || one === "failure" || one === "cancelled") {
      counts[one] += 1;
    }
  }
  const parts: string[] = [];
  if (counts.success) parts.push(`${counts.success} 成功`);
  if (counts.failure) parts.push(`${counts.failure} 失败`);
  if (counts.cancelled) parts.push(`${counts.cancelled} 已取消`);
  const taskCount = outcomes.length;
  const title = `${taskCount} ${SUBJECT_TASK.countWord}${SUBJECT_TASK.label}已结束`;
  const meta =
    outcome === "partial"
      ? `${OUTCOME_LABEL.partial}${parts.length ? ` · ${parts.join(" · ")}` : ""}`
      : groupOutcomeLabel(outcome, taskCount);
  return { outcome, title, meta };
}

/**
 * 相邻后台完成消息分组（纯展示层，web / RN 共用同一份判定）。
 *
 * - 输入按展示顺序给出每条消息的文本（null / 空 = 非通知）；
 * - 输出与输入等长：普通消息（以及工具行、其它系统行）为 null，
 *   相邻的后台完成消息给出同一组信息（index 递增，size 为组内条数）；
 * - 普通消息准确打断分组：两条通知之间插入任何普通消息即分成两组。
 */
export function groupContextualNotices(
  texts: readonly (string | null | undefined)[]
): (ContextualNoticeGroup | null)[] {
  const result: (ContextualNoticeGroup | null)[] = texts.map(() => null);
  let start = -1;
  const flush = (end: number) => {
    if (start < 0) return;
    const size = end - start;
    const displays: ContextualNoticeDisplay[] = [];
    for (let i = start; i < end; i++) {
      const display = describeContextualNotice(texts[i] ?? "");
      if (display) displays.push(display);
    }
    if (displays.length > 0) {
      const header = buildContextualGroupHeader(displays);
      for (let i = start; i < end; i++) {
        result[i] = { ...header, index: i - start, size };
      }
    }
    start = -1;
  };
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    const kind = typeof text === "string" ? matchContextualFragment(text) : null;
    if (kind && GROUPABLE_KINDS.has(kind)) {
      if (start < 0) start = i;
      continue;
    }
    flush(i);
  }
  flush(texts.length);
  return result;
}
