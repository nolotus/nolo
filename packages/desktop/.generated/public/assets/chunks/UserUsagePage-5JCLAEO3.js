import {
  ADMIN_PAGE_PATHS,
  canAccessSystemAdminPage,
  canAccessUsageManagementPage
} from "/public/assets/chunks/chunk-4BEOT5EM.js";
import "/public/assets/chunks/chunk-HWC2ZOVH.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  useAuth
} from "/public/assets/chunks/chunk-WT5G4HGZ.js";
import "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  NavLink
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  authRoutes,
  selectCurrentToken,
  selectRemoteServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
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
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/auth/web/UserUsagePage.tsx
var import_react = __toESM(require_react(), 1);

// packages/auth/web/UserAdminNav.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
function UserAdminNav() {
  const { user } = useAuth();
  const canManageUsers = canAccessSystemAdminPage(user?.userId);
  const canManageUsage = canAccessUsageManagementPage(user);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", { className: "user-admin-nav", "aria-label": "\u7528\u6237\u7BA1\u7406\u5207\u6362", children: [
    canManageUsers && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      NavLink,
      {
        to: ADMIN_PAGE_PATHS.users,
        end: true,
        className: ({ isActive }) => `user-admin-nav__link${isActive ? " user-admin-nav__link--active" : ""}`,
        children: "\u7528\u6237\u7BA1\u7406"
      }
    ),
    canManageUsage && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      NavLink,
      {
        to: ADMIN_PAGE_PATHS.usageManagement,
        className: ({ isActive }) => `user-admin-nav__link${isActive ? " user-admin-nav__link--active" : ""}`,
        children: "\u7528\u91CF\u7BA1\u7406"
      }
    )
  ] });
}

