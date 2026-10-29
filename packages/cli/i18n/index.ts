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
  "agent ps": {
    en: "List active and recent local agent runs (--json for machine-readable output)",
    zh: "列出活跃与近期的本地智能体运行（--json 输出机器可读格式）",
  },
  "agent status": {
    en: "Show status of a local agent run (--json, --watch, --interval-ms N)",
    zh: "查看本地智能体运行状态（--json、--watch、--interval-ms N）",
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
  "ci status": {
    en: "Show recent nolo-ci deploy jobs (alpha / main)",
    zh: "查看最近的 nolo-ci 部署任务（alpha / main）",
  },
  "dialog usage": {
    en: "Show dialog tokens, recorded duration and speed by basis",
    zh: "显示对话的 token 数、记录时长与按基准计算的速度",
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
    en: "Send machine heartbeats or hold a connector websocket",
    zh: "发送机器心跳或保持连接器 WebSocket",
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
