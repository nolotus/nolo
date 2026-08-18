import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectDesktopChromeConnectorEnabled,
  setSettings
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  getIsDesktopApp
} from "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
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
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/settings/web/DesktopRuntime.tsx
var import_react = __toESM(require_react());

// packages/app/utils/desktopAgentRuntimeStatusClient.ts
async function fetchDesktopAgentRuntimeStatus({
  fetchImpl = fetch
} = {}) {
  try {
    const response = await fetchImpl("/api/desktop/agent-runtime/status", {
      method: "GET",
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      return {
        ok: false,
        error: typeof data?.error === "string" ? data.error : "Failed to load desktop agent runtime status"
      };
    }
    return data;
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error)
    };
  }
}

// packages/app/utils/desktopChromeConnectorClient.ts
async function parseActionResponse(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    return {
      ok: false,
      error: typeof data?.error === "string" ? data.error : fallback,
      ...data
    };
  }
  return { ok: true, ...data };
}
async function fetchDesktopChromeConnectorStatus({
  fetchImpl = fetch
} = {}) {
  try {
    const response = await fetchImpl("/api/desktop/chrome-connector/status", {
      method: "GET",
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      return {
        ok: false,
        error: typeof data?.error === "string" ? data.error : "Failed to load Chrome connector status"
      };
    }
    return data;
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error)
    };
  }
}
async function installDesktopChromeNativeHost({
  fetchImpl = fetch
} = {}) {
  try {
    return await parseActionResponse(
      await fetchImpl("/api/desktop/chrome-connector/install-native-host", {
        method: "POST"
      }),
      "Failed to install Chrome native host"
    );
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error)
    };
  }
}
async function runDesktopChromeConnectorSmokeTest({
  fetchImpl = fetch
} = {}) {
  try {
    return await parseActionResponse(
      await fetchImpl("/api/desktop/chrome-connector/smoke-test", {
        method: "POST"
      }),
      "Failed to run Chrome connector smoke test"
    );
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error)
    };
  }
}

