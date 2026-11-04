/**
 * 应用侧音乐源注册入口（多源音乐架构的运行时落点）。
 *
 * 设计纪律（见 packages/integrations/music/musicTypes.ts 头部）
 * ---------------------------------------------------------------
 * - registry 是唯一按源分派的地方；业务层只读 capabilities，不按 source 名分支。
 * - 本模块只做「把内置 adapter 注册进 registry」，幂等，可安全重复调用。
 *
 * 调用点
 * ---------------------------------------------------------------
 * - `packages/app/music/musicStore.ts` 模块初始化（应用启动即注册）。
 * - `packages/chat/web/sidebar/MusicWidget.tsx` 面板首次挂载（幂等，重复调用无副作用）。
 *
 * 为什么 local adapter 允许没有 library
 * ---------------------------------------------------------------
 * 桌面主进程持有真实 LocalLibrary（node:fs 索引）；web 客户端没有本地库，
 * 本地播放走 `/api/desktop/music/file?refId=`。此时 local adapter 只用于
 * 声明能力（`playback: "local-file"`），`resolvePlayback` 会明确报错。
 */

import { registerMusicSource } from "./musicSourceRegistry";
import { createNeteaseMusicAdapter } from "../netease/neteaseMusicAdapter";
import { createLocalMusicAdapter } from "../local-music/localMusicAdapter";
import type { LocalLibrary } from "../local-music/localMusicTypes";

export type RegisterAppMusicSourcesOptions = {
  /**
   * 本地音乐库。桌面主进程可传真实实现；web 客户端不传，
   * local adapter 退化为「只声明能力」。
   */
  localLibrary?: LocalLibrary;
};

let registered = false;

/**
 * 注册内置音乐源（netease + local）。幂等：重复调用直接返回，不抛错。
 */
export function registerAppMusicSources(options: RegisterAppMusicSourcesOptions = {}): void {
  if (registered) return;
  registered = true;
  registerMusicSource(createNeteaseMusicAdapter());
  registerMusicSource(createLocalMusicAdapter(options.localLibrary));
}

/**
 * playSong / UI 首次使用前的惰性兜底：即使模块初始化没跑到，也保证已注册。
 */
export function ensureAppMusicSourcesRegistered(): void {
  registerAppMusicSources();
}

/** 仅测试用：重置幂等标记（调用方需自行重置 registry）。 */
export function __resetAppMusicSourcesForTests(): void {
  registered = false;
}
