// packages/cli/dialogNotifyMailbox.ts
//
// Cross-process delivery carrier for "notify a live ordinary CLI dialog".
//
// The receiving CLI process owns the only writer of the dialog's chat queue. A
// separate `nolo dialog notify` process therefore must not write the record
// store nor start a run: it drops a small immutable request file into a local
// mailbox directory owned by that dialog, and the live receiver admits it
// through the existing queue (`ChatQueueTuiBinding.admitExternalRequest`).
//
// Layout (all under the nolo home, owner-only):
//   <root>/<userId>/<dialogId>/<keyHash>.req.json   immutable request (mode 0600)
//   <root>/<userId>/<dialogId>/<keyHash>.ack.json   receiver receipt  (mode 0600)
//   <root>/<userId>/<dialogId>/receiver.json        receiver lease    (mode 0600)
//
// Delivery records are never deleted: `persisted` / `queued` / `consumed` is a
// forward-only transition recorded in the ack file, and the request file stays
// as the durable record of what was asked. Only our own temp files are removed.
//
// Directories are created 0700 (a directory needs the execute bit; 0600 would
// make it untraversable) and every file is 0600. Path segments are validated,
// no component may be a symlink, and every file write uses O_NOFOLLOW.

import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { constants as fsConstants } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { hostname } from "node:os";
import path from "node:path";
import { isSupportedDialogId } from "core/dialogKeyIdentity";
import { resolveNoloHome } from "../database-engine/dbPath";

/** Source tag retained on the durable user message, so history shows its origin. */
export const DIALOG_NOTIFY_SOURCE = "dialog-notify";

/** Hard cap on a single delivered message (UTF-8 bytes). */
export const MAX_NOTIFY_MESSAGE_BYTES = 32 * 1024;
/** Hard cap on retained requests per dialog: a full mailbox is refused, not pruned. */
export const MAX_NOTIFY_ENTRIES_PER_DIALOG = 512;
/** How long a receiver lease counts as live after its last heartbeat. */
export const NOTIFY_LEASE_TTL_MS = 15_000;

const ENTRY_SUFFIX = ".req.json";
const ACK_SUFFIX = ".ack.json";
const LEASE_NAME = "receiver.json";

const SAFE_SEGMENT = /^[A-Za-z0-9._-]{1,128}$/;
const SAFE_IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{1,200}$/;

/** `O_NOFOLLOW` / `O_DIRECTORY` are POSIX-only; absent flags degrade to 0. */
const O_NOFOLLOW = (fsConstants as { O_NOFOLLOW?: number }).O_NOFOLLOW ?? 0;

export type DialogNotifyErrorCode =
  | "invalid"
  | "unsupported"
  | "offline"
  | "conflict"
  | "quota"
  | "io";

export class DialogNotifyError extends Error {
  constructor(
    public readonly code: DialogNotifyErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DialogNotifyError";
  }
}

export type DialogNotifyDirs = {
  root: string;
  userDir: string;
  dialogDir: string;
  userId: string;
  dialogId: string;
};

/** `state` is forward-only. `consumed` means the live queue accepted and scheduled
 * the message — it does not mean the model has read or answered it. */
export type DialogNotifyState = "persisted" | "queued" | "consumed";
export type DialogNotifyAckState = DialogNotifyState | "failed";

export type DialogNotifyEntry = {
  schemaVersion: 1;
  idempotencyKey: string;
  keyHash: string;
  /** Durable user-message id (reused for the record key and dedupe downstream). */
  messageId: string;
  contentSha256: string;
  message: string;
  dialogId: string;
  userId: string;
  host: string;
  pid: number;
  createdAt: string;
};

export type DialogNotifyAck = {
  schemaVersion: 1;
  messageId: string;
  state: DialogNotifyAckState;
  reason?: string;
  at: string;
  receiverPid?: number;
};

export type DialogNotifyLease = {
  schemaVersion: 1;
  userId: string;
  dialogId: string;
  pid: number;
  host: string;
  startedAt: string;
  heartbeatAt: string;
  state: "active" | "stopped";
  stoppedAt?: string;
};

export function resolveDialogNotifyRoot(options: {
  env?: Record<string, string | undefined>;
  homeDir?: string;
} = {}): string {
  const explicit = options.env?.NOLO_DIALOG_NOTIFY_DIR?.trim();
  if (explicit) return path.resolve(explicit);
  return path.join(
    resolveNoloHome({ env: options.env as NodeJS.ProcessEnv | undefined, homeDir: options.homeDir }),
    "dialog-notify",
  );
}

