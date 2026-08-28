/**
 * Transient Agent-source descriptors derived from existing authorities.
 *
 * Seed sources (read-time only — not a new persistent registry):
 * - SUBSCRIPTION_OAUTH_PROVIDERS
 * - CUSTOM_API_KEY_TEMPLATES (commercialKind / accessVariant on registry entries)
 * - CLI_PROVIDER_VALUES (cliProviders.ts single authority)
 * - explicit local extras (Ollama / LM Studio / configure-later)
 *
 * Do not invent new apiSource values. Do not dual-seed sourceRegistry.
 * Do not re-infer commercial taxonomy from template id after registry metadata exists.
 * Capability status is injected by callers later — this module stays browser-safe.
 */

import type { FormData as AgentFormData } from "./createAgentSchema";
import { CLI_PROVIDER_VALUES, type CliProvider } from "./cliProviders";
import {
  CUSTOM_API_KEY_TEMPLATES,
  SUBSCRIPTION_OAUTH_PROVIDERS,
  findProviderById,
  type ApiKeyTemplateConfig,
  type OAuthProviderConfig,
} from "./providerRegistry";

// ── Types ────────────────────────────────────────────────────────────────────

export type AgentSourceCommercialKind =
  | "subscription"
  | "api"
  | "cli"
  | "local";

export type AgentSourceAccessVariant =
  | "oauth"
  | "token_plan_endpoint"
  | "metered_key"
  | "cli_session"
  | "local_runtime"
  | "configure_later";

/** Visual / ordering groups for Agent-first create UI. */
export type AgentSourceGroup =
  | "token_plan"
  | "subscription_oauth"
  | "metered_api"
  | "cli_session"
  | "local_later";

export type AgentSourceFormDefaults = {
  apiSource: "custom" | "cli";
  provider?: string | null;
  model?: string | null;
  customProviderUrl?: string | null;
  apiKeyRef?: string | null;
  apiKeyHeader?: string | null;
  cliProvider?: CliProvider | null;
  useServerProxy: boolean;
};

/**
 * Pure view-model for one create-time source choice.
 * status/capability fields intentionally omitted (inject later).
 */
export type AgentSourceDescriptor = {
  sourceKey: string;
  commercialKind: AgentSourceCommercialKind;
  accessVariant: AgentSourceAccessVariant;
  group: AgentSourceGroup;
  /** Token Plan is the recommended default for local-first create. */
  recommended?: boolean;
  label: string;
  description?: string;
  /** Defaults projected into createAgent form (without user overrides). */
  form: AgentSourceFormDefaults;
  /** Whether create UI must collect a transient API key for broker migration. */
  requiresApiKey: boolean;
  /**
   * OAuth only: real store / `nolo auth` id (apiKeyRef), never registry preset id
   * when those differ (e.g. preset `xai-oauth` → apiKeyRef `xai`).
   */
  oauthApiKeyRef?: string;
  /** `nolo auth <apiKeyRef>` using the real credential id. */
  oauthAuthCommand?: string;
  /** Registry preset id when derived from providerRegistry (may differ from apiKeyRef). */
  registryPresetId?: string;
  /** CLI binary hint for setup copy (not a capability probe). */
  cliBinaryHint?: string;
};

export type ProjectAgentSourceFormInput = {
  sourceKey: string;
  name: string;
  /** Transient only — createAgent migrates into broker; never for OAuth/CLI. */
  apiKey?: string | null;
  model?: string | null;
  customProviderUrl?: string | null;
};

// ── Local extras (view-model only; not providerRegistry) ─────────────────────

const OLLAMA_DEFAULTS = {
  provider: "ollama",
  model: "llama3.2",
  customProviderUrl: "http://127.0.0.1:11434/v1",
} as const;

const LM_STUDIO_DEFAULTS = {
  provider: "lmstudio",
  model: "local-model",
  customProviderUrl: "http://localhost:1234/v1",
} as const;

const LATER_DEFAULTS = {
  provider: "custom",
  model: "local-model",
  customProviderUrl: null as string | null,
} as const;

