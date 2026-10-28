import {
  type CliLocale,
  parseCliLocale,
  getCliLocale,
  setCliLocale,
  initCliLocale,
  newlineHint,
  dailyWelcomeTip,
} from "./locale";

import { turnStrings } from "./strings/turn";
import { sessionStrings } from "./strings/session";
import { toolStrings } from "./strings/tool";
import { agentStrings } from "./strings/agent";
import { authStrings } from "./strings/auth";
import { docStrings } from "./strings/doc";
import { updateStrings } from "./strings/update";
import { secretStrings } from "./strings/secret";
import { docCommandStrings } from "./strings/docCommands";
import { cliSurfaceStrings } from "./strings/cliSurface";
import { dialogCommandStrings } from "./strings/dialogCommands";
import { commonStrings } from "./strings/common";

export const STRINGS = {
  ...turnStrings,
  ...sessionStrings,
  ...toolStrings,
  ...agentStrings,
  ...authStrings,
  ...docStrings,
  ...updateStrings,
  ...secretStrings,
  ...docCommandStrings,
  ...cliSurfaceStrings,
  ...dialogCommandStrings,
  ...commonStrings,
} as const;

export type { CliLocale };
export {
  parseCliLocale,
  getCliLocale,
  setCliLocale,
  initCliLocale,
  newlineHint,
  dailyWelcomeTip,
};

export type CliStringKey = keyof typeof STRINGS;

export function t(key: CliStringKey, ...params: string[]): string {
  const text = STRINGS[key][getCliLocale()];
  if (params.length === 0) return text;
  // Optional {0}/{1}/... and named interpolation; missing params keep the placeholder.
  return text.replace(/\{(\d+|required|current)\}/g, (match, name) => {
    const index = name === "required" ? 0 : name === "current" ? 1 : Number(name);
    const replacement = params[index];
    return replacement === undefined ? match : replacement;
  });
}

/**
 * Human-readable tool labels for the compact tool trace.
 *
 * The trace reads as a running narration of what nolo is doing ("读取
 * packages/cli/x.ts"), so labels are action verbs rather than the raw tool
 * identifier. Only the tools a workspace user actually sees are listed —
 * anything else falls back to the raw name, which keeps the platform tool
 * registry (packages/ai/tools/index.ts, 100+ entries) out of this file.
 */
const TOOL_LABELS: Record<string, { en: string; zh: string }> = {
  // Local workspace tools (packages/agent-runtime/localWorkspaceTools.ts)
  readFile: { en: "Read", zh: "读取" },
  writeFile: { en: "Write", zh: "写入" },
  editFile: { en: "Edit", zh: "编辑" },
  codeSearch: { en: "Search", zh: "搜索" },
  globFiles: { en: "Glob", zh: "匹配" },
  execShell: { en: "Run", zh: "执行" },
  runCommand: { en: "Run", zh: "执行" },
  captureVisualState: { en: "Capture", zh: "截屏" },
  // Memory tools
  rememberMemory: { en: "Remember", zh: "记住" },
  queryMemory: { en: "Recall", zh: "查记忆" },
  deleteMemory: { en: "Forget", zh: "删记忆" },
  // Workspace / diagnostics
  searchWorkspace: { en: "Search workspace", zh: "搜索工作区" },
  // 同一工具在 web/server 工具面用 snake_case 命名（packages/ai/tools/index.ts）。
  search_workspace: { en: "Search workspace", zh: "搜索工作区" },
  // 全空间搜索：内置 skill search-all-spaces 声明的工作区工具，loadSkill 后进入
  // 工具面；同样需要中英文标签，避免回退成裸工具名。
  search_all_spaces: { en: "Search all spaces", zh: "搜索全部空间" },
  cliDoctor: { en: "Doctor", zh: "自检" },
  cliWhoami: { en: "Whoami", zh: "查看身份" },
  checkEnv: { en: "Check env", zh: "检查环境" },
  configure: { en: "Configure", zh: "配置" },
  notifyUser: { en: "Notify", zh: "通知" },
  // Docs / dialogs / spaces
  readDoc: { en: "Read doc", zh: "读取文档" },
  createDoc: { en: "Create doc", zh: "新建文档" },
  updateDoc: { en: "Update doc", zh: "更新文档" },
  readDialog: { en: "Read dialog", zh: "读取对话" },
  listDialogs: { en: "List dialogs", zh: "列出对话" },
  queryDialogsBySubjectRef: { en: "Query dialogs", zh: "查询对话" },
  searchDialogMessages: { en: "Search messages", zh: "搜索消息" },
  listSpaces: { en: "List spaces", zh: "列出空间" },
  readSpace: { en: "Read space", zh: "读取空间" },
  // Tables
  createTable: { en: "Create table", zh: "创建表" },
  queryTableRows: { en: "Query rows", zh: "查询表行" },
  addTableRow: { en: "Add row", zh: "新增表行" },
  addTableRows: { en: "Add rows", zh: "新增表行" },
  updateTableRow: { en: "Update row", zh: "更新表行" },
  deleteTableRow: { en: "Delete row", zh: "删除表行" },
  // Web
  // Tree group header uses the same short category noun as Read/Search/Run
  // ("Fetch" / "抓取网页"), not a longer "Fetch page" phrase.
  fetchWebpage: { en: "Fetch", zh: "抓取网页" },
  readPage: { en: "Read page", zh: "读取网页" },
  exa_search: { en: "Web search", zh: "联网搜索" },
  // Skill loading
  loadSkill: { en: "Used Skill", zh: "使用技能" },
  // Agent orchestration
  listAgents: { en: "List agents", zh: "列出智能体" },
  readAgent: { en: "Read agent", zh: "读取智能体" },
  startAgentRun: { en: "Start agent", zh: "启动智能体" },
  controlAgentRun: { en: "Control agent", zh: "控制智能体" },
};

