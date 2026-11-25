import { resolveNewAgentThinkingSelection } from "../modelReasoningCapability";
import type { ThinkingSelection } from "./ThinkingControlField";
import { useThinkingControl } from "./useModelReasoningCapability";
// 路径: ai/agent/web/useAgentCreateSourceState.ts
// AgentCreateSourceStep 的状态与 draft 编排（与 UI 渲染分离）。

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL } from "ai/llm/platformHosted";
import { getModelsByProvider } from "ai/llm/providers";
import {
  CLI_CAPABILITY_BY_PROVIDER,
  CLI_PROVIDER_OPTIONS,
  CLI_PROVIDER_VALUES,
  type CliProvider,
  type MachineSummary,
} from "ai/agent/cliProviders";
import { toErrorMessage } from "core/errorMessage";
import { toast } from "app/utils/toast";
import {
  MANUAL_PROVIDER_PRESET_ID,
  listMeteredApiPresetOptions,
  listSubscriptionPresetOptions,
  resolveProviderPresetFields,
} from "../providerPresetApply";
import { normalizeServerOrigin } from "core/serverOrigin";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useAppSelector } from "app/store";
import { useToken, useIsLoggedIn, useUserId } from "identity";
import { useSubscriptionOAuthConnection } from "./useSubscriptionOAuthConnection";
import { getLocalProviderSecret, getServerProviderSecret, providerCredentialRef, saveProviderSecret } from "../providerSecrets";
import { mergeModelOptionsWithDiscovery } from "./providerModelDiscoveryClient";
import { useProviderModelDiscovery } from "./useProviderModelDiscovery";

/** High-level run-mode choices (not apiSource enum values). */
export type CreateRunMode = "platform" | "api" | "subscription" | "cli";

export type QuickCreateAttempt = { providerCopyUploaded: boolean };

/** Draft collected on the quick-create panel before create / advanced edit. */
export type AgentCreateQuickDraft = {
  mode: CreateRunMode;
  prompt: string;
  name: string;
  /** Platform or custom provider id. */
  provider: string;
  model: string;
  /** Whether the selected model supports vision (derived from model catalog). */
  hasVision: boolean;
  customProviderUrl: string;
  apiKey: string;
  apiKeyRef: string;
  apiKeyHeader: string;
  /** Selected registry preset id (api / subscription). */
  presetId: string;
  requiresDesktopOAuth: boolean;
  /** The selected OAuth credential is available in the current runtime. */
  oauthConnected: boolean;
  /** User opted into cross-device key use (server-side encrypted store). */
  credentialSynced: boolean;
  reasoningEffort?: ThinkingSelection["reasoningEffort"];
  enableThinking?: ThinkingSelection["enableThinking"];
  /** CLI provider selected on the cli panel (empty for non-cli modes). */
  cliProvider: string;
  /** Bound machine id for cli mode (empty = server/local CLI runtime). */
  machineId: string;
  /** Bound machine display name (resolved from machine list, for advanced edit). */
  machineName: string;
};

/** Platform quick-create defaults (path-level; model is user-selectable). */
export const PLATFORM_QUICK_CREATE_MODEL = {
  provider: "nolo",
  name: PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL,
  displayName: "DeepSeek V4 Flash",
} as const;

export const CREATE_RUN_MODE_LABELS: Record<CreateRunMode, string> = {
  platform: "平台内置",
  api: "API 用量计费",
  subscription: "订阅会员",
  cli: "本机 CLI",
};

export function deriveAgentNameFromPrompt(prompt: string, fallback = "新 AI"): string {
  const line = prompt.trim().split(/\n/)[0]?.trim() ?? "";
  if (!line) return fallback;
  return line.slice(0, 50);
}

/**
 * 根据选中的模型 id 从 modelOptions 查找展示名，用作 Agent 默认名称的兜底。
 * 优先级：提示词首行 > 模型 displayName > "新 AI"。
 * 兼容 { id } 与 { value } 两种选项形状。
 */
function resolveModelLabel(
  modelId: string,
  modelOptions: ReadonlyArray<{ id?: string; value?: string; label: string }>,
): string {
  const hit = modelOptions.find((m) => m.id === modelId || m.value === modelId);
  return hit?.label ?? "";
}

