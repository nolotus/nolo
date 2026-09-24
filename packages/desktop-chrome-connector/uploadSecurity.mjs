import { existsSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export const DEFAULT_MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
export const DEFAULT_MAX_FILES = 10;

export class UploadSecurityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "UploadSecurityError";
    this.code = code;
  }
}

export function createUploadSecurityError(code, message) {
  return new UploadSecurityError(code, message);
}

function isSubpath(parent, child) {
  const rel = relative(parent, child);
  return !rel.startsWith("..") && !isAbsolute(rel);
}

export function parseAllowedRoots(env = process.env) {
  const raw = env?.NOLO_CHROME_UPLOAD_ROOTS;
  if (!raw || typeof raw !== "string") {
    return [];
  }
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => isAbsolute(entry))
    .map((entry) => {
      const resolved = resolve(entry);
      if (existsSync(resolved)) {
        try {
          return realpathSync(resolved);
        } catch {
          return resolved;
        }
      }
      return resolved;
    });
}

export function validateUploadFiles(options = {}) {
  const {
    files,
    env = process.env,
    maxFiles = DEFAULT_MAX_FILES,
    maxFileBytes = DEFAULT_MAX_FILE_BYTES,
  } = options;

  if (!Array.isArray(files) || files.length === 0) {
    throw createUploadSecurityError("no_files", "Provide at least one file to upload.");
  }

  if (files.length > maxFiles) {
    throw createUploadSecurityError(
      "too_many_files",
      `Too many files: ${files.length} provided, maximum allowed is ${maxFiles}.`,
    );
  }

  const allowedRoots = parseAllowedRoots(env);
  if (allowedRoots.length === 0) {
    throw createUploadSecurityError(
      "path_not_allowed",
      "Upload roots not configured in NOLO_CHROME_UPLOAD_ROOTS; all uploads are refused.",
    );
  }

  const fileStats = [];
  const canonicalFiles = [];
  let totalBytes = 0;

  for (const rawFile of files) {
    if (typeof rawFile !== "string" || !rawFile.trim()) {
      throw createUploadSecurityError("path_not_allowed", "File path must be a non-empty string.");
    }
    const trimmed = rawFile.trim();
    const resolvedCandidate = resolve(trimmed);

    if (!existsSync(resolvedCandidate)) {
      throw createUploadSecurityError("path_not_allowed", `File not found or inaccessible: ${rawFile}`);
    }

    let real;
    try {
      real = realpathSync(resolvedCandidate);
    } catch {
      throw createUploadSecurityError("path_not_allowed", `Could not resolve canonical path for: ${rawFile}`);
    }

    let st;
    try {
      st = statSync(real);
    } catch {
      throw createUploadSecurityError("path_not_allowed", `Could not stat file: ${rawFile}`);
    }

    if (!st.isFile()) {
      throw createUploadSecurityError("path_not_allowed", `Target path is not a regular file: ${rawFile}`);
    }

    if (st.size > maxFileBytes) {
      throw createUploadSecurityError(
        "too_large",
        `File size ${st.size} bytes exceeds maximum allowed limit of ${maxFileBytes} bytes: ${rawFile}`,
      );
    }

    // Must be inside at least one allowed root prefix after realpath resolution
    const realInside = allowedRoots.some((root) => isSubpath(root, real));
    if (!realInside) {
      throw createUploadSecurityError(
        "path_not_allowed",
        `Path '${rawFile}' (resolved: '${real}') is not within allowed upload roots.`,
      );
    }

    // Note: the realpath-based check above is the authoritative guard (it already
    // blocks symlink escapes and `..` traversal, and `real` is what reaches CDP).
    // A second subpath check on the non-realpath'd candidate would false-positive
    // on symlinked roots (e.g. macOS /tmp -> /private/tmp), so it is deliberately
    // not duplicated here.

    canonicalFiles.push(real);
    fileStats.push({ path: real, bytes: st.size });
    totalBytes += st.size;
  }

  return {
    ok: true,
    files: canonicalFiles,
    fileStats,
    totalBytes,
  };
}

export function formatUploadAuditLog(entry = {}) {
  const ts = entry.timestamp || new Date().toISOString();
  const safeTabId = String(entry.tabId ?? "").replace(/[\x00-\x1f\x7f-\x9f]+/g, " ");
  const safeTarget = String(entry.target ?? "").replace(/[\x00-\x1f\x7f-\x9f]+/g, " ");
  const files = Array.isArray(entry.files) ? entry.files : [];
  const totalBytes = files.reduce((sum, f) => sum + (Number(f.bytes) || 0), 0);
  const fileDetails = files
    .map((f) => `${String(f.path || "").replace(/[\x00-\x1f\x7f-\x9f]+/g, " ")}(${f.bytes || 0}B)`)
    .join(", ");
  return `[chrome-upload] ${ts} tabId=${safeTabId} target=${safeTarget} files=[${fileDetails}] totalBytes=${totalBytes}`;
}

export function logUploadAudit(entry, logFn = console.warn) {
  const line = formatUploadAuditLog(entry);
  logFn(line);
  return line;
}
