import {
  useCreateTable
} from "/public/assets/chunks/chunk-JETP7HYW.js";
import {
  useUserData
} from "/public/assets/chunks/chunk-QADHV2NS.js";
import {
  useMediaQuery
} from "/public/assets/chunks/chunk-LKJPGMXH.js";
import {
  Menu,
  MenuItem
} from "/public/assets/chunks/chunk-PE7D2KFT.js";
import {
  Dialog
} from "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  Select,
  SelectItem
} from "/public/assets/chunks/chunk-5LT6KM4O.js";
import {
  Popover
} from "/public/assets/chunks/chunk-CXTRCW5J.js";
import {
  $32e5dbc959387ef1$export$60a5cf113499de66,
  $49319ee1285aa241$export$27d2ad3c5815583e,
  $7705c033048f6da7$export$353f5b6fc5456de1
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import {
  createDocState
} from "/public/assets/chunks/chunk-VPSYWRNH.js";
import {
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import {
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
  createAgentAutomation,
  selectCreateMenuOpenCount,
  selectCurrentSpace,
  selectCurrentSpaceId,
  selectViewMode,
  setSettings,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  LuBot,
  LuCalendarClock,
  LuFileText,
  LuGrid2X2,
  LuMessageSquare,
  LuPlus,
  LuRefreshCw,
  LuUpload
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  buildRoutableContentPath
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/layout/CreateMenuButtonContainer.tsx
var import_react2 = __toESM(require_react(), 1);

// packages/app/hooks/useHoverCapable.ts
var HOVER_QUERY = "(hover: hover) and (pointer: fine)";
function useHoverCapable() {
  return useMediaQuery(HOVER_QUERY);
}

// packages/chat/web/CreateTaskModal.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var WEEKDAYS = [
  { value: 1, label: "\u5468\u4E00" },
  { value: 2, label: "\u5468\u4E8C" },
  { value: 3, label: "\u5468\u4E09" },
  { value: 4, label: "\u5468\u56DB" },
  { value: 5, label: "\u5468\u4E94" },
  { value: 6, label: "\u5468\u516D" },
  { value: 0, label: "\u5468\u65E5" }
];
var HOURS = Array.from({ length: 24 }, (_, i) => i);
var MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
function buildCron(freq, hour, minute, weekday, raw) {
  switch (freq) {
    case "hourly":
      return `${minute} * * * *`;
    case "daily":
      return `${minute} ${hour} * * *`;
    case "weekly":
      return `${minute} ${hour} * * ${weekday}`;
    case "custom":
      return raw;
  }
}
function describeSchedule(freq, hour, minute, weekday) {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const wdLabel = WEEKDAYS.find((w) => w.value === weekday)?.label ?? "\u5468\u4E00";
  switch (freq) {
    case "hourly":
      return `\u6BCF\u5C0F\u65F6\u7B2C ${mm} \u5206\u949F\u6267\u884C`;
    case "daily":
      return `\u6BCF\u5929 ${hh}:${mm} \u6267\u884C`;
    case "weekly":
      return `\u6BCF${wdLabel} ${hh}:${mm} \u6267\u884C`;
    case "custom":
      return "\u81EA\u5B9A\u4E49 Cron \u8868\u8FBE\u5F0F";
  }
}
var CreateTaskModal = ({ isOpen, onClose, spaceId }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const userId = useUserId();
  const titleId = (0, import_react.useId)();
  const taskPromptId = (0, import_react.useId)();
  const scheduleLabelId = (0, import_react.useId)();
  const agentLabelId = (0, import_react.useId)();
  const cronId = (0, import_react.useId)();
  const [title, setTitle] = (0, import_react.useState)("");
  const [taskPrompt, setTaskPrompt] = (0, import_react.useState)("");
  const [freq, setFreq] = (0, import_react.useState)("daily");
  const [hour, setHour] = (0, import_react.useState)(2);
  const [minute, setMinute] = (0, import_react.useState)(0);
  const [weekday, setWeekday] = (0, import_react.useState)(1);
  const [rawCron, setRawCron] = (0, import_react.useState)("0 2 * * *");
  const [selectedAgentKey, setSelectedAgentKey] = (0, import_react.useState)("");
  const [isSubmitting, setIsSubmitting] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const { data: agents = [], loading, reload } = useUserData("agent" /* AGENT */, userId || "", 50);
  const cronExpr = (0, import_react.useMemo)(
    () => buildCron(freq, hour, minute, weekday, rawCron),
    [freq, hour, minute, weekday, rawCron]
  );
  const cronDesc = (0, import_react.useMemo)(
    () => describeSchedule(freq, hour, minute, weekday),
    [freq, hour, minute, weekday]
  );
  (0, import_react.useEffect)(() => {
    if (isOpen) {
      setTitle("");
      setTaskPrompt("");
      setFreq("daily");
      setHour(2);
      setMinute(0);
      setWeekday(1);
      setRawCron("0 2 * * *");
      setSelectedAgentKey("");
      setError(null);
    }
  }, [isOpen]);
  const handleSubmit = (0, import_react.useCallback)(async () => {
    if (!taskPrompt.trim()) {
      setError("\u8BF7\u586B\u5199\u4EFB\u52A1\u63CF\u8FF0");
      return;
    }
    if (!selectedAgentKey) {
      setError("\u8BF7\u9009\u62E9\u4E00\u4E2A Agent");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await dispatch(
        createAgentAutomation({
          agentKey: selectedAgentKey,
          title: title.trim() || `\u5B9A\u65F6\u4EFB\u52A1 ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN")}`,
          schedule: cronExpr,
          taskPrompt: taskPrompt.trim(),
          ...spaceId !== void 0 ? { spaceId } : {}
        })
      ).unwrap();
      onClose();
      navigate(buildRoutableContentPath({
        contentKey: result.dbKey,
        type: result.type,
        spaceId: result.spaceId
      }));
    } catch (err) {
      setError(err?.message || "\u521B\u5EFA\u5931\u8D25");
    } finally {
      setIsSubmitting(false);
    }
  }, [dispatch, navigate, onClose, title, taskPrompt, cronExpr, selectedAgentKey, spaceId]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Dialog,
    {
      isOpen,
      onClose,
      title: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCalendarClock, { size: 18, "aria-hidden": "true" }),
        "\u65B0\u5EFA\u5B9A\u65F6\u4EFB\u52A1"
      ] }),
      size: "medium",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "CTM", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "CTM__field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "CTM__label", htmlFor: titleId, children: "\u4EFB\u52A1\u540D\u79F0\uFF08\u53EF\u9009\uFF09" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              id: titleId,
              className: "CTM__input",
              type: "text",
              placeholder: "\u4F8B\uFF1A\u6BCF\u65E5\u4EE3\u7801\u5BA1\u67E5",
              value: title,
              onChange: (e) => setTitle(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "CTM__field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "CTM__label", htmlFor: taskPromptId, children: "\u4EFB\u52A1\u63CF\u8FF0 *" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "textarea",
            {
              id: taskPromptId,
              className: "CTM__textarea",
              rows: 3,
              placeholder: "\u544A\u8BC9 AI \u8981\u505A\u4EC0\u4E48\u3002\u4F8B\uFF1A\u68C0\u67E5\u4ECA\u5929\u7684\u4EE3\u7801\u63D0\u4EA4\uFF0C\u5217\u51FA\u6F5C\u5728\u98CE\u9669\u70B9",
              value: taskPrompt,
              onChange: (e) => setTaskPrompt(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "CTM__field", role: "group", "aria-labelledby": scheduleLabelId, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { id: scheduleLabelId, className: "CTM__label", children: "\u6267\u884C\u65F6\u95F4" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "CTM__freq-row", role: "group", "aria-label": "\u9891\u7387", children: ["hourly", "daily", "weekly", "custom"].map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: `CTM__freq-btn ${freq === f ? "is-active" : ""}`,
              onClick: () => setFreq(f),
              "aria-pressed": freq === f,
              children: { hourly: "\u6BCF\u5C0F\u65F6", daily: "\u6BCF\u5929", weekly: "\u6BCF\u5468", custom: "\u81EA\u5B9A\u4E49" }[f]
            },
            f
          )) }),
          freq !== "custom" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "CTM__time-row", children: [
            freq === "weekly" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Select,
              {
                className: "CTM__select",
                selectedKey: String(weekday),
                onSelectionChange: (key) => setWeekday(key == null ? 0 : Number(key)),
                "aria-label": "\u661F\u671F",
                children: WEEKDAYS.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  SelectItem,
                  {
                    id: String(w.value),
                    textValue: w.label,
                    children: w.label
                  },
                  String(w.value)
                ))
              }
            ),
            freq === "hourly" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "CTM__time-label", children: "\u6BCF\u5C0F\u65F6" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                Select,
                {
                  className: "CTM__select",
                  selectedKey: String(minute),
                  onSelectionChange: (key) => setMinute(key == null ? 0 : Number(key)),
                  "aria-label": "\u5206\u949F",
                  children: MINUTES.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    SelectItem,
                    {
                      id: String(m),
                      textValue: `:${String(m).padStart(2, "0")} \u5206`,
                      children: `:${String(m).padStart(2, "0")} \u5206`
                    },
                    String(m)
                  ))
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "CTM__time-label", children: "\u6267\u884C" })
            ] }) : (
              /* 每天/每周：选时 + 分 */
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  Select,
                  {
                    className: "CTM__select",
                    selectedKey: String(hour),
                    onSelectionChange: (key) => setHour(key == null ? 0 : Number(key)),
                    "aria-label": "\u5C0F\u65F6",
                    children: HOURS.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      SelectItem,
                      {
                        id: String(h),
                        textValue: `${String(h).padStart(2, "0")} \u65F6`,
                        children: `${String(h).padStart(2, "0")} \u65F6`
                      },
                      String(h)
                    ))
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  Select,
                  {
                    className: "CTM__select",
                    selectedKey: String(minute),
                    onSelectionChange: (key) => setMinute(key == null ? 0 : Number(key)),
                    "aria-label": "\u5206\u949F",
                    children: MINUTES.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      SelectItem,
                      {
                        id: String(m),
                        textValue: `${String(m).padStart(2, "0")} \u5206`,
                        children: `${String(m).padStart(2, "0")} \u5206`
                      },
                      String(m)
                    ))
                  }
                )
              ] })
            )
          ] }),
          freq === "custom" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              id: cronId,
              className: "CTM__input CTM__input--mono",
              type: "text",
              placeholder: "\u4F8B\uFF1A0 2 * * 1-5\uFF08\u5DE5\u4F5C\u65E5\u51CC\u66682\u70B9\uFF09",
              value: rawCron,
              onChange: (e) => setRawCron(e.target.value),
              "aria-label": "Cron \u8868\u8FBE\u5F0F"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "CTM__cron-preview", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "CTM__cron-desc", children: cronDesc }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: "CTM__cron-code", children: cronExpr })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "CTM__field", role: "group", "aria-labelledby": agentLabelId, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "CTM__agent-header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { id: agentLabelId, className: "CTM__label", children: "\u9009\u62E9 Agent *" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "CTM__reload",
                onClick: () => reload(),
                title: "\u5237\u65B0",
                "aria-label": "\u5237\u65B0",
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuRefreshCw, { size: 13, "aria-hidden": "true" })
              }
            )
          ] }),
          loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "CTM__hint", children: "\u52A0\u8F7D\u4E2D\u2026" }) : agents.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "CTM__hint", children: '\u6682\u65E0 Agent\uFF0C\u8BF7\u5148\u5728"Agent"\u9875\u9762\u521B\u5EFA' }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "CTM__agent-list", children: agents.map((agent) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              className: `CTM__agent-btn ${selectedAgentKey === agent.dbKey ? "is-active" : ""}`,
              onClick: () => setSelectedAgentKey(agent.dbKey),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "CTM__agent-name", children: agent.name || agent.dbKey }),
                agent.apiSource === "cli" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "CTM__badge CTM__badge--cli", children: "CLI" }),
                agent.apiSource === "custom" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "CTM__badge CTM__badge--local", children: "\u672C\u5730" })
              ]
            },
            agent.dbKey
          )) })
        ] }),
        error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "CTM__error", children: error }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "CTM__actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button_default, { variant: "secondary", onClick: onClose, disabled: isSubmitting, children: "\u53D6\u6D88" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button_default, { variant: "primary", onClick: handleSubmit, loading: isSubmitting, children: "\u521B\u5EFA\u4EFB\u52A1" })
        ] })
      ] })
    }
  );
};
var CreateTaskModal_default = CreateTaskModal;