// packages/auth/web/UserUsagePage.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var PRESETS = [
  { value: "1", label: "\u4ECA\u5929" },
  { value: "7", label: "7\u5929" },
  { value: "30", label: "\u6708" },
  { value: "90", label: "\u5B63" },
  { value: "365", label: "\u5E74" },
  { value: "custom", label: "\u81EA\u5B9A\u4E49" }
];
var GROUPS = [
  { value: "user", label: "\u7528\u6237" },
  { value: "dialog", label: "\u5BF9\u8BDD" },
  { value: "agent", label: "Agent" },
  { value: "model", label: "\u6A21\u578B" },
  { value: "provider", label: "\u4F9B\u5E94\u5546" },
  { value: "day", label: "\u6BCF\u65E5" }
];
var pad2 = (value) => String(value).padStart(2, "0");
var toDateInput = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
var startOfLocalDay = (dateKey) => (/* @__PURE__ */ new Date(`${dateKey}T00:00:00`)).getTime();
var endOfLocalDay = (dateKey) => (/* @__PURE__ */ new Date(`${dateKey}T23:59:59.999`)).getTime();
var numberFormatter = new Intl.NumberFormat("zh-CN");
var creditsFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6
});
var usdFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 6
});
var percentFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});
var dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
});
var formatNumber = (value) => numberFormatter.format(value);
var formatCredits = (value) => creditsFormatter.format(value);
var formatUsd = (value) => usdFormatter.format(value);
var formatPercent = (ratio) => `${percentFormatter.format(Math.round(ratio * 1e4) / 100)}%`;
var formatDateTime = (value) => {
  if (!value) return "\u672A\u8BBE\u7F6E";
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return value;
  return dateTimeFormatter.format(new Date(time));
};
var credentialStatusLabel = (status) => {
  if (status === "active") return "\u542F\u7528";
  if (status === "rotating") return "\u8F6E\u6362\u4E2D";
  return "\u5DF2\u64A4\u9500";
};
var anomalyStatusLabel = (status) => {
  if (status === "acknowledged") return "\u786E\u8BA4";
  if (status === "resolved") return "\u89E3\u51B3";
  return "\u5FFD\u7565";
};
var anomalySeverityTone = (severity) => {
  const normalized = asTrimmedLowercaseString(severity);
  if (normalized === "critical" || normalized === "high" || normalized === "error" || normalized === "danger" || normalized === "sev1" || normalized === "p0" || normalized === "p1") {
    return "danger";
  }
  if (normalized === "medium" || normalized === "warning" || normalized === "warn" || normalized === "sev2" || normalized === "p2") {
    return "warning";
  }
  return "info";
};
var EMPTY_LOADING = "\u52A0\u8F7D\u4E2D...";
var EMPTY_NO_DATA = "\u5F53\u524D\u8303\u56F4\u6682\u65E0\u6570\u636E";
var groupKey = (row, tab) => {
  if (tab === "user") return row.userId || "unknown";
  if (tab === "dialog") return row.dialogId || "unknown";
  if (tab === "agent") return row.cybotId || "unknown";
  if (tab === "model") return row.model || "unknown";
  if (tab === "provider") return row.provider || "unknown";
  return row.dateKey || "unknown";
};
function UserUsagePage() {
  const currentServer = useAppSelector(selectRemoteServer);
  const currentToken = useAppSelector(selectCurrentToken);
  const today = (0, import_react.useMemo)(() => toDateInput(/* @__PURE__ */ new Date()), []);
  const [preset, setPreset] = (0, import_react.useState)("7");
  const [groupTab, setGroupTab] = (0, import_react.useState)("user");
  const [startDate, setStartDate] = (0, import_react.useState)(today);
  const [endDate, setEndDate] = (0, import_react.useState)(today);
  const [report, setReport] = (0, import_react.useState)(null);
  const [healthReport, setHealthReport] = (0, import_react.useState)(null);
  const [providerCredentials, setProviderCredentials] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [healthError, setHealthError] = (0, import_react.useState)(null);
  const [credentialError, setCredentialError] = (0, import_react.useState)(null);
  const [credentialUpdatingId, setCredentialUpdatingId] = (0, import_react.useState)(
    null
  );
  const [anomalyUpdatingId, setAnomalyUpdatingId] = (0, import_react.useState)(null);
  const [selectedBucketId, setSelectedBucketId] = (0, import_react.useState)(null);
  const [drilldown, setDrilldown] = (0, import_react.useState)(null);
  const [drilldownLoading, setDrilldownLoading] = (0, import_react.useState)(false);
  const [drilldownError, setDrilldownError] = (0, import_react.useState)(null);
  const [selectedAnomalyId, setSelectedAnomalyId] = (0, import_react.useState)(null);
  const [anomalyDrilldown, setAnomalyDrilldown] = (0, import_react.useState)(null);
  const [anomalyDrilldownLoading, setAnomalyDrilldownLoading] = (0, import_react.useState)(false);
  const [anomalyDrilldownError, setAnomalyDrilldownError] = (0, import_react.useState)(
    null
  );
  const rows = (0, import_react.useMemo)(() => {
    if (!report) return [];
    if (groupTab === "user") return report.byUser;
    if (groupTab === "dialog") return report.byDialog;
    if (groupTab === "agent") return report.byAgent;
    if (groupTab === "model") return report.byModel;
    if (groupTab === "provider") return report.byProvider;
    return report.byDay;
  }, [groupTab, report]);
  const providerAccountRows = (0, import_react.useMemo)(() => {
    const accountRows = Object.values(healthReport?.byProviderAccount ?? {});
    return accountRows.sort(
      (left, right) => right.rawProviderCostUsd - left.rawProviderCostUsd
    );
  }, [healthReport]);
  const fetchReport = (0, import_react.useCallback)(async () => {
    if (!currentServer || !currentToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (preset === "custom") {
        params.set("since", String(startOfLocalDay(startDate)));
        params.set("until", String(endOfLocalDay(endDate)));
      } else if (preset === "1") {
        params.set("since", String(startOfLocalDay(today)));
        params.set("until", String(endOfLocalDay(today)));
      } else {
        params.set("sinceDays", preset);
      }
      const response = await fetch(
        `${currentServer}${authRoutes.users.usageReport.createPath()}?${params}`,
        {
          method: authRoutes.users.usageReport.method,
          headers: { Authorization: `Bearer ${currentToken}` }
        }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.success) {
        setError(body?.error || "\u52A0\u8F7D\u7528\u91CF\u5931\u8D25");
        setReport(null);
        return;
      }
      setReport(body.report);
      const healthResponse = await fetch(
        `${currentServer}${authRoutes.users.providerBillingHealth.createPath()}?${params}&limit=10`,
        {
          method: authRoutes.users.providerBillingHealth.method,
          headers: { Authorization: `Bearer ${currentToken}` }
        }
      );
      const healthBody = await healthResponse.json().catch(() => ({}));
      if (!healthResponse.ok || !healthBody?.success) {
        setHealthError(healthBody?.error || "\u52A0\u8F7D\u5BF9\u8D26\u5065\u5EB7\u5931\u8D25");
        setHealthReport(null);
        return;
      }
      setHealthError(null);
      setHealthReport(healthBody.report);
      setSelectedBucketId(null);
      setDrilldown(null);
      setSelectedAnomalyId(null);
      setAnomalyDrilldown(null);
      try {
        const credentialResponse = await fetch(
          `${currentServer}${authRoutes.users.providerCredentials.createPath()}`,
          {
            method: authRoutes.users.providerCredentials.method,
            headers: { Authorization: `Bearer ${currentToken}` }
          }
        );
        const credentialBody = await credentialResponse.json().catch(() => ({}));
        if (!credentialResponse.ok || !credentialBody?.success) {
          setCredentialError(credentialBody?.error || "\u52A0\u8F7D Provider Key \u5931\u8D25");
          setProviderCredentials([]);
          return;
        }
        setCredentialError(null);
        setProviderCredentials(credentialBody.credentials ?? []);
      } catch {
        setCredentialError("\u52A0\u8F7D Provider Key \u5931\u8D25");
        setProviderCredentials([]);
      }
    } catch {
      setError("\u52A0\u8F7D\u7528\u91CF\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5");
      setReport(null);
      setHealthReport(null);
      setProviderCredentials([]);
      setSelectedAnomalyId(null);
      setAnomalyDrilldown(null);
    } finally {
      setLoading(false);
    }
  }, [currentServer, currentToken, endDate, preset, startDate, today]);
  const fetchDrilldown = (0, import_react.useCallback)(
    async (bucketId) => {
      if (!currentServer || !currentToken) return;
      setSelectedBucketId(bucketId);
      setDrilldownLoading(true);
      setDrilldownError(null);
      try {
        const params = new URLSearchParams({ bucketId, limit: "30" });
        const response = await fetch(
          `${currentServer}${authRoutes.users.providerBillingDrilldown.createPath()}?${params}`,
          {
            method: authRoutes.users.providerBillingDrilldown.method,
            headers: { Authorization: `Bearer ${currentToken}` }
          }
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body?.success) {
          setDrilldownError(body?.error || "\u52A0\u8F7D\u5BF9\u8D26\u660E\u7EC6\u5931\u8D25");
          setDrilldown(null);
          return;
        }
        setDrilldown(body.drilldown);
      } catch {
        setDrilldownError("\u52A0\u8F7D\u5BF9\u8D26\u660E\u7EC6\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5");
        setDrilldown(null);
      } finally {
        setDrilldownLoading(false);
      }
    },
    [currentServer, currentToken]
  );
  const updateProviderCredentialStatus = (0, import_react.useCallback)(
    async (credential, status) => {
      if (!currentServer || !currentToken) return;
      if (credential.status === status) return;
      if (status === "revoked" && !window.confirm(
        `\u786E\u8BA4\u64A4\u9500 ${credential.providerAccountAlias || credential.providerAccountKey}\uFF1F\u64A4\u9500\u540E\u5BF9\u5E94 Key \u4F1A\u88AB\u963B\u65AD\u3002`
      )) {
        return;
      }
      setCredentialUpdatingId(credential.credentialId);
      setCredentialError(null);
      try {
        const response = await fetch(
          `${currentServer}${authRoutes.users.providerCredentialLifecycle.createPath()}`,
          {
            method: authRoutes.users.providerCredentialLifecycle.method,
            headers: {
              Authorization: `Bearer ${currentToken}`,
              "content-type": "application/json"
            },
            body: JSON.stringify({
              credentialId: credential.credentialId,
              status,
              reason: `usage-management-ui:${status}`
            })
          }
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body?.success) {
          setCredentialError(body?.error || "\u66F4\u65B0 Provider Key \u72B6\u6001\u5931\u8D25");
          return;
        }
        await fetchReport();
      } catch {
        setCredentialError("\u66F4\u65B0 Provider Key \u72B6\u6001\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5");
      } finally {
        setCredentialUpdatingId(null);
      }
    },
    [currentServer, currentToken, fetchReport]
  );
  const fetchBillingAnomalyDrilldown = (0, import_react.useCallback)(
    async (anomalyId) => {
      if (!currentServer || !currentToken) return;
      setSelectedAnomalyId(anomalyId);
      setAnomalyDrilldownLoading(true);
      setAnomalyDrilldownError(null);
      try {
        const params = new URLSearchParams({ anomalyId, limit: "30" });
        const response = await fetch(
          `${currentServer}${authRoutes.users.billingAnomalyDrilldown.createPath()}?${params}`,
          {
            method: authRoutes.users.billingAnomalyDrilldown.method,
            headers: { Authorization: `Bearer ${currentToken}` }
          }
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body?.success) {
          setAnomalyDrilldownError(body?.error || "\u52A0\u8F7D Anomaly \u660E\u7EC6\u5931\u8D25");
          setAnomalyDrilldown(null);
          return;
        }
        setAnomalyDrilldown(body.drilldown);
      } catch {
        setAnomalyDrilldownError("\u52A0\u8F7D Anomaly \u660E\u7EC6\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5");
        setAnomalyDrilldown(null);
      } finally {
        setAnomalyDrilldownLoading(false);
      }
    },
    [currentServer, currentToken]
  );
  const updateBillingAnomalyStatus = (0, import_react.useCallback)(
    async (anomaly, status) => {
      if (!currentServer || !currentToken) return;
      if (status !== "acknowledged" && !window.confirm(
        `\u786E\u8BA4\u5C06 ${anomaly.id} \u6807\u8BB0\u4E3A${anomalyStatusLabel(status)}\uFF1F\u8FD9\u53EA\u5199\u5165\u5F02\u5E38\u751F\u547D\u5468\u671F\u4E8B\u4EF6\uFF0C\u4E0D\u4F1A\u8865\u6263\u3001\u51B2\u6B63\u6216\u4FEE\u6539\u4F59\u989D\u3002`
      )) {
        return;
      }
      setAnomalyUpdatingId(anomaly.id);
      setHealthError(null);
      try {
        const response = await fetch(
          `${currentServer}${authRoutes.users.billingAnomalyLifecycle.createPath()}`,
          {
            method: authRoutes.users.billingAnomalyLifecycle.method,
            headers: {
              Authorization: `Bearer ${currentToken}`,
              "content-type": "application/json"
            },
            body: JSON.stringify({
              anomalyId: anomaly.id,
              status,
              reason: `usage-management-ui:${status}`
            })
          }
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body?.success) {
          setHealthError(body?.error || "\u66F4\u65B0 Billing Anomaly \u72B6\u6001\u5931\u8D25");
          return;
        }
        await fetchReport();
      } catch {
        setHealthError("\u66F4\u65B0 Billing Anomaly \u72B6\u6001\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5");
      } finally {
        setAnomalyUpdatingId(null);
      }
    },
    [currentServer, currentToken, fetchReport]
  );
  (0, import_react.useEffect)(() => {
    void fetchReport();
  }, [fetchReport]);
  const openAnomalyCount = healthReport?.summary.openAnomalyCount ?? 0;
  const hasOpenAnomalies = openAnomalyCount > 0;
  if (!currentServer) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "no-server-container", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "no-server-content", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: "\u672A\u9009\u62E9\u670D\u52A1\u5668" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u8BF7\u5148\u9009\u62E9\u670D\u52A1\u5668\u4EE5\u67E5\u770B\u7528\u91CF" })
    ] }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "users-page usage-management-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(UserAdminNav, {}),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "page-header usage-management-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "header-left", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { className: "page-title", children: "\u7528\u91CF\u7BA1\u7406" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "title-decoration" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "usage-filters", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-segment", "aria-label": "\u65F6\u95F4\u8303\u56F4", children: PRESETS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: `usage-segment__button${preset === item.value ? " usage-segment__button--active" : ""}`,
            onClick: () => setPreset(item.value),
            children: item.label
          },
          item.value
        )) }),
        preset === "custom" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "usage-date-range", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "input",
            {
              type: "date",
              value: startDate,
              max: endDate,
              onChange: (event) => setStartDate(event.target.value),
              "aria-label": "\u5F00\u59CB\u65E5\u671F"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u81F3" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "input",
            {
              type: "date",
              value: endDate,
              min: startDate,
              onChange: (event) => setEndDate(event.target.value),
              "aria-label": "\u7ED3\u675F\u65E5\u671F"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { onClick: () => void fetchReport(), size: "small", variant: "secondary", children: "\u5237\u65B0" })
      ] })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-error", children: error }),
    healthError && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-error", children: healthError }),
    credentialError && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-error", children: credentialError }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "usage-summary-grid user-usage-summary", "aria-label": "\u7528\u91CF\u6458\u8981", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "usage-summary-item usage-summary-item--primary", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
          "\u603B\u6D88\u8017",
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("em", { className: "user-usage-unit", children: "\u79EF\u5206" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatCredits(report?.summary.totalCost ?? 0) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "usage-summary-item usage-summary-item--primary", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
          "\u8BB0\u5F55\u6570",
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("em", { className: "user-usage-unit", children: "\u6761" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatNumber(report?.summary.recordsInWindow ?? 0) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "usage-summary-item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
          "\u8F93\u5165 Token",
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("em", { className: "user-usage-unit", children: "tokens" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatNumber(report?.summary.inputTokens ?? 0) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "usage-summary-item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
          "\u8F93\u51FA Token",
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("em", { className: "user-usage-unit", children: "tokens" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatNumber(report?.summary.outputTokens ?? 0) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "usage-summary-item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
          "\u6807\u9898\u6D88\u8017",
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("em", { className: "user-usage-unit", children: "\u79EF\u5206" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatCredits(report?.summary.titleCost ?? 0) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "section",
      {
        className: `usage-panel provider-health-panel${hasOpenAnomalies ? " provider-health-panel--has-anomalies" : ""}`,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "usage-panel__toolbar", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "provider-health-title", children: "Provider \u5BF9\u8D26\u5065\u5EB7" }) }),
            hasOpenAnomalies && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "user-usage-open-badge", title: "\u672A\u5173\u95ED\u5F02\u5E38\u4F18\u5148\u5904\u7406", children: [
              "Open ",
              formatNumber(openAnomalyCount)
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-health-summary", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-health-metric", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u5BF9\u8D26\u6876" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatNumber(healthReport?.summary.bucketCount ?? 0) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "div",
              {
                className: `provider-health-metric${hasOpenAnomalies ? " provider-health-metric--alert" : ""}`,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "Open Anomaly" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatNumber(openAnomalyCount) })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-health-metric", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u5B98\u65B9\u6210\u672C" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatUsd(healthReport?.summary.totalOfficialRawProviderCostUsd ?? 0) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-health-metric", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u672C\u5730\u6210\u672C" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatUsd(healthReport?.summary.totalLocalRawProviderCostUsd ?? 0) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-health-metric", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u7EDD\u5BF9\u5DEE\u989D" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatUsd(healthReport?.summary.absoluteRawProviderCostDiffUsd ?? 0) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-health-metric", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u98CE\u9669\u79EF\u5206" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatCredits(healthReport?.summary.riskPlatformCredits ?? 0) })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "div",
            {
              className: `billing-anomaly-workbench${hasOpenAnomalies ? " billing-anomaly-workbench--active" : ""}`,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "billing-anomaly-workbench__header", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: "Billing Anomaly \u5DE5\u4F5C\u53F0" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "billing-anomaly-status-counts", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                      "span",
                      {
                        className: hasOpenAnomalies ? "billing-anomaly-status-counts__open" : void 0,
                        children: [
                          "Open ",
                          formatNumber(openAnomalyCount)
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                      "Ack",
                      " ",
                      formatNumber(healthReport?.anomalyStatusCounts?.acknowledged ?? 0)
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                      "Resolved",
                      " ",
                      formatNumber(healthReport?.anomalyStatusCounts?.resolved ?? 0)
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                      "Ignored",
                      " ",
                      formatNumber(healthReport?.anomalyStatusCounts?.ignored ?? 0)
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-table-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("table", { className: "usage-table billing-anomaly-table", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u7EA7\u522B" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u7C7B\u578B" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "Provider" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u6A21\u578B" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { className: "usage-table__num", children: "\u98CE\u9669\u79EF\u5206" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u4FE1\u606F" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u64CD\u4F5C" })
                  ] }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tbody", { children: loading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { colSpan: 7, className: "usage-table__empty", children: EMPTY_LOADING }) }) : (healthReport?.openAnomalies.length ?? 0) === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { colSpan: 7, className: "usage-table__empty", children: EMPTY_NO_DATA }) }) : healthReport?.openAnomalies.slice(0, 12).map((anomaly) => {
                    const severityTone = anomalySeverityTone(anomaly.severity);
                    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                        "span",
                        {
                          className: `billing-anomaly-severity billing-anomaly-severity--${severityTone}`,
                          children: anomaly.severity
                        }
                      ) }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { title: anomaly.kind, children: anomaly.kind }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: anomaly.provider }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                        "td",
                        {
                          className: "usage-table__key",
                          title: anomaly.model,
                          children: anomaly.model
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__num", children: formatCredits(anomaly.riskPlatformCredits ?? 0) }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("td", { className: "billing-anomaly-message", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { className: "usage-table__key", title: anomaly.id, children: anomaly.id }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { title: anomaly.message, children: anomaly.message })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "billing-anomaly-actions", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          Button_default,
                          {
                            size: "small",
                            variant: "secondary",
                            disabled: anomalyDrilldownLoading,
                            onClick: () => void fetchBillingAnomalyDrilldown(anomaly.id),
                            children: "\u660E\u7EC6"
                          }
                        ),
                        ["acknowledged", "resolved", "ignored"].map((status) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          Button_default,
                          {
                            size: "small",
                            variant: status === "ignored" ? "danger" : "secondary",
                            disabled: anomalyUpdatingId === anomaly.id,
                            onClick: () => void updateBillingAnomalyStatus(
                              anomaly,
                              status
                            ),
                            children: anomalyStatusLabel(status)
                          },
                          status
                        ))
                      ] }) })
                    ] }, anomaly.id);
                  }) })
                ] }) }),
                (selectedAnomalyId || anomalyDrilldownError) && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "billing-anomaly-drilldown", children: anomalyDrilldownLoading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "provider-drilldown__empty", children: "\u52A0\u8F7D Anomaly \u660E\u7EC6..." }) : anomalyDrilldownError ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "provider-drilldown__error", children: anomalyDrilldownError }) : anomalyDrilldown ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "billing-anomaly-drilldown__summary", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "Dry-run" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: anomalyDrilldown.repairDryRun.recommendedAction })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u5F71\u54CD\u7528\u6237" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatNumber(
                        anomalyDrilldown.repairDryRun.affectedUserCount
                      ) })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "Provider Call" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatNumber(
                        anomalyDrilldown.repairDryRun.providerCallCount
                      ) })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u9884\u8BA1\u79EF\u5206" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatCredits(
                        anomalyDrilldown.repairDryRun.estimatedPlatformCredits
                      ) })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u53EF\u6267\u884C" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: anomalyDrilldown.repairDryRun.executable ? "\u662F" : "\u5426" })
                    ] })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "billing-anomaly-drilldown__chain", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-drilldown__item", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: anomalyDrilldown.anomaly.id }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                        anomalyDrilldown.anomaly.provider,
                        " \xB7",
                        " ",
                        anomalyDrilldown.anomaly.model
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: anomalyDrilldown.anomaly.message })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-drilldown__item", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: "\u8BC1\u636E\u94FE" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                        "Bucket:",
                        " ",
                        anomalyDrilldown.evidenceChain.bucketId || "none"
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                        "Provider Call:",
                        " ",
                        formatNumber(
                          anomalyDrilldown.evidenceChain.providerCallIds.length
                        )
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                        "Rating / Ledger:",
                        " ",
                        formatNumber(
                          anomalyDrilldown.evidenceChain.ratingResultIds.length
                        ),
                        " ",
                        "/",
                        " ",
                        formatNumber(
                          anomalyDrilldown.evidenceChain.ledgerTransactionKeys.length
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-drilldown__item", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: "Input Set" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: anomalyDrilldown.repairDryRun.inputSetHash }),
                      anomalyDrilldown.repairDryRun.notes.map((note) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: note }, note))
                    ] })
                  ] })
                ] }) : null })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-account-health", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: "Provider Account \u82B1\u8D39\u5F52\u8D26" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-table-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("table", { className: "usage-table provider-account-health-table", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "Provider" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u8D26\u53F7" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u8D26\u5355\u8D26\u53F7" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u73AF\u5883" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { className: "usage-table__num", children: "\u8BF7\u6C42\u6570" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { className: "usage-table__num", children: "\u8F93\u5165 Token" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { className: "usage-table__num", children: "\u8F93\u51FA Token" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { className: "usage-table__num", children: "Provider USD" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { className: "usage-table__num", children: "\u5E73\u53F0\u79EF\u5206" })
              ] }) }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tbody", { children: loading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { colSpan: 9, className: "usage-table__empty", children: EMPTY_LOADING }) }) : providerAccountRows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { colSpan: 9, className: "usage-table__empty", children: EMPTY_NO_DATA }) }) : providerAccountRows.slice(0, 100).map((row) => {
                const accountLabel = row.providerAccountAlias || row.providerAccountKey;
                const billingId = row.officialBillingAccountId || "\u672A\u8BBE\u7F6E";
                return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: row.provider }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-credential-account", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { title: accountLabel, children: accountLabel }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                      "span",
                      {
                        className: "usage-table__key",
                        title: row.providerAccountKey,
                        children: row.providerAccountKey
                      }
                    )
                  ] }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__key", title: billingId, children: billingId }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: row.environment || "\u672A\u8BBE\u7F6E" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__num", children: formatNumber(row.requestCount) }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__num", children: formatNumber(row.inputTokens) }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__num", children: formatNumber(row.outputTokens) }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__num", children: formatUsd(row.rawProviderCostUsd) }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__num", children: formatCredits(row.platformCredits) })
                ] }, `${row.provider}:${row.providerAccountKey}`);
              }) })
            ] }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-table-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("table", { className: "usage-table provider-health-table", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "Provider" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u6A21\u578B" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u72B6\u6001" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { className: "usage-table__num", children: "\u5DEE\u989D" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { className: "usage-table__num", children: "\u7EDD\u5BF9\u5DEE\u989D" })
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tbody", { children: loading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { colSpan: 5, className: "usage-table__empty", children: EMPTY_LOADING }) }) : (healthReport?.topBuckets.length ?? 0) === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { colSpan: 5, className: "usage-table__empty", children: EMPTY_NO_DATA }) }) : healthReport?.topBuckets.map((bucket) => {
              const modelLabel = bucket.model || "all-models";
              const openDrilldown = () => void fetchDrilldown(bucket.id);
              return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "tr",
                {
                  className: selectedBucketId === bucket.id ? "provider-health-row--active" : "",
                  tabIndex: 0,
                  "aria-selected": selectedBucketId === bucket.id,
                  "aria-label": `\u67E5\u770B ${bucket.provider} ${modelLabel} \u5BF9\u8D26\u660E\u7EC6`,
                  onClick: openDrilldown,
                  onKeyDown: (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDrilldown();
                    }
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: bucket.provider }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__key", title: modelLabel, children: modelLabel }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: bucket.status }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__num", children: formatUsd(bucket.diff.rawProviderCostUsd) }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__num", children: formatUsd(bucket.diff.absoluteRawProviderCostUsd) })
                  ]
                },
                bucket.id
              );
            }) })
          ] }) }),
          (selectedBucketId || drilldownError) && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "provider-drilldown", children: drilldownLoading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "provider-drilldown__empty", children: "\u52A0\u8F7D\u5BF9\u8D26\u660E\u7EC6..." }) : drilldownError ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "provider-drilldown__error", children: drilldownError }) : drilldown ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-drilldown__summary", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "Provider Call" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatNumber(drilldown.summary.providerCallCount) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "Billable Event" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatNumber(drilldown.summary.billableEventCount) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "Rating" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatNumber(drilldown.summary.ratingResultCount) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "Token Record" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatNumber(drilldown.summary.tokenRecordCount) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "Ledger Tx" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: formatNumber(drilldown.summary.ledgerTransactionCount) })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-drilldown__item", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: "\u5339\u914D\u6A21\u5F0F" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: drilldown.matchMode }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                "\u5B98\u65B9\u8BF7\u6C42 ",
                formatNumber(drilldown.officialRequestIds.length)
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                "\u672A\u5339\u914D\u5B98\u65B9\u8BF7\u6C42",
                " ",
                formatNumber(drilldown.unmatchedOfficialRequestIds.length)
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-drilldown__columns", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: "Provider Calls" }),
                drilldown.providerCalls.slice(0, 8).map((call) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-drilldown__item", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { className: "usage-table__key", title: call.providerCallId, children: call.providerCallId }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { title: `${call.userId} \xB7 ${call.dialogId || "no-dialog"}`, children: [
                    call.userId,
                    " \xB7 ",
                    call.dialogId || "no-dialog"
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                    formatNumber(call.usage.inputTokens),
                    " / ",
                    formatNumber(call.usage.outputTokens),
                    " token"
                  ] })
                ] }, call.providerCallId))
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: "Token Records" }),
                drilldown.tokenRecords.slice(0, 8).map((record) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-drilldown__item", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { className: "usage-table__key", title: record.key, children: record.key }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { title: `${record.userId || "unknown"} \xB7 ${record.dialogId || "no-dialog"}`, children: [
                    record.userId || "unknown",
                    " \xB7 ",
                    record.dialogId || "no-dialog"
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                    formatCredits(record.cost),
                    " credits"
                  ] })
                ] }, record.key))
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: "Ledger" }),
                drilldown.ledgerTransactions.slice(0, 8).map((tx) => {
                  const ledgerLabel = tx.txId || tx.key;
                  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-drilldown__item", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { className: "usage-table__key", title: ledgerLabel, children: ledgerLabel }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { title: tx.idempotencyKey || "no-idempotency-key", children: tx.idempotencyKey || "no-idempotency-key" })
                  ] }, tx.key);
                })
              ] })
            ] })
          ] }) : null })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "usage-panel provider-credentials-panel", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-panel__toolbar", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "provider-health-title", children: "Provider Key \u8D26\u52A1\u8EAB\u4EFD" }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-table-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("table", { className: "usage-table provider-credentials-table", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "Provider" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u8D26\u53F7" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u73AF\u5883" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u6765\u6E90" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u72B6\u6001" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u751F\u6548" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u8D26\u5355\u8D26\u53F7" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u64CD\u4F5C" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tbody", { children: loading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { colSpan: 8, className: "usage-table__empty", children: EMPTY_LOADING }) }) : providerCredentials.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { colSpan: 8, className: "usage-table__empty", children: EMPTY_NO_DATA }) }) : providerCredentials.slice(0, 100).map((credential) => {
          const accountLabel = credential.providerAccountAlias || credential.providerAccountKey;
          const billingId = credential.officialBillingAccountId || "\u672A\u8BBE\u7F6E";
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: credential.provider }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-credential-account", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { title: accountLabel, children: accountLabel }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "span",
                {
                  className: "usage-table__key",
                  title: credential.providerAccountKey,
                  children: credential.providerAccountKey
                }
              )
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: credential.environment || "\u672A\u8BBE\u7F6E" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { title: credential.apiKeySource, children: credential.apiKeySource }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "span",
              {
                className: `provider-credential-status provider-credential-status--${credential.status}`,
                children: credentialStatusLabel(credential.status)
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "provider-credential-window", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: formatDateTime(credential.effectiveFrom) }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: formatDateTime(credential.effectiveTo) })
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__key", title: billingId, children: billingId }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "provider-credential-actions", children: ["active", "rotating", "revoked"].map((status) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              Button_default,
              {
                size: "small",
                variant: status === "revoked" ? "danger" : "secondary",
                disabled: credential.status === status || credentialUpdatingId === credential.credentialId,
                onClick: () => void updateProviderCredentialStatus(
                  credential,
                  status
                ),
                children: status === "active" ? "\u542F\u7528" : status === "rotating" ? "\u8F6E\u6362\u4E2D" : "\u64A4\u9500"
              },
              status
            )) }) })
          ] }, credential.credentialId);
        }) })
      ] }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "usage-panel user-usage-group-panel", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-panel__toolbar", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-segment", "aria-label": "\u5206\u7EC4", children: GROUPS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: `usage-segment__button${groupTab === item.value ? " usage-segment__button--active" : ""}`,
          onClick: () => setGroupTab(item.value),
          children: item.label
        },
        item.value
      )) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-table-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("table", { className: "usage-table", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: GROUPS.find((item) => item.value === groupTab)?.label }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { className: "usage-table__num", children: "\u8BF7\u6C42\u6570" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { className: "usage-table__num", children: "\u6D88\u8017" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { className: "usage-table__num", children: "\u5360\u6BD4" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { className: "usage-table__num", children: "\u8F93\u5165 Token" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { className: "usage-table__num", children: "\u8F93\u51FA Token" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tbody", { children: loading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { colSpan: 6, className: "usage-table__empty", children: EMPTY_LOADING }) }) : rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { colSpan: 6, className: "usage-table__empty", children: EMPTY_NO_DATA }) }) : rows.slice(0, 200).map((row) => {
          const key = groupKey(row, groupTab);
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__key", title: key, children: key }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__num", children: formatNumber(row.count) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__num", children: formatCredits(row.cost) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__num", children: formatPercent(row.costRatio) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__num", children: formatNumber(row.inputTokens) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "usage-table__num", children: formatNumber(row.outputTokens) })
          ] }, key);
        }) })
      ] }) })
    ] })
  ] });
}
export {
  UserUsagePage as default
};
