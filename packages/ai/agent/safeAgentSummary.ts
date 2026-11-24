import { resolveModelTier, type ModelTier } from "./dispatchSelectionPolicy";
import { fnv1a32Hex } from "core/fnv1a32";
import { isOAuthApiKeyRef } from "agent-runtime/serverProxyPolicy";
import { isPlatformPaidAgentCall } from "./platformPaidCall";
import { isOwnedAgentKey, ownedAgentKey, publicAgentKey } from "core/prefix";
import {
  compareAgentSelection,
  type AgentSelectionCandidate,
  resolveAgentSelectionPriority,
  isUserConfiguredAgent,
} from "./agentSelectionPriority";
import {
  resolveBillingSource,
  type BillingSource,
} from "./agentBilling";
import type { AgentEconomicsSnapshot } from "../economics/economicsSnapshot";
import { resolveEconomicsSnapshot } from "../economics/economicsSnapshot";
import type { AgentQuota, QuotaWindow } from "./quotaSnapshot";
import {
  resolveAgentAvailability,
  type AgentAvailabilityStatus,
  type AgentAvailabilityReason,
} from "./agentAvailabilityShared";

export {
  resolveAgentAvailability,
  type AgentAvailabilityStatus,
  type AgentAvailabilityReason,
};

export {
  resolveAgentSelectionPriority,
  isUserConfiguredAgent,
  compareAgentSelection,
  type AgentSelectionCandidate,
  resolveBillingSource,
  type BillingSource,
};

export type CredentialKind = "oauth" | "api-key";

export interface CredentialGroupSummary {
  credentialGroup: string;
  credentialKind: CredentialKind;
  agentCount: number;
  availableAt?: number;
  /**
   * 组内多个 agent 的配额快照完全相同时，compact:true 投影把这份快照提升到这里，
   * 各 agent 条目不再重复拷贝（见 promoteSharedCredentialGroupQuota）。
   * 只有「本组 ≥2 个 agent 的窗口内容一致」时才存在；verbose/default 路径不产出。
   */
  quota?: CompactAgentQuota;
}

/**
 * ⚠️ **对 OAuth 分支而言**，`credentialGroup` **不是「凭据身份」**，只是 provider 家族标签。
 * （api-key 分支是 `cred-<ref 的哈希>`、custom 分支是 `custom-<userId|url 的哈希>`，
 * 两者本来就按账号/配置区分，不存在这个问题。）
 *
 * 对本机 OAuth，它直接返回 provider 名（`chatgpt` / `antigravity` / …，见
 * 下方 `trimmed.toLowerCase()` 分支），而 `apiKeyRef` 本身就不含账号信息
 * （`OAUTH_APIKEY_REFS` 是一组裸 provider 名）。后果：
 *
 *   · 你自己 OAuth 登录的 chatgpt agent  → credentialGroup = "chatgpt"
 *   · 别人分享给你的 chatgpt agent       → credentialGroup = "chatgpt"
 *
 * 两者撞成同一组，但它们花的是**不同账号的配额**。2026-09-18 已因此把别人的
 * agent 并进调用者的 429 冷却组（见 summarizeCredentialGroups 的跳过逻辑）；
 * 2026-10-29 又因此让编排者误判「这两个 agent 共用凭据」。
 *
 * **判断「是不是同一份凭据」不要只看 credentialGroup**，按这三层看：
 *   · `billingSource`：自有 = `user_subscription` / `user_api`；非自有 =
 *     `owner_subscription` **或 `platform_credits`**（非自有且记录缺 userId/ownerId
 *     时走后者，见 agentBilling.ts 的 resolveBillingSource）——不能把「非自有」
 *     简单等同于「跑别人的订阅」。
 *   · `isOwned`：**未登录时一律 false**（isOwnedAgentRecord 的既有行为），
 *     所以 `false` 有时是「不知道」，不等于「属于别人」。
 *   · 需要更细时读 record 的 `userId` / `ownerId`。注意 agentKey 有三种形态：
 *     自有 `agent-<userId>-<id>`、空间共享 `agent-<ownerUserId>-<id>`、
 *     公开 `agent-pub-<id>`（**没有 userId**）；且 userId 本身可能含连字符
 *     （如 `user-1`），**不能按 `-` 分段解析**。
 *
 * 并发准入（credentialFanoutGuard）只做 credentialGroup 的字符串比较，其 entry
 * 是 `{runId, agentKey, credentialGroup}`——**不含 isOwned**。所以「自己的 OAuth」
 * 与「别人的同 provider OAuth」在准入层依然同组；之所以没把别人的冷却算进来，
 * 靠的是 summarizeCredentialGroups 跳过非自有 agent，不是准入层的判断。
 * 要根治需把 credentialGroup 拆成「provider 家族」与「凭据身份（provider +
 * 归属账号）」两个字段。
 *
 * **它什么时候是对的**：`isOwned === true` 且同为 OAuth 时，同 provider 的几个
 * 自有 agent 确实共用你自己那一份账号凭据，此时 credentialGroup 分组完全正确。
 * 错的只有「跨归属」这一种情况——别因此把 credentialGroup 整体当成不可用。
 */
export function deriveCredentialGroup(ref?: string | null): {
  credentialGroup: string;
  credentialKind: CredentialKind;
} | undefined {
  if (!ref || typeof ref !== "string") return undefined;
  const trimmed = ref.trim();
  if (!trimmed) return undefined;
  if (isOAuthApiKeyRef(trimmed)) {
    return {
      credentialGroup: trimmed.toLowerCase(),
      credentialKind: "oauth",
    };
  }
  const hash = fnv1a32Hex(trimmed);
  return {
    credentialGroup: `cred-${hash}`,
    credentialKind: "api-key",
  };
}

