import {
  Pagination
} from "/public/assets/chunks/chunk-GVD2EAH6.js";
import "/public/assets/chunks/chunk-45KYWPDW.js";
import {
  formatInTimeZone,
  getTokenStatsThunk,
  useRecords,
  utcToZonedTime,
  zonedTimeToUtc
} from "/public/assets/chunks/chunk-QPFAIYQT.js";
import {
  formatCredits
} from "/public/assets/chunks/chunk-FXB3NEER.js";
import {
  Combobox_default
} from "/public/assets/chunks/chunk-J5AVP4KL.js";
import {
  TabsNav_default
} from "/public/assets/chunks/chunk-Q3A7KJ5P.js";
import "/public/assets/chunks/chunk-XXDSICRI.js";
import "/public/assets/chunks/chunk-LVVUA2RZ.js";
import "/public/assets/chunks/chunk-2CATDSNY.js";
import "/public/assets/chunks/chunk-252FCKHS.js";
import {
  useToken,
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  API_ENDPOINTS,
  eachDayOfInterval,
  format,
  formatISO,
  parseISO,
  selectRemoteServer,
  subDays
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuChevronDown,
  LuChevronUp,
  LuClock3,
  LuCreditCard,
  LuFilter,
  LuTrendingUp
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

// packages/life/web/Usage.tsx
var import_react5 = __toESM(require_react(), 1);

// packages/life/web/RechargeRecord.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};
var formatReason = (reason) => {
  const reasonMap = {
    admin_recharge: "\u7BA1\u7406\u5458\u5145\u503C",
    new_user_bonus: "\u65B0\u7528\u6237\u5956\u52B1",
    invited_signup_bonus: "\u9080\u8BF7\u6CE8\u518C\u5956\u52B1",
    chat_completion: "\u5BF9\u8BDD\u6D88\u8017",
    service_usage: "\u670D\u52A1\u4F7F\u7528"
  };
  for (const key in reasonMap) {
    if (reason.startsWith(key)) {
      return reasonMap[key];
    }
  }
  return reason || "\u5176\u4ED6";
};
var RechargeRecord = ({
  isVisible,
  onToggleVisibility
}) => {
  const { t } = useTranslation(["translation", "chat"]);
  const token = useToken();
  const server = useAppSelector(selectRemoteServer);
  const creditsUnit = t("chat:creditsUnit", "credits");
  const [records, setRecords] = (0, import_react.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [nextCursor, setNextCursor] = (0, import_react.useState)(null);
  const fetchRecords = (0, import_react.useCallback)(
    async (cursor) => {
      setIsLoading(true);
      setError(null);
      try {
        if (!token) {
          throw new Error("\u7528\u6237\u672A\u767B\u5F55");
        }
        const response = await fetch(server + API_ENDPOINTS.TRANSACTIONS, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            limit: 10,
            cursor
          })
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "\u83B7\u53D6\u8BB0\u5F55\u5931\u8D25");
        }
        const { data, nextCursor: newCursor } = await response.json();
        setRecords(
          (prevRecords) => cursor ? [...prevRecords, ...data] : data
        );
        setNextCursor(newCursor);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [token, server]
  );
  (0, import_react.useEffect)(() => {
    if (isVisible && records.length === 0 && token && server) {
      fetchRecords(null);
    }
  }, [isVisible, records.length, token, server, fetchRecords]);
  const handleLoadMore = () => {
    if (nextCursor && !isLoading) {
      fetchRecords(nextCursor);
    }
  };
  const totalAmount = records.reduce((sum, record) => {
    return sum + (record.type === "recharge" ? record.amount : -record.amount);
  }, 0);
  const renderContent = () => {
    if (isLoading && records.length === 0) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "recharge-record__empty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClock3, { size: 24, style: { marginBottom: 12, opacity: 0.5 }, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("loading", "\u6B63\u5728\u83B7\u53D6\u4EA4\u6613\u8BB0\u5F55...") })
      ] });
    }
    if (error) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "recharge-record__error", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
        "\u83B7\u53D6\u5931\u8D25: ",
        error
      ] }) });
    }
    if (!records.length) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "recharge-record__empty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCreditCard, { size: 24, style: { marginBottom: 12, opacity: 0.5 }, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("no_data", "\u6682\u65E0\u4EA4\u6613\u660E\u7EC6") })
      ] });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "recharge-record__table", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: t("time", "\u4EA4\u6613\u65F6\u95F4") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: t("amount_with_unit", "\u91D1\u989D ({{unit}})", { unit: creditsUnit }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: t("project", "\u4E8B\u9879") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: t("status", "\u72B6\u6001") })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: records.map((record) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "recharge-record__time", "data-label": t("time", "\u65F6\u95F4"), children: formatTimestamp(record.timestamp) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "td",
          {
            className: `recharge-record__amount ${record.type === "recharge" ? "recharge-record__amount--income" : "recharge-record__amount--outcome"}`,
            "data-label": t("amount", "\u91D1\u989D"),
            children: [
              record.type === "recharge" ? "+" : "-",
              formatCredits(record.amount, creditsUnit, 2)
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { "data-label": t("project", "\u4E8B\u9879"), children: formatReason(record.reason) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { "data-label": t("status", "\u72B6\u6001"), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "span",
          {
            className: `recharge-record__status recharge-record__status--${record.status}`,
            children: record.status === "completed" ? "\u6210\u529F" : "\u5931\u8D25"
          }
        ) })
      ] }, record.txId)) })
    ] });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "recharge-record", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "recharge-record__bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "recharge-record__title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCreditCard, { size: 16, "aria-hidden": "true" }),
        t("transaction_records", "\u8D44\u91D1\u660E\u7EC6"),
        isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "recharge-record__pulse", "aria-hidden": "true" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          className: "usage-linkbtn",
          onClick: onToggleVisibility,
          "aria-expanded": isVisible,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isVisible ? t("collapse", "\u6536\u8D77") : t("expand", "\u5C55\u5F00") }),
            isVisible ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuChevronUp, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuChevronDown, { size: 14, "aria-hidden": "true" })
          ]
        }
      )
    ] }),
    isVisible && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "recharge-record__content", children: renderContent() }),
      records.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "recharge-record__footer", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          t("page_total", "\u5408\u8BA1"),
          " ",
          records.length,
          " ",
          t("records", "\u7B14")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "span",
          {
            className: `recharge-record__total ${totalAmount < 0 ? "recharge-record__total--negative" : ""}`,
            children: [
              totalAmount >= 0 ? "+" : "-",
              formatCredits(Math.abs(totalAmount), creditsUnit, 2)
            ]
          }
        ),
        nextCursor && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "usage-linkbtn",
            onClick: handleLoadMore,
            disabled: isLoading,
            children: isLoading ? t("loading", "\u52A0\u8F7D\u4E2D...") : t("load_more", "\u52A0\u8F7D\u66F4\u591A")
          }
        )
      ] })
    ] })
  ] });
};
var RechargeRecord_default = RechargeRecord;

