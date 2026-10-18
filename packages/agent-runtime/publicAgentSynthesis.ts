/**
 * 平台 public agent 的「catalog 合成」唯一实现。
 *
 * 背景（2026-10-08 收藏/TUI 死链）：catalog 是广场商品的声明真值，声明即上架，
 * 不等 seed/数据迁移。但只有广场列表（`ai/agent/server/fetchPublicAgents`）实现了
 * 「DB 无记录 → 用 catalog+seed 合成」，其余按 agentKey 解析的读取入口
 * （`GET /api/v1/db/read/agent-pub-<id>`，Web 收藏页与 CLI/TUI 收藏项 hydrate 都走
 * 它）仍是纯 DB `get`，新上架条目一收藏就变成死链。本模块把合成逻辑抽出来，
 * 供「列表 overlay」与「单条读端点兜底」共用同一份，避免两处形态漂移。
 *
 * 落点说明（为什么不在 `core/`）：合成结果必须包含 seed 托管的内容字段
 * （introduction / greeting / prompt / tools / tags）与 `publishedAt`，这部分真值
 * 由 `agent-runtime/publicAgentCatalogOverride` 提供；`core` 若依赖
 * `agent-runtime` 就形成反向依赖。`database/server` 本来就 import
 * `agent-runtime/platformAgentCatalogOverrides`（同一层依赖方向），故落在
 * `agent-runtime` 最合适：core → agent-runtime → {ai, database/server}。
 *
 * 作用域（硬约束，与广场 overlay 完全一致）：
 * - 只合成 `group: "public"` 且未 retired 的条目；builtin 6 个与 internal 兼容
 *   条目仍按原有路径解析（记录缺失即 404），绝不因本模块凭空造出运行时路由。
 * - 只认 `agent-pub-<catalogId>` 这一种 key 形态。用户自建 `agent-{userId}-*`
 *   即使 id 与 catalog 相同也不合成（那是用户数据，不是平台商品）。
 * - 是否「已删除」由调用方用 tombstone 判定，本模块不看 DB：有正向删除证据的
 *   条目一律由调用方按删除处理，不调用这里。
 */

import {
  BUILTIN_AGENT_CATALOG,
  isRetiredCatalogEntry,
  type BuiltinAgentCatalogEntry,
} from "core/builtinAgentCatalog";
import { parsePublicAgentId, publicAgentKey } from "core/prefix";
import { applyPublicAgentCatalogOverride } from "./publicAgentCatalogOverride";

/**
 * 合成记录的结构形态。刻意不 import `app/types` 的 `Agent`：`agent-runtime`
 * 目前不依赖 `app/**`，为一张类型保持这条边界（调用方按自己的实体类型收窄）。
 */
export interface SynthesizedPublicAgent {
  dbKey: string;
  id: string;
  name: string;
  provider: string;
  model: string;
  apiSource: string;
  useServerProxy: boolean;
  isPublic: true;
  userId: string;
  tools: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  introduction?: string;
  greeting?: unknown;
  prompt?: string;
  publishedAt?: number;
  hasImageOutput?: boolean;
  imageModel?: string;
  imageWorkflow?: unknown;
  imageConfig?: unknown;
}

// 合成 agent 用固定旧时间戳（2020-01-01，远早于任何测试 now 和生产数据），
// 在 recommended/newest 排序里不抢占用户自建 agent 的位置。
const STABLE_OLD_TS = Date.parse("2020-01-01T00:00:00.000Z");

/** 可合成范围：catalog 里 group=public 且未 retired 的条目，按 id 索引。 */
const SYNTHESIZABLE_PUBLIC_ENTRIES = new Map(
  BUILTIN_AGENT_CATALOG.filter(
    (entry) => entry.group === "public" && !isRetiredCatalogEntry(entry),
  ).map((entry) => [entry.id, entry]),
);

/**
 * 某个 catalog id 是否属于「可合成的 public 条目」。
 * retired / internal / builtin / 未知 id 一律 false。
 */
export function isSynthesizablePublicAgentId(
  id: string | null | undefined,
): id is string {
  return !!id && SYNTHESIZABLE_PUBLIC_ENTRIES.has(id);
}

/**
 * `agent-pub-<catalogId>` → 可合成的 catalog 条目；其它任何形态（用户自建、
 * builtin、retired、未知 id、非 agent-pub 前缀）一律 null。
 */
export function resolveSynthesizablePublicEntry(
  agentKey: string | null | undefined,
): BuiltinAgentCatalogEntry | null {
  if (typeof agentKey !== "string" || !agentKey) return null;
  const id = parsePublicAgentId(agentKey);
  if (!id) return null;
  return SYNTHESIZABLE_PUBLIC_ENTRIES.get(id) ?? null;
}

/**
 * 用 catalog 条目合成一条最小 public agent 记录。
 *
 * 形态真值：运行时字段（name / provider / model / publishedAt）取 catalog，
 * 内容字段（introduction / greeting / prompt / tools / tags）取 seed，由
 * `applyPublicAgentCatalogOverride` 统一套用——所以「广场列表里的合成项」与
 * 「单条读端点兜底返回的记录」逐字段一致（同一个函数，不存在第二份）。
 */
export function synthesizePublicAgentFromCatalogEntry(
  entry: BuiltinAgentCatalogEntry,
): SynthesizedPublicAgent {
  const base = {
    dbKey: publicAgentKey(entry.id),
    id: entry.id,
    name: entry.name,
    provider: entry.provider,
    model: entry.model,
    apiSource: entry.apiSource ?? "platform",
    useServerProxy: entry.useServerProxy ?? true,
    isPublic: true as const,
    userId: "system",
    tools: [],
    tags: [],
    createdAt: STABLE_OLD_TS,
    updatedAt: STABLE_OLD_TS,
    ...(entry.hasImageOutput != null
      ? { hasImageOutput: entry.hasImageOutput }
      : {}),
    ...(entry.imageModel ? { imageModel: entry.imageModel } : {}),
    ...(entry.imageWorkflow ? { imageWorkflow: entry.imageWorkflow } : {}),
    ...(entry.imageConfig ? { imageConfig: entry.imageConfig } : {}),
  };
  // 内容字段取 seed（tools/tags 的占位空数组会被 seed 值覆盖）；图片档字段已在
  // 上面按 catalog 写好，override 不碰。
  return applyPublicAgentCatalogOverride(
    base,
    publicAgentKey(entry.id),
  ) as unknown as SynthesizedPublicAgent;
}

/**
 * 按 agentKey 直接合成：`agent-pub-<可合成 catalogId>` → 记录，其余 null。
 * 单条读端点（`database/server/routes/read.ts`）用它做 DB 缺记录时的兜底。
 */
export function synthesizePublicAgentFromKey(
  agentKey: string | null | undefined,
): SynthesizedPublicAgent | null {
  const entry = resolveSynthesizablePublicEntry(agentKey);
  return entry ? synthesizePublicAgentFromCatalogEntry(entry) : null;
}
