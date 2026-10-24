// Explicit, caller-approved snapshots only. Never enumerate the host workspace.
// Authority boundary: the caller must obtain approval for this exact manifest hash;
// this module verifies that binding, not the identity of the approving human.
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { ExecutionRequest } from "../../agent-runtime/executionBackend";
import { INSTABOX_MAX_STDIN_BYTES } from "../../agent-runtime/instaboxBackend";
import type { InstaboxRuntimeBinary } from "./localInstaboxFileBridge";

export const SNAPSHOT_LIMITS = { files: 256, fileBytes: 8 * 1024 * 1024, totalBytes: 32 * 1024 * 1024, chunkBytes: 384 * 1024 } as const;
export type SnapshotFile = { path: string; sizeBytes: number; sha256: string };
export type InstaboxDeliveryManifest = {
  version: 1;
  hostRoot: string;
  /** Source HEAD supplied by the approval authority; not a remote Git commit. */
  baseSha: string;
  files: SnapshotFile[];
};
export type InstaboxWorkspaceSelection = {
  workspaceMode: "approved-snapshot";
  manifest: InstaboxDeliveryManifest;
  approval: { id: string; manifestSha256: string };
};
export type InstaboxWorkspaceDelivery = {
  workspaceMode: "empty" | "approved-snapshot";
  manifest: InstaboxDeliveryManifest | null;
  manifestSha256: string | null;
  approvalId: string | null;
  baseSha: string | null;
  /** No Git history is transferred; recovery must compare against manifest hashes. */
  remoteGitHistory: false;
};
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const fail = (code: string): never => { throw new Error(`instabox_workspace_delivery:${code}`); };

/** Stable encoding used by the approval UI and the delivery verifier. File order matters. */
export function hashInstaboxDeliveryManifest(manifest: InstaboxDeliveryManifest): string {
  return hash(JSON.stringify({ version: manifest.version, hostRoot: manifest.hostRoot, baseSha: manifest.baseSha,
    files: manifest.files.map(f => ({ path: f.path, sizeBytes: f.sizeBytes, sha256: f.sha256 })) }));
}
function validatePath(path: string): void {
  if (typeof path !== "string" || path.length > 1024 || !/^[A-Za-z0-9_.@+ /-]+$/.test(path)
    || path.split("/").some(p => !p || p === "." || p === "..")) fail("invalid_path");
  // Deliberately conservative: approval does not override the sensitive-path denylist.
  const parts = path.toLowerCase().split("/");
  if (parts.some(p => /^(\.git|\.ssh|\.aws|\.azure|\.gnupg|\.nolo|nolo|data|artifacts|logs?|node_modules|credentials?|secrets?|\.npmrc|\.pypirc|\.netrc|\.docker|\.config)$/.test(p)
    || /^\.env(?:\.|$)/.test(p) || /(?:secret|credential|token|password)/.test(p)
    || /\.(?:pem|key|p12|pfx|jks|sqlite3?|db|wal|log|bundle)$/.test(p)
    || /^id_(?:rsa|dsa|ecdsa|ed25519)/.test(p))) fail("sensitive_path");
}

/** Pure validation: called before any host filesystem operation or lease acquisition. */
export function validateInstaboxWorkspaceSelection(selection?: InstaboxWorkspaceSelection): void {
  if (selection === undefined) return;
  if (selection?.workspaceMode !== "approved-snapshot" || !selection.approval?.id?.trim()) fail("approval_required");
  const m = selection.manifest;
  if (!m || m.version !== 1 || typeof m.hostRoot !== "string" || !m.hostRoot.startsWith("/")
    || m.hostRoot.includes("\0") || !/^[0-9a-f]{40}$/.test(m.baseSha) || !Array.isArray(m.files)
    || m.files.length === 0 || m.files.length > SNAPSHOT_LIMITS.files) fail("invalid_manifest");
  let total = 0;
  const seen = new Set<string>();
  for (const f of m.files) {
    if (!f || typeof f !== "object") fail("invalid_manifest");
    validatePath(f.path);
    if (seen.has(f.path) || !Number.isSafeInteger(f.sizeBytes) || f.sizeBytes < 0
      || f.sizeBytes > SNAPSHOT_LIMITS.fileBytes || !/^[0-9a-f]{64}$/.test(f.sha256)) fail("invalid_manifest");
    seen.add(f.path); total += f.sizeBytes;
  }
  for (const path of seen) {
    const pieces = path.split("/");
    pieces.pop();
    while (pieces.length) { if (seen.has(pieces.join("/"))) fail("path_conflict"); pieces.pop(); }
  }
  if (total > SNAPSHOT_LIMITS.totalBytes) fail("snapshot_too_large");
  if (selection.approval.manifestSha256 !== hashInstaboxDeliveryManifest(m)) fail("approval_hash_mismatch");
}

