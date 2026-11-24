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

export const controlMessageStrings = {
  controlQueued: { en: "queued", zh: "已入队" },
  controlEnqueued: { en: "[enqueued {0}]", zh: "[已入队 {0}]" },
  controlContinued: { en: "continued", zh: "已续跑" },
  controlConsumed: { en: "consumed", zh: "已消费" },
  controlRun: { en: "run", zh: "任务" },
  controlTarget: { en: "target", zh: "目标" },
  controlMessage: { en: "message", zh: "消息" },
} as const;

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
  ...controlMessageStrings,
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
  read_image: { en: "Image", zh: "看图" },
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
 * 工具族的紧凑图标与族名（规则表）。
 *
 * 默认 transcript 行只留「图标 + 极短标识（gist）」：一行一个 emoji + 参数
 * 摘要，不铺本地化工具名，也不铺全参数。图标承担「工具族」这一层语义
 * （读 / 写 / 执行 / 插件 / 进程 / 表格…），具体是哪个工具由 gist 与 /tools
 * 详情回答；需要文字的地方继续走 `toolLabel` / `toolFamilyLabel` 的双语标签，
 * 两者不重复定义。
 *
 * 规则分两层，可审计、易加新系列：
 *  1. `TOOL_FAMILY_OVERRIDES`：少量高频工具的精确映射，作为稳定锚点；
 *  2. `TOOL_FAMILY_RULES`：按前缀/模式匹配整个系列（mcp* / app* / browser_* /
 *     cf*·cloudflare* / 进程与 task / 智能体 / 表格 …），首次命中即采用。
 * 两层都没命中才落到兜底族（🔧）。一个族一个图标、一个双语族名；不同族不
 * 共用图标，避免「图标相同、含义不同」。
 */
export type ToolFamily = {
  /** 稳定 id：规则表与测试用它做审计键。 */
  id: string;
  /** 历史单字符符号（仅兼容旧 transcript 还原，主行显示已改用短动作标签）。 */
  icon: string;
  en: string;
  zh: string;
};

const family = (id: string, icon: string, en: string, zh: string): ToolFamily => ({ id, icon, en, zh });

export const TOOL_FAMILIES = {
  read: family("read", "<", "Read", "读取"),
  write: family("write", "+", "Write", "写入"),
  run: family("run", "$", "Run", "命令"),
  search: family("search", "?", "Find", "搜索"),
  fetch: family("fetch", "^", "Fetch", "网页"),
  list: family("list", "=", "List", "列表"),
  memory: family("memory", "~", "Mem", "记忆"),
  agent: family("agent", "@", "Agent", "智能体"),
  skill: family("skill", "*", "Skill", "技能"),
  interaction: family("interaction", ":", "Ask", "交互"),
  table: family("table", "#", "Table", "表格"),
  capture: family("capture", "|", "Shot", "截屏"),
  delete: family("delete", "-", "Del", "删除"),
  mcp: family("mcp", "%", "MCP", "插件"),
  app: family("app", ";", "App", "应用"),
  browser: family("browser", ">", "Web", "浏览器"),
  cloud: family("cloud", "/", "Cloud", "云"),
  process: family("process", "&", "Proc", "进程"),
  email: family("email", "»", "Mail", "邮件"),
  scrape: family("scrape", "«", "Scrape", "采集"),
  media: family("media", "∆", "Image", "看图"),
  default: family("default", "◊", "Tool", "工具"),
} as const;

/** 无映射时的兜底图标：未知工具也要有一眼可辨的类型位。 */
export const DEFAULT_TOOL_ICON: string = TOOL_FAMILIES.default.icon;

/**
 * 第一层：高频工具的精确映射。
 *
 * 只钉最常用的几个，防止将来通配规则调整把它们悄悄改族；其余交给规则表。
 */
