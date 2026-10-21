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

export async function fetchSharedSpaceDialogPage(request: SharedSpaceDialogPageRequest): Promise<{ spaceId: string; records: SharedSpaceDialogSummary[]; nextCursor: string | null }> {
  const { server, spaceId, authToken, cursor, limit = 50 } = request;
  if (!spaceId.trim()) throw new Error("spaceId is required");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("limit must be between 1 and 100");
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  const response = await fetch(`${server}/api/v1/db/space/${encodeURIComponent(spaceId)}/dialog-page?${params}`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ type: "dialog", summary: true, includeDeleted: true }),
  });
  if (!response.ok) { const error = new Error(`Shared Space dialog page request failed: ${response.status}`); (error as Error & { status?: number }).status = response.status; throw error; }
  const payload: unknown = await response.json();
  if (!isObject(payload) || !isObject(payload.data)) throw new Error("Invalid shared space dialog page response");
  const data = payload.data;
  if (data.spaceId !== spaceId || !Array.isArray(data.records) || !data.records.every(validRecord) || !(data.nextCursor === null || isText(data.nextCursor))) throw new Error("Invalid shared space dialog page shape");
  return { spaceId, records: data.records, nextCursor: data.nextCursor };
}
