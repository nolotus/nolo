import { useSyncExternalStore } from "react";

export type HistorySong = {
  id: number;
  name: string;
  artists: { id: number; name: string }[];
  album: { id: number; name: string; coverUrl?: string };
  durationMs?: number;
  playedAt: number;
  /**
   * 来源身份：历史项要能重放，就必须带上 TrackRef。
   * 本地曲目没有数字 id，靠 `ref.id`（内容指纹）定位文件；网易云曲目也可带上，便于将来多源。
   */
  ref?: { source: string; id: string };
};

const BASE_STORAGE_KEY = "nolo:music:playback-history";
const MAX_HISTORY_LENGTH = 100;

/**
 * 历史按项目隔离：有 projectId 时写入带后缀的 key，避免不同项目的播放记录串味。
 * 无 projectId 时退回旧 key（不带后缀），向后兼容，旧数据仍可读。
 */
let historyProjectScope: string | null = null;

function resolveStorageKey(): string {
  return historyProjectScope ? `${BASE_STORAGE_KEY}:${historyProjectScope}` : BASE_STORAGE_KEY;
}

function safeGetLocalStorage(): Storage | null {
  try {
    if (typeof localStorage !== "undefined" && localStorage !== null) {
      return localStorage;
    }
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Return null if storage is inaccessible
  }
  return null;
}

function loadInitialHistory(): HistorySong[] {
  const storage = safeGetLocalStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(resolveStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_HISTORY_LENGTH);
    }
  } catch {
    // Ignore JSON parse errors
  }
  return [];
}

function persistHistory(items: HistorySong[]): void {
  const storage = safeGetLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(resolveStorageKey(), JSON.stringify(items));
  } catch {
    // Ignore storage write or quota errors
  }
}

let history: HistorySong[] = loadInitialHistory();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Subscriber error isolation
    }
  }
}

export function subscribePlaybackHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPlaybackHistory(): HistorySong[] {
  return history;
}

export function usePlaybackHistory(): HistorySong[] {
  return useSyncExternalStore(subscribePlaybackHistory, getPlaybackHistory, getPlaybackHistory);
}

/**
 * 切换历史作用域（面板 / 音乐组件在项目切换时调用）。
 * 切换后立即重载对应项目的历史并通知订阅者；同作用域重复调用是 no-op。
 */
export function setHistoryProjectScope(projectId: string | null): void {
  const normalized = typeof projectId === "string" && projectId.trim() ? projectId : null;
  if (normalized === historyProjectScope) return;
  historyProjectScope = normalized;
  history = loadInitialHistory();
  notify();
}

export function addPlaybackHistory(song: any): void {
  if (!song || typeof song !== "object") return;

  const id = typeof song.id === "number" ? song.id : Number(song.id);
  if (!Number.isFinite(id)) return;

  const name = typeof song.name === "string" ? song.name : String(song.name ?? "");

  const rawArtists = Array.isArray(song.artists)
    ? song.artists
    : Array.isArray(song.ar)
      ? song.ar
      : [];
  const artists: { id: number; name: string }[] = rawArtists.map((a: any) => ({
    id: typeof a?.id === "number" ? a.id : Number(a?.id) || 0,
    name: typeof a?.name === "string" ? a.name : String(a?.name ?? ""),
  }));

  const rawAlbum =
    song.album && typeof song.album === "object"
      ? song.album
      : song.al && typeof song.al === "object"
        ? song.al
        : {};
  const albumId = typeof rawAlbum.id === "number" ? rawAlbum.id : Number(rawAlbum.id) || 0;
  const albumName = typeof rawAlbum.name === "string" ? rawAlbum.name : String(rawAlbum.name ?? "");
  const coverUrl =
    typeof rawAlbum.coverUrl === "string" && rawAlbum.coverUrl.trim().length > 0
      ? rawAlbum.coverUrl.trim()
      : typeof rawAlbum.picUrl === "string" && rawAlbum.picUrl.trim().length > 0
        ? rawAlbum.picUrl.trim()
        : typeof song.coverUrl === "string" && song.coverUrl.trim().length > 0
          ? song.coverUrl.trim()
          : typeof song.picUrl === "string" && song.picUrl.trim().length > 0
            ? song.picUrl.trim()
            : undefined;

  const album: HistorySong["album"] = {
    id: albumId,
    name: albumName,
    ...(coverUrl ? { coverUrl } : {}),
  };

  let durationMs: number | undefined;
  if (typeof song.durationMs === "number" && Number.isFinite(song.durationMs)) {
    durationMs = song.durationMs;
  } else if (typeof song.dt === "number" && Number.isFinite(song.dt)) {
    durationMs = song.dt;
  } else if (typeof song.duration === "number" && Number.isFinite(song.duration)) {
    durationMs = song.duration < 1000 ? Math.round(song.duration * 1000) : song.duration;
  }

  const playedAt =
    typeof song.playedAt === "number" && Number.isFinite(song.playedAt)
      ? song.playedAt
      : Date.now();

  const historySong: HistorySong = {
    id,
    name,
    artists,
    album,
    ...(durationMs !== undefined ? { durationMs } : {}),
    playedAt,
    // 保留来源身份，否则本地曲目从历史里点开只能走网易云链路并失败
    ...(song?.ref && typeof song.ref.id === "string" && typeof song.ref.source === "string"
      ? { ref: { source: song.ref.source, id: song.ref.id } }
      : {}),
  };

  const filtered = history.filter((item) => item.id !== id);
  history = [historySong, ...filtered].slice(0, MAX_HISTORY_LENGTH);

  persistHistory(history);
  notify();
}

export function clearPlaybackHistory(): void {
  history = [];
  const storage = safeGetLocalStorage();
  if (storage) {
    try {
      storage.removeItem(resolveStorageKey());
    } catch {
      // Ignore
    }
  }
  notify();
}

export function resetPlaybackHistoryForTests(): void {
  historyProjectScope = null;
  clearPlaybackHistory();
}
