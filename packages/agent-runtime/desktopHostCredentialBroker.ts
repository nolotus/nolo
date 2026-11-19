/**
 * Desktop host CredentialBroker factory.
 *
 * On darwin, defaults to macOS Keychain with lazy promote from the legacy file
 * broker. On win32, defaults to Windows Credential Manager with the same lazy
 * promote path. Linux (and explicit file override) keep the file broker until
 * a real Linux system store lands.
 *
 * Migration rules (Keychain / CredMan primary + legacy file):
 * - get primary hit is authoritative and may clean up a stale file copy;
 * - get primary miss → read file; on successful put to primary, delete file;
 * - promote put failure may return the file secret but must not delete file;
 * - new put writes primary only (no file fallback on put failure);
 * - has is true if either store has the ref;
 * - delete is idempotent on both stores (attempts both even when one fails).
 */

import type { CredentialBroker, CredentialRef } from "./credentialBroker";
import { createFileCredentialBroker, createLegacyFileCredentialBroker } from "./fileCredentialBroker";
import { createLinuxSecretServiceCredentialBroker } from "./linuxSecretServiceCredentialBroker";
import { createMacOsKeychainCredentialBroker } from "./macOsKeychainCredentialBroker";
import { createWindowsCredentialManagerBroker } from "./windowsCredentialManagerBroker";

export type DesktopCredentialStoreMode =
  | "keychain"
  | "credman"
  | "secret-service"
  | "file";

export type CreateDesktopHostCredentialBrokerOptions = {
  /** Override platform detection (tests). Defaults to process.platform. */
  platform?: NodeJS.Platform;
  /** Env map; reads NOLO_DESKTOP_CREDENTIAL_STORE. Defaults to process.env. */
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  /** Inject primary (Keychain) broker for tests. */
  keychainBroker?: CredentialBroker;
  /** Inject primary (Windows Credential Manager) broker for tests. */
  windowsCredentialBroker?: CredentialBroker;
  /** Inject strict Linux Secret Service broker for tests. */
  linuxSecretServiceBroker?: CredentialBroker;
  /** Inject legacy file broker for tests. */
  fileBroker?: CredentialBroker;
  /** Factory for Keychain broker when not injected. */
  createKeychainBroker?: () => CredentialBroker;
  /** Factory for Windows Credential Manager broker when not injected. */
  createWindowsCredentialBroker?: () => CredentialBroker;
  /** Factory for Linux Secret Service broker when not injected. */
  createLinuxSecretServiceBroker?: () => CredentialBroker;
  /** Factory for file broker when not injected. */
  createFileBroker?: () => CredentialBroker;
};

function resolveStoreMode(options: CreateDesktopHostCredentialBrokerOptions): DesktopCredentialStoreMode {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const override = String(env.NOLO_DESKTOP_CREDENTIAL_STORE ?? "")
    .trim()
    .toLowerCase();
  // Emergency escape hatch: force file store on any platform.
  if (override === "file") {
    return "file";
  }
  // Linux 系统安全区（Secret Service）：显式 opt-in 才启用。默认仍走 file，
  // 以免在未做真机验证前改变既有用户的凭据落点、或迁移他们已有的凭据。
  if (override === "secret-service") {
    return "secret-service";
  }
  if (platform === "darwin") {
    return "keychain";
  }
  if (platform === "win32") {
    return "credman";
  }
  // Linux host system store is opt-in until verified on real hardware.
  return "file";
}

/** Attempt cleanup of both stores even if one is unavailable. */
async function deleteCredentialCopies(
  ref: CredentialRef,
  primary: Pick<CredentialBroker, "delete">,
  legacy: Partial<Pick<CredentialBroker, "delete">>,
): Promise<void> {
  let failed = false;
  try {
    await primary.delete(ref);
  } catch {
    failed = true;
  }
  try {
    await legacy.delete?.(ref);
  } catch {
    failed = true;
  }
  if (failed) throw new Error("credential_broker_delete_failed");
}

/**
 * Compose a platform system store + legacy file for lazy one-way promote on get.
 * Shared by macOS Keychain and Windows Credential Manager.
 */
