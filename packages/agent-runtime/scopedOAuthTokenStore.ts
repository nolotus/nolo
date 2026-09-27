import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";

import { type AccountScope } from "./accountScopeContext";
import { type OAuthCredential, type OAuthProvider } from "./oauthTokenStore";
import { resolveNoloStateDir } from "./noloStateDir";

/**
 * Scoped OAuth token store — slice 1 (protocol + pure store, no production
 * call-site switched yet). Owns the account-scoped credential layout from
 * `docs/plans/2026-09-26-oauth-credential-account-scoping.md`.
 *
 * The caller never supplies `owner`: a scoped store handle is constructed with
 * an `AccountScope` and re-stamps/verifies it on every write/read, so "forgot
 * to pass owner" cannot happen.
 *
 * Locking contract: every public write path (writeAuthoritative / writeCas /
 * remove) acquires the per-(scope, provider, slot) cross-process lock itself,
 * inside which it re-reads, compares incarnation, and writes. There is no
 * public path that writes without holding the lock. For slice 5's two-lock
 * refresh flow (source scope lock → target scope lock, in that fixed order),
 * `withScopedLock` exposes the raw lease and all write methods accept an
 * already-held lease so callers can compose lock order without deadlocking.
 * A lease is only honoured while it is genuinely held: it must have been
 * minted by this implementation (private registry), not yet released, and —
 * re-verified inside the write path — still be the token recorded on disk.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const SCOPED_CREDENTIAL_SCHEMA_VERSION = 2 as const;
export const DEFAULT_SLOT = "default";

export type CredentialOwner =
  | { kind: "nolo-account"; serverOrigin: string; userId: string }
  | { kind: "local-unbound" };

export type Incarnation = {
  /** random UUID, fixed for the life of one credential incarnation */
  generationId: string;
  /** bumped on every same-incarnation write; reset to INITIAL_REVISION on authoritative replacement */
  revision: number;
};

/** schemaVersion-2 file body; `owner`/`slot`/`incarnation` are store-stamped, never caller-supplied */
export type ScopedOAuthCredentialFile = OAuthCredential & {
  schemaVersion: typeof SCOPED_CREDENTIAL_SCHEMA_VERSION;
  owner: CredentialOwner;
  slot: string;
  /**
   * Absent on legacy v1-shape records that were imported without one: reads
   * return "ok" with `incarnation` stably undefined (no synthetic id is ever
   * generated) and `writeCas` always conflicts until an authoritative write
   * stamps one.
   */
  incarnation?: Incarnation;
};

export type ScopedStoreReadResult =
  | { status: "ok"; credential: ScopedOAuthCredentialFile }
  | { status: "missing" }
  | { status: "invalid"; reason: string }
  | { status: "owner-mismatch"; expected: CredentialOwner; found: CredentialOwner | unknown };

/**
 * A credential file that definitely carries an incarnation — the return of
 * `writeAuthoritative` and a successful `writeCas`, both of which always
 * stamp one. Read results keep the optional field because legacy records may
 * lack it.
 */
export type ScopedOAuthCredentialFileWritten = ScopedOAuthCredentialFile & {
  incarnation: Incarnation;
};

export type CasConflict = {
  status: "conflict";
  expected: Incarnation;
  found: Incarnation | null;
};

export type CasWriteResult =
  | { status: "ok"; credential: ScopedOAuthCredentialFileWritten }
  | CasConflict;

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export function getScopedAccountsDir(homeDir?: string): string {
  return join(resolveNoloStateDir("credentials", homeDir), "accounts");
}

export function getScopedCredentialDir(scope: AccountScope, homeDir?: string): string {
  return join(getScopedAccountsDir(homeDir), scope.scopeKey);
}

export function getScopedCredentialPath(
  scope: AccountScope,
  provider: OAuthProvider,
  homeDir?: string,
  slot: string = DEFAULT_SLOT,
): string {
  const dir = getScopedCredentialDir(scope, homeDir);
  return slot === DEFAULT_SLOT
    ? join(dir, `${provider}.json`)
    : join(dir, `${provider}@${slot}.json`);
}

// ---------------------------------------------------------------------------
// Owner stamping
// ---------------------------------------------------------------------------

