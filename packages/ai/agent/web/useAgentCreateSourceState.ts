// 路径: ai/agent/web/useAgentCreateSourceState.ts
// AgentCreateSourceStep 的状态与 draft 编排（与 UI 渲染分离）。

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL } from "ai/llm/platformHosted";
import { PLATFORM_HOSTED_KIMI_K3_MODEL } from "ai/llm/kimi";
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
import { DEFAULT_REASONING_EFFORT } from "../createAgentSchema";
import type { ReasoningEffort } from "../createAgentSchema";
import { normalizeServerOrigin } from "core/serverOrigin";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useAppSelector } from "app/store";
import { useToken, useIsLoggedIn } from "identity";
import { useSubscriptionOAuthConnection } from "./useSubscriptionOAuthConnection";
import { getLocalProviderSecret, getServerProviderSecret, providerCredentialRef, saveProviderSecret } from "../providerSecrets";

/** High-level run-mode choices (not apiSource enum values). */
export type CreateRunMode = "platform" | "api" | "subscription" | "cli";

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
  /**
   * 推理强度（reasoning_effort）。
   * 订阅走 preset 的差异化默认；API/平台走 schema 默认 medium。
   * 提交时映射到 agent 记录的 reasoning_effort 字段。
   */
  reasoningEffort: ReasoningEffort;
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
  onQuickCreate: (draft: AgentCreateQuickDraft) => void | Promise<void>;
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
      })),
    [meteredPresets]
  );
  const subscriptionPresetOptions = useMemo(
    () =>
      subscriptionPresets.map((p) => ({
        value: p.id,
        label: `${p.label}${p.requiresDesktopOAuth ? " · OAuth" : ""}`,
      })),
    [subscriptionPresets]
  );

  const defaultApiPresetId =
    meteredPresets.find((p) => p.id === "openai-api")?.id ??
    meteredPresets[0]?.id ??
    MANUAL_PROVIDER_PRESET_ID;
  const defaultSubPresetId =
    subscriptionPresets.find((p) => p.id === "token-plan")?.id ??
    subscriptionPresets[0]?.id ??
    "token-plan";

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
  const [credentialSynced, setCredentialSynced] = useState(false);
  const [providerKeyRemembered, setProviderKeyRemembered] = useState(false);
  // Track whether the user has manually toggled the "remember provider key"
  // checkbox. Once touched, auto-check (from detected existing key) is
  // suppressed — prevents a preset round-trip from silently re-checking and
  // overwriting the shared key with a personal key the user typed.
  const providerKeyTouchedRef = useRef(false);
  const handleProviderKeyRememberedChange = (next: boolean) => {
    providerKeyTouchedRef.current = true;
    setProviderKeyRemembered(next);
  };
  const [subModel, setSubModel] = useState(() => {
    const f = resolveProviderPresetFields(defaultSubPresetId);
    return f.model;
  });
  // 订阅面板推理强度：初始值取订阅 preset 的差异化默认；切换方案时重置。
  const [subReasoningEffort, setSubReasoningEffort] = useState<ReasoningEffort>(
    () => {
      const f = resolveProviderPresetFields(defaultSubPresetId);
      return f.defaultReasoningEffort;
    },
  );
  // API 面板推理强度：按量计费，统一 schema 默认 medium，用户可手动调。
  const [apiReasoningEffort, setApiReasoningEffort] =
    useState<ReasoningEffort>(DEFAULT_REASONING_EFFORT);

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
  const providerKeyServerBase = useMemo(() => normalizeServerOrigin(currentServer) || (typeof window !== "undefined" ? window.location.origin : ""), [currentServer]);
  useEffect(() => {
    if (!subPresetId || resolveProviderPresetFields(subPresetId).kind !== "api_key_template") return;
    let cancelled = false;
    void (async () => {
      let found = false;
      if (cliAuthToken) {
        const shared = await getServerProviderSecret({ serverOrigin: providerKeyServerBase, token: cliAuthToken, presetId: subPresetId });
        if (shared && !cancelled) {
          setSubApiKey((current) => current || shared);
          found = true;
        }
      }
      const local = getLocalProviderSecret(subPresetId);
      if (local && !cancelled) {
        setSubApiKey((current) => current || local);
        found = true;
      }
      // 检测到已有 key 时自动勾选「记住此服务商密钥」，
      // 这样 apiKeyRef 指向 provider-key:xxx（共享），而非每次新建都独立存一份。
      // 但如果用户已手动操作过 checkbox（取消或勾选），不再自动覆盖——
      // 防止 preset 切换往返后用个人 key 覆盖共享 key。
      if (found && !cancelled && !providerKeyTouchedRef.current) setProviderKeyRemembered(true);
    })();
    return () => { cancelled = true; };
  }, [subPresetId, cliAuthToken, providerKeyServerBase]);
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
  const activePresetFields = useMemo(
    () => resolveProviderPresetFields(activePresetId),
    [activePresetId]
  );
  const oauthProvider =
    selected === "subscription" && activePresetFields.requiresDesktopOAuth
      ? activePresetFields.apiKeyRef
      : null;
  const oauth = useSubscriptionOAuthConnection(oauthProvider);
  const oauthConnected = oauth.connection.kind === "connected";

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
        // other platform models keep the schema default (medium).
        reasoningEffort:
          platformModel === PLATFORM_HOSTED_KIMI_K3_MODEL
            ? "high"
            : DEFAULT_REASONING_EFFORT,
        cliProvider: "",
        machineId: "",
        machineName: "",
      };
    }
    if (selected === "subscription") {
      const fields = resolveProviderPresetFields(subPresetId);
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
        apiKeyRef: fields.kind === "api_key_template" && providerKeyRemembered && !credentialSynced
          ? providerCredentialRef(subPresetId)
          : fields.apiKeyRef,
        apiKeyHeader: fields.apiKeyHeader,
        presetId: subPresetId,
        requiresDesktopOAuth: fields.requiresDesktopOAuth,
        oauthConnected,
        credentialSynced,
        reasoningEffort: subReasoningEffort,
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
        reasoningEffort: DEFAULT_REASONING_EFFORT,
        cliProvider,
        machineId: cliMachineId,
        machineName: machine?.name ?? "",
      };
    }
    // api
    const fields = resolveProviderPresetFields(apiPresetId);
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
      reasoningEffort: apiReasoningEffort,
      cliProvider: "",
      machineId: "",
      machineName: "",
    };
  }, [
    selected,
    prompt,
    platformModel,
    platformModelOptions,
    apiPresetId,
    subPresetId,
    customProviderUrl,
    apiKey,
    model,
    subCustomProviderUrl,
    subApiKey,
    subModel,
    subReasoningEffort,
    apiReasoningEffort,
    oauthConnected,
    credentialSynced,
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
      : subCustomProviderUrl.trim().length > 0);
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
    // metered API 统一 schema 默认；切换 preset 不强行覆盖用户手动改过的值，
    // 但首切到 manual 时回退到 medium（manual 无 registry 默认）。
    if (id === MANUAL_PROVIDER_PRESET_ID) setApiReasoningEffort(DEFAULT_REASONING_EFFORT);
    if (fields.clearApiKey) setApiKey("");
  };

  const applySubPreset = (id: string) => {
    const changed = id !== subPresetId;
    setSubPresetId(id);
    const fields = resolveProviderPresetFields(id);
    setSubCustomProviderUrl(fields.customProviderUrl);
    setSubModel(fields.model);
    // 跨方案切换时重置推理强度为新方案的默认值；
    // 同方案内不改（用户手动改过的值保持不变）。
    if (changed) setSubReasoningEffort(fields.defaultReasoningEffort);
    if (fields.clearApiKey) setSubApiKey("");
  };

  // 切换 CLI provider 时重置 machineId：不同 provider 的 capability 不同，
  // 旧选中的机器可能不再支持新 provider，回到「默认环境」最安全。
  const applyCliProvider = (id: string) => {
    setCliProvider(id as CliProvider);
    setCliMachineId("");
  };

  const handleCreate = async () => {
    if (!selected || !canCreate) return;
    if (selected === "subscription" && activePresetFields.kind === "api_key_template" && subApiKey.trim() && providerKeyRemembered) {
      const saved = await saveProviderSecret({ serverOrigin: providerKeyServerBase, token: cliAuthToken, presetId: subPresetId, value: subApiKey.trim(), shared: Boolean(cliAuthToken) });
      if (!saved) {
        console.error("[provider-secret] 保存服务商密钥失败");
        toast.error("服务商密钥保存失败，请重试");
      }
    }
    await onQuickCreate(draft);
  };

  const handleAdvanced = () => {
    if (!selected || !canAdvanced) return;
    onAdvancedEdit(draft);
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
    subCustomProviderUrl,
    setSubCustomProviderUrl,
    subApiKey,
    setSubApiKey,
    credentialSynced,
    setCredentialSynced,
    providerKeyRemembered,
    setProviderKeyRemembered: handleProviderKeyRememberedChange,
    providerKeyRef: activePresetFields.kind === "api_key_template" ? providerCredentialRef(subPresetId) : "",
    subModel,
    setSubModel,
    subReasoningEffort,
    setSubReasoningEffort,
    apiReasoningEffort,
    setApiReasoningEffort,
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
