// packages/create/space/useCurrentSpaceFromEntity.ts
//
// React hook that resolves the current space from module store + Redux db
// entities. Split out of spaceCurrentSelectors.ts: that file is imported by
// dependency-free selector consumers (including CLI/agent code paths), and the
// react-redux import here would drag React/Redux into their static graph.
//
// The non-React half (`getCurrentSpace`) stays in spaceCurrentSelectors.ts.

import { useSelector } from "react-redux";
import { selectEntities } from "database/dbSlice";
import type { SpaceData } from "app/types";

import { getCurrentSpace } from "./spaceCurrentSelectors";
import { useStoreSnapshot } from "./spaceCurrentStore";

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
