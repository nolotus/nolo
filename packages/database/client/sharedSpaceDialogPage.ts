import { normalizeSpaceId } from "database-engine/spaceLinkAccess";

export type SharedSpaceDialogSummary = {
  dbKey: string;
  contentKey: string;
  type: string;
  title: string;
  spaceId: string;
  updatedAt: string | number;
  createdAt: string | number;
  deletedAt?: string | number | null;
  restoredAt?: string | number | null;
  ownerUserId?: string;
};
export type SharedSpaceDialogPageRequest = {
  server: string;
  spaceId: string;
  authToken: string;
  cursor?: string | null;
  limit?: number;
};

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === "string";
const isTimestamp = (value: unknown): value is string | number =>
  typeof value === "number" ? Number.isFinite(value) : isText(value) && value.trim() !== "" && Number.isFinite(Date.parse(value));
const validRecord = (value: unknown): value is SharedSpaceDialogSummary => {
  if (!isObject(value)) return false;
  if (!(isText(value.dbKey) && isText(value.contentKey) && isText(value.type) && isText(value.title) && isText(value.spaceId))) return false;
  if (!isTimestamp(value.updatedAt) || !isTimestamp(value.createdAt)) return false;
  for (const key of ["deletedAt", "restoredAt"]) if (key in value && !(value[key] === null || isTimestamp(value[key]))) return false;
  return !("ownerUserId" in value) || isText(value.ownerUserId);
};

/** 服务端 sharedSpaceDialogPage 的两种 400 用响应体 `error` 字段区分，客户端必须把码带出来供上游分流。 */
export const SERVICE_ERROR_INVALID_SPACE_ID = "Invalid spaceId";
export const SERVICE_ERROR_INVALID_PAGE_REQUEST = "Invalid dialog page request";

/**
 * 把 HTTP 失败响应变成带 `status` 与 `code`（响应体 `error` 字段）的错误。
 * 读不出 body 时只带 status，调用方需按「未知错误」处理而不是猜成某个具体原因。
 */
async function requestError(response: { status: number; json?: () => Promise<unknown> }): Promise<Error & { status?: number; code?: string }> {
  const error: Error & { status?: number; code?: string } = new Error(`Shared Space dialog page request failed: ${response.status}`);
  error.status = response.status;
  try {
    const payload: unknown = await response.json?.();
    if (isObject(payload) && isText(payload.error) && payload.error.trim()) error.code = payload.error;
  } catch { /* body 不是 JSON：保留 status，不臆造 error code。 */ }
  return error;
}

export async function fetchSharedSpaceDialogPage(request: SharedSpaceDialogPageRequest): Promise<{ spaceId: string; records: SharedSpaceDialogSummary[]; nextCursor: string | null }> {
  const { server, authToken, cursor, limit = 50 } = request;
  // 协议层归一化：服务端只接受裸 spaceId（`space-` 前缀会 400），响应里的 data.spaceId
  // 也是裸形态，所以请求路径与响应校验必须用同一个归一化后的值。
  const spaceId = normalizeSpaceId(request.spaceId) ?? "";
  // 归一化后仍无合法 id：不发这次注定 400 的请求，用终态错误（与服务端同一错误码）让上游跳过该来源。
  if (!spaceId) throw Object.assign(new Error("spaceId is required"), { status: 400, code: SERVICE_ERROR_INVALID_SPACE_ID });
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("limit must be between 1 and 100");
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  const response = await fetch(`${server}/api/v1/db/space/${encodeURIComponent(spaceId)}/dialog-page?${params}`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ type: "dialog", summary: true, includeDeleted: true }),
  });
  if (!response.ok) throw await requestError(response);
  const payload: unknown = await response.json();
  if (!isObject(payload) || !isObject(payload.data)) throw new Error("Invalid shared space dialog page response");
  const data = payload.data;
  if (data.spaceId !== spaceId || !Array.isArray(data.records) || !data.records.every(validRecord) || !(data.nextCursor === null || isText(data.nextCursor))) throw new Error("Invalid shared space dialog page shape");
  return { spaceId, records: data.records, nextCursor: data.nextCursor };
}