/** Display metadata for CLI sessions — values must match CLI_PROVIDER_VALUES. */
const CLI_SESSION_META: Record<
  CliProvider,
  { label: string; binaryHint: string; description: string }
> = {
  copilot: {
    label: "GitHub Copilot CLI",
    binaryHint: "gh copilot",
    description: "需已安装 gh + Copilot 扩展并登录",
  },
  gemini: {
    label: "Gemini CLI",
    binaryHint: "gemini",
    description: "需已安装 gemini CLI 并登录",
  },
  codex: {
    label: "OpenAI Codex CLI",
    binaryHint: "codex",
    description: "需已安装 codex CLI 并登录",
  },
  claude: {
    label: "Claude Code CLI",
    binaryHint: "claude",
    description: "需已安装 claude CLI 并登录（claude -p）",
  },
  agy: {
    label: "Antigravity CLI",
    binaryHint: "agy",
    description: "需已安装 agy CLI 并登录",
  },
  qoder: {
    label: "Qoder CLI",
    binaryHint: "qoder",
    description: "需已安装 qoder CLI 并登录",
  },
  opencode: {
    label: "OpenCode CLI",
    binaryHint: "opencode",
    description: "需已安装 opencode CLI 并登录",
  },
  grok: {
    label: "Grok CLI",
    binaryHint: "grok",
    description: "需已安装 grok CLI 并登录或配置 XAI_API_KEY",
  },
  kimi: {
    label: "Kimi Code CLI",
    binaryHint: "kimi",
    description: "需已安装 kimi CLI 并登录",
  },
};

function oauthDescriptor(preset: OAuthProviderConfig): AgentSourceDescriptor {
  return {
    sourceKey: `oauth:${preset.apiKeyRef}`,
    commercialKind: "subscription",
    accessVariant: "oauth",
    group: "subscription_oauth",
    label: preset.label,
    description: preset.description,
    registryPresetId: preset.id,
    oauthApiKeyRef: preset.apiKeyRef,
    oauthAuthCommand: `nolo auth ${preset.apiKeyRef}`,
    requiresApiKey: false,
    form: {
      apiSource: "custom",
      useServerProxy: false,
      provider: preset.provider,
      model: preset.defaultModel ?? null,
      // Antigravity uses Cloud Code URL; ChatGPT/xAI leave unset for runtime resolution.
      customProviderUrl: preset.cloudCodeBaseUrl ?? null,
      apiKeyRef: preset.apiKeyRef,
      apiKeyHeader: null,
      cliProvider: null,
    },
  };
}

function templateDescriptor(template: ApiKeyTemplateConfig): AgentSourceDescriptor {
  // commercialKind / accessVariant come only from providerRegistry metadata.
  const { accessVariant, commercialKind } = template;
  const isTokenPlan = accessVariant === "token_plan_endpoint";
  return {
    sourceKey: `template:${template.id}`,
    commercialKind,
    accessVariant,
    group: isTokenPlan ? "token_plan" : "metered_api",
    recommended: isTokenPlan,
    label: template.label,
    description: template.description,
    registryPresetId: template.id,
    requiresApiKey: true,
    form: {
      apiSource: "custom",
      useServerProxy: false,
      provider: template.provider,
      model: template.defaultModel ?? null,
      customProviderUrl: template.baseUrl,
      apiKeyRef: null,
      apiKeyHeader: template.apiKeyHeader ?? null,
      cliProvider: null,
    },
  };
}

function cliDescriptor(cliProvider: CliProvider): AgentSourceDescriptor {
  const meta = CLI_SESSION_META[cliProvider];
  return {
    sourceKey: `cli:${cliProvider}`,
    commercialKind: "cli",
    accessVariant: "cli_session",
    group: "cli_session",
    label: meta.label,
    description: meta.description,
    cliBinaryHint: meta.binaryHint,
    requiresApiKey: false,
    form: {
      apiSource: "cli",
      useServerProxy: false,
      provider: null,
      model: null,
      customProviderUrl: null,
      apiKeyRef: null,
      apiKeyHeader: null,
      cliProvider,
    },
  };
}