function createMigratingSystemStoreBroker(args: {
  primary: CredentialBroker;
  file: CredentialBroker;
}): CredentialBroker {
  const { primary, file } = args;

  return {
    async get(ref) {
      const fromPrimary = await primary.get(ref);
      if (fromPrimary != null && fromPrimary.length > 0) {
        // Retry cleanup after an earlier promote succeeded but file deletion
        // failed. Primary is already authoritative, so cleanup is best-effort.
        try {
          await file.delete(ref);
        } catch {
          // A later read/delete can retry; never block use of the primary copy.
        }
        return fromPrimary;
      }

      const fromFile = await file.get(ref);
      if (fromFile == null || fromFile.length === 0) {
        return null;
      }

      // Lazy promote: only delete file after primary put succeeds.
      try {
        await primary.put(ref, fromFile);
      } catch {
        // Keep file; still return the secret so callers are not blocked.
        return fromFile;
      }

      try {
        await file.delete(ref);
      } catch {
        // Already durable in primary; leftover file is safe for a later get.
      }
      return fromFile;
    },

    async put(ref, secret) {
      // New writes go only to the system store. Fail closed — never fall back to file.
      await primary.put(ref, secret);
    },

    delete(ref) {
      return deleteCredentialCopies(ref, primary, file);
    },

    async has(ref) {
      if (await primary.has(ref)) return true;
      return Boolean(await file.has(ref));
    },
  };
}

/**
 * 关闭态 broker：所有读写都失败，`has` 恒 false。
 *
 * 用途是「安全存储不可用」时仍然持有一个满足 `CredentialBroker` 接口的对象，
 * 让上游 fail closed（不落盘、不外发），而不是回退到明文文件 broker。
 */
export function createClosedCredentialBroker(
  code: string = "credential_store_unavailable",
): CredentialBroker {
  const fail = (): never => {
    throw new Error(code);
  };
  return {
    get: fail,
    put: fail,
    delete: fail,
    has: () => false,
  };
}

/**
 * 严格宿主凭据存储：**只用操作系统安全区，没有任何明文文件回退**。
 *
 * - darwin → Keychain，win32 → Credential Manager，linux → Secret Service；
 * - 其他平台，或用户把 `NOLO_DESKTOP_CREDENTIAL_STORE` 强制设为 `file`：
 *   返回关闭态 broker（`credential_store_unsupported` / `credential_store_file_not_allowed`），
 *   调用方据此 fail closed；
 * - 与 `createDesktopHostCredentialBroker` 的关键差别：不构造 file broker、不做
 *   legacy 迁移读取——因此绝不会读取或改写用户既有的明文凭据文件。
 */
/**
 * 宿主凭据 broker 链（严格 → 会话内存 → 遗留只读文件）。
 *
 * - 读：严格安全区 → 会话内存 → 遗留 file broker（只读，不迁移）；
 * - 写：**只写严格安全区**；严格不可用（抛错或未落库）时写会话内存并一次性告警，
 *   **绝不写明文文件**；
 * - 删：三处都清。
 */
export function createHostCredentialBrokerChain(args: {
  strict: CredentialBroker;
  session: CredentialBroker;
  legacy?: CredentialBroker;
  notifySessionFallback?: () => void;
  notifyLegacyHit?: (ref: CredentialRef) => void;
}): CredentialBroker {
  const { strict, session, legacy, notifySessionFallback, notifyLegacyHit } = args;
  const legacyNoticed = new Set<string>();
  let sessionNotified = false;

  const noticeSession = () => {
    if (sessionNotified || !notifySessionFallback) return;
    sessionNotified = true;
    try {
      notifySessionFallback();
    } catch {
      // 提示失败不影响使用。
    }
  };

  return {
    async get(ref) {
      try {
        const strictValue = await strict.get(ref);
        if (strictValue !== null && strictValue !== undefined) return strictValue;
      } catch {
        // 严格区不可用：继续按会话内存 → 遗留的顺序回退。
      }
      const sessionValue = await session.get(ref);
      if (sessionValue !== null && sessionValue !== undefined) return sessionValue;
      if (!legacy) return null;
      const legacyValue = await legacy.get(ref);
      if (legacyValue !== null && legacyValue !== undefined) {
        if (notifyLegacyHit && !legacyNoticed.has(ref)) {
          legacyNoticed.add(ref);
          try {
            notifyLegacyHit(ref);
          } catch {
            // 忽略提示失败。
          }
        }
        return legacyValue;
      }
      return null;
    },
    async put(ref, secret) {
      try {
        await strict.put(ref, secret);
        if (await strict.has(ref)) return;
      } catch {
        // 落到会话内存（下面统一处理）。
      }
      await session.put(ref, secret);
      noticeSession();
    },
    async delete(ref) {
      try {
        await strict.delete(ref);
      } catch {
        // 严格区删除失败不阻止清理其它层。
      }
      try {
        await session.delete(ref);
      } catch {
        // 同上。
      }
      if (legacy) await legacy.delete(ref);
    },
    async has(ref) {
      try {
        if (await strict.has(ref)) return true;
      } catch {
        // 严格区不可用：继续看会话内存/遗留。
      }
      if (await session.has(ref)) return true;
      return legacy ? await legacy.has(ref) : false;
    },
  };
}

