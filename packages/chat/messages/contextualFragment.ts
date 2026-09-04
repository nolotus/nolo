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
  /** server legacy：continueDialogContext 注入的历史 wake 摘要。 */
  | "server_legacy_wake"
  /** TUI legacy：旧版 buildWakeMessage 的【后台 run 终态通知】格式。 */
  | "tui_legacy_wake"
  /** legacy：旧版 runtime 注入 user 消息头部的时间块（已移除，存量对话）。 */
  | "legacy_time_block";

const BACKGROUND_RUN_OPEN = "<background_run_completion";
const BACKGROUND_RUN_CLOSE = "</background_run_completion>";

// —— legacy 标记常量（格式来源见注释；不得随意改动，存量数据靠它识别） ——

/** server legacy 首行标记（continueDialogContext.ts）。 */
const SERVER_LEGACY_PREFIX = "--- 后台 run 终态事件 ---";
/** TUI legacy 首行前缀（旧版 buildWakeMessage）。 */
const TUI_LEGACY_PREFIX = "【后台 run 终态通知】";
/** legacy 时间块首行（已移除的 buildCurrentTimeBlock）。 */
const TIME_BLOCK_PREFIX = "--- 当前时间 ---";

/**
 * legacy 唤醒摘要的结构特征：正文必须有 key: value 结构行（server 端是
 * terminalStatus/childDialogId/text，TUI 端是 runId/status）。server 端正文
 * 会被 wrapHistoricalSummaryWithReplayGuard 包一层（首行是「【历史参考，
 * 非活指令】…」），所以结构行在任意正文行上找，不限定第二行。
 */
const SERVER_LEGACY_STRUCTURE = /^\s*(terminalStatus|childDialogId|text|runId|status): /;
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
    kind: "server_legacy_wake",
    match: (text) => {
      const lines = text.split("\n");
      return (
        lines[0]?.trim() === SERVER_LEGACY_PREFIX &&
        lines.slice(1).some((line) => SERVER_LEGACY_STRUCTURE.test(line))
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

// ===================== 紧凑状态行摘要（渲染层共用） =====================

export type ContextualFragmentSummary = {
  kind: ContextualFragmentKind;
  /** 紧凑状态行（UI 单行显示）。 */
  statusLine: string;
  /** 失败态（决定 ✓/✗ 图标）。 */
  failed: boolean;
  /** 展开时显示的全文。 */
  fullText: string;
};

const firstColonValue = (text: string, key: string): string =>
  new RegExp(`(?:^|\\n)\\s*${key}: ([^\\n]*)`).exec(text)?.[1]?.trim() ?? "";

const attrValue = (attrs: string, name: string): string =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1]?.trim() ?? "";

const clipLabel = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max)}…` : value;

/** 新格式 <background_run_completion> 的状态行。 */
function summarizeBackgroundRunCompletion(text: string): ContextualFragmentSummary {
  const runCount = (text.match(/<run\b/g) ?? []).length;
  const firstRunAttrs = /<run\b([^>]*)/.exec(text)?.[1] ?? "";
  const runId = attrValue(firstRunAttrs, "runId");
  const status = attrValue(firstRunAttrs, "status");
  const duration = attrValue(firstRunAttrs, "duration");
  const statuses = [...text.matchAll(/\bstatus="([^"]*)"/g)].map((m) => m[1]);
  const failed = statuses.some((s) => s !== "done");
  const icon = failed ? "✗" : "✓";
  const statusLine =
    runCount > 1
      ? `${icon} ${runCount} 条后台 run 已完成 · 首条 ${clipLabel(runId, 12)} ${status}`
      : `${icon} 后台 run ${status || "terminal"}${
          runId ? ` · ${clipLabel(runId, 12)}` : ""
        }${duration ? ` · ${duration}` : ""}`;
  return { kind: "background_run_completion", statusLine, failed, fullText: text };
}

/** 渲染层用：从片段全文提取紧凑状态行（识别失败返回 null）。 */
export function describeContextualFragment(
  text: string
): ContextualFragmentSummary | null {
  const kind = matchContextualFragment(text);
  if (!kind) return null;
  if (kind === "background_run_completion") {
    return summarizeBackgroundRunCompletion(text);
  }
  if (kind === "legacy_time_block") {
    const date = firstColonValue(text, "当前日期");
    const time = firstColonValue(text, "当前本地时间");
    return {
      kind,
      statusLine: `🕒 后台时间块${date ? ` · ${date}` : ""}${time ? ` ${time}` : ""}`,
      failed: false,
      fullText: text,
    };
  }
  if (kind === "server_legacy_wake") {
    const status =
      firstColonValue(text, "terminalStatus") || firstColonValue(text, "status");
    const childDialogId = firstColonValue(text, "childDialogId");
    const failed = Boolean(status) && status !== "done";
    return {
      kind,
      statusLine: `${failed ? "✗" : "✓"} 后台 run 终态 · ${status || "unknown"}${
        childDialogId ? ` · ${clipLabel(childDialogId, 12)}` : ""
      }`,
      failed,
      fullText: text,
    };
  }
  // tui_legacy_wake
  const runId = firstColonValue(text, "runId");
  const status = firstColonValue(text, "status");
  const duration = firstColonValue(text, "duration");
  const failed = Boolean(status) && status !== "done";
  return {
    kind,
    statusLine: `${failed ? "✗" : "✓"} 后台 run 终态${
      runId ? ` · ${clipLabel(runId, 12)}` : ""
    }${status ? ` · ${status}` : ""}${duration ? ` · ${duration}` : ""}`,
    failed,
    fullText: text,
  };
}
