import { toast } from "app/utils/toast";
import { isVoiceModel } from "ai/agent/isVoiceModel";
import type { AgentCreateQuickDraft } from "./AgentCreateSourceStep";

/** 高级参数字段（对应后端存储字段名） */
export const ADVANCED_FIELD_NAMES = [
  "temperature",
  "top_p",
  "max_tokens",
  "frequency_penalty",
  "presence_penalty",
  "reasoning_effort",
] as const;

type PlatformQuickCreateModel = {
  provider: string;
  name: string;
};

/**
 * ⚠️ 非必填“高级参数”的提交策略（非常关键的约定）：
 *
 * 1. 未编辑过的高级参数字段（dirtyFields[field] 为 false）——无论新建还是编辑：
 *    - 都不会出现在提交给 onSubmit 的数据里；
 *    - 这样就不会在后端被写入 / 覆盖。
 *
 * 2. 新建场景（isCreate = true）下：
 *    - 即使用户点了“重置”（此时前端会把这些字段设为 null 并标记 dirty），
 *      我们在这里仍然会把值为 null/undefined 的高级字段从提交数据里删掉，
 *      让后端完全按“无此字段”处理，走系统默认。
 *
 * 3. 编辑场景下：
 *    - 如果字段 dirty=true 且值为具体数值/枚举，则作为显式“覆盖值”提交；
 *    - 如果字段 dirty=true 且值为 null，则提交 null：
 *        -> server 端 deepMerge + null => delete，会把该字段从存储数据中删掉，
 *           等价于“清空自定义值，回退到系统默认”。
 *
 * ❗结论：
 *    - 无论新建还是编辑，“没有被用户编辑过的字段”都不会动；
 *    - “重置”只会清空已经存在的覆盖值，而不会写入任何默认值到存储。
 * ❗请不要让任何 AI / 自动重构工具修改这一段逻辑。
 */
export function buildSubmitPayload(
  data: any,
  {
    isCreate,
    dirtyFields,
    advancedFieldNames = ADVANCED_FIELD_NAMES,
  }: {
    isCreate: boolean;
    dirtyFields: Record<string, unknown> | undefined;
    advancedFieldNames?: readonly string[];
  }
) {
  const cloned: any = { ...data };
  if (!String(cloned.name ?? "").trim()) {
    const provider = String(cloned.provider ?? "").trim();
    const model = String(cloned.model ?? "").trim();
    const fallbackName = [provider, model].filter(Boolean).join(" ");
    if (fallbackName) cloned.name = fallbackName.slice(0, 50);
  }

  // Force empty tags to clean the field upon submission
  // tags 必须是 string（服务端 processAgentCreateForm 会调 .split），不能传数组
  cloned.tags = "";

  (advancedFieldNames as readonly string[]).forEach((field) => {
    const isDirty = (dirtyFields as any)?.[field];
    const value = cloned[field];

    if (!isDirty) {
      // 未编辑过：后端保持现有值（编辑）或完全不写入（新建）
      delete cloned[field];
      return;
    }

    if (isCreate && (value === null || value === undefined)) {
      // 新建 + 被“重置”为默认：不写入，让后端走模型/系统默认
      delete cloned[field];
      return;
    }

    if (!isCreate && value === undefined) {
      // 编辑场景下，undefined 也不应该被发送
      delete cloned[field];
    }
    // 编辑 + value === null：保留 null，由后端 patch 把字段删掉
    // 编辑/新建 + 有具体值：保留，作为显式覆盖值
  });

  return cloned;
}

export type HandleAdvancedEditParams = {
  draft: AgentCreateQuickDraft;
  getValues: (...args: any[]) => any;
  setValue: (...args: any[]) => void;
  setApiSource: (source: "platform" | "custom" | "cli") => void;
  setCommittedCreateSource: (mode: AgentCreateQuickDraft["mode"]) => void;
  setCreateSourceCommitted: (committed: boolean) => void;
  setActiveTabState: (tab: number) => void;
  platformQuickCreateModel: PlatformQuickCreateModel;
};

