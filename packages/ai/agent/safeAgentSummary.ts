import { fnv1a32Hex } from "core/fnv1a32";
import { getModelAbility, type ModelAbility } from "../llm/modelAbility";
import { isOAuthApiKeyRef } from "agent-runtime/serverProxyPolicy";
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
}

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
  model: string | null;
  provider: string | null;
  apiSource: string | null;
  cliProvider: string | null;
  billingSource: BillingSource;
  tools: string[];
  inputPrice: number | null;
  outputPrice: number | null;
  modelAbility: ModelAbility | null;
  isFavorite: boolean;
  favoritedAt: number | string | null;
  isPublic: boolean;
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

  const modelAbility = model ? getModelAbility(model) ?? null : null;
  const favStatus = resolveFavoriteStatus(record, options);
  const isPublic = record?.isPublic === true || record?.isPublicFlag === true || record?.publicRecordExists === true;
  const updatedAt = safeTimestamp(record?.updatedAt ?? record?.createdAt ?? record?.created);
  const nextAvailableAt =
    typeof record?.nextAvailableAt === "number" && Number.isFinite(record.nextAvailableAt)
      ? record.nextAvailableAt
      : undefined;

  // 自建判断：record.userId / ownerId 任一等于当前用户，或 dbKey 以完整前缀
  // `agent-<currentUserId>-` 开头（不解析分段——userId 本身可能含连字符，
  // 如 user-1，解析首个连字符会误判为非自建）。
  // 自建 agent 若用自己的 API（apiSource "custom"）或本地 OAuth，派发走用户自己的
  // 配额，不消耗平台 credits——选人时优先它们能省钱。
  const currentUserId = options?.userId;
  const isOwnedByRecord =
    Boolean(currentUserId) &&
    ((typeof record?.userId === "string" && record.userId === currentUserId) ||
      (typeof record?.ownerId === "string" && record.ownerId === currentUserId));
  // dbKey 与 privateKey 是同一个 agent-<userId>-<id> 键的两种字段名（CLI/TUI
  // 传 ListedAgent，只有 privateKey；web 传原始 record，带 dbKey），两者都要
  // 认——否则 CLI `agent list --safe` 会把自建 agent 全判成非自建、省略 agentKey。
  const ownedKey = currentUserId
    ? [record?.dbKey, record?.privateKey].find((key) =>
        isOwnedAgentKey(key, currentUserId)
      )
    : undefined;
  const isOwned = isOwnedByRecord || Boolean(ownedKey);
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

  return {
    id,
    ...(agentKey !== undefined ? { agentKey } : {}),
    ...(publicKey !== undefined ? { publicKey } : {}),
    name,
    handle,
    introduction,
    model,
    provider,
    apiSource,
    cliProvider,
    billingSource,
    tools,
    inputPrice,
    outputPrice,
    modelAbility,
    isFavorite: favStatus.isFavorite,
    favoritedAt: favStatus.favoritedAt,
    isPublic,
    ...(economics ? { economics } : {}),
    isOwned,
    isOAuth,
    ...(nextAvailableAt !== undefined ? { nextAvailableAt } : {}),
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
 * 字段，必须保留；introduction/cliProvider/modelAbility/价格等长文本或大量
 * 为 null 的字段在截断预算里是纯噪音，默认剔除。verbose 模式拿回完整字段集。
 */
export const COMPACT_AGENT_SUMMARY_FIELDS = [
  "agentKey",
  "name",
  "model",
  "provider",
  "apiSource",
  "billingSource",
  "isFavorite",
  "isOAuth",
  "isOwned",
  "isPublic",
  "tools",
  // Phase 2A economics 快照（period/multipliers/changesAt 等小对象）。
  // 只对 DeepSeek API / BigModel GLM Coding Plan 存在；不含完整 policy/windows。
  "economics",
  // 仅限流中的 agent 才会带（可用 agent 上不存在）。对"现在能不能选它"是
  // 决策信息（CLI --show-unavailable 场景）；默认列表已把这类 agent 过滤掉，
  // 所以通常根本不占字节。
  "nextAvailableAt",
  "credentialGroup",
  "credentialKind",
  "credentialed",
] as const;

export type CompactSafeAgentSummary = Pick<
  SafeAgentSummary,
  (typeof COMPACT_AGENT_SUMMARY_FIELDS)[number]
>;

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

export const UNAVAILABLE_AGENT_SUMMARY_FIELDS = [
  "agentKey",
  "name",
  "model",
  "provider",
  "apiSource",
  "isFavorite",
  "isOAuth",
  "isOwned",
  "nextAvailableAt",
  "favoritedAt",
  "updatedAt",
] as const;

export type UnavailableAgentSummary = {
  agentKey?: string;
  name: string;
  model?: string;
  provider?: string;
  apiSource?: string;
  isFavorite: boolean;
  isOAuth: boolean;
  isOwned: boolean;
  nextAvailableAt?: number;
  favoritedAt?: number | string;
  updatedAt?: number | string;
};

/**
 * 429 限流不可用 Agent 的精简摘要投影（供 listAgents 的 unavailableAgents 字段消费）。
 * 包含选人和知情权决策所需的关键标识（agentKey、isOAuth、isOwned、isFavorite 等）及复位时间戳（nextAvailableAt）。
 */
export function toUnavailableAgentSummary(
  summary: SafeAgentSummary
): UnavailableAgentSummary {
  const item: Record<string, unknown> = {
    name: summary.name,
    isFavorite: summary.isFavorite,
    isOAuth: summary.isOAuth,
    isOwned: summary.isOwned,
  };
  for (const field of UNAVAILABLE_AGENT_SUMMARY_FIELDS) {
    const value = summary[field];
    if (value !== null && value !== undefined) {
      item[field] = value;
    }
  }
  return item as UnavailableAgentSummary;
}
