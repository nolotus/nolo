/** User-facing CLI surface; structured output and diagnostics stay untranslated. */
export const cliSurfaceStrings = {
  "cliHelpTitle": {
    "en": "nolo — Agent-first terminal workspace",
    "zh": "nolo — 以 Agent 为核心的终端工作空间"
  },
  "cliExamplesLabel": {
    "en": "Examples:",
    "zh": "示例："
  },
  "cliUnknownCommand": {
    "en": "Unknown command: {0}",
    "zh": "未知命令：{0}"
  },
  "cliCooldownHelp": {
    "en": "Manage per-credential availability cooldowns (429 限流冷却).\n\nUsage:\n  nolo auth cooldown                List all active cooldowns\n  nolo auth cooldown --clear <credential>   Clear one credential's cooldown\n  nolo auth cooldown --clear-all            Clear all cooldowns\n\nOptions:\n  --clear <credential>  Clear the cooldown for the given credential\n                       (e.g. chatgpt / claude / antigravity, or a custom API credential).\n  --clear-all           Clear every credential cooldown.\n  --help                Show this help.\n\nNo argument lists the currently cooled credentials with their human-readable\nrecovery time and remaining duration.\n",
    "zh": "管理各凭据的可用性冷却（429 限流冷却）。\n\n用法：\n  nolo auth cooldown                       列出所有生效中的冷却\n  nolo auth cooldown --clear <credential>  清除指定凭据的冷却\n  nolo auth cooldown --clear-all           清除所有冷却\n\n选项：\n  --clear <credential>  清除指定凭据的冷却\n                       （例如 chatgpt / claude / antigravity，或自定义 API 凭据）。\n  --clear-all           清除全部凭据冷却。\n  --help                显示此帮助。\n\n不带参数时列出处于冷却中的凭据、恢复时间和剩余时长。\n"
  },
  "cliCooldownClearedCount": {
    "en": "Cleared {0} credential cooldown(s).",
    "zh": "已清除 {0} 个凭据的冷却。"
  },
  "cliCooldownNoneToClear": {
    "en": "No credential cooldowns to clear.",
    "zh": "没有需要清除的凭据冷却。"
  },
  "cliCooldownMissingCredential": {
    "en": "Missing credential for --clear. Usage: nolo auth cooldown --clear <credential>",
    "zh": "--clear 缺少凭据。用法：nolo auth cooldown --clear <credential>"
  },
  "cliCooldownNotActive": {
    "en": "No active cooldown for credential: {0}",
    "zh": "该凭据没有生效中的冷却：{0}"
  },
  "cliCooldownCleared": {
    "en": "Cleared cooldown for credential: {0}",
    "zh": "已清除该凭据的冷却：{0}"
  },
  "cliCooldownNoneActive": {
    "en": "No active credential cooldowns.",
    "zh": "没有生效中的凭据冷却。"
  },
  "cliCooldownActive": {
    "en": "Active credential cooldowns:",
    "zh": "生效中的凭据冷却："
  },
  "cliCooldownEntry": {
    "en": "  {0} recovers {1}  ({2} remaining)",
    "zh": "  {0} 恢复时间 {1}  （剩余 {2}）"
  },
  "cliCooldownDays": {
    "en": "{0}d {1}h {2}m",
    "zh": "{0}天 {1}小时 {2}分钟"
  },
  "cliCooldownHours": {
    "en": "{0}h {1}m",
    "zh": "{0}小时 {1}分钟"
  },
  "cliCooldownMinutes": {
    "en": "{0}m",
    "zh": "{0}分钟"
  },
  "cliMachineAuthMissing": {
    "en": "[nolo] Machine commands require an auth token. Run `nolo login` or set AUTH_TOKEN.",
    "zh": "[nolo] 机器命令需要认证令牌。请运行 `nolo login` 或设置 AUTH_TOKEN。"
  },
  "cliBrowserInvalidNumber": {
    "en": "Invalid {0} <N>. Usage: {1}",
    "zh": "无效的 {0} <N>。用法：{1}"
  },
  "cliBrowserMissingTab": {
    "en": "Missing required --tab <id>. Usage: {0}",
    "zh": "缺少必需的 --tab <id>。用法：{0}"
  },
  "cliBrowserMissingTarget": {
    "en": "Provide --ref <elementRef> (from read-page) or --selector <css>. Usage: {0}",
    "zh": "请提供 --ref <elementRef>（来自 read-page）或 --selector <css>。用法：{0}"
  },
  "cliBrowserMissingUrl": {
    "en": "Missing required --url <url>. Usage: {0}",
    "zh": "缺少必需的 --url <url>。用法：{0}"
  },
  "cliBrowserMissingText": {
    "en": "Missing required --text <text>. Usage: {0}",
    "zh": "缺少必需的 --text <text>。用法：{0}"
  },
  "cliBrowserMissingFile": {
    "en": "Missing required --file <path>. Usage: {0}",
    "zh": "缺少必需的 --file <path>。用法：{0}"
  },
  "cliBrowserMissingKey": {
    "en": "Missing required --key <key>. Usage: {0}",
    "zh": "缺少必需的 --key <key>。用法：{0}"
  },
  "cliBrowserAction": {
    "en": "Invalid or missing --action <click|type|press>. Usage: {0}",
    "zh": "--action <click|type|press> 无效或缺失。用法：{0}"
  },
  "cliBrowserRefUnsupported": {
    "en": "--ref is not supported for action preparation; use --selector or --active. Usage: {0}",
    "zh": "动作准备不支持 --ref；请使用 --selector 或 --active。用法：{0}"
  },
  "cliBrowserSelector": {
    "en": "Provide --selector <css> or --active. Usage: {0}",
    "zh": "请提供 --selector <css> 或 --active。用法：{0}"
  },
  "cliBrowserTypeText": {
    "en": "Missing required --text <text> for type action. Usage: {0}",
    "zh": "type 动作缺少必需的 --text <text>。用法：{0}"
  },
  "cliBrowserPressKey": {
    "en": "Missing required --key <key> for press action. Usage: {0}",
    "zh": "press 动作缺少必需的 --key <key>。用法：{0}"
  },
  "cliBrowserBrowser": {
    "en": "Invalid --browser value: expected \"chrome\" or \"firefox\". Usage: {0}",
    "zh": "--browser 值无效：应为 \"chrome\" 或 \"firefox\"。用法：{0}"
  },
  "cliBrowserUnknown": {
    "en": "Unknown browser subcommand \"{0}\".",
    "zh": "未知浏览器子命令 \"{0}\"。"
  },
  "cliBrowserHelpIntro": {
    "en": "Operate the user's browser (Chrome or Firefox) through the Nolo Browser Connector\n(the desktop bridge; the same RPC the browser_* agent tools use — legacy `chrome_*` names still work).\n\nUsage:\n  nolo browser <subcommand> [flags]\n  nolo chrome <subcommand> [flags]  # compatibility alias\n\nSubcommands:",
    "zh": "通过 Nolo Browser Connector 操作用户的浏览器（Chrome 或 Firefox）\n（桌面桥接；与 browser_* agent 工具使用相同 RPC，仍兼容旧名称 `chrome_*`）。\n\n用法：\n  nolo browser <subcommand> [flags]\n  nolo chrome <subcommand> [flags]  # 兼容别名\n\n子命令："
  },
  "cliBrowserHelpNotes": {
    "en": "\nNotes:\n  --ref takes an elementRef copied from `nolo browser read-page` (revision-scoped,\n    preferred over --selector); --selector takes a CSS selector.\n  Actions the connector classifies as irreversible (pay / send / delete / publish / permission)\n    open a confirmation request in the browser and return USER_APPROVAL_PENDING with an approvalId:\n    the user clicks \"Allow once\" there, then rerun the same command with --approval-id <id>.\n    That id is not an authorization — only the lookup key for the decision the user already made.\n  prepare-action prepares an immutable action challenge binding for host consent verification;\n    it is strictly read-only, never executes mutations, and does not grant approval.\n  read-console / read-network / upload work on Chrome only (Firefox lacks chrome.debugger).\n  --browser chrome|firefox selects which connector endpoint serves the call (default\n    auto-detects single online browser: chrome = 127.0.0.1:38947, firefox = 127.0.0.1:38948);\n    the wrong browser is refused.\n  Every subcommand prints the connector's raw JSON result; failures exit 1.\n  Endpoint: NOLO_CHROME_CONNECTOR_RPC_URL or per-browser NOLO_CHROME_CONNECTOR_PORT /\n    NOLO_FIREFOX_CONNECTOR_PORT (default http://127.0.0.1:38947/rpc).",
    "zh": "\n说明：\n  --ref 使用从 `nolo browser read-page` 复制的 elementRef（仅适用于对应修订，\n    优先于 --selector）；--selector 使用 CSS 选择器。\n  连接器判定为不可逆的动作（付款 / 发送 / 删除 / 发布 / 授权）会在浏览器里发起确认请求，\n    返回 USER_APPROVAL_PENDING 与一个 approvalId：\n    用户在那里点「允许一次」后，再用 --approval-id <id> 重跑同一条命令。\n    该 id 不是授权凭证——只是用户已做决定的查询键。\n  prepare-action 为宿主同意校验准备不可变的动作挑战绑定；\n    它严格只读，不执行修改，也不授予批准。\n  read-console / read-network / upload 仅支持 Chrome（Firefox 缺少 chrome.debugger）。\n  --browser chrome|firefox 选择连接器端点（默认自动探测唯一在线浏览器：\n    chrome = 127.0.0.1:38947，firefox = 127.0.0.1:38948）；\n    浏览器不匹配时会拒绝调用。\n  每个子命令输出连接器的原始 JSON 结果；失败时退出码为 1。\n  端点：NOLO_CHROME_CONNECTOR_RPC_URL 或按浏览器设置 NOLO_CHROME_CONNECTOR_PORT /\n    NOLO_FIREFOX_CONNECTOR_PORT（默认 http://127.0.0.1:38947/rpc）。"
  }
} as const;
