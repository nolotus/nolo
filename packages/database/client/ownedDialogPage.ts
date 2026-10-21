import { noloQueryRequest } from "./queryRequest";

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
    throw new Error("limit must be between 1 and 100");
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
  return { records: result.data as OwnedDialogSummary[], nextCursor: result.nextCursor };
}
