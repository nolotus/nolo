import { useSyncExternalStore } from "react";
import { desktopMusicClient } from "app/utils/desktopMusicClient";
import { addPlaybackHistory } from "./musicHistoryStore";
import { capabilitiesOf, getMusicSourceLabel } from "integrations/music/musicSourceRegistry";
import type { MusicSourceId, SourceCapabilities } from "integrations/music/musicTypes";
import { ensureAppMusicSourcesRegistered } from "integrations/music/musicSourcesApp";
import {
  buildLocalFilePlaybackUrl,
  buildOnlineAudioPlaybackUrl,
} from "integrations/music/musicPlaybackUrl";

export { ensureAppMusicSourcesRegistered };

// 应用启动即注册内置音乐源（幂等）；playSong 前还会再兜底一次。
ensureAppMusicSourcesRegistered();

export type MusicPlaybackStatus = "idle" | "loading" | "playing" | "paused" | "error";

export type MusicStoreState = {
  connected: boolean;
  nickname?: string;
  currentSong: any | null;
  playbackStatus: MusicPlaybackStatus;
  currentTime: number;
  duration: number;
  volume: number; // 0 ~ 1
  errorMessage?: string;
};

/**
 * 源解析：有 ref.source 就用它，缺省（含没有 ref 的历史数据）用 "netease"。
 * 未注册的源由 capabilitiesOf 抛 MusicError，调用方按「报错而不是崩」处理。
 */
function resolveTrackSource(song: any): MusicSourceId {
  const source = song?.ref?.source;
  return typeof source === "string" && source.length > 0 ? (source as MusicSourceId) : "netease";
}

/**
 * 读取源能力（UI 用）：未注册或非法源返回 undefined，不抛错。
 * UI 只按 capabilities 分支（如 playback === "local-file"），不按源名分支。
 */
export function getMusicSourceCapabilities(source: unknown): SourceCapabilities | undefined {
  if (typeof source !== "string" || source.length === 0) return undefined;
  try {
    return capabilitiesOf(source as MusicSourceId);
  } catch {
    return undefined;
  }
}

/**
 * 读取源展示标签（UI 用）：如「本地」「网易云」；未注册或未声明时返回 undefined。
 */
export function getMusicSourceDisplayName(source: unknown): string | undefined {
  if (typeof source !== "string" || source.length === 0) return undefined;
  return getMusicSourceLabel(source as MusicSourceId);
}

/**
 * 本地曲目的历史记录键。
 *
 * 历史 store 的 `id` 是数字主键（去重与持久化都按它），而本地 `ref.id` 是
 * 32 位十六进制内容指纹（见 localMusicScanner 的 sha256），直接用会被丢掉。
 * 这里把 ref.id 稳定映射成 [0, 2^53) 内的整数：同一曲目永远同键，可去重。
 *
 * 注意：这是**有损**映射，无法从键反推出原始 ref.id。历史项的可重放性不依赖它：
 * `musicHistoryStore` 已持久化 `ref` 字段，重放时按 `ref.source` 走能力分派。
 * （不在本次允许修改的文件范围内）。
 */
const LOCAL_HISTORY_ID_SEED = 2 ** 40;

function localHistoryKey(refId: string): number {
  let hash = LOCAL_HISTORY_ID_SEED;
  for (let i = 0; i < refId.length; i += 1) {
    hash = (hash * 31 + refId.charCodeAt(i)) % 2 ** 53;
  }
  return hash;
}

export { localHistoryKey };

export type AudioElementLike = {
  src: string;
  currentTime: number;
  duration: number;
  volume: number;
  play: () => Promise<void> | void;
  pause: () => void;
  addEventListener: (event: string, listener: (e?: any) => void) => void;
  removeEventListener: (event: string, listener: (e?: any) => void) => void;
};

const createInitialState = (): MusicStoreState => ({
  connected: false,
  nickname: undefined,
  currentSong: null,
  playbackStatus: "idle",
  currentTime: 0,
  duration: 0,
  volume: 1,
  errorMessage: undefined,
});

let state: MusicStoreState = createInitialState();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Subscriber errors must not break state mutations
    }
  }
}

function setState(partial: Partial<MusicStoreState>): void {
  state = { ...state, ...partial };
  notify();
}

let activeAudio: AudioElementLike | null = null;
let currentBoundAudio: AudioElementLike | null = null;

