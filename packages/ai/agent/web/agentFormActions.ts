import { toast } from "app/utils/toast";
import { isVoiceModel } from "ai/agent/isVoiceModel";
import { fetchFromServer } from "database/actions/common";
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
 * ⚠️ 提交策略（非常关键的约定）：
 *
 * 为什么改成真正的 dirty-only：
 * 根因：原先 buildSubmitPayload 整份复制表单，还会无条件 tags = ""。
 * 这导致：
 * 1. 表单里陈旧的 model/provider 会被全量提交，覆盖服务端的新值（用户改模型后“保存不生效”）；
 * 2. 误清 tags；
 * 3. 提交未修改字段可能产生不必要的写入竞争与版本冲突。
 *
 * 规则：
 * 1. 编辑场景（isCreate = false）：
 *    - 真正的 dirty-only：只提交用户真正改动的字段；未编辑字段一律不出现在 payload 里。
 *    - 显式清空（原先有值，现被设为 null 或空字符串）时传 null（服务端 patch 语义为删除该字段）。
 *    - 各字段独立 dirty-only：model 与 provider 均作为独立字段按需提交，由服务端根据当前已有权威记录校验组合。
 *    - 无论新建还是编辑，绝对不要再无条件 tags = ""。
 *
 * 2. 新建场景（isCreate = true）：
 *    - 没有打开表单时的原始记录可比对，保持现有整份提交语义不变。
 *    - 高级参数未编辑或为 null/undefined 时不写入，让后端走默认。
 *    - 若 name 为空，仍提供 provider + model 兜底。
 */

function isEquivalentEmpty(val: unknown): boolean {
  return val === null || val === undefined || (typeof val === "string" && val.trim() === "");
}

function isEqualValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (isEquivalentEmpty(a) && isEquivalentEmpty(b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  }
  if (
    typeof a === "object" &&
    a !== null &&
    typeof b === "object" &&
    b !== null &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

export function buildSubmitPayload(
  data: any,
  {
    isCreate,
    dirtyFields,
    advancedFieldNames = ADVANCED_FIELD_NAMES,
    initialValues,
  }: {
    isCreate: boolean;
    dirtyFields: Record<string, unknown> | undefined;
    advancedFieldNames?: readonly string[];
    initialValues?: Record<string, any>;
  }
) {
  // -------- 创建路径（没有原始记录可比对，保持整份提交语义） --------
  if (isCreate) {
    const cloned: any = { ...data };
    if (!String(cloned.name ?? "").trim()) {
      const provider = String(cloned.provider ?? "").trim();
      const model = String(cloned.model ?? "").trim();
      const fallbackName = [provider, model].filter(Boolean).join(" ");
      if (fallbackName) cloned.name = fallbackName.slice(0, 50);
    }

    // 修复：不要再无条件 cloned.tags = ""，保留用户输入或预设的 tags

    (advancedFieldNames as readonly string[]).forEach((field) => {
      const isDirty = (dirtyFields as any)?.[field];
      const value = cloned[field];

      if (!isDirty) {
        delete cloned[field];
        return;
      }

      if (value === null || value === undefined) {
        delete cloned[field];
        return;
      }
    });

    return cloned;
  }

  // -------- 编辑路径（真正的 dirty-only patch） --------
  // 规格修正（父方要求）：
  // 1. 只发用户真正动过的字段（以 dirty 状态为唯一真相，不以当前表单值补齐 model/provider）；
  // 2. 解除 model 与 provider 的成对绑定。用户单改某一字段时，由服务端基于权威基线做校验；
  // 3. 显式清空传 null，改回原值不提交。
  const payload: Record<string, any> = {};
  const hasDirtyFields = dirtyFields !== undefined;

  const candidateKeys = new Set<string>();
  if (data && typeof data === "object") {
    Object.keys(data).forEach((k) => candidateKeys.add(k));
  }
  if (dirtyFields && typeof dirtyFields === "object") {
    Object.keys(dirtyFields).forEach((k) => candidateKeys.add(k));
  }

  candidateKeys.forEach((field) => {
    const isDirty = hasDirtyFields ? Boolean((dirtyFields as any)?.[field]) : false;
    const value = data?.[field];

    if (hasDirtyFields) {
      if (!isDirty) return; // 未编辑字段一律不出现

      if (initialValues) {
        const initialVal = initialValues[field];
        if (isEqualValue(value, initialVal)) return; // 改回原值，不提交
        if (value === undefined) return;
        if (isEquivalentEmpty(value)) {
          if (!isEquivalentEmpty(initialVal)) {
            payload[field] = null; // 显式清空传 null
          }
          return;
        }
        payload[field] = value;
      } else {
        if (value === undefined) return;
        if (isEquivalentEmpty(value)) {
          payload[field] = null;
        } else {
          payload[field] = value;
        }
      }
    } else if (initialValues) {
      const initialVal = initialValues[field];
      if (isEqualValue(value, initialVal)) return;
      if (value === undefined) return;
      if (isEquivalentEmpty(value)) {
        if (!isEquivalentEmpty(initialVal)) {
          payload[field] = null;
        }
        return;
      }
      payload[field] = value;
    }
  });

  return payload;
}

/**
 * 字段展示名映射表（用于校验提示友好展示，提升可读性）
 */
export const AGENT_FIELD_DISPLAY_LABELS: Record<string, string> = {
  model: "模型",
  provider: "服务商",
  name: "名称",
  prompt: "提示词",
  description: "描述",
  tags: "标签",
  apiSource: "API 来源",
  temperature: "温度",
  top_p: "Top P",
  max_tokens: "最大 Token 数",
  presence_penalty: "存在惩罚",
  frequency_penalty: "频率惩罚",
  reasoning_effort: "推理强度",
};

/**
 * 格式化可读字段标识：优先使用「中文标签（字段名）」，未知字段直接返回字段名
 */
export function formatFieldIdentifier(field: string): string {
  const label = AGENT_FIELD_DISPLAY_LABELS[field];
  return label ? `${label}（${field}）` : field;
}

/**
 * 后端错误契约形状（字段均可缺省，缺省按未知处理）
 */
export type AgentSubmitErrorContract = {
  kind?: "network" | "forbidden" | "conflict" | "validation" | "server";
  status?: number;
  code?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  privateSaved?: boolean;
};

/**
 * 将提交错误格式化为用户可见提示。
 * 分类规则：
 * - privateSaved === true: 必须在普通分类之前单独拦截！明确区分「私有记录已保存 / 公共副本（或本地缓存）同步未完成」，并明确告知不要重新提交整次编辑。
 * - validation / 400 / 422: 提示具体字段标识与校验说明（如「模型（model）：不支持该值」）。
 * - 403: 权限不足
 * - 409: 冲突（已被修改）
 * - network / 超时: 提示「未确认保存结果」而不是断言「未保存」
 * - 未知/服务端错误: 采用受控文案，不外泄内部实现信息，也绝对不断言一定没保存。
 */
export function resolveAgentSubmitErrorMessage(
  err: unknown,
  t?: (key: string, fallback?: string) => string
): string {
  const translate = t || ((_k: string, fallback?: string) => fallback || _k);

  if (!err || typeof err !== "object") {
    return translate(
      "saveFailedServerControlled",
      "服务响应异常，未确认保存结果，请稍后刷新核对"
    );
  }

  const e = err as AgentSubmitErrorContract;
  const status = e.status;
  const kind = e.kind;
  const code = String(e.code || "").toUpperCase();
  const rawMsg = typeof e.message === "string" ? e.message : "";

  // 1. 部分成功守卫（HIGH-1）：在任何其他状态码（403/409/网络等）之前拦截 privateSaved === true
  // 必须明确区分「私有记录已保存 / 公共副本（或本地缓存）同步未完成」，并明确告知用户「请勿重新提交整次编辑」，避免重复提交覆盖
  if (e.privateSaved === true) {
    if (code === "LOCAL_CACHE_FAILED" || /local_cache/i.test(code)) {
      return translate(
        "savePartialSuccessLocalCache",
        "私有记录已保存，本地缓存更新失败；请勿重新提交整次编辑"
      );
    }
    if (code === "PUBLIC_SYNC_FAILED" || /public_sync/i.test(code)) {
      return translate(
        "savePartialSuccessPublicSync",
        "私有记录已保存，公共副本同步失败；请勿重新提交整次编辑"
      );
    }
    return translate(
      "savePartialSuccessGeneric",
      "私有记录已保存，后续同步未完成；请勿重新提交整次编辑"
    );
  }

  // 2. 表单校验错误与字段级错误（WARNING-1 & 规格修正）：显式处理 400 与 422，带上可读字段标识
  const isValidationError =
    kind === "validation" ||
    status === 400 ||
    status === 422 ||
    code === "VALIDATION_ERROR" ||
    code === "PROVIDER_MODEL_MISMATCH" ||
    Boolean(e.fieldErrors && Object.keys(e.fieldErrors).length > 0);

  if (isValidationError) {
    if (e.fieldErrors && typeof e.fieldErrors === "object") {
      const fieldNames = Object.keys(e.fieldErrors);
      if (fieldNames.length > 0) {
        const firstField = fieldNames[0];
        const fieldMsg = e.fieldErrors[firstField];
        if (fieldMsg) {
          const fieldIdentifier = formatFieldIdentifier(firstField);
          return `保存失败：${fieldIdentifier}：${fieldMsg}`;
        }
      }
    }
    if (rawMsg) {
      return `保存失败：${rawMsg}`;
    }
    return translate("saveFailedValidation", "保存失败：输入内容校验未通过");
  }

  // 3. 本地存储/数据库异常专有处理（契约守卫）：
  // 数据层在设备本地路径失败时 kind 复用了 conflict，必须优先按 code 判别，绝不能误判为「配置已被他人修改」
  if (code === "LOCAL_STORAGE_ERROR") {
    return translate(
      "saveFailedLocalStorage",
      "保存失败：本地存储写入失败，请检查磁盘空间或存储状态"
    );
  }
  if (code === "MISSING_LOCAL_DATABASE") {
    return translate("saveFailedMissingLocalDb", "保存失败：本地数据库不可用");
  }
  if (code === "LOCAL_AGENT_MISSING") {
    return translate("saveFailedLocalAgentMissing", "保存失败：本地 agent 记录不存在");
  }

  // 4. 403 权限不足
  if (status === 403 || kind === "forbidden" || code === "FORBIDDEN") {
    return translate("saveFailedForbidden", "保存失败：权限不足");
  }

  // 5. 409 冲突（已被修改）
  if (status === 409 || kind === "conflict" || code === "CONFLICT") {
    return translate(
      "saveFailedConflict",
      "保存失败：配置已被其他人或在其他窗口修改，请刷新后重试"
    );
  }

  // 6. 网络异常或请求超时（契约要求：提示「未确认保存结果」而不是断言「未保存」）
  if (
    kind === "network" ||
    status === 408 ||
    status === 504 ||
    code === "TIMEOUT" ||
    code === "NETWORK_ERROR" ||
    /network|timeout|timed out|abort/i.test(rawMsg)
  ) {
    return translate(
      "saveFailedNetwork",
      "网络异常或请求超时，未确认保存结果，请检查网络后刷新核对"
    );
  }

  // 6. 未知错误与服务端内部错误（WARNING-2）：
  // 采用受控文案，不外泄内部实现信息（如 Internal DB failure 等），也绝对不断言一定没保存。
  return translate(
    "saveFailedServerControlled",
    "服务响应异常，未确认保存结果，请稍后刷新核对"
  );
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
            // credentialSynced 只丢弃 provider-key: 指针（同步后由服务端凭据取代）；
            // provider OAuth 通道引用（chatgpt/claude/xai/antigravity）必须保留，
            // 否则同步到 CLI/TUI 的 agent 会拿不到订阅通道而 HTTP 401。
            apiKeyRef:
              draft.credentialSynced && (draft.apiKeyRef || "").startsWith("provider-key:")
                ? ""
                : (draft.apiKeyRef || ""),
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

/**
 * 判断是否为单机纯本地 Agent。
 * 依据：`agent-local-*` 属于设备私有本地 Agent，仓库安全机制与同步策略明确禁止将其上传或同步至远端服务器，
 * 服务端没有也不应有其权威副本。因此，单机客户端本地存储（Client DB）即为其唯一真实权威源（Local Authority）。
 */
export const isLocalAgentKey = (agentKey?: string | null): boolean =>
  typeof agentKey === "string" && agentKey.startsWith("agent-local-");

/**
 * 权威基线读取器：
 * - 纯本地 agent（agent-local-*）：显式按本地权威读取，读取成功即为就绪；不存在或读取失败则报错。
 * - 远端 agent（如 agent-user-*、agent-pub-*）：必须从远端权威服务器读取，绕过数据库层 local-first 的本地缓存，
 *   若远端请求失败（网络异常/500/返回空），坚决不退回本地缓存，必须抛错以保持表单未就绪并阻止提交。
 */
export async function loadAuthoritativeAgentRecord({
  agentKey,
  server,
  token,
  signal,
  fallbackLocalReader,
}: {
  agentKey: string;
  server?: string;
  token?: string | null;
  signal?: AbortSignal;
  fallbackLocalReader?: () => Promise<any>;
}): Promise<any> {
  if (!agentKey || typeof agentKey !== "string") {
    throw new Error("Missing agentKey for authoritative agent read.");
  }

  if (isLocalAgentKey(agentKey)) {
    if (!fallbackLocalReader) {
      throw new Error(`No local reader available for local agent "${agentKey}".`);
    }
    const localRecord = await fallbackLocalReader();
    if (!localRecord || typeof localRecord !== "object") {
      throw new Error(`Local authoritative agent record not found for "${agentKey}".`);
    }
    return localRecord;
  }

  const effectiveServer =
    server ||
    (typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "");

  if (!effectiveServer) {
    throw new Error(
      `No remote server configured to read authoritative agent for "${agentKey}".`
    );
  }

  const remoteRecord = await fetchFromServer(
    effectiveServer,
    agentKey,
    token || undefined,
    signal
  );

  if (!remoteRecord || typeof remoteRecord !== "object") {
    throw new Error(
      `Authoritative agent record not found on server "${effectiveServer}" for "${agentKey}".`
    );
  }

  return { ...remoteRecord, dbKey: agentKey };
}

