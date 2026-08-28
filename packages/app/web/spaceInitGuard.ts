import {
  DEVICE_LOCAL_OWNER_ID,
  resolveEffectiveSpaceActorId,
} from "database/authority/deviceLocal";

export interface SpaceInitDecision {
  shouldInitialize: boolean;
  nextInitializedUserId: string | null;
}

/**
 * Space membership/default boot decision.
 *
 * Guest / blank account → effective actor `"local"` (device-local Space slice B1).
 * Active account → that account userId.
 * Re-initializes on actor change (local↔A, A↔B, A→logout).
 */
export const decideSpaceInitialization = (
  currentInitializedUserId: string | null,
  userId: string | undefined
): SpaceInitDecision => {
  const effectiveActorId = resolveEffectiveSpaceActorId(userId);

  if (currentInitializedUserId === effectiveActorId) {
    return {
      shouldInitialize: false,
      nextInitializedUserId: currentInitializedUserId,
    };
  }

  return {
    shouldInitialize: true,
    nextInitializedUserId: effectiveActorId,
  };
};

/** Effective Space actor for boot/hydrate (guest → `"local"`). */
export const resolveSpaceBootActorId = (
  accountUserId: string | null | undefined
): string => resolveEffectiveSpaceActorId(accountUserId);

export { DEVICE_LOCAL_OWNER_ID };
