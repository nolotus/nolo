import {
  authRoutes
} from "/public/assets/chunks/chunk-RWWUEPWY.js";

// packages/app/email/emailApiRoutes.ts
var EMAIL_ADMIN_ENDPOINTS = {
  report: authRoutes.users.emailReport,
  retryRun: authRoutes.users.emailRetryRun,
  replayFailures: authRoutes.users.emailReplayFailures,
  configUpdate: authRoutes.users.emailConfigUpdate,
  sendEmail: authRoutes.users.sendEmail
};
var USER_EMAIL_PREFERENCE_ENDPOINTS = {
  get: authRoutes.users.emailPreferencesGet,
  update: authRoutes.users.emailPreferencesUpdate
};

export {
  EMAIL_ADMIN_ENDPOINTS,
  USER_EMAIL_PREFERENCE_ENDPOINTS
};