const audioEventHandlers = {
  timeupdate: () => {
    if (!activeAudio) return;
    const time = activeAudio.currentTime || 0;
    const dur =
      typeof activeAudio.duration === "number" && !Number.isNaN(activeAudio.duration)
        ? activeAudio.duration
        : state.duration;
    if (state.currentTime !== time || state.duration !== dur) {
      setState({ currentTime: time, duration: dur });
    }
  },
  loadedmetadata: () => {
    if (!activeAudio) return;
    const dur =
      typeof activeAudio.duration === "number" && !Number.isNaN(activeAudio.duration)
        ? activeAudio.duration
        : 0;
    setState({ duration: dur });
  },
  play: () => {
    if (state.playbackStatus !== "playing") {
      setState({ playbackStatus: "playing", errorMessage: undefined });
    }
  },
  pause: () => {
    if (state.playbackStatus === "playing") {
      setState({ playbackStatus: "paused" });
    }
  },
  ended: () => {
    setState({ playbackStatus: "idle", currentTime: 0 });
  },
  error: () => {
    setState({ playbackStatus: "error", errorMessage: state.errorMessage || "播放出错" });
  },
};

function bindAudioEvents(audio: AudioElementLike): void {
  if (currentBoundAudio === audio) return;
  if (currentBoundAudio) {
    unbindAudioEvents(currentBoundAudio);
  }
  currentBoundAudio = audio;
  audio.addEventListener("timeupdate", audioEventHandlers.timeupdate);
  audio.addEventListener("loadedmetadata", audioEventHandlers.loadedmetadata);
  audio.addEventListener("play", audioEventHandlers.play);
  audio.addEventListener("pause", audioEventHandlers.pause);
  audio.addEventListener("ended", audioEventHandlers.ended);
  audio.addEventListener("error", audioEventHandlers.error);
}

function unbindAudioEvents(audio: AudioElementLike): void {
  audio.removeEventListener("timeupdate", audioEventHandlers.timeupdate);
  audio.removeEventListener("loadedmetadata", audioEventHandlers.loadedmetadata);
  audio.removeEventListener("play", audioEventHandlers.play);
  audio.removeEventListener("pause", audioEventHandlers.pause);
  audio.removeEventListener("ended", audioEventHandlers.ended);
  audio.removeEventListener("error", audioEventHandlers.error);
  if (currentBoundAudio === audio) {
    currentBoundAudio = null;
  }
}

export function getAudioInstance(): AudioElementLike | null {
  if (activeAudio) return activeAudio;
  if (typeof Audio !== "undefined") {
    try {
      activeAudio = new Audio() as unknown as AudioElementLike;
      bindAudioEvents(activeAudio);
      return activeAudio;
    } catch {
      return null;
    }
  }
  return null;
}

export function setAudioElementForTests(audio: AudioElementLike | null): void {
  if (activeAudio && activeAudio !== audio) {
    unbindAudioEvents(activeAudio);
  }
  activeAudio = audio;
  if (audio) {
    bindAudioEvents(audio);
  }
}

