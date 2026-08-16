/**
 * Shared provider-preset projection for create / advanced UI.
 * Single place for OAuth + API-key template → form field bags.
 * Do not re-infer commercial taxonomy here — registry is authority.
 */

import {
  ALL_PROVIDER_REGISTRY,
  CUSTOM_API_KEY_TEMPLATES,
  SUBSCRIPTION_OAUTH_PROVIDERS,
  findProviderById,
  type ApiKeyTemplateConfig,
  type OAuthProviderConfig,
  type ProviderRegistryEntry,
} from "./providerRegistry";
import { DEFAULT_REASONING_EFFORT } from "./createAgentSchema";
import type { ReasoningEffort } from "./createAgentSchema";

/** Manual open-ended custom endpoint (not in registry). */
export const MANUAL_PROVIDER_PRESET_ID = "manual" as const;

export type ProviderPresetId = string;

export type ProviderPresetFieldBag = {
  presetId: ProviderPresetId;
  kind: "oauth" | "api_key_template" | "manual";
  provider: string;
  model: string;
  customProviderUrl: string;
  apiKeyRef: string;
  apiKeyHeader: string;
  /** Clear raw apiKey when switching to OAuth. */
  clearApiKey: boolean;
  /** Template URLs are usually locked in advanced UI; still overridable for quick create. */
  lockCustomProviderUrl: boolean;
  requiresDesktopOAuth: boolean;
  label: string;
  description?: string;
  modelOptions: ReadonlyArray<{
    id: string;
    label: string;
    recommended?: boolean;
    hasVision?: boolean;
  }>;
  /**
   * 该 preset 建议的默认推理强度。
   * OAuth 订阅按订阅定位给差异化值；Token Plan / metered API 走 schema 默认 medium；
   * manual 回退到 schema 默认 medium。
   */
  defaultReasoningEffort: ReasoningEffort;
};

export type ProviderPresetListGroup = {
  id: "subscription_oauth" | "subscription_token_plan" | "metered_api" | "manual";
  label: string;
  items: { id: string; label: string; description?: string }[];
};

export function formatProviderPresetLabel(entry: ProviderRegistryEntry): string {
  if (entry.kind === "oauth") {
    return entry.description
      ? `${entry.label} (${entry.description})`
      : entry.label;
  }
  return entry.label;
}

export function resolveProviderPresetFields(
  presetId: string | null | undefined,
): ProviderPresetFieldBag {
  if (!presetId || presetId === MANUAL_PROVIDER_PRESET_ID) {
    return {
      presetId: MANUAL_PROVIDER_PRESET_ID,
      kind: "manual",
      provider: "custom",
      model: "",
      customProviderUrl: "",
      apiKeyRef: "",
      apiKeyHeader: "",
      clearApiKey: false,
      lockCustomProviderUrl: false,
      requiresDesktopOAuth: false,
      label: "Manual / Other",
      modelOptions: [],
      defaultReasoningEffort: DEFAULT_REASONING_EFFORT,
    };
  }

  const preset = findProviderById(presetId);
  if (!preset) {
    return resolveProviderPresetFields(MANUAL_PROVIDER_PRESET_ID);
  }

  if (preset.kind === "oauth") {
    return {
      presetId: preset.id,
      kind: "oauth",
      provider: preset.provider,
      model: preset.defaultModel ?? "",
      customProviderUrl: preset.cloudCodeBaseUrl ?? "",
      apiKeyRef: preset.apiKeyRef,
      apiKeyHeader: "",
      clearApiKey: true,
      lockCustomProviderUrl: Boolean(preset.cloudCodeBaseUrl),
      requiresDesktopOAuth: true,
      label: formatProviderPresetLabel(preset),
      description: preset.description,
      modelOptions: preset.modelOptions,
      defaultReasoningEffort: preset.defaultReasoningEffort ?? DEFAULT_REASONING_EFFORT,
    };
  }

  return {
    presetId: preset.id,
    kind: "api_key_template",
    provider: preset.provider,
    model: preset.defaultModel ?? "",
    customProviderUrl: preset.baseUrl,
    apiKeyRef: "",
    apiKeyHeader: preset.apiKeyHeader ?? "",
    clearApiKey: false,
    lockCustomProviderUrl: true,
    requiresDesktopOAuth: false,
    label: formatProviderPresetLabel(preset),
    description: preset.description,
    modelOptions: preset.modelOptions ?? [],
    defaultReasoningEffort: preset.defaultReasoningEffort ?? DEFAULT_REASONING_EFFORT,
  };
}