function assertSafeSegment(label: string, value: unknown): string {
  if (typeof value !== "string") {
    throw new DialogNotifyError("invalid", `${label} must be a string`);
  }
  const trimmed = value.trim();
  if (!SAFE_SEGMENT.test(trimmed) || trimmed === "." || trimmed === "..") {
    throw new DialogNotifyError(
      "invalid",
      `${label} must match ${String(SAFE_SEGMENT)} and must not be "." or ".."`,
    );
  }
  return trimmed;
}

/**
 * Resolve and validate the mailbox location for one actor/dialog pair.
 * Rejects traversal (`..`, separators, absolute paths) and non-ULID/UUID dialog
 * ids before any filesystem call, so callers can never be steered elsewhere.
 */
export function resolveDialogNotifyDirs(args: {
  root: string;
  userId: string;
  dialogId: string;
}): DialogNotifyDirs {
  const userId = assertSafeSegment("userId", args.userId);
  const dialogId = assertSafeSegment("dialogId", args.dialogId);
  if (!isSupportedDialogId(dialogId)) {
    throw new DialogNotifyError("invalid", "dialogId must be a ULID or UUID");
  }
  const root = path.resolve(args.root);
  return {
    root,
    userDir: path.join(root, userId),
    dialogDir: path.join(root, userId, dialogId),
    userId,
    dialogId,
  };
}

function assertPathInsideRoot(dirs: DialogNotifyDirs): void {
  const realRoot = realpathSync(dirs.root);
  const realDialog = realpathSync(dirs.dialogDir);
  const prefix = realRoot.endsWith(path.sep) ? realRoot : `${realRoot}${path.sep}`;
  if (realDialog !== realRoot && !realDialog.startsWith(prefix)) {
    throw new DialogNotifyError(
      "invalid",
      "dialog notify directory resolves outside the notify root",
    );
  }
}

/** Create the mailbox directories owner-only and refuse symlinked components. */
export function ensureDialogNotifyDir(dirs: DialogNotifyDirs): void {
  mkdirSync(dirs.dialogDir, { recursive: true, mode: 0o700 });
  for (const [label, target] of [
    ["root", dirs.root],
    ["user", dirs.userDir],
    ["dialog", dirs.dialogDir],
  ] as const) {
    const stat = lstatSync(target);
    if (stat.isSymbolicLink()) {
      throw new DialogNotifyError("invalid", `${label} notify path must not be a symlink: ${target}`);
    }
    if (!stat.isDirectory()) {
      throw new DialogNotifyError("invalid", `${label} notify path must be a directory: ${target}`);
    }
  }
  assertPathInsideRoot(dirs);
}

export function dialogNotifyDirExists(dirs: DialogNotifyDirs): boolean {
  try {
    const stat = lstatSync(dirs.dialogDir);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Stable key-file identity: the same idempotency key always maps to one file. */
export function keyHashFor(idempotencyKey: string): string {
  return sha256Hex(`dialog-notify:${idempotencyKey}`);
}

/** Stable durable message id derived from the key (hex only, safe in a record key). */
export function messageIdForKey(idempotencyKey: string): string {
  return `ntf${sha256Hex(`dialog-notify-msg:${idempotencyKey}`).slice(0, 24)}`;
}

export function requireIdempotencyKey(value: unknown): string {
  if (typeof value !== "string") {
    throw new DialogNotifyError("invalid", "--idempotency-key is required");
  }
  const trimmed = value.trim();
  if (!SAFE_IDEMPOTENCY_KEY.test(trimmed)) {
    throw new DialogNotifyError(
      "invalid",
      `--idempotency-key must match ${String(SAFE_IDEMPOTENCY_KEY)}`,
    );
  }
  return trimmed;
}

export function requireNotifyMessage(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DialogNotifyError("invalid", "notification message must be a non-empty string");
  }
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes > MAX_NOTIFY_MESSAGE_BYTES) {
    throw new DialogNotifyError(
      "quota",
      `notification message is ${bytes} bytes; limit is ${MAX_NOTIFY_MESSAGE_BYTES}`,
    );
  }
  return value;
}

function entryPath(dirs: DialogNotifyDirs, keyHash: string): string {
  return path.join(dirs.dialogDir, `${keyHash}${ENTRY_SUFFIX}`);
}