function ollamaDescriptor(): AgentSourceDescriptor {
  return {
    sourceKey: "local:ollama",
    commercialKind: "local",
    accessVariant: "local_runtime",
    group: "local_later",
    label: "Ollama 本机",
    description: "已装 Ollama 时一键可用，默认 localhost",
    requiresApiKey: false,
    form: {
      apiSource: "custom",
      useServerProxy: false,
      provider: OLLAMA_DEFAULTS.provider,
      model: OLLAMA_DEFAULTS.model,
      customProviderUrl: OLLAMA_DEFAULTS.customProviderUrl,
      apiKeyRef: null,
      apiKeyHeader: null,
      cliProvider: null,
    },
  };
}

function lmStudioDescriptor(): AgentSourceDescriptor {
  return {
    sourceKey: "local:lmstudio",
    commercialKind: "local",
    accessVariant: "local_runtime",
    group: "local_later",
    label: "LM Studio 本机",
    description: "已开 LM Studio 本地服务时可用，默认 localhost:1234",
    requiresApiKey: false,
    form: {
      apiSource: "custom",
      useServerProxy: false,
      provider: LM_STUDIO_DEFAULTS.provider,
      model: LM_STUDIO_DEFAULTS.model,
      customProviderUrl: LM_STUDIO_DEFAULTS.customProviderUrl,
      apiKeyRef: null,
      apiKeyHeader: null,
      cliProvider: null,
    },
  };
}

function laterDescriptor(): AgentSourceDescriptor {
  return {
    sourceKey: "local:later",
    commercialKind: "local",
    accessVariant: "configure_later",
    group: "local_later",
    label: "稍后配置",
    description: "先建好 Agent，模型稍后再接",
    requiresApiKey: false,
    form: {
      apiSource: "custom",
      useServerProxy: false,
      provider: LATER_DEFAULTS.provider,
      model: LATER_DEFAULTS.model,
      customProviderUrl: LATER_DEFAULTS.customProviderUrl,
      apiKeyRef: null,
      apiKeyHeader: null,
      cliProvider: null,
    },
  };
}

/**
 * Ordered Agent-first source list:
 * Token Plan → subscription OAuth → metered API → CLI sessions → local/later.
 */
export function listAgentSourceDescriptors(): AgentSourceDescriptor[] {
  const tokenPlan: AgentSourceDescriptor[] = [];
  const metered: AgentSourceDescriptor[] = [];
  for (const template of CUSTOM_API_KEY_TEMPLATES) {
    const d = templateDescriptor(template);
    if (d.group === "token_plan") tokenPlan.push(d);
    else metered.push(d);
  }

  return [
    ...tokenPlan,
    ...SUBSCRIPTION_OAUTH_PROVIDERS.map(oauthDescriptor),
    ...metered,
    ...CLI_PROVIDER_VALUES.map(cliDescriptor),
    ollamaDescriptor(),
    lmStudioDescriptor(),
    laterDescriptor(),
  ];
}

export function getAgentSourceDescriptor(
  sourceKey: string,
): AgentSourceDescriptor | undefined {
  return listAgentSourceDescriptors().find((d) => d.sourceKey === sourceKey);
}

/** Default selection for Desktop/RN quick-create (Token Plan recommended). */
export function getRecommendedAgentSourceKey(): string {
  const list = listAgentSourceDescriptors();
  const recommended = list.find((d) => d.recommended);
  if (recommended) return recommended.sourceKey;
  const tokenPlan = list.find((d) => d.accessVariant === "token_plan_endpoint");
  if (tokenPlan) return tokenPlan.sourceKey;
  return list[0]?.sourceKey ?? "local:later";
}

export function groupAgentSourceDescriptors(
  descriptors: AgentSourceDescriptor[] = listAgentSourceDescriptors(),
): { group: AgentSourceGroup; label: string; items: AgentSourceDescriptor[] }[] {
  const order: AgentSourceGroup[] = [
    "token_plan",
    "subscription_oauth",
    "metered_api",
    "cli_session",
    "local_later",
  ];
  const labels: Record<AgentSourceGroup, string> = {
    token_plan: "Token Plan",
    subscription_oauth: "订阅 OAuth",
    metered_api: "API Key",
    cli_session: "本机 CLI",
    local_later: "本地 / 稍后",
  };
  return order
    .map((group) => ({
      group,
      label: labels[group],
      items: descriptors.filter((d) => d.group === group),
    }))
    .filter((g) => g.items.length > 0);
}

