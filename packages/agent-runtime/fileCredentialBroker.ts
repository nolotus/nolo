import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  assertCredentialRef,
  type CredentialBroker,
  type CredentialRef,
} from "./credentialBroker";
import {
  getLegacyCredentialPath,
  migrateLegacyCredentialFile,
  type CredentialMigrationOptions,
} from "./credentialLocationMigration";
import { getCredentialsDir } from "./oauthTokenStore";

export type StoredApiKeyCredential = {
  secret: string;
  updatedAt: number;
};

export function getApiKeyCredentialsDir(homeDir?: string): string {
  return join(getCredentialsDir(homeDir), "keys");
}

/**
 * Map a credential ref to a single filename under `$NOLO_HOME/credentials/keys/` (or `~/.nolo/credentials/keys/` when `NOLO_HOME` is unset).
 * Colons become underscores so refs like `api-key:agent-foo` stay portable.
 */
export function credentialRefToFileName(ref: CredentialRef): string {
  const safe = assertCredentialRef(ref).replace(/[^a-zA-Z0-9._-]+/g, "_");
  if (!safe || safe === "." || safe === "..") {
    throw new Error(`Credential ref is not filesystem-safe: ${ref}`);
  }
  return `${safe}.json`;
}

export function getApiKeyCredentialPath(ref: CredentialRef, homeDir?: string): string {
  return join(getApiKeyCredentialsDir(homeDir), credentialRefToFileName(ref));
}

function ensurePrivateDir(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    chmodSync(dir, 0o700);
  } catch {
    // Best-effort on platforms that ignore chmod (e.g. some Windows mounts).
  }
}

function writePrivateFile(path: string, body: string): void {
  writeFileSync(path, body, { encoding: "utf8", mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // Best-effort.
  }
}

function migrateApiKeyCredentialIfNeeded(
  ref: CredentialRef,
  homeDir: string | undefined,
  migration?: CredentialMigrationOptions,
): void {
  if (homeDir !== undefined || !migration?.enableLegacyMigration) return;
  const legacyHomeDir = migration.legacyHomeDir ?? homedir();
  const relativePath = join("keys", credentialRefToFileName(ref));
  migrateLegacyCredentialFile({
    canonicalPath: getApiKeyCredentialPath(ref),
    legacyPath: getLegacyCredentialPath(relativePath, legacyHomeDir),
    mode: migration.mode ?? (migration.legacyHomeDir ? "test" : "production"),
    isValid: (raw) => {
      try {
        const parsed = JSON.parse(raw) as StoredApiKeyCredential;
        return typeof parsed?.secret === "string" && Boolean(parsed.secret);
      } catch {
        return false;
      }
    },
  });
}

export function readApiKeyCredential(
  ref: CredentialRef,
  homeDir?: string,
  migration?: CredentialMigrationOptions,
): string | null {
  migrateApiKeyCredentialIfNeeded(ref, homeDir, migration);
  const path = getApiKeyCredentialPath(ref, homeDir);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as StoredApiKeyCredential;
    if (typeof parsed?.secret !== "string" || !parsed.secret) return null;
    return parsed.secret;
  } catch {
    return null;
  }
}

export function writeApiKeyCredential(
  ref: CredentialRef,
  secret: string,
  homeDir?: string,
  now = Date.now(),
): void {
  const trimmedSecret = secret.trim();
  if (!trimmedSecret) {
    throw new Error("Cannot store an empty credential secret.");
  }
  assertCredentialRef(ref);
  const dir = getApiKeyCredentialsDir(homeDir);
  ensurePrivateDir(dir);
  const path = getApiKeyCredentialPath(ref, homeDir);
  const payload: StoredApiKeyCredential = {
    secret: trimmedSecret,
    updatedAt: now,
  };
  writePrivateFile(path, `${JSON.stringify(payload, null, 2)}\n`);
}

export function removeApiKeyCredential(ref: CredentialRef, homeDir?: string): void {
  assertCredentialRef(ref);
  const path = getApiKeyCredentialPath(ref, homeDir);
  if (!existsSync(path)) return;
  unlinkSync(path);
}

export function hasApiKeyCredential(
  ref: CredentialRef,
  homeDir?: string,
  migration?: CredentialMigrationOptions,
): boolean {
  return readApiKeyCredential(ref, homeDir, migration) !== null;
}

export type CreateFileCredentialBrokerOptions = {
  homeDir?: string;
  now?: () => number;
  migration?: CredentialMigrationOptions;
};

/**
 * File-backed CredentialBroker for metered API keys.
 * OAuth tokens remain under `$NOLO_HOME/credentials/<provider>.json` (or `~/.nolo/credentials/<provider>.json` when `NOLO_HOME` is unset) via oauthTokenStore.
 */
export function createFileCredentialBroker(
  options: CreateFileCredentialBrokerOptions = {},
): CredentialBroker {
  const homeDir = options.homeDir;
  const migration = options.migration;
  const now = options.now ?? Date.now;
  return {
    get(ref) {
      return readApiKeyCredential(ref, homeDir, migration);
    },
    put(ref, secret) {
      writeApiKeyCredential(ref, secret, homeDir, now());
    },
    delete(ref) {
      removeApiKeyCredential(ref, homeDir);
    },
    has(ref) {
      return hasApiKeyCredential(ref, homeDir, migration);
    },
  };
}