/**
 * 「读旧、写新」的遗留凭据回退（只读回退，不做迁移）。
 *
 * 语义（每一条都被 `legacyReadFallback.test.ts` 锁定）：
 * - `get`/`has`：先严格安全区；**未命中**时才只读地查遗留 file broker，命中即返回。
 * - `put`：**只写严格安全区**，绝不在遗留文件里写明文（安全区不可用就抛给调用方）。
 * - `delete`：尝试删除主库和遗留副本（若提供 legacy.delete）；任一失败都报错。
 * - 遗留库读取异常视为未命中；主库异常不降级。
 * - 首次用到遗留凭据时通过 `notifyLegacyHit(ref)` 提示一次，按 ref 去重，不刷屏。
 *
 * 为什么需要它：切到严格 broker 后，既有 `api-key:agent-*` 凭据全在旧
 * `~/.nolo/credentials/keys/*.json` 里，读不到就会让原本能用的 agent 立刻不可用。
 */
export function createLegacyReadFallbackCredentialBroker(args: {
  primary: CredentialBroker;
  legacy: Pick<CredentialBroker, "get" | "has"> & Partial<Pick<CredentialBroker, "delete">>;
  notifyLegacyHit?: (ref: string) => void;
}): CredentialBroker {
  const { primary, legacy, notifyLegacyHit } = args;
  const noticed = new Set<string>();
  const noticeOnce = (ref: string) => {
    if (!notifyLegacyHit || noticed.has(ref)) return;
    noticed.add(ref);
    try {
      notifyLegacyHit(ref);
    } catch {
      // 提示失败不影响凭据取用。
    }
  };

  return {
    async get(ref) {
      const value = await primary.get(ref);
      if (value !== null && value !== undefined) return value;
      let legacyValue: string | null;
      try {
        legacyValue = await legacy.get(ref);
      } catch {
        return null;
      }
      if (legacyValue !== null && legacyValue !== undefined) {
        noticeOnce(ref);
        return legacyValue;
      }
      return null;
    },
    async put(ref, secret) {
      // 只写严格安全区：遗留明文文件永不因为新写入而出现/更新。
      await primary.put(ref, secret);
    },
    delete(ref) {
      return deleteCredentialCopies(ref, primary, legacy);
    },
    async has(ref) {
      if (await primary.has(ref)) return true;
      let legacyHas: boolean;
      try {
        legacyHas = await legacy.has(ref);
      } catch {
        return false;
      }
      if (legacyHas) noticeOnce(ref);
      return legacyHas;
    },
  };
}

/**
 * 严格安全区不可用时的**显式降级**包装：主 broker 抛错/未落库时改用 `fallback`
 * （file broker），并通过 `notify` 报告降级事实——绝不静默丢失写入。
 * 用途：没有钥匙串的环境里「贴 key」仍可用，而不是变成 [REDACTED]。
 */
export function createFallbackCredentialBroker(args: {
  primary: CredentialBroker;
  fallback: CredentialBroker;
  notify?: (event: { op: string; reason: string }) => void;
}): CredentialBroker {
  const { primary, fallback, notify } = args;
  const report = (op: string, error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    notify?.({ op, reason });
  };
  return {
    async get(ref) {
      try {
        const value = await primary.get(ref);
        if (value !== null && value !== undefined) return value;
      } catch (error) {
        report("get", error);
      }
      return await fallback.get(ref);
    },
    async put(ref, secret) {
      try {
        await primary.put(ref, secret);
        if (await primary.has(ref)) return;
        report("put", new Error("primary store did not persist the credential"));
      } catch (error) {
        report("put", error);
      }
      await fallback.put(ref, secret);
    },
    async delete(ref) {
      try {
        await primary.delete(ref);
      } catch (error) {
        report("delete", error);
      }
      await fallback.delete(ref);
    },
    async has(ref) {
      try {
        if (await primary.has(ref)) return true;
      } catch (error) {
        report("has", error);
      }
      return await fallback.has(ref);
    },
  };
}

