import { createNeteaseHttp, NeteaseHttpError, type NeteaseHttp } from "./neteaseHttp";
import type {
  NeteaseAlbum,
  NeteaseArtist,
  NeteaseClient,
  NeteaseClientOptions,
  NeteaseLyric,
  NeteaseNoSourceReason,
  NeteasePlayUrl,
  NeteasePlayUrlQuery,
  NeteaseQrLogin,
  NeteaseQrLoginStatus,
  NeteaseSearchResult,
  NeteaseSearchQuery,
  NeteaseSession,
  NeteaseSessionStore,
  NeteaseSong,
} from "./neteaseTypes";

export function createNeteaseClient(
  options?: NeteaseClientOptions,
  deps?: {
    http?: NeteaseHttp;
    sessionStore?: NeteaseSessionStore;
  },
): NeteaseClient {
  const now = options?.now ?? (() => Date.now());
  const sessionStore = deps?.sessionStore;

  const httpOptions: NeteaseClientOptions & { session?: NeteaseSession | null } = {
    ...options,
    session: options?.session ?? null,
  };

  const http: NeteaseHttp = deps?.http ?? createNeteaseHttp(httpOptions);

  let currentSession: NeteaseSession | null = options?.session ?? null;
  let hasLoadedFromStore = false;

  async function syncSessionFromStoreIfNeeded(): Promise<void> {
    if (!hasLoadedFromStore && sessionStore) {
      hasLoadedFromStore = true;
      const stored = await sessionStore.read();
      if (stored) {
        currentSession = stored;
        httpOptions.session = stored;
      }
    }
  }

  return {
    async createQrLogin(): Promise<NeteaseQrLogin> {
      const resp = await http.weapi<{ unikey?: string; code?: number }>(
        "/login/qrcode/unikey",
        { type: 1 },
      );

      const unikey = resp?.unikey;
      if (!unikey) {
        throw new NeteaseHttpError("bad-response", "获取二维码 key 失败");
      }

      const qrUrl = `https://music.163.com/login?codekey=${unikey}`;
      const currentTime = now();
      return {
        key: unikey,
        qrUrl,
        createdAt: currentTime,
        expiresAt: currentTime + 300_000,
      };
    },

    async pollQrLogin(key: string): Promise<NeteaseQrLoginStatus> {
      let resp: {
        code?: number;
        message?: string;
        msg?: string;
        cookie?: string;
        nickname?: string;
        avatarUrl?: string;
        uid?: number;
        userId?: number;
      };

      try {
        resp = await http.weapi("/login/qrcode/client/login", { key, type: 1 });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "cause" in err &&
          err.cause &&
          typeof (err.cause as Record<string, unknown>).code === "number"
        ) {
          resp = err.cause as typeof resp;
        } else {
          throw err;
        }
      }

      const code = resp?.code;
      if (code === 800) {
        return { state: "expired", message: "二维码已过期" };
      }
      if (code === 801) {
        return { state: "waiting", message: "等待扫码" };
      }
      if (code === 802) {
        return { state: "scanned", message: "已扫码，请在手机上确认" };
      }
      if (code === 803) {
        const session: NeteaseSession = {
          cookie: typeof resp.cookie === "string" ? resp.cookie : "",
          obtainedAt: now(),
        };
        if (typeof resp.nickname === "string") {
          session.nickname = resp.nickname;
        }
        if (typeof resp.avatarUrl === "string") {
          session.avatarUrl = resp.avatarUrl;
        }
        if (typeof resp.uid === "number") {
          session.uid = resp.uid;
        } else if (typeof resp.userId === "number") {
          session.uid = resp.userId;
        }

        if (sessionStore) {
          await sessionStore.write(session);
        }
        currentSession = session;
        httpOptions.session = session;
        hasLoadedFromStore = true;

        return {
          state: "confirmed",
          session,
        };
      }

      const message =
        typeof resp?.message === "string"
          ? resp.message
          : typeof resp?.msg === "string"
            ? resp.msg
            : "未知错误";
      return {
        state: "failed",
        message,
      };
    },

    async getSession(): Promise<NeteaseSession | null> {
      if (sessionStore) {
        const stored = await sessionStore.read();
        currentSession = stored;
        httpOptions.session = stored;
        hasLoadedFromStore = true;
        return stored;
      }
      return currentSession;
    },

    async searchSongs(query: NeteaseSearchQuery): Promise<NeteaseSearchResult> {
      await syncSessionFromStoreIfNeeded();

      const resp = await http.weapi<{
        result?: {
          songs?: any[];
          songCount?: number;
        };
      }>("/search/get", {
        s: query.keyword,
        type: 1,
        limit: query.limit ?? 20,
        offset: query.offset ?? 0,
      });

      const rawSongs = resp?.result?.songs;
      const songs: NeteaseSong[] = Array.isArray(rawSongs)
        ? rawSongs.map((s: any) => {
            const rawArtists = s.artists || s.ar || [];
            const artists: NeteaseArtist[] = Array.isArray(rawArtists)
              ? rawArtists.map((a: any) => ({
                  id: Number(a.id ?? 0),
                  name: String(a.name ?? ""),
                }))
              : [];

            const rawAlbum = s.album || s.al || {};
            const coverUrl =
              typeof rawAlbum.picUrl === "string"
                ? rawAlbum.picUrl
                : typeof rawAlbum.coverUrl === "string"
                  ? rawAlbum.coverUrl
                  : undefined;

            const album: NeteaseAlbum = {
              id: Number(rawAlbum.id ?? 0),
              name: String(rawAlbum.name ?? ""),
              ...(coverUrl ? { coverUrl } : {}),
            };

            const durationMs = Number(s.dt ?? s.duration ?? 0);
            const song: NeteaseSong = {
              id: Number(s.id),
              name: String(s.name ?? ""),
              artists,
              album,
              durationMs,
              ...(s.mvid || s.mv ? { hasMv: Boolean(s.mvid || s.mv) } : {}),
            };
            return song;
          })
        : [];

      const total = resp?.result?.songCount ?? songs.length;
      return {
        songs,
        total,
        offset: query.offset ?? 0,
        limit: query.limit ?? 20,
      };
    },

    async getPlayUrl(query: NeteasePlayUrlQuery): Promise<NeteasePlayUrl> {
      await syncSessionFromStoreIfNeeded();

      const resp = await http.eapi<{ data?: any[] }>(
        "/song/enhance/player/url/v1",
        {
          ids: JSON.stringify([query.songId]),
          level: query.quality ?? "standard",
          encodeType: "mp3",
        },
      );

      const item = resp?.data?.[0];
      const hasValidUrl =
        typeof item?.url === "string" && item.url.trim().length > 0;

      if (hasValidUrl) {
        return {
          songId: query.songId,
          url: item.url,
          bitrateKbps: item.br ? Math.round(Number(item.br) / 1000) : undefined,
          sizeBytes: typeof item.size === "number" ? item.size : undefined,
          quality:
            typeof item.level === "string"
              ? item.level
              : (query.quality ?? "standard"),
        };
      }

      let reason: NeteaseNoSourceReason = "unknown";
      if (item) {
        if (item.fee === 1 || item.fee === 4) {
          reason = "vip-required";
        } else if (item.code === 404) {
          reason = "no-source";
        } else if (item.code === 403 || item.code === -100) {
          reason = "region-blocked";
        } else if (item.code === 402 || item.fee === 8) {
          reason = "not-purchased";
        }
      } else {
        reason = "no-source";
      }

      return {
        songId: query.songId,
        url: null,
        reason,
        message: "该歌曲暂无音源或无播放权限",
      };
    },

    async getLyric(songId: number): Promise<NeteaseLyric> {
      await syncSessionFromStoreIfNeeded();

      const resp = await http.plainGet<{
        lrc?: { lyric?: string };
        tlyric?: { lyric?: string };
      }>(`/song/lyric?id=${songId}&lv=1&kv=1&tv=-1`);

      const lrcText = resp?.lrc?.lyric;
      const tlyricText = resp?.tlyric?.lyric;
      const isSynced = typeof lrcText === "string" && /\[\d+:\d+/.test(lrcText);

      return {
        songId,
        lrc: lrcText || undefined,
        translated: tlyricText || undefined,
        synced: isSynced,
      };
    },

    async logout(): Promise<void> {
      if (sessionStore) {
        await sessionStore.clear();
      }
      currentSession = null;
      httpOptions.session = null;
      hasLoadedFromStore = true;
    },
  };
}