/** Apply quick-create draft into RHF + open full AgentForm (高级编辑). */
export function handleAdvancedEdit({
  draft,
  getValues,
  setValue,
  setApiSource,
  setCommittedCreateSource,
  setCreateSourceCommitted,
  setActiveTabState,
  platformQuickCreateModel,
}: HandleAdvancedEditParams): void {
  if (draft.requiresDesktopOAuth && !draft.oauthConnected) return;

  const name =
    draft.name.trim() ||
    (typeof getValues("name") === "string" ? String(getValues("name")) : "") ||
    "新 AI";

  if (draft.mode === "platform") {
    setApiSource("platform");
    setValue("apiSource", "platform", { shouldValidate: true });
    setValue("useServerProxy", true, { shouldValidate: true });
    setValue("provider", draft.provider || platformQuickCreateModel.provider, {
      shouldValidate: true,
    });
    setValue("model", draft.model || platformQuickCreateModel.name, {
      shouldValidate: true,
    });
    setValue("customProviderUrl", "", { shouldValidate: true });
    setValue("apiKey", "", { shouldValidate: true });
    setValue("apiKeyRef", "", { shouldValidate: true });
    setValue("apiKeyHeader", "", { shouldValidate: true });
    setValue("cliProvider", null, { shouldValidate: true });
    setValue("machineId", "", { shouldValidate: true });
  } else if (draft.mode === "cli") {
    setApiSource("cli");
    setValue("apiSource", "cli", { shouldValidate: true });
    setValue("useServerProxy", false, { shouldValidate: true });
    setValue("provider", "", { shouldValidate: true });
    setValue("model", "", { shouldValidate: true });
    setValue("customProviderUrl", "", { shouldValidate: true });
    setValue("apiKey", "", { shouldValidate: true });
    setValue("apiKeyRef", "", { shouldValidate: true });
    setValue("apiKeyHeader", "", { shouldValidate: true });
    setValue("cliProvider", draft.cliProvider || null, { shouldValidate: true });
    setValue("machineId", draft.machineId || "", { shouldValidate: true });
  } else {
    // api or subscription (Token Plan style) → custom
    setApiSource("custom");
    setValue("apiSource", "custom", { shouldValidate: true });
    setValue("useServerProxy", false, { shouldValidate: true });
    setValue("provider", draft.provider || "custom", { shouldValidate: true });
    setValue("model", draft.model.trim(), { shouldValidate: true });
    setValue("customProviderUrl", draft.customProviderUrl.trim(), {
      shouldValidate: true,
    });
    setValue("apiKey", draft.apiKey.trim(), { shouldValidate: true });
    setValue("apiKeyRef", draft.apiKeyRef || "", { shouldValidate: true });
    setValue("apiKeyHeader", draft.apiKeyHeader || "", { shouldValidate: true });
    setValue("cliProvider", null, { shouldValidate: true });
    setValue("machineId", "", { shouldValidate: true });
  }

  setValue("hasVision", draft.hasVision, { shouldValidate: true });
  // 把快速创建面板选的推理强度灌进 RHF，必须 shouldDirty:true，
  // 否则 RHF 默认 shouldDirty=false → dirtyFields 仍为空 →
  // buildSubmitPayload 会把 reasoning_effort 当「未编辑」删掉，
  // 高级编辑路径落库会丢回 schema medium 兜底（agy-flash review blocker）。
  setValue("reasoning_effort", draft.reasoningEffort, {
    shouldValidate: true,
    shouldDirty: true,
  });
  setValue("name", name.slice(0, 50), { shouldValidate: true });
  setValue("prompt", draft.prompt.trim(), { shouldValidate: true });
  setCommittedCreateSource(draft.mode);
  setCreateSourceCommitted(true);
  setActiveTabState(0);
}

