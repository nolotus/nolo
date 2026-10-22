import { matchesNavigationScope, type NavigationScope } from "./navigationQuery";

/**
 * A Work target is an authorized list projection, not an execution context.
 * Project memberships are separate from Space membership and neither is required.
 */
export type WorkTarget = {
  key: string;
  kind: "dialog" | "project";
  spaceId?: string | null;
  projectId?: string | null;
  updatedAt: number;
  needsUser?: boolean;
  running?: boolean;
};

/** Apply a navigation filter only after the caller has established visibility. */
export function projectScopedWorkTargets<T extends WorkTarget>(
  authorizedTargets: readonly T[],
  scope: NavigationScope,
): { needsYou: T[]; working: T[]; recent: T[] } {
  const visible = authorizedTargets.filter((target) =>
    scope.kind === "project" && target.kind === "project"
      ? target.key === scope.projectId
      : matchesNavigationScope(scope, target));
  const byKey = new Map<string, T>();
  for (const target of visible) {
    if (!target.key.trim()) continue;
    const existing = byKey.get(target.key);
    if (!existing) {
      byKey.set(target.key, target);
    } else {
      // Multiple authorized projections may describe one dialog. Preserve action and
      // running evidence even when an older row contains the relevant signal.
      const latest = target.updatedAt > existing.updatedAt ? target : existing;
      byKey.set(target.key, {
        ...latest,
        updatedAt: Math.max(existing.updatedAt, target.updatedAt),
        needsUser: existing.needsUser === true || target.needsUser === true,
        running: existing.running === true || target.running === true,
      });
    }
  }
  const groups = { needsYou: [] as T[], working: [] as T[], recent: [] as T[] };
  for (const target of byKey.values()) {
    if (target.kind === "dialog" && target.needsUser) groups.needsYou.push(target);
    else if (target.kind === "dialog" && target.running) groups.working.push(target);
    else groups.recent.push(target);
  }
  const sort = (a: T, b: T) => b.updatedAt - a.updatedAt || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  groups.needsYou.sort(sort);
  groups.working.sort(sort);
  groups.recent.sort(sort);
  return groups;
}
