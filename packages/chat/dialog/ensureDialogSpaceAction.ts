import type { RootState } from "app/store";
import type { DialogConfig, SpaceData } from "app/types";
import {
  changeSpace,
} from "create/space/spaceThunks";
import { getAllMemberSpaces } from "create/space/spaceMembershipStore";
import { createSpaceKey, normalizeSpaceId } from "create/space/spaceKeys";
import {
  patch,
  readAndWait,
  selectById,
  selectEntities,
} from "database/dbSlice";
import { getCurrentSpaceId } from "create/space/spaceCurrentStore";
import { selectCurrentSpace } from "create/space/spaceCurrentSelectors";

const ENSURE_SPACE_DEBUG = false;
const logEnsureDialogSpace = (
  message: string,
  details?: Record<string, unknown>
) => {
  if (!ENSURE_SPACE_DEBUG) return;
  if (details) {
    console.info(`[ensureDialogSpace] ${message}`, details);
    return;
  }
  console.info(`[ensureDialogSpace] ${message}`);
};

const normalizeMaybeSpaceId = (spaceId?: string | null): string | null => {
  if (!spaceId) return null;
  const normalized = normalizeSpaceId(spaceId);
  return normalized || null;
};

const spaceContainsContentKey = (
  spaceData: Partial<SpaceData> | null | undefined,
  contentKey: string
): boolean => {
  if (!spaceData?.contents) return false;
  return (
    Object.prototype.hasOwnProperty.call(spaceData.contents, contentKey) &&
    spaceData.contents[contentKey] !== null
  );
};

const getSpaceIdFromSpaceData = (
  spaceData: (Partial<SpaceData> & { dbKey?: string }) | null | undefined
): string | null => {
  if (typeof spaceData?.id === "string" && spaceData.id) {
    return normalizeSpaceId(spaceData.id);
  }
  if (
    typeof spaceData?.dbKey === "string" &&
    spaceData.dbKey.startsWith("space-") &&
    spaceData.dbKey.split("-").length === 2
  ) {
    return normalizeSpaceId(spaceData.dbKey);
  }
  return null;
};

const findLoadedSpaceIdForDialog = (
  state: RootState,
  dialogKey: string
): string | null => {
  if (spaceContainsContentKey(selectCurrentSpace(state), dialogKey)) {
    return getSpaceIdFromSpaceData(selectCurrentSpace(state));
  }

  const entities = selectEntities(state);
  for (const entity of Object.values(entities)) {
    if (!entity || typeof entity !== "object") continue;
    const maybeSpace = entity as Partial<SpaceData> & { dbKey?: string };
    if (
      typeof maybeSpace.dbKey !== "string" ||
      !maybeSpace.dbKey.startsWith("space-") ||
      maybeSpace.dbKey.split("-").length !== 2
    ) {
      continue;
    }
    if (spaceContainsContentKey(maybeSpace, dialogKey)) {
      return getSpaceIdFromSpaceData(maybeSpace);
    }
  }

  return null;
};

export const ensureDialogSpaceAction =
  (dialogKey: string, preferredSpaceId?: string | null) =>
  async (dispatch: any, getState: () => RootState): Promise<string | null> => {
    logEnsureDialogSpace("Start", { dialogKey });
    const state = getState();
    const dialogConfig = selectById(state, dialogKey) as DialogConfig | null;

    if (!dialogConfig) {
      logEnsureDialogSpace("Dialog not in store after initDialog", {
        dialogKey,
      });
    }

    const normalizedPreferredSpaceId = normalizeMaybeSpaceId(preferredSpaceId);
    let resolvedSpaceId =
      normalizedPreferredSpaceId ?? normalizeMaybeSpaceId(dialogConfig?.spaceId);

    logEnsureDialogSpace("Initial candidate evaluated", {
      dialogKey,
      preferredSpaceId: normalizedPreferredSpaceId,
      dialogSpaceId: normalizeMaybeSpaceId(dialogConfig?.spaceId),
      resolvedSpaceId,
    });

    if (!resolvedSpaceId) {
      resolvedSpaceId = findLoadedSpaceIdForDialog(state, dialogKey);
      logEnsureDialogSpace("Checked loaded spaces", {
        dialogKey,
        resolvedSpaceId,
      });
    }

    if (!resolvedSpaceId) {
      const memberSpaces = getAllMemberSpaces();
      logEnsureDialogSpace("Scanning member spaces", {
        dialogKey,
        memberSpaceCount: memberSpaces.length,
      });
      for (const memberSpace of memberSpaces) {
        const candidateSpaceId = normalizeMaybeSpaceId(memberSpace.spaceId);
        if (!candidateSpaceId) continue;

        logEnsureDialogSpace("Inspecting member space", {
          dialogKey,
          candidateSpaceId,
        });
        try {
          const spaceData = await dispatch(
            readAndWait(createSpaceKey.space(candidateSpaceId))
          ).unwrap() as SpaceData | null;

          if (spaceContainsContentKey(spaceData, dialogKey)) {
            resolvedSpaceId = candidateSpaceId;
            logEnsureDialogSpace("Found owning member space", {
              dialogKey,
              resolvedSpaceId,
            });
            break;
          }
        } catch (error) {
          console.warn(
            `[ensureDialogSpace] Failed to inspect space ${candidateSpaceId}:`,
            error
          );
        }
      }
    }

    if (!resolvedSpaceId) {
      logEnsureDialogSpace("No owning space resolved", { dialogKey });
      return null;
    }

    if (dialogConfig && normalizeMaybeSpaceId(dialogConfig?.spaceId) !== resolvedSpaceId) {
      logEnsureDialogSpace("Persisting repaired dialog spaceId", {
        dialogKey,
        previousSpaceId: normalizeMaybeSpaceId(dialogConfig?.spaceId),
        resolvedSpaceId,
      });
      try {
        await dispatch(
          patch({
            dbKey: dialogKey,
            changes: { spaceId: resolvedSpaceId },
          })
        ).unwrap();
      } catch (error) {
        console.warn(
          "[ensureDialogSpace] Failed to persist dialog spaceId:",
          error
        );
      }
    }

    const currentSpaceId = getCurrentSpaceId();
    if (currentSpaceId !== resolvedSpaceId) {
      const changeSpaceThunk = changeSpace as (spaceId: string) => any;
      logEnsureDialogSpace("Switching current space", {
        dialogKey,
        currentSpaceId,
        resolvedSpaceId,
      });
      try {
        await dispatch(changeSpaceThunk(resolvedSpaceId)).unwrap();
        logEnsureDialogSpace("Switched current space", {
          dialogKey,
          resolvedSpaceId,
        });
      } catch (error) {
        console.warn(
          `[ensureDialogSpace] Failed to switch to space ${resolvedSpaceId}:`,
          error
        );
      }
    }

    logEnsureDialogSpace("Done", {
      dialogKey,
      resolvedSpaceId,
    });
    return resolvedSpaceId;
  };
