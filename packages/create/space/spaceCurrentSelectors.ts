// Redux/entity adapter for the Redux-free current-space store.
// Kept separate from spaceCurrentStore.ts so the state container remains
// statically analyzable and free of React/Redux import cycles.

import { useSelector } from "react-redux";
import { selectEntities } from "database/dbSlice";
import { createSpaceKey } from "./spaceKeys";
import {
  getCurrentSpaceId,
  getCurrentSpaceRaw,
  getViewMode,
  useStoreSnapshot,
} from "./spaceCurrentStore";
import type { SpaceData } from "app/types";

const getSpaceUpdatedAt = (space: any): number =>
  space ? Number(space.updatedAt) || 0 : 0;

/**
 * Resolve current space with entity fallback.
 * Accepts entities as parameter so it can be called from both React and
 * non-React contexts.
 */
export function getCurrentSpace(
  entities: Record<string, any>,
): SpaceData | null {
  const spaceId = getCurrentSpaceId();
  if (!spaceId) return null;

  const stored = getCurrentSpaceRaw();
  const entity = entities[createSpaceKey.space(spaceId)] as SpaceData | undefined;
  if (!stored) return entity ?? null;
  if (!entity) return stored;
  return getSpaceUpdatedAt(entity) > getSpaceUpdatedAt(stored) ? entity : stored;
}

/**
 * Convenience hook: reads both module store (currentSpace state) and
 * Redux (db entities) to resolve current space with entity fallback.
 * Replaces useAppSelector(selectCurrentSpace) in consumers that don't
 * already subscribe to entities.
 */
export function useCurrentSpaceFromEntity(): SpaceData | null {
  useStoreSnapshot();
  const entities = useSelector(selectEntities as (state: any) => Record<string, any>);
  return getCurrentSpace(entities);
}
// ===== Wave E: 从已删除的 spaceSlice 迁入的过渡 selector =====
// These are deliberately plain functions, not memoized selectors.
// A memoized createSelector cannot observe module-store changes because
// the Redux input object never changes — it would return stale values.
// New code should import directly from the owning module store.

export const selectCurrentSpaceId = (_state?: unknown): string | null =>
  getCurrentSpaceId();

export const selectCurrentSpace = (state: any): any =>
  getCurrentSpace(selectEntities(state));

export const selectSpaceById = (state: any, spaceId?: string | null) => {
  if (!spaceId) return null;
  return selectEntities(state)[createSpaceKey.space(spaceId)] || null;
};

export const selectViewMode = (_state?: unknown) => getViewMode();

export const selectDialogStatusFromEntity =
  (dialogKey: string) =>
  (state: any) =>
    (selectEntities(state)[dialogKey] as { status?: string })?.status;

export const selectIsDialogUnreadFromEntity =
  (dialogKey: string) =>
  (state: any) => {
    const entity = selectEntities(state)[dialogKey] as
      | { unreadAt?: number | null }
      | undefined;
    return typeof entity?.unreadAt === "number" && entity.unreadAt > 0;
  };
