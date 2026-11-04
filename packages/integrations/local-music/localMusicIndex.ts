/**
 * 本地音乐库的索引与持久化实现（adapter #2 的第二块）。
 *
 * 只做「索引 + 持久化」：不遍历目录、不解析元数据、不做 handler。
 * 契约见 `localMusicTypes.ts`。
 *
 * 关键取舍
 * ---------------------------------------------------------------
 * - **身份用内容指纹**：`LocalTrackRecord.id` 由扫描器给出（大小 + 前 64KB sha256 前缀），
 *   本模块只按 id 建立索引，不做任何路径即身份的假设。
 * - **文件删除策略**：`applyScan` 用本次扫描结果**整体替换** tracks，因此「上次有、这次没有」
 *   的条目直接消失（本地文件已删，不应继续出现在列表里）。
 * - **损坏容错**：索引文件损坏 / 版本不符时**不删原文件**，先备份成同目录的 `.bak`（最多 1 份），
 *   再以空库继续，避免一次解析失败就丢索引。
 * - **权限**：落盘走「临时文件 + chmod 0600 + rename」，只允许本人读写。
 */

import fs from "node:fs";
import path from "node:path";
import type { Track, TrackRef } from "../music/musicTypes";
import type {
  LocalLibrary,
  LocalLibraryIndexV1,
  LocalLibraryRoot,
  LocalLibraryStats,
  LocalTrackRecord,
} from "./localMusicTypes";

/** 索引文件损坏 / 版本不符时的备份后缀。 */
const BACKUP_SUFFIX = ".bak";

/** 平台不支持 POSIX 权限位时跳过 chmod（不抛错）。 */
async function safeChmod(targetPath: string, mode: number): Promise<void> {
  if (process.platform === "win32") {
    return;
  }
  try {
    await fs.promises.chmod(targetPath, mode);
  } catch {
    // 忽略平台不支持或权限问题，不抛错
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 宽松校验并归一化一条曲目记录，形状不合法则返回 null。 */
function sanitizeTrackRecord(value: unknown): LocalTrackRecord | null {
  if (!isRecord(value)) return null;
  const { id, filePath, sizeBytes, mtimeMs, titleSource, track } = value;
  if (typeof id !== "string" || id.length === 0) return null;
  if (typeof filePath !== "string" || filePath.length === 0) return null;
  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes)) return null;
  if (typeof mtimeMs !== "number" || !Number.isFinite(mtimeMs)) return null;
  if (titleSource !== "tag" && titleSource !== "filename") return null;
  if (!isRecord(track)) return null;

  const trackRef = track.ref;
  if (!isRecord(trackRef)) return null;
  if (trackRef.source !== "local" || typeof trackRef.id !== "string") return null;
  if (typeof track.title !== "string") return null;
  if (
    !Array.isArray(track.artists) ||
    track.artists.some(
      (artist) => !isRecord(artist) || typeof artist.name !== "string",
    )
  ) {
    return null;
  }

  const album = track.album;
  if (album !== undefined && (!isRecord(album) || typeof album.name !== "string")) {
    return null;
  }

  return {
    id,
    filePath,
    sizeBytes,
    mtimeMs,
    titleSource,
    track: track as Track,
  };
}

/** 宽松校验并归一化一个根目录，形状不合法则返回 null。 */
function sanitizeRoot(value: unknown): LocalLibraryRoot | null {
  if (!isRecord(value)) return null;
  const { path: rootPath, addedAt } = value;
  if (typeof rootPath !== "string" || rootPath.length === 0) return null;
  if (typeof addedAt !== "number" || !Number.isFinite(addedAt)) return null;
  return { path: rootPath, addedAt };
}

/** 校验并归一化整个索引，形状不合法或版本不符则返回 null。 */
function parseIndex(raw: string): LocalLibraryIndexV1 | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (parsed.version !== 1) return null;

  const rootsRaw = parsed.roots;
  const tracksRaw = parsed.tracks;
  if (!Array.isArray(rootsRaw) || !Array.isArray(tracksRaw)) return null;

  const roots: LocalLibraryRoot[] = [];
  for (const item of rootsRaw) {
    const root = sanitizeRoot(item);
    if (!root) return null;
    roots.push(root);
  }

  const tracks: LocalTrackRecord[] = [];
  for (const item of tracksRaw) {
    const track = sanitizeTrackRecord(item);
    if (!track) return null;
    tracks.push(track);
  }

  const scannedAt =
    typeof parsed.scannedAt === "number" && Number.isFinite(parsed.scannedAt)
      ? parsed.scannedAt
      : undefined;

  return scannedAt === undefined
    ? { version: 1, roots, tracks }
    : { version: 1, roots, tracks, scannedAt };
}

function basenameOf(filePath: string): string {
  return path.basename(filePath);
}

/**
 * 搜索命中打分：标题前缀命中 > 标题子串 > 其它字段。
 * 数字越小越靠前，未命中返回 Infinity。
 */
