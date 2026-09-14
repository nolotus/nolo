// Desktop edition profile read (nolo-desktop condition).
//
// Re-exports the platform-neutral profile fetch from the PUBLIC
// core/accountSession package (same implementation the cloud edition uses via
// auth/session). The caller supplies server selection + token + userId and
// commits the result through the session service; the server owns
// billing/balance — the desktop only ever displays the returned profile.
export {
  fetchAccountProfile,
  type AccountProfileFetch,
  type AccountProfileGptProAccess,
  type AccountProfileUpdate,
  type FetchAccountProfileInput,
} from "core/accountSession";