/** Localized action label for a tool, falling back to the raw tool name. */
export function toolLabel(name: string): string {
  return TOOL_LABELS[name]?.[getCliLocale()] ?? name;
}

/**
 * Localized one-line description for a registered CLI subcommand, keyed by
 * `path.join(" ")` (e.g. "auth chatgpt"). Returns null when no localized copy
 * exists so `nolo <group> --help` falls back to the registry's English
 * description instead of inventing one.
 */
export const COMMAND_DESCRIPTIONS: Record<string, Record<CliLocale, string>> = {
  "auth cooldown": {
    en: "List / clear credential availability cooldowns",
    zh: "列出 / 清除凭证可用性冷却",
  },
  "auth cloudflare": {
    en: "Authorize Cloudflare OAuth",
    zh: "授权 Cloudflare OAuth",
  },
  "auth chatgpt": {
    en: "Authorize ChatGPT / OpenAI Codex OAuth",
    zh: "授权 ChatGPT / OpenAI Codex OAuth",
  },
  "auth xai": {
    en: "Authorize xAI Grok OAuth (SuperGrok subscription)",
    zh: "授权 xAI Grok OAuth（SuperGrok 订阅）",
  },
  "auth antigravity": {
    en: "Authorize Google Antigravity OAuth",
    zh: "授权 Google Antigravity OAuth",
  },
  "auth claude": {
    en: "Authorize Claude Pro/Max OAuth",
    zh: "授权 Claude Pro/Max OAuth",
  },
  "auth cursor": {
    en: "Authorize Cursor Pro OAuth",
    zh: "授权 Cursor Pro OAuth",
  },
  "auth devin": {
    en: "Authorize Devin OAuth (Free SWE-2)",
    zh: "授权 Devin OAuth（免费 SWE-2）",
  },
};

export function cliCommandDescription(commandPath: string): string | null {
  return COMMAND_DESCRIPTIONS[commandPath]?.[getCliLocale()] ?? null;
}

/**
 * Every localized spelling of a tool label.
 *
 * Readers that RECOGNIZE a tool row in existing text must not depend on the
 * locale that happens to be active at paint time: a transcript row keeps the
 * spelling it was written with, and `/lang` can switch mid-session (the
 * transcript is then repainted under the new locale). Matching the current
 * locale only would silently demote those rows to ordinary prose.
 */
export function toolLabelVariants(name: string): string[] {
  const entry = TOOL_LABELS[name];
  if (!entry) return [name];
  return [...new Set(Object.values(entry))];
}

/**
 * Localized short status word for a run row (panel / dock).
 *
 * Terminal mapping mirrors the fixed run zone (`timeout`/`orphaned` read as
 * failure, `killed`/`cancelled` read as cancelled) so every run surface says
 * the same thing about the same state. Unknown future statuses fall through
 * verbatim: an unfamiliar word beats a blank.
 */
export function agentRunStatusWord(status: string): string {
  switch (status) {
    case "running":
      return t("runZoneRunning");
    case "pending":
      return t("runZonePending");
    case "cancelling":
      return t("runZoneCancelling");
    case "done":
      return t("runZoneDone");
    case "killed":
    case "cancelled":
      return t("runZoneCancelled");
    case "failed":
    case "timeout":
    case "orphaned":
      return t("runZoneFailed");
    case "not_found":
      return t("runStatusNotFound");
    default:
      return status;
  }
}

/** Labels injected into `packages/ai` agent-run card helpers (no cli→ai reverse dep). */
export function agentRunCardLabels(): {
  runStatus: string;
  runStarted: string;
  runStopped: string;
  runFinished: string;
  logTail: string;
  runs: (count: number) => string;
  toolCount: (count: number) => string;
  statusWord: (status: string) => string;
  /** Placeholder shown when a run's only name is a machine key (agent-pub-…). */
  unnamedAgent: string;
  rows: {
    agent: string;
    status: string;
    tools: string;
    note: string;
    error: string;
    task: string;
  };
} {
  return {
    runStatus: t("runStatusLabel"),
    runStarted: t("runStartedLabel"),
    runStopped: t("runStoppedLabel"),
    runFinished: t("runFinishedLabel"),
    logTail: t("runLogTailLabel"),
    runs: (count: number) => t("runsListLabel", String(count)),
    toolCount: (count: number) => t("runToolsCount", String(count)),
    statusWord: agentRunStatusWord,
    // Same folding rule as the run zone/panel: an unnamed run's machine key
    // collapses to the kind-of-actor word, never the key itself.
    unnamedAgent: t("subAgentName"),
    // Padding rides on the value so the default English layout is unchanged.
    rows: {
      agent: `${t("runRowAgent")}   `,
      status: `${t("runRowStatus")}  `,
      tools: `${t("runRowTools")}   `,
      note: `${t("runRowNote")}    `,
      error: `${t("runRowError")}   `,
      task: `${t("runRowTask")}    `,
    },
  };
}
