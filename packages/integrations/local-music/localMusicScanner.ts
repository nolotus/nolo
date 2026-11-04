import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { parseFile } from "music-metadata";
import type { Track } from "../music/musicTypes";
import {
  LOCAL_AUDIO_EXTENSIONS,
  LOCAL_SKIP_DIR_NAMES,
  LOCAL_SCAN_MAX_FILES,
  LOCAL_SCAN_MAX_DEPTH,
  LOCAL_SCAN_CONCURRENCY,
  type LocalLibraryRoot,
  type LocalTrackRecord,
  type LocalScanProgress,
  type LocalScanResult,
  type LocalScanOptions,
  type LocalParsedMetadata,
  type LocalScanner,
} from "./localMusicTypes";

export type LocalScannerDeps = {
  parseMetadata?: (filePath: string) => Promise<LocalParsedMetadata>;
  listFiles?: (root: string) => Promise<string[]>;
  now?: () => number;
  statFile?: (filePath: string) => Promise<{ sizeBytes: number; mtimeMs: number }>;
  readHead?: (filePath: string, maxBytes: number) => Promise<Buffer>;
};

/** 内容指纹：sha256(前 64KB + ":" + sizeBytes) 的 hex 前 32 字符作为 id */
export function computeFingerprint(headBuffer: Uint8Array | Buffer, sizeBytes: number): string {
  const hash = crypto.createHash("sha256");
  hash.update(headBuffer);
  hash.update(":" + sizeBytes);
  return hash.digest("hex").slice(0, 32);
}

/** 拆分并规范化歌手列表，支持多种常见分隔符并去重 */
export function normalizeArtists(rawArtist?: string, rawArtists?: string[]): string[] {
  const list: string[] = [];
  const splitRegex = /[/,;&、，]|(?:\s+feat\.?\s+)|(?:\s+ft\.?\s+)/i;

  if (rawArtist) {
    for (const part of rawArtist.split(splitRegex)) {
      const trimmed = part.trim();
      if (trimmed) list.push(trimmed);
    }
  }

  if (rawArtists) {
    for (const a of rawArtists) {
      if (!a) continue;
      for (const part of a.split(splitRegex)) {
        const trimmed = part.trim();
        if (trimmed) list.push(trimmed);
      }
    }
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of list) {
    const lower = name.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(name);
    }
  }

  return result;
}

export function isAudioExtension(ext: string): boolean {
  const normalized = ext.toLowerCase();
  return LOCAL_AUDIO_EXTENSIONS.includes(normalized as (typeof LOCAL_AUDIO_EXTENSIONS)[number]);
}

/** 检查文件或路径是否应该跳过 */
export function shouldSkipPath(itemPath: string): boolean {
  const normalized = path.normalize(itemPath);
  const parts = normalized.split(path.sep);

  const fileName = parts[parts.length - 1];
  if (!fileName || fileName.startsWith(".")) {
    return true;
  }

  const ext = path.extname(fileName);
  if (!isAudioExtension(ext)) {
    return true;
  }

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!part) continue;
    if (part.startsWith(".")) {
      return true;
    }
    if (LOCAL_SKIP_DIR_NAMES.some((skip) => skip.toLowerCase() === part.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/** 默认的元数据解析器（基于 music-metadata） */
export async function defaultParseMetadata(filePath: string): Promise<LocalParsedMetadata> {
  const metadata = await parseFile(filePath, { duration: true });
  const artists = normalizeArtists(metadata.common.artist, metadata.common.artists);
  const cover = metadata.common.picture?.[0]
    ? {
        mime: metadata.common.picture[0].format,
        base64: Buffer.from(metadata.common.picture[0].data).toString("base64"),
      }
    : undefined;

  return {
    title: metadata.common.title,
    artists: artists.length > 0 ? artists : undefined,
    album: metadata.common.album,
    durationMs:
      typeof metadata.format.duration === "number" && !isNaN(metadata.format.duration)
        ? Math.round(metadata.format.duration * 1000)
        : undefined,
    cover,
  };
}

async function defaultStatFile(filePath: string): Promise<{ sizeBytes: number; mtimeMs: number }> {
  const stat = await fs.promises.stat(filePath);
  return { sizeBytes: stat.size, mtimeMs: stat.mtimeMs };
}

async function defaultReadHead(filePath: string, maxBytes = 64 * 1024): Promise<Buffer> {
  const fd = await fs.promises.open(filePath, "r");
  try {
    const stat = await fd.stat();
    const bytesToRead = Math.min(stat.size, maxBytes);
    const buffer = Buffer.alloc(bytesToRead);
    if (bytesToRead > 0) {
      const { bytesRead } = await fd.read(buffer, 0, bytesToRead, 0);
      return buffer.subarray(0, bytesRead);
    }
    return buffer;
  } finally {
    await fd.close();
  }
}

/** 默认文件遍历实现 */
async function defaultListFiles(
  root: string,
  maxFiles: number,
  onProgress?: (scannedFiles: number, currentPath?: string) => void
): Promise<{ files: string[]; scannedFiles: number; truncated: boolean }> {
  const files: string[] = [];
  let scannedFiles = 0;
  let truncated = false;

  try {
    const rootStat = await fs.promises.stat(root);
    if (!rootStat.isDirectory()) {
      if (rootStat.isFile() && !shouldSkipPath(root)) {
        return { files: [path.resolve(root)], scannedFiles: 1, truncated: false };
      }
      return { files: [], scannedFiles: 0, truncated: false };
    }
  } catch {
    return { files: [], scannedFiles: 0, truncated: false };
  }

  type QueueItem = { dir: string; depth: number };
  const queue: QueueItem[] = [{ dir: path.resolve(root), depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current.dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) continue;
        if (LOCAL_SKIP_DIR_NAMES.some((skip) => skip.toLowerCase() === entry.name.toLowerCase())) {
          continue;
        }
        if (current.depth + 1 <= LOCAL_SCAN_MAX_DEPTH) {
          queue.push({ dir: fullPath, depth: current.depth + 1 });
        }
      } else if (entry.isFile()) {
        scannedFiles++;
        if (onProgress && scannedFiles % 200 === 0) {
          onProgress(scannedFiles, fullPath);
        }
        if (entry.name.startsWith(".")) continue;
        const ext = path.extname(entry.name);
        if (!isAudioExtension(ext)) continue;

        files.push(fullPath);
        if (files.length >= maxFiles) {
          truncated = true;
          return { files, scannedFiles, truncated };
        }
      }
    }
  }

  return { files, scannedFiles, truncated };
}

