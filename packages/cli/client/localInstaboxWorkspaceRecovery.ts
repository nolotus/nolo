import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { createLocalArtifactStore, type ArtifactRef } from "../../agent-runtime/artifactStore";
import type { ExecutionRequest } from "../../agent-runtime/executionBackend";
import { SNAPSHOT_LIMITS, type InstaboxWorkspaceDelivery, type SnapshotFile } from "./localInstaboxWorkspaceDelivery";
import { getInstaboxProbeFileName } from "./localInstaboxFileBridge";

/** Trusted caller supplies an existing artifact root and exact approved output paths.
 * No host workspace writes, Git baseline, implicit destination or remote deletion. */
export type InstaboxRecoveryPolicy = { artifactRoot: string; approvalId: string; allowedPaths: string[];
  /** Trusted host lifecycle barrier: stop and join all remote writers, including background processes. */
  quiesce: () => Promise<void>; };
export type InstaboxRecoveryReceipt = { artifact: ArtifactRef; sha256: string; files: SnapshotFile[]; deletedPaths: string[] };
const sha = (b: string | Uint8Array) => createHash("sha256").update(b).digest("hex");
function fail(code: string): never { throw Object.assign(new Error(`instabox_workspace_recovery:${code}; cleanup_pending`), { code: "instabox_cleanup_pending", cleanupPending: true }); }
function safePath(p: string): boolean {
  return typeof p === "string" && p.length <= 1024 && /^[A-Za-z0-9_.@+ /-]+$/.test(p)
    && !p.split("/").some(x => !x || x === "." || x === ".." || /^(?:\.git|\.ssh|\.aws|\.azure|\.gnupg|\.nolo|nolo|data|artifacts|logs?|node_modules|\.docker|\.config|\.npmrc|\.pypirc|\.netrc)$/i.test(x)
      || /^\.env(?:\.|$)|secret|credential|token|password|^id_(?:rsa|dsa|ecdsa|ed25519)|\.(?:pem|key|p12|pfx|jks|sqlite3?|db|wal|log|bundle)$/i.test(x));
}
function sensitive(b: Buffer): boolean {
  return /-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_-]?key|access[_-]?token|password)\s*[:=]\s*["']?[A-Za-z0-9_+\/-]{12,}/i.test(b.toString("utf8"));
}
/** Remote protocol is read-only. Every reply is bounded, including directory metadata.
 * Linux /proc fd traversal pins directories and rejects symlinks at every component. */
