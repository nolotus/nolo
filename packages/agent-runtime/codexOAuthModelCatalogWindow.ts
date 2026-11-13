// packages/agent-runtime/codexOAuthModelCatalogWindow.ts
//
// Codex OAuth 上游模型目录（GET /backend-api/codex/models）的**窗口存储与查询**：
// 只做 Map 缓存 + 别名换算，不 fetch、不碰 node: 内建，因此可被 Web Bundle 引用。
//
// 为什么拆成两个文件：目录抓取模块 codexOAuthModelCatalog.ts 必须复用
// codexResponsesProvider 的 CODEX_CLIENT_VERSION / CODEX_ORIGINATOR，而那个模块
// import 了 node:crypto（模块加载期 randomUUID）。查询侧（本文件）被
// devin/devinChannelWindows.ts 引用，后者在 web 图里
// （packages/ai/context/contextOccupancy.ts → chat UI），所以浏览器图只能拿到
// 本文件，抓取侧留给 server / CLI 进程内使用。
//
// 语义：
//   - 缓存按 accountId 分桶（无 accountId 落 "__default__"），TTL 1 小时。
//   - 查询**不认"当前账号"指针，也绝不混用多个账号的目录**：只有「进程内恰好一个
//     未过期的账号目录」时才返回它的值；两个及以上账号都有新鲜目录时返回
//     undefined，由调用方回落静态 pin。原因：窗口属于「账号 × 模型」，而同步解析点
//     （resolveAgentContextWindow / resolveOccupancyWindow）拿不到本次 run 的
//     accountId；多用户 server 同一进程并发跑不同用户时，猜错账号就会把高档位的
//     大窗口套到小窗口账号上（→ 上游 400）。宁可回落保守 pin，也不串号。
//     过期桶一律不参与（刷新失败留下的旧窗口不能当现价用）。
//     单用户本地进程天然只有一个桶，行为与「按账号取真值」一致。

import { resolveCodexOAuthEffectiveModel } from "./codexOAuthModelAliases";

/** 无 accountId 时的桶名（拿不到 chatgpt_account_id 时的唯一账号假设）。 */
export const CODEX_OAUTH_CATALOG_DEFAULT_ACCOUNT_KEY = "__default__";

/** 目录缓存默认 TTL：1 小时（账号档位/模型表变动远慢于这个尺度）。 */
export const CODEX_OAUTH_CATALOG_TTL_MS = 60 * 60 * 1000;

/** 失败后的重试下限：5 分钟内不再打上游，避免每个请求都重试。 */
export const CODEX_OAUTH_CATALOG_RETRY_FLOOR_MS = 5 * 60 * 1000;

type CodexOAuthCatalogBucket = {
  /** 模型 slug（小写）→ 上游 context_window。 */
  windows: ReadonlyMap<string, number>;
  /** 最后一次成功播种的时刻（ms）；null = 从未成功。 */
  fetchedAt: number | null;
  /** 最后一次失败的时刻（ms）；null = 从未失败。 */
  lastFailureAt: number | null;
};

const catalogBuckets = new Map<string, CodexOAuthCatalogBucket>();

/** 非正整数（0 / 负数 / 小数 / NaN / 非 number）一律视为「不知道」。 */
const isUsableContextWindow = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/** accountId 归一到桶名（trim；空值落默认桶）。 */
export const codexOAuthCatalogAccountKey = (
  accountId?: string | null,
): string => {
  const trimmed = accountId?.trim();
  return trimmed ? trimmed : CODEX_OAUTH_CATALOG_DEFAULT_ACCOUNT_KEY;
};

export type CodexOAuthCatalogSnapshot = {
  /** 桶内可用的模型条目数。 */
  modelCount: number;
  /** 最后一次成功播种时刻（ms），null = 从未成功。 */
  fetchedAt: number | null;
  /** 最后一次失败时刻（ms），null = 从未失败。 */
  lastFailureAt: number | null;
};

