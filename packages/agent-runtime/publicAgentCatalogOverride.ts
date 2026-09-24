/**
 * Public catalog agent runtime override — 与 builtin 对称的代码托管真值层。
 *
 * 背景（2026-09-24 内容同源收敛）：catalog（`core/builtinAgentCatalog`）与 seed
 * （`core/publicAgentSeeds`）是平台 public agent 全部字段的唯一真相源，但
 * DB 记录只在播种时落一次内容。Luna 换代（GPT-5.6 → GPT-6）后 catalog/seed 变了，
 * 记录里的 introduction 仍写"GPT-5.6 Luna 公开助手"——广场标题已经是 GPT-6、
 * 简介还说 5.6，chat/agent-run 也直读记录的陈旧内容。本模块把这条漂移封死：
 *
 * - 运行时字段（name / provider / model）以 catalog 为准；
 * - 内容字段（introduction / greeting / prompt / tools / tags）以 seed 为准；
 * - DB 记录只决定「存在性 / 硬 key 可解析」，不再决定平台 agent 的字段真值。
 *
 * 作用域（硬约束）：
 * - 只盖 catalog `group: "public"` 且未 retired 的条目；builtin 6 个走
 *   `applyBuiltinAgentRuntimeOverride`，retired/internal 兼容条目按硬 key 原样
 *   解析（记录值不动，保证对话/自动化链路不断）。
 * - 用户自建 agent（key 不是 `agent-pub-{catalogId}`，或 id 不在 catalog）原样
 *   返回（引用相等），调用方可无条件套用。
 * - 图片档的 imageModel / imageWorkflow / imageConfig 归 catalog 条目字段，
 *   由广场 overlay 既有逻辑负责，本模块不碰，避免 seed 内容层带动图片档。
 *
 * 与 builtin override 的形态差异：builtin 在记录→运行时配置转换**之后**套用
 * （要顺带盖 rawRecord）；本模块在**原始记录**上套用（chatHandler /
 * chatCallPlan / agentLookup / CLI 本地读取都先拿原始记录），因此不需要
 * rawRecord 分支——调用方请传入未经 `resolveAgentRuntimeConfigFromRecord`
 * 转换的原始记录。
 */

import {
  builtinAgentCatalogEntryById,
  isRetiredCatalogEntry,
} from "core/builtinAgentCatalog";
import { PUBLIC_AGENT_DEFS, type AgentSeedConfig } from "core/publicAgentSeeds";
import { parsePublicAgentId, parseSystemAgentId } from "core/prefix";
import { isRecord } from "core/isRecord";

export type PublicAgentCatalogOverride = {
  /** catalog 托管：换代只改 catalog 一行 */
  name: string;
  provider: string;
  model: string;
  /** seed 托管：内容字段 */
  introduction: string;
  greeting: string | { text: string; menu?: unknown[] };
  prompt: string;
  tools: string[];
  tags: string[];
};

/** seed 表按 id 索引（catalog 与 seed 的 id 一致性由 createSpaceAgents.source.test.ts 锁住） */
const SEED_BY_ID = new Map<string, AgentSeedConfig>(
  PUBLIC_AGENT_DEFS.map((seed) => [seed.id, seed as AgentSeedConfig]),
);

/**
 * 从 agentKey 或记录自有字段（dbKey / id）解析 public agent id。
 * - `agent-pub-{id}` → `{id}`（parsePublicAgentId）
 * - 裸 id（记录里的 id 字段就是裸 id，不带前缀）→ 原样返回，交由 catalog 匹配
 * - 其它形态（用户自建 `agent-{userId}-{ref}` 等）→ null
 */
/**
 * 解析「这条记录/这把 key 是否就是平台public 条目本身」，返回 catalog id。
 *
 * 只认两种形态：
 * - `agent-pub-{catalogId}`（公开别名）
 * - `agent-system-{catalogId}`（平台 system 私有副本）
 *
 * **刻意不接受裸 id、也不接受 `agent-{userId}-{id}`。** 2026-09-24 实证：若允许从
 * 记录的 `id` 字段裸匹配，用户 attach 平台 agent 后改过 prompt/tools 的 owner 副本
 * （dbKey 缺失或调用方只传 id 时）会被 seed 真值静默覆盖——"我的 Luna" 变成
 * "GPT-6 Luna"，自定义 prompt 丢失。靠 dbKey 含 userId 前缀来避开只是偶然安全，
  不是守卫。
 */
function toPlatformOwnedCatalogId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parsePublicAgentId(trimmed);
  if (parsed) return parsed;
  const systemId = parseSystemAgentId(trimmed);
  if (systemId) return systemId;
  return null;
}

