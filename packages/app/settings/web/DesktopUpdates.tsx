import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuArrowDownToLine,
  LuCheck,
  LuLoaderCircle,
  LuRefreshCw,
  LuRocket,
} from "react-icons/lu";
import Button from "render/web/ui/Button";
import { isDesktopApp } from "app/utils/env";
import { toErrorMessage } from "core/errorMessage";
import type {
  DesktopUpdaterOperation,
  DesktopUpdaterSnapshot,
  DesktopUpdaterSummaryPhase,
} from "core/desktop/desktopUpdaterState";

const SettingSection: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section className="setting-section">
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      <p className="section-description">{description}</p>
    </div>
    <div className="section-content">{children}</div>
  </section>
);

const formatBytes = (value?: number) => {
  if (!value || !Number.isFinite(value)) return null;
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const BADGE_LABEL_BY_PHASE: Record<DesktopUpdaterSummaryPhase, string> = {
  not_checked: "尚未检查",
  checking: "正在检查",
  update_available: "有新版本",
  downloading: "正在下载",
  ready_to_install: "可以安装",
  applying: "正在安装",
  up_to_date: "已是最新版本",
  ahead_of_channel: "当前版本已领先发布通道",
  invalid_remote: "远端元数据无效",
  error: "检查失败",
};

const PHASE_DESCRIPTION_BY_PHASE: Record<DesktopUpdaterSummaryPhase, string> = {
  not_checked: "还没有获取发布通道的最新信息。",
  checking: "正在检查当前通道是否有更新。",
  update_available: "发现可下载的新版本。",
  downloading: "正在下载新版本，请保持应用运行。",
  ready_to_install: "更新已下载，重启应用即可完成安装。",
  applying: "正在安装更新，应用即将重启。",
  up_to_date: "当前版本已经是发布通道中的最新版本。",
  ahead_of_channel: "当前构建领先于发布通道，暂时没有需要安装的更新。",
  invalid_remote: "发布通道返回的信息无法用于更新。",
  error: "检查更新时发生错误。",
};

const PRIMARY_ACTION_LABELS: Record<Exclude<DesktopUpdaterOperation, "check">, string> = {
  download: "下载更新",
  apply: "重启并安装",
};

const PRIMARY_ACTION_ICONS: Record<Exclude<DesktopUpdaterOperation, "check">, React.ReactNode> = {
  download: <LuArrowDownToLine aria-hidden="true" />,
  apply: <LuRocket aria-hidden="true" />,
};

const shortHash = (hash?: string | null) => hash?.slice(0, 12) || "--";

const DesktopUpdates: React.FC = () => {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<DesktopUpdaterSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = useCallback(async () => {
    if (!isDesktopApp) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/desktop-updater", { method: "GET", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "加载更新状态失败");
      setSnapshot(data);
      setError(null);
    } catch (fetchError) {
      setError(toErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchSnapshot(); }, [fetchSnapshot]);
  useEffect(() => {
    if (!isDesktopApp || !snapshot?.activeOperation) return;
    const timer = window.setInterval(() => void fetchSnapshot(), 1000);
    return () => window.clearInterval(timer);
  }, [fetchSnapshot, snapshot?.activeOperation]);

  const submitAction = useCallback(async (action: DesktopUpdaterOperation) => {
    setSubmittingAction(action);
    try {
      const response = await fetch("/api/desktop-updater", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || `${action} update failed`);
      setSnapshot(data);
      setError(null);
    } catch (submitError) {
      setError(toErrorMessage(submitError));
    } finally {
      setSubmittingAction(null);
      void fetchSnapshot();
    }
  }, [fetchSnapshot]);

  const latestStatus = snapshot?.latestStatus;
  const updateInfo = snapshot?.updateInfo;
  const summary = snapshot?.summary;
  const progress = latestStatus?.details?.progress;
  const isBusy = Boolean(summary?.isBusy);
  const primaryAction = summary?.primaryAction ?? null;
  const phase = summary?.phase ?? "not_checked";
  const statusTone = error ? "error" : summary?.tone ?? "neutral";
  const statusBadgeLabel = error ? "检查失败" : BADGE_LABEL_BY_PHASE[phase];
  const statusDescription = error || summary?.statusMessage || PHASE_DESCRIPTION_BY_PHASE[phase];
  const primaryActionLabel = primaryAction ? PRIMARY_ACTION_LABELS[primaryAction] : null;

  if (!isDesktopApp) {
    return <div className="desktop-updates-page"><h1 className="page-title">客户端更新</h1><div className="desktop-update-card desktop-update-card--empty">此页面仅适用于桌面客户端。</div></div>;
  }

  return (
    <div className="desktop-updates-page">
      <h1 className="page-title">{t("settings.updates.title", "客户端更新")}</h1>
      <SettingSection title="版本状态" description="查看当前构建、发布通道和更新状态。">
        <div className={`desktop-update-card desktop-update-card--${statusTone}`}>
          <div className="desktop-update-card__header">
            <div>
              <div className="desktop-update-card__eyebrow">发布通道</div>
              <div className="desktop-update-card__channel-badge">{snapshot?.localInfo.channel === "canary" ? "Canary" : "Stable"}</div>
              <div className="desktop-update-card__version">{loading ? "加载中…" : snapshot?.localInfo.version || "未知"}</div>
            </div>
            <div className="desktop-update-card__badge">{statusBadgeLabel}</div>
          </div>
          <div className="desktop-update-card__meta">
            <span>当前构建：{shortHash(snapshot?.localInfo.hash)}</span>
            <span>最新构建：{shortHash(updateInfo?.hash)}</span>
            {updateInfo?.version ? <span>最新版本：{updateInfo.version}</span> : null}
          </div>
          <div className="desktop-update-card__status">{statusDescription}</div>
          {typeof progress === "number" ? <div className="desktop-update-progress"><div className="desktop-update-progress__bar"><div className="desktop-update-progress__fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div><div className="desktop-update-progress__meta"><span>{progress}%</span><span>{formatBytes(latestStatus?.details?.bytesDownloaded) || "--"} / {formatBytes(latestStatus?.details?.totalBytes) || "--"}</span></div></div> : null}
        </div>
      </SettingSection>

      <SettingSection title="更新操作" description="按当前状态执行检查、下载或安装。">
        <div className="desktop-update-actions">
          <Button variant="secondary" icon={isBusy && snapshot?.activeOperation === "check" ? <LuLoaderCircle className="desktop-update-spin" aria-hidden="true" /> : <LuRefreshCw aria-hidden="true" />} loading={submittingAction === "check"} disabled={isBusy} onClick={() => void submitAction("check")}>检查更新</Button>
          {primaryAction ? <Button variant="primary" icon={isBusy && snapshot?.activeOperation === primaryAction ? <LuLoaderCircle className="desktop-update-spin" aria-hidden="true" /> : PRIMARY_ACTION_ICONS[primaryAction]} loading={submittingAction === primaryAction} disabled={isBusy} onClick={() => void submitAction(primaryAction)}>{primaryActionLabel}</Button> : null}
        </div>
      </SettingSection>

      <SettingSection title="更新日志" description="按时间查看最近的检查、下载和安装事件。">
        <div className="desktop-update-timeline">
          {snapshot?.statusHistory?.length ? snapshot.statusHistory.slice(-8).reverse().map((entry) => (
            <div key={`${entry.timestamp}-${entry.status}`} className="desktop-update-timeline__item">
              <div className="desktop-update-timeline__icon">{entry.status === "download-complete" || entry.status === "complete" ? <LuCheck size={14} aria-hidden="true" /> : <LuRefreshCw size={14} aria-hidden="true" />}</div>
              <div className="desktop-update-timeline__content"><div className="desktop-update-timeline__message">{entry.message}</div><div className="desktop-update-timeline__time">{new Date(entry.timestamp).toLocaleString()}</div></div>
            </div>
          )) : <div className="desktop-update-timeline__empty">暂无更新事件。</div>}
        </div>
      </SettingSection>
    </div>
  );
};

export default DesktopUpdates;
