import { createHash, randomUUID } from "node:crypto";
import { constants, copyFileSync, createReadStream, existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { resolveNoloStateDir } from "./noloStateDir";

export interface ToolSpillResult {
  spillPath: string;
  displayPath: string;
  totalChars: number;
  totalLines: number;
  byteLength: number;
  hash: string;
}

export interface SpillToolOutputOptions {
  content: string;
  toolName?: string;
  workspaceRoot?: string;
  baseDir?: string;
  /** Maximum bytes for all spills in the directory before LRU cleanup triggers (default 50MB) */
  maxRetentionBytes?: number;
  /** Maximum age of spill files before cleanup (default 24 hours) */
  ttlMs?: number;
}

export const DEFAULT_MAX_SPILL_DIR_BYTES = 50 * 1024 * 1024; // 50MB
export const DEFAULT_SPILL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// 清理节流：spillToolOutput 每次调用都会触发 cleanupExpiredSpills（全量
// readdirSync + 逐文件 statSync），真实 spill 目录数千文件时单次 ~100ms，
// 且 buildMessages 中每条历史 tool 消息都触发一次，主导了本地 agent loop 的
// 非 LLM 开销。节流后最多每 SPILL_CLEANUP_THROTTLE_MS 清理一次，到期文件
// 最多晚一个节流窗口被清，清理语义不变。
export const SPILL_CLEANUP_THROTTLE_MS = 60 * 1000;
// 按目录分别节流：单一全局时间戳会让多 spill 目录（~/.nolo/spills 与
// <workspace>/.nolo/spills 等）互相饿死——先到者独占节流窗口，其余目录的
// LRU/配额清理永不执行。Map 有界（超过上限整体清空，等价于全员立即清一次，
// 可接受：目录数正常为个位数）。
const SPILL_THROTTLE_MAX_DIRS = 64;
const lastSpillCleanupAtMsByDir = new Map<string, number>();

/** 测试隔离钩子：重置进程内节流状态（bun test 同进程跑多个用例时防泄漏）。 */
export function resetSpillCleanupThrottle(): void {
  lastSpillCleanupAtMsByDir.clear();
}

export function resolveSpillDirectory(options?: {
  workspaceRoot?: string;
  baseDir?: string;
}): string {
  if (options?.baseDir) {
    return options.baseDir;
  }
  if (options?.workspaceRoot) {
    return join(options.workspaceRoot, ".nolo", "spills");
  }
  return resolveNoloStateDir("spills");
}

export function countLines(text: string): number {
  if (!text) return 0;
  let lines = 1;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      // '\n'
      lines++;
    }
  }
  return lines;
}

/**
 * 刚 promote 出来的正式 spill 文件的保护窗口（毫秒）。
 *
 * 计入目录总字节（配额统计不能因为豁免就失真），但跳过 TTL 与 LRU 淘汰——
 * 否则「返回指针」与「清理」会赛跑，调用方拿到的可能是一个已被删除的路径。
 * 窗口过后恢复普通规则，不是永久豁免。
 */
export const SPILL_PUBLICATION_GRACE_MS = 60_000;

export interface PromoteSpillFileOps {
  now?: () => number;
  statSize?: (path: string) => number;
  rename?: (from: string, to: string) => void;
  copyExclusive?: (from: string, to: string) => void;
  unlink?: (path: string) => void;
  exists?: (path: string) => boolean;
  mkdirp?: (dir: string) => void;
  touch?: (path: string, atMs: number) => void;
  hashFile?: (path: string) => Promise<string>;
  cleanup?: (dir: string) => void;
  randomId?: () => string;
}

async function hashFileStreaming(path: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });
  return hash.digest("hex");
}

/**
 * 把已经写完的流输出文件从系统临时目录搬进 managed spill store。
 *
 * 契约（与 cleanupExpiredSpills 的识别规则绑定，不要另立命名）：
 * - 正式文件名固定 `spill-execshell-${uuid}.log`：同时满足 startsWith("spill-") 与 endsWith(".log")
 * - 跨设备 staging 用 `.spill-execshell-${uuid}.${attempt}.copying`：**不能**用 `.spill-*.tmp`，
 *   因为清理器对 `.tmp` 是无条件删除，另一个进程可能删掉正在复制的文件
 * - 只有校验通过的完整文件才会出现在正式路径
 * - 发布顺序：写完整 → 校验 → 刷新 mtime → 原子 rename → 清理一次（不节流）→ 返回指针
 * - 发布失败时尽力把内容退回 source，绝不静默丢弃唯一完整副本
 */
