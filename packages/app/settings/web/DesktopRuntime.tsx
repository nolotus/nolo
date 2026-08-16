import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getIsDesktopApp } from "app/utils/env";
import { useAppDispatch, useAppSelector } from "app/store";
import { toErrorMessage } from "core/errorMessage";
import {
  selectDesktopChromeConnectorEnabled,
  setSettings,
} from "../settingSlice";
import {
  fetchDesktopAgentRuntimeStatus,
  type DesktopAgentRuntimeReadinessStatus,
} from "../../utils/desktopAgentRuntimeStatusClient";
import {
  fetchDesktopChromeConnectorStatus,
  installDesktopChromeNativeHost,
  runDesktopChromeConnectorSmokeTest,
  type DesktopChromeConnectorStatus,
} from "../../utils/desktopChromeConnectorClient";

const DESKTOP_PROVIDER_RUNTIME_ENDPOINT = "/api/desktop/provider-runtime";

type DesktopRuntimeSnapshot = {
  state: "unconfigured" | "stopped" | "running" | "error" | "starting";
  baseUrl: string;
  managedPid: number | null;
  watchPid: number | null;
  modelNames: string[];
  logTail: string[];
  error?: string;
  accepted?: boolean;
};

const DesktopRuntime: React.FC = () => {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<DesktopRuntimeSnapshot | null>(null);
  const [agentRuntimeReadiness, setAgentRuntimeReadiness] = useState<DesktopAgentRuntimeReadinessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<"start" | "stop" | null>(null);
  const [chromeConnectorStatus, setChromeConnectorStatus] = useState<DesktopChromeConnectorStatus | null>(null);
  const [chromeConnectorLoading, setChromeConnectorLoading] = useState(false);
  const [chromeConnectorAction, setChromeConnectorAction] = useState<"install" | "smoke" | null>(null);
  const [chromeConnectorMessage, setChromeConnectorMessage] = useState<string | null>(null);
  const isDesktop = getIsDesktopApp();
  const dispatch = useAppDispatch();
  const chromeConnectorEnabled = useAppSelector(selectDesktopChromeConnectorEnabled);

  const fetchChromeConnector = useCallback(async () => {
    if (!getIsDesktopApp()) return;
    setChromeConnectorLoading(true);
    try {
      const status = await fetchDesktopChromeConnectorStatus();
      setChromeConnectorStatus(status);
    } finally {
      setChromeConnectorLoading(false);
    }
  }, []);

  const fetchSnapshot = useCallback(async () => {
    if (!getIsDesktopApp()) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(DESKTOP_PROVIDER_RUNTIME_ENDPOINT, {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as DesktopRuntimeSnapshot & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to load desktop runtime state");
      }
      const localRuntimeStatus = await fetchDesktopAgentRuntimeStatus();
      setSnapshot(data);
      setAgentRuntimeReadiness(localRuntimeStatus);
      void fetchChromeConnector();
      setActionError(null);
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [fetchChromeConnector]);

  useEffect(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);

  useEffect(() => {
    if (!getIsDesktopApp()) return;
    if (snapshot?.state !== "starting") return;

    const timer = window.setInterval(() => {
      void fetchSnapshot();
    }, 1000);

    return () => window.clearInterval(timer);
  }, [fetchSnapshot, snapshot?.state]);

  const submitAction = useCallback(
    async (action: "start" | "stop") => {
      setSubmittingAction(action);
      try {
        const response = await fetch(DESKTOP_PROVIDER_RUNTIME_ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = (await response.json()) as DesktopRuntimeSnapshot & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || `Failed to ${action} runtime`);
        }
        if ("state" in data) {
          setSnapshot(data);
        }
        setActionError(null);
      } catch (error) {
        setActionError(toErrorMessage(error));
      } finally {
        setSubmittingAction(null);
        void fetchSnapshot();
      }
    },
    [fetchSnapshot],
  );

  const submitChromeInstall = useCallback(async () => {
    setChromeConnectorAction("install");
    const result = await installDesktopChromeNativeHost();
    setChromeConnectorMessage(result.ok
      ? "Native host installed. Reload the Chrome extension if it is already open."
      : result.error);
    await fetchChromeConnector();
    setChromeConnectorAction(null);
  }, [fetchChromeConnector]);

  const submitChromeSmoke = useCallback(async () => {
    setChromeConnectorAction("smoke");
    const result = await runDesktopChromeConnectorSmokeTest();
    setChromeConnectorMessage(result.ok ? "Smoke test: passed" : result.error);
    await fetchChromeConnector();
    setChromeConnectorAction(null);
  }, [fetchChromeConnector]);

  const setChromeConnectorEnabled = useCallback((enabled: boolean) => {
    void dispatch(setSettings({ desktopChromeConnectorEnabled: enabled }));
  }, [dispatch]);

  if (!isDesktop) {
    return (
      <div className="desktop-runtime-page">
        <h1 className="page-title">{t("settings.runtime.title", "Local provider runtime")}</h1>
        <div className="desktop-runtime-card desktop-runtime-card--empty">
          {t("settings.runtime.desktopOnly", "This page is only available in the desktop app.")}
        </div>
      </div>
    );
  }

  const visibleError = actionError || snapshot?.error || null;
  const modelLabel = snapshot?.modelNames.length ? snapshot.modelNames.join(", ") : "--";
  const logText = snapshot?.logTail.length ? snapshot.logTail.join("\n") : "No recent logs.";
  const agentRuntimeMode = agentRuntimeReadiness?.ok
    ? agentRuntimeReadiness.decision.mode
    : "unknown";
  const agentRuntimeCapabilities = agentRuntimeReadiness?.ok && agentRuntimeReadiness.localCapabilities.length
    ? agentRuntimeReadiness.localCapabilities.join(", ")
    : "--";
  const agentRuntimeMissing = agentRuntimeReadiness?.ok && agentRuntimeReadiness.missingLocalCapabilities.length
    ? agentRuntimeReadiness.missingLocalCapabilities.join(", ")
    : "--";
  const agentRuntimeReason = agentRuntimeReadiness?.ok
    ? agentRuntimeReadiness.decision.reason
    : agentRuntimeReadiness?.error ?? "--";
  const chromeNativeHostLabel = chromeConnectorStatus?.ok
    ? chromeConnectorStatus.nativeHost.installed
      ? chromeConnectorStatus.nativeHost.allowedOriginMatches && chromeConnectorStatus.nativeHost.wrapperPathMatches
        ? "installed"
        : "mismatch"
      : "missing"
    : "--";
  const chromeRpcLabel = chromeConnectorStatus?.ok
    ? chromeConnectorStatus.rpc.online
      ? "online"
      : "offline"
    : "--";
  const chromeTabLabel = chromeConnectorStatus?.ok && chromeConnectorStatus.rpc.tabCount !== null
    ? String(chromeConnectorStatus.rpc.tabCount)
    : "--";
  const chromeLastError = chromeConnectorStatus?.ok
    ? chromeConnectorStatus.lastError
    : chromeConnectorStatus?.error;

  return (
    <div className="desktop-runtime-page">
      <h1 className="page-title">{t("settings.runtime.title", "Local provider runtime")}</h1>
      <div className={`desktop-runtime-card desktop-runtime-card--${snapshot?.state ?? "loading"}`}>
        <div className="desktop-runtime-card__header">
          <div className="desktop-runtime-card__state">
            {loading ? t("common.loading", "Loading") : snapshot?.state ?? "unknown"}
          </div>
          <div className="desktop-runtime-card__base-url">{snapshot?.baseUrl ?? "--"}</div>
        </div>
        <div className="desktop-runtime-card__meta">
          <span>PID: {snapshot?.managedPid ?? "--"}</span>
          <span>Watch PID: {snapshot?.watchPid ?? "--"}</span>
          <span>Models: {modelLabel}</span>
        </div>
        <div className="desktop-runtime-card__meta">
          <span>Agent runtime: {agentRuntimeMode}</span>
          <span>Capabilities: {agentRuntimeCapabilities}</span>
          <span>Missing: {agentRuntimeMissing}</span>
        </div>
        <div className="desktop-runtime-card__meta">
          <span>{agentRuntimeReason}</span>
        </div>
        {visibleError ? (
          <div className="desktop-runtime-card__error">{visibleError}</div>
        ) : null}
        <div className="desktop-runtime-card__actions">
          <button
            type="button"
            disabled={submittingAction !== null || snapshot?.state === "running" || snapshot?.state === "starting"}
            onClick={() => void submitAction("start")}
          >
            {t("settings.runtime.start", "Start")}
          </button>
          <button
            type="button"
            disabled={submittingAction !== null || snapshot?.state === "unconfigured" || snapshot?.state === "stopped"}
            onClick={() => void submitAction("stop")}
          >
            {t("settings.runtime.stop", "Stop")}
          </button>
          <button type="button" disabled={submittingAction !== null} onClick={() => void fetchSnapshot()}>
            {t("settings.runtime.refresh", "Refresh")}
          </button>
        </div>
        <pre className="desktop-runtime-card__logs">{logText}</pre>
      </div>
      <div className="desktop-runtime-card desktop-runtime-card--chrome-connector">
        <div className="desktop-runtime-card__header">
          <div className="desktop-runtime-card__state">Chrome Connector</div>
          <div className="desktop-runtime-card__base-url">
            {chromeConnectorLoading ? t("common.loading", "Loading") : `RPC: ${chromeRpcLabel}`}
          </div>
        </div>
        <div className="desktop-runtime-card__meta">
          <span>Extension ID: {chromeConnectorStatus?.ok ? chromeConnectorStatus.extensionId : "--"}</span>
          <span>Native host: {chromeNativeHostLabel}</span>
          <span>Tabs: {chromeTabLabel}</span>
        </div>
        <div className="desktop-runtime-card__meta">
          <span>Extension folder: {chromeConnectorStatus?.ok ? chromeConnectorStatus.extensionPath : "--"}</span>
        </div>
        <div className="desktop-runtime-card__meta">
          <span>Chrome extension must still be loaded manually in chrome://extensions using Load unpacked.</span>
        </div>
        <label className="desktop-runtime-card__meta">
          <input
            type="checkbox"
            checked={chromeConnectorEnabled}
            onChange={(event) => setChromeConnectorEnabled(event.currentTarget.checked)}
          />
          <span>Enable Chrome Connector for agents</span>
        </label>
        <div className="desktop-runtime-card__meta">
          <span>
            {chromeConnectorEnabled
              ? "Available to desktop agents."
              : "Agents cannot use Chrome until enabled."}
          </span>
        </div>
        {chromeLastError ? (
          <div className="desktop-runtime-card__error">{chromeLastError}</div>
        ) : null}
        {chromeConnectorMessage ? (
          <div className="desktop-runtime-card__meta">
            <span>{chromeConnectorMessage}</span>
          </div>
        ) : null}
        <div className="desktop-runtime-card__actions">
          <button type="button" disabled={chromeConnectorAction !== null} onClick={() => void fetchChromeConnector()}>
            Refresh status
          </button>
          <button type="button" disabled={chromeConnectorAction !== null} onClick={() => void submitChromeInstall()}>
            Install/Reinstall native host
          </button>
          <button type="button" disabled={chromeConnectorAction !== null} onClick={() => void submitChromeSmoke()}>
            Run smoke test
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesktopRuntime;