export async function playSong(song: any): Promise<void> {
  // 首次使用前兜底注册（模块初始化已注册时这里是 no-op）。
  ensureAppMusicSourcesRegistered();

  if (!song) {
    setState({ playbackStatus: "error", errorMessage: "无效的歌曲信息" });
    return;
  }

  // 能力分派：源缺省用 netease；未注册源报错而不是崩。
  const source = resolveTrackSource(song);
  let caps: SourceCapabilities;
  try {
    caps = capabilitiesOf(source);
  } catch {
    setState({ playbackStatus: "error", errorMessage: `未知的音乐源：${source}` });
    return;
  }

  if (caps.playback === "sdk") {
    setState({ playbackStatus: "error", errorMessage: "该源需要 SDK 播放（本期不支持）" });
    return;
  }

  // 本地曲目以 ref.id 定位（song.id 为空属正常），其余来源沿用 song.id。
  const usesRefId = caps.playback === "local-file";
  if (usesRefId ? song.ref?.id == null : song.id == null) {
    setState({ playbackStatus: "error", errorMessage: "无效的歌曲信息" });
    return;
  }

  setState({
    currentSong: song,
    playbackStatus: "loading",
    errorMessage: undefined,
    currentTime: 0,
    duration: typeof song.durationMs === "number" ? song.durationMs / 1000 : 0,
  });

  if (caps.playback === "local-file") {
    // 本地曲目：没有 play-url 预检接口，直接把音频路由指向 refId，
    // 由 audio 的 error 事件 / play() rejection 驱动状态（与「状态只由事件驱动」一致）。
    // 历史记录补上顶层 id（= 稳定映射键）以便去重；ref 字段会被 musicHistoryStore
    // 一并持久化，因此历史项可直接重放。
    addPlaybackHistory({
      ...song,
      id: localHistoryKey(String(song.ref.id)),
    });

    const localAudio = getAudioInstance();
    if (localAudio) {
      const projectId = typeof song.projectId === "string" ? song.projectId : null;
      if (!projectId) {
        // 本地库按项目隔离：没有项目上下文就**不发请求**，直接如实告知，
        // 而不是拼一个必然 400 的 URL 让用户看到"播放失败"。
        setState({
          playbackStatus: "error",
          errorMessage: "本地音乐需要绑定项目：请先选择一个项目",
        });
        return;
      }
      localAudio.src = buildLocalFilePlaybackUrl(String(song.ref.id), projectId);
      try {
        const maybePromise = localAudio.play();
        if (maybePromise && typeof (maybePromise as Promise<void>).catch === "function") {
          (maybePromise as Promise<void>).catch((err) => {
            setState({
              playbackStatus: "error",
              errorMessage: err instanceof Error ? err.message : String(err),
            });
          });
        }
      } catch (err) {
        setState({
          playbackStatus: "error",
          errorMessage: err instanceof Error ? err.message : String(err),
        });
        return;
      }
    }
    return;
  }

  const res = await desktopMusicClient.getPlayUrl(song.id);

  if (!res?.ok || res.playable !== true) {
    setState({
      playbackStatus: "error",
      errorMessage: res?.message || res?.reason || "无法获取播放地址",
    });
    return;
  }

  addPlaybackHistory(song);

  const audio = getAudioInstance();
  if (audio) {
    audio.src = buildOnlineAudioPlaybackUrl(song.id);
    try {
      const maybePromise = audio.play();
      if (maybePromise && typeof (maybePromise as Promise<void>).catch === "function") {
        (maybePromise as Promise<void>).catch((err) => {
          setState({
            playbackStatus: "error",
            errorMessage: err instanceof Error ? err.message : String(err),
          });
        });
      }
    } catch (err) {
      setState({
        playbackStatus: "error",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return;
    }
  }

}

export function pause(): void {
  const audio = getAudioInstance();
  if (audio) {
    audio.pause();
  }
  if (state.playbackStatus !== "paused") {
    setState({ playbackStatus: "paused" });
  }
}

export function resume(): void {
  const audio = getAudioInstance();
  if (audio) {
    try {
      const maybePromise = audio.play();
      if (maybePromise && typeof (maybePromise as Promise<void>).catch === "function") {
        (maybePromise as Promise<void>).catch((err) => {
          setState({
            playbackStatus: "error",
            errorMessage: err instanceof Error ? err.message : String(err),
          });
        });
      }
    } catch (err) {
      setState({
        playbackStatus: "error",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return;
    }
  }
}

export function seek(time: number): void {
  const safeTime = Math.max(0, time);
  const audio = getAudioInstance();
  if (audio) {
    audio.currentTime = safeTime;
  }
  if (state.currentTime !== safeTime) {
    setState({ currentTime: safeTime });
  }
}

export function setVolume(vol: number): void {
  const clamped = Math.max(0, Math.min(1, vol));
  const audio = getAudioInstance();
  if (audio) {
    audio.volume = clamped;
  }
  if (state.volume !== clamped) {
    setState({ volume: clamped });
  }
}

export function resetMusicStore(): void {
  const audio = activeAudio;
  if (audio) {
    try {
      audio.pause();
    } catch {
      // Ignore audio cleanup errors
    }
  }
  setState({
    currentSong: null,
    playbackStatus: "idle",
    currentTime: 0,
    duration: 0,
    errorMessage: undefined,
  });
}

export async function refreshStatus(): Promise<void> {
  try {
    const res = await desktopMusicClient.getStatus();
    if (res?.ok) {
      setState({
        connected: Boolean(res.connected),
        nickname: res.nickname,
      });
    } else {
      setState({
        connected: false,
        nickname: undefined,
      });
    }
  } catch {
    setState({
      connected: false,
      nickname: undefined,
    });
  }
}

export const musicActions = {
  playSong,
  pause,
  resume,
  seek,
  setVolume,
  reset: resetMusicStore,
  refreshStatus,
};

export function getMusicStoreState(): MusicStoreState {
  return state;
}

export function subscribeMusicStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMusicStore(): MusicStoreState {
  return useSyncExternalStore(subscribeMusicStore, getMusicStoreState, getMusicStoreState);
}

export function resetMusicStoreForTests(): void {
  state = createInitialState();
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.src = "";
    } catch {
      // Ignore audio cleanup errors
    }
  }
  notify();
}