export type PromoteSpillOutcome =
  | { ok: true; spillPath: string; displayPath: string }
  | {
      ok: false;
      reason: "missing" | "empty" | "unverified" | "publish-failed";
      /**
       * 完整内容仍然保留在这个路径上（发布失败时的兜底副本）。
       * 调用方**不得**删除它——它是这台机器上唯一的完整副本。
       */
      preservedPath?: string;
    };

/**
 * 把已经写完的流输出文件从系统临时目录搬进 managed spill store。
 *
 * 契约（与 cleanupExpiredSpills 的识别规则绑定，不要另立命名）：
 * - 正式文件名固定 `spill-execshell-${uuid}.log`：同时满足 startsWith("spill-") 与 endsWith(".log")
 * - 跨设备 staging 用 `.spill-execshell-${uuid}.${attempt}.copying`：**不能**用 `.spill-*.tmp`，
 *   因为清理器对 `.tmp` 是无条件删除，另一个进程可能删掉正在复制的文件
 * - 只有校验通过的完整文件才会出现在正式路径
 * - 发布顺序：写完整 → 校验 → 刷新 mtime → 原子 rename → 清理一次（不节流）→ 返回指针
 * - **失败时绝不删除唯一完整副本**：区分「source 已被搬走（需要回迁）」与
 *   「source 仍完好（只需删自己复制的 staging）」，回迁失败就把 staging 路径交回调用方
 */
export async function promoteToolSpillFile(
  sourcePath: string,
  options?: { workspaceRoot?: string; ops?: PromoteSpillFileOps },
): Promise<PromoteSpillOutcome> {
  const injected = options?.ops ?? {};
  const ops: Required<PromoteSpillFileOps> = {
    now: injected.now ?? (() => Date.now()),
    statSize: injected.statSize ?? ((path) => statSync(path).size),
    rename: injected.rename ?? ((from, to) => renameSync(from, to)),
    copyExclusive:
      injected.copyExclusive ??
      ((from, to) => {
        // wx：目标已存在就失败，避免两个进程共用同一个 staging 名互相覆盖
        copyFileSync(from, to, constants.COPYFILE_EXCL);
      }),
    unlink: injected.unlink ?? ((path) => unlinkSync(path)),
    exists: injected.exists ?? ((path) => existsSync(path)),
    mkdirp: injected.mkdirp ?? ((dir) => mkdirSync(dir, { recursive: true })),
    touch:
      injected.touch ??
      ((path, atMs) => {
        const at = new Date(atMs);
        utimesSync(path, at, at);
      }),
    hashFile: injected.hashFile ?? hashFileStreaming,
    cleanup: injected.cleanup ?? ((dir) => cleanupExpiredSpills(dir, { throttleMs: 0 })),
    randomId: injected.randomId ?? (() => randomUUID()),
  };

  /**
   * 「读不到」不等于「不存在」。stat/hash 失败可能是暂时性 EIO，此时 source 往往
   * 仍然完整。**没有 preservedPath 会被调用方理解为「没有值得保留的副本」并删除**，
   * 所以这里必须先确认文件是否真的还在，拿不准就保守地把它标成 preserved。
   */
  const preservedIfPresent = (): string | undefined => {
    try {
      return ops.exists(sourcePath) ? sourcePath : undefined;
    } catch {
      return sourcePath;
    }
  };

  let size = 0;
  try {
    size = ops.statSize(sourcePath);
  } catch {
    const preservedPath = preservedIfPresent();
    return preservedPath
      ? { ok: false, reason: "unverified", preservedPath }
      : { ok: false, reason: "missing" };
  }
  if (size <= 0) return { ok: false, reason: "empty" };

  let expectedHash = "";
  try {
    expectedHash = await ops.hashFile(sourcePath);
  } catch {
    const preservedPath = preservedIfPresent();
    return preservedPath
      ? { ok: false, reason: "unverified", preservedPath }
      : { ok: false, reason: "missing" };
  }

  const workspaceRoot = options?.workspaceRoot;
  const candidateDirs = Array.from(
    new Set(
      [
        resolveSpillDirectory({ workspaceRoot }),
        resolveNoloStateDir("spills"),
      ].filter(Boolean),
    ),
  );

  for (const dir of candidateDirs) {
    const id = ops.randomId();
    const final = join(dir, `spill-execshell-${id}.log`);
    const stage = join(dir, `.spill-execshell-${id}.${ops.randomId()}.copying`);
    let stageOwnedByMove = false;
    let stageOwnedByCopy = false;
    try {
      ops.mkdirp(dir);
      try {
        ops.rename(sourcePath, stage);
        stageOwnedByMove = true;
      } catch (error) {
        if ((error as { code?: string } | null)?.code !== "EXDEV") throw error;
        // 跨设备：source 仍然完好，只有复制成功关闭后才把 staging 视作自己所有
        ops.copyExclusive(sourcePath, stage);
        stageOwnedByCopy = true;
      }

      const actualHash = await ops.hashFile(stage);
      if (actualHash !== expectedHash) throw new Error("spill verification failed");

      // rename 会保留源文件时间：长命令刚结束时 mtime 可能已经很旧，
      // 不刷新就会在发布后的第一次清理里被判过期删掉。
      ops.touch(stage, ops.now());
      ops.rename(stage, final);

      // 跨设备路径此时才删源；同设备路径源已被 rename 移走。
      if (ops.exists(sourcePath)) {
        try {
          ops.unlink(sourcePath);
        } catch {
          // 源清不掉不影响已发布的正式文件
        }
      }
      try {
        ops.cleanup(dir);
      } catch {
        // 清理是 best-effort：不能因为回收失败就让调用方失去可用指针
      }

      const displayPath =
        workspaceRoot && isAbsolute(workspaceRoot) && dir === candidateDirs[0]
          ? (() => {
              const rel = relative(workspaceRoot, final);
              return !rel.startsWith("..") && !isAbsolute(rel) ? rel : final;
            })()
          : final;
      return { ok: true, spillPath: final, displayPath };
    } catch {
      if (stageOwnedByCopy) {
        // source 完好：只清理本次复制出来的 staging，绝不碰 source
        try {
          ops.unlink(stage);
        } catch {
          // ignore
        }
        continue;
      }
      if (stageOwnedByMove) {
        try {
          ops.rename(stage, sourcePath);
          continue;
        } catch {
          // 回迁失败：这是唯一的完整副本，绝不删除，交给调用方保留
          return { ok: false, reason: "publish-failed", preservedPath: stage };
        }
      }
    }
  }

  // 收尾的存在性检查同样不能把「查不出来」当成「不存在」：
  // 没有 preservedPath 会让调用方删掉唯一完整副本。
  return {
    ok: false,
    reason: "publish-failed",
    preservedPath: preservedIfPresent(),
  };
}