/**
 * Apply preset field bag through a setValue-like callback (RHF or local state).
 */
export function applyProviderPresetFields(
  fields: ProviderPresetFieldBag,
  setValue: (key: string, value: string) => void,
): void {
  setValue("provider", fields.provider);
  setValue("model", fields.model);
  setValue("customProviderUrl", fields.customProviderUrl);
  setValue("apiKeyRef", fields.apiKeyRef);
  setValue("apiKeyHeader", fields.apiKeyHeader);
  if (fields.clearApiKey) {
    setValue("apiKey", "");
  }
}

/** Full registry UI groups matching AdvancedSettingsTab historical layout. */
export function listProviderPresetGroups(): ProviderPresetListGroup[] {
  return [
    {
      id: "subscription_oauth",
      label: "Subscription OAuth",
      items: SUBSCRIPTION_OAUTH_PROVIDERS.map((p) => ({
        id: p.id,
        label: p.label,
        description: p.description,
      })),
    },
    {
      id: "metered_api",
      label: "Custom API Key",
      items: CUSTOM_API_KEY_TEMPLATES.map((p) => ({
        id: p.id,
        label: p.label,
        description: p.description,
      })),
    },
    {
      id: "manual",
      label: "Manual",
      items: [{ id: MANUAL_PROVIDER_PRESET_ID, label: "Manual / Other" }],
    },
  ];
}

/** Metered API templates only (+ manual) for 「自己的 API」quick create. */
export function listMeteredApiPresetOptions(): {
  id: string;
  label: string;
  description?: string;
}[] {
  return [
    ...CUSTOM_API_KEY_TEMPLATES.filter((p) => p.accessVariant === "metered_key").map(
      (p) => ({
        id: p.id,
        label: p.label,
        description: p.description,
      })
    ),
    { id: MANUAL_PROVIDER_PRESET_ID, label: "Manual / Other" },
  ];
}

/**
 * Subscription-facing options for Web quick create:
 * - Token Plan style (key + URL) → creatable on web
 * - OAuth brands → selectable but require desktop for binding
 */
export function listSubscriptionPresetOptions(): {
  id: string;
  label: string;
  description?: string;
  requiresDesktopOAuth: boolean;
}[] {
  const tokenPlans = CUSTOM_API_KEY_TEMPLATES.filter(
    (p) =>
      p.commercialKind === "subscription" ||
      p.accessVariant === "token_plan_endpoint"
  ).map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    requiresDesktopOAuth: false,
  }));

  const oauth = SUBSCRIPTION_OAUTH_PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    requiresDesktopOAuth: true,
  }));

  return [...tokenPlans, ...oauth];
}

export function isOAuthProviderPresetId(id: string | null | undefined): boolean {
  if (!id) return false;
  return SUBSCRIPTION_OAUTH_PROVIDERS.some((p) => p.id === id);
}

/** Restore the OAuth preset selector when an existing/drafted agent stores only apiKeyRef. */
export function findOAuthProviderPresetIdByApiKeyRef(
  apiKeyRef: string | null | undefined,
): string | undefined {
  const normalized = apiKeyRef?.trim().toLowerCase();
  if (!normalized) return undefined;
  return SUBSCRIPTION_OAUTH_PROVIDERS.find(
    (provider) => provider.apiKeyRef.toLowerCase() === normalized,
  )?.id;
}

export function isApiKeyTemplatePresetId(id: string | null | undefined): boolean {
  if (!id) return false;
  return CUSTOM_API_KEY_TEMPLATES.some((p) => p.id === id);
}

export function getProviderPresetDisplayLabel(presetId: string): string {
  if (presetId === MANUAL_PROVIDER_PRESET_ID) return "Manual / Other";
  const entry = findProviderById(presetId);
  if (!entry) return presetId;
  return formatProviderPresetLabel(entry);
}

export type { ApiKeyTemplateConfig, OAuthProviderConfig, ProviderRegistryEntry };
export { ALL_PROVIDER_REGISTRY, CUSTOM_API_KEY_TEMPLATES, SUBSCRIPTION_OAUTH_PROVIDERS };