// packages/render/layout/CreateMenuButton.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var CreateMenuButton = ({
  variant = "sidebar",
  className = "",
  title,
  createLabel,
  shouldShowLabel,
  isOpen,
  onOpenChange,
  onHoverOpenChange,
  onAction,
  hoverOpen = false,
  children
}) => {
  const triggerTitle = title ?? createLabel;
  const triggerBaseClass = variant === "sidebar" ? "create-menu__button" : variant === "topbar" ? "topbar-user-menu__toggle create-menu__button--topbar" : "";
  const iconSize = variant === "sidebar" ? 20 : variant === "header" ? 14 : 17;
  const triggerButton = /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    $7705c033048f6da7$export$353f5b6fc5456de1,
    {
      className: `${triggerBaseClass} ${isOpen ? "is-active" : ""} ${className}`,
      "aria-label": triggerTitle,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          LuPlus,
          {
            size: iconSize,
            className: `create-menu__icon ${isOpen ? "is-rotated" : ""}`,
            "aria-hidden": "true"
          }
        ),
        shouldShowLabel ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "create-menu__label", children: createLabel }) : null
      ]
    }
  );
  const menuPopover = /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    Popover,
    {
      className: "create-menu-popover",
      placement: variant === "topbar" ? "bottom end" : "bottom start",
      hideArrow: true,
      offset: 8,
      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Menu, { onAction, children })
    }
  );
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "div",
    {
      className: `create-menu ${variant === "sidebar" && shouldShowLabel ? "create-menu--sidebar-wide" : ""}`,
      children: hoverOpen ? (
        // PreviewTrigger：hover/focus 展开非模态预览。
        // delay = 进触发后多久展开（比默认 600 更跟手）；
        // closeDelay = 离开后多久收起（留出 trigger↔popover 移动间隙）。
        // hover 模式所有开/关都走 onHoverOpenChange（container 侧不计数）。
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          $32e5dbc959387ef1$export$60a5cf113499de66,
          {
            isOpen,
            onOpenChange: onHoverOpenChange,
            delay: 200,
            closeDelay: 150,
            children: [
              triggerButton,
              menuPopover
            ]
          }
        )
      ) : (
        // 点击模式：受控 MenuTrigger，开/关走 onOpenChange（container 侧计数）。
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)($49319ee1285aa241$export$27d2ad3c5815583e, { isOpen, onOpenChange, children: [
          triggerButton,
          menuPopover
        ] })
      )
    }
  );
};
var CreateMenuButton_default = CreateMenuButton;