// Linux /proc/self/fd anchors every descendant lookup to an already opened directory.
// Unlike lstat+readFile, renaming an ancestor cannot redirect a read outside the root.
async function readApprovedFiles(m: InstaboxDeliveryManifest): Promise<Buffer[]> {
  if (process.platform !== "linux") fail("secure_host_reader_unavailable");
  if (await realpath(m.hostRoot) !== m.hostRoot) fail("host_root_not_canonical");
  let root = await open("/", constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    for (const part of m.hostRoot.split("/").filter(Boolean)) {
      const next = await open(`/proc/self/fd/${root.fd}/${part}`, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      await root.close(); root = next;
    }
  } catch (error) { await root.close(); throw error; }
  const result: Buffer[] = [];
  try {
    for (const entry of m.files) {
      const dirs = [];
      let parent = root;
      try {
        const parts = entry.path.split("/");
        for (const part of parts.slice(0, -1)) {
          const dir = await open(`/proc/self/fd/${parent.fd}/${part}`, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
          dirs.push(dir); parent = dir;
        }
        const file = await open(`/proc/self/fd/${parent.fd}/${parts.at(-1)}`, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          const before = await file.stat();
          if (!before.isFile() || before.nlink !== 1 || before.size !== entry.sizeBytes) fail("file_metadata_mismatch");
          // Fixed-size reads never allocate/read past the approved limit, even if a writer grows the file.
          const bytes = Buffer.alloc(entry.sizeBytes);
          let offset = 0;
          while (offset < bytes.length) {
            const { bytesRead } = await file.read(bytes, offset, bytes.length - offset, offset);
            if (!bytesRead) fail("file_changed");
            offset += bytesRead;
          }
          const after = await file.stat();
          if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs
            || hash(bytes) !== entry.sha256) fail("file_hash_mismatch");
          // Content-level tripwire; this is not a complete secret scanner.
          if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_-]?key|access[_-]?token|password)\s*[:=]\s*["']?[A-Za-z0-9_+\/-]{12,}/i.test(bytes.toString("utf8"))) fail("sensitive_content");
          result.push(bytes);
        } finally { await file.close(); }
      } finally { for (const dir of dirs.reverse()) await dir.close(); }
    }
  } finally { await root.close(); }
  return result;
}