export function createStrictHostCredentialBroker(
  options: CreateDesktopHostCredentialBrokerOptions = {},
): CredentialBroker {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const override = String(env.NOLO_DESKTOP_CREDENTIAL_STORE ?? "")
    .trim()
    .toLowerCase();

  if (override === "file") {
    // 严格模式不接受明文文件档位：让上层看到「不可用」，而不是悄悄落盘。
    return createClosedCredentialBroker("credential_store_file_not_allowed");
  }

  // Strict-only CLI callers keep their platform policy (no implicit file mode).
  if (platform === "darwin" || override === "keychain") return createSystemStoreBroker("keychain", options);
  if (platform === "win32" || override === "credman") return createSystemStoreBroker("credman", options);
  if (platform === "linux" || override === "secret-service") return createSystemStoreBroker("secret-service", options);
  return createClosedCredentialBroker("credential_store_unsupported");
}

function createSystemStoreBroker(
  mode: Exclude<DesktopCredentialStoreMode, "file">,
  options: CreateDesktopHostCredentialBrokerOptions,
): CredentialBroker {
  switch (mode) {
    case "keychain":
      return options.keychainBroker ?? options.createKeychainBroker?.() ?? createMacOsKeychainCredentialBroker();
    case "credman":
      return options.windowsCredentialBroker ?? options.createWindowsCredentialBroker?.() ?? createWindowsCredentialManagerBroker();
    case "secret-service":
      return options.linuxSecretServiceBroker ?? options.createLinuxSecretServiceBroker?.() ?? createLinuxSecretServiceCredentialBroker();
  }
}

function createDesktopFileBroker(options: CreateDesktopHostCredentialBrokerOptions): CredentialBroker {
  return options.fileBroker ?? options.createFileBroker?.() ?? createFileCredentialBroker();
}

/** Desktop host broker: native system stores with existing promotion policy, or file mode. */
export function createDesktopHostCredentialBroker(
  options: CreateDesktopHostCredentialBrokerOptions = {},
): CredentialBroker {
  const mode = resolveStoreMode(options);
  if (mode === "file") return createDesktopFileBroker(options);
  const primary = createSystemStoreBroker(mode, options);
  // Secret Service host reads/writes are strict about WHERE they write, but the
  // chain must match the provider one: a key the provider can still read from
  // the legacy file store has to be deletable through the same RPC entry, or
  // "delete" leaves a readable copy behind.
  if (mode === "secret-service") return createDesktopSecretServiceFallbackBroker(primary, options);
  return createMigratingSystemStoreBroker({ primary, file: createDesktopFileBroker(options) });
}

/**
 * Provider lookups and credential RPC deletion share this compatibility chain.
 *
 * Delegates to the host broker on purpose: two independently-assembled chains is
 * exactly how "RPC writes to one store while the provider reads another" and
 * "delete leaves a readable legacy copy" happened before. One constructor, one
 * mode resolution, one delete semantics.
 */
export function createDesktopProviderCredentialBroker(
  options: CreateDesktopHostCredentialBrokerOptions = {},
): CredentialBroker {
  return createDesktopHostCredentialBroker(options);
}

/**
 * Secret Service strict store + legacy file read fallback.
 *
 * Reads/has fall back to the legacy file store; writes only ever reach the
 * system store (the fallback broker never puts); delete clears BOTH so a
 * removed credential cannot be resurrected from the old plaintext copy.
 */
function createDesktopSecretServiceFallbackBroker(
  primary: CredentialBroker,
  options: CreateDesktopHostCredentialBrokerOptions,
): CredentialBroker {
  // Tests may inject a file broker; production uses the legacy-aware file
  // reader (handles the pre-migration path and the migration marker).
  const legacy =
    options.fileBroker ?? options.createFileBroker?.() ?? createLegacyFileCredentialBroker();
  return createLegacyReadFallbackCredentialBroker({ primary, legacy });
}
