/**
 * Platform-neutral Account Session entry (Phase 5).
 *
 * This barrel is consumed by runtimes that must stay free of React and Redux
 * (CLI/TUI, server-adjacent code). It therefore exports ONLY the Core, the
 * service, the composition factory, and the neutral profile helper:
 * - React read hooks live in `auth/session/react` (imported directly by the
 *   identity package and React UI).
 * - The Redux projection (`accountSessionReduxProjection`, `sessionProjected`)
 *   was deleted in Phase 5; there is no Core→Redux mirror anymore.
 */

export {
  AccountSessionCore,
  buildSessionFromTokens,
  compactUniqueAccounts,
  createAccountSessionCore,
  findTokenForUser,
  isAccountIdentity,
  mergeAccountState,
  parseStoredTokenEntries,
  parseUserToken,
  promoteAccount,
  type AccountIdentity,
  type AccountSessionSnapshot,
  type AccountSessionTransition,
  type StoredTokenEntry,
} from "./accountSessionCore";

export {
  AccountSessionService,
  type SessionAuthenticator,
  type SessionInitializeResult,
  type SessionRuntimeReset,
  type SessionSignInInput,
  type SessionSignUpApi,
  type SessionSignUpInput,
} from "./accountSessionService";

export {
  composeAccountSessionRuntime,
  type AccountSessionRuntime,
  type AccountSessionRuntimeComposition,
} from "./accountSessionRuntime";

export {
  fetchAccountProfile,
  type AccountProfileFetch,
  type AccountProfileGptProAccess,
  type AccountProfileUpdate,
  type FetchAccountProfileInput,
} from "./fetchAccountProfile";
