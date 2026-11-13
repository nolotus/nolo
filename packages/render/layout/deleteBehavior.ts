import { AppRoutePaths } from "app/constants/routePaths";
import { normalizeSpaceId } from "create/space/spaceKeys";
import { isDialogKey } from "database/keys";

type ResolveDeleteSpaceIdArgs = {
  contentKeyType: string;
  docSpaceId?: string | null;
  entitySpaceId?: string | null;
  routeSpaceId?: string | null;
  currentSpaceId?: string | null;
};

const ROUTE_SCOPED_DELETE_TYPES = new Set([
  "page",
  "dialog",
  "file",
  "image",
  "meta",
]);

export const resolveDeleteSpaceId = ({
  contentKeyType,
  docSpaceId,
  entitySpaceId,
  routeSpaceId,
  currentSpaceId,
}: ResolveDeleteSpaceIdArgs): string | undefined => {
  const persistedSpaceId = entitySpaceId || docSpaceId || undefined;
  if (persistedSpaceId) return persistedSpaceId;
  if (
    routeSpaceId &&
    ROUTE_SCOPED_DELETE_TYPES.has(contentKeyType)
  ) {
    return routeSpaceId;
  }
  return undefined;
};

/**
 * Where to go after a successful delete.
 * - Dialog → the dedicated new-dialog shell (/chat); never the space home and
 *   never history.back (the deleted route is dead).
 * - Space-scoped content → that space's all-content page (/space/:id/contents).
 *   `/space/:id` is now the space *chat* home, so landing there would drop the
 *   user out of the content list they were browsing.
 * - Standalone public agent → explore
 * - Otherwise → caller may fall back to history.back
 */
export const resolveDeleteSuccessPath = ({
  contentKey,
  routeSpaceId,
}: {
  contentKey?: string;
  routeSpaceId?: string | null;
}): string | undefined => {
  if (!contentKey) return undefined;

  if (isDialogKey(contentKey)) {
    return AppRoutePaths.CHAT;
  }

  if (routeSpaceId) {
    return `/space/${normalizeSpaceId(routeSpaceId)}/contents`;
  }

  if (contentKey.startsWith("agent-pub-")) {
    return "/explore";
  }

  return undefined;
};

/** True when the current URL is showing the content that was just deleted. */
export const isViewingDeletedContent = (
  pathname: string,
  contentKey: string
): boolean => {
  if (!pathname || !contentKey) return false;
  // Routes look like /space/:id/page-... or /page-...
  return (
    pathname.includes(`/${contentKey}`) ||
    pathname.endsWith(contentKey) ||
    pathname.includes(contentKey)
  );
};
