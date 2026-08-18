import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  isDesktopApp
} from "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuArrowDownToLine,
  LuCheck,
  LuDownload,
  LuLoaderCircle,
  LuRefreshCw,
  LuRocket
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/settings/web/DesktopUpdates.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var SettingSection = ({ title, description, children }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "setting-section", children: [
  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "section-header", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "section-title", children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "section-description", children: description })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "section-content", children })
] });
var formatBytes = (value) => {
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
var BADGE_LABEL_BY_PHASE = {
  not_checked: "Not checked yet",
  checking: "Checking",
  update_available: "New version available",
  downloading: "Downloading",
  ready_to_install: "Ready to install",
  applying: "Installing",
  up_to_date: "Up to date",
  invalid_remote: "Remote metadata is invalid",
  error: "Check failed"
};
var PRIMARY_ACTION_LABELS = {
  download: "Download update",
  apply: "Restart and install"
};
var PRIMARY_ACTION_ICONS = {
  download: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuArrowDownToLine, { "aria-hidden": "true" }),
  apply: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuRocket, { "aria-hidden": "true" })
};
var DesktopUpdates = () => {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [submittingAction, setSubmittingAction] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(null);
  const fetchSnapshot = (0, import_react.useCallback)(async () => {
    if (!isDesktopApp) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/desktop-updater", {
        method: "GET",
        cache: "no-store"
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
  (0, import_react.useEffect)(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);
  (0, import_react.useEffect)(() => {
    if (!isDesktopApp) return;
    if (!snapshot?.activeOperation) return;
    const timer = window.setInterval(() => {
      void fetchSnapshot();
    }, 1e3);
    return () => window.clearInterval(timer);
  }, [fetchSnapshot, snapshot?.activeOperation]);
  const submitAction = (0, import_react.useCallback)(
    async (action) => {
      setSubmittingAction(action);
      try {
        const response = await fetch("/api/desktop-updater", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({ action })
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
  const statusTone = (0, import_react.useMemo)(() => {
    if (error) return "error";
    return summary?.tone ?? "neutral";
  }, [error, summary?.tone]);
  const statusBadgeLabel = (0, import_react.useMemo)(() => {
    if (error) return t("settings.updates.failed", "Check failed");
    const phase = summary?.phase ?? "not_checked";
    return t(`settings.updates.phase.${phase}`, BADGE_LABEL_BY_PHASE[phase]);
  }, [error, summary?.phase, t]);
  const primaryActionLabel = (0, import_react.useMemo)(() => {
    if (!primaryAction) return null;
    return t(
      `settings.updates.action.${primaryAction}`,
      PRIMARY_ACTION_LABELS[primaryAction]
    );
  }, [primaryAction, t]);
  if (!isDesktopApp) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-updates-page", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "page-title", children: t("settings.updates.title", "Client updates") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-update-card desktop-update-card--empty", children: t("settings.updates.desktopOnly", "This page is only available in the desktop client.") })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-updates-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "page-title", children: t("settings.updates.title", "Client updates") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SettingSection,
      {
        title: t("settings.updates.overview.title", "Version status"),
        description: t(
          "settings.updates.overview.description",
          "New versions are detected automatically on launch. You can also check, download, and install updates manually here."
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `desktop-update-card desktop-update-card--${statusTone}`, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-update-card__header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-update-card__eyebrow", children: snapshot?.localInfo.channel || "stable" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-update-card__version", children: loading ? t("common.loading", "Loading...") : snapshot?.localInfo.version || t("common.unknown", "Unknown") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-update-card__badge", children: statusBadgeLabel })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-update-card__meta", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              t("settings.updates.currentHash", "Current build"),
              ":",
              " ",
              snapshot?.localInfo.hash?.slice(0, 12) || "--"
            ] }),
            updateInfo?.hash ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              t("settings.updates.latestHash", "Latest build"),
              ":",
              " ",
              updateInfo.hash.slice(0, 12)
            ] }) : null
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-update-card__status", children: error || summary?.statusMessage || t("settings.updates.idle", "Waiting to check for updates") }),
          typeof progress === "number" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-update-progress", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-update-progress__bar", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "div",
              {
                className: "desktop-update-progress__fill",
                style: { width: `${Math.max(0, Math.min(100, progress))}%` }
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-update-progress__meta", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
                progress,
                "%"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
                formatBytes(latestStatus?.details?.bytesDownloaded) || "--",
                " / ",
                formatBytes(latestStatus?.details?.totalBytes) || "--"
              ] })
            ] })
          ] }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-update-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Button_default,
              {
                variant: "secondary",
                icon: isBusy && snapshot?.activeOperation === "check" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLoaderCircle, { className: "desktop-update-spin", "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuRefreshCw, { "aria-hidden": "true" }),
                loading: submittingAction === "check",
                disabled: isBusy,
                onClick: () => void submitAction("check"),
                children: t("settings.updates.checkNow", "Check for updates")
              }
            ),
            primaryAction ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Button_default,
              {
                variant: "primary",
                icon: isBusy && snapshot?.activeOperation === primaryAction ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLoaderCircle, { className: "desktop-update-spin", "aria-hidden": "true" }) : PRIMARY_ACTION_ICONS[primaryAction],
                loading: submittingAction === primaryAction,
                disabled: isBusy,
                onClick: () => void submitAction(primaryAction),
                children: primaryActionLabel
              }
            ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Button_default,
              {
                variant: "secondary",
                icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuDownload, { "aria-hidden": "true" }),
                disabled: true,
                children: t("settings.updates.noAction", "No update available right now")
              }
            )
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SettingSection,
      {
        title: t("settings.updates.timeline.title", "Update log"),
        description: t(
          "settings.updates.timeline.description",
          "Shows the most recent check or download events so you can confirm which stage the client is in."
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-update-timeline", children: (snapshot?.statusHistory?.length ?? 0) > 0 ? snapshot?.statusHistory.slice(-8).reverse().map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-update-timeline__item", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-update-timeline__icon", children: entry.status === "download-complete" || entry.status === "complete" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCheck, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuRefreshCw, { size: 14, "aria-hidden": "true" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-update-timeline__content", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-update-timeline__message", children: entry.message }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-update-timeline__time", children: new Date(entry.timestamp).toLocaleString() })
          ] })
        ] }, `${entry.timestamp}-${entry.status}`)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-update-timeline__empty", children: t("settings.updates.timeline.empty", "No update events yet.") }) })
      }
    )
  ] });
};
var DesktopUpdates_default = DesktopUpdates;
export {
  DesktopUpdates_default as default
};
