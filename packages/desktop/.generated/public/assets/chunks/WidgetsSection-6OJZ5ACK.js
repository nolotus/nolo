import {
  readStorageJSON,
  writeStorageJSON
} from "/public/assets/chunks/chunk-WHFPTFVA.js";
import {
  useRecords,
  utcToZonedTime
} from "/public/assets/chunks/chunk-QPFAIYQT.js";
import {
  useCreateTable
} from "/public/assets/chunks/chunk-JETP7HYW.js";
import "/public/assets/chunks/chunk-5IOWWQCJ.js";
import {
  formatCredits
} from "/public/assets/chunks/chunk-FXB3NEER.js";
import {
  $2ec61d1d4f780267$export$a8a3e93435678ff9,
  $6f9a1820b787aac7$export$22e2d15eaa4d2377,
  $6f9a1820b787aac7$export$5bd780d491cfc46c,
  $6f9a1820b787aac7$export$5d847498420df57b,
  $6f9a1820b787aac7$export$ad2135cac3a11b3d,
  $6f9a1820b787aac7$export$e11f8ba65d857bff,
  $6f9a1820b787aac7$export$e1aef45b828286de,
  $7705c033048f6da7$export$353f5b6fc5456de1
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import {
  createDocState
} from "/public/assets/chunks/chunk-VPSYWRNH.js";
import {
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import {
  NavLink,
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  useStore
} from "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  formatISO,
  selectCurrentUserBalance,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  getIsDesktopApp
} from "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuBadgeDollarSign,
  LuChevronRight,
  LuDownload,
  LuGrid2X2,
  LuGripVertical,
  LuPencil,
  LuRotateCcw,
  LuWallet,
  LuX
} from "/public/assets/chunks/chunk-GQPLRP65.js";
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
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/pages/widgets/WidgetsSection.tsx
var import_react2 = __toESM(require_react());

// packages/app/pages/widgets/CalendarWidget.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var CalendarWidget = ({ isEditing }) => {
  const { t } = useTranslation();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "calendar-widget", "aria-label": t("widgets.calendar.title", "\u65E5\u5386"), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)($6f9a1820b787aac7$export$e1aef45b828286de, { "aria-label": t("widgets.calendar.ariaLabel", "\u65E5\u671F\u9009\u62E9"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "calendar-widget__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)($7705c033048f6da7$export$353f5b6fc5456de1, { slot: "previous", className: "calendar-widget__nav-btn", children: "\u25C0" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)($2ec61d1d4f780267$export$a8a3e93435678ff9, { className: "calendar-widget__heading" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)($7705c033048f6da7$export$353f5b6fc5456de1, { slot: "next", className: "calendar-widget__nav-btn", children: "\u25B6" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)($6f9a1820b787aac7$export$5bd780d491cfc46c, { className: "calendar-widget__grid", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)($6f9a1820b787aac7$export$22e2d15eaa4d2377, { className: "calendar-widget__grid-header", children: (day) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)($6f9a1820b787aac7$export$ad2135cac3a11b3d, { className: "calendar-widget__header-cell", children: day }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)($6f9a1820b787aac7$export$e11f8ba65d857bff, { className: "calendar-widget__grid-body", children: (date) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        $6f9a1820b787aac7$export$5d847498420df57b,
        {
          date,
          className: "calendar-widget__cell"
        }
      ) })
    ] })
  ] }) });
};
var CalendarWidget_default = CalendarWidget;