/**
 * 从 modelOptions 按模型 id 解析是否支持视觉，供 draft 写入 agent 记录。
 * 兼容 { id } 与 { value } 两种选项形状；找不到时返回 false。
 */
function resolveModelHasVision(
  modelId: string,
  modelOptions: ReadonlyArray<{ id?: string; value?: string; hasVision?: boolean }>,
): boolean {
  const hit = modelOptions.find((m) => m.id === modelId || m.value === modelId);
  return Boolean(hit?.hasVision);
}

export type UseAgentCreateSourceStateArgs = {
  selected: CreateRunMode | null;
  onAdvancedEdit: (draft: AgentCreateQuickDraft) => void;
  onQuickCreate: (draft: AgentCreateQuickDraft, attempt?: QuickCreateAttempt) => boolean | void | Promise<boolean | void>;
  isSubmitting?: boolean;
  disabled?: boolean;
};

export function useAgentCreateSourceState({
  selected,
  onAdvancedEdit,
  onQuickCreate,
  isSubmitting = false,
  disabled = false,
}: UseAgentCreateSourceStateArgs) {
  const { t } = useTranslation("ai");

  const platformModelOptions = useMemo(() => {
    const models = getModelsByProvider(PLATFORM_QUICK_CREATE_MODEL.provider as any);
    return models.map((m) => ({
      value: m.name,
      label: (m as { displayName?: string }).displayName || m.name,
      hasVision: Boolean((m as { hasVision?: boolean }).hasVision),
    }));
  }, []);
  const meteredPresets = useMemo(() => listMeteredApiPresetOptions(), []);
  const subscriptionPresets = useMemo(() => listSubscriptionPresetOptions(), []);
  const meteredPresetOptions = useMemo(
    () =>
      meteredPresets.map((p) => ({
        value: p.id,
        label: p.label,
        provider: p.provider,
      })),
    [meteredPresets]
  );
  const subscriptionPresetOptions = useMemo(
    () =>
      subscriptionPresets.map((p) => ({
        value: p.id,
        // 官方限制第三方登录的通道照常可选（产品决定 2026-11-14），只在标签上
        // 明确标出来，让用户知道后果由自己承担。
        label: `${p.label}${p.requiresDesktopOAuth ? " · OAuth" : ""}${
          p.riskNotice
            ? ` · ${t("providerPreset.officialRestricted", "官方限制第三方登录")}`
            : ""
        }`,
        provider: p.provider,
      })),
    [subscriptionPresets]
  );

  const defaultApiPresetId =
    meteredPresets.find((p) => p.id === "openai-api")?.id ??
    meteredPresets[0]?.id ??
    MANUAL_PROVIDER_PRESET_ID;
  // MiMo Token Plan 的旧默认与按量 API 的现役目录不共用；快速创建使用已有现役目录的千问方案。
  const defaultSubPresetId =
    subscriptionPresets.find((p) => p.id === "qwen-token-plan")?.id ??
    subscriptionPresets[0]?.id ??
    "qwen-token-plan";

  const [prompt, setPrompt] = useState("");
  const [platformModel, setPlatformModel] = useState<string>(
    PLATFORM_QUICK_CREATE_MODEL.name
  );
  const [apiPresetId, setApiPresetId] = useState(defaultApiPresetId);
  const [subPresetId, setSubPresetId] = useState(defaultSubPresetId);
  const [customProviderUrl, setCustomProviderUrl] = useState(() => {
    const f = resolveProviderPresetFields(defaultApiPresetId);
    return f.customProviderUrl;
  });
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(() => {
    const f = resolveProviderPresetFields(defaultApiPresetId);
    return f.model;
  });
  const [subCustomProviderUrl, setSubCustomProviderUrl] = useState(() => {
    const f = resolveProviderPresetFields(defaultSubPresetId);
    return f.customProviderUrl;
  });
  const [subApiKey, setSubApiKey] = useState("");
  // Scoped to this selection: an explicit empty value is still a user edit.
  const subKeyEdit = useRef({ edited: false });
  const changeSubApiKey = (value: string) => {
    subKeyEdit.current.edited = true;
    setSubApiKey(value);
  };
  const [crossDeviceKey, setCrossDeviceKey] = useState(true);
  const [sharedLocalKey, setSharedLocalKey] = useState<{ presetId: string; value: string } | null>(null);
  const [providerKeyRemembered, setProviderKeyRemembered] = useState(true);
  const [subModel, setSubModel] = useState(() => {
    const f = resolveProviderPresetFields(defaultSubPresetId);
    return f.model;
  });
  // ── CLI 面板状态 ──
  const [cliProvider, setCliProvider] = useState<CliProvider>(
    () => CLI_PROVIDER_VALUES[0] as CliProvider,
  );
  const [cliMachineId, setCliMachineId] = useState<string>("");
  const [cliMachines, setCliMachines] = useState<MachineSummary[]>([]);
  const [cliMachinesError, setCliMachinesError] = useState<string | null>(null);
  const currentServer = useAppSelector(selectCurrentServer);
  const cliAuthToken = useToken() ?? "";
  const cliLoggedIn = useIsLoggedIn();
  const userId = useUserId();
  const showCredentialSync = cliLoggedIn && !!userId && userId !== "local";
  const providerKeyServerBase = useMemo(() => normalizeServerOrigin(currentServer) || (typeof window !== "undefined" ? window.location.origin : ""), [currentServer]);
  const [accountPrefill, setAccountPrefill] = useState<{ presetId: string; server: string; token: string } | null>(null);
  useEffect(() => {
    if (!subPresetId || resolveProviderPresetFields(subPresetId).kind !== "api_key_template") return;
    let cancelled = false;
    const edit = subKeyEdit.current;
    const fillIfUntouched = (value: string) => {
      if (edit === subKeyEdit.current && !edit.edited) {
        setSubApiKey((current) => current || value);
      }
    };
    // Prefer the device's remembered key over an older account copy.
    const local = getLocalProviderSecret(subPresetId);
    setAccountPrefill(null);
    if (local) {
      fillIfUntouched(local);
    } else if (cliAuthToken) {
      void getServerProviderSecret({ serverOrigin: providerKeyServerBase, token: cliAuthToken, presetId: subPresetId })
        .then((shared) => {
          if (!shared || cancelled || edit !== subKeyEdit.current || edit.edited) return;
          fillIfUntouched(shared);
          setAccountPrefill({ presetId: subPresetId, server: providerKeyServerBase, token: cliAuthToken });
        });
    }
    return () => { cancelled = true; };
  }, [subPresetId, cliAuthToken, providerKeyServerBase]);
  // Values read from the local-only store retain that provenance on remount.
  // Opting in for one value does not authorize a different key or preset.
  const localOnly = selected === "subscription" && !!subApiKey &&
    subApiKey.trim() === getLocalProviderSecret(subPresetId);
  const crossDeviceChecked = crossDeviceKey && (!localOnly ||
    (sharedLocalKey?.presetId === subPresetId && sharedLocalKey.value === subApiKey.trim()));
  const setCredentialSynced = (checked: boolean) => {
    setCrossDeviceKey(checked);
    setSharedLocalKey(checked && localOnly ? { presetId: subPresetId, value: subApiKey.trim() } : null);
  };
  const credentialSynced = crossDeviceChecked && showCredentialSync && Boolean(cliAuthToken);
  const cliServerBase = useMemo(() => {
    const configured = normalizeServerOrigin(currentServer);
    if (configured) return configured;
    return typeof window !== "undefined" ? window.location.origin : "";
  }, [currentServer]);

  // 拉取机器列表（仅 cli 面板可见且有 token 时），按 provider capability 过滤。
  const cliMachineOptions = useMemo(() => {
    const required = CLI_CAPABILITY_BY_PROVIDER[cliProvider];
    return cliMachines.filter(
      (m) =>
        m.status === "online" &&
        m.connectorStatus === "connected" &&
        m.capabilities.includes(required),
    );
  }, [cliMachines, cliProvider]);

  useEffect(() => {
    if (selected !== "cli" || !cliServerBase) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`${cliServerBase}/api/machines`, {
          method: "GET",
          cache: "no-store",
          headers: cliAuthToken
            ? { Authorization: `Bearer ${cliAuthToken}` }
            : {},
        });
        const data = (await response.json().catch(() => ({}))) as {
          machines?: MachineSummary[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || "Failed to load machines");
        if (!cancelled) {
          setCliMachines(Array.isArray(data.machines) ? data.machines : []);
          setCliMachinesError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setCliMachines([]);
          setCliMachinesError(toErrorMessage(error));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, cliServerBase, cliAuthToken]);

  const activePresetId =
    selected === "subscription"
      ? subPresetId
      : selected === "api"
        ? apiPresetId
        : MANUAL_PROVIDER_PRESET_ID;
  // ── Provider 动态模型发现（best-effort）──────────────────────────
  const discovery = useProviderModelDiscovery({
    serverOrigin: providerKeyServerBase,
    token: cliAuthToken,
    presetId: activePresetId,
    hasSharedProviderKey: selected === "subscription" && credentialSynced &&
      !subKeyEdit.current.edited && accountPrefill?.presetId === activePresetId &&
      accountPrefill.server === providerKeyServerBase && accountPrefill.token === cliAuthToken,
  });
  const activePresetFieldsRaw = useMemo(
    () => resolveProviderPresetFields(activePresetId),
    [activePresetId]
  );
  const activePresetFields = useMemo(
    () => ({
      ...activePresetFieldsRaw,
      modelOptions: mergeModelOptionsWithDiscovery(
        activePresetFieldsRaw.modelOptions,
        discovery,
      ),
    }),
    [activePresetFieldsRaw, discovery]
  );
  const oauthProvider =
    selected === "subscription" && activePresetFields.requiresDesktopOAuth
      ? activePresetFields.apiKeyRef
      : null;
  const oauth = useSubscriptionOAuthConnection(oauthProvider);
  const oauthConnected = oauth.connection.kind === "connected";

  const thinkingSource = selected === "platform"
    ? { provider: PLATFORM_QUICK_CREATE_MODEL.provider, model: platformModel }
    : selected === "subscription"
      ? { provider: activePresetFields.provider, model: subModel, customProviderUrl: subCustomProviderUrl }
      : selected === "api" ? { provider: activePresetFields.provider, model, customProviderUrl } : {};
  const thinkingControl = useThinkingControl(thinkingSource);
  const thinkingKey = JSON.stringify([selected, apiPresetId, subPresetId, thinkingSource]);
  const [thinkingOverride, setThinkingOverride] = useState<{ key: string; value: ThinkingSelection }>();
  const selection = thinkingOverride?.key === thinkingKey ? thinkingOverride.value : undefined;
  const { reasoningEffort, enableThinking } = resolveNewAgentThinkingSelection(thinkingControl, selection ?? {});
  const setThinking = (value: ThinkingSelection) => setThinkingOverride({ key: thinkingKey, value });

  const draft: AgentCreateQuickDraft = useMemo(() => {
    const defaultName = t("createAgent.quickCreate.defaultName", "新 AI");
    if (selected === "platform") {
      const modelLabel = resolveModelLabel(platformModel, platformModelOptions);
      const name = deriveAgentNameFromPrompt(prompt, modelLabel || defaultName);
      return {
        mode: "platform",
        prompt,
        name,
        provider: PLATFORM_QUICK_CREATE_MODEL.provider,
        model: platformModel,
        hasVision: resolveModelHasVision(platformModel, platformModelOptions),
        customProviderUrl: "",
        apiKey: "",
        apiKeyRef: "",
        apiKeyHeader: "",
        requiresDesktopOAuth: false,
        oauthConnected: false,
        credentialSynced: false,
        presetId: "",
        reasoningEffort,
        enableThinking,
        cliProvider: "",
        machineId: "",
        machineName: "",
      };
    }
    if (selected === "subscription") {
      const fields = activePresetFields;
      const modelId = subModel || fields.model;
      const modelLabel = resolveModelLabel(modelId, fields.modelOptions);
      const name = deriveAgentNameFromPrompt(prompt, modelLabel || defaultName);
      return {
        mode: "subscription",
        prompt,
        name,
        provider: fields.provider,
        model: modelId,
        hasVision: resolveModelHasVision(modelId, fields.modelOptions),
        customProviderUrl: subCustomProviderUrl,
        apiKey: subApiKey,
        apiKeyRef: fields.kind === "api_key_template" && providerKeyRemembered
          ? providerCredentialRef(subPresetId)
          : fields.apiKeyRef,
        apiKeyHeader: fields.apiKeyHeader,
        presetId: subPresetId,
        requiresDesktopOAuth: fields.requiresDesktopOAuth,
        oauthConnected,
        credentialSynced,
        reasoningEffort,
        enableThinking,
        cliProvider: "",
        machineId: "",
        machineName: "",
      };
    }
    if (selected === "cli") {
      const name = deriveAgentNameFromPrompt(prompt, defaultName);
      const machine = cliMachineOptions.find((m) => m.machineId === cliMachineId);
      return {
        mode: "cli",
        prompt,
        name,
        provider: "",
        model: "",
        hasVision: false,
        customProviderUrl: "",
        apiKey: "",
        apiKeyRef: "",
        apiKeyHeader: "",
        presetId: "",
        requiresDesktopOAuth: false,
        oauthConnected: false,
        credentialSynced: false,
        cliProvider,
        machineId: cliMachineId,
        machineName: machine?.name ?? "",
      };
    }
    // api
    const fields = activePresetFields;
    const modelId = model || fields.model;
    const modelLabel = resolveModelLabel(modelId, fields.modelOptions);
    const name = deriveAgentNameFromPrompt(prompt, modelLabel || defaultName);
    return {
      mode: "api",
      prompt,
      name,
      provider: fields.provider,
      model: modelId,
      hasVision: resolveModelHasVision(modelId, fields.modelOptions),
      customProviderUrl,
      apiKey,
      apiKeyRef: fields.apiKeyRef,
      apiKeyHeader: fields.apiKeyHeader,
      presetId: apiPresetId,
      requiresDesktopOAuth: false,
      oauthConnected: false,
      credentialSynced,
      reasoningEffort,
      enableThinking,
      cliProvider: "",
      machineId: "",
      machineName: "",
    };
  }, [
    selected,
    prompt,
    platformModel,
    platformModelOptions,
    activePresetFields,
    apiPresetId,
    subPresetId,
    customProviderUrl,
    apiKey,
    model,
    subCustomProviderUrl,
    subApiKey,
    subModel,
    reasoningEffort,
    enableThinking,
    oauthConnected,
    credentialSynced,
    providerKeyRemembered,
    cliProvider,
    cliMachineId,
    cliMachineOptions,
    t,
  ]);

  const busy = disabled || isSubmitting;
  const canCreatePlatform = selected === "platform" && !!platformModel;
  const canCreateApi =
    selected === "api" && customProviderUrl.trim().length > 0;
  const canCreateSubscription =
    selected === "subscription" &&
    (draft.requiresDesktopOAuth
      ? oauthConnected
      : subCustomProviderUrl.trim().length > 0 && subApiKey.trim().length > 0);
  const canCreateCli = selected === "cli";
  const canCreate =
    canCreatePlatform || canCreateApi || canCreateSubscription || canCreateCli;
  const canAdvanced =
    selected === "platform" ||
    selected === "api" ||
    selected === "cli" ||
    (selected === "subscription" &&
      (!draft.requiresDesktopOAuth || oauthConnected));

  const applyApiPreset = (id: string) => {
    setApiPresetId(id);
    const fields = resolveProviderPresetFields(id);
    setCustomProviderUrl(fields.customProviderUrl);
    setModel(fields.model || model);
    if (fields.clearApiKey) setApiKey("");
  };

  const applySubPreset = (id: string) => {
    const changed = id !== subPresetId;
    setSubPresetId(id);
    const fields = resolveProviderPresetFields(id);
    setSubCustomProviderUrl(fields.customProviderUrl);
    setSubModel(fields.model);
    // A key belongs to its plan; the lookup effect can refill a saved key for the new plan.
    if (changed) subKeyEdit.current = { edited: false };
    if (changed || fields.clearApiKey) setSubApiKey("");
  };

  // 切换 CLI provider 时重置 machineId：不同 provider 的 capability 不同，
  // 旧选中的机器可能不再支持新 provider，回到「默认环境」最安全。
  const applyCliProvider = (id: string) => {
    setCliProvider(id as CliProvider);
    setCliMachineId("");
  };

  const pendingCreate = useRef<{ owner?: string; server: string; attempt: QuickCreateAttempt;
    uploaded?: { presetId: string; value: string } } | null>(null);
  const handleCreate = async () => {
    if (!selected || !canCreate) return;
    if (!pendingCreate.current || pendingCreate.current.owner !== userId || pendingCreate.current.server !== providerKeyServerBase) {
      pendingCreate.current = { owner: userId, server: providerKeyServerBase, attempt: { providerCopyUploaded: false } };
    }
    const pending = pendingCreate.current;
    pending.attempt.providerCopyUploaded = false;
    if (selected === "subscription" && activePresetFields.kind === "api_key_template" && subApiKey.trim() && providerKeyRemembered) {
      const secret = { presetId: subPresetId, value: subApiKey.trim() };
      const alreadyUploaded = credentialSynced && pending.uploaded?.presetId === secret.presetId && pending.uploaded.value === secret.value;
      const saved = alreadyUploaded || await saveProviderSecret(credentialSynced
        ? { ...secret, shared: true, serverOrigin: providerKeyServerBase, token: cliAuthToken }
        : secret);
      if (!saved) {
        toast.error(t("form.rememberProviderKeyFailed", "服务商密钥保存失败，未创建 AI，请重试。"));
        return;
      }
      if (credentialSynced) pending.uploaded = secret;
      pending.attempt.providerCopyUploaded = credentialSynced;
    }
    const created = await onQuickCreate(draft, pending.attempt);
    if (created === true) pendingCreate.current = null;
  };

  const handleAdvanced = () => {
    if (!selected || !canAdvanced) return;
    // The advanced form derives its own default from its current model.
    onAdvancedEdit({ ...draft, reasoningEffort: selection?.reasoningEffort });
  };

  return {
    draft,
    busy,
    prompt,
    setPrompt,
    platformModel,
    setPlatformModel,
    platformModelOptions,
    apiPresetId,
    applyApiPreset,
    meteredPresetOptions,
    customProviderUrl,
    setCustomProviderUrl,
    apiKey,
    setApiKey,
    model,
    setModel,
    activePresetFields,
    subPresetId,
    applySubPreset,
    subscriptionPresetOptions,
    // 订阅脚注只列品牌名（不带 · OAuth / 限制标注这类后缀）；riskNotice 由
    // `subscriptionFootnoteProviders` 用于把这些通道排除出「无条件支持」名单。
    subscriptionPlans: subscriptionPresets.map((p) => ({
      label: p.label,
      riskNotice: p.riskNotice,
      requiresDesktopOAuth: p.requiresDesktopOAuth,
      oauthConnected: p.id === subPresetId && oauthProvider !== null &&
        oauth.connection.kind === "connected" && oauth.connection.provider === oauthProvider,
    })),
    subCustomProviderUrl,
    subApiKey,
    setSubApiKey: changeSubApiKey,
    credentialSynced: crossDeviceChecked,
    setCredentialSynced,
    showCredentialSync,
    providerKeyRemembered,
    setProviderKeyRemembered,
    providerKeyRef: activePresetFields.kind === "api_key_template" ? providerCredentialRef(subPresetId) : "",
    subModel,
    setSubModel,
    thinkingControl,
    thinkingSelection: { reasoningEffort, enableThinking },
    setThinking,
    canCreatePlatform,
    canCreateApi,
    canCreateSubscription,
    canCreateCli,
    canCreate,
    canAdvanced,
    handleCreate,
    handleAdvanced,
    oauth,
    cliProvider,
    setCliProvider: applyCliProvider,
    cliMachineId,
    setCliMachineId,
    cliMachineOptions,
    cliMachinesError,
    cliMachines,
    cliLoggedIn,
    cliProviderOptions: CLI_PROVIDER_OPTIONS,
  };
}
