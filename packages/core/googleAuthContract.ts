/** Wire contract only. All responses must be served with Cache-Control: no-store. */
export type GoogleStartRequest = { mode: "login" | "bind"; returnTo?: string };
export type GoogleStartResponse = { authorizationUrl: string };
/** Server callback returns 303 to the fixed completion page, never credentials in the URL. */
export type GoogleCallbackQuery = { code: string; state: string };
export type GoogleCompleteResponse =
  | { status: "authenticated"; token: string }
  | { status: "binding_confirmation_required"; confirmationTicket: string; googleDisplay: { email?: string; name?: string } };
export type GoogleBindConfirmRequest = { confirmationTicket: string };
export type GoogleBindConfirmResponse = { status: "bound" };
export type GoogleBindingResponse = { bound: boolean; display?: { email?: string } };
export type GoogleSessionLogoutResponse = { success: true };
/** Starts fresh Google reauthentication for the currently authenticated account. */
export type GoogleSessionRevokeStartResponse = { authorizationUrl: string };
export type GoogleSessionRevokeConfirmRequest = { confirmationTicket: string };
export type GoogleSessionRevokeConfirmResponse = { success: true; tokenVersion: number };
export const GOOGLE_AUTH_ERROR_CODES = [
  "GOOGLE_AUTH_EXPIRED", "GOOGLE_AUTH_REPLAYED", "GOOGLE_AUTH_INVALID",
  "GOOGLE_ACCOUNT_CHANGED", "GOOGLE_IDENTITY_ALREADY_BOUND", "GOOGLE_BINDING_EXISTS",
  "AUTH_STORE_UNAVAILABLE",
] as const;
export type GoogleAuthErrorCode = (typeof GOOGLE_AUTH_ERROR_CODES)[number];