// packages/app/settings/web/DesktopRuntime.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var DESKTOP_PROVIDER_RUNTIME_ENDPOINT = "/api/desktop/provider-runtime";
var DesktopRuntime = () => {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = (0, import_react.useState)(null);
  const [agentRuntimeReadiness, setAgentRuntimeReadiness] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [actionError, setActionError] = (0, import_react.useState)(null);
  const [submittingAction, setSubmittingAction] = (0, import_react.useState)(null);
  const [chromeConnectorStatus, setChromeConnectorStatus] = (0, import_react.useState)(null);
  const [chromeConnectorLoading, setChromeConnectorLoading] = (0, import_react.useState)(false);
  const [chromeConnectorAction, setChromeConnectorAction] = (0, import_react.useState)(null);
  const [chromeConnectorMessage, setChromeConnectorMessage] = (0, import_react.useState)(null);
  const isDesktop = getIsDesktopApp();
  const dispatch = useAppDispatch();
  const chromeConnectorEnabled = useAppSelector(selectDesktopChromeConnectorEnabled);
  const fetchChromeConnector = (0, import_react.useCallback)(async () => {
    if (!getIsDesktopApp()) return;
    setChromeConnectorLoading(true);
    try {
      const status = await fetchDesktopChromeConnectorStatus();
      setChromeConnectorStatus(status);
    } finally {
      setChromeConnectorLoading(false);
    }
  }, []);
  const fetchSnapshot = (0, import_react.useCallback)(async () => {
    if (!getIsDesktopApp()) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(DESKTOP_PROVIDER_RUNTIME_ENDPOINT, {
        method: "GET",
        cache: "no-store"
      });
      const data = await response.json();
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
  (0, import_react.useEffect)(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);
  (0, import_react.useEffect)(() => {
    if (!getIsDesktopApp()) return;
    if (snapshot?.state !== "starting") return;
    const timer = window.setInterval(() => {
      void fetchSnapshot();
    }, 1e3);
    return () => window.clearInterval(timer);
  }, [fetchSnapshot, snapshot?.state]);
  const submitAction = (0, import_react.useCallback)(
    async (action) => {
      setSubmittingAction(action);
      try {
        const response = await fetch(DESKTOP_PROVIDER_RUNTIME_ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action })
        });
        const data = await response.json();
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
    [fetchSnapshot]
  );
  const submitChromeInstall = (0, import_react.useCallback)(async () => {
    setChromeConnectorAction("install");
    const result = await installDesktopChromeNativeHost();
    setChromeConnectorMessage(result.ok ? "Native host installed. Reload the Chrome extension if it is already open." : result.error);
    await fetchChromeConnector();
    setChromeConnectorAction(null);
  }, [fetchChromeConnector]);
  const submitChromeSmoke = (0, import_react.useCallback)(async () => {
    setChromeConnectorAction("smoke");
    const result = await runDesktopChromeConnectorSmokeTest();
    setChromeConnectorMessage(result.ok ? "Smoke test: passed" : result.error);
    await fetchChromeConnector();
    setChromeConnectorAction(null);
  }, [fetchChromeConnector]);
  const setChromeConnectorEnabled = (0, import_react.useCallback)((enabled) => {
    void dispatch(setSettings({ desktopChromeConnectorEnabled: enabled }));
  }, [dispatch]);
  if (!isDesktop) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-runtime-page", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "page-title", children: t("settings.runtime.title", "Local provider runtime") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-runtime-card desktop-runtime-card--empty", children: t("settings.runtime.desktopOnly", "This page is only available in the desktop app.") })
    ] });
  }
  const visibleError = actionError || snapshot?.error || null;
  const modelLabel = snapshot?.modelNames.length ? snapshot.modelNames.join(", ") : "--";
  const logText = snapshot?.logTail.length ? snapshot.logTail.join("\n") : "No recent logs.";
  const agentRuntimeMode = agentRuntimeReadiness?.ok ? agentRuntimeReadiness.decision.mode : "unknown";
  const agentRuntimeCapabilities = agentRuntimeReadiness?.ok && agentRuntimeReadiness.localCapabilities.length ? agentRuntimeReadiness.localCapabilities.join(", ") : "--";
  const agentRuntimeMissing = agentRuntimeReadiness?.ok && agentRuntimeReadiness.missingLocalCapabilities.length ? agentRuntimeReadiness.missingLocalCapabilities.join(", ") : "--";
  const agentRuntimeReason = agentRuntimeReadiness?.ok ? agentRuntimeReadiness.decision.reason : agentRuntimeReadiness?.error ?? "--";
  const chromeNativeHostLabel = chromeConnectorStatus?.ok ? chromeConnectorStatus.nativeHost.installed ? chromeConnectorStatus.nativeHost.allowedOriginMatches && chromeConnectorStatus.nativeHost.wrapperPathMatches ? "installed" : "mismatch" : "missing" : "--";
  const chromeRpcLabel = chromeConnectorStatus?.ok ? chromeConnectorStatus.rpc.online ? "online" : "offline" : "--";
  const chromeTabLabel = chromeConnectorStatus?.ok && chromeConnectorStatus.rpc.tabCount !== null ? String(chromeConnectorStatus.rpc.tabCount) : "--";
  const chromeLastError = chromeConnectorStatus?.ok ? chromeConnectorStatus.lastError : chromeConnectorStatus?.error;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-runtime-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "page-title", children: t("settings.runtime.title", "Local provider runtime") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `desktop-runtime-card desktop-runtime-card--${snapshot?.state ?? "loading"}`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-runtime-card__header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-runtime-card__state", children: loading ? t("common.loading", "Loading") : snapshot?.state ?? "unknown" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-runtime-card__base-url", children: snapshot?.baseUrl ?? "--" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-runtime-card__meta", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          "PID: ",
          snapshot?.managedPid ?? "--"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          "Watch PID: ",
          snapshot?.watchPid ?? "--"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          "Models: ",
          modelLabel
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-runtime-card__meta", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          "Agent runtime: ",
          agentRuntimeMode
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          "Capabilities: ",
          agentRuntimeCapabilities
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          "Missing: ",
          agentRuntimeMissing
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-runtime-card__meta", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: agentRuntimeReason }) }),
      visibleError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-runtime-card__error", children: visibleError }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-runtime-card__actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            disabled: submittingAction !== null || snapshot?.state === "running" || snapshot?.state === "starting",
            onClick: () => void submitAction("start"),
            children: t("settings.runtime.start", "Start")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            disabled: submittingAction !== null || snapshot?.state === "unconfigured" || snapshot?.state === "stopped",
            onClick: () => void submitAction("stop"),
            children: t("settings.runtime.stop", "Stop")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: submittingAction !== null, onClick: () => void fetchSnapshot(), children: t("settings.runtime.refresh", "Refresh") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "desktop-runtime-card__logs", children: logText })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-runtime-card desktop-runtime-card--chrome-connector", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-runtime-card__header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-runtime-card__state", children: "Chrome Connector" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-runtime-card__base-url", children: chromeConnectorLoading ? t("common.loading", "Loading") : `RPC: ${chromeRpcLabel}` })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-runtime-card__meta", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          "Extension ID: ",
          chromeConnectorStatus?.ok ? chromeConnectorStatus.extensionId : "--"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          "Native host: ",
          chromeNativeHostLabel
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          "Tabs: ",
          chromeTabLabel
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-runtime-card__meta", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        "Extension folder: ",
        chromeConnectorStatus?.ok ? chromeConnectorStatus.extensionPath : "--"
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-runtime-card__meta", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Chrome extension must still be loaded manually in chrome://extensions using Load unpacked." }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "desktop-runtime-card__meta", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "checkbox",
            checked: chromeConnectorEnabled,
            onChange: (event) => setChromeConnectorEnabled(event.currentTarget.checked)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Enable Chrome Connector for agents" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-runtime-card__meta", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: chromeConnectorEnabled ? "Available to desktop agents." : "Agents cannot use Chrome until enabled." }) }),
      chromeLastError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-runtime-card__error", children: chromeLastError }) : null,
      chromeConnectorMessage ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-runtime-card__meta", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: chromeConnectorMessage }) }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "desktop-runtime-card__actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: chromeConnectorAction !== null, onClick: () => void fetchChromeConnector(), children: "Refresh status" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: chromeConnectorAction !== null, onClick: () => void submitChromeInstall(), children: "Install/Reinstall native host" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: chromeConnectorAction !== null, onClick: () => void submitChromeSmoke(), children: "Run smoke test" })
      ] })
    ] })
  ] });
};
var DesktopRuntime_default = DesktopRuntime;
export {
  DesktopRuntime_default as default
};
