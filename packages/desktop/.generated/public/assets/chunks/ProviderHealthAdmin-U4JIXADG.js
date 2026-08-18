import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  useToken
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectRemoteServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuActivity,
  LuRefreshCw
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
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

// packages/app/pages/ProviderHealthAdmin.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var formatPercent = (value) => `${Math.round(value * 100)}%`;
var formatLatency = (value) => value == null ? "-" : `${value}ms`;
var formatRateLimitHeaders = (attempts) => {
  const entries = attempts.flatMap(
    (attempt) => Object.entries(attempt.rateLimitHeaders ?? {})
  );
  if (!entries.length) return "-";
  return entries.map(([key, value]) => `${key}: ${value}`).join(" / ");
};
var statusText = (item) => {
  if (!item.keyConfigured) return "\u672A\u914D\u7F6E";
  if (!item.summary.total) return "\u672A\u6D4B\u8BD5";
  if (item.summary.successRate === 1) return "\u6B63\u5E38";
  if (item.summary.successRate > 0) return "\u4E0D\u7A33\u5B9A";
  return "\u5931\u8D25";
};
var statusClass = (item) => {
  if (!item.keyConfigured) return "is-muted";
  if (item.summary.successRate === 1) return "is-ok";
  if (item.summary.successRate > 0) return "is-warn";
  return "is-error";
};
function ProviderHealthAdmin() {
  const currentServer = useAppSelector(selectRemoteServer);
  const currentToken = useToken();
  const [data, setData] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const endpoint = (0, import_react.useMemo)(
    () => `${String(currentServer || "").replace(/\/+$/, "")}/api/admin/provider-health?attempts=3`,
    [currentServer]
  );
  const load = (0, import_react.useCallback)(async () => {
    if (!currentServer || !currentToken) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message || payload?.error || `HTTP ${response.status}`);
      }
      setData(payload);
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [currentServer, currentToken, endpoint]);
  (0, import_react.useEffect)(() => {
    void load();
  }, [load]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "provider-health-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "provider-health-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "provider-health-title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuActivity, { size: 22, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "\u6A21\u578B\u63D0\u4F9B\u5546" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u6309\u5F53\u524D\u670D\u52A1\u5668\u5BC6\u94A5\u63A2\u6D4B\u6A21\u578B\u4F9B\u5E94\u5546\u7684\u6210\u529F\u7387\u3001\u5EF6\u8FDF\u548C\u9650\u6D41\u4FE1\u53F7\u3002" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button_default, { onClick: load, disabled: loading, variant: "secondary", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuRefreshCw, { size: 16, "aria-hidden": "true" }),
        loading ? "\u68C0\u6D4B\u4E2D" : "\u91CD\u65B0\u68C0\u6D4B"
      ] })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "provider-health-error", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "provider-health-meta", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        "\u670D\u52A1\u5668\uFF1A",
        currentServer || "-"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        "\u5C1D\u8BD5\u6B21\u6570\uFF1A",
        data?.attempts ?? 3
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        "\u66F4\u65B0\u65F6\u95F4\uFF1A",
        data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "-"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "provider-health-grid", children: (data?.providers ?? []).map((provider) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "provider-health-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "provider-health-card-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: provider.provider }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: provider.model })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `provider-health-badge ${statusClass(provider)}`, children: statusText(provider) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "provider-health-metrics", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u6210\u529F\u7387" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatPercent(provider.summary.successRate) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u5E73\u5747\u5EF6\u8FDF" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatLatency(provider.summary.avgLatencyMs) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u6700\u5927\u5EF6\u8FDF" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatLatency(provider.summary.maxLatencyMs) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "HTTP \u72B6\u6001" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: Object.entries(provider.summary.statusCounts).map(([key, value]) => `${key}:${value}`).join(" ") || "-" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u9650\u6D41\u4FE1\u53F7" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatRateLimitHeaders(provider.attempts) })
        ] })
      ] }),
      provider.summary.lastError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "provider-health-last-error", children: provider.summary.lastError }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "provider-health-attempts", children: provider.attempts.map((attempt, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "provider-health-attempt", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: index + 1 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: attempt.ok ? "OK" : "FAIL" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: attempt.status ?? "-" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          attempt.latencyMs,
          "ms"
        ] })
      ] }, `${provider.provider}-${index}`)) })
    ] }, provider.provider)) })
  ] });
}
export {
  ProviderHealthAdmin as default
};