// packages/life/web/UsageRecord.tsx
var import_react2 = __toESM(require_react(), 1);
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var ITEMS_PER_PAGE = 10;
var USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
var ALL_MODELS = "\u5168\u90E8\u6A21\u578B";
var getTodayInUserTimezone = () => {
  const today = utcToZonedTime(/* @__PURE__ */ new Date(), USER_TIMEZONE);
  return formatISO(today, { representation: "date" });
};
var formatTokensDisplay = (record) => `${record.input_tokens.toLocaleString()} / ${record.output_tokens.toLocaleString()}`;
var formatLocalTimeDisplay = (utcTime) => {
  const date = typeof utcTime === "string" ? parseISO(utcTime) : new Date(utcTime);
  return format(utcToZonedTime(date, USER_TIMEZONE), "HH:mm:ss");
};
var formatPriceDisplay = (inputPrice, outputPrice) => {
  if (inputPrice === void 0 || outputPrice === void 0) return "\u2014";
  return `${inputPrice.toFixed(4)} / ${outputPrice.toFixed(4)}`;
};
var UsageRecord = () => {
  const { t } = useTranslation(["translation", "chat"]);
  const userId = useUserId();
  const creditsUnit = t("chat:creditsUnit", "credits");
  const [filter, setFilter] = (0, import_react2.useState)({
    date: getTodayInUserTimezone(),
    model: ALL_MODELS,
    currentPage: 1
  });
  const { records, loading, totalCount } = useRecords(userId ?? "", filter);
  const [modelNames, setModelNames] = (0, import_react2.useState)([]);
  (0, import_react2.useEffect)(() => {
    if (!records || records.length === 0) return;
    if (filter.model !== ALL_MODELS) return;
    const names = Array.from(new Set(records.map((r) => r.model)));
    setModelNames((prev) => Array.from(/* @__PURE__ */ new Set([...prev, ...names])).sort());
  }, [records, filter.model]);
  const modelOptions = (0, import_react2.useMemo)(
    () => [
      { label: t("all_models", "\u5168\u90E8\u6A21\u578B"), value: ALL_MODELS },
      ...modelNames.map((name) => ({ label: name, value: name }))
    ],
    [modelNames, t]
  );
  const updateFilter = (patch) => {
    setFilter((prev) => ({ ...prev, ...patch, currentPage: 1 }));
  };
  const currentTotalCost = (0, import_react2.useMemo)(
    () => records.reduce((sum, r) => sum + r.cost, 0),
    [records]
  );
  const selectedModel = modelOptions.find((o) => o.value === filter.model) || modelOptions[0];
  const isFiltered = filter.model !== ALL_MODELS;
  const isToday = filter.date === getTodayInUserTimezone();
  const shiftDay = (days) => {
    const next = /* @__PURE__ */ new Date(`${filter.date}T00:00:00`);
    next.setDate(next.getDate() + days);
    updateFilter({ date: formatISO(next, { representation: "date" }) });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "usage-record", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "usage-record__bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h2", { className: "usage-record__title", children: [
        t("usage_records", "\u4F7F\u7528\u8BB0\u5F55"),
        loading && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "usage-record__pulse", "aria-hidden": "true" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "usage-record__filters", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "usage-record__date", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: "usage-iconbtn",
              onClick: () => shiftDay(-1),
              "aria-label": t("previous_day", "\u524D\u4E00\u5929"),
              children: "\u2039"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "input",
            {
              type: "date",
              className: "usage-record__date-input",
              value: filter.date,
              max: getTodayInUserTimezone(),
              onChange: (e) => updateFilter({ date: e.target.value }),
              "aria-label": t("filter_date", "\u65E5\u671F\u7B5B\u9009")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: "usage-iconbtn",
              onClick: () => shiftDay(1),
              disabled: isToday,
              "aria-label": t("next_day", "\u540E\u4E00\u5929"),
              children: "\u203A"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-record__model-filter", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          Combobox_default,
          {
            items: modelOptions,
            selectedItem: selectedModel,
            onChange: (item) => updateFilter({ model: item?.value ?? ALL_MODELS }),
            placeholder: t("select_model"),
            size: "small",
            variant: "ghost",
            searchable: true,
            icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuFilter, { size: 14, "aria-hidden": "true" })
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-record__table-container", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("table", { className: "usage-record__table", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: t("time", "\u65F6\u95F4") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: t("robot", "Robot ID") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: t("model", "\u6A21\u578B") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: t("provider", "\u4F9B\u5E94\u5546") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "Tokens (In / Out)" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: t("price_per_1k", "\u4EF7\u683C ({{unit}}/1k)", { unit: creditsUnit }) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { className: "is-numeric", children: t("cost_with_unit", "\u8D39\u7528 ({{unit}})", { unit: creditsUnit }) })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tbody", { children: records.length > 0 ? records.map((r) => {
        const servedProvider = asOptionalTrimmedString(r.billing_provider) || asOptionalTrimmedString(r.provider) || "\u2014";
        return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { className: "usage-record__row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "td",
            {
              className: "cell-mono cell-time",
              "data-label": t("time", "\u65F6\u95F4"),
              children: formatLocalTimeDisplay(
                r.createdAt ?? r.timestamp
              )
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "td",
            {
              className: "cell-id",
              title: r.cybotId,
              "data-label": t("robot", "Robot ID"),
              children: r.cybotId === "external_tool" ? "\u{1F527} Tool" : r.cybotId || "\u2014"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { className: "cell-model", "data-label": t("model", "\u6A21\u578B"), children: r.model || "\u2014" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "td",
            {
              className: "cell-provider",
              title: servedProvider,
              "data-label": t("provider", "\u4F9B\u5E94\u5546"),
              children: servedProvider
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "td",
            {
              className: "cell-mono cell-tokens",
              "data-label": "Tokens (In / Out)",
              children: formatTokensDisplay(r)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "td",
            {
              className: "cell-mono cell-price",
              "data-label": t("price", "\u4EF7\u683C"),
              children: formatPriceDisplay(r.inputPrice, r.outputPrice)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "td",
            {
              className: "cell-mono cell-cost",
              "data-label": t("cost", "\u8D39\u7528"),
              children: formatCredits(r.cost, creditsUnit, 4)
            }
          )
        ] }, r.id);
      }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { colSpan: 7, className: "usage-record__empty", children: loading ? t("loading", "\u52A0\u8F7D\u4E2D...") : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("no_data_this_day", "\u8FD9\u5929\u6CA1\u6709\u8C03\u7528\u8BB0\u5F55") }),
        isFiltered && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "usage-linkbtn",
            onClick: () => updateFilter({ model: ALL_MODELS }),
            children: t("clear_filter", "\u6E05\u9664\u6A21\u578B\u7B5B\u9009")
          }
        )
      ] }) }) }) })
    ] }) }),
    records.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "usage-record__footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "usage-record__count", children: [
        t("page_total", "\u672C\u9875"),
        " ",
        records.length,
        " / ",
        totalCount
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "usage-record__sum", children: formatCredits(currentTotalCost, creditsUnit, 4) }),
      totalCount > ITEMS_PER_PAGE && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-record__pager", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        Pagination,
        {
          currentPage: filter.currentPage,
          totalItems: totalCount,
          pageSize: ITEMS_PER_PAGE,
          onPageChange: (p) => setFilter((prev) => ({ ...prev, currentPage: p }))
        }
      ) })
    ] })
  ] });
};
var UsageRecord_default = UsageRecord;