/** 轻量并发执行器，控制最大并发数 */
async function runConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

export function createLocalScanner(deps?: LocalScannerDeps): LocalScanner {
  const now = deps?.now ?? Date.now;
  const parseMetadataFn = deps?.parseMetadata ?? defaultParseMetadata;
  const listFilesFn = deps?.listFiles;
  const statFileFn = deps?.statFile ?? defaultStatFile;
  const readHeadFn = deps?.readHead ?? defaultReadHead;

  return {
    async scan(options: LocalScanOptions): Promise<{ tracks: LocalTrackRecord[]; result: LocalScanResult }> {
      const startTime = now();
      const effectiveParseMetadata = options.parseMetadata ?? parseMetadataFn;
      const effectiveListFiles = options.listFiles ?? listFilesFn;

      const previousMap = new Map<string, LocalTrackRecord>();
      if (options.previous) {
        for (const record of options.previous) {
          previousMap.set(record.filePath, record);
        }
      }

      let allDiscoveredFiles: string[] = [];
      let totalScannedCount = 0;
      let isTruncated = false;

      // Phase 1: walking
      for (const root of options.roots) {
        if (allDiscoveredFiles.length >= LOCAL_SCAN_MAX_FILES) {
          isTruncated = true;
          break;
        }

        const remainingQuota = LOCAL_SCAN_MAX_FILES - allDiscoveredFiles.length;

        if (effectiveListFiles) {
          const files = await effectiveListFiles(root.path);
          for (const f of files) {
            totalScannedCount++;
            if (options.onProgress && totalScannedCount % 200 === 0) {
              try {
                options.onProgress({
                  phase: "walking",
                  scannedFiles: totalScannedCount,
                  indexedTracks: 0,
                  currentPath: f,
                });
              } catch {}
            }

            if (!shouldSkipPath(f)) {
              allDiscoveredFiles.push(path.resolve(f));
              if (allDiscoveredFiles.length >= LOCAL_SCAN_MAX_FILES) {
                isTruncated = true;
                break;
              }
            }
          }
        } else {
          const walkResult = await defaultListFiles(
            root.path,
            remainingQuota,
            (count, curPath) => {
              totalScannedCount += count;
              if (options.onProgress) {
                try {
                  options.onProgress({
                    phase: "walking",
                    scannedFiles: totalScannedCount,
                    indexedTracks: 0,
                    currentPath: curPath,
                  });
                } catch {}
              }
            }
          );
          allDiscoveredFiles.push(...walkResult.files);
          totalScannedCount += walkResult.scannedFiles;
          if (walkResult.truncated || allDiscoveredFiles.length >= LOCAL_SCAN_MAX_FILES) {
            isTruncated = true;
            break;
          }
        }
      }

      // Phase 2: parsing / diffing
      let addedCount = 0;
      let reusedCount = 0;
      let skippedCount = 0;
      let processedCount = 0;

      const currentFilesSet = new Set(allDiscoveredFiles);

      // 处理每个文件
      const records = await runConcurrent(
        allDiscoveredFiles,
        LOCAL_SCAN_CONCURRENCY,
        async (filePath: string): Promise<LocalTrackRecord> => {
          let stat: { sizeBytes: number; mtimeMs: number };
          try {
            stat = await statFileFn(filePath);
          } catch {
            stat = { sizeBytes: 0, mtimeMs: 0 };
          }

          // 增量复用判断
          const prev = previousMap.get(filePath);
          if (
            prev &&
            prev.sizeBytes === stat.sizeBytes &&
            Math.round(prev.mtimeMs) === Math.round(stat.mtimeMs)
          ) {
            reusedCount++;
            processedCount++;
            if (options.onProgress && processedCount % 200 === 0) {
              try {
                options.onProgress({
                  phase: "parsing",
                  scannedFiles: allDiscoveredFiles.length,
                  indexedTracks: processedCount,
                  currentPath: filePath,
                });
              } catch {}
            }
            return prev;
          }

          // 需要解析元数据
          let headBuffer: Buffer;
          try {
            headBuffer = await readHeadFn(filePath, 64 * 1024);
          } catch {
            headBuffer = Buffer.alloc(0);
          }

          const id = computeFingerprint(headBuffer, stat.sizeBytes);

          let parsed: LocalParsedMetadata | null = null;
          let parseError = false;
          try {
            parsed = await effectiveParseMetadata(filePath);
          } catch {
            parseError = true;
          }

          const ext = path.extname(filePath);
          const filenameBase = path.basename(filePath, ext);

          let title = filenameBase;
          let titleSource: "tag" | "filename" = "filename";
          let artists: { id?: string; name: string }[] = [];
          let album: { id?: string; name: string } | undefined = undefined;
          let durationMs: number | undefined = undefined;

          if (!parseError && parsed) {
            if (typeof parsed.title === "string" && parsed.title.trim().length > 0) {
              title = parsed.title.trim();
              titleSource = "tag";
            } else {
              title = filenameBase;
              titleSource = "filename";
            }

            if (Array.isArray(parsed.artists)) {
              artists = parsed.artists
                .filter((a) => typeof a === "string" && a.trim().length > 0)
                .map((name) => ({ name: name.trim() }));
            }

            if (typeof parsed.album === "string" && parsed.album.trim().length > 0) {
              album = { name: parsed.album.trim() };
            }

            if (typeof parsed.durationMs === "number" && !isNaN(parsed.durationMs)) {
              durationMs = Math.round(parsed.durationMs);
            }

            addedCount++;
          } else {
            // 解析失败（损坏/不支持），仍用文件名建条目
            title = filenameBase;
            titleSource = "filename";
            skippedCount++;
          }

          const track: Track = {
            ref: { source: "local", id },
            mediaKind: "track",
            title,
            artists,
            album,
            durationMs,
            snapshot: {
              title,
              artistsLine: artists.map((a) => a.name).join(", "),
            },
          };

          const record: LocalTrackRecord = {
            id,
            filePath,
            sizeBytes: stat.sizeBytes,
            mtimeMs: stat.mtimeMs,
            track,
            titleSource,
          };

          processedCount++;
          if (options.onProgress && processedCount % 200 === 0) {
            try {
              options.onProgress({
                phase: "parsing",
                scannedFiles: allDiscoveredFiles.length,
                indexedTracks: processedCount,
                currentPath: filePath,
              });
            } catch {}
          }

          return record;
        }
      );

      // 计算 removed
      let removedCount = 0;
      if (options.previous) {
        for (const prev of options.previous) {
          if (!currentFilesSet.has(prev.filePath)) {
            removedCount++;
          }
        }
      }

      // 按 filePath 升序排序保证结果确定性
      records.sort((a, b) => a.filePath.localeCompare(b.filePath));

      // Phase 3: done
      if (options.onProgress) {
        try {
          options.onProgress({
            phase: "done",
            scannedFiles: allDiscoveredFiles.length,
            indexedTracks: records.length,
          });
        } catch {}
      }

      const result: LocalScanResult = {
        added: addedCount,
        reused: reusedCount,
        removed: removedCount,
        skipped: skippedCount,
        truncated: isTruncated,
        durationMs: Math.max(0, now() - startTime),
      };

      return {
        tracks: records,
        result,
      };
    },
  };
}
