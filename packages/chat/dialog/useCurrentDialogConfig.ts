// React hook for the active dialog config (Wave13).
// Kept out of dialogSlice.ts to avoid dialogSlice → app/store → reducer → dialogSlice cycles.

import type { DialogConfig } from "app/types";
import { useAppSelector } from "app/store";
import { selectById } from "database/dbSlice";
import { useCurrentDialogKey } from "./dialogRuntimeStore";

/**
 * Subscribe to the active dialog key (module store) and the matching db entity
 * (Redux). `useAppSelector(selectCurrentDialogConfig)` alone misses re-renders
 * when only the active key changes.
 */
export function useCurrentDialogConfig(): DialogConfig | null {
  const key = useCurrentDialogKey();
  return useAppSelector((state: any) =>
    key ? (selectById(state, key) as DialogConfig | null) : null
  );
}
