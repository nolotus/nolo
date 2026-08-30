import { getModelAbility, type ModelAbility } from "../llm/modelAbility";
import { isOwnedAgentKey, ownedAgentKey, publicAgentKey } from "core/prefix";
import { isOAuthApiKeyRef } from "agent-runtime/serverProxyPolicy";
import {
  compareAgentSelection,
  type AgentSelectionCandidate,
  resolveAgentSelectionPriority,
  isUserConfiguredAgent,
} from "./agentSelectionPriority";

export {
  resolveAgentSelectionPriority,
  isUserConfiguredAgent,
  compareAgentSelection,
  type AgentSelectionCandidate,
};

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
  tools: string[];
  inputPrice: number | null;
  outputPrice: number | null;
  modelAbility: ModelAbility | null;
  isFavorite: boolean;
  favoritedAt: number | string | null;
  isPublic: boolean;
  /** True when the agent is owned by the current user (record.userId matches). */
  isOwned: boolean;
  /** True when the agent uses one of the supported user OAuth subscriptions. */
  isOAuth: boolean;
  /** Epoch ms at which a provider quota/rate-limit is expected to recover. */
  nextAvailableAt?: number;
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

  // Runnable agentKey for delegation: owned agents → agent-<userId>-<id> (the
  // current user can always resolve these); confirmed public agents → their
  // publicKey. Omitted when there is no signed-in user or the key cannot resolve,
  // so models never see a key that would 404 in startAgentRun.
  // 优先用记录自带的真实 key，只有拿不到时才由 id 拼。record.id 在真实数据里
  // 有时就是整条 dbKey，盲目重拼会产出 agent-<uid>-agent-<uid>-<id> 这种 404 key。
  let agentKey: string | undefined;
  if (currentUserId) {
    if (isOwned) {
      agentKey = ownedKey ?? (id ? ownedAgentKey(currentUserId, id) : undefined);
    } else if (publicKey) {
      agentKey = publicKey;
    }
  }

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
    tools,
    inputPrice,
    outputPrice,
    modelAbility,
    isFavorite: favStatus.isFavorite,
    favoritedAt: favStatus.favoritedAt,
    isPublic,
    isOwned,
    isOAuth,
    ...(nextAvailableAt !== undefined ? { nextAvailableAt } : {}),
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
  "isFavorite",
  "isOAuth",
  "isOwned",
  "isPublic",
  "tools",
  // 仅限流中的 agent 才会带（可用 agent 上不存在）。对"现在能不能选它"是
  // 决策信息（CLI --show-unavailable 场景）；默认列表已把这类 agent 过滤掉，
  // 所以通常根本不占字节。
  "nextAvailableAt",
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
