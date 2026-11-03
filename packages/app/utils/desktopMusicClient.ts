export type DesktopMusicStatusResult = {
  ok: boolean;
  connected: boolean;
  nickname?: string;
  error?: string;
};

export type DesktopMusicStartLoginResult = {
  ok: boolean;
  key: string;
  qrUrl: string;
  error?: string;
};

export type DesktopMusicCheckLoginResult = {
  ok: boolean;
  state: string;
  message?: string;
  nickname?: string;
  error?: string;
};

export type DesktopMusicSearchResult = {
  ok: boolean;
  songs: any[];
  total: number;
  /** 失败原因码（not-authenticated / rate-limited / …），成功时为 undefined */
  reason?: string;
  /** 面向用户的人话说明，成功时为 undefined */
  message?: string;
  error?: string;
};

export type DesktopMusicPlayUrlResult = {
  ok: boolean;
  playable: boolean;
  reason?: string;
  message?: string;
  error?: string;
};

export type DesktopMusicLyricResult = {
  ok: boolean;
  lyric: {
    lrc?: string;
    translated?: string;
    synced: boolean;
  };
  error?: string;
};

export type DesktopMusicLogoutResult = {
  ok: boolean;
  error?: string;
};

export type FetchFn = (input: RequestInfo | URL | string, init?: RequestInit) => Promise<Response>;

export type DesktopMusicClientOptions = {
  fetchImpl?: FetchFn;
};

let defaultFetchImpl: FetchFn = globalThis.fetch;

export function setDesktopMusicClientFetchImpl(fetchImpl?: FetchFn): void {
  defaultFetchImpl = fetchImpl ?? globalThis.fetch;
}

function resolveFetch(options?: DesktopMusicClientOptions): FetchFn {
  return options?.fetchImpl ?? defaultFetchImpl;
}

export const desktopMusicClient = {
  async getStatus(options?: DesktopMusicClientOptions): Promise<DesktopMusicStatusResult> {
    try {
      const fetchImpl = resolveFetch(options);
      const res = await fetchImpl("/api/desktop/music/status", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        return {
          ok: false,
          connected: false,
          error: typeof data?.error === "string" ? data.error : "Failed to get music status",
        };
      }
      return {
        ok: true,
        connected: Boolean(data.connected),
        nickname: typeof data.nickname === "string" ? data.nickname : undefined,
      };
    } catch (err) {
      return {
        ok: false,
        connected: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },

  async startLogin(options?: DesktopMusicClientOptions): Promise<DesktopMusicStartLoginResult> {
    try {
      const fetchImpl = resolveFetch(options);
      const res = await fetchImpl("/api/desktop/music/login", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        return {
          ok: false,
          key: "",
          qrUrl: "",
          error: typeof data?.error === "string" ? data.error : "Failed to start login",
        };
      }
      return {
        ok: true,
        key: typeof data.key === "string" ? data.key : "",
        qrUrl: typeof data.qrUrl === "string" ? data.qrUrl : "",
      };
    } catch (err) {
      return {
        ok: false,
        key: "",
        qrUrl: "",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },

  async checkLoginStatus(
    key: string,
    options?: DesktopMusicClientOptions,
  ): Promise<DesktopMusicCheckLoginResult> {
    try {
      const fetchImpl = resolveFetch(options);
      const res = await fetchImpl(
        `/api/desktop/music/login/status?key=${encodeURIComponent(key)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        return {
          ok: false,
          state: typeof data?.state === "string" ? data.state : "failed",
          message: typeof data?.message === "string" ? data.message : "Failed to check login status",
          error: typeof data?.error === "string" ? data.error : undefined,
        };
      }
      return {
        ok: true,
        state: typeof data.state === "string" ? data.state : "waiting",
        message: typeof data.message === "string" ? data.message : undefined,
        nickname: typeof data.nickname === "string" ? data.nickname : undefined,
      };
    } catch (err) {
      return {
        ok: false,
        state: "failed",
        message: err instanceof Error ? err.message : String(err),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },

  async searchSongs(
    keyword: string,
    limit = 20,
    offset = 0,
    options?: DesktopMusicClientOptions,
  ): Promise<DesktopMusicSearchResult> {
    try {
      const fetchImpl = resolveFetch(options);
      const res = await fetchImpl("/api/desktop/music/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ keyword, limit, offset }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        return {
          ok: false,
          songs: [],
          total: 0,
          reason: typeof data?.reason === "string" ? data.reason : "unknown",
          message: typeof data?.message === "string" ? data.message : undefined,
          error: typeof data?.error === "string" ? data.error : "Failed to search songs",
        };
      }
      return {
        ok: true,
        songs: Array.isArray(data.songs) ? data.songs : [],
        total: typeof data.total === "number" ? data.total : 0,
      };
    } catch (err) {
      return {
        ok: false,
        songs: [],
        total: 0,
        reason: "network",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },

  async getPlayUrl(
    songId: number,
    quality = "standard",
    options?: DesktopMusicClientOptions,
  ): Promise<DesktopMusicPlayUrlResult> {
    try {
      const fetchImpl = resolveFetch(options);
      const res = await fetchImpl("/api/desktop/music/play-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ songId, quality }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        return {
          ok: false,
          playable: false,
          reason: typeof data?.reason === "string" ? data.reason : "unknown",
          message:
            typeof data?.message === "string"
              ? data.message
              : typeof data?.error === "string"
                ? data.error
                : "Failed to get play url",
          error: typeof data?.error === "string" ? data.error : "Failed to get play url",
        };
      }
      return {
        ok: true,
        playable: data.playable === true,
        reason: typeof data.reason === "string" ? data.reason : undefined,
        message: typeof data.message === "string" ? data.message : undefined,
      };
    } catch (err) {
      return {
        ok: false,
        playable: false,
        reason: "unknown",
        message: err instanceof Error ? err.message : String(err),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },

  async getLyric(
    songId: number,
    options?: DesktopMusicClientOptions,
  ): Promise<DesktopMusicLyricResult> {
    try {
      const fetchImpl = resolveFetch(options);
      const res = await fetchImpl(`/api/desktop/music/lyric?songId=${encodeURIComponent(songId)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        return {
          ok: false,
          lyric: {
            synced: false,
          },
          error: typeof data?.error === "string" ? data.error : "Failed to get lyric",
        };
      }
      return {
        ok: true,
        lyric: {
          lrc: typeof data.lyric?.lrc === "string" ? data.lyric.lrc : undefined,
          translated: typeof data.lyric?.translated === "string" ? data.lyric.translated : undefined,
          synced: Boolean(data.lyric?.synced),
        },
      };
    } catch (err) {
      return {
        ok: false,
        lyric: {
          synced: false,
        },
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },

  async logout(options?: DesktopMusicClientOptions): Promise<DesktopMusicLogoutResult> {
    try {
      const fetchImpl = resolveFetch(options);
      const res = await fetchImpl("/api/desktop/music/logout", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        return {
          ok: false,
          error: typeof data?.error === "string" ? data.error : "Failed to logout",
        };
      }
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
