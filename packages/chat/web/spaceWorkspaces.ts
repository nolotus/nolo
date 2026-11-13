/** Device-local only. Never copy these paths into shared Space records. */
export const SPACE_WORKSPACES_KEY = "nolo:space-workspaces:v1";
export const SPACE_WORKSPACES_CHANGED = "nolo:space-workspaces:changed";
type Reader = Pick<Storage, "getItem">;
type Writer = Reader & Pick<Storage, "setItem">;
const isAbsolutePath = (value: unknown): value is string =>
  typeof value === "string" && /^(\/|[A-Za-z]:[\\/]|\\\\[^\\]+\\)/.test(value.trim());

function readAll(storage: Reader, userId?: string | null): Record<string, string> {
  if (!userId) return Object.create(null);
  const raw = storage.getItem(SPACE_WORKSPACES_KEY);
  if (!raw) return Object.create(null);
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return Object.create(null);
    const record = value as { userId?: unknown; folders?: unknown };
    if (record.userId !== userId || !record.folders || typeof record.folders !== "object" || Array.isArray(record.folders)) return Object.create(null);
    return Object.fromEntries(Object.entries(record.folders).filter(([, path]) => isAbsolutePath(path)));
  } catch { return Object.create(null); }
}
export function readSpaceWorkspaceFolder(storage: Reader, spaceId?: string | null, userId?: string | null): string | null {
  if (!spaceId) return null;
  const paths = readAll(storage, userId);
  return Object.hasOwn(paths, spaceId) ? paths[spaceId]!.trim() : null;
}
function save(storage: Writer, paths: Record<string, string>, spaceId: string, userId: string) {
  storage.setItem(SPACE_WORKSPACES_KEY, JSON.stringify({ userId, folders: paths }));
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SPACE_WORKSPACES_CHANGED, { detail: { spaceId } }));
}
export function writeSpaceWorkspaceFolder(storage: Writer, spaceId: string, path: string, userId: string): void {
  if (!userId || !spaceId || !isAbsolutePath(path)) throw new Error("请选择绝对路径的文件夹");
  save(storage, { ...readAll(storage, userId), [spaceId]: path.trim() }, spaceId, userId);
}
export function clearSpaceWorkspaceFolder(storage: Writer, spaceId: string, userId: string): void {
  const paths = readAll(storage, userId);
  delete paths[spaceId];
  save(storage, paths, spaceId, userId);
}

/** Used by mounted cwd consumers as well as the settings UI. */
export function subscribeSpaceWorkspaces(listener: () => void, target: Window = window): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SPACE_WORKSPACES_KEY || event.key === null) listener();
  };
  target.addEventListener(SPACE_WORKSPACES_CHANGED, listener);
  target.addEventListener("storage", onStorage);
  return () => {
    target.removeEventListener(SPACE_WORKSPACES_CHANGED, listener);
    target.removeEventListener("storage", onStorage);
  };
}
export function clearAuthSpaceWorkspaces(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(SPACE_WORKSPACES_KEY);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SPACE_WORKSPACES_CHANGED));
}