// packages/life/web/UsageChart.tsx
var import_react4 = __toESM(require_react(), 1);

// packages/app/utils/processDateRange.ts
var processDateRange = (timeRange, userTimeZone2) => {
  const endLocal = utcToZonedTime(/* @__PURE__ */ new Date(), userTimeZone2);
  const days = timeRange === "7days" ? 7 : timeRange === "30days" ? 30 : 90;
  const startLocal = subDays(endLocal, days - 1);
  const dateArray = eachDayOfInterval({ start: startLocal, end: endLocal });
  const startUTC = zonedTimeToUtc(startLocal, userTimeZone2);
  const endUTC = zonedTimeToUtc(endLocal, userTimeZone2);
  return {
    startUTC,
    endUTC,
    dateArray: dateArray.map((date) => ({
      // UTC格式用于API查询
      utc: format(zonedTimeToUtc(date, userTimeZone2), "yyyy-MM-dd"),
      // 本地格式用于显示
      full: format(date, "yyyy-MM-dd"),
      short: format(date, "MM-dd")
    }))
  };
};

// packages/life/web/usageChartSeries.ts
var toSafeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
var readValue = (entry, dataType) => dataType === "tokens" ? toSafeNumber(entry?.tokens?.input) + toSafeNumber(entry?.tokens?.output) : toSafeNumber(entry?.cost);
function buildUsageSeries({
  stats,
  dateArray,
  dataType,
  toLocalDate,
  maxModels = 6,
  otherLabel = "\u5176\u4ED6"
}) {
  const days = dateArray.length;
  const labels = dateArray.map((d) => d.short);
  const dates = dateArray.map((d) => d.full);
  const byModel = /* @__PURE__ */ new Map();
  (stats ?? []).forEach((stat) => {
    const idx = dateArray.findIndex((d) => d.full === toLocalDate(stat?.timeKey));
    if (idx === -1) return;
    Object.entries(stat?.models ?? {}).forEach(([model, entry]) => {
      let row = byModel.get(model);
      if (!row) {
        row = new Array(days).fill(0);
        byModel.set(model, row);
      }
      row[idx] += readValue(entry, dataType);
    });
  });
  const ranked = Array.from(byModel.entries()).map(([name, values]) => ({
    name,
    values,
    total: values.reduce((sum, v) => sum + v, 0)
  })).filter((m) => m.total > 0).sort((a, b) => b.total - a.total);
  let models = ranked;
  if (ranked.length > maxModels) {
    const kept = ranked.slice(0, maxModels);
    const tail = ranked.slice(maxModels);
    const folded = new Array(days).fill(0);
    tail.forEach((m) => m.values.forEach((v, i) => folded[i] += v));
    models = [
      ...kept,
      {
        name: otherLabel,
        values: folded,
        total: folded.reduce((sum, v) => sum + v, 0)
      }
    ];
  }
  const totals = new Array(days).fill(0);
  models.forEach((m) => m.values.forEach((v, i) => totals[i] += v));
  const grandTotal = totals.reduce((sum, v) => sum + v, 0);
  return {
    labels,
    dates,
    models,
    totals,
    grandTotal,
    activeDays: totals.filter((v) => v > 0).length,
    hasData: grandTotal > 0
  };
}

