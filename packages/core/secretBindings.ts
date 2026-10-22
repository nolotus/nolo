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
import { dirname, join } from "path";
import { resolveCredentialsDir, SecretsFileCorruptedError } from "./secretsStore";

export interface SecretBinding {
  version: 1;
  alias: string; // 唯一名称，小写字母、数字、下划线
  brokerRef: string; // 规范 vault-cred-xxx，不允许含 $nolo_cred: 前缀或路径穿透
  envName: string; // 显式注入环境变量名，必须大写字母、数字、下划线
  createdAt: number;
  updatedAt: number;
  ownerUserId?: string;
}

export interface SetSecretBindingInput {
  alias: string;
  brokerRef: string;
  envName: string;
  ownerUserId?: string;
}

export class SecretBindingsFileCorruptedError extends SecretsFileCorruptedError {
  constructor(filePath: string, cause?: unknown) {
    super(filePath, cause);
    this.name = "SecretBindingsFileCorruptedError";
    this.message =
      `secret bindings file is not valid JSON or corrupted and was left untouched: ${filePath}. ` +
      `Refusing to overwrite it — repair or move the file aside first.`;
  }
}

export function getSecretBindingsFilePath(): string {
  const override = process.env.NOLO_SECRET_BINDINGS_FILE;
  if (override && override.trim()) return override.trim();
  return join(resolveCredentialsDir(), "secret_bindings.json");
}

function ensureDirectorySecured(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  }
  try {
    chmodSync(dirPath, 0o700);
  } catch {
    // best-effort on filesystems without POSIX modes
  }
}

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

let lockDepth = 0;

export function withSecretsLock<T>(fn: () => T): T {
  if (lockDepth > 0) {
    lockDepth++;
    try {
      return fn();
    } finally {
      lockDepth--;
    }
  }

  const lockPath = `${getSecretBindingsFilePath()}.lock`;
  ensureDirectorySecured(dirname(lockPath));
  const deadline = Date.now() + 2000;
  let fd: number | null = null;
  for (;;) {
    try {
      fd = openSync(lockPath, "wx", 0o600);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (Date.now() > deadline) {
        throw new Error(`timed out waiting for the secret bindings lock: ${lockPath}`);
      }
      sleepSync(20);
    }
  }
  lockDepth = 1;
  try {
    return fn();
  } finally {
    lockDepth = 0;
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

export function validateAlias(alias: unknown): asserts alias is string {
  if (typeof alias !== "string" || !alias || !/^[a-z0-9_]+$/.test(alias)) {
    throw new Error(
      `Invalid alias: ${JSON.stringify(alias)}. Alias must be a non-empty string consisting only of lowercase letters, digits, and underscores.`,
    );
  }
}

export function validateBrokerRef(brokerRef: unknown): asserts brokerRef is string {
  if (typeof brokerRef !== "string" || !brokerRef) {
    throw new Error(`Invalid brokerRef: brokerRef must be a non-empty string.`);
  }
  if (brokerRef.includes("$nolo_cred:")) {
    throw new Error(
      `Invalid brokerRef: "${brokerRef}". Must not contain "$nolo_cred:" prefix.`,
    );
  }
  if (brokerRef.includes("/") || brokerRef.includes("\\") || brokerRef.includes("..")) {
    throw new Error(
      `Invalid brokerRef: "${brokerRef}". Path traversal characters ("/", "\\", "..") are strictly forbidden.`,
    );
  }
  if (!brokerRef.startsWith("vault-cred-") || brokerRef === "vault-cred-") {
    throw new Error(
      `Invalid brokerRef: "${brokerRef}". Must start with "vault-cred-".`,
    );
  }
  if (!/^vault-cred-[a-zA-Z0-9_.-]+$/.test(brokerRef)) {
    throw new Error(
      `Invalid brokerRef: "${brokerRef}". Contains invalid characters.`,
    );
  }
}

export function validateEnvName(envName: unknown): asserts envName is string {
  if (
    typeof envName !== "string" ||
    !envName ||
    !/^[A-Z_][A-Z0-9_]*$/.test(envName)
  ) {
    throw new Error(
      `Invalid envName: ${JSON.stringify(envName)}. Must be a non-empty string matching standard environment variable naming (uppercase letters, digits, and underscores, not beginning with a digit).`,
    );
  }
}

function isValidSecretBinding(entry: unknown, expectedAlias?: string): entry is SecretBinding {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
  const b = entry as Record<string, unknown>;
  if (b.version !== 1) return false;
  if (typeof b.alias !== "string" || !/^[a-z0-9_]+$/.test(b.alias)) return false;
  if (expectedAlias !== undefined && b.alias !== expectedAlias) return false;
  if (
    typeof b.brokerRef !== "string" ||
    !b.brokerRef.startsWith("vault-cred-") ||
    b.brokerRef === "vault-cred-" ||
    b.brokerRef.includes("..") ||
    b.brokerRef.includes("/") ||
    b.brokerRef.includes("\\") ||
    b.brokerRef.includes("$nolo_cred:") ||
    !/^vault-cred-[a-zA-Z0-9_.-]+$/.test(b.brokerRef)
  ) {
    return false;
  }
  if (typeof b.envName !== "string" || !/^[A-Z_][A-Z0-9_]*$/.test(b.envName)) return false;
  if (typeof b.createdAt !== "number" || !Number.isFinite(b.createdAt)) return false;
  if (typeof b.updatedAt !== "number" || !Number.isFinite(b.updatedAt)) return false;
  if (b.ownerUserId !== undefined && typeof b.ownerUserId !== "string") return false;
  return true;
}

function readSecretBindingsData(): Record<string, SecretBinding> {
  const filePath = getSecretBindingsFilePath();
  if (!existsSync(filePath)) return {};
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (error) {
    throw new SecretBindingsFileCorruptedError(filePath, error);
  }
  if (!raw.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new SecretBindingsFileCorruptedError(filePath, error);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SecretBindingsFileCorruptedError(filePath);
  }

  const result: Record<string, SecretBinding> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isValidSecretBinding(value, key)) {
      throw new SecretBindingsFileCorruptedError(filePath);
    }
    result[key] = value;
  }
  return result;
}