/**
 * Project a descriptor + user overrides into createAgent FormData.
 * Pure — no network, no store, no capability probe.
 */
export function projectAgentSourceFormData(
  input: ProjectAgentSourceFormInput,
): AgentFormData {
  const descriptor = getAgentSourceDescriptor(input.sourceKey);
  if (!descriptor) {
    throw new Error(`Unknown agent source descriptor: ${input.sourceKey}`);
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Agent name is required for form projection");
  }

  const base = {
    name,
    isPublic: false,
    tools: [] as string[],
    prompt: "",
    inputPrice: 0,
    outputPrice: 0,
    defaultInteractionMode: "text" as const,
    hasVision: false,
    references: [] as AgentFormData["references"],
  };

  const modelOverride = (input.model ?? "").trim();
  const urlOverride = (input.customProviderUrl ?? "").trim();

  if (descriptor.accessVariant === "oauth") {
    // Never pass raw apiKey for OAuth — credential is apiKeyRef / nolo auth store.
    // Omit apiKey entirely (undefined) so createAgent does not persist a null secret field.
    return {
      ...base,
      apiSource: "custom",
      useServerProxy: false,
      provider: descriptor.form.provider ?? null,
      model: modelOverride || descriptor.form.model || "",
      customProviderUrl:
        urlOverride || descriptor.form.customProviderUrl || null,
      apiKeyRef: descriptor.form.apiKeyRef ?? descriptor.oauthApiKeyRef ?? null,
    } as AgentFormData;
  }

  if (descriptor.accessVariant === "cli_session") {
    const cliProvider = descriptor.form.cliProvider;
    if (!cliProvider) {
      throw new Error(`CLI descriptor missing cliProvider: ${descriptor.sourceKey}`);
    }
    return {
      ...base,
      apiSource: "cli",
      useServerProxy: false,
      // machineId intentionally unset — advanced binding only.
      // No apiKey / apiKeyRef — session lives in the host CLI.
      cliProvider,
      ...(modelOverride ? { model: modelOverride } : {}),
    } as AgentFormData;
  }

  if (descriptor.accessVariant === "configure_later") {
    return {
      ...base,
      apiSource: "custom",
      useServerProxy: false,
      provider: descriptor.form.provider ?? "custom",
      model: modelOverride || descriptor.form.model || "local-model",
      customProviderUrl: urlOverride || null,
    } as AgentFormData;
  }

  // token_plan_endpoint | metered_key | local_runtime
  const projected: AgentFormData = {
    ...base,
    apiSource: "custom",
    useServerProxy: false,
    provider: descriptor.form.provider ?? null,
    model: modelOverride || descriptor.form.model || "",
    customProviderUrl:
      urlOverride || descriptor.form.customProviderUrl || null,
    ...(descriptor.form.apiKeyHeader
      ? { apiKeyHeader: descriptor.form.apiKeyHeader }
      : {}),
  } as AgentFormData;

  if (descriptor.requiresApiKey) {
    const key = (input.apiKey ?? "").trim();
    if (key) projected.apiKey = key;
  }

  return projected;
}

/**
 * Token Plan template from providerRegistry only.
 * Throws if missing — never shadow with a second URL/model constant set.
 */
export function getTokenPlanTemplate(): ApiKeyTemplateConfig {
  const found = findProviderById("token-plan");
  if (found?.kind === "api_key_template") return found;
  throw new Error(
    "Token Plan provider configuration is unavailable (missing providerRegistry entry: token-plan).",
  );
}

export function isOAuthAgentSource(sourceKey: string): boolean {
  return getAgentSourceDescriptor(sourceKey)?.accessVariant === "oauth";
}

export function isCliAgentSource(sourceKey: string): boolean {
  return getAgentSourceDescriptor(sourceKey)?.accessVariant === "cli_session";
}