export function ownerForScope(scope: AccountScope): CredentialOwner {
  return scope.kind === "nolo-account"
    ? { kind: "nolo-account", serverOrigin: scope.canonicalOrigin, userId: scope.userId }
    : { kind: "local-unbound" };
}

function ownersEqual(a: CredentialOwner | unknown, b: CredentialOwner): boolean {
  if (typeof a !== "object" || a === null) return false;
  const ao = a as CredentialOwner;
  if (ao.kind !== b.kind) return false;
  if (b.kind === "local-unbound") return true;
  return (
    (ao as { serverOrigin?: string }).serverOrigin === b.serverOrigin &&
    (ao as { userId?: string }).userId === b.userId
  );
}

// ---------------------------------------------------------------------------
// Permissions / atomic write — mirrors oauthTokenStore's 0600/0700 policy
// ---------------------------------------------------------------------------

function ensurePrivateDir(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    chmodSync(dir, 0o700);
  } catch {
    // best-effort (Windows mounts may ignore chmod)
  }
}

function fsyncDirectory(dir: string): void {
  try {
    const fd = openSync(dir, "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  } catch {
    // best-effort; not every fs/platform supports directory fsync
  }
}

function atomicWritePrivateFile(path: string, body: string): void {
  const dir = dirname(path);
  const tmp = `${path}.tmp-${process.pid}-${randomUUID()}`;
  const fd = openSync(tmp, "w", 0o600);
  try {
    writeSync(fd, body, 0, "utf8");
    // fsync file before rename so a crash can't leave a torn write under the
    // final name.
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  try {
    chmodSync(tmp, 0o600);
  } catch {
    // best-effort
  }
  renameSync(tmp, path);
  fsyncDirectory(dir);
}

// ---------------------------------------------------------------------------
// Cross-process lock — mkdir-based, one lock per (scope, provider, slot)
//
// Mutual exclusion rests on mkdir() atomicity and NOTHING ELSE:
//
//   * every acquisition stamps an unreusable `token` (uuid) into lock.json;
//     release() only removes the lock if the on-disk record still carries the
//     same token — an old owner can never delete someone else's new lock.
//   * THERE IS NO AUTOMATIC STALE-LOCK RECLAMATION. It was deliberately
//     removed: under POSIX path semantics, `rename(dir → tombstone)` only
//     makes the *path* swap atomic — it cannot guarantee the directory being
//     moved is still the same instance the staleness check just inspected.
//     Between the check and the rename a new owner can acquire and stamp the
//     dir, and the rename would steal the fresh lock. No grace window,
//     double-check, or fingerprint closes that hole; instance-conditional
//     delete does not exist at this abstraction level.
//   * A leftover lock therefore always fails CLOSED: acquisition waits until
//     `timeoutMs` and then throws an actionable error naming the holder pid,
//     creation time, and lock path. A stale lock is surfaced to a human, not
//     silently stolen — mutual exclusion is never sacrificed for liveness.
//   * The only escape hatch is the explicit opt-in `allowForceReclaim` on the
//     acquire functions: after the timeout expires it moves the lock dir
//     aside (rename) and retries acquisition once. Callers must pass it
//     explicitly; no store code path sets it.
// ---------------------------------------------------------------------------

const LOCK_POLL_INTERVAL_MS = 25;

type LockRecord = {
  token: string;
  pid: number;
  createdAt: number;
};

function lockDirPath(
  scope: AccountScope,
  provider: OAuthProvider,
  homeDir: string | undefined,
  slot: string,
): string {
  return join(getScopedCredentialDir(scope, homeDir), `${provider}@${slot}.lock`);
}

function readLockRecord(dir: string): LockRecord | null {
  try {
    const raw = readFileSync(join(dir, "lock.json"), "utf8");
    const parsed = JSON.parse(raw) as Partial<LockRecord>;
    if (
      typeof parsed.token === "string" &&
      parsed.token.length > 0 &&
      typeof parsed.pid === "number" &&
      typeof parsed.createdAt === "number"
    ) {
      return parsed as LockRecord;
    }
  } catch {
    // unreadable body or file absent → treat as unknown holder
  }
  return null;
}

function describeLockDir(dir: string): string {
  const rec = readLockRecord(dir);
  return rec
    ? `held by pid ${rec.pid} (created ${new Date(rec.createdAt).toISOString()})`
    : "holder unknown (missing or malformed lock.json)";
}

function timeoutError(
  provider: OAuthProvider,
  slot: string,
  scopeKey: string,
  dir: string,
): Error {
  return new Error(
    `timed out acquiring credential lock for ${provider}@${slot} in scope ${scopeKey}: ` +
      `${describeLockDir(dir)}; lock path: ${dir}. ` +
      `Fail-closed: the lock was NOT removed. Confirm no nolo process is running ` +
      `(check the pid above), then delete that path and retry.`,
  );
}

export type ScopedLock = {
  /** unreusable identity token stamped into lock.json at acquisition */
  readonly token: string;
  /**
   * Release the lock. Only removes the lock dir if the on-disk record still
   * carries this lease's token — if the lock was taken over behind our back
   * and a new owner acquired it, release() leaves the new lock untouched.
   * Idempotent; after the first call the lease is permanently invalid.
   */
  release(): void;
};

/**
 * Private registry of leases minted by this implementation. `live` holds only
 * leases that are still held — `release()` deletes its entry, so a saved or
 * forged `ScopedLease`-shaped object can never satisfy a store write.
 */
const leaseRegistry = new WeakMap<
  ScopedLock,
  { lockKey: string; token: string; live: boolean }
>();

function mintLease(dir: string, token: string): ScopedLock {
  const rec = { lockKey: dir, token, live: true };
  const lease: ScopedLock = {
    token,
    release() {
      if (!rec.live) return;
      rec.live = false;
      // Token check: only remove the dir if the record inside is still ours.
      const onDisk = readLockRecord(dir);
      if (!onDisk || onDisk.token !== token) return;
      try {
        unlinkSync(join(dir, "lock.json"));
      } catch {
        // record already gone — the dir may have been swept under us
      }
      try {
        rmdirSync(dir);
      } catch {
        // not empty / already gone → someone else's lock; leave it alone
      }
    },
  };
  leaseRegistry.set(lease, rec);
  return lease;
}

export type AcquireScopedLockArgs = {
  scope: AccountScope;
  provider: OAuthProvider;
  homeDir?: string;
  slot?: string;
  timeoutMs?: number;
  /**
   * Explicit opt-in escape hatch, default off and never set by any store code
   * path: after `timeoutMs` expires, move the existing lock dir aside
   * (rename-then-delete) and retry acquisition once. There is intentionally
   * NO automatic stale reclamation — see the locking comment above for why
   * it can never be made safe. Only pass true for an explicit operator-driven
   * "break the lock" action.
   */
  allowForceReclaim?: boolean;
  /**
   * Injection point for tests: the clock used for the acquire deadline and
   * the stamped `createdAt`. The poll sleep itself still uses real time
   * (unless `sleep` is also injected).
   */
  now?: () => number;
  /** injection point for tests */
  sleep?: (ms: number) => Promise<void>;
};

type LockAttemptResult = { ok: true; lease: ScopedLock } | { ok: false };

function tryAcquireOnce(dir: string, now: () => number): LockAttemptResult {
  ensurePrivateDir(dirname(dir));
  try {
    mkdirSync(dir, { mode: 0o700 });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return { ok: false };
    throw err;
  }
  // Won the atomic create → stamp our unreusable owner token.
  const token = randomUUID();
  const body = JSON.stringify({
    token,
    pid: process.pid,
    createdAt: now(),
  } satisfies LockRecord);
  writeFileSync(join(dir, "lock.json"), body, { encoding: "utf8", mode: 0o600 });
  return { ok: true, lease: mintLease(dir, token) };
}

/**
 * Move the existing lock dir aside via rename so acquisition can be retried.
 * Called only from the explicit `allowForceReclaim` path after the timeout
 * fired — never automatically. Returns true if the rename won.
 */
function forceReclaimLockDir(dir: string): boolean {
  const tombstone = `${dir}.reclaimed-${process.pid}-${randomUUID()}`;
  try {
    renameSync(dir, tombstone);
  } catch {
    // ENOENT → already gone (fine, retry will mkdir); other errors → give up.
    return false;
  }
  try {
    unlinkSync(join(tombstone, "lock.json"));
  } catch {
    // no record inside
  }
  try {
    rmdirSync(tombstone);
  } catch {
    // unexpected extra entries — tombstone no longer blocks the lock path;
    // leave it for manual cleanup rather than touching `dir` again.
  }
  return true;
}

/**
 * Acquire the cross-process lock for (scope, provider, slot).
 *
 * Uses `mkdir` (atomic on POSIX and Windows) on a `<provider>@<slot>.lock`
 * directory containing `lock.json` = { token, pid, createdAt }. While the dir
 * exists, acquisition only waits — there is no automatic stale reclamation —
 * and after `timeoutMs` it throws an actionable error (holder pid, createdAt,
 * lock path, remediation). `allowForceReclaim: true` converts the timeout
 * into a single rename-aside + retry.
 */
export async function acquireScopedLock(args: AcquireScopedLockArgs): Promise<ScopedLock> {
  const slot = args.slot ?? DEFAULT_SLOT;
  const timeoutMs = args.timeoutMs ?? 10_000;
  const sleep =
    args.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = args.now ?? Date.now;

  const dir = lockDirPath(args.scope, args.provider, args.homeDir, slot);
  const deadline = now() + timeoutMs;

  for (;;) {
    const attempt = tryAcquireOnce(dir, now);
    if (attempt.ok) return attempt.lease;
    if (now() > deadline) break;
    await sleep(LOCK_POLL_INTERVAL_MS);
  }

  if (args.allowForceReclaim === true) {
    forceReclaimLockDir(dir);
    const attempt = tryAcquireOnce(dir, now);
    if (attempt.ok) return attempt.lease;
  }
  throw timeoutError(args.provider, slot, args.scope.scopeKey, dir);
}

/** Synchronous variant for non-async call paths (same protocol). */
export function acquireScopedLockSync(args: AcquireScopedLockArgs): ScopedLock {
  const slot = args.slot ?? DEFAULT_SLOT;
  const timeoutMs = args.timeoutMs ?? 10_000;
  const now = args.now ?? Date.now;
  const dir = lockDirPath(args.scope, args.provider, args.homeDir, slot);
  const deadline = now() + timeoutMs;

  for (;;) {
    const attempt = tryAcquireOnce(dir, now);
    if (attempt.ok) return attempt.lease;
    if (now() > deadline) break;
    // crude busy-wait for the sync path; refresh flows use the async lock.
    // `Atomics.wait` is the portable option and doesn't depend on Bun.
    const sab = new Int32Array(new SharedArrayBuffer(4));
    Atomics.wait(sab, 0, 0, LOCK_POLL_INTERVAL_MS);
  }

  if (args.allowForceReclaim === true) {
    forceReclaimLockDir(dir);
    const attempt = tryAcquireOnce(dir, now);
    if (attempt.ok) return attempt.lease;
  }
  throw timeoutError(args.provider, slot, args.scope.scopeKey, dir);
}

// ---------------------------------------------------------------------------
// Scoped store
// ---------------------------------------------------------------------------

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * incarnation is optional on the file (legacy v1-shape records imported
 * without one stay readable), but when present it must be structurally valid:
 * a malformed incarnation marks the whole record invalid rather than being
 * silently dropped.
 */
function parseIncarnation(
  v: unknown,
): { absent: boolean; malformed: boolean; inc?: Incarnation } {
  if (v === undefined) return { absent: true, malformed: false };
  if (!isPlainObject(v)) return { absent: false, malformed: true };
  const generationId = v.generationId;
  const revision = v.revision;
  if (typeof generationId !== "string" || generationId.length === 0) {
    return { absent: false, malformed: true };
  }
  if (typeof revision !== "number" || !Number.isInteger(revision) || revision < 0) {
    return { absent: false, malformed: true };
  }
  return { absent: false, malformed: false, inc: { generationId, revision } };
}

function parseScopedFile(
  raw: string,
  provider: OAuthProvider,
  expectedOwner: CredentialOwner,
): ScopedStoreReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "invalid", reason: "credential file is not valid JSON" };
  }
  if (!isPlainObject(parsed)) return { status: "invalid", reason: "credential file is not an object" };
  if (parsed.schemaVersion !== SCOPED_CREDENTIAL_SCHEMA_VERSION) {
    return { status: "invalid", reason: `schemaVersion is ${parsed.schemaVersion}, expected ${SCOPED_CREDENTIAL_SCHEMA_VERSION}` };
  }
  if (parsed.provider !== provider) {
    return { status: "invalid", reason: `provider is ${parsed.provider}, expected ${provider}` };
  }
  if (!ownersEqual(parsed.owner, expectedOwner)) {
    return { status: "owner-mismatch", expected: expectedOwner, found: parsed.owner };
  }
  if (typeof parsed.accessToken !== "string" || !parsed.accessToken) {
    return { status: "invalid", reason: "missing accessToken" };
  }
  const inc = parseIncarnation(parsed.incarnation);
  if (inc.malformed) {
    return { status: "invalid", reason: "malformed incarnation (generationId must be a non-empty string, revision a non-negative integer)" };
  }
  // incarnation absent → stable absence: return the record verbatim with
  // `incarnation` undefined; CAS stays disabled until a first authoritative
  // write stamps one.
  return { status: "ok", credential: parsed as ScopedOAuthCredentialFile };
}

