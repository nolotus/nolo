/**
 * 网易云音乐 adapter（多源音乐架构 adapter #1）。
 *
 * 职责边界
 * ---------------------------------------------------------------
 * - 声明网易云源能力：`playback: "direct-url"`（客户端走桌面端 HTTP 音频路由）。
 * - `resolvePlayback` 返回桌面端音频路由 `/api/desktop/music/audio?songId=`；
 *   播放前的 play-url 预检由调用方（musicStore）负责，adapter 不重复预检。
 * - 搜索 / 歌词通过可注入的 `NeteaseClient` 实现；未注入时**惰性动态导入**默认客户端。
 *   动态导入是硬要求：`neteaseClient` 依赖 `node:crypto`，静态导入会把它带进 web bundle。
 * - 不做歌单读写 / 收藏回写：`capabilities.playlists = false`、
 *   `favorites.writeBack = false`，与实现保持一致。
 */

import type {
  MusicSourceAdapter,
  PlaybackTarget,
  Track,
  TrackRef,
} from "../music/musicTypes";
import { createMusicError } from "../music/musicTypes";
import type { NeteaseClient, NeteaseSong } from "./neteaseTypes";
import { buildOnlineAudioPlaybackUrl } from "integrations/music/musicPlaybackUrl";

export function createNeteaseMusicAdapter(options?: {
  client?: NeteaseClient;
}): MusicSourceAdapter {
  let client = options?.client;
  const getClient = async (): Promise<NeteaseClient> => {
    if (!client) {
      const mod = await import("./neteaseClient");
      client = mod.createNeteaseClient();
    }
    return client;
  };

  return {
    id: "netease",
    label: "网易云",

    capabilities: {
      auth: "qr",
      playback: "direct-url",
      search: true,
      lyrics: true,
      playlists: false,
      favorites: { localOnly: false, writeBack: false },
      cachePolicy: "transient",
      mediaKinds: ["track"],
    },

    async searchTracks(q: {
      keyword: string;
      limit?: number;
      offset?: number;
    }): Promise<{ tracks: Track[]; total: number }> {
      const result = await (await getClient()).searchSongs({
        keyword: q.keyword,
        limit: q.limit,
        offset: q.offset,
      });
      return { tracks: result.songs.map(songToTrack), total: result.total };
    },

    async getLyric(ref: TrackRef) {
      if (ref.source !== "netease") {
        throw createMusicError("no-source", `不支持的音乐源：${ref.source}`);
      }
      const lyric = await (await getClient()).getLyric(Number(ref.id));
      return {
        lrc: lyric.lrc,
        translated: lyric.translated,
        synced: lyric.synced,
      };
    },

    async resolvePlayback(ref: TrackRef): Promise<PlaybackTarget> {
      if (ref.source !== "netease") {
        throw createMusicError("no-source", `不支持的音乐源：${ref.source}`);
      }
      if (ref.id == null || ref.id === "") {
        throw createMusicError("no-source", "缺少网易云歌曲 ID");
      }
      return {
        kind: "direct-url",
        url: buildOnlineAudioPlaybackUrl(ref.id),
        cacheable: true,
      };
    },
  };
}

function songToTrack(song: NeteaseSong): Track {
  return {
    ref: { source: "netease", id: String(song.id) },
    mediaKind: "track",
    title: song.name,
    artists: song.artists.map((a) => ({ id: String(a.id), name: a.name })),
    album: {
      id: song.album?.id != null ? String(song.album.id) : undefined,
      name: song.album?.name,
      coverUrl: song.album?.coverUrl,
    },
    durationMs: song.durationMs,
  };
}