/**
 * 自定义 API agent（apiSource=custom）无 apiKeyRef/credentialRef 时的凭证组兜底：
 * 用 userId + customProviderUrl 派生稳定组。同一 URL 视为同组（保守方向：
 * 同 URL 不同 key 的极端情况会被当成同凭证而拒绝并发，安全）；不同 provider
 * URL 则允许并发。2026-09-28：无 ref 的 custom agent（如自建 Kimi）此前解析为
 * 「未知」，其活跃 run 会把同父对话后续所有并发派发全部拦下。
 */
export function deriveCustomProviderCredentialGroup(
  userId: string | undefined,
  customProviderUrl?: string | null,
): { credentialGroup: string; credentialKind: CredentialKind } | undefined {
  if (typeof customProviderUrl !== "string" || !customProviderUrl.trim()) {
    return undefined;
  }
  const basis = `${userId ?? ""}|${customProviderUrl.trim().toLowerCase()}`;
  return {
    credentialGroup: `custom-${fnv1a32Hex(basis)}`,
    credentialKind: "api-key",
  };
}

export function summarizeCredentialGroups(
  agents: Array<{
    credentialGroup?: string;
    credentialKind?: CredentialKind;
    nextAvailableAt?: number;
    isOwned?: boolean;
  }>,
  now = Date.now(),
): CredentialGroupSummary[] {
  const groups = new Map<string, CredentialGroupSummary>();

  for (const agent of agents) {
    if (!agent.credentialGroup || !agent.credentialKind) continue;
    // 非自有 agent 的 credentialGroup 并**不代表「同一份凭据」**：
    // deriveCredentialGroup 对 OAuth ref 是直接返回 provider 名
    // （`credentialGroup: trimmed.toLowerCase()`，见本文件 deriveCredentialGroup），
    // 所以别人共享给你的 agent 会和调用者自己的同名 provider 组撞名。并组之后
    // availableAt 取 max，等于把**调用者自己的 429 冷却漏给别人的 agent**。
    // 2026-09-18 实测：一条 owner 为 1c2b14b968 的共享 agent 被并进调用者的
    // antigravity 组（agentCount 2），显示成「冷却至次日 11:03Z」，而它实际跑
    // owner 的订阅通道、同一时刻可用。它不是调用者的凭据预算，不参与调用者的
    // 分组汇总（`undefined` 视为未知，保持既有行为不变）。
    if (agent.isOwned === false) continue;
    const existing = groups.get(agent.credentialGroup);
    const at =
      typeof agent.nextAvailableAt === "number" && agent.nextAvailableAt > now
        ? agent.nextAvailableAt
        : undefined;

    if (!existing) {
      groups.set(agent.credentialGroup, {
        credentialGroup: agent.credentialGroup,
        credentialKind: agent.credentialKind,
        agentCount: 1,
        ...(at !== undefined ? { availableAt: at } : {}),
      });
    } else {
      existing.agentCount += 1;
      if (at !== undefined) {
        existing.availableAt = Math.max(existing.availableAt ?? 0, at);
      }
    }
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.credentialGroup.localeCompare(b.credentialGroup),
  );
}

export interface SafeAgentSummary {
  id: string | null;
  /**
   * A runnable agent dbKey (agent-<userId>-<id> for owned agents, agent-pub-<id>
   * for confirmed public agents) that can be passed directly to startAgentRun /
   * readAgent. Present only when a signed-in userId is available and the key is
   * resolvable; never exposes privateKey or secret material.
   */
  agentKey?: string;
  /** Only present when a real public record is confirmed; omitted for private agents. */
  publicKey?: string;
  name: string;
  handle: string | null;
  introduction: string | null;
  roleHint?: string;
  model: string | null;
  modelTier: ModelTier;
  provider: string | null;
  apiSource: string | null;
  cliProvider: string | null;
  billingSource: BillingSource;
  tools: string[];
  inputPrice: number | null;
  outputPrice: number | null;
  isFavorite: boolean;
  favoritedAt: number | string | null;
  isPublic: boolean;
  /**
   * 本次派发是否走**平台垫付**（billingSource=platform_credits 的同一判据，
   * 见 platformPaidCall.ts 的 isPlatformPaidAgentCall）。
   *
   * 存在的唯一目的：把「派它之前必须先拿到用户的扣费授权」做成数据字段，
   * 而不是靠调用方记住一段 prose 规则。历史事故（2026-11-15）：编排者把
   * 「收藏优先」误读为「可直接派发」，连续 7 次未经授权调用 platform_credits
   * Agent。任何 requiresPaidApproval=true 的候选，startAgentRun 之前都必须
   * 取得用户当次明确肯定——「收藏」「owned」「availability 正常」都不构成授权。
   */
  requiresPaidApproval: boolean;
  /**
   * Phase 2A economics snapshot (peak/off-peak phase + price/quota multiplier)
   * for sources with sufficient official evidence (DeepSeek API, BigModel GLM
   * Coding Plan). Omitted entirely for neutral/unknown sources — never guess.
   * The compact snapshot never carries the full policy/windows; those stay in
   * packages/ai/economics.
   */
  economics?: AgentEconomicsSnapshot;
  /** True when the agent is owned by the current user (record.userId matches). */
  isOwned: boolean;
  /** True when the agent uses one of the supported user OAuth subscriptions. */
  isOAuth: boolean;
  /** Epoch ms at which a provider quota/rate-limit is expected to recover. */
  nextAvailableAt?: number;
  /** 可用性四态：available / quota_exhausted / rate_limited / unverified */
  availabilityStatus?: AgentAvailabilityStatus;
  /** 可用性具体原因 */
  availabilityReason?: AgentAvailabilityReason;
  /**
   * 最近一次上游响应上报的配额窗口快照（x-ratelimit-* / anthropic-unified /
   * x-goog-quota-* / body quota 等）。只在「上游真给过数据」的 agent 上存在；
   * 窗口按 scope 合并保留全部（不只最紧张的）。
   */
  quota?: AgentQuota;
  /** 上游明确报额度耗尽的观测，不包含凭证或原始错误体。 */
  quotaExhaustion?: { observedAt: number };
  /** Stable non-secret identifier grouping agents that share the same credential. */
  credentialGroup?: string;
  /** Credential kind: oauth or api-key. */
  credentialKind?: CredentialKind;
  /**
   * 显式凭证归属标记：true = credentialGroup 可解析（已归属某个确定凭证组）；
   * false = 无凭据引用可归属——这是「**未知**」而不是「**独立**」：并发扇出
   * 守卫必须把 credentialed:false 的 agent 视为可能与任何其他 run 共用上游
   * key（见 ai/tools/agent/credentialFanoutGuard）。
   */
  credentialed: boolean;
  updatedAt: string | number | null;
}