export const INSTABOX_RECOVERY_READER = String.raw`
(async()=>{
const fs=require('node:fs'),p=JSON.parse(require('node:fs').readFileSync(0,'utf8')),c=fs.constants,crypto=require('node:crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
let root=fs.openSync('/',c.O_RDONLY|c.O_DIRECTORY|c.O_NOFOLLOW);
try{
if(typeof p.root!=='string'||!p.root.startsWith('/')||p.root.split('/').some(x=>x==='..'))throw 0;
for(const part of p.root.split('/').filter(Boolean)){const n=fs.openSync('/proc/self/fd/'+root+'/'+part,c.O_RDONLY|c.O_DIRECTORY|c.O_NOFOLLOW);fs.closeSync(root);root=n;}
const entries=[],skipped=[];let total=0,nodes=0;
function walk(fd,prefix,depth){if(depth>32)throw 0;const dir=fs.opendirSync('/proc/self/fd/'+fd);try{let e;while((e=dir.readSync())){if(++nodes>1024)throw 0;const name=prefix+e.name;if(name.length>1024)throw 0;let f;try{f=fs.openSync('/proc/self/fd/'+fd+'/'+e.name,c.O_RDONLY|c.O_NOFOLLOW|c.O_NONBLOCK);}catch(err){const code=String(err?.code||'');if(code==='ELOOP'||code==='ENOTDIR'||code==='EACCES'||code==='EPERM'){if(skipped.length<256)skipped.push(name);continue;}throw err;}try{const s=fs.fstatSync(f);if(s.isDirectory())walk(f,name+'/',depth+1);else{if(!s.isFile()||s.nlink!==1||s.size>8388608||entries.length>=256||(total+=s.size)>33554432)throw 0;const b=Buffer.alloc(s.size);let o=0;while(o<b.length){const n=fs.readSync(f,b,o,b.length-o,o);if(!n)throw 0;o+=n;}const a=fs.fstatSync(f);if(a.size!==s.size||a.mtimeMs!==s.mtimeMs||a.ctimeMs!==s.ctimeMs)throw 0;entries.push({path:name,sizeBytes:b.length,sha256:hash(b)});}}finally{fs.closeSync(f);}}}finally{dir.closeSync();}}
walk(root,'',0);entries.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);skipped.sort();const manifestSha256=hash(JSON.stringify(entries));
if(p.op==='scan'){console.log(JSON.stringify({manifestSha256,total:entries.length,files:entries.slice(p.offset,p.offset+8),skipped}));return;}
const entry=entries.find(e=>e.path===p.path);if(!entry||manifestSha256!==p.manifestSha256)throw 0;
let fd=fs.dupSync?fs.dupSync(root):fs.openSync('/proc/self/fd/'+root,c.O_RDONLY|c.O_DIRECTORY);
try{const parts=p.path.split('/');for(const part of parts.slice(0,-1)){const n=fs.openSync('/proc/self/fd/'+fd+'/'+part,c.O_RDONLY|c.O_DIRECTORY|c.O_NOFOLLOW);fs.closeSync(fd);fd=n;}
const f=fs.openSync('/proc/self/fd/'+fd+'/'+parts.at(-1),c.O_RDONLY|c.O_NOFOLLOW|c.O_NONBLOCK);try{const s=fs.fstatSync(f);if(!s.isFile()||s.nlink!==1||s.size!==entry.sizeBytes)throw 0;const b=Buffer.alloc(s.size);let o=0;while(o<b.length){const n=fs.readSync(f,b,o,b.length-o,o);if(!n)throw 0;o+=n;}if(hash(b)!==entry.sha256)throw 0;const chunk=b.subarray(p.offset,p.offset+49152);console.log(JSON.stringify({data:chunk.toString('base64'),sha256:hash(chunk)}));}finally{fs.closeSync(f);}}finally{fs.closeSync(fd);}
}finally{fs.closeSync(root);}
})().catch(e=>{process.stderr.write('instabox_recovery_read_failed:'+String(e?.code??e?.name??'validation'));process.exitCode=1;});`;

export type InstaboxWorkspaceBaseline = { files: SnapshotFile[]; digest: string; skipped: string[] };

export async function captureInstaboxBaseline(args: {
  root: string; runtime: "node" | "bun"; exec: (request: ExecutionRequest) => Promise<string>;
}): Promise<InstaboxWorkspaceBaseline> {
  const call = async (input: object): Promise<any> => {
    let out: string;
    try {
      out = await args.exec({ kind: "command", argv: [args.runtime, "-e", INSTABOX_RECOVERY_READER], stdin: JSON.stringify({ root: args.root, ...input }) });
    } catch {
      fail("baseline_failed");
    }
    if (Buffer.byteLength(out) > 80 * 1024) fail("baseline_failed");
    try { return JSON.parse(out); } catch { return fail("baseline_failed"); }
  };
  let digest = "", count = -1; const files: SnapshotFile[] = []; const skipped: string[] = [];
  do {
    const r = await call({ op: "scan", offset: files.length });
    if (!/^[a-f0-9]{64}$/.test(r.manifestSha256) || !Number.isInteger(r.total) || r.total < 0 || r.total > SNAPSHOT_LIMITS.files
      || !Array.isArray(r.files) || r.files.length !== Math.min(8, r.total - files.length)
      || (r.skipped !== undefined && (!Array.isArray(r.skipped) || r.skipped.length > SNAPSHOT_LIMITS.files))
      || (count !== -1 && (count !== r.total || digest !== r.manifestSha256))) fail("baseline_failed");
    count = r.total; digest = r.manifestSha256; files.push(...r.files);
    if (Array.isArray(r.skipped)) {
      for (const s of r.skipped) {
        if (typeof s === "string" && !skipped.includes(s)) skipped.push(s);
      }
    }
  } while (files.length < count);
  let total = 0; const seen = new Set<string>();
  for (const f of files) {
    if (!safePath(f.path) || seen.has(f.path) || !Number.isSafeInteger(f.sizeBytes) || f.sizeBytes < 0 || f.sizeBytes > SNAPSHOT_LIMITS.fileBytes
      || !/^[a-f0-9]{64}$/.test(f.sha256)) fail("baseline_failed");
    seen.add(f.path); total += f.sizeBytes;
  }
  if (total > SNAPSHOT_LIMITS.totalBytes || sha(JSON.stringify(files)) !== digest) fail("baseline_failed");
  return { files, digest, skipped };
}

