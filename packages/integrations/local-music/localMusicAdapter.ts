/**
 * 本地音乐库的 adapter（多源音乐架构 adapter #2）。
 *
 * 职责边界
 * ---------------------------------------------------------------
 * - 只做「索引查询 → 本架构 Track / PlaybackTarget」的翻译，不碰文件系统。
 * - **不做文件存在性检查**：那是 handler 的职责，避免每次播放都打盘。
 * - **不实现歌词**：`capabilities.lyrics = false`，因此不导出 `getLyric`。
 * - **不写缓存**：`capabilities.cachePolicy = "none"`，PlaybackTarget.cacheable 恒为 false。
 *
 * library 可选
 * ---------------------------------------------------------------
 * 桌面主进程持有真实 LocalLibrary；web 客户端没有本地库，此时 adapter 退化为
 * 「只声明能力」（`playback: "local-file"`），`searchTracks` / `resolvePlayback`
 * 会明确报错，播放走 `/api/desktop/music/file?refId=`。
 */

import type {
  MusicSourceAdapter,
  PlaybackTarget,
  Track,
  TrackRef,
} from "../music/musicTypes";
import { createMusicError } from "../music/musicTypes";
import type { LocalLibrary } from "./localMusicTypes";

export function createLocalMusicAdapter(library?: LocalLibrary): MusicSourceAdapter {
  return {
    id: "local",
    label: "本地",

    capabilities: {
      auth: "none",
      playback: "local-file",
      search: true,
      lyrics: false,
      playlists: false,
      favorites: { localOnly: true, writeBack: false },
      cachePolicy: "none",
      mediaKinds: ["track"],
    },

    async searchTracks(q: {
      keyword: string;
      limit?: number;
      offset?: number;
    }): Promise<{ tracks: Track[]; total: number }> {
      if (!library) {
        throw createMusicError(
          "unsupported",
          "当前环境没有本地音乐库（本地搜索走桌面端 HTTP 路由）",
        );
      }
      // library.search 返回的已是 Track[]（ref 保持原样），直接透传。
      return library.search(q);
    },

    async resolvePlayback(ref: TrackRef): Promise<PlaybackTarget> {
      if (ref.source !== "local") {
        throw createMusicError("no-source", `不支持的音乐源：${ref.source}`);
      }
      if (!library) {
        throw createMusicError(
          "unsupported",
          "当前环境没有本地音乐库（本地播放走桌面端 HTTP 路由）",
        );
      }

      const record = await library.findByRef(ref);
      if (record === null) {
        throw createMusicError(
          "no-source",
          "这首本地歌曲已不在音乐库里（文件可能被移动或删除）",
        );
      }

      return {
        kind: "local-file",
        filePath: record.filePath,
        cacheable: false,
      };
    },
  };
}
