import type { MyContentListItem } from "app/utils/myContentItems";
import { parseDialogKey } from "database/dialogKey";

/** Device-local association is a Home Project scope, never a Space membership. */
export function dialogsForLocalProject(
  items: readonly MyContentListItem[],
  userId: string,
  projectId: string,
  bindings: Readonly<Record<string, unknown>>,
): MyContentListItem[] {
  if (!userId || !projectId) return [];
  return items.filter((item) => {
    if (item.type !== "dialog") return false;
    const parsed = parseDialogKey(item.contentKey);
    return parsed?.userId === userId && bindings[item.contentKey] === projectId;
  }).sort((a, b) => Date.parse(String(b.updatedAt)) - Date.parse(String(a.updatedAt)));
}
export function parseLocalDialogProjectBindings(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown> : {};
  } catch { return {}; }
}
