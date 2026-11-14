import type { MyContentListItem } from "app/utils/myContentItems";
import { normalizeSpaceId } from "database-engine/spaceLinkAccess";
import { dialogsForLocalProject } from "./homeLocalProjectDialogs";

/** Home scope is a read-only list projection. Never change a Dialog's cwd here. */
export type HomeScope =
  | { kind: "all" }
  | { kind: "project"; projectId: string; projectName?: string }
  | { kind: "noSpace" };
export function projectHomeItems(
  items: readonly MyContentListItem[], userId: string,
  scope: HomeScope, bindings: Readonly<Record<string, unknown>>,
): readonly MyContentListItem[] {
  if (scope.kind === "all") return items;
  if (scope.kind === "noSpace") {
    return items.filter((item) => !normalizeSpaceId(item.spaceId));
  }
  return dialogsForLocalProject(items, userId, scope.projectId, bindings);
}
