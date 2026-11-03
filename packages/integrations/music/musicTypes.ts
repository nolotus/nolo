/**
 * 多源音乐抽象层核心类型定义。
 *
 * 三条不可越界的纪律：
 * 1. 持久化只存 TrackRef（+ 展示快照）；PlaybackTarget 一律现取，绝不写进历史/收藏/队列。
 * 2. 能力差异一律读 capabilities，musicSourceRegistry 是唯一按源分派的地方。
 * 3. 缓存开关由 cachePolicy 决定：none 的源（如 Spotify）连"临时缓存目录"都不能写。
 */

export type MusicSourceId = "netease" | "spotify" | "local"; // 加法扩展，不做联合穷尽分支

export type MediaKind = "track" | "episode"; // 播客/有声书走 episode，不与 track 混模型

/** 身份：跨源稳定、可持久化（历史/收藏/队列只存这个） */
export type TrackRef = { source: MusicSourceId; id: string };

export type Track = {
  ref: TrackRef;
  mediaKind: MediaKind;
  title: string;
  artists: { id?: string; name: string }[];
  album?: { id?: string; name: string; coverUrl?: string };
  durationMs?: number;
  /** 展示快照：仅用于渲染，绝不用于回放定位 */
  snapshot?: { title: string; artistsLine: string; coverUrl?: string };
};

/** 定位器：会过期/会移动，只能现取现用，禁止持久化 */
export type PlaybackTarget =
  | { kind: "direct-url"; url: string; expiresAt?: number; cacheable: boolean; contentType?: string }
  | { kind: "local-file"; filePath: string; cacheable: false }
  | { kind: "sdk-required"; provider: string; note: string };

export type SourceCapabilities = {
  auth: "none" | "qr" | "oauth" | "credentials";
  playback: "direct-url" | "local-file" | "sdk";
  search: boolean;
  lyrics: boolean;
  playlists: boolean;
  favorites: { localOnly: boolean; writeBack: boolean };
  /** 决定是否允许把音频写进本地缓存 */
  cachePolicy: "transient" | "none";
  mediaKinds: MediaKind[];
};

export type MusicSourceAdapter = {
  id: MusicSourceId;
  capabilities: SourceCapabilities;
  searchTracks?(q: { keyword: string; limit?: number; offset?: number }): Promise<{ tracks: Track[]; total: number }>;
  resolvePlayback(ref: TrackRef, opts?: { quality?: string }): Promise<PlaybackTarget>;
  getLyric?(ref: TrackRef): Promise<{ lrc?: string; translated?: string; synced: boolean } | null>;
  // 可选能力由 capabilities 声明后实现：登录/登出、歌单读写、收藏回写
};

export type MusicErrorCode =
  | "unknown-source"
  | "not-authenticated"
  | "session-expired"
  | "rate-limited"
  | "captcha-required"
  | "no-source"
  | "permission-denied"
  | "network"
  | "bad-response"
  | "unsupported";

export type MusicError = Error & { code: MusicErrorCode; message: string; cause?: unknown };

export class MusicErrorImpl extends Error {
  readonly code: MusicErrorCode;
  override readonly cause?: unknown;

  constructor(code: MusicErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "MusicError";
    this.code = code;
    this.cause = cause;
  }
}

export function createMusicError(code: MusicErrorCode, message: string, cause?: unknown): MusicError {
  return new MusicErrorImpl(code, message, cause);
}

export function isMusicError(error: unknown): error is MusicError {
  return (
    error instanceof Error &&
    typeof (error as MusicError).code === "string"
  );
}
