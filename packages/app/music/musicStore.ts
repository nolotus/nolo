import { useSyncExternalStore } from "react";
import { desktopMusicClient } from "app/utils/desktopMusicClient";
import { addPlaybackHistory } from "./musicHistoryStore";

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
  if (!song || song.id == null) {
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
    audio.src = `/api/desktop/music/audio?songId=${encodeURIComponent(song.id)}`;
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
