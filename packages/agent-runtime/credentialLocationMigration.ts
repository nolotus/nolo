import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  linkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

export type CredentialMigrationMode = "production" | "test";

export type CredentialMigrationOptions = {
  enableLegacyMigration?: boolean;
  legacyHomeDir?: string;
  mode?: CredentialMigrationMode;
};

export function getLegacyCredentialPath(relativePath: string, legacyHomeDir: string): string {
  return join(legacyHomeDir, ".nolo", "credentials", relativePath);
}

export function credentialMigrationMarkerPath(canonicalPath: string): string {
  return `${canonicalPath}.legacy-migration-complete`;
}

function isRegularFile(path: string): boolean {
  try {
    return lstatSync(path).isFile();
  } catch {
    return false;
  }
}

function ensurePrivateDir(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { chmodSync(dir, 0o700); } catch { /* best effort */ }
}

/** Record that this canonical location is authoritative without deleting legacy. */
export function markCredentialMigrationComplete(canonicalPath: string): void {
  const marker = credentialMigrationMarkerPath(canonicalPath);
  ensurePrivateDir(dirname(marker));
  if (existsSync(marker)) return;
  writeFileSync(marker, "\n", { encoding: "utf8", mode: 0o600 });
  try { chmodSync(marker, 0o600); } catch { /* best effort */ }
}

export function migrateLegacyCredentialFile(args: {
  canonicalPath: string;
  legacyPath: string;
  isValid: (raw: string) => boolean;
  mode: CredentialMigrationMode;
}): boolean {
  if (args.mode !== "production" && args.mode !== "test") return false;
  if (existsSync(credentialMigrationMarkerPath(args.canonicalPath))) return false;
  if (existsSync(args.canonicalPath)) {
    markCredentialMigrationComplete(args.canonicalPath);
    return false;
  }
  if (!isRegularFile(args.legacyPath)) return false;

  let raw: string;
  try {
    raw = readFileSync(args.legacyPath, "utf8");
    if (!args.isValid(raw)) return false;
  } catch {
    return false;
  }

  ensurePrivateDir(dirname(args.canonicalPath));
  const tempPath = `${args.canonicalPath}.migrate-${process.pid}-${Math.random().toString(36).slice(2)}`;
  try {
    writeFileSync(tempPath, raw, { encoding: "utf8", mode: 0o600 });
    try { chmodSync(tempPath, 0o600); } catch { /* best effort */ }
    try {
      linkSync(tempPath, args.canonicalPath);
    } catch {
      unlinkSync(tempPath);
      return false;
    }
    unlinkSync(tempPath);
    markCredentialMigrationComplete(args.canonicalPath);
    try { chmodSync(args.canonicalPath, 0o600); } catch { /* best effort */ }
    return true;
  } catch {
    try { unlinkSync(tempPath); } catch { /* no partial canonical file */ }
    return false;
  }
}