// packages/life/web/UsageBarChart.tsx
var import_react3 = __toESM(require_react(), 1);
var import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);
var TICK_RATIOS = [1, 0.75, 0.5, 0.25, 0];
var niceMax = (value) => {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const base = 10 ** Math.floor(Math.log10(value));
  const n = value / base;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * base;
};
var UsageBarChart = ({
  labels,
  dates,
  models,
  totals,
  colorOf,
  formatValue,
  formatAxis,
  emptyDayLabel,
  totalLabel
}) => {
  const [active, setActive] = (0, import_react3.useState)(null);
  const max = niceMax(Math.max(...totals, 0));
  const activeRows = active === null ? [] : models.map((m, i) => ({
    name: m.name,
    value: m.values[active] ?? 0,
    color: colorOf(m.name, i)
  })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ubar", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ubar__plot", children: [
      TICK_RATIOS.map((ratio) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "div",
        {
          className: "ubar__gridline",
          style: { bottom: `${ratio * 100}%` },
          children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "ubar__ticklabel", children: formatAxis(max * ratio) })
        },
        ratio
      )),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ubar__cols", children: labels.map((label, i) => {
        const total = totals[i] ?? 0;
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "div",
          {
            className: "ubar__col",
            "data-active": active === i || void 0,
            tabIndex: 0,
            role: "img",
            "aria-label": `${dates[i]} ${total > 0 ? formatValue(total) : emptyDayLabel}`,
            onMouseEnter: () => setActive(i),
            onFocus: () => setActive(i),
            onMouseLeave: () => setActive((cur) => cur === i ? null : cur),
            onBlur: () => setActive((cur) => cur === i ? null : cur),
            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ubar__stack", children: models.map((m, mi) => {
              const v = m.values[i] ?? 0;
              if (v <= 0) return null;
              return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "div",
                {
                  className: "ubar__seg",
                  style: {
                    height: `${v / max * 100}%`,
                    background: colorOf(m.name, mi)
                  }
                },
                m.name
              );
            }) })
          },
          `${label}-${i}`
        );
      }) }),
      active !== null && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "div",
        {
          className: "ubar__tip",
          style: { left: `${(active + 0.5) / labels.length * 100}%` },
          "data-align": active < labels.length / 4 ? "start" : active > labels.length * 3 / 4 ? "end" : void 0,
          role: "tooltip",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ubar__tip-date", children: dates[active] }),
            activeRows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ubar__tip-empty", children: emptyDayLabel }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
              activeRows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ubar__tip-row", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "span",
                  {
                    className: "ubar__tip-dot",
                    style: { background: r.color },
                    "aria-hidden": "true"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "ubar__tip-name", children: r.name }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "ubar__tip-value", children: formatValue(r.value) })
              ] }, r.name)),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ubar__tip-total", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: totalLabel }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "ubar__tip-value", children: formatValue(totals[active] ?? 0) })
              ] })
            ] })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ubar__axis", children: labels.map((label, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { "data-active": active === i || void 0, children: label }, `${label}-${i}`)) })
  ] });
};
var UsageBarChart_default = UsageBarChart;

