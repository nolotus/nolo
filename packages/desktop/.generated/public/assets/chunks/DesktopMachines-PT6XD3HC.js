import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  startDesktopLocalConnectorFromSession
} from "/public/assets/chunks/chunk-3Q6WLZLQ.js";
import {
  useToken
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  Navigate,
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectCurrentServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  getIsDesktopApp
} from "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuArrowRight,
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuCopy,
  LuLaptop,
  LuPlay,
  LuRefreshCw,
  LuTerminal,
  LuTrash2
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import {
  normalizeServerOrigin
} from "/public/assets/chunks/chunk-XJRNNKKF.js";
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

// packages/app/settings/web/DesktopMachines.tsx
var import_react2 = __toESM(require_react());

// packages/app/settings/web/machineStatus.ts
var MACHINE_OFFLINE_AFTER_MS = 9e4;
function projectMachineSummary(machine, now = Date.now()) {
  if (!Number.isFinite(machine.lastSeenAt) || machine.lastSeenAt <= 0) return machine;
  if (now - machine.lastSeenAt <= MACHINE_OFFLINE_AFTER_MS) return machine;
  return {
    ...machine,
    status: "offline",
    connectorStatus: "disconnected"
  };
}

// packages/app/settings/web/ExternalReaderStateCenter.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var EXTERNAL_READER_PROVIDERS = [
  {
    id: "xhs",
    label: "\u5C0F\u7EA2\u4E66",
    description: "\u533F\u540D\u516C\u5F00\u9884\u89C8\u6A21\u5F0F\uFF1A\u4E0D\u767B\u5F55\u3001\u4E0D\u590D\u7528 cookie\u3001\u4E0D\u7EF4\u62A4\u672C\u5730\u6D4F\u89C8\u5668\u914D\u7F6E\uFF1B\u53EA\u8BFB\u53D6\u672A\u767B\u5F55\u8BBF\u5BA2\u53EF\u89C1\u7684\u5185\u5BB9\u3002",
    labelKey: "settings.externalReader.providers.xhs.label",
    descriptionKey: "settings.externalReader.providers.xhs.description"
  }
];
function authHeaders(currentToken) {
  return {
    "Content-Type": "application/json",
    Authorization: currentToken ? `Bearer ${currentToken}` : ""
  };
}
var statusBadge = (status, t) => {
  const translate = (key, fallback) => t ? t(key, fallback) : fallback;
  switch (status) {
    case "ready":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ext-reader-badge ext-reader-badge--ready", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircleCheck, { "aria-hidden": "true" }),
        " ",
        translate("settings.externalReader.status.ready", "\u5DF2\u5C31\u7EEA")
      ] });
    case "needs_login":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ext-reader-badge ext-reader-badge--warning", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClock, { "aria-hidden": "true" }),
        " ",
        translate("settings.externalReader.status.needsLogin", "\u533F\u540D\u4E0D\u53EF\u89C1")
      ] });
    case "blocked":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ext-reader-badge ext-reader-badge--warning", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClock, { "aria-hidden": "true" }),
        " ",
        translate("settings.externalReader.status.blocked", "\u88AB\u5C4F\u853D")
      ] });
    case "error":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ext-reader-badge ext-reader-badge--error", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircleX, { "aria-hidden": "true" }),
        " ",
        translate("settings.externalReader.status.error", "\u9519\u8BEF")
      ] });
    case "unknown":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ext-reader-badge ext-reader-badge--unknown", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClock, { "aria-hidden": "true" }),
        " ",
        translate("settings.externalReader.status.unknown", "\u672A\u77E5")
      ] });
    default:
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ext-reader-badge ext-reader-badge--unknown", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClock, { "aria-hidden": "true" }),
        " ",
        translate("settings.externalReader.status.untested", "\u672A\u6D4B\u8BD5")
      ] });
  }
};
var renderStatusGuide = (status, t) => {
  const translate = (key, fallback) => t ? t(key, fallback) : fallback;
  switch (status) {
    case "needs_login":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ext-reader-status-guide ext-reader-status-guide--warning", children: translate("settings.externalReader.guide.needsLogin", "\u63D0\u793A\uFF1A\u8BE5\u9875\u9762\u8981\u6C42\u767B\u5F55\u540E\u8BBF\u95EE\u3002\u5C0F\u7EA2\u4E66\u8BFB\u53D6\u5668\u5F53\u524D\u4E3A\u533F\u540D\u6A21\u5F0F\uFF0C\u4E0D\u4F1A\u8BF7\u6C42\u767B\u5F55\u6216\u4F7F\u7528\u8D26\u53F7\u3002") });
    case "blocked":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ext-reader-status-guide ext-reader-status-guide--warning", children: translate("settings.externalReader.guide.blocked", "\u63D0\u793A\uFF1A\u8BBF\u95EE\u53D7\u9650\u6216\u89E6\u53D1\u5B89\u5168\u9A8C\u8BC1\u3002\u533F\u540D\u6A21\u5F0F\u4F1A\u505C\u6B62\u8BFB\u53D6\uFF0C\u4E0D\u4F1A\u8BF7\u6C42\u767B\u5F55\u6216\u7ED5\u8FC7\u9A8C\u8BC1\u3002") });
    case "error":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ext-reader-status-guide ext-reader-status-guide--error", children: translate("settings.externalReader.guide.error", "\u63D0\u793A\uFF1A\u8BFB\u53D6\u5668\u53D1\u751F\u5F02\u5E38\u9519\u8BEF\u3002\u533F\u540D\u6A21\u5F0F\u6CA1\u6709\u672C\u5730\u767B\u5F55\u6001\u53EF\u91CD\u7F6E\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u6216\u68C0\u67E5 Playwright \u73AF\u5883\u3002") });
    default:
      return null;
  }
};
var ExternalReaderStateCenter = ({
  currentToken,
  serverBase,
  isDesktop
}) => {
  const { t } = useTranslation();
  const [loadingKey, setLoadingKey] = (0, import_react.useState)(null);
  const [dataByProvider, setDataByProvider] = (0, import_react.useState)({});
  const [errorByProvider, setErrorByProvider] = (0, import_react.useState)({});
  const runProviderAction = (0, import_react.useCallback)(
    async (provider, action) => {
      if (!isDesktop) {
        setErrorByProvider((prev) => ({
          ...prev,
          [provider.id]: t("settings.externalReader.desktopRequired", "\u8BF7\u5728\u684C\u9762\u7AEF\u7BA1\u7406\u5916\u90E8\u5E73\u53F0\u8BFB\u53D6\u5668")
        }));
        return;
      }
      const key = `${provider.id}:${action}`;
      setLoadingKey(key);
      setErrorByProvider((prev) => ({ ...prev, [provider.id]: null }));
      try {
        const response = await fetch(
          `${serverBase}/api/external-readers/${provider.id}/${action}`,
          {
            method: "POST",
            headers: authHeaders(currentToken),
            body: JSON.stringify({})
          }
        );
        const resData = await response.json().catch(() => ({}));
        if (!response.ok) {
          const fallback = t("settings.externalReader.checkFailed", "\u8BFB\u53D6\u7B56\u7565\u68C0\u67E5\u5931\u8D25");
          throw new Error(resData.message || fallback);
        }
        setDataByProvider((prev) => ({
          ...prev,
          [provider.id]: resData
        }));
      } catch (err) {
        setErrorByProvider((prev) => ({
          ...prev,
          [provider.id]: err.message || t("settings.externalReader.requestFailed", "\u8BF7\u6C42\u5931\u8D25")
        }));
      } finally {
        setLoadingKey(null);
      }
    },
    [currentToken, isDesktop, serverBase]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "ext-reader-state-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `
        .ext-reader-state-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          padding: var(--space-4);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--backgroundSecondary);
          margin-bottom: var(--space-4);
        }
        .ext-reader-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-2);
        }
        .ext-reader-card-title-container {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .ext-reader-card-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
        }
        .ext-reader-provider-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }
        .ext-reader-desktop-req-badge {
          font-size: var(--fontSize-xs);
          padding: 2px 6px;
          background: var(--backgroundHover);
          border: 1px solid var(--borderLight);
          color: var(--textSecondary);
          border-radius: var(--radius-sm);
        }
        .ext-reader-status-info {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .ext-reader-provider-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding-top: var(--space-2);
          border-top: 1px solid var(--borderLight);
        }
        .ext-reader-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: var(--fontSize-sm);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-weight: 500;
        }
        .ext-reader-badge--ready {
          background: rgba(16, 185, 129, 0.1);
          color: rgb(16, 185, 129);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .ext-reader-badge--warning {
          background: rgba(245, 158, 11, 0.1);
          color: rgb(245, 158, 11);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
        .ext-reader-badge--error {
          background: rgba(239, 68, 68, 0.1);
          color: rgb(239, 68, 68);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .ext-reader-badge--unknown {
          background: var(--backgroundHover);
          color: var(--textSecondary);
          border: 1px solid var(--borderLight);
        }
        .ext-reader-card-body {
          font-size: var(--fontSize-sm);
          color: var(--textSecondary);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .ext-reader-sample-details {
          background: var(--background);
          border: 1px solid var(--borderLight);
          padding: var(--space-3);
          border-radius: var(--radius-sm);
          margin-top: 4px;
        }
        .ext-reader-sample-title {
          font-weight: 600;
          color: var(--text);
          margin-bottom: var(--space-1);
        }
        .ext-reader-diagnostic {
          background: rgba(239, 68, 68, 0.05);
          border: 1px dashed rgba(239, 68, 68, 0.2);
          color: var(--textSecondary);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-sm);
          font-family: monospace;
          font-size: var(--fontSize-xs);
        }
        .ext-reader-status-guide {
          font-size: var(--fontSize-xs);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-sm);
          margin-top: var(--space-2);
          line-height: 1.4;
        }
        .ext-reader-status-guide--warning {
          background: rgba(245, 158, 11, 0.05);
          border: 1px dashed rgba(245, 158, 11, 0.2);
          color: var(--textSecondary);
        }
        .ext-reader-status-guide--error {
          background: rgba(239, 68, 68, 0.05);
          border: 1px dashed rgba(239, 68, 68, 0.2);
          color: var(--textSecondary);
        }
        .ext-reader-card-actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-top: var(--space-2);
          flex-wrap: wrap;
        }
      ` }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ext-reader-card-header", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ext-reader-card-title-container", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { className: "ext-reader-card-title", children: t("settings.externalReader.title", "\u5916\u90E8\u5E73\u53F0\u8BFB\u53D6\u5668") }),
      !isDesktop && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ext-reader-desktop-req-badge", children: t("settings.externalReader.desktopRequiredBadge", "\u9700\u8981\u684C\u9762\u7AEF") })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ext-reader-card-body", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("settings.externalReader.description", "\u67E5\u770B\u5916\u90E8\u5E73\u53F0 Reader \u7684\u8FD0\u884C\u7B56\u7565\u3002\u5C0F\u7EA2\u4E66\u5F53\u524D\u53EA\u505A\u533F\u540D\u516C\u5F00\u8BFB\u53D6\uFF1A\u4E0D\u767B\u5F55\u3001\u4E0D\u4FDD\u5B58 cookie\u3001\u4E0D\u4F7F\u7528\u6301\u4E45\u6D4F\u89C8\u5668\u914D\u7F6E\uFF1B\u770B\u4E0D\u5230\u7684\u5185\u5BB9\u4F1A\u88AB\u62A5\u544A\u4E3A\u533F\u540D\u4E0D\u53EF\u89C1\u3002") }) }),
    EXTERNAL_READER_PROVIDERS.map((provider) => {
      const data = dataByProvider[provider.id];
      const error = errorByProvider[provider.id];
      const actionDisabled = !!loadingKey || !isDesktop;
      const desktopRequiredTitle = !isDesktop ? t("settings.externalReader.desktopRequiredTooltip", "\u8BF7\u5728\u684C\u9762\u7AEF\u7BA1\u7406\u8BFB\u53D6\u5668") : void 0;
      const providerLabel = t(provider.labelKey, provider.label);
      const providerDescription = t(provider.descriptionKey, provider.description);
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ext-reader-provider-card", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ext-reader-card-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ext-reader-card-title-container", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ext-reader-provider-name", children: providerLabel }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ext-reader-status-info", children: statusBadge(data?.status, t) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ext-reader-card-body", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: providerDescription }),
          data?.message && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { color: "var(--text)" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t("settings.externalReader.messageLabel", "\u6D88\u606F:") }),
            " ",
            data.message
          ] }),
          data?.sample && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ext-reader-sample-details", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ext-reader-sample-title", children: t("settings.externalReader.sampleTitle", "\u533F\u540D\u516C\u5F00\u8BFB\u53D6\u6837\u4F8B\uFF1A") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              t("settings.externalReader.nickname", "\u7528\u6237\u6635\u79F0"),
              ": ",
              data.sample.nickname || t("settings.externalReader.unknown", "\u672A\u77E5")
            ] }),
            typeof data.sample.noteCount === "number" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              t("settings.externalReader.noteCount", "\u7B14\u8BB0\u603B\u6570"),
              ": ",
              data.sample.noteCount
            ] }),
            data.sample.fetchedAt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: "11px", color: "var(--textTertiary)", marginTop: "4px" }, children: [
              t("settings.externalReader.fetchedAt", "\u83B7\u53D6\u65F6\u95F4"),
              ": ",
              new Date(data.sample.fetchedAt).toLocaleString()
            ] })
          ] }),
          data?.diagnostic && (data.diagnostic.message || data.diagnostic.code) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ext-reader-diagnostic", children: [
            "[",
            t("settings.externalReader.diagnosticCode", "\u8BCA\u65AD\u4EE3\u7801"),
            ": ",
            data.diagnostic.code || t("settings.externalReader.notAvailable", "N/A"),
            "] ",
            data.diagnostic.message || ""
          ] }),
          renderStatusGuide(data?.status, t),
          error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ext-reader-diagnostic", style: { color: "var(--danger)" }, children: [
            t("settings.externalReader.errorLabel", "\u9519\u8BEF"),
            ": ",
            error
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ext-reader-card-actions", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            variant: "secondary",
            icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuRefreshCw, { "aria-hidden": "true" }),
            loading: loadingKey === `${provider.id}:status`,
            disabled: actionDisabled,
            title: desktopRequiredTitle,
            onClick: () => runProviderAction(provider, "status"),
            children: t("settings.externalReader.checkPolicy", "\u67E5\u770B\u7B56\u7565")
          }
        ) })
      ] }, provider.id);
    })
  ] });
};
var ExternalReaderStateCenter_default = ExternalReaderStateCenter;

// packages/app/settings/web/DesktopMachines.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var CLI_CAPABILITIES = [
  { key: "codex-cli", label: "Codex", provider: "codex" },
  { key: "copilot-cli", label: "Copilot", provider: "copilot" },
  { key: "claude-code", label: "Claude", provider: "claude" },
  { key: "agy-cli", label: "Antigravity", provider: "agy" },
  { key: "qoder-cli", label: "Qoder", provider: "qoder" },
  { key: "gemini-cli", label: "Gemini", provider: "gemini" },
  { key: "opencode-cli", label: "OpenCode", provider: "opencode" },
  { key: "grok-cli", label: "Grok", provider: "grok" },
  { key: "kimi-cli", label: "Kimi Code", provider: "kimi" }
];
var SMOKE_MARKER = "NOLO_MACHINE_SMOKE_OK";
var MACHINE_REFRESH_INTERVAL_MS = 15e3;
var MACHINE_CLOCK_TICK_MS = 5e3;
var SMOKE_PROVIDER_LABEL = {
  codex: "Codex",
  copilot: "Copilot",
  claude: "Claude",
  agy: "Antigravity",
  qoder: "Qoder",
  gemini: "Gemini",
  kimi: "Kimi Code",
  opencode: "OpenCode",
  grok: "Grok"
};
var SMOKE_SUCCESS_MESSAGES = {
  codex: "Codex responded successfully.",
  copilot: "Copilot responded successfully.",
  claude: "Claude responded successfully.",
  agy: "Antigravity responded successfully.",
  qoder: "Qoder responded successfully.",
  gemini: "Gemini responded successfully.",
  kimi: "Kimi Code responded successfully.",
  opencode: "OpenCode responded successfully.",
  grok: "Grok responded successfully."
};
var SMOKE_UNVERIFIED_MESSAGES = {
  codex: "Codex returned a response, but the content did not contain the expected marker.",
  copilot: "Copilot returned a response, but the content did not contain the expected marker.",
  claude: "Claude returned a response, but the content did not contain the expected marker.",
  agy: "Antigravity returned a response, but the content did not contain the expected marker.",
  qoder: "Qoder returned a response, but the content did not contain the expected marker.",
  gemini: "Gemini returned a response, but the content did not contain the expected marker.",
  kimi: "Kimi Code returned a response, but the content did not contain the expected marker.",
  opencode: "OpenCode returned a response, but the content did not contain the expected marker.",
  grok: "Grok returned a response, but the content did not contain the expected marker."
};
function errorMessageFromResponse(data, fallback) {
  if (typeof data.error === "string") return data.error;
  if (data.error && typeof data.error === "object" && "message" in data.error) {
    const message = data.error.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
function formatRelativeSeen(lastSeenAt) {
  if (!Number.isFinite(lastSeenAt) || lastSeenAt <= 0) return "unknown";
  const diffMs = Math.max(0, Date.now() - lastSeenAt);
  const diffSeconds = Math.round(diffMs / 1e3);
  if (diffSeconds < 60) return "just now";
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(lastSeenAt).toLocaleString();
}
function formatSmokeDiagnostics(diagnostics) {
  if (!diagnostics) return "";
  const parts = [
    asOptionalTrimmedString(diagnostics.executable) ?? null,
    Number.isFinite(diagnostics.elapsedMs) ? `${Math.round(Number(diagnostics.elapsedMs))}ms` : null
  ].filter(Boolean);
  return parts.length > 0 ? ` ${parts.join(" \xB7 ")}` : "";
}
function statusTone(machine) {
  if (machine.status !== "online") return "offline";
  if (machine.connectorStatus !== "connected") return "warning";
  return "online";
}
function detectDefaultPlatform() {
  if (typeof navigator === "undefined") return "posix";
  const platform = `${navigator.userAgent} ${navigator.platform}`.toLowerCase();
  return platform.includes("windows") || platform.includes("win32") ? "windows" : "posix";
}
function installNoloCli(args) {
  if (args.platform === "windows") {
    const escapedServerBase = args.serverBase.replace(/'/g, "''");
    const escapedApiKey = args.apiKey.replace(/'/g, "''");
    const escapedInstallScriptUrl = `${args.serverBase}/api/machines/install.ps1`.replace(/'/g, "''");
    return `powershell -ExecutionPolicy Bypass -Command "& ([ScriptBlock]::Create((Invoke-RestMethod '${escapedInstallScriptUrl}'))) -ServerUrl '${escapedServerBase}' -MachineKey '${escapedApiKey}'"`;
  }
  return `curl -fsSL "${args.serverBase}/api/machines/install.sh" | bash -s -- --server-url "${args.serverBase}" --machine-key "${args.apiKey}"`;
}
var DesktopMachines = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [machines, setMachines] = (0, import_react2.useState)([]);
  const [loading, setLoading] = (0, import_react2.useState)(true);
  const [error, setError] = (0, import_react2.useState)(null);
  const [machineApiKey, setMachineApiKey] = (0, import_react2.useState)(null);
  const [creatingToken, setCreatingToken] = (0, import_react2.useState)(false);
  const [connectCommandError, setConnectCommandError] = (0, import_react2.useState)(null);
  const [copied, setCopied] = (0, import_react2.useState)(false);
  const [commandPlatform, setCommandPlatform] = (0, import_react2.useState)(() => detectDefaultPlatform());
  const [smokeState, setSmokeState] = (0, import_react2.useState)(null);
  const [disconnectingMachineId, setDisconnectingMachineId] = (0, import_react2.useState)(null);
  const [machineClock, setMachineClock] = (0, import_react2.useState)(() => Date.now());
  const [desktopConnectorState, setDesktopConnectorState] = (0, import_react2.useState)("idle");
  const [desktopConnectorError, setDesktopConnectorError] = (0, import_react2.useState)(null);
  const currentToken = useToken();
  const currentServer = useAppSelector(selectCurrentServer);
  const isDesktop = getIsDesktopApp();
  const serverBase = (0, import_react2.useMemo)(() => {
    const configured = normalizeServerOrigin(currentServer);
    if (configured) return configured;
    return typeof window !== "undefined" ? window.location.origin : "";
  }, [currentServer]);
  const externalReaderServerBase = (0, import_react2.useMemo)(() => {
    if (isDesktop && typeof window !== "undefined") {
      return window.location.origin;
    }
    return serverBase;
  }, [isDesktop, serverBase]);
  const connectCommand = (0, import_react2.useMemo)(() => {
    if (!machineApiKey) return "";
    return installNoloCli({
      apiKey: machineApiKey,
      platform: commandPlatform,
      serverBase
    });
  }, [commandPlatform, machineApiKey, serverBase]);
  const desktopConnectorStatus = (0, import_react2.useMemo)(() => {
    if (!isDesktop) return null;
    if (desktopConnectorState === "starting") {
      return {
        tone: "info",
        icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuClock, { "aria-hidden": "true" }),
        title: t("settings.machines.desktopConnector.starting.title", "\u6B63\u5728\u8FDE\u63A5\u8FD9\u53F0\u7535\u8111"),
        message: t(
          "settings.machines.desktopConnector.starting.message",
          "Nolo Desktop \u6B63\u5728\u7528\u5F53\u524D\u767B\u5F55\u8D26\u53F7\u542F\u52A8\u672C\u673A\u540E\u53F0\u8FDE\u63A5\u3002"
        )
      };
    }
    if (desktopConnectorState === "started") {
      return {
        tone: "success",
        icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuCircleCheck, { "aria-hidden": "true" }),
        title: t("settings.machines.desktopConnector.started.title", "\u672C\u673A\u540E\u53F0\u8FDE\u63A5\u5DF2\u542F\u52A8"),
        message: t(
          "settings.machines.desktopConnector.started.message",
          "\u8FD9\u53F0\u7535\u8111\u4F1A\u81EA\u52A8\u51FA\u73B0\u5728\u4E0B\u9762\u7684\u7535\u8111\u5217\u8868\u91CC\u3002"
        )
      };
    }
    if (desktopConnectorState === "skipped") {
      return {
        tone: "success",
        icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuCircleCheck, { "aria-hidden": "true" }),
        title: t(
          "settings.machines.desktopConnector.skipped.title",
          "\u672C\u673A\u540E\u53F0\u8FDE\u63A5\u5DF2\u5728\u8FD0\u884C"
        ),
        message: t(
          "settings.machines.desktopConnector.skipped.message",
          "\u5982\u679C\u5217\u8868\u8FD8\u6CA1\u5237\u65B0\u51FA\u6765\uFF0C\u53EF\u4EE5\u624B\u52A8\u5237\u65B0\u6216\u590D\u5236\u4E0B\u9762\u547D\u4EE4\u515C\u5E95\u8FDE\u63A5\u3002"
        )
      };
    }
    if (desktopConnectorState === "error") {
      return {
        tone: "warning",
        icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuCircleX, { "aria-hidden": "true" }),
        title: t("settings.machines.desktopConnector.error.title", "\u672C\u673A\u540E\u53F0\u8FDE\u63A5\u542F\u52A8\u5931\u8D25"),
        message: desktopConnectorError || t(
          "settings.machines.desktopConnector.error.message",
          "\u53EF\u4EE5\u91CD\u8BD5\uFF0C\u6216\u590D\u5236\u4E0B\u9762\u547D\u4EE4\u5728\u7EC8\u7AEF\u91CC\u624B\u52A8\u8FDE\u63A5\u3002"
        )
      };
    }
    return null;
  }, [desktopConnectorError, desktopConnectorState, isDesktop]);
  const fetchMachines = (0, import_react2.useCallback)(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${serverBase}/api/machines`, {
        method: "GET",
        cache: "no-store",
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (isDesktop && response.status === 401) {
          setMachines([]);
          setError(null);
          return;
        }
        throw new Error(errorMessageFromResponse(data, "Failed to load connected computers"));
      }
      setMachines(Array.isArray(data.machines) ? data.machines : []);
      setError(null);
    } catch (fetchError) {
      if (isDesktop) {
        setMachines([]);
        setError(null);
        return;
      }
      setError(toErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, [currentToken, isDesktop, serverBase]);
  (0, import_react2.useEffect)(() => {
    if (currentToken) void fetchMachines();
  }, [currentToken, fetchMachines]);
  (0, import_react2.useEffect)(() => {
    if (!currentToken) return void 0;
    const interval = window.setInterval(() => {
      void fetchMachines();
    }, MACHINE_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [currentToken, fetchMachines]);
  (0, import_react2.useEffect)(() => {
    const interval = window.setInterval(() => {
      setMachineClock(Date.now());
    }, MACHINE_CLOCK_TICK_MS);
    return () => window.clearInterval(interval);
  }, []);
  const startDesktopConnector = (0, import_react2.useCallback)(async () => {
    if (!isDesktop || !currentToken || !serverBase) return;
    setDesktopConnectorState("starting");
    setDesktopConnectorError(null);
    const result = await startDesktopLocalConnectorFromSession({
      serverUrl: serverBase,
      authToken: currentToken
    });
    if (result.ok) {
      setDesktopConnectorState(result.status === "started" ? "started" : "skipped");
      setDesktopConnectorError(null);
      setTimeout(() => void fetchMachines(), 1200);
      return;
    }
    setDesktopConnectorState("error");
    setDesktopConnectorError(result.error || "Failed to start desktop connector");
  }, [currentToken, fetchMachines, isDesktop, serverBase]);
  (0, import_react2.useEffect)(() => {
    if (!isDesktop || !currentToken || !serverBase || desktopConnectorState !== "idle") return;
    void startDesktopConnector();
  }, [currentToken, desktopConnectorState, isDesktop, serverBase, startDesktopConnector]);
  const sortedMachines = (0, import_react2.useMemo)(
    () => machines.map((machine) => projectMachineSummary(machine, machineClock)).sort((a, b) => b.lastSeenAt - a.lastSeenAt),
    [machineClock, machines]
  );
  const createConnectScript = (0, import_react2.useCallback)(async () => {
    if (!currentToken) {
      setConnectCommandError(t("settings.machines.loginRequired", "\u8BF7\u5148\u767B\u5F55\u540E\u518D\u751F\u6210\u8FDE\u63A5\u547D\u4EE4\u3002"));
      return;
    }
    setCreatingToken(true);
    setConnectCommandError(null);
    try {
      const response = await fetch(`${serverBase}/api/machines/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ name: "Nolo daemon" })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.apiKey) {
        throw new Error(errorMessageFromResponse(data, "Failed to create machine token"));
      }
      setMachineApiKey(data.apiKey);
      setCopied(false);
      setConnectCommandError(null);
    } catch (tokenError) {
      setConnectCommandError(toErrorMessage(tokenError));
    } finally {
      setCreatingToken(false);
    }
  }, [currentToken, serverBase]);
  const copyConnectScript = (0, import_react2.useCallback)(async () => {
    if (!connectCommand || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(connectCommand);
    setCopied(true);
  }, [connectCommand]);
  const runMachineSmoke = (0, import_react2.useCallback)(async (machineId, cliProvider) => {
    const key = `${machineId}:${cliProvider}`;
    setSmokeState({
      key,
      status: "running",
      message: t("settings.machines.smokeRunning", "\u6B63\u5728\u6D4B\u8BD5 {{label}}...", {
        label: SMOKE_PROVIDER_LABEL[cliProvider]
      })
    });
    try {
      const response = await fetch(`${serverBase}/api/machines/smoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ machineId, cliProvider })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(errorMessageFromResponse(data, t("settings.machines.smokeFailed", "\u6D4B\u8BD5\u5931\u8D25")));
      }
      const content = asTrimmedString(data.content);
      const diagnostics = formatSmokeDiagnostics(data.diagnostics);
      setSmokeState({
        key,
        status: content.includes(SMOKE_MARKER) ? "success" : "error",
        message: content.includes(SMOKE_MARKER) ? `${SMOKE_SUCCESS_MESSAGES[cliProvider]}${diagnostics}` : `${SMOKE_UNVERIFIED_MESSAGES[cliProvider]} \u8FD4\u56DE\uFF1A${content || "(empty)"}`
      });
    } catch (smokeError) {
      setSmokeState({
        key,
        status: "error",
        message: smokeError instanceof Error ? smokeError.message : t("settings.machines.smokeFailed", "\u6D4B\u8BD5\u5931\u8D25")
      });
    }
  }, [currentToken, serverBase]);
  const disconnectMachine = (0, import_react2.useCallback)(async (machine) => {
    const confirmed = typeof window === "undefined" ? true : window.confirm(t(
      "settings.machines.disconnectConfirm",
      "\u79FB\u9664 {{name}}\uFF1F\u8FD9\u4F1A\u64A4\u9500\u5F53\u524D\u8FDE\u63A5\u811A\u672C\u7684\u5BC6\u94A5\u3002",
      { name: machine.name }
    ));
    if (!confirmed) return;
    setDisconnectingMachineId(machine.machineId);
    try {
      const response = await fetch(`${serverBase}/api/machines/${encodeURIComponent(machine.machineId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(errorMessageFromResponse(data, "Failed to disconnect computer"));
      }
      setMachines((current) => current.filter((item) => item.machineId !== machine.machineId));
      setSmokeState(
        (current) => current?.key.startsWith(`${machine.machineId}:`) ? null : current
      );
      setError(null);
    } catch (disconnectError) {
      setError(toErrorMessage(disconnectError));
    } finally {
      setDisconnectingMachineId(null);
    }
  }, [currentToken, serverBase, t]);
  const openAgentCreateForm = (0, import_react2.useCallback)((machine, cliProvider) => {
    const params = new URLSearchParams({
      apiSource: "cli",
      cliProvider,
      machineId: machine.machineId,
      machineName: machine.name
    });
    navigate(`/create/agent?${params.toString()}`);
  }, [navigate]);
  if (!currentToken) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Navigate, { to: "/login", replace: true });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machines-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machines-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { className: "page-title", children: t("settings.machines.title", "\u7535\u8111") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "desktop-machines-subtitle", children: t(
          "settings.machines.subtitle",
          "\u5728\u8981\u8FDE\u63A5\u7684\u7535\u8111\u4E0A\u8FD0\u884C\u4E0B\u9762\u547D\u4EE4\uFF0CNolo \u4F1A\u6309\u9700\u5B89\u88C5 nolo-cli\uFF0C\u5E76\u8FDE\u63A5\u8FD9\u53F0\u7535\u8111\u4E0A\u7684 CLI \u80FD\u529B\u3002"
        ) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "desktop-machines-actions", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        Button_default,
        {
          variant: "secondary",
          icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuRefreshCw, { "aria-hidden": "true" }),
          loading,
          onClick: () => void fetchMachines(),
          children: t("common.refresh", "\u5237\u65B0")
        }
      ) })
    ] }),
    error ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "desktop-machine-alert desktop-machine-alert--error", children: error }) : null,
    desktopConnectorStatus ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: `desktop-machine-alert desktop-machine-alert--${desktopConnectorStatus.tone}`, children: [
      desktopConnectorStatus.icon,
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machine-alert__body", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: desktopConnectorStatus.title }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: desktopConnectorStatus.message })
      ] }),
      desktopConnectorState === "error" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        Button_default,
        {
          variant: "secondary",
          icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuRefreshCw, { "aria-hidden": "true" }),
          onClick: () => void startDesktopConnector(),
          children: t("common.retry", "\u91CD\u8BD5")
        }
      ) : null
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ExternalReaderStateCenter_default, { currentToken, serverBase: externalReaderServerBase, isDesktop }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machine-connect", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machine-connect__header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: t("settings.machines.connectCommand.title", "\u5B89\u88C5 nolo \u5E76\u8FDE\u63A5\u65B0\u7535\u8111") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: t(
            "settings.machines.connectCommand.cliDesc",
            "\u9009\u62E9\u76EE\u6807\u7535\u8111\u7684\u7CFB\u7EDF\uFF0C\u7136\u540E\u590D\u5236\u547D\u4EE4\u5230\u90A3\u53F0\u7535\u8111\u8FD0\u884C\u3002\u5B83\u4F1A\u6309\u9700\u5B89\u88C5 nolo-cli\uFF0C\u7136\u540E\u6267\u884C nolo connect\u3002"
          ) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machine-connect__actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machine-platform-tabs", role: "tablist", "aria-label": t("settings.machines.connectCommand.platformLabel", "\u8FDE\u63A5\u547D\u4EE4\u7CFB\u7EDF"), children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                type: "button",
                role: "tab",
                "aria-selected": commandPlatform === "posix",
                className: commandPlatform === "posix" ? "is-active" : "",
                onClick: () => {
                  setCommandPlatform("posix");
                  setCopied(false);
                },
                children: "Mac / Linux"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                type: "button",
                role: "tab",
                "aria-selected": commandPlatform === "windows",
                className: commandPlatform === "windows" ? "is-active" : "",
                onClick: () => {
                  setCommandPlatform("windows");
                  setCopied(false);
                },
                children: "Windows"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            Button_default,
            {
              variant: "secondary",
              icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuCopy, { "aria-hidden": "true" }),
              disabled: !connectCommand,
              onClick: () => void copyConnectScript(),
              children: copied ? t("common.copied", "\u5DF2\u590D\u5236") : t("common.copy", "\u590D\u5236")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            Button_default,
            {
              variant: "secondary",
              loading: creatingToken,
              onClick: () => void createConnectScript(),
              children: machineApiKey ? t("settings.machines.rotateCommand", "\u91CD\u65B0\u751F\u6210\u5BC6\u94A5") : t("settings.machines.generateCommand", "\u751F\u6210\u5BC6\u94A5")
            }
          )
        ] })
      ] }),
      connectCommandError ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "desktop-machine-command-error", children: connectCommandError }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("pre", { children: connectCommand || t("settings.machines.commandEmpty", "\u9700\u8981\u8FDE\u63A5\u53E6\u4E00\u53F0\u7535\u8111\u65F6\uFF0C\u5148\u751F\u6210\u5BC6\u94A5\u518D\u590D\u5236\u547D\u4EE4\u3002") })
    ] }),
    !loading && sortedMachines.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machine-empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuLaptop, { size: 22, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: t("settings.machines.empty.title", "\u8FD8\u6CA1\u6709\u8FDE\u63A5\u7684\u7535\u8111") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: t(
          "settings.machines.empty.desc",
          "\u4E0A\u9762\u7684\u547D\u4EE4\u8FD0\u884C\u6210\u529F\u540E\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u7535\u8111\u72B6\u6001\u548C\u53EF\u7528\u7684\u672C\u673A CLI Agent\u3002"
        ) })
      ] })
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "desktop-machine-list", children: sortedMachines.map((machine) => {
      const tone = statusTone(machine);
      const online = tone === "online";
      const connected = machine.connectorStatus === "connected";
      const availableCapabilities = CLI_CAPABILITIES.filter(
        (capability) => machine.capabilities.includes(capability.key)
      );
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("article", { className: `desktop-machine desktop-machine--${tone}`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machine__main", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "desktop-machine__icon", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuLaptop, { size: 20, "aria-hidden": "true" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machine__body", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machine__title-row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: machine.name }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machine__title-actions", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "desktop-machine__badge", children: online ? t("settings.machines.connected", "\u5DF2\u8FDE\u63A5") : tone === "warning" ? t("settings.machines.onlineNoWs", "\u7535\u8111\u5728\u7EBF\uFF0C\u7B49\u5F85\u4EFB\u52A1\u901A\u9053") : t("settings.machines.offline", "\u79BB\u7EBF") }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  Button_default,
                  {
                    variant: "secondary",
                    icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuTrash2, { "aria-hidden": "true" }),
                    loading: disconnectingMachineId === machine.machineId,
                    onClick: () => void disconnectMachine(machine),
                    children: t("settings.machines.disconnect", "\u79FB\u9664")
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machine__meta", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                machine.platform,
                "/",
                machine.arch
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                t("settings.machines.lastSeen", "\u6700\u8FD1"),
                " ",
                formatRelativeSeen(machine.lastSeenAt)
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machine__connection", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
            online ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuCircleCheck, { "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuCircleX, { "aria-hidden": "true" }),
            online ? t("settings.machines.computerReachable", "\u7535\u8111\u5728\u7EBF") : t("settings.machines.computerOffline", "\u7535\u8111\u79BB\u7EBF")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
            connected ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuCircleCheck, { "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuClock, { "aria-hidden": "true" }),
            connected ? t("settings.machines.readyForTasks", "\u53EF\u63A5\u6536\u4EFB\u52A1") : t("settings.machines.waitingForDaemon", "\u7B49\u5F85\u540E\u53F0\u8FDE\u63A5")
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "desktop-machine__agents", children: CLI_CAPABILITIES.map((capability) => {
          const available = machine.capabilities.includes(capability.key);
          const smokeKey = `${machine.machineId}:${capability.provider}`;
          const isRunning = smokeState?.key === smokeKey && smokeState.status === "running";
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "div",
            {
              className: `desktop-machine-agent ${available ? "desktop-machine-agent--available" : "desktop-machine-agent--missing"}`,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machine-agent__main", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machine-agent__label", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuTerminal, { "aria-hidden": "true" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: capability.label })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: available ? t(
                    `settings.machines.cliHelp`,
                    "\u4F7F\u7528\u8FD9\u53F0\u7535\u8111\u4E0A\u7684 {{label}} CLI \u6267\u884C\u4EFB\u52A1\u3002",
                    { label: capability.label }
                  ) : t("settings.machines.cliMissing", "\u8FD9\u53F0\u7535\u8111\u8FD8\u6CA1\u6709\u68C0\u6D4B\u5230\u8FD9\u4E2A CLI\u3002") })
                ] }),
                available && connected ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "desktop-machine-agent__actions", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    Button_default,
                    {
                      variant: "primary",
                      icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuArrowRight, { "aria-hidden": "true" }),
                      onClick: () => openAgentCreateForm(machine, capability.provider),
                      children: t("settings.machines.createAgent", "\u521B\u5EFA AI")
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    Button_default,
                    {
                      variant: "secondary",
                      icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuPlay, { "aria-hidden": "true" }),
                      loading: isRunning,
                      onClick: () => void runMachineSmoke(machine.machineId, capability.provider),
                      children: t("settings.machines.testCli", "\u6D4B\u8BD5")
                    }
                  )
                ] }) : null
              ]
            },
            capability.key
          );
        }) }),
        connected && availableCapabilities.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "desktop-machine__hint", children: t("settings.machines.noCliHint", "\u8FD9\u53F0\u7535\u8111\u5DF2\u8FDE\u63A5\uFF0C\u4F46\u8FD8\u6CA1\u6709\u68C0\u6D4B\u5230 Codex\u3001Copilot\u3001Claude\u3001Qoder \u6216 Gemini\u3002\u5B89\u88C5 CLI \u540E\u91CD\u542F\u8FDE\u63A5\u811A\u672C\u5373\u53EF\u81EA\u52A8\u8BC6\u522B\u3002") }) : null,
        smokeState?.key.startsWith(`${machine.machineId}:`) ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: `desktop-machine__smoke-result desktop-machine__smoke-result--${smokeState.status}`, children: [
          smokeState.status === "success" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuCircleCheck, { "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuCircleX, { "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: smokeState.message })
        ] }) : null
      ] }, machine.machineId);
    }) })
  ] });
};
var DesktopMachines_default = DesktopMachines;
export {
  DesktopMachines_default as default
};
