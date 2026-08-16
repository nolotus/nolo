/**
 * React Native Keychain-backed CredentialBroker.
 *
 * Metro resolves this module for native platforms via the `.native` extension
 * when importers request `./fileCredentialBroker` (same API as the Node file broker).
 *
 * Security rules:
 * - One Keychain service entry per credential ref (no bag dump of all API keys).
 * - Isolated service namespace under `nolo.credentials.keys.*` — never touches
 *   login tokens (`app_tokens`) or onboarding prefs (`nolo.localFirst.prefs`).
 * - Keychain failures throw (never fake success). Missing get → null.
 * - API keys must not enter AsyncStorage, Redux, Agent/Space/Dialog records, or logs.
 *
 * Note: `react-native-keychain` is loaded lazily so Bun pure-adapter tests can
 * inject a KeychainLike mock without pulling React Native into the test process.
 */

import { asTrimmedString } from "core/trimmedString";
import {
  assertCredentialRef,
  type CredentialBroker,
  type CredentialRef,
} from "./credentialBroker";

/** Stable prefix for API-key Keychain services. Isolated from auth/onboarding. */
export const RN_CREDENTIAL_KEYCHAIN_SERVICE_PREFIX = "nolo.credentials.keys";

/** Fixed username slot; isolation is via `service`, not username. */
const KEYCHAIN_USERNAME = "api-key";

/**
 * Minimal Keychain surface used by the broker (injectable for Bun unit tests).
 */
export type KeychainLike = {
  setGenericPassword: (
    username: string,
    password: string,
    options?: { service?: string },
  ) => Promise<false | { service: string; storage?: string }>;
  getGenericPassword: (
    options?: { service?: string },
  ) => Promise<
    | false
    | {
        username: string;
        password: string;
        service: string;
        storage?: string;
      }
  >;
  resetGenericPassword: (options?: { service?: string }) => Promise<boolean>;
  hasGenericPassword?: (options?: { service?: string }) => Promise<boolean>;
};

export type CreateFileCredentialBrokerOptions = {
  /**
   * Ignored on native (kept for interface parity with Node createFileCredentialBroker
   * and agentSlice factory typing).
   */
  homeDir?: string;
  /** Test/override Keychain implementation. Defaults to react-native-keychain. */
  keychain?: KeychainLike;
  /**
   * Override service prefix (tests only). Production must use the stable default
   * so rotate/restart reads the same entries.
   */
  servicePrefix?: string;
};

/**
 * Map a credential ref to a single Keychain `service` name.
 * Hex-encodes the full ref so sanitization cannot collide (`a:b` ≠ `a_b`)
 * and the result contains only safe `[0-9a-f.]` characters under the prefix.
 */
/**
 * Validate ref without echoing the raw value into externally visible errors.
 */
function safeCredentialRef(ref: CredentialRef): string {
  try {
    return assertCredentialRef(ref);
  } catch {
    throw new Error("invalid_ref");
  }
}

export function credentialRefToKeychainService(
  ref: CredentialRef,
  servicePrefix: string = RN_CREDENTIAL_KEYCHAIN_SERVICE_PREFIX,
): string {
  const safe = safeCredentialRef(ref);
  let hex = "";
  for (let i = 0; i < safe.length; i++) {
    const code = safe.charCodeAt(i);
    if (code > 0xff) {
      throw new Error("invalid_ref");
    }
    hex += code.toString(16).padStart(2, "0");
  }
  if (!hex) {
    throw new Error("invalid_ref");
  }
  return `${servicePrefix}.${hex}`;
}

/**
 * Externally visible Keychain failures must use stable codes only.
 * Never echo credential ref, file path, or raw native exception text.
 */
function rethrowKeychainError(op: string, _ref: string, _error: unknown): never {
  throw new Error(`credential_broker_${op}_failed`);
}

function loadDefaultKeychain(): KeychainLike {
  // Lazy require: keeps Bun unit tests free of the RN native graph.
  // Metro still bundles react-native-keychain when this path runs on device.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("react-native-keychain") as KeychainLike & {
    default?: KeychainLike;
  };
  return (mod?.default ?? mod) as KeychainLike;
}

/**
 * Keychain-backed CredentialBroker for metered API keys on React Native.
 * Interface matches createFileCredentialBroker / CredentialBroker exactly.
 */
export function createFileCredentialBroker(
  options: CreateFileCredentialBrokerOptions = {},
): CredentialBroker {
  const keychain: KeychainLike = options.keychain ?? loadDefaultKeychain();
  const servicePrefix =
    options.servicePrefix ?? RN_CREDENTIAL_KEYCHAIN_SERVICE_PREFIX;

  const serviceFor = (ref: CredentialRef): string =>
    credentialRefToKeychainService(ref, servicePrefix);

  return {
    async get(ref) {
      const safeRef = safeCredentialRef(ref);
      const service = serviceFor(safeRef);
      let credentials: Awaited<ReturnType<KeychainLike["getGenericPassword"]>>;
      try {
        credentials = await keychain.getGenericPassword({ service });
      } catch (error) {
        rethrowKeychainError("get", safeRef, error);
      }
      if (!credentials || typeof credentials.password !== "string") {
        return null;
      }
      const secret = credentials.password;
      return secret.length > 0 ? secret : null;
    },

    async put(ref, secret) {
      const safeRef = safeCredentialRef(ref);
      const value = asTrimmedString(secret);
      if (!value) {
        throw new Error("Cannot store an empty credential secret.");
      }
      const service = serviceFor(safeRef);
      let result: false | { service: string; storage?: string };
      try {
        result = await keychain.setGenericPassword(KEYCHAIN_USERNAME, value, {
          service,
        });
      } catch (error) {
        rethrowKeychainError("put", safeRef, error);
      }
      // Library may resolve false on failure — never treat as success.
      if (result === false) {
        throw new Error("credential_broker_put_failed");
      }
    },

    async delete(ref) {
      const safeRef = safeCredentialRef(ref);
      const service = serviceFor(safeRef);
      try {
        // Idempotent: missing entry may return false; only throw on hard errors.
        await keychain.resetGenericPassword({ service });
      } catch (error) {
        rethrowKeychainError("delete", safeRef, error);
      }
    },

    async has(ref) {
      const safeRef = safeCredentialRef(ref);
      const service = serviceFor(safeRef);
      try {
        if (typeof keychain.hasGenericPassword === "function") {
          return Boolean(await keychain.hasGenericPassword({ service }));
        }
        const credentials = await keychain.getGenericPassword({ service });
        return Boolean(
          credentials &&
            typeof credentials.password === "string" &&
            credentials.password.length > 0,
        );
      } catch (error) {
        rethrowKeychainError("has", safeRef, error);
      }
    },
  };
}