// packages/life/web/UsageChart.tsx
var import_jsx_runtime4 = __toESM(require_jsx_runtime(), 1);
var userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
var MODEL_COLORS = [
  "#5B8FF9",
  "#5AD8A6",
  "#F6BD16",
  "#E8684A",
  "#6DC8EC",
  "#945FB9"
];
var formatTokens = (n) => {
  if (n >= 1e6)
    return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k`;
  return String(Math.round(n));
};
var UsageChart = () => {
  const { t } = useTranslation(["translation", "chat"]);
  const dispatch = useAppDispatch();
  const userId = useUserId();
  const creditsUnit = t("chat:creditsUnit", "credits");
  const [timeRange, setTimeRange] = (0, import_react4.useState)("7days");
  const [dataType, setDataType] = (0, import_react4.useState)("tokens");
  const [statsData, setStatsData] = (0, import_react4.useState)([]);
  const [loading, setLoading] = (0, import_react4.useState)(false);
  const [error, setError] = (0, import_react4.useState)(null);
  const [reloadKey, setReloadKey] = (0, import_react4.useState)(0);
  const isCost = dataType === "cost";
  const otherLabel = t("other_models", "\u5176\u4ED6");
  const timeRangeOptions = (0, import_react4.useMemo)(
    () => [
      { label: t("last_7_days", "\u8FD1 7 \u5929"), value: "7days" },
      { label: t("last_30_days", "\u8FD1 30 \u5929"), value: "30days" },
      { label: t("last_90_days", "\u8FD1 90 \u5929"), value: "90days" }
    ],
    [t]
  );
  const dataTypeTabs = (0, import_react4.useMemo)(
    () => [
      { id: "tokens", label: "Tokens" },
      { id: "cost", label: t("cost", "\u6210\u672C") }
    ],
    [t]
  );
  const selectedTimeRange = timeRangeOptions.find((o) => o.value === timeRange);
  (0, import_react4.useEffect)(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const { dateArray } = processDateRange(timeRange, userTimeZone);
    const startDate = dateArray[0].utc;
    const endDate = dateArray[dateArray.length - 1].utc;
    dispatch(getTokenStatsThunk({ userId, startDate, endDate, period: "day" })).unwrap().then((data) => {
      if (!cancelled) setStatsData(data ?? []);
    }).catch((err) => {
      if (cancelled) return;
      console.error("Failed to fetch stats:", err);
      setStatsData([]);
      setError(t("load_failed", "\u52A0\u8F7D\u5931\u8D25"));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, timeRange, dispatch, reloadKey, t]);
  const series = (0, import_react4.useMemo)(() => {
    const { dateArray } = processDateRange(timeRange, userTimeZone);
    return buildUsageSeries({
      stats: statsData,
      dateArray,
      dataType,
      toLocalDate: (timeKey) => formatInTimeZone(new Date(timeKey), userTimeZone, "yyyy-MM-dd"),
      maxModels: MODEL_COLORS.length,
      otherLabel
    });
  }, [timeRange, statsData, dataType, otherLabel]);
  const formatValue = (0, import_react4.useCallback)(
    (n) => isCost ? formatCredits(n, creditsUnit, 4) : Math.round(n).toLocaleString(),
    [isCost, creditsUnit]
  );
  const formatAxis = (0, import_react4.useCallback)(
    (n) => isCost ? formatCredits(n, "", 2).trim() : formatTokens(n),
    [isCost]
  );
  const colorOf = (0, import_react4.useCallback)(
    (name, index) => name === otherLabel ? "var(--textTertiary)" : MODEL_COLORS[index % MODEL_COLORS.length],
    [otherLabel]
  );
  const dayAverage = series.activeDays ? series.grandTotal / series.activeDays : 0;
  const renderBody = () => {
    if (loading)
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "usage-chart__placeholder", children: t("loading", "\u52A0\u8F7D\u4E2D...") });
    if (error)
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "usage-chart__placeholder", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: error }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "button",
          {
            type: "button",
            className: "usage-linkbtn",
            onClick: () => setReloadKey((k) => k + 1),
            children: t("retry", "\u91CD\u8BD5")
          }
        )
      ] });
    if (!series.hasData)
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "usage-chart__placeholder", children: t("usage_empty_range", "\u8FD9\u6BB5\u65F6\u95F4\u6CA1\u6709\u7528\u91CF") });
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      UsageBarChart_default,
      {
        labels: series.labels,
        dates: series.dates,
        models: series.models,
        totals: series.totals,
        colorOf,
        formatValue,
        formatAxis,
        emptyDayLabel: t("no_usage", "\u65E0\u7528\u91CF"),
        totalLabel: t("total", "\u603B\u91CF")
      }
    );
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { className: "usage-chart", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "usage-chart__bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("h2", { className: "usage-chart__title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuTrendingUp, { size: 16, "aria-hidden": "true" }),
        t("usage_stats", "\u4F7F\u7528\u91CF\u7EDF\u8BA1")
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "usage-chart__controls", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          Combobox_default,
          {
            items: timeRangeOptions,
            selectedItem: selectedTimeRange,
            onChange: (i) => i && setTimeRange(i.value),
            size: "small",
            variant: "ghost",
            searchable: false,
            placeholder: t("select_time_range")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          TabsNav_default,
          {
            className: "usage-chart__tabs",
            tabs: dataTypeTabs,
            activeTab: dataType,
            onChange: (id) => setDataType(id)
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("dl", { className: "usage-stats", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "usage-stats__item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dt", { children: isCost ? t("total_cost", "\u603B\u6210\u672C") : t("total_tokens", "\u603B Tokens") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dd", { children: formatValue(series.grandTotal) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "usage-stats__item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dt", { children: t("daily_average", "\u6D3B\u8DC3\u65E5\u5747") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dd", { children: formatValue(dayAverage) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "usage-stats__item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dt", { children: t("models_used", "\u4F7F\u7528\u6A21\u578B") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dd", { children: series.models.length })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "usage-chart__body", children: renderBody() }),
    series.hasData && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("ul", { className: "usage-breakdown", children: series.models.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("li", { className: "usage-breakdown__row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "span",
        {
          className: "usage-breakdown__dot",
          style: { background: colorOf(m.name, i) },
          "aria-hidden": "true"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "usage-breakdown__name", title: m.name, children: m.name }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "usage-breakdown__share", children: [
        Math.round(m.total / series.grandTotal * 100),
        "%"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "usage-breakdown__value", children: formatValue(m.total) })
    ] }, m.name)) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "usage-chart__foot", children: userTimeZone })
  ] });
};
var UsageChart_default = UsageChart;

// packages/life/web/Usage.tsx
var import_jsx_runtime5 = __toESM(require_jsx_runtime(), 1);
var Usage = () => {
  const { t } = useTranslation();
  const [isRechargeRecordVisible, setRechargeRecordVisible] = (0, import_react5.useState)(false);
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "usage-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("header", { className: "usage-page__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h1", { className: "usage-page__title", children: t("usage_dashboard", "\u4F7F\u7528\u7EDF\u8BA1") }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "usage-page__subtitle", children: t("usage_dashboard_subtitle", "\u67E5\u770B\u5145\u503C\u8BB0\u5F55\u4E0E\u6A21\u578B\u6D88\u8017\u660E\u7EC6") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(UsageChart_default, {}),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      RechargeRecord_default,
      {
        isVisible: isRechargeRecordVisible,
        onToggleVisibility: () => setRechargeRecordVisible(!isRechargeRecordVisible)
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(UsageRecord_default, {})
  ] });
};
var Usage_default = Usage;
export {
  Usage_default as default
};
