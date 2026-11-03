import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LuCircleAlert,
  LuDisc,
  LuLogOut,
  LuMusic,
  LuPause,
  LuPlay,
  LuRefreshCw,
  LuSearch,
  LuVolume2,
  LuVolumeX,
  LuX,
} from "react-icons/lu";
import { Tooltip } from "render/web/ui/Tooltip";
import { getIsDesktopApp } from "app/utils/env";
import { desktopMusicClient } from "app/utils/desktopMusicClient";
import {
  musicActions,
  useMusicStore,
} from "app/music/musicStore";
import { usePlaybackHistory } from "app/music/musicHistoryStore";

export function formatMusicTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function getSongTitle(song: any): string {
  if (!song) return "";
  return song.name || song.title || "未知曲目";
}

export function getSongArtist(song: any): string {
  if (!song) return "";
  if (Array.isArray(song.artists) && song.artists.length > 0) {
    return song.artists.map((a: any) => a.name || a).join(" / ");
  }
  if (Array.isArray(song.ar) && song.ar.length > 0) {
    return song.ar.map((a: any) => a.name || a).join(" / ");
  }
  return song.artist || song.singer || "未知歌手";
}

export function getSongCover(song: any): string | undefined {
  if (!song) return undefined;
  return (
    song.album?.picUrl ||
    song.al?.picUrl ||
    song.picUrl ||
    song.coverUrl ||
    song.cover ||
    undefined
  );
}

const PLAYBACK_ERROR_TEXT: Record<string, string> = {
  "vip-required": "这首歌需要会员才能播放",
  "region-blocked": "该地区不可播放",
  "no-source": "暂无音源",
  "not-authenticated": "登录已失效，请重新连接",
  "rate-limited": "操作太频繁，请稍后再试",
};

export function formatPlaybackError(errorMessage?: string): string {
  const key = errorMessage?.trim();
  if (!key) return "暂时无法播放";
  return PLAYBACK_ERROR_TEXT[key] ?? "暂时无法播放";
}

export type MusicWidgetProps = {
  onClose?: () => void;
};