const TOOL_FAMILY_OVERRIDES: Record<string, ToolFamily> = {
  readFile: TOOL_FAMILIES.read,
  read_image: TOOL_FAMILIES.media,
  readDoc: TOOL_FAMILIES.read,
  readDialog: TOOL_FAMILIES.read,
  readSpace: TOOL_FAMILIES.read,
  readPage: TOOL_FAMILIES.read,
  readArtifact: TOOL_FAMILIES.read,
  writeFile: TOOL_FAMILIES.write,
  materializeWorkspaceFile: TOOL_FAMILIES.write,
  commitSandboxArtifact: TOOL_FAMILIES.write,
  editFile: TOOL_FAMILIES.write,
  createDoc: TOOL_FAMILIES.write,
  updateDoc: TOOL_FAMILIES.write,
  execShell: TOOL_FAMILIES.run,
  exec_shell: TOOL_FAMILIES.run,
  runCommand: TOOL_FAMILIES.run,
  checkEnv: TOOL_FAMILIES.run,
  cliDoctor: TOOL_FAMILIES.run,
  cliWhoami: TOOL_FAMILIES.run,
  configure: TOOL_FAMILIES.run,
  fetchWebpage: TOOL_FAMILIES.fetch,
  exa_search: TOOL_FAMILIES.search,
  codeSearch: TOOL_FAMILIES.search,
  globFiles: TOOL_FAMILIES.search,
  ask_user: TOOL_FAMILIES.interaction,
  show_interaction: TOOL_FAMILIES.interaction,
  notifyUser: TOOL_FAMILIES.interaction,
  captureVisualState: TOOL_FAMILIES.capture,
  loadSkill: TOOL_FAMILIES.skill,
  // 名字不切出已知系列词的工具（`toolquery`）：它是工具查询，属于读取族；
  // 精确钉住以免退到兜底 🔧。
  toolquery: TOOL_FAMILIES.read,
};

/**
 * 第二层：系列级规则（按前缀/模式）。
 *
 * 顺序敏感：具体系列排在通用前缀之前（`appFileWrite` 属于应用族而不是写入族的
 * 前缀例外；`deleteTableRow` 属于表格族而不是删除族）。加新系列只需追加一条
 * `{ id, family, test }`，不需要逐个工具硬编码。
 */
/**
 * 工具名切成小写词，供族规则做「整词」匹配：分隔符 + camelCase 词界。
 *
 * 规则曾用裸子串（`/mcp/i`、`/Run/`、`/(read|query)/i`），于是无关词里的字母
 * 序列也被当成家族标记——`readDramCpuCounters` 命中 mcp（`DramCpu` 里的
 * `mcp`）、`readRuntimeConfig` 命中 Run（`Runtime` 里的 `Run`）、`startThread`
 * 命中 read（`Thread` 里的 `read`）。切词后只有完整词参与匹配，这类串扰不再
 * 出现。图标只是展示，分错族的后果仅限图标不准，不影响任何行为判定。
 */
