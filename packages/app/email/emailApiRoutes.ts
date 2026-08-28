import { authRoutes } from "core/authRoutes";

export const EMAIL_ADMIN_ENDPOINTS = {
  report: authRoutes.users.emailReport,
  retryRun: authRoutes.users.emailRetryRun,
  replayFailures: authRoutes.users.emailReplayFailures,
  configUpdate: authRoutes.users.emailConfigUpdate,
  sendEmail: authRoutes.users.sendEmail,
} as const;

export const USER_EMAIL_PREFERENCE_ENDPOINTS = {
  get: authRoutes.users.emailPreferencesGet,
  update: authRoutes.users.emailPreferencesUpdate,
} as const;
