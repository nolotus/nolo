import {
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MAX_FILES,
  UploadSecurityError,
  createUploadSecurityError,
  ensureDefaultUploadRoot,
  formatUploadAuditLog,
  logUploadAudit,
  resolveDefaultUploadRoot,
  resolveUploadRoots,
  validateUploadFiles,
} from "./uploadSecurity.mjs";

export {
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MAX_FILES,
  UploadSecurityError,
  createUploadSecurityError,
  ensureDefaultUploadRoot,
  formatUploadAuditLog,
  logUploadAudit,
  resolveDefaultUploadRoot,
  resolveUploadRoots,
  validateUploadFiles,
};

export type UploadFileStat = {
  path: string;
  bytes: number;
};

export type ValidateUploadFilesResult = {
  ok: true;
  files: string[];
  fileStats: UploadFileStat[];
  totalBytes: number;
};

export type ValidateUploadFilesOptions = {
  files: string[];
  env?: Record<string, string | undefined>;
  maxFiles?: number;
  maxFileBytes?: number;
};

export type UploadAuditEntry = {
  timestamp?: string;
  tabId: string | number;
  target: string;
  files: UploadFileStat[];
};