/**
 * A lease proving the caller already holds the (scope, provider, slot) lock.
 * Obtained via `acquireScopedLock`/`acquireScopedLockSync` or through
 * `store.withScopedLock`. Passing it to a write method lets that method skip
 * its own acquisition — required for slice 5's two-lock ordering (acquire the
 * source scope lock, then the target scope lock, then write both sides under
 * the held leases). Only live, registry-verified leases are honoured: a lease
 * minted for a different lock dir, a released lease, or a lease-shaped
 * impostor all throw rather than writing unprotected.
 */
export type ScopedLease = ScopedLock;

export type ScopedOAuthTokenStore = {
  scope: AccountScope;
  read(provider: OAuthProvider, slot?: string): ScopedStoreReadResult;
  /**
   * Authoritative write: always stamps a new `generationId` and resets
   * `revision` to `INITIAL_REVISION`. Used for first create, claim-create,
   * `--disconnect` rebuild, and normal re-auth over an existing credential —
   * every authoritative replacement, per the design.
   *
   * Acquires the (scope, provider, slot) lock internally, then re-reads and
   * writes under it. Pass `lease` only when already holding this exact lock
   * (e.g. inside `withScopedLock` or a slice-5 multi-lock section).
   */
  writeAuthoritative(
    provider: OAuthProvider,
    credential: OAuthCredential,
    slot?: string,
    lease?: ScopedLease,
  ): ScopedOAuthCredentialFileWritten;
  /**
   * Same-incarnation CAS write (refresh write-back). `expected` is the
   * incarnation captured at read time; on mismatch the store returns
   * `{status:"conflict"}` and does not touch the file.
   *
   * Acquires the lock internally and performs the read-compare-write inside
   * it; a credential whose file has no incarnation always conflicts
   * (found=null), it never silently promotes.
   */
  writeCas(
    provider: OAuthProvider,
    credential: OAuthCredential,
    expected: Incarnation,
    slot?: string,
    lease?: ScopedLease,
  ): CasWriteResult;
  remove(provider: OAuthProvider, slot?: string, lease?: ScopedLease): void;
  /**
   * Run `fn` while holding the (scope, provider, slot) lock. The lease passed
   * to `fn` may be handed to writeAuthoritative/writeCas/remove to compose a
   * multi-write section under one lock — and is how slice 5 orders
   * source→target locks without the store deadlocking on itself.
   */
  withScopedLock<T>(
    provider: OAuthProvider,
    slot: string | undefined,
    fn: (lease: ScopedLease) => T,
  ): T;
};