// packages/app/pages/widgets/UsageWidget.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var USER_TIMEZONE = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
var getTodayInUserTimezone = () => {
  const today = utcToZonedTime(/* @__PURE__ */ new Date(), USER_TIMEZONE);
  return formatISO(today, { representation: "date" });
};
var UsageWidget = ({ isEditing }) => {
  const { t } = useTranslation(["translation", "chat"]);
  const userId = useUserId() ?? "";
  const balance = useAppSelector(selectCurrentUserBalance);
  const creditsUnit = t("chat:creditsUnit", "credits");
  const recordsFilter = (0, import_react.useMemo)(
    () => ({
      date: getTodayInUserTimezone(),
      model: "\u5168\u90E8\u6A21\u578B",
      currentPage: 1
    }),
    []
  );
  const { records, loading } = useRecords(userId, recordsFilter);
  const todayCost = (0, import_react.useMemo)(
    () => records.reduce((sum, r) => sum + (r.cost ?? 0), 0),
    [records]
  );
  const content = /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-widget__icon", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuWallet, { size: 20, "aria-hidden": "true" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "usage-widget__body", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "usage-widget__label", children: t("widgets.usage.title", "\u7528\u91CF\u7EDF\u8BA1") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "usage-widget__balance", children: formatCredits(balance, creditsUnit) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "usage-widget__sub", children: loading ? t("widgets.usage.loading", "\u7EDF\u8BA1\u4E2D\u2026") : t("widgets.usage.todayCost", "\u4ECA\u65E5\u6D88\u8017 {{cost}}", {
        cost: todayCost.toFixed(4)
      }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuChevronRight, { size: 16, className: "usage-widget__chevron", "aria-hidden": "true" })
  ] });
  if (isEditing) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "usage-widget", "aria-label": t("widgets.usage.title", "\u7528\u91CF\u7EDF\u8BA1"), children: content });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(NavLink, { to: "/life/usage", className: "usage-widget", "aria-label": t("widgets.usage.title", "\u7528\u91CF\u7EDF\u8BA1"), children: content });
};
var UsageWidget_default = UsageWidget;

