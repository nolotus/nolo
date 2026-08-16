import { isPublicCatalogSpace } from "create/space/publicCatalogSpace";
import { asOptionalTrimmedString } from "core/optionalString";

export interface DialogLaunchScopeInput {
  routeSpaceId?: string | null;
  recordSpaceId?: string | null;
  currentSpaceId?: string | null;
  viewMode?: string | null;
  allowSidebarSpaceFallback?: boolean;
  preferCurrentSpaceOverRecord?: boolean;
}

const trimSpaceId = (spaceId?: string | null): string | null =>
  asOptionalTrimmedString(spaceId) ?? null;

export const resolveDialogLaunchSpaceId = ({
  routeSpaceId,
  recordSpaceId,
  currentSpaceId,
  viewMode,
  allowSidebarSpaceFallback = false,
  preferCurrentSpaceOverRecord = false,
}: DialogLaunchScopeInput): string | null => {
  const routeSid = trimSpaceId(routeSpaceId);
  const recordSid = trimSpaceId(recordSpaceId);

  // Opt-in (favorites launch): the current sidebar space wins over the
  // agent's record space — but never over an explicit route scope. Only
  // fires when there is no route, so route precedence stays intact.
  if (
    preferCurrentSpaceOverRecord &&
    allowSidebarSpaceFallback &&
    viewMode === "categories" &&
    !routeSid
  ) {
    const currentSid = trimSpaceId(currentSpaceId);
    if (currentSid && !isPublicCatalogSpace(currentSid)) {
      return currentSid;
    }
  }

  // Preserve the original precedence: an explicit route scope takes priority
  // over the record scope (`route ?? record`), evaluated as a single unit so a
  // public-catalog route does not fall through to the record space.
  const explicitSpaceId = routeSid ?? recordSid;
  if (explicitSpaceId && !isPublicCatalogSpace(explicitSpaceId)) {
    return explicitSpaceId;
  }

  if (!allowSidebarSpaceFallback || viewMode !== "categories") {
    return null;
  }

  return trimSpaceId(currentSpaceId);
};
