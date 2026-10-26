// packages/ai/agent/publicAgentAuthorName.ts
//
// 公开 agent 的「作者名快照」：发布 / 更新公开副本时把当前用户的显示名写进
// 记录本身（`authorName` 字段），而不是让列表页去 join 用户资料。
//
// 为什么是快照而不是 join：
// - 公开列表（explore 创作者目录、agent 卡片）一次可能覆盖几百条记录、多个创作者，
//   join 用户资料意味着 N 次额外读请求或一个跨用户批量读端点；
// - 服务端 getPublicAgents 返回的记录里没有用户名，summary 白名单也只透出记录自带的
//   字段，快照字段是唯一能「纯加法」透出的形态；
// - 代价是改名后存量记录仍显示旧名——由 scripts/ops/backfillAgentAuthorName.ts
//   提供显式回填（默认 dry-run）。

import { createUserKey } from "database/keys";
import { asOptionalTrimmedString } from "core/optionalString";
import { isRecord } from "core/isRecord";

/** 公开 agent 记录上的作者名快照字段名。 */
export const AUTHOR_NAME_FIELD = "authorName" as const;

/** 快照名字长度上限：目录卡片单行展示，过长会被截断，没必要存全文。 */
export const AUTHOR_NAME_MAX_LENGTH = 40;

/** 用户资料里可用于展示的名字字段（与 resolveAgentCreatorSummary 同级口径）。 */
export interface AuthorProfileLike {
  nickname?: unknown;
  name?: unknown;
  username?: unknown;
}

const clampName = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > AUTHOR_NAME_MAX_LENGTH
    ? trimmed.slice(0, AUTHOR_NAME_MAX_LENGTH)
    : trimmed;
};

/**
 * 从用户资料解析可展示的作者名。
 *
 * 顺序：nickname（用户自己起的展示名）→ name → username。
 * 三者都没有（或全是空白）时返回 undefined——调用方不得编造名字，回退到 userId 短码。
 */
export function resolveAuthorNameFromProfile(
  profile: unknown,
): string | undefined {
  if (!isRecord(profile)) return undefined;
  const record = profile as AuthorProfileLike;
  const nickname = asOptionalTrimmedString(record.nickname);
  if (nickname) return clampName(nickname);
  const name = asOptionalTrimmedString(record.name);
  if (name) return clampName(name);
  const username = asOptionalTrimmedString(record.username);
  if (username) return clampName(username);
  return undefined;
}

/** 只支持 get 的最小 DB 形状（便于单测注入）。 */
export interface AuthorNameProfileDb {
  get(key: string): Promise<unknown>;
}

/**
 * 读取某用户的作者名快照。任何失败（无本地库、资料缺失、读取异常）都返回
 * undefined——快照是尽力而为的附加字段，绝不能阻塞发布写入。
 */
export async function readAuthorNameSnapshot(
  db: AuthorNameProfileDb | null | undefined,
  userId: string | undefined,
): Promise<string | undefined> {
  const owner = asOptionalTrimmedString(userId);
  if (!db || !owner) return undefined;
  try {
    const profile = await db.get(createUserKey.profile(owner));
    return resolveAuthorNameFromProfile(profile);
  } catch {
    return undefined;
  }
}

/**
 * 给公开副本挂上作者名快照：解析不到名字时保持记录原样（不写空字段、
 * 不覆盖记录里可能已有的快照）。
 */
export function withAuthorNameSnapshot<T extends Record<string, unknown>>(
  record: T,
  authorName: string | undefined,
): T {
  const name = asOptionalTrimmedString(authorName);
  if (!name) return record;
  return { ...record, [AUTHOR_NAME_FIELD]: name };
}