const INITIAL_REVISION = 1;

export function createScopedOAuthTokenStore(args: {
  scope: AccountScope;
  homeDir?: string;
}): ScopedOAuthTokenStore {
  const { scope, homeDir } = args;
  const expectedOwner = ownerForScope(scope);

  function stampFile(provider: OAuthProvider, credential: OAuthCredential, slot: string, incarnation: Incarnation): ScopedOAuthCredentialFileWritten {
    return {
      ...credential,
      provider,
      schemaVersion: SCOPED_CREDENTIAL_SCHEMA_VERSION,
      owner: expectedOwner,
      slot,
      incarnation,
    };
  }

  function path(provider: OAuthProvider, slot?: string): string {
    return getScopedCredentialPath(scope, provider, homeDir, slot ?? DEFAULT_SLOT);
  }

  function writeBody(file: ScopedOAuthCredentialFile): string {
    return `${JSON.stringify(file, null, 2)}\n`;
  }

  /**
   * Verify that `lease` is a genuine, currently-held lease for exactly `dir`:
   *   1. it must be in the private registry (minted here, not a lookalike);
   *   2. it must still be live (release() invalidates it);
   *   3. it must be bound to this lock dir;
   *   4. the on-disk lock record must still carry this lease's token — so a
   *      lease whose lock was swept and re-acquired by someone else is
   *      refused instead of writing under a lock we no longer hold.
   */
  function assertValidLease(lease: ScopedLease, dir: string): void {
    const rec = leaseRegistry.get(lease);
    if (!rec) {
      throw new Error(
        "scoped store: lease was not issued by this lock implementation — refusing to write without holding the lock",
      );
    }
    if (!rec.live) {
      throw new Error(
        "scoped store: lease has already been released — refusing to write under an expired lease",
      );
    }
    if (rec.lockKey !== dir) {
      throw new Error(
        `scoped store: lease does not cover lock ${dir} — refusing to write without holding the right lock`,
      );
    }
    const onDisk = readLockRecord(dir);
    if (!onDisk || onDisk.token !== rec.token) {
      throw new Error(
        `scoped store: lock at ${dir} is no longer held by this lease — refusing to write under a lock owned by someone else`,
      );
    }
  }

  /**
   * Run `fn` under the (scope, provider, slot) lock. If `lease` is supplied it
   * must pass `assertValidLease` for exactly this lock dir; anything else
   * throws — there is no write path that runs unprotected.
   */
  function underLock<T>(
    provider: OAuthProvider,
    slot: string,
    lease: ScopedLease | undefined,
    fn: () => T,
  ): T {
    const dir = lockDirPath(scope, provider, homeDir, slot);
    if (lease !== undefined) {
      assertValidLease(lease, dir);
      return fn();
    }
    const held = acquireScopedLockSync({ scope, provider, homeDir, slot });
    try {
      return fn();
    } finally {
      held.release();
    }
  }

  return {
    scope,

    read(provider, slot = DEFAULT_SLOT) {
      const p = path(provider, slot);
      if (!existsSync(p)) return { status: "missing" };
      return parseScopedFile(readFileSync(p, "utf8"), provider, expectedOwner);
    },

    writeAuthoritative(provider, credential, slot = DEFAULT_SLOT, lease) {
      return underLock(provider, slot, lease, () => {
        const p = path(provider, slot);
        ensurePrivateDir(dirname(p));
        // Authoritative replacement always rotates generationId — see "权威替换
        // 换 generationId" in the design; revision restarts at INITIAL_REVISION.
        const file = stampFile(provider, credential, slot, {
          generationId: randomUUID(),
          revision: INITIAL_REVISION,
        });
        atomicWritePrivateFile(p, writeBody(file));
        return file;
      });
    },

    writeCas(provider, credential, expected, slot = DEFAULT_SLOT, lease) {
      return underLock(provider, slot, lease, () => {
        const p = path(provider, slot);
        // Re-read + compare + write entirely inside the held lock → the CAS
        // write is atomic against other store users of this protocol.
        if (!existsSync(p)) {
          return { status: "conflict", expected, found: null };
        }
        const cur = parseScopedFile(readFileSync(p, "utf8"), provider, expectedOwner);
        if (cur.status !== "ok") {
          return { status: "conflict", expected, found: null };
        }
        const curInc = cur.credential.incarnation;
        if (
          !curInc ||
          curInc.generationId !== expected.generationId ||
          curInc.revision !== expected.revision
        ) {
          return { status: "conflict", expected, found: curInc ?? null };
        }
        const file = stampFile(provider, credential, slot, {
          generationId: curInc.generationId,
          revision: curInc.revision + 1,
        });
        atomicWritePrivateFile(p, writeBody(file));
        return { status: "ok", credential: file };
      });
    },

    remove(provider, slot = DEFAULT_SLOT, lease) {
      underLock(provider, slot, lease, () => {
        const p = path(provider, slot);
        if (!existsSync(p)) return;
        unlinkSync(p);
      });
    },

    withScopedLock(provider, slot = DEFAULT_SLOT, fn) {
      const held = acquireScopedLockSync({ scope, provider, homeDir, slot });
      try {
        return fn(held);
      } finally {
        held.release();
      }
    },
  };
}