// packages/render/layout/createMenuPolicy.ts
var CREATE_MENU_OPEN_COUNT_THRESHOLD = 3;
var CREATE_MENU_ITEM_ORDER = [
  "new-chat",
  "new-page",
  "new-table",
  "create-agent-manual",
  "scheduled-task",
  "upload-file"
];
function shouldShowCreateMenuLabel(args) {
  return Boolean(
    args.showLabel && args.variant === "sidebar" && args.createMenuOpenCount <= CREATE_MENU_OPEN_COUNT_THRESHOLD
  );
}
function isUploadMenuItemVisible(hasUploadHandler) {
  return Boolean(hasUploadHandler);
}
function getVisibleCreateMenuItemIds(args) {
  return CREATE_MENU_ITEM_ORDER.filter((id) => {
    if (id === "upload-file") {
      return isUploadMenuItemVisible(args.hasUploadHandler);
    }
    return true;
  });
}

// packages/render/layout/CreateMenuButtonContainer.tsx
var import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);
var CreateMenuButtonContainer = ({
  variant = "sidebar",
  className = "",
  showLabel,
  categoryId,
  title,
  onUploadClick,
  onOpenMenu,
  onOpenChange
}) => {
  const { t } = useTranslation(["space"]);
  const dispatch = useAppDispatch();
  const store = useStore();
  const navigate = useNavigate();
  const currentSpace = useAppSelector(selectCurrentSpace);
  const currentSpaceId = useAppSelector(selectCurrentSpaceId);
  const viewMode = useAppSelector(selectViewMode);
  const createMenuOpenCount = useAppSelector(selectCreateMenuOpenCount);
  const hoverOpen = variant === "topbar" && useHoverCapable();
  const [isOpen, setIsOpen] = (0, import_react2.useState)(false);
  const [isCreatingPage, setIsCreatingPage] = (0, import_react2.useState)(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = (0, import_react2.useState)(false);
  const { createNewTable, isCreating: isCreatingTable } = useCreateTable({
    onSuccess: () => setIsOpen(false)
  });
  const sidebarScopedSpaceId = variant === "sidebar" ? viewMode === "all" ? null : currentSpaceId ?? currentSpace?.id ?? null : void 0;
  const pageCreateSpaceId = currentSpaceId ?? currentSpace?.id ?? null;
  const applyOpenChange = (0, import_react2.useCallback)(
    (open, count) => {
      setIsOpen(open);
      onOpenChange?.(open);
      if (open && count) {
        void dispatch(
          setSettings({ createMenuOpenCount: createMenuOpenCount + 1 })
        );
        if (onOpenMenu) onOpenMenu();
      }
    },
    [createMenuOpenCount, dispatch, onOpenChange, onOpenMenu]
  );
  const handleOpenChange = (0, import_react2.useCallback)(
    (open) => applyOpenChange(open, true),
    [applyOpenChange]
  );
  const handleHoverOpenChange = (0, import_react2.useCallback)(
    (open) => applyOpenChange(open, false),
    [applyOpenChange]
  );
  const closeMenu = (0, import_react2.useCallback)(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);
  const createLabel = t("common:create", "\u65B0\u5EFA");
  const triggerTitle = title ?? createLabel;
  const shouldShowLabel = shouldShowCreateMenuLabel({
    showLabel,
    variant,
    createMenuOpenCount
  });
  const createChat = (0, import_react2.useCallback)(() => {
    closeMenu();
    const spaceId = currentSpaceId ?? currentSpace?.id ?? null;
    navigate(
      spaceId ? `${"/chat" /* CHAT */}?spaceId=${encodeURIComponent(spaceId)}` : "/chat" /* CHAT */
    );
  }, [closeMenu, currentSpaceId, currentSpace?.id, navigate]);
  const createNewPageAndClose = (0, import_react2.useCallback)(async () => {
    setIsCreatingPage(true);
    try {
      const key = await createDocState(
        {
          spaceId: pageCreateSpaceId ?? void 0,
          categoryId
        },
        { dispatch, getState: store.getState }
      );
      if (!key) throw new Error("Unexpected createDoc result");
      closeMenu();
      const path = buildRoutableContentPath({
        contentKey: key,
        type: "page" /* DOC */,
        spaceId: pageCreateSpaceId
      });
      navigate(`${path}?edit=true`);
    } catch {
      closeMenu();
      toast.error(t("createPageFailed", "\u521B\u5EFA\u9875\u9762\u5931\u8D25"));
    } finally {
      setIsCreatingPage(false);
    }
  }, [closeMenu, dispatch, navigate, pageCreateSpaceId, categoryId, t]);
  const handleManualCreateAgent = (0, import_react2.useCallback)(() => {
    closeMenu();
    navigate("/create/agent");
  }, [closeMenu, navigate]);
  const handleCreateTask = (0, import_react2.useCallback)(() => {
    closeMenu();
    setIsCreateTaskOpen(true);
  }, [closeMenu]);
  const handleUploadClick = (0, import_react2.useCallback)(() => {
    closeMenu();
    onUploadClick?.();
  }, [closeMenu, onUploadClick]);
  const handleAction = (0, import_react2.useCallback)(
    (key) => {
      switch (key) {
        case "new-chat":
          createChat();
          break;
        case "new-page":
          void createNewPageAndClose();
          break;
        case "new-table":
          createNewTable({
            spaceId: sidebarScopedSpaceId ?? void 0,
            categoryId
          });
          break;
        case "create-agent-manual":
          handleManualCreateAgent();
          break;
        case "scheduled-task":
          handleCreateTask();
          break;
        case "upload-file":
          handleUploadClick();
          break;
        default:
          break;
      }
    },
    [
      createChat,
      createNewPageAndClose,
      createNewTable,
      sidebarScopedSpaceId,
      categoryId,
      handleManualCreateAgent,
      handleCreateTask,
      handleUploadClick
    ]
  );
  const renderMenuItem = (id) => {
    switch (id) {
      case "new-chat": {
        const label = t("chat:newchat", "\u65B0\u5EFA\u5BF9\u8BDD");
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(MenuItem, { id, textValue: label, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuMessageSquare, { size: 16, "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { slot: "label", title: label, children: label })
        ] }, id);
      }
      case "new-page": {
        const label = t("newPage");
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
          MenuItem,
          {
            id,
            textValue: label,
            isDisabled: isCreatingPage,
            children: [
              isCreatingPage ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "spinner", "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuFileText, { size: 16, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { slot: "label", title: label, children: label })
            ]
          },
          id
        );
      }
      case "new-table": {
        const label = t("table:newTable", "\u65B0\u5EFA\u8868\u683C");
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
          MenuItem,
          {
            id,
            textValue: label,
            isDisabled: isCreatingTable,
            children: [
              isCreatingTable ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "spinner", "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuGrid2X2, { size: 16, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { slot: "label", title: label, children: label })
            ]
          },
          id
        );
      }
      case "create-agent-manual": {
        const label = t("agent:create_agent_manual", "\u624B\u52A8\u914D\u7F6E AI");
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(MenuItem, { id, textValue: label, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuBot, { size: 16, "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { slot: "label", title: label, children: label })
        ] }, id);
      }
      case "scheduled-task": {
        const label = t("scheduled", "\u4EFB\u52A1");
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(MenuItem, { id, textValue: label, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuCalendarClock, { size: 16, "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { slot: "label", title: label, children: label })
        ] }, id);
      }
      case "upload-file": {
        const label = t("uploadFile");
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(MenuItem, { id, textValue: label, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuUpload, { size: 16, "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { slot: "label", title: label, children: label })
        ] }, id);
      }
      default: {
        const _exhaustive = id;
        return _exhaustive;
      }
    }
  };
  const menuItems = /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_jsx_runtime3.Fragment, { children: getVisibleCreateMenuItemIds({
    hasUploadHandler: Boolean(onUploadClick)
  }).map(renderMenuItem) });
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      CreateMenuButton_default,
      {
        variant,
        className,
        title: triggerTitle,
        createLabel,
        shouldShowLabel,
        isOpen,
        onOpenChange: handleOpenChange,
        onHoverOpenChange: handleHoverOpenChange,
        onAction: handleAction,
        hoverOpen,
        children: menuItems
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      CreateTaskModal_default,
      {
        isOpen: isCreateTaskOpen,
        onClose: () => setIsCreateTaskOpen(false),
        spaceId: sidebarScopedSpaceId
      }
    )
  ] });
};
var CreateMenuButtonContainer_default = CreateMenuButtonContainer;

export {
  CreateMenuButtonContainer_default
};