function ackPath(dirs: DialogNotifyDirs, keyHash: string): string {
  return path.join(dirs.dialogDir, `${keyHash}${ACK_SUFFIX}`);
}

function leasePath(dirs: DialogNotifyDirs): string {
  return path.join(dirs.dialogDir, LEASE_NAME);
}

function tempPath(dirs: DialogNotifyDirs, tag: string): string {
  return path.join(dirs.dialogDir, `.tmp-${process.pid}-${tag}-${randomUUID()}`);
}

function safeUnlink(target: string): void {
  try {
    unlinkSync(target);
  } catch {
    /* Best effort: the temp name is ours, a missing file is already the goal. */
  }
}

/** Write `payload` with mode 0600 to a temp file, fsync it, then rename into place. */
function writeFileAtomic(target: string, tmp: string, payload: string): void {
  let fd = -1;
  try {
    fd = openSync(tmp, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | O_NOFOLLOW, 0o600);
    writeSync(fd, Buffer.from(payload, "utf8"));
    fsyncSync(fd);
  } finally {
    if (fd >= 0) closeSync(fd);
  }
  renameSync(tmp, target);
}

function readJsonFile<T>(target: string): T | null {
  try {
    return JSON.parse(readFileSync(target, "utf8")) as T;
  } catch {
    return null;
  }
}

export function readNotificationEntry(
  dirs: DialogNotifyDirs,
  keyHash: string,
): DialogNotifyEntry | null {
  const entry = readJsonFile<DialogNotifyEntry>(entryPath(dirs, keyHash));
  if (!entry || entry.schemaVersion !== 1 || entry.keyHash !== keyHash) return null;
  return entry;
}

export function readAck(dirs: DialogNotifyDirs, keyHash: string): DialogNotifyAck | null {
  const ack = readJsonFile<DialogNotifyAck>(ackPath(dirs, keyHash));
  if (!ack || ack.schemaVersion !== 1 || ack.messageId.length === 0) return null;
  return ack;
}

export function writeAck(
  dirs: DialogNotifyDirs,
  keyHash: string,
  ack: Omit<DialogNotifyAck, "schemaVersion">,
): DialogNotifyAck {
  const record: DialogNotifyAck = { schemaVersion: 1, ...ack };
  writeFileAtomic(ackPath(dirs, keyHash), tempPath(dirs, "ack"), JSON.stringify(record));
  return record;
}

export function readLease(dirs: DialogNotifyDirs): DialogNotifyLease | null {
  const lease = readJsonFile<DialogNotifyLease>(leasePath(dirs));
  if (!lease || lease.schemaVersion !== 1) return null;
  return lease;
}

export function writeLease(dirs: DialogNotifyDirs, lease: Omit<DialogNotifyLease, "schemaVersion">): DialogNotifyLease {
  const record: DialogNotifyLease = { schemaVersion: 1, ...lease };
  writeFileAtomic(leasePath(dirs), tempPath(dirs, "lease"), JSON.stringify(record));
  return record;
}

/** `kill(pid, 0)` probes existence; EPERM still means the process exists. */
export function defaultPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export function isLeaseLive(
  lease: DialogNotifyLease | null,
  options: {
    now?: number;
    ttlMs?: number;
    isPidAlive?: (pid: number) => boolean;
  } = {},
): boolean {
  if (!lease || lease.state !== "active") return false;
  const now = options.now ?? Date.now();
  const ttlMs = options.ttlMs ?? NOTIFY_LEASE_TTL_MS;
  const heartbeat = Date.parse(lease.heartbeatAt);
  if (!Number.isFinite(heartbeat) || now - heartbeat > ttlMs) return false;
  return (options.isPidAlive ?? defaultPidAlive)(lease.pid);
}

export function countNotificationEntries(dirs: DialogNotifyDirs): number {
  try {
    return readdirSync(dirs.dialogDir).filter((name) => name.endsWith(ENTRY_SUFFIX)).length;
  } catch {
    return 0;
  }
}

