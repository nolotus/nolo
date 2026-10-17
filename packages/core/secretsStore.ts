import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  chmodSync,
  writeFileSync,
  openSync,
  closeSync,
  unlinkSync,
} from "fs";
import { dirname, join, resolve } from "path";
import { homedir } from "os";

/**
 * Canonical credential location: `$NOLO_HOME/credentials` when NOLO_HOME is set
 * (see docs/plans/2026-09-08-credential-location-migration.md), else `~/.nolo/credentials`.
 */
export function resolveCredentialsDir(env: NodeJS.ProcessEnv = process.env): string {
  const noloHome = env.NOLO_HOME?.trim();
  const base = noloHome ? resolve(noloHome) : join(homedir(), ".nolo");
  return join(base, "credentials");
}

export function getSecretsFilePath(): string {
  const override = process.env.NOLO_SECRETS_FILE;
  if (override && override.trim()) return override;
  return join(resolveCredentialsDir(), "secrets.json");
}

export class SecretsFileCorruptedError extends Error {
  constructor(filePath: string, cause?: unknown) {
    super(
      `secrets file is not valid JSON and was left untouched: ${filePath}. ` +
        `Refusing to overwrite it — repair or move the file aside first.`,
    );
    this.name = "SecretsFileCorruptedError";
    (this as { cause?: unknown }).cause = cause;
  }
}

export class SecretHasNoEnvMappingError extends Error {
  constructor(name: string) {
    super(
      `secret "${name}" produced no environment variables; it was stored as a ` +
        `scalar that cannot be injected (expected a string or an object of scalars).`,
    );
    this.name = "SecretHasNoEnvMappingError";
  }
}

/** Creates the directory when missing and secures only directories this module created. */
function ensureDirectorySecured(dirPath: string): void {
  if (existsSync(dirPath)) return;
  mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  try {
    chmodSync(dirPath, 0o700);
  } catch {
    // best-effort on filesystems without POSIX modes
  }
}

function readSecretsData(): Record<string, unknown> {
  const filePath = getSecretsFilePath();
  if (!existsSync(filePath)) return {};
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (error) {
    throw new SecretsFileCorruptedError(filePath, error);
  }
  if (!raw.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    // Never fall back to {} here: callers write the parsed object back, so an empty
    // fallback would silently wipe every stored secret.
    throw new SecretsFileCorruptedError(filePath, error);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SecretsFileCorruptedError(filePath);
  }
  return parsed as Record<string, unknown>;
}

export type SecretsReadResult =
  | { data: Record<string, unknown>; corrupted: false }
  | { data: Record<string, unknown>; corrupted: true; error: Error };

/**
 * Read-only paths degrade instead of throwing — but the caller must be able to tell
 * "no secrets stored" apart from "the file is damaged", otherwise a damaged file reads
 * as an empty store in exit codes and copy.
 */
export function readSecretsForRead(): SecretsReadResult {
  try {
    return { data: readSecretsData(), corrupted: false };
  } catch (error) {
    return { data: {}, corrupted: true, error: error as Error };
  }
}

function writeSecretsData(data: Record<string, unknown>): void {
  const filePath = getSecretsFilePath();
  const dir = dirname(filePath);
  ensureDirectorySecured(dir);

  const tempPath = join(dir, `.secrets-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  writeFileSync(tempPath, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
  try {
    chmodSync(tempPath, 0o600);
  } catch {
    // best-effort
  }
  renameSync(tempPath, filePath);
}

/**
 * Serializes read-modify-write cycles across processes (concurrent `nolo secret set`
 * used to drop keys silently: every writer read the same snapshot and the last rename won).
 */
function sleepSync(ms: number): void {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      // spin: only used while another process holds the lock
    }
  }
}

function withSecretsLock<T>(fn: () => T): T {
  const lockPath = `${getSecretsFilePath()}.lock`;
  ensureDirectorySecured(dirname(lockPath));
  const deadline = Date.now() + 1000;
  let fd: number | null = null;
  for (;;) {
    try {
      fd = openSync(lockPath, "wx", 0o600);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (Date.now() > deadline) {
        throw new Error(`timed out waiting for the secrets lock: ${lockPath}`);
      }
      sleepSync(20);
    }
  }
  try {
    return fn();
  } finally {
    if (fd !== null) {
      closeSync(fd);
      try {
        unlinkSync(lockPath);
      } catch {
        // another writer already removed it
      }
    }
  }
}

export function listSecretNames(): string[] {
  return Object.keys(readSecretsForRead().data).sort();
}

export function getSecret(name: string): unknown | undefined {
  if (!name || typeof name !== "string") return undefined;
  return readSecretsForRead().data[name];
}

export function setSecret(name: string, value: unknown): void {
  if (!name || typeof name !== "string") {
    throw new Error("Secret name must be a non-empty string");
  }
  if (typeof value !== "string" && (typeof value !== "object" || value === null)) {
    throw new Error("Secret value must be a string or a plain object");
  }
  withSecretsLock(() => {
    const data = readSecretsData();
    data[name] = value;
    writeSecretsData(data);
  });
}

export function deleteSecret(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  return withSecretsLock(() => {
    const data = readSecretsData();
    if (!(name in data)) return false;
    delete data[name];
    writeSecretsData(data);
    return true;
  });
}

/**
 * Maps a stored secret onto child-process environment variables.
 *
 * `amo` gets the exact names `web-ext` reads; anything else maps by name
 * (`my_api_key` -> `MY_API_KEY`, `docker:{user,token}` -> `DOCKER_USER`/`DOCKER_TOKEN`).
 * A stored secret that yields nothing throws: running the child without credentials
 * would look like success while every call is unauthenticated.
 */
export function resolveSecretEnvVars(name: string): Record<string, string> {
  const val = getSecret(name);
  if (val === undefined) return {};

  const envs: Record<string, string> = {};

  if (name.toLowerCase() === "amo") {
    if (typeof val === "object" && val !== null) {
      const obj = val as Record<string, unknown>;
      const issuer = obj.issuer ?? obj.apiKey ?? obj.key ?? obj.WEB_EXT_API_KEY;
      const secret = obj.secret ?? obj.apiSecret ?? obj.WEB_EXT_API_SECRET;
      if (typeof issuer === "string" && issuer) {
        envs["WEB_EXT_API_KEY"] = issuer;
        envs["AMO_JWT_ISSUER"] = issuer;
      }
      if (typeof secret === "string" && secret) {
        envs["WEB_EXT_API_SECRET"] = secret;
        envs["AMO_JWT_SECRET"] = secret;
      }
    } else if (typeof val === "string" && val) {
      envs["AMO_JWT_SECRET"] = val;
    }
  } else if (typeof val === "string") {
    if (val) envs[name.toUpperCase().replace(/[^A-Z0-9_]/g, "_")] = val;
  } else if (typeof val === "object" && val !== null) {
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        const envKey = `${name.toUpperCase()}_${k.toUpperCase()}`.replace(/[^A-Z0-9_]/g, "_");
        envs[envKey] = String(v);
      }
    }
  }

  if (Object.keys(envs).length === 0) throw new SecretHasNoEnvMappingError(name);
  return envs;
}
