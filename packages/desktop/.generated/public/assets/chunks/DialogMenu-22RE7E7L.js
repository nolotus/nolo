import {
  useContentFavorite
} from "/public/assets/chunks/chunk-22CDYFWX.js";
import {
  clipboard_default
} from "/public/assets/chunks/chunk-AOBBTRZH.js";
import {
  Menu,
  MenuItem
} from "/public/assets/chunks/chunk-PE7D2KFT.js";
import {
  Popover
} from "/public/assets/chunks/chunk-CXTRCW5J.js";
import {
  $49319ee1285aa241$export$27d2ad3c5815583e,
  $7705c033048f6da7$export$353f5b6fc5456de1,
  $e28ab3efe3e87743$export$1ff3c3f08ae963c0
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectCopyDiagnosticsEnabled,
  selectCurrentServer,
  selectCurrentSpaceId,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  getIsDesktopApp
} from "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuClipboard,
  LuEllipsis,
  LuLink,
  LuStar,
  LuTrash2,
  LuUsers
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asOptionalTrimmedString,
  asTrimmedNonEmptyStringArray
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

// packages/render/layout/DialogMenu.tsx
var import_react = __toESM(require_react(), 1);

// packages/chat/dialog/dialogDiagnostics.ts
var SENSITIVE_QUERY_KEY = /(?:token|auth|key|secret|password|passwd|pwd|cookie|session|code|credential)/i;
var asStringOrNumber = (value) => typeof value === "string" || typeof value === "number" ? value : void 0;
var getDialogField = (dialog, ...keys) => {
  if (!dialog) return void 0;
  for (const key of keys) {
    const value = dialog[key];
    if (value !== void 0 && value !== null && value !== "") return value;
  }
  return void 0;
};
var sanitizeSearchParams = (search) => {
  if (!search) return void 0;
  const normalized = search.startsWith("?") ? search.slice(1) : search;
  if (!normalized) return void 0;
  const params = new URLSearchParams(normalized);
  for (const key of Array.from(params.keys())) {
    if (SENSITIVE_QUERY_KEY.test(key)) {
      params.set(key, "[REDACTED]");
    }
  }
  const output = params.toString();
  return output ? `?${output}` : void 0;
};
var buildCurrentRouteDiagnostics = () => {
  if (typeof window === "undefined") return void 0;
  return {
    origin: window.location.origin,
    pathname: window.location.pathname,
    search: sanitizeSearchParams(window.location.search)
  };
};
var buildDialogDiagnosticsPayload = (source) => {
  const dialog = source.dialog ?? void 0;
  const dialogKey = asOptionalTrimmedString(source.dialogKey) || asOptionalTrimmedString(getDialogField(dialog, "dbKey", "key", "dialogKey"));
  const pageKey = asOptionalTrimmedString(source.pageKey) || asOptionalTrimmedString(
    getDialogField(dialog, "pageKey", "dbKey", "key", "dialogKey")
  );
  const spaceId = asOptionalTrimmedString(source.currentSpaceId) || asOptionalTrimmedString(getDialogField(dialog, "spaceId", "space"));
  const rawAgents = getDialogField(dialog, "cybots", "agentKeys", "agents");
  const agentKeys = Array.isArray(rawAgents) ? asTrimmedNonEmptyStringArray(rawAgents) : void 0;
  return {
    generatedAt: source.generatedAt || (/* @__PURE__ */ new Date()).toISOString(),
    runtime: source.runtime || (getIsDesktopApp() ? "desktop" : "web"),
    serverOrigin: asOptionalTrimmedString(source.currentServer),
    route: {
      origin: asOptionalTrimmedString(source.route?.origin),
      pathname: asOptionalTrimmedString(source.route?.pathname),
      search: sanitizeSearchParams(source.route?.search)
    },
    dialogKey,
    pageKey,
    dialogId: asOptionalTrimmedString(getDialogField(dialog, "id", "dialogId")),
    spaceId,
    agentKeys: agentKeys?.length ? agentKeys : void 0,
    status: asOptionalTrimmedString(getDialogField(dialog, "status")),
    createdAt: asStringOrNumber(getDialogField(dialog, "createdAt")),
    updatedAt: asStringOrNumber(getDialogField(dialog, "updatedAt")),
    compressionCount: typeof dialog?.compressionCount === "number" ? dialog.compressionCount : void 0
  };
};
var buildDialogDiagnosticsText = (source) => {
  const payload = buildDialogDiagnosticsPayload(source);
  return ["=== NOLO DIALOG DIAGNOSTICS ===", JSON.stringify(payload, null, 2)].join(
    "\n"
  );
};

