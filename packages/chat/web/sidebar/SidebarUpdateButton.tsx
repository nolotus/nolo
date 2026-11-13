import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LuArrowDownToLine,
  LuLoaderCircle,
  LuRefreshCw,
  LuRocket,
} from "react-icons/lu";
import { Tooltip } from "render/web/ui/Tooltip";
import { isDesktopApp } from "app/utils/env";
import { describeDesktopUpdaterText } from "core/desktop/desktopUpdaterMessages";
import type {
  DesktopUpdaterSnapshot,
  DesktopUpdaterOperation,
} from "core/desktop/desktopUpdaterState";

const POLL_INTERVAL_MS = 30_000;
const BUSY_POLL_INTERVAL_MS = 2_000;

const fetchSnapshot = async (): Promise<DesktopUpdaterSnapshot | null> => {
  try {
    const res = await fetch("/api/desktop-updater", {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as DesktopUpdaterSnapshot;
  } catch {
    return null;
  }
};

const postAction = async (action: DesktopUpdaterOperation) => {
  try {
    await fetch("/api/desktop-updater", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
  } catch {
    // best-effort
  }
};

const formatBytes = (v?: number) => {
  if (!v || !Number.isFinite(v)) return "";
  const u = ["B", "KB", "MB", "GB"];
  let s = v, i = 0;
  while (s >= 1024 && i < u.length - 1) { s /= 1024; i += 1; }
  return `${s.toFixed(s >= 10 || i === 0 ? 0 : 1)}${u[i]}`;
};

const phaseLabel = (phase?: string): string => {
  switch (phase) {
    case "checking": return "检查更新中…";
    case "downloading": return "正在下载更新";
    case "ready_to_install": return "更新就绪，点击重启安装";
    case "applying": return "正在安装更新";
    case "update_available": return "有新版本可下载";
    case "up_to_date": return "已是最新版本";
    case "error": return "更新失败";
    default: return "检查更新";
  }
};

/**
 * error 状态本身不带操作类型（检查 / 下载 / 安装都会落到同一个 phase），
 * 直接写「检查失败」会把下载、安装失败误报成检查失败。这里从 statusHistory
 * 里 error 之前最近的一条状态反推当前处于哪个阶段。
 */
const FAILURE_STAGE_BY_STATUS: Record<string, "check" | "download" | "install"> = {
  checking: "check",
  "download-starting": "download",
  "downloading-full-bundle": "download",
  "download-progress": "download",
  "extracting-version": "download",
  "patch-applied": "download",
  "patch-chain-complete": "download",
  decompressing: "download",
  "download-complete": "download",
  applying: "install",
  "launching-new-version": "install",
  complete: "install",
  "quit-handoff-failed": "install",
};

const FAILURE_STAGE_LABEL: Record<"check" | "download" | "install", string> = {
  check: "检查更新失败",
  download: "下载更新失败",
  install: "安装更新失败",
};

const resolveFailureStage = (
  snapshot: DesktopUpdaterSnapshot | null,
): "check" | "download" | "install" | null => {
  const history = snapshot?.statusHistory ?? [];
  const last = history[history.length - 1];
  if (last?.status === "error") {
    for (let i = history.length - 2; i >= 0; i -= 1) {
      const stage = FAILURE_STAGE_BY_STATUS[history[i].status];
      if (stage) return stage;
    }
    // 没有可识别的前置状态时，不猜测失败阶段。
    return snapshot?.updateInfo?.error ? "check" : null;
  }
  // phase=error 但历史最后一条不是 error：updateInfo.error 由检查写入。
  return snapshot?.updateInfo?.error ? "check" : null;
};

export const SidebarUpdateButton: React.FC = () => {
  const [snapshot, setSnapshot] = useState<DesktopUpdaterSnapshot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const refresh = useCallback(async () => {
    const s = await fetchSnapshot();
    setSnapshot(s);
    return s;
  }, []);

  // Poll: fast while busy, slow when idle
  useEffect(() => {
    if (!isDesktopApp) return;
    void refresh();
    const isBusy = Boolean(snapshot?.activeOperation);
    const interval = isBusy ? BUSY_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
    timerRef.current = setInterval(() => void refresh(), interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [refresh, snapshot?.activeOperation]);

  const handleClick = useCallback(async () => {
    const action =
      snapshot?.summary?.primaryAction ?? snapshot?.summary?.retryAction;
    if (!action) { await refresh(); return; }
    setSubmitting(true);
    try {
      await postAction(action);
      // Fast-poll until operation settles
      const deadline = Date.now() + 180_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1000));
        const s = await fetchSnapshot();
        setSnapshot(s);
        if (s?.updateInfo?.updateReady || !s?.activeOperation) break;
      }
    } finally {
      setSubmitting(false);
    }
  }, [snapshot, refresh]);

  if (!isDesktopApp) return null;

  const phase = snapshot?.summary?.phase;
  // 失败态也要露出按钮：否则用户看不到「检查/下载/安装失败」的区分文案。
  const showButton =
    snapshot?.summary?.showToolbarButton === true;
  if (!showButton) return null;

  const isBusy = Boolean(snapshot?.activeOperation) || submitting;
  const primaryAction = snapshot?.summary?.primaryAction ?? snapshot?.summary?.retryAction;
  const progress = snapshot?.latestStatus?.details?.progress;
  const bytesDone = snapshot?.latestStatus?.details?.bytesDownloaded;
  const bytesTotal = snapshot?.latestStatus?.details?.totalBytes;

  const icon = isBusy ? (
    <LuLoaderCircle size={16} className="spin" aria-hidden="true" />
  ) : primaryAction === "apply" ? (
    <LuRocket size={16} aria-hidden="true" />
  ) : primaryAction === "download" ? (
    <LuArrowDownToLine size={16} aria-hidden="true" />
  ) : (
    <LuRefreshCw size={16} aria-hidden="true" />
  );

  const failureStage = phase === "error" ? resolveFailureStage(snapshot) : null;
  const label = phase === "error"
    ? (failureStage ? FAILURE_STAGE_LABEL[failureStage] : "更新失败")
    : phaseLabel(phase);
  const hasUpdate = phase === "update_available" || phase === "downloading" || phase === "ready_to_install";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
    <Tooltip
      content={
        <div style={{ maxWidth: 220 }}>
          <div>{label}</div>
          {phase === "error" && snapshot?.summary?.statusMessage && (
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
              {describeDesktopUpdaterText(snapshot.summary.statusMessage)}
            </div>
          )}
          {typeof progress === "number" && (
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
              {progress}% — {formatBytes(bytesDone)} / {formatBytes(bytesTotal)}
            </div>
          )}
          {phase === "ready_to_install" && (
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
              重启后自动完成安装
            </div>
          )}
        </div>
      }
      placement="top"
    >
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isBusy || !primaryAction}
        aria-label={label}
        className={`sidebar-update-btn${hasUpdate ? " sidebar-update-btn--has-update" : ""}${isBusy ? " sidebar-update-btn--busy" : ""}`}
      >
        {icon}
        {hasUpdate && (
          <span className="sidebar-update-btn__dot" aria-hidden="true" />
        )}
        <style>{`
          .sidebar-update-btn {
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
          .sidebar-update-btn:hover {
            background: rgba(15, 23, 42, 0.07);
            color: var(--foreground, #0f172a);
          }
          .sidebar-update-btn:disabled {
            cursor: default;
            opacity: 0.6;
          }
          .sidebar-update-btn--has-update {
            color: #3b9cff;
          }
          .sidebar-update-btn__dot {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #3b9cff;
            border: 1.5px solid var(--background, #fff);
          }
          .sidebar-update-btn .spin {
            animation: sidebar-update-spin 1s linear infinite;
          }
          @keyframes sidebar-update-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </button>
    </Tooltip>
    {phase === "downloading" && typeof progress === "number" && Number.isFinite(progress) && (
      <span role="status" aria-label={`下载进度 ${progress}%`} style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
        {progress}%
      </span>
    )}
    </span>
  );
};

export default SidebarUpdateButton;