export type FavoritesMap =
  | Record<string, number | string | boolean>
  | Map<string, number | string | boolean>;

export interface SafeAgentSummaryOptions {
  favoritesMap?: FavoritesMap;
  isFavorite?: boolean;
  favoritedAt?: number | string | null;
  userId?: string;
  /** Caller-confirmed signal: does the public record agent-pub-<id> actually exist? */
  publicRecordExists?: boolean;
  /**
   * Instant the economics snapshot is resolved at (epoch ms). Defaults to
   * Date.now(); tests pass a fixed value for deterministic snapshots.
   */
  now?: number;
}

function parseTimestamp(val: unknown): number {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") return Date.parse(val) || 0;
  return 0;
}

function safeTimestamp(val: unknown): number | string | null {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") return val;
  return null;
}

function parseAgentRecordId(privateKey?: string, explicitId?: string): string | null {
  if (explicitId && typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }
  if (privateKey && typeof privateKey === "string") {
    const match = privateKey.match(/^agent-[^-]+-(.+)$/i);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function resolveFavoriteStatus(
  record: any,
  options?: SafeAgentSummaryOptions
): { isFavorite: boolean; favoritedAt: number | string | null } {
  if (options?.isFavorite !== undefined) {
    return {
      isFavorite: !!options.isFavorite,
      favoritedAt: safeTimestamp(options.favoritedAt),
    };
  }

  if (record?.isFavorite === true) {
    return {
      isFavorite: true,
      favoritedAt: safeTimestamp(record?.favoritedAt),
    };
  }

  const favoritesMap = options?.favoritesMap;
  if (!favoritesMap) {
    return { isFavorite: false, favoritedAt: null };
  }

  const candidateKeys: string[] = [];
  if (typeof record?.dbKey === "string" && record.dbKey) candidateKeys.push(record.dbKey);
  if (typeof record?.privateKey === "string" && record.privateKey) candidateKeys.push(record.privateKey);
  if (typeof record?.publicKey === "string" && record.publicKey) candidateKeys.push(record.publicKey);
  // 上游水化已验证的 key（空间共享 / grant 给你的 agent）：收藏记录里存的
  // 就是这把 key，而不是 record.id。少了它，这类 agent 判不出 isFavorite，
  // 会在 scope="preferred" 里被整条过滤掉。
  if (typeof record?.verifiedAgentKey === "string" && record.verifiedAgentKey) {
    candidateKeys.push(record.verifiedAgentKey);
  }
  if (typeof record?.id === "string" && record.id) {
    candidateKeys.push(record.id);
    candidateKeys.push(publicAgentKey(record.id));
    if (options?.userId) {
      candidateKeys.push(ownedAgentKey(options.userId, record.id));
    }
  }

  let matched = false;
  let highestFavAt: number | string | null = null;
  let highestFavTime = -1;

  for (const key of candidateKeys) {
    const val = favoritesMap instanceof Map ? favoritesMap.get(key) : favoritesMap[key];
    if (val !== undefined && val !== false && val !== null) {
      const favAt = val === true ? 1 : safeTimestamp(val);
      if (favAt === null) continue;
      matched = true;
      const time = parseTimestamp(favAt);
      if (time > highestFavTime) {
        highestFavTime = time;
        highestFavAt = favAt;
      }
    }
  }

  if (matched) {
    return {
      isFavorite: true,
      favoritedAt: highestFavAt ?? 1,
    };
  }

  return { isFavorite: false, favoritedAt: null };
}

/**
 * 「这条 agent 记录是否属于当前用户」的唯一判据。
 *
 * 两个消费方共用本函数，禁止各自再实现一份：
 * - `toSafeAgentSummary` 派生 `isOwned`（选人优先自建 agent 省钱）；
 * - `summarizeCredentialGroups` 依赖摘要上的 `isOwned` 剔除「别人共享给你的同名
 *   provider」，避免把调用者自己的 429 冷却算进别人的 agent。
 *
 * 判据：record.userId / ownerId 任一等于当前用户，或 dbKey / privateKey 以完整
 * 前缀 `agent-<currentUserId>-` 开头（不解析分段——userId 本身可能含连字符，
 * 如 user-1，解析首个连字符会误判为非自建）。
 *
 * `userId` 缺失（未登录 / 读不到会话）时一律返回 false：宁可不套冷却，也不要把
 * 本机冷却误伤到不属于当前用户的记录上。
 */
export function isOwnedAgentRecord(
  record: any,
  userId: string | undefined,
): boolean {
  if (!userId) return false;
  if (
    (typeof record?.userId === "string" && record.userId === userId) ||
    (typeof record?.ownerId === "string" && record.ownerId === userId)
  ) {
    return true;
  }
  return [record?.dbKey, record?.privateKey].some((key) =>
    isOwnedAgentKey(key, userId)
  );
}

function subscriptionQuotaChannel(source: unknown): string | undefined {
  if (typeof source !== "string") return undefined;
  const id = source.toLowerCase();
  if (id.includes("fetchavailablemodels:pool:")) return "antigravity";
  const probe = id.match(/(?:^|[^a-z0-9-])(antigravity|codex|anthropic|claude|cursor|devin|xai)-oauth(?=$|[^a-z0-9-])/)?.[1];
  if (probe === "codex") return "chatgpt";
  if (probe === "anthropic") return "claude";
  return probe;
}

export function toSafeAgentSummary(
  record: any,
  options?: SafeAgentSummaryOptions
): SafeAgentSummary {
  const rawId = parseAgentRecordId(
    typeof record?.privateKey === "string" ? record.privateKey : record?.dbKey,
    typeof record?.id === "string" ? record.id : undefined
  );
  const id = rawId ?? (typeof record?.id === "string" ? record.id : null);

  const publicRecordDenied = record?.publicRecordExists === false || options?.publicRecordExists === false;
  const publicRecordConfirmed = record?.publicRecordExists === true || options?.publicRecordExists === true;

  let publicKey: string | undefined;
  if (typeof record?.publicKey === "string" && record.publicKey && !publicRecordDenied) {
    // Record carries an explicit publicKey — trust it unless caller denies the public record.
    publicKey = record.publicKey;
  } else if (publicRecordConfirmed && id) {
    // Caller confirmed the public record exists — safe to derive the well-known key.
    publicKey = publicAgentKey(id);
  }
  // Otherwise: omit entirely so models never see a key that cannot resolve.

  const name = typeof record?.name === "string" && record.name ? record.name : "(unnamed)";
  const handle = typeof record?.handle === "string" && record.handle ? record.handle : null;
  const introduction =
    typeof record?.introduction === "string" && record.introduction
      ? record.introduction
      : typeof record?.description === "string" && record.description
        ? record.description
        : null;

  const roleText = typeof record?.introduction === "string"
    ? record.introduction.trim().replace(/\s+/g, " ") : "";
  const roleChars = Array.from(roleText);
  const roleHint = roleChars.length > 60 ? `${roleChars.slice(0, 59).join("")}…` : roleText;

  const model = typeof record?.model === "string" && record.model ? record.model : null;
  const provider =
    typeof record?.provider === "string" && record.provider
      ? record.provider
      : typeof record?.apiSource === "string" && record.apiSource
        ? record.apiSource
        : null;
  const apiSource = typeof record?.apiSource === "string" && record.apiSource ? record.apiSource : null;
  const cliProvider = typeof record?.cliProvider === "string" && record.cliProvider ? record.cliProvider : null;

  const tools = Array.isArray(record?.tools)
    ? record.tools.filter((t: unknown): t is string => typeof t === "string")
    : [];

  const inputPrice =
    typeof record?.inputPrice === "number" && Number.isFinite(record.inputPrice)
      ? record.inputPrice
      : null;
  const outputPrice =
    typeof record?.outputPrice === "number" && Number.isFinite(record.outputPrice)
      ? record.outputPrice
      : null;

  const favStatus = resolveFavoriteStatus(record, options);
  const isPublic = record?.isPublic === true || record?.isPublicFlag === true || record?.publicRecordExists === true;
  const updatedAt = safeTimestamp(record?.updatedAt ?? record?.createdAt ?? record?.created);
  const nextAvailableAt =
    typeof record?.nextAvailableAt === "number" && Number.isFinite(record.nextAvailableAt)
      ? record.nextAvailableAt
      : undefined;
  const currentUserId = options?.userId;
  // dbKey 与 privateKey 是同一个 agent-<userId>-<id> 键的两种字段名（CLI/TUI
  // 传 ListedAgent，只有 privateKey；web 传原始 record，带 dbKey）。
  const ownedKey = currentUserId
    ? [record?.dbKey, record?.privateKey].find((key) =>
        isOwnedAgentKey(key, currentUserId)
      )
    : undefined;
  const isOwned = isOwnedAgentRecord(record, currentUserId);
  const isOAuth = isOAuthApiKeyRef(record?.apiKeyRef);
  const billingSource = resolveBillingSource({
    ...record,
    isOAuth,
    isOwned,
    apiSource,
    cliProvider,
    provider,
    isPublic,
  });

  // Phase 2A economics：只对官方证据足够的 source（DeepSeek API、BigModel GLM
  // Coding Plan）产出快照；证据不足的 source 返回 null，字段整体省略（neutral）。
  // customProviderUrl 只用于确认官方端点，绝不进入输出。
  const economics = resolveEconomicsSnapshot(
    {
      provider,
      apiSource,
      customProviderUrl:
        typeof record?.customProviderUrl === "string" ? record.customProviderUrl : null,
    },
    options?.now ?? Date.now()
  );

  // Runnable agentKey for delegation: owned agents → agent-<userId>-<id> (the
  // current user can always resolve these); confirmed public agents → their
  // publicKey; otherwise → the key the upstream hydration already proved
  // resolvable under the caller's own credentials (space-shared / granted
  // agents, whose owner is NOT the current user, so recomputing from id is
  // impossible). Omitted when there is no signed-in user or no key at all, so
  // models never see a key that would 404 in startAgentRun.
  // 优先用记录自带的真实 key，只有拿不到时才由 id 拼。record.id 在真实数据里
  // 有时就是整条 dbKey，盲目重拼会产出 agent-<uid>-agent-<uid>-<id> 这种 404 key。
  const verifiedSharedKey =
    typeof record?.verifiedAgentKey === "string" && record.verifiedAgentKey
      ? record.verifiedAgentKey
      : undefined;
  let agentKey: string | undefined;
  if (currentUserId) {
    if (isOwned) {
      agentKey = ownedKey ?? (id ? ownedAgentKey(currentUserId, id) : undefined);
    } else if (publicKey) {
      agentKey = publicKey;
    } else {
      agentKey = verifiedSharedKey;
    }
  }

  const rawCredRef =
    (typeof record?.apiKeyRef === "string" && record.apiKeyRef ? record.apiKeyRef : undefined) ??
    (typeof record?.credentialRef === "string" && record.credentialRef ? record.credentialRef : undefined);
  const credInfo = deriveCredentialGroup(record?.credentialGroup ?? rawCredRef);
  const credentialGroup = record?.credentialGroup ?? credInfo?.credentialGroup;
  const credentialKind = record?.credentialKind ?? credInfo?.credentialKind;

  const rawQuota: AgentQuota | undefined = record?.quota;
  const snapshot = rawQuota && Array.isArray(rawQuota.windows) && Number.isFinite(rawQuota.observedAt)
    ? rawQuota : undefined;
  const ref = typeof rawCredRef === "string" ? rawCredRef.trim().toLowerCase() : undefined;
  const group = typeof credentialGroup === "string" ? credentialGroup.trim().toLowerCase() : undefined;
  const oauthChannel = isOAuthApiKeyRef(ref) ? ref : isOAuthApiKeyRef(group) ? group : undefined;
  const providerId = provider?.trim().toLowerCase();
  const channel = oauthChannel ?? (providerId === "google-antigravity" ? "antigravity" : providerId);
  const platformChannel = apiSource === "platform" ||
    (providerId === "nolo" && !oauthChannel && apiSource !== "custom");
  const windows = snapshot?.windows.filter(window => {
    const origin = subscriptionQuotaChannel(window?.source);
    return !origin || (!platformChannel && (!channel || origin === channel));
  });
  const foreignOnly = Boolean(snapshot?.windows.length && windows?.length === 0);
  const quota = snapshot && windows && !foreignOnly ? { ...snapshot, windows } : undefined;
  // An exhaustion response can stand alone, but must not survive a wholly foreign snapshot.
  const observedAt = record?.quotaExhaustion?.observedAt;
  const quotaExhaustion = !foreignOnly && typeof observedAt === "number" && Number.isFinite(observedAt)
    ? { observedAt } : undefined;

  const availability = resolveAgentAvailability(
    { nextAvailableAt, quota, quotaExhaustion, model },
    options?.now ?? Date.now(),
  );

  return {
    id,
    ...(agentKey !== undefined ? { agentKey } : {}),
    ...(publicKey !== undefined ? { publicKey } : {}),
    name,
    handle,
    introduction,
    ...(roleHint ? { roleHint } : {}),
    model,
    modelTier: resolveModelTier(model),
    provider,
    apiSource,
    cliProvider,
    billingSource,
    tools,
    inputPrice,
    outputPrice,
    isFavorite: favStatus.isFavorite,
    favoritedAt: favStatus.favoritedAt,
    isPublic,
    // 复用 platformPaidCall.ts 的唯一判据（该文件头明确它是「谁出钱」的真源）：
    // 自己写 billingSource === "platform_credits" 会与 199 门槛口径分叉——
    // 例如 apiSource==="cli" 的本地 CLI Agent 在 resolveBillingSource 里会落到
    // platform_credits，但 isPlatformPaidAgentCall 显式短路为「非平台垫付」。
    requiresPaidApproval: isPlatformPaidAgentCall({
      agentConfig: record ?? undefined,
      callerUserId: currentUserId ?? undefined,
    }),
    ...(economics ? { economics } : {}),
    isOwned,
    isOAuth,
    ...(nextAvailableAt !== undefined ? { nextAvailableAt } : {}),
    availabilityStatus: availability.status,
    availabilityReason: availability.reason,
    ...(quota !== undefined ? { quota } : {}),
    ...(quotaExhaustion ? { quotaExhaustion } : {}),
    ...(credentialGroup !== undefined ? { credentialGroup } : {}),
    ...(credentialKind !== undefined ? { credentialKind } : {}),
    // 「未知 ≠ 独立」：无 credentialGroup 时显式 credentialed:false，调用方
    // 不得把缺失解读成独立凭证（并发扇出守卫依赖这个区分）。
    credentialed: credentialGroup !== undefined,
    updatedAt,
  };
}

export function sortSafeAgentSummaries<T extends AgentSelectionCandidate>(agents: T[]): T[] {
  return [...agents].sort(compareAgentSelection);
}

/**
 * listAgents 默认输出投影：编排者选人决策真正需要的最小字段集。
 *
 * 背景（真实事故）：32 个 agent 的完整摘要约 23.9KB，被 host 按字节截成
 * 头+尾，中段条目的 agentKey 不可见，模型照抄其它条目的 ULID 格式猜了一个
 * 不存在的 key，派发 2 秒即失败。agentKey 是唯一不可推导、必须逐字复制的
 * 字段，必须保留；introduction/cliProvider/价格等长文本或大量
 * 为 null 的字段在截断预算里是纯噪音，默认剔除。verbose 模式拿回完整字段集。
 */
const AGENT_SUMMARY_FIELDS = [
  // —— 派发决策必需（短字段，必须排最前）——
  // agentKey 是唯一不可推导、必须逐字复制的字段；截断时它首先被保住。
  "agentKey",
  "name",
  "model",
  "modelTier",
  "billingSource",
  // 扣费授权判据：listAgents 默认走 compact 投影，缺了它模型在默认派发
  // 流程里读不到「派它之前要先问用户」（2026-11-15 事故成因）。
  "requiresPaidApproval",
  "availabilityStatus",
  "credentialGroup",
  "isFavorite",
  "isOAuth",
  "isOwned",
  "isPublic",
  // —— 次要身份/来源字段（仍很短）——
  "provider",
  "apiSource",
  "credentialKind",
  "credentialed",
  // 仅限流中的 agent 才会带（可用 agent 上不存在）。额度/冷却只作参考信息，
  // 不参与派发门控：这类 agent 同样在 agents 主列表里（带标注），不做过滤，
  // 所以这两个字段只在确实限流时才占字节。
  "nextAvailableAt",
  "availabilityReason",
  // —— 体积大的说明性字段（排在每条记录最后，截断时先牺牲它们）——
  // Phase 2A economics 快照（period/multipliers/changesAt 等小对象）。
  // 只对 DeepSeek API / BigModel GLM Coding Plan 存在；不含完整 policy/windows。
  "economics",
] as const;

// Both projections end with these fields; keep roleHint in its existing compact slot.
const AGENT_SUMMARY_TRAILING_FIELDS = [
  "tools",
  // 额度快照（windows 数组，体积最大）：只有上游真上报过窗口的 agent 才带。
  "quota",
] as const;

export const COMPACT_AGENT_SUMMARY_FIELDS = [
  ...AGENT_SUMMARY_FIELDS,
  "roleHint",
  ...AGENT_SUMMARY_TRAILING_FIELDS,
] as const;

export type CompactSafeAgentSummary = Pick<
  SafeAgentSummary,
  (typeof COMPACT_AGENT_SUMMARY_FIELDS)[number]
> & {
  /**
   * 「本条的内联 `quota` 已提升到 `credentialGroups[].quota`」的显式指针，
   * 值为该组的 `credentialGroup`（见 promoteSharedCredentialGroupQuota）。
   *
   * 存在的唯一理由是把「继承组配额」与「压根没有配额观测」区分开：少了它，
   * 一条 `remaining: 0`（真耗尽）被提升后与「上游从未报过配额」在输出里长得一样。
   * `quotaRef` 与 `quota` 互斥；两者都没有 = 未知，不是 0。
   */
  quotaRef?: string;
};

/**
 * 去掉值为 null/undefined 的键。"introduction": null 这类键只花字节不给信息；
 * 省略整个键与 toSafeAgentSummary 对 publicKey/agentKey 的既有约定一致
 * （不给模型一个用不了的值）。
 */
export function omitNullishAgentSummaryFields<T extends object>(summary: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(summary)) {
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * `compact: true` 投影里的配额窗口：**只留派发决策真正要读的读数**，剔除
 * `source` 诊断串（真实形态如
 * `antigravity-oauth:https://daily-cloudcode-pa.googleapis.com:fetchAvailableModels:pool:hydrogen`）。
 *
 * `source` 只回答「这条窗口是哪个头/端点出的」，对「还能不能派、还剩多少、
 * 什么时候复位」没有任何决策价值，却在 35 个 agent × 多窗口里重复几十次，
 * 是 listAgents 输出里最纯的字节噪音。
 */
export type CompactQuotaWindow = {
  scope: string;
  utilization?: number;
  remaining?: number;
  limit?: number;
  unit?: string;
  resetAt?: number;
};

/**
 * `compact: true` 投影里的配额快照。`plan` 同样剔除 `source`（同样是排障标记），
 * 只留档位名与月度额度这两个「买的是哪个档」的事实。
 */
export type CompactAgentQuota = {
  observedAt: number;
  windows: CompactQuotaWindow[];
  plan?: { name: string; monthlyCreditsUsd?: number };
};

function finiteOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * 纯函数：完整配额快照 → compact 投影（剔除 `source` 长诊断串，保留读数）。
 *
 * 保留：`observedAt` 与每窗口的 `scope`/`utilization`/`remaining`/`limit`/`unit`/`resetAt`。
 * 注意 0 是有意义的读数（`remaining: 0` = 已耗尽），所以只按 `undefined` 判定缺失，
 * 绝不按真值判断。已精简过的快照再进来是幂等的。
 */
export function compactQuotaForSummary(
  quota: AgentQuota | CompactAgentQuota | undefined | null,
): CompactAgentQuota | undefined {
  if (!quota || !Array.isArray(quota.windows)) return undefined;
  const observedAt = finiteOptionalNumber(quota.observedAt);
  if (observedAt === undefined) return undefined;

  const windows: CompactQuotaWindow[] = [];
  for (const window of quota.windows as Array<Partial<QuotaWindow> | null | undefined>) {
    if (!window || typeof window.scope !== "string" || !window.scope) continue;
    const utilization = finiteOptionalNumber(window.utilization);
    const remaining = finiteOptionalNumber(window.remaining);
    const limit = finiteOptionalNumber(window.limit);
    const resetAt = finiteOptionalNumber(window.resetAt);
    const unit = typeof window.unit === "string" && window.unit ? window.unit : undefined;
    windows.push({
      scope: window.scope,
      ...(utilization !== undefined ? { utilization } : {}),
      ...(remaining !== undefined ? { remaining } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(unit !== undefined ? { unit } : {}),
      ...(resetAt !== undefined ? { resetAt } : {}),
    });
  }
  // 窗口全被过滤掉时仍保留 observedAt 与空数组：投影键集合与默认投影保持一致
  // （既有的键集合契约见 safeAgentSummary.test.ts）。生产数据里 quota 带窗口，
  // 不会走到这里；去重侧另外要求窗口非空，避免把「仅有观测时刻」也合并掉。
  const rawPlan = (quota as AgentQuota).plan;
  const planName = rawPlan && typeof rawPlan.name === "string" && rawPlan.name ? rawPlan.name : undefined;
  const monthlyCreditsUsd = finiteOptionalNumber(rawPlan?.monthlyCreditsUsd);
  const plan = planName
    ? { name: planName, ...(monthlyCreditsUsd !== undefined ? { monthlyCreditsUsd } : {}) }
    : undefined;

  return {
    observedAt,
    windows,
    ...(plan ? { plan } : {}),
  };
}

/**
 * compact:true 投影专用：同 credentialGroup 内「窗口内容完全相同」的配额只留一份。
 *
 * 为什么需要：本机一条 OAuth 凭据下常常挂着 4~6 个 agent，每个 agent 的 record
 * 都带着同一份上游额度快照（同一账号、同一批窗口），JSON 里就连抄 4~6 遍。
 * 那份数据是**凭据级事实**，不是 agent 级事实，属于 credentialGroups 该背的重量。
 *
 * 规则（保守、可预测）：
 * - **前缀作用域**：只看本次传入的这一批 agents，绝不参考整页里别处的候选。
 *   传入的若是上一次提升过的结果（被提升条目带 `quotaRef`、额度挂在组上），
 *   先还原成条目自己的内联快照再重算——因此本函数是幂等的，分页裁剪与单候选
 *   fragment 都能安全地在前缀上重跑。
 * - 只对 `isOwned === true` 且带非空 `credentialGroup`（且该组确实在 `groups` 里
 *   有条目）的候选参与提升；非自有 / 公开候选一律不参与（他们的组名会和调用者
 *   自己的组撞名，但花的不是同一份预算）。
 * - 聚合键是「窗口内容 + 精简后的 plan + `observedAt`」
 *   （`JSON.stringify([windows, plan ?? null, observedAt ?? null])`）：
 *   `plan`（档位名 + 月度额度）决定「买的是哪一档」，同窗口不同档不能合并；
 *   `observedAt` **必须入键**，否则提升会把它改写成簇内最大值，而
 *   `quotaRef` 的还原只能从 `credentialGroups[].quota` 取整份快照——
 *   于是单候选 fragment 会拿到「别人的观测时刻」，等这条兄弟候选刷新退出
 *   提升簇时又变回原值，续取同一片段直接报 `LIST_AGENTS_FRAGMENT_CHANGED`。
 *   还原必须是 100% 无损的，代价只是不同 `observedAt` 的快照不再合并
 *   （真实同批 OAuth 刷新各候选的 `observedAt` 本就一致，压缩收益不受影响）。
 * - 只有「同组 ≥2 个 agent 共享同一窗口、plan 与 observedAt」时才提升；
 *   提升上去的 `observedAt` 与这组成员完全一致（取它们共同的值）。
 * - 被提升的条目去掉内联 `quota`，改写显式 `quotaRef: <credentialGroup>`：
 *   「有 quotaRef 无 quota」= 读 credentialGroups[].quota；「两者都没有」= 未观测未知。
 * - 一个组里有多个重复簇时，只提升**成员最多**的那一簇；其余照旧各自保留，
 *   绝不把不同配额合成一份（误合并比多花字节危险得多）。
 * - 单条、独有或窗口/plan 不同的配额一律留在 agent 自己身上。
 * - 传入的 `groups[].quota` 一律按本次这批重算：没有达到提升条件就不输出组额度。
 *
 * 纯函数：不修改入参，返回新对象（无提升时原样返回）。
 */
export function promoteSharedCredentialGroupQuota<
  TAgent extends {
    credentialGroup?: string;
    isOwned?: boolean;
    quota?: CompactAgentQuota;
    quotaRef?: string;
  },
>(
  agents: TAgent[],
  groups: CredentialGroupSummary[],
): { agents: TAgent[]; groups: CredentialGroupSummary[] } {
  if (!agents.length || !groups.length) return { agents, groups };
  const groupByName = new Map(groups.map((group) => [group.credentialGroup, group]));

  // 第一步：还原。`quotaRef` 只是「这份读数已经搬去 credentialGroups[]」的指针，
  // 不是在条目上就地丢掉的事实——前缀重算必须先把它接回来。这样本函数对
  // 「每条各带内联 quota」和「已被整页提升过」两种输入给出同一结论，
  // 分页裁剪 / 单候选 fragment 只依赖自己看到的那个前缀。
  const restored = agents.map((agent) => {
    const ref = agent.quotaRef;
    if (typeof ref !== "string") return agent;
    const fromGroup = groupByName.get(ref)?.quota;
    const rest = { ...agent } as TAgent & { quotaRef?: string };
    delete rest.quotaRef;
    if (fromGroup) rest.quota = fromGroup;
    return rest;
  });
  // 组上那份额度一律先摘掉，只按本次传入的这一批重新提升：
  // 否则「整页提升、只交付前缀」会把未交付候选的组额度挂到已交付的组条目上，
  // 既顶爆单候选页（误判 TOO_LARGE），也让 fragment digest 随别的候选择漂移。
  const bareGroups = groups.map(({ quota: _dropped, ...rest }) => rest as CredentialGroupSummary);

  const slimQuota = restored.map((agent) => compactQuotaForSummary(agent.quota));
  const byGroup = new Map<string, Map<string, number[]>>();
  slimQuota.forEach((quota, index) => {
    const agent = restored[index]!;
    const groupKey = agent.credentialGroup;
    // 只合并「有真实窗口」的快照：空窗口只是观测时刻，合并它没有字节收益。
    if (!quota || quota.windows.length === 0) return;
    // 非自有 / 公开候选绝不参与提升：OAuth 的 credentialGroup 就是 provider 名，
    // 别人分享给你的 agent 会和调用者自己的同名组撞名，但花的不是同一份预算。
    if (agent.isOwned !== true) return;
    if (typeof groupKey !== "string" || !groupKey) return;
    if (!groupByName.has(groupKey)) return;
    const clusters = byGroup.get(groupKey) ?? new Map<string, number[]>();
    // 等价签名必须同时含窗口、精简后的 plan 与 observedAt：
    // - 同窗口不同档（PRO vs FREE）不是同一份事实，只比窗口会把后者的套餐信息静默抹掉；
    // - observedAt 不入键则提升会篡改它（簇内最大值），而 quotaRef 只能整份还原，
    //   单候选 fragment 因此拿到别人的观测时刻，续片会报 LIST_AGENTS_FRAGMENT_CHANGED。
    const signature = JSON.stringify([
      quota.windows,
      quota.plan ?? null,
      quota.observedAt ?? null,
    ]);
    const indices = clusters.get(signature) ?? [];
    indices.push(index);
    clusters.set(signature, indices);
    byGroup.set(groupKey, clusters);
  });

  const promoted = new Map<string, CompactAgentQuota>();
  const refFor = new Map<number, string>();
  for (const [groupKey, clusters] of byGroup) {
    let best: number[] | undefined;
    for (const indices of clusters.values()) {
      if (indices.length < 2) continue;
      if (!best || indices.length > best.length) best = indices;
    }
    if (!best) continue;
    // 簇内成员的 observedAt 按签名必然相同（见上），这里取首成员的值即可：
    // 组额度必须能原样还原到每一个被提升的条目上，任何「取代表值」的加工都会
    // 破坏无损性。
    const observedAt = slimQuota[best[0]!]!.observedAt;
    const { plan } = slimQuota[best[0]!]!;
    promoted.set(groupKey, {
      observedAt,
      windows: slimQuota[best[0]!]!.windows,
      ...(plan ? { plan } : {}),
    });
    for (const index of best) refFor.set(index, groupKey);
  }

  const nextAgents = restored.map((agent, index) => {
    const ref = refFor.get(index);
    if (!ref) return agent;
    // 去掉内联副本，但留下显式指针：消费者据此分清「指向 credentialGroups[].quota」
    // 与「既无 quota 也无 quotaRef = 未观测未知」。少了它，remaining: 0 的耗尽
    // 和「上游从没报过配额」在输出里长得一模一样。
    const rest = { ...agent } as TAgent & { quotaRef?: string };
    delete rest.quota;
    rest.quotaRef = ref;
    return rest as TAgent;
  });
  const nextGroups = bareGroups.map((group) => {
    const quota = promoted.get(group.credentialGroup);
    return quota ? { ...group, quota } : group;
  });
  return { agents: nextAgents, groups: nextGroups };
}

/**
 * 完整摘要 → 默认精简投影（选人最小字段集，且不含值为 null/undefined 的键）。
 * 注意：只做输出投影，不参与排序/过滤——排序必须在投影之前完成
 * （compareAgentSelection 依赖 favoritedAt/updatedAt，429 过滤依赖 nextAvailableAt）。
 */
export function toCompactAgentSummary(
  summary: SafeAgentSummary
): CompactSafeAgentSummary {
  const compact: Record<string, unknown> = {};
  for (const field of COMPACT_AGENT_SUMMARY_FIELDS) {
    const value = summary[field];
    if (value !== null && value !== undefined) {
      compact[field] = value;
    }
  }
  return compact as CompactSafeAgentSummary;
}

/**
 * 显式紧凑模式（compact: true）输出投影：
 * 当调用方受极端 token 预算限制时，保留选人派发与准入所必需的核心字段与证据
 * （agentKey、name、model、billingSource、availabilityStatus、credentialGroup、
 * isFavorite、isOAuth、isOwned、isPublic、nextAvailableAt、availabilityReason、
 * tools、provider、apiSource、credentialKind、credentialed、economics、quota），
 * 同时剔除次要长文本说明与非准入元数据（如 introduction、greeting、prompt 等）。
 */
export const ULTRA_COMPACT_AGENT_SUMMARY_FIELDS = [
  ...AGENT_SUMMARY_FIELDS,
  ...AGENT_SUMMARY_TRAILING_FIELDS,
] as const;

export type UltraCompactSafeAgentSummary = Omit<
  Pick<SafeAgentSummary, (typeof ULTRA_COMPACT_AGENT_SUMMARY_FIELDS)[number]>,
  "quota"
> & {
  /**
   * 配额快照的 compact 形态（剔除 `source` 诊断串，见 compactQuotaForSummary）。
   * 同 credentialGroup 内完全相同的快照会被提升到 credentialGroups[].quota，
   * 这些 agent 条目上不再有 `quota`（见 promoteSharedCredentialGroupQuota）。
   */
  quota?: CompactAgentQuota;
  /**
   * 「本条的内联 `quota` 已提升到 `credentialGroups[].quota`」的显式指针
   * （值为组名，如 `"antigravity"`）。与 `quota` 互斥；两者都没有 = 未观测未知，
   * 绝不等于 `remaining: 0`。
   */
  quotaRef?: string;
};

export function toUltraCompactAgentSummary(
  summary: SafeAgentSummary
): UltraCompactSafeAgentSummary {
  const compact: Record<string, unknown> = {};
  for (const field of ULTRA_COMPACT_AGENT_SUMMARY_FIELDS) {
    const value = summary[field];
    if (value !== null && value !== undefined) {
      compact[field] = value;
    }
  }
  // 体积尾部只有一件事：quota 只留读数、丢掉 source 诊断串。
  // `tools: []` 不省略——safeAgentSummary.test.ts 把「ultra 与 compact 的键集合一致」
  // 当作既有投影契约（omitNullishAgentSummaryFields 也明确保留 falsy 的 []），
  // 省下的 11 字节不值得让公开投影契约分叉。
  if (compact.quota !== undefined) {
    const quota = compactQuotaForSummary(compact.quota as AgentQuota);
    if (quota) {
      compact.quota = quota;
    } else {
      delete compact.quota;
    }
  }
  return compact as UltraCompactSafeAgentSummary;
}