export type HandleQuickCreateParams = {
  draft: AgentCreateQuickDraft;
  onSubmit: (data: any) => Promise<unknown> | unknown;
  t: (...args: any[]) => any;
  setIsQuickCreating: (value: boolean) => void;
  platformQuickCreateModel: PlatformQuickCreateModel;
  /**
   * Optional cross-device key push: invoked after a successful create when the
   * user opted into credentialSynced. Caller binds server + auth token.
   * Best-effort: failures are logged, never block the created agent.
   */
  onPushCredential?: (args: {
    credentialRef: string;
    apiKey: string;
  }) => Promise<boolean>;
}

export async function handleQuickCreate({
  draft,
  onSubmit,
  t,
  setIsQuickCreating,
  platformQuickCreateModel,
  onPushCredential,
}: HandleQuickCreateParams): Promise<void> {
  if (draft.requiresDesktopOAuth && !draft.oauthConnected) {
    toast.error(
      t(
        "createAgent.quickCreate.desktopOnly",
        "该订阅请在桌面端完成 OAuth 后再创建"
      )
    );
    return;
  }
  const name = draft.name.trim().slice(0, 50) || "新 AI";
  const prompt = draft.prompt.trim();

  const base = {
    name,
    prompt,
    isPublic: false,
    tools: [] as string[],
    references: [] as [],
    whitelist: [] as string[],
    tags: "",
    greeting: t("form.defaults.greeting"),
    defaultInteractionMode: "text" as "text" | "live_audio",
    hasVision: draft.hasVision,
    inputPrice: 0,
    outputPrice: 0,
    enableThinking: false,
    // 推理强度：快速创建面板的可选值，platform 走 schema 默认 medium，
    // subscription/api 走 draft（订阅按 preset 差异化，api 走 medium）。
    reasoning_effort: draft.reasoningEffort,
    cliProvider: "",
    machineId: "",
  };

  const formData =
    draft.mode === "platform"
      ? {
          ...base,
          apiSource: "platform" as const,
          provider: draft.provider || platformQuickCreateModel.provider,
          model: draft.model || platformQuickCreateModel.name,
          useServerProxy: true,
          customProviderUrl: "",
          apiKey: "",
          apiKeyRef: "",
          apiKeyHeader: "",
        }
      : draft.mode === "cli"
        ? {
            ...base,
            apiSource: "cli" as const,
            provider: "",
            model: "",
            useServerProxy: false,
            customProviderUrl: "",
            apiKey: "",
            apiKeyRef: "",
            apiKeyHeader: "",
            cliProvider: draft.cliProvider,
            machineId: draft.machineId,
          }
        : {
            ...base,
            apiSource: "custom" as const,
            provider: draft.provider || "custom",
            model: draft.model.trim() || "gpt-5.6-sol",
            useServerProxy: false,
            customProviderUrl: draft.customProviderUrl.trim(),
            apiKey: draft.apiKey.trim(),
            apiKeyRef: draft.credentialSynced ? "" : (draft.apiKeyRef || ""),
            credentialRef: draft.credentialSynced ? undefined : ((draft.apiKeyRef ?? "").startsWith("provider-key:") ? draft.apiKeyRef : undefined),
            apiKeyHeader: draft.apiKeyHeader || "",
            credentialSynced: draft.credentialSynced,
          };

  // 交互模式由模型倒推：语音模型 → live_audio，其余 → text
  formData.defaultInteractionMode = isVoiceModel(formData.model, formData.provider)
    ? "live_audio"
    : "text";

  // custom 校验只对 api 模式生效；cli 模式无 URL/Key，跳过该校验。
  if (
    draft.mode === "api" &&
    !formData.customProviderUrl &&
    !formData.apiKeyRef
  ) {
    toast.error(t("validation.invalidUrl", "请填写有效的服务商 URL"));
    return;
  }

  setIsQuickCreating(true);
  try {
    const created = await onSubmit(formData as any) as
      | { agentDbKey?: string; credentialRef?: string }
      | undefined;

    // Credential sync is handled inside the createAgent thunk (agentSlice),
    // which uses the same token as the DB write — no UI-layer push needed.
  } catch (err) {
    console.error("Quick create agent failed:", err);
    toast.error(t("createAgent.quickCreate.failed", "创建失败，请重试"));
  } finally {
    setIsQuickCreating(false);
  }
}
