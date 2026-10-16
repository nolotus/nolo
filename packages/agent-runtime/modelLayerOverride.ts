// 「模型层覆盖」纯逻辑（web / CLI / server 三方共享的单一真相源）。
//
// 语义：用户选定一个 agent 作为覆盖源后，路由/档位机制照跑；落到通用档时，
// 用覆盖源 agent 的 model 层配置（provider/model/apiSource/凭证/采样参数）
// 替换档位 agent 的 model 层，并把覆盖源的 references（技能/能力包）合并进去。
// 档位 agent 的 prompt / 工具策略保持不变。
//
// 本文件不依赖 app/ 层或 redux；record 一律按 Record<string, unknown> 处理。

export interface ReferenceItemLike {
  dbKey: string;
  title?: string;
  type?: string;
  [key: string]: unknown;
}

/** 覆盖包：从覆盖源 agent 提取的 model 层字段 + 技能引用（plain data，可序列化）。 */
export interface ModelLayerOverride {
  provider: string;
  model: string;
  apiSource?: string;
  cliProvider?: string;
  useServerProxy?: boolean;
  apiKey?: string;
  apiKeyRef?: string;
  apiKeyHeader?: string;
  customProviderUrl?: string;
  credentialRef?: string;
  credentialSynced?: boolean;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  max_tokens?: number;
  reasoning_effort?: string;
  enableThinking?: boolean;
  thinkingBudget?: number;
  /** 覆盖源挂载的技能/知识引用，执行时与档位 agent 的 references 合并。 */
  references?: ReferenceItemLike[];
}

/**
 * 会被覆盖包整体替换的 model 层字段。
 * apply 时先从 base 上删掉这些 key，再写入覆盖值，
 * 避免 base（内置档位 agent）残留自己的凭证/采样配置。
 */
export const MODEL_LAYER_KEYS = [
  "provider",
  "model",
  "apiSource",
  "cliProvider",
  "useServerProxy",
  "apiKey",
  "apiKeyRef",
  "apiKeyHeader",
  "customProviderUrl",
  "credentialRef",
  "credentialSynced",
  "temperature",
  "top_p",
  "frequency_penalty",
  "presence_penalty",
  "max_tokens",
  "reasoning_effort",
  "enableThinking",
  "thinkingBudget",
] as const;

/**
 * 特权字段：覆盖包里决定「**凭据从哪来** + **往哪个端点发**」的那几个 key。
 *
 * 与 `MODEL_LAYER_KEYS` 的关系：后者是「会被覆盖包整体替换的字段全集」，
 * 本清单是它的**子集**；划分标准不是「字段敏感不敏感」，而是**归属**——
 * 这几个字段一旦由请求体（而不是 agent 记录）提供，就改写了本次调用的
 * 凭据来源（`apiKey` / `apiKeyRef` / `apiKeyHeader` / `credentialRef` /
 * `credentialSynced`）或出站端点（`customProviderUrl`）。其余字段
 * （`provider` / `model` / `apiSource` / `cliProvider` / `useServerProxy` /
 * 采样参数）只选「用哪个模型、怎么采样」，选不出别人的凭据，也指不了别人的端点。
 *
 * 为什么按 ownership 划（而不是逐字段判敏感度）：记录里的这些字段属于那条记录的
 * owner，服务端的凭据解析是按**记录 owner** 取凭据的
 * （`server/oauth/resolveCredentialOwnerUserId`：owner 本人 / active agent-grant /
 * 私有 space 成员三种情形都解析成 owner）。所以调用方不是 owner 时，请求体里的
 * 这些字段就能替 owner 决定「用他哪一份订阅凭据、发到哪个 host 去」——
 * 2026-10-07 两处凭据外泄都以这个入口为起点。调用方拥有该记录时，这些字段本来就
 * 等价于他自己改写记录，没有需要拦的东西，因此判定线画在 ownership 上。
 *
 * 注意：这些字段**不是**唯一的改写面（`provider`/`model` 能换掉 owner 计费/配额的
 * 目标模型，见 `resolveModelLayerOverrideAdmission` 的整包语义），本清单的用途是
 * 让「哪几个字段直接指向凭据与端点」这件事有单一出处，供诊断与后续细分使用。
 */