export function cleanupExpiredSpills(
  spillDir: string,
  options?: { maxAgeMs?: number; maxTotalBytes?: number; throttleMs?: number },
): void {
  if (!existsSync(spillDir)) return;
  // 节流：距上次清理不足 throttleMs 直接跳过（默认 0 = 不节流，保持原语义，
  // 直接调用方/测试不受影响；仅 spillToolOutput 内部传 60s 节流）。
  const throttleMs = options?.throttleMs ?? 0;
  if (throttleMs > 0) {
    const now = Date.now();
    const last = lastSpillCleanupAtMsByDir.get(spillDir);
    if (last !== undefined && now - last < throttleMs) return;
    if (lastSpillCleanupAtMsByDir.size >= SPILL_THROTTLE_MAX_DIRS) {
      lastSpillCleanupAtMsByDir.clear();
    }
    lastSpillCleanupAtMsByDir.set(spillDir, now);
  }
  const maxAge = options?.maxAgeMs ?? DEFAULT_SPILL_TTL_MS;
  const maxBytes = options?.maxTotalBytes ?? DEFAULT_MAX_SPILL_DIR_BYTES;
  const now = Date.now();

  try {
    const entries = readdirSync(spillDir, { withFileTypes: true });
    const spillFiles: Array<{ name: string; fullPath: string; mtimeMs: number; size: number; protectedByPublication: boolean }> = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const isSpillLog = entry.name.startsWith("spill-") && entry.name.endsWith(".log");
      const isOrphanTmp = entry.name.startsWith(".spill-") && entry.name.endsWith(".tmp");
      if (!isSpillLog && !isOrphanTmp) continue;

      const fullPath = join(spillDir, entry.name);
      try {
        const stats = statSync(fullPath);
        // 刚 promote 出来的文件（spill-execshell-*）有保护窗口：不删、也不参与淘汰，
        // 但仍计入配额。其它 spill 文件维持原有 TTL 语义不变。
        const protectedByPublication =
          isSpillLog &&
          entry.name.startsWith("spill-execshell-") &&
          now - stats.mtimeMs < SPILL_PUBLICATION_GRACE_MS;
        if (!protectedByPublication && (now - stats.mtimeMs > maxAge || isOrphanTmp)) {
          unlinkSync(fullPath);
        } else {
          spillFiles.push({
            name: entry.name,
            fullPath,
            mtimeMs: stats.mtimeMs,
            size: stats.size,
            protectedByPublication,
          });
        }
      } catch {
        // Ignore stat or unlink failures
      }
    }

    // LRU eviction if directory exceeds quota
    let totalSize = spillFiles.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > maxBytes) {
      // Sort oldest first
      spillFiles.sort((a, b) => a.mtimeMs - b.mtimeMs);
      for (const file of spillFiles) {
        if (totalSize <= maxBytes) break;
        if (file.protectedByPublication) continue;
        try {
          unlinkSync(file.fullPath);
          totalSize -= file.size;
        } catch {
          // Ignore unlink failures
        }
      }
    }
  } catch {
    // Ignore directory traversal errors
  }
}