export function listNotificationEntries(
  dirs: DialogNotifyDirs,
): Array<{ keyHash: string; entry: DialogNotifyEntry }> {
  let names: string[];
  try {
    names = readdirSync(dirs.dialogDir);
  } catch {
    return [];
  }
  const rows: Array<{ keyHash: string; entry: DialogNotifyEntry }> = [];
  for (const name of names) {
    if (!name.endsWith(ENTRY_SUFFIX)) continue;
    const keyHash = name.slice(0, -ENTRY_SUFFIX.length);
    const entry = readNotificationEntry(dirs, keyHash);
    if (entry) rows.push({ keyHash, entry });
  }
  // Oldest first: the queue must see deliveries in the order they were written.
  return rows.sort((a, b) =>
    a.entry.createdAt === b.entry.createdAt
      ? a.keyHash.localeCompare(b.keyHash)
      : a.entry.createdAt.localeCompare(b.entry.createdAt),
  );
}

export type PublishResult = {
  entry: DialogNotifyEntry;
  created: boolean;
  duplicate: boolean;
  ack: DialogNotifyAck | null;
};

/**
 * Publish one notification atomically.
 *
 * Dedupe is enforced by the filesystem, not by a read-then-write check: the
 * entry content is fully written and fsynced to a temp file, then hard-linked
 * to `<keyHash>.req.json`. `link(2)` fails with EEXIST when the destination
 * exists, so exactly one of N concurrent writers wins and every loser reads a
 * complete record (a partially written file is never linked). Same key + same
 * content = idempotent replay; same key + different content = conflict.
 */
export function publishNotification(args: {
  dirs: DialogNotifyDirs;
  idempotencyKey: string;
  message: string;
  host?: string;
  pid?: number;
  now?: () => Date;
  /** Override for hosts/tests that need a tighter retention cap. */
  maxEntries?: number;
}): PublishResult {
  const idempotencyKey = requireIdempotencyKey(args.idempotencyKey);
  const message = requireNotifyMessage(args.message);
  const keyHash = keyHashFor(idempotencyKey);
  const finalPath = entryPath(args.dirs, keyHash);

  const existing = readNotificationEntry(args.dirs, keyHash);
  if (existing) return settleExisting(existing, message, args.dirs, keyHash);

  const entryLimit = args.maxEntries ?? MAX_NOTIFY_ENTRIES_PER_DIALOG;
  if (countNotificationEntries(args.dirs) >= entryLimit) {
    throw new DialogNotifyError(
      "quota",
      `mailbox for this dialog holds ${entryLimit} retained notifications; refusing to add more`,
    );
  }

  const entry: DialogNotifyEntry = {
    schemaVersion: 1,
    idempotencyKey,
    keyHash,
    messageId: messageIdForKey(idempotencyKey),
    contentSha256: sha256Hex(message),
    message,
    dialogId: args.dirs.dialogId,
    userId: args.dirs.userId,
    host: args.host ?? hostname(),
    pid: args.pid ?? process.pid,
    createdAt: (args.now ?? (() => new Date()))().toISOString(),
  };

  const tmp = tempPath(args.dirs, "req");
  let fd = -1;
  try {
    fd = openSync(tmp, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | O_NOFOLLOW, 0o600);
    writeSync(fd, Buffer.from(JSON.stringify(entry), "utf8"));
    fsyncSync(fd);
  } finally {
    if (fd >= 0) closeSync(fd);
  }

  let created = false;
  try {
    linkSync(tmp, finalPath);
    created = true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST") {
      throw new DialogNotifyError(
        "io",
        `cannot publish notification entry (${code ?? "unknown error"})`,
      );
    }
  } finally {
    safeUnlink(tmp);
  }

  if (created) return { entry, created: true, duplicate: false, ack: null };
  const winner = readNotificationEntry(args.dirs, keyHash);
  if (!winner) {
    throw new DialogNotifyError("io", "notification entry disappeared during publish");
  }
  return settleExisting(winner, message, args.dirs, keyHash);
}

function settleExisting(
  existing: DialogNotifyEntry,
  message: string,
  dirs: DialogNotifyDirs,
  keyHash: string,
): PublishResult {
  if (existing.contentSha256 !== sha256Hex(message)) {
    throw new DialogNotifyError(
      "conflict",
      `idempotency key "${existing.idempotencyKey}" was already used with different content`,
    );
  }
  return { entry: existing, created: false, duplicate: true, ack: readAck(dirs, keyHash) };
}

/** True when a delivered entry is recorded in the mailbox (used by `--status`). */
export function notificationExists(dirs: DialogNotifyDirs, idempotencyKey: string): boolean {
  if (!existsSync(dirs.dialogDir)) return false;
  return readNotificationEntry(dirs, keyHashFor(idempotencyKey)) !== null;
}
