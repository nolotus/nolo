import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuArrowDownToLine,
  LuCheck,
  LuDownload,
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
  not_checked: "Not checked yet",
  checking: "Checking",
  update_available: "New version available",
  downloading: "Downloading",
  ready_to_install: "Ready to install",
  applying: "Installing",
  up_to_date: "Up to date",
  invalid_remote: "Remote metadata is invalid",
  error: "Check failed",
};

const PRIMARY_ACTION_LABELS: Record<Exclude<DesktopUpdaterOperation, "check">, string> = {
  download: "Download update",
  apply: "Restart and install",
};

const PRIMARY_ACTION_ICONS: Record<
  Exclude<DesktopUpdaterOperation, "check">,
  React.ReactNode
> = {
  download: <LuArrowDownToLine aria-hidden="true" />,
  apply: <LuRocket aria-hidden="true" />,
};

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
      const response = await fetch("/api/desktop-updater", {
        method: "GET",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to load desktop updater state");
      }
      setSnapshot(data);
      setError(null);
    } catch (fetchError) {
      setError(toErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);

  useEffect(() => {
    if (!isDesktopApp) return;
    if (!snapshot?.activeOperation) return;

    const timer = window.setInterval(() => {
      void fetchSnapshot();
    }, 1000);

    return () => window.clearInterval(timer);
  }, [fetchSnapshot, snapshot?.activeOperation]);

  const submitAction = useCallback(
    async (action: "check" | "download" | "apply") => {
      setSubmittingAction(action);
      try {
        const response = await fetch("/api/desktop-updater", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ action }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || `Failed to ${action} update`);
        }
        setSnapshot(data);
        setError(null);
      } catch (submitError) {
        setError(toErrorMessage(submitError));
      } finally {
        setSubmittingAction(null);
        void fetchSnapshot();
      }
    },
    [fetchSnapshot]
  );

  const latestStatus = snapshot?.latestStatus;
  const updateInfo = snapshot?.updateInfo;
  const summary = snapshot?.summary;
  const progress = latestStatus?.details?.progress;
  const isBusy = Boolean(summary?.isBusy);
  const primaryAction = summary?.primaryAction ?? null;

  const statusTone = useMemo(() => {
    if (error) return "error";
    return summary?.tone ?? "neutral";
  }, [error, summary?.tone]);

  const statusBadgeLabel = useMemo(() => {
    if (error) return t("settings.updates.failed", "Check failed");
    const phase = summary?.phase ?? "not_checked";
    return t(`settings.updates.phase.${phase}`, BADGE_LABEL_BY_PHASE[phase]);
  }, [error, summary?.phase, t]);

  const primaryActionLabel = useMemo(() => {
    if (!primaryAction) return null;
    return t(
      `settings.updates.action.${primaryAction}`,
      PRIMARY_ACTION_LABELS[primaryAction]
    );
  }, [primaryAction, t]);

  if (!isDesktopApp) {
    return (
      <div className="desktop-updates-page">
        <h1 className="page-title">{t("settings.updates.title", "Client updates")}</h1>
        <div className="desktop-update-card desktop-update-card--empty">
          {t("settings.updates.desktopOnly", "This page is only available in the desktop client.")}
        </div>
      </div>
    );
  }

  return (
    <div className="desktop-updates-page">
      <h1 className="page-title">{t("settings.updates.title", "Client updates")}</h1>

      <SettingSection
        title={t("settings.updates.overview.title", "Version status")}
        description={t(
          "settings.updates.overview.description",
          "New versions are detected automatically on launch. You can also check, download, and install updates manually here."
        )}
      >
        <div className={`desktop-update-card desktop-update-card--${statusTone}`}>
          <div className="desktop-update-card__header">
            <div>
              <div className="desktop-update-card__eyebrow">
                {snapshot?.localInfo.channel || "stable"}
              </div>
              <div className="desktop-update-card__version">
                {loading
                  ? t("common.loading", "Loading...")
                  : snapshot?.localInfo.version || t("common.unknown", "Unknown")}
              </div>
          </div>
          <div className="desktop-update-card__badge">
              {statusBadgeLabel}
            </div>
          </div>

          <div className="desktop-update-card__meta">
            <span>
              {t("settings.updates.currentHash", "Current build")}:
              {" "}
              {snapshot?.localInfo.hash?.slice(0, 12) || "--"}
            </span>
            {updateInfo?.hash ? (
              <span>
                {t("settings.updates.latestHash", "Latest build")}:
                {" "}
                {updateInfo.hash.slice(0, 12)}
              </span>
            ) : null}
          </div>

          <div className="desktop-update-card__status">
            {error || summary?.statusMessage || t("settings.updates.idle", "Waiting to check for updates")}
          </div>

          {typeof progress === "number" ? (
            <div className="desktop-update-progress">
              <div className="desktop-update-progress__bar">
                <div
                  className="desktop-update-progress__fill"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
              <div className="desktop-update-progress__meta">
                <span>{progress}%</span>
                <span>
                  {formatBytes(latestStatus?.details?.bytesDownloaded) || "--"}
                  {" / "}
                  {formatBytes(latestStatus?.details?.totalBytes) || "--"}
                </span>
              </div>
            </div>
          ) : null}

          <div className="desktop-update-actions">
            <Button
              variant="secondary"
              icon={isBusy && snapshot?.activeOperation === "check" ? <LuLoaderCircle className="desktop-update-spin" aria-hidden="true" /> : <LuRefreshCw aria-hidden="true" />}
              loading={submittingAction === "check"}
              disabled={isBusy}
              onClick={() => void submitAction("check")}
            >
              {t("settings.updates.checkNow", "Check for updates")}
            </Button>

            {primaryAction ? (
              <Button
                variant="primary"
                icon={
                  isBusy && snapshot?.activeOperation === primaryAction ? (
                    <LuLoaderCircle className="desktop-update-spin" aria-hidden="true" />
                  ) : (
                    PRIMARY_ACTION_ICONS[primaryAction]
                  )
                }
                loading={submittingAction === primaryAction}
                disabled={isBusy}
                onClick={() => void submitAction(primaryAction)}
              >
                {primaryActionLabel}
              </Button>
            ) : (
              <Button
                variant="secondary"
                icon={<LuDownload aria-hidden="true" />}
                disabled
              >
                {t("settings.updates.noAction", "No update available right now")}
              </Button>
            )}
          </div>
        </div>
      </SettingSection>

      <SettingSection
        title={t("settings.updates.timeline.title", "Update log")}
        description={t(
          "settings.updates.timeline.description",
          "Shows the most recent check or download events so you can confirm which stage the client is in."
        )}
      >
        <div className="desktop-update-timeline">
          {(snapshot?.statusHistory?.length ?? 0) > 0 ? (
            snapshot?.statusHistory.slice(-8).reverse().map((entry) => (
              <div key={`${entry.timestamp}-${entry.status}`} className="desktop-update-timeline__item">
                <div className="desktop-update-timeline__icon">
                  {entry.status === "download-complete" || entry.status === "complete" ? <LuCheck size={14} aria-hidden="true" /> : <LuRefreshCw size={14} aria-hidden="true" />}
                </div>
                <div className="desktop-update-timeline__content">
                  <div className="desktop-update-timeline__message">{entry.message}</div>
                  <div className="desktop-update-timeline__time">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="desktop-update-timeline__empty">
              {t("settings.updates.timeline.empty", "No update events yet.")}
            </div>
          )}
        </div>
      </SettingSection>
    </div>
  );
};

export default DesktopUpdates;
