import {
  syncStandaloneAgentToAccount
} from "/public/assets/chunks/chunk-ADCRZVS7.js";
import {
  useAgentFavorite
} from "/public/assets/chunks/chunk-NSV3LQ3X.js";
import {
  ConfirmModal
} from "/public/assets/chunks/chunk-EPKZ4DTY.js";
import "/public/assets/chunks/chunk-7HTHEFUV.js";
import "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-XTMQULJ5.js";
import {
  useIsLoggedIn,
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  isDeviceLocalDbKey,
  read,
  toast,
  write
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import {
  asTrimmedString,
  getSyncMapping,
  getSyncMappingVersion,
  subscribeSyncMappingVersion
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuCheck,
  LuCloudUpload,
  LuCopy,
  LuEllipsis,
  LuPencil,
  LuStar,
  LuTrash2
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

// packages/ai/agent/web/AgentMoreActions.tsx
var import_react = __toESM(require_react());

// packages/ai/agent/agentSyncActionVisibility.ts
function resolveAgentSyncActionVisibility(input) {
  const account = asTrimmedString(input.accountUserId);
  const activeNonLocalAccount = input.isLoggedIn === true && account.length > 0 && account !== "local";
  if (!activeNonLocalAccount) {
    return { kind: "hidden" };
  }
  if (!isDeviceLocalDbKey(input.agentKey)) {
    return { kind: "hidden" };
  }
  if (input.mappedToActiveAccount) {
    return { kind: "synced" };
  }
  return { kind: "sync" };
}

// packages/ai/agent/runSyncStandaloneAgentToAccount.ts
async function runSyncStandaloneAgentToAccount(input, dispatch) {
  return syncStandaloneAgentToAccount(input, {
    readRecord: async (dbKey) => {
      try {
        const result = await dispatch(read({ dbKey })).unwrap();
        if (result && typeof result === "object") {
          return result;
        }
        return null;
      } catch {
        return null;
      }
    },
    writeRecord: async ({ data, customKey, userId }) => {
      const written = await dispatch(
        write({ data, customKey, userId })
      ).unwrap();
      if (written && typeof written === "object") {
        return written;
      }
      return { ...data, dbKey: customKey, userId };
    }
  });
}

// packages/ai/agent/web/AgentMoreActions.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var AgentMoreActionsComponent = ({
  agentKey,
  preloadEditBundle,
  onEdit,
  onDelete,
  onFork
}) => {
  const { t } = useTranslation(["ai"]);
  const dispatch = useAppDispatch();
  const accountUserId = useUserId();
  const isLoggedIn = useIsLoggedIn();
  const { isFavorited, toggleFavorite } = useAgentFavorite(agentKey);
  const mappingVersion = (0, import_react.useSyncExternalStore)(
    subscribeSyncMappingVersion,
    getSyncMappingVersion,
    () => 0
  );
  const mappedToActiveAccount = (0, import_react.useMemo)(() => {
    if (!accountUserId || accountUserId === "local") return false;
    return !!getSyncMapping(agentKey, accountUserId);
  }, [agentKey, accountUserId, mappingVersion]);
  const syncVisibility = (0, import_react.useMemo)(
    () => resolveAgentSyncActionVisibility({
      agentKey,
      accountUserId,
      isLoggedIn,
      mappedToActiveAccount
    }),
    [agentKey, accountUserId, isLoggedIn, mappedToActiveAccount]
  );
  const [showActions, setShowActions] = (0, import_react.useState)(false);
  const [deleting, setDeleting] = (0, import_react.useState)(false);
  const [syncConfirmOpen, setSyncConfirmOpen] = (0, import_react.useState)(false);
  const [syncing, setSyncing] = (0, import_react.useState)(false);
  const syncInFlightRef = (0, import_react.useRef)(false);
  const menuAnchorRef = (0, import_react.useRef)(null);
  const stopEvent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleMoreClick = (0, import_react.useCallback)(
    (e) => {
      stopEvent(e);
      setShowActions((prev) => {
        const next = !prev;
        if (next && preloadEditBundle) {
          preloadEditBundle();
        }
        return next;
      });
    },
    [preloadEditBundle]
  );
  const handleFavoriteClick = (e) => {
    stopEvent(e);
    setShowActions(false);
    toggleFavorite();
  };
  const handleForkClick = (e) => {
    stopEvent(e);
    setShowActions(false);
    if (onFork) onFork();
  };
  const handleEditClick = (e) => {
    stopEvent(e);
    setShowActions(false);
    if (preloadEditBundle) preloadEditBundle();
    if (onEdit) onEdit();
  };
  const handleDeleteMenuClick = async (e) => {
    stopEvent(e);
    setShowActions(false);
    if (deleting || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };
  const handleSyncMenuClick = (e) => {
    stopEvent(e);
    if (syncVisibility.kind !== "sync" || syncInFlightRef.current) return;
    setShowActions(false);
    setSyncConfirmOpen(true);
  };
  const handleSyncConfirmClose = (0, import_react.useCallback)(() => {
    if (syncing) return;
    setSyncConfirmOpen(false);
  }, [syncing]);
  const handleSyncConfirm = (0, import_react.useCallback)(async () => {
    if (syncInFlightRef.current) return;
    const account = asTrimmedString(accountUserId);
    if (!account || account === "local") return;
    syncInFlightRef.current = true;
    setSyncing(true);
    try {
      await runSyncStandaloneAgentToAccount(
        { accountUserId: account, localAgentKey: agentKey },
        dispatch
      );
      toast.success(
        t("syncToAccountSuccess", "\u5DF2\u540C\u6B65\u5230\u5F53\u524D\u8D26\u53F7\uFF08\u672C\u673A Agent \u4ECD\u4FDD\u7559\uFF09")
      );
      setSyncConfirmOpen(false);
    } catch (err) {
      const message = err instanceof Error && err.message.trim() ? err.message : t("syncToAccountError", "\u540C\u6B65\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
      toast.error(message);
    } finally {
      syncInFlightRef.current = false;
      setSyncing(false);
    }
  }, [accountUserId, agentKey, dispatch, t]);
  (0, import_react.useEffect)(() => {
    if (!showActions) return;
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!target) return;
      if (menuAnchorRef.current?.contains(target)) return;
      setShowActions(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowActions(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showActions]);
  const syncConfirmFacts = [
    t(
      "syncToAccountFactLocalRemains",
      "\u672C\u673A Agent \u4F1A\u7EE7\u7EED\u7559\u5728\u8FD9\u53F0\u8BBE\u5907\u4E0A\u3002"
    ),
    t(
      "syncToAccountFactSnapshotOnly",
      "\u672C\u6B21\u53EA\u4E0A\u4F20 Agent \u914D\u7F6E\u5FEB\u7167\u3002"
    ),
    t(
      "syncToAccountFactNoDialogs",
      "\u4E0D\u4F1A\u4E0A\u4F20\u5BF9\u8BDD\u3001\u6D88\u606F\u3001\u9644\u4EF6\u3002"
    ),
    t(
      "syncToAccountFactNoSecrets",
      "\u4E0D\u4F1A\u4E0A\u4F20\u672C\u673A API \u5BC6\u94A5\u6216\u4EE4\u724C\u3002"
    ),
    t(
      "syncToAccountFactNoSpaceMembership",
      "\u4E0D\u4F1A\u53D8\u66F4\u6216\u540C\u6B65 Space \u6210\u5458\u5173\u7CFB\u3002"
    )
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent__menu-anchor", ref: menuAnchorRef, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: `agent__more ${showActions ? "agent__more--active" : ""}`,
          onPointerEnter: preloadEditBundle,
          onFocus: preloadEditBundle,
          onClick: handleMoreClick,
          title: t("moreActions"),
          "aria-label": t("moreActions"),
          "aria-expanded": showActions,
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuEllipsis, { size: 18, "aria-hidden": "true" })
        }
      ),
      showActions && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agent__actions-menu", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: "agent__action-item agent__action-item--favorite",
            onClick: handleFavoriteClick,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                LuStar,
                {
                  size: 14,
                  "aria-hidden": "true",
                  style: {
                    fill: isFavorited ? "var(--primary)" : "transparent",
                    color: isFavorited ? "var(--primary)" : "inherit"
                  }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isFavorited ? t("unfavorite", "\u53D6\u6D88\u6536\u85CF") : t("favorite", "\u6536\u85CF") })
            ]
          }
        ),
        onFork && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: "agent__action-item agent__action-item--fork",
            onClick: handleForkClick,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCopy, { size: 14, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("fork.action", "\u590D\u5236\u5230\u6211\u7684") })
            ]
          }
        ),
        syncVisibility.kind === "sync" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: "agent__action-item agent__action-item--sync",
            onClick: handleSyncMenuClick,
            disabled: syncing,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCloudUpload, { size: 14, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("syncToAccount", "\u540C\u6B65\u5230 Nolo \u8D26\u53F7") })
            ]
          }
        ),
        syncVisibility.kind === "synced" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            className: "agent__action-item agent__action-item--synced",
            role: "status",
            "aria-label": t("syncedToAccount", "\u5DF2\u540C\u6B65\u5230\u5F53\u524D\u8D26\u53F7"),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCheck, { size: 14, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("syncedToAccount", "\u5DF2\u540C\u6B65\u5230\u5F53\u524D\u8D26\u53F7") })
            ]
          }
        ),
        onEdit && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: "agent__action-item agent__action-item--edit",
            onPointerEnter: preloadEditBundle,
            onFocus: preloadEditBundle,
            onClick: handleEditClick,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuPencil, { size: 14, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("edit") })
            ]
          }
        ),
        onDelete && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: "agent__action-item agent__action-item--delete",
            onClick: handleDeleteMenuClick,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrash2, { size: 14, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("delete") })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ConfirmModal,
      {
        isOpen: syncConfirmOpen,
        onClose: handleSyncConfirmClose,
        onConfirm: () => {
          void handleSyncConfirm();
        },
        title: t("syncToAccountTitle", "\u540C\u6B65\u5230 Nolo \u8D26\u53F7"),
        message: t(
          "syncToAccountConfirmLead",
          "\u786E\u8BA4\u628A\u6B64\u672C\u673A Agent \u7684\u914D\u7F6E\u540C\u6B65\u5230\u5F53\u524D Nolo \u8D26\u53F7\uFF1F"
        ),
        confirmText: t("syncToAccountConfirm", "\u786E\u8BA4\u540C\u6B65"),
        cancelText: t("cancel", "\u53D6\u6D88"),
        type: "info",
        loading: syncing,
        allowCancelWhileLoading: false,
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "agent__sync-confirm-facts", children: syncConfirmFacts.map((fact) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: fact }, fact)) })
      }
    )
  ] });
};
var AgentMoreActions = (0, import_react.memo)(AgentMoreActionsComponent);
AgentMoreActions.displayName = "AgentMoreActions";
var AgentMoreActions_default = AgentMoreActions;
export {
  AgentMoreActions_default as default
};