// Runs only before tools become available. Never overwrites an existing remote file.
// Each chunk is independently acknowledged by read-back hash; the final ack hashes the full file.
export const INSTABOX_SNAPSHOT_RECEIVER = String.raw`
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const p = JSON.parse(fs.readFileSync(0, 'utf8'));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
if (!path.isAbsolute(p.root) || fs.realpathSync(p.root) !== p.root || !fs.lstatSync(p.root).isDirectory()) throw Error('root_invalid');
const parts = p.path.split('/');
if (parts.some(x => !x || x === '.' || x === '..' || x.includes('\\'))) throw Error('path_invalid');
let rootFd = fs.openSync('/', fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
for (const part of p.root.split('/').filter(Boolean)) {
  const next = fs.openSync('/proc/self/fd/'+rootFd+'/'+part, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  fs.closeSync(rootFd); rootFd = next;
}
let dir = '/proc/self/fd/'+rootFd;
for (const part of parts.slice(0,-1)) {
  const child = path.join(dir, part);
  if (!fs.existsSync(child)) fs.mkdirSync(child);
  const next = fs.openSync(child, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  fs.closeSync(rootFd); rootFd = next; dir = '/proc/self/fd/'+rootFd;
}
const target = path.join(dir, parts.at(-1));
const flags = fs.constants.O_RDWR | fs.constants.O_NOFOLLOW | (p.offset === 0 ? fs.constants.O_CREAT | fs.constants.O_EXCL : 0);
const fd = fs.openSync(target, flags, 0o600);
try {
  if (!fs.fstatSync(fd).isFile() || fs.fstatSync(fd).size !== p.offset) throw Error('offset_mismatch');
  const bytes = Buffer.from(p.data, 'base64');
  let written = 0;
  while (written < bytes.length) written += fs.writeSync(fd, bytes, written, bytes.length-written, p.offset+written);
  fs.fsyncSync(fd);
  const actual = Buffer.alloc(p.offset + bytes.length);
  let read = 0;
  while (read < actual.length) { const n = fs.readSync(fd, actual, read, actual.length-read, read); if (!n) throw Error('short_read'); read += n; }
  if (hash(actual.subarray(p.offset)) !== p.chunkSha256) throw Error('chunk_hash_mismatch');
  if (p.final && (actual.length !== p.sizeBytes || hash(actual) !== p.sha256)) throw Error('file_hash_mismatch');
  console.log(JSON.stringify({ manifestSha256:p.manifestSha256, path:p.path, sizeBytes:actual.length, sha256:hash(actual) }));
} finally { fs.closeSync(fd); }
`;

export async function deliverInstaboxWorkspace(args: {
  selection?: InstaboxWorkspaceSelection;
  root: string;
  runtime: InstaboxRuntimeBinary;
  exec: (request: ExecutionRequest) => Promise<string>;
}): Promise<InstaboxWorkspaceDelivery> {
  validateInstaboxWorkspaceSelection(args.selection);
  if (!args.selection) return { workspaceMode: "empty", manifest: null, manifestSha256: null, approvalId: null, baseSha: null, remoteGitHistory: false };
  // Detach from mutable caller data before the first await.
  const selection: InstaboxWorkspaceSelection = JSON.parse(JSON.stringify(args.selection));
  const { manifest } = selection;
  const manifestSha256 = hashInstaboxDeliveryManifest(manifest);
  const files = await readApprovedFiles(manifest); // All checks pass before any remote call.
  for (let i = 0; i < files.length; i++) {
    const bytes = files[i]!;
    const entry = manifest.files[i]!;
    let offset = 0;
    do {
      const chunk = bytes.subarray(offset, offset + SNAPSHOT_LIMITS.chunkBytes);
      const final = offset + chunk.length === bytes.length;
      const stdin = JSON.stringify({ root: args.root, path: entry.path, offset, final, data: chunk.toString("base64"),
        sizeBytes: entry.sizeBytes, sha256: entry.sha256, chunkSha256: hash(chunk), manifestSha256 });
      if (Buffer.byteLength(stdin, "utf8") > INSTABOX_MAX_STDIN_BYTES) fail("stdin_too_large");
      const output = await args.exec({ kind: "command", argv: [args.runtime, "-e", INSTABOX_SNAPSHOT_RECEIVER], stdin });
      let ack: { manifestSha256?: string; path?: string; sizeBytes?: number; sha256?: string };
      try { ack = JSON.parse(output); } catch { fail("invalid_remote_ack"); }
      const next = offset + chunk.length;
      if (!ack! || ack!.manifestSha256 !== manifestSha256 || ack!.path !== entry.path || ack!.sizeBytes !== next
        || ack!.sha256 !== hash(bytes.subarray(0, next))) fail("remote_readback_mismatch");
      offset = next;
    } while (offset < bytes.length);
  }
  return { workspaceMode: "approved-snapshot", manifest, manifestSha256, approvalId: selection.approval.id,
    baseSha: manifest.baseSha, remoteGitHistory: false };
}
