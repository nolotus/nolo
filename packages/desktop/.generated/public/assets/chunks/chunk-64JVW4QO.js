import {
  getMyRoutePathForTab
} from "/public/assets/chunks/chunk-WULKCFMZ.js";
import {
  useClickOutside
} from "/public/assets/chunks/chunk-3A7A5J6H.js";
import {
  FormTitle_default
} from "/public/assets/chunks/chunk-5X2YZ6P6.js";
import {
  zIndex
} from "/public/assets/chunks/chunk-XXDSICRI.js";
import {
  Controller,
  useForm
} from "/public/assets/chunks/chunk-Q66XOYF3.js";
import {
  useTheme
} from "/public/assets/chunks/chunk-LVVUA2RZ.js";
import {
  Input
} from "/public/assets/chunks/chunk-XXYYZRCQ.js";
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
  $928221da08ecbc62$export$41f133550aa26f48,
  $928221da08ecbc62$export$a11e76429ed99b4,
  $928221da08ecbc62$export$dca12b0bb56e4fc
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import {
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import {
  NavLink,
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  addSpace,
  changeSpace,
  fetchUserSpaceMemberships,
  selectAllMemberSpaces,
  selectCurrentSpace,
  selectMemberSpacesLoaded,
  selectMembershipStatus,
  selectSpaceLoading,
  selectViewMode,
  setViewMode,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  getIsDesktopApp
} from "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuCheck,
  LuChevronDown,
  LuFolder,
  LuFolderOpen,
  LuLayoutGrid,
  LuLoader,
  LuPlus,
  LuX
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_react_dom
} from "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/layout/TopbarSpaceSwitcher.tsx
var import_react2 = __toESM(require_react(), 1);
var import_react_dom = __toESM(require_react_dom(), 1);

