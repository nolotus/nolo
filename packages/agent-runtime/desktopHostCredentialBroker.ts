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
import { createFileCredentialBroker } from "./fileCredentialBroker";
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

function resolveStoreMode(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): DesktopCredentialStoreMode {
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

    async delete(ref) {
      // Attempt both stores even when one fails, so a partial backend outage
      // cannot leave an avoidable legacy plaintext copy behind.
      let failed = false;
      try {
        await primary.delete(ref);
      } catch {
        failed = true;
      }
      try {
        await file.delete(ref);
      } catch {
        failed = true;
      }
      if (failed) {
        throw new Error("credential_broker_delete_failed");
      }
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
 * - `delete`：两处都清（最小风险：用户要求删除时不留可读副本）。
 * - 首次用到遗留凭据时通过 `notifyLegacyHit(ref)` 提示一次，按 ref 去重，不刷屏。
 *
 * 为什么需要它：切到严格 broker 后，既有 `api-key:agent-*` 凭据全在旧
 * `~/.nolo/credentials/keys/*.json` 里，读不到就会让原本能用的 agent 立刻不可用。
 */
export function createLegacyReadFallbackCredentialBroker(args: {
  primary: CredentialBroker;
  legacy: CredentialBroker;
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
      const legacyValue = await legacy.get(ref);
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
    async delete(ref) {
      await primary.delete(ref);
      await legacy.delete(ref);
    },
    async has(ref) {
      if (await primary.has(ref)) return true;
      const legacyHas = await legacy.has(ref);
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

  if (platform === "darwin" || override === "keychain") {
    return (
      options.keychainBroker ??
      (options.createKeychainBroker ??
        (() => createMacOsKeychainCredentialBroker()))()
    );
  }

  if (platform === "win32" || override === "credman") {
    return (
      options.windowsCredentialBroker ??
      (options.createWindowsCredentialBroker ??
        (() => createWindowsCredentialManagerBroker()))()
    );
  }

  if (platform === "linux" || override === "secret-service") {
    return (
      options.linuxSecretServiceBroker ??
      (options.createLinuxSecretServiceBroker ??
        (() => createLinuxSecretServiceCredentialBroker()))()
    );
  }

  return createClosedCredentialBroker("credential_store_unsupported");
}

/**
 * Desktop host default CredentialBroker.
 * - darwin → Keychain (+ file lazy promote) unless NOLO_DESKTOP_CREDENTIAL_STORE=file
 * - win32 → Windows Credential Manager (+ file lazy promote) unless override=file
 * - other platforms → file (until a Linux system store exists)
 */
export function createDesktopHostCredentialBroker(
  options: CreateDesktopHostCredentialBrokerOptions = {},
): CredentialBroker {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const mode = resolveStoreMode(platform, env);

  const createFile =
    options.createFileBroker ?? (() => createFileCredentialBroker());

  if (mode === "file") {
    return options.fileBroker ?? createFile();
  }

  if (mode === "secret-service") {
    // 严格模式：只用系统安全区。故意不构造 file broker —— 没有明文回退路径，
    // 也就不会读取或改写用户既有的文件凭据。
    const createLinux =
      options.createLinuxSecretServiceBroker ??
      (() => createLinuxSecretServiceCredentialBroker());
    return options.linuxSecretServiceBroker ?? createLinux();
  }

  const file = options.fileBroker ?? createFile();

  if (mode === "credman") {
    const createWindows =
      options.createWindowsCredentialBroker ??
      (() => createWindowsCredentialManagerBroker());
    const primary =
      options.windowsCredentialBroker ?? createWindows();
    return createMigratingSystemStoreBroker({ primary, file });
  }

  // mode === "keychain"
  const createKeychain =
    options.createKeychainBroker ??
    (() => createMacOsKeychainCredentialBroker());
  const primary = options.keychainBroker ?? createKeychain();

  return createMigratingSystemStoreBroker({ primary, file });
}
