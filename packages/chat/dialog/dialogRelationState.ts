// packages/chat/dialog/dialogRelationState.ts
// 纯函数层：父子对话关系的判定与投影（不碰网络 / store / React）。
//
// 身份安全模型：
//   - 只用显式关系字段（parentDialogId / parentThreadId）判定父子，
//     绝不靠标题 / 名称 / agent 相似度猜父。
//   - 对话 key 形如 `dialog-<userId>-<dialogId>`，其中 dialogId 本身可能含连字符；
//     因此只在「已知 owner」时按前缀精确裁剪，绝不按 '-' 切分丢掉后缀。
//   - 父对话不在可见摘要范围内 → unknown（渲染为「关系未知」），不生成死链。

import { buildDialogKey } from "database/dialogKey";
import { asOptionalTrimmedString } from "core/optionalString";

export type ParentRelationStatus =
  /** 当前对话没有父。 */
  | "none"
  /** parentDialogId 指向自身（脏数据），不可链接。 */
  | "self"
  /** 已定位父对话（标题可能缺失）。 */
  | "resolved"
  /** 父未加载 / 未授权 / 不在可见摘要内 → 不生成死链。 */
  | "unknown";

export type ParentRelation = {
  status: ParentRelationStatus;
  /** 父对话裸 id。 */
  parentDialogId: string | null;
  /** 父对话标题（来自摘要真实字段，不猜测）。 */
  parentTitle: string | null;
  /** 父对话完整 key。 */
  parentDialogKey: string | null;
  /** 父对话自身所属 space（不把子对话的 space 强加给父）。 */
  parentSpaceId: string | null;
};

/**
 * 归一化对话 id：
 *   - 已知 owner 时裁掉 `dialog-<owner>-` 前缀（dialogId 内的连字符保留）；
 *   - owner 不明而值像完整 key → 不可判定（null），不猜、不切分；
 *   - 裸 id 原样返回。
 */
export const normalizeDialogId = (
  value: unknown,
  ownerId?: string | null,
): string | null => {
  const trimmed = asOptionalTrimmedString(value as string | null | undefined);
  if (!trimmed) return null;
  const owner = asOptionalTrimmedString(ownerId);
  if (owner) {
    const prefix = `dialog-${owner}-`;
    if (trimmed.startsWith(prefix)) {
      const rest = trimmed.slice(prefix.length).trim();
      return rest ? rest : null;
    }
  }
  if (trimmed.startsWith("dialog-")) return null;
  return trimmed;
};

/** owner 已知时构造完整 key（dialogId 内的连字符保留）。 */
export const buildOwnedDialogKey = (
  ownerId: string | null | undefined,
  dialogId: string | null | undefined,
): string | null => {
  const owner = asOptionalTrimmedString(ownerId);
  const id = asOptionalTrimmedString(dialogId);
  if (!owner || !id) return null;
  return buildDialogKey(owner, id);
};

export type ParentSummaryItem = {
  contentKey: string;
  title?: string;
  spaceId?: string | null;
  userId?: string;
  dialogId?: string;
};

/** 把任意摘要条目收敛成判定父关系所需的最小字段（运行期校验，不做类型断言）。 */
export const toParentSummaryItems = (
  items: readonly unknown[] | null | undefined,
): ParentSummaryItem[] => {
  const result: ParentSummaryItem[] = [];
  for (const item of items ?? []) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const contentKey =
      asOptionalTrimmedString(record.contentKey) ??
      asOptionalTrimmedString(record.dbKey);
    if (!contentKey) continue;
    const userId = asOptionalTrimmedString(record.userId) ?? undefined;
    // dialogId 只在已知 owner 时按前缀裁剪（保留 id 内的连字符）。
    const dialogId =
      asOptionalTrimmedString(record.dialogId) ??
      (userId ? normalizeDialogId(contentKey, userId) ?? undefined : undefined);
    result.push({
      contentKey,
      title: asOptionalTrimmedString(record.title) ?? undefined,
      spaceId:
        typeof record.spaceId === "string" && record.spaceId.trim()
          ? record.spaceId.trim()
          : null,
      userId,
      dialogId,
    });
  }
  return result;
};

export type ParentDialogSummary = {
  title: string | null;
  /** 父对话自身所属 space。 */
  spaceId: string | null;
  dialogKey: string | null;
};

/**
 * 在轻量摘要里找父对话：只按 owner + 裸 dialogId 精确匹配，
 * 绝不按标题匹配，也不跨 owner 匹配。
 */
export const findParentDialogSummary = (
  items: readonly ParentSummaryItem[] | null | undefined,
  args: { ownerId: string | null | undefined; parentDialogId: string | null | undefined },
): ParentDialogSummary | null => {
  const owner = asOptionalTrimmedString(args.ownerId);
  const parentId = asOptionalTrimmedString(args.parentDialogId);
  if (!owner || !parentId) return null;
  const expectedKey = buildOwnedDialogKey(owner, parentId);
  for (const item of items ?? []) {
    const matchesKey = expectedKey !== null && item.contentKey === expectedKey;
    const matchesIds =
      item.userId === owner && item.dialogId === parentId;
    if (!matchesKey && !matchesIds) continue;
    return {
      title: asOptionalTrimmedString(item.title) ?? null,
      spaceId: item.spaceId ?? null,
      dialogKey: expectedKey ?? item.contentKey,
    };
  }
  return null;
};

/**
 * 父关系判定。
 * summary 为 null 表示「父不在可见摘要里」→ unknown（不生成死链）。
 */
export const resolveParentRelation = (args: {
  selfDialogId?: string | null;
  parentDialogId?: unknown;
  ownerId?: string | null;
  summary?: ParentDialogSummary | null;
}): ParentRelation => {
  const owner = asOptionalTrimmedString(args.ownerId);
  const selfId = normalizeDialogId(args.selfDialogId, owner);
  const parentId = normalizeDialogId(args.parentDialogId, owner);
  if (!parentId) {
    return {
      status: "none",
      parentDialogId: null,
      parentTitle: null,
      parentDialogKey: null,
      parentSpaceId: null,
    };
  }
  if (selfId && parentId === selfId) {
    return {
      status: "self",
      parentDialogId: null,
      parentTitle: null,
      parentDialogKey: null,
      parentSpaceId: null,
    };
  }
  const summary = args.summary ?? null;
  if (!summary || !summary.dialogKey) {
    return {
      status: "unknown",
      parentDialogId: parentId,
      parentTitle: null,
      parentDialogKey: null,
      parentSpaceId: null,
    };
  }
  return {
    status: "resolved",
    parentDialogId: parentId,
    parentTitle: summary.title,
    parentDialogKey: summary.dialogKey,
    parentSpaceId: summary.spaceId,
  };
};

export type ChildDialogLink = {
  /** 子对话完整 key。 */
  dialogKey: string;
  /** 子对话裸 id。 */
  dialogId: string;
};

/**
 * 从线程摘要里取可进入的子对话 key。
 * 只有 key 属于当前 owner 时才可进入（避免跨账号死链）。
 */
export const resolveChildDialogLink = (
  thread: { dialogKey?: string | null; dialogId?: string | null } | null | undefined,
  ownerId: string | null | undefined,
): ChildDialogLink | null => {
  const owner = asOptionalTrimmedString(ownerId);
  const key = asOptionalTrimmedString(thread?.dialogKey);
  if (!owner || !key) return null;
  const prefix = `dialog-${owner}-`;
  if (!key.startsWith(prefix)) return null;
  const dialogId = key.slice(prefix.length).trim();
  if (!dialogId) return null;
  return { dialogKey: key, dialogId };
};