// packages/create/space/CreateSpaceForm.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var FormContainer = ({ children }) => {
  const theme = useTheme();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      style: {
        maxWidth: 600,
        margin: "0 auto",
        padding: 20,
        color: theme.text
      },
      children
    }
  );
};
var CreateSpaceForm = ({ onClose }) => {
  const { t } = useTranslation("space");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const nameId = (0, import_react.useId)();
  const descriptionId = (0, import_react.useId)();
  const visibilityId = (0, import_react.useId)();
  const boundFolderId = (0, import_react.useId)();
  const onSubmit = (0, import_react.useCallback)(
    async (data) => {
      try {
        let resolvedName = data.name;
        if ((!resolvedName || !resolvedName.trim()) && data.boundFolder) {
          resolvedName = data.boundFolder.split("/").filter(Boolean).pop() || data.boundFolder;
        }
        console.info("[space/create] submit", {
          name: resolvedName,
          visibility: data.visibility || "private" /* PRIVATE */,
          path: window.location.pathname
        });
        const result = await dispatch(
          addSpace({
            name: resolvedName,
            description: data.description,
            visibility: data.visibility || "private" /* PRIVATE */,
            ...data.boundFolder ? { boundFolder: data.boundFolder } : {}
          })
        ).unwrap();
        await dispatch(changeSpace(result.spaceId)).unwrap();
        navigate(`/space/${result.spaceId}`);
        toast.success(t("create_success"));
        onClose();
      } catch (error) {
        console.error("Error creating space:", error);
        toast.error(t("create_error"));
      }
    },
    [dispatch, navigate, onClose, t]
  );
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting }
  } = useForm();
  const isDesktop = getIsDesktopApp();
  const boundFolder = watch("boundFolder") || "";
  const [pickingFolder, setPickingFolder] = (0, import_react.useState)(false);
  const handlePickFolder = (0, import_react.useCallback)(async () => {
    if (!isDesktop) return;
    setPickingFolder(true);
    try {
      const res = await fetch("/api/desktop/pick-folder", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ok && data.path) {
        setValue("boundFolder", data.path);
        const currentName = watch("name") || "";
        if (!currentName.trim()) {
          const folderBasename = data.path.split("/").filter(Boolean).pop() || data.path;
          setValue("name", folderBasename);
        }
      } else if (data.error) {
        toast.error(data.error);
      } else if (data.ok === false) {
        toast.error(t("pick_folder_failed"));
      }
    } catch (err) {
      console.warn("[CreateSpaceForm] pick-folder failed:", err);
      toast.error(t("pick_folder_failed"));
    } finally {
      setPickingFolder(false);
    }
  }, [isDesktop, setValue, watch]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FormContainer, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTitle_default, { children: t("create") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "form",
      {
        onSubmit: handleSubmit(onSubmit),
        style: {
          display: "flex",
          flexDirection: "column",
          gap: theme.space[5]
          // 使用主题间距系统
        },
        children: [
          isDesktop && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "label",
              {
                htmlFor: boundFolderId,
                style: {
                  display: "block",
                  marginBottom: theme.space[2],
                  fontSize: "var(--fontSize-base)",
                  fontWeight: 500,
                  color: theme.text
                },
                children: t("bound_folder")
              }
            ),
            boundFolder ? (
              // ── 已选择：紧凑卡片，突出文件夹名 ──
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "div",
                {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: theme.space[3],
                    padding: `${theme.space[3]} ${theme.space[4]}`,
                    borderRadius: "var(--radius-md, 10px)",
                    background: theme.accentSoft,
                    border: `1px solid ${theme.primaryBorder}`
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "span",
                      {
                        style: {
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 36,
                          height: 36,
                          borderRadius: "var(--radius-sm, 8px)",
                          background: theme.primaryBgStrong,
                          color: theme.primary
                        },
                        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuFolder, { size: 20, "aria-hidden": "true" })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "div",
                        {
                          style: {
                            fontSize: "var(--fontSize-sm)",
                            fontWeight: 600,
                            color: theme.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          },
                          title: boundFolder,
                          children: boundFolder.split("/").filter(Boolean).pop() || boundFolder
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "div",
                        {
                          style: {
                            fontSize: "var(--fontSize-xs)",
                            color: theme.textMuted,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            marginTop: 2
                          },
                          title: boundFolder,
                          children: boundFolder
                        }
                      )
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "button",
                      {
                        id: boundFolderId,
                        type: "button",
                        onClick: handlePickFolder,
                        disabled: pickingFolder,
                        style: {
                          flexShrink: 0,
                          background: "none",
                          border: "none",
                          color: theme.primary,
                          cursor: pickingFolder ? "wait" : "pointer",
                          fontSize: "var(--fontSize-sm)",
                          fontWeight: 500,
                          padding: `${theme.space[1]} ${theme.space[2]}`,
                          borderRadius: "var(--radius-sm, 6px)",
                          whiteSpace: "nowrap"
                        },
                        onMouseEnter: (e) => e.currentTarget.style.background = theme.primaryBgStrong,
                        onMouseLeave: (e) => e.currentTarget.style.background = "none",
                        children: t("change_folder")
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "button",
                      {
                        type: "button",
                        onClick: () => setValue("boundFolder", void 0),
                        style: {
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 24,
                          height: 24,
                          background: "none",
                          border: "none",
                          color: theme.textMuted,
                          cursor: "pointer",
                          borderRadius: "var(--radius-sm, 6px)"
                        },
                        title: t("clear"),
                        "aria-label": t("clear"),
                        onMouseEnter: (e) => {
                          e.currentTarget.style.color = theme.text;
                          e.currentTarget.style.background = theme.primaryBgStrong;
                        },
                        onMouseLeave: (e) => {
                          e.currentTarget.style.color = theme.textMuted;
                          e.currentTarget.style.background = "none";
                        },
                        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuX, { size: 16, "aria-hidden": "true" })
                      }
                    )
                  ]
                }
              )
            ) : (
              // ── 未选择：虚线放区域，引导点击 ──
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "button",
                {
                  id: boundFolderId,
                  type: "button",
                  onClick: handlePickFolder,
                  disabled: pickingFolder,
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: theme.space[2],
                    width: "100%",
                    padding: `${theme.space[6]} ${theme.space[4]}`,
                    borderRadius: "var(--radius-md, 10px)",
                    background: "transparent",
                    border: `1.5px dashed ${theme.primaryBorder}`,
                    cursor: pickingFolder ? "wait" : "pointer",
                    color: theme.textMuted,
                    transition: "border-color 0.15s, background 0.15s"
                  },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.borderColor = theme.primary;
                    e.currentTarget.style.background = theme.accentSoft;
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.borderColor = theme.primaryBorder;
                    e.currentTarget.style.background = "transparent";
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "span",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          background: theme.primaryBgStrong,
                          color: theme.primary
                        },
                        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuFolderOpen, { size: 24, "aria-hidden": "true" })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "span",
                      {
                        style: {
                          fontSize: "var(--fontSize-sm)",
                          fontWeight: 500,
                          color: theme.text
                        },
                        children: pickingFolder ? t("creating", { ns: "common" }) : t("choose_folder")
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "span",
                      {
                        style: {
                          fontSize: "var(--fontSize-xs)",
                          color: theme.textMuted
                        },
                        children: t("bound_folder_hint")
                      }
                    )
                  ]
                }
              )
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "div",
              {
                style: {
                  marginTop: theme.space[5],
                  borderTop: `1px solid ${theme.borderFaint}`,
                  height: 0
                },
                "aria-hidden": "true"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "label",
              {
                htmlFor: nameId,
                style: {
                  display: "block",
                  marginBottom: theme.space[2],
                  fontSize: "var(--fontSize-base)",
                  fontWeight: 500,
                  color: theme.text
                },
                children: t("name")
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Input,
              {
                ...register("name", {
                  validate: (value) => {
                    const hasBound = (watch("boundFolder") || "").trim().length > 0;
                    if (!value || !value.trim()) {
                      return hasBound ? true : t("name_required");
                    }
                    if (value.trim().length < 2) {
                      return t("name_min_length");
                    }
                    return true;
                  }
                }),
                id: nameId,
                placeholder: t("name_placeholder")
              }
            ),
            errors.name && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "div",
              {
                style: {
                  marginTop: theme.space[2],
                  color: theme.error,
                  fontSize: "var(--fontSize-sm)"
                },
                children: errors.name.message
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "label",
              {
                htmlFor: descriptionId,
                style: {
                  display: "block",
                  marginBottom: theme.space[2],
                  fontSize: "var(--fontSize-base)",
                  fontWeight: 500,
                  color: theme.text
                },
                children: t("description")
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Input,
              {
                ...register("description"),
                id: descriptionId,
                placeholder: t("description_placeholder")
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "label",
              {
                htmlFor: visibilityId,
                style: {
                  display: "block",
                  marginBottom: theme.space[2],
                  fontSize: "var(--fontSize-base)",
                  fontWeight: 500,
                  color: theme.text
                },
                children: t("visibility")
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Controller,
              {
                name: "visibility",
                control,
                defaultValue: "private" /* PRIVATE */,
                render: ({ field }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  Select,
                  {
                    id: visibilityId,
                    selectedKey: field.value == null ? void 0 : String(field.value),
                    onSelectionChange: (key) => field.onChange(
                      key == null ? "private" /* PRIVATE */ : String(key)
                    ),
                    style: { width: "100%" },
                    "aria-label": t("visibility"),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        SelectItem,
                        {
                          id: String("private" /* PRIVATE */),
                          textValue: t("private"),
                          children: t("private")
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        SelectItem,
                        {
                          id: String("public" /* PUBLIC */),
                          textValue: t("public"),
                          children: t("public")
                        }
                      )
                    ]
                  }
                )
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Button_default,
            {
              type: "submit",
              variant: "primary",
              block: true,
              size: "large",
              loading: isSubmitting,
              disabled: isSubmitting,
              icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuPlus, { "aria-hidden": "true" }),
              children: isSubmitting ? t("submitting", { ns: "common" }) : t("create")
            }
          )
        ]
      }
    )
  ] });
};

