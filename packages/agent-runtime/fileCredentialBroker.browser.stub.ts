/**
 * Browser/webview-safe credential broker.
 *
 * - Public web: in-memory Map (session-only).
 * - Desktop webview: HTTP bridge to host Bun `POST /api/desktop/credentials`
 *   which persists via createFileCredentialBroker under ~/.nolo/credentials/keys/.
 *
 * Host put failures must throw so migrate never strips raw keys silently.
 */

import { toErrorMessage } from "core/errorMessage";
import { isRecord } from "core/isRecord";
import { asTrimmedString } from "core/trimmedString";
import type { CredentialBroker, CredentialRef } from "./credentialBroker";
import { assertCredentialRef } from "./credentialBroker";

// Fallback when localStorage unavailable (private mode / test / non-DOM).
const memoryStore = new Map<string, string>();

const STORAGE_PREFIX = "nolo.cred.";

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function storageKey(ref: CredentialRef): string {
  return STORAGE_PREFIX + ref;
}

const DEFAULT_HOST_ENDPOINT = "/api/desktop/credentials";

export type CreateFileCredentialBrokerOptions = {
  homeDir?: string;
  credentialsDir?: string;
  /** Test/override: force host or memory path. */
  desktop?: boolean;
  fetchImpl?: typeof fetch;
  hostEndpoint?: string;
};

type HostCredentialOp = "get" | "put" | "delete" | "has";

function isDesktopEnvironment(override?: boolean): boolean {
  if (typeof override === "boolean") return override;
  const g = globalThis as { __NOLO_DESKTOP__?: unknown };
  if (g.__NOLO_DESKTOP__ === true) return true;
  try {
    const doc = (globalThis as { document?: Document }).document;
    if (doc?.documentElement?.dataset?.noloDesktop === "1") return true;
  } catch {
    // jsdom / non-DOM environments
  }
  return false;
}

async function hostCredentialRequest(args: {
  op: HostCredentialOp;
  ref: string;
  secret?: string;
  fetchImpl: typeof fetch;
  endpoint: string;
}): Promise<Record<string, unknown>> {
  const body: Record<string, string> = { op: args.op, ref: args.ref };
  if (args.secret !== undefined) {
    body.secret = args.secret;
  }

  let response: Response;
  try {
    response = await args.fetchImpl(args.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch (error) {
    throw new Error(
      `Desktop credential host unreachable: ${toErrorMessage(error)}`,
    );
  }

  let payload: Record<string, unknown> = {};
  try {
    const parsed = await response.json();
    if (isRecord(parsed)) {
      payload = parsed;
    }
  } catch {
    // non-JSON body
  }

  if (!response.ok || payload.ok === false) {
    const errText =
      typeof payload.error === "string" && payload.error
        ? payload.error
        : `host credential ${args.op} failed (${response.status})`;
    throw new Error(errText);
  }

  return payload;
}

function createHostCredentialBroker(options: {
  fetchImpl: typeof fetch;
  endpoint: string;
}): CredentialBroker {
  const { fetchImpl, endpoint } = options;
  return {
    async get(ref: CredentialRef): Promise<string | null> {
      const safeRef = assertCredentialRef(ref);
      const payload = await hostCredentialRequest({
        op: "get",
        ref: safeRef,
        fetchImpl,
        endpoint,
      });
      return typeof payload.secret === "string" ? payload.secret : null;
    },
    async put(ref: CredentialRef, secret: string): Promise<void> {
      const safeRef = assertCredentialRef(ref);
      const value = asTrimmedString(secret);
      if (!value) {
        throw new Error(`Refusing to store empty secret for ref: ${safeRef}`);
      }
      await hostCredentialRequest({
        op: "put",
        ref: safeRef,
        secret: value,
        fetchImpl,
        endpoint,
      });
    },
    async delete(ref: CredentialRef): Promise<void> {
      const safeRef = assertCredentialRef(ref);
      await hostCredentialRequest({
        op: "delete",
        ref: safeRef,
        fetchImpl,
        endpoint,
      });
    },
    async has(ref: CredentialRef): Promise<boolean> {
      const safeRef = assertCredentialRef(ref);
      const payload = await hostCredentialRequest({
        op: "has",
        ref: safeRef,
        fetchImpl,
        endpoint,
      });
      return Boolean(payload.has);
    },
  };
}

function createPersistentBrowserBroker(): CredentialBroker {
  return {
    async get(ref: CredentialRef): Promise<string | null> {
      assertCredentialRef(ref);
      const storage = getStorage();
      if (storage) {
        return storage.getItem(storageKey(ref)) ?? null;
      }
      return memoryStore.get(ref) ?? null;
    },
    async put(ref: CredentialRef, secret: string): Promise<void> {
      assertCredentialRef(ref);
      const value = asTrimmedString(secret);
      if (!value) {
        throw new Error(`Refusing to store empty secret for ref: ${ref}`);
      }
      const storage = getStorage();
      if (storage) {
        storage.setItem(storageKey(ref), value);
        return;
      }
      memoryStore.set(ref, value);
    },
    async delete(ref: CredentialRef): Promise<void> {
      assertCredentialRef(ref);
      const storage = getStorage();
      if (storage) {
        storage.removeItem(storageKey(ref));
        return;
      }
      memoryStore.delete(ref);
    },
    async has(ref: CredentialRef): Promise<boolean> {
      assertCredentialRef(ref);
      const storage = getStorage();
      if (storage) {
        return storage.getItem(storageKey(ref)) !== null;
      }
      return memoryStore.has(ref);
    },
  };
}

export function createFileCredentialBroker(
  options: CreateFileCredentialBrokerOptions = {},
): CredentialBroker {
  if (isDesktopEnvironment(options.desktop)) {
    const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    const endpoint = options.hostEndpoint ?? DEFAULT_HOST_ENDPOINT;
    return createHostCredentialBroker({ fetchImpl, endpoint });
  }
  return createPersistentBrowserBroker();
}

/** Test helper: clear persisted browser secrets (localStorage + memory fallback) between tests. */
export function __resetBrowserCredentialBrokerMemoryForTests(): void {
  const storage = getStorage();
  if (storage) {
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        storage.removeItem(key);
      }
    }
  }
  memoryStore.clear();
}
