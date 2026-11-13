import { noloQueryRequest } from "./queryRequest";
import { buildDialogKey, parseDialogKey } from "database/dialogKey";

export type OwnedDialogPageRequest = {
  server: string;
  userId: string;
  authToken?: string | null;
  cursor?: string | null;
  limit?: number;
};
export type OwnedDialogSummary = {
  dbKey?: string;
  contentKey?: string;
  type?: string;
  spaceId?: string | null;
  updatedAt?: string | number;
  title?: string;
  deletedAt?: string | number | null;
  restoredAt?: string | number | null;
  status?: "pending" | "running" | "done" | "completed" | "failed" | "cancelled" | null;
  unreadAt?: number | null;
  /** 记录里的裸 id（服务端对话记录的 id 字段）。 */
  id?: string;
  /** 归属用户 id（服务端对话记录的 userId 字段）。 */
  userId?: string;
  /** 父对话裸 id：父子关系接线用。 */
  parentDialogId?: string;
  /** 根对话裸 id。 */
  rootDialogId?: string;
  /**
   * 与 contentKey 自洽的显式对话身份（bare id）。
   * 只有 owner + 裸 id 能重建出同一个 contentKey 时才会写进来。
   */
  dialogId?: string;
};

const trimmed = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/**
 * 把服务端 owned dialog 记录投影成携带血缘与显式身份的摘要。
 *
 * 服务端在 dialogPage 模式（`dialogPage=1`）下返回的是**完整记录**而不是
 * summary 投影（见 server/routes/query.ts 的 dialogPageMode 分支），所以
 * `id` / `userId` / `parentDialogId` / `rootDialogId` 都在响应里，客户端必须
 * 真的把它们取出来，否则父子关系在远端记录上永远是「父未载入」的 fallback。
 *
 * 显式身份只在自洽时写入：owner + 裸 id 必须能重建出同一个 contentKey。
 * 不自洽就留空，让下游退回 contentKey 解析，而不是写出自相矛盾的身份。
 */
export const toOwnedDialogSummary = (raw: unknown): OwnedDialogSummary | null => {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const contentKey = trimmed(record.contentKey);
  const dbKey = trimmed(record.dbKey);
  if (!contentKey && !dbKey) return null;

  const parsed = contentKey ? parseDialogKey(contentKey) : null;
  const owner = trimmed(record.userId) ?? parsed?.userId;
  const bareIdCandidates = [trimmed(record.id), parsed?.dialogId];
  const bareId = owner && contentKey
    ? bareIdCandidates.find((candidate) => candidate && buildDialogKey(owner, candidate) === contentKey)
    : undefined;

  return {
    ...record,
    ...(dbKey ? { dbKey } : {}),
    ...(contentKey ? { contentKey } : {}),
    type: trimmed(record.type) ?? "dialog",
    userId: bareId ? owner : undefined,
    dialogId: bareId,
    parentDialogId: trimmed(record.parentDialogId),
    rootDialogId: trimmed(record.rootDialogId),
  } as OwnedDialogSummary;
};

/**
 * Reads the opt-in listing endpoint. This fetches user-owned dialogs only.
 * Shared Space content and device-local dialogs require separate aggregation.
 */
export async function fetchOwnedDialogPage(
  request: OwnedDialogPageRequest,
): Promise<{ records: OwnedDialogSummary[]; nextCursor: string | null }> {
  const { server, userId, authToken, cursor, limit = 50 } = request;
  if (!userId.trim()) throw new Error("userId is required");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error(`limit must be between 1 and 100`);
  }
  const response = await noloQueryRequest({
    server,
    queryUserId: userId,
    authToken,
    options: {
      limit,
      condition: { type: "dialog", summary: true, includeDeleted: true },
      dialogPageCursor: cursor || null,
      dialogPage: true,
    },
  });
  if (!response.ok) throw new Error(`Dialog page request failed: ${response.status}`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new Error("Invalid dialog page response");
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") throw new Error("Missing dialog page data");
  const result = data as { data?: unknown; nextCursor?: unknown };
  if (!Array.isArray(result.data) ||
      !(result.nextCursor === null || typeof result.nextCursor === "string")) {
    throw new Error("Invalid dialog page shape");
  }
  const records = result.data
    .map((entry) => toOwnedDialogSummary(entry))
    .filter((entry): entry is OwnedDialogSummary => entry !== null);
  return { records, nextCursor: result.nextCursor };
}