/**
 * 从记录自有字段里取出「平台自身副本」的 key（原样返回带前缀的 key，不是裸 id）。
 *
 * 只认 `agent-pub-*` / `agent-system-*` 两种形态；`agent-{userId}-{id}`（owner
 * 副本）与用户自建一律返回 null——它们的 id 字段虽然与平台条目相同，但内容是用户
 * 数据，绝不能被 seed 真值覆盖（2026-09-24 实证过的数据丢失场景）。
 */
function readPlatformOwnedKey(record: object): string | null {
  const fields = record as { dbKey?: unknown; id?: unknown };
  for (const value of [fields.dbKey, fields.id]) {
    if (typeof value !== "string") continue;
    if (toPlatformOwnedCatalogId(value) === null) continue;
    return value;
  }
  return null;
}

/**
 * 解析某个 agentKey 对应的 public catalog override 字段。
 * 非 public catalog 条目（builtin / internal / retired / 用户自建 / 无 seed）返回
 * null——调用方应原样使用记录。
 */
export function resolvePublicAgentCatalogOverride(
  agentKey: string | undefined | null,
): PublicAgentCatalogOverride | null {
  const id = toPlatformOwnedCatalogId(agentKey);
  if (!id) return null;
  const entry = builtinAgentCatalogEntryById(id);
  if (!entry) return null;
  // retired 条目（含 internal 兼容组）不盖字段：退场 ≠ 删记录，硬 key 仍要按
  // 记录原值可解析（Space contentKey / dialog primaryAgentKey / automation
  // ownerAgentKey 都指着它）。
  if (entry.group !== "public" || isRetiredCatalogEntry(entry)) return null;
  const seed = SEED_BY_ID.get(entry.id);
  if (!seed) return null;
  return {
    name: entry.name,
    provider: entry.provider,
    model: entry.model,
    introduction: seed.introduction,
    greeting: seed.greeting,
    prompt: seed.prompt,
    tools: [...seed.tools],
    tags: [...seed.tags],
  };
}

/**
 * greeting 写回规则：按记录原字段形态。
 * - 记录是对象结构（可能带 menu）→ 保留对象形态，只把 text 换成 seed 文案；
 * - 记录是字符串 → 写 seed 文案字符串；
 * - 记录缺失 → 用 seed 原生形态（对象留对象）。
 * 记录出现意外形态时不动它，避免把脏数据形状固化下去。
 */
function overlayGreeting(
  recordGreeting: unknown,
  seedGreeting: string | { text: string; menu?: unknown[] },
): unknown {
  const seedText =
    typeof seedGreeting === "string"
      ? seedGreeting
      : isRecord(seedGreeting)
        ? (seedGreeting as { text?: unknown }).text
        : undefined;
  if (typeof seedText !== "string" || !seedText) return recordGreeting;
  if (isRecord(recordGreeting)) {
    return { ...recordGreeting, text: seedText };
  }
  if (recordGreeting === undefined || recordGreeting === null) {
    return seedGreeting;
  }
  if (typeof recordGreeting === "string") {
    return seedText;
  }
  return recordGreeting;
}

/**
 * 把 catalog+seed 的真值盖到一条（原始形态的）public catalog agent 记录上。
 *
 * - 非 public catalog 条目：引用相等原样返回，可无条件套用；
 * - public catalog 条目：name/provider/model 取 catalog，introduction/greeting/
 *   prompt/tools/tags 取 seed；其余字段（apiSource / useServerProxy / 价格 /
 *   userId / 图片档字段 / references …）一律不碰——凭据与计费语义仍归记录。
 *
 * `agentKey` 可显式传入（调用方手里有可靠 key 时）；显式 key 未命中时回落为
 * 从记录的 dbKey/id 自解析（CLI 本地读取按别名 key 命中记录时走这条）。
 */
export function applyPublicAgentCatalogOverride<T extends object>(
  record: T,
  agentKey?: string,
): T {
  // 显式 agentKey 优先；未命中（或调用方没给）时从记录自有 dbKey/id 再解析
  // 一次——CLI 本地读取按别名 key 命中记录时，key 本身不是 agent-pub-* 形态。
  const override =
    resolvePublicAgentCatalogOverride(agentKey) ??
    resolvePublicAgentCatalogOverride(readPlatformOwnedKey(record));
  if (!override) return record;

  const current = record as Record<string, unknown>;
  const greeting = overlayGreeting(current.greeting, override.greeting);
  return {
    ...record,
    name: override.name,
    provider: override.provider,
    model: override.model,
    introduction: override.introduction,
    prompt: override.prompt,
    tools: [...override.tools],
    tags: [...override.tags],
    ...(greeting !== undefined ? { greeting } : {}),
  };
}
