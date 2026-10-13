import { existsSync, lstatSync, mkdirSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";

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

export const DEFAULT_UPLOAD_ROOT_SUFFIX = join(".nolo", "uploads");

export function resolveDefaultUploadRoot(env = process.env) {
  let home;
  try {
    home = env?.HOME || homedir();
  } catch (err) {
    throw createUploadSecurityError(
      "path_not_allowed",
      `Could not determine the home directory for the default upload root: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (typeof home !== "string" || !isAbsolute(home)) {
    throw createUploadSecurityError(
      "path_not_allowed",
      `Home directory '${String(home)}' must be an absolute path to derive the default upload root '${DEFAULT_UPLOAD_ROOT_SUFFIX}'.`,
    );
  }
  return resolve(join(home, DEFAULT_UPLOAD_ROOT_SUFFIX));
}

function splitConfiguredRoots(raw) {
  const entries =
    typeof raw === "string"
      ? raw
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];
  const absolute = [];
  const dropped = [];
  for (const entry of entries) {
    (isAbsolute(entry) ? absolute : dropped).push(entry);
  }
  return { absolute, dropped };
}

// Pure: reads configuration and inspects already existing paths, but never writes to disk.
// `nolo browser status` must use this one — a diagnostic command must not create directories.
export function resolveUploadRoots(env = process.env) {
  const raw = env?.NOLO_CHROME_UPLOAD_ROOTS;
  if (raw !== undefined) {
    const { absolute, dropped } = splitConfiguredRoots(raw);
    const roots = absolute.map((entry) => {
      const resolved = resolve(entry);
      if (!existsSync(resolved)) {
        return resolved;
      }
      try {
        return realpathSync(resolved);
      } catch {
        return resolved;
      }
    });
    return { configured: true, isDefault: false, roots, dropped };
  }

  const defaultDir = resolveDefaultUploadRoot(env);
  return {
    configured: false,
    isDefault: true,
    roots: [existsSync(defaultDir) ? inspectDefaultUploadRoot(defaultDir) : defaultDir],
    dropped: [],
  };
}

// Only for real uploads: creates the default root (mode 0700) and applies the symlink/directory
// checks. Returns the configured roots unchanged when NOLO_CHROME_UPLOAD_ROOTS is set.
export function ensureDefaultUploadRoot(env = process.env) {
  if (env?.NOLO_CHROME_UPLOAD_ROOTS !== undefined) {
    return resolveUploadRoots(env);
  }

  const defaultDir = resolveDefaultUploadRoot(env);
  if (!existsSync(defaultDir)) {
    try {
      mkdirSync(defaultDir, { recursive: true, mode: 0o700 });
    } catch (err) {
      throw createUploadSecurityError(
        "path_not_allowed",
        `Default upload root '${defaultDir}' could not be created: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { configured: false, isDefault: true, roots: [inspectDefaultUploadRoot(defaultDir)], dropped: [] };
}

function inspectDefaultUploadRoot(defaultDir) {
  let lst;
  try {
    lst = lstatSync(defaultDir);
  } catch (err) {
    throw createUploadSecurityError(
      "path_not_allowed",
      `Default upload root '${defaultDir}' could not be inspected: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (lst.isSymbolicLink()) {
    throw createUploadSecurityError(
      "path_not_allowed",
      `Default upload root '${defaultDir}' is a symbolic link, which is not permitted. Set NOLO_CHROME_UPLOAD_ROOTS to the real directory if you need a custom location.`,
    );
  }

  if (!lst.isDirectory()) {
    throw createUploadSecurityError(
      "path_not_allowed",
      `Default upload root '${defaultDir}' is not a directory.`,
    );
  }

  try {
    return realpathSync(defaultDir);
  } catch (err) {
    throw createUploadSecurityError(
      "path_not_allowed",
      `Default upload root '${defaultDir}' canonical path could not be resolved: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
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

  const rootsInfo = ensureDefaultUploadRoot(env);
  const allowedRoots = rootsInfo.roots;
  if (allowedRoots.length === 0) {
    const dropped = rootsInfo.dropped ?? [];
    const droppedHint = dropped.length
      ? ` Ignored entries: ${dropped.map((entry) => `'${entry}'`).join(", ")} (only absolute paths are accepted; '~' and relative paths are never expanded).`
      : "";
    throw createUploadSecurityError(
      "path_not_allowed",
      `NOLO_CHROME_UPLOAD_ROOTS is set but contains no usable absolute path; all uploads are refused.${droppedHint}`,
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