function writeSecretBindingsData(data: Record<string, SecretBinding>): void {
  const filePath = getSecretBindingsFilePath();
  const dir = dirname(filePath);
  ensureDirectorySecured(dir);

  const tempPath = join(
    dir,
    `.secret_bindings-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`,
  );
  writeFileSync(tempPath, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
  try {
    chmodSync(tempPath, 0o600);
  } catch {
    // best-effort
  }
  renameSync(tempPath, filePath);
  try {
    chmodSync(filePath, 0o600);
  } catch {
    // best-effort
  }
}

export type SecretBindingsReadResult =
  | { data: Record<string, SecretBinding>; bindings: SecretBinding[]; corrupted: false }
  | { data: Record<string, SecretBinding>; bindings: SecretBinding[]; corrupted: true; error: Error };

export function readSecretBindingsForRead(): SecretBindingsReadResult {
  try {
    const data = readSecretBindingsData();
    const bindings = Object.values(data).sort((a, b) => a.alias.localeCompare(b.alias));
    return { data, bindings, corrupted: false };
  } catch (error) {
    return { data: {}, bindings: [], corrupted: true, error: error as Error };
  }
}

export function listSecretBindings(): SecretBinding[] {
  const data = readSecretBindingsData();
  return Object.values(data).sort((a, b) => a.alias.localeCompare(b.alias));
}

export function getSecretBinding(alias: string): SecretBinding | undefined {
  if (!alias || typeof alias !== "string") return undefined;
  const data = readSecretBindingsData();
  return data[alias];
}

export function setSecretBinding(binding: SetSecretBindingInput): void {
  if (!binding || typeof binding !== "object") {
    throw new Error("binding must be an object");
  }
  validateAlias(binding.alias);
  validateBrokerRef(binding.brokerRef);
  validateEnvName(binding.envName);

  withSecretsLock(() => {
    const data = readSecretBindingsData();
    const existing = data[binding.alias];
    const now = Date.now();
    const newRecord: SecretBinding = {
      version: 1,
      alias: binding.alias,
      brokerRef: binding.brokerRef,
      envName: binding.envName,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
    if (binding.ownerUserId !== undefined) {
      newRecord.ownerUserId = binding.ownerUserId;
    } else if (existing?.ownerUserId !== undefined) {
      newRecord.ownerUserId = existing.ownerUserId;
    }
    data[binding.alias] = newRecord;
    writeSecretBindingsData(data);
  });
}

export function deleteSecretBinding(alias: string): boolean {
  if (!alias || typeof alias !== "string") return false;
  return withSecretsLock(() => {
    const data = readSecretBindingsData();
    if (!(alias in data)) return false;
    delete data[alias];
    writeSecretBindingsData(data);
    return true;
  });
}