/** 某个账号桶的缓存状态（TTL / 重试下限判定用，也供测试观察隔离性）。 */
export const codexOAuthCatalogSnapshot = (
  accountId?: string | null,
): CodexOAuthCatalogSnapshot => {
  const bucket = catalogBuckets.get(codexOAuthCatalogAccountKey(accountId));
  return {
    modelCount: bucket?.windows.size ?? 0,
    fetchedAt: bucket?.fetchedAt ?? null,
    lastFailureAt: bucket?.lastFailureAt ?? null,
  };
};

/** 写入一次成功播种（非法 slug / 非法窗口在这里就被丢掉，不进桶）。 */
export function commitCodexOAuthCatalogWindows(args: {
  accountId?: string | null;
  models: Readonly<Record<string, number>>;
  now: number;
}): void {
  const windows = new Map<string, number>();
  for (const [slug, contextWindow] of Object.entries(args.models)) {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) continue;
    if (!isUsableContextWindow(contextWindow)) continue;
    windows.set(normalizedSlug, contextWindow);
  }
  const key = codexOAuthCatalogAccountKey(args.accountId);
  catalogBuckets.set(key, {
    windows,
    fetchedAt: args.now,
    lastFailureAt: null,
  });
}

/** 记录一次失败（保留上一次成功的窗口，失败不把已有真值清空）。 */
export function markCodexOAuthCatalogFailure(args: {
  accountId?: string | null;
  now: number;
}): void {
  const key = codexOAuthCatalogAccountKey(args.accountId);
  const existing = catalogBuckets.get(key);
  catalogBuckets.set(key, {
    windows: existing?.windows ?? new Map<string, number>(),
    fetchedAt: existing?.fetchedAt ?? null,
    lastFailureAt: args.now,
  });
  // 失败不清桶：同一账号的旧窗口仍然可查（略旧好过 pin）。
}

/**
 * 某个模型的 context window。
 *
 * 先经 resolveCodexOAuthEffectiveModel 解别名（gpt-6-sol → gpt-6.1-sol）再查，
 * 因此别名模型拿到的是「实际执行模型的」窗口，不是上游目录里残留的旧条目值。
 *
 * 账号身份规则（见文件头）：同步解析点拿不到本次 run 的 accountId，所以只在
 * **进程内恰好一个未过期账号目录**命中该 model 时返回它的值。出现第二个账号的
 * 新鲜目录、或命中的桶已过 TTL（刷新失败留下的旧值），一律返回 undefined，
 * 由调用方回落静态 pin——绝不把别的档位的窗口套到这只账号上。
 */
export const codexOAuthCatalogWindow = (
  model?: string | null,
  options?: { now?: number; ttlMs?: number },
): number | undefined => {
  const effectiveModel = resolveCodexOAuthEffectiveModel(model);
  if (!effectiveModel) return undefined;
  const slug = effectiveModel.toLowerCase();
  const now = options?.now ?? Date.now();
  const ttlMs = options?.ttlMs ?? CODEX_OAUTH_CATALOG_TTL_MS;
  let hit: { accountKey: string; contextWindow: number } | undefined;
  for (const [accountKey, bucket] of catalogBuckets) {
    if (bucket.fetchedAt === null || now - bucket.fetchedAt >= ttlMs) continue;
    const contextWindow = bucket.windows.get(slug);
    if (!isUsableContextWindow(contextWindow)) continue;
    if (hit && hit.accountKey !== accountKey) return undefined;
    hit = { accountKey, contextWindow };
  }
  return hit?.contextWindow;
};

/**
 * 测试用播种：直接写入一个账号桶，不 fetch、不计失败、不跑 TTL 判定。
 * 生产路径只有 ensureCodexOAuthModelCatalog 一条（见 codexOAuthModelCatalog.ts）。
 */
export const seedCodexOAuthCatalogWindows = (
  accountId: string | null | undefined,
  models: Readonly<Record<string, number>>,
  options?: { now?: number },
): void => {
  commitCodexOAuthCatalogWindows({
    accountId,
    models,
    now: options?.now ?? Date.now(),
  });
};

/** 测试用清空：丢掉所有桶，避免用例之间互相污染。 */
export const resetCodexOAuthCatalogWindows = (): void => {
  catalogBuckets.clear();
};