// packages/render/layout/TopbarSpaceSwitcher.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var ALL_VIEW_KEY = "__all__";
var RETRY_KEY = "__retry__";
var SPACE_PALETTE = [
  "hsl(158 55% 40%)",
  // 翠绿
  "hsl(210 65% 50%)",
  // 蓝
  "hsl(27  85% 50%)",
  // 橙
  "hsl(346 65% 50%)",
  // 玫红
  "hsl(187 55% 40%)",
  // 青
  "hsl(38  80% 48%)",
  // 琥珀
  "hsl(325 55% 50%)",
  // 粉
  "hsl(195 65% 42%)",
  // 天蓝
  "hsl(14  75% 50%)",
  // 砖红
  "hsl(155 50% 38%)"
  // 深绿
];
function nameToColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SPACE_PALETTE[Math.abs(hash) % SPACE_PALETTE.length];
}
var TopbarSpaceSwitcher = ({
  placement = "topbar"
}) => {
  const { t } = useTranslation("space");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const spaces = useAppSelector(selectAllMemberSpaces) || [];
  const space = useAppSelector(selectCurrentSpace);
  const loading = useAppSelector(selectSpaceLoading);
  const membershipStatus = useAppSelector(selectMembershipStatus);
  const memberSpacesLoaded = useAppSelector(selectMemberSpacesLoaded);
  const userId = useUserId();
  const isSpaceListLoading = !memberSpacesLoaded && membershipStatus === "loading";
  const isSpaceListFailed = !memberSpacesLoaded && membershipStatus === "offline";
  const viewMode = useAppSelector(selectViewMode);
  const isAllView = viewMode === "all";
  const isMembershipOffline = membershipStatus === "offline";
  const [isOpen, setIsOpen] = (0, import_react2.useState)(false);
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = (0, import_react2.useState)(false);
  const containerRef = (0, import_react2.useRef)(null);
  const handleOpenCreateSpace = (0, import_react2.useCallback)((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCreateSpaceOpen(true);
    setIsOpen(false);
  }, []);
  const buttonGroupRef = (0, import_react2.useRef)(null);
  const chevronBtnRef = (0, import_react2.useRef)(null);
  const panelRef = (0, import_react2.useRef)(null);
  const [panelStyle, setPanelStyle] = (0, import_react2.useState)({});
  const menuId = (0, import_react2.useId)();
  useClickOutside(containerRef, (event) => {
    if (panelRef.current?.contains(event.target)) {
      return;
    }
    setIsOpen(false);
  });
  (0, import_react2.useEffect)(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  (0, import_react2.useEffect)(() => {
    if (!isOpen) return;
    const handleResize = () => setIsOpen(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);
  const allViewPath = getMyRoutePathForTab("all");
  const handleSelectAll = (0, import_react2.useCallback)(() => {
    dispatch(setViewMode("all"));
    navigate(allViewPath);
    setIsOpen(false);
  }, [allViewPath, dispatch, navigate]);
  const handleSelect = (0, import_react2.useCallback)(
    (spaceId) => {
      dispatch(setViewMode("categories"));
      dispatch(changeSpace(spaceId));
      navigate(`/space/${spaceId}`);
      setIsOpen(false);
    },
    [dispatch, navigate]
  );
  const handleRetryMemberships = (0, import_react2.useCallback)(() => {
    if (!userId) return;
    dispatch(fetchUserSpaceMemberships(userId));
  }, [dispatch, userId]);
  const handleSelectionChange = (0, import_react2.useCallback)(
    (keys) => {
      if (keys === "all") return;
      const key = [...keys][0];
      if (key == null) return;
      const id = String(key);
      if (id === ALL_VIEW_KEY) {
        handleSelectAll();
        return;
      }
      if (id === RETRY_KEY) {
        handleRetryMemberships();
        return;
      }
      handleSelect(id);
    },
    [handleRetryMemberships, handleSelect, handleSelectAll]
  );
  const handleTogglePanel = (0, import_react2.useCallback)(() => {
    const trigger = buttonGroupRef.current ?? chevronBtnRef.current;
    if (!isOpen && trigger) {
      const triggerRect = trigger.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      const rect = placement === "sidebar" && triggerRect.width <= 0 && containerRect ? containerRect : triggerRect;
      const chevronRect = chevronBtnRef.current?.getBoundingClientRect() ?? rect;
      const panelWidth = placement === "sidebar" ? Math.max(200, Math.min(rect.width, window.innerWidth - 16)) : void 0;
      const panelLeft = placement === "sidebar" ? Math.max(8, Math.min(rect.left, window.innerWidth - (panelWidth ?? 248) - 8)) : chevronRect.left - 180;
      setPanelStyle({
        position: "fixed",
        top: (placement === "sidebar" ? rect.bottom : chevronRect.bottom) + 8,
        left: Math.max(8, Math.min(panelLeft, window.innerWidth - (panelWidth ?? 248))),
        ...panelWidth ? { width: panelWidth } : null,
        zIndex: zIndex.dropdown ?? 1e3
      });
    }
    setIsOpen((prev) => !prev);
  }, [isOpen, placement]);
  const allColor = "hsl(220 60% 50%)";
  const treatAsAll = isAllView || !space?.id;
  const selectedKey = treatAsAll ? ALL_VIEW_KEY : space?.id ?? ALL_VIEW_KEY;
  const selectedKeys = (0, import_react2.useMemo)(() => /* @__PURE__ */ new Set([selectedKey]), [selectedKey]);
  const color = treatAsAll ? allColor : space?.name ? nameToColor(space.name) : allColor;
  const displayName = treatAsAll ? t("all") : space?.name || t("all");
  const isSpaceResolving = loading && !treatAsAll;
  const displayInitial = treatAsAll ? "" : space?.name?.[0]?.toUpperCase() ?? "";
  const placementClass = placement === "topbar" ? "TpSw--topbar" : `TpSw--${placement}`;
  const createLabel = t("create_new_space", "\u65B0\u5EFA\u7A7A\u95F4");
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "div",
      {
        className: `TpSw TpSw--multi ${placementClass}`,
        ref: containerRef,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "TpSw__btnGroup", ref: buttonGroupRef, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              NavLink,
              {
                to: treatAsAll ? allViewPath : `/space/${space?.id ?? ""}`,
                className: "TpSw__spaceLink",
                onClick: (e) => {
                  if (e.button === 1 || e.ctrlKey || e.metaKey) return;
                  if (treatAsAll) {
                    e.preventDefault();
                    handleSelectAll();
                  } else if (space?.id) {
                    e.preventDefault();
                    handleSelect(space.id);
                  }
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "TpSw__icon", style: { background: color }, "aria-hidden": "true", children: treatAsAll ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuLayoutGrid, { size: 11, "aria-hidden": "true" }) : loading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuLoader, { className: "TpSw__spinIcon", size: 10, "aria-hidden": "true" }) : displayInitial }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "TpSw__name", children: isSpaceResolving ? t("loading") : displayName })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                ref: chevronBtnRef,
                type: "button",
                className: "TpSw__chevronBtn",
                onClick: handleTogglePanel,
                "aria-haspopup": "listbox",
                "aria-expanded": isOpen,
                "aria-controls": menuId,
                "aria-label": t("switch_space"),
                children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuChevronDown, { size: 14, className: "TpSw__arrow", "aria-hidden": "true" })
              }
            )
          ] }),
          isOpen && typeof document !== "undefined" && (0, import_react_dom.createPortal)(
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "div",
              {
                ref: panelRef,
                id: menuId,
                className: `TpSw__panel ${placement === "sidebar" ? "TpSw__panel--sidebar" : ""}`,
                style: panelStyle,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "TpSw__panelHeader", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "TpSw__panelTitle", children: t("switch_space") }),
                    isMembershipOffline && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                      "span",
                      {
                        className: "TpSw__offlineBadge",
                        title: t("offline_local_cache"),
                        children: t("offline_local_cache")
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                    $928221da08ecbc62$export$41f133550aa26f48,
                    {
                      "aria-label": t("switch_space"),
                      className: "TpSw__list",
                      selectionMode: "single",
                      selectionBehavior: "replace",
                      selectedKeys,
                      onSelectionChange: handleSelectionChange,
                      autoFocus: true,
                      dependencies: [selectedKey, treatAsAll],
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          $928221da08ecbc62$export$a11e76429ed99b4,
                          {
                            id: ALL_VIEW_KEY,
                            textValue: t("all"),
                            className: "TpSw__item",
                            children: ({ isSelected }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                "span",
                                {
                                  className: "TpSw__itemIcon",
                                  style: { background: allColor },
                                  "aria-hidden": "true",
                                  children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuLayoutGrid, { size: 10, "aria-hidden": "true" })
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "TpSw__itemName", children: t("all") }),
                              isSelected && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuCheck, { size: 13, className: "TpSw__itemCheck", "aria-hidden": "true" })
                            ] })
                          }
                        ),
                        spaces.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)($928221da08ecbc62$export$dca12b0bb56e4fc, { className: "TpSw__section", "aria-label": t("space_list"), children: spaces.map((s) => {
                          const itemColor = s.spaceName ? nameToColor(s.spaceName) : "hsl(210 65% 50%)";
                          const label = s.spaceName || s.spaceId;
                          return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                            $928221da08ecbc62$export$a11e76429ed99b4,
                            {
                              id: s.spaceId,
                              textValue: label,
                              className: "TpSw__item",
                              children: ({ isSelected }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                  "span",
                                  {
                                    className: "TpSw__itemIcon",
                                    style: { background: itemColor },
                                    "aria-hidden": "true",
                                    children: s.spaceName?.[0]?.toUpperCase() ?? "?"
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "TpSw__itemName", title: label, children: label }),
                                isSelected && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                  LuCheck,
                                  {
                                    size: 13,
                                    className: "TpSw__itemCheck",
                                    "aria-hidden": "true"
                                  }
                                )
                              ] })
                            },
                            s.dbKey || s.spaceId
                          );
                        }) }) : isSpaceListLoading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          $928221da08ecbc62$export$a11e76429ed99b4,
                          {
                            id: "__loading__",
                            textValue: t("loading"),
                            className: "TpSw__emptyItem",
                            isDisabled: true,
                            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "TpSw__empty", children: t("loading") })
                          }
                        ) : isSpaceListFailed ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          $928221da08ecbc62$export$a11e76429ed99b4,
                          {
                            id: RETRY_KEY,
                            textValue: t("space_list_failed", "\u7A7A\u95F4\u5217\u8868\u52A0\u8F7D\u5931\u8D25\uFF0C\u70B9\u51FB\u91CD\u8BD5"),
                            className: "TpSw__emptyItem",
                            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "TpSw__empty", children: t("space_list_failed", "\u7A7A\u95F4\u5217\u8868\u52A0\u8F7D\u5931\u8D25\uFF0C\u70B9\u51FB\u91CD\u8BD5") })
                          }
                        ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          $928221da08ecbc62$export$a11e76429ed99b4,
                          {
                            id: "__empty__",
                            textValue: t("no_spaces"),
                            className: "TpSw__emptyItem",
                            isDisabled: true,
                            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "TpSw__empty", children: t("no_spaces") })
                          }
                        )
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "TpSw__footer", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: "TpSw__createBtn",
                      onClick: handleOpenCreateSpace,
                      title: createLabel,
                      "aria-label": createLabel,
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "TpSw__createIcon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuPlus, { size: 14, "aria-hidden": "true" }) }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "TpSw__createLabel", children: createLabel })
                      ]
                    }
                  ) })
                ]
              }
            ),
            document.body
          )
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      Dialog,
      {
        isOpen: isCreateSpaceOpen,
        onClose: () => setIsCreateSpaceOpen(false),
        children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(CreateSpaceForm, { onClose: () => setIsCreateSpaceOpen(false) })
      }
    )
  ] });
};
var TopbarSpaceSwitcher_default = TopbarSpaceSwitcher;

export {
  TopbarSpaceSwitcher,
  TopbarSpaceSwitcher_default
};