// packages/app/pages/widgets/WidgetsSection.tsx
var import_jsx_runtime3 = __toESM(require_jsx_runtime());
var STORAGE_KEY = "home-custom-widgets-v3";
var ALL_WIDGETS = [
  "calendar",
  "createNote",
  "createTable",
  "usage",
  "pricing",
  "downloadClient"
];
var MAX_SPAN = 6;
var HEIGHT_TIER_THRESHOLDS = { compact: 70, medium: 120, tall: 220 };
var FEATURED_WIDGET_ID = "calendar";
function defaultState() {
  const isDesktop = getIsDesktopApp();
  return {
    visible: [...ALL_WIDGETS],
    order: [...ALL_WIDGETS],
    sizes: {
      calendar: 3,
      createNote: 3,
      createTable: 3,
      usage: isDesktop ? 3 : 2,
      pricing: isDesktop ? 3 : 2,
      downloadClient: 2
    },
    heights: {
      calendar: 0,
      createNote: 0,
      createTable: 0,
      usage: 0,
      pricing: 0,
      downloadClient: 0
    }
  };
}
function loadState() {
  try {
    const parsed = readStorageJSON(STORAGE_KEY);
    if (!parsed) return defaultState();
    const parsedVisible = (parsed.visible ?? ALL_WIDGETS).filter(
      (id) => ALL_WIDGETS.includes(id)
    );
    const parsedOrder = (parsed.order ?? ALL_WIDGETS).filter(
      (id) => ALL_WIDGETS.includes(id)
    );
    const missingVisible = ALL_WIDGETS.filter(
      (id) => !parsedVisible.includes(id) && !parsedOrder.includes(id)
    );
    const missingOrder = ALL_WIDGETS.filter((id) => !parsedOrder.includes(id));
    return {
      visible: [...parsedVisible, ...missingVisible],
      order: [...parsedOrder, ...missingOrder],
      sizes: { ...defaultState().sizes, ...parsed.sizes },
      heights: { ...defaultState().heights, ...parsed.heights ?? {} }
    };
  } catch {
    return defaultState();
  }
}
function saveState(state) {
  writeStorageJSON(STORAGE_KEY, state);
}
var WidgetsSection = ({ isEditing }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const store = useStore();
  const navigate = useNavigate();
  const [state, setState] = (0, import_react2.useState)(loadState);
  const stateRef = (0, import_react2.useRef)(state);
  stateRef.current = state;
  const [resizingId, setResizingId] = (0, import_react2.useState)(null);
  const { createNewTable, isCreating: isCreatingTable } = useCreateTable();
  const persist = (0, import_react2.useCallback)((next) => {
    setState(next);
    saveState(next);
  }, []);
  const toggleVisible = (0, import_react2.useCallback)((id) => {
    const visible = [...state.visible];
    const idx = visible.indexOf(id);
    if (idx >= 0) visible.splice(idx, 1);
    else visible.push(id);
    persist({ ...state, visible });
  }, [state, persist]);
  const handleReset = (0, import_react2.useCallback)(() => {
    persist(defaultState());
  }, [persist]);
  const handleDragStart = (0, import_react2.useCallback)((e, id) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }, []);
  const handleDragOver = (0, import_react2.useCallback)((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);
  const handleDrop = (0, import_react2.useCallback)((e, targetId) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData("text/plain");
    if (!fromId || fromId === targetId) return;
    const order = [...state.order];
    const fromIdx = order.indexOf(fromId);
    const toIdx = order.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, fromId);
    persist({ ...state, order });
  }, [state, persist]);
  const handleResizeStart = (0, import_react2.useCallback)(
    (e, id) => {
      if (!isEditing) return;
      e.preventDefault();
      e.stopPropagation();
      const itemEl = e.currentTarget.closest(".home-widgets__item");
      const gridEl = itemEl?.parentElement ?? null;
      if (!itemEl || !gridEl) return;
      const gridRect = gridEl.getBoundingClientRect();
      const itemRect = itemEl.getBoundingClientRect();
      const colWidth = gridRect.width / MAX_SPAN;
      setResizingId(id);
      const applyFromPointer = (clientX, clientY) => {
        const current = stateRef.current;
        const nextSpan = Math.min(MAX_SPAN, Math.max(1, Math.round((clientX - itemRect.left) / colWidth)));
        const h = clientY - itemRect.top;
        const nextH = h < HEIGHT_TIER_THRESHOLDS.compact ? 0 : h < HEIGHT_TIER_THRESHOLDS.medium ? 1 : h < HEIGHT_TIER_THRESHOLDS.tall ? 2 : 3;
        if ((current.sizes[id] ?? 2) === nextSpan && (current.heights[id] ?? 0) === nextH) return;
        const next = { ...current, sizes: { ...current.sizes, [id]: nextSpan }, heights: { ...current.heights, [id]: nextH } };
        persist(next);
        stateRef.current = next;
      };
      const onMove = (ev) => applyFromPointer(ev.clientX, ev.clientY);
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        setResizingId(null);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
      window.addEventListener("pointercancel", onUp, { once: true });
    },
    [isEditing, persist]
  );
  const createNewPageHandler = (0, import_react2.useCallback)(async () => {
    try {
      const key = await createDocState({}, { dispatch, getState: store.getState });
      if (key) {
        navigate(`/${key}?edit=true`);
      } else {
        toast.error(t("homeActions.createFailed"));
      }
    } catch {
      toast.error(t("homeActions.createFailed"));
    }
  }, [dispatch, navigate, store, t]);
  const actionCards = [
    {
      id: "createNote",
      icon: LuPencil,
      titleKey: "homeActions.createNoteTitle",
      descKey: "homeActions.createNoteDesc",
      onClick: createNewPageHandler
    },
    {
      id: "createTable",
      icon: LuGrid2X2,
      titleKey: "homeActions.createTableTitle",
      descKey: "homeActions.createTableDesc",
      onClick: () => {
        if (isCreatingTable) return;
        void createNewTable();
      }
    },
    {
      id: "pricing",
      icon: LuBadgeDollarSign,
      titleKey: "topbar.pricing",
      descKey: "homeActions.pricingDesc",
      onClick: () => navigate("/pricing")
    },
    {
      id: "downloadClient",
      icon: LuDownload,
      titleKey: "downloadClient",
      descKey: "homeActions.downloadClientDesc",
      onClick: () => navigate("/downloads" /* CLIENT_DOWNLOADS */)
    }
  ];
  const displayOrder = (0, import_react2.useMemo)(() => {
    const isDesktop = getIsDesktopApp();
    return state.order.filter(
      (id) => state.visible.includes(id) && !(isDesktop && id === "downloadClient")
    );
  }, [state.order, state.visible]);
  const renderWidgetItem = (id) => {
    const span = state.sizes[id] ?? 2;
    const clampedSpan = Math.min(span, MAX_SPAN);
    const h = state.heights[id] ?? 0;
    const className = `home-widgets__item w-col-${clampedSpan} h-${h}${id === FEATURED_WIDGET_ID ? " home-widgets__item--featured" : ""}${isEditing ? " is-editing" : ""}`;
    const dragProps = isEditing ? {
      draggable: resizingId === null,
      onDragStart: (e) => handleDragStart(e, id),
      onDragOver: (e) => handleDragOver(e),
      onDrop: (e) => handleDrop(e, id)
    } : {};
    const actionMeta = actionCards.find((a) => a.id === id);
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className, "data-widget-id": id, ...dragProps, children: [
      isEditing && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "home-widgets__toolbar", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          className: "home-widgets__tb-btn home-widgets__tb-btn--del",
          onClick: (e) => {
            e.stopPropagation();
            toggleVisible(id);
          },
          title: t("common.delete", "\u5220\u9664"),
          "aria-label": t("common.delete", "\u5220\u9664"),
          children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuX, { size: 13, "aria-hidden": "true" })
        }
      ) }),
      isEditing && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          className: "home-widgets__resize-handle",
          title: t("homeWidgets.dragResize", "\u62D6\u52A8\u8C03\u6574\u5927\u5C0F"),
          "aria-label": t("homeWidgets.dragResize", "\u62D6\u52A8\u8C03\u6574\u5927\u5C0F"),
          onPointerDown: (e) => handleResizeStart(e, id),
          children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuGripVertical, { size: 12, "aria-hidden": "true" })
        }
      ),
      actionMeta && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "button",
        {
          type: "button",
          className: "home-custom-actions__card",
          onClick: isEditing ? void 0 : actionMeta.onClick,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "home-custom-actions__header", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "home-custom-actions__icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(actionMeta.icon, { size: 18 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { className: "home-custom-actions__title", children: t(actionMeta.titleKey) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "home-custom-actions__desc", children: t(actionMeta.descKey) })
          ]
        }
      ),
      id === FEATURED_WIDGET_ID && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(CalendarWidget_default, { isEditing }),
      id === "usage" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(UsageWidget_default, { isEditing })
    ] }, id);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "section",
    {
      className: `home-widgets ${isEditing ? "home-widgets--editing" : ""}`,
      "aria-label": t("homeTabs.custom", "\u81EA\u5B9A\u4E49"),
      children: [
        isEditing && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "home-widgets__edit-bar", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", className: "home-widgets__reset-btn", onClick: handleReset, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuRotateCcw, { size: 14, "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("homeWidgets.reset", "\u91CD\u7F6E") })
        ] }) }),
        displayOrder.map((id) => renderWidgetItem(id)),
        isEditing && displayOrder.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "home-widgets__empty", children: t("homeWidgets.empty", "\u6240\u6709\u6A21\u5757\u5DF2\u9690\u85CF\uFF0C\u70B9\u51FB\u91CD\u7F6E\u6062\u590D") })
      ]
    }
  );
};
var WidgetsSection_default = WidgetsSection;
export {
  WidgetsSection_default as default
};
