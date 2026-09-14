// Desktop edition barrel (nolo-desktop condition).
//
// Session-aware identity hooks + explicit desktop selectors/actions/routes.
// `isCloudEdition` stays false: the desktop edition ships no private cloud
// bundles; account surfaces resolve via the nolo-desktop conditions
// (see EDITION.md and desktopEdition.source.test.ts).
export {
  useIdentity,
  useUserId,
  useToken,
  useIsLoggedIn,
  useCurrentUser,
  useAccounts,
} from "./useIdentity.desktop";
export type { IdentitySnapshot, IdentityUser, User } from "./types";
export {
  selectIdentityIsLoggedIn,
  selectIdentityToken,
  selectIdentityUser,
  selectIdentityUserBalance,
  selectIdentityUserId,
} from "identity/selectors";
export { useCouldEdit } from "./useCouldEdit";

export const isCloudEdition = false;
