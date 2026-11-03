/**
 * Canonical CLI provider values — single browser-safe authority.
 *
 * 顺序 = 创建 agent 时的展示顺序，按「该 CLI 实际使用率」排（不是按 alphabet、
 * 也不是按厂商规模）。依据 Stack Overflow 2026 开发者调查（n=12,255，过去一年
 * 用过）：Claude Code 65.5% · GitHub Copilot 58.7% · OpenAI Codex 29.5% ·
 * Google Antigravity 16.0% · Open Code 13.6% · Gemini Code Assist 14.6%（已停用，见下）。
 *
 * `copilot` 在这里是 `gh` 扩展而非独立 harness，2026 年实际使用低于前几个 CLI，
 * 因此排在它们之后——旧顺序把它排第一是「先实现的排前面」的遗留。
 *
 * `gemini` 已从**新建列表**移除（Google 2026-05-19 宣布 Gemini CLI 并入
 * Antigravity CLI，2026-06-18 起 Pro/Ultra/免费用户失去访问权）。但枚举值必须
 * 保留：企业与自带 API key 的用户仍在用，存量 agent 的 `cliProvider: "gemini"`
 * 还要继续能跑。新建界面用 CREATABLE_CLI_PROVIDERS 过滤。
 */
export const CLI_PROVIDER_VALUES = [
  "claude",
  "codex",
  "agy",
  "opencode",
  "copilot",
  "qoder",
  "grok",
  "kimi",
  "gemini",
] as const;

export type CliProvider = (typeof CLI_PROVIDER_VALUES)[number];

/**
 * 新建 agent 时可选的 CLI provider（= 全部值减去已停用的）。
 * 已停用但保留运行时支持的 provider 不要出现在这里。
 */
export const CREATABLE_CLI_PROVIDERS: readonly CliProvider[] =
  CLI_PROVIDER_VALUES.filter((value) => value !== "gemini");
/**
 * 创建 agent 时的默认 CLI provider。
 * 取使用率最高且我们已完整支持的那个（Claude Code），而不是历史遗留的 copilot。
 */
export const DEFAULT_CLI_PROVIDER: CliProvider = "claude";


/** @deprecated Prefer CliProvider — same union derived from CLI_PROVIDER_VALUES. */
export type CliProviderValue = CliProvider;

export function isCliProvider(value: unknown): value is CliProvider {
  return (
    typeof value === "string" &&
    (CLI_PROVIDER_VALUES as readonly string[]).includes(value)
  );
}

/**
 * CLI provider → machine capability tag required to run that CLI on a bound
 * machine. Shared by the quick-create CLI panel and AdvancedSettingsTab so the
 * machine dropdown filters identically in both surfaces.
 */
export const CLI_CAPABILITY_BY_PROVIDER: Record<CliProvider, string> = {
  copilot: "copilot-cli",
  gemini: "gemini-cli",
  codex: "codex-cli",
  claude: "claude-code",
  agy: "agy-cli",
  qoder: "qoder-cli",
  opencode: "opencode-cli",
  grok: "grok-cli",
  kimi: "kimi-cli",
};

/**
 * Display labels for the 9 CLI providers, used by both the quick-create CLI
 * panel and the AdvancedSettingsTab provider dropdown / read-only view.
 * Format follows the historical AdvancedSettingsTab wording (label + binary hint).
 */
export const CLI_PROVIDER_DISPLAY_LABELS: Record<CliProvider, string> = {
  copilot: "GitHub Copilot CLI（gh copilot）",
  gemini: "Gemini CLI（gemini）",
  codex: "OpenAI Codex CLI（codex exec）",
  claude: "Claude CLI（claude）",
  agy: "Google Antigravity CLI（agy）",
  qoder: "Qoder CLI（qoder）",
  opencode: "OpenCode CLI（opencode）",
  grok: "Grok CLI（grok）",
  kimi: "Kimi Code CLI（kimi）",
};

/**
 * Grouped CLI provider options — the single source of truth for the provider
 * dropdown in both the quick-create CLI panel and AdvancedSettingsTab.
 * Labels are derived from CLI_PROVIDER_DISPLAY_LABELS so the two surfaces can
 * never drift; add a provider here, not in either component.
 */
export const CLI_PROVIDER_GROUPS: ReadonlyArray<{
  id: string;
  label: string;
  items: ReadonlyArray<{ value: CliProvider; label: string }>;
}> = [
  {
    id: "coding",
    label: "代码与工程协同 CLI",
    items: (
      ["copilot", "claude", "codex", "qoder", "opencode"] as const
    ).map((value) => ({
      value,
      label: CLI_PROVIDER_DISPLAY_LABELS[value],
    })),
  },
  {
    id: "multimodal",
    label: "推理与通用多模态 CLI",
    items: (["gemini", "grok", "kimi", "agy"] as const).map((value) => ({
      value,
      label: CLI_PROVIDER_DISPLAY_LABELS[value],
    })),
  },
];

/**
 * Machine summary returned by GET /api/machines. Shared shape so the
 * quick-create CLI panel and AdvancedSettingsTab parse the same response.
 */
export type MachineSummary = {
  machineId: string;
  name: string;
  platform: string;
  arch: string;
  capabilities: string[];
  connectorStatus?: "connected" | "disconnected";
  status: "online" | "offline";
};

/**
 * CLI provider dropdown options (value + display label) for quick-create.
 *
 * 必须基于 CREATABLE_CLI_PROVIDERS：已停用的 provider（如 gemini）留在枚举里是为了
 * 存量 agent 能用，但**新建界面不能再列出来**。用 CLI_PROVIDER_VALUES 会让
 * CREATABLE_CLI_PROVIDERS 变成没人消费的悬空导出。
 */
export const CLI_PROVIDER_OPTIONS: ReadonlyArray<{
  value: CliProvider;
  label: string;
}> = CREATABLE_CLI_PROVIDERS.map((value) => ({
  value,
  label: CLI_PROVIDER_DISPLAY_LABELS[value],
}));