// packages/render/layout/DialogMenu.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var ICON_SIZE = 16;
var DialogMenu = ({
  currentDialog,
  showShareButton = false,
  canDelete = false,
  showFavorite = false,
  onShareCommunity,
  onSharePrivate,
  onDelete
}) => {
  const { t } = useTranslation(["common", "chat"]);
  const currentServer = useAppSelector(selectCurrentServer);
  const currentSpaceId = useAppSelector(selectCurrentSpaceId);
  const showCopyDiagnostics = useAppSelector(selectCopyDiagnosticsEnabled);
  const [isActionMenuOpen, setIsActionMenuOpen] = (0, import_react.useState)(false);
  const { isFavorited, toggleFavorite } = useContentFavorite(
    currentDialog?.dbKey || ""
  );
  const rawTitle = currentDialog.title || "";
  const dateMatch = rawTitle.match(/(.*?)\s+(\d{2}-\d{2}\s\d{2}:\d{2})$/);
  const titleWithSymbol = dateMatch ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 600, color: "var(--text)" }, children: dateMatch[1] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 400, color: "var(--textTertiary)", marginLeft: "6px" }, children: dateMatch[2] })
  ] }) : rawTitle;
  const participantCount = Array.isArray(currentDialog?.cybots) ? currentDialog.cybots.length : 0;
  const subtitle = participantCount > 1 ? t("chat:collaborativeConversation", "\u534F\u4F5C\u4F1A\u8BDD") : null;
  const handleCopyDiagnostics = (0, import_react.useCallback)(() => {
    const diagnostics = buildDialogDiagnosticsText({
      dialog: currentDialog,
      currentServer,
      currentSpaceId,
      route: buildCurrentRouteDiagnostics()
    });
    clipboard_default(diagnostics, {
      onSuccess: () => toast.success(t("chat:copySuccess", "\u590D\u5236\u6210\u529F")),
      onError: () => toast.error(t("chat:copyFailed", "\u590D\u5236\u5931\u8D25"))
    });
  }, [currentDialog, currentServer, currentSpaceId, t]);
  const handleMenuAction = (0, import_react.useCallback)(
    (key) => {
      if (key === "favorite") {
        toggleFavorite();
      } else if (key === "share-community") {
        onShareCommunity?.();
      } else if (key === "share-private") {
        onSharePrivate?.();
      } else if (key === "copy-diagnostics") {
        handleCopyDiagnostics();
      } else if (key === "delete") {
        onDelete?.();
      }
    },
    [
      onShareCommunity,
      onSharePrivate,
      onDelete,
      handleCopyDiagnostics,
      toggleFavorite
    ]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dialog-menu", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dialog-menu__header", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dialog-menu__title-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "dialog-menu__title", title: currentDialog.title, children: titleWithSymbol }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        $49319ee1285aa241$export$27d2ad3c5815583e,
        {
          isOpen: isActionMenuOpen,
          onOpenChange: setIsActionMenuOpen,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              $7705c033048f6da7$export$353f5b6fc5456de1,
              {
                className: `topbar__button ${isActionMenuOpen ? "is-active" : ""}`,
                "aria-label": t("more", "\u66F4\u591A"),
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuEllipsis, { size: ICON_SIZE, "aria-hidden": "true" })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Popover,
              {
                className: "app-menu-popover dialog-menu-popover",
                placement: "bottom end",
                hideArrow: true,
                offset: 8,
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Menu, { onAction: handleMenuAction, "aria-label": t("more", "\u66F4\u591A"), children: [
                  showFavorite && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                    MenuItem,
                    {
                      id: "favorite",
                      textValue: isFavorited ? t("unfavoriteContent", "\u53D6\u6D88\u6536\u85CF") : t("favoriteContent", "\u6536\u85CF"),
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          LuStar,
                          {
                            size: ICON_SIZE,
                            style: { fill: isFavorited ? "currentColor" : "none" },
                            "aria-hidden": "true"
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { slot: "label", children: isFavorited ? t("unfavoriteContent", "\u53D6\u6D88\u6536\u85CF") : t("favoriteContent", "\u6536\u85CF") })
                      ]
                    }
                  ),
                  showShareButton && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                      MenuItem,
                      {
                        id: "share-community",
                        textValue: t("publishCommunity", "\u793E\u533A\u5206\u4EAB"),
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUsers, { size: ICON_SIZE, "aria-hidden": "true" }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { slot: "label", children: t("publishCommunity", "\u793E\u533A\u5206\u4EAB") })
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                      MenuItem,
                      {
                        id: "share-private",
                        textValue: t("shareCurrent", "\u79C1\u4EBA\u5206\u4EAB"),
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLink, { size: ICON_SIZE, "aria-hidden": "true" }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { slot: "label", children: t("shareCurrent", "\u79C1\u4EBA\u5206\u4EAB") })
                        ]
                      }
                    )
                  ] }),
                  showCopyDiagnostics && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                    MenuItem,
                    {
                      id: "copy-diagnostics",
                      textValue: t("chat:copyDiagnostics", "\u590D\u5236\u8BCA\u65AD\u4FE1\u606F"),
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClipboard, { size: ICON_SIZE, "aria-hidden": "true" }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { slot: "label", children: t("chat:copyDiagnostics", "\u590D\u5236\u8BCA\u65AD\u4FE1\u606F") })
                      ]
                    }
                  ),
                  canDelete && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                    (showShareButton || showCopyDiagnostics) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)($e28ab3efe3e87743$export$1ff3c3f08ae963c0, {}),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                      MenuItem,
                      {
                        id: "delete",
                        className: "dialog-menu__action-item--danger",
                        textValue: t("delete", "\u5220\u9664"),
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrash2, { size: ICON_SIZE, "aria-hidden": "true" }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { slot: "label", children: t("delete", "\u5220\u9664") })
                        ]
                      }
                    )
                  ] })
                ] })
              }
            )
          ]
        }
      )
    ] }),
    subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dialog-menu__subtitle", title: subtitle, children: subtitle })
  ] }) });
};
var DialogMenu_default = DialogMenu;
export {
  DialogMenu_default as default
};