export const PRIVILEGED_MODEL_LAYER_KEYS = [
  "apiKey",
  "apiKeyRef",
  "apiKeyHeader",
  "credentialRef",
  "credentialSynced",
  "customProviderUrl",
] as const;

/**
 * 覆盖包改写权的判定输入（事实，不是判断）。
 *
 * `callerUserId`：本次请求的鉴权用户；`credentialOwnerUserId`：**目标 agent 记录**
 * 的凭据归属，由 `server/oauth/resolveCredentialOwnerUserId`（既有单一出处）解析：
 * 记录 owner 本人 / active agent-grant / 私有 space 成员 → owner 的 userId；
 * public agent 与无 owner 的平台记录 → null（**不向任何人委派凭据**，
 * 出站凭据回落到调用方自己）。
 */
export type ModelLayerOverrideAuthority = {
  callerUserId: string;
  credentialOwnerUserId: string | null;
};

export type ModelLayerOverrideAdmissionReason =
  /** 凭据归属就是调用方本人。 */
  | "accepted_caller_owns_credential"
  /** 记录不向他人委派凭据（public / 平台记录）⇒ 覆盖包装上的凭据仍按调用方解析。 */
  | "accepted_target_delegates_no_credential"
  /** 记录把凭据委派给了**另一个**用户（owner / agent-grant / space 共享）⇒ 拒绝。 */
  | "discarded_foreign_credential_owner"
  /** 没拿到归属事实（缺 callerUserId 或未接线的调用点）⇒ fail-closed 拒绝。 */
  | "discarded_missing_authority";

export type ModelLayerOverrideAdmission = {
  /** false = 覆盖包整体丢弃（不是只丢特权字段，理由见 resolveModelLayerOverrideAdmission 注释）。 */
  accepted: boolean;
  reason: ModelLayerOverrideAdmissionReason;
  callerUserId: string | null;
  credentialOwnerUserId: string | null;
};

/**
 * `runtimeOptions.quickChatModelOverride` 的服务端门禁 —— **单一出处**。
 *
 * 语义：覆盖包只在「它装上去的凭据/端点会解析回调用方自己」时才被接受。
 * 成立有两种情形：
 * 1. 目标记录不委派凭据（`credentialOwnerUserId === null`）：出站凭据本来就回落
 *    到调用方（`resolveEffectiveCredentialUserId` 的 fallback）——覆盖包改的是
 *    调用方自己的东西。**CLI 的合法覆盖流全靠这一条**：合法调用点只会在
 *    路由落到公开档位 agent（`agent-pub-*`，owner 是平台、不共享配额）时发覆盖包
 *    （见 `cli/client/autoModelRouter.CLI_AUTO_ROUTE_AGENT_KEY`）。
 * 2. `credentialOwnerUserId === callerUserId`：调用方就是这条记录的凭据主人。
 * 其余一律拒绝（含 active agent-grant 与 space 共享：**被授权读用**
 * owner 的凭据 ≠ **有权替 owner 改写**其凭据来源与端点）。
 *
 * 判定为拒绝时丢弃**整个覆盖包**，而不是只丢上面那几个特权字段。原因是
 * `applyModelLayerOverride` 的语义是「先从 base 上删掉全部 `MODEL_LAYER_KEYS`
 * 再写入覆盖值」：只过滤掉特权 key 会**连记录自己的** `apiKey`/`apiKeyRef`/
 * `customProviderUrl` 一起删掉 —— 结果既不是覆盖值也不是记录原值，共享订阅的
 * 凭据会被静默抹掉（`loopUpstream` 的 OAuth 链会因此换一条线出站）。整包丢弃
 * 才等于「记录原值路径逐字不变」。
 *
 * 判定不读任何客户端自检，只吃上面的 authority 事实；authority 缺失时 fail-closed。
 */