export const MusicWidget: React.FC<MusicWidgetProps> = ({ onClose }) => {
  const {
    connected,
    nickname,
    currentSong,
    playbackStatus,
    currentTime,
    duration,
    volume,
    errorMessage,
  } = useMusicStore();

  // 二维码登录状态
  const [loginState, setLoginState] = useState<
    "idle" | "loading" | "qrcode" | "polling" | "success" | "expired" | "error"
  >("idle");
  const [loginQrUrl, setLoginQrUrl] = useState<string>("");
  const [loginKey, setLoginKey] = useState<string>("");
  const [loginErrorMsg, setLoginErrorMsg] = useState<string>("");
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 搜歌状态
  const [keyword, setKeyword] = useState<string>("");
  const [searching, setSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  /** 搜索失败的人话原因：优先于「未找到匹配歌曲」呈现，避免把"登录失效"说成"没搜到" */
  const [searchError, setSearchError] = useState<string | undefined>(undefined);

  // 播放历史
  const historyList = usePlaybackHistory();

  // 清除轮询
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // 开始扫码流程
  const handleStartLogin = useCallback(async () => {
    stopPolling();
    setLoginState("loading");
    setLoginErrorMsg("");
    try {
      const res = await desktopMusicClient.startLogin();
      if (!res.ok || !res.key || !res.qrUrl) {
        setLoginState("error");
        setLoginErrorMsg(res.error || "获取二维码失败");
        return;
      }
      setLoginKey(res.key);
      setLoginQrUrl(res.qrUrl);
      setLoginState("qrcode");

      // 启动轮询检查登录状态
      pollTimerRef.current = setInterval(async () => {
        try {
          const statusRes = await desktopMusicClient.checkLoginStatus(res.key);
          if (
            statusRes.ok &&
            (statusRes.state === "confirmed" ||
              statusRes.state === "authorized" ||
              statusRes.nickname)
          ) {
            stopPolling();
            setLoginState("success");
            await musicActions.refreshStatus();
          } else if (statusRes.state === "expired") {
            stopPolling();
            setLoginState("expired");
          }
        } catch {
          // 轮询异常静默重试
        }
      }, 2000);
    } catch (err) {
      setLoginState("error");
      setLoginErrorMsg(err instanceof Error ? err.message : "获取二维码失败");
    }
  }, [stopPolling]);

  // 断开账号连接
  const handleLogout = useCallback(async () => {
    try {
      await desktopMusicClient.logout();
    } catch {
      // 忽略请求报错
    } finally {
      musicActions.reset();
      await musicActions.refreshStatus();
    }
  }, []);

  // 搜歌
  const handleSearch = useCallback(async () => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setSearching(true);
    setHasSearched(true);
    setSearchError(undefined);
    try {
      const res = await desktopMusicClient.searchSongs(trimmed, 10);
      if (res.ok && Array.isArray(res.songs)) {
        setSearchResults(res.songs);
      } else {
        setSearchResults([]);
        // 失败原因必须如实呈现（例如登录失效），不能退化成「未找到匹配歌曲」
        setSearchError(res.message || formatPlaybackError(res.reason));
      }
    } catch (err) {
      setSearchResults([]);
      setSearchError(err instanceof Error ? err.message : "搜索失败，请稍后再试");
    } finally {
      setSearching(false);
    }
  }, [keyword]);

  // 播放/暂停切换
  const handleTogglePlay = useCallback(() => {
    if (playbackStatus === "playing") {
      musicActions.pause();
    } else if (playbackStatus === "paused") {
      musicActions.resume();
    } else if (currentSong) {
      void musicActions.playSong(currentSong);
    }
  }, [playbackStatus, currentSong]);

  const currentTitle = getSongTitle(currentSong);
  const currentArtist = getSongArtist(currentSong);
  const currentCover = getSongCover(currentSong);

  return (
    <div className="music-widget-panel" data-testid="music-widget">
      {/* 头部 */}
      <div className="music-widget-header">
        <div className="music-widget-header__title-row">
          <LuMusic className="music-widget-header__icon" size={18} />
          <span className="music-widget-header__title">网易云音乐</span>
          {connected && (
            <span className="music-widget-header__user" title={nickname || "已连接"}>
              {nickname || "已连接"}
            </span>
          )}
        </div>
        <div className="music-widget-header__actions">
          {connected && (
            <button
              type="button"
              className="music-widget-btn-text"
              onClick={handleLogout}
              title="断开账号"
              aria-label="断开账号"
            >
              <LuLogOut size={14} />
              <span>断开</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className="music-widget-btn-close"
              onClick={onClose}
              aria-label="关闭"
            >
              <LuX size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 主体内容 */}
      <div className="music-widget-body">
        {!connected ? (
          /* 未连接引导 */
          <div className="music-widget-login" data-testid="music-login-guide">
            <div className="music-widget-login__intro">
              <LuDisc className="music-widget-login__icon spin-slow" size={40} />
              <p className="music-widget-login__desc">扫码连接网易云音乐，畅享桌面点播与同步播放</p>
            </div>

            {loginState === "idle" && (
              <button
                type="button"
                className="music-widget-primary-btn"
                onClick={handleStartLogin}
                data-testid="get-qr-btn"
              >
                点击获取二维码
              </button>
            )}

            {loginState === "loading" && (
              <div className="music-widget-status-msg">
                <LuRefreshCw className="spin" size={16} />
                <span>正在生成登录二维码…</span>
              </div>
            )}

            {(loginState === "qrcode" || loginState === "polling") && loginQrUrl && (
              <div className="music-widget-qr-box" data-testid="music-qr-container">
                <div className="music-widget-qr-wrapper">
                  <img
                    src={
                      loginQrUrl.startsWith("data:") ||
                      loginQrUrl.endsWith(".png") ||
                      loginQrUrl.endsWith(".jpg")
                        ? loginQrUrl
                        : `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(loginQrUrl)}`
                    }
                    alt="网易云扫码登录"
                    className="music-widget-qr-image"
                  />
                </div>
                <p className="music-widget-qr-hint">请使用网易云音乐 APP 扫码登录</p>
                <a
                  href={loginQrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="music-widget-qr-link"
                >
                  若无法扫码，点击在浏览器中打开二维码
                </a>
              </div>
            )}

            {loginState === "expired" && (
              <div className="music-widget-expired-box">
                <p className="music-widget-warning-text">二维码已失效，请重新获取</p>
                <button
                  type="button"
                  className="music-widget-primary-btn"
                  onClick={handleStartLogin}
                >
                  重新获取二维码
                </button>
              </div>
            )}

            {loginState === "error" && (
              <div className="music-widget-error-box">
                <LuCircleAlert size={16} className="music-widget-error-icon" />
                <span className="music-widget-error-text">
                  {loginErrorMsg || "获取二维码失败"}
                </span>
                <button
                  type="button"
                  className="music-widget-secondary-btn"
                  onClick={handleStartLogin}
                >
                  重试
                </button>
              </div>
            )}

            {loginState === "success" && (
              <div className="music-widget-success-box">
                <span className="music-widget-success-text">已连接成功！</span>
              </div>
            )}
          </div>
        ) : (
          /* 已连接状态 */
          <div className="music-widget-connected" data-testid="music-player-panel">
            {/* 当前播放曲目卡片 */}
            <div className="music-widget-current-card">
              {currentSong ? (
                <>
                  <div className="music-widget-song-info">
                    <div className="music-widget-cover">
                      {currentCover ? (
                        <img
                          src={currentCover}
                          alt={currentTitle}
                          className="music-widget-cover-img"
                        />
                      ) : (
                        <div className="music-widget-cover-placeholder">
                          <LuMusic size={22} />
                        </div>
                      )}
                    </div>
                    <div className="music-widget-meta">
                      <div className="music-widget-song-title" title={currentTitle}>
                        {currentTitle}
                      </div>
                      <div className="music-widget-song-artist" title={currentArtist}>
                        {currentArtist}
                      </div>
                    </div>
                  </div>

                  {/* 异常状态提示 */}
                  {playbackStatus === "error" && (
                    <div className="music-widget-error-banner" data-testid="playback-error">
                      <LuCircleAlert size={14} />
                      <span>{formatPlaybackError(errorMessage)}</span>
                    </div>
                  )}

                  {/* 进度条与时间 */}
                  <div className="music-widget-progress-row">
                    <span className="music-widget-time-text">
                      {formatMusicTime(currentTime)}
                    </span>
                    <input
                      type="range"
                      className="music-widget-progress-slider"
                      min={0}
                      max={duration > 0 ? duration : 100}
                      step={0.5}
                      value={currentTime}
                      onChange={(e) => musicActions.seek(Number(e.target.value))}
                      aria-label="进度调节"
                    />
                    <span className="music-widget-time-text">
                      {formatMusicTime(duration)}
                    </span>
                  </div>

                  {/* 播控组 */}
                  <div className="music-widget-controls-row">
                    <button
                      type="button"
                      className="music-widget-play-toggle-btn"
                      onClick={handleTogglePlay}
                      aria-label={playbackStatus === "playing" ? "暂停" : "播放"}
                      data-testid="music-play-pause-btn"
                    >
                      {playbackStatus === "playing" ? (
                        <LuPause size={20} />
                      ) : (
                        <LuPlay size={20} style={{ marginLeft: "2px" }} />
                      )}
                    </button>

                    {/* 音量调节 */}
                    <div className="music-widget-volume-row">
                      {volume <= 0 ? (
                        <LuVolumeX size={16} className="music-widget-volume-icon" />
                      ) : (
                        <LuVolume2 size={16} className="music-widget-volume-icon" />
                      )}
                      <input
                        type="range"
                        className="music-widget-volume-slider"
                        min={0}
                        max={1}
                        step={0.02}
                        value={volume}
                        onChange={(e) => musicActions.setVolume(Number(e.target.value))}
                        aria-label="音量调节"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="music-widget-no-song" data-testid="music-no-song">
                  <LuDisc size={28} className="music-widget-no-song-icon" />
                  <p>暂无播放曲目，在下方快速搜索点播</p>
                </div>
              )}
            </div>

            {/* 快速搜索与点播 */}
            <div className="music-widget-search-section">
              <div className="music-widget-search-input-wrap">
                <input
                  type="text"
                  className="music-widget-search-input"
                  placeholder="搜索歌曲 / 歌手…"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSearch();
                  }}
                  data-testid="music-search-input"
                />
                <button
                  type="button"
                  className="music-widget-search-btn"
                  onClick={() => void handleSearch()}
                  disabled={searching}
                  aria-label="搜索"
                  data-testid="music-search-submit"
                >
                  {searching ? (
                    <LuRefreshCw className="spin" size={14} />
                  ) : (
                    <LuSearch size={14} />
                  )}
                </button>
              </div>

              {/* 搜索结果列表 */}
              {searchResults.length > 0 && (
                <div className="music-widget-search-results" data-testid="music-search-results">
                  {searchResults.slice(0, 10).map((song) => {
                    const title = getSongTitle(song);
                    const artist = getSongArtist(song);
                    const isCur = currentSong?.id === song.id;
                    return (
                      <div
                        key={song.id}
                        className={`music-widget-result-item ${isCur ? "is-current" : ""}`}
                      >
                        <div className="music-widget-result-meta">
                          <span className="music-widget-result-title" title={title}>
                            {title}
                          </span>
                          <span className="music-widget-result-artist" title={artist}>
                            {artist}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="music-widget-result-play-btn"
                          onClick={() => void musicActions.playSong(song)}
                          aria-label={`播放 ${title}`}
                          title={`播放 ${title}`}
                          data-testid={`play-song-${song.id}`}
                        >
                          <LuPlay size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {hasSearched && !searching && searchError && (
                <div className="music-widget-search-empty" data-testid="music-search-error">
                  <span>{searchError}</span>
                </div>
              )}

              {hasSearched && !searching && !searchError && searchResults.length === 0 && (
                <div className="music-widget-search-empty">
                  <span>未找到匹配歌曲</span>
                </div>
              )}

              {/* 最近播放 */}
              {historyList.length > 0 && (
                <div className="music-widget-history-section" data-testid="music-history-section">
                  <div className="music-widget-history-header">
                    <span className="music-widget-history-title">最近播放</span>
                  </div>
                  <div className="music-widget-history-list" data-testid="music-history-list">
                    {historyList.slice(0, 10).map((song) => {
                      const title = getSongTitle(song);
                      const artist = getSongArtist(song);
                      const isCur = currentSong?.id === song.id;
                      return (
                        <div
                          key={song.id}
                          className={`music-widget-result-item ${isCur ? "is-current" : ""}`}
                          onClick={() => void musicActions.playSong(song)}
                          data-testid={`music-history-item-${song.id}`}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="music-widget-result-meta">
                            <span className="music-widget-result-title" title={title}>
                              {title}
                            </span>
                            <span className="music-widget-result-artist" title={artist}>
                              {artist}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="music-widget-result-play-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              void musicActions.playSong(song);
                            }}
                            aria-label={`播放 ${title}`}
                            title={`播放 ${title}`}
                          >
                            <LuPlay size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .music-widget-panel {
          display: flex;
          flex-direction: column;
          width: 330px;
          max-width: 95vw;
          max-height: 520px;
          background: var(--surface-raised, #ffffff);
          color: var(--text, #0f172a);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          font-family: inherit;
          z-index: 1000;
        }
        .music-widget-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: var(--surface, #f8fafc);
          border-bottom: 1px solid var(--border, #e2e8f0);
        }
        .music-widget-header__title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          overflow: hidden;
        }
        .music-widget-header__icon {
          color: #ef4444;
          flex-shrink: 0;
        }
        .music-widget-header__title {
          white-space: nowrap;
        }
        .music-widget-header__user {
          font-size: 11px;
          font-weight: normal;
          color: var(--muted, #64748b);
          padding: 2px 6px;
          background: rgba(0, 0, 0, 0.04);
          border-radius: 4px;
          max-width: 110px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .music-widget-header__actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .music-widget-btn-text {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: none;
          background: transparent;
          color: var(--muted, #64748b);
          font-size: 12px;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 4px;
          transition: all 0.15s;
        }
        .music-widget-btn-text:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.08);
        }
        .music-widget-btn-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: var(--muted, #64748b);
          cursor: pointer;
          border-radius: 4px;
        }
        .music-widget-btn-close:hover {
          color: var(--text, #0f172a);
          background: rgba(0, 0, 0, 0.06);
        }
        .music-widget-body {
          padding: 12px;
          overflow-y: auto;
          max-height: 460px;
        }
        .music-widget-login {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 12px 6px;
          gap: 12px;
        }
        .music-widget-login__intro {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .music-widget-login__icon {
          color: #ef4444;
        }
        .music-widget-login__desc {
          font-size: 12px;
          color: var(--muted, #64748b);
          margin: 0;
          line-height: 1.5;
        }
        .music-widget-primary-btn {
          border: none;
          background: #ef4444;
          color: #ffffff;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .music-widget-primary-btn:hover {
          background: #dc2626;
        }
        .music-widget-secondary-btn {
          border: 1px solid var(--border, #e2e8f0);
          background: var(--surface, #f8fafc);
          color: var(--text, #0f172a);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }
        .music-widget-secondary-btn:hover {
          background: rgba(0, 0, 0, 0.04);
        }
        .music-widget-status-msg {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--muted, #64748b);
        }
        .music-widget-qr-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .music-widget-qr-wrapper {
          padding: 8px;
          background: #ffffff;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
        }
        .music-widget-qr-image {
          width: 160px;
          height: 160px;
          display: block;
        }
        .music-widget-qr-hint {
          font-size: 12px;
          color: var(--muted, #64748b);
          margin: 0;
        }
        .music-widget-qr-link {
          font-size: 11px;
          color: var(--primary, #3b82f6);
          text-decoration: none;
        }
        .music-widget-qr-link:hover {
          text-decoration: underline;
        }
        .music-widget-expired-box,
        .music-widget-error-box,
        .music-widget-success-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }
        .music-widget-warning-text {
          color: #f59e0b;
          margin: 0;
        }
        .music-widget-error-box {
          color: #ef4444;
        }
        .music-widget-success-text {
          color: #10b981;
          font-weight: 500;
        }
        .music-widget-current-card {
          background: var(--surface, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .music-widget-song-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .music-widget-cover {
          width: 44px;
          height: 44px;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
          background: rgba(0, 0, 0, 0.05);
        }
        .music-widget-cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .music-widget-cover-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--muted, #64748b);
        }
        .music-widget-meta {
          flex: 1;
          min-width: 0;
        }
        .music-widget-song-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text, #0f172a);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .music-widget-song-artist {
          font-size: 11px;
          color: var(--muted, #64748b);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-top: 2px;
        }
        .music-widget-error-banner {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .music-widget-progress-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .music-widget-time-text {
          font-size: 10px;
          color: var(--muted, #64748b);
          font-variant-numeric: tabular-nums;
          width: 32px;
          text-align: center;
        }
        .music-widget-progress-slider {
          flex: 1;
          height: 4px;
          accent-color: #ef4444;
          cursor: pointer;
        }
        .music-widget-controls-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 4px;
        }
        .music-widget-play-toggle-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: #ef4444;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        .music-widget-play-toggle-btn:hover {
          background: #dc2626;
          transform: scale(1.05);
        }
        .music-widget-volume-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .music-widget-volume-icon {
          color: var(--muted, #64748b);
        }
        .music-widget-volume-slider {
          width: 70px;
          height: 4px;
          accent-color: var(--text, #0f172a);
          cursor: pointer;
        }
        .music-widget-no-song {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 14px 6px;
          color: var(--muted, #64748b);
          text-align: center;
          font-size: 12px;
          gap: 6px;
        }
        .music-widget-no-song-icon {
          color: var(--muted, #94a3b8);
        }
        .music-widget-no-song p {
          margin: 0;
        }
        .music-widget-search-section {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .music-widget-search-input-wrap {
          display: flex;
          align-items: center;
          position: relative;
        }
        .music-widget-search-input {
          width: 100%;
          padding: 6px 30px 6px 10px;
          font-size: 12px;
          background: var(--surface, #f8fafc);
          color: var(--text, #0f172a);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 6px;
          outline: none;
        }
        .music-widget-search-input:focus {
          border-color: #ef4444;
        }
        .music-widget-search-btn {
          position: absolute;
          right: 4px;
          border: none;
          background: transparent;
          color: var(--muted, #64748b);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .music-widget-search-btn:hover {
          color: #ef4444;
        }
        .music-widget-search-results {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 180px;
          overflow-y: auto;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 6px;
          padding: 4px;
        }
        .music-widget-history-section {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .music-widget-history-header {
          display: flex;
          align-items: center;
          padding: 0 2px;
        }
        .music-widget-history-title {
          font-size: 11px;
          font-weight: 600;
          color: var(--muted, #64748b);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .music-widget-history-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 180px;
          overflow-y: auto;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 6px;
          padding: 4px;
        }
        .music-widget-result-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 8px;
          border-radius: 4px;
          transition: background 0.15s;
        }
        .music-widget-result-item:hover {
          background: rgba(0, 0, 0, 0.04);
        }
        .music-widget-result-item.is-current {
          background: rgba(239, 68, 68, 0.08);
        }
        .music-widget-result-meta {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .music-widget-result-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--text, #0f172a);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .music-widget-result-artist {
          font-size: 10px;
          color: var(--muted, #64748b);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .music-widget-result-play-btn {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: none;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          margin-left: 8px;
          transition: all 0.15s;
        }
        .music-widget-result-play-btn:hover {
          background: #ef4444;
          color: #ffffff;
        }
        .music-widget-search-empty {
          text-align: center;
          font-size: 11px;
          color: var(--muted, #64748b);
          padding: 8px 0;
        }
        .spin {
          animation: music-spin 1s linear infinite;
        }
        .spin-slow {
          animation: music-spin 6s linear infinite;
        }
        @keyframes music-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export type MusicButtonProps = {
  forceShow?: boolean;
};

export const MusicButton: React.FC<MusicButtonProps> = ({ forceShow }) => {
  const isDesktop = getIsDesktopApp();
  const { currentSong, playbackStatus } = useMusicStore();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 桌面端专属检查
  if (!isDesktop && !forceShow) {
    return null;
  }

  const isPlaying = playbackStatus === "playing";
  const songTitle = getSongTitle(currentSong);
  const tooltipText = isPlaying && songTitle ? `正在播放：${songTitle}` : "网易云音乐";

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="sidebar-music-container" style={{ position: "relative" }}>
      <Tooltip content={tooltipText} placement="top">
        <button
          ref={triggerRef}
          type="button"
          className={`sidebar-music-btn ${isPlaying ? "sidebar-music-btn--playing" : ""} ${isOpen ? "sidebar-music-btn--active" : ""}`}
          onClick={toggleOpen}
          aria-label={tooltipText}
          data-testid="sidebar-music-button"
        >
          <LuMusic
            size={16}
            aria-hidden="true"
            className={`sidebar-music-icon ${isPlaying ? "sidebar-music-icon--wave" : ""}`}
          />
          {isPlaying && <span className="sidebar-music-btn__dot" aria-hidden="true" />}
        </button>
      </Tooltip>

      {isOpen && (
        <div
          ref={containerRef}
          className="sidebar-music-popover"
          style={{
            position: "fixed",
            bottom: "58px",
            left: "16px",
            zIndex: 1000,
          }}
        >
          <MusicWidget onClose={() => setIsOpen(false)} />
        </div>
      )}

      <style>{`
        .sidebar-music-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--muted, #8a8f98);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .sidebar-music-btn:hover,
        .sidebar-music-btn--active {
          background: rgba(15, 23, 42, 0.07);
          color: var(--foreground, #0f172a);
        }
        .sidebar-music-btn--playing {
          color: #ef4444;
        }
        .sidebar-music-icon--wave {
          animation: music-pulse 1.8s ease-in-out infinite;
        }
        .sidebar-music-btn__dot {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ef4444;
          border: 1.5px solid var(--background, #fff);
          box-shadow: 0 0 4px rgba(239, 68, 68, 0.6);
        }
        @keyframes music-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
};

export const SidebarMusicButton = MusicButton;

export default MusicWidget;
