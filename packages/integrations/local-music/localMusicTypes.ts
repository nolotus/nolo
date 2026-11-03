/**
 * 本地音乐库契约（adapter #2，默认源）。
 *
 * 设计要点（与 `packages/integrations/music/musicTypes.ts` 配套）
 * ---------------------------------------------------------------
 * 1. **身份用内容指纹，不用路径**：`TrackRef.id` = 文件大小 + 前 64KB 的 sha256 前缀。
 *    文件移动/改名后仍是同一首歌，收藏与历史不丢；路径只作为 locator 存在索引里。
 * 2. **只读、不上传**：本模块只读用户显式授权的目录，不复制、不转码、不上传任何内容。
 * 3. **无网络、无账号**：`capabilities.auth = "none"`、`cachePolicy = "none"`（本身就是本地文件）。
 * 4. **不做全盘扫描**：只扫 `roots` 里列出的目录，跳过隐藏目录与系统目录。
 */

import type { Track, TrackRef } from "../music/musicTypes";

/** 支持的扩展名（解析失败时回退到文件名，不跳过文件）。 */
export const LOCAL_AUDIO_EXTENSIONS = [
  ".mp3",
  ".flac",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
  ".wav",
] as const;

/** 扫描时跳过的目录名（隐藏目录另按前缀过滤）。 */
export const LOCAL_SKIP_DIR_NAMES = [
  "node_modules",
  ".git",
  ".cache",
  "System Volume Information",
  "$RECYCLE.BIN",
] as const;

/** 单次扫描的硬上限，防止误选根目录把机器扫穿。 */
export const LOCAL_SCAN_MAX_FILES = 50_000;
export const LOCAL_SCAN_MAX_DEPTH = 12;
/** 并发解析上限（IO + 标签解析）。 */
export const LOCAL_SCAN_CONCURRENCY = 4;

/** 用户授权的一个音乐根目录。 */
export type LocalLibraryRoot = {
  /** 绝对路径，已 `realpath` 归一。 */
  path: string;
  /** 加入时间（毫秒）。 */
  addedAt: number;
};

/** 索引里的一条曲目（含定位与缓存键）。 */
export type LocalTrackRecord = {
  /** 内容指纹，等于 `ref.id`。 */
  id: string;
  /** 规范化后的绝对路径（locator，可失效）。 */
  filePath: string;
  /** 文件大小（字节），指纹的一部分，也用作增量判断。 */
  sizeBytes: number;
  /** 文件 mtime（毫秒），增量判断用。 */
  mtimeMs: number;
  /** 归一化后的曲目（可直接给 UI/agent）。 */
  track: Track;
  /** 解析出的标题来源：标签 or 文件名（用于排查与调试）。 */
  titleSource: "tag" | "filename";
};

/** 索引的持久化形态（版本化，便于将来迁移）。 */
export type LocalLibraryIndexV1 = {
  version: 1;
  roots: LocalLibraryRoot[];
  tracks: LocalTrackRecord[];
  /** 最近一次扫描完成时间。 */
  scannedAt?: number;
};

/** 扫描进度（供 UI 展示，不做阻塞等待）。 */
export type LocalScanProgress = {
  phase: "walking" | "parsing" | "done";
  /** 已发现（检查过）的文件数。 */
  scannedFiles: number;
  /** 已解析（含命中缓存跳过）的曲目数。 */
  indexedTracks: number;
  /** 当前正在处理的路径（仅用于展示）。 */
  currentPath?: string;
};

export type LocalScanResult = {
  /** 新增或更新的曲目数。 */
  added: number;
  /** 内容未变、直接复用的曲目数。 */
  reused: number;
  /** 从索引里移除的曲目数（文件已不存在）。 */
  removed: number;
  /** 因为格式/解析问题被跳过的文件数。 */
  skipped: number;
  /** 是否触及扫描上限（触及即提前结束）。 */
  truncated: boolean;
  durationMs: number;
};

export type LocalScanOptions = {
  roots: LocalLibraryRoot[];
  /** 现有索引（用于增量复用）。 */
  previous?: LocalTrackRecord[];
  /** 进度回调，节流由调用方负责。 */
  onProgress?: (p: LocalScanProgress) => void;
  /** 测试注入：文件遍历实现（默认走 node:fs）。 */
  listFiles?: (root: string) => Promise<string[]>;
  /** 测试注入：元数据解析实现（默认走 music-metadata）。 */
  parseMetadata?: (filePath: string) => Promise<LocalParsedMetadata>;
};

/** 解析单文件得到的最小元数据。 */
export type LocalParsedMetadata = {
  title?: string;
  artists?: string[];
  album?: string;
  durationMs?: number;
  /** 内嵌封面（mime + base64），没有则 undefined。 */
  cover?: { mime: string; base64: string };
};

export type LocalLibraryStats = {
  roots: number;
  tracks: number;
  unavailable: number;
  lastScannedAt?: number;
};

/** 索引查询接口（handler 与 adapter 都只依赖它）。 */
export type LocalLibrary = {
  listRoots(): LocalLibraryRoot[];
  addRoot(path: string): Promise<{ added: boolean; root: LocalLibraryRoot }>;
  removeRoot(path: string): Promise<{ removed: boolean }>;
  /** 归一化查询：接受用户输入的 ref id 或 filePath。 */
  findByRef(ref: TrackRef): Promise<LocalTrackRecord | null>;
  findByPath(path: string): Promise<LocalTrackRecord | null>;
  /** 搜索（标题 / 歌手 / 专辑 / 文件名，大小写不敏感）。 */
  search(query: { keyword: string; limit?: number; offset?: number }): {
    tracks: Track[];
    total: number;
  };
  /** 当前全部曲目（用于统计与调试）。 */
  allTracks(): LocalTrackRecord[];
  /** 用一次扫描结果替换/合并索引。 */
  applyScan(result: { roots: LocalLibraryRoot[]; tracks: LocalTrackRecord[] }): Promise<void>;
  /** 持久化到磁盘（原子写）。 */
  persist(): Promise<void>;
  stats(): Promise<LocalLibraryStats>;
};

/** 扫描器对外的两个入口（handler 依赖它们）。 */
export type LocalScanner = {
  /** 扫描全部 roots（增量：命中 previous 且 mtime+size 未变则复用）。 */
  scan(options: LocalScanOptions): Promise<{ tracks: LocalTrackRecord[]; result: LocalScanResult }>;
};