export function toolNameWords(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

type ToolFamilyRule = { id: string; family: ToolFamily; test: (name: string) => boolean };

/**
 * 词的单复数归一：`listAgents` → agents → agent、`listProcesses` → processes →
 * process。只做词尾变化，不做子串匹配。
 */
const wordForms = (word: string): string[] => {
  const forms = [word];
  if (word.endsWith("es")) forms.push(word.slice(0, -2));
  if (word.endsWith("s")) forms.push(word.slice(0, -1));
  return forms;
};

/** 命中其中任意一个完整词（`listMcpTools` → list / mcp / tools）。 */
const hasWord = (...words: string[]) => (name: string) =>
  toolNameWords(name).some((word) => wordForms(word).some((form) => words.includes(form)));

/** 首个词命中（`browser_click` → browser；`DramCpu` 不会被当作 mcp）。 */
const startsWithWord = (...words: string[]) => (name: string) =>
  words.includes(toolNameWords(name)[0] ?? "");

export const TOOL_FAMILY_RULES: readonly ToolFamilyRule[] = [
  // MCP 插件：listMcpConnections / listMcpTools / callMcpTool，以及带 mcp 的第三方工具名
  { id: "mcp", family: TOOL_FAMILIES.mcp, test: hasWord("mcp") },
  // 浏览器自动化：browser_click / browser_typeText / browser_readContent …
  { id: "browser", family: TOOL_FAMILIES.browser, test: startsWithWord("browser") },
  // 云服务：cfScreenshot / cfGeneratePDF / cfGetMarkdown / cloudflareCrawl，以及
  // 下划线命名的真实云工具 cloud_probe / list_cloud_resources …
  // `cloud` 走整词匹配（不是裸子串）：`readCloudyConfig` 这类无关词不误命中。
  {
    id: "cloud",
    family: TOOL_FAMILIES.cloud,
    test: (name) => startsWithWord("cf", "cloudflare")(name) || hasWord("cloud")(name),
  },
  // 应用（app* 应用文件与版本）：appFileWrite / appDeploy / appVersionRestore …
  { id: "app", family: TOOL_FAMILIES.app, test: (name) => { const words = toolNameWords(name); return words[0] === "app" && words.length > 1; } },
  // 表格：*Table* 与分类（createCategory / updateContentCategory …）
  { id: "table", family: TOOL_FAMILIES.table, test: hasWord("table", "category", "categories") },
  // 进程与本地 task：launchProcess / listProcesses / taskWait / taskStop …
  { id: "process", family: TOOL_FAMILIES.process, test: hasWord("process", "task") },
  // 智能体：startAgentRun / controlAgentRun / listAgents / readAgent / *AgentAutomation
  { id: "agent", family: TOOL_FAMILIES.agent, test: hasWord("agent", "run", "completion") },
  // 记忆：rememberMemory / queryMemory / deleteMemory
  { id: "memory", family: TOOL_FAMILIES.memory, test: hasWord("memory") },
  // 技能：loadSkill / evalSkill / doctorSkill / importSkill / createSkillDoc
  { id: "skill", family: TOOL_FAMILIES.skill, test: hasWord("skill") },
  // 邮件：email_read / email_send / email_provision_identity …
  { id: "email", family: TOOL_FAMILIES.email, test: startsWithWord("email") },
  // 采集器：*Scraper / firecrawl_* / *_scrape
  { id: "scrape", family: TOOL_FAMILIES.scrape, test: (name) => { const words = toolNameWords(name); return words.at(-1) === "scraper" || words[0] === "firecrawl" || words.at(-1) === "scrape"; } },
  // 生成媒体：*Image* / transcribe* / *SpeechToText / *ocr / *Chart
  { id: "media", family: TOOL_FAMILIES.media, test: hasWord("image", "transcribe", "transcription", "speech", "ocr", "chart") },
  // 删除类：deleteDialogs / deleteSpaces（表格与记忆的删除已由更具体的族先命中）
  { id: "delete", family: TOOL_FAMILIES.delete, test: startsWithWord("delete", "remove") },
  // 写入类：write* / edit* / apply* / create* / update* / import* / export* / convert* / translate*
  { id: "write", family: TOOL_FAMILIES.write, test: startsWithWord("write", "edit", "apply", "create", "update", "import", "export", "convert", "translate") },
  // 读取/查询类：read* / query*（含 toolquery 这类带 query/read 的名字）
  { id: "read", family: TOOL_FAMILIES.read, test: hasWord("read", "query") },
  // 列表类：list*（空间、对话、用户空间）
  { id: "list", family: TOOL_FAMILIES.list, test: startsWithWord("list") },
  // 搜索类：search_workspace / search_all_spaces / searchDialogMessages …
  { id: "search", family: TOOL_FAMILIES.search, test: hasWord("search") },
  // 抓取类：fetchWebpage
  { id: "fetch", family: TOOL_FAMILIES.fetch, test: startsWithWord("fetch") },
  // 执行类：exec_shell / executeSql（shell 与本地诊断命令）
  { id: "run", family: TOOL_FAMILIES.run, test: startsWithWord("exec", "execute", "run") },
];

/** 图标或标签 → 族（历史单字符符号与新中英文标签均映射回同一族）。 */
const TOOL_FAMILY_BY_ICON: Record<string, ToolFamily> = Object.fromEntries(
  Object.values(TOOL_FAMILIES).flatMap((fam) => [
    [fam.icon, fam],
    [fam.en, fam],
    [fam.zh, fam],
  ]),
);

/** 工具名 → 族：精确映射 → 系列规则 → 兜底族。 */
export function toolFamilyOf(name: string): ToolFamily {
  const override = TOOL_FAMILY_OVERRIDES[name];
  if (override) return override;
  const rule = TOOL_FAMILY_RULES.find((candidate) => candidate.test(name));
  return rule ? rule.family : TOOL_FAMILIES.default;
}

/** 工具的紧凑动作标签（按当前 locale 展示），未知工具退回 Tool / 工具。 */
export function toolIcon(name: string): string {
  return toolFamilyOf(name)[getCliLocale()];
}

/** 图标或动作标签对应的族；未识别词返回 null（用于「只转换已知图标」的详情层）。 */
export function toolFamilyOfIcon(icon: string): ToolFamily | null {
  return TOOL_FAMILY_BY_ICON[icon] ?? null;
}

/**
 * 图标或动作标签 → 当前 locale 的工具族名。
 */
export function toolFamilyLabel(icon: string): string {
  return (TOOL_FAMILY_BY_ICON[icon] ?? TOOL_FAMILIES.default)[getCliLocale()];
}

/**
 * Localized one-line description for a registered CLI subcommand, keyed by
 * `path.join(" ")` (e.g. "auth chatgpt"). Returns null when no localized copy
 * exists so `nolo <group> --help` falls back to the registry's English
 * description instead of inventing one.
 *
 * Coverage: one entry per entry in `commandRegistry.ts`'s `COMMANDS`, except
 * `update` — its registry description is `t("updateDescription")` (resolved
 * from STRINGS at module load), so it is already localized and a static `en`
 * here would drift from it. `i18n.test.ts` gates both directions: a registered
 * command without an entry fails, and every `en` must equal the registry
 * description byte-for-byte.
 *
 * Order: the original auth group stays first, everything else follows registry
 * order so this table reads like `nolo --help`.
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
  "run": {
    en: "Run a no-login local agent in this workspace",
    zh: "在工作区中运行免登录的本地智能体",
  },
  "chat": {
    en: "Chat with an agent",
    zh: "与智能体对话",
  },
  "agent list": {
    en: "List owned agents",
    zh: "列出我拥有的智能体",
  },
  "agent create": {
    en: "Create a new agent",
    zh: "创建新智能体",
  },
  "agent models": {
    en: "List models: --preset <id> (server discovery, exit 1 on static fallback) or --url <base> --api-key <key> (OpenAI-compatible /models)",
    zh: "列出可用模型：--preset <id>（服务端发现，退回静态列表时以退出码 1 结束）或 --url <base> --api-key <key>（OpenAI 兼容的 /models）",
  },
  "agent providers": {
    en: "List agent-creation provider presets (subscription / metered / oauth)",
    zh: "列出智能体创建的服务商预设（subscription / metered / oauth）",
  },
  "agent pull": {
    en: "Cache an agent for local runs",
    zh: "缓存智能体以供本地运行",
  },
  "agent read": {
    en: "Read a single agent",
    zh: "读取单个智能体",
  },
  "agent run": {
    en: "Run an agent",
    zh: "运行智能体",
  },
  "agent recover-prepared-writer": {
    en: "Revoke an exact fenced-launch-v1 prepared writer attempt (--attempt-id required; no force)",
    zh: "撤销某个精确匹配的 fenced-launch-v1 已准备写入者尝试（必须带 --attempt-id，不支持强制）",
  },
  "agent ps": {
    en: "List active and recent local agent runs (--json for machine-readable output)",
    zh: "列出活跃与近期的本地智能体运行（--json 输出机器可读格式）",
  },
  "agent status": {
    en: "Show status of a local agent run (--json, --include-checkpoint, --watch, --interval-ms N)",
    zh: "查看本地智能体运行状态（--json、--include-checkpoint、--watch、--interval-ms N）",
  },
  "agent logs": {
    en: "Show logs of a local agent run",
    zh: "查看本地智能体运行的日志",
  },
  "agent stop": {
    en: "Stop a local agent run",
    zh: "停止本地智能体运行",
  },
  "agent kill": {
    en: "Kill a local agent run",
    zh: "强制结束本地智能体运行",
  },
  "agent setup-offline-marxists": {
    en: "Create or update the Marxists.org offline book agent",
    zh: "创建或更新 Marxists.org 离线图书智能体",
  },
  "agent update": {
    en: "Update agent fields",
    zh: "更新智能体字段",
  },
  "agent email provision": {
    en: "Provision a controlled inbox for an agent",
    zh: "为智能体分配受控收件箱",
  },
  "agent email bind": {
    en: "Bind an existing email address to an agent",
    zh: "把已有邮箱地址绑定到智能体",
  },
  "agent email transfer": {
    en: "Transfer an email identity from one agent to another (cross-account)",
    zh: "将邮箱身份从一个智能体转移到另一个（跨账号）",
  },
  "agent email create-and-provision": {
    en: "Create an agent and provision its controlled inbox",
    zh: "创建智能体并为其分配受控收件箱",
  },
  "agent delete": {
    en: "Hard-delete an agent's private and public records",
    zh: "硬删除智能体的私有与公开记录",
  },
  "agent favorite": {
    en: "Favorite an agent for the current user (--off to unfavorite)",
    zh: "收藏智能体（--off 取消收藏）",
  },
  "agent grant": {
    en: "Grant another user access to this agent's owner credentials",
    zh: "授权其他用户使用该智能体的属主凭证",
  },
  "agent grants": {
    en: "List active credential grants for an agent",
    zh: "列出该智能体生效中的凭证授权",
  },
  "agent revoke-grant": {
    en: "Revoke a credential grant for an agent",
    zh: "撤销该智能体的某条凭证授权",
  },
  "agent bind-current": {
    en: "Bind an agent to this machine",
    zh: "把智能体绑定到当前机器",
  },
  "agent smoke-current": {
    en: "Smoke test a bound agent through this machine",
    zh: "通过当前机器对已绑定的智能体做冒烟测试",
  },
  "agent runtime-doctor": {
    en: "Diagnose current machine runtime compatibility",
    zh: "诊断当前机器的运行时兼容性",
  },
  "agent chat": {
    en: "Chat with an agent",
    zh: "与智能体对话",
  },
  "dialog search": {
    en: "Search dialog messages across dialogs",
    zh: "跨对话搜索消息",
  },
  "dialog list": {
    en: "List dialogs (default --limit 50; --all/--limit 0 full; --jsonl streams)",
    zh: "列出对话（默认 --limit 50；--all / --limit 0 取全部；--jsonl 流式输出）",
  },
  "dialog delete": {
    en: "Delete one or more dialogs",
    zh: "删除一个或多个对话",
  },
  "dialog query": {
    en: "Query dialogs by subject refs (default --limit 50; --all full; --jsonl streams)",
    zh: "按 subject 引用查询对话（默认 --limit 50；--all 取全部；--jsonl 流式输出）",
  },
  "dialog read": {
    en: "Read a dialog",
    zh: "读取一个对话",
  },
  "dialog status": {
    en: "Read compact dialog status",
    zh: "读取精简的对话状态",
  },
  "dialog notify": {
    // 与 dialogInternalCommandEntries 的 registry 描述逐字一致（门禁按字节比对）。
    en: "Deliver a notification into a live CLI dialog's existing queue (--message/--file, --idempotency-key; --status for the receipt)",
    zh: "向正在运行的 CLI 对话队列投递通知（--message/--file、--idempotency-key；--status 查投递回执）",
  },
  "doc create": {
    en: "Create a normal doc",
    zh: "创建普通文档",
  },
  "doc read": {
    en: "Read a normal doc",
    zh: "读取普通文档",
  },
  "doc update": {
    en: "Update a normal doc",
    zh: "更新普通文档",
  },
  "doc delete": {
    en: "Delete a normal doc",
    zh: "删除普通文档",
  },
  "skill-doc create": {
    en: "Create a skill-backed doc",
    zh: "创建 skill 文档",
  },
  "skill create-doc": {
    en: "Create a skill-backed doc",
    zh: "创建 skill 文档",
  },
  "skill-doc read": {
    en: "Read a skill doc",
    zh: "读取 skill 文档",
  },
  "skill-doc update": {
    en: "Update a skill doc",
    zh: "更新 skill 文档",
  },
  "skill-doc delete": {
    en: "Delete a skill doc",
    zh: "删除 skill 文档",
  },
  "memory list": {
    en: "List long-term memories by filter",
    zh: "按条件列出长期记忆",
  },
  "memory remember": {
    en: "Store a long-term memory",
    zh: "写入一条长期记忆",
  },
  "memory delete": {
    en: "Delete long-term memories by filter",
    zh: "按条件删除长期记忆",
  },
  "space create": {
    en: "Create a space",
    zh: "创建空间",
  },
  "space invite": {
    en: "Invite an existing user to a space",
    zh: "邀请已有用户加入空间",
  },
  "space accept-invite": {
    en: "Accept a space invite",
    zh: "接受空间邀请",
  },
  "space upload": {
    en: "Upload a file to a space",
    zh: "上传文件到空间",
  },
  "table": {
    en: "Show table command help",
    zh: "显示 table 命令帮助",
  },
  "table delete-rows": {
    en: "Delete table rows",
    zh: "删除表格行",
  },
  "table purge-rows": {
    en: "Permanently purge table rows",
    zh: "彻底清除表格行",
  },
  "table remove-row-fields": {
    en: "Remove fields from table rows",
    zh: "从表格行中移除字段",
  },
  "table add-column": {
    en: "Add a table column",
    zh: "新增表格列",
  },
  "table add-row": {
    en: "Add a table row",
    zh: "新增表格行",
  },
  "table add-rows": {
    en: "Add table rows",
    zh: "批量新增表格行",
  },
  "table update-row": {
    en: "Update a table row",
    zh: "更新表格行",
  },
  "table update-rows": {
    en: "Update table rows",
    zh: "批量更新表格行",
  },
  "table delete-row": {
    en: "Delete a table row",
    zh: "删除表格行",
  },
  "app list": {
    en: "List your apps",
    zh: "列出我的应用",
  },
  "app get": {
    en: "Get app details",
    zh: "获取应用详情",
  },
  "app deploy": {
    en: "Deploy an app",
    zh: "部署应用",
  },
  "app deploy status": {
    en: "Check app deploy status",
    zh: "查看应用部署状态",
  },
  "app delete": {
    en: "Delete an app",
    zh: "删除应用",
  },
  "table list": {
    en: "List table metadata",
    zh: "列出表格元数据",
  },
  "table query": {
    en: "Query table rows",
    zh: "查询表格行",
  },
  "browser status": {
    en: "Show Nolo Browser Connector status (native host manifest, token, live connection)",
    zh: "显示 Nolo 浏览器连接器状态（原生 host manifest、令牌、在线连接）",
  },
  "browser install": {
    en: "Install the native messaging host manifest for this user (--browser chrome|firefox)",
    zh: "为当前用户安装原生消息 host manifest（--browser chrome|firefox）",
  },
  "browser reload": {
    en: "Reload the connector extension through the running native host",
    zh: "通过运行中的原生 host 重载连接器扩展",
  },
  "browser doctor": {
    en: "Run end-to-end Browser Connector diagnostics and print recovery steps (--browser chrome|firefox [--json])",
    zh: "端到端诊断浏览器连接器并输出修复步骤（--browser chrome|firefox [--json]）",
  },
  "browser list-tabs": {
    en: "List controllable browser tabs",
    zh: "列出可控制的浏览器标签页",
  },
  "browser open-tab": {
    en: "Open a URL in a new tab (--url <url> [--active])",
    zh: "在新标签页中打开 URL（--url <url> [--active]）",
  },
  "browser close-tab": {
    en: "Close a tab (--tab <id>)",
    zh: "关闭标签页（--tab <id>）",
  },
  "browser read-page": {
    en: "Read a tab's text and interactive elements as elementRefs (--tab <id> [--offset N] [--viewport])",
    zh: "以 elementRefs 读取标签页的文本与可交互元素（--tab <id> [--offset N] [--viewport]）",
  },
  "browser click": {
    en: "Click an element (--tab <id> --ref|--selector)",
    zh: "点击元素（--tab <id> --ref|--selector）",
  },
  "browser type": {
    en: "Type text into an element (--tab <id> --ref|--selector --text <text>)",
    zh: "向元素输入文本（--tab <id> --ref|--selector --text <text>）",
  },
  "browser select": {
    en: "Set a native <select> value and verify it (--tab <id> --ref|--selector --value <v>|--label <l>)",
    zh: "设置原生 <select> 的值并校验（--tab <id> --ref|--selector --value <v>|--label <l>）",
  },
  "browser upload": {
    en: "Upload files to a file input element (--tab <id> --ref|--selector --file <path>)",
    zh: "上传文件到文件输入元素（--tab <id> --ref|--selector --file <path>）",
  },
  "browser press": {
    en: "Press a keyboard key (--tab <id> --key <key>)",
    zh: "按下键盘按键（--tab <id> --key <key>）",
  },
  "browser scroll": {
    en: "Scroll a tab or observe a container (--tab <id> [--selector <css>] [--delta-x N] [--delta-y N])",
    zh: "滚动标签页或观察容器（--tab <id> [--selector <css>] [--delta-x N] [--delta-y N]）",
  },
  "browser screenshot": {
    en: "Capture a screenshot (--tab <id> [--out <path>])",
    zh: "截取屏幕截图（--tab <id> [--out <path>]）",
  },
  "browser read-console": {
    en: "Read recent console entries (--tab <id>)",
    zh: "读取最近的控制台条目（--tab <id>）",
  },
  "browser read-network": {
    en: "Read recent network entries (--tab <id>)",
    zh: "读取最近的网络条目（--tab <id>）",
  },
  "browser eval": {
    en: "Evaluate JS in a tab, user-approved per call (--tab <id> --expr <js> [--await] [--timeout-ms N])",
    zh: "在标签页中执行 JS，每次调用需用户批准（--tab <id> --expr <js> [--await] [--timeout-ms N]）",
  },
  "chrome status": {
    en: "Show Nolo Browser Connector status (native host manifest, token, live connection) (Compatibility alias of `nolo browser status`)",
    zh: "显示 Nolo 浏览器连接器状态（原生 host manifest、令牌、在线连接）（`nolo browser status` 的兼容别名）",
  },
  "chrome install": {
    en: "Install the native messaging host manifest for this user (--browser chrome|firefox) (Compatibility alias of `nolo browser install`)",
    zh: "为当前用户安装原生消息 host manifest（--browser chrome|firefox）（`nolo browser install` 的兼容别名）",
  },
  "chrome reload": {
    en: "Reload the connector extension through the running native host (Compatibility alias of `nolo browser reload`)",
    zh: "通过运行中的原生 host 重载连接器扩展（`nolo browser reload` 的兼容别名）",
  },
  "chrome doctor": {
    en: "Run end-to-end Browser Connector diagnostics and print recovery steps (--browser chrome|firefox [--json]) (Compatibility alias of `nolo browser doctor`)",
    zh: "端到端诊断浏览器连接器并输出修复步骤（--browser chrome|firefox [--json]）（`nolo browser doctor` 的兼容别名）",
  },
  "chrome list-tabs": {
    en: "List controllable browser tabs (Compatibility alias of `nolo browser list-tabs`)",
    zh: "列出可控制的浏览器标签页（`nolo browser list-tabs` 的兼容别名）",
  },
  "chrome open-tab": {
    en: "Open a URL in a new tab (--url <url> [--active]) (Compatibility alias of `nolo browser open-tab`)",
    zh: "在新标签页中打开 URL（--url <url> [--active]）（`nolo browser open-tab` 的兼容别名）",
  },
  "chrome close-tab": {
    en: "Close a tab (--tab <id>) (Compatibility alias of `nolo browser close-tab`)",
    zh: "关闭标签页（--tab <id>）（`nolo browser close-tab` 的兼容别名）",
  },
  "chrome read-page": {
    en: "Read a tab's text and interactive elements as elementRefs (--tab <id> [--offset N] [--viewport]) (Compatibility alias of `nolo browser read-page`)",
    zh: "以 elementRefs 读取标签页的文本与可交互元素（--tab <id> [--offset N] [--viewport]）（`nolo browser read-page` 的兼容别名）",
  },
  "chrome click": {
    en: "Click an element (--tab <id> --ref|--selector) (Compatibility alias of `nolo browser click`)",
    zh: "点击元素（--tab <id> --ref|--selector）（`nolo browser click` 的兼容别名）",
  },
  "chrome type": {
    en: "Type text into an element (--tab <id> --ref|--selector --text <text>) (Compatibility alias of `nolo browser type`)",
    zh: "向元素输入文本（--tab <id> --ref|--selector --text <text>）（`nolo browser type` 的兼容别名）",
  },
  "chrome select": {
    en: "Set a native <select> value and verify it (--tab <id> --ref|--selector --value <v>|--label <l>) (Compatibility alias of `nolo browser select`)",
    zh: "设置原生 <select> 的值并校验（--tab <id> --ref|--selector --value <v>|--label <l>）（`nolo browser select` 的兼容别名）",
  },
  "chrome upload": {
    en: "Upload files to a file input element (--tab <id> --ref|--selector --file <path>) (Compatibility alias of `nolo browser upload`)",
    zh: "上传文件到文件输入元素（--tab <id> --ref|--selector --file <path>）（`nolo browser upload` 的兼容别名）",
  },
  "chrome press": {
    en: "Press a keyboard key (--tab <id> --key <key>) (Compatibility alias of `nolo browser press`)",
    zh: "按下键盘按键（--tab <id> --key <key>）（`nolo browser press` 的兼容别名）",
  },
  "chrome scroll": {
    en: "Scroll a tab or observe a container (--tab <id> [--selector <css>] [--delta-x N] [--delta-y N]) (Compatibility alias of `nolo browser scroll`)",
    zh: "滚动标签页或观察容器（--tab <id> [--selector <css>] [--delta-x N] [--delta-y N]）（`nolo browser scroll` 的兼容别名）",
  },
  "chrome screenshot": {
    en: "Capture a screenshot (--tab <id> [--out <path>]) (Compatibility alias of `nolo browser screenshot`)",
    zh: "截取屏幕截图（--tab <id> [--out <path>]）（`nolo browser screenshot` 的兼容别名）",
  },
  "chrome read-console": {
    en: "Read recent console entries (--tab <id>) (Compatibility alias of `nolo browser read-console`)",
    zh: "读取最近的控制台条目（--tab <id>）（`nolo browser read-console` 的兼容别名）",
  },
  "chrome read-network": {
    en: "Read recent network entries (--tab <id>) (Compatibility alias of `nolo browser read-network`)",
    zh: "读取最近的网络条目（--tab <id>）（`nolo browser read-network` 的兼容别名）",
  },
  "chrome eval": {
    en: "Evaluate JS in a tab, user-approved per call (--tab <id> --expr <js> [--await] [--timeout-ms N]) (Compatibility alias of `nolo browser eval`)",
    zh: "在标签页中执行 JS，每次调用需用户批准（--tab <id> --expr <js> [--await] [--timeout-ms N]）（`nolo browser eval` 的兼容别名）",
  },
  "dialog trace": {
    en: "Trace one dialog: messages, token usage and subagent runs (--json)",
    zh: "追踪单个对话：消息、token 用量与子代理运行记录（--json）",
  },
  "dialog usage": {
    en: "Show dialog tokens, recorded duration and speed by basis",
    zh: "显示对话的 token 数、记录时长与按基准计算的速度",
  },
  "usage": {
    en: "Summarize local token usage by day/provider/model/agent (reads DayStats via LevelDB iterator)",
    zh: "按日、提供商、模型和智能体汇总本地 token 用量（通过 LevelDB 迭代器读取 DayStats）",
  },
  "login": {
    en: "Log in to Nolo",
    zh: "登录 Nolo",
  },
  "logout": {
    en: "Log out of Nolo",
    zh: "退出 Nolo 登录",
  },
  "whoami": {
    en: "Show the current login state",
    zh: "显示当前登录状态",
  },
  "connect": {
    en: "Hold a connector websocket for this machine",
    zh: "为当前机器保持连接器 WebSocket",
  },
  "daemon": {
    en: "Run the connector daemon shortcut",
    zh: "运行连接器守护进程快捷方式",
  },
  "machine status": {
    en: "List machines registered to the current profile",
    zh: "列出注册到当前配置的机器",
  },
  "doctor runtime": {
    en: "Diagnose local-first agent runtime selection",
    zh: "诊断本地优先智能体运行时的选择结果",
  },
  "doctor": {
    en: "Show CLI doctor information",
    zh: "显示 CLI 诊断信息",
  },
  "secret": {
    en: "Manage local developer secrets (~/.nolo/credentials/secrets.json)",
    zh: "管理本地开发者密钥（~/.nolo/credentials/secrets.json）",
  },
  "version": {
    en: "Show CLI version",
    zh: "显示 CLI 版本",
  },
  "--version": {
    en: "Show CLI version",
    zh: "显示 CLI 版本",
  },
  "-v": {
    en: "Show CLI version",
    zh: "显示 CLI 版本",
  },
  "--help": {
    en: "Show help",
    zh: "显示帮助",
  },
  "-h": {
    en: "Show help",
    zh: "显示帮助",
  },
  "space list": {
    en: "List joined spaces",
    zh: "列出已加入的空间",
  },
  "space read": {
    en: "Read a space",
    zh: "读取空间",
  },
  "space delete": {
    en: "Delete spaces by safe filters",
    zh: "按安全条件删除空间",
  },
  "space category": {
    en: "Create or update a space category",
    zh: "创建或更新空间分类",
  },
  "space content-category": {
    en: "Move content into a space category",
    zh: "把内容移入空间分类",
  },
  "table meta": {
    en: "Create or update table metadata",
    zh: "创建或更新表格元数据",
  },
  "agent unpublish": {
    en: "Remove an agent's public record",
    zh: "移除智能体的公开记录",
  },
  "agent dialogs": {
    en: "Inspect recent dialogs for an agent",
    zh: "查看智能体最近的对话",
  },
  "agent doctor": {
    en: "Audit agent workspace health",
    zh: "审计智能体工作区的健康状况",
  },
  "agent create-custom": {
    en: "Create a custom coding agent",
    zh: "创建自定义编码智能体",
  },
  "agent create-space": {
    en: "Create or attach shared-space agents",
    zh: "创建或附加共享空间智能体",
  },
  "agent setup-demo": {
    en: "Bootstrap demo publisher agents",
    zh: "初始化演示用发布者智能体",
  },
  "dev": {
    en: "Manage the local dev environment",
    zh: "管理本地开发环境",
  },
  "mcp local authorize": {
    en: "Authorize a local HTTP MCP connection (explicit registration only)",
    zh: "授权本地 HTTP MCP 连接（仅限显式注册）",
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
  controlMessage: { queued: string; enqueued: (count: number) => string; continued: string; consumed: string; run: string; target: string; message: string };
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
    controlMessage: {
      queued: t("controlQueued"), enqueued: (count) => t("controlEnqueued", String(count)),
      continued: t("controlContinued"), consumed: t("controlConsumed"),
      run: t("controlRun"), target: t("controlTarget"), message: t("controlMessage"),
    },
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
