import "/public/assets/chunks/chunk-HWC2ZOVH.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
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
import "/public/assets/chunks/chunk-VCXOIOLL.js";
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

// packages/auth/web/UserGrowthPanel.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var formatNumber = (value) => new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(value || 0);
var formatSignedNumber = (value) => `${value > 0 ? "+" : ""}${formatNumber(value)}`;
var formatPercent = (count, total) => total > 0 ? `${Math.round(count / total * 100)}%` : "-";
var formatOptionalNumber = (value) => value === null ? "\u5F85\u63A5\u5165" : formatNumber(value);
var formatOptionalPercent = (count, total) => count === null ? "-" : formatPercent(count, total);
var formatTime = (value) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};
var deltaClassName = (value) => {
  if (value > 0) return "growth-delta growth-delta--up";
  if (value < 0) return "growth-delta growth-delta--down";
  return "growth-delta";
};
var getResponseErrorMessage = (body, fallback) => {
  if (typeof body?.error === "string") return body.error;
  if (typeof body?.error?.message === "string") return body.error.message;
  if (typeof body?.message === "string") return body.message;
  return fallback;
};
function WindowMetric({
  title,
  value,
  previous,
  delta
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "growth-window-metric", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatNumber(value) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
      "\u4E0A\u5468\u671F ",
      formatNumber(previous),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { className: deltaClassName(delta), children: formatSignedNumber(delta) })
    ] })
  ] });
}
function DailyBars({ points }) {
  const maxValue = (0, import_react.useMemo)(
    () => Math.max(
      1,
      ...points.map((point) => Math.max(point.activeUsers, point.newUsers))
    ),
    [points]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "growth-daily-bars", "aria-label": "\u6700\u8FD1 30 \u5929\u589E\u957F\u8D8B\u52BF", children: points.map((point) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "growth-daily-bars__day", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "growth-daily-bars__bars", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "span",
        {
          className: "growth-daily-bars__bar growth-daily-bars__bar--active",
          title: `${point.date} \u6D3B\u8DC3 ${point.activeUsers}`,
          style: { height: `${Math.max(4, point.activeUsers / maxValue * 100)}%` }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "span",
        {
          className: "growth-daily-bars__bar growth-daily-bars__bar--new",
          title: `${point.date} \u65B0\u589E ${point.newUsers}`,
          style: { height: `${Math.max(4, point.newUsers / maxValue * 100)}%` }
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "growth-daily-bars__label", children: point.date.slice(5) })
  ] }, point.date)) });
}
function FunnelStep({
  label,
  count,
  total,
  note
}) {
  const width = count !== null && total > 0 ? Math.max(4, Math.min(100, count / total * 100)) : 0;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "growth-funnel-step", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "growth-funnel-step__head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatOptionalNumber(count) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "growth-funnel-step__bar", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: `${width}%` } }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
      formatOptionalPercent(count, total),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: note })
    ] })
  ] });
}
function UserGrowthPanel({
  currentServer,
  currentToken
}) {
  const [report, setReport] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const fetchReport = (0, import_react.useCallback)(async () => {
    if (!currentToken) {
      setError("\u9274\u6743\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${currentServer}${authRoutes.users.growthReport.createPath()}`,
        {
          method: authRoutes.users.growthReport.method,
          headers: {
            Authorization: `Bearer ${currentToken}`
          }
        }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.success) {
        setError(getResponseErrorMessage(body, "\u52A0\u8F7D\u589E\u957F\u7EDF\u8BA1\u5931\u8D25"));
        setReport(null);
        return;
      }
      setReport(body.report);
    } catch {
      setError("\u52A0\u8F7D\u589E\u957F\u7EDF\u8BA1\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [currentServer, currentToken]);
  (0, import_react.useEffect)(() => {
    void fetchReport();
  }, [fetchReport]);
  const sevenDays = report?.windows.sevenDays;
  const thirtyDays = report?.windows.thirtyDays;
  const activationFunnel = report?.activationFunnel;
  const activationRegistered = activationFunnel?.registeredUsers ?? 0;
  const retentionEligible = activationFunnel?.retentionEligibleUsers ?? 0;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "growth-management", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "growth-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "growth-toolbar__copy", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "\u7528\u6237\u589E\u957F" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u6309\u7528\u6237\u6CE8\u518C\u65F6\u95F4\u4E0E\u6700\u8FD1\u6D3B\u8DC3\u65F6\u95F4\u7EDF\u8BA1" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Button_default,
        {
          onClick: () => void fetchReport(),
          variant: "secondary",
          size: "small",
          loading,
          children: "\u5237\u65B0"
        }
      )
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "usage-error", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "usage-summary-grid growth-summary-grid", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "usage-summary-item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u603B\u7528\u6237" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatNumber(report?.totalUsers ?? 0) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "usage-summary-item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u4ECA\u65E5\u6D3B\u8DC3" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatNumber(report?.activeToday ?? 0) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "usage-summary-item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u4ECA\u65E5\u65B0\u589E" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatNumber(report?.newToday ?? 0) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "usage-summary-item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u66F4\u65B0\u65F6\u95F4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: report ? formatTime(Date.parse(report.generatedAt)) : "-" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "growth-window-grid", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "growth-window-panel", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "7 \u5929\u7A97\u53E3" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "growth-window-panel__metrics", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            WindowMetric,
            {
              title: "7 \u5929\u6D3B\u8DC3",
              value: sevenDays?.activeUsers ?? 0,
              previous: sevenDays?.previousActiveUsers ?? 0,
              delta: sevenDays?.activeDelta ?? 0
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            WindowMetric,
            {
              title: "7 \u5929\u589E\u957F",
              value: sevenDays?.newUsers ?? 0,
              previous: sevenDays?.previousNewUsers ?? 0,
              delta: sevenDays?.newDelta ?? 0
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "growth-window-panel", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "30 \u5929\u7A97\u53E3" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "growth-window-panel__metrics", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            WindowMetric,
            {
              title: "30 \u5929\u6D3B\u8DC3",
              value: thirtyDays?.activeUsers ?? 0,
              previous: thirtyDays?.previousActiveUsers ?? 0,
              delta: thirtyDays?.activeDelta ?? 0
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            WindowMetric,
            {
              title: "30 \u5929\u589E\u957F",
              value: thirtyDays?.newUsers ?? 0,
              previous: thirtyDays?.previousNewUsers ?? 0,
              delta: thirtyDays?.newDelta ?? 0
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "usage-panel growth-funnel-panel", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "usage-panel__toolbar", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "provider-health-title", children: "\u6FC0\u6D3B\u6F0F\u6597" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "growth-panel-note", children: [
          "\u6700\u8FD1 ",
          activationFunnel?.cohortDays ?? 30,
          " \u5929\u6CE8\u518C\u7528\u6237\uFF1B7 \u5929\u7559\u5B58\u53EA\u7EDF\u8BA1\u5DF2\u6EE1 7 \u5929\u7684\u7528\u6237"
        ] })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "growth-funnel-grid", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          FunnelStep,
          {
            label: "\u6CE8\u518C\u7528\u6237",
            count: activationRegistered,
            total: activationRegistered,
            note: "\u6F0F\u6597\u8D77\u70B9"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          FunnelStep,
          {
            label: "24h \u5185\u6D3B\u8DC3",
            count: activationFunnel?.activeWithin24hUsers ?? 0,
            total: activationRegistered,
            note: "\u57FA\u4E8E\u6700\u8FD1\u6D3B\u8DC3\u8BB0\u5F55"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          FunnelStep,
          {
            label: "24h \u5185\u5EFA\u5BF9\u8BDD",
            count: activationFunnel?.firstDialogWithin24hUsers ?? 0,
            total: activationRegistered,
            note: "\u9996\u6B21\u5BF9\u8BDD\u521B\u5EFA"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          FunnelStep,
          {
            label: "24h \u5185\u6A21\u578B\u8C03\u7528",
            count: activationFunnel?.firstModelCallWithin24hUsers ?? null,
            total: activationRegistered,
            note: "\u9700\u7528\u91CF\u7D22\u5F15"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          FunnelStep,
          {
            label: "7 \u5929\u540E\u4ECD\u6D3B\u8DC3",
            count: activationFunnel?.retainedAfter7dUsers ?? 0,
            total: retentionEligible,
            note: `\u6EE1 7 \u5929\u7528\u6237 ${formatNumber(retentionEligible)}`
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "usage-panel growth-trend-panel", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "usage-panel__toolbar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "provider-health-title", children: "\u6700\u8FD1 30 \u5929\u8D8B\u52BF" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "growth-legend", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "growth-legend__active", children: "\u6D3B\u8DC3" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "growth-legend__new", children: "\u65B0\u589E" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DailyBars, { points: report?.daily ?? [] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "usage-panel", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "usage-panel__toolbar", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "provider-health-title", children: "\u6700\u8FD1\u6D3B\u8DC3\u7528\u6237" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "usage-table-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "usage-table growth-users-table", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u7528\u6237" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u90AE\u7BB1" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u6CE8\u518C\u65F6\u95F4" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u6700\u8FD1\u6D3B\u8DC3" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 4, children: "\u52A0\u8F7D\u4E2D..." }) }) : (report?.recentActiveUsers.length ?? 0) === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 4, children: "\u6682\u65E0\u6D3B\u8DC3\u7528\u6237\u8BB0\u5F55" }) }) : report?.recentActiveUsers.map((user) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "usage-primary", children: user.username || user.userId }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "usage-secondary", children: user.userId })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: user.email || "-" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: formatTime(user.createdAt) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: formatTime(user.lastSeenAt) })
        ] }, user.userId)) })
      ] }) })
    ] })
  ] });
}

// packages/auth/web/UserGrowthPage.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
function UserGrowthPage() {
  const currentServer = useAppSelector(selectRemoteServer);
  const currentToken = useAppSelector(selectCurrentToken);
  if (!currentServer) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "no-server-container", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "no-server-content", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: "\u672A\u9009\u62E9\u670D\u52A1\u5668" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u8BF7\u5148\u9009\u62E9\u670D\u52A1\u5668\u4EE5\u67E5\u770B\u589E\u957F\u7EDF\u8BA1" })
    ] }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "users-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("header", { className: "page-header", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "header-left", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { className: "page-title", children: "\u589E\u957F\u7EDF\u8BA1" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "title-decoration" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      UserGrowthPanel,
      {
        currentServer,
        currentToken
      }
    )
  ] });
}
export {
  UserGrowthPage as default
};