/**
 * Spills oversized tool output to a durable log file on disk and returns metadata.
 * Uses atomic writes (temp file + rename) to avoid concurrent reader issues.
 */
export function spillToolOutput(options: SpillToolOutputOptions): ToolSpillResult {
  const { content, workspaceRoot } = options;
  const spillDir = resolveSpillDirectory({ workspaceRoot, baseDir: options.baseDir });

  if (!existsSync(spillDir)) {
    mkdirSync(spillDir, { recursive: true });
  }

  // Pre-cleanup periodically/on write（节流：最多每 60s 一次全量扫描）
  cleanupExpiredSpills(spillDir, {
    maxAgeMs: options.ttlMs,
    maxTotalBytes: options.maxRetentionBytes,
    throttleMs: SPILL_CLEANUP_THROTTLE_MS,
  });

  const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);
  const safeToolName = (options.toolName || "tool")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 24);
  // Content-addressed filename: identical content MUST yield an identical path.
  //
  // The returned displayPath is embedded in the projected tool message sent to
  // the provider. A timestamp here made that projection time-varying, so every
  // turn re-projected the same historical tool result under a new name, moving
  // the prefix and destroying provider prefix caching for the whole history
  // that followed it. Keep this a pure function of (toolName, content).
  const fileName = `spill-${safeToolName}-${hash}.log`;
  const spillPath = join(spillDir, fileName);
  const tmpPath = join(spillDir, `.${fileName}.${Math.random().toString(36).slice(2, 8)}.tmp`);

  const byteLength = Buffer.byteLength(content, "utf-8");
  const totalChars = content.length;
  const totalLines = countLines(content);

  if (existsSync(spillPath)) {
    // Same content already spilled. Skip the rewrite but refresh mtime so the
    // LRU quota sweep treats a still-referenced spill as recently used.
    try {
      const now = new Date();
      utimesSync(spillPath, now, now);
    } catch {
      // Ignore utimes failures; a stale mtime only affects eviction ordering.
    }
  } else {
    writeFileSync(tmpPath, content, "utf-8");
    renameSync(tmpPath, spillPath);
  }

  let displayPath = spillPath;
  if (workspaceRoot && isAbsolute(workspaceRoot)) {
    const rel = relative(workspaceRoot, spillPath);
    if (!rel.startsWith("..") && !isAbsolute(rel)) {
      displayPath = rel;
    }
  }

  return {
    spillPath,
    displayPath,
    totalChars,
    totalLines,
    byteLength,
    hash,
  };
}

export function formatToolOverflowMarker(args: {
  spillRef: string;
  totalChars: number;
  totalLines: number;
  omittedChars?: number;
  toolName?: string;
}): string {
  const { spillRef, totalChars, totalLines, omittedChars } = args;
  const omittedNote = omittedChars !== undefined && omittedChars > 0
    ? ` omitted: ${omittedChars} chars;`
    : "";
  return (
    `\n\n[TOOL-OVERFLOW: full output spilled to ${spillRef} (total: ${totalChars} chars, ${totalLines} lines;${omittedNote} inspect via readFile or grep)]\n\n`
  );
}
