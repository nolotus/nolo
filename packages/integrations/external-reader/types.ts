/**
 * External Reader Provider - Shared Contract
 *
 * Generic provider descriptor for external platform readers (XHS, X/Twitter, etc.).
 * Both backend handlers and frontend UI components should reference these types
 * to avoid duplicating provider-specific structures when adding new providers.
 */

// --- Runtime status ---

export type ExternalReaderStatus =
  | "unknown"
  | "ready"
  | "needs_login"
  | "blocked"
  | "error";

export type ExternalReaderMode = "desktop" | "server";

// --- Actions ---

export type ExternalReaderAction = "status" | "open-login" | "reset";

// --- API response ---

export type ExternalReaderDiagnostic = {
  code?: string;
  message?: string;
  loginDetected?: boolean;
  captchaDetected?: boolean;
  pageTitle?: string;
};

export type ExternalReaderSample = {
  nickname?: string;
  noteCount?: number;
  fetchedAt?: string;
};

export type ExternalReaderStateResponse = {
  ok: boolean;
  providerId: string;
  providerLabel: string;
  status: ExternalReaderStatus;
  mode: ExternalReaderMode;
  message: string;
  profileDir?: string;
  diagnostic?: ExternalReaderDiagnostic;
  sample?: ExternalReaderSample;
};

// --- Provider descriptor (shared contract) ---

/**
 * Minimal provider descriptor for external readers.
 *
 * Backend: use this type for the `externalReaderProviders` registry.
 * Frontend: use this type for the `EXTERNAL_READER_PROVIDERS` config array.
 *
 * When adding a new provider (e.g., weibo, douyin), create a descriptor
 * that satisfies this interface and register it in both backend and frontend.
 */
export interface ExternalReaderProviderDescriptor {
  /** Unique provider ID, used in URL path /api/external-readers/:provider/:action */
  id: string;

  /** Human-readable label (e.g., "小红书", "X/Twitter") */
  label: string;

  /** Human-readable description for settings UI */
  description: string;

  /** Default profile URL for status checks */
  defaultProfileUrl: string;

  /** Confirmation code required for reset action */
  resetConfirmation: string;

  /** Status messages keyed by ExternalReaderStatus */
  statusMessages: Record<ExternalReaderStatus, string>;

  /** Message shown when login window opens successfully */
  openLoginReadyMessage: string;

  /** Message shown when login window fails to open */
  openLoginFailureMessage: string;

  /** Message shown after successful reset */
  resetMessage: string;
}

// --- Type guards ---

export const VALID_EXTERNAL_READER_ACTIONS = new Set<ExternalReaderAction>([
  "status",
  "open-login",
  "reset",
]);

export function isValidExternalReaderAction(
  action: string,
): action is ExternalReaderAction {
  return VALID_EXTERNAL_READER_ACTIONS.has(action as ExternalReaderAction);
}