export function resolveModelLayerOverrideAdmission(
  authority: ModelLayerOverrideAuthority | null | undefined,
): ModelLayerOverrideAdmission {
  const callerUserId = asNonEmptyString(authority?.callerUserId)
    ? authority!.callerUserId.trim()
    : null;
  const credentialOwnerUserId = asNonEmptyString(
    authority?.credentialOwnerUserId,
  )
    ? authority!.credentialOwnerUserId!.trim()
    : null;

  if (!callerUserId) {
    return {
      accepted: false,
      reason: "discarded_missing_authority",
      callerUserId,
      credentialOwnerUserId,
    };
  }
  if (credentialOwnerUserId === null) {
    return {
      accepted: true,
      reason: "accepted_target_delegates_no_credential",
      callerUserId,
      credentialOwnerUserId,
    };
  }
  if (credentialOwnerUserId === callerUserId) {
    return {
      accepted: true,
      reason: "accepted_caller_owns_credential",
      callerUserId,
      credentialOwnerUserId,
    };
  }
  return {
    accepted: false,
    reason: "discarded_foreign_credential_owner",
    callerUserId,
    credentialOwnerUserId,
  };
}

/**
 * 被丢弃的覆盖包的诊断（只列 key 与 references 条数，**绝不回显任何字段值**：
 * 包里可能带着凭据）。特权字段单独列一份，便于把「试图改写凭据来源/端点」与
 * 「只是带了模型参数」两类请求分开看。
 */
export function describeDiscardedModelLayerOverride(
  override: Record<string, unknown> | null | undefined,
): {
  fields: string[];
  privilegedFields: string[];
  referenceCount: number;
} {
  const source = override ?? {};
  const fields = MODEL_LAYER_KEYS.filter(
    (key) => source[key as string] !== undefined,
  );
  const privilegedFields = PRIVILEGED_MODEL_LAYER_KEYS.filter(
    (key) => source[key] !== undefined,
  );
  const references = Array.isArray(source.references) ? source.references : [];
  return {
    fields: [...fields],
    privilegedFields: [...privilegedFields],
    referenceCount: references.length,
  };
}

/** 按 dbKey 去重合并 references，base 优先。 */
export function mergeReferences(
  base?: readonly ReferenceItemLike[] | null,
  extra?: readonly ReferenceItemLike[] | null,
): ReferenceItemLike[] {
  const safeBase = Array.isArray(base) ? base : [];
  const safeExtra = Array.isArray(extra) ? extra : [];

  const seen = new Set<string>();
  const merged: ReferenceItemLike[] = [];

  for (const item of [...safeBase, ...safeExtra]) {
    const key = item?.dbKey;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    if (item) merged.push(item);
  }
  return merged;
}

const asNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/**
 * 从覆盖源 agent record 提取覆盖包。
 * 缺少有效 provider/model 时返回 null（调用方按「无覆盖」处理）。
 */
export function buildModelLayerOverride(
  agent: Record<string, unknown> | null | undefined,
): ModelLayerOverride | null {
  if (!agent || !asNonEmptyString(agent.provider) || !asNonEmptyString(agent.model)) {
    return null;
  }

  const override: ModelLayerOverride = {
    provider: agent.provider,
    model: agent.model,
  };
  for (const key of MODEL_LAYER_KEYS) {
    if (key === "provider" || key === "model") continue;
    const value = agent[key];
    if (value !== undefined) {
      (override as unknown as Record<string, unknown>)[key] = value;
    }
  }
  if (Array.isArray(agent.references) && agent.references.length > 0) {
    override.references = agent.references as ReferenceItemLike[];
  }
  return override;
}

/**
 * 把覆盖包应用到档位 agent record 上：替换 model 层字段，
 * 并把覆盖包的 references 合并进 base.references（dbKey 去重，base 优先）。
 * 不修改 base，返回新对象。
 */
export function applyModelLayerOverride<T extends Record<string, unknown>>(
  base: T,
  override: ModelLayerOverride,
): T {
  const next: Record<string, unknown> = { ...base };
  for (const key of MODEL_LAYER_KEYS) {
    delete next[key];
  }
  for (const key of MODEL_LAYER_KEYS) {
    const value = override[key as keyof ModelLayerOverride];
    if (value !== undefined) {
      next[key] = value;
    }
  }
  const merged = mergeReferences(
    base.references as ReferenceItemLike[] | undefined,
    override.references,
  );
  if (merged.length > 0) {
    next.references = merged;
  } else {
    delete next.references;
  }
  return next as T;
}