function searchRank(
  record: LocalTrackRecord,
  keywordLower: string,
  fileNameLower: string,
): number {
  const titleLower = record.track.title.toLowerCase();
  if (titleLower.startsWith(keywordLower)) return 0;
  if (titleLower.includes(keywordLower)) return 1;

  if (fileNameLower.includes(keywordLower)) return 2;

  const artists = record.track.artists
    .map((artist) => artist.name.toLowerCase())
    .join(" ");
  if (artists.includes(keywordLower)) return 3;

  if (record.track.album && record.track.album.name.toLowerCase().includes(keywordLower)) {
    return 4;
  }

  return Number.POSITIVE_INFINITY;
}

/** 稳定排序用的复合比较：先按 rank，再按 filePath 升序。 */
function compareSearchHits(
  left: { record: LocalTrackRecord; rank: number },
  right: { record: LocalTrackRecord; rank: number },
): number {
  if (left.rank !== right.rank) {
    return left.rank - right.rank;
  }
  if (left.record.filePath < right.record.filePath) return -1;
  if (left.record.filePath > right.record.filePath) return 1;
  return 0;
}

export function createLocalLibrary(options: {
  /** 索引文件绝对路径（由调用方给出，如 .../local-music/index.json） */
  indexPath: string;
  /** 可选：启动时自动 load */
  autoLoad?: boolean;
  /** 可选：项目标识 */
  projectId?: string;
}): LocalLibrary & { load(): Promise<void>; projectId?: string } {
  const indexPath = options.indexPath;
  const dir = path.dirname(indexPath);
  const tmpPath = `${indexPath}.${process.pid}.${Math.random().toString(36).slice(2, 10)}.tmp`;
  const backupPath = `${indexPath}${BACKUP_SUFFIX}`;

  let roots: LocalLibraryRoot[] = [];
  let tracks: LocalTrackRecord[] = [];
  let scannedAt: number | undefined;

  /**
   * stats() 的短 TTL 缓存。
   *
   * 为什么需要 TTL：面板每次动作（切歌、刷新、扫盘前后）都会 GET
   * /api/desktop/music/local/status，而 stats() 要逐个 stat 索引里的每个文件才能算出
   * unavailable。全库遍历会堵住事件循环，所以 TTL 内直接复用上次结果，不重新扫盘。
   */
  const STATS_TTL_MS = 3_000;
  let statsCache: { at: number; value: LocalLibraryStats } | null = null;

  /** 索引状态变化后让 stats 缓存失效（下一次调用重新扫盘）。 */
  function invalidateStatsCache(): void {
    statsCache = null;
  }

  function toIndexV1(): LocalLibraryIndexV1 {
    const index: LocalLibraryIndexV1 = { version: 1, roots, tracks };
    if (scannedAt !== undefined) {
      index.scannedAt = scannedAt;
    }
    return index;
  }

  /**
   * 损坏文件备份：只保留 1 份（先删旧 .bak 再 rename）。
   * 任何一步失败都吞掉——备份是为了兜底，不能反而让 load 失败。
   */
  async function backupCorruptedFile(): Promise<void> {
    try {
      await fs.promises.rm(backupPath, { force: true });
    } catch {
      // 忽略
    }
    try {
      await fs.promises.rename(indexPath, backupPath);
    } catch {
      // 忽略
    }
  }

  async function load(): Promise<void> {
    invalidateStatsCache();
    let raw: string;
    try {
      raw = await fs.promises.readFile(indexPath, "utf-8");
    } catch (err: unknown) {
      if (isErrnoError(err) && err.code === "ENOENT") {
        // 首次运行：没有索引文件是正常状态，视为空库
        roots = [];
        tracks = [];
        scannedAt = undefined;
        return;
      }
      throw err;
    }

    const index = parseIndex(raw);
    if (!index) {
      await backupCorruptedFile();
      roots = [];
      tracks = [];
      scannedAt = undefined;
      return;
    }

    roots = index.roots;
    tracks = index.tracks;
    scannedAt = index.scannedAt;
  }

  /**
   * 启动时自动 load：只启动一次，之后调用 `load()` 复用同一个 promise
   * （重复调用不会重复读盘，也不会互相覆盖）。
   */
  let loadPromise: Promise<void> | null = null;
  function startLoad(): Promise<void> {
    if (!loadPromise) {
      loadPromise = load().catch((err: unknown) => {
        // 失败后允许下次重试，而不是把拒绝态永久记住
        loadPromise = null;
        throw err;
      });
    }
    return loadPromise;
  }

  const library: LocalLibrary & { load(): Promise<void>; projectId?: string } = {
    projectId: options.projectId,
    async load() {
      await startLoad();
    },

    listRoots(): LocalLibraryRoot[] {
      return roots.map((root) => ({ ...root }));
    },

    async addRoot(rootPath: string): Promise<{ added: boolean; root: LocalLibraryRoot }> {
      let resolved: string;
      try {
        resolved = await fs.promises.realpath(rootPath);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(
          `无法添加音乐根目录（路径不存在或不可访问）：${rootPath}: ${message}`,
        );
      }

      const existing = roots.find((root) => root.path === resolved);
      if (existing) {
        return { added: false, root: { ...existing } };
      }

      const root: LocalLibraryRoot = { path: resolved, addedAt: Date.now() };
      roots = [...roots, root];
      invalidateStatsCache();
      return { added: true, root: { ...root } };
    },

    async removeRoot(rootPath: string): Promise<{ removed: boolean }> {
      let resolved: string;
      try {
        resolved = await fs.promises.realpath(rootPath);
      } catch {
        // 目录已经不存在：幂等视为已移除
        resolved = path.resolve(rootPath);
      }

      const next = roots.filter((root) => root.path !== resolved);
      if (next.length === roots.length) {
        return { removed: false };
      }
      roots = next;
      invalidateStatsCache();
      return { removed: true };
    },

    async findByRef(ref: TrackRef): Promise<LocalTrackRecord | null> {
      if (ref.source !== "local") {
        return null;
      }
      const record = tracks.find((item) => item.id === ref.id);
      return record ? structuredClone(record) : null;
    },

    async findByPath(targetPath: string): Promise<LocalTrackRecord | null> {
      const resolved = path.resolve(targetPath);
      const record = tracks.find((item) => path.resolve(item.filePath) === resolved);
      return record ? structuredClone(record) : null;
    },

    search(query: { keyword: string; limit?: number; offset?: number }): {
      tracks: Track[];
      total: number;
    } {
      const keyword = query.keyword.trim();
      const limit = query.limit ?? 20;
      const offset = query.offset ?? 0;

      if (keyword.length === 0) {
        return { tracks: [], total: 0 };
      }

      const keywordLower = keyword.toLowerCase();
      const hits: { record: LocalTrackRecord; rank: number }[] = [];
      for (const record of tracks) {
        const rank = searchRank(record, keywordLower, basenameOf(record.filePath).toLowerCase());
        if (rank !== Number.POSITIVE_INFINITY) {
          hits.push({ record, rank });
        }
      }

      hits.sort(compareSearchHits);

      const total = hits.length;
      const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;
      const safeOffset = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;

      return {
        tracks: hits.slice(safeOffset, safeOffset + safeLimit).map((hit) => hit.record.track),
        total,
      };
    },

    allTracks(): LocalTrackRecord[] {
      return [...tracks]
        .sort((left, right) => {
          if (left.filePath < right.filePath) return -1;
          if (left.filePath > right.filePath) return 1;
          return 0;
        })
        .map((record) => structuredClone(record));
    },

    async applyScan(result: {
      roots: LocalLibraryRoot[];
      tracks: LocalTrackRecord[];
    }): Promise<void> {
      roots = result.roots.map((root) => ({ ...root }));
      // 整体替换：本次未出现但之前存在的条目直接移除
      tracks = result.tracks.map((record) => structuredClone(record));
      scannedAt = Date.now();
      invalidateStatsCache();
    },

    async persist(): Promise<void> {
      await fs.promises.mkdir(dir, { recursive: true });
      const payload = JSON.stringify(toIndexV1(), null, 2);
      try {
        await fs.promises.writeFile(tmpPath, payload, {
          encoding: "utf-8",
          mode: 0o600,
        });
        await safeChmod(tmpPath, 0o600);
        await fs.promises.rename(tmpPath, indexPath);
        await safeChmod(indexPath, 0o600);
      } catch (err: unknown) {
        await fs.promises.unlink(tmpPath).catch(() => {});
        throw err;
      }
    },

    /**
     * 统计信息。
     *
     * 为什么是异步 + TTL 缓存：`/api/desktop/music/local/status` 每次 GET 都会调它，
     * 而 unavailable 只能靠逐个 stat 索引里的文件算出来。全库同步遍历会堵住事件循环，
     * 所以这里分批（每批 50 条）串行 await，并把结果缓存 3 秒；TTL 内重复调用直接返回
     * 上次结果（含原始 lastScannedAt），不重新扫盘。
     */
    async stats(): Promise<LocalLibraryStats> {
      const now = Date.now();
      if (statsCache !== null && now - statsCache.at < STATS_TTL_MS) {
        return statsCache.value;
      }

      let unavailable = 0;
      const batchSize = 50;
      for (let start = 0; start < tracks.length; start += batchSize) {
        const batch = tracks.slice(start, start + batchSize);
        for (const record of batch) {
          try {
            await fs.promises.access(record.filePath);
          } catch {
            unavailable += 1;
          }
        }
      }

      const result: LocalLibraryStats = {
        roots: roots.length,
        tracks: tracks.length,
        unavailable,
      };
      if (scannedAt !== undefined) {
        result.lastScannedAt = scannedAt;
      }
      statsCache = { at: now, value: result };
      return result;
    },
  };

  if (options.autoLoad) {
    void startLoad();
  }

  return library;
}

function isErrnoError(err: unknown): err is NodeJS.ErrnoException {
  return isRecord(err) && typeof err.code === "string";
}
