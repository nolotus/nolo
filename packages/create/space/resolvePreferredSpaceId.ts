import type { RootState } from "app/store";
import { isAbortError } from "core/abortError";
import { read, readAndWait } from "database/dbSlice";

import { createSpaceKey } from "./spaceKeys";
import { getAllMemberSpaces } from "./spaceMembershipStore";

const isSuppressedMissError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  typeof error.message === "string" &&
  (error.message.includes("temporarily suppressed") ||
    error.message.includes("miss suppressed"));

export const readSpaceIfExists = async (
  dispatch: any,
  spaceId?: string | null
): Promise<string | null> => {
  if (!spaceId) {
    return null;
  }

  try {
    const result = await dispatch(
      read({
        dbKey: createSpaceKey.space(spaceId),
      })
    ).unwrap();

    if (result) {
      return spaceId;
    }
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (!isSuppressedMissError(error)) {
      console.info(
        `[resolvePreferredSpaceId] Optimistic read failed for ${spaceId}, retrying with readAndWait:`,
        error
      );
    }
  }

  try {
    const result = await dispatch(
      readAndWait(createSpaceKey.space(spaceId))
    ).unwrap();
    return result ? spaceId : null;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    console.info(
      `[resolvePreferredSpaceId] Confirming space existence failed for ${spaceId}:`,
      error
    );
    return null;
  }
};

/**
 * Resolve which space to open when one is needed for a content operation.
 * No sticky default-space preference — only current selection or an existing
 * membership that still has a readable body.
 */
export const resolvePreferredSpaceId = async ({
  dispatch,
  getState,
}: {
  dispatch: any;
  getState: () => RootState;
  userId?: string | null;
}): Promise<string | null> => {
  const state = getState();

  if (state.space.currentSpaceId) {
    return state.space.currentSpaceId;
  }

  for (const memberSpace of getAllMemberSpaces()) {
    const readableSpaceId = await readSpaceIfExists(
      dispatch,
      memberSpace?.spaceId
    );
    if (readableSpaceId) {
      return readableSpaceId;
    }
  }

  return null;
};