export async function recoverInstaboxWorkspace(args: {
  root: string; runtime: "node" | "bun"; delivery: InstaboxWorkspaceDelivery;
  baseline?: InstaboxWorkspaceBaseline | null;
  policy?: InstaboxRecoveryPolicy; exec: (request: ExecutionRequest) => Promise<string>;
  runId?: string;
  probeId?: string;
}): Promise<InstaboxRecoveryReceipt> {
  const policy = args.policy;
  if (!policy || typeof policy.quiesce !== "function" || !policy.approvalId?.trim() || !policy.artifactRoot.startsWith("/") || !Array.isArray(policy.allowedPaths)
    || policy.allowedPaths.length > SNAPSHOT_LIMITS.files || policy.allowedPaths.some(p => !safePath(p))) fail("approved_destination_required");
  const call = async (input: object): Promise<any> => {
    const out = await args.exec({ kind: "command", argv: [args.runtime, "-e", INSTABOX_RECOVERY_READER], stdin: JSON.stringify({ root: args.root, ...input }) });
    if (Buffer.byteLength(out) > 80 * 1024) fail("output_limit");
    try { return JSON.parse(out); } catch { return fail("invalid_reply"); }
  };
  const scan = async () => {
    let digest = "", count = -1; const files: SnapshotFile[] = []; const skipped: string[] = [];
    do {
      const r = await call({ op: "scan", offset: files.length });
      if (!/^[a-f0-9]{64}$/.test(r.manifestSha256) || !Number.isInteger(r.total) || r.total < 0 || r.total > SNAPSHOT_LIMITS.files
        || !Array.isArray(r.files) || r.files.length !== Math.min(8, r.total - files.length)
        || (r.skipped !== undefined && (!Array.isArray(r.skipped) || r.skipped.length > SNAPSHOT_LIMITS.files))
        || (count !== -1 && (count !== r.total || digest !== r.manifestSha256))) fail("manifest_changed");
      count = r.total; digest = r.manifestSha256; files.push(...r.files);
      if (Array.isArray(r.skipped)) {
        for (const s of r.skipped) {
          if (typeof s === "string" && !skipped.includes(s)) skipped.push(s);
        }
      }
    } while (files.length < count);
    let total = 0; const seen = new Set<string>();
    for (const f of files) {
      if (!safePath(f.path) || seen.has(f.path) || !Number.isSafeInteger(f.sizeBytes) || f.sizeBytes < 0 || f.sizeBytes > SNAPSHOT_LIMITS.fileBytes
        || !/^[a-f0-9]{64}$/.test(f.sha256)) fail("unsafe_manifest");
      seen.add(f.path); total += f.sizeBytes;
    }
    if (total > SNAPSHOT_LIMITS.totalBytes || sha(JSON.stringify(files)) !== digest) fail("manifest_mismatch");
    for (const s of skipped) {
      if (policy.allowedPaths.includes(s)) fail("allowed_path_unreadable");
    }
    return { files, digest, skipped };
  };
  // Must remain quiescent until backend release. Tool admission is already closed by workload.
  await policy.quiesce();
  const initial = await scan();
  const probeTarget = args.probeId ?? args.runId;
  const ownProbe = probeTarget ? getInstaboxProbeFileName(probeTarget) : null;
  const isOwnProbe = (path: string) => ownProbe !== null && path === ownProbe;
  const baseFiles = args.baseline?.files ?? args.delivery.manifest?.files ?? [];
  const base = new Map(baseFiles.map(f => [f.path, f]));
  const changed = initial.files.filter(f => !isOwnProbe(f.path) && (base.get(f.path)?.sha256 !== f.sha256 || base.get(f.path)?.sizeBytes !== f.sizeBytes));
  const deletedPaths = [...base.keys()].filter(p => !isOwnProbe(p) && !initial.files.some(f => f.path === p));
  if ([...changed.map(f => f.path), ...deletedPaths].some(p => !policy.allowedPaths.includes(p))) fail("unapproved_output");
  const output: { path: string; data: string }[] = [];
  for (const f of changed) {
    const chunks: Buffer[] = []; let offset = 0;
    while (offset < f.sizeBytes) {
      const r = await call({ op: "read", path: f.path, offset, manifestSha256: initial.digest });
      if (typeof r.data !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(r.data)) fail("invalid_chunk");
      const b = Buffer.from(r.data, "base64");
      if (b.length !== Math.min(49152, f.sizeBytes - offset) || sha(b) !== r.sha256) fail("chunk_mismatch");
      chunks.push(b); offset += b.length;
    }
    const bytes = Buffer.concat(chunks);
    if (sha(bytes) !== f.sha256 || sensitive(bytes)) fail("unsafe_content");
    output.push({ path: f.path, data: bytes.toString("base64") });
  }
  if ((await scan()).digest !== initial.digest) fail("workspace_changed");
  const bytes = Buffer.from(JSON.stringify({ version: 1, kind: "instabox-workspace-snapshot", approvalId: policy.approvalId,
    remoteGitHistory: false, baselineManifestSha256: args.baseline?.digest ?? args.delivery.manifestSha256, baseline: baseFiles,
    files: changed, deletedPaths, output }));
  // Existing ArtifactStore key/ref/get contract; private, atomic writer in a unique namespace.
  // No overwrite, no cleanup/delete: failed staging bytes remain available for inspection.
  let root = await open("/", constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    for (const part of policy.artifactRoot.split("/").filter(Boolean)) {
      if (part === "." || part === "..") fail("invalid_destination");
      const next = await open(`/proc/self/fd/${root.fd}/${part}`, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      await root.close(); root = next;
    }
    const { mkdir, rename } = await import("node:fs/promises");
    const id = `instabox-${randomUUID()}`;
    const namespace = `/proc/self/fd/${root.fd}/${id}`;
    await mkdir(namespace, { mode: 0o700 });
    const dir = await open(namespace, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    try {
      const prefix = `/proc/self/fd/${dir.fd}`;
      const file = await open(`${prefix}/snapshot.pending`, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
      await rename(`${prefix}/snapshot.pending`, `${prefix}/snapshot.json`); await dir.sync(); await root.sync();
      const stored = await createLocalArtifactStore({ rootDir: prefix }).get("snapshot.json");
      if (sha(stored) !== sha(bytes)) fail("artifact_readback_mismatch");
      if ((await scan()).digest !== initial.digest) fail("workspace_changed_after_persist");
      return { artifact: { id: `${id}/snapshot.json`, sizeBytes: bytes.length, contentType: "application/json", createdAt: Date.now() }, sha256: sha(bytes), files: changed, deletedPaths };
    } finally { await dir.close(); }
  } finally { await root.close(); }
}
